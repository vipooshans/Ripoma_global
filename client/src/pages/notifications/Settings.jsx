import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { 
  useNotificationPreferences, 
  useUpdateNotificationPreferences 
} from '../../hooks/useNotificationPreferences';
import { NOTIFICATION_TYPES } from '../../constants/notificationTypes';

const Settings = () => {
  const navigate = useNavigate();
  const { data, isLoading } = useNotificationPreferences();
  const updatePrefMut = useUpdateNotificationPreferences();

  // Local state for the settings form
  const [inAppEnabled, setInAppEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [emailDigest, setEmailDigest] = useState('instant');
  const [digestTime, setDigestTime] = useState('08:00');
  const [digestDayOfWeek, setDigestDayOfWeek] = useState(1);
  
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(false);
  const [quietHoursStart, setQuietHoursStart] = useState('22:00');
  const [quietHoursEnd, setQuietHoursEnd] = useState('07:00');

  // Overrides map
  const [typeOverrides, setTypeOverrides] = useState({});

  // Hydrate local state when data changes
  useEffect(() => {
    if (data?.preferences) {
      const p = data.preferences;
      setInAppEnabled(p.inAppEnabled ?? true);
      setEmailEnabled(p.emailEnabled ?? true);
      setEmailDigest(p.emailDigest ?? 'instant');
      setDigestTime(p.digestTime ?? '08:00');
      setDigestDayOfWeek(p.digestDayOfWeek ?? 1);
      setQuietHoursEnabled(p.quietHoursEnabled ?? false);
      setQuietHoursStart(p.quietHoursStart ?? '22:00');
      setQuietHoursEnd(p.quietHoursEnd ?? '07:00');
      
      // Mongoose Map gets returned as a standard JS object in lean queries
      setTypeOverrides(p.typeOverrides || {});
    }
  }, [data]);

  const handleOverrideToggle = (typeCode, channel) => {
    const currentOverride = typeOverrides[typeCode] || { inApp: inAppEnabled, email: emailEnabled };
    const updatedOverride = {
      ...currentOverride,
      [channel]: !currentOverride[channel]
    };

    setTypeOverrides(prev => ({
      ...prev,
      [typeCode]: updatedOverride
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        inAppEnabled,
        emailEnabled,
        emailDigest,
        digestTime,
        digestDayOfWeek,
        quietHoursEnabled,
        quietHoursStart,
        quietHoursEnd,
        typeOverrides
      };

      await updatePrefMut.mutateAsync(payload);
      toast.success('Notification preferences updated successfully.');
    } catch (err) {
      toast.error('Failed to save notification preferences.');
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 bg-slate-950 min-h-screen text-slate-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-slate-950 min-h-screen text-slate-100 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="text-xs text-slate-500 mb-1 flex items-center gap-1.5">
          <span className="hover:text-slate-350 cursor-pointer" onClick={() => navigate('/notifications')}>Control Centre</span>
          <span>/</span>
          <span className="text-slate-300">Preferences</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Alert Preferences</h1>
        <p className="text-slate-400 text-xs mt-0.5">Define quiet hours, set email digest intervals and select alert channels.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Master Toggles */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h2 className="text-sm font-bold text-white mb-4">Master Channels</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-200">In-App Alerts</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Receive real-time push alerts and bell indicators in the browser.</p>
              </div>
              <input
                type="checkbox"
                checked={inAppEnabled}
                onChange={(e) => setInAppEnabled(e.target.checked)}
                className="h-4 w-4 bg-slate-950 border-slate-800 rounded text-teal-600 focus:ring-teal-500 focus:ring-offset-slate-900"
              />
            </div>
            <div className="flex items-center justify-between border-t border-slate-850 pt-4">
              <div>
                <p className="text-xs font-semibold text-slate-200">Email Delivery</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Deliver summaries or instant action alerts directly to your mailbox.</p>
              </div>
              <input
                type="checkbox"
                checked={emailEnabled}
                onChange={(e) => setEmailEnabled(e.target.checked)}
                className="h-4 w-4 bg-slate-950 border-slate-800 rounded text-teal-600 focus:ring-teal-500 focus:ring-offset-slate-900"
              />
            </div>
          </div>
        </div>

        {/* Quiet Hours */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-white">Suppression Window (Quiet Hours)</h2>
              <p className="text-[11px] text-slate-400 mt-0.5">Suppress email and push delivery during off-hours (critical errors bypass this settings).</p>
            </div>
            <input
              type="checkbox"
              checked={quietHoursEnabled}
              onChange={(e) => setQuietHoursEnabled(e.target.checked)}
              className="h-4 w-4 bg-slate-950 border-slate-800 rounded text-teal-600 focus:ring-teal-500 focus:ring-offset-slate-900"
            />
          </div>

          {quietHoursEnabled && (
            <div className="grid grid-cols-2 gap-4 border-t border-slate-850 pt-4 animate-enter">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Quiet Hours Start</label>
                <input
                  type="time"
                  value={quietHoursStart}
                  onChange={(e) => setQuietHoursStart(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 text-slate-200 text-xs rounded-lg p-2.5 focus:ring-1 focus:ring-teal-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Quiet Hours End</label>
                <input
                  type="time"
                  value={quietHoursEnd}
                  onChange={(e) => setQuietHoursEnd(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 text-slate-200 text-xs rounded-lg p-2.5 focus:ring-1 focus:ring-teal-500 outline-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Email Digest Settings */}
        {emailEnabled && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-sm font-bold text-white mb-4">Email Digest Schedule</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Delivery Frequency</label>
                <select
                  value={emailDigest}
                  onChange={(e) => setEmailDigest(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 text-slate-200 text-xs rounded-lg p-2.5 focus:ring-1 focus:ring-teal-500 outline-none"
                >
                  <option value="instant">Instant Alerts (as they happen)</option>
                  <option value="daily">Daily Summary Digest</option>
                  <option value="weekly">Weekly Summary Digest</option>
                  <option value="never">Do Not Email</option>
                </select>
              </div>

              {(emailDigest === 'daily' || emailDigest === 'weekly') && (
                <div className="grid grid-cols-2 gap-4 border-t border-slate-850 pt-4 animate-enter">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Digest Send Time</label>
                    <input
                      type="time"
                      value={digestTime}
                      onChange={(e) => setDigestTime(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 text-slate-200 text-xs rounded-lg p-2.5 focus:ring-1 focus:ring-teal-500 outline-none"
                    />
                  </div>
                  {emailDigest === 'weekly' && (
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Digest Day</label>
                      <select
                        value={digestDayOfWeek}
                        onChange={(e) => setDigestDayOfWeek(parseInt(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-850 text-slate-200 text-xs rounded-lg p-2.5 focus:ring-1 focus:ring-teal-500 outline-none"
                      >
                        <option value={1}>Monday</option>
                        <option value={2}>Tuesday</option>
                        <option value={3}>Wednesday</option>
                        <option value={4}>Thursday</option>
                        <option value={5}>Friday</option>
                        <option value={6}>Saturday</option>
                        <option value={0}>Sunday</option>
                      </select>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Granular Overrides */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h2 className="text-sm font-bold text-white mb-2">Granular Event Controls</h2>
          <p className="text-[11px] text-slate-400 mb-4">Select which specific operational events should trigger push alerts or emails.</p>
          
          <div className="border border-slate-850 rounded-lg overflow-hidden divide-y divide-slate-850 bg-slate-950/40">
            <div className="grid grid-cols-6 p-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-950">
              <span className="col-span-4">Alert Event type</span>
              <span className="col-span-1 text-center">In-App</span>
              <span className="col-span-1 text-center">Email</span>
            </div>

            {Object.entries(NOTIFICATION_TYPES).map(([typeCode, details]) => {
              const currentOverride = typeOverrides[typeCode] || {};
              const inAppChecked = currentOverride.inApp !== undefined ? currentOverride.inApp : inAppEnabled;
              const emailChecked = currentOverride.email !== undefined ? currentOverride.email : emailEnabled;

              return (
                <div key={typeCode} className="grid grid-cols-6 p-3 text-xs items-center hover:bg-slate-900/30 transition-colors">
                  <span className="col-span-4 font-medium text-slate-250 flex items-center gap-2">
                    <span className="text-base">{details.icon}</span>
                    {details.label}
                  </span>
                  
                  {/* In-App override checkbox */}
                  <span className="col-span-1 flex justify-center">
                    <input
                      type="checkbox"
                      checked={inAppChecked}
                      onChange={() => handleOverrideToggle(typeCode, 'inApp')}
                      className="h-3.5 w-3.5 bg-slate-950 border-slate-800 rounded text-teal-650 focus:ring-teal-500 focus:ring-offset-slate-950"
                    />
                  </span>

                  {/* Email override checkbox */}
                  <span className="col-span-1 flex justify-center">
                    <input
                      type="checkbox"
                      checked={emailChecked}
                      onChange={() => handleOverrideToggle(typeCode, 'email')}
                      className="h-3.5 w-3.5 bg-slate-950 border-slate-800 rounded text-teal-650 focus:ring-teal-500 focus:ring-offset-slate-950"
                    />
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/notifications')}
            className="px-5 py-2.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-semibold rounded-lg text-slate-300 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={updatePrefMut.isPending}
            className="px-5 py-2.5 bg-teal-650 hover:bg-teal-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-teal-650/10 hover:shadow-teal-500/25 transition-all disabled:opacity-50"
          >
            {updatePrefMut.isPending ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Settings;
