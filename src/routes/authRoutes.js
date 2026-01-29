import express from 'express';
import {
  register,
  login,
  getCurrentUser,
  updateProfile,
  changePassword,
} from '../controllers/authController.js';
import { verifyToken } from '../middleware/auth.js';
import { body } from 'express-validator';
import { validate } from '../middleware/validation.js';

const router = express.Router();

// Validation rules
const registerValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Invalid email address'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/)
    .withMessage('Password must contain at least one uppercase letter')
    .matches(/[0-9]/)
    .withMessage('Password must contain at least one number'),
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('role').optional().isIn(['admin', 'agent']).withMessage('Invalid role'),
];

const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Invalid email address'),
  body('password').notEmpty().withMessage('Password is required'),
];

// Public routes
router.post('/register', registerValidation, validate, register);
router.post('/login', loginValidation, validate, login);

// Protected routes (require authentication)
router.get('/me', verifyToken, getCurrentUser);
router.put('/profile', verifyToken, updateProfile);
router.put('/change-password', verifyToken, changePassword);

export default router;