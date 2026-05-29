const DocumentActivity = require('../models/DocumentActivity');

/**
 * Get activity log for a specific document.
 */
exports.getDocumentActivity = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [activities, total] = await Promise.all([
      DocumentActivity.find({ document: req.params.docId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('performedBy', 'firstName lastName email role'),
      DocumentActivity.countDocuments({ document: req.params.docId })
    ]);

    res.json({
      activities,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    console.error('[ActivityController] Error:', err);
    res.status(500).json({ message: 'Failed to fetch activity log', error: err.message });
  }
};

/**
 * Get global activity feed across all documents (for dashboard).
 */
exports.getGlobalActivity = async (req, res) => {
  try {
    const { page = 1, limit = 30, action, userId } = req.query;
    const filter = {};
    if (action) filter.action = action;
    if (userId) filter.performedBy = userId;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [activities, total] = await Promise.all([
      DocumentActivity.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('performedBy', 'firstName lastName email')
        .populate('document', 'name docNumber category'),
      DocumentActivity.countDocuments(filter)
    ]);

    res.json({
      activities,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    console.error('[ActivityController] Global error:', err);
    res.status(500).json({ message: 'Failed to fetch activity', error: err.message });
  }
};
