const mongoose = require('mongoose');

const ReportExportSchema = new mongoose.Schema(
  {
    reportDefinition: { type: mongoose.Schema.Types.ObjectId, ref: 'ReportDefinition', default: null },
    scheduledReport: { type: mongoose.Schema.Types.ObjectId, ref: 'ScheduledReport', default: null },
    name: { type: String, required: true },
    type: { 
      type: String, 
      enum: ['sales', 'shipment', 'financial', 'inventory', 'supplier', 'customer', 'custom', 'analytics'],
      required: true
    },
    format: { type: String, enum: ['csv', 'xlsx', 'pdf'], required: true },
    status: { type: String, enum: ['generating', 'ready', 'failed'], default: 'generating' },
    
    fileUrl: { type: String }, // Temporary download link (presigned URL)
    storageKey: { type: String }, // Permanent file path in S3 or local adapter
    fileSizeBytes: { type: Number },
    rowCount: { type: Number },
    
    generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    generatedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date } // Presigned link expiry timestamp (normally 72 hours from generation)
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('ReportExport', ReportExportSchema);
