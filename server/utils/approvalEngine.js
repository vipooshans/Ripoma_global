const Settings = require('../models/Settings');

const getRequiredApprovalLevels = async (grandTotal) => {
  let threshold = 5000;
  try {
    const setting = await Settings.findOne({ key: 'approval_threshold' });
    if (setting && typeof setting.value === 'number') {
      threshold = setting.value;
    } else if (!setting) {
      // Seed default if it doesn't exist
      await Settings.create({ key: 'approval_threshold', value: 5000 });
    }
  } catch (err) {
    console.error('[SETTINGS] Error fetching approval threshold:', err);
  }

  return grandTotal < threshold ? 1 : 2;
};

module.exports = { getRequiredApprovalLevels };
