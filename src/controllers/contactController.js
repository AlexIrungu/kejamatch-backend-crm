import resend from '../config/resend.js';
import { contactAdminTemplate, contactUserTemplate } from '../templates/emailTemplates.js';

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

    // Log email IDs for debugging
    console.log('Contact emails sent:', {
      admin: adminEmail.data?.id,
      user: userEmail.data?.id,
      subject,
      from: name
    });

    res.status(200).json({
      success: true,
      message: 'Message sent successfully! We will get back to you within 24 hours.',
      data: {
        messageId: adminEmail.data?.id,
        name,
        subject
      }
    });

  } catch (error) {
    console.error('Contact form error:', error);
    next(error);
  }
};