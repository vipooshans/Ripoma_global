import React from 'react';
import { Plus, Trash2, Star } from 'lucide-react';

const emptyContact = { name: '', title: '', email: '', phone: '', isPrimary: false };

const ContactPersonList = ({ contacts = [], onChange, maxContacts = 10 }) => {
  const handleAdd = () => {
    if (contacts.length >= maxContacts) return;
    onChange([...contacts, { ...emptyContact }]);
  };

  const handleRemove = (idx) => {
    const updated = contacts.filter((_, i) => i !== idx);
    onChange(updated);
  };

  const handleChange = (idx, field, value) => {
    const updated = contacts.map((c, i) => i === idx ? { ...c, [field]: value } : c);
    onChange(updated);
  };

  const handleSetPrimary = (idx) => {
    const updated = contacts.map((c, i) => ({ ...c, isPrimary: i === idx }));
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      {contacts.length === 0 && (
        <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-xs font-semibold">
          No contact persons added yet.
        </div>
      )}

      {contacts.map((contact, idx) => (
        <div key={idx} className={`border rounded-xl p-4 space-y-3 ${contact.isPrimary ? 'border-teal-300 bg-teal-50/30' : 'border-slate-200 bg-white'}`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
              Contact #{idx + 1} {contact.isPrimary && <span className="text-teal-650 ml-1">★ Primary</span>}
            </span>
            <div className="flex items-center gap-1.5">
              {!contact.isPrimary && (
                <button
                  type="button"
                  onClick={() => handleSetPrimary(idx)}
                  className="text-[10px] font-bold text-slate-500 hover:text-teal-650 flex items-center gap-0.5 border border-slate-200 px-2 py-0.5 rounded"
                >
                  <Star size={10} /> Set Primary
                </button>
              )}
              <button
                type="button"
                onClick={() => handleRemove(idx)}
                className="p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="form-label">Full Name</label>
              <input
                type="text"
                className="form-input"
                value={contact.name}
                onChange={e => handleChange(idx, 'name', e.target.value)}
                placeholder="John Smith"
              />
            </div>
            <div>
              <label className="form-label">Job Title / Role</label>
              <input
                type="text"
                className="form-input"
                value={contact.title}
                onChange={e => handleChange(idx, 'title', e.target.value)}
                placeholder="Procurement Manager"
              />
            </div>
            <div>
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-input"
                value={contact.email}
                onChange={e => handleChange(idx, 'email', e.target.value)}
                placeholder="john@supplier.com"
              />
            </div>
            <div>
              <label className="form-label">Phone</label>
              <input
                type="tel"
                className="form-input"
                value={contact.phone}
                onChange={e => handleChange(idx, 'phone', e.target.value)}
                placeholder="+1 555 000 0000"
              />
            </div>
          </div>
        </div>
      ))}

      {contacts.length < maxContacts && (
        <button
          type="button"
          onClick={handleAdd}
          className="w-full py-2.5 border-2 border-dashed border-teal-200 hover:border-teal-400 text-teal-650 hover:text-teal-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
        >
          <Plus size={14} /> Add Contact Person
        </button>
      )}

      {contacts.length >= maxContacts && (
        <p className="text-center text-[10px] text-slate-400 font-semibold">Maximum {maxContacts} contacts reached.</p>
      )}
    </div>
  );
};

export default ContactPersonList;
