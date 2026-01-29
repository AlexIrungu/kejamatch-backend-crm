/**
 * Contact Controller
 * Handles contact form submissions with CRM integration
 */

import resend from '../config/resend.js';
import { contactAdminTemplate, contactUserTemplate } from '../templates/emailTemplates.js';
import OdooLeads from '../services/odooLeads.js';
import logger from '../utils/logger.js';

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

    logger.info(`📧 Processing contact form from: ${name} (${email})`);

    // Send admin notification email
    const adminEmail = await resend.emails.send({
      from: process.env.FROM_EMAIL,
      to: process.env.ADMIN_EMAIL,
      subject: `New Contact Form: ${subject}`,
      html: contactAdminTemplate(emailData),
      replyTo: email // Allow admin to reply directly
    });

    // Send user confirmation email
    const userEmail = await resend.emails.send({
      from: process.env.FROM_EMAIL,
      to: email,
      subject: 'Message Received - Kejamatch Properties',
      html: contactUserTemplate(emailData)
    });

    logger.success('✅ Contact emails sent successfully', {
      admin: adminEmail.data?.id,
      user: userEmail.data?.id,
    });

    // Create lead in Odoo CRM (non-blocking)
    let crmResult = null;
    try {
      crmResult = await OdooLeads.fromContactForm(req.body);
      
      if (crmResult.success) {
        logger.success(`✅ Lead created in CRM (ID: ${crmResult.leadId})`);
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
      message: 'Message sent successfully! We will get back to you within 24 hours.',
      data: {
        messageId: adminEmail.data?.id,
        name,
        subject,
        crm: crmResult, // Include CRM status for debugging
      }
    });

  } catch (error) {
    logger.error('❌ Contact form error:', error);
    next(error);
  }
};