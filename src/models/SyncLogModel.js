import mongoose from 'mongoose';

const syncLogSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['odoo_pull', 'odoo_push', 'full_sync'],
    required: true
  },
  startedAt: {
    type: Date,
    required: true,
    default: Date.now
  },
  completedAt: {
    type: Date,
    default: null
  },
  status: {
    type: String,
    enum: ['running', 'completed', 'failed'],
    default: 'running'
  },
  summary: {
    totalProcessed: { type: Number, default: 0 },
    created: { type: Number, default: 0 },
    updated: { type: Number, default: 0 },
    skipped: { type: Number, default: 0 },
    failed: { type: Number, default: 0 }
  },
  errors: [{
    leadId: String,
    message: String,
    timestamp: { type: Date, default: Date.now }
  }],
  triggeredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true
});

syncLogSchema.index({ type: 1, startedAt: -1 });
syncLogSchema.index({ status: 1 });

const SyncLog = mongoose.model('SyncLog', syncLogSchema);

export default SyncLog;
