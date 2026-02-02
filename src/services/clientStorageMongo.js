/**
 * Client Storage Service - MongoDB Implementation
 * Handles all client-related database operations
 */

import Client from '../models/ClientModel.js';
import logger from '../utils/logger.js';

class ClientStorage {
  constructor() {
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;
    this.initialized = true;
    logger.info('✅ Client Storage initialized');
  }

  // =====================
  // CLIENT REGISTRATION
  // =====================

  async createClient(clientData) {
    try {
      await this.initialize();

      // Check if client already exists
      const existingClient = await Client.findOne({ email: clientData.email.toLowerCase() });
      if (existingClient) {
        throw new Error('A client with this email already exists');
      }

      // Create new client (status: pending_approval by default)
      const client = new Client({
        email: clientData.email.toLowerCase(),
        password: clientData.password,
        name: clientData.name,
        phone: clientData.phone,
        status: 'pending_approval',
        isVerified: false,
        propertyPreferences: clientData.propertyPreferences || {},
        consentToDataProcessing: clientData.consentToDataProcessing || true,
        consentToMarketing: clientData.consentToMarketing || false
      });

      // Generate verification code
      const verificationCode = client.generateVerificationCode();

      await client.save();

      logger.info(`✅ Client registered: ${client.email} - Pending approval`);

      return {
        ...client.toSafeJSON(),
        verificationCode // Return code for email sending
      };
    } catch (error) {
      logger.error('❌ Create client error:', error);
      throw error;
    }
  }

  // =====================
  // AUTHENTICATION
  // =====================

  async authenticate(email, password) {
    try {
      await this.initialize();

      // Find client and explicitly select password
      const client = await Client.findOne({ email: email.toLowerCase() }).select('+password');
      
      if (!client) {
        return null;
      }

      // Check if account is active
      if (!client.isActive) {
        throw new Error('Account is suspended');
      }

      // Check if approved
      if (client.status !== 'approved') {
        throw new Error('Account is pending approval');
      }

      // Compare password
      const isValidPassword = await client.comparePassword(password);
      
      if (!isValidPassword) {
        return null;
      }

      // Update last login
      await client.updateLastLogin();

      return client.toSafeJSON();
    } catch (error) {
      logger.error('❌ Client authentication error:', error);
      throw error;
    }
  }

  // =====================
  // VERIFICATION
  // =====================

