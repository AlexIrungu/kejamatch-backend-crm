import { clientStorage } from '../services/clientStorageMongo.js';
import { documentStorage } from '../services/documentStorage.js';
import { generateToken } from '../middleware/auth.js';
import { Resend } from 'resend';
import { clientRegistrationTemplate, twoFactorCodeTemplate } from '../templates/clientEmailTemplates.js';
import logger from '../utils/logger.js';
import LeadStorage from '../services/leadStorageMongo.js';
import Property from '../models/PropertyModel.js';
import Client from '../models/ClientModel.js';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@kejamatch.com';

// =====================
// CLIENT REGISTRATION & AUTH
// =====================

/**
 * Register new client (self-registration)
 */
export const registerClient = async (req, res) => {
  try {
    const { email, password, name, phone, propertyPreferences, consentToDataProcessing, consentToMarketing } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        message: 'Email, password, and name are required',
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format',
      });
    }

    // Validate password
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long',
      });
    }

    if (!/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      return res.status(400).json({
        success: false,
        message: 'Password must contain at least one uppercase letter and one number',
      });
    }

    // Create client
    const clientData = await clientStorage.createClient({
      email,
      password,
      name,
      phone,
      propertyPreferences,
      consentToDataProcessing,
      consentToMarketing
    });

    // Generate token (even though pending approval)
    const token = generateToken({
      id: clientData.id,
      email: clientData.email,
      role: 'client'
    });

    // Send verification email
    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: email,
        subject: '🔐 Verify Your Kejamatch Client Account',
        html: clientRegistrationTemplate({
          name,
          code: clientData.verificationCode,
        }),
      });
      logger.info(`📧 Verification email sent to: ${email}`);
    } catch (emailError) {
      logger.error(`❌ Failed to send verification email to ${email}:`, emailError);
    }

    logger.info(`✅ Client registered: ${email} - Pending approval`);

    res.status(201).json({
      success: true,
      message: 'Registration successful! Please check your email for verification code. Your account is pending admin approval.',
      data: {
        client: clientData,
        token,
        requiresVerification: true,
        requiresApproval: true
      },
    });
  } catch (error) {
    logger.error('❌ Client registration error:', error);
    
    if (error.message === 'A client with this email already exists') {
      return res.status(409).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to register client',
    });
  }
};

/**
 * Login client
 */
export const loginClient = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    const client = await clientStorage.authenticate(email, password);

    if (!client) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    const token = generateToken({
      id: client.id,
      email: client.email,
      role: 'client'
    });

    logger.info(`✅ Client logged in: ${email}`);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        client,
        token,
        requiresVerification: !client.isVerified
      },
    });
  } catch (error) {
    logger.error('❌ Client login error:', error);

    if (error.message === 'Account is suspended' || error.message === 'Account is pending approval') {
      return res.status(403).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Login failed',
    });
  }
};

/**
 * Verify client email
 */
export const verifyClientEmail = async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({
        success: false,
        message: 'Email and verification code are required',
      });
    }

    const result = await clientStorage.verifyEmail(email, code);

    if (!result.valid) {
      return res.status(400).json({
        success: false,
        message: result.error,
      });
    }

    const client = await clientStorage.findByEmail(email);

    logger.info(`✅ Email verified for client: ${email}`);

    res.status(200).json({
      success: true,
      message: 'Email verified successfully!',
      data: {
        client: client.toSafeJSON(),
      },
    });
  } catch (error) {
    logger.error('❌ Verify client email error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to verify email',
    });
  }
};

/**
 * Resend verification code
 */
export const resendClientVerificationCode = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required',
      });
    }

    const result = await clientStorage.resendVerificationCode(email);

    // Send verification email
    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: email,
        subject: '🔐 Verify Your Kejamatch Client Account',
        html: clientRegistrationTemplate({
          name: result.client.name,
          code: result.code,
        }),
      });
      logger.info(`📧 Verification email sent to: ${email}`);
    } catch (emailError) {
      logger.error(`❌ Failed to send verification email to ${email}:`, emailError);
    }

    logger.info(`📧 Verification code resent to: ${email}`);

    res.status(200).json({
      success: true,
      message: 'New verification code sent to your email.',
    });
  } catch (error) {
    logger.error('❌ Resend verification error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to resend verification code',
    });
  }
};

// =====================
// CLIENT PROFILE
// =====================

/**
 * Get current client profile
 */
export const getCurrentClient = async (req, res) => {
  try {
    const client = await clientStorage.findById(req.user.id);

    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found',
      });
    }

    // Get document summary
    const documentSummary = await documentStorage.getClientDocumentSummary(client._id);

    // Get linked lead if exists
    let linkedLead = null;
    if (client.linkedLeadId) {
      linkedLead = await LeadStorage.findById(client.linkedLeadId);
    }

    res.status(200).json({
      success: true,
      data: {
        client: client.toSafeJSON(),
        documentSummary,
        linkedLead
      },
    });
  } catch (error) {
    logger.error('❌ Get current client error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get client data',
    });
  }
};

