/**
 * QUICK FIX - Add this helper function at the top of agentRoutes.js
 * Then use it in all your filter comparisons
 */

import express from 'express';
import LeadStorage from '../services/leadStorageMongo.js';
import { verifyToken } from '../middleware/auth.js';
import logger from '../utils/logger.js';
import {
  sendMessage,
  getConversation,
  getConversations,
  markAsRead,
  getUnreadCount
} from '../controllers/messageController.js';

const router = express.Router();

router.use(verifyToken);

// Helper function to extract ID from assignedTo (handles both populated and non-populated)
const getAssignedToId = (assignedTo) => {
  if (!assignedTo) return null;
  // If populated (has _id), use _id, otherwise use the value itself
  return assignedTo._id ? assignedTo._id.toString() : assignedTo.toString();
};

// Get agent's dashboard stats
router.get('/stats', async (req, res) => {
  try {
    const leadsResponse = await LeadStorage.getAllLeads();
    const leads = leadsResponse?.leads || [];
    
    // Use helper function
    const agentLeads = leads.filter(l => 
      getAssignedToId(l.assignedTo) === req.user.id.toString()
    );

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const stats = {
      totalLeads: agentLeads.length,
      activeLeads: agentLeads.filter(l => !['won', 'lost'].includes(l.status)).length,
      convertedLeads: agentLeads.filter(l => l.status === 'won').length,
      todayLeads: agentLeads.filter(l => new Date(l.createdAt) >= today).length,
      weekLeads: agentLeads.filter(l => new Date(l.createdAt) >= thisWeek).length,
      pendingFollowUp: agentLeads.filter(l => l.status === 'contacted').length,
      byStatus: {
        new: agentLeads.filter(l => l.status === 'new').length,
        contacted: agentLeads.filter(l => l.status === 'contacted').length,
        qualified: agentLeads.filter(l => l.status === 'qualified').length,
        viewing: agentLeads.filter(l => l.status === 'viewing').length,
        negotiating: agentLeads.filter(l => l.status === 'negotiating').length,
        won: agentLeads.filter(l => l.status === 'won').length,
        lost: agentLeads.filter(l => l.status === 'lost').length,
      },
    };

    res.status(200).json({ success: true, data: stats });
  } catch (error) {
    logger.error('❌ Get agent stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to get agent statistics' });
  }
});

// Get agent's assigned leads
router.get('/leads', async (req, res) => {
  try {
    const { status } = req.query;
    const leadsResponse = await LeadStorage.getAllLeads();
    
    // Use helper function
    let leads = (leadsResponse?.leads || []).filter(l => 
      getAssignedToId(l.assignedTo) === req.user.id.toString()
    );

    if (status) {
      leads = leads.filter(l => l.status === status);
    }

    // Convert MongoDB documents to plain objects and add id field
    leads = leads.map(lead => {
      const plainLead = lead.toObject ? lead.toObject() : lead;
      return {
        ...plainLead,
        id: plainLead._id.toString()
      };
    });

    leads.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    logger.info(`✅ Agent ${req.user.email} fetched ${leads.length} leads`);
    
    res.status(200).json({ success: true, count: leads.length, data: leads });
  } catch (error) {
    logger.error('❌ Get agent leads error:', error);
    res.status(500).json({ success: false, message: 'Failed to get leads' });
  }
});

// Get single lead (only if assigned)
router.get('/leads/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const lead = await LeadStorage.findById(id);

    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }
    
    // Use helper function
    const assignedToId = getAssignedToId(lead.assignedTo);
    if (!assignedToId || assignedToId !== req.user.id.toString()) {
      return res.status(403).json({ success: false, message: 'You do not have access to this lead' });
    }

    const plainLead = lead.toObject();
    res.status(200).json({ 
      success: true, 
      data: {
        ...plainLead,
        id: plainLead._id.toString()
      }
    });
  } catch (error) {
    logger.error('❌ Get lead error:', error);
    res.status(500).json({ success: false, message: 'Failed to get lead' });
  }
});

