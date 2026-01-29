/**
 * Contact Controller (Updated with Lead Storage)
 * Handles contact form submissions with local storage + CRM integration
 */

import resend from '../config/resend.js';
import { contactAdminTemplate, contactUserTemplate } from '../templates/emailTemplates.js';
import LeadStorage from '../services/leadStorage.js';

export const handleContact = async (req, res, next) => {
  try {
    const {
      name,
      email,
      phoneNumber,
      subject,
      message
    } = req.body;

    const emailData = {
      name,
      email,
      phoneNumber,
      subject,
      message
    };

    console.log(`📧 Processing contact form from: ${name} (${email})`);

    // STEP 1: Save lead to local storage (this always works)
    const leadResult = await LeadStorage.saveLead({
      name,
      email,
      phoneNumber,
      subject,
      message
    });

    if (leadResult.success) {
      console.log(`✅ Lead saved locally (ID: ${leadResult.lead.id})`);
    } else {
      console.warn('⚠️ Failed to save lead locally:', leadResult.error);
    }

    // STEP 2: Send admin notification email
    const adminEmail = await resend.emails.send({
      from: process.env.FROM_EMAIL,
      to: process.env.ADMIN_EMAIL,
      subject: `🔔 New Lead: ${subject}`,
      html: contactAdminTemplate(emailData),
      replyTo: email // Allow admin to reply directly
    });

    // STEP 3: Send user confirmation email
    const userEmail = await resend.emails.send({
      from: process.env.FROM_EMAIL,
      to: email,
      subject: 'Message Received - Kejamatch Properties',
      html: contactUserTemplate(emailData)
    });

    console.log('✅ Emails sent successfully', {
      admin: adminEmail.data?.id,
      user: userEmail.data?.id,
      leadId: leadResult.lead?.id
    });

    // STEP 4: Try to sync to Odoo (Phase 2 - when API works)
    // This will be implemented later when Odoo API is available
    // For now, we just store locally
    
    // Return success response
    res.status(200).json({
      success: true,
      message: 'Message sent successfully! We will get back to you within 24 hours.',
      data: {
        leadId: leadResult.lead?.id,
        messageId: adminEmail.data?.id,
        name,
        subject,
      }
    });

  } catch (error) {
    console.error('❌ Contact form error:', error);
    next(error);
  }
};

/**
 * Get all leads (admin endpoint)
 */
export const getAllLeads = async (req, res, next) => {
  try {
    const result = await LeadStorage.getAllLeads();
    
    if (result.success) {
      res.status(200).json({
        success: true,
        data: {
          leads: result.leads,
          count: result.leads.length
        }
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve leads',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error getting leads:', error);
    next(error);
  }
};

/**
 * Get lead statistics (admin endpoint)
 */
export const getLeadStats = async (req, res, next) => {
  try {
    const result = await LeadStorage.getStats();
    
    if (result.success) {
      res.status(200).json({
        success: true,
        data: result.stats
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve statistics',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error getting stats:', error);
    next(error);
  }
};

/**
 * Export leads to CSV (admin endpoint)
 */
export const exportLeadsCSV = async (req, res, next) => {
  try {
    const result = await LeadStorage.exportToCSV();
    
    if (result.success) {
      // Set headers for CSV download
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=kejamatch-leads-${Date.now()}.csv`);
      res.status(200).send(result.csv);
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to export leads',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error exporting leads:', error);
    next(error);
  }
};

/**
 * Update lead status (admin endpoint)
 */
export const updateLeadStatus = async (req, res, next) => {
  try {
    const { leadId } = req.params;
    const { status } = req.body;
    
    const validStatuses = ['new', 'contacted', 'qualified', 'converted', 'closed'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }
    
    const result = await LeadStorage.updateLeadStatus(leadId, status);
    
    if (result.success) {
      res.status(200).json({
        success: true,
        message: 'Lead status updated successfully'
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Lead not found',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error updating lead status:', error);
    next(error);
  }
};