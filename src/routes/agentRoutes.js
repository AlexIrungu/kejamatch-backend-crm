import express from 'express';
import { leadStorage } from '../services/leadStorage.js';
import { verifyToken } from '../middleware/auth.js';
import logger from '../utils/logger.js';

const router = express.Router();

// All agent routes require authentication
router.use(verifyToken);

// Get agent's dashboard stats
router.get('/stats', async (req, res) => {
  try {
    const leads = await leadStorage.getAllLeads();
    
    // Filter leads assigned to this agent
    const agentLeads = leads.filter(l => l.assignedTo === req.user.id);

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const stats = {
      total: agentLeads.length,
      today: agentLeads.filter(l => new Date(l.createdAt) >= today).length,
      thisWeek: agentLeads.filter(l => new Date(l.createdAt) >= thisWeek).length,
      byStatus: {},
    };

    // Count by status
    agentLeads.forEach(lead => {
      stats.byStatus[lead.status] = (stats.byStatus[lead.status] || 0) + 1;
    });

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('❌ Get agent stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get agent statistics',
    });
  }
});

// Get agent's assigned leads
router.get('/leads', async (req, res) => {
  try {
    const { status, startDate, endDate } = req.query;
    
    let leads = await leadStorage.getAllLeads();
    
    // Filter leads assigned to this agent
    leads = leads.filter(l => l.assignedTo === req.user.id);

    // Apply additional filters
    if (status) {
      leads = leads.filter(l => l.status === status);
    }

    if (startDate) {
      leads = leads.filter(l => new Date(l.createdAt) >= new Date(startDate));
    }

    if (endDate) {
      leads = leads.filter(l => new Date(l.createdAt) <= new Date(endDate));
    }

    // Sort by most recent first
    leads.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.status(200).json({
      success: true,
      count: leads.length,
      data: leads,
    });
  } catch (error) {
    logger.error('❌ Get agent leads error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get leads',
    });
  }
});

// Get single lead (only if assigned to agent)
router.get('/leads/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const lead = await leadStorage.getLeadById(id);

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found',
      });
    }

    // Check if lead is assigned to this agent
    if (lead.assignedTo !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this lead',
      });
    }

    res.status(200).json({
      success: true,
      data: lead,
    });
  } catch (error) {
    logger.error('❌ Get lead error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get lead',
    });
  }
});

// Update lead status (only for assigned leads)
router.put('/leads/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const lead = await leadStorage.getLeadById(id);

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found',
      });
    }

    // Check if lead is assigned to this agent
    if (lead.assignedTo !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this lead',
      });
    }

    const validStatuses = ['new', 'contacted', 'qualified', 'negotiation', 'won', 'lost'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const updatedLead = await leadStorage.updateLead(id, {
      status,
      notes: notes || lead.notes,
      updatedBy: req.user.email,
      updatedAt: new Date().toISOString(),
    });

    logger.info(`✅ Lead status updated: ${id} -> ${status} by ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Lead status updated successfully',
      data: updatedLead,
    });
  } catch (error) {
    logger.error('❌ Update lead status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update lead status',
    });
  }
});

// Add notes to lead (only for assigned leads)
router.put('/leads/:id/notes', async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const lead = await leadStorage.getLeadById(id);

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found',
      });
    }

    // Check if lead is assigned to this agent
    if (lead.assignedTo !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this lead',
      });
    }

    const updatedLead = await leadStorage.updateLead(id, {
      notes,
      updatedBy: req.user.email,
      updatedAt: new Date().toISOString(),
    });

    logger.info(`✅ Lead notes updated: ${id} by ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Notes updated successfully',
      data: updatedLead,
    });
  } catch (error) {
    logger.error('❌ Update notes error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update notes',
    });
  }
});

export default router;