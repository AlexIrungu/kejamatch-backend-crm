/**
 * Viewing Controller
 * Handles property viewing scheduling, management, and calendar operations
 */

import LeadStorage from '../services/leadStorageMongo.js';
import Lead from '../models/LeadModel.js';
import Property from '../models/PropertyModel.js';
import resend from '../config/resend.js';
import { viewingRequestAdminTemplate, viewingRequestUserTemplate, viewingConfirmedTemplate } from '../templates/emailTemplates.js';
import logger from '../utils/logger.js';

/**
 * Request a viewing (Public - from property details page)
 * Creates a lead if new, or updates existing lead with viewing request
 */
export const requestViewing = async (req, res, next) => {
  try {
    const {
      propertyId,
      propertyName,
      propertyLocation,
      name,
      email,
      phone,
      preferredDate,
      preferredTime,
      alternateDate,
      alternateTime,
      message
    } = req.body;

    logger.info(`🏠 Viewing request from: ${name} for ${propertyName}`);

    // Check if lead already exists with this email
    let lead = await Lead.findOne({ email: email.toLowerCase() });
    
    if (lead) {
      // Update existing lead
      logger.info(`📝 Updating existing lead: ${lead._id}`);
      
      // Add property interest
      await lead.addPropertyInterest({
        propertyId,
        propertyName,
        notes: message || 'Requested viewing'
      }, null, 'System');
      
    } else {
      // Create new lead
      const leadResult = await LeadStorage.saveLead({
        name,
        email,
        phoneNumber: phone,
        subject: `Viewing Request: ${propertyName}`,
        message: message || `Interested in viewing ${propertyName}`,
        source: 'property_viewing_request'
      });

      if (!leadResult.success) {
        throw new Error('Failed to create lead');
      }

      lead = await Lead.findById(leadResult.lead._id);
      
      // Add property interest
      await lead.addPropertyInterest({
        propertyId,
        propertyName,
        notes: message || 'Requested viewing'
      }, null, 'System');
    }

    // Add viewing request as activity (not scheduled yet - pending confirmation)
    lead.addActivity(
      'viewing_scheduled',
      `Viewing requested for ${propertyName} - Preferred: ${preferredDate} at ${preferredTime}`,
      null,
      'System',
      {
        propertyId,
        propertyName,
        preferredDate,
        preferredTime,
        alternateDate,
        alternateTime,
        status: 'pending_confirmation'
      }
    );

    await lead.save();

    // Prepare email data
    const emailData = {
      propertyName,
      propertyLocation,
      name,
      email,
      phone,
      preferredDate: formatDate(preferredDate),
      preferredTime,
      alternateDate: alternateDate ? formatDate(alternateDate) : null,
      alternateTime,
      message: message || 'No additional message',
      leadId: lead._id
    };

    // Send admin notification
    try {
      await resend.emails.send({
        from: process.env.FROM_EMAIL,
        to: process.env.ADMIN_EMAIL,
        subject: `🏠 New Viewing Request - ${propertyName}`,
        html: viewingRequestAdminTemplate(emailData),
        replyTo: email
      });
    } catch (emailError) {
      logger.warn('Failed to send admin email:', emailError.message);
    }

    // Send user confirmation
    try {
      await resend.emails.send({
        from: process.env.FROM_EMAIL,
        to: email,
        subject: 'Viewing Request Received - Kejamatch Properties',
        html: viewingRequestUserTemplate(emailData)
      });
    } catch (emailError) {
      logger.warn('Failed to send user confirmation email:', emailError.message);
    }

    logger.info(`✅ Viewing request processed for lead: ${lead._id}`);

    res.status(200).json({
      success: true,
      message: 'Viewing request submitted successfully! We will contact you to confirm the appointment.',
      data: {
        leadId: lead._id,
        propertyName,
        preferredDate,
        preferredTime
      }
    });

  } catch (error) {
    logger.error('❌ Viewing request error:', error);
    next(error);
  }
};

