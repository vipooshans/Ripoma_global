const cron = require('node-cron');
const axios = require('axios');
const ExchangeRate = require('../models/ExchangeRate');

const SUPPORTED_CURRENCIES = [
  'USD', 'EUR', 'GBP', 'SGD', 'CNY', 'JPY',
  'AUD', 'CAD', 'MYR', 'IDR', 'THB', 'INR',
  'AED', 'SAR'
];

/**
 * Connects to Open Exchange Rates API to pull currency maps, filtering for our supported currencies,
 * and saving a new ExchangeRate document.
 * 
 * @returns {Promise<object|null>} The saved ExchangeRate document
 */
const fetchExchangeRates = async () => {
  const appId = process.env.OPEN_EXCHANGE_RATES_APP_ID;
  if (!appId) {
    console.warn('[CRON WARNING] OPEN_EXCHANGE_RATES_APP_ID is not configured in .env. Skipping external rates API fetch.');
    return seedTodayMockRate();
  }

  try {
    console.log('[CRON] Querying latest exchange rates from Open Exchange Rates...');
    const url = `https://openexchangerates.org/api/latest.json?app_id=${appId}`;
    const response = await axios.get(url);

    if (response.data && response.data.rates) {
      const filteredRates = {};
      
      SUPPORTED_CURRENCIES.forEach(curr => {
        if (response.data.rates[curr] !== undefined) {
          filteredRates[curr] = response.data.rates[curr];
        }
      });

      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);

      const doc = await ExchangeRate.findOneAndUpdate(
        { date: today },
        {
          baseCurrency: 'USD',
          rates: filteredRates,
          source: 'openexchangerates',
          fetchedAt: new Date()
        },
        { upsert: true, new: true }
      );

      console.log(`[CRON] Exchange rates fetched successfully for date: ${doc.date.toDateString()}`);
      return doc;
    }
    return null;
  } catch (error) {
    console.error('[CRON ERROR] Failed to fetch exchange rates from Open Exchange Rates:', error.message);
    // If it fails (rate limit, offline, etc.), fall back to today's mock rates to ensure system remains functional
    return seedTodayMockRate();
  }
};

/**
 * Fallback to seed today's mock rate if API key is missing or calls fail.
 */
const seedTodayMockRate = async () => {
  console.log('[CRON] Seeding today\'s mock rates as fallback...');
  const mockRates = {
    USD: 1, EUR: 0.92, GBP: 0.79, SGD: 1.35, CNY: 7.24, JPY: 156.85,
    AUD: 1.51, CAD: 1.37, MYR: 4.71, IDR: 16250, THB: 36.75, INR: 83.35,
    AED: 3.67, SAR: 3.75
  };

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  // Add a very small random fluctuation to make it dynamic
  const fluctuatedRates = { ...mockRates };
  for (const curr of Object.keys(fluctuatedRates)) {
    if (curr !== 'USD') {
      const variation = 1 + (Math.random() * 0.02 - 0.01); // +/- 1%
      fluctuatedRates[curr] = Math.round(mockRates[curr] * variation * 10000) / 10000;
    }
  }

  const doc = await ExchangeRate.findOneAndUpdate(
    { date: today },
    {
      baseCurrency: 'USD',
      rates: fluctuatedRates,
      source: 'mock_fallback',
      fetchedAt: new Date()
    },
    { upsert: true, new: true }
  );

  console.log(`[CRON] Mock fallback exchange rates saved for: ${doc.date.toDateString()}`);
  return doc;
};

/**
 * Seeds historical exchange rates for the last 35 days if none exist in the database.
 */
const seedExchangeRates = async () => {
  try {
    const count = await ExchangeRate.countDocuments();
    if (count > 0) {
      console.log('[SEED] Exchange rates database already contains records. Seeding skipped.');
      return;
    }

    console.log('[SEED] Seeding historical exchange rates for the last 35 days...');
    const mockRates = {
      USD: 1, EUR: 0.92, GBP: 0.79, SGD: 1.35, CNY: 7.24, JPY: 156.85,
      AUD: 1.51, CAD: 1.37, MYR: 4.71, IDR: 16250, THB: 36.75, INR: 83.35,
      AED: 3.67, SAR: 3.75
    };

    const today = new Date();
    for (let i = 35; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      d.setUTCHours(0, 0, 0, 0);

      // Fluctuate the mock rate by +/- 2.5% for visual authenticity
      const fluctuatedRates = { ...mockRates };
      for (const curr of Object.keys(fluctuatedRates)) {
        if (curr !== 'USD') {
          const variation = 1 + (Math.random() * 0.05 - 0.025);
          fluctuatedRates[curr] = Math.round(mockRates[curr] * variation * 10000) / 10000;
        }
      }

      await ExchangeRate.create({
        baseCurrency: 'USD',
        date: d,
        rates: fluctuatedRates,
        source: 'mock_seed',
        fetchedAt: new Date()
      });
    }
    console.log('[SEED] Successfully seeded historical exchange rates.');
  } catch (error) {
    console.error('[SEED ERROR] Failed to seed historical exchange rates:', error);
  }
};

/**
 * Initializes the exchange rate cron. Runs daily at 00:30.
 */
const initExchangeRateCron = () => {
  cron.schedule('30 0 * * *', async () => {
    await fetchExchangeRates();
  });
  console.log('[CRON] Daily exchange rate fetch job (00:30) initialized.');
};

module.exports = {
  initExchangeRateCron,
  fetchExchangeRates,
  seedTodayMockRate,
  seedExchangeRates
};

