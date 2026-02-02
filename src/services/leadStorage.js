/**
 * Lead Storage Service - Enhanced with Activity Timeline
 * Stores contact form submissions and tracks all lead interactions
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LEADS_FILE = path.join(__dirname, '../../data/leads.json');
const DATA_DIR = path.join(__dirname, '../../data');

/**
 * Activity Types:
 * - lead_created: When lead is first created
 * - status_change: When lead status changes
 * - note_added: When a note is added
 * - assigned: When lead is assigned to an agent
 * - call_logged: When a call is logged
 * - email_sent: When an email is sent
 * - viewing_scheduled: When a property viewing is scheduled
 * - viewing_completed: When a viewing is marked complete
 * - property_interested: When lead shows interest in a property
 */

class LeadStorage {
  static generateActivityId() {
    return `ACT-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  }

  static createActivity(type, description, userId = null, userName = null, metadata = {}) {
    return {
      id: this.generateActivityId(),
      type,
      description,
      userId,
      userName,
      metadata,
      createdAt: new Date().toISOString(),
    };
  }

  static async initialize() {
    try {
      await fs.mkdir(DATA_DIR, { recursive: true });
      try {
        await fs.access(LEADS_FILE);
      } catch {
        await fs.writeFile(LEADS_FILE, JSON.stringify({ leads: [] }, null, 2));
      }
    } catch (error) {
      console.error('Error initializing lead storage:', error);
      throw error;
    }
  }

  static async readLeads() {
    try {
      const data = await fs.readFile(LEADS_FILE, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error reading leads:', error);
      return { leads: [] };
    }
  }

  static async writeLeads(data) {
    try {
      await fs.writeFile(LEADS_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Error writing leads:', error);
      throw error;
    }
  }

  static async saveLead(leadData) {
    try {
      await this.initialize();
      const storage = await this.readLeads();
      
      const lead = {
        id: `LEAD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        ...leadData,
        createdAt: new Date().toISOString(),
        status: 'new',
        source: leadData.source || 'website_contact_form',
        syncedToOdoo: false,
        activities: [
          this.createActivity(
            'lead_created',
            `Lead created from ${leadData.source || 'website contact form'}`,
            null,
            'System',
            { source: leadData.source || 'website_contact_form' }
          )
        ],
      };
      
