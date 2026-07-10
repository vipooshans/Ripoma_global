import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';

const CustomerFooter = () => (
  <footer id="contact" className="bg-slate-950 text-slate-400 py-12 px-6 lg:px-12">
    <div className="max-w-6xl mx-auto">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
        <div className="lg:col-span-1">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-teal-500 text-slate-950 font-extrabold text-base">R</div>
            <div>
              <p className="text-sm font-extrabold tracking-wider text-white leading-none">RIPOMA</p>
              <span className="text-[9px] text-teal-400 font-bold tracking-widest uppercase">GLOBAL</span>
            </div>
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
              { label: 'Categories', href: '/customer/products?view=categories' }
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
              { label: 'My Profile', href: '/customer/profile' }
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
        <div className="flex items-center gap-2 text-xs">
          <ShieldCheck size={12} className="text-teal-500" />
          Secure & Verified Platform
        </div>
      </div>
    </div>
  </footer>
);

export default CustomerFooter;
