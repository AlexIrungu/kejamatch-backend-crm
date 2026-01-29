import express from 'express';
import {
  getDashboardStats,
  getAllLeads,
  getLead,
  updateLeadStatus,
  assignLead,
  deleteLead,
  exportLeads,
  syncToOdoo,
  getAllUsers,
  updateUser,
  deleteUser,
} from '../controllers/adminController.js';
import { verifyToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// All admin routes require authentication and admin role
router.use(verifyToken);
router.use(requireAdmin);

// Dashboard
router.get('/stats', getDashboardStats);

// Lead management
router.get('/leads', getAllLeads);
router.get('/leads/:id', getLead);
router.put('/leads/:id/status', updateLeadStatus);
router.put('/leads/:id/assign', assignLead);
router.delete('/leads/:id', deleteLead);
router.get('/leads/export/csv', exportLeads);

// Odoo sync
router.post('/sync/odoo', syncToOdoo);

// User management
router.get('/users', getAllUsers);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

export default router;