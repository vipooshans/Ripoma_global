const ExportOrder = require('../../models/ExportOrder');
const ImportOrder = require('../../models/ImportOrder');
const Shipment = require('../../models/Shipment');
const Customer = require('../../models/Customer');
const { calculatePLSummary } = require('../plCalculator');
const convert = require('../currencyConverter');
const { getBaseCurrency } = require('../baseCurrencyMiddleware');
const mongoose = require('mongoose');

/**
 * Aggregates advanced business analytics and growth metrics.
 * 
 * @param {object} params
 * @param {Date} params.dateFrom
 * @param {Date} params.dateTo
 * @returns {Promise<object>} Business analytics aggregates
 */
const aggregateAnalytics = async ({ dateFrom, dateTo }) => {
  const start = new Date(dateFrom);
  const end = new Date(dateTo);
  const baseCurrency = await getBaseCurrency();

  // Compute prior period date range of same length
  const duration = end.getTime() - start.getTime();
  const priorStart = new Date(start.getTime() - duration);
  const priorEnd = new Date(start.getTime() - 1);

  // 1. Current vs Prior P&L values
  const currentPL = await calculatePLSummary({ start, end });
  const priorPL = await calculatePLSummary({ start: priorStart, end: priorEnd });

  // Revenue Growth %
  const revGrowth = priorPL.revenue > 0 
    ? ((currentPL.revenue - priorPL.revenue) / priorPL.revenue) * 100 
    : 0;

  // 2. Order Volume Growth %
  const currentOrderCount = await ExportOrder.countDocuments({
    status: { $ne: 'cancelled' },
    orderDate: { $gte: start, $lte: end }
  });
  const priorOrderCount = await ExportOrder.countDocuments({
    status: { $ne: 'cancelled' },
    orderDate: { $gte: priorStart, $lte: priorEnd }
  });
  const orderGrowth = priorOrderCount > 0 
    ? ((currentOrderCount - priorOrderCount) / priorOrderCount) * 100 
    : 0;

  // 3. Customer Acquisition Count (First order falls in this period)
  const firstOrders = await ExportOrder.aggregate([
    {
      $group: {
        _id: '$customer',
        firstOrderDate: { $min: '$orderDate' }
      }
    },
    {
      $match: {
        firstOrderDate: { $gte: start, $lte: end }
      }
    }
  ]);
  const customerAcquisitions = firstOrders.length;

  const priorFirstOrders = await ExportOrder.aggregate([
    {
      $group: {
        _id: '$customer',
        firstOrderDate: { $min: '$orderDate' }
      }
    },
    {
      $match: {
        firstOrderDate: { $gte: priorStart, $lte: priorEnd }
      }
    }
  ]);
  const priorCustomerAcquisitions = priorFirstOrders.length;
  
  const customerAcqGrowth = priorCustomerAcquisitions > 0
    ? ((customerAcquisitions - priorCustomerAcquisitions) / priorCustomerAcquisitions) * 100
    : 0;

  // 4. Repeat Customer Rate
  // Customers with >= 2 orders in period / total customers with orders in period * 100
  const customerOrdersAgg = await ExportOrder.aggregate([
    {
      $match: {
        status: { $ne: 'cancelled' },
        orderDate: { $gte: start, $lte: end }
      }
    },
    {
      $group: {
        _id: '$customer',
        orderCount: { $sum: 1 }
      }
    }
  ]);

  const totalCustomersWithOrders = customerOrdersAgg.length;
  const repeatCustomersCount = customerOrdersAgg.filter(c => c.orderCount >= 2).length;
  const repeatCustomerRate = totalCustomersWithOrders > 0 
    ? (repeatCustomersCount / totalCustomersWithOrders) * 100 
    : 0;

  const priorCustomerOrdersAgg = await ExportOrder.aggregate([
    {
      $match: {
        status: { $ne: 'cancelled' },
        orderDate: { $gte: priorStart, $lte: priorEnd }
      }
    },
    {
      $group: {
        _id: '$customer',
        orderCount: { $sum: 1 }
      }
    }
  ]);
  const priorTotalCustomers = priorCustomerOrdersAgg.length;
  const priorRepeatCustomers = priorCustomerOrdersAgg.filter(c => c.orderCount >= 2).length;
  const priorRepeatCustomerRate = priorTotalCustomers > 0 
    ? (priorRepeatCustomers / priorTotalCustomers) * 100 
    : 0;
  const repeatRateGrowth = repeatCustomerRate - priorRepeatCustomerRate; // raw percentage points change

  // 5. Import vs Export Ratio
  const currentImports = await ImportOrder.find({
    status: { $in: ['approved', 'ordered', 'in_transit', 'partially_received', 'received'] },
    orderDate: { $gte: start, $lte: end }
  });

  let currentImportVal = 0;
  for (const imp of currentImports) {
    const { result } = await convert(imp.grandTotal, imp.currency || 'USD', baseCurrency, imp.orderDate || imp.createdAt);
    currentImportVal += result;
  }

  const importExportRatio = currentPL.revenue > 0 ? (currentImportVal / currentPL.revenue) : 0;

  const priorImports = await ImportOrder.find({
    status: { $in: ['approved', 'ordered', 'in_transit', 'partially_received', 'received'] },
    orderDate: { $gte: priorStart, $lte: priorEnd }
  });
  let priorImportVal = 0;
  for (const imp of priorImports) {
    const { result } = await convert(imp.grandTotal, imp.currency || 'USD', baseCurrency, imp.orderDate || imp.createdAt);
    priorImportVal += result;
  }
  const priorImportExportRatio = priorPL.revenue > 0 ? (priorImportVal / priorPL.revenue) : 0;
  const ratioGrowth = priorImportExportRatio > 0 
    ? ((importExportRatio - priorImportExportRatio) / priorImportExportRatio) * 100 
    : 0;

  // Gross Margin Growth
  const grossMarginGrowth = currentPL.grossMargin - priorPL.grossMargin;

  // 6. Top Trade Corridors by Shipment Volume
  const tradeCorridors = await Shipment.aggregate([
    {
      $match: {
        createdAt: { $gte: start, $lte: end }
      }
    },
    {
      $group: {
        _id: {
          origin: '$origin.name',
          destination: '$destination.name'
        },
        count: { $sum: 1 }
      }
    },
    {
      $project: {
        corridor: { $concat: ['$_id.origin', ' → ', '$_id.destination'] },
        count: '$count',
        _id: 0
      }
    },
    { $sort: { count: -1 } },
    { $limit: 10 }
  ]);

  // 7. Order Pipeline Funnel
  const funnelMatch = { orderDate: { $gte: start, $lte: end } };
  const totalFunnelOrders = await ExportOrder.countDocuments(funnelMatch);
  const confirmedFunnelOrders = await ExportOrder.countDocuments({
    ...funnelMatch,
    status: { $in: ['confirmed', 'processing', 'ready_to_ship', 'dispatched', 'in_transit', 'delivered'] }
  });
  const dispatchedFunnelOrders = await ExportOrder.countDocuments({
    ...funnelMatch,
    status: { $in: ['dispatched', 'in_transit', 'delivered'] }
  });
  const deliveredFunnelOrders = await ExportOrder.countDocuments({
    ...funnelMatch,
    status: 'delivered'
  });

  const funnelData = [
    { stage: 'Total Placed', count: totalFunnelOrders, pct: 100 },
    { stage: 'Confirmed', count: confirmedFunnelOrders, pct: totalFunnelOrders > 0 ? Math.round((confirmedFunnelOrders / totalFunnelOrders) * 100) : 0 },
    { stage: 'Dispatched', count: dispatchedFunnelOrders, pct: totalFunnelOrders > 0 ? Math.round((dispatchedFunnelOrders / totalFunnelOrders) * 100) : 0 },
    { stage: 'Delivered', count: deliveredFunnelOrders, pct: totalFunnelOrders > 0 ? Math.round((deliveredFunnelOrders / totalFunnelOrders) * 100) : 0 }
  ];

  // 8. 12-Month Profit Trends
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
  twelveMonthsAgo.setDate(1);
  twelveMonthsAgo.setHours(0,0,0,0);

  const monthlyPLData = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(twelveMonthsAgo.getFullYear(), twelveMonthsAgo.getMonth() + i, 1);
    const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
    
    const monthlyPL = await calculatePLSummary({ start: d, end: mEnd });
    
    monthlyPLData.push({
      month: d.toLocaleString('default', { month: 'short', year: '2-digit' }),
      revenue: monthlyPL.revenue,
      grossProfit: monthlyPL.grossProfit,
      netProfit: monthlyPL.netProfit,
      importValue: monthlyPL.importCOGS
    });
  }

  return {
    kpis: {
      revenue: { current: currentPL.revenue, growth: Math.round(revGrowth * 100) / 100 },
      orders: { current: currentOrderCount, growth: Math.round(orderGrowth * 100) / 100 },
      grossMargin: { current: currentPL.grossMargin, growth: Math.round(grossMarginGrowth * 100) / 100 },
      newCustomers: { current: customerAcquisitions, growth: Math.round(customerAcqGrowth * 100) / 100 },
      repeatCustomerRate: { current: Math.round(repeatCustomerRate * 100) / 100, growth: Math.round(repeatRateGrowth * 100) / 100 },
      importExportRatio: { current: Math.round(importExportRatio * 100) / 100, growth: Math.round(ratioGrowth * 100) / 100 }
    },
    monthlyTrend: monthlyPLData,
    tradeCorridors,
    funnel: funnelData
  };
};

module.exports = { aggregateAnalytics };
