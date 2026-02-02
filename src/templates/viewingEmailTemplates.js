/**
 * Additional Email Templates for Viewing System
 * Add these exports to your existing emailTemplates.js file
 */

// Brand colors from Tailwind config
const colors = {
  primary: '#1e3a5f',
  secondary: '#ff6b35',
  accent: '#ffd700',
  dark: '#0a1628'
};

// Base email styles (same as existing)
const baseStyles = `
  body { 
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    line-height: 1.6;
    color: #333;
    margin: 0;
    padding: 0;
    background-color: #f5f5f5;
  }
  .container {
    max-width: 600px;
    margin: 0 auto;
    background-color: #ffffff;
  }
  .header {
    background: linear-gradient(135deg, ${colors.primary} 0%, ${colors.dark} 100%);
    padding: 40px 20px;
    text-align: center;
  }
  .header h1 {
    color: #ffffff;
    margin: 0;
    font-size: 28px;
    font-weight: 700;
  }
  .header p {
    color: ${colors.accent};
    margin: 10px 0 0 0;
    font-size: 14px;
  }
  .content {
    padding: 40px 30px;
  }
  .greeting {
    font-size: 18px;
    color: ${colors.primary};
    margin-bottom: 20px;
  }
  .info-box {
    background-color: #f8f9fa;
    border-left: 4px solid ${colors.secondary};
    padding: 20px;
    margin: 20px 0;
    border-radius: 4px;
  }
  .info-row {
    display: flex;
    justify-content: space-between;
    padding: 10px 0;
    border-bottom: 1px solid #e0e0e0;
  }
  .info-row:last-child {
    border-bottom: none;
  }
  .info-label {
    font-weight: 600;
    color: ${colors.primary};
  }
  .info-value {
    color: #666;
    text-align: right;
  }
  .highlight-box {
    background: linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%);
    color: white;
    padding: 20px;
    border-radius: 8px;
    margin: 20px 0;
    text-align: center;
  }
  .footer {
    background-color: ${colors.dark};
    color: #ffffff;
    padding: 30px;
    text-align: center;
    font-size: 14px;
  }
  .footer a {
    color: ${colors.accent};
    text-decoration: none;
  }
  .button {
    display: inline-block;
    background-color: ${colors.secondary};
    color: white;
    padding: 14px 30px;
    text-decoration: none;
    border-radius: 8px;
    font-weight: 600;
    margin: 20px 0;
  }
  .divider {
    height: 2px;
    background: linear-gradient(90deg, transparent, ${colors.accent}, transparent);
    margin: 30px 0;
  }
`;

// 7. VIEWING REQUEST - Admin Notification
export const viewingRequestAdminTemplate = (data) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Viewing Request</title>
  <style>${baseStyles}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>👁️ New Viewing Request</h1>
      <p>Kejamatch Properties</p>
    </div>
    
    <div class="content">
      <p class="greeting">A potential client wants to view a property!</p>
      
      <div class="info-box">
        <h3 style="color: ${colors.primary}; margin-top: 0;">🏠 Property Details</h3>
        <div class="info-row">
          <span class="info-label">Property:</span>
          <span class="info-value">${data.propertyName}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Location:</span>
          <span class="info-value">${data.propertyLocation || 'Not specified'}</span>
        </div>
      </div>

      <div class="info-box">
        <h3 style="color: ${colors.primary}; margin-top: 0;">👤 Client Information</h3>
        <div class="info-row">
          <span class="info-label">Name:</span>
          <span class="info-value">${data.name}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Email:</span>
          <span class="info-value">${data.email}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Phone:</span>
          <span class="info-value">${data.phone}</span>
        </div>
      </div>

      <div class="highlight-box">
        <p style="margin: 0; font-size: 14px;">📅 Preferred Viewing Time</p>
        <h2 style="margin: 10px 0;">${data.preferredDate}</h2>
        <p style="margin: 0; font-size: 18px;">at ${data.preferredTime}</p>
      </div>

      ${data.alternateDate ? `
        <div class="info-box">
          <h3 style="color: ${colors.primary}; margin-top: 0;">📆 Alternative Time</h3>
          <div class="info-row">
            <span class="info-label">Date:</span>
            <span class="info-value">${data.alternateDate}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Time:</span>
            <span class="info-value">${data.alternateTime || 'Not specified'}</span>
          </div>
        </div>
      ` : ''}

      ${data.message && data.message !== 'No additional message' ? `
        <div class="info-box">
          <h3 style="color: ${colors.primary}; margin-top: 0;">💬 Additional Message</h3>
          <p style="margin: 0;">${data.message}</p>
        </div>
      ` : ''}

      <div style="text-align: center; margin: 30px 0;">
        <a href="mailto:${data.email}" class="button">📧 Contact Client</a>
        <a href="tel:${data.phone}" class="button" style="background-color: ${colors.primary}; margin-left: 10px;">📞 Call Now</a>
      </div>

      <p style="color: #666; font-size: 14px; font-style: italic;">
        ⏰ Received: ${new Date().toLocaleString('en-US', { 
          dateStyle: 'full', 
          timeStyle: 'short' 
        })}
      </p>

      <div style="background-color: #fff3cd; border-left: 4px solid ${colors.accent}; padding: 15px; border-radius: 4px; margin: 20px 0;">
        <p style="margin: 0; color: #856404;"><strong>⚡ Action Required</strong></p>
        <p style="margin: 10px 0 0 0; color: #856404; font-size: 14px;">
          Please confirm this viewing within 24 hours. Log into the admin dashboard to schedule and confirm the appointment.
        </p>
      </div>
    </div>
    
    <div class="footer">
      <p><strong>Kejamatch Properties</strong></p>
      <p>Nairobi CBD, Kenya</p>
      <p>📞 <a href="tel:+254721860371">+254 721 860 371</a></p>
      <p>📧 <a href="mailto:info@kejamatch.com">info@kejamatch.com</a></p>
    </div>
  </div>
