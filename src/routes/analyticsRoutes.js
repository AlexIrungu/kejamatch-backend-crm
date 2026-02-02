import express from 'express';
import {
  getConversionFunnel,
  getLeadSourceBreakdown,
  getAgentPerformance,
  getTimeTrends,
  getPropertyAnalytics,
  getDashboardAnalytics,
} from '../controllers/analyticsController.js';
import { verifyToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication and admin role
router.use(verifyToken);
router.use(requireAdmin);

// Individual analytics endpoints
router.get('/funnel', getConversionFunnel);
router.get('/sources', getLeadSourceBreakdown);
router.get('/agents', getAgentPerformance);
router.get('/trends', getTimeTrends);
router.get('/properties', getPropertyAnalytics);

// Combined dashboard analytics
router.get('/dashboard', getDashboardAnalytics);

export default router;