import React from 'react';
import { HardDrive } from 'lucide-react';

const formatBytes = (bytes) => {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

const StorageProgressBar = ({ usedBytes = 0, limitBytes = 5 * 1024 * 1024 * 1024 }) => {
  const pct = Math.min((usedBytes / limitBytes) * 100, 100);
  const color = pct > 85 ? 'bg-red-500' : pct > 60 ? 'bg-amber-500' : 'bg-teal-500';

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-slate-300 text-sm font-semibold">
          <HardDrive size={15} className="text-teal-400" />
          Storage Usage
        </div>
        <span className="text-xs text-slate-400">
          {formatBytes(usedBytes)} / {formatBytes(limitBytes)}
        </span>
      </div>
      <div className="w-full bg-slate-700 rounded-full h-2">
        <div
          className={`${color} h-2 rounded-full transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-[11px] text-slate-500 mt-1.5">{pct.toFixed(1)}% of quota used</p>
    </div>
  );
};

export default StorageProgressBar;
