const Settings = require('../models/Settings');
const ExchangeRate = require('../models/ExchangeRate');

// Simple 5-second in-memory cache for base currency to avoid excessive DB queries
let cachedBaseCurrency = null;
let cacheTime = 0;

async function getBaseCurrency() {
  if (cachedBaseCurrency && Date.now() - cacheTime < 5000) {
    return cachedBaseCurrency;
  }
  const setting = await Settings.findOne({ key: 'baseCurrency' });
  cachedBaseCurrency = setting ? setting.value : 'USD';
  cacheTime = Date.now();
  return cachedBaseCurrency;
}

function setCachedBaseCurrency(val) {
  cachedBaseCurrency = val;
  cacheTime = Date.now();
}

const baseCurrencyMiddleware = async function (next) {
  try {
    const baseCurrency = await getBaseCurrency();
    
    // Determine the relevant document date
    let docDate = new Date();
    if (this.constructor.modelName === 'Payment') {
      docDate = this.paymentDate || this.createdAt || new Date();
    } else if (this.constructor.modelName === 'Expense') {
      docDate = this.expenseDate || this.createdAt || new Date();
    } else if (this.constructor.modelName === 'TaxDutyRecord') {
      docDate = this.paidDate || this.filedDate || this.dueDate || this.createdAt || new Date();
    }

    if (this.currency === baseCurrency) {
      this.exchangeRate = 1;
      this.amountInBaseCurrency = this.amount;
    } else {
      // Lookup exchange rate for docDate
      const targetDate = new Date(docDate);
      const startOfDay = new Date(targetDate);
      startOfDay.setUTCHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setUTCHours(23, 59, 59, 999);

      let doc = await ExchangeRate.findOne({
        date: { $gte: startOfDay, $lte: endOfDay }
      });

      if (!doc) {
        // Fallback to closest past date
        doc = await ExchangeRate.findOne({
          date: { $lte: targetDate }
        }).sort({ date: -1 });

        if (!doc) {
          // Absolute fallback: most recent rate of any date
          doc = await ExchangeRate.findOne().sort({ date: -1 });
        }
      }

      if (doc) {
        const rates = doc.rates;
        // Open Exchange Rates is USD-based, so:
        const rateBase = baseCurrency === 'USD' ? 1 : (rates.get ? rates.get(baseCurrency) : rates[baseCurrency]);
        const rateCurr = this.currency === 'USD' ? 1 : (rates.get ? rates.get(this.currency) : rates[this.currency]);

        if (rateBase && rateCurr) {
          this.exchangeRate = rateBase / rateCurr;
          this.amountInBaseCurrency = Math.round((this.amount * this.exchangeRate) * 100) / 100;
        } else {
          console.warn(`[WARNING] Middleware currency conversion rates missing for base: ${baseCurrency}, curr: ${this.currency}`);
          this.exchangeRate = this.exchangeRate || 1;
          this.amountInBaseCurrency = Math.round((this.amount * this.exchangeRate) * 100) / 100;
        }
      } else {
        console.warn(`[WARNING] Middleware exchange rate record not found for date ${docDate.toDateString()}`);
        this.exchangeRate = this.exchangeRate || 1;
        this.amountInBaseCurrency = Math.round((this.amount * this.exchangeRate) * 100) / 100;
      }
    }
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  baseCurrencyMiddleware,
  getBaseCurrency,
  setCachedBaseCurrency
};
