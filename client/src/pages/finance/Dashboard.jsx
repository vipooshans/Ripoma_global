import React from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowRight } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  AreaChart,
  Area
} from 'recharts';
import FinanceKpiRow from '../../components/finance/FinanceKpiRow';
import PLSummaryCard from '../../components/finance/PLSummaryCard';
import { usePaymentsDashboard, useOverduePayments, usePayments } from '../../hooks/usePayments';
import { useExpensesDashboard } from '../../hooks/useExpenses';
import { useProfitAnalysisSummary, useProfitAnalysisByPeriod } from '../../hooks/useProfitAnalysis';

const Dashboard = () => {
  const { data: kpiData, isLoading: kpiLoading } = usePaymentsDashboard();
  const { data: plSummary, isLoading: summaryLoading } = useProfitAnalysisSummary();
  const { data: plPeriod, isLoading: periodLoading } = useProfitAnalysisByPeriod({ months: 12 });
  const { data: overdueList } = useOverduePayments();
  const { data: expensesDash, isLoading: expensesLoading } = useExpensesDashboard();
  
  // Fetch completed payments for cash flow chart
  const { data: paymentsData } = usePayments({ status: 'completed', limit: 10000 });

  // 1. Process Alert Strips
  const overdueReceivables = (overdueList || []).filter(p => p.type === 'inbound');
  const overduePayables = (overdueList || []).filter(p => p.type === 'outbound');

  const overdueRecSum = overdueReceivables.reduce((acc, p) => acc + (p.amountInBaseCurrency || 0), 0);
  const overduePaySum = overduePayables.reduce((acc, p) => acc + (p.amountInBaseCurrency || 0), 0);

  // 2. Process Stacked Bar Chart (Monthly Revenue vs COGS vs Expenses)
  const barChartData = (plPeriod || []).map(p => ({
    month: p.month,
    Revenue: p.revenue,
    COGS: p.cogs,
    Expenses: p.expenses
  }));

  // 3. Process Cumulative Cash Flow Area Chart (last 6 months)
  const getCashFlowData = () => {
    if (!paymentsData?.payments) return [];
    
    const today = new Date();
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      months.push({
        monthLabel: d.toLocaleString('default', { month: 'short' }),
        year: d.getFullYear(),
        monthIndex: d.getMonth(),
        inflow: 0,
        outflow: 0
      });
    }

    paymentsData.payments.forEach(p => {
      if (!p.paymentDate) return;
      const pDate = new Date(p.paymentDate);
      const idx = months.findIndex(m => m.year === pDate.getFullYear() && m.monthIndex === pDate.getMonth());
      if (idx !== -1) {
        if (p.type === 'inbound') {
          months[idx].inflow += p.amountInBaseCurrency || 0;
        } else {
          months[idx].outflow += p.amountInBaseCurrency || 0;
        }
      }
    });

    let cumulative = 0;
    return months.map(m => {
      cumulative += (m.inflow - m.outflow);
      return {
        month: m.monthLabel,
        'Net Flow': Math.round((m.inflow - m.outflow) * 100) / 100,
        'Cumulative Position': Math.round(cumulative * 100) / 100
      };
    });
  };

  const cashFlowData = getCashFlowData();

  // 4. Process Top 5 Expenses by Category (Horizontal Bar Chart)
  const topExpensesData = (expensesDash?.currentMonth || [])
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)
    .map(e => ({
      category: e.category.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()),
      Amount: e.total
    }));

  // 5. Process Currency Summary
  const getCurrencySummary = () => {
    if (!paymentsData?.payments) return [];
    
    // Group payments in the current month by currency
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const summary = {};
    paymentsData.payments.forEach(p => {
      if (!p.paymentDate || new Date(p.paymentDate) < startOfMonth) return;
      
      const curr = p.currency || 'USD';
      if (!summary[curr]) {
        summary[curr] = {
          currency: curr,
          originalAmount: 0,
          baseAmount: 0
        };
      }
      summary[curr].originalAmount += p.amount;
      summary[curr].baseAmount += p.amountInBaseCurrency || 0;
    });

    return Object.values(summary).sort((a, b) => b.baseAmount - a.baseAmount);
  };

  const currencySummary = getCurrencySummary();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Finance Dashboard</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Unified financial control room. Monitor margins, accounts ledger balance, taxes, and cash flows.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Link
            to="/finance/payments/add"
            className="btn-primary flex items-center gap-1.5 text-xs py-2 px-3.5 shadow-teal-500/10 font-bold"
          >
            <span>Record Payment</span>
            <ArrowRight size={14} />
          </Link>
          <Link
            to="/finance/expenses/add"
            className="btn-secondary flex items-center gap-1.5 text-xs py-2 px-3.5 font-bold"
          >
            <span>Add Expense</span>
          </Link>
        </div>
      </div>

      {/* Alert Strips */}
      <div className="space-y-2">
        {overdueReceivables.length > 0 && (
          <div className="bg-rose-50 border border-rose-200 text-rose-900 rounded-xl p-4 flex items-center justify-between gap-3 shadow-sm">
            <div className="flex items-start gap-3">
              <AlertCircle size={18} className="text-rose-600 shrink-0 mt-0.5 animate-pulse" />
              <div>
                <h4 className="font-extrabold text-xs">Action Required: Overdue Receivables</h4>
                <p className="text-[11px] text-rose-700 mt-0.5">
                  You have <strong className="font-bold">{overdueReceivables.length} customer payments</strong> overdue, totaling <strong className="font-bold">${overdueRecSum.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>.
                </p>
              </div>
            </div>
            <Link
              to="/finance/payments?overdueOnly=true"
              className="text-[11px] font-bold text-rose-700 hover:text-rose-900 flex items-center gap-0.5 hover:underline"
            >
              <span>View Ledger</span>
              <ArrowRight size={12} />
            </Link>
          </div>
        )}

        {overduePayables.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-4 flex items-center justify-between gap-3 shadow-sm">
            <div className="flex items-start gap-3">
              <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-extrabold text-xs">Action Required: Overdue Payables</h4>
                <p className="text-[11px] text-amber-700 mt-0.5">
                  You have <strong className="font-bold">{overduePayables.length} supplier payables</strong> overdue, totaling <strong className="font-bold">${overduePaySum.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>.
                </p>
              </div>
            </div>
            <Link
              to="/finance/payments?overdueOnly=true"
              className="text-[11px] font-bold text-amber-700 hover:text-amber-900 flex items-center gap-0.5 hover:underline"
            >
              <span>View Ledger</span>
              <ArrowRight size={12} />
            </Link>
          </div>
        )}

      </div>

      {/* KPI Cards Row */}
      <FinanceKpiRow kpiData={kpiData} plSummary={plSummary} isLoading={kpiLoading || summaryLoading} />

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Revenue vs COGS vs Expenses */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-4">
          <div>
            <h3 className="font-extrabold text-slate-800 text-sm">Monthly Revenue vs COGS vs Expenses</h3>
            <p className="text-[10px] text-slate-450">Trailing 12-month summary breakdown in base currency.</p>
          </div>
          <div className="h-[285px] w-full text-xs font-semibold">
            {periodLoading ? (
              <div className="h-full w-full bg-slate-50 animate-pulse rounded-lg" />
            ) : barChartData.length === 0 ? (
              <div className="h-full w-full flex items-center justify-center border border-dashed border-slate-200 rounded-xl text-slate-400">
                No financial history available.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="month" stroke="#94A3B8" fontSize={9} tickLine={false} />
                  <YAxis 
                    stroke="#94A3B8" 
                    fontSize={9} 
                    tickLine={false} 
                    tickFormatter={(val) => `Rs ${val.toLocaleString()}`}
                  />
                  <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px', borderColor: '#E2E8F0' }} />
                  <Legend verticalAlign="top" height={36} iconSize={10} iconType="circle" />
                  <Bar dataKey="Revenue" fill="#0D9488" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="COGS" fill="#EF4444" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="Expenses" fill="#F97316" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Cumulative Position Area Chart */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-4">
          <div>
            <h3 className="font-extrabold text-slate-800 text-sm">Cumulative Cash Flow Position</h3>
            <p className="text-[10px] text-slate-450">Trailing 6-month growth curve (Inbound payments - Outbound payments).</p>
          </div>
          <div className="h-[285px] w-full text-xs font-semibold">
            {kpiLoading ? (
              <div className="h-full w-full bg-slate-50 animate-pulse rounded-lg" />
            ) : cashFlowData.length === 0 ? (
              <div className="h-full w-full flex items-center justify-center border border-dashed border-slate-200 rounded-xl text-slate-400">
                No completed payment records to trace.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={cashFlowData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCash" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0D9488" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#0D9488" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="month" stroke="#94A3B8" fontSize={9} tickLine={false} />
                  <YAxis 
                    stroke="#94A3B8" 
                    fontSize={9} 
                    tickLine={false}
                    tickFormatter={(val) => `Rs ${val.toLocaleString()}`}
                  />
                  <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px', borderColor: '#E2E8F0' }} />
                  <Area type="monotone" dataKey="Cumulative Position" stroke="#0D9488" strokeWidth={3} fillOpacity={1} fill="url(#colorCash)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Bottom panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* P&L Snapshot */}
        <div className="lg:col-span-1">
          <PLSummaryCard summary={plSummary} />
        </div>

        {/* Top 5 Expenses by Category */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-4 lg:col-span-1">
          <div>
            <h3 className="font-extrabold text-slate-800 text-sm">Top 5 Expenses by Category</h3>
            <p className="text-[10px] text-slate-450">Category spend breakdown for the current month.</p>
          </div>
          <div className="h-[265px] w-full text-xs font-semibold">
            {expensesLoading ? (
              <div className="h-full w-full bg-slate-50 animate-pulse rounded-lg" />
            ) : topExpensesData.length === 0 ? (
              <div className="h-full w-full flex items-center justify-center border border-dashed border-slate-200 rounded-xl text-slate-400">
                No monthly expenses registered.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topExpensesData}
                  layout="vertical"
                  margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis type="number" stroke="#94A3B8" fontSize={9} tickLine={false} tickFormatter={(val) => `Rs ${val}`} />
                  <YAxis dataKey="category" type="category" stroke="#94A3B8" fontSize={8} width={85} tickLine={false} />
                  <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px', borderColor: '#E2E8F0' }} />
                  <Bar dataKey="Amount" fill="#0F172A" radius={[0, 4, 4, 0]} maxBarSize={16} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Currency Summary */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-4 lg:col-span-1">
          <div>
            <h3 className="font-extrabold text-slate-800 text-sm">Monthly Currency Breakdown</h3>
            <p className="text-[10px] text-slate-450">List of currencies processed in payments this month.</p>
          </div>
          <div className="space-y-3 max-h-[265px] overflow-y-auto pr-1">
            {(!currencySummary || currencySummary.length === 0) ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                No active currency payments this month.
              </div>
            ) : (
              currencySummary.map((c, idx) => (
                <div key={idx} className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl transition-all hover:bg-slate-100/50">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-teal-50 text-teal-650 font-bold border border-teal-150 text-xs">
                      {c.currency}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">
                        {c.originalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-[9px] text-slate-400 uppercase font-extrabold">Original</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-extrabold text-slate-700">
                      ${c.baseAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-[9px] text-teal-600 uppercase font-extrabold">Converted Base</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
