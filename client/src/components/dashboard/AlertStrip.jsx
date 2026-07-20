import React from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  Clock,
  Package,
  Truck,
  FileText,
  CheckCircle2,
  X,
} from 'lucide-react';

const AlertStrip = ({ alerts, onDismiss }) => {
  if (!alerts) return null;

  const items = [
    alerts.overdueInvoices?.count > 0 && {
      key: 'invoices',
      icon: FileText,
      color: 'rose',
      message: `${alerts.overdueInvoices.count} overdue invoice${alerts.overdueInvoices.count > 1 ? 's' : ''} — Rs ${Number(alerts.overdueInvoices.totalAmount).toLocaleString()} outstanding`,
      link: '/finance/payments',
    },
    alerts.overduePayments?.count > 0 && {
      key: 'payments',
      icon: AlertTriangle,
      color: 'orange',
      message: `${alerts.overduePayments.count} overdue payment${alerts.overduePayments.count > 1 ? 's' : ''} — Rs ${Number(alerts.overduePayments.totalAmount).toLocaleString()} due`,
      link: '/finance/payments',
    },
    alerts.lowStockProducts?.count > 0 && {
      key: 'stock',
      icon: Package,
      color: 'amber',
      message: `${alerts.lowStockProducts.count} product${alerts.lowStockProducts.count > 1 ? 's' : ''} below low-stock threshold`,
      link: '/inventory/alerts',
    },
    alerts.expiringDocuments?.count > 0 && {
      key: 'docs',
      icon: FileText,
      color: 'slate',
      message: `${alerts.expiringDocuments.count} document${alerts.expiringDocuments.count > 1 ? 's' : ''} expiring within 30 days`,
      link: '/documents/library',
    },
    alerts.pendingApprovals > 0 && {
      key: 'approvals',
      icon: Clock,
      color: 'violet',
      message: `${alerts.pendingApprovals} purchase order${alerts.pendingApprovals > 1 ? 's' : ''} awaiting approval`,
      link: '/imports/approvals',
    },
  ].filter(Boolean);

  if (items.length === 0) {
    return (
      <div className="flex items-center gap-2.5 px-4 py-3 mb-6 bg-teal-50 border border-teal-200 rounded-xl text-teal-700 text-sm font-semibold">
        <CheckCircle2 size={16} className="text-teal-500 shrink-0" />
        All systems normal — no critical alerts at this time.
      </div>
    );
  }

  const colorMap = {
    rose: 'bg-rose-50 border-rose-200 text-rose-700',
    orange: 'bg-orange-50 border-orange-200 text-orange-700',
    amber: 'bg-amber-50 border-amber-200 text-amber-700',
    slate: 'bg-slate-50 border-slate-200 text-slate-700',
    violet: 'bg-violet-50 border-violet-200 text-violet-700',
  };

  const iconColorMap = {
    rose: 'text-rose-500',
    orange: 'text-orange-500',
    amber: 'text-amber-500',
    slate: 'text-slate-500',
    violet: 'text-violet-500',
  };

  return (
    <div className="flex flex-col gap-2 mb-6">
      {items.slice(0, 3).map((item) => (
        <Link
          key={item.key}
          to={item.link}
          className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all hover:shadow-sm ${colorMap[item.color]}`}
        >
          <item.icon size={15} className={`shrink-0 ${iconColorMap[item.color]}`} />
          <span className="flex-1">{item.message}</span>
          <span className="text-xs underline underline-offset-2 opacity-60">View →</span>
        </Link>
      ))}
      {items.length > 3 && (
        <p className="text-xs text-slate-500 font-medium text-center">
          +{items.length - 3} more alert{items.length - 3 > 1 ? 's' : ''} — check each module for details.
        </p>
      )}
    </div>
  );
};

export default AlertStrip;
