import React from 'react';
import { X, Send, Calendar } from 'lucide-react';
import { useCreateCommunication } from '../../hooks/useCommunications';
import toast from 'react-hot-toast';

const TYPE_OPTIONS = ['email', 'call', 'meeting', 'note', 'whatsapp', 'other'];
const DIRECTION_OPTIONS = ['outbound', 'inbound', 'internal'];

const LogCommunicationSlideOver = ({ entityType, entityId, onClose }) => {
  const [form, setForm] = React.useState({
    type: 'email',
    direction: 'outbound',
    subject: '',
    body: '',
    followUpDate: ''
  });

  const createMutation = useCreateCommunication();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.type || !form.body) {
      toast.error('Type and body are required.');
      return;
    }
    try {
      await createMutation.mutateAsync({
        entityType,
        entityId,
        ...form,
        followUpDate: form.followUpDate || undefined
      });
      toast.success('Communication logged.');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to log communication.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 flex justify-end backdrop-blur-xs">
      <div className="bg-white border-l border-slate-200 shadow-2xl w-full max-w-md h-full flex flex-col animate-slide-in">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
            <Send className="text-teal-650" size={16} />
            Log Communication
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-650">
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label required">Type</label>
              <select className="form-select" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                {TYPE_OPTIONS.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Direction</label>
              <select className="form-select" value={form.direction} onChange={e => setForm(f => ({ ...f, direction: e.target.value }))}>
                {DIRECTION_OPTIONS.map(d => <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="form-label">Subject</label>
            <input
              type="text"
              className="form-input"
              placeholder="Re: Q2 Purchase Order"
              value={form.subject}
              onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
            />
          </div>

          <div>
            <label className="form-label required">Notes / Body</label>
            <textarea
              rows={5}
              className="form-input py-2"
              placeholder="Details of the communication..."
              value={form.body}
              onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
            />
          </div>

          <div>
            <label className="form-label flex items-center gap-1.5">
              <Calendar size={12} className="text-teal-650" />
              Follow-up Date (optional)
            </label>
            <input
              type="date"
              className="form-input"
              value={form.followUpDate}
              onChange={e => setForm(f => ({ ...f, followUpDate: e.target.value }))}
            />
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="bg-white border border-slate-250 hover:bg-slate-50 text-slate-700 py-2 px-4 rounded-lg text-xs font-bold shadow-sm">
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={createMutation.isPending}
            className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5"
          >
            <Send size={13} />
            {createMutation.isPending ? 'Saving...' : 'Log Entry'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LogCommunicationSlideOver;
