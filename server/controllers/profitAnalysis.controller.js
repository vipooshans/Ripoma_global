const { calculatePLSummary, calculateProductCOGSForExportOrder } = require('../utils/plCalculator');
const ExportOrder = require('../models/ExportOrder');
const ImportOrder = require('../models/ImportOrder');
const Expense = require('../models/Expense');
const TaxDutyRecord = require('../models/TaxDutyRecord');
const Customer = require('../models/Customer');
const Product = require('../models/Product');
const convert = require('../utils/currencyConverter');
const { getBaseCurrency } = require('../utils/baseCurrencyMiddleware');

// GET /api/profit-analysis/summary
exports.getPLSummary = async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;
    const dateRange = (dateFrom || dateTo) ? { start: dateFrom, end: dateTo } : null;

    const summary = await calculatePLSummary(dateRange);
    return res.status(200).json(summary);
  } catch (error) {
    console.error('Get P&L Summary Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// GET /api/profit-analysis/by-period
exports.getPLByPeriod = async (req, res) => {
  try {
    const { months = 12 } = req.query;
    const count = parseInt(months) || 12;

    const results = [];
    const now = new Date();

    for (let i = count - 1; i >= 0; i--) {
      const year = now.getFullYear();
      const month = now.getMonth() - i;
      
      const date = new Date(year, month, 1);
      const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);

      const summary = await calculatePLSummary({ start: startOfMonth, end: endOfMonth });
      
      const monthLabel = startOfMonth.toLocaleString('default', { month: 'short', year: 'numeric' });
      const monthKey = `${startOfMonth.getFullYear()}-${String(startOfMonth.getMonth() + 1).padStart(2, '0')}`;

      results.push({
        month: monthLabel,
        key: monthKey,
        revenue: summary.revenue,
        cogs: summary.cogs,
        expenses: summary.operatingExpenses,
        taxes: summary.taxesPaid,
        netProfit: summary.netProfit
      });
    }

    return res.status(200).json(results);
  } catch (error) {
    console.error('Get P&L By Period Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// GET /api/profit-analysis/by-order/:type/:id
exports.getPLByOrder = async (req, res) => {
  try {
    const { type, id } = req.params;
    const baseCurrency = await getBaseCurrency();

    // 1. Export Order P&L
    if (type === 'exportOrder') {
      const order = await ExportOrder.findById(id).populate('customer').populate('items.product');
      if (!order) return res.status(404).json({ message: 'Export order not found.' });

      // Revenue: converted grandTotal to baseCurrency
      const { result: revenue } = await convert(
        order.grandTotal,
        order.currency || 'USD',
        baseCurrency,
        order.orderDate || order.createdAt
      );

      // Product COGS pro-rated
      const productCOGS = await calculateProductCOGSForExportOrder(order);

      // Linked Expenses
      const expenses = await Expense.find({ exportOrder: order._id });
      let expensesCOGS = 0;
      expenses.forEach(e => {
        expensesCOGS += e.amountInBaseCurrency || 0;
      });

      // Linked TaxDutyRecords
      const taxes = await TaxDutyRecord.find({ exportOrder: order._id });
      let taxesCOGS = 0;
      taxes.forEach(t => {
        taxesCOGS += t.amountInBaseCurrency || 0;
      });

      const totalCOGS = productCOGS + expensesCOGS + taxesCOGS;
      const profit = revenue - totalCOGS;
      const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

      return res.status(200).json({
        orderNumber: order.orderNumber,
        type: 'export',
        counterparty: order.customer?.companyName || 'Unknown Customer',
        revenue: Math.round(revenue * 100) / 100,
        productCOGS: Math.round(productCOGS * 100) / 100,
        expensesCOGS: Math.round(expensesCOGS * 100) / 100,
        taxesCOGS: Math.round(taxesCOGS * 100) / 100,
        cogs: Math.round(totalCOGS * 100) / 100,
        profit: Math.round(profit * 100) / 100,
        margin: Math.round(margin * 100) / 100
      });
    }

    // 2. Import Order Cost Breakdown
    if (type === 'importOrder') {
      const order = await ImportOrder.findById(id).populate('supplier').populate('items.product');
      if (!order) return res.status(404).json({ message: 'Import order not found.' });

      // Purchased cost: converted grandTotal to baseCurrency
      const { result: cogs } = await convert(
        order.grandTotal,
        order.currency || 'USD',
        baseCurrency,
        order.orderDate || order.createdAt
      );

      // Linked Expenses
      const expenses = await Expense.find({ importOrder: order._id });
      let expensesCOGS = 0;
      expenses.forEach(e => {
        expensesCOGS += e.amountInBaseCurrency || 0;
      });

      // Linked TaxDutyRecords
      const taxes = await TaxDutyRecord.find({ importOrder: order._id });
      let taxesCOGS = 0;
      taxes.forEach(t => {
        taxesCOGS += t.amountInBaseCurrency || 0;
      });

      const totalCost = cogs + expensesCOGS + taxesCOGS;

      // Estimate potential sales value from Product Catalog selling prices
      let expectedRevenue = 0;
      for (const item of order.items) {
        if (item.product) {
          const qty = item.status === 'received' ? item.quantityReceived : item.quantityOrdered;
          const { result: sellVal } = await convert(
            item.product.sellingPrice || 0,
            item.product.currency || 'USD',
            baseCurrency,
            new Date()
          );
          expectedRevenue += sellVal * qty;
        }
      }

      const profit = expectedRevenue - totalCost;
      const margin = expectedRevenue > 0 ? (profit / expectedRevenue) * 100 : 0;

      return res.status(200).json({
        orderNumber: order.poNumber,
        type: 'import',
        counterparty: order.supplier?.companyName || 'Unknown Supplier',
        expectedRevenue: Math.round(expectedRevenue * 100) / 100,
        purchaseCost: Math.round(cogs * 100) / 100,
        expensesCOGS: Math.round(expensesCOGS * 100) / 100,
        taxesCOGS: Math.round(taxesCOGS * 100) / 100,
        cogs: Math.round(totalCost * 100) / 100, // Total cost is effectively the COGS for purchasing
        profit: Math.round(profit * 100) / 100,
        margin: Math.round(margin * 100) / 100
      });
    }

    return res.status(400).json({ message: 'Invalid order type. Must be exportOrder or importOrder.' });
  } catch (error) {
    console.error('Get P&L By Order Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// GET /api/profit-analysis/by-customer
exports.getPLByCustomer = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const baseCurrency = await getBaseCurrency();

    // Find all delivered export orders and populate details
    const orders = await ExportOrder.find({ status: 'delivered' }).populate('customer');

    const customerMap = {};

    for (const order of orders) {
      if (!order.customer) continue;
      const custId = order.customer._id.toString();

      if (!customerMap[custId]) {
        customerMap[custId] = {
          name: order.customer.companyName,
          code: order.customer.code,
          revenue: 0,
          cogs: 0
        };
      }

      // Convert order revenue
      const { result: rev } = await convert(
        order.grandTotal,
        order.currency || 'USD',
        baseCurrency,
        order.orderDate || order.createdAt
      );
      customerMap[custId].revenue += rev;

      // Compute COGS for order
      const prodCOGS = await calculateProductCOGSForExportOrder(order);

      const expenses = await Expense.find({ exportOrder: order._id });
      let expCOGS = 0;
      expenses.forEach(e => { expCOGS += e.amountInBaseCurrency || 0; });

      const taxes = await TaxDutyRecord.find({ exportOrder: order._id });
      let taxCOGS = 0;
      taxes.forEach(t => { taxCOGS += t.amountInBaseCurrency || 0; });

      customerMap[custId].cogs += (prodCOGS + expCOGS + taxCOGS);
    }

    const list = Object.values(customerMap).map(c => {
      const profit = c.revenue - c.cogs;
      const margin = c.revenue > 0 ? (profit / c.revenue) * 100 : 0;
      return {
        customer: c.name,
        code: c.code,
        revenue: Math.round(c.revenue * 100) / 100,
        cogs: Math.round(c.cogs * 100) / 100,
        profit: Math.round(profit * 100) / 100,
        margin: Math.round(margin * 100) / 100
      };
    });

    // Sort descending by profit
    list.sort((a, b) => b.profit - a.profit);

    const topN = list.slice(0, parseInt(limit));
    return res.status(200).json(topN);
  } catch (error) {
    console.error('Get P&L By Customer Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// GET /api/profit-analysis/by-product
exports.getPLByProduct = async (req, res) => {
  try {
    const baseCurrency = await getBaseCurrency();

    // 1. Fetch all delivered ExportOrders
    const exportOrders = await ExportOrder.find({ status: 'delivered' }).populate('items.product');

    // 2. Map items sold
    const productMap = {};

    for (const order of exportOrders) {
      for (const item of order.items) {
        if (!item.product) continue;
        const prodId = item.product._id.toString();

        if (!productMap[prodId]) {
          productMap[prodId] = {
            sku: item.product.sku,
            name: item.product.name,
            productObj: item.product,
            unitsSold: 0,
            revenue: 0,
            costAcc: 0,
            costCount: 0
          };
        }

        productMap[prodId].unitsSold += item.quantityOrdered;

        // Pro-rate line total (including tax & discount) to base currency
        const lineTotal = item.lineTotal || (item.quantityOrdered * item.unitPrice * (1 - (item.discount || 0)/100));
        const { result: rev } = await convert(
          lineTotal,
          order.currency || 'USD',
          baseCurrency,
          order.orderDate || order.createdAt
        );
        productMap[prodId].revenue += rev;
      }
    }

    const results = [];

    for (const prodId of Object.keys(productMap)) {
      const p = productMap[prodId];

      // Retrieve actual average cost from received ImportOrders
      const receivedImports = await ImportOrder.find({
        status: 'received',
        'items.product': prodId
      });

      let totalCostInBase = 0;
      let totalQtyReceived = 0;

      for (const imp of receivedImports) {
        const impItem = imp.items.find(i => i.product.toString() === prodId);
        if (impItem && impItem.quantityReceived > 0) {
          const { result } = await convert(
            impItem.unitCost,
            imp.currency || 'USD',
            baseCurrency,
            imp.orderDate || imp.createdAt
          );
          totalCostInBase += result * impItem.quantityReceived;
          totalQtyReceived += impItem.quantityReceived;
        }
      }

      let unitCost = 0;
      if (totalQtyReceived > 0) {
        unitCost = totalCostInBase / totalQtyReceived;
      } else {
        // Fallback to Product catalog unitCost
        const { result } = await convert(
          p.productObj.unitCost || 0,
          p.productObj.currency || 'USD',
          baseCurrency,
          new Date()
        );
        unitCost = result;
      }

      const totalCOGS = unitCost * p.unitsSold;
      const profit = p.revenue - totalCOGS;
      const margin = p.revenue > 0 ? (profit / p.revenue) * 100 : 0;

      results.push({
        sku: p.sku,
        name: p.name,
        unitsSold: p.unitsSold,
        revenue: Math.round(p.revenue * 100) / 100,
        cogs: Math.round(totalCOGS * 100) / 100,
        profit: Math.round(profit * 100) / 100,
        margin: Math.round(margin * 100) / 100
      });
    }

    // Sort descending by profit
    results.sort((a, b) => b.profit - a.profit);

    return res.status(200).json(results);
  } catch (error) {
    console.error('Get P&L By Product Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