// Get lead activities
router.get('/leads/:id/activities', async (req, res) => {
  try {
    const { id } = req.params;
    const lead = await LeadStorage.findById(id);

    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }
    
    // Use helper function
    const assignedToId = getAssignedToId(lead.assignedTo);
    if (!assignedToId || assignedToId !== req.user.id.toString()) {
      return res.status(403).json({ success: false, message: 'You do not have access to this lead' });
    }

    res.status(200).json({ success: true, data: lead.activities || [] });
  } catch (error) {
    logger.error('❌ Get lead activities error:', error);
    res.status(500).json({ success: false, message: 'Failed to get activities' });
  }
});

// Update lead status
router.put('/leads/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const lead = await LeadStorage.findById(id);
    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }
    
    // Use helper function
    const assignedToId = getAssignedToId(lead.assignedTo);
    if (!assignedToId || assignedToId !== req.user.id.toString()) {
      return res.status(403).json({ success: false, message: 'You can only update leads assigned to you' });
    }

    const validStatuses = ['new', 'contacted', 'qualified', 'viewing', 'negotiating', 'won', 'lost'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const result = await LeadStorage.updateLeadStatus(id, status, req.user.id, req.user.name);

    if (!result.success) {
      return res.status(500).json({ success: false, message: result.error || 'Failed to update lead' });
    }

    logger.info(`✅ Lead status updated: ${id} -> ${status} by ${req.user.email}`);
    res.status(200).json({ success: true, message: 'Lead status updated successfully', data: result.lead });
  } catch (error) {
    logger.error('❌ Update lead status error:', error);
    res.status(500).json({ success: false, message: 'Failed to update lead status' });
  }
});

// Add note to lead
router.post('/leads/:id/notes', async (req, res) => {
  try {
    const { id } = req.params;
    const { note } = req.body;

    const lead = await LeadStorage.findById(id);
    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }
    
    // Use helper function
    const assignedToId = getAssignedToId(lead.assignedTo);
    if (!assignedToId || assignedToId !== req.user.id.toString()) {
      return res.status(403).json({ success: false, message: 'You can only add notes to leads assigned to you' });
    }

    if (!note || note.trim() === '') {
      return res.status(400).json({ success: false, message: 'Note is required' });
    }

    const result = await LeadStorage.addNote(id, note.trim(), req.user.id, req.user.name);

    if (!result.success) {
      return res.status(500).json({ success: false, message: result.error || 'Failed to add note' });
    }

    logger.info(`✅ Note added to lead: ${id} by ${req.user.email}`);
    res.status(200).json({ success: true, message: 'Note added successfully', data: result.lead });
  } catch (error) {
    logger.error('❌ Add note error:', error);
    res.status(500).json({ success: false, message: 'Failed to add note' });
  }
});

// Log a call
router.post('/leads/:id/calls', async (req, res) => {
  try {
    const { id } = req.params;
    const { outcome, duration, notes } = req.body;

    const lead = await LeadStorage.findById(id);
    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }
    
    // Use helper function
    const assignedToId = getAssignedToId(lead.assignedTo);
    if (!assignedToId || assignedToId !== req.user.id.toString()) {
      return res.status(403).json({ success: false, message: 'You can only log calls for leads assigned to you' });
    }

    if (!outcome) {
      return res.status(400).json({ success: false, message: 'Call outcome is required' });
    }

    const result = await LeadStorage.logCall(id, { outcome, duration, notes }, req.user.id, req.user.name);

    if (!result.success) {
      return res.status(500).json({ success: false, message: result.error || 'Failed to log call' });
    }

    logger.info(`✅ Call logged for lead: ${id} by ${req.user.email}`);
    res.status(200).json({ success: true, message: 'Call logged successfully', data: result.lead });
  } catch (error) {
    logger.error('❌ Log call error:', error);
    res.status(500).json({ success: false, message: 'Failed to log call' });
  }
});

