/**
 * User Storage Service - MongoDB Implementation
 * Replaces JSON file storage with MongoDB Atlas
 */

import User from '../models/UserModel.js';
import logger from '../utils/logger.js';

class UserStorage {
  constructor() {
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      // Ensure default admin exists
      const adminCount = await User.countDocuments({ role: 'admin' });
      
      if (adminCount === 0) {
        await this.createDefaultAdmin();
      } else {
        logger.info(`✅ Found ${adminCount} admin user(s)`);
      }

      this.initialized = true;
    } catch (error) {
      logger.error('❌ Failed to initialize user storage:', error);
      throw error;
    }
  }

  async createDefaultAdmin() {
    try {
      await User.createDefaultAdmin();
    } catch (error) {
      logger.error('❌ Failed to create default admin:', error);
      throw error;
    }
  }

  async createUser(userData) {
    try {
      await this.initialize();

      // Check if user already exists
      const existingUser = await User.findByEmail(userData.email);
      if (existingUser) {
        throw new Error('User with this email already exists');
      }

      // Create new user
      const user = new User({
        email: userData.email.toLowerCase(),
        password: userData.password, // Will be hashed by pre-save hook
        name: userData.name,
        role: userData.role || 'agent',
        isVerified: false
      });

      // Generate verification code
      const verificationCode = user.generateVerificationCode();

      await user.save();

      logger.info(`✅ User created: ${user.email} (${user.role}) - Pending verification`);

      // Return user with verification code (for sending email)
      return {
        ...user.toSafeJSON(),
        verificationCode
      };
    } catch (error) {
      logger.error('❌ Create user error:', error);
      throw error;
    }
  }

  async findByEmail(email) {
    try {
      await this.initialize();
      return await User.findByEmail(email);
    } catch (error) {
      logger.error('❌ Find by email error:', error);
      return null;
    }
  }

  async findById(id) {
    try {
      await this.initialize();
      return await User.findById(id);
    } catch (error) {
      logger.error('❌ Find by ID error:', error);
      return null;
    }
  }

  async getAllUsers() {
    try {
      await this.initialize();
      const users = await User.find({}).sort({ createdAt: -1 });
      return users.map(u => u.toSafeJSON());
    } catch (error) {
      logger.error('❌ Get all users error:', error);
      return [];
    }
  }

  async updateUser(id, updates) {
    try {
      await this.initialize();

      const user = await User.findById(id);
      if (!user) {
        throw new Error('User not found');
      }

      // Check email uniqueness if email is being updated
      if (updates.email && updates.email.toLowerCase() !== user.email) {
        const existingUser = await User.findByEmail(updates.email);
        if (existingUser) {
          throw new Error('Email already in use');
        }
        user.email = updates.email.toLowerCase();
      }

      // Update fields
      if (updates.name) user.name = updates.name;
      if (updates.role) user.role = updates.role;
      if (updates.isActive !== undefined) user.isActive = updates.isActive;
      if (updates.phone) user.phone = updates.phone;
      if (updates.avatar) user.avatar = updates.avatar;
      if (updates.department) user.department = updates.department;

      // Password update (will trigger pre-save hook for hashing)
      if (updates.password) {
        user.password = updates.password;
      }

      await user.save();

      logger.info(`✅ User updated: ${user.email}`);

      return user.toSafeJSON();
    } catch (error) {
      logger.error('❌ Update user error:', error);
      throw error;
    }
  }

  async updateLastLogin(id) {
    try {
      await this.initialize();

      const user = await User.findById(id);
      if (user) {
        await user.updateLastLogin();
      }
    } catch (error) {
      logger.error('❌ Update last login error:', error);
    }
  }

  async deleteUser(id) {
    try {
      await this.initialize();

      const user = await User.findById(id);
      if (!user) {
        throw new Error('User not found');
      }

      // Prevent deletion of last admin
      if (user.role === 'admin') {
        const adminCount = await User.countDocuments({ role: 'admin' });
        if (adminCount === 1) {
          throw new Error('Cannot delete the last admin user');
        }
      }

      await User.findByIdAndDelete(id);

      logger.info(`✅ User deleted: ${user.email}`);

      return { success: true, message: 'User deleted successfully' };
    } catch (error) {
      logger.error('❌ Delete user error:', error);
      throw error;
    }
  }

  async authenticate(email, password) {
    try {
      await this.initialize();

      // Find user and explicitly select password field
      const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
      
      if (!user) {
        return null;
      }

      if (!user.isActive) {
        throw new Error('User account is disabled');
      }

      // Compare password using the model method
      const isValidPassword = await user.comparePassword(password);
      
      if (!isValidPassword) {
        return null;
      }

      // Update last login
      await this.updateLastLogin(user._id);

      // Return user without password
      return user.toSafeJSON();
    } catch (error) {
      logger.error('❌ Authentication error:', error);
      throw error;
    }
  }

  // Helper method for password verification (used in profile updates)
  async verifyPassword(password, userId) {
    try {
      const user = await User.findById(userId).select('+password');
      if (!user) return false;
      return await user.comparePassword(password);
    } catch (error) {
      logger.error('❌ Verify password error:', error);
      return false;
    }
  }

  // =====================
  // VERIFICATION METHODS
  // =====================

  async verifyUserEmail(email, code) {
    try {
      await this.initialize();

      const user = await User.findOne({ email: email.toLowerCase() })
        .select('+verificationCode +verificationCodeExpiry +verificationAttempts');
      
      if (!user) {
        throw new Error('User not found');
      }

      const result = user.verifyCode(code);

      if (result.valid) {
        await user.save();
        logger.info(`✅ Email verified for user: ${user.email}`);
      }

      return result;
    } catch (error) {
      logger.error('❌ Verify email error:', error);
      throw error;
    }
  }

  async resendVerificationCode(email) {
    try {
      await this.initialize();

      const user = await User.findOne({ email: email.toLowerCase() })
        .select('+verificationCode +verificationCodeExpiry +verificationAttempts');
      
      if (!user) {
        throw new Error('User not found');
      }

      if (user.isVerified) {
        throw new Error('User is already verified');
      }

      const newCode = user.generateVerificationCode();
      await user.save();

      logger.info(`📧 New verification code generated for: ${user.email}`);

      return {
        code: newCode,
        user: user.toSafeJSON()
      };
    } catch (error) {
      logger.error('❌ Resend verification error:', error);
      throw error;
    }
  }

  async manuallyVerifyUser(userId) {
    try {
      await this.initialize();

      const user = await User.findById(userId)
        .select('+verificationCode +verificationCodeExpiry +verificationAttempts');
      
      if (!user) {
        throw new Error('User not found');
      }

      user.isVerified = true;
      user.verificationCode = null;
      user.verificationCodeExpiry = null;
      user.verificationAttempts = 0;

      await user.save();

      logger.info(`✅ User manually verified: ${user.email}`);

      return user.toSafeJSON();
    } catch (error) {
      logger.error('❌ Manual verification error:', error);
      throw error;
    }
  }

  async getUnverifiedUsers() {
    try {
      await this.initialize();
      const users = await User.find({ isVerified: false }).sort({ createdAt: -1 });
      return users.map(u => u.toSafeJSON());
    } catch (error) {
      logger.error('❌ Get unverified users error:', error);
      return [];
    }
  }
}

// Export singleton instance
export const userStorage = new UserStorage();
export default userStorage;