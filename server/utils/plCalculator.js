const ExportOrder = require('../models/ExportOrder');
const ImportOrder = require('../models/ImportOrder');
const Expense = require('../models/Expense');
const TaxDutyRecord = require('../models/TaxDutyRecord');
const Product = require('../models/Product');
const convert = require('./currencyConverter');
const { getBaseCurrency } = require('./baseCurrencyMiddleware');

// Categories that count towards Cost of Goods Sold (COGS)
const COGS_CATEGORIES = [
  'freight', 'customs_duty', 'import_tax',
  'port_charges', 'handling', 'insurance', 'packaging',
  'inspection', 'certification', 'warehousing'
];

/**
 * Calculates the overall P&L summary statistics in the current base currency.
 * 
 * @param {object} [dateRange] - Optional { start, end } date filter for calculations
 * @returns {Promise<object>} P&L metrics object
 */
const calculatePLSummary = async (dateRange = null) => {
  const baseCurrency = await getBaseCurrency();

  // 1. Build queries with optional date filters
  const orderQuery = { status: 'delivered' };
  const importQuery = { status: 'received' };
  const expenseQuery = {};
  const taxQuery = { status: 'paid' };

  if (dateRange && (dateRange.start || dateRange.end)) {
    const start = dateRange.start ? new Date(dateRange.start) : new Date(0);
    const end = dateRange.end ? new Date(dateRange.end) : new Date();

    orderQuery.orderDate = { $gte: start, $lte: end };
    importQuery.orderDate = { $gte: start, $lte: end };
    expenseQuery.expenseDate = { $gte: start, $lte: end };
    // For taxes, we check paidDate if it exists, otherwise fallback to updatedAt or dueDate
    taxQuery.paidDate = { $gte: start, $lte: end };
  }

  // 2. Fetch ExportOrders and convert grandTotals
  const exportOrders = await ExportOrder.find(orderQuery);
  let totalRevenue = 0;
  for (const order of exportOrders) {
    const { result } = await convert(
      order.grandTotal,
      order.currency || 'USD',
      baseCurrency,
      order.orderDate || order.createdAt
    );
    totalRevenue += result;
  }

  // 3. Fetch ImportOrders and convert grandTotals
  const importOrders = await ImportOrder.find(importQuery);
  let importOrdersCOGS = 0;
  for (const order of importOrders) {
    const { result } = await convert(
      order.grandTotal,
      order.currency || 'USD',
      baseCurrency,
      order.orderDate || order.createdAt
    );
    importOrdersCOGS += result;
  }

  // 4. Fetch Expenses and separate into COGS vs Operating Expenses
  const expenses = await Expense.find(expenseQuery);
  let expensesCOGS = 0;
  let operatingExpenses = 0;

  for (const exp of expenses) {
    const isCOGS = COGS_CATEGORIES.includes(exp.category);
    if (isCOGS) {
      expensesCOGS += exp.amountInBaseCurrency || 0;
    } else {
      operatingExpenses += exp.amountInBaseCurrency || 0;
    }
  }

  // 5. Fetch Tax Duty Records and sum amountInBaseCurrency
  const taxDutyRecords = await TaxDutyRecord.find(taxQuery);
  let totalTaxesPaid = 0;
  for (const tax of taxDutyRecords) {
    totalTaxesPaid += tax.amountInBaseCurrency || 0;
  }

  // 6. Complete P&L equations
  const totalCOGS = importOrdersCOGS + expensesCOGS;
  const grossProfit = totalRevenue - totalCOGS;
  const netProfit = grossProfit - operatingExpenses - totalTaxesPaid;

  const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
  const netMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  return {
    revenue: Math.round(totalRevenue * 100) / 100,
    importCOGS: Math.round(importOrdersCOGS * 100) / 100,
    expensesCOGS: Math.round(expensesCOGS * 100) / 100,
    cogs: Math.round(totalCOGS * 100) / 100,
    grossProfit: Math.round(grossProfit * 100) / 100,
    operatingExpenses: Math.round(operatingExpenses * 100) / 100,
    taxesPaid: Math.round(totalTaxesPaid * 100) / 100,
    netProfit: Math.round(netProfit * 100) / 100,
    grossMargin: Math.round(grossMargin * 100) / 100,
    netMargin: Math.round(netMargin * 100) / 100
  };
};

/**
 * Pro-rates the purchase cost of products in a given export order by matching
 * against unit costs in received ImportOrders or falling back to the Product's base cost.
 * 
 * @param {object} exportOrder - Mongoose ExportOrder document
 * @returns {Promise<number>} Total buy cost of goods in base currency
 */
const calculateProductCOGSForExportOrder = async (exportOrder) => {
  const baseCurrency = await getBaseCurrency();
  let totalProductCOGS = 0;

  for (const item of exportOrder.items) {
    // Look up received import orders that contain this product
    const receivedImports = await ImportOrder.find({
      status: 'received',
      'items.product': item.product
    });

    let unitCostInBase = 0;
    let totalQtyReceived = 0;
    let totalCostInBase = 0;

    for (const imp of receivedImports) {
      const impItem = imp.items.find(i => i.product.toString() === item.product.toString());
      if (impItem && impItem.quantityReceived > 0) {
        // Convert purchase unitCost to current base currency
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

    if (totalQtyReceived > 0) {
      unitCostInBase = totalCostInBase / totalQtyReceived;
    } else {
      // Fallback: Use unitCost directly from Product Catalog
      const prod = await Product.findById(item.product);
      if (prod) {
        const { result } = await convert(
          prod.unitCost || 0,
          prod.currency || 'USD',
          baseCurrency,
          new Date()
        );
        unitCostInBase = result;
      }
    }

    // Multiply pro-rated unit cost by the quantity sold in the export order
    totalProductCOGS += unitCostInBase * item.quantityOrdered;
  }

  return Math.round(totalProductCOGS * 100) / 100;
};

module.exports = {
  COGS_CATEGORIES,
  calculatePLSummary,
  calculateProductCOGSForExportOrder
};
