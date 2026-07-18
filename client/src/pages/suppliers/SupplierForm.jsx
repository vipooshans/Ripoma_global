import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useSupplierDetail, useCreateSupplier, useUpdateSupplier } from '../../hooks/useSuppliers';
import ContactPersonList from '../../components/suppliers-customers/ContactPersonList';
import RatingStarPicker from '../../components/suppliers-customers/RatingStarPicker';
import { ArrowLeft, Save, Building2 } from 'lucide-react';
import api from '../../services/api';

const TABS = ['Company Info', 'Contacts', 'Bank & Docs'];

const emptyForm = {
  companyName: '', code: '', type: 'manufacturer', status: 'active',
  country: '', website: '', taxId: '', currency: 'USD', paymentTerms: '',
  leadTimeDays: '', rating: 0, tags: '', notes: '',
  address: { street: '', city: '', state: '', postalCode: '', country: '' },
  contacts: [],
  bankDetails: { bankName: '', accountNumber: '', swiftCode: '', iban: '' },
  documents: []
};

const SupplierForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const [activeTab, setActiveTab] = useState(0);
  const [form, setForm] = useState(emptyForm);
  const [showBank, setShowBank] = useState(false);

  const { data: detail, isLoading } = useSupplierDetail(id);
  const createMut = useCreateSupplier();
  const updateMut = useUpdateSupplier();

  useEffect(() => {
    if (isEdit && detail?.supplier) {
      const s = detail.supplier;
      setForm({
        companyName: s.companyName || '', code: s.code || '',
        type: s.type || 'manufacturer', status: s.status || 'active',
        country: s.country || '', website: s.website || '', taxId: s.taxId || '',
        currency: s.currency || 'USD', paymentTerms: s.paymentTerms || '',
        leadTimeDays: s.leadTimeDays ?? '', rating: s.rating || 0,
        tags: s.tags?.join(', ') || '', notes: s.notes || '',
        address: s.address || emptyForm.address,
        contacts: s.contacts || [],
        bankDetails: s.bankDetails || emptyForm.bankDetails,
        documents: s.documents || []
      });
    }
  }, [isEdit, detail]);

  const handleGenCode = async () => {
    try {
      const { data } = await api.post('/suppliers', { companyName: form.companyName || 'TEMP', _dryRun: true }).catch(() => ({ data: {} }));
      // Just generate a preview by incrementing counter locally
      const { data: d2 } = await api.get('/suppliers?limit=1&sort=createdAt:desc');
      const last = d2?.suppliers?.[0]?.code;
      if (last && last.startsWith('SUP-')) {
        const next = parseInt(last.replace('SUP-', '')) + 1;
        setForm(f => ({ ...f, code: `SUP-${String(next).padStart(5, '0')}` }));
      }
    } catch {}
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.companyName) { toast.error('Company name is required.'); return; }

    const contacts = Array.isArray(form.contacts) ? form.contacts : [];
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    let hasComplete = false;

    for (let i = 0; i < contacts.length; i++) {
      const c = contacts[i] || {};
      const name = (c.name || '').trim();
      const email = (c.email || '').trim();
      const phone = (c.phone || '').trim();
      const anySet = !!(name || email || phone);
      if (!anySet) continue;
      if (!name || !email || !phone) {
        toast.error(`Contact ${i + 1}: name, email, and phone are all required.`);
        setActiveTab(1);
        return;
      }
      if (!emailRe.test(email)) {
        toast.error(`Contact ${i + 1}: please provide a valid email address.`);
        setActiveTab(1);
        return;
      }
      hasComplete = true;
    }

    if (!hasComplete) {
      toast.error('At least one contact with name, email, and phone is required.');
      setActiveTab(1);
      return;
    }

    const payload = {
      ...form,
      tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      leadTimeDays: form.leadTimeDays !== '' ? parseInt(form.leadTimeDays) : undefined,
      rating: form.rating || undefined
    };
    delete payload._dryRun;

    try {
      if (isEdit) {
        await updateMut.mutateAsync({ id, ...payload });
        toast.success('Supplier updated.');
      } else {
        await createMut.mutateAsync(payload);
        toast.success('Supplier created.');
      }
      navigate('/suppliers');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed.');
    }
  };

  if (isEdit && isLoading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const isPending = createMut.isPending || updateMut.isPending;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <Link to="/suppliers" className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg shadow-sm"><ArrowLeft size={15} /></Link>
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            {isEdit ? 'Edit Supplier' : 'New Supplier'}
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">{isEdit ? `Editing: ${form.companyName}` : 'Register a new supplier or trading partner.'}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 flex gap-1">
        {TABS.map((tab, i) => (
          <button key={i} onClick={() => setActiveTab(i)}
            className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 ${activeTab === i ? 'border-teal-500 text-teal-650' : 'border-transparent text-slate-400 hover:text-slate-700'}`}>
            {tab}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Tab 0 — Company Info */}
        {activeTab === 0 && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="form-label required">Company Name</label>
                <input type="text" className="form-input" value={form.companyName} onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))} required />
              </div>
              <div>
                <label className="form-label">Supplier Code</label>
                <div className="flex gap-1.5">
                  <input type="text" className="form-input font-mono uppercase flex-1" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="Auto-generated" disabled={isEdit} />
                  {!isEdit && <button type="button" onClick={handleGenCode} className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 shrink-0">Generate</button>}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="form-label">Type</label>
                <select className="form-select" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                  {['manufacturer', 'distributor', 'trader', 'agent', 'other'].map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Status</label>
                <select className="form-select" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                  {['active', 'inactive', 'blacklisted'].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Country</label>
                <input type="text" className="form-input" value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} placeholder="China, Germany..." />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="form-label">Website</label>
                <input type="url" className="form-input" value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} placeholder="https://supplier.com" />
              </div>
              <div>
                <label className="form-label">Tax ID / VAT</label>
                <input type="text" className="form-input" value={form.taxId} onChange={e => setForm(f => ({ ...f, taxId: e.target.value }))} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="form-label">Currency</label>
                <select className="form-select" value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}>
                  {['USD', 'EUR', 'GBP', 'CNY', 'JPY', 'LKR', 'INR'].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Payment Terms</label>
                <input type="text" className="form-input" value={form.paymentTerms} onChange={e => setForm(f => ({ ...f, paymentTerms: e.target.value }))} placeholder="Net 30, 50% advance..." />
              </div>
              <div>
                <label className="form-label">Lead Time (days)</label>
                <input type="number" min="0" className="form-input" value={form.leadTimeDays} onChange={e => setForm(f => ({ ...f, leadTimeDays: e.target.value }))} />
              </div>
            </div>

            <div>
              <label className="form-label">Rating</label>
              <RatingStarPicker value={form.rating} onChange={val => setForm(f => ({ ...f, rating: val }))} />
            </div>

            <div>
              <label className="form-label">Tags (comma-separated)</label>
              <input type="text" className="form-input" value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="verified, preferred, iso-certified" />
            </div>

            <div>
              <label className="form-label">Notes</label>
              <textarea rows={3} className="form-input py-2" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>

            <div className="pt-2 border-t border-slate-100 space-y-3">
              <span className="text-[10px] text-slate-450 font-bold uppercase tracking-wider block">Address</span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="md:col-span-2"><label className="form-label">Street</label><input type="text" className="form-input" value={form.address.street} onChange={e => setForm(f => ({ ...f, address: { ...f.address, street: e.target.value } }))} /></div>
                <div><label className="form-label">City</label><input type="text" className="form-input" value={form.address.city} onChange={e => setForm(f => ({ ...f, address: { ...f.address, city: e.target.value } }))} /></div>
                <div><label className="form-label">Country</label><input type="text" className="form-input" value={form.address.country} onChange={e => setForm(f => ({ ...f, address: { ...f.address, country: e.target.value } }))} /></div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 1 — Contacts */}
        {activeTab === 1 && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <ContactPersonList contacts={form.contacts} onChange={contacts => setForm(f => ({ ...f, contacts }))} />
          </div>
        )}

        {/* Tab 2 — Bank & Docs */}
        {activeTab === 2 && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
            <h3 className="font-extrabold text-slate-800 text-xs border-b border-slate-100 pb-2">Bank Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="form-label">Bank Name</label><input type="text" className="form-input" value={form.bankDetails.bankName} onChange={e => setForm(f => ({ ...f, bankDetails: { ...f.bankDetails, bankName: e.target.value } }))} /></div>
              <div><label className="form-label">Account Number</label><input type="text" className="form-input" value={form.bankDetails.accountNumber} onChange={e => setForm(f => ({ ...f, bankDetails: { ...f.bankDetails, accountNumber: e.target.value } }))} /></div>
              <div><label className="form-label">SWIFT Code</label><input type="text" className="form-input" value={form.bankDetails.swiftCode} onChange={e => setForm(f => ({ ...f, bankDetails: { ...f.bankDetails, swiftCode: e.target.value } }))} /></div>
              <div><label className="form-label">IBAN</label><input type="text" className="form-input" value={form.bankDetails.iban} onChange={e => setForm(f => ({ ...f, bankDetails: { ...f.bankDetails, iban: e.target.value } }))} /></div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {activeTab > 0 && <button type="button" onClick={() => setActiveTab(t => t - 1)} className="bg-white border border-slate-200 text-slate-700 py-2 px-4 rounded-lg text-xs font-bold">← Previous</button>}
            {activeTab < TABS.length - 1 && <button type="button" onClick={() => setActiveTab(t => t + 1)} className="bg-white border border-slate-200 text-slate-700 py-2 px-4 rounded-lg text-xs font-bold">Next →</button>}
          </div>
          <div className="flex gap-2">
            <Link to="/suppliers" className="bg-white border border-slate-200 text-slate-700 py-2 px-4 rounded-lg text-xs font-bold shadow-sm">Cancel</Link>
            <button type="submit" disabled={isPending} className="btn-primary text-xs py-2 px-5 flex items-center gap-1.5">
              <Save size={13} /> {isPending ? 'Saving...' : isEdit ? 'Update Supplier' : 'Create Supplier'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default SupplierForm;
