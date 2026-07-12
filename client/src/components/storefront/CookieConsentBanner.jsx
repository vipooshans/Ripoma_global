import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const STORAGE_KEY = 'ripoma_cookie_consent_v1';

const CookieConsentBanner = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  const accept = () => {
    try {
      localStorage.setItem(STORAGE_KEY, 'accepted');
    } catch {
      /* ignore */
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 p-4 pointer-events-none">
      <div className="max-w-3xl mx-auto pointer-events-auto rounded-2xl bg-slate-900 text-slate-200 shadow-2xl border border-slate-700 px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4">
        <p className="text-sm leading-relaxed flex-1">
          We use an essential sign-in cookie and browser storage for your cart and wishlist. See our{' '}
          <Link to="/customer/privacy" className="font-bold text-teal-400 hover:underline">
            Privacy Policy
          </Link>{' '}
          for details.
        </p>
        <button
          type="button"
          onClick={accept}
          className="shrink-0 px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-sm font-extrabold"
        >
          Got it
        </button>
      </div>
    </div>
  );
};

export default CookieConsentBanner;
