import { userStorage } from '../services/userStorageMongo.js';
import LeadStorage from '../services/leadStorageMongo.js';
import logger from '../utils/logger.js';

// Get dashboard statistics
export const getDashboardStats = async (req, res) => {
  try {
    const [users, leadsResponse] = await Promise.all([
      userStorage.getAllUsers(),
      LeadStorage.getAllLeads(),
    ]);

    const leads = leadsResponse?.leads || [];
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const stats = {
      users: {
        total: users.length,
        admins: users.filter(u => u.role === 'admin').length,
        agents: users.filter(u => u.role === 'agent').length,
        verified: users.filter(u => u.isVerified).length,
        unverified: users.filter(u => !u.isVerified).length,
      },
      leads: {
        total: leads.length,
        today: leads.filter(l => new Date(l.createdAt) >= today).length,
        thisWeek: leads.filter(l => new Date(l.createdAt) >= weekAgo).length,
        byStatus: {
          new: leads.filter(l => l.status === 'new').length,
          contacted: leads.filter(l => l.status === 'contacted').length,
          qualified: leads.filter(l => l.status === 'qualified').length,
          viewing: leads.filter(l => l.status === 'viewing').length,
          negotiating: leads.filter(l => l.status === 'negotiating').length,
          won: leads.filter(l => l.status === 'won').length,
          lost: leads.filter(l => l.status === 'lost').length,
        },
      },
      recentActivity: leads
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5),
    };

    res.status(200).json({ success: true, data: stats });
  } catch (error) {
    logger.error('❌ Get dashboard stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to get dashboard statistics' });
  }
};

// Get all leads
export const getAllLeads = async (req, res) => {
  try {
    const leadsResponse = await LeadStorage.getAllLeads();
    res.status(200).json({ success: true, data: leadsResponse?.leads || [] });
  } catch (error) {
    logger.error('❌ Get all leads error:', error);
    res.status(500).json({ success: false, message: 'Failed to get leads' });
  }
};

// Get single lead with activities
export const getLead = async (req, res) => {
  try {
    const { id } = req.params;
    const lead = await LeadStorage.findById(id);

    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    res.status(200).json({ success: true, data: lead });
  } catch (error) {
    logger.error('❌ Get lead error:', error);
    res.status(500).json({ success: false, message: 'Failed to get lead' });
  }
};

// Get lead activities
export const getLeadActivities = async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 50 } = req.query;
    
    const result = await LeadStorage.getLeadActivities(id, parseInt(limit));
    
    if (!result.success) {
      return res.status(404).json({ success: false, message: result.error });
    }

    res.status(200).json({ success: true, data: result.activities });
  } catch (error) {
    logger.error('❌ Get lead activities error:', error);
    res.status(500).json({ success: false, message: 'Failed to get activities' });
  }
};

// Update lead status with activity tracking
export const updateLeadStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['new', 'contacted', 'qualified', 'viewing', 'negotiating', 'won', 'lost'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const result = await LeadStorage.updateLeadStatus(id, status, req.user.id, req.user.name);
    
    if (!result.success) {
      return res.status(404).json({ success: false, message: result.error || 'Lead not found' });
    }

    logger.info(`✅ Lead status updated: ${id} -> ${status} by ${req.user.email}`);
    res.status(200).json({ success: true, message: 'Lead status updated successfully', data: result.lead });
  } catch (error) {
    logger.error('❌ Update lead status error:', error);
    res.status(500).json({ success: false, message: 'Failed to update lead status' });
  }
};

// Assign lead to agent with activity tracking
export const assignLead = async (req, res) => {
  try {
    const { id } = req.params;
    const { agentId } = req.body;

    const agent = await userStorage.findById(agentId);
    if (!agent) {
      return res.status(404).json({ success: false, message: 'Agent not found' });
    }

    const result = await LeadStorage.assignLead(id, agentId, req.user.id, req.user.name, agent.name);
    
    if (!result.success) {
      return res.status(404).json({ success: false, message: result.error || 'Lead not found' });
    }

    logger.info(`✅ Lead assigned: ${id} -> Agent: ${agent.email} by ${req.user.email}`);
    res.status(200).json({ success: true, message: `Lead assigned to ${agent.name}`, data: result.lead });
  } catch (error) {
    logger.error('❌ Assign lead error:', error);
    res.status(500).json({ success: false, message: 'Failed to assign lead' });
  }
};

