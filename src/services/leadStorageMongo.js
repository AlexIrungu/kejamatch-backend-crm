/**
 * Lead Storage Service - MongoDB Implementation
 * Replaces JSON file storage with MongoDB Atlas
 */

import Lead from '../models/LeadModel.js';
import logger from '../utils/logger.js';

class LeadStorage {
  static async initialize() {
    // MongoDB doesn't need initialization like JSON files
    // This method is kept for API compatibility
    return true;
  }

  static async saveLead(leadData) {
    try {
      const lead = new Lead({
        name: leadData.name,
        email: leadData.email,
        phoneNumber: leadData.phoneNumber || leadData.phone,
        subject: leadData.subject,
        message: leadData.message,
        source: leadData.source || 'website_contact_form',
        status: 'new',
        syncedToOdoo: false
      });

      // Add initial activity
      lead.addActivity(
        'lead_created',
        `Lead created from ${leadData.source || 'website contact form'}`,
        null,
        'System',
        { source: leadData.source || 'website_contact_form' }
      );

      await lead.save();

      logger.info(`✅ Lead created: ${lead.email} (${lead._id})`);

      return { success: true, lead: lead.toObject() };
    } catch (error) {
      logger.error('❌ Save lead error:', error);
      return { success: false, error: error.message };
    }
  }

  static async getAllLeads() {
    try {
      const leads = await Lead.find({})
        .populate('assignedTo', 'name email')
        .sort({ createdAt: -1 });
      
      return { success: true, leads };
    } catch (error) {
      logger.error('❌ Get all leads error:', error);
      return { success: false, error: error.message, leads: [] };
    }
  }

  static async findById(leadId) {
    try {
      const lead = await Lead.findById(leadId)
        .populate('assignedTo', 'name email role');
      return lead;
    } catch (error) {
      logger.error('❌ Find lead by ID error:', error);
      return null;
    }
  }

  static async getLeadsByStatus(status) {
    try {
      const leads = await Lead.findByStatus(status)
        .populate('assignedTo', 'name email');
      
      return { success: true, leads };
    } catch (error) {
      logger.error('❌ Get leads by status error:', error);
      return { success: false, error: error.message, leads: [] };
    }
  }

  static async getUnsyncedLeads() {
    try {
      const leads = await Lead.findUnsynced()
        .populate('assignedTo', 'name email');
      
      return { success: true, leads };
    } catch (error) {
      logger.error('❌ Get unsynced leads error:', error);
      return { success: false, error: error.message, leads: [] };
    }
  }

  static async markAsSynced(leadId, odooLeadId) {
    try {
      const lead = await Lead.findById(leadId);
      
      if (!lead) {
        return { success: false, error: 'Lead not found' };
      }

      await lead.markAsSynced(odooLeadId);

      logger.info(`✅ Lead marked as synced: ${leadId} -> Odoo ${odooLeadId}`);

      return { success: true };
    } catch (error) {
      logger.error('❌ Mark as synced error:', error);
      return { success: false, error: error.message };
    }
  }

  static async updateLeadStatus(leadId, status, userId = null, userName = null) {
    try {
      const lead = await Lead.findById(leadId);
      
      if (!lead) {
        return { success: false, error: 'Lead not found' };
      }

      await lead.changeStatus(status, userId, userName);

      logger.info(`✅ Lead status updated: ${leadId} -> ${status}`);

      return { success: true, lead: lead.toObject() };
    } catch (error) {
      logger.error('❌ Update lead status error:', error);
      return { success: false, error: error.message };
    }
  }

  static async updateLead(leadId, updates) {
    try {
      const lead = await Lead.findByIdAndUpdate(
        leadId,
        { $set: updates },
        { new: true, runValidators: true }
      );

      if (!lead) {
        return { success: false, error: 'Lead not found' };
      }

      logger.info(`✅ Lead updated: ${leadId}`);

      return { success: true, lead: lead.toObject() };
    } catch (error) {
      logger.error('❌ Update lead error:', error);
      return { success: false, error: error.message };
    }
  }

  static async assignLead(leadId, agentId, assignedBy, assignedByName = null, agentName = null) {
    try {
      const lead = await Lead.findById(leadId);
      
      if (!lead) {
        return { success: false, error: 'Lead not found' };
      }

      await lead.assignToAgent(agentId, assignedBy, assignedByName, agentName);

      logger.info(`✅ Lead assigned: ${leadId} -> ${agentName || agentId}`);

      return { success: true, lead: lead.toObject() };
    } catch (error) {
      logger.error('❌ Assign lead error:', error);
      return { success: false, error: error.message };
    }
  }

  static async addNote(leadId, note, userId, userName) {
    try {
      const lead = await Lead.findById(leadId);
      
      if (!lead) {
        return { success: false, error: 'Lead not found' };
      }

      await lead.addNote(note, userId, userName);

      logger.info(`✅ Note added to lead: ${leadId}`);

      return { success: true, lead: lead.toObject() };
    } catch (error) {
      logger.error('❌ Add note error:', error);
      return { success: false, error: error.message };
    }
  }

