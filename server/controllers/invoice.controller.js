const Invoice = require('../models/Invoice');
const ExportOrder = require('../models/ExportOrder');
const Customer = require('../models/Customer');
const generateExportNumber = require('../utils/soNumberGenerator');
const generateInvoicePdf = require('../utils/invoicePdfGenerator');

// 1. Create Invoice
exports.createInvoice = async (req, res) => {
  try {
    const { exportOrderId, type = 'commercial', dueDate, paymentInstructions, notes } = req.body;

    const order = await ExportOrder.findById(exportOrderId).populate('customer');
    if (!order) return res.status(404).json({ message: 'Export Order not found.' });

    // Generate Invoice Number
    const invoiceNumber = await generateExportNumber('invoice');

    // Create invoice line items snapshotting order items
    const invoiceItems = order.items.map(item => {
      // Line total formula: qty * unitPrice * (1 - discount/100)
      const baseAmount = item.quantityOrdered * item.unitPrice;
      const afterDiscount = baseAmount - (baseAmount * (item.discount / 100));
      return {
        description: item.description || 'Product Item',
        quantity: item.quantityOrdered,
        unitPrice: item.unitPrice,
        discount: item.discount,
        tax: item.tax,
        lineTotal: Math.round(afterDiscount * 100) / 100
      };
    });

    const invoice = new Invoice({
      invoiceNumber,
      type,
      exportOrder: order._id,
      customer: order.customer._id,
      dueDate: dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Default 30 days
      currency: order.currency,
      subtotal: order.subtotal,
      taxTotal: order.taxTotal,
      discountTotal: order.discountTotal,
      shippingCharge: order.shippingCharge,
      grandTotal: order.grandTotal,
      amountPaid: 0,
      amountDue: order.grandTotal,
      items: invoiceItems,
      paymentInstructions,
      notes,
      createdBy: req.user?._id
    });

    await invoice.save();

    // Log in order timeline
    order.timeline.push({
      action: 'invoice_created',
      details: `${type === 'proforma' ? 'Proforma' : 'Commercial'} Invoice ${invoiceNumber} created.`,
      performedBy: req.user?._id
    });
    
    // Also push the document details to the order's documents list
    order.documents.push({
      name: `${type === 'proforma' ? 'Proforma' : 'Commercial'} Invoice ${invoiceNumber}`,
      type: type === 'proforma' ? 'proforma_invoice' : 'commercial_invoice',
      url: `/api/invoices/${invoice._id}/pdf`
    });

    await order.save();

    res.status(201).json({ invoice, message: 'Invoice generated successfully.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 2. List Invoices
exports.listInvoices = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status, type, customer, dateFrom, dateTo, sort } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { invoiceNumber: { $regex: search, $options: 'i' } }
      ];
      const customers = await Customer.find({ companyName: { $regex: search, $options: 'i' } }).select('_id');
      if (customers.length > 0) {
        query.$or.push({ customer: { $in: customers.map(c => c._id) } });
      }
    }

    if (status) query.status = status;
    if (type) query.type = type;
    if (customer) query.customer = customer;

    if (dateFrom || dateTo) {
      query.issueDate = {};
      if (dateFrom) query.issueDate.$gte = new Date(dateFrom);
      if (dateTo) query.issueDate.$lte = new Date(dateTo);
    }

    let sortOption = { createdAt: -1 };
    if (sort) {
      const [field, order] = sort.split(':');
      sortOption = { [field]: order === 'desc' ? -1 : 1 };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Invoice.countDocuments(query);
    const invoices = await Invoice.find(query)
      .populate('customer', 'companyName code')
      .populate('exportOrder', 'orderNumber')
      .populate('createdBy', 'name')
      .sort(sortOption)
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      invoices,
      pagination: {
        total,
        page: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 3. Get Invoice Details
exports.getInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('customer')
      .populate('exportOrder')
      .populate('createdBy', 'name email');

    if (!invoice) return res.status(404).json({ message: 'Invoice not found.' });
    res.json(invoice);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 4. Mark Invoice as Sent
exports.sendInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ message: 'Invoice not found.' });

    if (invoice.status === 'draft') {
      invoice.status = 'sent';
      await invoice.save();

      // Log in order timeline
      const order = await ExportOrder.findById(invoice.exportOrder);
      if (order) {
        order.timeline.push({
          action: 'invoice_sent',
          details: `Invoice ${invoice.invoiceNumber} marked as sent to customer.`,
          performedBy: req.user?._id
        });
        await order.save();
      }
    }

    res.json({ invoice, message: 'Invoice marked as sent.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 5. Record Invoice Payment
exports.payInvoice = async (req, res) => {
  try {
    const { amountPaid, note } = req.body;
    const payment = parseFloat(amountPaid);
    
    if (isNaN(payment) || payment <= 0) {
      return res.status(400).json({ message: 'Payment amount must be greater than zero.' });
    }

    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ message: 'Invoice not found.' });

    if (invoice.status === 'paid') {
      return res.status(400).json({ message: 'Invoice is already fully paid.' });
    }

    // Update invoice payment amounts
    invoice.amountPaid += payment;
    invoice.amountDue = Math.max(0, invoice.grandTotal - invoice.amountPaid);
    
    if (invoice.amountPaid >= invoice.grandTotal) {
      invoice.status = 'paid';
      invoice.paidDate = Date.now();
    } else {
      invoice.status = 'viewed'; // Or keep as sent, viewed is a valid intermediate status
    }
    await invoice.save();

    // Update ExportOrder payment amounts & status
    const order = await ExportOrder.findById(invoice.exportOrder);
    if (order) {
      order.amountPaid += payment;
      if (order.amountPaid >= order.grandTotal) {
        order.paymentStatus = 'paid';
      } else if (order.amountPaid > 0) {
        order.paymentStatus = 'partial';
      }

      order.timeline.push({
        action: 'payment_added',
        details: `Recorded payment of ${payment} against Invoice ${invoice.invoiceNumber}.`,
        note: note || '',
        performedBy: req.user?._id
      });
      await order.save();
    }

    // Decrement customer's outstanding balance
    await Customer.findByIdAndUpdate(invoice.customer, {
      $inc: { outstandingBalance: -payment }
    });

    res.json({ invoice, message: 'Payment successfully recorded.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 6. Generate printable PDF file stream
exports.getInvoicePdf = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id).populate('customer');
    if (!invoice) return res.status(404).json({ message: 'Invoice not found.' });

    const pdfBuffer = generateInvoicePdf(invoice);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Invoice_${invoice.invoiceNumber}.pdf`);
    res.send(pdfBuffer);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
