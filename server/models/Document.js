const mongoose = require('mongoose');

const LinkedEntitySchema = new mongoose.Schema({
  entityType: {
    type: String,
    enum: ['ImportOrder','ExportOrder','Shipment','Invoice','Supplier','Customer','Product','GoodsReceipt','Dispatch'],
    required: true
  },
  entityId: { type: mongoose.Schema.Types.ObjectId, required: true },
  entityRef: { type: String } // denormalised e.g. "PO-2025-00042"
}, { _id: false });

const PreviousVersionSchema = new mongoose.Schema({
  version: { type: Number, required: true },
  storageKey: { type: String, required: true },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  uploadedAt: { type: Date, default: Date.now },
  changeNote: { type: String }
}, { _id: false });

const DocumentSchema = new mongoose.Schema({
  docNumber: { type: String, unique: true },

  name: { type: String, required: true, trim: true },
  originalFilename: { type: String, required: true },
  mimeType: { type: String, required: true },
  extension: { type: String },
  sizeBytes: { type: Number, default: 0 },

  category: {
    type: String,
    enum: [
      'commercial_invoice','proforma_invoice','packing_list','bill_of_lading','airway_bill',
      'certificate_of_origin','customs_declaration','insurance','delivery_receipt',
      'purchase_order','sales_order','goods_receipt','supplier_contract','customer_contract',
      'bank_document','tax_document','product_certificate','quality_report',
      'warehouse_receipt','other'
    ],
    default: 'other'
  },

  tags: [{ type: String }],
  description: { type: String },
  language: { type: String, default: 'en' },
  isConfidential: { type: Boolean, default: false },
  isDeleted: { type: Boolean, default: false },

  storageKey: { type: String, required: true },
  storageUrl: { type: String },
  thumbnailKey: { type: String },

  linkedEntities: [LinkedEntitySchema],

  // Version control
  version: { type: Number, default: 1 },
  isLatestVersion: { type: Boolean, default: true },
  previousVersions: [PreviousVersionSchema],

  // Expiry / compliance
  issueDate: { type: Date },
  expiryDate: { type: Date },
  isExpired: { type: Boolean, default: false },
  expiryAlertSent: { type: Boolean, default: false },

  // Access tracking
  downloadCount: { type: Number, default: 0 },
  lastDownloadedAt: { type: Date },
  lastDownloadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  uploadedAt: { type: Date, default: Date.now }
}, {
  timestamps: { createdAt: 'uploadedAt', updatedAt: 'updatedAt' }
});

// Indexes for common queries
DocumentSchema.index({ category: 1, isDeleted: 1 });
DocumentSchema.index({ expiryDate: 1, isExpired: 1 });
DocumentSchema.index({ 'linkedEntities.entityType': 1, 'linkedEntities.entityId': 1 });
DocumentSchema.index({ name: 'text', originalFilename: 'text', description: 'text', tags: 'text' });

module.exports = mongoose.model('Document', DocumentSchema);
