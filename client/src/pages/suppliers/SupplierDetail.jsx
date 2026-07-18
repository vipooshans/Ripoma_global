import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useSupplierDetail, useSupplierStats, useSupplierProducts, useDeleteSupplier, useUpdateSupplierStatus } from '../../hooks/useSuppliers';
import StatsKpiRow from '../../components/suppliers-customers/StatsKpiRow';
import RatingStarPicker from '../../components/suppliers-customers/RatingStarPicker';
import CommunicationTimeline from '../../components/suppliers-customers/CommunicationTimeline';
import { ArrowLeft, Edit2, Trash2, Globe, MapPin, Phone, Mail, Building, CreditCard, FileText, Eye, EyeOff, Package } from 'lucide-react';
import { DollarSign, Clock, Truck, ShoppingCart } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_COLORS = {
  active: 'bg-teal-50 text-teal-700 border-teal-200',
  inactive: 'bg-amber-50 text-amber-700 border-amber-200',
  blacklisted: 'bg-rose-50 text-rose-700 border-rose-200'
};

const TABS = ['Overview', 'Contacts', 'Products', 'Documents', 'Communications', 'Bank Details'];

const SupplierDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Overview');
  const [showBank, setShowBank] = useState(false);

  const { data, isLoading, error } = useSupplierDetail(id);
  const { data: stats, isLoading: statsLoading } = useSupplierStats(id);
  const { data: productsData } = useSupplierProducts(id);
  const deleteMut = useDeleteSupplier();
  const statusMut = useUpdateSupplierStatus();

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error || !data?.supplier) return (
    <div className="text-center py-12 max-w-md mx-auto space-y-4">
      <h3 className="font-extrabold text-slate-800 text-sm">Supplier Not Found</h3>
      <Link to="/suppliers" className="btn-primary text-xs py-2 px-4 block">Back to Directory</Link>
    </div>
  );

  const s = data.supplier;
  const products = productsData?.products || [];
  const initials = s.companyName?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '??';

  const kpiCards = [
    { title: 'Total Orders', value: stats?.totalOrders ?? '—', icon: ShoppingCart, colorClass: 'text-blue-600 bg-blue-50' },
    { title: 'Total Spend', value: stats?.totalSpend ? `$${stats.totalSpend.toLocaleString()}` : '$0', icon: DollarSign, colorClass: 'text-teal-600 bg-teal-50' },
    { title: 'Avg Lead Time', value: stats?.avgLeadTimeDays ? `${stats.avgLeadTimeDays}d` : '—', icon: Clock, colorClass: 'text-purple-600 bg-purple-50' },
    { title: 'On-Time Delivery', value: stats?.onTimePercent !== undefined ? `${stats.onTimePercent}%` : '—', icon: Truck, colorClass: 'text-amber-600 bg-amber-50' }
  ];

  const handleDelete = async () => {
    if (!window.confirm('Archive this supplier?')) return;
    try {
      await deleteMut.mutateAsync(id);
      toast.success('Archived.');
      navigate('/suppliers');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to archive supplier.');
    }
  };

  const mask = (str) => str ? '•'.repeat(str.length - 4) + str.slice(-4) : '—';

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link to="/suppliers" className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg shadow-sm mt-0.5"><ArrowLeft size={15} /></Link>
        <div className="flex-1 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-teal-500/10 border border-teal-200 flex items-center justify-center text-teal-700 font-extrabold text-lg shrink-0">
              {initials}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-extrabold text-slate-900">{s.companyName}</h1>
                <span className="text-[9px] bg-slate-100 border border-slate-200 text-slate-500 px-2 py-0.5 rounded font-mono font-bold">{s.code}</span>
                <span className="border px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 border-slate-200">{s.type}</span>
                <span className={`border px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${STATUS_COLORS[s.status]}`}>{s.status}</span>
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 flex-wrap">
                {s.country && <span className="flex items-center gap-1"><MapPin size={11} /> {s.country}</span>}
                {s.website && <a href={s.website} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-teal-650"><Globe size={11} /> Website</a>}
              </div>
              <div className="mt-1"><RatingStarPicker value={s.rating || 0} readOnly /></div>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <Link to={`/suppliers/${id}/edit`} className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 py-2 px-3.5 rounded-lg text-xs font-bold shadow-sm flex items-center gap-1.5"><Edit2 size={13} /> Edit</Link>
            <button onClick={handleDelete} className="bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 py-2 px-3.5 rounded-lg text-xs font-bold flex items-center gap-1.5"><Trash2 size={13} /> Archive</button>
          </div>
        </div>
      </div>

      {/* KPI Row */}
      <StatsKpiRow cards={kpiCards} loading={statsLoading} />

      {/* Tabs */}
      <div className="border-b border-slate-200 flex gap-1 overflow-x-auto">
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-xs font-bold whitespace-nowrap border-b-2 transition-all ${activeTab === tab ? 'border-teal-500 text-teal-650' : 'border-transparent text-slate-400 hover:text-slate-700'}`}>
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'Overview' && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-xs">
              {[
                ['Currency', s.currency], ['Payment Terms', s.paymentTerms],
                ['Lead Time', s.leadTimeDays ? `${s.leadTimeDays} days` : '—'],
                ['Tax ID', s.taxId || '—'], ['Country', s.country || '—'],
                ['Tags', s.tags?.join(', ') || '—'],
                ['Address', [s.address?.street, s.address?.city, s.address?.country].filter(Boolean).join(', ') || '—'],
              ].map(([k, v]) => (
                <div key={k} className="flex flex-col gap-0.5">
                  <span className="text-slate-400 font-semibold">{k}</span>
                  <span className="font-bold text-slate-800">{v || '—'}</span>
                </div>
              ))}
              {s.notes && (
                <div className="md:col-span-2">
                  <span className="text-slate-400 font-semibold block mb-1">Notes</span>
                  <p className="text-slate-700 leading-relaxed">{s.notes}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'Contacts' && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-3">
            {s.contacts?.length === 0 && <p className="text-slate-400 text-xs text-center py-6">No contact persons on record.</p>}
            {s.contacts?.map((c, i) => (
              <div key={i} className={`border rounded-xl p-4 ${c.isPrimary ? 'border-teal-200 bg-teal-50/20' : 'border-slate-200'}`}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 font-extrabold text-xs shrink-0">
                    {c.name?.charAt(0) || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                      {c.name}
                      {c.isPrimary && <span className="text-[8px] bg-teal-100 border border-teal-200 text-teal-700 px-1.5 rounded font-bold">PRIMARY</span>}
                    </p>
                    {c.title && <p className="text-[10px] text-slate-400 font-medium">{c.title}</p>}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-500">
                    {c.email && <a href={`mailto:${c.email}`} className="flex items-center gap-0.5 hover:text-teal-650"><Mail size={11} /> {c.email}</a>}
                    {c.phone && <a href={`tel:${c.phone}`} className="flex items-center gap-0.5 hover:text-teal-650"><Phone size={11} /> {c.phone}</a>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'Products' && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            {products.length === 0 ? (
              <p className="text-slate-400 text-xs text-center py-6">No products are linked to this supplier yet.</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {products.map(p => (
                  <Link key={p._id} to={`/inventory/products/${p._id}`} className="border border-slate-200 rounded-xl p-3 hover:border-teal-300 hover:bg-teal-50/20 transition-all text-center">
                    <Package className="mx-auto text-slate-300 mb-1.5" size={24} />
                    <p className="font-extrabold text-slate-800 text-[10px]">{p.sku}</p>
                    <p className="text-slate-500 text-[9px] mt-0.5 truncate">{p.name}</p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'Documents' && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            {s.documents?.length === 0 ? (
              <p className="text-slate-400 text-xs text-center py-6">No documents uploaded.</p>
            ) : (
              <div className="space-y-2">
                {s.documents.map((doc, i) => (
                  <div key={i} className="flex items-center justify-between border border-slate-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-xs">
                      <FileText size={14} className="text-slate-400" />
                      <span className="font-bold text-slate-700">{doc.name}</span>
                    </div>
                    {doc.url && <a href={doc.url} target="_blank" rel="noreferrer" className="text-[10px] text-teal-650 font-bold hover:underline">Download</a>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'Communications' && (
          <CommunicationTimeline entityType="supplier" entityId={id} />
        )}

        {activeTab === 'Bank Details' && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-slate-800 text-xs">Bank Account Information</h3>
              <button onClick={() => setShowBank(b => !b)} className="text-[10px] font-bold text-slate-500 hover:text-slate-700 flex items-center gap-1 border border-slate-200 px-2.5 py-1 rounded-lg">
                {showBank ? <><EyeOff size={11} /> Hide</> : <><Eye size={11} /> Reveal</>}
              </button>
            </div>
            {s.bankDetails ? (
              <div className="grid grid-cols-2 gap-4 text-xs">
                {[['Bank', s.bankDetails.bankName], ['Account', s.bankDetails.accountNumber], ['SWIFT', s.bankDetails.swiftCode], ['IBAN', s.bankDetails.iban]].map(([k, v]) => (
                  <div key={k}>
                    <span className="text-slate-400 font-semibold block">{k}</span>
                    <span className="font-mono font-bold text-slate-800">{showBank ? (v || '—') : mask(v)}</span>
                  </div>
                ))}
              </div>
            ) : <p className="text-slate-400 text-xs">No bank details on record.</p>}
          </div>
        )}
      </div>
    </div>
  );
};

export default SupplierDetail;
