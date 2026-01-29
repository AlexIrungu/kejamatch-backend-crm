import { leadStorage } from '../services/leadStorage.js';
import { userStorage } from '../services/userStorage.js';
import { odooService } from '../services/odooService.js';
import logger from '../utils/logger.js';

// Get dashboard statistics
export const getDashboardStats = async (req, res) => {
  try {
    const leads = await leadStorage.getAllLeads();
    const users = await userStorage.getAllUsers();

    // Calculate statistics
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const stats = {
      leads: {
        total: leads.length,
        today: leads.filter(l => new Date(l.createdAt) >= today).length,
        thisWeek: leads.filter(l => new Date(l.createdAt) >= thisWeek).length,
        thisMonth: leads.filter(l => new Date(l.createdAt) >= thisMonth).length,
        byStatus: {},
        byType: {
          contact: leads.filter(l => l.type === 'contact').length,
          booking: leads.filter(l => l.type === 'booking').length,
        },
      },
      users: {
        total: users.length,
        admins: users.filter(u => u.role === 'admin').length,
        agents: users.filter(u => u.role === 'agent').length,
        active: users.filter(u => u.isActive).length,
      },
      recentActivity: leads
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 10)
        .map(lead => ({
          id: lead.id,
          type: lead.type,
          name: lead.name,
          email: lead.email,
          status: lead.status,
          createdAt: lead.createdAt,
        })),
    };

    // Count leads by status
    leads.forEach(lead => {
      stats.leads.byStatus[lead.status] = (stats.leads.byStatus[lead.status] || 0) + 1;
    });

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('❌ Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get dashboard statistics',
    });
  }
};

// Get all leads (with filters)
export const getAllLeads = async (req, res) => {
  try {
    const { status, type, startDate, endDate, search } = req.query;
    
    let leads = await leadStorage.getAllLeads();

    // Apply filters
    if (status) {
      leads = leads.filter(l => l.status === status);
    }

    if (type) {
      leads = leads.filter(l => l.type === type);
    }

    if (startDate) {
      leads = leads.filter(l => new Date(l.createdAt) >= new Date(startDate));
    }

    if (endDate) {
      leads = leads.filter(l => new Date(l.createdAt) <= new Date(endDate));
    }

    if (search) {
      const searchLower = search.toLowerCase();
      leads = leads.filter(l => 
        l.name.toLowerCase().includes(searchLower) ||
        l.email.toLowerCase().includes(searchLower) ||
        (l.phone && l.phone.includes(search))
      );
    }

    // Sort by most recent first
    leads.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.status(200).json({
      success: true,
      count: leads.length,
      data: leads,
    });
  } catch (error) {
    logger.error('❌ Get all leads error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get leads',
    });
  }
};

// Get single lead
export const getLead = async (req, res) => {
  try {
    const { id } = req.params;
    const lead = await leadStorage.getLeadById(id);

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found',
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
};

// Update lead status
export const updateLeadStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const validStatuses = ['new', 'contacted', 'qualified', 'negotiation', 'won', 'lost'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const lead = await leadStorage.updateLead(id, {
      status,
      notes: notes || lead.notes,
      updatedBy: req.user.email,
      updatedAt: new Date().toISOString(),
    });

    // Sync to Odoo if configured
    try {
      if (process.env.ODOO_URL && lead.odooLeadId) {
        await odooService.updateLeadStatus(lead.odooLeadId, status);
        logger.info(`✅ Lead status synced to Odoo: ${id}`);
      }
    } catch (odooError) {
      logger.error('⚠️ Failed to sync status to Odoo:', odooError);
      // Don't fail the request if Odoo sync fails
    }

    logger.info(`✅ Lead status updated: ${id} -> ${status} by ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Lead status updated successfully',
      data: lead,
    });
  } catch (error) {
    logger.error('❌ Update lead status error:', error);

    if (error.message === 'Lead not found') {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update lead status',
    });
  }
};

// Assign lead to agent
export const assignLead = async (req, res) => {
  try {
    const { id } = req.params;
    const { agentId } = req.body;

    // Verify agent exists and has agent role
    const agent = await userStorage.findById(agentId);
    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found',
      });
    }

    if (agent.role !== 'agent' && agent.role !== 'admin') {
      return res.status(400).json({
        success: false,
        message: 'User is not an agent',
      });
    }

    const lead = await leadStorage.updateLead(id, {
      assignedTo: agentId,
      assignedToName: agent.name,
      assignedAt: new Date().toISOString(),
      updatedBy: req.user.email,
    });

    logger.info(`✅ Lead assigned: ${id} -> ${agent.name} by ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Lead assigned successfully',
      data: lead,
    });
  } catch (error) {
    logger.error('❌ Assign lead error:', error);

    if (error.message === 'Lead not found') {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to assign lead',
    });
  }
};

