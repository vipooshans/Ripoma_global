const CommunicationLog = require('../models/CommunicationLog');

// ─── GET /api/communications ──────────────────────────────────────────────────
exports.getLogs = async (req, res) => {
  try {
    const { entityType, entityId, type, direction, dateFrom, dateTo, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (entityType) filter.entityType = entityType;
    if (entityId) filter.entityId = entityId;
    if (type) filter.type = type;
    if (direction) filter.direction = direction;
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [logs, total] = await Promise.all([
      CommunicationLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip).limit(parseInt(limit))
        .populate('loggedBy', 'name email avatar').lean(),
      CommunicationLog.countDocuments(filter)
    ]);

    return res.status(200).json({
      logs,
      pagination: {
        total, page: parseInt(page), limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
};

// ─── POST /api/communications ─────────────────────────────────────────────────
exports.createLog = async (req, res) => {
  try {
    const { entityType, entityId, type } = req.body;
    if (!entityType || !entityId || !type) {
      return res.status(400).json({ message: 'entityType, entityId, and type are required.' });
    }

    const log = new CommunicationLog({
      ...req.body,
      loggedBy: req.user?._id
    });
    await log.save();
    await log.populate('loggedBy', 'name email avatar');
    return res.status(201).json({ message: 'Communication logged.', log });
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
};

// ─── PUT /api/communications/:id ──────────────────────────────────────────────
exports.updateLog = async (req, res) => {
  try {
    const log = await CommunicationLog.findByIdAndUpdate(
      req.params.id,
      { ...req.body },
      { new: true, runValidators: true }
    ).populate('loggedBy', 'name email');
    if (!log) return res.status(404).json({ message: 'Log not found.' });
    return res.status(200).json({ message: 'Log updated.', log });
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
};

// ─── DELETE /api/communications/:id ──────────────────────────────────────────
exports.deleteLog = async (req, res) => {
  try {
    const log = await CommunicationLog.findByIdAndDelete(req.params.id);
    if (!log) return res.status(404).json({ message: 'Log not found.' });
    return res.status(200).json({ message: 'Log deleted.' });
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
};

// ─── PATCH /api/communications/:id/follow-up ──────────────────────────────────
exports.markFollowUpDone = async (req, res) => {
  try {
    const log = await CommunicationLog.findByIdAndUpdate(
      req.params.id,
      { followUpDone: true },
      { new: true }
    );
    if (!log) return res.status(404).json({ message: 'Log not found.' });
    return res.status(200).json({ message: 'Follow-up marked as done.', log });
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
};
