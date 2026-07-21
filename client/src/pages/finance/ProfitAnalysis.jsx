import React, { useState } from 'react';
import { 
  Calendar, 
  TrendingUp, 
  Percent, 
  Briefcase, 
  Database,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import PLSummaryCard from '../../components/finance/PLSummaryCard';
import WaterfallChart from '../../components/finance/WaterfallChart';
import ProfitByOrderTable from '../../components/finance/ProfitByOrderTable';
import ProfitByCustomerTable from '../../components/finance/ProfitByCustomerTable';
import CurrencyAmountDisplay from '../../components/finance/CurrencyAmountDisplay';
import { 
  useProfitAnalysisSummary, 
  useProfitAnalysisByPeriod, 
  useProfitAnalysisByCustomer, 
  useProfitAnalysisByProduct 
} from '../../hooks/useProfitAnalysis';
import { useExpensesDashboard } from '../../hooks/useExpenses';

const ProfitAnalysis = () => {
  // Period Selector States
  const [period, setPeriod] = useState('month'); // month | quarter | year | custom
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  // Tabs below charts
  const [activeTab, setActiveTab] = useState('order'); // order | customer | product

  // Calculate dates based on period selection
  const getDateRange = () => {
    const today = new Date();
    if (period === 'month') {
      const start = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999).toISOString().split('T')[0];
      return { start, end };
    }
    if (period === 'quarter') {
      const quarterIndex = Math.floor(today.getMonth() / 3);
      const start = new Date(today.getFullYear(), quarterIndex * 3, 1).toISOString().split('T')[0];
      const end = new Date(today.getFullYear(), (quarterIndex + 1) * 3, 0, 23, 59, 59, 999).toISOString().split('T')[0];
      return { start, end };
    }
    if (period === 'year') {
      const start = new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0];
      const end = new Date(today.getFullYear(), 11, 31, 23, 59, 59, 999).toISOString().split('T')[0];
      return { start, end };
    }
    return { start: customStart, end: customEnd };
  };

  const dates = getDateRange();

  // Queries
  const { data: summary, isLoading: summaryLoading } = useProfitAnalysisSummary({
    dateFrom: dates.start,
    dateTo: dates.end
  });
  const { data: trendData, isLoading: trendLoading } = useProfitAnalysisByPeriod({ months: 12 });
  const { data: customerData, isLoading: custLoading } = useProfitAnalysisByCustomer({ limit: 15 });
  const { data: productData, isLoading: prodLoading } = useProfitAnalysisByProduct();
  const { data: expensesDash, isLoading: expensesLoading } = useExpensesDashboard();

  // Mock list of orders for the period
  // Since we need order details for the active range, we can fetch all delivered export and received import orders
  // and construct an array of order profitability logs matching the profit-analysis/by-order controller structure
  const [ordersList, setOrdersList] = useState([]);
  
  // Fetch orders when dates change to construct tab list
  React.useEffect(() => {
    const fetchOrdersPL = async () => {
      try {
        const api = (await import('../../services/api')).default;
        // Fetch delivered export orders
        const { data: exp } = await api.get('/export-orders', { params: { status: 'delivered', limit: 100 } });
        // Fetch received import orders
        const { data: imp } = await api.get('/import-orders', { params: { status: 'received', limit: 100 } });
        
        const list = [];
        
        // Populate export orders details
        if (exp?.orders) {
          for (const order of exp.orders) {
            try {
              const { data: analysis } = await api.get(`/profit-analysis/by-order/exportOrder/${order._id}`);
              list.push(analysis);
            } catch (err) {}
          }
        }
        
        // Populate import orders details
        if (imp?.orders) {
          for (const order of imp.orders) {
            try {
              const { data: analysis } = await api.get(`/profit-analysis/by-order/importOrder/${order._id}`);
              list.push(analysis);
            } catch (err) {}
          }
        }
        
        setOrdersList(list);
      } catch (err) {
        console.error('Failed to construct profit-by-orders tab data:', err);
      }
    };
    
    fetchOrdersPL();
  }, [dates.start, dates.end]);

  const format = (val) => {
    return (val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Pie chart categories preparation
  const COLORS = ['#0D9488', '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899', '#EF4444', '#F59E0B', '#10B981', '#64748B'];
  
  const getPieData = () => {
    const items = period === 'year' ? expensesDash?.ytd : expensesDash?.currentMonth;
    return (items || [])
      .map(item => ({
        name: item.category.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()),
        value: item.total
      }))
      .filter(i => i.value > 0);
  };

  const pieData = getPieData();

  // Top level cards row config
  const cards = [
    { label: 'Revenue', value: summary?.revenue, color: 'text-emerald-700 bg-emerald-50' },
    { label: 'COGS', value: summary?.cogs, color: 'text-rose-700 bg-rose-50' },
    { label: 'Gross Profit', value: summary?.grossProfit, color: (summary?.grossProfit >= 0) ? 'text-teal-700 bg-teal-50' : 'text-rose-700 bg-rose-50', highlight: true },
    { label: 'Operating Expenses', value: summary?.operatingExpenses, color: 'text-orange-700 bg-orange-50' },
    { label: 'Net Profit', value: summary?.netProfit, color: (summary?.netProfit >= 0) ? 'text-teal-700 bg-teal-50' : 'text-rose-700 bg-rose-50', highlight: true },
    { label: 'Net Margin', value: summary?.netMargin, color: 'text-indigo-755 bg-indigo-50', isPercent: true }
  ];

  return (
    <div className="space-y-6 text-slate-800 text-xs">
      {/* Title & Period selector */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">P&L Profit Analysis</h1>
          <p className="text-slate-500 text-sm mt-0.5">Audit detailed operational cost items and company margins.</p>
        </div>
        
        {/* Period selection widgets */}
        <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-wrap items-center gap-3.5 shadow-sm">
          <div className="flex border border-slate-200 rounded-lg p-0.5 bg-slate-50">
            {['month', 'quarter', 'year', 'custom'].map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`py-1 px-3.5 rounded text-[10px] font-extrabold capitalize transition-all ${
                  period === p 
                    ? 'bg-white text-slate-900 shadow-sm' 
                    : 'text-slate-400 hover:text-slate-655'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          {period === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="text-xs font-semibold text-slate-700 bg-white border border-slate-250 rounded-lg p-1 px-2 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
              <span className="text-slate-400 font-extrabold">-</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="text-xs font-semibold text-slate-700 bg-white border border-slate-250 rounded-lg p-1 px-2 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
          )}
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        {cards.map((card, idx) => (
          <div
            key={idx}
            className={`bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col justify-between ${
              card.highlight ? 'border-slate-300' : ''
            }`}
          >
            <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider block">
              {card.label}
            </span>
            {summaryLoading ? (
              <div className="h-6 w-16 bg-slate-100 animate-pulse rounded mt-2" />
            ) : (
              <span className={`text-base font-extrabold tracking-tight mt-2 block ${
                card.highlight 
                  ? (card.value >= 0) ? 'text-teal-650' : 'text-rose-650'
                  : 'text-slate-800'
              }`}>
                {card.isPercent ? (
                  <span>{format(card.value)}%</span>
                ) : (
                  <CurrencyAmountDisplay amount={card.value} />
                )}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Waterfall & Chart Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <WaterfallChart summary={summary} />

        {/* Line Chart: Monthly net profit trend */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-4">
          <div>
            <h3 className="font-extrabold text-slate-800 text-sm">Monthly Net Profit Trend</h3>
            <p className="text-[10px] text-slate-450">Trailing 12-month net margins performance in base currency.</p>
          </div>
          <div className="h-[280px] w-full text-xs font-semibold">
            {trendLoading ? (
              <div className="h-full w-full bg-slate-50 animate-pulse rounded-lg" />
            ) : trendData?.length === 0 ? (
              <div className="h-full w-full flex items-center justify-center border border-dashed border-slate-200 rounded-xl text-slate-400">
                No trend history recorded.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={trendData || []} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="month" stroke="#94A3B8" fontSize={9} tickLine={false} />
                  <YAxis 
                    stroke="#94A3B8" 
                    fontSize={9} 
                    tickLine={false} 
                    tickFormatter={(val) => `LKR ${val.toLocaleString()}`}
                  />
                  <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px', borderColor: '#E2E8F0' }} />
                  <Line type="monotone" dataKey="netProfit" stroke="#0D9488" strokeWidth={3} activeDot={{ r: 5 }} dot={{ strokeWidth: 1.5, r: 2.5 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Bottom section: Pie Chart + Reports Tabs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Category Pie */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-4 lg:col-span-1">
          <div>
            <h3 className="font-extrabold text-slate-800 text-sm">Expense Slices</h3>
            <p className="text-[10px] text-slate-450">Expense category distribution for selected period.</p>
          </div>
          <div className="h-[235px] w-full flex items-center justify-center text-xs">
            {expensesLoading ? (
              <div className="h-28 w-28 bg-slate-50 rounded-full animate-pulse" />
            ) : pieData.length === 0 ? (
              <div className="text-slate-400 text-center py-20 italic">No category expenses recorded.</div>
            ) : (
              <ResponsiveContainer width="100%" height={235}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="45%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `LKR ${value.toLocaleString()}`} />
                  <Legend layout="horizontal" verticalAlign="bottom" align="center" iconSize={8} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Right: Reports Tabs */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex border-b border-slate-200 bg-white border rounded-xl p-3 shadow-sm gap-2">
            {[
              { id: 'order', label: 'Profit by Order' },
              { id: 'customer', label: 'Profit by Customer' },
              { id: 'product', label: 'Profit by Product' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-1.5 px-4 rounded-lg text-xs font-bold transition-all ${
                  activeTab === tab.id 
                    ? 'bg-slate-900 text-white shadow' 
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content panels */}
          {activeTab === 'order' && <ProfitByOrderTable orders={ordersList} />}
          
          {activeTab === 'customer' && <ProfitByCustomerTable customers={customerData} />}
          
          {activeTab === 'product' && (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-slate-800 text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-150 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                      <th className="py-3 px-5">SKU</th>
                      <th className="py-3 px-5">Product Name</th>
                      <th className="py-3 px-5 text-center">Units Sold</th>
                      <th className="py-3 px-5 text-right">Revenue</th>
                      <th className="py-3 px-5 text-right">COGS Cost</th>
                      <th className="py-3 px-5 text-right">Net Profit</th>
                      <th className="py-3 px-5 text-center">Margin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans">
                    {(!productData || productData.length === 0) ? (
                      <tr>
                        <td colSpan="7" className="py-10 text-center text-slate-400">
                          No product profit analysis registered.
                        </td>
                      </tr>
                    ) : (
                      productData.map((p, idx) => {
                        const isPositive = p.profit >= 0;
                        
                        return (
                          <tr key={idx} className="hover:bg-slate-50/50 transition-all">
                            <td className="py-3 px-5 font-mono font-bold text-teal-650">{p.sku}</td>
                            <td className="py-3 px-5 font-bold text-slate-700 truncate max-w-[150px]">{p.name}</td>
                            <td className="py-3 px-5 text-center font-bold text-slate-500 font-mono">{p.unitsSold}</td>
                            <td className="py-3 px-5 text-right font-mono font-bold text-slate-700">LKR {format(p.revenue)}</td>
                            <td className="py-3 px-5 text-right font-mono font-bold text-slate-500">LKR {format(p.cogs)}</td>
                            <td className={`py-3 px-5 text-right font-mono font-extrabold ${isPositive ? 'text-teal-650' : 'text-rose-650'}`}>
                              LKR {format(p.profit)}
                            </td>
                            <td className="py-3 px-5 text-center shrink-0">
                              <div className="flex items-center justify-center">
                                <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-extrabold border ${
                                  isPositive
                                    ? 'bg-teal-50 text-teal-700 border-teal-100'
                                    : 'bg-rose-50 text-rose-700 border-rose-100'
                                }`}>
                                  {isPositive ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                                  {p.margin.toFixed(1)}%
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfitAnalysis;