</body>
</html>
`;

// 8. VIEWING REQUEST - User Confirmation
export const viewingRequestUserTemplate = (data) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Viewing Request Received</title>
  <style>${baseStyles}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ Viewing Request Received!</h1>
      <p>Kejamatch Properties</p>
    </div>
    
    <div class="content">
      <p class="greeting">Dear ${data.name},</p>
      
      <p>Thank you for your interest in viewing a property with Kejamatch! We've received your request and will get back to you shortly to confirm the appointment.</p>
      
      <div class="divider"></div>

      <div class="info-box">
        <h3 style="color: ${colors.primary}; margin-top: 0;">🏠 Property Details</h3>
        <div class="info-row">
          <span class="info-label">Property:</span>
          <span class="info-value">${data.propertyName}</span>
        </div>
        ${data.propertyLocation ? `
          <div class="info-row">
            <span class="info-label">Location:</span>
            <span class="info-value">${data.propertyLocation}</span>
          </div>
        ` : ''}
      </div>

      <div class="highlight-box">
        <p style="margin: 0; font-size: 14px;">📅 Your Preferred Viewing Time</p>
        <h2 style="margin: 10px 0;">${data.preferredDate}</h2>
        <p style="margin: 0; font-size: 18px;">at ${data.preferredTime}</p>
      </div>

      <div style="background-color: #d1ecf1; border-left: 4px solid ${colors.primary}; padding: 15px; border-radius: 4px; margin: 20px 0;">
        <p style="margin: 0; color: #0c5460;"><strong>⏳ What's Next?</strong></p>
        <ul style="margin: 10px 0 0 0; color: #0c5460; font-size: 14px; padding-left: 20px;">
          <li>Our team will review your request</li>
          <li>We'll contact you within 24 hours to confirm</li>
          <li>You'll receive a confirmation email with the final details</li>
        </ul>
      </div>

      <p>If you have any questions or need to reschedule, please don't hesitate to contact us.</p>

      <div style="text-align: center;">
        <a href="tel:+254721860371" class="button">📞 Call Us</a>
      </div>
    </div>
    
    <div class="footer">
      <p><strong>Kejamatch Properties</strong></p>
      <p>Your trusted partner in real estate</p>
      <p>📞 <a href="tel:+254721860371">+254 721 860 371</a> | 📧 <a href="mailto:info@kejamatch.com">info@kejamatch.com</a></p>
      <p style="margin-top: 20px; font-size: 12px; opacity: 0.8;">
        Nairobi CBD, Kenya | <a href="https://kejamatch.com">kejamatch.com</a>
      </p>
    </div>
  </div>
</body>
</html>
`;