/**
 * Update client profile
 */
export const updateClientProfile = async (req, res) => {
  try {
    const { name, phone, dateOfBirth, occupation, employerName, address, propertyPreferences } = req.body;

    const updates = {};
    if (name) updates.name = name;
    if (phone) updates.phone = phone;
    if (dateOfBirth) updates.dateOfBirth = dateOfBirth;
    if (occupation) updates.occupation = occupation;
    if (employerName) updates.employerName = employerName;
    if (address) updates.address = address;
    if (propertyPreferences) updates.propertyPreferences = propertyPreferences;

    const client = await clientStorage.updateClient(req.user.id, updates);

    logger.info(`✅ Client profile updated: ${client.email}`);

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: client,
    });
  } catch (error) {
    logger.error('❌ Update client profile error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update profile',
    });
  }
};

// =====================
// DOCUMENT MANAGEMENT
// =====================

/**
 * Get client's documents
 */
export const getMyDocuments = async (req, res) => {
  try {
    const documents = await documentStorage.getClientDocuments(req.user.id);

    res.status(200).json({
      success: true,
      data: documents,
    });
  } catch (error) {
    logger.error('❌ Get my documents error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get documents',
    });
  }
};

/**
 * Upload document
 */
export const uploadDocument = async (req, res) => {
  try {
    const { category, description } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
    }

    if (!category) {
      return res.status(400).json({
        success: false,
        message: 'Document category is required',
      });
    }

    const document = await documentStorage.saveFile(file, req.user.id, category, description);

    logger.info(`✅ Document uploaded by client: ${req.user.id}`);

    res.status(201).json({
      success: true,
      message: 'Document uploaded successfully',
      data: document,
    });
  } catch (error) {
    logger.error('❌ Upload document error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload document',
    });
  }
};

/**
 * Download document
 */
export const downloadDocument = async (req, res) => {
  try {
    const { id } = req.params;

    const document = await documentStorage.getDocumentById(id);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found',
      });
    }

    // Check if client owns the document
    if (document.clientId._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    // Check 2FA if enabled
    const client = await clientStorage.findById(req.user.id);
    if (client.twoFactorEnabled && !req.verified2FA) {
      return res.status(403).json({
        success: false,
        message: '2FA verification required',
        requires2FA: true
      });
    }

    const fileData = await documentStorage.getFile(id, req.user.id, req.ip);

    res.setHeader('Content-Type', fileData.fileType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileData.fileName}"`);
    res.send(fileData.buffer);
  } catch (error) {
    logger.error('❌ Download document error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to download document',
    });
  }
};

/**
 * Delete document
 */
export const deleteDocument = async (req, res) => {
  try {
    const { id } = req.params;

    const document = await documentStorage.getDocumentById(id);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found',
      });
    }

    // Check if client owns the document
    if (document.clientId._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    await documentStorage.deleteFile(id, req.user.id);

    logger.info(`✅ Document deleted by client: ${id}`);

    res.status(200).json({
      success: true,
      message: 'Document deleted successfully',
    });
  } catch (error) {
    logger.error('❌ Delete document error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete document',
    });
  }
};

// =====================
// 2FA FOR DOCUMENTS
// =====================

/**
 * Request 2FA code
 */
export const request2FACode = async (req, res) => {
  try {
    const code = await clientStorage.generate2FACode(req.user.id);

    // Send 2FA code via email
    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: req.user.email,
        subject: '🔐 Kejamatch Security Verification Code',
        html: twoFactorCodeTemplate({ clientName: req.user.name, code }),
      });
      logger.info(`📧 2FA code sent to: ${req.user.email}`);
    } catch (emailError) {
      logger.error(`❌ Failed to send 2FA code to ${req.user.email}:`, emailError);
    }

    logger.info(`🔐 2FA code requested by client: ${req.user.id}`);

    res.status(200).json({
      success: true,
      message: 'Verification code sent to your email',
    });
  } catch (error) {
    logger.error('❌ Request 2FA code error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send verification code',
    });
  }
};

/**
 * Verify 2FA code
 */
export const verify2FACode = async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Verification code is required',
      });
    }

    const isValid = await clientStorage.verify2FACode(req.user.id, code);

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification code',
      });
    }

    logger.info(`✅ 2FA verified for client: ${req.user.id}`);

    res.status(200).json({
      success: true,
      message: '2FA verified successfully',
      verified: true
    });
  } catch (error) {
    logger.error('❌ Verify 2FA error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify code',
    });
  }
};