  async verifyEmail(email, code) {
    try {
      await this.initialize();

      const client = await Client.findOne({ email: email.toLowerCase() })
        .select('+verificationCode +verificationCodeExpiry +verificationAttempts');
      
      if (!client) {
        throw new Error('Client not found');
      }

      const result = client.verifyCode(code);

      if (result.valid) {
        await client.save();
        logger.info(`✅ Email verified for client: ${client.email}`);
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

      const client = await Client.findOne({ email: email.toLowerCase() })
        .select('+verificationCode +verificationCodeExpiry +verificationAttempts');
      
      if (!client) {
        throw new Error('Client not found');
      }

      if (client.isVerified) {
        throw new Error('Email is already verified');
      }

      const newCode = client.generateVerificationCode();
      await client.save();

      logger.info(`📧 New verification code generated for: ${client.email}`);

      return {
        code: newCode,
        client: client.toSafeJSON()
      };
    } catch (error) {
      logger.error('❌ Resend verification error:', error);
      throw error;
    }
  }

  // =====================
  // APPROVAL WORKFLOW
  // =====================

  async approveClient(clientId, adminId) {
    try {
      await this.initialize();

      const client = await Client.findById(clientId);
      
      if (!client) {
        throw new Error('Client not found');
      }

      await client.approve(adminId);

      logger.info(`✅ Client approved: ${client.email} by admin ${adminId}`);

      return client.toSafeJSON();
    } catch (error) {
      logger.error('❌ Approve client error:', error);
      throw error;
    }
  }

  async rejectClient(clientId, adminId, reason) {
    try {
      await this.initialize();

      const client = await Client.findById(clientId);
      
      if (!client) {
        throw new Error('Client not found');
      }

      await client.reject(adminId, reason);

      logger.info(`❌ Client rejected: ${client.email} - Reason: ${reason}`);

      return client.toSafeJSON();
    } catch (error) {
      logger.error('❌ Reject client error:', error);
      throw error;
    }
  }

  async getPendingApprovals() {
    try {
      await this.initialize();
      const clients = await Client.findPendingApprovals();
      return clients.map(c => c.toSafeJSON());
    } catch (error) {
      logger.error('❌ Get pending approvals error:', error);
      return [];
    }
  }

  // =====================
  // CLIENT MANAGEMENT
  // =====================

  async findById(id) {
    try {
      await this.initialize();
      return await Client.findById(id);
    } catch (error) {
      logger.error('❌ Find client by ID error:', error);
      return null;
    }
  }

  async findByEmail(email) {
    try {
      await this.initialize();
      return await Client.findOne({ email: email.toLowerCase() });
    } catch (error) {
      logger.error('❌ Find client by email error:', error);
      return null;
    }
  }

  async getAllClients(filters = {}) {
    try {
      await this.initialize();

      const query = {};

      if (filters.status) {
        query.status = filters.status;
      }

      if (filters.isVerified !== undefined) {
        query.isVerified = filters.isVerified;
      }

      if (filters.assignedAgent) {
        query.assignedAgent = filters.assignedAgent;
      }

      const clients = await Client.find(query)
        .populate('assignedAgent', 'name email')
        .populate('approvedBy', 'name email')
        .sort({ createdAt: -1 });

      return clients.map(c => c.toSafeJSON());
    } catch (error) {
      logger.error('❌ Get all clients error:', error);
      return [];
    }
  }

  async updateClient(id, updates) {
    try {
      await this.initialize();

      const client = await Client.findById(id);
      if (!client) {
        throw new Error('Client not found');
      }

      // Check email uniqueness if email is being updated
      if (updates.email && updates.email.toLowerCase() !== client.email) {
        const existingClient = await Client.findOne({ email: updates.email.toLowerCase() });
        if (existingClient) {
          throw new Error('Email already in use');
        }
        client.email = updates.email.toLowerCase();
      }

      // Update allowed fields
      const allowedUpdates = [
        'name', 'phone', 'dateOfBirth', 'occupation', 
        'employerName', 'address', 'propertyPreferences',
        'avatar', 'consentToMarketing'
      ];

      allowedUpdates.forEach(field => {
        if (updates[field] !== undefined) {
          client[field] = updates[field];
        }
      });

      await client.save();

      logger.info(`✅ Client updated: ${client.email}`);

      return client.toSafeJSON();
    } catch (error) {
      logger.error('❌ Update client error:', error);
      throw error;
    }
  }

  async assignAgent(clientId, agentId) {
    try {
      await this.initialize();

      const client = await Client.findById(clientId);
      if (!client) {
        throw new Error('Client not found');
      }

      client.assignedAgent = agentId;
      await client.save();

      logger.info(`✅ Agent assigned to client: ${client.email}`);

      return client.toSafeJSON();
    } catch (error) {
      logger.error('❌ Assign agent error:', error);
      throw error;
    }
  }

  async getClientsByAgent(agentId) {
    try {
      await this.initialize();
      const clients = await Client.findByAgent(agentId);
      return clients.map(c => c.toSafeJSON());
    } catch (error) {
      logger.error('❌ Get clients by agent error:', error);
      return [];
    }
  }

  // =====================
  // 2FA FOR DOCUMENTS
  // =====================

  async generate2FACode(clientId) {
    try {
      await this.initialize();

      const client = await Client.findById(clientId)
        .select('+twoFactorCode +twoFactorCodeExpiry');
      
      if (!client) {
        throw new Error('Client not found');
      }

      const code = client.generate2FACode();
      await client.save();

      logger.info(`🔐 2FA code generated for client: ${client.email}`);

      return code;
    } catch (error) {
      logger.error('❌ Generate 2FA code error:', error);
      throw error;
    }
  }

  async verify2FACode(clientId, code) {
    try {
      await this.initialize();

      const client = await Client.findById(clientId)
        .select('+twoFactorCode +twoFactorCodeExpiry');
      
      if (!client) {
        throw new Error('Client not found');
      }

      const isValid = client.verify2FACode(code);

      if (isValid) {
        await client.save();
        logger.info(`✅ 2FA verified for client: ${client.email}`);
      }

      return isValid;
    } catch (error) {
      logger.error('❌ Verify 2FA code error:', error);
      return false;
    }
  }

  async enable2FA(clientId) {
    try {
      await this.initialize();

      const client = await Client.findById(clientId);
      if (!client) {
        throw new Error('Client not found');
      }

      client.twoFactorEnabled = true;
      await client.save();

      logger.info(`✅ 2FA enabled for client: ${client.email}`);

      return client.toSafeJSON();
    } catch (error) {
      logger.error('❌ Enable 2FA error:', error);
      throw error;
    }
  }

  // =====================
  // GDPR & PRIVACY
  // =====================

  async requestDataExport(clientId) {
    try {
      await this.initialize();

      const client = await Client.findById(clientId);
      if (!client) {
        throw new Error('Client not found');
      }

      await client.requestDataExport();

      logger.info(`📦 Data export requested for client: ${client.email}`);

      return client.toSafeJSON();
    } catch (error) {
      logger.error('❌ Request data export error:', error);
      throw error;
    }
  }

  async requestDeletion(clientId) {
    try {
      await this.initialize();

      const client = await Client.findById(clientId);
      if (!client) {
        throw new Error('Client not found');
      }

      await client.requestDeletion();

      logger.info(`🗑️  Deletion requested for client: ${client.email}`);

      return client.toSafeJSON();
    } catch (error) {
      logger.error('❌ Request deletion error:', error);
      throw error;
    }
  }

  async deleteClient(clientId) {
    try {
      await this.initialize();

      const client = await Client.findByIdAndDelete(clientId);
      
      if (!client) {
        throw new Error('Client not found');
      }

      logger.info(`✅ Client deleted: ${client.email}`);

      return { success: true, message: 'Client deleted successfully' };
    } catch (error) {
      logger.error('❌ Delete client error:', error);
      throw error;
    }
  }

  // =====================
  // STATISTICS
  // =====================

  async getStats() {
    try {
      await this.initialize();
      return await Client.getStats();
    } catch (error) {
      logger.error('❌ Get stats error:', error);
      return {
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
        suspended: 0,
        verified: 0,
        unverified: 0
      };
    }
  }

  // =====================
  // LINK TO LEAD
  // =====================

  async linkToLead(clientId, leadId) {
    try {
      await this.initialize();

      const client = await Client.findById(clientId);
      if (!client) {
        throw new Error('Client not found');
      }

      client.linkedLeadId = leadId;
      await client.save();

      logger.info(`✅ Client linked to lead: ${clientId} -> ${leadId}`);

      return client.toSafeJSON();
    } catch (error) {
      logger.error('❌ Link to lead error:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const clientStorage = new ClientStorage();
export default clientStorage;