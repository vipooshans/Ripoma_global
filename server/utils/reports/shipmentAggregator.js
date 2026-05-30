const Shipment = require('../../models/Shipment');
const mongoose = require('mongoose');

/**
 * Aggregates shipment data from the Shipment collection.
 * 
 * @param {object} params
 * @param {Date} params.dateFrom
 * @param {Date} params.dateTo
 * @param {'inbound'|'outbound'|'all'} params.direction
 * @param {string[]} [params.carriers]
 * @param {string[]} [params.shippingMethods]
 * @returns {Promise<object>} Aggregated shipment report data
 */
const aggregateShipments = async ({ dateFrom, dateTo, direction = 'all', carriers = [], shippingMethods = [] }) => {
  const start = new Date(dateFrom);
  const end = new Date(dateTo);
  
  // Base match filter
  const matchFilter = {
    createdAt: { $gte: start, $lte: end }
  };

  if (direction !== 'all') {
    matchFilter.direction = direction;
  }

  if (carriers && carriers.length > 0) {
    matchFilter.carrierName = { $in: carriers };
  }

  if (shippingMethods && shippingMethods.length > 0) {
    matchFilter.shippingMethod = { $in: shippingMethods };
  }

  // 1. Overall KPIs
  const shipmentsList = await Shipment.find(matchFilter);
  const totalShipments = shipmentsList.length;

  let onTimeCount = 0;
  let delayedCount = 0;
  let transitDaysSum = 0;
  let deliveredCount = 0;

  shipmentsList.forEach(s => {
    // Check if delayed
    if (s.isDelayed === true || s.status === 'exception') {
      delayedCount++;
    } else if (s.status === 'delivered') {
      if (s.actualArrivalDate && s.estimatedArrivalDate && s.actualArrivalDate <= s.estimatedArrivalDate) {
        onTimeCount++;
      } else if (s.actualArrivalDate && s.estimatedArrivalDate && s.actualArrivalDate > s.estimatedArrivalDate) {
        delayedCount++;
      } else {
        onTimeCount++;
      }
    } else {
      // Scheduled/In transit and not flagged delayed
      onTimeCount++;
    }

    // Transit days for delivered shipments
    if (s.status === 'delivered' && s.actualArrivalDate && s.departureDate) {
      const diffTime = Math.abs(s.actualArrivalDate - s.departureDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      transitDaysSum += diffDays;
      deliveredCount++;
    }
  });

  const onTimeRate = totalShipments > 0 ? (onTimeCount / totalShipments) * 100 : 100;
  const avgTransitDays = deliveredCount > 0 ? transitDaysSum / deliveredCount : 0;

  // 2. Monthly Trend (stacked volume by direction + on-time vs delayed counts)
  const trendPipeline = [
    { $match: matchFilter },
    {
      $group: {
        _id: {
          month: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          direction: '$direction'
        },
        count: { $sum: 1 },
        delayed: {
          $sum: {
            $cond: [
              { $or: [{ $eq: ['$isDelayed', true] }, { $eq: ['$status', 'exception'] }] },
              1,
              0
            ]
          }
        }
      }
    },
    { $sort: { '_id.month': 1 } }
  ];
  const trendAgg = await Shipment.aggregate(trendPipeline);

  // Parse trend data into flat array
  const monthlyTrendMap = {};
  trendAgg.forEach(item => {
    const month = item._id.month;
    if (!monthlyTrendMap[month]) {
      monthlyTrendMap[month] = { month, inbound: 0, outbound: 0, total: 0, delayed: 0, onTime: 0 };
    }
    
    if (item._id.direction === 'inbound') {
      monthlyTrendMap[month].inbound += item.count;
    } else {
      monthlyTrendMap[month].outbound += item.count;
    }
    monthlyTrendMap[month].total += item.count;
    monthlyTrendMap[month].delayed += item.delayed;
    monthlyTrendMap[month].onTime += (item.count - item.delayed);
  });
  const monthlyTrend = Object.values(monthlyTrendMap);

  // 3. Carrier Performance Aggregator
  const carrierPipeline = [
    { $match: matchFilter },
    {
      $group: {
        _id: '$carrierName',
        totalShipments: { $sum: 1 },
        delayed: {
          $sum: {
            $cond: [
              { $or: [{ $eq: ['$isDelayed', true] }, { $eq: ['$status', 'exception'] }] },
              1,
              0
            ]
          }
        },
        deliveredCount: {
          $sum: {
            $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0]
          }
        },
        // We accumulate diff in days using $let and date operators
        totalTransitDays: {
          $sum: {
            $cond: [
              { $and: [{ $eq: ['$status', 'delivered'] }, { $ifNull: ['$actualArrivalDate', false] }, { $ifNull: ['$departureDate', false] }] },
              { $divide: [{ $subtract: ['$actualArrivalDate', '$departureDate'] }, 1000 * 60 * 60 * 24] },
              0
            ]
          }
        }
      }
    },
    {
      $project: {
        carrier: '$_id',
        totalShipments: 1,
        onTime: { $subtract: ['$totalShipments', '$delayed'] },
        delayed: 1,
        onTimeRate: {
          $cond: [
            { $gt: ['$totalShipments', 0] },
            { $multiply: [{ $divide: [{ $subtract: ['$totalShipments', '$delayed'] }, '$totalShipments'] }, 100] },
            100
          ]
        },
        avgTransitDays: {
          $cond: [
            { $gt: ['$deliveredCount', 0] },
            { $divide: ['$totalTransitDays', '$deliveredCount'] },
            0
          ]
        },
        _id: 0
      }
    },
    { $sort: { totalShipments: -1 } }
  ];
  const carrierPerformance = await Shipment.aggregate(carrierPipeline);

  // 4. Route Volume Table
  const routePipeline = [
    { $match: matchFilter },
    {
      $group: {
        _id: {
          origin: '$origin.name',
          destination: '$destination.name',
          direction: '$direction'
        },
        count: { $sum: 1 },
        deliveredCount: {
          $sum: {
            $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0]
          }
        },
        totalTransitDays: {
          $sum: {
            $cond: [
              { $and: [{ $eq: ['$status', 'delivered'] }, { $ifNull: ['$actualArrivalDate', false] }, { $ifNull: ['$departureDate', false] }] },
              { $divide: [{ $subtract: ['$actualArrivalDate', '$departureDate'] }, 1000 * 60 * 60 * 24] },
              0
            ]
          }
        }
      }
    },
    {
      $project: {
        origin: '$_id.origin',
        destination: '$_id.destination',
        direction: '$_id.direction',
        shipments: '$count',
        avgTransitDays: {
          $cond: [
            { $gt: ['$deliveredCount', 0] },
            { $divide: ['$totalTransitDays', '$deliveredCount'] },
            0
          ]
        },
        _id: 0
      }
    },
    { $sort: { shipments: -1 } }
  ];
  const routeVolume = await Shipment.aggregate(routePipeline);

  return {
    kpis: {
      totalShipments,
      onTimeCount,
      delayedCount,
      onTimeRate: Math.round(onTimeRate * 100) / 100,
      avgTransitDays: Math.round(avgTransitDays * 10) / 10
    },
    monthlyTrend,
    carrierPerformance: carrierPerformance.map(c => ({
      ...c,
      onTimeRate: Math.round(c.onTimeRate * 100) / 100,
      avgTransitDays: Math.round(c.avgTransitDays * 10) / 10
    })),
    routeVolume: routeVolume.map(r => ({
      ...r,
      avgTransitDays: Math.round(r.avgTransitDays * 10) / 10
    }))
  };
};

module.exports = { aggregateShipments };
