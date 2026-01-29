/**
 * Odoo Leads Service
 * High-level service for managing leads and opportunities
 */

import odooService from './odooService.js';
import logger from '../utils/logger.js';

class OdooLeads {
  /**
   * Create lead from contact form
   * @param {Object} formData - Contact form data
   * @returns {Promise<Object>} - Created lead info
   */
  static async fromContactForm(formData) {
    try {
      logger.info(`Creating lead from contact form: ${formData.name}`);

      const leadData = {
        name: formData.name,
        email: formData.email,
        phone: formData.phoneNumber,
        message: formData.message,
        source: 'Website Contact Form',
        type: 'lead',
        
        // Extract property interest from subject or message
        propertyInterest: this.extractPropertyInterest(formData.subject, formData.message),
      };

      const result = await odooService.createLead(leadData);
      
      return {
        success: true,
        leadId: result.leadId,
        message: 'Lead created successfully in CRM',
      };

    } catch (error) {
      logger.error('Failed to create lead from contact form:', error.message);
      
      // Return partial success - email was sent but CRM failed
      return {
        success: false,
        error: error.message,
        message: 'Email sent but CRM sync failed',
      };
    }
  }

  /**
   * Create opportunity from booking form
   * @param {Object} bookingData - Booking form data
   * @returns {Promise<Object>} - Created opportunity info
   */
  static async fromBookingForm(bookingData) {
    try {
      logger.info(`Creating opportunity from booking form: ${bookingData.propertyName}`);

      const result = await odooService.createBooking({
        ...bookingData,
        source: 'Website Booking Form',
      });

      return {
        success: true,
        opportunityId: result.opportunityId,
        calendarEventId: result.calendarEventId,
        message: 'Booking created successfully in CRM',
      };

    } catch (error) {
      logger.error('Failed to create booking in CRM:', error.message);
      
      return {
        success: false,
        error: error.message,
        message: 'Booking confirmation sent but CRM sync failed',
      };
    }
  }

  /**
   * Update lead stage
   * @param {number} leadId - Lead ID
   * @param {string} stageName - Stage name
   * @returns {Promise<boolean>} - Success status
   */
  static async updateStage(leadId, stageName) {
    try {
      const stageId = await odooService.getStageId(stageName);
      await odooService.updateLead(leadId, { stage_id: stageId });
      
      logger.success(`Lead ${leadId} moved to stage: ${stageName}`);
      return true;
    } catch (error) {
      logger.error('Failed to update lead stage:', error.message);
      return false;
    }
  }

  /**
   * Add note to lead
   * @param {number} leadId - Lead ID
   * @param {string} note - Note content
   * @returns {Promise<boolean>} - Success status
   */
  static async addNote(leadId, note) {
    try {
      await odooService.callKw('mail.message', 'create', [{
        model: 'crm.lead',
        res_id: leadId,
        body: note,
        message_type: 'comment',
      }]);

      logger.success(`Note added to lead ${leadId}`);
      return true;
    } catch (error) {
      logger.error('Failed to add note to lead:', error.message);
      return false;
    }
  }

  /**
   * Extract property interest from subject or message
   * @param {string} subject - Form subject
   * @param {string} message - Form message
   * @returns {string|null} - Extracted property interest
   */
  static extractPropertyInterest(subject, message) {
    const text = `${subject} ${message}`.toLowerCase();
    
    // Property types
    const propertyTypes = ['apartment', 'house', 'villa', 'land', 'commercial', 'office'];
    for (const type of propertyTypes) {
      if (text.includes(type)) {
        return type.charAt(0).toUpperCase() + type.slice(1);
      }
    }

    // Bedroom counts
    const bedroomMatch = text.match(/(\d+)\s*(br|bed|bedroom)/i);
    if (bedroomMatch) {
      return `${bedroomMatch[1]} Bedroom Property`;
    }

    // Counties
    const counties = ['nairobi', 'kiambu', 'machakos', 'kajiado', 'nakuru', 'mombasa'];
    for (const county of counties) {
      if (text.includes(county)) {
        return `Property in ${county.charAt(0).toUpperCase() + county.slice(1)}`;
      }
    }

    return 'General Property Inquiry';
  }

  /**
   * Get lead by email
   * @param {string} email - Email address
   * @returns {Promise<Array>} - Leads
   */
  static async getLeadByEmail(email) {
    try {
      return await odooService.searchLeads(
        [['email_from', '=', email]],
        { fields: ['id', 'name', 'stage_id', 'create_date'], limit: 10 }
      );
    } catch (error) {
      logger.error('Failed to search leads:', error.message);
      return [];
    }
  }

  /**
   * Get recent leads
   * @param {number} limit - Number of leads to fetch
   * @returns {Promise<Array>} - Leads
   */
  static async getRecentLeads(limit = 10) {
    try {
      return await odooService.searchLeads(
        [],
        { fields: ['id', 'name', 'email_from', 'phone', 'stage_id', 'create_date'], limit, order: 'create_date desc' }
      );
    } catch (error) {
      logger.error('Failed to fetch recent leads:', error.message);
      return [];
    }
  }
}

export default OdooLeads;