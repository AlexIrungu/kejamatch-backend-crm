import express from 'express';
import { handleBooking } from '../controllers/bookingController.js';
import { bookingValidation, validate } from '../middleware/validation.js';
import { formLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// POST /api/bookings - Submit booking request
router.post(
  '/',
  formLimiter,
  bookingValidation,
  validate,
  handleBooking
);

export default router;