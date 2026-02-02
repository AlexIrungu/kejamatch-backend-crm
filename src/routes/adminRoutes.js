import express from 'express';
import {
  getDashboardStats,
  getAllLeads,
  getLead,
  getLeadActivities,
  updateLeadStatus,
  assignLead,
  addLeadNote,
  logLeadCall,
  logLeadEmail,
  scheduleViewing,
  completeViewing,
  addPropertyInterest,
  deleteLead,
  exportLeads,
  getAllUsers,
  updateUser,
  deleteUser,
  verifyUser,
  getUnverifiedUsers,
} from '../controllers/adminController.js';
import { verifyToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication and admin role
router.use(verifyToken);
router.use(requireAdmin);

// Dashboard
router.get('/stats', getDashboardStats);

// Leads management
router.get('/leads', getAllLeads);
router.get('/leads/export/csv', exportLeads);
router.get('/leads/:id', getLead);
router.get('/leads/:id/activities', getLeadActivities);
router.put('/leads/:id/status', updateLeadStatus);
router.put('/leads/:id/assign', assignLead);
router.delete('/leads/:id', deleteLead);

// Lead activity logging
router.post('/leads/:id/notes', addLeadNote);
router.post('/leads/:id/calls', logLeadCall);
router.post('/leads/:id/emails', logLeadEmail);
router.post('/leads/:id/property-interest', addPropertyInterest);

// Viewings
router.post('/leads/:id/viewings', scheduleViewing);
router.put('/leads/:id/viewings/:viewingId/complete', completeViewing);

// User management
router.get('/users', getAllUsers);
router.get('/users/unverified', getUnverifiedUsers);
router.put('/users/:id', updateUser);
router.put('/users/:id/verify', verifyUser);
router.delete('/users/:id', deleteUser);

export default router;