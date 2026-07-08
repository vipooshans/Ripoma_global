const ExportOrder = require('../../models/ExportOrder');
const { calculatePLSummary } = require('../plCalculator');

/**
 * Aggregates dashboard KPI scorecards.
 * Computes Month-to-Date (MTD) vs Prior Month MTD metrics.
 * 
 * @returns {Promise<object>} Dashboard KPI scorecard metrics
 */
const aggregateKPIs = async () => {
  const today = new Date();
  
  // Current MTD range
  const curStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const curEnd = new Date(today);

  // Prior MTD range (Prior Month same day/time)
  const priStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const priEnd = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate(), today.getHours(), today.getMinutes());

  // 1. Financial P&L summaries
  const curPL = await calculatePLSummary({ start: curStart, end: curEnd });
  const priPL = await calculatePLSummary({ start: priStart, end: priEnd });

  // 2. Total Orders MTD count
  const curOrders = await ExportOrder.countDocuments({
    status: { $ne: 'cancelled' },
    orderDate: { $gte: curStart, $lte: curEnd }
  });
  const priOrders = await ExportOrder.countDocuments({
    status: { $ne: 'cancelled' },
    orderDate: { $gte: priStart, $lte: priEnd }
  });

  // Helper to calculate percent growth
  const calcGrowth = (current, prior) => {
    if (prior === 0) return current > 0 ? 100 : 0;
    return ((current - prior) / prior) * 100;
  };

  // Total Expenses MTD (OpEx + Taxes + Expenses COGS)
  const curExpenses = curPL.operatingExpenses + curPL.expensesCOGS + curPL.taxesPaid;
  const priExpenses = priPL.operatingExpenses + priPL.expensesCOGS + priPL.taxesPaid;

  return {
    revenue: {
      value: Math.round(curPL.revenue * 100) / 100,
      growth: Math.round(calcGrowth(curPL.revenue, priPL.revenue) * 100) / 100
    },
    orders: {
      value: curOrders,
      growth: Math.round(calcGrowth(curOrders, priOrders) * 100) / 100
    },
    expenses: {
      value: Math.round(curExpenses * 100) / 100,
      growth: Math.round(calcGrowth(curExpenses, priExpenses) * 100) / 100
    },
    grossMargin: {
      value: Math.round(curPL.grossMargin * 100) / 100,
      growth: Math.round((curPL.grossMargin - priPL.grossMargin) * 100) / 100
    }
  };
};

module.exports = { aggregateKPIs };
