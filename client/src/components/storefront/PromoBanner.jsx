import React from 'react';
import { Link } from 'react-router-dom';
import { Truck, ShieldCheck, Zap, Globe, ArrowRight } from 'lucide-react';

const ICON_MAP = {
  truck: Truck,
  shield: ShieldCheck,
  zap: Zap,
  globe: Globe
};

const PromoBanner = ({ promos }) => {
  const marquee = promos?.marquee || [];
  const cards = promos?.cards || [];

  if (marquee.length === 0 && cards.length === 0) return null;

  return (
    <>
      {marquee.length > 0 && (
        <section className="bg-gradient-to-r from-teal-600 via-teal-500 to-teal-600 py-4 overflow-hidden" aria-label="Promotions">
          <div className="flex items-center gap-16 animate-[marquee_20s_linear_infinite] whitespace-nowrap">
            {Array(3).fill(null).map((_, i) => (
              <div key={i} className="flex items-center gap-16 shrink-0">
                {marquee.map((item, idx) => {
                  const Icon = ICON_MAP[item.icon] || Truck;
                  return (
                    <span key={`${i}-${idx}`} className="flex items-center gap-2 text-slate-950 text-sm font-bold">
                      <Icon size={15} /> {item.text}
                    </span>
                  );
                })}
              </div>
            ))}
          </div>
        </section>
      )}

      {cards.length > 0 && (
        <section className="py-8 px-6 lg:px-12 bg-white border-b border-slate-100">
          <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-4">
            {cards.map((card) => (
              <Link
                key={card.title}
                to={card.link || '/customer/products'}
                className="group flex items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-br from-slate-50 to-teal-50/50 border border-slate-100 hover:border-teal-200 hover:shadow-md transition-all duration-300"
              >
                <div>
                  <h3 className="font-extrabold text-slate-800 text-sm group-hover:text-teal-700 transition-colors">{card.title}</h3>
                  <p className="text-xs text-slate-500 mt-1">{card.subtitle}</p>
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-teal-600 mt-2">
                    {card.cta || 'Learn more'} <ArrowRight size={12} />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-33.333%); }
        }
      `}</style>
    </>
  );
};

export default PromoBanner;
