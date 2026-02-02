// Brand colors
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
  .code-box {
    background: linear-gradient(135deg, ${colors.primary} 0%, ${colors.dark} 100%);
    color: white;
    padding: 30px;
    border-radius: 12px;
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
  .status-badge {
    display: inline-block;
    padding: 6px 12px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 600;
    margin: 10px 0;
  }
  .status-pending {
    background-color: #fff3cd;
    color: #856404;
  }
  .status-approved {
    background-color: #d4edda;
    color: #155724;
  }
  .status-rejected {
    background-color: #f8d7da;
    color: #721c24;
  }
`;

// 1. CLIENT REGISTRATION - Verification Code
export const clientRegistrationTemplate = (data) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Kejamatch Client Portal</title>
  <style>${baseStyles}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Welcome to Kejamatch!</h1>
      <p>Client Portal Registration</p>
    </div>
    
    <div class="content">
      <p class="greeting">Hello ${data.name},</p>
      
      <p>Thank you for registering for the Kejamatch Client Portal! To complete your registration, please verify your email address with the code below:</p>
      
      <div class="code-box">
        <p style="margin: 0; font-size: 14px; opacity: 0.8;">Your Verification Code</p>
        <div class="code">${data.code}</div>
        <p style="margin: 0; font-size: 12px; opacity: 0.8;">⏰ This code expires in 10 minutes</p>
      </div>

      <div class="info-box">
        <p style="margin: 0;"><strong>📋 What happens next?</strong></p>
        <ol style="margin: 10px 0 0 0; padding-left: 20px;">
          <li>Verify your email with the code above</li>
          <li>Our admin team will review your registration</li>
          <li>Once approved, you'll receive full portal access</li>
          <li>You can then track inquiries and upload documents</li>
        </ol>
      </div>

      <div style="background-color: #fff3cd; border-left: 4px solid ${colors.accent}; padding: 15px; border-radius: 4px; margin: 20px 0;">
        <p style="margin: 0; color: #856404;"><strong>🔒 Security Note</strong></p>
        <p style="margin: 10px 0 0 0; color: #856404; font-size: 14px;">
          If you didn't create this account, please ignore this email or contact us immediately.
        </p>
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

// 2. ACCOUNT APPROVED - Admin Approval
export const clientApprovedTemplate = (data) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Account Approved - Kejamatch</title>
  <style>${baseStyles}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ Account Approved!</h1>
      <p>You now have full portal access</p>
    </div>
    
    <div class="content">
      <p class="greeting">Congratulations ${data.name}!</p>
      
      <p>Your Kejamatch Client Portal account has been approved. You now have full access to all portal features!</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <span class="status-badge status-approved">✓ APPROVED</span>
      </div>

      <div class="info-box">
        <h3 style="color: ${colors.primary}; margin-top: 0;">What You Can Do Now:</h3>
        <ul style="margin: 10px 0 0 0; padding-left: 20px;">
          <li><strong>Track Your Inquiries:</strong> See real-time status updates on your property search</li>
          <li><strong>Upload Documents:</strong> Securely submit ID, payslips, and other required documents</li>
          <li><strong>View Properties:</strong> Browse properties matched to your preferences</li>
          <li><strong>Communicate:</strong> Direct messaging with your assigned agent</li>
          <li><strong>Manage Profile:</strong> Update your information and preferences anytime</li>
        </ul>
      </div>

      <div style="text-align: center;">
        <a href="https://kejamatch.com/client/login" class="button">🚀 Access Portal</a>
      </div>

      ${data.assignedAgent ? `
        <div class="info-box" style="margin-top: 30px;">
          <h3 style="color: ${colors.primary}; margin-top: 0;">👤 Your Assigned Agent</h3>
          <p style="margin: 10px 0 0 0;">
            <strong>${data.assignedAgent.name}</strong><br>
            📧 ${data.assignedAgent.email}<br>
            📞 ${data.assignedAgent.phone || 'Contact via email'}
          </p>
        </div>
      ` : ''}
    </div>
    
    <div class="footer">
      <p><strong>Kejamatch Properties</strong></p>
      <p>📞 <a href="tel:+254721860371">+254 721 860 371</a> | 📧 <a href="mailto:info@kejamatch.com">info@kejamatch.com</a></p>
      <p style="margin-top: 20px; font-size: 12px; opacity: 0.8;">
        Nairobi CBD, Kenya | <a href="https://kejamatch.com">kejamatch.com</a>
      </p>
    </div>
  </div>
</body>
</html>
`;

// 3. ACCOUNT REJECTED
export const clientRejectedTemplate = (data) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Registration Update - Kejamatch</title>
  <style>${baseStyles}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Registration Update</h1>
      <p>Kejamatch Client Portal</p>
    </div>
    
    <div class="content">
      <p class="greeting">Hello ${data.name},</p>
      
      <p>Thank you for your interest in the Kejamatch Client Portal. After reviewing your registration, we're unable to approve your account at this time.</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <span class="status-badge status-rejected">✗ NOT APPROVED</span>
      </div>

      ${data.reason ? `
        <div class="info-box">
          <h3 style="color: ${colors.primary}; margin-top: 0;">Reason:</h3>
          <p style="margin: 10px 0 0 0;">${data.reason}</p>
        </div>
      ` : ''}

      <div style="background-color: #d1ecf1; border-left: 4px solid ${colors.primary}; padding: 15px; border-radius: 4px; margin: 20px 0;">
        <p style="margin: 0; color: #0c5460;"><strong>💬 Need Help?</strong></p>
        <p style="margin: 10px 0 0 0; color: #0c5460; font-size: 14px;">
          If you believe this was a mistake or have questions, please contact us directly. We're here to help!
        </p>
      </div>

      <div style="text-align: center;">
        <a href="mailto:info@kejamatch.com" class="button" style="background-color: ${colors.primary};">📧 Contact Us</a>
      </div>
    </div>
    
    <div class="footer">
      <p><strong>Kejamatch Properties</strong></p>
      <p>📞 <a href="tel:+254721860371">+254 721 860 371</a> | 📧 <a href="mailto:info@kejamatch.com">info@kejamatch.com</a></p>
      <p style="margin-top: 20px; font-size: 12px; opacity: 0.8;">
        Nairobi CBD, Kenya | <a href="https://kejamatch.com">kejamatch.com</a>
      </p>
    </div>
  </div>
</body>
</html>
`;

// 4. DOCUMENT UPLOADED - Confirmation
export const documentUploadedTemplate = (data) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Document Uploaded - Kejamatch</title>
  <style>${baseStyles}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📄 Document Uploaded</h1>
      <p>Successfully Received</p>
    </div>
    
    <div class="content">
      <p class="greeting">Hello ${data.clientName},</p>
      
      <p>We've successfully received your document upload. Our team will review it shortly.</p>
      
      <div class="info-box">
        <h3 style="color: ${colors.primary}; margin-top: 0;">Document Details:</h3>
        <p style="margin: 10px 0 0 0;">
          <strong>Type:</strong> ${data.categoryLabel}<br>
          <strong>File:</strong> ${data.fileName}<br>
          <strong>Size:</strong> ${data.fileSize}<br>
          <strong>Uploaded:</strong> ${new Date().toLocaleString()}
        </p>
      </div>

      <div style="background-color: #fff3cd; border-left: 4px solid ${colors.accent}; padding: 15px; border-radius: 4px; margin: 20px 0;">
        <p style="margin: 0; color: #856404;"><strong>⏳ What's Next?</strong></p>
        <p style="margin: 10px 0 0 0; color: #856404; font-size: 14px;">
          Your document is pending verification. You'll receive an email once it has been reviewed (typically within 24-48 hours).
        </p>
      </div>

      <div style="text-align: center;">
        <a href="https://kejamatch.com/client/documents" class="button">📂 View All Documents</a>
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

// 5. DOCUMENT VERIFIED
export const documentVerifiedTemplate = (data) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Document Verified - Kejamatch</title>
  <style>${baseStyles}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ Document Verified</h1>
      <p>Successfully Approved</p>
    </div>
    
    <div class="content">
      <p class="greeting">Hello ${data.clientName},</p>
      
      <p>Great news! Your ${data.categoryLabel} has been verified and approved.</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <span class="status-badge status-approved">✓ VERIFIED</span>
      </div>

      <div class="info-box">
        <p style="margin: 0;">
          <strong>Document:</strong> ${data.fileName}<br>
          <strong>Type:</strong> ${data.categoryLabel}<br>
          <strong>Verified:</strong> ${new Date().toLocaleString()}
        </p>
      </div>

      <div style="text-align: center;">
        <a href="https://kejamatch.com/client/documents" class="button">📂 View Documents</a>
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

// 6. DOCUMENT REJECTED
export const documentRejectedTemplate = (data) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Document Update - Kejamatch</title>
  <style>${baseStyles}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📄 Document Update</h1>
      <p>Action Required</p>
    </div>
    
    <div class="content">
      <p class="greeting">Hello ${data.clientName},</p>
      
      <p>We've reviewed your ${data.categoryLabel}, but we need you to re-submit it with some corrections.</p>
      
      <div class="info-box">
        <h3 style="color: ${colors.primary}; margin-top: 0;">Feedback:</h3>
        <p style="margin: 10px 0 0 0;">${data.reason}</p>
      </div>

      <div style="background-color: #d1ecf1; border-left: 4px solid ${colors.primary}; padding: 15px; border-radius: 4px; margin: 20px 0;">
        <p style="margin: 0; color: #0c5460;"><strong>💡 Next Steps:</strong></p>
        <p style="margin: 10px 0 0 0; color: #0c5460; font-size: 14px;">
          Please upload a new document addressing the feedback above. If you have questions, contact your assigned agent or our support team.
        </p>
      </div>

      <div style="text-align: center;">
        <a href="https://kejamatch.com/client/documents" class="button">📤 Upload New Document</a>
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

// 7. TWO-FACTOR AUTHENTICATION CODE
export const twoFactorCodeTemplate = (data) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>2FA Verification - Kejamatch</title>
  <style>${baseStyles}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔐 Security Verification</h1>
      <p>Two-Factor Authentication</p>
    </div>
    
    <div class="content">
      <p class="greeting">Hello ${data.clientName},</p>
      
      <p>You've requested to access sensitive documents. Please enter the verification code below:</p>
      
      <div class="code-box">
        <p style="margin: 0; font-size: 14px; opacity: 0.8;">Your Verification Code</p>
        <div class="code">${data.code}</div>
        <p style="margin: 0; font-size: 12px; opacity: 0.8;">⏰ This code expires in 5 minutes</p>
      </div>

      <div style="background-color: #fff3cd; border-left: 4px solid ${colors.accent}; padding: 15px; border-radius: 4px; margin: 20px 0;">
        <p style="margin: 0; color: #856404;"><strong>🔒 Security Alert</strong></p>
        <p style="margin: 10px 0 0 0; color: #856404; font-size: 14px;">
          If you didn't request this code, please change your password immediately and contact us.
        </p>
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

export default {
  clientRegistrationTemplate,
  clientApprovedTemplate,
  clientRejectedTemplate,
  documentUploadedTemplate,
  documentVerifiedTemplate,
  documentRejectedTemplate,
  twoFactorCodeTemplate
};