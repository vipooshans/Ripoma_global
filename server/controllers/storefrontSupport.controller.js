const SupportTicket = require('../models/SupportTicket');
const User = require('../models/User');
const { getStorefrontFaqs } = require('../config/storefrontFaqs');
const { sendNotification } = require('../utils/notifyService');
const { notifyCustomer } = require('../utils/customerNotifyService');

const CATEGORIES = ['shipping', 'order', 'product', 'billing', 'other'];
const CREATE_TYPES = ['inquiry', 'complaint', 'chat'];

const formatMessage = (m) => ({
  id: m._id,
  body: m.body,
  byRole: m.byRole,
  authorName: m.authorName || '',
  at: m.at
});

const formatTicket = (t) => ({
  id: t._id,
  ticketNumber: t.ticketNumber,
  type: t.type,
  status: t.status,
  subject: t.subject,
  category: t.category,
  guestName: t.guestName || '',
  guestEmail: t.guestEmail || '',
  guestPhone: t.guestPhone || '',
  relatedOrder: t.relatedOrder || null,
  customerAccount: t.customerAccount
    ? {
        id: t.customerAccount._id || t.customerAccount,
        firstName: t.customerAccount.firstName,
        lastName: t.customerAccount.lastName,
        email: t.customerAccount.email
      }
    : null,
  messages: (t.messages || []).map(formatMessage),
  createdAt: t.createdAt,
  updatedAt: t.updatedAt
});

const makeTicketNumber = async () => {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  const candidate = `SUP-${stamp}-${rand}`;
  const exists = await SupportTicket.exists({ ticketNumber: candidate });
  if (exists) return makeTicketNumber();
  return candidate;
};

const notifyStaffNewTicket = async (ticket) => {
  try {
    const staff = await User.find({
      role: { $in: ['admin', 'manager'] },
      deleted: { $ne: true },
      status: 'active'
    }).select('_id');

    for (const user of staff) {
      await sendNotification({
        recipientId: user._id,
        type: 'storefront_support_ticket',
        severity: ticket.type === 'complaint' ? 'warning' : 'info',
        title: `Support ${ticket.type}: ${ticket.ticketNumber}`,
        body: ticket.subject,
        actionUrl: '/inventory/storefront-support',
        actionLabel: 'Open inbox',
        entityType: 'SupportTicket',
        entityId: ticket._id,
        entityRef: ticket.ticketNumber
      });
    }
  } catch (err) {
    console.error('Support ticket staff notify error:', err);
  }
};

const canAccessTicket = (ticket, req) => {
  if (req.customerUser) {
    const ownerId = ticket.customerAccount?._id || ticket.customerAccount;
    if (ownerId && String(ownerId) === String(req.customerUser._id)) return true;
  }
  const email = String(req.query.email || req.body?.email || '')
    .trim()
    .toLowerCase();
  if (email && ticket.guestEmail && email === ticket.guestEmail) return true;
  return false;
};