/**
 * Enable 2FA
 */
export const enable2FA = async (req, res) => {
  try {
    const client = await clientStorage.enable2FA(req.user.id);

    logger.info(`✅ 2FA enabled for client: ${req.user.id}`);

    res.status(200).json({
      success: true,
      message: 'Two-factor authentication enabled',
      data: client,
    });
  } catch (error) {
    logger.error('❌ Enable 2FA error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to enable 2FA',
    });
  }
};

// =====================
// INQUIRIES & LEADS
// =====================

/**
 * Get client's linked lead/inquiry
 */
export const getMyInquiry = async (req, res) => {
  try {
    const client = await clientStorage.findById(req.user.id);

    if (!client || !client.linkedLeadId) {
      return res.status(404).json({
        success: false,
        message: 'No inquiry found',
      });
    }

    const lead = await LeadStorage.findById(client.linkedLeadId);

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Inquiry not found',
      });
    }

    res.status(200).json({
      success: true,
      data: lead,
    });
  } catch (error) {
    logger.error('❌ Get my inquiry error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get inquiry',
    });
  }
};

// =====================
// GDPR & PRIVACY
// =====================

/**
 * Request data export
 */
export const requestDataExport = async (req, res) => {
  try {
    await clientStorage.requestDataExport(req.user.id);

    logger.info(`📦 Data export requested by client: ${req.user.id}`);

    res.status(200).json({
      success: true,
      message: 'Data export request submitted. You will receive an email with your data within 30 days.',
    });
  } catch (error) {
    logger.error('❌ Request data export error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to request data export',
    });
  }
};

/**
 * Request account deletion
 */
export const requestAccountDeletion = async (req, res) => {
  try {
    await clientStorage.requestDeletion(req.user.id);

    logger.info(`🗑️  Account deletion requested by client: ${req.user.id}`);

    res.status(200).json({
      success: true,
      message: 'Account deletion request submitted. Your account will be deleted within 30 days.',
    });
  } catch (error) {
    logger.error('❌ Request deletion error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to request account deletion',
    });
  }
};

// =====================
// SAVED PROPERTIES
// =====================

export const saveProperty = async (req, res) => {
  try {
    const { id } = req.params;
    const client = await Client.findById(req.user.id);

    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }

    if (client.savedProperties.includes(id)) {
      return res.status(200).json({ success: true, message: 'Property already saved' });
    }

    client.savedProperties.push(id);
    await client.save();

    res.status(200).json({ success: true, message: 'Property saved' });
  } catch (error) {
    logger.error('❌ Save property error:', error);
    res.status(500).json({ success: false, message: 'Failed to save property' });
  }
};

export const unsaveProperty = async (req, res) => {
  try {
    const { id } = req.params;
    await Client.findByIdAndUpdate(req.user.id, {
      $pull: { savedProperties: id }
    });

    res.status(200).json({ success: true, message: 'Property removed from saved' });
  } catch (error) {
    logger.error('❌ Unsave property error:', error);
    res.status(500).json({ success: false, message: 'Failed to remove property' });
  }
};

export const getSavedProperties = async (req, res) => {
  try {
    const client = await Client.findById(req.user.id);

    if (!client || !client.savedProperties.length) {
      return res.status(200).json({ success: true, data: [] });
    }

    const properties = await Property.find({
      _id: { $in: client.savedProperties }
    });

    res.status(200).json({ success: true, data: properties });
  } catch (error) {
    logger.error('❌ Get saved properties error:', error);
    res.status(500).json({ success: false, message: 'Failed to get saved properties' });
  }
};

// =====================
// CLIENT VIEWINGS
// =====================

export const getMyViewings = async (req, res) => {
  try {
    const client = await Client.findById(req.user.id);

    if (!client || !client.linkedLeadId) {
      return res.status(200).json({ success: true, data: [] });
    }

    const leadStorage = new LeadStorage();
    const lead = await leadStorage.findById(client.linkedLeadId);

    if (!lead || !lead.viewings) {
      return res.status(200).json({ success: true, data: [] });
    }

    res.status(200).json({ success: true, data: lead.viewings });
  } catch (error) {
    logger.error('❌ Get my viewings error:', error);
    res.status(500).json({ success: false, message: 'Failed to get viewings' });
  }
};

export default {
  registerClient,
  loginClient,
  verifyClientEmail,
  resendClientVerificationCode,
  getCurrentClient,
  updateClientProfile,
  getMyDocuments,
  uploadDocument,
  downloadDocument,
  deleteDocument,
  request2FACode,
  verify2FACode,
  enable2FA,
  getMyInquiry,
  requestDataExport,
  requestAccountDeletion,
  saveProperty,
  unsaveProperty,
  getSavedProperties,
  getMyViewings,
};