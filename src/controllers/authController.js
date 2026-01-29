import { userStorage } from '../services/userStorage.js';
import { generateToken } from '../middleware/auth.js';
import logger from '../utils/logger.js';

// Register new user
export const register = async (req, res) => {
  try {
    const { email, password, name, role } = req.body;

    // Validate input
    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        message: 'Email, password, and name are required',
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format',
      });
    }

    // Validate password strength (min 8 chars, 1 uppercase, 1 number)
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
    let userRole = 'agent'; // Default role
    if (role === 'admin') {
      // Check if requester is admin (for subsequent admin creations)
      if (req.user && req.user.role === 'admin') {
        userRole = 'admin';
      } else {
        // For first admin creation (no auth yet), allow it
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

    // Create user
    const user = await userStorage.createUser({
      email,
      password,
      name,
      role: userRole,
    });

    // Generate token
    const token = generateToken(user);

    logger.info(`✅ User registered: ${email} (${userRole})`);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user,
        token,
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

// Login user
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    // Authenticate user
    const user = await userStorage.authenticate(email, password);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Generate token
    const token = generateToken(user);

    logger.info(`✅ User logged in: ${email}`);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user,
        token,
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

// Get current user (from token)
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

    // Update name
    if (name) {
      updates.name = name;
    }

    // Update email
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

    // Update password (requires current password)
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({
          success: false,
          message: 'Current password is required to set new password',
        });
      }

      // Verify current password
      const user = await userStorage.findById(userId);
      const isValidPassword = userStorage.verifyPassword(currentPassword, user.password);
      
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: 'Current password is incorrect',
        });
      }

      // Validate new password
      if (newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
        return res.status(400).json({
          success: false,
          message: 'New password must be at least 8 characters with one uppercase letter and one number',
        });
      }

      updates.password = newPassword;
    }

    // Update user
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

    // Verify current password
    const user = await userStorage.findById(userId);
    const isValidPassword = userStorage.verifyPassword(currentPassword, user.password);

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect',
      });
    }

    // Validate new password
    if (newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 8 characters with one uppercase letter and one number',
      });
    }

    // Update password
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
  getCurrentUser,
  updateProfile,
  changePassword,
};