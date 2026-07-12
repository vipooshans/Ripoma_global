import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Home,
  ChevronRight,
  ChevronDown,
  HelpCircle,
  Search,
  MessageSquare,
  AlertTriangle,
  Mail,
  Loader2,
  Send,
  LogIn
} from 'lucide-react';
import { CustomerAuthContext } from '../../context/CustomerAuthContext';
import CustomerFooter from '../../components/storefront/CustomerFooter';
import storefrontService from '../../services/storefront.service';

const CATEGORIES = [
  { value: '', label: 'All topics' },
  { value: 'shipping', label: 'Shipping' },
  { value: 'orders', label: 'Orders' },
  { value: 'payments', label: 'Payments' },
  { value: 'account', label: 'Account' },
  { value: 'returns', label: 'Returns' },
  { value: 'support', label: 'Support' }
];

const TICKET_CATEGORIES = [
  { value: 'shipping', label: 'Shipping' },
  { value: 'order', label: 'Order' },
  { value: 'product', label: 'Product' },
  { value: 'billing', label: 'Billing' },
  { value: 'other', label: 'Other' }
];

const TABS = [
  { id: 'contact', label: 'Contact us', icon: Mail },
  { id: 'complaint', label: 'File a complaint', icon: AlertTriangle },
  { id: 'chat', label: 'Message support', icon: MessageSquare }
];

const emptyForm = {
  subject: '',
  category: 'other',
  message: '',
  guestName: '',
  guestEmail: '',
  guestPhone: '',
  relatedOrder: ''
};

const formatTime = (iso) => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return '';
  }
};

