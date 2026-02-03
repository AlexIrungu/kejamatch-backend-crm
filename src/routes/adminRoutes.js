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
import {
  getPendingClientApprovals,
  approveClient,
  rejectClient,
  getAllClients,
  getClient,
  assignClientToAgent,
  updateClient,
  deleteClient,
  getPendingDocuments,
  verifyDocument,
  rejectDocument,
  downloadClientDocument,
  getClientStats
} from '../controllers/adminClientController.js';
import odooSyncService from '../services/odooSyncService.js';
import logger from '../utils/logger.js';

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

// Client Management
router.get('/clients/pending', verifyToken, requireAdmin, getPendingClientApprovals);
router.get('/clients/stats', verifyToken, requireAdmin, getClientStats);
router.get('/clients', verifyToken, requireAdmin, getAllClients);
router.get('/clients/:id', verifyToken, requireAdmin, getClient);
router.post('/clients/:id/approve', verifyToken, requireAdmin, approveClient);
router.post('/clients/:id/reject', verifyToken, requireAdmin, rejectClient);
router.put('/clients/:id', verifyToken, requireAdmin, updateClient);
router.delete('/clients/:id', verifyToken, requireAdmin, deleteClient);
router.post('/clients/:id/assign-agent', verifyToken, requireAdmin, assignClientToAgent);

// Document Management
router.get('/documents/pending', verifyToken, requireAdmin, getPendingDocuments);
router.post('/documents/:id/verify', verifyToken, requireAdmin, verifyDocument);
router.post('/documents/:id/reject', verifyToken, requireAdmin, rejectDocument);
router.get('/documents/:id/download', verifyToken, requireAdmin, downloadClientDocument);

// =====================
// ODOO SYNC
// =====================

// Trigger pull from Odoo
router.post('/sync/odoo-pull', async (req, res) => {
  try {
    logger.info(`Odoo pull sync triggered by user ${req.user.id}`);
    const result = await odooSyncService.syncFromOdoo(req.user.id);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    logger.error('Odoo pull sync failed:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get sync logs
router.get('/sync/logs', async (req, res) => {
  try {
    const logs = await odooSyncService.getSyncLogs({
      type: req.query.type,
      status: req.query.status,
      limit: parseInt(req.query.limit) || 20
    });
    res.status(200).json({ success: true, data: logs });
  } catch (error) {
    logger.error('Failed to get sync logs:', error);
    res.status(500).json({ success: false, message: 'Failed to get sync logs' });
  }
});

// Get last sync info
router.get('/sync/last', async (req, res) => {
  try {
    const info = await odooSyncService.getLastSyncInfo();
    res.status(200).json({ success: true, data: info });
  } catch (error) {
    logger.error('Failed to get last sync info:', error);
    res.status(500).json({ success: false, message: 'Failed to get sync info' });
  }
});

export default router;