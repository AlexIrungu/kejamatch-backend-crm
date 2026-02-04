/**
 * Pusher Service
 * Handles real-time messaging via Pusher Channels
 */

import Pusher from 'pusher';
import logger from '../utils/logger.js';

class PusherService {
  constructor() {
    this.pusher = null;
    this.initialized = false;
  }

  initialize() {
    if (this.initialized) return;

    try {
      this.pusher = new Pusher({
        appId: process.env.PUSHER_APP_ID,
        key: process.env.PUSHER_KEY,
        secret: process.env.PUSHER_SECRET,
        cluster: process.env.PUSHER_CLUSTER,
        useTLS: true
      });

      this.initialized = true;
      logger.info('✅ Pusher service initialized');
    } catch (error) {
      logger.error('❌ Failed to initialize Pusher:', error);
      throw error;
    }
  }

  /**
   * Trigger an event to a specific user's private channel
   * @param {string} userId - The user's ID
   * @param {string} event - Event name
   * @param {object} data - Event data
   */
  async triggerToUser(userId, event, data) {
    try {
      this.initialize();
      const channel = `private-user-${userId}`;
      await this.pusher.trigger(channel, event, data);
      logger.info(`📤 Pusher event '${event}' sent to user ${userId}`);
    } catch (error) {
      logger.error(`❌ Failed to trigger Pusher event to user ${userId}:`, error);
    }
  }

  /**
   * Trigger an event to a role-based channel
   * @param {string} role - The role (admin, agent, client)
   * @param {string} event - Event name
   * @param {object} data - Event data
   */
  async triggerToRole(role, event, data) {
    try {
      this.initialize();
      const channel = `private-role-${role}`;
      await this.pusher.trigger(channel, event, data);
      logger.info(`📤 Pusher event '${event}' sent to role ${role}`);
    } catch (error) {
      logger.error(`❌ Failed to trigger Pusher event to role ${role}:`, error);
    }
  }

  /**
   * Trigger an event to a conversation channel (for typing indicators)
   * @param {string} conversationId - Combination of two user IDs
   * @param {string} event - Event name
   * @param {object} data - Event data
   */
  async triggerToConversation(conversationId, event, data) {
    try {
      this.initialize();
      const channel = `private-conversation-${conversationId}`;
      await this.pusher.trigger(channel, event, data);
    } catch (error) {
      logger.error(`❌ Failed to trigger Pusher event to conversation:`, error);
    }
  }

  /**
   * Broadcast to all connected clients (public channel)
   * @param {string} event - Event name
   * @param {object} data - Event data
   */
  async broadcast(event, data) {
    try {
      this.initialize();
      await this.pusher.trigger('public-notifications', event, data);
      logger.info(`📢 Pusher broadcast event '${event}' sent`);
    } catch (error) {
      logger.error('❌ Failed to broadcast Pusher event:', error);
    }
  }

  /**
   * Authenticate a user for private channels
   * @param {string} socketId - Pusher socket ID
   * @param {string} channel - Channel name
   * @param {object} user - User object with id, name, role
   */
  authenticateChannel(socketId, channel, user) {
    try {
      this.initialize();

      // For private channels, verify the user has access
      const channelParts = channel.split('-');

      if (channel.startsWith('private-user-')) {
        // User can only access their own channel
        const channelUserId = channelParts[2];
        if (channelUserId !== user.id) {
          throw new Error('Unauthorized channel access');
        }
      }

      if (channel.startsWith('private-role-')) {
        // User can only access their role's channel
        const channelRole = channelParts[2];
        if (channelRole !== user.role) {
          throw new Error('Unauthorized role channel access');
        }
      }

      // Generate auth response
      const authResponse = this.pusher.authorizeChannel(socketId, channel, {
        user_id: user.id,
        user_info: {
          name: user.name,
          role: user.role
        }
      });

      return authResponse;
    } catch (error) {
      logger.error('❌ Pusher channel authentication failed:', error);
      throw error;
    }
  }

  /**
   * Get Pusher instance for direct access if needed
   */
  getInstance() {
    this.initialize();
    return this.pusher;
  }
}

// Export singleton instance
export const pusherService = new PusherService();
export default pusherService;
