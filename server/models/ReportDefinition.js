const mongoose = require('mongoose');

const ReportDefinitionSchema = new mongoose.Schema(
  {
    reportId: { type: String, unique: true }, // e.g. RPT-2026-00012
    name: { type: String, required: true },
    description: { type: String },
    type: { 
      type: String, 
      enum: ['sales', 'shipment', 'financial', 'inventory', 'supplier', 'customer', 'custom'], 
      required: true 
    },
    
    config: {
      dateRangePreset: { 
        type: String, 
        enum: ['last_7d', 'last_30d', 'last_90d', 'this_month', 'this_quarter', 'this_year', 'custom'],
        default: 'last_30d'
      },
      dateFrom: { type: Date },
      dateTo: { type: Date },
      groupBy: { type: String }, // e.g. 'month', 'customer', 'product', 'country'
      filters: { type: Map, of: mongoose.Schema.Types.Mixed }, // Arbitrary filter criteria
      columns: [{ type: String }], // Array of keys to export / display
      sortBy: { type: String },
      sortOrder: { type: String, enum: ['asc', 'desc'], default: 'desc' },
      limit: { type: Number, default: 100 }
    },

    isShared: { type: Boolean, default: false },
    isFavourite: { type: Boolean, default: false },
    lastRunAt: { type: Date },
    lastRunBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('ReportDefinition', ReportDefinitionSchema);
