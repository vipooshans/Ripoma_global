const SupportTicket = require('../models/SupportTicket');
const { formatTicket } = require('./storefrontSupport.controller');
const { notifyCustomer } = require('../utils/customerNotifyService');

const STATUSES = ['open', 'in_progress', 'resolved', 'closed'];

exports.listTickets = async (req, res) => {
  try {
    const { status = '', type = '', search = '', page = 1, limit = 20 } = req.query;
    const query = {};
    if (status && STATUSES.includes(status)) query.status = status;
    if (type && ['inquiry', 'complaint', 'chat'].includes(type)) query.type = type;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    let tickets = await SupportTicket.find(query)
      .populate('customerAccount', 'firstName lastName email phone')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limitNum);

    let total = await SupportTicket.countDocuments(query);

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      const all = await SupportTicket.find(query)
        .populate('customerAccount', 'firstName lastName email phone')
        .sort({ updatedAt: -1 });
      const filtered = all.filter((t) => {
        const hay = [
          t.ticketNumber,
          t.subject,
          t.guestName,
          t.guestEmail,
          t.customerAccount?.email,
          t.customerAccount?.firstName,
          t.customerAccount?.lastName
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return hay.includes(q);
      });
      total = filtered.length;
      tickets = filtered.slice(skip, skip + limitNum);
    }

    return res.status(200).json({
      tickets: tickets.map(formatTicket),
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1
      }
    });
  } catch (error) {
    console.error('Admin List Support Tickets Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

exports.getTicket = async (req, res) => {
  try {
    const ticket = await SupportTicket.findById(req.params.id).populate(
      'customerAccount',
      'firstName lastName email phone notificationPrefs status'
    );
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found.' });
    }
    return res.status(200).json({ ticket: formatTicket(ticket) });
  } catch (error) {
    console.error('Admin Get Support Ticket Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

exports.reply = async (req, res) => {
  try {
    const ticket = await SupportTicket.findById(req.params.id).populate(
      'customerAccount',
      'firstName lastName email phone notificationPrefs status'
    );
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found.' });
    }

    const bodyText = String(req.body?.message || req.body?.body || '').trim();
    if (!bodyText) {
      return res.status(400).json({ message: 'Reply message is required.' });
    }

    const staffName =
      req.user?.name ||
      [req.user?.firstName, req.user?.lastName].filter(Boolean).join(' ') ||
      'Support';

    ticket.messages.push({
      body: bodyText.slice(0, 4000),
      byRole: 'staff',
      authorName: staffName,
      at: new Date()
    });

    if (ticket.status === 'open') ticket.status = 'in_progress';
    if (req.body?.status && STATUSES.includes(req.body.status)) {
      ticket.status = req.body.status;
    }

    await ticket.save();

    if (ticket.customerAccount) {
      await notifyCustomer({
        customer: ticket.customerAccount,
        type: 'support_update',
        title: `Support reply · ${ticket.ticketNumber}`,
        body: bodyText.slice(0, 200),
        severity: 'info',
        actionUrl: `/customer/help?ticket=${ticket._id}`,
        actionLabel: 'View conversation',
        entityType: 'SupportTicket',
        entityId: ticket._id,
        entityRef: ticket.ticketNumber
      });
    }

    return res.status(200).json({
      message: 'Reply sent.',
      ticket: formatTicket(ticket)
    });
  } catch (error) {
    console.error('Admin Reply Support Ticket Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const ticket = await SupportTicket.findById(req.params.id).populate(
      'customerAccount',
      'firstName lastName email phone notificationPrefs status'
    );
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found.' });
    }

    const { status } = req.body || {};
    if (!STATUSES.includes(status)) {
      return res.status(400).json({ message: 'Invalid status.' });
    }

    const prev = ticket.status;
    ticket.status = status;
    await ticket.save();

    if (
      ticket.customerAccount &&
      prev !== status &&
      ['resolved', 'closed'].includes(status)
    ) {
      await notifyCustomer({
        customer: ticket.customerAccount,
        type: 'support_update',
        title: `Ticket ${status} · ${ticket.ticketNumber}`,
        body: `Your support request "${ticket.subject}" was marked ${status.replace('_', ' ')}.`,
        severity: 'success',
        actionUrl: `/customer/help?ticket=${ticket._id}`,
        actionLabel: 'View ticket',
        entityType: 'SupportTicket',
        entityId: ticket._id,
        entityRef: ticket.ticketNumber
      });
    }

    return res.status(200).json({
      message: 'Status updated.',
      ticket: formatTicket(ticket)
    });
  } catch (error) {
    console.error('Admin Update Support Status Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
