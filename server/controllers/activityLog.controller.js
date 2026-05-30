const ActivityLog = require('../models/ActivityLog');

// Get activity logs with filters and pagination
exports.getActivityLogs = async (req, res) => {
  try {
    const { page = 1, limit = 50, module, action, actor, search, startDate, endDate } = req.query;
    
    const query = {};

    if (module) {
      query.module = module;
    }
    if (action) {
      query.action = action;
    }
    if (actor) {
      query.actor = actor;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    if (search) {
      query.$or = [
        { actorName: { $regex: search, $options: 'i' } },
        { actorRole: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { entityRef: { $regex: search, $options: 'i' } },
        { entityType: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const logs = await ActivityLog.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('actor', 'name email role');

    const total = await ActivityLog.countDocuments(query);

    res.status(200).json({
      success: true,
      logs,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    console.error('[ACTIVITY LOG CONTROLLER] getActivityLogs error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving activity logs' });
  }
};
