import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import bookingRoutes from './routes/bookingRoutes.js';
import contactRoutes from './routes/contactRoutes.js';
import authRoutes from './routes/authRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import agentRoutes from './routes/agentRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';
import logger from './utils/logger.js';
import database from './config/database.js';  // Fixed import path
import propertyRoutes from './routes/propertyRoutes.js';
import viewingRoutes from './routes/viewingRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());

// CORS configuration
const corsOptions = {
  origin: [
    process.env.FRONTEND_URL,
    'http://localhost:5173', // For local development
    'http://localhost:3000'
  ],
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint - Now includes database status
app.get('/health', (req, res) => {
  const dbStatus = database.getConnectionStatus();
  
  res.status(200).json({ 
    status: 'OK', 
    message: 'Kejamatch API is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    database: {
      connected: dbStatus.isConnected,
      name: dbStatus.name,
      host: dbStatus.host
    }
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Kejamatch Real Estate API',
    version: '2.0.0',
    endpoints: {
      health: '/health',
      contact: '/api/contact',
      bookings: '/api/bookings',
      auth: '/api/auth',
      admin: '/api/admin',
      agent: '/api/agent',
    },
    documentation: 'Contact support for API documentation'
  });
});

// API routes
app.use('/api/contact', contactRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/agent', agentRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/viewings', viewingRoutes);
app.use('/api/analytics', analyticsRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    success: false,
    message: 'Route not found',
    requestedPath: req.path
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server with database connection
const startServer = async () => {
  try {
    // Connect to MongoDB first
    await database.connect();
    
    // Then start the Express server
    app.listen(PORT, () => {
      logger.info(`🚀 Kejamatch Backend Server running on port ${PORT}`);
      logger.info(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`🌐 CORS enabled for: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
      logger.info(`🔗 Frontend URL: ${process.env.FRONTEND_URL}`);
      
      // Check Odoo configuration
      if (process.env.ODOO_URL) {
        logger.info(`✅ Odoo CRM integration enabled: ${process.env.ODOO_URL}`);
      } else {
        logger.warn('⚠️  Odoo CRM integration not configured');
      }
    });
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown with database disconnect
const gracefulShutdown = async (signal) => {
  logger.info(`${signal} signal received: closing HTTP server`);
  try {
    await database.disconnect();
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start the server
startServer();

export default app;