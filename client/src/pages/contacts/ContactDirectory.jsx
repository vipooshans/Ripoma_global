import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Users, Building, User } from 'lucide-react';
import { useContacts } from '../../hooks/useCustomers';

const ContactDirectory = () => {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const { data, isLoading } = useContacts({ search, type: typeFilter });
  const contacts = data?.contacts || [];

  const initials = (name = '') => name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Contact Directory</h1>
        <p className="text-slate-500 text-sm mt-0.5">Unified view of all suppliers and customers across RIPOMA GLOBAL.</p>
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row items-center gap-3">
        <div className="relative sm:w-80 w-full">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
          <input type="text" className="form-input pl-9" placeholder="Search by company name or code..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <select className="form-select text-xs py-2" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            <option value="">All Contacts</option>
            <option value="supplier">Suppliers Only</option>
            <option value="customer">Customers Only</option>
          </select>
        </div>
        <span className="text-[10px] text-slate-400 font-bold ml-auto shrink-0">{contacts.length} records</span>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-slate-50 animate-pulse rounded-lg" />)}</div>
        ) : contacts.length === 0 ? (
          <div className="py-16 text-center">
            <Users className="text-slate-300 mx-auto mb-3" size={40} />
            <p className="text-slate-400 text-xs font-bold">No contacts found. Add suppliers or customers to populate this directory.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Company</th>
                  <th className="py-3 px-3">Code</th>
                  <th className="py-3 px-3">Entity Type</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3">Country</th>
                  <th className="py-3 px-3">Primary Contact</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {contacts.map((c) => {
                  const isSupplier = c.entityType === 'supplier';
                  const primary = c.contacts?.find(ct => ct.isPrimary) || c.contacts?.[0];
                  const profile = isSupplier ? `/suppliers/${c._id}` : `/customers/${c._id}`;

                  return (
                    <tr key={`${c.entityType}-${c._id}`} className="hover:bg-slate-50/50 cursor-pointer" onClick={() => window.location.href = profile}>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-full border flex items-center justify-center font-extrabold text-[10px] shrink-0 ${isSupplier ? 'bg-teal-500/10 border-teal-200 text-teal-700' : 'bg-purple-500/10 border-purple-200 text-purple-700'}`}>
                            {initials(c.companyName)}
                          </div>
                          <span className="font-bold text-slate-800 truncate max-w-[160px]">{c.companyName}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-3 font-mono text-[10px] font-bold text-slate-500">{c.code}</td>
                      <td className="py-3.5 px-3">
                        <span className={`border px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${isSupplier ? 'bg-teal-50 text-teal-700 border-teal-200' : 'bg-purple-50 text-purple-700 border-purple-200'}`}>
                          {isSupplier ? 'Supplier' : 'Customer'}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-slate-500 font-semibold capitalize">{c.type || '—'}</td>
                      <td className="py-3.5 px-3 text-slate-500 font-semibold">{c.country || '—'}</td>
                      <td className="py-3.5 px-3">
                        {primary ? (
                          <div className="leading-tight">
                            <span className="font-bold text-slate-700 text-[11px] block">{primary.name}</span>
                            <span className="text-[9px] text-slate-400">{primary.email}</span>
                          </div>
                        ) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="py-3.5 px-3">
                        <span className={`border px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                          c.status === 'active' ? 'bg-teal-50 text-teal-700 border-teal-200' :
                          c.status === 'vip' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                          c.status === 'prospect' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>{c.status}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <Link to={profile} onClick={e => e.stopPropagation()} className="text-teal-650 hover:text-teal-800 text-[10px] font-bold">View Profile →</Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContactDirectory;
