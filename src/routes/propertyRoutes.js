import express from 'express';
import {
  getAllProperties,
  getProperty,
  createProperty,
  updateProperty,
  deleteProperty,
  updatePropertyStatus,
  toggleFeatured,
  getFeaturedProperties,
  searchProperties,
  getPropertiesByCategory,
  getPropertyStats,
  updatePropertyImages
} from '../controllers/propertyController.js';
import { verifyToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Public routes (no auth required)
router.get('/featured', getFeaturedProperties);
router.get('/search', searchProperties);
router.get('/category/:category', getPropertiesByCategory);
router.get('/:id', getProperty); // Get single property (increments views)

// Protected routes (require authentication and admin role)
router.use(verifyToken);
router.use(requireAdmin);

// Admin property management
router.get('/', getAllProperties);
router.post('/', createProperty);
router.put('/:id', updateProperty);
router.delete('/:id', deleteProperty);
router.put('/:id/status', updatePropertyStatus);
router.put('/:id/featured', toggleFeatured);
router.put('/:id/images', updatePropertyImages);
router.get('/stats/all', getPropertyStats);

export default router;