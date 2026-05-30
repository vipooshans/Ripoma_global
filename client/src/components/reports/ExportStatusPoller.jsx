import React, { useEffect } from 'react';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

const ExportStatusPoller = ({ status, onComplete }) => {
  useEffect(() => {
    if (status === 'ready' && onComplete) {
      onComplete();
    }
  }, [status]);

  switch (status) {
    case 'generating':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-700 border border-amber-100 font-sans">
          <Loader2 size={12} className="animate-spin text-amber-600" />
          <span>Generating</span>
        </span>
      );
    case 'ready':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-100 font-sans">
          <CheckCircle size={12} className="text-emerald-600" />
          <span>Ready</span>
        </span>
      );
    case 'failed':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-rose-50 text-rose-700 border border-rose-100 font-sans">
          <XCircle size={12} className="text-rose-600" />
          <span>Failed</span>
        </span>
      );
    default:
      return null;
  }
};

export default ExportStatusPoller;