/**
 * Schedule a viewing for a lead (Admin/Agent)
 */
export const scheduleViewing = async (req, res, next) => {
  try {
    const { leadId } = req.params;
    const { propertyId, propertyName, scheduledDate, scheduledTime, notes } = req.body;
    const userId = req.user.id;
    const userName = req.user.name;

    const result = await LeadStorage.scheduleViewing(
      leadId,
      { propertyId, propertyName, scheduledDate, scheduledTime, notes },
      userId,
      userName
    );

    if (!result.success) {
      return res.status(404).json({ success: false, message: result.error });
    }

    // Get lead details for email
    const lead = await Lead.findById(leadId);

    // Send confirmation email to lead
    try {
      await resend.emails.send({
        from: process.env.FROM_EMAIL,
        to: lead.email,
        subject: `Viewing Confirmed - ${propertyName}`,
        html: viewingConfirmedTemplate({
          name: lead.name,
          propertyName,
          scheduledDate: formatDate(scheduledDate),
          scheduledTime,
          notes,
          agentName: userName
        })
      });
    } catch (emailError) {
      logger.warn('Failed to send viewing confirmation email:', emailError.message);
    }

    logger.info(`✅ Viewing scheduled for lead ${leadId} by ${userName}`);

    res.status(200).json({
      success: true,
      message: 'Viewing scheduled successfully',
      data: result.viewing
    });

  } catch (error) {
    logger.error('❌ Schedule viewing error:', error);
    next(error);
  }
};

/**
 * Complete a viewing (Admin/Agent)
 */
export const completeViewing = async (req, res, next) => {
  try {
    const { leadId, viewingId } = req.params;
    const { outcome, notes } = req.body;
    const userId = req.user.id;
    const userName = req.user.name;

    const result = await LeadStorage.completeViewing(
      leadId,
      viewingId,
      outcome,
      notes,
      userId,
      userName
    );

    if (!result.success) {
      return res.status(404).json({ success: false, message: result.error });
    }

    logger.info(`✅ Viewing ${viewingId} completed by ${userName}`);

    res.status(200).json({
      success: true,
      message: 'Viewing completed successfully',
      data: result.lead
    });

  } catch (error) {
    logger.error('❌ Complete viewing error:', error);
    next(error);
  }
};

/**
 * Cancel a viewing (Admin/Agent)
 */
export const cancelViewing = async (req, res, next) => {
  try {
    const { leadId, viewingId } = req.params;
    const { reason } = req.body;
    const userId = req.user.id;
    const userName = req.user.name;

    const lead = await Lead.findById(leadId);
    
    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    const viewing = lead.viewings.id(viewingId);
    
    if (!viewing) {
      return res.status(404).json({ success: false, message: 'Viewing not found' });
    }

    viewing.status = 'cancelled';
    viewing.notes = reason ? `Cancelled: ${reason}` : 'Cancelled';

    lead.addActivity(
      'viewing_completed',
      `Viewing cancelled for ${viewing.propertyName || 'property'}${reason ? `: ${reason}` : ''}`,
      userId,
      userName,
      { viewingId, reason, status: 'cancelled' }
    );

    await lead.save();

    logger.info(`✅ Viewing ${viewingId} cancelled by ${userName}`);

    res.status(200).json({
      success: true,
      message: 'Viewing cancelled successfully',
      data: lead.toObject()
    });

  } catch (error) {
    logger.error('❌ Cancel viewing error:', error);
    next(error);
  }
};

/**
 * Get all viewings (Admin - for calendar view)
 */
