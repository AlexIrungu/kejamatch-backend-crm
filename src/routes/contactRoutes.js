/**
 * Contact Routes (Updated with Admin Endpoints)
 */

import express from 'express';
import { 
  handleContact, 
  getAllLeads, 
  getLeadStats, 
  exportLeadsCSV,
  updateLeadStatus 
} from '../controllers/contactController.js';
import { contactValidation, validate } from '../middleware/validation.js';
import { formLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// PUBLIC ENDPOINTS

/**
 * POST /api/contact
 * Submit contact form (public)
 */
router.post(
  '/',
  formLimiter,
  contactValidation,
  validate,
  handleContact
);

// ADMIN ENDPOINTS (You can add authentication middleware later)

/**
 * GET /api/contact/leads
 * Get all leads (admin)
 */
router.get('/leads', getAllLeads);

/**
 * GET /api/contact/stats
 * Get lead statistics (admin)
 */
router.get('/stats', getLeadStats);

/**
 * GET /api/contact/export
 * Export leads to CSV (admin)
 */
router.get('/export', exportLeadsCSV);

/**
 * PATCH /api/contact/leads/:leadId/status
 * Update lead status (admin)
 */
router.patch('/leads/:leadId/status', updateLeadStatus);

export default router;