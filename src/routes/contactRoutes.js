import express from 'express';
import { handleContact } from '../controllers/contactController.js';
import { contactValidation, validate } from '../middleware/validation.js';
import { formLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// POST /api/contact - Submit contact form
router.post(
  '/',
  formLimiter,
  contactValidation,
  validate,
  handleContact
);

export default router;