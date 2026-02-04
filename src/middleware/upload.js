import multer from 'multer';
import path from 'path';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import logger from '../utils/logger.js';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Allowed file types
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'application/pdf'
];

// Max file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Configure Cloudinary storage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    const category = req.body.category || 'uncategorized';
    const isPdf = file.mimetype === 'application/pdf';

    // Generate unique filename: timestamp-originalname (without extension)
    const originalNameWithoutExt = path.parse(file.originalname).name;
    const timestamp = Date.now();
    const publicId = `${timestamp}-${originalNameWithoutExt}`;

    return {
      folder: `kejamatch/${category}`,
      resource_type: isPdf ? 'raw' : 'image',
      public_id: publicId,
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'pdf']
    };
  }
});

// File filter function
const fileFilter = (req, file, cb) => {
  // Check mime type
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    const error = new Error(
      `Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`
    );
    error.status = 400;
    return cb(error, false);
  }

  // Check file extension
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];

  if (!allowedExtensions.includes(ext)) {
    const error = new Error(
      `Invalid file extension. Allowed extensions: ${allowedExtensions.join(', ')}`
    );
    error.status = 400;
    return cb(error, false);
  }

  cb(null, true);
};

// Create multer upload instance
export const uploadMiddleware = multer({
  storage: storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1 // Only one file at a time
  },
  fileFilter: fileFilter
});

// Error handler for multer errors
export const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    // Multer-specific errors
    let message = 'File upload error';

    switch (err.code) {
      case 'LIMIT_FILE_SIZE':
        message = `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`;
        break;
      case 'LIMIT_FILE_COUNT':
        message = 'Too many files. Only one file allowed';
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        message = 'Unexpected field name';
        break;
      default:
        message = err.message;
    }

    logger.error(`❌ Multer error: ${message}`, err);

    return res.status(400).json({
      success: false,
      message: message
    });
  }

  if (err) {
    // Other upload errors
    logger.error('❌ Upload error:', err);

    return res.status(err.status || 500).json({
      success: false,
      message: err.message || 'File upload failed'
    });
  }

  next();
};

// Middleware to validate document category
export const validateDocumentCategory = (req, res, next) => {
  const validCategories = [
    'national_id',
    'passport',
    'drivers_license',
    'payslip',
    'bank_statement',
    'employment_letter',
    'tax_certificate',
    'utility_bill',
    'other'
  ];

  const { category } = req.body;

  if (!category) {
    return res.status(400).json({
      success: false,
      message: 'Document category is required'
    });
  }

  if (!validCategories.includes(category)) {
    return res.status(400).json({
      success: false,
      message: `Invalid category. Allowed categories: ${validCategories.join(', ')}`
    });
  }

  next();
};

// Middleware to check if file was uploaded
export const requireFile = (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'No file uploaded'
    });
  }

  next();
};

// Export cloudinary instance for use in other modules
export { cloudinary };

// Export all middleware
export default {
  uploadMiddleware,
  handleUploadError,
  validateDocumentCategory,
  requireFile,
  cloudinary
};
