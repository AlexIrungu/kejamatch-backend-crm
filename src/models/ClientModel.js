import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

// Client schema - separate from Leads, represents registered portal users
const clientSchema = new mongoose.Schema({
  // Basic Information
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
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
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false
  },
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [100, 'Name must not exceed 100 characters']
  },
  phone: {
    type: String,
    trim: true,
    default: null
  },

  // Account Status
  status: {
    type: String,
    enum: ['pending_approval', 'approved', 'rejected', 'suspended'],
    default: 'pending_approval',
    required: true,
    index: true
  },
  isVerified: {
    type: Boolean,
    default: false,
    index: true
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },

  // Approval Workflow
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  approvedAt: {
    type: Date,
    default: null
  },
  rejectionReason: {
    type: String,
    default: null
  },

  // Email Verification
  verificationCode: {
    type: String,
    default: null,
    select: false
  },
  verificationCodeExpiry: {
    type: Date,
    default: null,
    select: false
  },
  verificationAttempts: {
    type: Number,
    default: 0,
    select: false
  },

  // Two-Factor Authentication for Documents
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  twoFactorSecret: {
    type: String,
    default: null,
    select: false
  },
  twoFactorCode: {
    type: String,
    default: null,
    select: false
  },
  twoFactorCodeExpiry: {
    type: Date,
    default: null,
    select: false
  },

  // Profile Information
  avatar: {
    type: String,
    default: null
  },
  dateOfBirth: {
    type: Date,
    default: null
  },
  nationalId: {
    type: String,
    default: null,
    select: false // Sensitive data
  },
  occupation: {
    type: String,
    default: null
  },
  employerName: {
    type: String,
    default: null
  },
  monthlyIncome: {
    type: Number,
    default: null,
    select: false // Sensitive data
  },

  // Address
  address: {
    street: { type: String, default: null },
    city: { type: String, default: null },
    county: { type: String, default: null },
    postalCode: { type: String, default: null }
  },

  // Preferences
  propertyPreferences: {
    type: {
      type: String,
      enum: ['Rent', 'Buy', 'Both'],
      default: 'Both'
    },
    category: [{
      type: String,
      enum: ['houses', 'apartments', 'land', 'commercial']
    }],
    minBudget: { type: Number, default: null },
    maxBudget: { type: Number, default: null },
    preferredLocations: [{ type: String }],
    bedrooms: { type: Number, default: null },
    bathrooms: { type: Number, default: null }
  },

  // Linked Lead (if they came from contact form)
  linkedLeadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lead',
    default: null,
    index: true
  },

  // Assigned Agent
  assignedAgent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true
  },

  // Activity Tracking
  lastLogin: {
    type: Date,
    default: null
  },
  loginCount: {
    type: Number,
    default: 0
  },
  lastPasswordChange: {
    type: Date,
    default: null
  },

  // GDPR & Privacy
  consentToDataProcessing: {
    type: Boolean,
    default: true,
    required: true
  },
  consentToMarketing: {
    type: Boolean,
    default: false
  },
  dataExportRequested: {
    type: Boolean,
    default: false
  },
  dataExportRequestedAt: {
    type: Date,
    default: null
  },
  deletionRequested: {
    type: Boolean,
    default: false
  },
  deletionRequestedAt: {
    type: Date,
    default: null
  }

}, {
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.verificationCode;
      delete ret.verificationCodeExpiry;
      delete ret.verificationAttempts;
      delete ret.twoFactorSecret;
      delete ret.twoFactorCode;
      delete ret.twoFactorCodeExpiry;
      delete ret.nationalId;
      delete ret.monthlyIncome;
      delete ret.__v;
      return ret;
    }
  },
  toObject: { virtuals: true }
});

// Indexes
clientSchema.index({ email: 1, status: 1 });
clientSchema.index({ status: 1, createdAt: -1 });
clientSchema.index({ assignedAgent: 1, status: 1 });
clientSchema.index({ linkedLeadId: 1 });

// Virtual for full name
clientSchema.virtual('id').get(function() {
  return this._id.toString();
});

// Virtual for status badge
clientSchema.virtual('statusBadge').get(function() {
  const badges = {
    pending_approval: { text: 'Pending Approval', color: 'yellow' },
    approved: { text: 'Approved', color: 'green' },
    rejected: { text: 'Rejected', color: 'red' },
    suspended: { text: 'Suspended', color: 'gray' }
  };
  return badges[this.status] || { text: 'Unknown', color: 'gray' };
});

// Pre-save hook: Hash password
clientSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }

  this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
  this.lastPasswordChange = new Date();
  next();
});

// Method: Compare passwords
clientSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    const client = await this.constructor.findById(this._id).select('+password');
    if (!client || !client.password) {
      return false;
    }
    return await bcrypt.compare(candidatePassword, client.password);
  } catch (error) {
    console.error('Password comparison error:', error);
    return false;
  }
};

