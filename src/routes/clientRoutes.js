import express from 'express';
import {
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
  getMyViewings
} from '../controllers/clientController.js';
import { verifyToken } from '../middleware/auth.js';
import {
  sendMessage,
  getConversation,
  getConversations,
  markAsRead,
  getUnreadCount
} from '../controllers/messageController.js';
import { uploadMiddleware } from '../middleware/upload.js';
import { require2FA } from '../middleware/documentAuth.js';

const router = express.Router();

// =====================
// PUBLIC ROUTES (No Auth)
// =====================

/**
 * @route   POST /api/client/register
 * @desc    Register new client
 * @access  Public
 */
router.post('/register', registerClient);

/**
 * @route   POST /api/client/login
 * @desc    Login client
 * @access  Public
 */
router.post('/login', loginClient);

/**
 * @route   POST /api/client/verify-email
 * @desc    Verify client email with code
 * @access  Public
 */
router.post('/verify-email', verifyClientEmail);

/**
 * @route   POST /api/client/resend-verification
 * @desc    Resend verification code
 * @access  Public
 */
router.post('/resend-verification', resendClientVerificationCode);

// =====================
// PROTECTED ROUTES (Auth Required)
// =====================

// All routes below require authentication
router.use(verifyToken);

/**
 * @route   GET /api/client/me
 * @desc    Get current client profile
 * @access  Private (Client)
 */
router.get('/me', getCurrentClient);

/**
 * @route   PUT /api/client/profile
 * @desc    Update client profile
 * @access  Private (Client)
 */
router.put('/profile', updateClientProfile);

// =====================
// DOCUMENT MANAGEMENT
// =====================

/**
 * @route   GET /api/client/documents
 * @desc    Get all my documents
 * @access  Private (Client)
 */
router.get('/documents', getMyDocuments);

/**
 * @route   POST /api/client/documents/upload
 * @desc    Upload a document
 * @access  Private (Client)
 */
router.post('/documents/upload', uploadMiddleware.single('document'), uploadDocument);

/**
 * @route   GET /api/client/documents/:id/download
 * @desc    Download a document (with optional 2FA)
 * @access  Private (Client)
 */
router.get('/documents/:id/download', downloadDocument);

/**
 * @route   DELETE /api/client/documents/:id
 * @desc    Delete a document
 * @access  Private (Client)
 */
router.delete('/documents/:id', deleteDocument);

// =====================
// TWO-FACTOR AUTHENTICATION
// =====================

/**
 * @route   POST /api/client/2fa/request
 * @desc    Request 2FA code
 * @access  Private (Client)
 */
router.post('/2fa/request', request2FACode);

/**
 * @route   POST /api/client/2fa/verify
 * @desc    Verify 2FA code
 * @access  Private (Client)
 */
router.post('/2fa/verify', verify2FACode);

/**
 * @route   POST /api/client/2fa/enable
 * @desc    Enable 2FA for documents
 * @access  Private (Client)
 */
router.post('/2fa/enable', enable2FA);

// =====================
// SAVED PROPERTIES
// =====================

router.get('/properties/saved', getSavedProperties);
router.post('/properties/:id/save', saveProperty);
router.delete('/properties/:id/save', unsaveProperty);

// =====================
// VIEWINGS
// =====================

router.get('/viewings', getMyViewings);

// =====================
// MESSAGING
// =====================

router.get('/messages', getConversations);
router.get('/messages/unread-count', getUnreadCount);
router.get('/messages/:partnerId', getConversation);
router.post('/messages', sendMessage);
router.put('/messages/:partnerId/read', markAsRead);

// =====================
// INQUIRIES & LEADS
// =====================

/**
 * @route   GET /api/client/inquiry
 * @desc    Get my linked inquiry/lead
 * @access  Private (Client)
 */
router.get('/inquiry', getMyInquiry);

// =====================
// GDPR & PRIVACY
// =====================

/**
 * @route   POST /api/client/data-export
 * @desc    Request data export (GDPR)
 * @access  Private (Client)
 */
router.post('/data-export', requestDataExport);

/**
 * @route   POST /api/client/delete-account
 * @desc    Request account deletion (GDPR)
 * @access  Private (Client)
 */
router.post('/delete-account', requestAccountDeletion);

export default router;