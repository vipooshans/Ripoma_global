import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';

const CustomerFooter = () => (
  <footer id="contact" className="bg-slate-950 text-slate-400 py-12 px-6 lg:px-12">
    <div className="max-w-6xl mx-auto">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
        <div className="lg:col-span-1">
          <div className="mb-4">
            <img
              src="/logo-white.svg"
              alt="RIPOMA GLOBAL TRADING (PVT) LTD"
              className="h-12 w-auto -ml-1"
            />
          </div>
          <p className="text-xs leading-relaxed">
            Global import & export marketplace for businesses and buyers worldwide.
          </p>
        </div>

        <div>
          <h4 className="text-xs font-bold text-white uppercase tracking-widest mb-4">Products</h4>
          <ul className="space-y-2">
            {[
              { label: 'Browse Catalog', href: '/customer/products' },
              { label: 'Featured Items', href: '/customer/products' },
              { label: 'New Arrivals', href: '/customer/products?sort=newest' },
              { label: 'Categories', href: '/customer/categories' }
            ].map((l) => (
              <li key={l.label}>
                <Link to={l.href} className="text-xs hover:text-teal-400 transition-colors">{l.label}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-xs font-bold text-white uppercase tracking-widest mb-4">Account</h4>
          <ul className="space-y-2">
            {[
              { label: 'Register', href: '/customer/register' },
              { label: 'Sign In', href: '/customer/login' },
              { label: 'Account', href: '/customer/profile' },
              { label: 'Help & Support', href: '/customer/help' }
            ].map((l) => (
              <li key={l.label}>
                <Link to={l.href} className="text-xs hover:text-teal-400 transition-colors">{l.label}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-xs font-bold text-white uppercase tracking-widest mb-4">Contact</h4>
          <ul className="space-y-2 text-xs">
            <li>
              <Link to="/customer/help" className="hover:text-teal-400 transition-colors">
                Contact form
              </Link>
            </li>
            <li>
              <a href="mailto:support@ripomaglobal.com" className="hover:text-teal-400 transition-colors">
                support@ripomaglobal.com
              </a>
            </li>
            <li>+1 (555) 019-2834</li>
            <li>Mon–Fri, 9am–6pm EST</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-slate-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="text-xs">© {new Date().getFullYear()} RIPOMA GLOBAL Inc. All rights reserved.</p>
        <div className="flex flex-wrap items-center justify-center gap-4 text-xs">
          <Link to="/customer/privacy" className="hover:text-teal-400 transition-colors">
            Privacy
          </Link>
          <Link to="/customer/terms" className="hover:text-teal-400 transition-colors">
            Terms
          </Link>
          <div className="flex items-center gap-2">
            <ShieldCheck size={12} className="text-teal-500" />
            Encrypted login · No card PAN stored
          </div>
        </div>
      </div>
    </div>
  </footer>
);

export default CustomerFooter;