      storage.leads.unshift(lead);
      await this.writeLeads(storage);
      return { success: true, lead };
    } catch (error) {
      console.error('Error saving lead:', error);
      return { success: false, error: error.message };
    }
  }

  static async getAllLeads() {
    try {
      await this.initialize();
      const storage = await this.readLeads();
      return { success: true, leads: storage.leads };
    } catch (error) {
      console.error('Error getting leads:', error);
      return { success: false, error: error.message, leads: [] };
    }
  }

  static async findById(leadId) {
    try {
      const storage = await this.readLeads();
      return storage.leads.find(l => l.id === leadId) || null;
    } catch (error) {
      console.error('Error finding lead:', error);
      return null;
    }
  }

  static async getLeadsByStatus(status) {
    try {
      const storage = await this.readLeads();
      const filteredLeads = storage.leads.filter(lead => lead.status === status);
      return { success: true, leads: filteredLeads };
    } catch (error) {
      console.error('Error filtering leads:', error);
      return { success: false, error: error.message, leads: [] };
    }
  }

  static async getUnsyncedLeads() {
    try {
      const storage = await this.readLeads();
      const unsyncedLeads = storage.leads.filter(lead => !lead.syncedToOdoo);
      return { success: true, leads: unsyncedLeads };
    } catch (error) {
      console.error('Error getting unsynced leads:', error);
      return { success: false, error: error.message, leads: [] };
    }
  }

  static async markAsSynced(leadId, odooLeadId) {
    try {
      const storage = await this.readLeads();
      const leadIndex = storage.leads.findIndex(lead => lead.id === leadId);
      
      if (leadIndex !== -1) {
        storage.leads[leadIndex].syncedToOdoo = true;
        storage.leads[leadIndex].odooLeadId = odooLeadId;
        storage.leads[leadIndex].syncedAt = new Date().toISOString();
        
        if (!storage.leads[leadIndex].activities) {
          storage.leads[leadIndex].activities = [];
        }
        storage.leads[leadIndex].activities.unshift(
          this.createActivity('synced_to_odoo', 'Lead synced to Odoo CRM', null, 'System', { odooLeadId })
        );
        
        await this.writeLeads(storage);
        return { success: true };
      }
      return { success: false, error: 'Lead not found' };
    } catch (error) {
      console.error('Error marking lead as synced:', error);
      return { success: false, error: error.message };
    }
  }

  static async updateLeadStatus(leadId, status, userId = null, userName = null) {
    try {
      const storage = await this.readLeads();
      const leadIndex = storage.leads.findIndex(lead => lead.id === leadId);
      
      if (leadIndex !== -1) {
        const oldStatus = storage.leads[leadIndex].status;
        storage.leads[leadIndex].status = status;
        storage.leads[leadIndex].updatedAt = new Date().toISOString();
        
        if (!storage.leads[leadIndex].activities) {
          storage.leads[leadIndex].activities = [];
        }
        storage.leads[leadIndex].activities.unshift(
          this.createActivity(
            'status_change',
            `Status changed from "${oldStatus}" to "${status}"`,
            userId,
            userName || 'Unknown',
            { oldStatus, newStatus: status }
          )
        );
        
        await this.writeLeads(storage);
        return { success: true, lead: storage.leads[leadIndex] };
      }
      return { success: false, error: 'Lead not found' };
    } catch (error) {
      console.error('Error updating lead status:', error);
      return { success: false, error: error.message };
    }
  }

  static async updateLead(leadId, updates) {
    try {
      const storage = await this.readLeads();
      const leadIndex = storage.leads.findIndex(lead => lead.id === leadId);
      
      if (leadIndex !== -1) {
        const existingActivities = storage.leads[leadIndex].activities || [];
        storage.leads[leadIndex] = {
          ...storage.leads[leadIndex],
          ...updates,
          activities: existingActivities,
          updatedAt: new Date().toISOString(),
        };
        await this.writeLeads(storage);
        return { success: true, lead: storage.leads[leadIndex] };
      }
      return { success: false, error: 'Lead not found' };
    } catch (error) {
      console.error('Error updating lead:', error);
      return { success: false, error: error.message };
    }
  }

  static async assignLead(leadId, agentId, assignedBy, assignedByName = null, agentName = null) {
    try {
      const storage = await this.readLeads();
      const leadIndex = storage.leads.findIndex(lead => lead.id === leadId);
      
      if (leadIndex !== -1) {
        const previousAgent = storage.leads[leadIndex].assignedTo;
        storage.leads[leadIndex].assignedTo = agentId;
        storage.leads[leadIndex].assignedToName = agentName;
        storage.leads[leadIndex].assignedAt = new Date().toISOString();
        storage.leads[leadIndex].assignedBy = assignedBy;
        storage.leads[leadIndex].updatedAt = new Date().toISOString();
        
        if (!storage.leads[leadIndex].activities) {
          storage.leads[leadIndex].activities = [];
        }
        
        const description = previousAgent 
          ? `Lead reassigned to ${agentName || 'agent'}`
          : `Lead assigned to ${agentName || 'agent'}`;
        
        storage.leads[leadIndex].activities.unshift(
          this.createActivity('assigned', description, assignedBy, assignedByName || 'Admin', { agentId, agentName, previousAgent })
        );
        
        await this.writeLeads(storage);
        return { success: true, lead: storage.leads[leadIndex] };
      }
      return { success: false, error: 'Lead not found' };
    } catch (error) {
      console.error('Error assigning lead:', error);
      return { success: false, error: error.message };
    }
  }

  static async addNote(leadId, note, userId, userName) {
    try {
      const storage = await this.readLeads();
      const leadIndex = storage.leads.findIndex(lead => lead.id === leadId);
      
      if (leadIndex !== -1) {
        if (!storage.leads[leadIndex].activities) {
          storage.leads[leadIndex].activities = [];
        }
        
        storage.leads[leadIndex].activities.unshift(
          this.createActivity('note_added', note, userId, userName, { note })
        );
        storage.leads[leadIndex].lastNote = note;
        storage.leads[leadIndex].updatedAt = new Date().toISOString();
        
        await this.writeLeads(storage);
        return { success: true, lead: storage.leads[leadIndex] };
      }
      return { success: false, error: 'Lead not found' };
    } catch (error) {
      console.error('Error adding note:', error);
      return { success: false, error: error.message };
    }
  }

  static async logCall(leadId, callData, userId, userName) {
    try {
      const storage = await this.readLeads();
      const leadIndex = storage.leads.findIndex(lead => lead.id === leadId);
      
      if (leadIndex !== -1) {
        if (!storage.leads[leadIndex].activities) {
          storage.leads[leadIndex].activities = [];
        }
        
        const { outcome, duration, notes } = callData;
        const description = `Call logged: ${outcome}${duration ? ` (${duration} mins)` : ''}${notes ? ` - ${notes}` : ''}`;
        
        storage.leads[leadIndex].activities.unshift(
          this.createActivity('call_logged', description, userId, userName, { outcome, duration, notes })
        );
        storage.leads[leadIndex].lastContactedAt = new Date().toISOString();
        storage.leads[leadIndex].updatedAt = new Date().toISOString();
        
        await this.writeLeads(storage);
        return { success: true, lead: storage.leads[leadIndex] };
      }
      return { success: false, error: 'Lead not found' };
    } catch (error) {
      console.error('Error logging call:', error);
      return { success: false, error: error.message };
    }
  }

  static async logEmail(leadId, emailData, userId, userName) {
    try {
      const storage = await this.readLeads();
      const leadIndex = storage.leads.findIndex(lead => lead.id === leadId);
      
      if (leadIndex !== -1) {
        if (!storage.leads[leadIndex].activities) {
          storage.leads[leadIndex].activities = [];
        }
        
        const { subject, type } = emailData;
        const description = `Email sent: ${subject || type || 'Follow-up'}`;
        
        storage.leads[leadIndex].activities.unshift(
          this.createActivity('email_sent', description, userId, userName, emailData)
        );
        storage.leads[leadIndex].lastContactedAt = new Date().toISOString();
        storage.leads[leadIndex].updatedAt = new Date().toISOString();
        
        await this.writeLeads(storage);
        return { success: true, lead: storage.leads[leadIndex] };
      }
      return { success: false, error: 'Lead not found' };
    } catch (error) {
      console.error('Error logging email:', error);
      return { success: false, error: error.message };
    }
  }

  static async scheduleViewing(leadId, viewingData, userId, userName) {
    try {
      const storage = await this.readLeads();
      const leadIndex = storage.leads.findIndex(lead => lead.id === leadId);
      
      if (leadIndex !== -1) {
        if (!storage.leads[leadIndex].activities) storage.leads[leadIndex].activities = [];
        if (!storage.leads[leadIndex].viewings) storage.leads[leadIndex].viewings = [];
        
        const { propertyId, propertyName, scheduledDate, scheduledTime, notes } = viewingData;
        
        const viewing = {
          id: `VIEW-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          propertyId, propertyName, scheduledDate, scheduledTime, notes,
          status: 'scheduled',
          createdAt: new Date().toISOString(),
          createdBy: userId,
        };
        
        storage.leads[leadIndex].viewings.push(viewing);
        
        const description = `Viewing scheduled for ${propertyName || 'property'} on ${scheduledDate} at ${scheduledTime}`;
        storage.leads[leadIndex].activities.unshift(
          this.createActivity('viewing_scheduled', description, userId, userName, { viewing })
        );
        storage.leads[leadIndex].updatedAt = new Date().toISOString();
        
        await this.writeLeads(storage);
        return { success: true, lead: storage.leads[leadIndex], viewing };
      }
      return { success: false, error: 'Lead not found' };
    } catch (error) {
      console.error('Error scheduling viewing:', error);
      return { success: false, error: error.message };
    }
  }

  static async completeViewing(leadId, viewingId, outcome, notes, userId, userName) {
    try {
      const storage = await this.readLeads();
      const leadIndex = storage.leads.findIndex(lead => lead.id === leadId);
      
      if (leadIndex !== -1) {
        const lead = storage.leads[leadIndex];
        if (!lead.viewings) return { success: false, error: 'No viewings found' };
        
        const viewingIndex = lead.viewings.findIndex(v => v.id === viewingId);
        if (viewingIndex === -1) return { success: false, error: 'Viewing not found' };
        
        lead.viewings[viewingIndex].status = 'completed';
        lead.viewings[viewingIndex].outcome = outcome;
        lead.viewings[viewingIndex].completedNotes = notes;
        lead.viewings[viewingIndex].completedAt = new Date().toISOString();
        lead.viewings[viewingIndex].completedBy = userId;
        
        if (!lead.activities) lead.activities = [];
        
        const propertyName = lead.viewings[viewingIndex].propertyName || 'property';
        const description = `Viewing completed for ${propertyName}: ${outcome}${notes ? ` - ${notes}` : ''}`;
        
        lead.activities.unshift(
          this.createActivity('viewing_completed', description, userId, userName, { viewingId, outcome, notes })
        );
        lead.updatedAt = new Date().toISOString();
        
        await this.writeLeads(storage);
        return { success: true, lead };
      }
      return { success: false, error: 'Lead not found' };
    } catch (error) {
      console.error('Error completing viewing:', error);
      return { success: false, error: error.message };
    }
  }

  static async addPropertyInterest(leadId, propertyData, userId, userName) {
    try {
      const storage = await this.readLeads();
      const leadIndex = storage.leads.findIndex(lead => lead.id === leadId);
      
      if (leadIndex !== -1) {
        if (!storage.leads[leadIndex].interestedProperties) storage.leads[leadIndex].interestedProperties = [];
        if (!storage.leads[leadIndex].activities) storage.leads[leadIndex].activities = [];
        
        const { propertyId, propertyName, notes } = propertyData;
        
        const exists = storage.leads[leadIndex].interestedProperties.find(p => p.propertyId === propertyId);
        if (!exists) {
          storage.leads[leadIndex].interestedProperties.push({
            propertyId, propertyName, addedAt: new Date().toISOString(), addedBy: userId, notes,
          });
        }
        
        storage.leads[leadIndex].activities.unshift(
          this.createActivity('property_interested', `Interested in property: ${propertyName || propertyId}`, userId, userName, { propertyId, propertyName, notes })
        );
        storage.leads[leadIndex].updatedAt = new Date().toISOString();
        
        await this.writeLeads(storage);
        return { success: true, lead: storage.leads[leadIndex] };
      }
      return { success: false, error: 'Lead not found' };
    } catch (error) {
      console.error('Error adding property interest:', error);
      return { success: false, error: error.message };
    }
  }

  static async getLeadActivities(leadId, limit = 50) {
    try {
      const lead = await this.findById(leadId);
      if (!lead) return { success: false, error: 'Lead not found' };
      return { success: true, activities: (lead.activities || []).slice(0, limit) };
    } catch (error) {
      console.error('Error getting lead activities:', error);
      return { success: false, error: error.message };
    }
  }

  static async deleteLead(leadId) {
    try {
      const storage = await this.readLeads();
      const leadIndex = storage.leads.findIndex(lead => lead.id === leadId);
      
      if (leadIndex !== -1) {
        storage.leads.splice(leadIndex, 1);
        await this.writeLeads(storage);
        return { success: true };
      }
      return { success: false, error: 'Lead not found' };
    } catch (error) {
      console.error('Error deleting lead:', error);
      return { success: false, error: error.message };
    }
  }

  static async getLeadsByAgent(agentId) {
    try {
      const storage = await this.readLeads();
      return { success: true, leads: storage.leads.filter(lead => lead.assignedTo === agentId) };
    } catch (error) {
      console.error('Error getting agent leads:', error);
      return { success: false, error: error.message, leads: [] };
    }
  }

  static async getStats() {
    try {
      const storage = await this.readLeads();
      const leads = storage.leads;
      
      return {
        success: true,
        stats: {
          total: leads.length,
          new: leads.filter(l => l.status === 'new').length,
          contacted: leads.filter(l => l.status === 'contacted').length,
          qualified: leads.filter(l => l.status === 'qualified').length,
          viewing: leads.filter(l => l.status === 'viewing').length,
          negotiating: leads.filter(l => l.status === 'negotiating').length,
          won: leads.filter(l => l.status === 'won').length,
          lost: leads.filter(l => l.status === 'lost').length,
          syncedToOdoo: leads.filter(l => l.syncedToOdoo).length,
          unsyncedToOdoo: leads.filter(l => !l.syncedToOdoo).length,
        }
      };
    } catch (error) {
      console.error('Error getting stats:', error);
      return { success: false, error: error.message };
    }
  }

  static async exportToCSV() {
    try {
      const storage = await this.readLeads();
      const leads = storage.leads;
      
      if (leads.length === 0) return { success: false, error: 'No leads to export' };
      
      const headers = ['ID', 'Name', 'Email', 'Phone', 'Subject', 'Message', 'Status', 'Created At', 'Assigned To', 'Last Contacted', 'Activities Count', 'Synced to Odoo', 'Odoo Lead ID'];
      
      const rows = leads.map(lead => [
        lead.id, lead.name, lead.email, lead.phoneNumber || lead.phone || '',
        lead.subject || '', `"${(lead.message || '').replace(/"/g, '""')}"`,
        lead.status, lead.createdAt, lead.assignedToName || lead.assignedTo || '',
        lead.lastContactedAt || '', (lead.activities || []).length,
        lead.syncedToOdoo ? 'Yes' : 'No', lead.odooLeadId || ''
      ]);
      
      return { success: true, csv: [headers.join(','), ...rows.map(row => row.join(','))].join('\n') };
    } catch (error) {
      console.error('Error exporting to CSV:', error);
      return { success: false, error: error.message };
    }
  }
}

export default LeadStorage;
export { LeadStorage as leadStorage };