import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, ChevronRight, Shield, FileText, Loader2 } from 'lucide-react';
import customerAuthService from '../../services/customerAuth.service';
import CustomerFooter from '../../components/storefront/CustomerFooter';

const TITLES = {
  privacy: 'Privacy Policy',
  terms: 'Terms of Service'
};

const CustomerLegal = () => {
  const location = useLocation();
  const kind = location.pathname.includes('/terms') ? 'terms' : 'privacy';
  const [sections, setSections] = useState([]);
  const [version, setVersion] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    customerAuthService
      .getLegal()
      .then((data) => {
        setVersion(data.privacyVersion || '');
        setSections(kind === 'terms' ? data.terms || [] : data.privacy || []);
      })
      .catch(() => setSections([]))
      .finally(() => setLoading(false));
  }, [kind]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <div className="max-w-3xl mx-auto w-full px-4 lg:px-8 py-8 flex-1">
        <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-6" aria-label="Breadcrumb">
          <Link to="/customer" className="hover:text-teal-600 flex items-center gap-1">
            <Home size={12} /> Home
          </Link>
          <ChevronRight size={12} />
          <span className="text-slate-600 font-semibold">{TITLES[kind]}</span>
        </nav>

        <div className="mb-6 flex items-start gap-3">
          {kind === 'privacy' ? (
            <Shield className="text-teal-600 shrink-0 mt-1" size={24} />
          ) : (
            <FileText className="text-teal-600 shrink-0 mt-1" size={24} />
          )}
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">{TITLES[kind]}</h1>
            {version && kind === 'privacy' && (
              <p className="text-xs text-slate-400 mt-1">Version {version}</p>
            )}
            <p className="text-sm text-slate-500 mt-2">
              {kind === 'privacy' ? (
                <>
                  See also our{' '}
                  <Link to="/customer/terms" className="font-bold text-teal-600 hover:underline">
                    Terms of Service
                  </Link>
                  .
                </>
              ) : (
                <>
                  See also our{' '}
                  <Link to="/customer/privacy" className="font-bold text-teal-600 hover:underline">
                    Privacy Policy
                  </Link>
                  .
                </>
              )}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="animate-spin text-teal-600" size={28} />
            </div>
          ) : sections.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">Content unavailable.</p>
          ) : (
            sections.map((s) => (
              <section key={s.title}>
                <h2 className="text-sm font-extrabold text-slate-800 mb-2">{s.title}</h2>
                <p className="text-sm text-slate-600 leading-relaxed">{s.body}</p>
              </section>
            ))
          )}
        </div>
      </div>
      <CustomerFooter />
    </div>
  );
};

export default CustomerLegal;
