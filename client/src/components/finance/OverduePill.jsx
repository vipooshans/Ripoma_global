import React from 'react';
import { AlertCircle } from 'lucide-react';

const OverduePill = ({ dueDate, isOverdue }) => {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  
  const due = dueDate ? new Date(dueDate) : null;
  const isPastDue = due && due < today;
  
  if (!isOverdue && !isPastDue) return null;

  let daysOverdue = 0;
  if (due) {
    daysOverdue = Math.max(0, Math.ceil((today - due) / (1000 * 60 * 60 * 24)));
  }

  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200 shadow-sm">
      <AlertCircle size={10} className="shrink-0 text-rose-500" />
      <span>{daysOverdue > 0 ? `${daysOverdue} days overdue` : 'Overdue'}</span>
    </span>
  );
};

export default OverduePill;
