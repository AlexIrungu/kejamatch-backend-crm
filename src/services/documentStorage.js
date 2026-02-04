/**
 * Document Storage Service
 * Handles file uploads via Cloudinary and document management
 */

import Document from '../models/DocumentModel.js';
import logger from '../utils/logger.js';
import { cloudinary } from '../middleware/upload.js';

class DocumentStorage {
  constructor() {
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      // Verify Cloudinary configuration
      if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
        throw new Error('Cloudinary configuration missing. Check CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET environment variables.');
      }

      logger.info('✅ Document storage initialized with Cloudinary');
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
   * Save uploaded file (file already uploaded to Cloudinary by multer)
   * @param {Object} file - Multer file object with Cloudinary data
   * @param {String} clientId - Client's MongoDB ID
   * @param {String} category - Document category
   * @param {String} description - Optional description
   */
  async saveFile(file, clientId, category, description = null) {
    try {
      await this.initialize();

      // Extract Cloudinary data from multer-storage-cloudinary
      // file.path = Cloudinary URL
      // file.filename = public_id (with folder)
      const cloudinaryUrl = file.path;
      const cloudinaryPublicId = file.filename;

      // Create document record
      const document = new Document({
        clientId,
        fileName: file.originalname,
        originalName: file.originalname,
        fileType: file.mimetype,
        fileSize: file.size,
        filePath: cloudinaryUrl, // Store Cloudinary URL as filePath for compatibility
        cloudinaryUrl: cloudinaryUrl,
        cloudinaryPublicId: cloudinaryPublicId,
        category,
        description,
        status: 'pending',
        isEncrypted: false,
        uploadedFrom: 'web'
      });

      // Set expiry for time-sensitive documents (e.g., payslips expire after 3 months)
      if (category === 'payslip' || category === 'bank_statement') {
        document.expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 90 days
      }

      await document.save();

      logger.info(`✅ Document uploaded to Cloudinary: ${cloudinaryPublicId} by client ${clientId}`);

      return document;
    } catch (error) {
      logger.error('❌ Save file error:', error);
      throw error;
    }
  }

  /**
   * Get file for download (proxy from Cloudinary)
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

      // Fetch file from Cloudinary URL
      const response = await fetch(document.cloudinaryUrl || document.filePath);

      if (!response.ok) {
        throw new Error('Failed to fetch file from storage');
      }

      const arrayBuffer = await response.arrayBuffer();
      const fileBuffer = Buffer.from(arrayBuffer);

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
   * Permanently delete file (GDPR) - removes from Cloudinary
   */
  async permanentlyDeleteFile(documentId) {
    try {
      await this.initialize();

      const document = await Document.findById(documentId);

      if (!document) {
        throw new Error('Document not found');
      }

      // Delete from Cloudinary
      if (document.cloudinaryPublicId) {
        try {
          // Determine resource type based on file type
          const resourceType = document.fileType === 'application/pdf' ? 'raw' : 'image';
          await cloudinary.uploader.destroy(document.cloudinaryPublicId, {
            resource_type: resourceType
          });
          logger.info(`✅ Deleted from Cloudinary: ${document.cloudinaryPublicId}`);
        } catch (cloudinaryError) {
          logger.warn(`⚠️  Could not delete from Cloudinary: ${document.cloudinaryPublicId}`, cloudinaryError);
        }
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
        logger.info(`✅ Permanently deleted ${count} old documents from Cloudinary`);
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
        deleted: doc.isDeleted,
        cloudinaryUrl: doc.cloudinaryUrl
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
