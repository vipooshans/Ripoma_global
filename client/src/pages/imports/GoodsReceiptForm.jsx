import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useImportOrderDetail } from '../../hooks/useImportOrders';
import { useCreateGoodsReceipt } from '../../hooks/useGoodsReceipts';
import {
  ArrowLeft,
  Package,
  Calendar,
  ShieldCheck,
  AlertCircle,
  Truck,
  CheckCircle,
  Info
} from 'lucide-react';
import toast from 'react-hot-toast';

const GoodsReceiptForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // Queries
  const { data: detailData, isLoading } = useImportOrderDetail(id);

  // Mutations
  const createGRNMutation = useCreateGoodsReceipt();

  // Form State
  const [carrierInfo, setCarrierInfo] = useState('');
  const [notes, setNotes] = useState('');
  const [receiptItems, setReceiptItems] = useState([]);

  // Populate items on load
  useEffect(() => {
    if (detailData?.order?.items) {
      const initialItems = detailData.order.items.map(item => {
        const qtyOrdered = item.quantityOrdered || 0;
        const qtyReceived = item.quantityReceived || 0;
        const pending = Math.max(0, qtyOrdered - qtyReceived);

        return {
          product: item.product?._id || item.product,
          sku: item.product?.sku || '',
          name: item.product?.name || '',
          quantityOrdered: qtyOrdered,
          quantityAlreadyReceived: qtyReceived,
          quantityReceived: pending, // Default to remaining pending quantity
          condition: 'good',
          batchNumber: '',
          expiryDate: ''
        };
      });
      setReceiptItems(initialItems);
    }
  }, [detailData]);

  if (isLoading) {
    return <div className="p-8 text-center text-slate-500 animate-pulse text-xs">Loading order items for receipt...</div>;
  }

  const order = detailData?.order;

  if (!order) {
    return (
      <div className="p-8 text-center bg-white border border-slate-200 rounded-xl space-y-4 shadow-sm text-xs font-semibold">
        <p>Order not found.</p>
        <Link to="/imports/orders" className="btn-secondary py-1 px-3">Back to orders</Link>
      </div>
    );
  }

  const handleItemChange = (idx, field, value) => {
    const updated = [...receiptItems];
    updated[idx] = {
      ...updated[idx],
      [field]: field === 'quantityReceived' ? (parseInt(value) || 0) : value
    };
    setReceiptItems(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validations
    const activeReceiptItems = receiptItems.filter(i => i.quantityReceived > 0);

    if (activeReceiptItems.length === 0) {
      toast.error('At least one item must have a received quantity greater than 0.');
      return;
    }

    // Check batch numbers for received items
    const missingBatches = activeReceiptItems.some(i => !i.batchNumber);
    if (missingBatches) {
      toast.error('All received products require a Batch Number for warehouse tracking.');
      return;
    }

    const payload = {
      importOrder: order._id,
      warehouse: order.warehouse?._id || order.warehouse,
      carrierInfo,
      notes,
      items: activeReceiptItems.map(i => ({
        product: i.product,
        quantityExpected: Math.max(0, (i.quantityOrdered || 0) - (i.quantityAlreadyReceived || 0)),
        quantityReceived: i.quantityReceived,
        condition: i.condition,
        batchNumber: i.batchNumber,
        expiryDate: i.expiryDate || null
      }))
    };

    try {
      await createGRNMutation.mutateAsync(payload);
      toast.success('Goods Receipt Note logged successfully and inventory updated.');
      navigate(`/imports/orders/${order._id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error logging Goods Receipt.');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          to={`/imports/orders/${order._id}`}
          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition-all"
        >
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Record Goods Receipt</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Log delivery items for {order.poNumber} at warehouse <strong>{order.warehouse?.name}</strong>.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Items logging card */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-extrabold text-slate-850 flex items-center gap-2">
            <Package size={16} className="text-teal-650" />
            <span>Delivery Intake Items</span>
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-450 font-bold uppercase">
                  <th className="py-2.5 pr-2">Product Details</th>
                  <th className="py-2.5 px-2 text-right">Ordered</th>
                  <th className="py-2.5 px-2 text-right">Received Already</th>
                  <th className="py-2.5 px-2 text-right w-[90px]">This Delivery *</th>
                  <th className="py-2.5 px-2 w-[110px]">Condition *</th>
                  <th className="py-2.5 px-2 w-[120px]">Batch Number *</th>
                  <th className="py-2.5 pl-2 w-[130px]">Expiry Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                {receiptItems.map((item, idx) => {
                  const pending = Math.max(0, item.quantityOrdered - item.quantityAlreadyReceived);
                  const isExceeded = item.quantityReceived > pending;

                  return (
                    <tr key={item.product}>
                      <td className="py-3 pr-2">
                        <span className="font-bold text-slate-900 leading-none">{item.sku}</span>
                        <span className="text-[10px] text-slate-450 mt-1 block leading-none">{item.name}</span>
                      </td>
                      <td className="py-3 px-2 text-right">{item.quantityOrdered}</td>
                      <td className="py-3 px-2 text-right text-emerald-600 font-bold">{item.quantityAlreadyReceived}</td>
                      <td className="py-3 px-2">
                        <input
                          type="number"
                          className={`form-input text-xs text-right py-1 px-2 ${isExceeded ? 'border-amber-300 bg-amber-50' : ''}`}
                          value={item.quantityReceived}
                          onChange={(e) => handleItemChange(idx, 'quantityReceived', e.target.value)}
                        />
                        {isExceeded && (
                          <span className="text-[9px] text-amber-600 block mt-0.5 leading-none">Over-receipt</span>
                        )}
                      </td>
                      <td className="py-3 px-2">
                        <select
                          className="form-select text-xs py-1 px-2"
                          value={item.condition}
                          onChange={(e) => handleItemChange(idx, 'condition', e.target.value)}
                        >
                          <option value="good">Good</option>
                          <option value="damaged">Damaged</option>
                          <option value="short_expiry">Short Expiry</option>
                        </select>
                      </td>
                      <td className="py-3 px-2">
                        <input
                          type="text"
                          placeholder="e.g. BATCH-01"
                          className="form-input text-xs py-1 px-2"
                          value={item.batchNumber}
                          onChange={(e) => handleItemChange(idx, 'batchNumber', e.target.value)}
                        />
                      </td>
                      <td className="py-3 pl-2">
                        <input
                          type="date"
                          className="form-input text-xs py-1 px-2"
                          value={item.expiryDate}
                          onChange={(e) => handleItemChange(idx, 'expiryDate', e.target.value)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Carrier Info & Delivery Notes */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-extrabold text-slate-850 flex items-center gap-2">
            <Truck size={16} className="text-teal-650" />
            <span>Carrier & Delivery Information</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label text-slate-700">Carrier / Dispatch / Driver Details</label>
              <input
                type="text"
                placeholder="e.g. DHL Express, Airway bill #120938, Driver John Doe"
                className="form-input text-xs"
                value={carrierInfo}
                onChange={(e) => setCarrierInfo(e.target.value)}
              />
            </div>

            <div>
              <label className="form-label text-slate-700">Delivery Intake Notes</label>
              <textarea
                rows="2"
                placeholder="Remarks about customs seal status, delivery delays, packaging quality..."
                className="form-input text-xs"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Footer buttons */}
        <div className="flex justify-end gap-2.5">
          <Link
            to={`/imports/orders/${order._id}`}
            className="bg-white border border-slate-250 hover:bg-slate-50 text-slate-700 py-2.5 px-4 rounded-lg text-xs font-bold transition-all shadow-sm"
          >
            Cancel
          </Link>
          <button
            type="submit"
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-5 rounded-lg text-xs shadow-sm shadow-emerald-500/10 flex items-center gap-1.5 transition-all"
          >
            <CheckCircle size={14} />
            <span>Complete Intake Goods Receipt</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default GoodsReceiptForm;