// Add note to lead
export const addLeadNote = async (req, res) => {
  try {
    const { id } = req.params;
    const { note } = req.body;

    if (!note || note.trim() === '') {
      return res.status(400).json({ success: false, message: 'Note is required' });
    }

    const result = await LeadStorage.addNote(id, note.trim(), req.user.id, req.user.name);
    
    if (!result.success) {
      return res.status(404).json({ success: false, message: result.error || 'Lead not found' });
    }

    logger.info(`✅ Note added to lead: ${id} by ${req.user.email}`);
    res.status(200).json({ success: true, message: 'Note added successfully', data: result.lead });
  } catch (error) {
    logger.error('❌ Add note error:', error);
    res.status(500).json({ success: false, message: 'Failed to add note' });
  }
};

// Log a call
export const logLeadCall = async (req, res) => {
  try {
    const { id } = req.params;
    const { outcome, duration, notes } = req.body;

    if (!outcome) {
      return res.status(400).json({ success: false, message: 'Call outcome is required' });
    }

    const result = await LeadStorage.logCall(id, { outcome, duration, notes }, req.user.id, req.user.name);
    
    if (!result.success) {
      return res.status(404).json({ success: false, message: result.error || 'Lead not found' });
    }

    logger.info(`✅ Call logged for lead: ${id} by ${req.user.email}`);
    res.status(200).json({ success: true, message: 'Call logged successfully', data: result.lead });
  } catch (error) {
    logger.error('❌ Log call error:', error);
    res.status(500).json({ success: false, message: 'Failed to log call' });
  }
};

// Log an email
export const logLeadEmail = async (req, res) => {
  try {
    const { id } = req.params;
    const { subject, type, notes } = req.body;

    const result = await LeadStorage.logEmail(id, { subject, type, notes }, req.user.id, req.user.name);
    
    if (!result.success) {
      return res.status(404).json({ success: false, message: result.error || 'Lead not found' });
    }

    logger.info(`✅ Email logged for lead: ${id} by ${req.user.email}`);
    res.status(200).json({ success: true, message: 'Email logged successfully', data: result.lead });
  } catch (error) {
    logger.error('❌ Log email error:', error);
    res.status(500).json({ success: false, message: 'Failed to log email' });
  }
};

// Schedule a viewing
export const scheduleViewing = async (req, res) => {
  try {
    const { id } = req.params;
    const { propertyId, propertyName, scheduledDate, scheduledTime, notes } = req.body;

    if (!scheduledDate || !scheduledTime) {
      return res.status(400).json({ success: false, message: 'Date and time are required' });
    }

    const result = await LeadStorage.scheduleViewing(
      id, 
      { propertyId, propertyName, scheduledDate, scheduledTime, notes }, 
      req.user.id, 
      req.user.name
    );
    
    if (!result.success) {
      return res.status(404).json({ success: false, message: result.error || 'Lead not found' });
    }

    logger.info(`✅ Viewing scheduled for lead: ${id} by ${req.user.email}`);
    res.status(200).json({ success: true, message: 'Viewing scheduled successfully', data: result.lead, viewing: result.viewing });
  } catch (error) {
    logger.error('❌ Schedule viewing error:', error);
    res.status(500).json({ success: false, message: 'Failed to schedule viewing' });
  }
};

// Complete a viewing
export const completeViewing = async (req, res) => {
  try {
    const { id, viewingId } = req.params;
    const { outcome, notes } = req.body;

    if (!outcome) {
      return res.status(400).json({ success: false, message: 'Outcome is required' });
    }

    const result = await LeadStorage.completeViewing(id, viewingId, outcome, notes, req.user.id, req.user.name);
    
    if (!result.success) {
      return res.status(404).json({ success: false, message: result.error });
    }

    logger.info(`✅ Viewing completed for lead: ${id} by ${req.user.email}`);
    res.status(200).json({ success: true, message: 'Viewing completed successfully', data: result.lead });
  } catch (error) {
    logger.error('❌ Complete viewing error:', error);
    res.status(500).json({ success: false, message: 'Failed to complete viewing' });
  }
};

