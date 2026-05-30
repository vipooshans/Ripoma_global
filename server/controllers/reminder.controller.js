const Reminder = require('../models/Reminder');

// Get reminders for the authenticated user (created by or assigned to the user)
exports.getReminders = async (req, res) => {
  try {
    const query = {
      $or: [
        { createdBy: req.user._id },
        { assignedTo: req.user._id }
      ]
    };

    const reminders = await Reminder.find(query)
      .sort({ dueAt: 1 })
      .populate('createdBy', 'name email role')
      .populate('assignedTo', 'name email role');

    res.status(200).json({ success: true, reminders });
  } catch (error) {
    console.error('[REMINDER CONTROLLER] getReminders error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving reminders' });
  }
};

// Create a new reminder
exports.createReminder = async (req, res) => {
  try {
    const { title, body, dueAt, assignedTo, entityType, entityId, entityRef, recurrence } = req.body;

    if (!title || !dueAt) {
      return res.status(400).json({ success: false, message: 'Title and due date are required' });
    }

    const reminder = new Reminder({
      createdBy: req.user._id,
      assignedTo: assignedTo && assignedTo.length > 0 ? assignedTo : [req.user._id],
      title,
      body,
      dueAt,
      entityType,
      entityId,
      entityRef,
      recurrence
    });

    await reminder.save();

    res.status(201).json({ success: true, reminder });
  } catch (error) {
    console.error('[REMINDER CONTROLLER] createReminder error:', error);
    res.status(500).json({ success: false, message: 'Server error creating reminder', error: error.message });
  }
};

// Update a reminder
exports.updateReminder = async (req, res) => {
  try {
    const reminder = await Reminder.findById(req.params.id);

    if (!reminder) {
      return res.status(404).json({ success: false, message: 'Reminder not found' });
    }

    // Verify ownership or assignment
    const isCreator = reminder.createdBy.toString() === req.user._id.toString();
    const isAssigned = reminder.assignedTo.some(id => id.toString() === req.user._id.toString());
    if (!isCreator && !isAssigned) {
      return res.status(403).json({ success: false, message: 'Unauthorized to update this reminder' });
    }

    const updates = req.body;
    Object.assign(reminder, updates);
    reminder.updatedAt = new Date();

    await reminder.save();

    res.status(200).json({ success: true, reminder });
  } catch (error) {
    console.error('[REMINDER CONTROLLER] updateReminder error:', error);
    res.status(500).json({ success: false, message: 'Server error updating reminder' });
  }
};

// Complete a reminder
exports.completeReminder = async (req, res) => {
  try {
    const reminder = await Reminder.findById(req.params.id);

    if (!reminder) {
      return res.status(404).json({ success: false, message: 'Reminder not found' });
    }

    const isCreator = reminder.createdBy.toString() === req.user._id.toString();
    const isAssigned = reminder.assignedTo.some(id => id.toString() === req.user._id.toString());
    if (!isCreator && !isAssigned) {
      return res.status(403).json({ success: false, message: 'Unauthorized to complete this reminder' });
    }

    reminder.status = 'done';
    await reminder.save();

    res.status(200).json({ success: true, reminder });
  } catch (error) {
    console.error('[REMINDER CONTROLLER] completeReminder error:', error);
    res.status(500).json({ success: false, message: 'Server error completing reminder' });
  }
};

// Snooze a reminder
exports.snoozeReminder = async (req, res) => {
  try {
    const { snoozeMinutes = 15 } = req.body;
    const reminder = await Reminder.findById(req.params.id);

    if (!reminder) {
      return res.status(404).json({ success: false, message: 'Reminder not found' });
    }

    const isCreator = reminder.createdBy.toString() === req.user._id.toString();
    const isAssigned = reminder.assignedTo.some(id => id.toString() === req.user._id.toString());
    if (!isCreator && !isAssigned) {
      return res.status(403).json({ success: false, message: 'Unauthorized to snooze this reminder' });
    }

    reminder.status = 'snoozed';
    reminder.snoozeUntil = new Date(Date.now() + snoozeMinutes * 60 * 1000);
    reminder.notifiedAt = null; // Reset notified state so check jobs can alert again

    await reminder.save();

    res.status(200).json({ success: true, reminder });
  } catch (error) {
    console.error('[REMINDER CONTROLLER] snoozeReminder error:', error);
    res.status(500).json({ success: false, message: 'Server error snoozing reminder' });
  }
};

// Delete a reminder
exports.deleteReminder = async (req, res) => {
  try {
    const reminder = await Reminder.findById(req.params.id);

    if (!reminder) {
      return res.status(404).json({ success: false, message: 'Reminder not found' });
    }

    const isCreator = reminder.createdBy.toString() === req.user._id.toString();
    if (!isCreator) {
      return res.status(403).json({ success: false, message: 'Only the creator can delete this reminder' });
    }

    await reminder.deleteOne();

    res.status(200).json({ success: true, message: 'Reminder deleted successfully' });
  } catch (error) {
    console.error('[REMINDER CONTROLLER] deleteReminder error:', error);
    res.status(500).json({ success: false, message: 'Server error deleting reminder' });
  }
};
