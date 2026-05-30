const ExchangeRate = require('../models/ExchangeRate');

/**
 * Converts an amount from one currency to another using the ExchangeRate cache.
 * Falls back to the closest past date rate if an exact match is not found.
 * 
 * @param {number} amount - Amount to convert
 * @param {string} from - Source currency code (e.g. 'USD', 'EUR')
 * @param {string} to - Target currency code
 * @param {Date|string} [date] - Historical date to use (defaults to today)
 * @returns {Promise<{result: number, rate: number}>} Converted result and the rate used (to / from)
 */
const convert = async (amount, from, to, date = new Date()) => {
  if (from === to) {
    return { result: amount, rate: 1 };
  }

  const targetDate = new Date(date);
  const startOfDay = new Date(targetDate);
  startOfDay.setUTCHours(0, 0, 0, 0);
  const endOfDay = new Date(targetDate);
  endOfDay.setUTCHours(23, 59, 59, 999);

  // 1. Try to find exact rate for that day
  let doc = await ExchangeRate.findOne({
    date: { $gte: startOfDay, $lte: endOfDay }
  });

  if (!doc) {
    // 2. Try to find closest past rate
    doc = await ExchangeRate.findOne({
      date: { $lte: targetDate }
    }).sort({ date: -1 });

    if (!doc) {
      // 3. Fallback to any recent rate
      doc = await ExchangeRate.findOne().sort({ date: -1 });
    }

    if (doc) {
      console.warn(`[WARNING] Exchange rate not found for date ${targetDate.toDateString()}. Using closest available rate from ${doc.date.toDateString()}.`);
    }
  }

  if (!doc) {
    console.warn(`[WARNING] No exchange rates found in database. Defaulting to 1:1 conversion for ${from} to ${to}.`);
    return { result: amount, rate: 1 };
  }

  const rates = doc.rates;
  
  // Open Exchange Rates is USD-based, so rates.USD = 1.
  const rateFrom = from === 'USD' ? 1 : (rates.get ? rates.get(from) : rates[from]);
  const rateTo = to === 'USD' ? 1 : (rates.get ? rates.get(to) : rates[to]);

  if (!rateFrom || !rateTo) {
    console.warn(`[WARNING] Exchange rate for ${from} or ${to} not found in rate doc from ${doc.date.toDateString()}. Defaulting to 1:1.`);
    return { result: amount, rate: 1 };
  }

  // exchangeRate from C to B is rate_of_B / rate_of_C
  const rate = rateTo / rateFrom;
  const result = Math.round((amount * rate) * 100) / 100;
  return { result, rate };
};

module.exports = convert;
