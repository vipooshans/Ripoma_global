import React from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, DollarSign, Package, ArrowRight } from 'lucide-react';
import KpiScorecardGrid from '../../components/reports/KpiScorecardGrid';
import { useReportsDashboard } from '../../hooks/useReports';

const Dashboard = () => {
  const { data: kpis, isLoading: kpisLoading } = useReportsDashboard();

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Reports Dashboard</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Review sales, inventory, and financial performance.
          </p>
        </div>
      </div>

      {/* KPI scorecard Row */}
      <KpiScorecardGrid kpiData={kpis} isLoading={kpisLoading} />

      {/* Report shortcuts */}
      <div className="space-y-2.5">
        <h3 className="font-extrabold text-slate-800 text-sm">Standard Pre-built Modules</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          
          {/* Sales Report card */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md hover:border-teal-300 transition-all flex flex-col justify-between h-44 group">
            <div>
              <div className="p-2 bg-teal-50 text-teal-650 border border-teal-100 rounded-lg w-fit group-hover:scale-105 transition-transform">
                <TrendingUp size={16} />
              </div>
              <h4 className="font-extrabold text-slate-805 text-xs mt-3.5">Sales & Revenue Report</h4>
              <p className="text-[10px] text-slate-405 mt-1 leading-relaxed">Analyze export invoices, product margins, and customer order values.</p>
            </div>
            <Link to="/reports/sales" className="text-[10px] font-bold text-teal-650 hover:underline flex items-center gap-0.5 mt-4 self-end">
              <span>Analyze Sales</span>
              <ArrowRight size={12} />
            </Link>
          </div>

          {/* Financial Report card */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md hover:border-teal-300 transition-all flex flex-col justify-between h-44 group">
            <div>
              <div className="p-2 bg-teal-50 text-teal-650 border border-teal-100 rounded-lg w-fit group-hover:scale-105 transition-transform">
                <DollarSign size={16} />
              </div>
              <h4 className="font-extrabold text-slate-805 text-xs mt-3.5">Financial Report</h4>
              <p className="text-[10px] text-slate-405 mt-1 leading-relaxed">Monitor customer receivables ageing, supplier payables, and margins.</p>
            </div>
            <Link to="/reports/financial" className="text-[10px] font-bold text-teal-650 hover:underline flex items-center gap-0.5 mt-4 self-end">
              <span>View Financials</span>
              <ArrowRight size={12} />
            </Link>
          </div>

          {/* Inventory Report card */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md hover:border-amber-300 transition-all flex flex-col justify-between h-44 group">
            <div>
              <div className="p-2 bg-amber-50 text-amber-600 border border-amber-100 rounded-lg w-fit group-hover:scale-105 transition-transform">
                <Package size={16} />
              </div>
              <h4 className="font-extrabold text-slate-805 text-xs mt-3.5">Inventory Report</h4>
              <p className="text-[10px] text-slate-405 mt-1 leading-relaxed">Review stock levels, inventory valuation, and low-stock exposure.</p>
            </div>
            <Link to="/reports/inventory" className="text-[10px] font-bold text-teal-650 hover:underline flex items-center gap-0.5 mt-4 self-end">
              <span>View Inventory</span>
              <ArrowRight size={12} />
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Dashboard;
