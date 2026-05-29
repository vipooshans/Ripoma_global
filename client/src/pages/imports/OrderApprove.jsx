import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useImportOrderDetail, useApproveImportOrder, useRejectImportOrder } from '../../hooks/useImportOrders';
import {
  ArrowLeft,
  ShieldCheck,
  CheckCircle,
  XCircle,
  FileText,
  AlertTriangle,
  Info
} from 'lucide-react';
import toast from 'react-hot-toast';

const OrderApprove = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [comments, setComments] = useState('');

  // Queries
  const { data: detailData, isLoading } = useImportOrderDetail(id);

  // Mutations
  const approveMutation = useApproveImportOrder();
  const rejectMutation = useRejectImportOrder();

  if (isLoading) {
    return <div className="p-8 text-center text-slate-500 animate-pulse text-xs">Loading order details for review...</div>;
  }

  const order = detailData?.order;
  const requiredLevels = detailData?.requiredLevels || 1;

  if (!order) {
    return (
      <div className="p-8 text-center bg-white border border-slate-200 rounded-xl space-y-4 shadow-sm text-xs font-semibold">
        <p>Order not found.</p>
        <Link to="/imports/orders" className="btn-secondary py-1 px-3">Back to orders</Link>
      </div>
    );
  }

  const currentApprovedLevel = order.approvals?.length || 0;
  const pendingLevel = currentApprovedLevel + 1;

  const handleApprove = async () => {
    try {
      await approveMutation.mutateAsync({ id: order._id, comments });
      toast.success(`Level ${pendingLevel} approval recorded successfully.`);
      navigate(`/imports/orders/${order._id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error recording approval.');
    }
  };

  const handleReject = async () => {
    if (!comments) {
      toast.error('Rejection comments are required to send back to Draft status.');
      return;
    }
    try {
      await rejectMutation.mutateAsync({ id: order._id, comments });
      toast.success('PO Rejected. Status reverted to draft.');
      navigate(`/imports/orders/${order._id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error recording rejection.');
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          to={`/imports/orders/${order._id}`}
          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition-all"
        >
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Review Import Order</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Authorize or reject purchase order {order.poNumber} based on financial and supplier metrics.
          </p>
        </div>
      </div>

      {/* PO Summary Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold text-slate-700">
          <div className="space-y-2">
            <span className="text-[10px] text-slate-400 font-extrabold uppercase">Supplier Details</span>
            <div>
              <div className="font-extrabold text-slate-900 text-sm">{order.supplier?.companyName}</div>
              <div className="text-[10px] text-slate-450 mt-0.5">{order.supplier?.code}</div>
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-[10px] text-slate-400 font-extrabold uppercase">Destination Warehouse</span>
            <div className="font-extrabold text-slate-900 text-sm">{order.warehouse?.name}</div>
          </div>

          <div className="space-y-2">
            <span className="text-[10px] text-slate-400 font-extrabold uppercase">Order Totals</span>
            <div className="text-2xl font-extrabold text-teal-650">
              ${order.grandTotal?.toLocaleString()}
              <span className="text-[11px] text-slate-400 font-normal ml-1">{order.currency}</span>
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-[10px] text-slate-400 font-extrabold uppercase">Order Items Count</span>
            <div className="font-extrabold text-slate-900 text-sm">{order.items?.length || 0} line items</div>
          </div>
        </div>

        {order.notes && (
          <div className="space-y-1 bg-slate-50 p-3.5 rounded-lg border border-slate-100 text-xs">
            <span className="text-[10px] text-slate-400 font-extrabold uppercase">Supplier Instructions</span>
            <p className="text-slate-700 italic">"{order.notes}"</p>
          </div>
        )}
      </div>

      {/* Level indicators */}
      <div className="bg-sky-50 border border-sky-200 text-sky-850 rounded-xl p-4 flex items-start gap-3">
        <Info className="text-sky-650 shrink-0 mt-0.5" size={18} />
        <div>
          <h4 className="font-extrabold text-xs">Review Workflow: {requiredLevels}-Level Approval Gate</h4>
          <p className="text-[11px] text-sky-700 mt-1">
            This order requires approval at <strong className="font-bold">{requiredLevels} level(s)</strong>.
            Currently evaluating <strong className="font-bold">Level {pendingLevel} approval</strong>.
          </p>
        </div>
      </div>

      {/* Previous approvals list */}
      {currentApprovedLevel > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3 text-xs">
          <h4 className="font-extrabold text-slate-800">Previous Gate Clearances</h4>
          <div className="divide-y divide-slate-100 font-semibold text-slate-700">
            {order.approvals?.map(app => (
              <div key={app._id} className="py-2.5 flex justify-between gap-4 items-center">
                <div>
                  <div className="font-bold text-slate-900">Level {app.level} Gate Approved</div>
                  <div className="text-[10px] text-slate-450">By {app.approver?.name} ({app.approver?.email})</div>
                  {app.comments && <div className="text-[11px] text-slate-500 italic mt-1">"{app.comments}"</div>}
                </div>
                <div className="text-[10px] text-slate-400 font-normal">
                  {new Date(app.actionedAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Comments & Actions Form */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
        <div className="space-y-1.5">
          <label className="form-label text-slate-800">Review Comments & Rationale</label>
          <textarea
            rows="4"
            className="form-input text-xs"
            placeholder="Provide feedback on pricing, supplier capacity, delivery schedule alignment, or reasons for rejection..."
            value={comments}
            onChange={(e) => setComments(e.target.value)}
          />
          <span className="text-[10px] text-slate-400 block font-semibold">
            * Comments are optional for approval, but strictly required for rejection.
          </span>
        </div>

        <div className="flex gap-2.5 justify-end pt-3 border-t border-slate-100">
          <button
            onClick={handleReject}
            disabled={!comments}
            className="bg-red-600 hover:bg-red-750 text-white font-bold py-2.5 px-4 rounded-lg text-xs disabled:opacity-50 transition-all shadow-sm shadow-red-500/10 flex items-center gap-1.5"
          >
            <XCircle size={14} />
            <span>Reject Order</span>
          </button>
          <button
            onClick={handleApprove}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-lg text-xs transition-all shadow-sm shadow-emerald-500/10 flex items-center gap-1.5"
          >
            <CheckCircle size={14} />
            <span>Approve Gate</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderApprove;
