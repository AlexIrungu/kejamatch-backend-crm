/**
 * Booking Controller
 * Handles booking submissions with lead storage + CRM integration
 */

import resend from '../config/resend.js';
import { bookingAdminTemplate, bookingUserTemplate } from '../templates/emailTemplates.js';
import LeadStorage from '../services/leadStorageMongo.js'; // Use MongoDB version
import logger from '../utils/logger.js';

export const handleBooking = async (req, res, next) => {
  try {
    const {
      propertyName,
      propertyLocation,
      name,
      email,
      phoneNumber, // Changed from 'phone' to match contact form
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
      phone: phoneNumber, // For email template
      checkIn: formatDate(checkIn),
      checkOut: formatDate(checkOut),
      guests,
      nights,
      pricePerNight,
      totalCost,
      specialRequests: specialRequests || 'None'
    };

    // STEP 1: Save lead to database (like contact form does)
    const leadResult = await LeadStorage.saveLead({
      name,
      email,
      phoneNumber,
      subject: `BNB Booking: ${propertyName}`,
      message: `Booking Request:
Property: ${propertyName} (${propertyLocation})
Check-in: ${formatDate(checkIn)}
Check-out: ${formatDate(checkOut)}
Guests: ${guests}
Nights: ${nights}
Total Cost: KES ${totalCost.toLocaleString()}
Special Requests: ${specialRequests || 'None'}`,
      source: 'bnb_booking_form'
    });

    if (leadResult.success) {
      logger.info(`✅ Booking lead saved (ID: ${leadResult.lead._id})`);
    } else {
      logger.warn('⚠️ Failed to save booking lead:', leadResult.error);
    }

    // STEP 2: Send admin notification email
    const adminEmail = await resend.emails.send({
      from: process.env.FROM_EMAIL,
      to: process.env.ADMIN_EMAIL,
      subject: `🏠 New Booking Request - ${propertyName}`,
      html: bookingAdminTemplate(emailData),
      replyTo: email
    });

    // STEP 3: Send user confirmation email
    const userEmail = await resend.emails.send({
      from: process.env.FROM_EMAIL,
      to: email,
      subject: 'Booking Request Received - Kejamatch Properties',
      html: bookingUserTemplate(emailData)
    });

    logger.info('✅ Booking emails sent successfully', {
      admin: adminEmail.data?.id,
      user: userEmail.data?.id,
      leadId: leadResult.lead?._id
    });

    // Return success response
    res.status(200).json({
      success: true,
      message: 'Booking request submitted successfully! We will contact you shortly.',
      data: {
        leadId: leadResult.lead?._id,
        bookingId: adminEmail.data?.id,
        property: propertyName,
        checkIn: formatDate(checkIn),
        checkOut: formatDate(checkOut),
        totalCost
      }
    });

  } catch (error) {
    logger.error('❌ Booking error:', error);
    next(error);
  }
};