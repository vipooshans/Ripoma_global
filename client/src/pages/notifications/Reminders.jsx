import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import userService from '../../services/user.service';
import { 
  useReminders, 
  useCreateReminder, 
  useUpdateReminder, 
  useCompleteReminder, 
  useSnoozeReminder, 
  useDeleteReminder 
} from '../../hooks/useReminders';

const Reminders = () => {
  const navigate = useNavigate();

  // Load Reminders
  const { data: remindersData, isLoading, refetch } = useReminders();
  const reminders = remindersData?.reminders || [];

  // Load Users (for assignee dropdown)
  const { data: usersData } = useQuery({
    queryKey: ['usersList'],
    queryFn: async () => {
      const response = await userService.getUsers();
      return response.users || [];
    }
  });
  const users = usersData || [];

  // Mutations
  const createMut = useCreateReminder();
  const completeMut = useCompleteReminder();
  const snoozeMut = useSnoozeReminder();
  const deleteMut = useDeleteReminder();

  // Form & Slideover State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [assignedTo, setAssignedTo] = useState([]);
  
  // Recurrence
  const [recurrenceEnabled, setRecurrenceEnabled] = useState(false);
  const [frequency, setFrequency] = useState('daily');
  const [endDate, setEndDate] = useState('');

  // Linked Entity (Optional)
  const [entityType, setEntityType] = useState('');
  const [entityId, setEntityId] = useState('');
  const [entityRef, setEntityRef] = useState('');

  // Filtering tabs
  const [activeTab, setActiveTab] = useState('active'); // 'active', 'done'

  const resetForm = () => {
    setTitle('');
    setBody('');
    setDueAt('');
    setAssignedTo([]);
    setRecurrenceEnabled(false);
    setFrequency('daily');
    setEndDate('');
    setEntityType('');
    setEntityId('');
    setEntityRef('');
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!title || !dueAt) {
      toast.error('Title and Due Time are required.');
      return;
    }

    try {
      const payload = {
        title,
        body,
        dueAt: new Date(dueAt).toISOString(),
        assignedTo: assignedTo.length > 0 ? assignedTo : undefined,
        entityType: entityType || undefined,
        entityId: entityId || undefined,
        entityRef: entityRef || undefined,
        recurrence: {
          enabled: recurrenceEnabled,
          frequency: recurrenceEnabled ? frequency : undefined,
          endDate: recurrenceEnabled && endDate ? new Date(endDate).toISOString() : undefined
        }
      };

      await createMut.mutateAsync(payload);
      toast.success('Reminder created successfully.');
      setIsFormOpen(false);
      resetForm();
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create reminder.');
    }
  };

  const handleComplete = async (id) => {
    try {
      await completeMut.mutateAsync(id);
      toast.success('Reminder marked as completed.');
      refetch();
    } catch (err) {
      toast.error('Failed to complete reminder.');
    }
  };

  const handleSnooze = async (id, minutes) => {
    try {
      await snoozeMut.mutateAsync({ id, snoozeMinutes: minutes });
      toast.success(`Reminder snoozed for ${minutes} minutes.`);
      refetch();
    } catch (err) {
      toast.error('Failed to snooze reminder.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this reminder?')) return;
    try {
      await deleteMut.mutateAsync(id);
      toast.success('Reminder deleted.');
      refetch();
    } catch (err) {
      toast.error('Failed to delete reminder.');
    }
  };

  const activeReminders = reminders.filter(r => r.status !== 'done');
  const completedReminders = reminders.filter(r => r.status === 'done');
  const visibleReminders = activeTab === 'active' ? activeReminders : completedReminders;

  return (
    <div className="p-6 bg-slate-950 min-h-screen text-slate-100 relative">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="text-xs text-slate-500 mb-1 flex items-center gap-1.5">
            <span className="hover:text-slate-350 cursor-pointer" onClick={() => navigate('/notifications')}>Control Centre</span>
            <span>/</span>
            <span className="text-slate-300">Reminders</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Reminders Calendar Board</h1>
          <p className="text-slate-400 text-xs mt-0.5">Snooze, complete and schedule on-time email and in-app alerts.</p>
        </div>
        <button
          onClick={() => { resetForm(); setIsFormOpen(true); }}
          className="px-4 py-2 bg-teal-650 hover:bg-teal-500 text-white text-xs font-semibold rounded-lg shadow-lg shadow-teal-600/10 hover:shadow-teal-500/25 transition-all"
        >
          Create Reminder
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-850 mb-6 flex gap-4 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('active')}
          className={`pb-3 relative transition-colors ${
            activeTab === 'active' ? 'text-teal-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Active Reminders ({activeReminders.length})
          {activeTab === 'active' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-teal-400"></span>}
        </button>
        <button
          onClick={() => setActiveTab('done')}
          className={`pb-3 relative transition-colors ${
            activeTab === 'done' ? 'text-teal-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Completed ({completedReminders.length})
          {activeTab === 'done' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-teal-400"></span>}
        </button>
      </div>

      {/* Board Listing */}
      {isLoading ? (
        <div className="py-32 flex items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-500"></div>
        </div>
      ) : visibleReminders.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {visibleReminders.map((reminder) => {
            const isOverdue = new Date(reminder.dueAt) < new Date() && reminder.status !== 'done';
            
            return (
              <div
                key={reminder._id}
                className={`bg-slate-900 border rounded-xl p-5 flex flex-col justify-between transition-all hover:border-slate-700/60 shadow-xl ${
                  isOverdue ? 'border-amber-500/30 ring-1 ring-amber-500/10' : 'border-slate-800'
                }`}
              >
                <div>
                  <div className="flex justify-between items-start gap-2">
                    <h3 className="text-sm font-bold text-slate-100 line-clamp-1">{reminder.title}</h3>
                    {reminder.recurrence?.enabled && (
                      <span className="px-1.5 py-0.5 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20 text-[9px] font-bold uppercase">
                        {reminder.recurrence.frequency}
                      </span>
                    )}
                  </div>
                  
                  <p className="text-xs text-slate-400 mt-1.5 line-clamp-2 h-8">
                    {reminder.body || 'No notes added.'}
                  </p>

                  {/* Meta Details */}
                  <div className="mt-4 pt-4 border-t border-slate-850 space-y-2 text-[10px]">
                    <div className="flex justify-between">
                      <span className="text-slate-550">Alert Due Time:</span>
                      <span className={`font-semibold ${isOverdue ? 'text-amber-450 animate-pulse' : 'text-slate-300'}`}>
                        {new Date(reminder.dueAt).toLocaleString()}
                        {isOverdue && ' (Overdue)'}
                      </span>
                    </div>

                    {reminder.assignedTo && reminder.assignedTo.length > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-slate-550">Assignees:</span>
                        <div className="flex gap-1 flex-wrap">
                          {reminder.assignedTo.map(u => (
                            <span key={u._id} className="px-1 py-0.5 rounded bg-slate-850 border border-slate-800 text-slate-350">
                              {u.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {reminder.entityRef && (
                      <div className="flex justify-between">
                        <span className="text-slate-550">Linked Entity:</span>
                        <span className="px-1 py-0.5 bg-slate-950 border border-slate-850 text-teal-400 rounded">
                          {reminder.entityType}: {reminder.entityRef}
                        </span>
                      </div>
                    )}

                    {reminder.status === 'snoozed' && reminder.snoozeUntil && (
                      <div className="flex justify-between text-indigo-400">
                        <span>Snoozed Until:</span>
                        <span>{new Date(reminder.snoozeUntil).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Actions */}
                <div className="mt-5 pt-4 border-t border-slate-850 flex items-center justify-between gap-2">
                  {reminder.status !== 'done' ? (
                    <>
                      <button
                        onClick={() => handleComplete(reminder._id)}
                        className="px-2.5 py-1.5 bg-teal-950 border border-teal-900 text-[10px] text-teal-400 rounded-lg hover:bg-teal-900/30 transition-colors"
                      >
                        Complete
                      </button>

                      {/* Snooze Options */}
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleSnooze(reminder._id, 15)}
                          className="px-1.5 py-1 bg-slate-850 hover:bg-slate-800 border border-slate-800 text-[9px] text-slate-300 rounded"
                        >
                          Snooze 15m
                        </button>
                        <button
                          onClick={() => handleSnooze(reminder._id, 60)}
                          className="px-1.5 py-1 bg-slate-850 hover:bg-slate-800 border border-slate-800 text-[9px] text-slate-300 rounded"
                        >
                          1h
                        </button>
                      </div>
                    </>
                  ) : (
                    <span className="text-[10px] font-semibold text-emerald-450 flex items-center gap-1.5">
                      Completed ✅
                    </span>
                  )}

                  <button
                    onClick={() => handleDelete(reminder._id)}
                    className="px-2 py-1 hover:bg-rose-950/20 border border-transparent hover:border-rose-900/30 text-[10px] text-slate-500 hover:text-rose-400 rounded-md transition-all ml-auto"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-24 text-center bg-slate-900 border border-slate-800 rounded-xl">
          <p className="text-sm text-slate-450">No reminders registered in this list.</p>
        </div>
      )}

      {/* Create Slide-over Panel */}
      {isFormOpen && (
        <div className="fixed inset-0 overflow-hidden z-50 animate-fade-in bg-black/60 backdrop-blur-sm">
          <div className="absolute inset-0 overflow-hidden">
            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
              <div className="pointer-events-auto w-screen max-w-md bg-slate-900 border-l border-slate-800 p-6 flex flex-col justify-between text-slate-100 shadow-2xl animate-slide-in">
                {/* Form Header */}
                <div className="flex items-center justify-between pb-5 border-b border-slate-850">
                  <h2 className="text-base font-bold text-white">Create New Reminder</h2>
                  <button
                    onClick={() => setIsFormOpen(false)}
                    className="p-1 text-slate-450 hover:text-slate-200"
                  >
                    Close &times;
                  </button>
                </div>

                {/* Form Fields */}
                <form onSubmit={handleCreate} className="flex-1 overflow-y-auto py-5 space-y-4 pr-1">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Reminder Title *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Verify Customs clearance release code"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 text-slate-200 text-xs rounded-lg p-2.5 focus:ring-1 focus:ring-teal-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Detailed Notes</label>
                    <textarea
                      rows={3}
                      placeholder="e.g. Ensure we have HS documentation scanned and uploaded to client records."
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 text-slate-200 text-xs rounded-lg p-2.5 focus:ring-1 focus:ring-teal-500 outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Due Date & Time *</label>
                      <input
                        type="datetime-local"
                        required
                        value={dueAt}
                        onChange={(e) => setDueAt(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-850 text-slate-200 text-xs rounded-lg p-2.5 focus:ring-1 focus:ring-teal-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Assignee</label>
                      <select
                        multiple
                        value={assignedTo}
                        onChange={(e) => setAssignedTo(Array.from(e.target.selectedOptions, option => option.value))}
                        className="w-full bg-slate-950 border border-slate-850 text-slate-200 text-xs rounded-lg p-2 h-20 focus:ring-1 focus:ring-teal-500 outline-none"
                      >
                        {users.map(u => (
                          <option key={u._id} value={u._id}>{u.name} ({u.role})</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Recurrence Toggle */}
                  <div className="border-t border-slate-850 pt-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold text-slate-200">Recurring Reminder</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Auto-schedule this alert on a repeating cycle.</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={recurrenceEnabled}
                        onChange={(e) => setRecurrenceEnabled(e.target.checked)}
                        className="h-4 w-4 bg-slate-950 border-slate-800 rounded text-teal-650 focus:ring-teal-500 focus:ring-offset-slate-900"
                      />
                    </div>

                    {recurrenceEnabled && (
                      <div className="grid grid-cols-2 gap-4 animate-enter">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Frequency</label>
                          <select
                            value={frequency}
                            onChange={(e) => setFrequency(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-850 text-slate-200 text-xs rounded-lg p-2.5 focus:ring-1 focus:ring-teal-500 outline-none"
                          >
                            <option value="daily">Every Day</option>
                            <option value="weekly">Every Week</option>
                            <option value="monthly">Every Month</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Ending Date</label>
                          <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-850 text-slate-200 text-xs rounded-lg p-2.5 focus:ring-1 focus:ring-teal-500 outline-none"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Optional Entity Association */}
                  <div className="border-t border-slate-850 pt-4 space-y-3">
                    <p className="text-xs font-semibold text-slate-200">Associate Operation Entity (Optional)</p>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Entity Type</label>
                      <select
                        value={entityType}
                        onChange={(e) => setEntityType(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-850 text-slate-200 text-xs rounded-lg p-2.5 focus:ring-1 focus:ring-teal-500 outline-none"
                      >
                        <option value="">No Association</option>
                        <option value="Shipment">Shipment</option>
                        <option value="ImportOrder">Import Order</option>
                        <option value="ExportOrder">Export Order</option>
                        <option value="Payment">Payment</option>
                        <option value="Document">Document</option>
                      </select>
                    </div>

                    {entityType && (
                      <div className="grid grid-cols-2 gap-4 animate-enter">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Entity Code/Ref</label>
                          <input
                            type="text"
                            placeholder="e.g. SH-2025-0042"
                            value={entityRef}
                            onChange={(e) => setEntityRef(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-850 text-slate-200 text-xs rounded-lg p-2.5 focus:ring-1 focus:ring-teal-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Database ObjectId</label>
                          <input
                            type="text"
                            placeholder="24-char hex string"
                            value={entityId}
                            onChange={(e) => setEntityId(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-850 text-slate-200 text-xs rounded-lg p-2.5 focus:ring-1 focus:ring-teal-500 outline-none"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </form>

                {/* Form Footer */}
                <div className="pt-5 border-t border-slate-850 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => { setIsFormOpen(false); resetForm(); }}
                    className="px-4 py-2 bg-slate-950 border border-slate-800 text-xs font-semibold rounded-lg text-slate-400 hover:text-slate-250 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreate}
                    disabled={createMut.isPending}
                    className="px-4 py-2 bg-teal-650 hover:bg-teal-500 text-white text-xs font-semibold rounded-lg shadow-lg shadow-teal-650/10 hover:shadow-teal-500/25 transition-all disabled:opacity-50"
                  >
                    {createMut.isPending ? 'Creating...' : 'Create Reminder'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reminders;