export const getAllViewings = async (req, res, next) => {
  try {
    const { startDate, endDate, status } = req.query;

    // Build aggregation pipeline
    const pipeline = [
      { $unwind: '$viewings' },
      {
        $project: {
          _id: 0,
          viewingId: '$viewings._id',
          leadId: '$_id',
          leadName: '$name',
          leadEmail: '$email',
          leadPhone: { $ifNull: ['$phoneNumber', '$phone'] },
          propertyId: '$viewings.propertyId',
          propertyName: '$viewings.propertyName',
          scheduledDate: '$viewings.scheduledDate',
          scheduledTime: '$viewings.scheduledTime',
          status: '$viewings.status',
          notes: '$viewings.notes',
          outcome: '$viewings.outcome',
          createdAt: '$viewings.createdAt',
          assignedTo: '$assignedTo',
          assignedToName: '$assignedToName'
        }
      }
    ];

    // Add date filters if provided
    if (startDate || endDate) {
      const dateFilter = {};
      if (startDate) dateFilter.$gte = startDate;
      if (endDate) dateFilter.$lte = endDate;
      pipeline.push({ $match: { scheduledDate: dateFilter } });
    }

    // Add status filter
    if (status) {
      pipeline.push({ $match: { status } });
    }

    // Sort by date
    pipeline.push({ $sort: { scheduledDate: 1, scheduledTime: 1 } });

    const viewings = await Lead.aggregate(pipeline);

    res.status(200).json({
      success: true,
      data: viewings
    });

  } catch (error) {
    logger.error('❌ Get all viewings error:', error);
    next(error);
  }
};

/**
 * Get viewings for a specific agent
 */
export const getAgentViewings = async (req, res, next) => {
  try {
    const agentId = req.user.id;
    const { startDate, endDate, status } = req.query;

    const pipeline = [
      { $match: { assignedTo: agentId } },
      { $unwind: '$viewings' },
      {
        $project: {
          _id: 0,
          viewingId: '$viewings._id',
          leadId: '$_id',
          leadName: '$name',
          leadEmail: '$email',
          leadPhone: { $ifNull: ['$phoneNumber', '$phone'] },
          propertyId: '$viewings.propertyId',
          propertyName: '$viewings.propertyName',
          scheduledDate: '$viewings.scheduledDate',
          scheduledTime: '$viewings.scheduledTime',
          status: '$viewings.status',
          notes: '$viewings.notes',
          outcome: '$viewings.outcome',
          createdAt: '$viewings.createdAt'
        }
      }
    ];

    if (startDate || endDate) {
      const dateFilter = {};
      if (startDate) dateFilter.$gte = startDate;
      if (endDate) dateFilter.$lte = endDate;
      pipeline.push({ $match: { scheduledDate: dateFilter } });
    }

    if (status) {
      pipeline.push({ $match: { status } });
    }

    pipeline.push({ $sort: { scheduledDate: 1, scheduledTime: 1 } });

    const viewings = await Lead.aggregate(pipeline);

    res.status(200).json({
      success: true,
      data: viewings
    });

  } catch (error) {
    logger.error('❌ Get agent viewings error:', error);
    next(error);
  }
};

/**
 * Get viewing statistics
 */
export const getViewingStats = async (req, res, next) => {
  try {
    const stats = await Lead.aggregate([
      { $unwind: '$viewings' },
      {
        $group: {
          _id: '$viewings.status',
          count: { $sum: 1 }
        }
      }
    ]);

    const result = {
      scheduled: 0,
      completed: 0,
      cancelled: 0,
      total: 0
    };

    stats.forEach(s => {
      result[s._id] = s.count;
      result.total += s.count;
    });

    // Get upcoming viewings (next 7 days)
    const today = new Date().toISOString().split('T')[0];
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const upcoming = await Lead.aggregate([
      { $unwind: '$viewings' },
      {
        $match: {
          'viewings.status': 'scheduled',
          'viewings.scheduledDate': { $gte: today, $lte: nextWeek }
        }
      },
      { $count: 'count' }
    ]);

    result.upcomingThisWeek = upcoming[0]?.count || 0;

    res.status(200).json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('❌ Get viewing stats error:', error);
    next(error);
  }
};

// Helper function
function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

export default {
  requestViewing,
  scheduleViewing,
  completeViewing,
  cancelViewing,
  getAllViewings,
  getAgentViewings,
  getViewingStats
};