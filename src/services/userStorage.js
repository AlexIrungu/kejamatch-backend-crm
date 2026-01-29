import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import User from '../models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const USERS_FILE = path.join(__dirname, '../../data/users.json');

class UserStorage {
  constructor() {
    this.users = [];
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      // Ensure data directory exists
      const dataDir = path.dirname(USERS_FILE);
      await fs.mkdir(dataDir, { recursive: true });

      // Try to read existing users file
      try {
        const data = await fs.readFile(USERS_FILE, 'utf8');
        this.users = JSON.parse(data).map(u => new User(u));
        console.log(`✅ Loaded ${this.users.length} users from storage`);
      } catch (err) {
        if (err.code === 'ENOENT') {
          // File doesn't exist, create it with default admin
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
    const defaultAdmin = new User({
      email: 'admin@kejamatch.com',
      password: this.hashPassword('Admin@123'), // Default password
      name: 'Admin User',
      role: 'admin',
      isActive: true,
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

  // Hash password using crypto
  hashPassword(password) {
    return crypto
      .createHash('sha256')
      .update(password + process.env.JWT_SECRET)
      .digest('hex');
  }

  // Verify password
  verifyPassword(password, hashedPassword) {
    return this.hashPassword(password) === hashedPassword;
  }

  // Create new user
  async createUser(userData) {
    await this.initialize();

    // Check if user already exists
    const existingUser = this.users.find(u => u.email === userData.email);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Hash password
    const hashedPassword = this.hashPassword(userData.password);

    const user = new User({
      ...userData,
      password: hashedPassword,
    });

    this.users.push(user);
    await this.save();

    console.log(`✅ User created: ${user.email} (${user.role})`);
    return user.toJSON();
  }

  // Find user by email
  async findByEmail(email) {
    await this.initialize();
    return this.users.find(u => u.email === email);
  }

  // Find user by ID
  async findById(id) {
    await this.initialize();
    return this.users.find(u => u.id === id);
  }

  // Get all users (admin only)
  async getAllUsers() {
    await this.initialize();
    return this.users.map(u => u.toJSON());
  }

  // Update user
  async updateUser(id, updates) {
    await this.initialize();

    const userIndex = this.users.findIndex(u => u.id === id);
    if (userIndex === -1) {
      throw new Error('User not found');
    }

    // Don't allow email changes if it's already taken
    if (updates.email && updates.email !== this.users[userIndex].email) {
      const existingUser = this.users.find(u => u.email === updates.email);
      if (existingUser) {
        throw new Error('Email already in use');
      }
    }

    // Hash password if being updated
    if (updates.password) {
      updates.password = this.hashPassword(updates.password);
    }

    // Update user
    this.users[userIndex] = new User({
      ...this.users[userIndex],
      ...updates,
    });

    await this.save();
    return this.users[userIndex].toJSON();
  }

  // Update last login
  async updateLastLogin(id) {
    await this.initialize();

    const user = this.users.find(u => u.id === id);
    if (user) {
      user.lastLogin = new Date().toISOString();
      await this.save();
    }
  }

  // Delete user
  async deleteUser(id) {
    await this.initialize();

    const userIndex = this.users.findIndex(u => u.id === id);
    if (userIndex === -1) {
      throw new Error('User not found');
    }

    // Don't allow deleting the last admin
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

  // Authenticate user
  async authenticate(email, password) {
    await this.initialize();

    const user = await this.findByEmail(email);
    if (!user) {
      return null;
    }

    if (!user.isActive) {
      throw new Error('User account is disabled');
    }

    const isValidPassword = this.verifyPassword(password, user.password);
    if (!isValidPassword) {
      return null;
    }

    // Update last login
    await this.updateLastLogin(user.id);

    return user.toJSON();
  }
}

// Singleton instance
export const userStorage = new UserStorage();
export default userStorage;