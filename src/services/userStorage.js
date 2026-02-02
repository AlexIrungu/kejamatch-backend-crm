import fs from 'fs/promises';
import path from 'path';
import bcrypt from 'bcrypt';
import { fileURLToPath } from 'url';
import User from '../models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const USERS_FILE = path.join(__dirname, '../../data/users.json');
const SALT_ROUNDS = 12;

class UserStorage {
  constructor() {
    this.users = [];
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      const dataDir = path.dirname(USERS_FILE);
      await fs.mkdir(dataDir, { recursive: true });

      try {
        const data = await fs.readFile(USERS_FILE, 'utf8');
        this.users = JSON.parse(data).map(u => new User(u));
        console.log(`✅ Loaded ${this.users.length} users from storage`);
      } catch (err) {
        if (err.code === 'ENOENT') {
          console.log('📝 Creating new users file with default admin');
          await this.createDefaultAdmin();
        } else {
          throw err;
        }
      }

      this.initialized = true;
    } catch (error) {
      console.error('❌ Failed to initialize user storage:', error);
      throw error;
    }
  }

  async createDefaultAdmin() {
    const hashedPassword = await this.hashPassword('Admin@123');
    
    const defaultAdmin = new User({
      email: 'admin@kejamatch.com',
      password: hashedPassword,
      name: 'Admin User',
      role: 'admin',
      isActive: true,
      isVerified: true, // Admin is pre-verified
    });

    this.users = [defaultAdmin];
    await this.save();
    
    console.log('✅ Default admin created:');
    console.log('   Email: admin@kejamatch.com');
    console.log('   Password: Admin@123');
    console.log('   ⚠️  PLEASE CHANGE THIS PASSWORD IMMEDIATELY!');
  }

  async save() {
    try {
      await fs.writeFile(
        USERS_FILE,
        JSON.stringify(this.users, null, 2),
        'utf8'
      );
    } catch (error) {
      console.error('❌ Failed to save users:', error);
      throw error;
    }
  }

  async hashPassword(password) {
    return bcrypt.hash(password, SALT_ROUNDS);
  }

  async verifyPassword(password, hashedPassword) {
    try {
      return await bcrypt.compare(password, hashedPassword);
    } catch (error) {
      console.error('Password verification error:', error);
      return false;
    }
  }

  async createUser(userData) {
    await this.initialize();

    const existingUser = this.users.find(u => u.email.toLowerCase() === userData.email.toLowerCase());
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    const hashedPassword = await this.hashPassword(userData.password);

    const user = new User({
      ...userData,
      email: userData.email.toLowerCase(),
      password: hashedPassword,
      isVerified: false, // New users are not verified
    });

    // Generate verification code
    const verificationCode = user.generateVerificationCode();

    this.users.push(user);
    await this.save();

    console.log(`✅ User created: ${user.email} (${user.role}) - Pending verification`);
    
    // Return user with verification code (for sending email)
    return {
      ...user.toJSON(),
      verificationCode,
    };
  }

  async findByEmail(email) {
    await this.initialize();
    return this.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  async findById(id) {
    await this.initialize();
    return this.users.find(u => u.id === id);
  }

  async getAllUsers() {
    await this.initialize();
    return this.users.map(u => u.toJSON());
  }

  async updateUser(id, updates) {
    await this.initialize();

    const userIndex = this.users.findIndex(u => u.id === id);
    if (userIndex === -1) {
      throw new Error('User not found');
    }

    if (updates.email && updates.email.toLowerCase() !== this.users[userIndex].email.toLowerCase()) {
      const existingUser = this.users.find(u => u.email.toLowerCase() === updates.email.toLowerCase());
      if (existingUser) {
        throw new Error('Email already in use');
      }
      updates.email = updates.email.toLowerCase();
    }

    if (updates.password) {
      updates.password = await this.hashPassword(updates.password);
    }

    this.users[userIndex] = new User({
      ...this.users[userIndex],
      ...updates,
    });

    await this.save();
    return this.users[userIndex].toJSON();
  }

  async updateLastLogin(id) {
    await this.initialize();

    const user = this.users.find(u => u.id === id);
    if (user) {
      user.lastLogin = new Date().toISOString();
      await this.save();
    }
  }

  async deleteUser(id) {
    await this.initialize();

    const userIndex = this.users.findIndex(u => u.id === id);
    if (userIndex === -1) {
      throw new Error('User not found');
    }

    const user = this.users[userIndex];
    if (user.role === 'admin') {
      const adminCount = this.users.filter(u => u.role === 'admin').length;
      if (adminCount === 1) {
        throw new Error('Cannot delete the last admin user');
      }
    }

    this.users.splice(userIndex, 1);
    await this.save();
    
    return { success: true, message: 'User deleted successfully' };
  }

  async authenticate(email, password) {
    await this.initialize();

    const user = await this.findByEmail(email);
    if (!user) {
      return null;
    }

    if (!user.isActive) {
      throw new Error('User account is disabled');
    }

    const isValidPassword = await this.verifyPassword(password, user.password);
    if (!isValidPassword) {
      return null;
    }

    await this.updateLastLogin(user.id);

    return user.toJSON();
  }

  // =====================
  // VERIFICATION METHODS
  // =====================

  async verifyUserEmail(email, code) {
    await this.initialize();

    const user = await this.findByEmail(email);
    if (!user) {
      throw new Error('User not found');
    }

    const result = user.verifyCode(code);
    
    if (result.valid) {
      await this.save();
      console.log(`✅ Email verified for user: ${user.email}`);
    }

    return result;
  }

  async resendVerificationCode(email) {
    await this.initialize();

    const user = await this.findByEmail(email);
    if (!user) {
      throw new Error('User not found');
    }

    if (user.isVerified) {
      throw new Error('User is already verified');
    }

    const newCode = user.generateVerificationCode();
    await this.save();

    console.log(`📧 New verification code generated for: ${user.email}`);
    
    return {
      code: newCode,
      user: user.toJSON(),
    };
  }

  async manuallyVerifyUser(userId) {
    await this.initialize();

    const userIndex = this.users.findIndex(u => u.id === userId);
    if (userIndex === -1) {
      throw new Error('User not found');
    }

    this.users[userIndex].isVerified = true;
    this.users[userIndex].verificationCode = null;
    this.users[userIndex].verificationCodeExpiry = null;
    this.users[userIndex].verificationAttempts = 0;

    await this.save();
    
    console.log(`✅ User manually verified: ${this.users[userIndex].email}`);
    
    return this.users[userIndex].toJSON();
  }

  async getUnverifiedUsers() {
    await this.initialize();
    return this.users.filter(u => !u.isVerified).map(u => u.toJSON());
  }
}

export const userStorage = new UserStorage();
export default userStorage;