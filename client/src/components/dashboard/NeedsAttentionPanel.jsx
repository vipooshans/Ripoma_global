import React from 'react';
import { Link } from 'react-router-dom';
import {
  Clock,
  ReceiptText,
  CreditCard,
  Bell,
  FileText,
  CheckCircle2,
} from 'lucide-react';

const items = [
  {
    key: 'pendingApprovals',
    icon: Clock,
    color: 'violet',
    label: 'Purchase Orders Pending Approval',
    link: '/imports/approvals',
  },
  {
    key: 'overdueInvoices',
    icon: ReceiptText,
    color: 'rose',
    label: 'Overdue Invoices',
    link: '/finance/payments',
  },
  {
    key: 'overduePayments',
    icon: CreditCard,
    color: 'orange',
    label: 'Overdue Payments',
    link: '/finance/payments',
  },
  {
    key: 'remindersToday',
    icon: Bell,
    color: 'teal',
    label: "Today's Reminders",
    link: '/notifications/reminders',
  },
  {
    key: 'expiringDocuments7d',
    icon: FileText,
    color: 'amber',
    label: 'Documents Expiring (7 days)',
    link: '/documents/library',
  },
];

const colorMap = {
  rose: 'bg-rose-50 text-rose-600 border-rose-200',
  orange: 'bg-orange-50 text-orange-600 border-orange-200',
  amber: 'bg-amber-50 text-amber-600 border-amber-200',
  teal: 'bg-teal-50 text-teal-600 border-teal-200',
  violet: 'bg-violet-50 text-violet-600 border-violet-200',
};

const badgeMap = {
  rose: 'bg-rose-500 text-white',
  orange: 'bg-orange-500 text-white',
  amber: 'bg-amber-500 text-white',
  teal: 'bg-teal-500 text-white',
  violet: 'bg-violet-500 text-white',
};

const NeedsAttentionPanel = ({ data, loading }) => {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 animate-pulse">
        <div className="h-4 bg-slate-100 rounded w-2/3 mb-4" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-12 bg-slate-50 rounded-xl mb-2" />
        ))}
      </div>
    );
  }

  if (!data) return null;

  const active = items.filter((item) => (data[item.key] || 0) > 0);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <h3 className="text-sm font-bold text-slate-800 mb-4">Needs Attention</h3>

      {active.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <CheckCircle2 size={28} className="text-teal-400" />
          <p className="text-xs text-slate-500 font-medium">You're all caught up!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {active.map((item) => (
            <Link
              key={item.key}
              to={item.link}
              className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl border transition-all hover:shadow-sm ${colorMap[item.color]}`}
            >
              <div className="flex items-center gap-2.5">
                <item.icon size={15} className="shrink-0" />
                <span className="text-xs font-semibold">{item.label}</span>
              </div>
              <span className={`text-xs font-extrabold px-2 py-0.5 rounded-full ${badgeMap[item.color]}`}>
                {data[item.key]}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default NeedsAttentionPanel;
