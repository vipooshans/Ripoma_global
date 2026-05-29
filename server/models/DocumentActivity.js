const mongoose = require('mongoose');

const DocumentActivitySchema = new mongoose.Schema({
  document: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true },
  docNumber: { type: String }, // denormalised for fast queries
  action: {
    type: String,
    enum: ['uploaded','downloaded','deleted','restored','version_added','renamed','relinked','shared','viewed'],
    required: true
  },
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  ipAddress: { type: String },
  details: { type: String },
  createdAt: { type: Date, default: Date.now }
});

DocumentActivitySchema.index({ document: 1, createdAt: -1 });
DocumentActivitySchema.index({ action: 1, createdAt: -1 });
DocumentActivitySchema.index({ performedBy: 1, createdAt: -1 });

module.exports = mongoose.model('DocumentActivity', DocumentActivitySchema);
