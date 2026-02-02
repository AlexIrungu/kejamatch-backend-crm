// Add these functions to your existing adminController.js

import { clientStorage } from '../services/clientStorageMongo.js';
import { documentStorage } from '../services/documentStorage.js';
import logger from '../utils/logger.js';

// =====================
// CLIENT APPROVAL WORKFLOW
// =====================

/**
 * Get pending client approvals
 */
export const getPendingClientApprovals = async (req, res) => {
  try {
    const clients = await clientStorage.getPendingApprovals();

    res.status(200).json({
      success: true,
      data: clients,
    });
  } catch (error) {
    logger.error('❌ Get pending approvals error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get pending approvals',
    });
  }
};

/**
 * Approve client
 */
export const approveClient = async (req, res) => {
  try {
    const { id } = req.params;

    const client = await clientStorage.approveClient(id, req.user.id);

    // TODO: Send approval email to client

    logger.info(`✅ Client approved: ${id} by ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Client approved successfully',
      data: client,
    });
  } catch (error) {
    logger.error('❌ Approve client error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to approve client',
    });
  }
};

/**
 * Reject client
 */
export const rejectClient = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required',
      });
    }

    const client = await clientStorage.rejectClient(id, req.user.id, reason);

    // TODO: Send rejection email to client

    logger.info(`❌ Client rejected: ${id} by ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Client rejected',
      data: client,
    });
  } catch (error) {
    logger.error('❌ Reject client error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to reject client',
    });
  }
};

// =====================
// CLIENT MANAGEMENT
// =====================

/**
 * Get all clients
 */
export const getAllClients = async (req, res) => {
  try {
    const { status, isVerified, assignedAgent } = req.query;

    const filters = {};
    if (status) filters.status = status;
    if (isVerified !== undefined) filters.isVerified = isVerified === 'true';
    if (assignedAgent) filters.assignedAgent = assignedAgent;

    const clients = await clientStorage.getAllClients(filters);

    res.status(200).json({
      success: true,
      data: clients,
    });
  } catch (error) {
    logger.error('❌ Get all clients error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get clients',
    });
  }
};

/**
 * Get single client
 */
export const getClient = async (req, res) => {
  try {
    const { id } = req.params;

    const client = await clientStorage.findById(id);

    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found',
      });
    }

    // Get documents and inquiry
    const documents = await documentStorage.getClientDocuments(id);
    const documentSummary = await documentStorage.getClientDocumentSummary(id);

    res.status(200).json({
      success: true,
      data: {
        client: client.toSafeJSON(),
        documents,
        documentSummary
      },
    });
  } catch (error) {
    logger.error('❌ Get client error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get client',
    });
  }
};

/**
 * Assign agent to client
 */
export const assignClientToAgent = async (req, res) => {
  try {
    const { id } = req.params;
    const { agentId } = req.body;

    if (!agentId) {
      return res.status(400).json({
        success: false,
        message: 'Agent ID is required',
      });
    }

    const client = await clientStorage.assignAgent(id, agentId);

    logger.info(`✅ Agent assigned to client: ${id} -> ${agentId}`);

    res.status(200).json({
      success: true,
      message: 'Agent assigned successfully',
      data: client,
    });
  } catch (error) {
    logger.error('❌ Assign agent error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign agent',
    });
  }
};

/**
 * Update client (admin)
 */
export const updateClient = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const client = await clientStorage.updateClient(id, updates);

    logger.info(`✅ Client updated by admin: ${id}`);

    res.status(200).json({
      success: true,
      message: 'Client updated successfully',
      data: client,
    });
  } catch (error) {
    logger.error('❌ Update client error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update client',
    });
  }
};

/**
 * Delete client
 */
export const deleteClient = async (req, res) => {
  try {
    const { id } = req.params;

    // Delete all client documents
    await documentStorage.deleteAllClientDocuments(id, true);

    // Delete client
    await clientStorage.deleteClient(id);

    logger.info(`✅ Client deleted: ${id}`);

    res.status(200).json({
      success: true,
      message: 'Client deleted successfully',
    });
  } catch (error) {
    logger.error('❌ Delete client error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete client',
    });
  }
};

// =====================
// DOCUMENT VERIFICATION
// =====================

/**
 * Get all pending documents
 */
export const getPendingDocuments = async (req, res) => {
  try {
    const documents = await documentStorage.getPendingDocuments();

    res.status(200).json({
      success: true,
      data: documents,
    });
  } catch (error) {
    logger.error('❌ Get pending documents error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get pending documents',
    });
  }
};

/**
 * Verify document
 */
export const verifyDocument = async (req, res) => {
  try {
    const { id } = req.params;

    const document = await documentStorage.verifyDocument(id, req.user.id);

    logger.info(`✅ Document verified: ${id} by ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Document verified successfully',
      data: document,
    });
  } catch (error) {
    logger.error('❌ Verify document error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify document',
    });
  }
};

/**
 * Reject document
 */
export const rejectDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required',
      });
    }

    const document = await documentStorage.rejectDocument(id, req.user.id, reason);

    logger.info(`❌ Document rejected: ${id} - ${reason}`);

    res.status(200).json({
      success: true,
      message: 'Document rejected',
      data: document,
    });
  } catch (error) {
    logger.error('❌ Reject document error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject document',
    });
  }
};

/**
 * Download client document (admin)
 */
export const downloadClientDocument = async (req, res) => {
  try {
    const { id } = req.params;

    const document = await documentStorage.getDocumentById(id);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found',
      });
    }

    const fileData = await documentStorage.getFile(id, req.user.id, req.ip);

    res.setHeader('Content-Type', fileData.fileType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileData.fileName}"`);
    res.send(fileData.buffer);
  } catch (error) {
    logger.error('❌ Download document error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to download document',
    });
  }
};

// =====================
// STATISTICS
// =====================

/**
 * Get client statistics
 */
export const getClientStats = async (req, res) => {
  try {
    const clientStats = await clientStorage.getStats();
    const documentStats = await documentStorage.getStats();

    res.status(200).json({
      success: true,
      data: {
        clients: clientStats,
        documents: documentStats
      },
    });
  } catch (error) {
    logger.error('❌ Get client stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get statistics',
    });
  }
};

// Export all functions (add to existing exports in adminController.js)
export const clientManagement = {
  getPendingClientApprovals,
  approveClient,
  rejectClient,
  getAllClients,
  getClient,
  assignClientToAgent,
  updateClient,
  deleteClient,
  getPendingDocuments,
  verifyDocument,
  rejectDocument,
  downloadClientDocument,
  getClientStats
};