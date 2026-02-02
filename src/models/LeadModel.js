import mongoose from 'mongoose';

// Activity sub-schema
const activitySchema = new mongoose.Schema({
  type: {
    type: String,
    enum: [
      'lead_created', 'status_change', 'note_added', 'assigned',
      'call_logged', 'email_sent', 'viewing_scheduled', 'viewing_completed',
      'property_interested', 'synced_to_odoo'
    ],
    required: true
  },
  description: {
    type: String,
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  userName: {
    type: String,
    default: null
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

// Viewing sub-schema
const viewingSchema = new mongoose.Schema({
  propertyId: {
    type: String,
    required: true
  },
  propertyName: {
    type: String,
    default: null
  },
  scheduledDate: {
    type: String,
    required: true
  },
  scheduledTime: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['scheduled', 'completed', 'cancelled'],
    default: 'scheduled'
  },
  notes: {
    type: String,
    default: null
  },
  outcome: {
    type: String,
    default: null
  },
  completedNotes: {
    type: String,
    default: null
  },
  completedAt: {
    type: Date,
    default: null
  },
  completedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

// Interested property sub-schema
const interestedPropertySchema = new mongoose.Schema({
  propertyId: {
    type: String,
    required: true
  },
  propertyName: {
    type: String,
    default: null
  },
  notes: {
    type: String,
    default: null
  },
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  addedAt: {
    type: Date,
    default: Date.now
  }
});

// Main Lead schema
const leadSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    index: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    lowercase: true,
    trim: true,
    index: true,
    validate: {
      validator: function(v) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: 'Invalid email format'
    }
  },
  phoneNumber: {
    type: String,
    trim: true,
    default: null
  },
  phone: {
    type: String,
    trim: true,
    default: null
  },
  subject: {
    type: String,
    default: null,
    trim: true
  },
  message: {
    type: String,
    default: null
  },
  status: {
    type: String,
    enum: ['new', 'contacted', 'qualified', 'viewing', 'negotiating', 'won', 'lost'],
    default: 'new',
    required: true,
    index: true
  },
  source: {
    type: String,
    default: 'website_contact_form',
    index: true
  },
  // Odoo CRM integration
  syncedToOdoo: {
    type: Boolean,
    default: false,
    index: true
  },
  odooLeadId: {
    type: String,
    default: null,
    index: true
  },
  syncedAt: {
    type: Date,
    default: null
  },
  // Assignment
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true
  },
  assignedToName: {
    type: String,
    default: null
  },
  assignedAt: {
    type: Date,
    default: null
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  // Communication tracking
  lastContactedAt: {
    type: Date,
    default: null
  },
  lastNote: {
    type: String,
    default: null
  },
  // Sub-documents
  activities: [activitySchema],
  viewings: [viewingSchema],
  interestedProperties: [interestedPropertySchema]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
leadSchema.index({ email: 1, createdAt: -1 });
leadSchema.index({ status: 1, createdAt: -1 });
leadSchema.index({ assignedTo: 1, status: 1 });
leadSchema.index({ syncedToOdoo: 1, createdAt: -1 });
leadSchema.index({ source: 1, createdAt: -1 });
leadSchema.index({ createdAt: -1 });

// Virtual for assigned agent details
leadSchema.virtual('assignedAgent', {
  ref: 'User',
  localField: 'assignedTo',
  foreignField: '_id',
  justOne: true
});

// Methods

// Add activity
leadSchema.methods.addActivity = function(type, description, userId = null, userName = null, metadata = {}) {
  this.activities.unshift({
    type,
    description,
    userId,
    userName,
    metadata
  });
  return this.activities[0];
};

// Change status
leadSchema.methods.changeStatus = async function(newStatus, userId = null, userName = null) {
  const oldStatus = this.status;
  this.status = newStatus;
  
  this.addActivity(
    'status_change',
    `Status changed from "${oldStatus}" to "${newStatus}"`,
    userId,
    userName,
    { oldStatus, newStatus }
  );
  
  await this.save();
  return this;
};

// Assign to agent
leadSchema.methods.assignToAgent = async function(agentId, assignedBy, assignedByName = null, agentName = null) {
  const previousAgent = this.assignedTo;
  this.assignedTo = agentId;
  this.assignedToName = agentName;
  this.assignedAt = new Date();
  this.assignedBy = assignedBy;
  
  const description = previousAgent 
    ? `Lead reassigned to ${agentName || 'agent'}`
    : `Lead assigned to ${agentName || 'agent'}`;
  
  this.addActivity('assigned', description, assignedBy, assignedByName || 'Admin', {
    agentId,
    agentName,
    previousAgent
  });
  
  await this.save();
  return this;
};

// Add note
leadSchema.methods.addNote = async function(note, userId, userName) {
  this.addActivity('note_added', note, userId, userName, { note });
  this.lastNote = note;
  await this.save();
  return this;
};

// Log call
leadSchema.methods.logCall = async function(callData, userId, userName) {
  const { outcome, duration, notes } = callData;
  const description = `Call logged: ${outcome}${duration ? ` (${duration} mins)` : ''}${notes ? ` - ${notes}` : ''}`;
  
  this.addActivity('call_logged', description, userId, userName, { outcome, duration, notes });
  this.lastContactedAt = new Date();
  await this.save();
  return this;
};

// Log email
leadSchema.methods.logEmail = async function(emailData, userId, userName) {
  const { subject, type } = emailData;
  const description = `Email sent: ${subject || type || 'Follow-up'}`;
  
  this.addActivity('email_sent', description, userId, userName, emailData);
  this.lastContactedAt = new Date();
  await this.save();
  return this;
};

// Schedule viewing
leadSchema.methods.scheduleViewing = async function(viewingData, userId, userName) {
  const { propertyId, propertyName, scheduledDate, scheduledTime, notes } = viewingData;
  
  const viewing = {
    propertyId,
    propertyName,
    scheduledDate,
    scheduledTime,
    notes,
    status: 'scheduled',
    createdBy: userId
  };
  
  this.viewings.push(viewing);
  
  const description = `Viewing scheduled for ${propertyName || 'property'} on ${scheduledDate} at ${scheduledTime}`;
  this.addActivity('viewing_scheduled', description, userId, userName, { viewing });
  
  await this.save();
  return this.viewings[this.viewings.length - 1];
};

// Complete viewing
leadSchema.methods.completeViewing = async function(viewingId, outcome, notes, userId, userName) {
  const viewing = this.viewings.id(viewingId);
  if (!viewing) {
    throw new Error('Viewing not found');
  }
  
  viewing.status = 'completed';
  viewing.outcome = outcome;
  viewing.completedNotes = notes;
  viewing.completedAt = new Date();
  viewing.completedBy = userId;
  
  const description = `Viewing completed for ${viewing.propertyName || 'property'}: ${outcome}${notes ? ` - ${notes}` : ''}`;
  this.addActivity('viewing_completed', description, userId, userName, { viewingId, outcome, notes });
  
  await this.save();
  return viewing;
};

// Add property interest
leadSchema.methods.addPropertyInterest = async function(propertyData, userId, userName) {
  const { propertyId, propertyName, notes } = propertyData;
  
  const exists = this.interestedProperties.find(p => p.propertyId === propertyId);
  if (!exists) {
    this.interestedProperties.push({
      propertyId,
      propertyName,
      notes,
      addedBy: userId
    });
  }
  
  this.addActivity(
    'property_interested',
    `Interested in property: ${propertyName || propertyId}`,
    userId,
    userName,
    { propertyId, propertyName, notes }
  );
  
  await this.save();
  return this;
};

// Mark as synced to Odoo
leadSchema.methods.markAsSynced = async function(odooLeadId) {
  this.syncedToOdoo = true;
  this.odooLeadId = odooLeadId;
  this.syncedAt = new Date();
  
  this.addActivity('synced_to_odoo', 'Lead synced to Odoo CRM', null, 'System', { odooLeadId });
  
  await this.save();
  return this;
};

// Static methods

// Get leads by status
leadSchema.statics.findByStatus = function(status) {
  return this.find({ status }).sort({ createdAt: -1 });
};

// Get leads by agent
leadSchema.statics.findByAgent = function(agentId) {
  return this.find({ assignedTo: agentId }).sort({ createdAt: -1 });
};

// Get unsynced leads
leadSchema.statics.findUnsynced = function() {
  return this.find({ syncedToOdoo: false }).sort({ createdAt: -1 });
};

// Get statistics
leadSchema.statics.getStats = async function() {
  const total = await this.countDocuments();
  const statuses = await this.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);
  
  const stats = {
    total,
    new: 0,
    contacted: 0,
    qualified: 0,
    viewing: 0,
    negotiating: 0,
    won: 0,
    lost: 0
  };
  
  statuses.forEach(s => {
    stats[s._id] = s.count;
  });
  
  stats.syncedToOdoo = await this.countDocuments({ syncedToOdoo: true });
  stats.unsyncedToOdoo = await this.countDocuments({ syncedToOdoo: false });
  
  return stats;
};

const Lead = mongoose.model('Lead', leadSchema);

export default Lead;