const CustomerHelp = () => {
  const { isAuthenticated, customerUser } = useContext(CustomerAuthContext);
  const [searchParams, setSearchParams] = useSearchParams();
  const ticketParam = searchParams.get('ticket');

  const [faqs, setFaqs] = useState([]);
  const [faqSearch, setFaqSearch] = useState('');
  const [faqCategory, setFaqCategory] = useState('');
  const [openFaqId, setOpenFaqId] = useState(null);

  const [tab, setTab] = useState('contact');
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [successRef, setSuccessRef] = useState(null);

  const [activeTicket, setActiveTicket] = useState(null);
  const [chatDraft, setChatDraft] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [sendingMsg, setSendingMsg] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    storefrontService
      .getFaqs()
      .then((data) => setFaqs(data.faqs || []))
      .catch(() => toast.error('Could not load FAQs'));
  }, []);

  useEffect(() => {
    if (customerUser) {
      setForm((f) => ({
        ...f,
        guestName:
          f.guestName ||
          `${customerUser.firstName || ''} ${customerUser.lastName || ''}`.trim(),
        guestEmail: f.guestEmail || customerUser.email || '',
        guestPhone: f.guestPhone || customerUser.phone || ''
      }));
    }
  }, [customerUser]);

  const loadTicket = useCallback(async (id) => {
    if (!id) return;
    setChatLoading(true);
    try {
      const data = await storefrontService.getSupportTicket(id);
      setActiveTicket(data.ticket);
      setTab('chat');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not open ticket');
    } finally {
      setChatLoading(false);
    }
  }, []);

  const openLatestChat = useCallback(async () => {
    if (!isAuthenticated) return;
    setChatLoading(true);
    try {
      const data = await storefrontService.getMySupportTickets();
      const tickets = data.tickets || [];
      const openChat = tickets.find(
        (t) => t.type === 'chat' && ['open', 'in_progress'].includes(t.status)
      );
      const preferred =
        openChat || tickets.find((t) => t.type === 'chat') || tickets[0] || null;
      setActiveTicket(preferred);
      if (preferred?.id) {
        setSearchParams({ ticket: preferred.id }, { replace: true });
      }
    } catch {
      /* ignore */
    } finally {
      setChatLoading(false);
    }
  }, [isAuthenticated, setSearchParams]);

  useEffect(() => {
    if (ticketParam) {
      loadTicket(ticketParam);
    }
  }, [ticketParam, loadTicket]);

  useEffect(() => {
    if (tab === 'chat' && isAuthenticated && !ticketParam && !activeTicket) {
      openLatestChat();
    }
  }, [tab, isAuthenticated, ticketParam, activeTicket, openLatestChat]);

  useEffect(() => {
    if (!activeTicket || !['open', 'in_progress'].includes(activeTicket.status)) return undefined;
    const id = setInterval(() => {
      storefrontService
        .getSupportTicket(activeTicket.id)
        .then((data) => setActiveTicket(data.ticket))
        .catch(() => {});
    }, 20000);
    return () => clearInterval(id);
  }, [activeTicket?.id, activeTicket?.status]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeTicket?.messages?.length]);

  const filteredFaqs = useMemo(() => {
    const q = faqSearch.trim().toLowerCase();
    return faqs.filter((f) => {
      if (faqCategory && f.category !== faqCategory) return false;
      if (!q) return true;
      return (
        f.question.toLowerCase().includes(q) ||
        f.answer.toLowerCase().includes(q) ||
        (f.category || '').toLowerCase().includes(q)
      );
    });
  }, [faqs, faqSearch, faqCategory]);

  const updateField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const submitTicket = async (type) => {
    setSubmitting(true);
    setSuccessRef(null);
    try {
      const payload = {
        type,
        subject: form.subject.trim(),
        category: form.category,
        message: form.message.trim(),
        guestName: form.guestName.trim(),
        guestEmail: form.guestEmail.trim(),
        guestPhone: form.guestPhone.trim() || undefined,
        relatedOrder: form.relatedOrder.trim() || undefined
      };
      const data = await storefrontService.createSupportTicket(payload);
      setSuccessRef(data.ticket);
      setForm({
        ...emptyForm,
        guestName: isAuthenticated
          ? `${customerUser?.firstName || ''} ${customerUser?.lastName || ''}`.trim()
          : '',
        guestEmail: customerUser?.email || '',
        guestPhone: customerUser?.phone || ''
      });
      toast.success(data.message || 'Request submitted');
      if (type === 'chat' && data.ticket?.id) {
        setActiveTicket(data.ticket);
        setSearchParams({ ticket: data.ticket.id });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not submit request');
    } finally {
      setSubmitting(false);
    }
  };

  const startChat = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) return;
    await submitTicket('chat');
  };

  const sendChatMessage = async (e) => {
    e.preventDefault();
    if (!activeTicket || !chatDraft.trim()) return;
    setSendingMsg(true);
    try {
      const data = await storefrontService.addSupportMessage(activeTicket.id, {
        message: chatDraft.trim()
      });
      setActiveTicket(data.ticket);
      setChatDraft('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not send message');
    } finally {
      setSendingMsg(false);
    }
  };

  const renderContactForm = (type) => {
    const isComplaint = type === 'complaint';
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submitTicket(type);
        }}
        className="space-y-4"
      >
        {!isAuthenticated && (
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Your name</label>
              <input
                required
                value={form.guestName}
                onChange={(e) => updateField('guestName', e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Email</label>
              <input
                required
                type="email"
                value={form.guestEmail}
                onChange={(e) => updateField('guestEmail', e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30"
              />
            </div>
          </div>
        )}
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Phone (optional)</label>
            <input
              value={form.guestPhone}
              onChange={(e) => updateField('guestPhone', e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Category</label>
            <select
              value={form.category}
              onChange={(e) => updateField('category', e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/30"
            >
              {TICKET_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">Subject</label>
          <input
            required
            minLength={3}
            value={form.subject}
            onChange={(e) => updateField('subject', e.target.value)}
            placeholder={isComplaint ? 'Briefly describe the issue' : 'How can we help?'}
            className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">Message</label>
          <textarea
            required
            minLength={10}
            rows={5}
            value={form.message}
            onChange={(e) => updateField('message', e.target.value)}
            placeholder={
              isComplaint
                ? 'Include order number, what went wrong, and any useful details…'
                : 'Tell us more so we can respond quickly…'
            }
            className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30 resize-y"
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white text-sm font-bold rounded-xl transition-colors"
        >
          {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          {isComplaint ? 'Submit complaint' : 'Send message'}
        </button>
      </form>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <div className="max-w-7xl mx-auto w-full px-4 lg:px-8 py-8 flex-1">
        <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-6" aria-label="Breadcrumb">
          <Link to="/customer" className="hover:text-teal-600 flex items-center gap-1">
            <Home size={12} /> Home
          </Link>
          <ChevronRight size={12} />
          <span className="text-slate-600 font-semibold">Help & Support</span>
        </nav>

        <div className="mb-8">
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <HelpCircle size={24} className="text-teal-600" />
            Help & Support
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Browse FAQs or reach our team — we typically reply within one business day.
          </p>
        </div>

        {/* FAQs */}
        <section className="mb-10">
          <h2 className="text-lg font-extrabold text-slate-800 mb-3">Frequently asked questions</h2>
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={faqSearch}
                onChange={(e) => setFaqSearch(e.target.value)}
                placeholder="Search FAQs…"
                className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/30"
              />
            </div>
            <select
              value={faqCategory}
              onChange={(e) => setFaqCategory(e.target.value)}
              className="text-sm border border-slate-200 rounded-xl px-3 py-2.5 bg-white"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value || 'all'} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
            {filteredFaqs.length === 0 ? (
              <p className="px-5 py-8 text-sm text-slate-400 text-center">No FAQs match your search.</p>
            ) : (
              filteredFaqs.map((faq) => {
                const open = openFaqId === faq.id;
                return (
                  <div key={faq.id}>
                    <button
                      type="button"
                      onClick={() => setOpenFaqId(open ? null : faq.id)}
                      className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-slate-50 transition-colors"
                      aria-expanded={open}
                    >
                      <span className="text-sm font-semibold text-slate-800">{faq.question}</span>
                      <ChevronDown
                        size={16}
                        className={`shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
                      />
                    </button>
                    {open && (
                      <div className="px-5 pb-4 text-sm text-slate-600 leading-relaxed">{faq.answer}</div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Contact / complaint / chat */}
        <section>
          <h2 className="text-lg font-extrabold text-slate-800 mb-3">Get in touch</h2>
          <div className="flex flex-wrap gap-2 mb-5">
            {TABS.map((t) => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setTab(t.id);
                    setSuccessRef(null);
                  }}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
                    active
                      ? 'bg-teal-600 text-white'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Icon size={15} />
                  {t.label}
                </button>
              );
            })}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm">
            {successRef && tab !== 'chat' && (
              <div className="mb-5 rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3 text-sm text-emerald-800">
                Request received. Reference{' '}
                <span className="font-extrabold">{successRef.ticketNumber}</span>. We will follow up by
                email.
              </div>
            )}

            {tab === 'contact' && renderContactForm('inquiry')}
            {tab === 'complaint' && renderContactForm('complaint')}

            {tab === 'chat' && (
              <div>
                {!isAuthenticated ? (
                  <div className="text-center py-10 px-4">
                    <MessageSquare size={36} className="mx-auto text-slate-300 mb-3" />
                    <p className="text-sm text-slate-600 mb-4">
                      Sign in to message support and continue your conversation here.
                    </p>
                    <Link
                      to="/customer/login"
                      state={{ from: '/customer/help' }}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold rounded-xl"
                    >
                      <LogIn size={16} /> Sign in
                    </Link>
                  </div>
                ) : chatLoading && !activeTicket ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="animate-spin text-teal-600" size={28} />
                  </div>
                ) : activeTicket ? (
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100">
                      <div>
                        <p className="text-sm font-extrabold text-slate-800">{activeTicket.subject}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {activeTicket.ticketNumber} ·{' '}
                          <span className="capitalize">{activeTicket.status.replace('_', ' ')}</span>
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTicket(null);
                          setSearchParams({});
                          setForm((f) => ({ ...f, subject: '', message: '', category: 'other' }));
                        }}
                        className="text-xs font-bold text-teal-600 hover:text-teal-700"
                      >
                        New conversation
                      </button>
                    </div>

                    <div className="max-h-80 overflow-y-auto space-y-3 mb-4 pr-1">
                      {(activeTicket.messages || []).map((m) => {
                        const mine = m.byRole === 'customer' || m.byRole === 'guest';
                        return (
                          <div
                            key={m.id || `${m.at}-${m.body?.slice(0, 12)}`}
                            className={`flex ${mine ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm ${
                                mine
                                  ? 'bg-teal-600 text-white rounded-br-md'
                                  : 'bg-slate-100 text-slate-800 rounded-bl-md'
                              }`}
                            >
                              <p className="whitespace-pre-wrap">{m.body}</p>
                              <p
                                className={`text-[10px] mt-1 ${mine ? 'text-teal-100' : 'text-slate-400'}`}
                              >
                                {m.authorName || m.byRole} · {formatTime(m.at)}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>

                    {['resolved', 'closed'].includes(activeTicket.status) ? (
                      <p className="text-sm text-slate-500 text-center py-2">
                        This ticket is {activeTicket.status}. Start a new conversation if you need more
                        help.
                      </p>
                    ) : (
                      <form onSubmit={sendChatMessage} className="flex gap-2">
                        <input
                          value={chatDraft}
                          onChange={(e) => setChatDraft(e.target.value)}
                          placeholder="Type your message…"
                          className="flex-1 px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                        />
                        <button
                          type="submit"
                          disabled={sendingMsg || !chatDraft.trim()}
                          className="inline-flex items-center justify-center px-4 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-xl"
                        >
                          {sendingMsg ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                        </button>
                      </form>
                    )}
                  </div>
                ) : (
                  <form onSubmit={startChat} className="space-y-4">
                    <p className="text-sm text-slate-500">
                      Start a conversation with support. Replies appear here — check back anytime.
                    </p>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">Subject</label>
                      <input
                        required
                        minLength={3}
                        value={form.subject}
                        onChange={(e) => updateField('subject', e.target.value)}
                        className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">Category</label>
                      <select
                        value={form.category}
                        onChange={(e) => updateField('category', e.target.value)}
                        className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-white"
                      >
                        {TICKET_CATEGORIES.map((c) => (
                          <option key={c.value} value={c.value}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">Message</label>
                      <textarea
                        required
                        minLength={10}
                        rows={4}
                        value={form.message}
                        onChange={(e) => updateField('message', e.target.value)}
                        className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30 resize-y"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white text-sm font-bold rounded-xl"
                    >
                      {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                      Start conversation
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
      <CustomerFooter />
    </div>
  );
};

export default CustomerHelp;
