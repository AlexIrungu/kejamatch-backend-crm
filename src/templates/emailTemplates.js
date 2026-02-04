// Brand colors from Tailwind config
const colors = {
  primary: '#1e3a5f',
  secondary: '#ff6b35',
  accent: '#ffd700',
  dark: '#0a1628'
};

// Base email styles
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
    background-color: ${colors.primary};
    padding: 40px 20px;
    text-align: center;
    border-bottom: 4px solid ${colors.secondary};
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
  .total-box {
    background-color: ${colors.secondary};
    color: white;
    padding: 20px;
    margin: 20px 0;
    text-align: center;
  }
  .total-box h2 {
    margin: 0;
    font-size: 32px;
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
    font-weight: 600;
    margin: 20px 0;
  }
  .divider {
    height: 2px;
    background-color: ${colors.secondary};
    margin: 30px 0;
    width: 60px;
  }
  .code-box {
    background-color: ${colors.primary};
    color: white;
    padding: 30px;
    margin: 30px 0;
    text-align: center;
  }
  .code-box .code {
    font-size: 42px;
    font-weight: 700;
    letter-spacing: 8px;
    margin: 15px 0;
    font-family: 'Courier New', monospace;
  }
  .code-box .expiry {
    font-size: 14px;
    opacity: 0.8;
  }