// Delete lead
export const deleteLead = async (req, res) => {
  try {
    const { id } = req.params;

    await leadStorage.deleteLead(id);

    logger.info(`✅ Lead deleted: ${id} by ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Lead deleted successfully',
    });
  } catch (error) {
    logger.error('❌ Delete lead error:', error);

    if (error.message === 'Lead not found') {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to delete lead',
    });
  }
};

// Export leads to CSV
export const exportLeads = async (req, res) => {
  try {
    const leads = await leadStorage.getAllLeads();

    // Create CSV content
    const headers = ['ID', 'Name', 'Email', 'Phone', 'Type', 'Status', 'Property', 'Created At', 'Assigned To'];
    const rows = leads.map(lead => [
      lead.id,
      lead.name,
      lead.email,
      lead.phone || '',
      lead.type,
      lead.status,
      lead.propertyName || '',
      lead.createdAt,
      lead.assignedToName || '',
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=kejamatch-leads.csv');
    res.status(200).send(csv);

    logger.info(`✅ Leads exported by ${req.user.email}`);
  } catch (error) {
    logger.error('❌ Export leads error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export leads',
    });
  }
};

// Manual Odoo sync
export const syncToOdoo = async (req, res) => {
  try {
    const { leadId } = req.body;

    if (!process.env.ODOO_URL) {
      return res.status(400).json({
        success: false,
        message: 'Odoo integration not configured',
      });
    }

    if (leadId) {
      // Sync single lead
      const lead = await leadStorage.getLeadById(leadId);
      if (!lead) {
        return res.status(404).json({
          success: false,
          message: 'Lead not found',
        });
      }

      const result = await odooService.syncLead(lead);
      
      logger.info(`✅ Lead synced to Odoo: ${leadId} by ${req.user.email}`);

      res.status(200).json({
        success: true,
        message: 'Lead synced to Odoo successfully',
        data: result,
      });
    } else {
      // Sync all unsynced leads
      const leads = await leadStorage.getAllLeads();
      const unsyncedLeads = leads.filter(l => !l.odooLeadId);

      const results = {
        total: unsyncedLeads.length,
        synced: 0,
        failed: 0,
        errors: [],
      };

      for (const lead of unsyncedLeads) {
        try {
          await odooService.syncLead(lead);
          results.synced++;
        } catch (error) {
          results.failed++;
          results.errors.push({
            leadId: lead.id,
            error: error.message,
          });
        }
      }

      logger.info(`✅ Bulk sync completed: ${results.synced}/${results.total} by ${req.user.email}`);

      res.status(200).json({
        success: true,
        message: `Synced ${results.synced} of ${results.total} leads to Odoo`,
        data: results,
      });
    }
  } catch (error) {
    logger.error('❌ Odoo sync error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to sync to Odoo',
      error: error.message,
    });
  }
};

// User management (admin only)
export const getAllUsers = async (req, res) => {
  try {
    const users = await userStorage.getAllUsers();

    res.status(200).json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error) {
    logger.error('❌ Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get users',
    });
  }
};

export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role, isActive } = req.body;

    const updates = {};
    if (name) updates.name = name;
    if (email) updates.email = email;
    if (role) updates.role = role;
    if (isActive !== undefined) updates.isActive = isActive;

    const user = await userStorage.updateUser(id, updates);

    logger.info(`✅ User updated: ${id} by ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: user,
    });
  } catch (error) {
    logger.error('❌ Update user error:', error);

    if (error.message === 'User not found') {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    if (error.message === 'Email already in use') {
      return res.status(409).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update user',
    });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    await userStorage.deleteUser(id);

    logger.info(`✅ User deleted: ${id} by ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    logger.error('❌ Delete user error:', error);

    if (error.message === 'User not found') {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    if (error.message === 'Cannot delete the last admin user') {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to delete user',
    });
  }
};

export default {
  getDashboardStats,
  getAllLeads,
  getLead,
  updateLeadStatus,
  assignLead,
  deleteLead,
  exportLeads,
  syncToOdoo,
  getAllUsers,
  updateUser,
  deleteUser,
};