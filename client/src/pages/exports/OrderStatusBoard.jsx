import React from 'react';
import { useNavigate } from 'react-router-dom';
import ExportOrderKanbanCard from '../../components/exports/ExportOrderKanbanCard';
import { useExportOrders } from '../../hooks/useExportOrders';

const COLUMNS = [
  {
    key: 'pending',
    title: 'Pending',
    description: 'Draft and confirmed orders',
    statuses: ['draft', 'confirmed']
  },
  {
    key: 'processing',
    title: 'Processing',
    description: 'Orders being prepared',
    statuses: ['processing']
  },
  {
    key: 'packed',
    title: 'Packed',
    description: 'Ready for shipment',
    statuses: ['ready_to_ship']
  },
  {
    key: 'dispatched',
    title: 'Dispatched',
    description: 'Sent or currently in transit',
    statuses: ['dispatched', 'in_transit']
  },
  {
    key: 'delivered',
    title: 'Delivered',
    description: 'Completed deliveries',
    statuses: ['delivered']
  }
];

const ACTIVE_STATUSES = COLUMNS.flatMap((column) => column.statuses).join(',');

const OrderStatusBoard = () => {
  const navigate = useNavigate();
  const { data, isLoading, error } = useExportOrders({
    status: ACTIVE_STATUSES,
    limit: 100
  });

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Error loading order statuses: {error.message}
      </div>
    );
  }

  const orders = data?.orders || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-800">Order Status</h1>
        <p className="text-sm text-slate-500">
          Track sales orders from creation through delivery. Open an order to complete its next workflow action.
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
          {COLUMNS.map((column) => (
            <div
              key={column.key}
              className="h-[420px] animate-pulse rounded-xl border border-slate-200 bg-slate-100/60"
            />
          ))}
        </div>
      ) : (
        <div className="grid min-h-[500px] grid-cols-1 items-start gap-4 md:grid-cols-5">
          {COLUMNS.map((column) => {
            const columnOrders = orders.filter((order) => column.statuses.includes(order.status));

            return (
              <section
                key={column.key}
                className="flex min-h-[450px] flex-col rounded-xl border border-slate-200 bg-slate-50/60 p-4 shadow-sm"
              >
                <div className="border-b border-slate-200 pb-3">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                      {column.title}
                    </h2>
                    <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-extrabold text-slate-700">
                      {columnOrders.length}
                    </span>
                  </div>
                  <p className="mt-1 text-[10px] font-medium text-slate-400">
                    {column.description}
                  </p>
                </div>

                <div className="mt-3 max-h-[600px] flex-1 space-y-2.5 overflow-y-auto pr-0.5">
                  {columnOrders.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-white/60 py-12 text-center text-[10px] font-semibold text-slate-400">
                      No orders in this stage
                    </div>
                  ) : (
                    columnOrders.map((order) => (
                      <ExportOrderKanbanCard
                        key={order._id}
                        order={order}
                        onClick={() => navigate(`/exports/orders/${order._id}`)}
                      />
                    ))
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default OrderStatusBoard;
