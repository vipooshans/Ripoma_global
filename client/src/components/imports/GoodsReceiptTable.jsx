import React from 'react';
import { Package } from 'lucide-react';

const GoodsReceiptTable = ({ receipts = [] }) => {
  return (
    <div className="space-y-4">
      <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
        <Package size={16} className="text-teal-650" />
        <span>Goods Receipts Documents ({receipts.length})</span>
      </h3>

      {receipts.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-slate-200 rounded-xl text-slate-400 text-xs font-semibold bg-white/50">
          No goods receipts recorded against this purchase order yet.
        </div>
      ) : (
        <div className="space-y-3 font-semibold text-xs text-slate-700">
          {receipts.map(r => (
            <div
              key={r._id}
              className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 flex justify-between gap-4 items-center hover:bg-slate-50 transition-all shadow-sm"
            >
              <div>
                <div className="font-bold text-slate-900">{r.receiptNumber}</div>
                <div className="text-[10px] text-slate-450 leading-none mt-1">
                  Received at {r.warehouse?.name || 'Warehouse'} on {new Date(r.receivedAt).toLocaleDateString()} by {r.receivedBy?.name || 'Operator'}
                </div>
                {r.notes && (
                  <div className="text-[11px] text-slate-500 mt-2 bg-white p-2 rounded border border-slate-100 italic">
                    Note: "{r.notes}"
                  </div>
                )}
                {r.items && r.items.length > 0 && (
                  <div className="mt-2 text-[10px] text-slate-500">
                    <span className="font-bold text-slate-650">Intake Details:</span>
                    <ul className="list-disc list-inside mt-0.5 space-y-0.5">
                      {r.items.map((it, idx) => (
                        <li key={idx}>
                          {it.product?.sku || 'SKU'}: Received {it.quantityReceived} (Expected {it.quantityExpected}
                          {it.quantityRejected > 0 ? `, Rejected ${it.quantityRejected} due to ${it.rejectionReason || 'damaged condition'}` : ''})
                          {it.batchNumber ? ` [Batch: ${it.batchNumber}]` : ''}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <div className="text-right shrink-0">
                <span className="border border-slate-200 px-2 py-1 rounded text-[10px] bg-white font-bold text-slate-800 shadow-sm">
                  {r.items?.length || 0} product lines
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GoodsReceiptTable;
