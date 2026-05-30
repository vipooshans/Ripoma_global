import React, { useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';

const CurrencyRateChart = ({ ratesHistory }) => {
  const currencies = [
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

  const [selectedCurr, setSelectedCurr] = useState('EUR');

  // Format data for Recharts
  const chartData = (ratesHistory || [])
    .map(doc => {
      const dateLabel = new Date(doc.date).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric'
      });
      
      const rates = doc.rates || {};
      const rawRate = rates[selectedCurr] || 1;
      
      return {
        date: dateLabel,
        // Show rate per 1 USD
        rate: parseFloat(rawRate.toFixed(4)),
        // Also show value in USD (inverse)
        valueInUSD: parseFloat((1 / rawRate).toFixed(4)),
        timestamp: new Date(doc.date).getTime()
      };
    })
    .sort((a, b) => a.timestamp - b.timestamp); // Sort chronologically

  const currentCurrencyName = currencies.find(c => c.code === selectedCurr)?.name || '';

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-extrabold text-slate-800 text-sm">Historical Currency Trend</h3>
          <p className="text-[10px] text-slate-450">Trailing 30-day exchange rates comparison vs USD.</p>
        </div>
        <div>
          <select
            value={selectedCurr}
            onChange={(e) => setSelectedCurr(e.target.value)}
            className="text-xs font-bold text-slate-700 bg-white border border-slate-250 rounded-lg py-1.5 px-3 focus:outline-none focus:ring-1 focus:ring-teal-500"
          >
            {currencies.map(c => (
              <option key={c.code} value={c.code}>
                {c.code} — {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="h-[250px] w-full text-xs font-semibold">
        {chartData.length === 0 ? (
          <div className="h-full w-full flex items-center justify-center border border-dashed border-slate-200 rounded-xl text-slate-400">
            No historical rate data available.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="date" stroke="#94A3B8" fontSize={9} tickLine={false} />
              <YAxis 
                stroke="#94A3B8" 
                fontSize={9} 
                tickLine={false}
                domain={['auto', 'auto']}
              />
              <Tooltip
                contentStyle={{ fontSize: '11px', borderRadius: '8px', borderColor: '#E2E8F0', backgroundColor: '#FFF' }}
                formatter={(value, name) => {
                  if (name === 'rate') {
                    return [value, `${selectedCurr} per 1 USD`];
                  }
                  return [`$${value}`, `Value of 1 ${selectedCurr} in USD`];
                }}
              />
              <Line 
                type="monotone" 
                dataKey="rate" 
                stroke="#0D9488" 
                strokeWidth={3} 
                activeDot={{ r: 5 }} 
                dot={{ strokeWidth: 1.5, r: 2.5 }} 
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
      
      {chartData.length > 0 && (
        <div className="pt-2 text-center text-[10px] text-slate-450 border-t border-slate-100 flex justify-around">
          <div>
            Min: <span className="font-mono font-bold text-slate-700">{Math.min(...chartData.map(d => d.rate))} {selectedCurr}</span>
          </div>
          <div>
            Max: <span className="font-mono font-bold text-slate-700">{Math.max(...chartData.map(d => d.rate))} {selectedCurr}</span>
          </div>
          <div>
            Current: <span className="font-mono font-bold text-teal-600">{chartData[chartData.length - 1]?.rate} {selectedCurr}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default CurrencyRateChart;
