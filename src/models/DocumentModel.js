import mongoose from 'mongoose';

// Document schema for client uploads
const documentSchema = new mongoose.Schema({
  // Owner Information
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: true,
    index: true
  },

  // Document Details
  fileName: {
    type: String,
    required: true,
    trim: true
  },
  originalName: {
    type: String,
    required: true,
    trim: true
  },
  fileType: {
    type: String,
    required: true,
    enum: ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf', 'image/webp'],
    index: true
  },
  fileSize: {
    type: Number, // in bytes
    required: true
  },
  filePath: {
    type: String,
    required: true
  },

  // Cloudinary fields
  cloudinaryPublicId: {
    type: String,
    default: null
  },
  cloudinaryUrl: {
    type: String,
    default: null
  },

  // Document Category
  category: {
    type: String,
    required: true,
    enum: [
      'national_id',
      'passport',
      'drivers_license',
      'payslip',
      'bank_statement',
      'employment_letter',
      'tax_certificate',
      'utility_bill',
      'other'
    ],
    index: true
  },
  description: {
    type: String,
    default: null,
    trim: true
  },

  // Verification Status
  status: {
    type: String,
    enum: ['pending', 'verified', 'rejected', 'expired'],
    default: 'pending',
    required: true,
    index: true
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  verifiedAt: {
    type: Date,
    default: null
  },
  rejectionReason: {
    type: String,
    default: null
  },

  // Security
  isEncrypted: {
    type: Boolean,
    default: true
  },
  encryptionKey: {
    type: String,
    default: null,
    select: false // Never send to client
  },

  // Access Control
  accessedBy: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    accessedAt: {
      type: Date,
      default: Date.now
    },
    ipAddress: {
      type: String,
      default: null
    }
  }],
  downloadCount: {
    type: Number,
    default: 0
  },

  // Expiry (for time-sensitive documents like payslips)
  expiresAt: {
    type: Date,
    default: null
  },
  isExpired: {
    type: Boolean,
    default: false,
    index: true
  },

  // Metadata
  uploadedFrom: {
    type: String,
    enum: ['web', 'mobile', 'admin'],
    default: 'web'
  },
  ipAddress: {
    type: String,
    default: null
  },

  // Soft delete
  isDeleted: {
    type: Boolean,
    default: false,
    index: true
  },
  deletedAt: {
    type: Date,
    default: null
  },
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
documentSchema.index({ clientId: 1, category: 1 });
documentSchema.index({ status: 1, createdAt: -1 });
documentSchema.index({ clientId: 1, status: 1 });
documentSchema.index({ expiresAt: 1, isExpired: 1 });
documentSchema.index({ isDeleted: 1 });

// Virtual for ID
documentSchema.virtual('id').get(function() {
  return this._id.toString();
});

// Virtual for file size in human-readable format
documentSchema.virtual('fileSizeFormatted').get(function() {
  const bytes = this.fileSize;
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
});

// Virtual for category label
documentSchema.virtual('categoryLabel').get(function() {
  const labels = {
    national_id: 'National ID',
    passport: 'Passport',
    drivers_license: 'Driver\'s License',
    payslip: 'Payslip',
    bank_statement: 'Bank Statement',
    employment_letter: 'Employment Letter',
    tax_certificate: 'Tax Certificate',
    utility_bill: 'Utility Bill',
    other: 'Other Document'
  };
  return labels[this.category] || 'Unknown';
});

// Virtual for status badge
documentSchema.virtual('statusBadge').get(function() {
  const badges = {
    pending: { text: 'Pending Review', color: 'yellow' },
    verified: { text: 'Verified', color: 'green' },
    rejected: { text: 'Rejected', color: 'red' },
    expired: { text: 'Expired', color: 'gray' }
  };
  return badges[this.status] || { text: 'Unknown', color: 'gray' };
});

// Method: Mark as verified
documentSchema.methods.verify = async function(userId) {
  this.status = 'verified';
  this.verifiedBy = userId;
  this.verifiedAt = new Date();
  this.rejectionReason = null;
  await this.save();
  return this;
};

// Method: Reject document
documentSchema.methods.reject = async function(userId, reason) {
  this.status = 'rejected';
  this.verifiedBy = userId;
  this.verifiedAt = new Date();
  this.rejectionReason = reason;
  await this.save();
  return this;
};

// Method: Log access
documentSchema.methods.logAccess = async function(userId, ipAddress) {
  this.accessedBy.push({
    userId,
    accessedAt: new Date(),
    ipAddress
  });
  this.downloadCount++;
  await this.save();
  return this;
};

// Method: Soft delete
documentSchema.methods.softDelete = async function(userId) {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedBy = userId;
  await this.save();
  return this;
};

// Method: Check if expired
documentSchema.methods.checkExpiry = async function() {
  if (this.expiresAt && new Date() > this.expiresAt) {
    this.isExpired = true;
    this.status = 'expired';
    await this.save();
    return true;
  }
  return false;
};

// Static: Find by client
documentSchema.statics.findByClient = function(clientId, includeDeleted = false) {
  const query = { clientId };
  if (!includeDeleted) {
    query.isDeleted = false;
  }
  return this.find(query).sort({ createdAt: -1 });
};

// Static: Find by category
documentSchema.statics.findByCategory = function(category) {
  return this.find({ category, isDeleted: false })
    .populate('clientId', 'name email')
    .sort({ createdAt: -1 });
};

// Static: Find pending verification
documentSchema.statics.findPendingVerification = function() {
  return this.find({ status: 'pending', isDeleted: false })
    .populate('clientId', 'name email')
    .sort({ createdAt: -1 });
};

// Static: Find expired documents
documentSchema.statics.findExpired = function() {
  return this.find({
    expiresAt: { $lte: new Date() },
    isExpired: false,
    isDeleted: false
  });
};

// Static: Get statistics
documentSchema.statics.getStats = async function() {
  const total = await this.countDocuments({ isDeleted: false });
  const pending = await this.countDocuments({ status: 'pending', isDeleted: false });
  const verified = await this.countDocuments({ status: 'verified', isDeleted: false });
  const rejected = await this.countDocuments({ status: 'rejected', isDeleted: false });
  const expired = await this.countDocuments({ isExpired: true, isDeleted: false });

  const byCategory = await this.aggregate([
    { $match: { isDeleted: false } },
    { $group: { _id: '$category', count: { $sum: 1 } } }
  ]);

  return {
    total,
    pending,
    verified,
    rejected,
    expired,
    byCategory: byCategory.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {})
  };
};

// Static: Get client document summary
documentSchema.statics.getClientSummary = async function(clientId) {
  const documents = await this.find({ clientId, isDeleted: false });
  
  const summary = {
    total: documents.length,
    verified: 0,
    pending: 0,
    rejected: 0,
    expired: 0,
    categories: {}
  };

  documents.forEach(doc => {
    summary[doc.status]++;
    if (!summary.categories[doc.category]) {
      summary.categories[doc.category] = 0;
    }
    summary.categories[doc.category]++;
  });

  return summary;
};

// Pre-save: Auto-check expiry
documentSchema.pre('save', async function(next) {
  if (this.expiresAt && new Date() > this.expiresAt && !this.isExpired) {
    this.isExpired = true;
    if (this.status !== 'rejected') {
      this.status = 'expired';
    }
  }
  next();
});

const Document = mongoose.model('Document', documentSchema);

export default Document;