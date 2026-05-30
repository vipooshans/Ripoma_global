const mongoose = require('mongoose');

const ScheduledReportSchema = new mongoose.Schema(
  {
    reportDefinition: { type: mongoose.Schema.Types.ObjectId, ref: 'ReportDefinition', required: true },
    name: { type: String, required: true },
    frequency: { 
      type: String, 
      enum: ['daily', 'weekly', 'monthly', 'quarterly'], 
      required: true 
    },
    dayOfWeek: { type: Number }, // 0-6 (0=Sunday, for weekly)
    dayOfMonth: { type: Number }, // 1-28 (for monthly/quarterly)
    time: { type: String, default: '07:00' }, // HH:MM
    timezone: { type: String, default: 'UTC' },
    format: { type: String, enum: ['csv', 'xlsx', 'pdf'], default: 'xlsx' },

    recipients: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        email: { type: String } // Allows custom external emails
      }
    ],

    isActive: { type: Boolean, default: true },
    lastRunAt: { type: Date },
    nextRunAt: { type: Date },
    lastRunStatus: { type: String, enum: ['success', 'failed', 'pending'], default: 'pending' },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('ScheduledReport', ScheduledReportSchema);