// Log an email
router.post('/leads/:id/emails', async (req, res) => {
  try {
    const { id } = req.params;
    const { subject, type, notes } = req.body;

    const lead = await LeadStorage.findById(id);
    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }
    
    // Use helper function
    const assignedToId = getAssignedToId(lead.assignedTo);
    if (!assignedToId || assignedToId !== req.user.id.toString()) {
      return res.status(403).json({ success: false, message: 'You can only log emails for leads assigned to you' });
    }

    const result = await LeadStorage.logEmail(id, { subject, type, notes }, req.user.id, req.user.name);

    if (!result.success) {
      return res.status(500).json({ success: false, message: result.error || 'Failed to log email' });
    }

    logger.info(`✅ Email logged for lead: ${id} by ${req.user.email}`);
    res.status(200).json({ success: true, message: 'Email logged successfully', data: result.lead });
  } catch (error) {
    logger.error('❌ Log email error:', error);
    res.status(500).json({ success: false, message: 'Failed to log email' });
  }
});

// Schedule a viewing
router.post('/leads/:id/viewings', async (req, res) => {
  try {
    const { id } = req.params;
    const { propertyId, propertyName, scheduledDate, scheduledTime, notes } = req.body;

    const lead = await LeadStorage.findById(id);
    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }
    
    // Use helper function
    const assignedToId = getAssignedToId(lead.assignedTo);
    if (!assignedToId || assignedToId !== req.user.id.toString()) {
      return res.status(403).json({ success: false, message: 'You can only schedule viewings for leads assigned to you' });
    }

    if (!scheduledDate || !scheduledTime) {
      return res.status(400).json({ success: false, message: 'Date and time are required' });
    }

    const result = await LeadStorage.scheduleViewing(
      id,
      { propertyId, propertyName, scheduledDate, scheduledTime, notes },
      req.user.id,
      req.user.name
    );

    if (!result.success) {
      return res.status(500).json({ success: false, message: result.error || 'Failed to schedule viewing' });
    }

    logger.info(`✅ Viewing scheduled for lead: ${id} by ${req.user.email}`);
    res.status(200).json({ success: true, message: 'Viewing scheduled successfully', data: result.lead, viewing: result.viewing });
  } catch (error) {
    logger.error('❌ Schedule viewing error:', error);
    res.status(500).json({ success: false, message: 'Failed to schedule viewing' });
  }
});

// Complete a viewing
router.put('/leads/:id/viewings/:viewingId/complete', async (req, res) => {
  try {
    const { id, viewingId } = req.params;
    const { outcome, notes } = req.body;

    const lead = await LeadStorage.findById(id);
    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }
    
    // Use helper function
    const assignedToId = getAssignedToId(lead.assignedTo);
    if (!assignedToId || assignedToId !== req.user.id.toString()) {
      return res.status(403).json({ success: false, message: 'You can only complete viewings for leads assigned to you' });
    }

    if (!outcome) {
      return res.status(400).json({ success: false, message: 'Outcome is required' });
    }

    const result = await LeadStorage.completeViewing(id, viewingId, outcome, notes, req.user.id, req.user.name);

    if (!result.success) {
      return res.status(404).json({ success: false, message: result.error });
    }

    logger.info(`✅ Viewing completed for lead: ${id} by ${req.user.email}`);
    res.status(200).json({ success: true, message: 'Viewing completed successfully', data: result.lead });
  } catch (error) {
    logger.error('❌ Complete viewing error:', error);
    res.status(500).json({ success: false, message: 'Failed to complete viewing' });
  }
});

// Add property interest
router.post('/leads/:id/property-interest', async (req, res) => {
  try {
    const { id } = req.params;
    const { propertyId, propertyName, notes } = req.body;

    const lead = await LeadStorage.findById(id);
    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }
    
    // Use helper function
    const assignedToId = getAssignedToId(lead.assignedTo);
    if (!assignedToId || assignedToId !== req.user.id.toString()) {
      return res.status(403).json({ success: false, message: 'You can only add property interest for leads assigned to you' });
    }

    if (!propertyId && !propertyName) {
      return res.status(400).json({ success: false, message: 'Property information is required' });
    }

    const result = await LeadStorage.addPropertyInterest(
      id,
      { propertyId, propertyName, notes },
      req.user.id,
      req.user.name
    );

    if (!result.success) {
      return res.status(500).json({ success: false, message: result.error || 'Failed to add property interest' });
    }

    logger.info(`✅ Property interest added for lead: ${id} by ${req.user.email}`);
    res.status(200).json({ success: true, message: 'Property interest added', data: result.lead });
  } catch (error) {
    logger.error('❌ Add property interest error:', error);
    res.status(500).json({ success: false, message: 'Failed to add property interest' });
  }
});

