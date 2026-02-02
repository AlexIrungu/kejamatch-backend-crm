import { clientStorage } from '../services/clientStorageMongo.js';
import logger from '../utils/logger.js';

/**
 * Middleware to require 2FA verification for document access
 * Checks if client has 2FA enabled and if they've verified in this session
 */
export const require2FA = async (req, res, next) => {
  try {
    // Check if user is a client
    if (req.user.role !== 'client') {
      // Admins and agents don't need 2FA
      return next();
    }

    // Get client data
    const client = await clientStorage.findById(req.user.id);

    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    // Check if 2FA is enabled for this client
    if (!client.twoFactorEnabled) {
      // 2FA not enabled, allow access
      return next();
    }

    // Check if 2FA was already verified in this session
    // We'll use a session token or check the request header
    const verified2FA = req.headers['x-2fa-verified'] === 'true';

    if (!verified2FA) {
      // 2FA verification required
      return res.status(403).json({
        success: false,
        message: 'Two-factor authentication required',
        requires2FA: true,
        clientId: client.id
      });
    }

    // 2FA verified, attach to request
    req.verified2FA = true;
    next();

  } catch (error) {
    logger.error('❌ 2FA middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication error'
    });
  }
};

/**
 * Middleware to check if client role (not admin/agent)
 */
export const requireClientRole = (req, res, next) => {
  if (req.user.role !== 'client') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Client account required.'
    });
  }
  next();
};

/**
 * Middleware to check if client account is approved
 */
export const requireApprovedClient = async (req, res, next) => {
  try {
    const client = await clientStorage.findById(req.user.id);

    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    if (client.status !== 'approved') {
      return res.status(403).json({
        success: false,
        message: 'Your account is pending approval',
        status: client.status
      });
    }

    next();
  } catch (error) {
    logger.error('❌ Approved client check error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication error'
    });
  }
};

/**
 * Middleware to check if client email is verified
 */
export const requireVerifiedEmail = async (req, res, next) => {
  try {
    const client = await clientStorage.findById(req.user.id);

    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    if (!client.isVerified) {
      return res.status(403).json({
        success: false,
        message: 'Please verify your email address',
        requiresVerification: true
      });
    }

    next();
  } catch (error) {
    logger.error('❌ Verified email check error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication error'
    });
  }
};

/**
 * Optional 2FA middleware - warns but doesn't block
 */
export const suggest2FA = async (req, res, next) => {
  try {
    if (req.user.role !== 'client') {
      return next();
    }

    const client = await clientStorage.findById(req.user.id);

    if (client && !client.twoFactorEnabled) {
      // Add suggestion to response (doesn't block request)
      req.suggest2FA = true;
    }

    next();
  } catch (error) {
    logger.error('❌ Suggest 2FA error:', error);
    next(); // Don't block on error
  }
};

/**
 * Middleware to rate limit 2FA attempts
 */
const twoFactorAttempts = new Map(); // Store: clientId -> { count, resetAt }

export const rateLimitTwoFactor = (req, res, next) => {
  const clientId = req.user.id;
  const now = Date.now();
  const LIMIT = 5; // Max attempts
  const WINDOW = 15 * 60 * 1000; // 15 minutes

  let attempts = twoFactorAttempts.get(clientId);

  // Reset if window expired
  if (!attempts || now > attempts.resetAt) {
    attempts = {
      count: 0,
      resetAt: now + WINDOW
    };
    twoFactorAttempts.set(clientId, attempts);
  }

  // Check if limit exceeded
  if (attempts.count >= LIMIT) {
    const remainingTime = Math.ceil((attempts.resetAt - now) / 1000 / 60);
    
    logger.warn(`⚠️  2FA rate limit exceeded for client: ${clientId}`);

    return res.status(429).json({
      success: false,
      message: `Too many verification attempts. Please try again in ${remainingTime} minutes.`
    });
  }

  // Increment attempts
  attempts.count++;
  twoFactorAttempts.set(clientId, attempts);

  next();
};

/**
 * Clean up old rate limit entries (run periodically)
 */
export const cleanupRateLimits = () => {
  const now = Date.now();
  for (const [clientId, attempts] of twoFactorAttempts.entries()) {
    if (now > attempts.resetAt) {
      twoFactorAttempts.delete(clientId);
    }
  }
};

// Run cleanup every hour
setInterval(cleanupRateLimits, 60 * 60 * 1000);

export default {
  require2FA,
  requireClientRole,
  requireApprovedClient,
  requireVerifiedEmail,
  suggest2FA,
  rateLimitTwoFactor,
  cleanupRateLimits
};