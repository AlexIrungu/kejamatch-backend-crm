import { userStorage } from '../services/userStorage.js';
import { generateToken } from '../middleware/auth.js';
import { Resend } from 'resend';
import { verificationCodeTemplate, welcomeEmailTemplate } from '../templates/emailTemplates.js';
import logger from '../utils/logger.js';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@kejamatch.com';

// Helper: Send verification email
const sendVerificationEmail = async (user, code) => {
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: user.email,
      subject: '🔐 Verify Your Kejamatch Account',
      html: verificationCodeTemplate({
        name: user.name,
        code: code,
        role: user.role,
      }),
    });
    logger.info(`📧 Verification email sent to: ${user.email}`);
    return true;
  } catch (error) {
    logger.error(`❌ Failed to send verification email to ${user.email}:`, error);
    return false;
  }
};

// Helper: Send welcome email
const sendWelcomeEmail = async (user) => {
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: user.email,
      subject: '🎉 Welcome to Kejamatch!',
      html: welcomeEmailTemplate({
        name: user.name,
        email: user.email,
        role: user.role,
      }),
    });
    logger.info(`📧 Welcome email sent to: ${user.email}`);
    return true;
  } catch (error) {
    logger.error(`❌ Failed to send welcome email to ${user.email}:`, error);
    return false;
  }
};

// Register new user
export const register = async (req, res) => {
  try {
    const { email, password, name, role } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        message: 'Email, password, and name are required',
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format',
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long',
      });
    }

    if (!/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      return res.status(400).json({
        success: false,
        message: 'Password must contain at least one uppercase letter and one number',
      });
    }

    // Only admins can create admin accounts
    let userRole = 'agent';
    if (role === 'admin') {
      if (req.user && req.user.role === 'admin') {
        userRole = 'admin';
      } else {
        const users = await userStorage.getAllUsers();
        if (users.length === 0) {
          userRole = 'admin';
        } else {
          return res.status(403).json({
            success: false,
            message: 'Only admins can create admin accounts',
          });
        }
      }
    }

    // Create user (returns user with verification code)
    const userData = await userStorage.createUser({
      email,
      password,
      name,
      role: userRole,
    });

    // Send verification email
    await sendVerificationEmail(userData, userData.verificationCode);

    // Generate token (user can login but will be blocked from dashboard until verified)
    const token = generateToken(userData);

    logger.info(`✅ User registered: ${email} (${userRole}) - Verification pending`);

    res.status(201).json({
      success: true,
      message: 'Registration successful! Please check your email for verification code.',
      data: {
        user: {
          id: userData.id,
          email: userData.email,
          name: userData.name,
          role: userData.role,
          isVerified: userData.isVerified,
        },
        token,
        requiresVerification: true,
      },
    });
  } catch (error) {
    logger.error('❌ Registration error:', error);
    
    if (error.message === 'User with this email already exists') {
      return res.status(409).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to register user',
    });
  }
};

// Verify email with code
export const verifyEmail = async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({
        success: false,
        message: 'Email and verification code are required',
      });
    }

    const result = await userStorage.verifyUserEmail(email, code);

    if (!result.valid) {
      return res.status(400).json({
        success: false,
        message: result.error,
      });
    }

    // Get updated user data
    const user = await userStorage.findByEmail(email);
    
    // Send welcome email
    await sendWelcomeEmail(user.toJSON());

    logger.info(`✅ Email verified for: ${email}`);

    res.status(200).json({
      success: true,
      message: 'Email verified successfully! Welcome to Kejamatch.',
      data: {
        user: user.toJSON(),
      },
    });
  } catch (error) {
    logger.error('❌ Verification error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to verify email',
    });
  }
};

// Resend verification code
export const resendVerificationCode = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required',
      });
    }

    const result = await userStorage.resendVerificationCode(email);

    // Send new verification email
    await sendVerificationEmail(result.user, result.code);

    logger.info(`📧 Verification code resent to: ${email}`);

    res.status(200).json({
      success: true,
      message: 'New verification code sent to your email.',
    });
  } catch (error) {
    logger.error('❌ Resend verification error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to resend verification code',
    });
  }
};

// Login user
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    const user = await userStorage.authenticate(email, password);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    const token = generateToken(user);

    logger.info(`✅ User logged in: ${email} (Verified: ${user.isVerified})`);

    res.status(200).json({
      success: true,
      message: user.isVerified ? 'Login successful' : 'Login successful - Please verify your email',
      data: {
        user,
        token,
        requiresVerification: !user.isVerified,
      },
    });
  } catch (error) {
    logger.error('❌ Login error:', error);

    if (error.message === 'User account is disabled') {
      return res.status(403).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Login failed',
    });
  }
};

// Get current user
export const getCurrentUser = async (req, res) => {
  try {
    const user = await userStorage.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      data: user.toJSON(),
    });
  } catch (error) {
    logger.error('❌ Get current user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user data',
    });
  }
};

// Update user profile
export const updateProfile = async (req, res) => {
  try {
    const { name, email, currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    const updates = {};

    if (name) {
      updates.name = name;
    }

    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid email format',
        });
      }
      updates.email = email;
    }

    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({
          success: false,
          message: 'Current password is required to set new password',
        });
      }

      const user = await userStorage.findById(userId);
      const isValidPassword = await userStorage.verifyPassword(currentPassword, user.password);
      
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: 'Current password is incorrect',
        });
      }

      if (newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
        return res.status(400).json({
          success: false,
          message: 'New password must be at least 8 characters with one uppercase letter and one number',
        });
      }

      updates.password = newPassword;
    }

    const updatedUser = await userStorage.updateUser(userId, updates);

    logger.info(`✅ Profile updated for user: ${updatedUser.email}`);

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedUser,
    });
  } catch (error) {
    logger.error('❌ Update profile error:', error);

    if (error.message === 'Email already in use') {
      return res.status(409).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
    });
  }
};

// Change password
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required',
      });
    }

    const user = await userStorage.findById(userId);
    const isValidPassword = await userStorage.verifyPassword(currentPassword, user.password);

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect',
      });
    }

    if (newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 8 characters with one uppercase letter and one number',
      });
    }

    await userStorage.updateUser(userId, { password: newPassword });

    logger.info(`✅ Password changed for user: ${user.email}`);

    res.status(200).json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    logger.error('❌ Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change password',
    });
  }
};

export default {
  register,
  login,
  verifyEmail,
  resendVerificationCode,
  getCurrentUser,
  updateProfile,
  changePassword,
};