import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  useImportOrderDetail,
  useSubmitImportOrder,
  useMarkOrdered,
  useMarkInTransit,
  useCancelImportOrder
} from '../../hooks/useImportOrders';
import { useAuth } from '../../hooks/useAuth';
import {
  ArrowLeft,
  Edit2,
  CheckCircle,
  Truck,
  FileText,
  Calendar,
  DollarSign,
  XCircle,
  User,
  ShieldCheck,
  Package,
  Plus,
  History,
  AlertCircle
} from 'lucide-react';
import POStatusBadge from '../../components/imports/POStatusBadge';
import PriorityBadge from '../../components/imports/PriorityBadge';
import LineItemsTable from '../../components/imports/LineItemsTable';
import ApprovalTrail from '../../components/imports/ApprovalTrail';
import GoodsReceiptTable from '../../components/imports/GoodsReceiptTable';
import POTimelineLog from '../../components/imports/POTimelineLog';
import toast from 'react-hot-toast';

const OrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('details');

  // Queries
  const { data: detailData, isLoading, refetch } = useImportOrderDetail(id);

  // Mutations
  const submitMutation = useSubmitImportOrder();
  const markOrderedMutation = useMarkOrdered();
  const markInTransitMutation = useMarkInTransit();
  const cancelMutation = useCancelImportOrder();

  // Dialog State
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelComments, setCancelComments] = useState('');
  const [notesModalOpen, setNotesModalOpen] = useState(false);
  const [notesContent, setNotesContent] = useState('');

  if (isLoading) {
    return <div className="p-8 text-center text-slate-500 animate-pulse text-xs">Loading Purchase Order details...</div>;
  }

  const order = detailData?.order;
  const requiredLevels = detailData?.requiredLevels || 1;
  const receipts = detailData?.receipts || [];

  if (!order) {
    return (
      <div className="p-8 text-center bg-white border border-slate-200 rounded-xl space-y-4 shadow-sm">
        <AlertCircle className="mx-auto text-rose-500" size={32} />
        <h3 className="font-extrabold text-slate-800 text-sm">Purchase Order Not Found</h3>
        <p className="text-xs text-slate-500">The requested import order either does not exist or has been removed.</p>
        <Link to="/imports/orders" className="btn-secondary inline-block text-xs py-2 px-4">
          Back to Purchase Orders
        </Link>
      </div>
    );
  }

  const handleSubmitForApproval = async () => {
    try {
      await submitMutation.mutateAsync(order._id);
      toast.success('Purchase Order submitted for approval.');
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error submitting PO.');
    }
  };

  const handleMarkOrdered = async () => {
    try {
      await markOrderedMutation.mutateAsync(order._id);
      toast.success('Purchase Order marked as ordered.');
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error marking ordered.');
    }
  };

  const handleMarkInTransit = async () => {
    if (!notesContent) {
      setNotesModalOpen(true);
      return;
    }
    try {
      await markInTransitMutation.mutateAsync({ id: order._id, notes: notesContent });
      toast.success('Purchase Order marked as in transit.');
      setNotesModalOpen(false);
      setNotesContent('');
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error marking in transit.');
    }
  };

  const handleCancelPO = async () => {
    try {
      await cancelMutation.mutateAsync({ id: order._id, comments: cancelComments });
      toast.success('Purchase Order cancelled successfully.');
      setCancelModalOpen(false);
      setCancelComments('');
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error cancelling PO.');
    }
  };

  // Determine if current user can approve (if pending approval)
  const isPendingApproval = order.status === 'pending_approval';
  const currentLevelApproved = order.approvals?.length || 0;
  const pendingLevel = currentLevelApproved + 1;
  const isUserApprover =
    isPendingApproval &&
    ((pendingLevel === 1 && (user?.role === 'manager' || user?.role === 'admin')) ||
      (pendingLevel === 2 && user?.role === 'admin'));

  // Calculate timelines
  const timelineEvents = [
    { title: 'Draft Purchase Order Created', date: order.createdAt, desc: `Created by ${order.createdBy?.name || 'User'}` }
  ];

  order.approvals?.forEach(app => {
    timelineEvents.push({
      title: `Approval Level ${app.level}: ${app.action.toUpperCase()}`,
      date: app.actionedAt,
      desc: `Reviewed by ${app.approver?.name || 'User'} (${app.approver?.email}). Comments: ${app.comments || 'No comment'}`
    });
  });

  if (order.orderDate) {
    timelineEvents.push({
      title: 'Order Sent to Supplier',
      date: order.orderDate,
      desc: 'Purchase order sent to supplier for production scheduling.'
    });
  }

  receipts.forEach(r => {
    timelineEvents.push({
      title: `Goods Received: ${r.receiptNumber}`,
      date: r.receivedAt,
      desc: `Received ${r.items?.length || 0} product lines at warehouse by ${r.receivedBy?.name || 'Operator'}.`
    });
  });

  if (order.status === 'received') {
    timelineEvents.push({
      title: 'PO Procurement Completed',
      date: order.actualDeliveryDate || order.updatedAt,
      desc: 'All items successfully received at destination depots.'
    });
  } else if (order.status === 'cancelled') {
    timelineEvents.push({
      title: 'PO Cancelled',
      date: order.updatedAt,
      desc: order.internalNotes || 'Order status changed to cancelled.'
    });
  }

  // Sort timeline chronologically
  timelineEvents.sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div className="space-y-6">
      {/* Back button & Action Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/imports/orders"
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition-all"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-extrabold text-slate-900 tracking-tight">{order.poNumber}</span>
              <POStatusBadge status={order.status} />
              <PriorityBadge priority={order.priority} />
            </div>
            <p className="text-slate-500 text-xs mt-0.5">
              Raised with <strong className="font-bold text-slate-700">{order.supplier?.companyName}</strong> on{' '}
              {new Date(order.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap gap-2 shrink-0">
          {order.status === 'draft' && (
            <>
              <Link to={`/imports/orders/${order._id}/edit`} className="btn-secondary flex items-center gap-1.5 text-xs py-2 px-3.5">
                <Edit2 size={14} />
                <span>Edit PO</span>
              </Link>
              <button onClick={handleSubmitForApproval} className="btn-primary flex items-center gap-1.5 text-xs py-2 px-3.5 shadow-teal-500/10 font-bold">
                <CheckCircle size={14} />
                <span>Submit for Approval</span>
              </button>
            </>
          )}

          {isUserApprover && (
            <Link
              to={`/imports/orders/${order._id}/approve`}
              className="bg-amber-650 hover:bg-amber-700 text-white font-bold py-2 px-3.5 rounded-lg text-xs shadow-sm flex items-center gap-1.5 transition-all shadow-amber-500/10"
            >
              <ShieldCheck size={14} />
              <span>Review PO Approval</span>
            </Link>
          )}

          {order.status === 'approved' && (
            <button onClick={handleMarkOrdered} className="btn-primary flex items-center gap-1.5 text-xs py-2 px-3.5 font-bold shadow-teal-500/10">
              <CheckCircle size={14} />
              <span>Mark as Ordered</span>
            </button>
          )}

          {order.status === 'ordered' && (
            <button onClick={() => setNotesModalOpen(true)} className="btn-primary flex items-center gap-1.5 text-xs py-2 px-3.5 font-bold shadow-teal-500/10">
              <Truck size={14} />
              <span>Mark In Transit</span>
            </button>
          )}

          {order.status === 'in_transit' && (
            <Link
              to={`/imports/orders/${order._id}/receive`}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-3.5 rounded-lg text-xs shadow-sm flex items-center gap-1.5 transition-all shadow-emerald-500/10"
            >
              <Package size={14} />
              <span>Record Goods Receipt</span>
            </Link>
          )}

          {['draft', 'pending_approval', 'approved', 'ordered', 'in_transit', 'partially_received'].includes(order.status) &&
            (user?.role === 'admin' || user?.role === 'manager') && (
              <button
                onClick={() => setCancelModalOpen(true)}
                className="bg-white border border-rose-200 text-rose-650 hover:bg-rose-50 py-2 px-3.5 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
              >
                <XCircle size={14} />
                <span>Cancel Order</span>
              </button>
            )}
        </div>
      </div>

      {/* Tabs list */}
      <div className="border-b border-slate-200 flex gap-6 text-xs font-bold text-slate-400">
        {[
          { key: 'details', label: 'Order details' },
          { key: 'items', label: 'Line items' },
          { key: 'approvals', label: 'Approval trail' },
          { key: 'receipts', label: 'Goods receipts' },
          { key: 'timeline', label: 'Timeline log' }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`pb-3 transition-all ${activeTab === tab.key ? 'text-teal-650 border-b-2 border-teal-650' : 'hover:text-slate-700'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left main content panel */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm lg:col-span-2 space-y-6">
          {/* TAB 1: DETAILS */}
          {activeTab === 'details' && (
            <div className="space-y-6 text-xs font-semibold">
              {/* Core specifics grid */}
              <div className="space-y-3">
                <h3 className="font-extrabold text-slate-800 border-b border-slate-100 pb-1.5 text-xs">Procurement Specifications</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6 text-slate-650">
                  <div className="flex justify-between border-b border-slate-50 pb-1">
                    <span>Incoterms:</span>
                    <span className="text-slate-900 font-bold uppercase">{order.incoterms || '—'}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-50 pb-1">
                    <span>Shipping Method:</span>
                    <span className="text-slate-900 font-bold uppercase">{order.shippingMethod || '—'}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-50 pb-1">
                    <span>Payment Terms:</span>
                    <span className="text-slate-900 font-bold">{order.paymentTerms || '—'}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-50 pb-1">
                    <span>Payment Status:</span>
                    <span className="text-slate-900 font-bold uppercase text-[10px]">{order.paymentStatus || 'unpaid'}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-50 pb-1">
                    <span>Exchange rate:</span>
                    <span className="text-slate-900 font-bold">1 {order.currency} = {order.exchangeRate} USD</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-50 pb-1">
                    <span>Amount Paid:</span>
                    <span className="text-slate-900 font-bold">${order.amountPaid?.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Delivery info grid */}
              <div className="space-y-3">
                <h3 className="font-extrabold text-slate-800 border-b border-slate-100 pb-1.5 text-xs">Logistics & Location</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6 text-slate-650">
                  <div className="flex justify-between border-b border-slate-50 pb-1">
                    <span>Warehouse:</span>
                    <span className="text-slate-900 font-bold">{order.warehouse?.name || '—'}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-50 pb-1">
                    <span>Expected Delivery Date:</span>
                    <span className="text-slate-900 font-bold">
                      {order.expectedDeliveryDate ? new Date(order.expectedDeliveryDate).toLocaleDateString() : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-slate-50 pb-1 sm:col-span-2">
                    <span>Destination Address:</span>
                    <span className="text-slate-900 font-bold">
                      {order.deliveryAddress
                        ? `${order.deliveryAddress.street || ''}, ${order.deliveryAddress.city || ''}, ${order.deliveryAddress.country || ''} (${order.deliveryAddress.postalCode || ''})`
                        : '—'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Tags, Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-3">
                <div className="space-y-2">
                  <span className="text-[10px] text-slate-400 font-extrabold uppercase">Supplier Notes</span>
                  <p className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-slate-700 min-h-[60px]">
                    {order.notes || 'No supplier notes added.'}
                  </p>
                </div>
                <div className="space-y-2">
                  <span className="text-[10px] text-slate-400 font-extrabold uppercase">Internal Notes</span>
                  <p className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-slate-700 min-h-[60px]">
                    {order.internalNotes || 'No internal notes added.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: LINE ITEMS */}
          {activeTab === 'items' && (
            <div className="space-y-4">
              <LineItemsTable 
                items={order.items || []} 
                isEditable={false} 
                currency={order.currency} 
              />
            </div>
          )}

          {/* TAB 3: APPROVAL TRAIL */}
          {activeTab === 'approvals' && (
            <ApprovalTrail 
              approvals={order.approvals || []} 
              requiredLevels={requiredLevels} 
              grandTotal={order.grandTotal} 
            />
          )}

          {/* TAB 4: GOODS RECEIPTS */}
          {activeTab === 'receipts' && (
            <GoodsReceiptTable receipts={receipts} />
          )}

          {/* TAB 5: TIMELINE */}
          {activeTab === 'timeline' && (
            <POTimelineLog events={timelineEvents} />
          )}
        </div>

        {/* Right summary cost block */}
        <div className="bg-slate-900 border border-slate-800 text-white rounded-xl p-6 shadow-md h-fit space-y-6 lg:col-span-1">
          {/* Supplier specifics */}
          <div className="space-y-3 pb-4 border-b border-slate-800">
            <span className="text-[10px] text-slate-450 font-extrabold uppercase tracking-wider block">
              Supplier Partner
            </span>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-teal-400 text-sm shrink-0">
                {order.supplier?.companyName?.charAt(0)}
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-slate-100 leading-tight">
                  {order.supplier?.companyName}
                </h4>
                <span className="text-[10px] text-slate-400 font-mono leading-none mt-0.5 block">
                  {order.supplier?.code}
                </span>
              </div>
            </div>
            <div className="text-[11px] text-slate-400 mt-2 space-y-1 font-medium">
              <div>Phone: {order.supplier?.phone || '—'}</div>
              <div>Email: {order.supplier?.email || '—'}</div>
            </div>
          </div>

          {/* Running costs summary */}
          <div className="space-y-3 font-semibold text-xs border-b border-slate-800 pb-4">
            <span className="text-[10px] text-slate-450 font-extrabold uppercase tracking-wider block">
              PO Financial Breakdown
            </span>
            <div className="flex justify-between text-slate-450">
              <span>Subtotal:</span>
              <span className="text-slate-150">${order.subtotal?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-slate-450">
              <span>Discounts:</span>
              <span className="text-rose-450">-${order.discountTotal?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-slate-450">
              <span>Taxes Sum:</span>
              <span className="text-slate-150">${order.taxTotal?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-slate-450">
              <span>Est. Shipping:</span>
              <span className="text-slate-150">${order.shippingCost?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-slate-450">
              <span>Other Charges:</span>
              <span className="text-slate-150">${order.otherCharges?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>

            <div className="border-t border-slate-800 pt-3 flex justify-between items-baseline">
              <span className="text-slate-400 font-extrabold">Grand Total:</span>
              <span className="text-2xl font-extrabold text-teal-400">
                ${order.grandTotal?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                <span className="text-[10px] text-slate-500 font-normal ml-1">{order.currency}</span>
              </span>
            </div>
          </div>

          <div className="space-y-2.5 font-medium text-[10px] text-slate-400">
            <div className="flex gap-2">
              <span className="font-bold text-slate-350">Created By:</span>
              <span>{order.createdBy?.name || '—'}</span>
            </div>
            <div className="flex gap-2">
              <span className="font-bold text-slate-350">Created At:</span>
              <span>{new Date(order.createdAt).toLocaleDateString()}</span>
            </div>
            <div className="flex gap-2">
              <span className="font-bold text-slate-350">Approval Route:</span>
              <span>Needs {order.grandTotal >= 5000 ? '2 Levels' : '1 Level'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Cancel Modal Dialog */}
      {cancelModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="font-extrabold text-slate-800 text-sm">Cancel Purchase Order</h3>
            <p className="text-xs text-slate-500">
              Are you sure you want to cancel {order.poNumber}? This status transition is irreversible.
            </p>
            <div className="space-y-1.5">
              <label className="form-label text-slate-700">Cancellation Reason *</label>
              <textarea
                rows="3"
                className="form-input text-xs"
                placeholder="Explain why this PO is being cancelled..."
                value={cancelComments}
                onChange={(e) => setCancelComments(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setCancelModalOpen(false)}
                className="bg-white border border-slate-250 hover:bg-slate-50 text-slate-700 py-1.5 px-3 rounded-lg text-xs font-bold transition-all shadow-sm"
              >
                No, Back
              </button>
              <button
                onClick={handleCancelPO}
                disabled={!cancelComments}
                className="bg-rose-650 hover:bg-rose-750 text-white font-bold py-1.5 px-3 rounded-lg text-xs disabled:opacity-50 transition-all shadow-sm"
              >
                Yes, Cancel Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mark In Transit Notes Modal Dialog */}
      {notesModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="font-extrabold text-slate-800 text-sm">Mark as In Transit</h3>
            <p className="text-xs text-slate-500">
              Provide transit details, tracking code, shipping line name, or B/L information.
            </p>
            <div className="space-y-1.5">
              <label className="form-label text-slate-700">Logistics Tracking Info *</label>
              <textarea
                rows="3"
                className="form-input text-xs"
                placeholder="e.g. Shipped via Maersk cargo liner container MAE-910238. Estimated ETA June 12."
                value={notesContent}
                onChange={(e) => setNotesContent(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setNotesModalOpen(false)}
                className="bg-white border border-slate-250 hover:bg-slate-50 text-slate-700 py-1.5 px-3 rounded-lg text-xs font-bold transition-all shadow-sm"
              >
                Back
              </button>
              <button
                onClick={handleMarkInTransit}
                disabled={!notesContent}
                className="btn-primary py-1.5 px-3 text-xs font-bold"
              >
                Mark In Transit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderDetail;
