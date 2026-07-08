import React from 'react';
import { X, ExternalLink } from 'lucide-react';

const ENTITY_LABELS = {
  ImportOrder: { label: 'Import Order', color: 'bg-blue-900/40 text-blue-400 border-blue-600/30' },
  ExportOrder: { label: 'Export Order', color: 'bg-emerald-900/40 text-emerald-400 border-emerald-600/30' },
  Invoice: { label: 'Invoice', color: 'bg-yellow-900/40 text-yellow-400 border-yellow-600/30' },
  Supplier: { label: 'Supplier', color: 'bg-orange-900/40 text-orange-400 border-orange-600/30' },
  Customer: { label: 'Customer', color: 'bg-pink-900/40 text-pink-400 border-pink-600/30' },
  Product: { label: 'Product', color: 'bg-indigo-900/40 text-indigo-400 border-indigo-600/30' },
  GoodsReceipt: { label: 'Goods Receipt', color: 'bg-teal-900/40 text-teal-400 border-teal-600/30' },
  Dispatch: { label: 'Dispatch', color: 'bg-cyan-900/40 text-cyan-400 border-cyan-600/30' },
};

const ENTITY_ROUTES = {
  ImportOrder: '/imports/orders',
  ExportOrder: '/exports/orders',
  Invoice: '/exports/invoices',
  Supplier: '/suppliers',
  Customer: '/customers',
  Product: '/inventory/products',
};

const LinkedEntityChips = ({ linkedEntities = [], onRemove, readOnly = false }) => {
  if (!linkedEntities.length) {
    return <p className="text-xs text-slate-600 italic">No linked entities</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {linkedEntities.map((link, idx) => {
        const config = ENTITY_LABELS[link.entityType] || { label: link.entityType, color: 'bg-slate-700 text-slate-400 border-slate-600' };
        const route = ENTITY_ROUTES[link.entityType];
        return (
          <div key={idx} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${config.color}`}>
            <span>{config.label}</span>
            {link.entityRef && <span className="opacity-70">· {link.entityRef}</span>}
            {route && (
              <a href={`${route}/${link.entityId}`} target="_blank" rel="noopener noreferrer"
                className="opacity-60 hover:opacity-100 transition-opacity">
                <ExternalLink size={10} />
              </a>
            )}
            {!readOnly && onRemove && (
              <button onClick={() => onRemove(idx)} className="opacity-60 hover:opacity-100 transition-opacity">
                <X size={10} />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};

export { ENTITY_LABELS };
export default LinkedEntityChips;
