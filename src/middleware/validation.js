import { body, validationResult } from 'express-validator';

// Validation middleware handler
export const validate = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg
      }))
    });
  }
  
  next();
};

// Booking validation rules
export const bookingValidation = [
  body('propertyName')
    .trim()
    .notEmpty()
    .withMessage('Property name is required')
    .isLength({ min: 2, max: 200 })
    .withMessage('Property name must be between 2 and 200 characters'),
  
  body('propertyLocation')
    .trim()
    .notEmpty()
    .withMessage('Property location is required')
    .isLength({ min: 2, max: 200 })
    .withMessage('Property location must be between 2 and 200 characters'),
  
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  
  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required')
    .matches(/^(\+254|0)[17]\d{8}$/)
    .withMessage('Please provide a valid Kenyan phone number'),
  
  body('checkIn')
    .notEmpty()
    .withMessage('Check-in date is required')
    .isISO8601()
    .withMessage('Check-in must be a valid date')
    .custom((value) => {
      const checkInDate = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (checkInDate < today) {
        throw new Error('Check-in date cannot be in the past');
      }
      return true;
    }),
  
  body('checkOut')
    .notEmpty()
    .withMessage('Check-out date is required')
    .isISO8601()
    .withMessage('Check-out must be a valid date')
    .custom((value, { req }) => {
      const checkInDate = new Date(req.body.checkIn);
      const checkOutDate = new Date(value);
      
      if (checkOutDate <= checkInDate) {
        throw new Error('Check-out date must be after check-in date');
      }
      return true;
    }),
  
  body('guests')
    .notEmpty()
    .withMessage('Number of guests is required')
    .isInt({ min: 1, max: 50 })
    .withMessage('Number of guests must be between 1 and 50'),
  
  body('nights')
    .notEmpty()
    .withMessage('Number of nights is required')
    .isInt({ min: 1, max: 365 })
    .withMessage('Number of nights must be between 1 and 365'),
  
  body('pricePerNight')
    .notEmpty()
    .withMessage('Price per night is required')
    .isFloat({ min: 0 })
    .withMessage('Price per night must be a positive number'),
  
  body('totalCost')
    .notEmpty()
    .withMessage('Total cost is required')
    .isFloat({ min: 0 })
    .withMessage('Total cost must be a positive number'),
  
  body('specialRequests')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Special requests cannot exceed 1000 characters')
];

// Contact form validation rules
export const contactValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  
  body('phoneNumber')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required')
    .matches(/^(\+254|0)[17]\d{8}$/)
    .withMessage('Please provide a valid Kenyan phone number'),
  
  body('subject')
    .trim()
    .notEmpty()
    .withMessage('Subject is required')
    .isLength({ min: 3, max: 200 })
    .withMessage('Subject must be between 3 and 200 characters'),
  
  body('message')
    .trim()
    .notEmpty()
    .withMessage('Message is required')
    .isLength({ min: 10, max: 2000 })
    .withMessage('Message must be between 10 and 2000 characters')
];