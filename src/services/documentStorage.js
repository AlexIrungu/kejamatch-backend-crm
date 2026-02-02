/**
 * Document Storage Service
 * Handles file uploads, encryption, and document management
 */

import Document from '../models/DocumentModel.js';
import logger from '../utils/logger.js';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

class DocumentStorage {
  constructor() {
    this.initialized = false;
    this.uploadDir = path.join(process.cwd(), 'uploads', 'client-documents');
  }

  async initialize() {
    if (this.initialized) return;

    try {
      // Ensure upload directory exists
      await fs.mkdir(this.uploadDir, { recursive: true });
      logger.info(`✅ Document upload directory ready: ${this.uploadDir}`);
      this.initialized = true;
    } catch (error) {
      logger.error('❌ Failed to initialize document storage:', error);
      throw error;
    }
  }

  // =====================
  // FILE OPERATIONS
  // =====================

  /**
   * Save uploaded file
   */
  async saveFile(file, clientId, category, description = null) {
    try {
      await this.initialize();

      // Generate unique filename
      const timestamp = Date.now();
      const randomString = crypto.randomBytes(8).toString('hex');
      const ext = path.extname(file.originalname);
      const fileName = `${clientId}_${category}_${timestamp}_${randomString}${ext}`;
      const filePath = path.join(this.uploadDir, fileName);

      // Move file to upload directory
      await fs.writeFile(filePath, file.buffer);

      // Create document record
      const document = new Document({
        clientId,
        fileName,
        originalName: file.originalname,
        fileType: file.mimetype,
        fileSize: file.size,
        filePath,
        category,
        description,
        status: 'pending',
        isEncrypted: false, // We'll add encryption in next phase if needed
        uploadedFrom: 'web'
      });

      // Set expiry for time-sensitive documents (e.g., payslips expire after 3 months)
      if (category === 'payslip' || category === 'bank_statement') {
        document.expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 90 days
      }

      await document.save();

      logger.info(`✅ Document uploaded: ${fileName} by client ${clientId}`);

      return document;
    } catch (error) {
      logger.error('❌ Save file error:', error);
      throw error;
    }
  }

  /**
   * Get file buffer for download
   */
  async getFile(documentId, userId = null, ipAddress = null) {
    try {
      await this.initialize();

      const document = await Document.findById(documentId);
      
      if (!document) {
        throw new Error('Document not found');
      }

      if (document.isDeleted) {
        throw new Error('Document has been deleted');
      }

      // Check if expired
      await document.checkExpiry();
      if (document.isExpired) {
        throw new Error('Document has expired');
      }

      // Read file
      const fileBuffer = await fs.readFile(document.filePath);

      // Log access if userId provided
      if (userId) {
        await document.logAccess(userId, ipAddress);
      }

      return {
        buffer: fileBuffer,
        fileName: document.originalName,
        fileType: document.fileType
      };
    } catch (error) {
      logger.error('❌ Get file error:', error);
      throw error;
    }
  }

  /**
   * Delete file (soft delete)
   */
  async deleteFile(documentId, userId) {
    try {
      await this.initialize();

      const document = await Document.findById(documentId);
      
      if (!document) {
        throw new Error('Document not found');
      }

      await document.softDelete(userId);

      logger.info(`✅ Document soft-deleted: ${documentId}`);

      return document;
    } catch (error) {
      logger.error('❌ Delete file error:', error);
      throw error;
    }
  }

  /**
   * Permanently delete file (GDPR)
   */
  async permanentlyDeleteFile(documentId) {
    try {
      await this.initialize();

      const document = await Document.findById(documentId);
      
      if (!document) {
        throw new Error('Document not found');
      }

      // Delete physical file
      try {
        await fs.unlink(document.filePath);
      } catch (err) {
        logger.warn(`⚠️  Could not delete physical file: ${document.filePath}`);
      }

      // Delete database record
      await Document.findByIdAndDelete(documentId);

      logger.info(`✅ Document permanently deleted: ${documentId}`);

      return { success: true };
    } catch (error) {
      logger.error('❌ Permanent delete error:', error);
      throw error;
    }
  }

  // =====================
  // DOCUMENT QUERIES
  // =====================

  async getClientDocuments(clientId, includeDeleted = false) {
    try {
      await this.initialize();
      const documents = await Document.findByClient(clientId, includeDeleted);
      return documents;
    } catch (error) {
      logger.error('❌ Get client documents error:', error);
      return [];
    }
  }

  async getDocumentById(documentId) {
    try {
      await this.initialize();
      return await Document.findById(documentId).populate('clientId', 'name email');
    } catch (error) {
      logger.error('❌ Get document by ID error:', error);
      return null;
    }
  }

