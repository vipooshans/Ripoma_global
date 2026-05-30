import React from 'react';
import { useNavigate } from 'react-router-dom';
import { getNotificationStyle } from '../../constants/notificationTypes';

const NotificationToast = ({ t, notification, onClose }) => {
  const navigate = useNavigate();
  const { title, body, actionUrl, severity, type } = notification;
  const styleConfig = getNotificationStyle(type, severity);

  const handleClick = () => {
    onClose();
    if (actionUrl) {
      navigate(actionUrl);
    }
  };

  return (
    <div
      className={`${
        t.visible ? 'animate-enter' : 'animate-leave'
      } max-w-md w-full bg-slate-900/95 border border-slate-800 backdrop-blur-md shadow-2xl rounded-xl pointer-events-auto flex ring-1 ring-black/5 hover:border-teal-500/50 transition-all duration-300 overflow-hidden`}
    >
      <div 
        onClick={handleClick}
        className="flex-1 w-0 p-4 cursor-pointer hover:bg-slate-850/50 transition-colors"
      >
        <div className="flex items-start">
          <div className="flex-shrink-0 pt-0.5">
            <span className={`inline-flex items-center justify-center h-10 w-10 rounded-lg text-xl ${styleConfig.color}`}>
              {styleConfig.icon}
            </span>
          </div>
          <div className="ml-3 flex-1">
            <p className="text-sm font-semibold text-slate-100 flex items-center gap-1.5">
              {title}
              {severity === 'error' && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  Critical
                </span>
              )}
            </p>
            <p className="mt-1 text-xs text-slate-400 line-clamp-2">
              {body || 'Click to view details.'}
            </p>
          </div>
        </div>
      </div>
      <div className="flex border-l border-slate-850">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="w-full border border-transparent rounded-none rounded-r-xl p-4 flex items-center justify-center text-sm font-medium text-slate-400 hover:text-slate-200 focus:outline-none"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
};

export default NotificationToast;
