import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useCustomerDetail, useCreateCustomer, useUpdateCustomer } from '../../hooks/useCustomers';
import ContactPersonList from '../../components/suppliers-customers/ContactPersonList';
import RatingStarPicker from '../../components/suppliers-customers/RatingStarPicker';
import { ArrowLeft, Save } from 'lucide-react';

const TABS = ['Company Info', 'Contacts', 'Documents'];

const emptyAddress = { street: '', city: '', state: '', postalCode: '', country: '' };
const emptyForm = {
  companyName: '', code: '', type: 'retailer', status: 'active',
  country: '', website: '', taxId: '', currency: 'LKR', paymentTerms: '',
  creditLimit: '', outstandingBalance: '', rating: 0, tags: '', notes: '', source: '',
  address: { ...emptyAddress },
  shippingAddress: { ...emptyAddress },
  sameAsBilling: false,
  contacts: [], documents: []
};

const CustomerForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const [activeTab, setActiveTab] = useState(0);
  const [form, setForm] = useState(emptyForm);

  const { data: detail, isLoading } = useCustomerDetail(id);
  const createMut = useCreateCustomer();
  const updateMut = useUpdateCustomer();

  useEffect(() => {
    if (isEdit && detail?.customer) {
      const c = detail.customer;
      setForm({
        companyName: c.companyName || '', code: c.code || '',
        type: c.type || 'retailer', status: c.status || 'active',
        country: c.country || '', website: c.website || '', taxId: c.taxId || '',
        currency: c.currency || 'USD', paymentTerms: c.paymentTerms || '',
        creditLimit: c.creditLimit ?? '', outstandingBalance: c.outstandingBalance ?? '',
        rating: c.rating || 0, tags: c.tags?.join(', ') || '', notes: c.notes || '',
        source: c.source || '', sameAsBilling: false,
        address: c.address || emptyAddress,
        shippingAddress: c.shippingAddress || emptyAddress,
        contacts: c.contacts || [], documents: c.documents || []
      });
    }
  }, [isEdit, detail]);

  const handleSameAsBilling = (checked) => {
    setForm(f => ({
      ...f, sameAsBilling: checked,
      shippingAddress: checked ? { ...f.address } : emptyAddress
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.companyName) { toast.error('Company name is required.'); return; }

    const contacts = Array.isArray(form.contacts) ? form.contacts : [];
    const primary = contacts.find((c) => c?.isPrimary) || contacts[0];
    const email = (primary?.email || '').trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('A primary contact with a valid email is required.');
      setActiveTab(1);
      return;
    }

    const street = (form.address?.street || '').trim();
    const city = (form.address?.city || '').trim();
    const country = (form.address?.country || '').trim();
    if (!street || !city || !country) {
      toast.error('Address street, city, and country are required.');
      setActiveTab(0);
      return;
    }

    const payload = {
      ...form,
      tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      creditLimit: form.creditLimit !== '' ? parseFloat(form.creditLimit) : 0,
      outstandingBalance: form.outstandingBalance !== '' ? parseFloat(form.outstandingBalance) : 0,
      rating: form.rating || undefined
    };
    delete payload.sameAsBilling;
    try {
      if (isEdit) { await updateMut.mutateAsync({ id, ...payload }); toast.success('Customer updated.'); }
      else { await createMut.mutateAsync(payload); toast.success('Customer created.'); }
      navigate('/customers');
    } catch (err) { toast.error(err.response?.data?.message || 'Save failed.'); }
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
        <Link to="/customers" className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg shadow-sm"><ArrowLeft size={15} /></Link>
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">{isEdit ? 'Edit Customer' : 'New Customer'}</h1>
          <p className="text-slate-500 text-sm mt-0.5">{isEdit ? `Editing: ${form.companyName}` : 'Register a new customer account.'}</p>
        </div>
      </div>

      <div className="border-b border-slate-200 flex gap-1">
        {TABS.map((tab, i) => (
          <button key={i} onClick={() => setActiveTab(i)}
            className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 ${activeTab === i ? 'border-teal-500 text-teal-650' : 'border-transparent text-slate-400 hover:text-slate-700'}`}>
            {tab}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {activeTab === 0 && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="form-label required">Company Name</label>
                <input type="text" className="form-input" value={form.companyName} onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))} required />
              </div>
              <div>
                <label className="form-label">Customer Code</label>
                <input type="text" className="form-input font-mono uppercase" value={form.code} disabled={!isEdit} placeholder="Auto-generated" readOnly />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="form-label">Type</label>
                <select className="form-select" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                  {['retailer', 'wholesaler', 'distributor', 'end-user', 'government', 'other'].map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Status</label>
                <select className="form-select" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                  {['active', 'inactive', 'prospect', 'vip'].map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Country</label>
                <input type="text" className="form-input" value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} />
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
                <input type="text" className="form-input" value={form.paymentTerms} onChange={e => setForm(f => ({ ...f, paymentTerms: e.target.value }))} placeholder="Net 30..." />
              </div>
              <div>
                <label className="form-label">Source</label>
                <select className="form-select" value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))}>
                  <option value="">—</option>
                  {['referral', 'direct', 'trade-show', 'online', 'other'].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Credit Limit ($)</label>
                <input type="number" min="0" className="form-input" value={form.creditLimit} onChange={e => setForm(f => ({ ...f, creditLimit: e.target.value }))} />
              </div>
              <div>
                <label className="form-label">Outstanding Balance ($)</label>
                <input type="number" min="0" className="form-input" value={form.outstandingBalance} onChange={e => setForm(f => ({ ...f, outstandingBalance: e.target.value }))} />
              </div>
            </div>

            <div>
              <label className="form-label">Rating</label>
              <RatingStarPicker value={form.rating} onChange={val => setForm(f => ({ ...f, rating: val }))} />
            </div>

            <div>
              <label className="form-label">Tags (comma-separated)</label>
              <input type="text" className="form-input" value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="preferred, export-ready" />
            </div>

            <div>
              <label className="form-label">Notes</label>
              <textarea rows={3} className="form-input py-2" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>

            {/* Billing Address */}
            <div className="pt-2 border-t border-slate-100 space-y-3">
              <span className="text-[10px] text-slate-450 font-bold uppercase tracking-wider block">Billing Address</span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="md:col-span-2"><label className="form-label required">Street</label><input type="text" className="form-input" value={form.address.street} onChange={e => setForm(f => ({ ...f, address: { ...f.address, street: e.target.value } }))} required /></div>
                <div><label className="form-label required">City</label><input type="text" className="form-input" value={form.address.city} onChange={e => setForm(f => ({ ...f, address: { ...f.address, city: e.target.value } }))} required /></div>
                <div><label className="form-label required">Country</label><input type="text" className="form-input" value={form.address.country} onChange={e => setForm(f => ({ ...f, address: { ...f.address, country: e.target.value } }))} required /></div>
              </div>
            </div>

            {/* Shipping Address */}
            <div className="pt-2 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-450 font-bold uppercase tracking-wider">Shipping Address</span>
                <label className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600 cursor-pointer">
                  <input type="checkbox" className="form-checkbox" checked={form.sameAsBilling} onChange={e => handleSameAsBilling(e.target.checked)} />
                  Same as Billing
                </label>
              </div>
              {!form.sameAsBilling && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="md:col-span-2"><label className="form-label">Street</label><input type="text" className="form-input" value={form.shippingAddress.street} onChange={e => setForm(f => ({ ...f, shippingAddress: { ...f.shippingAddress, street: e.target.value } }))} /></div>
                  <div><label className="form-label">City</label><input type="text" className="form-input" value={form.shippingAddress.city} onChange={e => setForm(f => ({ ...f, shippingAddress: { ...f.shippingAddress, city: e.target.value } }))} /></div>
                  <div><label className="form-label">Country</label><input type="text" className="form-input" value={form.shippingAddress.country} onChange={e => setForm(f => ({ ...f, shippingAddress: { ...f.shippingAddress, country: e.target.value } }))} /></div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 1 && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <ContactPersonList contacts={form.contacts} onChange={contacts => setForm(f => ({ ...f, contacts }))} />
          </div>
        )}

        {activeTab === 2 && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <p className="text-xs text-slate-400 font-medium text-center py-8">Document uploads will be available in a future release.</p>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {activeTab > 0 && <button type="button" onClick={() => setActiveTab(t => t - 1)} className="bg-white border border-slate-200 text-slate-700 py-2 px-4 rounded-lg text-xs font-bold">← Previous</button>}
            {activeTab < TABS.length - 1 && <button type="button" onClick={() => setActiveTab(t => t + 1)} className="bg-white border border-slate-200 text-slate-700 py-2 px-4 rounded-lg text-xs font-bold">Next →</button>}
          </div>
          <div className="flex gap-2">
            <Link to="/customers" className="bg-white border border-slate-200 text-slate-700 py-2 px-4 rounded-lg text-xs font-bold shadow-sm">Cancel</Link>
            <button type="submit" disabled={isPending} className="btn-primary text-xs py-2 px-5 flex items-center gap-1.5">
              <Save size={13} /> {isPending ? 'Saving...' : isEdit ? 'Update Customer' : 'Create Customer'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CustomerForm;
