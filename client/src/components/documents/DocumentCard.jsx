import React from 'react';
import { Link } from 'react-router-dom';
import { Download, Trash2, Eye, Clock, Lock, Tag } from 'lucide-react';
import FileTypeIcon from './FileTypeIcon';

const CATEGORY_LABELS = {
  commercial_invoice: 'Commercial Invoice',
  proforma_invoice: 'Proforma Invoice',
  packing_list: 'Packing List',
  bill_of_lading: 'Bill of Lading',
  airway_bill: 'Airway Bill',
  certificate_of_origin: 'Cert. of Origin',
  customs_declaration: 'Customs Decl.',
  insurance: 'Insurance',
  delivery_receipt: 'Delivery Receipt',
  purchase_order: 'Purchase Order',
  sales_order: 'Sales Order',
  goods_receipt: 'Goods Receipt',
  supplier_contract: 'Supplier Contract',
  customer_contract: 'Customer Contract',
  bank_document: 'Bank Document',
  tax_document: 'Tax Document',
  product_certificate: 'Product Cert.',
  quality_report: 'Quality Report',
  warehouse_receipt: 'Warehouse Receipt',
  other: 'Other'
};

const formatBytes = (bytes) => {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const DocumentCard = ({ doc, onDownload, onDelete, selected, onSelect }) => {
  const isExpired = doc.isExpired;
  const expiringWarning = !isExpired && doc.expiryDate &&
    new Date(doc.expiryDate) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  return (
    <div className={`relative bg-slate-800 rounded-xl border transition-all duration-200 group
      ${selected ? 'border-teal-500 ring-1 ring-teal-500/30' : 'border-slate-700 hover:border-teal-500/50'}
      ${isExpired ? 'opacity-70' : ''}`}>

      {/* Selection checkbox */}
      <div className="absolute top-3 left-3 z-10">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onSelect && onSelect(doc._id)}
          className="w-4 h-4 rounded accent-teal-500 cursor-pointer"
        />
      </div>

      {/* Confidential badge */}
      {doc.isConfidential && (
        <div className="absolute top-3 right-3 z-10">
          <span className="flex items-center gap-1 bg-amber-900/60 text-amber-400 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-amber-600/40">
            <Lock size={9} /> Confidential
          </span>
        </div>
      )}

      <div className="p-4 pt-8">
        {/* File icon + name */}
        <div className="flex flex-col items-center text-center mb-3">
          <FileTypeIcon extension={doc.extension} size="lg" />
          <Link to={`/documents/${doc._id}`} className="mt-3 text-sm font-semibold text-slate-100 hover:text-teal-400 transition-colors line-clamp-2">
            {doc.name}
          </Link>
          <span className="mt-1 text-[11px] text-slate-500">{doc.originalFilename}</span>
        </div>

        {/* Category */}
        <div className="flex justify-center mb-2">
          <span className="text-[11px] bg-slate-700 text-teal-400 px-2 py-0.5 rounded-full font-medium">
            {CATEGORY_LABELS[doc.category] || doc.category}
          </span>
        </div>

        {/* Tags */}
        {doc.tags?.length > 0 && (
          <div className="flex flex-wrap justify-center gap-1 mb-2">
            {doc.tags.slice(0, 3).map(tag => (
              <span key={tag} className="flex items-center gap-1 text-[10px] bg-slate-700/60 text-slate-400 px-2 py-0.5 rounded-full">
                <Tag size={8} /> {tag}
              </span>
            ))}
          </div>
        )}

        {/* Meta */}
        <div className="space-y-1 text-[11px] text-slate-500 border-t border-slate-700 pt-2 mt-2">
          <div className="flex justify-between">
            <span>Size</span>
            <span className="text-slate-300">{formatBytes(doc.sizeBytes)}</span>
          </div>
          <div className="flex justify-between">
            <span>Version</span>
            <span className="text-slate-300">v{doc.version}</span>
          </div>
          {doc.expiryDate && (
            <div className="flex justify-between">
              <span className="flex items-center gap-1">
                <Clock size={9} /> Expires
              </span>
              <span className={isExpired ? 'text-red-400 font-semibold' : expiringWarning ? 'text-amber-400 font-semibold' : 'text-slate-300'}>
                {new Date(doc.expiryDate).toLocaleDateString()}
                {isExpired && ' (Expired)'}
              </span>
            </div>
          )}
          <div className="flex justify-between">
            <span>By</span>
            <span className="text-slate-300 truncate max-w-[100px]">
              {doc.uploadedBy?.firstName} {doc.uploadedBy?.lastName}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-3">
          <Link to={`/documents/${doc._id}`} className="flex-1 flex items-center justify-center gap-1 text-[11px] py-1.5 rounded-lg bg-slate-700 hover:bg-teal-500/20 text-slate-300 hover:text-teal-400 transition-colors">
            <Eye size={12} /> View
          </Link>
          <button onClick={() => onDownload?.(doc._id, doc.originalFilename)}
            className="flex-1 flex items-center justify-center gap-1 text-[11px] py-1.5 rounded-lg bg-slate-700 hover:bg-teal-500/20 text-slate-300 hover:text-teal-400 transition-colors">
            <Download size={12} /> Download
          </button>
          <button onClick={() => onDelete?.(doc._id)}
            className="flex items-center justify-center px-2 py-1.5 rounded-lg bg-slate-700 hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-colors">
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </div>
  );
};

export { CATEGORY_LABELS, formatBytes };
export default DocumentCard;
