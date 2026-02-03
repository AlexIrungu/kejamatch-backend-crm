/**
 * Odoo Sync Service
 * Handles bidirectional sync between local MongoDB and Odoo CRM
 */

import odooService from './odooService.js';
import LeadStorage from './leadStorageMongo.js';
import SyncLog from '../models/SyncLogModel.js';
import logger from '../utils/logger.js';

class OdooSyncService {
  /**
   * Pull leads from Odoo that have been modified since last sync
   * @param {string} triggeredBy - User ID who triggered the sync
   * @returns {Promise<Object>} - Sync result
   */
  async syncFromOdoo(triggeredBy = null) {
    const syncLog = await SyncLog.create({
      type: 'odoo_pull',
      startedAt: new Date(),
      triggeredBy
    });

    try {
      logger.info('Starting Odoo pull sync...');

      // Get last successful sync time
      const lastSync = await SyncLog.findOne({
        type: 'odoo_pull',
        status: 'completed'
      }).sort({ completedAt: -1 });

      const lastSyncTime = lastSync?.completedAt || new Date(0);

      // Fetch leads from Odoo modified since last sync
      const domain = [
        ['write_date', '>', lastSyncTime.toISOString().replace('T', ' ').slice(0, 19)]
      ];

      const odooLeads = await odooService.searchLeads(domain, {
        fields: [
          'id', 'name', 'contact_name', 'email_from', 'phone',
          'description', 'stage_id', 'create_date', 'write_date',
          'x_budget_range', 'x_preferred_county', 'x_property_interest'
        ],
        limit: 500
      });

      logger.info(`Found ${odooLeads.length} modified leads in Odoo`);

      const summary = {
        totalProcessed: odooLeads.length,
        created: 0,
        updated: 0,
        skipped: 0,
        failed: 0
      };

      for (const odooLead of odooLeads) {
        try {
          // Find local lead by odooLeadId
          const localLeadsResponse = await LeadStorage.getAllLeads();
          const localLeads = localLeadsResponse?.leads || [];
          const localLead = localLeads.find(l => l.odooLeadId === odooLead.id);

          // Map Odoo stage to local status
          const statusMap = {
            'New Lead': 'new',
            'Contacted': 'contacted',
            'Qualified': 'qualified',
            'Viewing Scheduled': 'viewing',
            'Negotiation': 'negotiating',
            'Won': 'won',
            'Lost': 'lost'
          };

          const stageName = odooLead.stage_id?.[1] || 'New Lead';
          const mappedStatus = statusMap[stageName] || 'new';

          if (localLead) {
            // Update existing lead
            const updates = {
              status: mappedStatus,
              odooWriteDate: odooLead.write_date
            };

            // Only update name/contact if changed in Odoo
            if (odooLead.contact_name && odooLead.contact_name !== localLead.name) {
              updates.name = odooLead.contact_name;
            }

            await LeadStorage.updateLead(localLead._id.toString(), updates);
            summary.updated++;
            logger.debug(`Updated lead: ${localLead.name} (Odoo ID: ${odooLead.id})`);
          } else {
            // Create new lead from Odoo
            const newLead = {
              name: odooLead.contact_name || odooLead.name,
              email: odooLead.email_from,
              phone: odooLead.phone,
              message: odooLead.description || '',
              status: mappedStatus,
              source: 'odoo_import',
              odooLeadId: odooLead.id,
              odooWriteDate: odooLead.write_date,
              budgetRange: odooLead.x_budget_range,
              preferredCounty: odooLead.x_preferred_county,
              propertyInterest: odooLead.x_property_interest
            };

            await LeadStorage.createLead(newLead);
            summary.created++;
            logger.debug(`Created lead from Odoo: ${newLead.name} (Odoo ID: ${odooLead.id})`);
          }
        } catch (error) {
          summary.failed++;
          syncLog.errors.push({
            leadId: odooLead.id?.toString(),
            message: error.message
          });
          logger.error(`Failed to sync lead ${odooLead.id}:`, error.message);
        }
      }

      // Update sync log
      syncLog.status = 'completed';
      syncLog.completedAt = new Date();
      syncLog.summary = summary;
      await syncLog.save();

      logger.success(`Odoo pull sync completed: ${summary.created} created, ${summary.updated} updated, ${summary.failed} failed`);

      return {
        success: true,
        syncLogId: syncLog._id,
        summary
      };

    } catch (error) {
      syncLog.status = 'failed';
      syncLog.completedAt = new Date();
      syncLog.errors.push({ message: error.message });
      await syncLog.save();

      logger.error('Odoo pull sync failed:', error.message);
      throw error;
    }
  }

  /**
   * Push local lead changes to Odoo
   * @param {string} leadId - Local lead ID
   * @param {Object} updates - Updates to push
   * @returns {Promise<Object>} - Result
   */
  async pushToOdoo(leadId, updates) {
    try {
      const lead = await LeadStorage.findById(leadId);
      if (!lead || !lead.odooLeadId) {
        return { success: false, message: 'Lead not found or not linked to Odoo' };
      }

      // Map local status to Odoo stage
      const stageMap = {
        new: 'New Lead',
        contacted: 'Contacted',
        qualified: 'Qualified',
        viewing: 'Viewing Scheduled',
        negotiating: 'Negotiation',
        won: 'Won',
        lost: 'Lost'
      };

      const odooUpdates = {};

      if (updates.status) {
        const stageName = stageMap[updates.status];
        if (stageName) {
          const stageId = await odooService.getStageId(stageName);
          odooUpdates.stage_id = stageId;
        }
      }

      if (updates.name) {
        odooUpdates.contact_name = updates.name;
      }

      if (updates.notes) {
        // Append notes to description
        const currentLead = await odooService.searchLeads(
          [['id', '=', lead.odooLeadId]],
          { fields: ['description'], limit: 1 }
        );
        const currentDesc = currentLead[0]?.description || '';
        odooUpdates.description = `${currentDesc}\n\n[${new Date().toISOString()}]\n${updates.notes}`;
      }

      if (Object.keys(odooUpdates).length > 0) {
        await odooService.updateLead(lead.odooLeadId, odooUpdates);
        logger.info(`Pushed updates to Odoo lead ${lead.odooLeadId}`);
      }

      return { success: true };
    } catch (error) {
      logger.error('Failed to push to Odoo:', error.message);
      return { success: false, message: error.message };
    }
  }

  /**
   * Get sync logs
   * @param {Object} filters - Filters
   * @returns {Promise<Array>} - Sync logs
   */
  async getSyncLogs(filters = {}) {
    const query = {};
    if (filters.type) query.type = filters.type;
    if (filters.status) query.status = filters.status;

    return SyncLog.find(query)
      .sort({ startedAt: -1 })
      .limit(filters.limit || 20)
      .populate('triggeredBy', 'name email');
  }

  /**
   * Get last sync info
   * @returns {Promise<Object>} - Last sync info
   */
  async getLastSyncInfo() {
    const lastSync = await SyncLog.findOne({ status: 'completed' })
      .sort({ completedAt: -1 });

    return lastSync ? {
      type: lastSync.type,
      completedAt: lastSync.completedAt,
      summary: lastSync.summary
    } : null;
  }
}

export const odooSyncService = new OdooSyncService();
export default odooSyncService;
