import React from 'react';
import {
  DollarSign,
  Package,
  Globe,
  Truck,
  Boxes,
  ReceiptText,
  CreditCard,
  Bell,
} from 'lucide-react';
import KpiCard, { KpiCardSkeleton } from './KpiCard';

const fmt = (value, currency = true) => {
  if (value === undefined || value === null) return '—';
  const num = Number(value);
  if (currency) {
    if (num >= 1_000_000) return `LKR ${(num / 1_000_000).toFixed(1)}M`;
    if (num >= 1_000) return `LKR ${(num / 1_000).toFixed(0)}K`;
    return `LKR ${num.toFixed(0)}`;
  }
  return num.toLocaleString();
};

const KpiScorecardGrid = ({ data, loading }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <KpiCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (!data) return null;

  const cards = [
    {
      icon: DollarSign,
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
      label: 'Revenue MTD',
      value: fmt(data.revenueMTD?.value),
      trendPercent: data.revenueMTD?.trendPercent,
      link: '/reports/sales',
    },
    {
      icon: Globe,
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600',
      label: 'Active Import Orders',
      value: fmt(data.activeImportOrders?.count, false),
      badge:
        data.activeImportOrders?.pendingApproval > 0
          ? `${data.activeImportOrders.pendingApproval} pending`
          : undefined,
      badgeColor: 'bg-amber-100 text-amber-700',
      link: '/imports/orders',
    },
    {
      icon: Package,
      iconBg: 'bg-violet-50',
      iconColor: 'text-violet-600',
      label: 'Active Export Orders',
      value: fmt(data.activeExportOrders?.count, false),
      badge:
        data.activeExportOrders?.readyToShip > 0
          ? `${data.activeExportOrders.readyToShip} ready`
          : undefined,
      badgeColor: 'bg-teal-100 text-teal-700',
      link: '/exports/orders',
    },
    {
      icon: Boxes,
      iconBg: 'bg-indigo-50',
      iconColor: 'text-indigo-600',
      label: 'Inventory Value',
      value: fmt(data.inventoryValue?.value),
      badge:
        data.inventoryValue?.lowStockCount > 0
          ? `${data.inventoryValue.lowStockCount} low`
          : undefined,
      badgeColor: 'bg-amber-100 text-amber-700',
      link: '/inventory',
    },
    {
      icon: ReceiptText,
      iconBg: 'bg-rose-50',
      iconColor: 'text-rose-600',
      label: 'Outstanding Receivables',
      value: fmt(data.outstandingReceivables?.value),
      badge:
        data.outstandingReceivables?.overdueCount > 0
          ? `${data.outstandingReceivables.overdueCount} overdue`
          : undefined,
      badgeColor: 'bg-rose-100 text-rose-700',
      link: '/finance/payments',
    },
    {
      icon: CreditCard,
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-600',
      label: 'Outstanding Payables',
      value: fmt(data.outstandingPayables?.value),
      link: '/finance/payments',
    },
    {
      icon: Bell,
      iconBg: 'bg-teal-50',
      iconColor: 'text-teal-600',
      label: 'Unread Notifications',
      value: fmt(data.unreadNotifications?.count, false),
      link: '/notifications/centre',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((card, idx) => (
        <KpiCard key={idx} {...card} />
      ))}
    </div>
  );
};

export default KpiScorecardGrid;
