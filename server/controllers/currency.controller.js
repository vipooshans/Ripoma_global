const ExchangeRate = require('../models/ExchangeRate');
const Settings = require('../models/Settings');
const convert = require('../utils/currencyConverter');
const { getBaseCurrency, setCachedBaseCurrency } = require('../utils/baseCurrencyMiddleware');
const Payment = require('../models/Payment');
const Expense = require('../models/Expense');
const TaxDutyRecord = require('../models/TaxDutyRecord');

// Background job for currency recalculation
const recalculateBaseCurrencyJob = async (newBaseCurrency) => {
  try {
    console.log(`[JOB] Starting base currency recalculation to: ${newBaseCurrency}...`);
    // Clear and set local base currency cache
    setCachedBaseCurrency(newBaseCurrency);

    // Load all items
    const payments = await Payment.find({});
    const expenses = await Expense.find({});
    const taxDutyRecords = await TaxDutyRecord.find({});

    console.log(`[JOB] Recalculating: ${payments.length} payments, ${expenses.length} expenses, ${taxDutyRecords.length} taxes...`);

    // We call save() on each. Mongoose pre-save middleware will automatically run 
    // and recompute amountInBaseCurrency & exchangeRate in terms of the new base currency!
    for (const payment of payments) {
      await payment.save();
    }
    for (const expense of expenses) {
      await expense.save();
    }
    for (const record of taxDutyRecords) {
      await record.save();
    }

    console.log(`[JOB] Base currency recalculation complete. Successfully updated all transactions to ${newBaseCurrency}.`);
  } catch (error) {
    console.error('[JOB ERROR] Base currency recalculation failed:', error);
  }
};

// GET /api/currency/rates
exports.getRates = async (req, res) => {
  try {
    // Return latest ExchangeRate record
    const latest = await ExchangeRate.findOne().sort({ date: -1 });
    if (!latest) {
      return res.status(404).json({ message: 'No exchange rates found in database.' });
    }
    return res.status(200).json(latest);
  } catch (error) {
    console.error('Get Rates Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// GET /api/currency/rates/history
exports.getRatesHistory = async (req, res) => {
  try {
    const history = await ExchangeRate.find()
      .sort({ date: -1 })
      .limit(35);
    
    // Reverse to chronological order (ascending date)
    history.reverse();
    
    return res.status(200).json(history);
  } catch (error) {
    console.error('Get Rates History Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// GET /api/currency/rates/:date
exports.getRatesByDate = async (req, res) => {
  try {
    const targetDate = new Date(req.params.date);
    if (isNaN(targetDate.getTime())) {
      return res.status(400).json({ message: 'Invalid date parameter.' });
    }

    const start = new Date(targetDate);
    start.setUTCHours(0,0,0,0);
    const end = new Date(targetDate);
    end.setUTCHours(23,59,59,999);

    let doc = await ExchangeRate.findOne({ date: { $gte: start, $lte: end } });
    if (!doc) {
      doc = await ExchangeRate.findOne({ date: { $lte: targetDate } }).sort({ date: -1 });
    }

    if (!doc) {
      return res.status(404).json({ message: 'No rates found near this date.' });
    }

    return res.status(200).json(doc);
  } catch (error) {
    console.error('Get Rates By Date Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// POST /api/currency/convert
exports.convertAmount = async (req, res) => {
  try {
    const { amount, from, to, date } = req.body;
    if (amount === undefined || !from || !to) {
      return res.status(400).json({ message: 'amount, from, and to are required fields.' });
    }

    const val = parseFloat(amount);
    if (isNaN(val)) {
      return res.status(400).json({ message: 'Amount must be a numeric value.' });
    }

    const targetDate = date ? new Date(date) : new Date();
    const { result, rate } = await convert(val, from, to, targetDate);

    return res.status(200).json({ result, rate });
  } catch (error) {
    console.error('Convert Amount Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// POST /api/currency/rates/refresh
exports.refreshRates = async (req, res) => {
  try {
    const { fetchExchangeRates } = require('../jobs/exchangeRateFetch');
    
    // Explicitly call the fetch function
    const rates = await fetchExchangeRates();
    if (!rates) {
      return res.status(500).json({ message: 'Failed to refresh exchange rates from external API.' });
    }

    return res.status(200).json({
      message: 'Exchange rates successfully refreshed from Open Exchange Rates API.',
      rates
    });
  } catch (error) {
    console.error('Manual Rate Refresh Error:', error);
    return res.status(500).json({ message: error.message || 'Internal server error' });
  }
};

// GET /api/currency/base
exports.getBaseSettings = async (req, res) => {
  try {
    const base = await getBaseCurrency();
    return res.status(200).json({ baseCurrency: base });
  } catch (error) {
    console.error('Get Base Currency Settings Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// POST /api/currency/base
exports.updateBaseSettings = async (req, res) => {
  try {
    const { baseCurrency } = req.body;
    if (!baseCurrency) {
      return res.status(400).json({ message: 'baseCurrency is required.' });
    }

    const supported = ['USD', 'EUR', 'GBP', 'SGD', 'CNY', 'JPY', 'AUD', 'CAD', 'MYR', 'IDR', 'THB', 'INR', 'AED', 'SAR'];
    if (!supported.includes(baseCurrency.toUpperCase())) {
      return res.status(400).json({ message: 'Unsupported base currency.' });
    }

    const upperCurrency = baseCurrency.toUpperCase();

    // 1. Save in settings
    await Settings.findOneAndUpdate(
      { key: 'baseCurrency' },
      { value: upperCurrency },
      { upsert: true, new: true }
    );

    // 2. Trigger asynchronous background recalculation job
    recalculateBaseCurrencyJob(upperCurrency);

    return res.status(200).json({
      message: `Base currency successfully changed to ${upperCurrency}. Starting background recalculation job for existing transactions.`,
      baseCurrency: upperCurrency
    });
  } catch (error) {
    console.error('Update Base Currency Settings Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
