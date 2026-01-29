/**
 * Lead Storage Service
 * Stores contact form submissions locally (Phase 1 - works without Odoo API)
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Store leads in a JSON file
const LEADS_FILE = path.join(__dirname, '../../data/leads.json');
const DATA_DIR = path.join(__dirname, '../../data');

class LeadStorage {
  /**
   * Initialize storage (create data directory and file if not exists)
   */
  static async initialize() {
    try {
      // Create data directory if it doesn't exist
      await fs.mkdir(DATA_DIR, { recursive: true });
      
      // Create leads file if it doesn't exist
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

  /**
   * Read all leads from storage
   */
  static async readLeads() {
    try {
      const data = await fs.readFile(LEADS_FILE, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error reading leads:', error);
      return { leads: [] };
    }
  }

  /**
   * Write leads to storage
   */
  static async writeLeads(data) {
    try {
      await fs.writeFile(LEADS_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Error writing leads:', error);
      throw error;
    }
  }

  /**
   * Save a new lead
   */
  static async saveLead(leadData) {
    try {
      await this.initialize();
      
      const storage = await this.readLeads();
      
      const lead = {
        id: `LEAD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        ...leadData,
        createdAt: new Date().toISOString(),
        status: 'new', // new, contacted, qualified, converted, closed
        source: 'website_contact_form',
        syncedToOdoo: false,
      };
      
      storage.leads.unshift(lead); // Add to beginning of array
      
      await this.writeLeads(storage);
      
      return { success: true, lead };
    } catch (error) {
      console.error('Error saving lead:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all leads
   */
  static async getAllLeads() {
    try {
      const storage = await this.readLeads();
      return { success: true, leads: storage.leads };
    } catch (error) {
      console.error('Error getting leads:', error);
      return { success: false, error: error.message, leads: [] };
    }
  }

  /**
   * Get leads by status
   */
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

  /**
   * Get leads that haven't been synced to Odoo
   */
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

  /**
   * Mark lead as synced to Odoo
   */
  static async markAsSynced(leadId, odooLeadId) {
    try {
      const storage = await this.readLeads();
      const leadIndex = storage.leads.findIndex(lead => lead.id === leadId);
      
      if (leadIndex !== -1) {
        storage.leads[leadIndex].syncedToOdoo = true;
        storage.leads[leadIndex].odooLeadId = odooLeadId;
        storage.leads[leadIndex].syncedAt = new Date().toISOString();
        
        await this.writeLeads(storage);
        return { success: true };
      }
      
      return { success: false, error: 'Lead not found' };
    } catch (error) {
      console.error('Error marking lead as synced:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update lead status
   */
  static async updateLeadStatus(leadId, status) {
    try {
      const storage = await this.readLeads();
      const leadIndex = storage.leads.findIndex(lead => lead.id === leadId);
      
      if (leadIndex !== -1) {
        storage.leads[leadIndex].status = status;
        storage.leads[leadIndex].updatedAt = new Date().toISOString();
        
        await this.writeLeads(storage);
        return { success: true };
      }
      
      return { success: false, error: 'Lead not found' };
    } catch (error) {
      console.error('Error updating lead status:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get lead statistics
   */
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
          converted: leads.filter(l => l.status === 'converted').length,
          closed: leads.filter(l => l.status === 'closed').length,
          syncedToOdoo: leads.filter(l => l.syncedToOdoo).length,
          unsyncedToOdoo: leads.filter(l => !l.syncedToOdoo).length,
        }
      };
    } catch (error) {
      console.error('Error getting stats:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Convert leads to CSV format
   */
  static async exportToCSV() {
    try {
      const storage = await this.readLeads();
      const leads = storage.leads;
      
      if (leads.length === 0) {
        return { success: false, error: 'No leads to export' };
      }
      
      // CSV headers
      const headers = [
        'ID',
        'Name',
        'Email',
        'Phone',
        'Subject',
        'Message',
        'Status',
        'Created At',
        'Synced to Odoo',
        'Odoo Lead ID'
      ];
      
      // CSV rows
      const rows = leads.map(lead => [
        lead.id,
        lead.name,
        lead.email,
        lead.phoneNumber,
        lead.subject,
        `"${lead.message.replace(/"/g, '""')}"`, // Escape quotes in message
        lead.status,
        lead.createdAt,
        lead.syncedToOdoo ? 'Yes' : 'No',
        lead.odooLeadId || ''
      ]);
      
      // Combine headers and rows
      const csv = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');
      
      return { success: true, csv };
    } catch (error) {
      console.error('Error exporting to CSV:', error);
      return { success: false, error: error.message };
    }
  }
}

export default LeadStorage;