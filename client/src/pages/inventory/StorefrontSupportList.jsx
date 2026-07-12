import React, { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Search,
  RefreshCw,
  Headphones,
  Loader2,
  Send,
  X,
  MessageSquare
} from 'lucide-react';
import storefrontSupportAdminService from '../../services/storefrontSupportAdmin.service';

const statusClass = (status) => {
  const map = {
    open: 'bg-sky-50 text-sky-700 border-sky-200',
    in_progress: 'bg-amber-50 text-amber-700 border-amber-200',
    resolved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    closed: 'bg-slate-50 text-slate-600 border-slate-200'
  };
  return map[status] || 'bg-slate-50 text-slate-600 border-slate-200';
};

const typeLabel = (t) => {
  if (t === 'complaint') return 'Complaint';
  if (t === 'chat') return 'Chat';
  return 'Inquiry';
};

const formatWhen = (iso) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return '—';
  }
};

const customerLabel = (ticket) => {
  if (ticket.customerAccount) {
    const name = [ticket.customerAccount.firstName, ticket.customerAccount.lastName]
      .filter(Boolean)
      .join(' ');
    return name || ticket.customerAccount.email || 'Customer';
  }
  return ticket.guestName || ticket.guestEmail || 'Guest';
};

const StorefrontSupportList = () => {
  const [tickets, setTickets] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('open');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);

  const [selected, setSelected] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await storefrontSupportAdminService.listTickets({
        search: search || undefined,
        status: statusFilter || undefined,
        type: typeFilter || undefined,
        page,
        limit: 15
      });
      setTickets(data.tickets || []);
      setPagination(data.pagination || { total: 0, page: 1, totalPages: 1 });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load tickets');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, typeFilter, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, typeFilter]);

  const openTicket = async (ticket) => {
    setDetailLoading(true);
    setReplyText('');
    try {
      const data = await storefrontSupportAdminService.getTicket(ticket.id);
      setSelected(data.ticket);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load ticket');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleReply = async (e) => {
    e.preventDefault();
    if (!selected || !replyText.trim()) return;
    setBusy(true);
    try {
      const data = await storefrontSupportAdminService.reply(selected.id, {
        message: replyText.trim()
      });
      setSelected(data.ticket);
      setReplyText('');
      toast.success('Reply sent');
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Reply failed');
    } finally {
      setBusy(false);
    }
  };

  const handleStatus = async (status) => {
    if (!selected) return;
    setBusy(true);
    try {
      const data = await storefrontSupportAdminService.updateStatus(selected.id, status);
      setSelected(data.ticket);
      toast.success(`Marked ${status.replace('_', ' ')}`);
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Status update failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
            <Headphones size={22} className="text-teal-600" />
            Customer Support
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Inquiries, complaints, and in-app message threads from the storefront
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
        >
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search ticket #, subject, customer…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white"
        >
          <option value="">All statuses</option>
          <option value="open">Open</option>
          <option value="in_progress">In progress</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white"
        >
          <option value="">All types</option>
          <option value="inquiry">Inquiry</option>
          <option value="complaint">Complaint</option>
          <option value="chat">Chat</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="animate-spin text-teal-600" size={28} />
          </div>
        ) : tickets.length === 0 ? (
          <p className="text-center text-sm text-slate-400 py-16">No support tickets found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80 text-left text-xs font-bold uppercase tracking-wider text-slate-400">
                  <th className="px-4 py-3">Ticket</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Subject</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Updated</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => openTicket(t)}
                    className="border-b border-slate-50 hover:bg-teal-50/40 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-700">
                      {t.ticketNumber}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-bold text-slate-600">{typeLabel(t.type)}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-800 max-w-[220px] truncate">{t.subject}</td>
                    <td className="px-4 py-3 text-slate-600">{customerLabel(t)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${statusClass(t.status)}`}
                      >
                        {t.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                      {formatWhen(t.updatedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-xs text-slate-500">
            <span>
              Page {pagination.page} of {pagination.totalPages} · {pagination.total} total
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
              >
                Prev
              </button>
              <button
                type="button"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail drawer */}
      {(selected || detailLoading) && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/30"
            aria-label="Close panel"
            onClick={() => setSelected(null)}
          />
          <div className="relative w-full max-w-lg bg-white shadow-2xl h-full flex flex-col animate-in slide-in-from-right">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2 min-w-0">
                <MessageSquare size={18} className="text-teal-600 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-extrabold text-slate-800 truncate">
                    {selected?.subject || 'Loading…'}
                  </p>
                  <p className="text-[11px] text-slate-400 font-mono">{selected?.ticketNumber}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
              >
                <X size={18} />
              </button>
            </div>

            {detailLoading || !selected ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="animate-spin text-teal-600" size={28} />
              </div>
            ) : (
              <>
                <div className="px-5 py-3 border-b border-slate-50 flex flex-wrap gap-2 items-center text-xs">
                  <span
                    className={`inline-flex font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${statusClass(selected.status)}`}
                  >
                    {selected.status.replace('_', ' ')}
                  </span>
                  <span className="text-slate-500 font-semibold">{typeLabel(selected.type)}</span>
                  <span className="text-slate-400">·</span>
                  <span className="text-slate-600">{customerLabel(selected)}</span>
                  {(selected.guestEmail || selected.customerAccount?.email) && (
                    <span className="text-slate-400 truncate">
                      {selected.customerAccount?.email || selected.guestEmail}
                    </span>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                  {(selected.messages || []).map((m) => {
                    const staff = m.byRole === 'staff';
                    return (
                      <div
                        key={m.id || `${m.at}-${m.body?.slice(0, 8)}`}
                        className={`flex ${staff ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[90%] rounded-2xl px-3.5 py-2.5 text-sm ${
                            staff
                              ? 'bg-teal-600 text-white rounded-br-md'
                              : 'bg-slate-100 text-slate-800 rounded-bl-md'
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{m.body}</p>
                          <p
                            className={`text-[10px] mt-1 ${staff ? 'text-teal-100' : 'text-slate-400'}`}
                          >
                            {m.authorName || m.byRole} · {formatWhen(m.at)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="border-t border-slate-100 px-5 py-4 space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {['open', 'in_progress', 'resolved', 'closed'].map((s) => (
                      <button
                        key={s}
                        type="button"
                        disabled={busy || selected.status === s}
                        onClick={() => handleStatus(s)}
                        className="text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                      >
                        {s.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                  <form onSubmit={handleReply} className="flex gap-2">
                    <input
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Write a reply…"
                      className="flex-1 px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                    />
                    <button
                      type="submit"
                      disabled={busy || !replyText.trim()}
                      className="inline-flex items-center justify-center px-4 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-xl"
                    >
                      {busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                    </button>
                  </form>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StorefrontSupportList;