// Add property interest
export const addPropertyInterest = async (req, res) => {
  try {
    const { id } = req.params;
    const { propertyId, propertyName, notes } = req.body;

    if (!propertyId && !propertyName) {
      return res.status(400).json({ success: false, message: 'Property information is required' });
    }

    const result = await LeadStorage.addPropertyInterest(
      id, 
      { propertyId, propertyName, notes }, 
      req.user.id, 
      req.user.name
    );
    
    if (!result.success) {
      return res.status(404).json({ success: false, message: result.error || 'Lead not found' });
    }

    logger.info(`✅ Property interest added for lead: ${id} by ${req.user.email}`);
    res.status(200).json({ success: true, message: 'Property interest added', data: result.lead });
  } catch (error) {
    logger.error('❌ Add property interest error:', error);
    res.status(500).json({ success: false, message: 'Failed to add property interest' });
  }
};

// Delete lead
export const deleteLead = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await LeadStorage.deleteLead(id);
    
    if (!result.success) {
      return res.status(404).json({ success: false, message: result.error || 'Lead not found' });
    }

    logger.info(`✅ Lead deleted: ${id}`);
    res.status(200).json({ success: true, message: 'Lead deleted successfully' });
  } catch (error) {
    logger.error('❌ Delete lead error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete lead' });
  }
};

// Export leads to CSV
export const exportLeads = async (req, res) => {
  try {
    const result = await LeadStorage.exportToCSV();
    
    if (!result.success) {
      return res.status(400).json({ success: false, message: result.error });
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=kejamatch-leads-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(result.csv);
  } catch (error) {
    logger.error('❌ Export leads error:', error);
    res.status(500).json({ success: false, message: 'Failed to export leads' });
  }
};

// =====================
// USER MANAGEMENT
// =====================

export const getAllUsers = async (req, res) => {
  try {
    const users = await userStorage.getAllUsers();
    res.status(200).json({ success: true, data: users });
  } catch (error) {
    logger.error('❌ Get all users error:', error);
    res.status(500).json({ success: false, message: 'Failed to get users' });
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
    if (typeof isActive === 'boolean') updates.isActive = isActive;

    const user = await userStorage.updateUser(id, updates);
    logger.info(`✅ User updated: ${user.email}`);
    res.status(200).json({ success: true, message: 'User updated successfully', data: user });
  } catch (error) {
    logger.error('❌ Update user error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to update user' });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (id === req.user.id) {
      return res.status(400).json({ success: false, message: 'Cannot delete your own account' });
    }

    await userStorage.deleteUser(id);
    logger.info(`✅ User deleted: ${id}`);
    res.status(200).json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    logger.error('❌ Delete user error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to delete user' });
  }
};

export const verifyUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await userStorage.manuallyVerifyUser(id);
    logger.info(`✅ User manually verified by admin: ${user.email}`);
    res.status(200).json({ success: true, message: `${user.name} has been verified successfully`, data: user });
  } catch (error) {
    logger.error('❌ Manual verify user error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to verify user' });
  }
};

export const getUnverifiedUsers = async (req, res) => {
  try {
    const users = await userStorage.getUnverifiedUsers();
    res.status(200).json({ success: true, data: users });
  } catch (error) {
    logger.error('❌ Get unverified users error:', error);
    res.status(500).json({ success: false, message: 'Failed to get unverified users' });
  }
};

export default {
  getDashboardStats, getAllLeads, getLead, getLeadActivities,
  updateLeadStatus, assignLead, addLeadNote, logLeadCall, logLeadEmail,
  scheduleViewing, completeViewing, addPropertyInterest, deleteLead, exportLeads,
  getAllUsers, updateUser, deleteUser, verifyUser, getUnverifiedUsers,
};