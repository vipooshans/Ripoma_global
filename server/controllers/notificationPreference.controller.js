const NotificationPreference = require('../models/NotificationPreference');

// Get the user's notification preferences (creates default if not found)
exports.getPreferences = async (req, res) => {
  try {
    let preferences = await NotificationPreference.findOne({ user: req.user._id });
    
    if (!preferences) {
      preferences = await NotificationPreference.create({
        user: req.user._id,
        typeOverrides: {}
      });
    }

    res.status(200).json({ success: true, preferences });
  } catch (error) {
    console.error('[PREFERENCE CONTROLLER] getPreferences error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving notification preferences' });
  }
};

// Update the user's notification preferences
exports.updatePreferences = async (req, res) => {
  try {
    const {
      inAppEnabled,
      emailEnabled,
      emailDigest,
      digestTime,
      digestDayOfWeek,
      quietHoursEnabled,
      quietHoursStart,
      quietHoursEnd,
      typeOverrides
    } = req.body;

    let preferences = await NotificationPreference.findOne({ user: req.user._id });

    if (!preferences) {
      preferences = new NotificationPreference({ user: req.user._id });
    }

    if (inAppEnabled !== undefined) preferences.inAppEnabled = inAppEnabled;
    if (emailEnabled !== undefined) preferences.emailEnabled = emailEnabled;
    if (emailDigest !== undefined) preferences.emailDigest = emailDigest;
    if (digestTime !== undefined) preferences.digestTime = digestTime;
    if (digestDayOfWeek !== undefined) preferences.digestDayOfWeek = digestDayOfWeek;
    if (quietHoursEnabled !== undefined) preferences.quietHoursEnabled = quietHoursEnabled;
    if (quietHoursStart !== undefined) preferences.quietHoursStart = quietHoursStart;
    if (quietHoursEnd !== undefined) preferences.quietHoursEnd = quietHoursEnd;
    
    if (typeOverrides !== undefined) {
      preferences.typeOverrides = typeOverrides;
    }

    // Schedule next digest when daily/weekly digest is enabled
    const digestMode = preferences.emailDigest;
    if (digestMode === 'daily' || digestMode === 'weekly') {
      const now = new Date();
      const next = new Date(now);
      const [h, m] = String(preferences.digestTime || '08:00').split(':').map(Number);
      next.setHours(h || 8, m || 0, 0, 0);
      if (next <= now) next.setDate(next.getDate() + 1);
      if (digestMode === 'weekly') {
        const targetDow = preferences.digestDayOfWeek ?? 1;
        while (next.getDay() !== targetDow) {
          next.setDate(next.getDate() + 1);
        }
      }
      preferences.nextDigestAt = next;
    } else if (digestMode === 'instant' || digestMode === 'none') {
      preferences.nextDigestAt = undefined;
    }

    await preferences.save();

    res.status(200).json({ success: true, preferences });
  } catch (error) {
    console.error('[PREFERENCE CONTROLLER] updatePreferences error:', error);
    res.status(500).json({ success: false, message: 'Server error updating notification preferences' });
  }
};
