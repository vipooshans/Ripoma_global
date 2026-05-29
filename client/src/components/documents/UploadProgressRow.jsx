import React from 'react';
import { CheckCircle, XCircle, Loader } from 'lucide-react';
import FileTypeIcon from './FileTypeIcon';

const UploadProgressRow = ({ filename, extension, progress, status, error }) => {
  return (
    <div className="flex items-center gap-3 p-3 bg-slate-800 rounded-lg border border-slate-700">
      <FileTypeIcon extension={extension} size="sm" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-200 font-medium truncate">{filename}</p>
        {status === 'uploading' && (
          <div className="mt-1.5">
            <div className="w-full bg-slate-700 rounded-full h-1.5">
              <div
                className="bg-teal-500 h-1.5 rounded-full transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">{progress}% uploaded</p>
          </div>
        )}
        {status === 'done' && <p className="text-[11px] text-teal-400 mt-0.5">Upload complete</p>}
        {status === 'error' && <p className="text-[11px] text-red-400 mt-0.5">{error || 'Upload failed'}</p>}
      </div>
      <div className="flex-shrink-0">
        {status === 'uploading' && <Loader size={18} className="text-teal-400 animate-spin" />}
        {status === 'done' && <CheckCircle size={18} className="text-teal-400" />}
        {status === 'error' && <XCircle size={18} className="text-red-400" />}
      </div>
    </div>
  );
};

export default UploadProgressRow;
