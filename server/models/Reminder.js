const mongoose = require('mongoose');

const ReminderSchema = new mongoose.Schema(
  {
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    assignedTo: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // notify these users
    title: { type: String, required: true },
    body: { type: String },
    dueAt: { type: Date, required: true },
    status: { 
      type: String, 
      enum: ['pending', 'snoozed', 'done', 'cancelled'], 
      default: 'pending' 
    },
    snoozeUntil: { type: Date },

    // Optional entity link
    entityType: { type: String },
    entityId: { type: mongoose.Schema.Types.ObjectId },
    entityRef: { type: String },

    recurrence: {
      enabled: { type: Boolean, default: false },
      frequency: { type: String, enum: ['daily', 'weekly', 'monthly'] },
      endDate: { type: Date }
    },

    notifiedAt: { type: Date }, // when the reminder notification was fired
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Reminder', ReminderSchema);
