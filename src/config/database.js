import mongoose from 'mongoose';
import logger from '../utils/logger.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/kejamatch';

// Connection options for better performance and reliability
const options = {
  maxPoolSize: 10, // Maximum number of connections in the pool
  minPoolSize: 2, // Minimum number of connections in the pool
  serverSelectionTimeoutMS: 5000, // Timeout for selecting a server
  socketTimeoutMS: 45000, // Timeout for socket operations
  family: 4, // Use IPv4, skip trying IPv6
  retryWrites: true, // Automatically retry failed writes
  retryReads: true, // Automatically retry failed reads
};

class Database {
  constructor() {
    this.isConnected = false;
  }

  async connect() {
    if (this.isConnected) {
      logger.info('📦 Using existing database connection');
      return;
    }

    try {
      // Set mongoose options
      mongoose.set('strictQuery', true); // Prepare for Mongoose 7

      // Connect to MongoDB
      await mongoose.connect(MONGODB_URI, options);

      this.isConnected = true;

      logger.info('✅ MongoDB connected successfully');
      logger.info(`📍 Database: ${mongoose.connection.name}`);
      logger.info(`🌐 Host: ${mongoose.connection.host}`);

      // Handle connection events
      mongoose.connection.on('error', (err) => {
        logger.error('❌ MongoDB connection error:', err);
        this.isConnected = false;
      });

      mongoose.connection.on('disconnected', () => {
        logger.warn('⚠️  MongoDB disconnected');
        this.isConnected = false;
      });

      mongoose.connection.on('reconnected', () => {
        logger.info('✅ MongoDB reconnected');
        this.isConnected = true;
      });

      // Handle process termination
      process.on('SIGINT', async () => {
        await this.disconnect();
        process.exit(0);
      });

    } catch (error) {
      logger.error('❌ MongoDB connection failed:', error);
      this.isConnected = false;
      throw error;
    }
  }

  async disconnect() {
    if (!this.isConnected) {
      return;
    }

    try {
      await mongoose.connection.close();
      this.isConnected = false;
      logger.info('👋 MongoDB connection closed');
    } catch (error) {
      logger.error('❌ Error closing MongoDB connection:', error);
      throw error;
    }
  }

  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      readyState: mongoose.connection.readyState,
      name: mongoose.connection.name,
      host: mongoose.connection.host,
    };
  }
}

// Export singleton instance
const database = new Database();
export default database;