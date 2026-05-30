import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Shield, Calendar, Users, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

const ScheduleSlideOver = ({
  isOpen,
  onClose,
  onSave,
  schedule,
  reportDefinitions = [],
  isSaving = false
}) => {
  const [name, setName] = useState('');
  const [reportDefinitionId, setReportDefinitionId] = useState('');
  const [frequency, setFrequency] = useState('daily');
  const [dayOfWeek, setDayOfWeek] = useState(1); // 1 = Monday
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [time, setTime] = useState('07:00');
  const [format, setFormat] = useState('xlsx');
  
  // Recipients emails list
  const [recipients, setRecipients] = useState([{ email: '' }]);

  // Sync edits if defined
  useEffect(() => {
    if (schedule) {
      setName(schedule.name || '');
      setReportDefinitionId(schedule.reportDefinition?._id || schedule.reportDefinition || '');
      setFrequency(schedule.frequency || 'daily');
      setDayOfWeek(schedule.dayOfWeek !== undefined ? schedule.dayOfWeek : 1);
      setDayOfMonth(schedule.dayOfMonth !== undefined ? schedule.dayOfMonth : 1);
      setTime(schedule.time || '07:00');
      setFormat(schedule.format || 'xlsx');
      setRecipients(schedule.recipients?.length > 0 ? schedule.recipients : [{ email: '' }]);
    } else {
      setName('');
      setReportDefinitionId(reportDefinitions[0]?._id || '');
      setFrequency('daily');
      setDayOfWeek(1);
      setDayOfMonth(1);
      setTime('07:00');
      setFormat('xlsx');
      setRecipients([{ email: '' }]);
    }
  }, [schedule, isOpen, reportDefinitions]);

  if (!isOpen) return null;

  const handleAddRecipient = () => {
    setRecipients(prev => [...prev, { email: '' }]);
  };

  const handleRemoveRecipient = (idx) => {
    setRecipients(prev => prev.filter((_, i) => i !== idx));
  };

  const handleEmailChange = (idx, val) => {
    setRecipients(prev => {
      const updated = [...prev];
      updated[idx].email = val;
      return updated;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name) {
      toast.error('Please enter a schedule name.');
      return;
    }
    if (!reportDefinitionId) {
      toast.error('Please select a report template.');
      return;
    }

    const filteredRecipients = recipients.filter(r => r.email.trim());
    if (filteredRecipients.length === 0) {
      toast.error('Please add at least one recipient email.');
      return;
    }

    // Email regex validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalid = filteredRecipients.some(r => !emailRegex.test(r.email.trim()));
    if (invalid) {
      toast.error('Please enter valid email addresses.');
      return;
    }

    onSave({
      name,
      reportDefinitionId,
      frequency,
      dayOfWeek: frequency === 'weekly' ? Number(dayOfWeek) : undefined,
      dayOfMonth: (frequency === 'monthly' || frequency === 'quarterly') ? Number(dayOfMonth) : undefined,
      time,
      format,
      recipients: filteredRecipients
    });
  };

  const daysOfWeekList = [
    { value: 0, label: 'Sunday' },
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' }
  ];

  return (
    <>
      {/* Background slide-over overlay backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/60 z-50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Slide-over container */}
      <div className="fixed inset-y-0 right-0 z-50 flex max-w-full pl-10 font-sans text-xs">
        <div className="w-screen max-w-md transform bg-white shadow-2xl flex flex-col h-full border-l border-slate-200">
          
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-teal-50 text-teal-650 rounded-lg shadow-sm border border-teal-100">
                <Calendar size={18} />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-805">
                  {schedule ? 'Edit Report Schedule' : 'Create Automation Schedule'}
                </h3>
                <p className="text-[10px] text-slate-405">Automate CSV/Excel/PDF email pushes.</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-between overflow-hidden">
            
            {/* Scrollable inputs */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              
              {/* Name */}
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Schedule Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Sales Weekly Manager Push..."
                  className="w-full text-xs font-semibold text-slate-700 bg-white border border-slate-250 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  required
                />
              </div>

              {/* Linked report */}
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Target Report Template</label>
                <select
                  value={reportDefinitionId}
                  onChange={(e) => setReportDefinitionId(e.target.value)}
                  className="w-full text-xs font-bold text-slate-700 bg-white border border-slate-250 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  required
                >
                  <option value="" disabled>Select a saved template...</option>
                  {reportDefinitions.map(def => (
                    <option key={def._id} value={def._id}>{def.name} ({def.type.toUpperCase()})</option>
                  ))}
                </select>
              </div>

              {/* Frequency */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Recurrence Frequency</label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value)}
                    className="w-full text-xs font-bold text-slate-700 bg-white border border-slate-250 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Delivery Time</label>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full text-xs font-semibold text-slate-700 bg-white border border-slate-250 rounded-lg p-1.5 focus:outline-none focus:ring-1 focus:ring-teal-500"
                    required
                  />
                </div>
              </div>

              {/* Recurrence parameters based on frequency choice */}
              {frequency === 'weekly' && (
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Recurrence Day of Week</label>
                  <select
                    value={dayOfWeek}
                    onChange={(e) => setDayOfWeek(Number(e.target.value))}
                    className="w-full text-xs font-bold text-slate-700 bg-white border border-slate-250 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  >
                    {daysOfWeekList.map(day => (
                      <option key={day.value} value={day.value}>{day.label}</option>
                    ))}
                  </select>
                </div>
              )}

              {(frequency === 'monthly' || frequency === 'quarterly') && (
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Recurrence Day of Month</label>
                  <input
                    type="number"
                    min="1"
                    max="28"
                    value={dayOfMonth}
                    onChange={(e) => setDayOfMonth(Number(e.target.value))}
                    className="w-full text-xs font-semibold text-slate-700 bg-white border border-slate-250 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-teal-500"
                    required
                  />
                  <span className="text-[9px] text-slate-400 block mt-1">Accepts dates between 1st and 28th to prevent month length overflows.</span>
                </div>
              )}

              {/* Format select */}
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <FileText size={12} className="text-slate-400" />
                  <span>Report Attachment Format</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['xlsx', 'pdf', 'csv'].map(f => (
                    <label 
                      key={f} 
                      className={`border rounded-lg p-2.5 text-center font-bold cursor-pointer transition-all flex items-center justify-center uppercase select-none ${
                        format === f 
                          ? 'border-teal-500 bg-teal-50/50 text-teal-700 font-extrabold shadow-sm' 
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-500'
                      }`}
                    >
                      <input
                        type="radio"
                        name="format"
                        value={f}
                        checked={format === f}
                        onChange={() => setFormat(f)}
                        className="hidden"
                      />
                      <span>{f}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Recipients list */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <Users size={12} className="text-slate-400" />
                    <span>Notification Recipients List</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleAddRecipient}
                    className="text-[10px] font-bold text-teal-650 hover:underline flex items-center gap-0.5"
                  >
                    <Plus size={12} /> Add Email
                  </button>
                </div>
                
                <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                  {recipients.map((rec, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="email"
                        value={rec.email}
                        onChange={(e) => handleEmailChange(idx, e.target.value)}
                        placeholder="john.doe@ripomaglobal.com"
                        className="text-xs font-semibold text-slate-700 bg-white border border-slate-250 rounded-lg p-2 flex-1 focus:outline-none focus:ring-1 focus:ring-teal-500"
                        required
                      />
                      {recipients.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveRecipient(idx)}
                          className="text-slate-400 hover:text-rose-605 p-2 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Bottom Actions footer */}
            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="w-1/2 btn-secondary py-2.5 text-xs font-bold border-slate-350 bg-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="w-1/2 btn-primary py-2.5 text-xs font-bold"
              >
                {isSaving ? 'Saving...' : 'Apply Schedule'}
              </button>
            </div>

          </form>

        </div>
      </div>
    </>
  );
};

export default ScheduleSlideOver;
