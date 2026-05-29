import React, { useState } from 'react';
import { X, Download, ExternalLink, ZoomIn, ZoomOut } from 'lucide-react';
import FileTypeIcon from './FileTypeIcon';
import { formatBytes } from './DocumentCard';

const PREVIEWABLE_IMAGES = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
const PREVIEWABLE_IFRAMES = ['pdf'];

const DocPreviewPanel = ({ doc, previewUrl, onClose, onDownload }) => {
  const [zoom, setZoom] = useState(100);
  const ext = (doc?.extension || '').toLowerCase();
  const isImage = PREVIEWABLE_IMAGES.includes(ext);
  const isPdf = PREVIEWABLE_IFRAMES.includes(ext);

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative ml-auto w-full max-w-4xl h-full bg-slate-900 border-l border-slate-700 flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <FileTypeIcon extension={ext} size="sm" />
            <div className="min-w-0">
              <p className="font-semibold text-slate-200 truncate">{doc?.name}</p>
              <p className="text-xs text-slate-500">{doc?.docNumber} · {formatBytes(doc?.sizeBytes)} · v{doc?.version}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {(isImage) && (
              <>
                <button onClick={() => setZoom(z => Math.max(25, z - 25))}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors">
                  <ZoomOut size={15} />
                </button>
                <span className="text-xs text-slate-400 w-10 text-center">{zoom}%</span>
                <button onClick={() => setZoom(z => Math.min(200, z + 25))}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors">
                  <ZoomIn size={15} />
                </button>
              </>
            )}
            <button onClick={() => onDownload?.(doc?._id, doc?.originalFilename)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-sm font-medium transition-colors">
              <Download size={14} /> Download
            </button>
            {previewUrl && (
              <a href={previewUrl} target="_blank" rel="noopener noreferrer"
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors">
                <ExternalLink size={15} />
              </a>
            )}
            <button onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Preview area */}
        <div className="flex-1 overflow-auto flex items-center justify-center p-4 bg-slate-950">
          {!previewUrl ? (
            <div className="text-center text-slate-500">
              <div className="mb-4"><FileTypeIcon extension={ext} size="xl" /></div>
              <p className="font-medium">Preview not available</p>
              <p className="text-sm mt-1">Download the file to view its contents</p>
            </div>
          ) : isImage ? (
            <img
              src={previewUrl}
              alt={doc?.name}
              style={{ maxWidth: `${zoom}%`, transition: 'max-width 0.2s ease' }}
              className="rounded-lg shadow-2xl object-contain"
            />
          ) : isPdf ? (
            <iframe
              src={previewUrl}
              title={doc?.name}
              className="w-full h-full rounded-lg border-0"
            />
          ) : (
            <div className="text-center text-slate-500">
              <div className="mb-4"><FileTypeIcon extension={ext} size="xl" /></div>
              <p className="font-medium text-slate-300">{doc?.originalFilename}</p>
              <p className="text-sm mt-1">This file type cannot be previewed in the browser</p>
              <button onClick={() => onDownload?.(doc?._id, doc?.originalFilename)}
                className="mt-4 flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-sm font-medium mx-auto transition-colors">
                <Download size={14} /> Download to View
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocPreviewPanel;