`;

// 1. BOOKING - Admin Notification
export const bookingAdminTemplate = (data) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Booking Request</title>
  <style>${baseStyles}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🏠 New Booking Request</h1>
      <p>Kejamatch Properties</p>
    </div>
    
    <div class="content">
      <p class="greeting">You have received a new booking request!</p>
      
      <div class="info-box">
        <h3 style="color: ${colors.primary}; margin-top: 0;">Property Details</h3>
        <div class="info-row">
          <span class="info-label">Property:</span>
          <span class="info-value">${data.propertyName}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Location:</span>
          <span class="info-value">${data.propertyLocation}</span>
        </div>
      </div>

      <div class="info-box">
        <h3 style="color: ${colors.primary}; margin-top: 0;">Guest Information</h3>
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

      <div class="info-box">
        <h3 style="color: ${colors.primary}; margin-top: 0;">Booking Details</h3>
        <div class="info-row">
          <span class="info-label">Check-in:</span>
          <span class="info-value">${data.checkIn}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Check-out:</span>
          <span class="info-value">${data.checkOut}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Nights:</span>
          <span class="info-value">${data.nights}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Guests:</span>
          <span class="info-value">${data.guests}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Price/Night:</span>
          <span class="info-value">KES ${data.pricePerNight.toLocaleString()}</span>
        </div>
      </div>

      ${data.specialRequests ? `
        <div class="info-box">
          <h3 style="color: ${colors.primary}; margin-top: 0;">Special Requests</h3>
          <p style="margin: 0;">${data.specialRequests}</p>
        </div>
      ` : ''}

      <div class="total-box">
        <p style="margin: 0; font-size: 14px;">Total Amount</p>
        <h2>KES ${data.totalCost.toLocaleString()}</h2>
      </div>

      <p style="color: #666; font-size: 14px; font-style: italic;">
        ⏰ Received: ${new Date().toLocaleString('en-US', { 
          dateStyle: 'full', 
          timeStyle: 'short' 
        })}
      </p>
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

// 2. BOOKING - User Confirmation
export const bookingUserTemplate = (data) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Booking Confirmation</title>
  <style>${baseStyles}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ Booking Request Received!</h1>
      <p>Kejamatch Properties</p>
    </div>
    
    <div class="content">
      <p class="greeting">Dear ${data.name},</p>
      
      <p>Thank you for choosing Kejamatch Properties! We've received your booking request and will get back to you shortly.</p>
      
      <div class="divider"></div>

      <div class="info-box">
        <h3 style="color: ${colors.primary}; margin-top: 0;">Your Booking Details</h3>
        <div class="info-row">
          <span class="info-label">Property:</span>
          <span class="info-value">${data.propertyName}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Location:</span>
          <span class="info-value">${data.propertyLocation}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Check-in:</span>
          <span class="info-value">${data.checkIn}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Check-out:</span>
          <span class="info-value">${data.checkOut}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Nights:</span>
          <span class="info-value">${data.nights}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Guests:</span>
          <span class="info-value">${data.guests}</span>
        </div>
      </div>

      <div class="total-box">
        <p style="margin: 0; font-size: 14px;">Total Amount</p>
        <h2>KES ${data.totalCost.toLocaleString()}</h2>
        <p style="margin: 0; font-size: 12px; opacity: 0.9;">KES ${data.pricePerNight.toLocaleString()} per night × ${data.nights} nights</p>
      </div>

      <div style="background-color: #fff3cd; border-left: 4px solid ${colors.accent}; padding: 15px; border-radius: 4px; margin: 20px 0;">
        <p style="margin: 0; color: #856404;"><strong>⏳ What's Next?</strong></p>
        <p style="margin: 10px 0 0 0; color: #856404; font-size: 14px;">
          Our team will review your booking request and contact you within 24 hours to confirm availability and payment details.
        </p>
      </div>

      <p>If you have any questions, feel free to reach out to us at any time.</p>

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

// 3. CONTACT - Admin Notification
export const contactAdminTemplate = (data) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Contact Message</title>
  <style>${baseStyles}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>💬 New Contact Message</h1>
      <p>Kejamatch Properties</p>
    </div>
    
    <div class="content">
      <p class="greeting">You have received a new contact form submission!</p>
      
      <div class="info-box">
        <h3 style="color: ${colors.primary}; margin-top: 0;">Contact Information</h3>
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
          <span class="info-value">${data.phoneNumber}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Subject:</span>
          <span class="info-value"><strong>${data.subject}</strong></span>
        </div>
      </div>

      <div class="info-box">
        <h3 style="color: ${colors.primary}; margin-top: 0;">Message</h3>
        <p style="margin: 0; white-space: pre-wrap; color: #333;">${data.message}</p>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="mailto:${data.email}" class="button">📧 Reply to ${data.name}</a>
      </div>

      <p style="color: #666; font-size: 14px; font-style: italic;">
        ⏰ Received: ${new Date().toLocaleString('en-US', { 
          dateStyle: 'full', 
          timeStyle: 'short' 
        })}
      </p>
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

// 4. CONTACT - User Confirmation
export const contactUserTemplate = (data) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Message Received</title>
  <style>${baseStyles}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ Message Received!</h1>
      <p>Kejamatch Properties</p>
    </div>
    
    <div class="content">
      <p class="greeting">Dear ${data.name},</p>
      
      <p>Thank you for reaching out to Kejamatch Properties! We've received your message and our team will get back to you within 24 hours.</p>
      
      <div class="divider"></div>

      <div class="info-box">
        <h3 style="color: ${colors.primary}; margin-top: 0;">Your Message Summary</h3>
        <div class="info-row">
          <span class="info-label">Subject:</span>
          <span class="info-value">${data.subject}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Submitted:</span>
          <span class="info-value">${new Date().toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}</span>
        </div>
      </div>

      <div style="background-color: #d1ecf1; border-left: 4px solid ${colors.primary}; padding: 15px; border-radius: 4px; margin: 20px 0;">
        <p style="margin: 0; color: #0c5460;"><strong>📋 Your Message:</strong></p>
        <p style="margin: 10px 0 0 0; color: #0c5460; font-size: 14px; white-space: pre-wrap;">
          ${data.message}
        </p>
      </div>

      <p>In the meantime, feel free to explore our website or give us a call if you need immediate assistance.</p>

      <div style="text-align: center;">
        <a href="https://kejamatch.com" class="button" style="background-color: ${colors.primary}; margin-right: 10px;">🏠 Visit Website</a>
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

// 5. EMAIL VERIFICATION - Verification Code
export const verificationCodeTemplate = (data) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email</title>
  <style>${baseStyles}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔐 Verify Your Email</h1>
      <p>Kejamatch Properties</p>
    </div>
    
    <div class="content">
      <p class="greeting">Hello ${data.name},</p>
      
      <p>Welcome to Kejamatch! To complete your registration, please enter the verification code below:</p>
      
      <div class="code-box">
        <p style="margin: 0; font-size: 14px; opacity: 0.8;">Your Verification Code</p>
        <div class="code">${data.code}</div>
        <p class="expiry">⏰ This code expires in 10 minutes</p>
      </div>

      <div style="background-color: #fff3cd; border-left: 4px solid ${colors.accent}; padding: 15px; border-radius: 4px; margin: 20px 0;">
        <p style="margin: 0; color: #856404;"><strong>🔒 Security Tip</strong></p>
        <p style="margin: 10px 0 0 0; color: #856404; font-size: 14px;">
          If you didn't create an account with Kejamatch, please ignore this email.
        </p>
      </div>

      <p>Once verified, you'll have full access to your ${data.role === 'agent' ? 'Agent' : 'Admin'} Dashboard.</p>
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

// 6. WELCOME EMAIL - After Verification
export const welcomeEmailTemplate = (data) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Kejamatch!</title>
  <style>${baseStyles}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Welcome to Kejamatch!</h1>
      <p>Your account is now verified</p>
    </div>
    
    <div class="content">
      <p class="greeting">Hello ${data.name},</p>
      
      <p>Congratulations! Your email has been verified and your Kejamatch account is now fully activated.</p>
      
      <div class="divider"></div>

      <div class="info-box">
        <h3 style="color: ${colors.primary}; margin-top: 0;">Your Account Details</h3>
        <div class="info-row">
          <span class="info-label">Email:</span>
          <span class="info-value">${data.email}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Role:</span>
          <span class="info-value">${data.role === 'agent' ? 'Real Estate Agent' : 'Administrator'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Joined:</span>
          <span class="info-value">${new Date().toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}</span>
        </div>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="https://kejamatch.com/login" class="button">🚀 Go to Dashboard</a>
      </div>

      <h3 style="color: ${colors.primary};">Getting Started</h3>
      <ul style="color: #666; line-height: 2;">
        <li>Complete your profile with a professional photo</li>
        <li>Review your assigned leads in the dashboard</li>
        <li>Follow up with new leads within 24 hours</li>
        <li>Keep detailed notes on client interactions</li>
      </ul>
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

// Re-export viewing templates
export { 
  viewingRequestAdminTemplate, 
  viewingRequestUserTemplate, 
  viewingConfirmedTemplate,
  viewingReminderTemplate 
} from './viewingEmailTemplates.js';