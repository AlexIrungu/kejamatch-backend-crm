import resend from '../config/resend.js';
import { bookingAdminTemplate, bookingUserTemplate } from '../templates/emailTemplates.js';

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

    // Log email IDs for debugging
    console.log('Booking emails sent:', {
      admin: adminEmail.data?.id,
      user: userEmail.data?.id,
      property: propertyName,
      guest: name
    });

    res.status(200).json({
      success: true,
      message: 'Booking request submitted successfully! We will contact you shortly.',
      data: {
        bookingId: adminEmail.data?.id,
        property: propertyName,
        checkIn: formatDate(checkIn),
        checkOut: formatDate(checkOut),
        totalCost
      }
    });

  } catch (error) {
    console.error('Booking error:', error);
    next(error);
  }
};