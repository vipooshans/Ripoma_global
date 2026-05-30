/**
 * Dynamically generates 3 conditional text insights based on aggregated report data.
 * 
 * @param {object} data - Aggregated analytics data from businessAnalyticsAggregator
 * @returns {string[]} Array of 3 insight strings
 */
const generateInsights = (data) => {
  const insights = [];

  const revGrowth = data.kpis?.revenue?.growth || 0;
  const orderGrowth = data.kpis?.orders?.growth || 0;
  const margin = data.kpis?.grossMargin?.current || 0;
  const marginGrowth = data.kpis?.grossMargin?.growth || 0;
  const repeatRate = data.kpis?.repeatCustomerRate?.current || 0;
  const repeatGrowth = data.kpis?.repeatCustomerRate?.growth || 0;
  const importExportRatio = data.kpis?.importExportRatio?.current || 0;

  // 1. Revenue and Orders Insight
  if (revGrowth > 5) {
    if (orderGrowth > 5) {
      insights.push(`Revenue increased by ${revGrowth.toFixed(1)}% this period, strongly supported by a ${orderGrowth.toFixed(1)}% surge in sales order volume.`);
    } else {
      insights.push(`Revenue grew by ${revGrowth.toFixed(1)}% despite flat order volumes, indicating a higher average transaction value per customer.`);
    }
  } else if (revGrowth < -5) {
    insights.push(`Revenue fell ${Math.abs(revGrowth).toFixed(1)}% compared to the prior period, indicating slowing sales momentum. Consider customer promotional campaigns.`);
  } else {
    insights.push(`Revenue remained relatively stable (growth of ${revGrowth.toFixed(1)}%), representing a steady operational holding pattern.`);
  }

  // 2. Margin / Cost Insight
  if (marginGrowth > 2) {
    insights.push(`Gross margin expanded by ${marginGrowth.toFixed(1)} percentage points to ${margin.toFixed(1)}%, suggesting improved procurement pricing or lower logistics costs.`);
  } else if (marginGrowth < -2) {
    insights.push(`Gross margin contracted by ${Math.abs(marginGrowth).toFixed(1)} percentage points. Import costs and customs tariffs are rising faster than sales prices.`);
  } else {
    insights.push(`Gross margin remains solid at ${margin.toFixed(1)}%, showing excellent pricing stability across standard import and export transactions.`);
  }

  // 3. Customer / Logistics Corridor Insight
  const topCorridor = data.tradeCorridors && data.tradeCorridors.length > 0 ? data.tradeCorridors[0] : null;
  
  if (topCorridor && topCorridor.count > 3) {
    insights.push(`The trade corridor "${topCorridor.corridor}" is currently our highest-volume logistics channel, logging ${topCorridor.count} shipments this period.`);
  } else if (repeatRate > 40) {
    insights.push(`Our repeat customer rate stands at a high ${repeatRate.toFixed(1)}% (${repeatGrowth >= 0 ? '+' : ''}${repeatGrowth.toFixed(1)}% change), demonstrating strong client loyalty and recurring contracts.`);
  } else if (importExportRatio > 1.2) {
    insights.push(`The import-to-export value ratio has risen to ${importExportRatio.toFixed(2)}, indicating heavy cash outflows on stock purchases. Watch net cash position closely.`);
  } else {
    insights.push(`Logistics performance remains stable across all active corridors. Recommend monitoring carrier on-time rates for scheduled weekly arrivals.`);
  }

  // Ensure we return exactly 3 insights
  while (insights.length < 3) {
    insights.push("Continue tracking monthly shipping schedules and accounts receivables to optimize working capital cycles.");
  }

  return insights.slice(0, 3);
};

module.exports = { generateInsights };
