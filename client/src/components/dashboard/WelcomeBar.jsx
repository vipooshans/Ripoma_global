import React from 'react';
import { useAuth } from '../../hooks/useAuth';

const greeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

const WelcomeBar = () => {
  const { user } = useAuth();
  const firstName = user?.name?.split(' ')[0] || 'there';
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-800 leading-tight">
          {greeting()},{' '}
          <span className="text-teal-600">{firstName}</span> 👋
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">{today}</p>
      </div>
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-teal-50 border border-teal-200 text-teal-700 text-xs font-bold uppercase tracking-wide">
          <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse"></span>
          {user?.role || 'Staff'}
        </span>
      </div>
    </div>
  );
};

export default WelcomeBar;
