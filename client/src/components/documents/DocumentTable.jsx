import React from 'react';
import { Link } from 'react-router-dom';
import { Download, Trash2, Eye, Clock, Lock } from 'lucide-react';
import FileTypeIcon from './FileTypeIcon';
import { CATEGORY_LABELS, formatBytes } from './DocumentCard';

const DocumentTable = ({ documents, onDownload, onDelete, selectedIds, onSelect, onSelectAll }) => {
  const allSelected = documents.length > 0 && documents.every(d => selectedIds.includes(d._id));

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-700">
            <th className="pb-3 px-2 text-left">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={() => onSelectAll && onSelectAll(allSelected)}
                className="w-4 h-4 rounded accent-teal-500"
              />
            </th>
            <th className="pb-3 px-2 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Document</th>
            <th className="pb-3 px-2 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Category</th>
            <th className="pb-3 px-2 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Size</th>
            <th className="pb-3 px-2 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Version</th>
            <th className="pb-3 px-2 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Expiry</th>
            <th className="pb-3 px-2 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Uploaded By</th>
            <th className="pb-3 px-2 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Date</th>
            <th className="pb-3 px-2 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {documents.map(doc => {
            const isExpired = doc.isExpired;
            const expiringWarning = !isExpired && doc.expiryDate &&
              new Date(doc.expiryDate) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

            return (
              <tr key={doc._id} className={`hover:bg-slate-800/60 transition-colors ${isExpired ? 'opacity-60' : ''}`}>
                <td className="py-3 px-2">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(doc._id)}
                    onChange={() => onSelect && onSelect(doc._id)}
                    className="w-4 h-4 rounded accent-teal-500"
                  />
                </td>
                <td className="py-3 px-2">
                  <div className="flex items-center gap-3">
                    <FileTypeIcon extension={doc.extension} size="sm" />
                    <div className="min-w-0">
                      <Link to={`/documents/${doc._id}`} className="font-medium text-slate-200 hover:text-teal-400 transition-colors block truncate max-w-[200px]">
                        {doc.name}
                      </Link>
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <span>{doc.docNumber}</span>
                        {doc.isConfidential && <Lock size={9} className="text-amber-400" />}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-2">
                  <span className="text-xs bg-slate-700 text-teal-400 px-2 py-0.5 rounded-full">
                    {CATEGORY_LABELS[doc.category] || doc.category}
                  </span>
                </td>
                <td className="py-3 px-2 text-xs text-slate-400">{formatBytes(doc.sizeBytes)}</td>
                <td className="py-3 px-2 text-xs text-slate-400">v{doc.version}</td>
                <td className="py-3 px-2">
                  {doc.expiryDate ? (
                    <span className={`flex items-center gap-1 text-xs font-medium
                      ${isExpired ? 'text-red-400' : expiringWarning ? 'text-amber-400' : 'text-slate-400'}`}>
                      <Clock size={10} />
                      {new Date(doc.expiryDate).toLocaleDateString()}
                      {isExpired && ' ✗'}
                    </span>
                  ) : <span className="text-slate-600 text-xs">—</span>}
                </td>
                <td className="py-3 px-2 text-xs text-slate-400">
                  {doc.uploadedBy?.firstName} {doc.uploadedBy?.lastName}
                </td>
                <td className="py-3 px-2 text-xs text-slate-400">
                  {new Date(doc.uploadedAt).toLocaleDateString()}
                </td>
                <td className="py-3 px-2">
                  <div className="flex items-center gap-1 justify-end">
                    <Link to={`/documents/${doc._id}`} className="p-1.5 rounded-lg hover:bg-teal-500/20 text-slate-400 hover:text-teal-400 transition-colors">
                      <Eye size={14} />
                    </Link>
                    <button onClick={() => onDownload?.(doc._id, doc.originalFilename)}
                      className="p-1.5 rounded-lg hover:bg-teal-500/20 text-slate-400 hover:text-teal-400 transition-colors">
                      <Download size={14} />
                    </button>
                    <button onClick={() => onDelete?.(doc._id)}
                      className="p-1.5 rounded-lg hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {documents.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          <p className="text-lg font-medium">No documents found</p>
          <p className="text-sm mt-1">Try adjusting your filters or upload a new document</p>
        </div>
      )}
    </div>
  );
};

export default DocumentTable;
