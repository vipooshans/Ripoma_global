import React from 'react';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';

const DirectionBadge = ({ direction }) => {
  const isInbound = direction === 'inbound';
  
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wider border ${
        isInbound
          ? 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/20 dark:text-teal-400 dark:border-teal-900/50'
          : 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/20 dark:text-orange-400 dark:border-orange-900/50'
      }`}
    >
      {isInbound ? (
        <>
          <ArrowDownLeft className="h-3 w-3 stroke-[2.5]" />
          Inbound
        </>
      ) : (
        <>
          <ArrowUpRight className="h-3 w-3 stroke-[2.5]" />
          Outbound
        </>
      )}
    </span>
  );
};

export default DirectionBadge;
