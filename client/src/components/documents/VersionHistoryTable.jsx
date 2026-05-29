import React from 'react';
import { Download, User, Clock, MessageSquare } from 'lucide-react';
import FileTypeIcon from './FileTypeIcon';

const VersionHistoryTable = ({ versions = [], currentVersion, currentKey, onDownloadVersion }) => {
  const allVersions = [
    ...versions.map(v => ({ ...v, isCurrent: false })),
  ].sort((a, b) => b.version - a.version);

  return (
    <div className="space-y-2">
      {/* Current version */}
      <div className="flex items-center gap-3 p-3 bg-teal-500/10 border border-teal-500/30 rounded-lg">
        <div className="w-8 h-8 bg-teal-500/20 rounded-full flex items-center justify-center flex-shrink-0">
          <span className="text-xs font-bold text-teal-400">v{currentVersion}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-teal-400">Current Version (v{currentVersion})</p>
          <p className="text-xs text-slate-500">Active</p>
        </div>
        <span className="text-[10px] bg-teal-500/20 text-teal-400 px-2 py-0.5 rounded-full font-semibold border border-teal-500/20">LATEST</span>
      </div>

      {/* Previous versions */}
      {allVersions.length === 0 && (
        <p className="text-xs text-slate-600 italic px-1 py-2">No previous versions available.</p>
      )}

      {allVersions.map((v, idx) => (
        <div key={idx} className="flex items-center gap-3 p-3 bg-slate-800 border border-slate-700 rounded-lg hover:border-slate-600 transition-colors">
          <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-slate-400">v{v.version}</span>
          </div>
          <div className="flex-1 min-w-0 space-y-0.5">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <User size={10} />
              <span>{v.uploadedBy?.firstName} {v.uploadedBy?.lastName || '—'}</span>
              <Clock size={10} className="ml-1" />
              <span>{v.uploadedAt ? new Date(v.uploadedAt).toLocaleDateString() : '—'}</span>
            </div>
            {v.changeNote && (
              <div className="flex items-center gap-1 text-[11px] text-slate-500">
                <MessageSquare size={9} />
                <span className="italic">{v.changeNote}</span>
              </div>
            )}
          </div>
          {onDownloadVersion && (
            <button onClick={() => onDownloadVersion(v.storageKey, v.version)}
              className="p-1.5 rounded-lg hover:bg-teal-500/20 text-slate-500 hover:text-teal-400 transition-colors flex-shrink-0">
              <Download size={13} />
            </button>
          )}
        </div>
      ))}
    </div>
  );
};

export default VersionHistoryTable;
