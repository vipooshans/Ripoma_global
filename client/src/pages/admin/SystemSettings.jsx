import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { Building2, Mail, Globe, Download, Save } from 'lucide-react';

const TABS = [
  { id: 'company', label: 'Company', icon: Building2 },
  { id: 'email', label: 'Email', icon: Mail },
  { id: 'currency', label: 'Currency', icon: Globe },
  { id: 'backup', label: 'Backup', icon: Download }
];

const emptyCompany = {
  legalName: '',
  tradingName: '',
  email: '',
  phone: '',
  taxId: '',
  website: '',
  address: { street: '', city: '', state: '', postalCode: '', country: '' }
};

const emptyEmail = {
  fromName: 'RIPOMA GLOBAL',
  fromEmail: '',
  smtpHost: '',
  smtpPort: 587,
  smtpSecure: false,
  smtpUser: '',
  smtpPass: '',
  hasPassword: false
};

const SystemSettings = () => {
  const [tab, setTab] = useState('company');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [company, setCompany] = useState(emptyCompany);
  const [email, setEmail] = useState(emptyEmail);
  const [baseCurrency, setBaseCurrency] = useState('USD');

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get('/settings');
        setCompany({
          ...emptyCompany,
          ...data.company,
          address: { ...emptyCompany.address, ...(data.company?.address || {}) }
        });
        setEmail({ ...emptyEmail, ...data.email, smtpPass: '' });
        setBaseCurrency(data.currency?.baseCurrency || 'USD');
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to load settings.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const saveCompany = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.put('/settings/company', company);
      setCompany({
        ...emptyCompany,
        ...data.company,
        address: { ...emptyCompany.address, ...(data.company?.address || {}) }
      });
      toast.success('Company settings saved.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const saveEmail = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...email };
      if (!payload.smtpPass) delete payload.smtpPass;
      delete payload.hasPassword;
      const { data } = await api.put('/settings/email', payload);
      setEmail({ ...emptyEmail, ...data.email, smtpPass: '' });
      toast.success('Email settings saved.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const downloadBackup = async () => {
    try {
      const res = await api.get('/settings/backup', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `ripoma-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Backup downloaded.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Backup failed.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">System Settings</h1>
        <p className="text-slate-500 text-sm mt-0.5">Admin-only company, email, currency, and backup controls.</p>
      </div>

      <div className="border-b border-slate-200 flex gap-1 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-xs font-bold whitespace-nowrap border-b-2 transition-all flex items-center gap-1.5 ${
              tab === t.id ? 'border-teal-500 text-teal-650' : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            <t.icon size={13} />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'company' && (
        <form onSubmit={saveCompany} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label required">Legal Name</label>
              <input className="form-input" value={company.legalName} onChange={(e) => setCompany((c) => ({ ...c, legalName: e.target.value }))} required />
            </div>
            <div>
              <label className="form-label">Trading Name</label>
              <input className="form-input" value={company.tradingName} onChange={(e) => setCompany((c) => ({ ...c, tradingName: e.target.value }))} />
            </div>
            <div>
              <label className="form-label required">Email</label>
              <input type="email" className="form-input" value={company.email} onChange={(e) => setCompany((c) => ({ ...c, email: e.target.value }))} required />
            </div>
            <div>
              <label className="form-label required">Phone</label>
              <input className="form-input" value={company.phone} onChange={(e) => setCompany((c) => ({ ...c, phone: e.target.value }))} required />
            </div>
            <div>
              <label className="form-label required">Tax ID</label>
              <input className="form-input" value={company.taxId} onChange={(e) => setCompany((c) => ({ ...c, taxId: e.target.value }))} required />
            </div>
            <div>
              <label className="form-label">Website</label>
              <input className="form-input" value={company.website} onChange={(e) => setCompany((c) => ({ ...c, website: e.target.value }))} />
            </div>
            <div className="md:col-span-2">
              <label className="form-label required">Street</label>
              <input className="form-input" value={company.address.street} onChange={(e) => setCompany((c) => ({ ...c, address: { ...c.address, street: e.target.value } }))} required />
            </div>
            <div>
              <label className="form-label required">City</label>
              <input className="form-input" value={company.address.city} onChange={(e) => setCompany((c) => ({ ...c, address: { ...c.address, city: e.target.value } }))} required />
            </div>
            <div>
              <label className="form-label">State</label>
              <input className="form-input" value={company.address.state} onChange={(e) => setCompany((c) => ({ ...c, address: { ...c.address, state: e.target.value } }))} />
            </div>
            <div>
              <label className="form-label">Postal Code</label>
              <input className="form-input" value={company.address.postalCode} onChange={(e) => setCompany((c) => ({ ...c, address: { ...c.address, postalCode: e.target.value } }))} />
            </div>
            <div>
              <label className="form-label required">Country</label>
              <input className="form-input" value={company.address.country} onChange={(e) => setCompany((c) => ({ ...c, address: { ...c.address, country: e.target.value } }))} required />
            </div>
          </div>
          <button type="submit" disabled={saving} className="btn-primary text-xs py-2 px-4 inline-flex items-center gap-1.5">
            <Save size={14} />
            {saving ? 'Saving…' : 'Save Company Info'}
          </button>
        </form>
      )}

      {tab === 'email' && (
        <form onSubmit={saveEmail} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">From Name</label>
              <input className="form-input" value={email.fromName} onChange={(e) => setEmail((x) => ({ ...x, fromName: e.target.value }))} />
            </div>
            <div>
              <label className="form-label required">From Email</label>
              <input type="email" className="form-input" value={email.fromEmail} onChange={(e) => setEmail((x) => ({ ...x, fromEmail: e.target.value }))} required />
            </div>
            <div>
              <label className="form-label required">SMTP Host</label>
              <input className="form-input" value={email.smtpHost} onChange={(e) => setEmail((x) => ({ ...x, smtpHost: e.target.value }))} required />
            </div>
            <div>
              <label className="form-label">SMTP Port</label>
              <input type="number" className="form-input" value={email.smtpPort} onChange={(e) => setEmail((x) => ({ ...x, smtpPort: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="form-label">SMTP User</label>
              <input className="form-input" value={email.smtpUser} onChange={(e) => setEmail((x) => ({ ...x, smtpUser: e.target.value }))} />
            </div>
            <div>
              <label className="form-label">SMTP Password</label>
              <input
                type="password"
                className="form-input"
                placeholder={email.hasPassword ? '•••••••• (unchanged if blank)' : 'Enter password'}
                value={email.smtpPass}
                onChange={(e) => setEmail((x) => ({ ...x, smtpPass: e.target.value }))}
              />
            </div>
            <div className="md:col-span-2 flex items-center gap-2">
              <input
                id="smtpSecure"
                type="checkbox"
                checked={!!email.smtpSecure}
                onChange={(e) => setEmail((x) => ({ ...x, smtpSecure: e.target.checked }))}
                className="rounded border-slate-300 text-teal-600"
              />
              <label htmlFor="smtpSecure" className="text-xs font-semibold text-slate-700">Use TLS/SSL (secure)</label>
            </div>
          </div>
          <button type="submit" disabled={saving} className="btn-primary text-xs py-2 px-4 inline-flex items-center gap-1.5">
            <Save size={14} />
            {saving ? 'Saving…' : 'Save Email Settings'}
          </button>
        </form>
      )}

      {tab === 'currency' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
          <p className="text-xs text-slate-600">
            Current base currency: <strong className="text-slate-900">{baseCurrency}</strong>
          </p>
          <p className="text-xs text-slate-500">
            Manage conversion rates and update the system base currency in the Currency Center.
          </p>
          <Link to="/finance/currency" className="btn-primary text-xs py-2 px-4 inline-flex items-center gap-1.5 w-fit">
            <Globe size={14} />
            Open Currency Center
          </Link>
        </div>
      )}

      {tab === 'backup' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            Download a JSON export of core catalogs (users without passwords, products, suppliers, customers,
            categories, warehouses, and settings). SMTP passwords are omitted from the file.
          </p>
          <button type="button" onClick={downloadBackup} className="btn-primary text-xs py-2 px-4 inline-flex items-center gap-1.5">
            <Download size={14} />
            Download Backup JSON
          </button>
        </div>
      )}
    </div>
  );
};

export default SystemSettings;
