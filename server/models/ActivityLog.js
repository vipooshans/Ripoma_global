const mongoose = require('mongoose');

const ActivityLogSchema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    actorName: { type: String }, // denormalised for historical accuracy
    actorRole: { type: String },
    action: { type: String, required: true }, // e.g. 'created', 'updated', 'deleted', 'approved', 'dispatched'
    module: {
      type: String,
      enum: [
        'users', 'inventory', 'suppliers', 'customers', 'import_orders', 'export_orders',
        'shipments', 'documents', 'finance', 'reports', 'notifications', 'system'
      ],
      required: true
    },
    entityType: { type: String },
    entityId: { type: mongoose.Schema.Types.ObjectId },
    entityRef: { type: String },
    description: { type: String }, // human-readable summary
    metadata: { type: Map, of: mongoose.Schema.Types.Mixed }, // before/after values for update events
    ipAddress: { type: String },
    userAgent: { type: String },
    createdAt: { type: Date, default: Date.now } // immutable — no updatedAt
  }
);

// Indexes for historical queries
ActivityLogSchema.index({ module: 1, action: 1 });
ActivityLogSchema.index({ actor: 1 });
ActivityLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('ActivityLog', ActivityLogSchema);
