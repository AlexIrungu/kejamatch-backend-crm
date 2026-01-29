/**
 * Booking Controller
 * Handles booking submissions with CRM integration
 */

import resend from '../config/resend.js';
import { bookingAdminTemplate, bookingUserTemplate } from '../templates/emailTemplates.js';
import OdooLeads from '../services/odooLeads.js';
import logger from '../utils/logger.js';

export const handleBooking = async (req, res, next) => {
  try {
    const {
      propertyName,
      propertyLocation,
      name,
      email,
      phone,
      checkIn,
      checkOut,
      guests,
      nights,
      pricePerNight,
      totalCost,
      specialRequests
    } = req.body;

    logger.info(`📅 Processing booking from: ${name} for ${propertyName}`);

    // Format dates for email
    const formatDate = (dateString) => {
      return new Date(dateString).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    };

    const emailData = {
      propertyName,
      propertyLocation,
      name,
      email,
      phone,
      checkIn: formatDate(checkIn),
      checkOut: formatDate(checkOut),
      guests,
      nights,
      pricePerNight,
      totalCost,
      specialRequests: specialRequests || 'None'
    };

    // Send admin notification email
    const adminEmail = await resend.emails.send({
      from: process.env.FROM_EMAIL,
      to: process.env.ADMIN_EMAIL,
      subject: `New Booking Request - ${propertyName}`,
      html: bookingAdminTemplate(emailData)
    });

    // Send user confirmation email
    const userEmail = await resend.emails.send({
      from: process.env.FROM_EMAIL,
      to: email,
      subject: 'Booking Request Received - Kejamatch Properties',
      html: bookingUserTemplate(emailData)
    });

    logger.success('✅ Booking emails sent successfully', {
      admin: adminEmail.data?.id,
      user: userEmail.data?.id,
    });

    // Create opportunity in Odoo CRM (non-blocking)
    let crmResult = null;
    try {
      crmResult = await OdooLeads.fromBookingForm({
        ...req.body,
        checkIn, // Keep ISO format for CRM
        checkOut,
      });

      if (crmResult.success) {
        logger.success(`✅ Booking created in CRM (Opportunity ID: ${crmResult.opportunityId})`);
      } else {
        logger.warn('⚠️ CRM sync failed but email was sent:', crmResult.error);
      }
    } catch (crmError) {
      // Don't fail the request if CRM fails
      logger.error('⚠️ CRM error (non-critical):', crmError.message);
      crmResult = {
        success: false,
        error: crmError.message,
      };
    }

    // Return success response
    res.status(200).json({
      success: true,
      message: 'Booking request submitted successfully! We will contact you shortly.',
      data: {
        bookingId: adminEmail.data?.id,
        property: propertyName,
        checkIn: formatDate(checkIn),
        checkOut: formatDate(checkOut),
        totalCost,
        crm: crmResult, // Include CRM status for debugging
      }
    });

  } catch (error) {
    logger.error('❌ Booking error:', error);
    next(error);
  }
};