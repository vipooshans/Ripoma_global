import React from 'react';

const ContainerPayloadBar = ({ currentPayload, maxPayload, tare }) => {
  const current = currentPayload || 0;
  const max = maxPayload || 25000; // default 25t if not provided
  
  const percentage = Math.min(100, Math.round((current / max) * 100));
  
  let barColor = 'bg-teal-500';
  let textColor = 'text-teal-700 dark:text-teal-400';
  if (percentage >= 95) {
    barColor = 'bg-rose-500';
    textColor = 'text-rose-700 dark:text-rose-400';
  } else if (percentage >= 80) {
    barColor = 'bg-amber-500';
    textColor = 'text-amber-700 dark:text-amber-400';
  }

  // Format values to metric tons (t) or kg
  const formatWeight = (w) => {
    if (w >= 1000) {
      return `${(w / 1000).toFixed(2)} t`;
    }
    return `${w} kg`;
  };

  return (
    <div className="w-full space-y-1">
      <div className="flex justify-between items-center text-xs">
        <span className="font-medium text-slate-500 dark:text-slate-400">
          Payload Weight: <strong className="text-slate-700 dark:text-slate-200">{formatWeight(current)}</strong> / {formatWeight(max)}
        </span>
        <span className={`font-bold ${textColor}`}>{percentage}%</span>
      </div>
      <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200/50 dark:border-slate-700/50">
        <div 
          className={`h-full ${barColor} transition-all duration-500 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {tare && (
        <div className="text-[10px] text-slate-400 dark:text-slate-500">
          Tare Weight: {formatWeight(tare)} | Max gross capacity: {formatWeight(max + tare)}
        </div>
      )}
    </div>
  );
};

export default ContainerPayloadBar;
