import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

const ExchangeRateTable = ({ latestDoc, yesterdayDoc }) => {
  const currencies = [
    { code: 'USD', name: 'US Dollar' },
    { code: 'EUR', name: 'Euro' },
    { code: 'GBP', name: 'British Pound' },
    { code: 'SGD', name: 'Singapore Dollar' },
    { code: 'CNY', name: 'Chinese Yuan' },
    { code: 'JPY', name: 'Japanese Yen' },
    { code: 'AUD', name: 'Australian Dollar' },
    { code: 'CAD', name: 'Canadian Dollar' },
    { code: 'MYR', name: 'Malaysian Ringgit' },
    { code: 'IDR', name: 'Indonesian Rupiah' },
    { code: 'THB', name: 'Thai Baht' },
    { code: 'INR', name: 'Indian Rupee' },
    { code: 'AED', name: 'UAE Dirham' },
    { code: 'SAR', name: 'Saudi Riyal' }
  ];

  const rates = latestDoc?.rates || {};
  const yesterdayRates = yesterdayDoc?.rates || {};

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-slate-800 text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-150 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              <th className="py-3 px-5">Currency</th>
              <th className="py-3 px-5 text-center">Code</th>
              <th className="py-3 px-5 text-right">Rate (per 1 USD)</th>
              <th className="py-3 px-5 text-right">Inverse (USD per 1 unit)</th>
              <th className="py-3 px-5 text-center">24h Change</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-sans">
            {currencies.map(c => {
              // Open Exchange rates maps rates relative to USD.
              const rateToday = c.code === 'USD' ? 1 : rates[c.code];
              const rateYesterday = c.code === 'USD' ? 1 : yesterdayRates[c.code];
              
              if (!rateToday) return null;

              const inverse = 1 / rateToday;
              
              // Calculate 24h change
              let changeDir = 'stable';
              let percentChange = 0;
              
              if (rateYesterday && rateYesterday !== rateToday && c.code !== 'USD') {
                // Since rates is per 1 USD, if rate increases, the currency depreciates relative to USD!
                // So if rateToday > rateYesterday, it takes MORE units of C to get 1 USD, so C is DOWN.
                // Let's compute change relative to USD (value of 1 unit in USD, i.e., the inverse).
                const valToday = 1 / rateToday;
                const valYesterday = 1 / rateYesterday;
                percentChange = ((valToday - valYesterday) / valYesterday) * 100;
                
                if (percentChange > 0.005) {
                  changeDir = 'up';
                } else if (percentChange < -0.005) {
                  changeDir = 'down';
                }
              }

              return (
                <tr key={c.code} className="hover:bg-slate-50/50 transition-all">
                  <td className="py-3.5 px-5 font-bold text-slate-700">{c.name}</td>
                  <td className="py-3.5 px-5 text-center font-mono font-bold text-slate-450">{c.code}</td>
                  <td className="py-3.5 px-5 text-right font-mono font-bold">
                    {rateToday.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                  </td>
                  <td className="py-3.5 px-5 text-right font-mono font-bold text-slate-505">
                    ${inverse.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 5 })}
                  </td>
                  <td className="py-3.5 px-5 text-center shrink-0">
                    <div className="flex items-center justify-center">
                      {changeDir === 'up' && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-100">
                          <ArrowUpRight size={11} />
                          +{percentChange.toFixed(2)}%
                        </span>
                      )}
                      {changeDir === 'down' && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-rose-50 text-rose-700 border border-rose-100">
                          <ArrowDownRight size={11} />
                          {percentChange.toFixed(2)}%
                        </span>
                      )}
                      {changeDir === 'stable' && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-slate-50 text-slate-400 border border-slate-100">
                          <Minus size={11} />
                          0.00%
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ExchangeRateTable;
