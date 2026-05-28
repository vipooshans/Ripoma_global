import React from 'react';
import { useParams } from 'react-router-dom';
import CommunicationTimeline from '../../components/suppliers-customers/CommunicationTimeline';

const CommunicationLog = () => {
  const { type, id } = useParams();

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <span className="text-[10px] bg-slate-100 border border-slate-200 text-slate-500 px-2 py-0.5 rounded font-extrabold uppercase tracking-wider">
          {type}
        </span>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-1">
          Communication History
        </h1>
        <p className="text-slate-500 text-sm mt-0.5">Full communication log for this {type}.</p>
      </div>
      <CommunicationTimeline entityType={type} entityId={id} />
    </div>
  );
};

export default CommunicationLog;
