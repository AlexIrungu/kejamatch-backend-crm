/**
 * Viewing Routes
 * Handles all viewing-related API endpoints
 */

import express from 'express';
import {
  requestViewing,
  scheduleViewing,
  completeViewing,
  cancelViewing,
  getAllViewings,
  getAgentViewings,
  getViewingStats
} from '../controllers/viewingController.js';
import { verifyToken, requireAdmin, requireAgentOrAdmin } from '../middleware/auth.js';
import { formLimiter } from '../middleware/rateLimiter.js';
import { body, param, query } from 'express-validator';
import { validate } from '../middleware/validation.js';

const router = express.Router();

// Validation rules
const viewingRequestValidation = [
  body('propertyId').notEmpty().withMessage('Property ID is required'),
  body('propertyName').notEmpty().withMessage('Property name is required'),
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('phone').trim().notEmpty().withMessage('Phone number is required'),
  body('preferredDate').notEmpty().withMessage('Preferred date is required'),
  body('preferredTime').notEmpty().withMessage('Preferred time is required')
];

const scheduleViewingValidation = [
  param('leadId').isMongoId().withMessage('Valid lead ID is required'),
  body('propertyId').notEmpty().withMessage('Property ID is required'),
  body('scheduledDate').notEmpty().withMessage('Scheduled date is required'),
  body('scheduledTime').notEmpty().withMessage('Scheduled time is required')
];

const completeViewingValidation = [
  param('leadId').isMongoId().withMessage('Valid lead ID is required'),
  param('viewingId').isMongoId().withMessage('Valid viewing ID is required'),
  body('outcome').notEmpty().withMessage('Outcome is required')
];

// ============================================
// PUBLIC ROUTES
// ============================================

/**
 * POST /api/viewings/request
 * Request a property viewing (public - from property details page)
 */
router.post(
  '/request',
  formLimiter,
  viewingRequestValidation,
  validate,
  requestViewing
);

// ============================================
// PROTECTED ROUTES (Require Authentication)
// ============================================

router.use(verifyToken);

/**
 * GET /api/viewings
 * Get all viewings (Admin only - for calendar)
 */
router.get(
  '/',
  requireAdmin,
  getAllViewings
);

/**
 * GET /api/viewings/stats
 * Get viewing statistics (Admin only)
 */
router.get(
  '/stats',
  requireAdmin,
  getViewingStats
);

/**
 * GET /api/viewings/my
 * Get viewings for logged-in agent
 */
router.get(
  '/my',
  requireAgentOrAdmin,
  getAgentViewings
);

/**
 * POST /api/viewings/:leadId/schedule
 * Schedule a viewing for a lead (Admin/Agent)
 */
router.post(
  '/:leadId/schedule',
  requireAgentOrAdmin,
  scheduleViewingValidation,
  validate,
  scheduleViewing
);

/**
 * PUT /api/viewings/:leadId/:viewingId/complete
 * Mark a viewing as completed (Admin/Agent)
 */
router.put(
  '/:leadId/:viewingId/complete',
  requireAgentOrAdmin,
  completeViewingValidation,
  validate,
  completeViewing
);

/**
 * PUT /api/viewings/:leadId/:viewingId/cancel
 * Cancel a viewing (Admin/Agent)
 */
router.put(
  '/:leadId/:viewingId/cancel',
  requireAgentOrAdmin,
  [
    param('leadId').isMongoId().withMessage('Valid lead ID is required'),
    param('viewingId').isMongoId().withMessage('Valid viewing ID is required')
  ],
  validate,
  cancelViewing
);

export default router;