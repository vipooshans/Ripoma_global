const ExportOrder = require('../../models/ExportOrder');
const Customer = require('../../models/Customer');
const Product = require('../../models/Product');
const mongoose = require('mongoose');

/**
 * Aggregates sales data from ExportOrders based on date range and group by key.
 * 
 * @param {object} params
 * @param {Date} params.dateFrom
 * @param {Date} params.dateTo
 * @param {'month'|'customer'|'product'|'country'} params.groupBy
 * @returns {Promise<object>} Aggregated sales report data
 */
const aggregateSales = async ({ dateFrom, dateTo, groupBy = 'month' }) => {
  const start = new Date(dateFrom);
  const end = new Date(dateTo);
  
  // Base match filter (only count delivered orders in date range)
  const matchFilter = {
    status: 'delivered',
    orderDate: { $gte: start, $lte: end }
  };

  // 1. Overall Summary KPIs
  const kpiPipeline = [
    { $match: matchFilter },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$grandTotal' },
        orderCount: { $sum: 1 },
        avgOrderValue: { $avg: '$grandTotal' }
      }
    }
  ];
  
  const [overallKPIs] = await ExportOrder.aggregate(kpiPipeline);
  const totalRevenue = overallKPIs?.totalRevenue || 0;
  const orderCount = overallKPIs?.orderCount || 0;
  const avgOrderValue = overallKPIs?.avgOrderValue || 0;

  // 2. Top 10 Customers (Aggregated by total revenue)
  const customerPipeline = [
    { $match: matchFilter },
    {
      $group: {
        _id: '$customer',
        ordersCount: { $sum: 1 },
        revenue: { $sum: '$grandTotal' },
        avgOrderValue: { $avg: '$grandTotal' }
      }
    },
    { $sort: { revenue: -1 } },
    { $limit: 10 },
    {
      $lookup: {
        from: 'customers',
        localField: '_id',
        foreignField: '_id',
        as: 'customerDetails'
      }
    },
    { $unwind: { path: '$customerDetails', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        customerId: '$_id',
        name: { $ifNull: ['$customerDetails.companyName', '$customerDetails.name', 'Unknown Customer'] },
        country: { $ifNull: ['$customerDetails.country', 'N/A'] },
        orders: '$ordersCount',
        revenue: 1,
        avgOrderValue: 1
      }
    }
  ];
  const topCustomers = await ExportOrder.aggregate(customerPipeline);

  // 3. Top 10 Products (Aggregated by units sold and revenue)
  const productPipeline = [
    { $match: matchFilter },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.product',
        unitsSold: { $sum: '$items.quantityOrdered' },
        revenue: { $sum: '$items.lineTotal' },
        avgPrice: { $avg: '$items.unitPrice' }
      }
    },
    { $sort: { revenue: -1 } },
    { $limit: 10 },
    {
      $lookup: {
        from: 'products',
        localField: '_id',
        foreignField: '_id',
        as: 'productDetails'
      }
    },
    { $unwind: { path: '$productDetails', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        productId: '$_id',
        name: { $ifNull: ['$productDetails.name', 'Unknown Product'] },
        sku: { $ifNull: ['$productDetails.sku', 'N/A'] },
        unitsSold: 1,
        revenue: 1,
        avgPrice: 1
      }
    }
  ];
  const topProducts = await ExportOrder.aggregate(productPipeline);

  // 4. Monthly trend
  const trendPipeline = [
    { $match: matchFilter },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m', date: '$orderDate' } },
        revenue: { $sum: '$grandTotal' },
        orders: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } },
    {
      $project: {
        month: '$_id',
        revenue: 1,
        orders: 1,
        _id: 0
      }
    }
  ];
  const monthlyTrend = await ExportOrder.aggregate(trendPipeline);

  // 5. Country breakdown
  const countryPipeline = [
    { $match: matchFilter },
    {
      $lookup: {
        from: 'customers',
        localField: 'customer',
        foreignField: '_id',
        as: 'customerDetails'
      }
    },
    { $unwind: { path: '$customerDetails', preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id: { $ifNull: ['$customerDetails.country', 'Unknown'] },
        orders: { $sum: 1 },
        revenue: { $sum: '$grandTotal' }
      }
    },
    { $sort: { revenue: -1 } },
    {
      $project: {
        country: '$_id',
        orders: 1,
        revenue: 1,
        _id: 0
      }
    }
  ];
  const countryBreakdown = await ExportOrder.aggregate(countryPipeline);

  // 6. Dynamic Group By Table Details
  let tableData = [];
  
  if (groupBy === 'month') {
    // Return monthly details with growth metrics
    tableData = monthlyTrend.map((m, idx, arr) => {
      const prev = arr[idx - 1];
      const growth = prev && prev.revenue > 0 
        ? ((m.revenue - prev.revenue) / prev.revenue) * 100 
        : 0;
        
      return {
        month: m.month,
        orders: m.orders,
        revenue: Math.round(m.revenue * 100) / 100,
        avgOrderValue: Math.round((m.revenue / m.orders) * 100) / 100,
        growth: Math.round(growth * 100) / 100
      };
    });
    // Reverse table data so latest is first
    tableData.reverse();
  } else if (groupBy === 'customer') {
    // Aggregate all customer data for this period
    const allCustomerPipeline = [
      { $match: matchFilter },
      {
        $group: {
          _id: '$customer',
          orders: { $sum: 1 },
          revenue: { $sum: '$grandTotal' },
          avgOrderValue: { $avg: '$grandTotal' }
        }
      },
      {
        $lookup: {
          from: 'customers',
          localField: '_id',
          foreignField: '_id',
          as: 'customerDetails'
        }
      },
      { $unwind: { path: '$customerDetails', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          customer: { $ifNull: ['$customerDetails.companyName', '$customerDetails.name', 'Unknown'] },
          country: { $ifNull: ['$customerDetails.country', 'N/A'] },
          orders: 1,
          revenue: 1,
          avgOrderValue: 1,
          pctTotal: {
            $cond: [
              { $gt: [totalRevenue, 0] },
              { $multiply: [{ $divide: ['$revenue', totalRevenue] }, 100] },
              0
            ]
          }
        }
      },
      { $sort: { revenue: -1 } }
    ];
    tableData = await ExportOrder.aggregate(allCustomerPipeline);
  } else if (groupBy === 'product') {
    const allProductPipeline = [
      { $match: matchFilter },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          unitsSold: { $sum: '$items.quantityOrdered' },
          revenue: { $sum: '$items.lineTotal' },
          avgPrice: { $avg: '$items.unitPrice' }
        }
      },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'productDetails'
        }
      },
      { $unwind: { path: '$productDetails', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          sku: { $ifNull: ['$productDetails.sku', 'N/A'] },
          product: { $ifNull: ['$productDetails.name', 'Unknown'] },
          unitsSold: 1,
          revenue: 1,
          avgPrice: 1,
          pctTotal: {
            $cond: [
              { $gt: [totalRevenue, 0] },
              { $multiply: [{ $divide: ['$revenue', totalRevenue] }, 100] },
              0
            ]
          }
        }
      },
      { $sort: { revenue: -1 } }
    ];
    tableData = await ExportOrder.aggregate(allProductPipeline);
  } else if (groupBy === 'country') {
    tableData = countryBreakdown.map(c => ({
      country: c.country,
      orders: c.orders,
      revenue: Math.round(c.revenue * 100) / 100,
      pctTotal: totalRevenue > 0 ? Math.round((c.revenue / totalRevenue) * 10000) / 100 : 0
    }));
  }

  // Find top customer name and product name
  const topCustomerName = topCustomers[0]?.name || 'N/A';
  const topProductName = topProducts[0]?.name || 'N/A';

  return {
    kpis: {
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      orderCount,
      avgOrderValue: Math.round(avgOrderValue * 100) / 100,
      topCustomer: topCustomerName,
      topProduct: topProductName
    },
    topCustomers,
    topProducts,
    monthlyTrend,
    countryBreakdown,
    tableData
  };
};

module.exports = { aggregateSales };