// =====================
// FOLLOW-UPS & ACTIVITY
// =====================

// Get leads needing follow-up (not contacted in 3+ days)
router.get('/follow-ups', async (req, res) => {
  try {
    const leadsResponse = await LeadStorage.getAllLeads();
    const leads = leadsResponse?.leads || [];

    const agentLeads = leads.filter(l =>
      getAssignedToId(l.assignedTo) === req.user.id.toString()
    );

    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

    const needsFollowUp = agentLeads.filter(lead => {
      if (['won', 'lost'].includes(lead.status)) return false;

      const lastActivity = lead.activities?.length > 0
        ? new Date(lead.activities[lead.activities.length - 1].timestamp)
        : new Date(lead.createdAt);

      return lastActivity < threeDaysAgo;
    }).map(lead => {
      const lastActivity = lead.activities?.length > 0
        ? new Date(lead.activities[lead.activities.length - 1].timestamp)
        : new Date(lead.createdAt);
      const daysSince = Math.floor((Date.now() - lastActivity) / (24 * 60 * 60 * 1000));

      return {
        ...lead.toObject ? lead.toObject() : lead,
        id: lead._id.toString(),
        daysSinceContact: daysSince
      };
    });

    res.status(200).json({ success: true, data: needsFollowUp });
  } catch (error) {
    logger.error('Get follow-ups error:', error);
    res.status(500).json({ success: false, message: 'Failed to get follow-ups' });
  }
});

// Get activity timeline (recent activities across all leads)
router.get('/activity-timeline', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const leadsResponse = await LeadStorage.getAllLeads();
    const leads = leadsResponse?.leads || [];

    const agentLeads = leads.filter(l =>
      getAssignedToId(l.assignedTo) === req.user.id.toString()
    );

    const allActivities = [];
    agentLeads.forEach(lead => {
      (lead.activities || []).forEach(activity => {
        allActivities.push({
          ...activity.toObject ? activity.toObject() : activity,
          leadId: lead._id.toString(),
          leadName: lead.name,
          leadEmail: lead.email
        });
      });
    });

    allActivities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.status(200).json({ success: true, data: allActivities.slice(0, limit) });
  } catch (error) {
    logger.error('Get activity timeline error:', error);
    res.status(500).json({ success: false, message: 'Failed to get activity timeline' });
  }
});

// Get upcoming viewings
router.get('/viewings/upcoming', async (req, res) => {
  try {
    const leadsResponse = await LeadStorage.getAllLeads();
    const leads = leadsResponse?.leads || [];

    const agentLeads = leads.filter(l =>
      getAssignedToId(l.assignedTo) === req.user.id.toString()
    );

    const now = new Date();
    const upcomingViewings = [];

    agentLeads.forEach(lead => {
      (lead.viewings || []).forEach(viewing => {
        if (viewing.status === 'scheduled' && new Date(viewing.scheduledDate) >= now) {
          upcomingViewings.push({
            ...viewing.toObject ? viewing.toObject() : viewing,
            leadId: lead._id.toString(),
            leadName: lead.name,
            leadPhone: lead.phone
          });
        }
      });
    });

    upcomingViewings.sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate));

    res.status(200).json({ success: true, data: upcomingViewings });
  } catch (error) {
    logger.error('Get upcoming viewings error:', error);
    res.status(500).json({ success: false, message: 'Failed to get upcoming viewings' });
  }
});

// =====================
// MESSAGING
// =====================

router.get('/messages', getConversations);
router.get('/messages/unread-count', getUnreadCount);
router.get('/messages/:partnerId', getConversation);
router.post('/messages', sendMessage);
router.put('/messages/:partnerId/read', markAsRead);

export default router;