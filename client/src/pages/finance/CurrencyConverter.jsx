import React, { useState, useEffect } from 'react';
import { 
  RefreshCw, 
  ArrowLeftRight, 
  Settings, 
  Globe, 
  Calendar, 
  TrendingUp, 
  Info,
  AlertTriangle,
  CheckCircle,
  HelpCircle
} from 'lucide-react';
import { 
  useCurrencyRates, 
  useCurrencyRatesHistory, 
  useBaseCurrency, 
  useConvertCurrency, 
  useRefreshRates, 
  useUpdateBaseCurrency 
} from '../../hooks/useCurrencyRates';
import ExchangeRateTable from '../../components/finance/ExchangeRateTable';
import CurrencyRateChart from '../../components/finance/CurrencyRateChart';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';

const CurrencyConverter = () => {
  const { user } = useAuth() || { user: { role: 'viewer' } };
  const isAdmin = user?.role === 'admin';

  // State for converter
  const [amount, setAmount] = useState('1000');
  const [fromCurrency, setFromCurrency] = useState('USD');
  const [toCurrency, setToCurrency] = useState('EUR');
  const [targetDate, setTargetDate] = useState('');
  const [conversionResult, setConversionResult] = useState(null);
  const [isConverting, setIsConverting] = useState(false);

  // State for base currency config
  const [newBaseCurrency, setNewBaseCurrency] = useState('');

  // Queries
  const { data: baseSettings, isLoading: isBaseLoading } = useBaseCurrency();
  const { data: history, isLoading: isHistoryLoading, refetch: refetchHistory } = useCurrencyRatesHistory();
  const { data: latestRates, isLoading: isRatesLoading, refetch: refetchRates } = useCurrencyRates();

  // Mutations
  const convertMutation = useConvertCurrency();
  const refreshRatesMutation = useRefreshRates();
  const updateBaseCurrencyMutation = useUpdateBaseCurrency();

  // Supported Currencies
  const supportedCurrencies = [
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

  // Set default new base currency once loaded
  useEffect(() => {
    if (baseSettings?.baseCurrency) {
      setNewBaseCurrency(baseSettings.baseCurrency);
    }
  }, [baseSettings]);

  // Run initial conversion once currencies are loaded
  useEffect(() => {
    handleConvert();
  }, [fromCurrency, toCurrency]);

  const handleConvert = async (e) => {
    if (e) e.preventDefault();
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount.');
      return;
    }

    try {
      setIsConverting(true);
      const res = await convertMutation.mutateAsync({
        amount: parseFloat(amount),
        from: fromCurrency,
        to: toCurrency,
        date: targetDate || undefined
      });
      setConversionResult({
        result: res.result,
        rate: res.rate,
        amount: parseFloat(amount),
        from: fromCurrency,
        to: toCurrency,
        date: targetDate || new Date().toISOString().split('T')[0]
      });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error converting currency.');
    } finally {
      setIsConverting(false);
    }
  };

  const handleSwap = () => {
    const temp = fromCurrency;
    setFromCurrency(toCurrency);
    setToCurrency(temp);
  };

  const handleRefreshRates = async () => {
    try {
      toast.loading('Refreshing exchange rates...', { id: 'refresh-rates' });
      await refreshRatesMutation.mutateAsync();
      toast.success('Rates refreshed successfully!', { id: 'refresh-rates' });
      refetchRates();
      refetchHistory();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to refresh rates.', { id: 'refresh-rates' });
    }
  };

  const handleUpdateBaseCurrency = async () => {
    if (!newBaseCurrency) return;
    if (newBaseCurrency === baseSettings?.baseCurrency) {
      toast.error('Base currency is already set to ' + newBaseCurrency);
      return;
    }

    if (!window.confirm(`Warning: Changing the base currency to ${newBaseCurrency} will launch a background process to recalculate all payments, expenses, and tax/duty ledger records. Proceed?`)) {
      return;
    }

    try {
      toast.loading('Updating base currency setting...', { id: 'update-base' });
      await updateBaseCurrencyMutation.mutateAsync(newBaseCurrency);
      toast.success(`Base currency updated to ${newBaseCurrency}. Background recalculation started.`, { id: 'update-base' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update base currency.', { id: 'update-base' });
    }
  };

  // Determine latest and yesterday docs for Table
  const latestDoc = history && history.length > 0 ? history[history.length - 1] : null;
  const yesterdayDoc = history && history.length > 1 ? history[history.length - 2] : null;

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Currency Center</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Configure system base currencies, view daily exchange rate indices, and query historic conversion rates.
          </p>
        </div>
        <div>
          <button
            onClick={handleRefreshRates}
            disabled={refreshRatesMutation.isPending || isHistoryLoading || isRatesLoading}
            className="bg-white border border-slate-250 hover:bg-slate-50 disabled:opacity-50 text-slate-700 py-2 px-3.5 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw size={14} className={`${refreshRatesMutation.isPending ? 'animate-spin text-teal-650' : 'text-slate-450'}`} />
            <span>Force Live Rates Sync</span>
          </button>
        </div>
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Converter & Base Settings */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Real-time Converter Tool */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="border-b border-slate-100 px-6 py-4 flex items-center gap-2">
              <div className="p-2 bg-teal-50 text-teal-600 rounded-lg">
                <Globe size={18} />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-800 text-sm">Interactive Currency Calculator</h3>
                <p className="text-[10px] text-slate-405">Compute live or historical rate conversions.</p>
              </div>
            </div>

            <form onSubmit={handleConvert} className="p-6 space-y-4">
              {/* Amount Input */}
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Amount to Convert</label>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Enter amount..."
                    className="w-full text-xs font-semibold text-slate-700 bg-white border border-slate-250 rounded-lg p-2.5 pl-3 focus:outline-none focus:ring-1 focus:ring-teal-500 font-mono"
                    required
                  />
                </div>
              </div>

              {/* Currency Dropdowns Row */}
              <div className="grid grid-cols-1 sm:grid-cols-9 items-center gap-3">
                {/* From */}
                <div className="sm:col-span-4 space-y-1">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">From</label>
                  <select
                    value={fromCurrency}
                    onChange={(e) => setFromCurrency(e.target.value)}
                    className="w-full text-xs font-bold text-slate-700 bg-white border border-slate-250 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  >
                    {supportedCurrencies.map(c => (
                      <option key={c.code} value={c.code}>{c.code} — {c.name}</option>
                    ))}
                  </select>
                </div>

                {/* Swap Button */}
                <div className="sm:col-span-1 flex justify-center pt-5">
                  <button
                    type="button"
                    onClick={handleSwap}
                    className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-teal-600 rounded-lg shadow-sm transition-all cursor-pointer"
                    title="Swap Currencies"
                  >
                    <ArrowLeftRight size={14} className="rotate-90 sm:rotate-0" />
                  </button>
                </div>

                {/* To */}
                <div className="sm:col-span-4 space-y-1">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">To</label>
                  <select
                    value={toCurrency}
                    onChange={(e) => setToCurrency(e.target.value)}
                    className="w-full text-xs font-bold text-slate-700 bg-white border border-slate-250 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  >
                    {supportedCurrencies.map(c => (
                      <option key={c.code} value={c.code}>{c.code} — {c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Historical Date Selection */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <Calendar size={12} className="text-slate-400" />
                    <span>Rate Value Date</span>
                  </label>
                  <span className="text-[9px] text-slate-400">Optional: leave empty for current rate</span>
                </div>
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="w-full text-xs font-semibold text-slate-700 bg-white border border-slate-250 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              {/* Convert Button */}
              <button
                type="submit"
                disabled={isConverting}
                className="w-full btn-primary py-2.5 text-xs font-bold shadow-teal-500/10 flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                {isConverting ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Converting...</span>
                  </>
                ) : (
                  <span>Calculate Conversion</span>
                )}
              </button>
            </form>

            {/* Conversion Result Display */}
            {conversionResult && (
              <div className="bg-slate-50 border-t border-slate-100 p-6 space-y-3 font-sans">
                <p className="text-[10px] text-slate-450 font-extrabold uppercase tracking-wider">
                  Conversion Output ({new Date(conversionResult.date).toLocaleDateString(undefined, { dateStyle: 'medium' })})
                </p>
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-bold text-slate-550 font-mono">
                    {conversionResult.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} {conversionResult.from} =
                  </span>
                  <span className="text-2xl font-extrabold text-teal-650 font-mono tracking-tight leading-none mt-1">
                    {conversionResult.result.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })} {conversionResult.to}
                  </span>
                </div>
                <div className="bg-white border border-slate-150 rounded-lg p-3 text-[11px] font-semibold text-slate-500 flex justify-between items-center">
                  <span>Exchange Rate:</span>
                  <span className="font-mono font-bold text-slate-700">
                    1 {conversionResult.from} = {conversionResult.rate.toFixed(6)} {conversionResult.to}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Base Currency Settings Configuration Panel */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="border-b border-slate-100 px-6 py-4 flex items-center gap-2">
              <div className="p-2 bg-slate-100 text-slate-600 rounded-lg">
                <Settings size={18} />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-800 text-sm">System Base Currency</h3>
                <p className="text-[10px] text-slate-405">Define base accounting currency for financial reports.</p>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-150 rounded-lg text-xs font-semibold text-slate-600">
                <div className="text-slate-450 shrink-0">
                  <Info size={16} />
                </div>
                <p className="leading-relaxed">
                  Current Global Base Currency: <strong className="font-mono font-extrabold text-slate-850 px-1 bg-white border border-slate-200 rounded">{isBaseLoading ? '...' : baseSettings?.baseCurrency}</strong>
                </p>
              </div>

              {isAdmin ? (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Change Base Currency To</label>
                    <select
                      value={newBaseCurrency}
                      onChange={(e) => setNewBaseCurrency(e.target.value)}
                      className="w-full text-xs font-bold text-slate-700 bg-white border border-slate-250 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-teal-500"
                    >
                      {supportedCurrencies.map(c => (
                        <option key={c.code} value={c.code}>{c.code} — {c.name}</option>
                      ))}
                    </select>
                  </div>

                  {newBaseCurrency !== baseSettings?.baseCurrency && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3.5 flex items-start gap-2.5 text-xs text-amber-800 font-semibold leading-relaxed">
                      <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-extrabold block">Asynchronous Recalculation Trigger</span>
                        Updating settings triggers a background job to recalculate `amountInBaseCurrency` on all historic payments, expenses, and tax/duty records. This process runs in the background to prevent interface locks.
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleUpdateBaseCurrency}
                    disabled={updateBaseCurrencyMutation.isPending || newBaseCurrency === baseSettings?.baseCurrency}
                    className="w-full btn-secondary hover:bg-slate-800 hover:text-white border-slate-300 py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                  >
                    {updateBaseCurrencyMutation.isPending ? (
                      <>
                        <RefreshCw size={14} className="animate-spin text-teal-650" />
                        <span>Updating Database...</span>
                      </>
                    ) : (
                      <span>Apply Base Currency Change</span>
                    )}
                  </button>
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex items-start gap-2.5 text-xs text-slate-505 font-medium leading-relaxed">
                  <AlertTriangle size={16} className="text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-700 block mb-0.5">Admin-Only Privilege</span>
                    You do not have administrative clearance to change the global base currency. Please contact your system administrator to request adjustments.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Charts & Table */}
        <div className="lg:col-span-7 space-y-6">
          {/* Trend Chart */}
          {isHistoryLoading ? (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 h-[350px] flex flex-col items-center justify-center gap-3">
              <RefreshCw className="w-8 h-8 text-teal-600 animate-spin" />
              <span className="text-slate-400 text-xs font-bold">Loading historical rates chart...</span>
            </div>
          ) : (
            <CurrencyRateChart ratesHistory={history} />
          )}

          {/* Table */}
          {isRatesLoading || isHistoryLoading ? (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 h-[400px] flex flex-col items-center justify-center gap-3">
              <RefreshCw className="w-8 h-8 text-teal-600 animate-spin" />
              <span className="text-slate-400 text-xs font-bold">Loading exchange rates ledger...</span>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex justify-between items-center px-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-450">Latest Exchange Indexes</span>
                <span className="text-[9px] text-slate-400">
                  Last fetched: {latestDoc?.fetchedAt ? new Date(latestDoc.fetchedAt).toLocaleString() : 'N/A'}
                </span>
              </div>
              <ExchangeRateTable latestDoc={latestDoc} yesterdayDoc={yesterdayDoc} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CurrencyConverter;