exports.getFaqs = async (_req, res) => {
  try {
    return res.status(200).json({ faqs: getStorefrontFaqs() });
  } catch (error) {
    console.error('Storefront FAQs Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

exports.createTicket = async (req, res) => {
  try {
    const {
      type = 'inquiry',
      subject,
      category = 'other',
      message,
      guestName,
      guestEmail,
      guestPhone,
      relatedOrder
    } = req.body || {};

    if (!CREATE_TYPES.includes(type)) {
      return res.status(400).json({ message: 'Invalid support type.' });
    }
    if (type === 'chat' && !req.customerUser) {
      return res.status(401).json({ message: 'Sign in to message support.' });
    }

    const subjectText = String(subject || '').trim();
    const bodyText = String(message || '').trim();
    if (subjectText.length < 3) {
      return res.status(400).json({ message: 'Subject is required (min 3 characters).' });
    }
    if (bodyText.length < 10) {
      return res.status(400).json({ message: 'Message must be at least 10 characters.' });
    }
    if (!CATEGORIES.includes(category)) {
      return res.status(400).json({ message: 'Invalid category.' });
    }

    let guestNameVal = String(guestName || '').trim();
    let guestEmailVal = String(guestEmail || '').trim().toLowerCase();
    let guestPhoneVal = String(guestPhone || '').trim();

    if (req.customerUser) {
      guestNameVal =
        guestNameVal ||
        `${req.customerUser.firstName || ''} ${req.customerUser.lastName || ''}`.trim();
      guestEmailVal = guestEmailVal || req.customerUser.email || '';
      guestPhoneVal = guestPhoneVal || req.customerUser.phone || '';
    } else if (!guestEmailVal || !guestNameVal) {
      return res.status(400).json({ message: 'Name and email are required.' });
    }

    // Reuse open chat thread for the same customer
    if (type === 'chat' && req.customerUser) {
      const existing = await SupportTicket.findOne({
        type: 'chat',
        customerAccount: req.customerUser._id,
        status: { $in: ['open', 'in_progress'] }
      }).sort({ updatedAt: -1 });

      if (existing) {
        existing.messages.push({
          body: bodyText,
          byRole: 'customer',
          authorName: guestNameVal || 'Customer',
          at: new Date()
        });
        existing.status = 'open';
        await existing.save();
        return res.status(200).json({
          message: 'Message sent.',
          ticket: formatTicket(existing)
        });
      }
    }

    const ticketNumber = await makeTicketNumber();
    const authorRole = req.customerUser ? 'customer' : 'guest';

    const ticket = await SupportTicket.create({
      ticketNumber,
      type,
      status: 'open',
      subject: subjectText.slice(0, 200),
      category,
      customerAccount: req.customerUser?._id || null,
      guestName: guestNameVal,
      guestEmail: guestEmailVal,
      guestPhone: guestPhoneVal,
      relatedOrder: relatedOrder || null,
      messages: [
        {
          body: bodyText,
          byRole: authorRole,
          authorName: guestNameVal || (req.customerUser ? 'Customer' : 'Guest'),
          at: new Date()
        }
      ]
    });

    await notifyStaffNewTicket(ticket);

    return res.status(201).json({
      message: 'Support request submitted.',
      ticket: formatTicket(ticket)
    });
  } catch (error) {
    console.error('Create Support Ticket Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

exports.listMyTickets = async (req, res) => {
  try {
    const tickets = await SupportTicket.find({ customerAccount: req.customerUser._id })
      .sort({ updatedAt: -1 })
      .limit(50);
    return res.status(200).json({ tickets: tickets.map(formatTicket) });
  } catch (error) {
    console.error('List My Support Tickets Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

exports.getTicket = async (req, res) => {
  try {
    const ticket = await SupportTicket.findById(req.params.id).populate(
      'customerAccount',
      'firstName lastName email phone'
    );
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found.' });
    }
    if (!canAccessTicket(ticket, req)) {
      return res.status(403).json({ message: 'You do not have access to this ticket.' });
    }
    return res.status(200).json({ ticket: formatTicket(ticket) });
  } catch (error) {
    console.error('Get Support Ticket Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

exports.addMessage = async (req, res) => {
  try {
    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found.' });
    }
    if (!canAccessTicket(ticket, req)) {
      return res.status(403).json({ message: 'You do not have access to this ticket.' });
    }
    if (['resolved', 'closed'].includes(ticket.status)) {
      return res.status(400).json({ message: 'This ticket is closed. Open a new request if you need help.' });
    }

    const bodyText = String(req.body?.message || req.body?.body || '').trim();
    if (bodyText.length < 1) {
      return res.status(400).json({ message: 'Message is required.' });
    }

    const authorRole = req.customerUser ? 'customer' : 'guest';
    const authorName = req.customerUser
      ? `${req.customerUser.firstName || ''} ${req.customerUser.lastName || ''}`.trim() || 'Customer'
      : ticket.guestName || 'Guest';

    ticket.messages.push({
      body: bodyText.slice(0, 4000),
      byRole: authorRole,
      authorName,
      at: new Date()
    });
    if (ticket.status === 'resolved') ticket.status = 'open';
    await ticket.save();

    return res.status(200).json({
      message: 'Message sent.',
      ticket: formatTicket(ticket)
    });
  } catch (error) {
    console.error('Add Support Message Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Exported for staff controller reuse
exports.formatTicket = formatTicket;
exports.notifyStaffNewTicket = notifyStaffNewTicket;
exports.notifyCustomer = notifyCustomer;