  async getPendingDocuments() {
    try {
      await this.initialize();
      return await Document.findPendingVerification();
    } catch (error) {
      logger.error('❌ Get pending documents error:', error);
      return [];
    }
  }

  async getDocumentsByCategory(category) {
    try {
      await this.initialize();
      return await Document.findByCategory(category);
    } catch (error) {
      logger.error('❌ Get documents by category error:', error);
      return [];
    }
  }

  // =====================
  // VERIFICATION
  // =====================

  async verifyDocument(documentId, userId) {
    try {
      await this.initialize();

      const document = await Document.findById(documentId);
      
      if (!document) {
        throw new Error('Document not found');
      }

      await document.verify(userId);

      logger.info(`✅ Document verified: ${documentId} by user ${userId}`);

      return document;
    } catch (error) {
      logger.error('❌ Verify document error:', error);
      throw error;
    }
  }

  async rejectDocument(documentId, userId, reason) {
    try {
      await this.initialize();

      const document = await Document.findById(documentId);
      
      if (!document) {
        throw new Error('Document not found');
      }

      await document.reject(userId, reason);

      logger.info(`❌ Document rejected: ${documentId} - Reason: ${reason}`);

      return document;
    } catch (error) {
      logger.error('❌ Reject document error:', error);
      throw error;
    }
  }

  // =====================
  // STATISTICS
  // =====================

  async getStats() {
    try {
      await this.initialize();
      return await Document.getStats();
    } catch (error) {
      logger.error('❌ Get document stats error:', error);
      return {
        total: 0,
        pending: 0,
        verified: 0,
        rejected: 0,
        expired: 0,
        byCategory: {}
      };
    }
  }

  async getClientDocumentSummary(clientId) {
    try {
      await this.initialize();
      return await Document.getClientSummary(clientId);
    } catch (error) {
      logger.error('❌ Get client document summary error:', error);
      return {
        total: 0,
        verified: 0,
        pending: 0,
        rejected: 0,
        expired: 0,
        categories: {}
      };
    }
  }

  // =====================
  // MAINTENANCE
  // =====================

  /**
   * Check and mark expired documents (run as cron job)
   */
  async checkExpiredDocuments() {
    try {
      await this.initialize();

      const expiredDocs = await Document.findExpired();
      
      let count = 0;
      for (const doc of expiredDocs) {
        await doc.checkExpiry();
        count++;
      }

      if (count > 0) {
        logger.info(`✅ Marked ${count} documents as expired`);
      }

      return count;
    } catch (error) {
      logger.error('❌ Check expired documents error:', error);
      return 0;
    }
  }

  /**
   * Clean up deleted documents older than 30 days (GDPR compliance)
   */
  async cleanupDeletedDocuments(daysOld = 30) {
    try {
      await this.initialize();

      const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

      const deletedDocs = await Document.find({
        isDeleted: true,
        deletedAt: { $lte: cutoffDate }
      });

      let count = 0;
      for (const doc of deletedDocs) {
        await this.permanentlyDeleteFile(doc._id);
        count++;
      }

      if (count > 0) {
        logger.info(`✅ Permanently deleted ${count} old documents`);
      }

      return count;
    } catch (error) {
      logger.error('❌ Cleanup deleted documents error:', error);
      return 0;
    }
  }

  // =====================
  // BULK OPERATIONS
  // =====================

  async deleteAllClientDocuments(clientId, permanent = false) {
    try {
      await this.initialize();

      const documents = await Document.findByClient(clientId, true);

      let count = 0;
      for (const doc of documents) {
        if (permanent) {
          await this.permanentlyDeleteFile(doc._id);
        } else {
          await this.deleteFile(doc._id, null);
        }
        count++;
      }

      logger.info(`✅ Deleted ${count} documents for client ${clientId}`);

      return count;
    } catch (error) {
      logger.error('❌ Delete all client documents error:', error);
      throw error;
    }
  }

  /**
   * Get all documents for data export (GDPR)
   */
  async exportClientData(clientId) {
    try {
      await this.initialize();

      const documents = await Document.findByClient(clientId, true);

      const exportData = documents.map(doc => ({
        id: doc._id,
        fileName: doc.originalName,
        category: doc.categoryLabel,
        uploadedAt: doc.createdAt,
        status: doc.status,
        fileSize: doc.fileSizeFormatted,
        verified: doc.status === 'verified',
        verifiedAt: doc.verifiedAt,
        expired: doc.isExpired,
        deleted: doc.isDeleted
      }));

      return exportData;
    } catch (error) {
      logger.error('❌ Export client data error:', error);
      return [];
    }
  }
}

// Export singleton instance
export const documentStorage = new DocumentStorage();
export default documentStorage;