// 9. VIEWING CONFIRMED - User Notification
export const viewingConfirmedTemplate = (data) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Viewing Confirmed</title>
  <style>${baseStyles}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Viewing Confirmed!</h1>
      <p>Kejamatch Properties</p>
    </div>
    
    <div class="content">
      <p class="greeting">Dear ${data.name},</p>
      
      <p>Great news! Your property viewing has been confirmed. We look forward to showing you the property.</p>
      
      <div class="divider"></div>

      <div class="highlight-box">
        <p style="margin: 0; font-size: 14px;">📅 Confirmed Viewing</p>
        <h2 style="margin: 10px 0;">${data.scheduledDate}</h2>
        <p style="margin: 0; font-size: 18px;">at ${data.scheduledTime}</p>
      </div>

      <div class="info-box">
        <h3 style="color: ${colors.primary}; margin-top: 0;">🏠 Property Details</h3>
        <div class="info-row">
          <span class="info-label">Property:</span>
          <span class="info-value">${data.propertyName}</span>
        </div>
        ${data.agentName ? `
          <div class="info-row">
            <span class="info-label">Your Agent:</span>
            <span class="info-value">${data.agentName}</span>
          </div>
        ` : ''}
      </div>

      ${data.notes ? `
        <div class="info-box">
          <h3 style="color: ${colors.primary}; margin-top: 0;">📝 Notes</h3>
          <p style="margin: 0;">${data.notes}</p>
        </div>
      ` : ''}

      <div style="background-color: #d4edda; border-left: 4px solid #28a745; padding: 15px; border-radius: 4px; margin: 20px 0;">
        <p style="margin: 0; color: #155724;"><strong>✅ What to Bring</strong></p>
        <ul style="margin: 10px 0 0 0; color: #155724; font-size: 14px; padding-left: 20px;">
          <li>A valid ID for verification</li>
          <li>Any questions you have about the property</li>
          <li>A list of your requirements and preferences</li>
        </ul>
      </div>

      <p>If you need to reschedule or cancel, please let us know at least 24 hours in advance.</p>

      <div style="text-align: center;">
        <a href="tel:+254721860371" class="button">📞 Contact Us</a>
      </div>
    </div>
    
    <div class="footer">
      <p><strong>Kejamatch Properties</strong></p>
      <p>Your trusted partner in real estate</p>
      <p>📞 <a href="tel:+254721860371">+254 721 860 371</a> | 📧 <a href="mailto:info@kejamatch.com">info@kejamatch.com</a></p>
      <p style="margin-top: 20px; font-size: 12px; opacity: 0.8;">
        Nairobi CBD, Kenya | <a href="https://kejamatch.com">kejamatch.com</a>
      </p>
    </div>
  </div>
</body>
</html>
`;

// 10. VIEWING REMINDER - Sent 24 hours before
export const viewingReminderTemplate = (data) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Viewing Reminder</title>
  <style>${baseStyles}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⏰ Viewing Reminder</h1>
      <p>Kejamatch Properties</p>
    </div>
    
    <div class="content">
      <p class="greeting">Dear ${data.name},</p>
      
      <p>This is a friendly reminder about your upcoming property viewing tomorrow!</p>
      
      <div class="highlight-box">
        <p style="margin: 0; font-size: 14px;">📅 Tomorrow</p>
        <h2 style="margin: 10px 0;">${data.scheduledDate}</h2>
        <p style="margin: 0; font-size: 18px;">at ${data.scheduledTime}</p>
      </div>

      <div class="info-box">
        <h3 style="color: ${colors.primary}; margin-top: 0;">🏠 Property</h3>
        <p style="margin: 0; font-size: 18px; color: ${colors.secondary}; font-weight: bold;">${data.propertyName}</p>
        ${data.propertyLocation ? `<p style="margin: 5px 0 0 0; color: #666;">${data.propertyLocation}</p>` : ''}
      </div>

      <p>We're excited to show you this property! If you can no longer make it, please let us know as soon as possible.</p>

      <div style="text-align: center;">
        <a href="tel:+254721860371" class="button">📞 Contact Us</a>
      </div>
    </div>
    
    <div class="footer">
      <p><strong>Kejamatch Properties</strong></p>
      <p>📞 <a href="tel:+254721860371">+254 721 860 371</a> | 📧 <a href="mailto:info@kejamatch.com">info@kejamatch.com</a></p>
    </div>
  </div>
</body>
</html>
`;