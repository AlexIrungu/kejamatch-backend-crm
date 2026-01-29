/**
 * Odoo Service
 * Core service for interacting with Odoo CRM
 */

import odooConfig from '../config/odoo.js';
import odooAuth from './odooAuth.js';
import logger from '../utils/logger.js';
import { retryWithBackoff } from '../utils/retry.js';

class OdooService {
  /**
   * Call Odoo's RPC API
   * @param {string} model - Odoo model name (e.g., 'crm.lead')
   * @param {string} method - Method name (e.g., 'create', 'search', 'write')
   * @param {Array} args - Method arguments
   * @param {Object} kwargs - Method keyword arguments
   * @returns {Promise} - API result
   */
  async callKw(model, method, args = [], kwargs = {}) {
    await odooAuth.ensureAuthenticated();

    const payload = {
      jsonrpc: '2.0',
      method: 'call',
      params: {
        service: 'object',
        method: 'execute_kw',
        args: [
          odooConfig.database,
          odooAuth.userId,
          odooConfig.password,
          model,
          method,
          args,
          kwargs,
        ],
      },
      id: Math.floor(Math.random() * 1000000),
    };

    try {
      const response = await fetch(`${odooConfig.url}/jsonrpc`, {
        method: 'POST',
        headers: odooAuth.getHeaders(),
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(odooConfig.apiTimeout),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.error) {
        const errorMsg = data.error.data?.message || data.error.message || 'Unknown Odoo error';
        throw new Error(errorMsg);
      }

      return data.result;

    } catch (error) {
      logger.error(`Odoo API Error (${model}.${method}):`, error.message);
      throw error;
    }
  }

  /**
   * Create a lead in CRM
   * @param {Object} leadData - Lead data
   * @returns {Promise<Object>} - Created lead info
   */
  async createLead(leadData) {
    try {
      logger.info(`📝 Creating lead in Odoo CRM: ${leadData.name}`);

      // Get source ID (create if doesn't exist)
      const sourceId = await this.getOrCreateSource(leadData.source || 'Website');
      
      // Get stage ID for "New Lead"
      const stageId = await this.getStageId('New Lead');

      const leadPayload = {
        name: leadData.name,
        contact_name: leadData.name,
        email_from: leadData.email,
        phone: leadData.phone,
        description: leadData.message || '',
        type: leadData.type || 'lead',
        source_id: sourceId,
        stage_id: stageId,
        
        // Custom Kejamatch fields
        x_budget_range: leadData.budgetRange || null,
        x_preferred_county: leadData.preferredCounty || null,
        x_property_interest: leadData.propertyInterest || null,
        x_communication_preference: leadData.communicationPreference || 'whatsapp',
      };

      const leadId = await retryWithBackoff(
        () => this.callKw('crm.lead', 'create', [leadPayload]),
        odooConfig.retryAttempts,
        odooConfig.retryDelay
      );

      logger.success(`✅ Lead created successfully in Odoo (ID: ${leadId})`);

      return {
        success: true,
        leadId,
        name: leadData.name,
      };

    } catch (error) {
      logger.error('❌ Failed to create lead in Odoo:', error.message);
      throw error;
    }
  }

  /**
   * Create a booking (opportunity with calendar event)
   * @param {Object} bookingData - Booking data
   * @returns {Promise<Object>} - Created booking info
   */
  async createBooking(bookingData) {
    try {
      logger.info(`📅 Creating booking in Odoo CRM: ${bookingData.propertyName}`);

      const sourceId = await this.getOrCreateSource('Website Booking Form');
      const stageId = await this.getStageId('Viewing Scheduled');

      // Create opportunity
      const opportunityPayload = {
        name: `Booking: ${bookingData.propertyName}`,
        contact_name: bookingData.name,
        email_from: bookingData.email,
        phone: bookingData.phone,
        type: 'opportunity',
        source_id: sourceId,
        stage_id: stageId,
        expected_revenue: bookingData.totalCost || 0,
        
        description: `
Booking Request
===============
Property: ${bookingData.propertyName}
Location: ${bookingData.propertyLocation || 'N/A'}
Check-in: ${bookingData.checkIn}
Check-out: ${bookingData.checkOut}
Guests: ${bookingData.guests}
Nights: ${bookingData.nights}
Total Cost: KES ${bookingData.totalCost?.toLocaleString()}

Special Requests:
${bookingData.specialRequests || 'None'}
        `.trim(),
        
        // Custom fields
        x_property_id: bookingData.propertyId || null,
        x_property_name: bookingData.propertyName,
        x_viewing_completed: false,
      };

      const opportunityId = await retryWithBackoff(
        () => this.callKw('crm.lead', 'create', [opportunityPayload]),
        odooConfig.retryAttempts,
        odooConfig.retryDelay
      );

      // Create calendar event for the booking
      let calendarEventId = null;
      try {
        const checkInDate = new Date(bookingData.checkIn);
        const checkOutDate = new Date(bookingData.checkOut);

        const eventPayload = {
          name: `Property Viewing: ${bookingData.propertyName}`,
          start: checkInDate.toISOString(),
          stop: checkOutDate.toISOString(),
          description: `Client: ${bookingData.name}\nPhone: ${bookingData.phone}\nProperty: ${bookingData.propertyName}`,
          opportunity_id: opportunityId,
        };

        calendarEventId = await this.callKw('calendar.event', 'create', [eventPayload]);
        logger.success(`✅ Calendar event created (ID: ${calendarEventId})`);
      } catch (calendarError) {
        logger.warn('⚠️ Failed to create calendar event:', calendarError.message);
        // Don't fail the entire booking if calendar creation fails
      }

      logger.success(`✅ Booking created successfully in Odoo (ID: ${opportunityId})`);

      return {
        success: true,
        opportunityId,
        calendarEventId,
        propertyName: bookingData.propertyName,
      };

    } catch (error) {
      logger.error('❌ Failed to create booking in Odoo:', error.message);
      throw error;
    }
  }

  /**
   * Get or create a source (utm.source)
   * @param {string} sourceName - Source name
   * @returns {Promise<number>} - Source ID
   */
  async getOrCreateSource(sourceName) {
    try {
      // Search for existing source
      const sourceIds = await this.callKw(
        'utm.source',
        'search',
        [[['name', '=', sourceName]]],
        { limit: 1 }
      );

      if (sourceIds && sourceIds.length > 0) {
        return sourceIds[0];
      }

      // Create new source
      logger.debug(`Creating new source: ${sourceName}`);
      const sourceId = await this.callKw('utm.source', 'create', [{ name: sourceName }]);
      return sourceId;

    } catch (error) {
      logger.warn('Could not get/create source, using default');
      return 1; // Default source ID
    }
  }

  /**
   * Get stage ID by name
   * @param {string} stageName - Stage name
   * @returns {Promise<number>} - Stage ID
   */
  async getStageId(stageName) {
    try {
      const stages = await this.callKw(
        'crm.stage',
        'search_read',
        [[['name', '=', stageName]]],
        { fields: ['id'], limit: 1 }
      );

      if (stages && stages.length > 0) {
        return stages[0].id;
      }

      logger.warn(`Stage "${stageName}" not found, using first stage`);
      
      // Get first stage as fallback
      const firstStage = await this.callKw(
        'crm.stage',
        'search_read',
        [[]],
        { fields: ['id'], limit: 1, order: 'sequence' }
      );

      return firstStage[0]?.id || 1;

    } catch (error) {
      logger.warn('Could not get stage ID, using default');
      return 1;
    }
  }

  /**
   * Search for leads
   * @param {Array} domain - Search domain
   * @param {Object} options - Search options
   * @returns {Promise<Array>} - Leads
   */
  async searchLeads(domain = [], options = {}) {
    return this.callKw('crm.lead', 'search_read', [domain], options);
  }

  /**
   * Update a lead
   * @param {number} leadId - Lead ID
   * @param {Object} values - Values to update
   * @returns {Promise<boolean>} - Success status
   */
  async updateLead(leadId, values) {
    return this.callKw('crm.lead', 'write', [[leadId], values]);
  }

  /**
   * Health check
   * @returns {Promise<Object>} - Health status
   */
  async healthCheck() {
    try {
      await odooAuth.ensureAuthenticated();
      
      // Try to read one lead to verify connection
      const leads = await this.callKw(
        'crm.lead',
        'search_read',
        [[]],
        { fields: ['id'], limit: 1 }
      );

      return {
        success: true,
        authenticated: true,
        database: odooConfig.database,
        url: odooConfig.url,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

export const odooService = new OdooService();

export default odooService;