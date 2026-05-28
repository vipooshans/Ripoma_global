const mongoose = require('mongoose');

const CommunicationLogSchema = new mongoose.Schema({
  entityType: {
    type: String,
    enum: ['supplier', 'customer'],
    required: true,
    index: true
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['email', 'call', 'meeting', 'note', 'whatsapp', 'other'],
    required: true
  },
  direction: {
    type: String,
    enum: ['inbound', 'outbound', 'internal'],
    default: 'outbound'
  },
  subject: { type: String, trim: true },
  body: { type: String },
  attachments: [{
    name: { type: String },
    url: { type: String }
  }],
  followUpDate: { type: Date },
  followUpDone: { type: Boolean, default: false },
  loggedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

CommunicationLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });

module.exports = mongoose.model('CommunicationLog', CommunicationLogSchema);
