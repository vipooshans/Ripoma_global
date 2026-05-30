const mongoose = require('mongoose');

const NotificationPreferenceSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },

    // Master toggles
    inAppEnabled: { type: Boolean, default: true },
    emailEnabled: { type: Boolean, default: true },
    emailDigest: { 
      type: String, 
      enum: ['instant', 'daily', 'weekly', 'never'], 
      default: 'instant' 
    },
    digestTime: { type: String, default: '08:00' }, // HH:MM for daily/weekly digest
    digestDayOfWeek: { type: Number, default: 1 }, // 0=Sun, 1=Mon (for weekly digest)

    // Per-type overrides: map of notificationType → { inApp: bool, email: bool }
    typeOverrides: {
      type: Map,
      of: new mongoose.Schema({
        inApp: { type: Boolean },
        email: { type: Boolean }
      }, { _id: false })
    },

    // Quiet hours — suppress non-error notifications during these hours
    quietHoursEnabled: { type: Boolean, default: false },
    quietHoursStart: { type: String, default: '22:00' },
    quietHoursEnd: { type: String, default: '07:00' },

    nextDigestAt: { type: Date },

    updatedAt: { type: Date, default: Date.now }
  },
  {
    timestamps: { createdAt: false, updatedAt: true }
  }
);

module.exports = mongoose.model('NotificationPreference', NotificationPreferenceSchema);