// Method: Generate verification code
clientSchema.methods.generateVerificationCode = function() {
  this.verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
  this.verificationCodeExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  this.verificationAttempts = 0;
  return this.verificationCode;
};

// Method: Verify email code
clientSchema.methods.verifyCode = function(code) {
  if (!this.verificationCode || !this.verificationCodeExpiry) {
    return { valid: false, error: 'No verification code found' };
  }

  if (new Date() > new Date(this.verificationCodeExpiry)) {
    return { valid: false, error: 'Verification code has expired' };
  }

  if (this.verificationAttempts >= 5) {
    return { valid: false, error: 'Too many attempts. Please request a new code.' };
  }

  this.verificationAttempts++;

  if (this.verificationCode !== code) {
    return { valid: false, error: 'Invalid verification code' };
  }

  // Code is valid
  this.isVerified = true;
  this.verificationCode = null;
  this.verificationCodeExpiry = null;
  this.verificationAttempts = 0;

  return { valid: true };
};

// Method: Generate 2FA code for document access
clientSchema.methods.generate2FACode = function() {
  this.twoFactorCode = Math.floor(100000 + Math.random() * 900000).toString();
  this.twoFactorCodeExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
  return this.twoFactorCode;
};

// Method: Verify 2FA code
clientSchema.methods.verify2FACode = function(code) {
  if (!this.twoFactorCode || !this.twoFactorCodeExpiry) {
    return false;
  }

  if (new Date() > new Date(this.twoFactorCodeExpiry)) {
    return false;
  }

  if (this.twoFactorCode !== code) {
    return false;
  }

  // Clear 2FA code after successful verification
  this.twoFactorCode = null;
  this.twoFactorCodeExpiry = null;

  return true;
};

// Method: Update last login
clientSchema.methods.updateLastLogin = async function() {
  this.lastLogin = new Date();
  this.loginCount = (this.loginCount || 0) + 1;
  await this.save();
};

// Method: Approve client
clientSchema.methods.approve = async function(adminId) {
  this.status = 'approved';
  this.approvedBy = adminId;
  this.approvedAt = new Date();
  this.rejectionReason = null;
  await this.save();
  return this;
};

// Method: Reject client
clientSchema.methods.reject = async function(adminId, reason) {
  this.status = 'rejected';
  this.approvedBy = adminId;
  this.approvedAt = new Date();
  this.rejectionReason = reason;
  await this.save();
  return this;
};

// Method: Suspend client
clientSchema.methods.suspend = async function() {
  this.status = 'suspended';
  this.isActive = false;
  await this.save();
  return this;
};

// Method: Request data export (GDPR)
clientSchema.methods.requestDataExport = async function() {
  this.dataExportRequested = true;
  this.dataExportRequestedAt = new Date();
  await this.save();
  return this;
};

// Method: Request account deletion (GDPR)
clientSchema.methods.requestDeletion = async function() {
  this.deletionRequested = true;
  this.deletionRequestedAt = new Date();
  await this.save();
  return this;
};

// Method: Get safe JSON (without sensitive data)
clientSchema.methods.toSafeJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.verificationCode;
  delete obj.verificationCodeExpiry;
  delete obj.verificationAttempts;
  delete obj.twoFactorSecret;
  delete obj.twoFactorCode;
  delete obj.twoFactorCodeExpiry;
  delete obj.nationalId;
  delete obj.monthlyIncome;
  delete obj.__v;
  return obj;
};

// Static: Find pending approvals
clientSchema.statics.findPendingApprovals = function() {
  return this.find({ status: 'pending_approval' })
    .sort({ createdAt: -1 });
};

// Static: Find approved clients
clientSchema.statics.findApproved = function() {
  return this.find({ status: 'approved', isActive: true })
    .sort({ createdAt: -1 });
};

// Static: Find by agent
clientSchema.statics.findByAgent = function(agentId) {
  return this.find({ assignedAgent: agentId, status: 'approved' })
    .sort({ createdAt: -1 });
};

// Static: Get statistics
clientSchema.statics.getStats = async function() {
  const total = await this.countDocuments();
  const pending = await this.countDocuments({ status: 'pending_approval' });
  const approved = await this.countDocuments({ status: 'approved' });
  const rejected = await this.countDocuments({ status: 'rejected' });
  const suspended = await this.countDocuments({ status: 'suspended' });
  const verified = await this.countDocuments({ isVerified: true });

  return {
    total,
    pending,
    approved,
    rejected,
    suspended,
    verified,
    unverified: total - verified
  };
};

const Client = mongoose.model('Client', clientSchema);

export default Client;