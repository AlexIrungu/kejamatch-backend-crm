/**
 * Odoo Authentication Service
 * Handles authentication and session management with Odoo
 */

import odooConfig from '../config/odoo.js';
import logger from '../utils/logger.js';

class OdooAuth {
  constructor() {
    this.sessionId = null;
    this.userId = null;
    this.expiresAt = null;
    this.isAuthenticating = false;
  }

  /**
   * Authenticate with Odoo server
   * @returns {Promise<boolean>} - True if authentication successful
   */
  async authenticate() {
    // Prevent multiple simultaneous authentication attempts
    if (this.isAuthenticating) {
      logger.debug('Authentication already in progress, waiting...');
      await this.waitForAuthentication();
      return this.sessionId !== null;
    }

    this.isAuthenticating = true;

    try {
      logger.info('🔐 Authenticating with Odoo CRM...');

      const response = await fetch(`${odooConfig.url}/web/session/authenticate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          params: {
            db: odooConfig.database,
            login: odooConfig.username,
            password: odooConfig.password,
          },
        }),
        signal: AbortSignal.timeout(odooConfig.apiTimeout),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.data?.message || data.error.message);
      }

      if (data.result && data.result.uid) {
        this.sessionId = data.result.session_id;
        this.userId = data.result.uid;
        this.expiresAt = Date.now() + 3600000; // 1 hour

        logger.success(`✅ Odoo authentication successful (User ID: ${this.userId})`);
        return true;
      }

      throw new Error('Authentication failed: No user ID returned');

    } catch (error) {
      logger.error('❌ Odoo authentication failed:', error.message);
      this.sessionId = null;
      this.userId = null;
      this.expiresAt = null;
      throw error;
    } finally {
      this.isAuthenticating = false;
    }
  }

  /**
   * Wait for ongoing authentication to complete
   */
  async waitForAuthentication() {
    const maxWait = 10000; // 10 seconds
    const startTime = Date.now();

    while (this.isAuthenticating && Date.now() - startTime < maxWait) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    if (this.isAuthenticating) {
      throw new Error('Authentication timeout');
    }
  }

  /**
   * Ensure we have a valid session
   * @returns {Promise<string>} - Session ID
   */
  async ensureAuthenticated() {
    if (!this.sessionId || this.isSessionExpired()) {
      logger.debug('Session expired or not found, re-authenticating...');
      await this.authenticate();
    }
    return this.sessionId;
  }

  /**
   * Check if session is expired
   * @returns {boolean} - True if expired
   */
  isSessionExpired() {
    return !this.expiresAt || Date.now() >= this.expiresAt;
  }

  /**
   * Get headers for Odoo API requests
   * @returns {Object} - Headers object
   */
  getHeaders() {
    if (!this.sessionId) {
      throw new Error('Not authenticated with Odoo');
    }

    return {
      'Content-Type': 'application/json',
      'Cookie': `session_id=${this.sessionId}`,
    };
  }

  /**
   * Clear authentication
   */
  clearAuth() {
    this.sessionId = null;
    this.userId = null;
    this.expiresAt = null;
    logger.info('Odoo authentication cleared');
  }

  /**
   * Get authentication status
   * @returns {Object} - Auth status
   */
  getStatus() {
    return {
      authenticated: this.sessionId !== null,
      userId: this.userId,
      expiresAt: this.expiresAt,
      isExpired: this.isSessionExpired(),
    };
  }
}

// Singleton instance
export const odooAuth = new OdooAuth();

export default odooAuth;