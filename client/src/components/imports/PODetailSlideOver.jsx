import React from 'react';
import { Link } from 'react-router-dom';
import { useImportOrderDetail } from '../../hooks/useImportOrders';
import { X, Calendar, Truck, User, DollarSign, Package, ExternalLink, ShieldCheck } from 'lucide-react';
import POStatusBadge from './POStatusBadge';
import PriorityBadge from './PriorityBadge';

const PODetailSlideOver = ({ isOpen, onClose, orderId }) => {
  const { data: detailData, isLoading } = useImportOrderDetail(orderId);
  
  if (!isOpen) return null;

  const order = detailData?.order;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden font-sans">
      <div className="absolute inset-0 overflow-hidden">
        {/* Backdrop overlay */}
        <div 
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-300"
          onClick={onClose}
        />

        <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
          <div className="pointer-events-auto w-screen max-w-md transform bg-white shadow-2xl transition-transform duration-300 ease-in-out border-l border-slate-200">
            {/* Header */}
            <div className="bg-slate-900 px-6 py-5 text-white flex justify-between items-center shadow-sm">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-extrabold tracking-tight">{order?.poNumber || 'Loading PO...'}</h2>
                  {order && <POStatusBadge status={order.status} />}
                </div>
                {order && (
                  <p className="text-[10px] text-slate-400 mt-1 font-medium">
                    Expected Intake: {new Date(order.expectedDeliveryDate).toLocaleDateString()}
                  </p>
                )}
              </div>
              <button 
                onClick={onClose}
                className="rounded-md text-slate-400 hover:text-white focus:outline-none p-1 bg-slate-800 hover:bg-slate-700 transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content Body */}
            <div className="h-[calc(100vh-80px)] overflow-y-auto p-6 space-y-6 font-semibold text-xs text-slate-700">
              {isLoading ? (
                <div className="space-y-4 animate-pulse pt-4">
                  <div className="h-4 bg-slate-100 rounded w-1/3" />
                  <div className="h-20 bg-slate-100 rounded" />
                  <div className="h-4 bg-slate-100 rounded w-1/2" />
                  <div className="h-24 bg-slate-100 rounded" />
                </div>
              ) : !order ? (
                <div className="text-center py-12 text-slate-450 font-bold">
                  Purchase Order details could not be retrieved.
                </div>
              ) : (
                <>
                  {/* Quick stats / summary */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 space-y-1">
                      <span className="text-[9px] uppercase tracking-wider text-slate-450 block font-extrabold">PO Total Value</span>
                      <div className="text-lg font-extrabold text-teal-650">
                        ${order.grandTotal?.toLocaleString()}
                        <span className="text-[10px] text-slate-400 font-normal ml-0.5">{order.currency}</span>
                      </div>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 space-y-1">
                      <span className="text-[9px] uppercase tracking-wider text-slate-450 block font-extrabold">Priority Tier</span>
                      <div className="pt-0.5">
                        <PriorityBadge priority={order.priority} />
                      </div>
                    </div>
                  </div>

                  {/* Supplier Info */}
                  <div className="border-t border-slate-100 pt-4 space-y-2">
                    <h3 className="text-[10px] uppercase tracking-wider text-slate-450 font-extrabold flex items-center gap-1.5">
                      <User size={13} className="text-slate-400" />
                      <span>Supplier Details</span>
                    </h3>
                    <div className="bg-slate-50/50 border border-slate-200/50 rounded-xl p-3.5 space-y-1.5">
                      <div className="font-extrabold text-slate-900 text-xs">{order.supplier?.companyName}</div>
                      <div className="text-[10px] text-slate-450 font-mono">Code: {order.supplier?.code}</div>
                      <div className="text-[10px] text-slate-500 font-medium">
                        Contact: {order.supplier?.phone || '—'} | {order.supplier?.email || '—'}
                      </div>
                    </div>
                  </div>

                  {/* Logistics Info */}
                  <div className="border-t border-slate-100 pt-4 space-y-2">
                    <h3 className="text-[10px] uppercase tracking-wider text-slate-450 font-extrabold flex items-center gap-1.5">
                      <Truck size={13} className="text-slate-400" />
                      <span>Logistical routing</span>
                    </h3>
                    <div className="grid grid-cols-2 gap-y-2 text-slate-650 font-medium">
                      <div>Warehouse:</div>
                      <div className="text-slate-900 font-bold text-right">{order.warehouse?.name || '—'}</div>
                      <div>Shipping Method:</div>
                      <div className="text-slate-900 font-bold text-right uppercase">{order.shippingMethod}</div>
                      <div>Incoterms:</div>
                      <div className="text-slate-900 font-bold text-right uppercase">{order.incoterms || '—'}</div>
                      <div>Payment Terms:</div>
                      <div className="text-slate-900 font-bold text-right">{order.paymentTerms || '—'}</div>
                    </div>
                  </div>

                  {/* Items list */}
                  <div className="border-t border-slate-100 pt-4 space-y-2">
                    <h3 className="text-[10px] uppercase tracking-wider text-slate-450 font-extrabold flex items-center gap-1.5">
                      <Package size={13} className="text-slate-400" />
                      <span>PO Items ({order.items?.length || 0} Lines)</span>
                    </h3>
                    <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden bg-slate-50/20 max-h-[160px] overflow-y-auto pr-1">
                      {order.items?.map((item, idx) => (
                        <div key={idx} className="p-2.5 flex justify-between gap-3 text-[10px]">
                          <div>
                            <span className="font-extrabold text-slate-800">{item.product?.sku}</span>
                            <span className="text-slate-500 block truncate max-w-[200px]">{item.product?.name}</span>
                          </div>
                          <div className="text-right shrink-0 font-bold text-slate-900">
                            <div>{item.quantityOrdered} Ordered</div>
                            <div className="text-emerald-600 text-[9px]">{item.quantityReceived} Rec'd</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions / Go to full PO page */}
                  <div className="pt-4 border-t border-slate-150 flex flex-col gap-2">
                    <Link
                      to={`/imports/orders/${order._id}`}
                      className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-4 rounded-xl text-center flex items-center justify-center gap-1.5 shadow-sm transition-all text-xs"
                      onClick={onClose}
                    >
                      <span>Go to Full Purchase Order Page</span>
                      <ExternalLink size={13} />
                    </Link>
                    <button
                      onClick={onClose}
                      className="bg-white border border-slate-250 hover:bg-slate-50 text-slate-700 font-bold py-2 px-4 rounded-xl text-center transition-all text-xs"
                    >
                      Close Panel
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PODetailSlideOver;
