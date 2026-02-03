/**
 * Socket.IO Service
 * Handles real-time communication for messaging, notifications, and updates
 */

import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import logger from '../utils/logger.js';

let io = null;
const userSockets = new Map(); // userId -> Set of socket IDs

/**
 * Initialize Socket.IO server
 * @param {http.Server} httpServer - HTTP server instance
 * @param {Object} corsOptions - CORS configuration
 */
export function initializeSocket(httpServer, corsOptions) {
  io = new Server(httpServer, {
    cors: {
      origin: corsOptions.origin,
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000
  });

  // Authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;

    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      socket.userRole = decoded.role;
      socket.userName = decoded.name;
      next();
    } catch (error) {
      logger.warn('Socket auth failed:', error.message);
      next(new Error('Invalid token'));
    }
  });

  // Connection handler
  io.on('connection', (socket) => {
    const userId = socket.userId;
    logger.info(`Socket connected: ${userId} (${socket.userRole})`);

    // Track user's socket connections
    if (!userSockets.has(userId)) {
      userSockets.set(userId, new Set());
    }
    userSockets.get(userId).add(socket.id);

    // Join personal room for direct messages
    socket.join(`user:${userId}`);

    // Join role-based room
    socket.join(`role:${socket.userRole}`);

    // Handle disconnect
    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${userId}`);
      const sockets = userSockets.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          userSockets.delete(userId);
        }
      }
    });

    // Handle typing indicator
    socket.on('typing', (data) => {
      socket.to(`user:${data.receiverId}`).emit('user_typing', {
        senderId: userId,
        senderName: socket.userName
      });
    });

    // Handle stop typing
    socket.on('stop_typing', (data) => {
      socket.to(`user:${data.receiverId}`).emit('user_stop_typing', {
        senderId: userId
      });
    });

    // Handle message read receipt
    socket.on('mark_read', (data) => {
      socket.to(`user:${data.senderId}`).emit('messages_read', {
        readBy: userId,
        partnerId: data.partnerId
      });
    });
  });

  logger.success('Socket.IO server initialized');
  return io;
}

/**
 * Emit event to a specific user
 * @param {string} userId - Target user ID
 * @param {string} event - Event name
 * @param {Object} data - Event data
 */
export function emitToUser(userId, event, data) {
  if (!io) {
    logger.warn('Socket.IO not initialized');
    return false;
  }

  io.to(`user:${userId}`).emit(event, data);
  return true;
}

/**
 * Emit event to users with a specific role
 * @param {string} role - Target role (admin, agent, client)
 * @param {string} event - Event name
 * @param {Object} data - Event data
 */
export function emitToRole(role, event, data) {
  if (!io) {
    logger.warn('Socket.IO not initialized');
    return false;
  }

  io.to(`role:${role}`).emit(event, data);
  return true;
}

/**
 * Broadcast event to all connected clients
 * @param {string} event - Event name
 * @param {Object} data - Event data
 */
export function broadcast(event, data) {
  if (!io) {
    logger.warn('Socket.IO not initialized');
    return false;
  }

  io.emit(event, data);
  return true;
}

/**
 * Check if a user is online
 * @param {string} userId - User ID to check
 * @returns {boolean}
 */
export function isUserOnline(userId) {
  return userSockets.has(userId) && userSockets.get(userId).size > 0;
}

/**
 * Get count of online users
 * @returns {number}
 */
export function getOnlineCount() {
  return userSockets.size;
}

/**
 * Get the Socket.IO instance
 * @returns {Server|null}
 */
export function getIO() {
  return io;
}

export default {
  initializeSocket,
  emitToUser,
  emitToRole,
  broadcast,
  isUserOnline,
  getOnlineCount,
  getIO
};