  static async logCall(leadId, callData, userId, userName) {
    try {
      const lead = await Lead.findById(leadId);
      
      if (!lead) {
        return { success: false, error: 'Lead not found' };
      }

      await lead.logCall(callData, userId, userName);

      logger.info(`✅ Call logged for lead: ${leadId}`);

      return { success: true, lead: lead.toObject() };
    } catch (error) {
      logger.error('❌ Log call error:', error);
      return { success: false, error: error.message };
    }
  }

  static async logEmail(leadId, emailData, userId, userName) {
    try {
      const lead = await Lead.findById(leadId);
      
      if (!lead) {
        return { success: false, error: 'Lead not found' };
      }

      await lead.logEmail(emailData, userId, userName);

      logger.info(`✅ Email logged for lead: ${leadId}`);

      return { success: true, lead: lead.toObject() };
    } catch (error) {
      logger.error('❌ Log email error:', error);
      return { success: false, error: error.message };
    }
  }

  static async scheduleViewing(leadId, viewingData, userId, userName) {
    try {
      const lead = await Lead.findById(leadId);
      
      if (!lead) {
        return { success: false, error: 'Lead not found' };
      }

      const viewing = await lead.scheduleViewing(viewingData, userId, userName);

      logger.info(`✅ Viewing scheduled for lead: ${leadId}`);

      return { success: true, lead: lead.toObject(), viewing };
    } catch (error) {
      logger.error('❌ Schedule viewing error:', error);
      return { success: false, error: error.message };
    }
  }

  static async completeViewing(leadId, viewingId, outcome, notes, userId, userName) {
    try {
      const lead = await Lead.findById(leadId);
      
      if (!lead) {
        return { success: false, error: 'Lead not found' };
      }

      await lead.completeViewing(viewingId, outcome, notes, userId, userName);

      logger.info(`✅ Viewing completed for lead: ${leadId}`);

      return { success: true, lead: lead.toObject() };
    } catch (error) {
      logger.error('❌ Complete viewing error:', error);
      return { success: false, error: error.message };
    }
  }

  static async addPropertyInterest(leadId, propertyData, userId, userName) {
    try {
      const lead = await Lead.findById(leadId);
      
      if (!lead) {
        return { success: false, error: 'Lead not found' };
      }

      await lead.addPropertyInterest(propertyData, userId, userName);

      logger.info(`✅ Property interest added for lead: ${leadId}`);

      return { success: true, lead: lead.toObject() };
    } catch (error) {
      logger.error('❌ Add property interest error:', error);
      return { success: false, error: error.message };
    }
  }

  static async getLeadActivities(leadId, limit = 50) {
    try {
      const lead = await Lead.findById(leadId);
      
      if (!lead) {
        return { success: false, error: 'Lead not found' };
      }

      const activities = lead.activities.slice(0, limit);

      return { success: true, activities };
    } catch (error) {
      logger.error('❌ Get lead activities error:', error);
      return { success: false, error: error.message };
    }
  }

  static async deleteLead(leadId) {
    try {
      const lead = await Lead.findByIdAndDelete(leadId);
      
      if (!lead) {
        return { success: false, error: 'Lead not found' };
      }

      logger.info(`✅ Lead deleted: ${leadId}`);

      return { success: true };
    } catch (error) {
      logger.error('❌ Delete lead error:', error);
      return { success: false, error: error.message };
    }
  }

  static async getLeadsByAgent(agentId) {
    try {
      const leads = await Lead.findByAgent(agentId)
        .populate('assignedTo', 'name email');
      
      return { success: true, leads };
    } catch (error) {
      logger.error('❌ Get agent leads error:', error);
      return { success: false, error: error.message, leads: [] };
    }
  }

  static async getStats() {
    try {
      const stats = await Lead.getStats();
      return { success: true, stats };
    } catch (error) {
      logger.error('❌ Get stats error:', error);
      return { success: false, error: error.message };
    }
  }

  static async exportToCSV() {
    try {
      const { leads } = await this.getAllLeads();
      
      if (leads.length === 0) {
        return { success: false, error: 'No leads to export' };
      }

      const headers = [
        'ID', 'Name', 'Email', 'Phone', 'Subject', 'Message', 'Status',
        'Created At', 'Assigned To', 'Last Contacted', 'Activities Count',
        'Synced to Odoo', 'Odoo Lead ID'
      ];

      const rows = leads.map(lead => [
        lead._id,
        lead.name,
        lead.email,
        lead.phoneNumber || lead.phone || '',
        lead.subject || '',
        `"${(lead.message || '').replace(/"/g, '""')}"`,
        lead.status,
        lead.createdAt,
        lead.assignedToName || (lead.assignedTo ? lead.assignedTo.name : ''),
        lead.lastContactedAt || '',
        (lead.activities || []).length,
        lead.syncedToOdoo ? 'Yes' : 'No',
        lead.odooLeadId || ''
      ]);

      const csv = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');

      return { success: true, csv };
    } catch (error) {
      logger.error('❌ Export to CSV error:', error);
      return { success: false, error: error.message };
    }
  }
}

export default LeadStorage;
export { LeadStorage as leadStorage };