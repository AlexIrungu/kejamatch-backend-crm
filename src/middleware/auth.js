import jwt from 'jsonwebtoken';
import { userStorage } from '../services/userStorageMongo.js'; // Use MongoDB version

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Generate JWT token
export const generateToken = (user) => {
  const userId = user.id || user._id?.toString();
  
  return jwt.sign(
    {
      id: userId,
      email: user.email,
      role: user.role, // Can now be 'admin', 'agent', or 'client'
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

// Verify JWT token middleware
export const verifyToken = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided. Please login.',
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Check if user still exists and is active
    const user = await userStorage.findById(decoded.id);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User no longer exists.',
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User account is disabled.',
      });
    }

    // Attach user to request - use virtual id or _id
    const userId = user.id || user._id?.toString();
    
    req.user = {
      id: userId,
      email: user.email,
      role: user.role,
      name: user.name,
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token.',
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired. Please login again.',
      });
    }

    console.error('❌ Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication failed.',
    });
  }
};

// Check if user is admin
export const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin privileges required.',
    });
  }
  next();
};

// Check if user is agent or admin
export const requireAgentOrAdmin = (req, res, next) => {
  if (req.user.role !== 'admin' && req.user.role !== 'agent') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Agent or Admin privileges required.',
    });
  }
  next();
};

// Check if user is admin or accessing their own data
export const requireAdminOrSelf = (req, res, next) => {
  const userId = req.params.id || req.params.userId;
  
  if (req.user.role === 'admin' || req.user.id === userId) {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: 'Access denied.',
  });
};

export default {
  generateToken,
  verifyToken,
  requireAdmin,
  requireAgentOrAdmin,
  requireAdminOrSelf,
};