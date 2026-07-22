import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  useExportOrderDetail,
  useConfirmExportOrder,
  useTransitionExportOrderStatus,
  useCancelExportOrder,
  useAddExportTimelineNote
} from '../../hooks/useExportOrders';
import { useInvoices, useCreateInvoice } from '../../hooks/useInvoices';
import { useDispatches } from '../../hooks/useDispatches';
import { documentService } from '../../services/documentService';
import ExportOrderStatusBadge from '../../components/exports/ExportOrderStatusBadge';
import PaymentStatusBadge from '../../components/exports/PaymentStatusBadge';
import LineItemsTable from '../../components/exports/LineItemsTable';
import { apiUrl } from '../../config/apiBase';
import OrderTotalsSidebar from '../../components/exports/OrderTotalsSidebar';
import OrderTimelineLog from '../../components/exports/OrderTimelineLog';
import PaymentHistoryList from '../../components/exports/PaymentHistoryList';

const tabs = ['General Details', 'Billing & Invoices', 'Shipments', 'Payments & Documents', 'Activity History'];

const OrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [linkedDocs, setLinkedDocs] = useState([]);

  // Queries
  const { data: order, isLoading, error, refetch } = useExportOrderDetail(id);
  const { data: invoicesData } = useInvoices({ exportOrder: id });
  const { data: dispatchesData } = useDispatches({ exportOrder: id });

  const invoices = invoicesData?.invoices || [];
  const dispatches = dispatchesData?.dispatches || [];

  useEffect(() => {
    if (!id) return;
    documentService
      .getDocuments({ entityType: 'ExportOrder', entityId: id, limit: 50 })
      .then(({ data }) => setLinkedDocs(data.documents || []))
      .catch(() => setLinkedDocs([]));
  }, [id]);

  // Mutations
  const confirmMutation = useConfirmExportOrder();
  const transitionMutation = useTransitionExportOrderStatus();
  const cancelMutation = useCancelExportOrder();
  const addNoteMutation = useAddExportTimelineNote();
  const createInvoiceMutation = useCreateInvoice();

  const handleConfirm = () => {
    if (!window.confirm('Are you sure you want to confirm this export sales order? This will lock edits and release it for warehousing dispatches.')) return;
    confirmMutation.mutate(id, {
      onSuccess: (res) => {
        alert(res.message);
        refetch();
      }
    });
  };

  const handleCancel = () => {
    const note = prompt('Please enter a reason for cancellation:');
    if (note === null) return;
    cancelMutation.mutate({ id, note }, {
      onSuccess: (res) => {
        alert(res.message);
        refetch();
      }
    });
  };

  const handleStatusChange = (status) => {
    transitionMutation.mutate({ id, status }, {
      onSuccess: (res) => {
        alert(res.message);
        refetch();
      }
    });
  };

  const handleAddTimelineNote = (note) => {
    addNoteMutation.mutate({ id, note }, {
      onSuccess: () => refetch()
    });
  };

  const handleCreateInvoice = (type) => {
    if (!window.confirm(`Generate a new ${type} invoice for this order?`)) return;
    createInvoiceMutation.mutate({ exportOrderId: id, type }, {
      onSuccess: (res) => {
        alert(res.message);
        refetch();
      },
      onError: (err) => {
        alert(`Error: ${err.message}`);
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-800"></div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl">
        Error loading export order details: {error?.message || 'Order not found.'}
      </div>
    );
  }

  const isDraft = order.status === 'draft';
  const isCancelled = order.status === 'cancelled';
  const isDelivered = order.status === 'delivered';

  return (
    <div className="space-y-6">
      {/* Detail Header & Action Panel */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span className="font-mono font-bold text-xl text-slate-800">{order.orderNumber}</span>
            <ExportOrderStatusBadge status={order.status} />
            <PaymentStatusBadge status={order.paymentStatus} />
          </div>
          <p className="text-sm text-slate-500">
            Customer: <span className="font-bold text-slate-700">{order.customer?.companyName}</span> | Priority: <span className="capitalize font-semibold">{order.priority}</span>
          </p>
        </div>

        {/* Life-cycle Actions buttons */}
        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          {isDraft && (
            <>
              <button
                onClick={() => navigate(`/exports/orders/${id}/edit`)}
                className="border border-slate-300 hover:bg-slate-50 rounded-lg px-4.5 py-2 text-slate-700 shadow-sm transition"
              >
                ✏️ Edit Draft
              </button>
              <button
                onClick={handleConfirm}
                className="bg-slate-800 hover:bg-slate-700 text-white rounded-lg px-4.5 py-2 shadow-sm transition"
              >
                ✅ Confirm Order
              </button>
            </>
          )}

          {!isDraft && !isCancelled && !isDelivered && (
            <div className="relative inline-block text-left">
              <select
                onChange={(e) => handleStatusChange(e.target.value)}
                value={order.status}
                className="bg-slate-800 text-white rounded-lg px-4 py-2 hover:bg-slate-700 font-semibold focus:outline-none transition cursor-pointer text-xs"
              >
                <option value="" disabled>Update Status...</option>
                <option value="processing">Processing</option>
                <option value="ready_to_ship">Ready to Ship</option>
                <option value="in_transit">In Transit</option>
                <option value="delivered">Delivered</option>
                <option value="returned">Returned</option>
              </select>
            </div>
          )}

          {!isCancelled && !isDelivered && (
            <button
              onClick={handleCancel}
              className="border border-rose-300 hover:bg-rose-50 text-rose-700 rounded-lg px-4.5 py-2 shadow-sm transition"
            >
              ❌ Cancel Order
            </button>
          )}
        </div>
      </div>

      {/* Navigation tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-6 -mb-px">
          {tabs.map((tab, idx) => (
            <button
              key={idx}
              onClick={() => setActiveTab(idx)}
              className={`pb-3 text-sm font-semibold tracking-wide border-b-2 transition ${idx === activeTab ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Contents */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* TAB 0: General Details */}
          {activeTab === 0 && (
            <div className="space-y-6">
              {/* Detailed Card */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                <div className="space-y-2.5">
                  <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider border-b pb-1 mb-2">Order Info</h3>
                  <p><span className="text-slate-400">Order Number:</span> <span className="font-semibold">{order.orderNumber}</span></p>
                  <p><span className="text-slate-400">Date Raised:</span> <span className="font-semibold">{new Date(order.orderDate).toLocaleDateString()}</span></p>
                  <p><span className="text-slate-400">Confirmed Date:</span> <span className="font-semibold">{order.confirmedDate ? new Date(order.confirmedDate).toLocaleDateString() : 'Pending'}</span></p>
                  <p><span className="text-slate-400">Est. Dispatch:</span> <span className="font-semibold">{order.estimatedDispatchDate ? new Date(order.estimatedDispatchDate).toLocaleDateString() : 'N/A'}</span></p>
                  <p><span className="text-slate-400">Incoterms:</span> <span className="font-semibold font-mono bg-slate-100 px-1 rounded">{order.incoterms}</span></p>
                  <p><span className="text-slate-400">Payment Terms:</span> <span className="font-semibold">{order.paymentTerms || 'N/A'}</span></p>
                </div>

                <div className="space-y-2.5">
                  <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider border-b pb-1 mb-2">Logistics & Partners</h3>
                  <p><span className="text-slate-400">Customer:</span> <span className="font-semibold">{order.customer?.companyName}</span></p>
                  <p><span className="text-slate-400">Source Warehouse:</span> <span className="font-semibold">{order.warehouse?.name} ({order.warehouse?.code})</span></p>
                  <p><span className="text-slate-400">Preferred Method:</span> <span className="font-semibold capitalize">{order.shippingMethod}</span></p>
                  <p><span className="text-slate-400">Customer PO Ref:</span> <span className="font-semibold">{order.customerReference || '—'}</span></p>
                  <p><span className="text-slate-400">Created By:</span> <span className="font-semibold">{order.createdBy?.name || 'System'}</span></p>
                </div>
              </div>

              {/* Address details */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                <div>
                  <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider border-b pb-1.5 mb-2.5">Billing Address</h3>
                  <div className="text-slate-600 space-y-1">
                    <p>{order.billingAddress?.street || '—'}</p>
                    <p>{order.billingAddress?.city || '—'}, {order.billingAddress?.state || '—'}</p>
                    <p>{order.billingAddress?.postalCode || '—'}, {order.billingAddress?.country || '—'}</p>
                  </div>
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider border-b pb-1.5 mb-2.5">Shipping Address</h3>
                  <div className="text-slate-600 space-y-1">
                    <p>{order.shippingAddress?.street || '—'}</p>
                    <p>{order.shippingAddress?.city || '—'}, {order.shippingAddress?.state || '—'}</p>
                    <p>{order.shippingAddress?.postalCode || '—'}, {order.shippingAddress?.country || '—'}</p>
                  </div>
                </div>
              </div>

              {/* Special Notes */}
              {order.notes && (
                <div className="bg-amber-50/50 p-6 rounded-2xl border border-amber-100 text-sm text-slate-700">
                  <h3 className="font-bold text-amber-800 text-xs uppercase tracking-wide mb-1.5">Special Shipment Instructions</h3>
                  <p className="italic">"{order.notes}"</p>
                </div>
              )}

              {/* Line items table */}
              <div>
                <h3 className="font-bold text-slate-800 text-sm mb-3">Line Items Catalogue</h3>
                <LineItemsTable
                  items={order.items}
                  readOnly={true}
                />
              </div>
            </div>
          )}

          {/* TAB 1: Billing & Invoices */}
          {activeTab === 1 && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-slate-800 text-sm">Associated Commercial Documents</h3>
                {!isCancelled && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleCreateInvoice('proforma')}
                      className="border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-lg shadow-sm"
                    >
                      📄 Proforma Invoice
                    </button>
                    <button
                      onClick={() => handleCreateInvoice('commercial')}
                      className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-sm"
                    >
                      📄 Commercial Invoice
                    </button>
                  </div>
                )}
              </div>

              {invoices.length === 0 ? (
                <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-400 text-sm">
                  No invoices raised for this sales order yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {invoices.map((inv) => (
                    <div
                      key={inv._id}
                      onClick={() => navigate(`/exports/invoices/${inv._id}`)}
                      className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-slate-300 cursor-pointer shadow-sm hover:shadow transition space-y-3"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">
                            {inv.type} invoice
                          </span>
                          <span className="font-mono font-bold text-slate-800 text-sm">
                            {inv.invoiceNumber}
                          </span>
                        </div>
                        <span className="capitalize text-xs font-semibold px-2 py-0.5 rounded bg-slate-100">
                          {inv.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-xs mt-2 border-t pt-2 text-slate-600">
                        <div>
                          <span className="block text-slate-400">Total:</span>
                          <span className="font-bold text-slate-800">${inv.grandTotal.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="block text-slate-400">Amount Due:</span>
                          <span className="font-bold text-rose-600">${inv.amountDue.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Shipments */}
          {activeTab === 2 && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-slate-800 text-sm">Dispatch Shipments Manifest</h3>
                {!isDraft && !isCancelled && (
                  <Link
                    to={`/exports/dispatch/create?orderId=${id}`}
                    className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-sm"
                  >
                    🚚 Log Dispatch Shipment
                  </Link>
                )}
              </div>

              {dispatches.length === 0 ? (
                <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-400 text-sm">
                  No shipments logged yet. Make sure order is confirmed before generating dispatches.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {dispatches.map((disp) => (
                    <div
                      key={disp._id}
                      onClick={() => navigate('/exports/order-status')}
                      className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-slate-300 cursor-pointer shadow-sm hover:shadow transition space-y-3 border-l-4 border-l-slate-800"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">
                            Shipment Code
                          </span>
                          <span className="font-mono font-bold text-slate-800 text-sm">
                            {disp.dispatchNumber}
                          </span>
                        </div>
                        <span className="capitalize text-xs font-semibold px-2 py-0.5 rounded bg-slate-100">
                          {disp.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div className="text-xs text-slate-600 mt-2 border-t pt-2 space-y-1">
                        <p><span className="text-slate-400">Carrier:</span> {disp.carrier || '—'} {disp.trackingNumber ? `(${disp.trackingNumber})` : ''}</p>
                        <p><span className="text-slate-400">Ship Date:</span> {disp.dispatchDate ? new Date(disp.dispatchDate).toLocaleDateString() : 'N/A'}</p>
                        <p><span className="text-slate-400">Items:</span> {disp.items?.length || 0} items listed</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Payments & Documents */}
          {activeTab === 3 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Payment History Card */}
              <PaymentHistoryList order={order} invoices={invoices} />

              {/* Uploaded Documents List */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                  <h3 className="font-semibold text-slate-800 text-sm">Order Documents & Certifications</h3>
                  <Link
                    to={`/documents/upload?entityType=ExportOrder&entityId=${order._id}&entityRef=${encodeURIComponent(order.orderNumber || '')}`}
                    className="text-[11px] font-bold text-teal-700 hover:underline"
                  >
                    Upload Document
                  </Link>
                </div>
                {order.documents?.length === 0 && linkedDocs.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">No documents uploaded.</p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {order.documents?.map((doc, idx) => (
                      <div key={doc._id || idx} className="py-2.5 flex justify-between items-center text-xs">
                        <div>
                          <span className="font-semibold text-slate-700 block">{doc.name}</span>
                          <span className="text-[10px] text-slate-400 block capitalize">Type: {doc.type?.replace(/_/g, ' ')}</span>
                        </div>
                        {doc.url && (
                          <a
                            href={doc.url.startsWith('/') ? apiUrl(doc.url.replace(/^\/api/, '') || doc.url) : doc.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-indigo-600 hover:text-indigo-800 font-bold"
                          >
                            Download
                          </a>
                        )}
                      </div>
                    ))}
                    {linkedDocs.map((doc) => (
                      <div key={doc._id} className="py-2.5 flex justify-between items-center text-xs">
                        <div>
                          <span className="font-semibold text-slate-700 block">{doc.name}</span>
                          <span className="text-[10px] text-slate-400 block capitalize">Library · {doc.category}</span>
                        </div>
                        <Link
                          to={`/documents/${doc._id}`}
                          className="text-indigo-600 hover:text-indigo-800 font-bold"
                        >
                          Open
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: Activity History */}
          {activeTab === 4 && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <OrderTimelineLog
                timeline={order.timeline}
                onAddNote={handleAddTimelineNote}
              />
            </div>
          )}
        </div>

        {/* Sidebar Total costs Breakdown card */}
        <div>
          <OrderTotalsSidebar
            items={order.items}
            shippingCharge={order.shippingCharge}
            otherCharges={order.otherCharges}
            readOnly={true}
          />
        </div>
      </div>
    </div>
  );
};

export default OrderDetail;
