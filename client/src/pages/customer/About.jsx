import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Disclosure } from '@headlessui/react';
import CustomerFooter from '../../components/storefront/CustomerFooter';
import {
  Globe, Truck, ShieldCheck, Award, ArrowRight, ChevronRight, ChevronDown,
  Target, Eye, Heart, Lightbulb, Leaf, HeartHandshake, Scale, BadgeCheck,
  Ship, Warehouse, Search, ShoppingCart, Network, Boxes,
  Wheat, UtensilsCrossed, Cpu, Factory, Shirt, HeartPulse, Home as HomeIcon,
  Star, Quote, CheckCircle2, FileCheck, ClipboardCheck, MapPin,
  Headphones, Sparkles, Container
} from 'lucide-react';

/* ─────────────────────────── Animation utilities ─────────────────────────── */

const useInView = (options = { threshold: 0.15 }) => {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setInView(true);
        observer.disconnect();
      }
    }, options);
    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return [ref, inView];
};

const Reveal = ({ children, delay = 0, className = '' }) => {
  const [ref, inView] = useInView();
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${
        inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      } ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
};

const CountUp = ({ target, suffix = '+', duration = 1800 }) => {
  const [ref, inView] = useInView({ threshold: 0.4 });
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!inView) return undefined;
    let frame;
    const start = performance.now();
    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, target, duration]);

  return (
    <span ref={ref}>
      {value.toLocaleString()}
      {suffix}
    </span>
  );
};

/* ─────────────────────────────── Page data ────────────────────────────────── */

const CORE_VALUES = [
  { icon: ShieldCheck, title: 'Integrity', desc: 'We conduct every transaction with honesty and strong ethical principles.' },
  { icon: Award, title: 'Quality', desc: 'Every product is sourced and inspected to meet international standards.' },
  { icon: Heart, title: 'Customer First', desc: 'Our customers are at the heart of every decision we make.' },
  { icon: Lightbulb, title: 'Innovation', desc: 'We embrace digital commerce and modern logistics to stay ahead.' },
  { icon: Leaf, title: 'Sustainability', desc: 'We promote responsible sourcing and environmentally conscious trade.' },
  { icon: HeartHandshake, title: 'Global Partnership', desc: 'We build long-term relationships with partners across every continent.' },
  { icon: Scale, title: 'Transparency', desc: 'Clear pricing, honest communication, and no hidden surprises.' },
  { icon: BadgeCheck, title: 'Reliability', desc: 'We deliver on our promises — on time, every time.' }
];

const SERVICES = [
  { icon: Container, title: 'Import Services', desc: 'End-to-end import handling, from supplier negotiation to customs clearance.' },
  { icon: Ship, title: 'Export Services', desc: 'Reliable export solutions connecting local producers with global buyers.' },
  { icon: Warehouse, title: 'Wholesale Distribution', desc: 'Bulk supply programs for distributors, retailers, and enterprises.' },
  { icon: Globe, title: 'International Sourcing', desc: 'Verified supplier networks across Asia, Europe, and the Americas.' },
  { icon: Search, title: 'Product Procurement', desc: 'We find, vet, and procure the exact products your business needs.' },
  { icon: ShoppingCart, title: 'E-Commerce Solutions', desc: 'A modern online storefront for browsing, ordering, and tracking.' },
  { icon: Truck, title: 'Logistics Coordination', desc: 'Freight booking, consolidation, and door-to-door delivery management.' },
  { icon: Network, title: 'Supply Chain Management', desc: 'Visibility and control across your entire supply chain.' }
];

const INDUSTRIES = [
  { icon: Wheat, title: 'Agriculture' },
  { icon: UtensilsCrossed, title: 'Food Products' },
  { icon: Boxes, title: 'Consumer Goods' },
  { icon: Cpu, title: 'Electronics' },
  { icon: Factory, title: 'Industrial Equipment' },
  { icon: Shirt, title: 'Fashion' },
  { icon: HeartPulse, title: 'Health & Wellness' },
  { icon: HomeIcon, title: 'Household Products' }
];

const WHY_CHOOSE_US = [
  'Trusted Global Network',
  'High Quality Products',
  'Competitive Pricing',
  'Secure International Shipping',
  'Experienced Team',
  'Fast Customer Support',
  'Reliable Supply Chain',
  'Timely Delivery'
];

const STATS = [
  { target: 25, suffix: '+', label: 'Countries Served' },
  { target: 500, suffix: '+', label: 'Products' },
  { target: 1000, suffix: '+', label: 'Happy Customers' },
  { target: 150, suffix: '+', label: 'Business Partners' },
  { target: 99, suffix: '%', label: 'Customer Satisfaction' }
];

const REGIONS = [
  { name: 'Asia', desc: 'Manufacturing hubs and sourcing partners across East, South, and Southeast Asia.' },
  { name: 'Europe', desc: 'Distribution channels and quality-focused buyers throughout the EU and UK.' },
  { name: 'Middle East', desc: 'Growing trade corridors serving the GCC and wider MENA region.' },
  { name: 'North America', desc: 'Import partnerships and e-commerce fulfilment for US and Canadian markets.' },
  { name: 'Africa', desc: 'Emerging market distribution and agricultural trade partnerships.' },
  { name: 'Oceania', desc: 'Reliable shipping lanes serving Australia, New Zealand, and the Pacific.' }
];

const CERTIFICATIONS = [
  { icon: FileCheck, title: 'Business Registration', desc: 'Fully registered private limited company.' },
  { icon: Ship, title: 'Import Export License', desc: 'Licensed for international trade operations.' },
  { icon: Award, title: 'ISO Certification', desc: 'Quality management aligned with ISO standards.' },
  { icon: ClipboardCheck, title: 'Quality Assurance', desc: 'Documented inspection at every stage.' },
  { icon: ShieldCheck, title: 'Trade Compliance', desc: 'Full adherence to international trade regulations.' }
];

const TEAM = [
  {
    name: 'A. Perera',
    role: 'Chief Executive Officer',
    photo: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=600&q=80',
    bio: 'Leads company strategy and global partnerships.'
  },
  {
    name: 'S. Fernando',
    role: 'Director',
    photo: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=600&q=80',
    bio: 'Oversees finance, governance, and expansion.'
  },
  {
    name: 'R. Jayawardena',
    role: 'Operations Manager',
    photo: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=600&q=80',
    bio: 'Runs day-to-day sourcing and fulfilment operations.'
  },
  {
    name: 'N. Silva',
    role: 'Export Manager',
    photo: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=600&q=80',
    bio: 'Manages export documentation and freight partners.'
  },
  {
    name: 'D. Wickramasinghe',
    role: 'Customer Support Lead',
    photo: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=600&q=80',
    bio: 'Ensures every customer gets fast, helpful answers.'
  }
];

const PROCESS_STEPS = [
  { icon: Headphones, title: 'Inquiry', desc: 'Tell us what you need — product specs, quantities, and target markets.' },
  { icon: Search, title: 'Product Sourcing', desc: 'We match your requirements with verified suppliers from our global network.' },
  { icon: ClipboardCheck, title: 'Quality Inspection', desc: 'Every order is inspected and documented before it leaves the warehouse.' },
  { icon: Ship, title: 'Worldwide Delivery', desc: 'Secure international shipping with real-time tracking to your door.' }
];

const TESTIMONIALS = [
  {
    quote: 'RIPOMA GLOBAL has been a dependable sourcing partner for over two years. Quality is consistent and shipments always arrive on schedule.',
    name: 'Procurement Manager',
    company: 'Regional Distribution Company'
  },
  {
    quote: 'Their team handled everything from supplier vetting to customs paperwork. It made our first import experience completely stress-free.',
    name: 'Founder',
    company: 'E-Commerce Retail Brand'
  },
  {
    quote: 'Competitive pricing, transparent communication, and genuine after-sales support. We now route most of our bulk orders through them.',
    name: 'Operations Director',
    company: 'Wholesale Trading Firm'
  }
];

const FAQS = [
  {
    q: 'Which countries do you export to?',
    a: 'We currently serve customers in over 25 countries across Asia, Europe, the Middle East, North America, Africa, and Oceania. If your country is not yet covered, contact us — we regularly open new shipping lanes based on demand.'
  },
  {
    q: 'How can I place a bulk order?',
    a: 'Create a free account, browse our catalog, and add items to your cart — or contact our team directly through the Help & Support page with your product requirements and quantities. Bulk orders qualify for wholesale pricing tiers.'
  },
  {
    q: 'Do you provide OEM services?',
    a: 'Yes. Through our manufacturing partners we support OEM and private-label production, including custom branding, packaging, and specifications. Minimum order quantities vary by product category.'
  },
  {
    q: 'What payment methods do you accept?',
    a: 'We accept bank transfers (T/T), letters of credit for larger transactions, and cash on delivery in selected regions. All payment details are agreed transparently before any order is confirmed.'
  },
  {
    q: 'How long does shipping take?',
    a: 'Transit times depend on destination and shipping method. Express air freight typically takes 3–7 business days, while sea freight ranges from 2–6 weeks. Every shipment includes tracking so you always know where your order is.'
  }
];

/* ───────────────────────────── Shared elements ────────────────────────────── */

const SectionHeading = ({ eyebrow, title, subtitle, dark = false }) => (
  <div className="text-center mb-10 sm:mb-14">
    <span className={`text-xs font-bold uppercase tracking-widest ${dark ? 'text-teal-400' : 'text-teal-600'}`}>
      {eyebrow}
    </span>
    <h2 className={`text-2xl sm:text-4xl font-extrabold mt-2 ${dark ? 'text-white' : 'text-slate-900'}`}>
      {title}
    </h2>
    {subtitle && (
      <p className={`text-sm sm:text-base mt-3 max-w-2xl mx-auto leading-relaxed ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
        {subtitle}
      </p>
    )}
  </div>
);

const GridOverlay = () => (
  <div
    className="absolute inset-0 opacity-5 pointer-events-none"
    style={{
      backgroundImage:
        'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
      backgroundSize: '60px 60px'
    }}
  />
);

/* ────────────────────────────────── Page ──────────────────────────────────── */

const CustomerAbout = () => (
  <div className="min-h-screen bg-white">
    {/* 1. Hero */}
    <section className="relative overflow-hidden">
      <img
        src="https://images.unsplash.com/photo-1494412574643-ff11b0a5c1c3?auto=format&fit=crop&w=1920&q=80"
        alt="Cargo ship loaded with shipping containers at sea"
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950/90 via-slate-900/85 to-teal-950/80" />
      <GridOverlay />
      <div className="relative z-10 max-w-4xl mx-auto text-center px-4 sm:px-6 py-24 sm:py-36">
        <Reveal>
          <div className="inline-flex items-center gap-2 bg-teal-500/15 border border-teal-500/30 rounded-full px-4 py-2 mb-6 text-teal-300 text-[10px] sm:text-xs font-bold tracking-wider uppercase backdrop-blur-sm">
            <Sparkles size={12} />
            About Our Company
          </div>
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight mb-5">
            RIPOMA GLOBAL{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-teal-300">
              TRADING (PVT) LTD
            </span>
          </h1>
          <p className="text-base sm:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Connecting Global Markets Through Quality, Trust, and Innovation.
          </p>
        </Reveal>
      </div>
    </section>

    {/* 2. Company Introduction */}
    <section className="py-14 sm:py-20 px-4 sm:px-6 lg:px-12 bg-white">
      <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
        <Reveal>
          <span className="text-xs font-bold text-teal-600 uppercase tracking-widest">Who We Are</span>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 mt-2 mb-5">
            A Trusted Partner in Global Trade
          </h2>
          <p className="text-slate-600 leading-relaxed mb-4">
            RIPOMA GLOBAL TRADING (PVT) LTD is a global import-export and e-commerce company
            dedicated to delivering high-quality products and reliable international trade
            solutions. We connect manufacturers, suppliers, and customers across international
            markets while ensuring quality, transparency, and customer satisfaction.
          </p>
          <p className="text-slate-600 leading-relaxed">
            From bulk wholesale programs to individual e-commerce orders, our team combines
            deep trade expertise with modern digital tools so that sourcing globally feels
            as simple as buying locally.
          </p>
        </Reveal>
        <Reveal delay={150}>
          <div className="relative">
            <img
              src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80"
              alt="Warehouse logistics operations"
              className="rounded-2xl shadow-xl w-full h-72 sm:h-96 object-cover"
              loading="lazy"
            />
            <div className="absolute -bottom-5 -left-5 hidden sm:flex items-center gap-3 bg-white rounded-2xl shadow-lg border border-slate-100 px-5 py-4">
              <div className="w-11 h-11 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center shadow-md">
                <Globe size={19} className="text-white" />
              </div>
              <div>
                <p className="text-lg font-extrabold text-slate-900 leading-none">25+ Countries</p>
                <p className="text-xs text-slate-500 mt-1">Served Worldwide</p>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>

    {/* 3. Our Story */}
    <section className="py-14 sm:py-20 px-4 sm:px-6 lg:px-12 bg-slate-50">
      <div className="max-w-4xl mx-auto">
        <SectionHeading
          eyebrow="Our Story"
          title="From a Vision to a Global Network"
          subtitle="Founded with a vision to simplify international trade, RIPOMA GLOBAL has grown into a trusted partner for businesses seeking reliable import-export services and quality products through digital commerce."
        />
        <div className="relative pl-8 sm:pl-10 space-y-10 before:content-[''] before:absolute before:left-[11px] sm:before:left-[13px] before:top-2 before:bottom-2 before:w-0.5 before:bg-teal-200">
          {[
            {
              title: 'Why We Started',
              desc: 'International trade was slow, opaque, and difficult for growing businesses. We founded RIPOMA GLOBAL to change that — making global sourcing transparent, dependable, and accessible to companies of every size.'
            },
            {
              title: 'The Journey',
              desc: 'What began as a small trading operation grew steadily through word of mouth. By pairing rigorous supplier vetting with honest pricing, we earned repeat business and expanded into new product categories and markets year after year.'
            },
            {
              title: 'Vision for Expansion',
              desc: 'We are investing in our e-commerce platform, regional warehousing, and new trade corridors — with the goal of serving customers on every continent with faster delivery and broader product selection.'
            },
            {
              title: 'Major Achievements',
              desc: 'Today we serve 25+ countries, maintain a catalog of 500+ products, and support a network of 150+ business partners — backed by a customer satisfaction rate we are proud of.'
            }
          ].map((item, i) => (
            <Reveal key={item.title} delay={i * 100}>
              <div className="relative">
                <span className="absolute -left-8 sm:-left-10 top-1 w-6 h-6 rounded-full bg-teal-500 border-4 border-teal-100 shadow" />
                <h3 className="font-extrabold text-slate-900 text-lg mb-1.5">{item.title}</h3>
                <p className="text-slate-600 text-sm leading-relaxed">{item.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>

    {/* 4 & 5. Mission & Vision */}
    <section className="py-14 sm:py-20 px-4 sm:px-6 lg:px-12 bg-white">
      <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-6">
        <Reveal>
          <div className="h-full bg-gradient-to-br from-slate-900 via-slate-800 to-teal-950 rounded-2xl p-8 sm:p-10 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-teal-500/10 rounded-full blur-3xl" />
            <div className="w-12 h-12 bg-teal-500/20 border border-teal-500/30 rounded-xl flex items-center justify-center mb-5">
              <Target size={22} className="text-teal-400" />
            </div>
            <h3 className="text-xl sm:text-2xl font-extrabold text-white mb-3">Our Mission</h3>
            <p className="text-slate-300 leading-relaxed text-sm sm:text-base">
              To provide reliable global trading solutions while maintaining the highest
              standards of quality, integrity, and customer service.
            </p>
          </div>
        </Reveal>
        <Reveal delay={150}>
          <div className="h-full bg-gradient-to-br from-teal-600 to-teal-800 rounded-2xl p-8 sm:p-10 relative overflow-hidden">
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
            <div className="w-12 h-12 bg-white/15 border border-white/25 rounded-xl flex items-center justify-center mb-5">
              <Eye size={22} className="text-white" />
            </div>
            <h3 className="text-xl sm:text-2xl font-extrabold text-white mb-3">Our Vision</h3>
            <p className="text-teal-50 leading-relaxed text-sm sm:text-base">
              To become one of the most trusted global trading companies by creating sustainable
              business relationships and delivering exceptional value worldwide.
            </p>
          </div>
        </Reveal>
      </div>
    </section>

    {/* 6. Core Values */}
    <section className="py-14 sm:py-20 px-4 sm:px-6 lg:px-12 bg-slate-50">
      <div className="max-w-6xl mx-auto">
        <SectionHeading
          eyebrow="Our Core Values"
          title="The Principles That Guide Us"
          subtitle="Eight values shape every partnership we build and every shipment we deliver."
        />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
          {CORE_VALUES.map(({ icon: Icon, title, desc }, i) => (
            <Reveal key={title} delay={(i % 4) * 100}>
              <div className="h-full bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-100 hover:shadow-md hover:-translate-y-1 transition-all duration-300 group">
                <div className="w-11 h-11 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center mb-3 sm:mb-4 shadow-md group-hover:scale-110 transition-transform duration-300">
                  <Icon size={19} className="text-white" />
                </div>
                <h3 className="font-bold text-slate-800 text-sm mb-1.5">{title}</h3>
                <p className="text-slate-500 text-xs leading-relaxed">{desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>

    {/* 7. What We Do */}
    <section className="py-14 sm:py-20 px-4 sm:px-6 lg:px-12 bg-white">
      <div className="max-w-6xl mx-auto">
        <SectionHeading
          eyebrow="What We Do"
          title="Complete Global Trade Services"
          subtitle="From first inquiry to final delivery, we cover every step of the international trade journey."
        />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {SERVICES.map(({ icon: Icon, title, desc }, i) => (
            <Reveal key={title} delay={(i % 4) * 100}>
              <div className="h-full bg-slate-50 rounded-2xl p-5 sm:p-6 border border-slate-100 hover:bg-white hover:shadow-md hover:-translate-y-1 hover:border-teal-100 transition-all duration-300 group">
                <div className="w-11 h-11 bg-white border border-slate-200 group-hover:bg-gradient-to-br group-hover:from-teal-500 group-hover:to-teal-600 group-hover:border-transparent rounded-xl flex items-center justify-center mb-4 transition-all duration-300">
                  <Icon size={19} className="text-teal-600 group-hover:text-white transition-colors duration-300" />
                </div>
                <h3 className="font-bold text-slate-800 text-sm mb-1.5">{title}</h3>
                <p className="text-slate-500 text-xs leading-relaxed">{desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>

    {/* 8. Industries We Serve */}
    <section className="py-14 sm:py-20 px-4 sm:px-6 lg:px-12 bg-slate-50">
      <div className="max-w-6xl mx-auto">
        <SectionHeading
          eyebrow="Industries We Serve"
          title="Expertise Across Key Sectors"
        />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-5">
          {INDUSTRIES.map(({ icon: Icon, title }, i) => (
            <Reveal key={title} delay={(i % 4) * 80}>
              <div className="bg-white rounded-2xl p-5 text-center shadow-sm border border-slate-100 hover:shadow-md hover:-translate-y-1 transition-all duration-300">
                <div className="w-12 h-12 mx-auto bg-teal-50 rounded-xl flex items-center justify-center mb-3">
                  <Icon size={22} className="text-teal-600" />
                </div>
                <h3 className="font-bold text-slate-800 text-sm">{title}</h3>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>

    {/* 9. Why Choose Us + 10. Statistics */}
    <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-12 bg-gradient-to-br from-slate-900 via-slate-800 to-teal-950 relative overflow-hidden">
      <GridOverlay />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="max-w-6xl mx-auto relative z-10">
        <SectionHeading
          eyebrow="Why Choose Us"
          title="Built on Trust, Proven by Results"
          dark
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-16 sm:mb-20">
          {WHY_CHOOSE_US.map((reason, i) => (
            <Reveal key={reason} delay={(i % 4) * 80}>
              <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 backdrop-blur-sm hover:bg-white/10 transition-colors duration-300">
                <CheckCircle2 size={18} className="text-teal-400 shrink-0" />
                <span className="text-sm font-semibold text-slate-200">{reason}</span>
              </div>
            </Reveal>
          ))}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6 sm:gap-8 border-t border-white/10 pt-12 sm:pt-14">
          {STATS.map(({ target, suffix, label }, i) => (
            <Reveal key={label} delay={i * 100} className={i === 4 ? 'col-span-2 sm:col-span-1' : ''}>
              <div className="text-center">
                <p className="text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-teal-300">
                  <CountUp target={target} suffix={suffix} />
                </p>
                <p className="text-xs sm:text-sm text-slate-400 font-medium mt-2">{label}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>

    {/* 11. Global Network */}
    <section className="py-14 sm:py-20 px-4 sm:px-6 lg:px-12 bg-white relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, #0d9488 1.5px, transparent 1.5px)',
          backgroundSize: '28px 28px'
        }}
      />
      <div className="max-w-6xl mx-auto relative z-10">
        <SectionHeading
          eyebrow="Our Global Network"
          title="Serving Six Regions Worldwide"
          subtitle="Established trade routes and trusted partners across every major market."
        />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {REGIONS.map(({ name, desc }, i) => (
            <Reveal key={name} delay={(i % 3) * 100}>
              <div className="h-full bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-100 hover:shadow-md hover:-translate-y-1 hover:border-teal-100 transition-all duration-300">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center shadow-md">
                    <MapPin size={17} className="text-white" />
                  </div>
                  <h3 className="font-extrabold text-slate-900">{name}</h3>
                </div>
                <p className="text-slate-500 text-xs leading-relaxed">{desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>

    {/* 12. Certifications & Compliance */}
    <section className="py-14 sm:py-20 px-4 sm:px-6 lg:px-12 bg-slate-50">
      <div className="max-w-6xl mx-auto">
        <SectionHeading
          eyebrow="Certifications & Compliance"
          title="Fully Licensed and Compliant"
          subtitle="We operate with complete regulatory transparency so you can trade with confidence."
        />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-5">
          {CERTIFICATIONS.map(({ icon: Icon, title, desc }, i) => (
            <Reveal key={title} delay={i * 80} className={i === 4 ? 'col-span-2 sm:col-span-1' : ''}>
              <div className="h-full bg-white rounded-2xl p-5 text-center shadow-sm border border-slate-100 hover:shadow-md hover:-translate-y-1 transition-all duration-300">
                <div className="w-12 h-12 mx-auto bg-teal-50 rounded-full flex items-center justify-center mb-3">
                  <Icon size={22} className="text-teal-600" />
                </div>
                <h3 className="font-bold text-slate-800 text-sm mb-1">{title}</h3>
                <p className="text-slate-500 text-[11px] leading-relaxed">{desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>

    {/* 13. Meet Our Team */}
    <section className="py-14 sm:py-20 px-4 sm:px-6 lg:px-12 bg-white">
      <div className="max-w-6xl mx-auto">
        <SectionHeading
          eyebrow="Meet Our Team"
          title="The People Behind the Promise"
          subtitle="Experienced professionals in trade, logistics, and customer care."
        />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6">
          {TEAM.map(({ name, role, photo, bio }, i) => (
            <Reveal key={name} delay={i * 80} className={i === 4 ? 'col-span-2 sm:col-span-1' : ''}>
              <div className="h-full bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 hover:shadow-md hover:-translate-y-1 transition-all duration-300 group">
                <div className="h-44 sm:h-48 overflow-hidden">
                  <img
                    src={photo}
                    alt={`${name} — ${role}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                </div>
                <div className="p-4">
                  <h3 className="font-extrabold text-slate-900 text-sm">{name}</h3>
                  <p className="text-teal-600 text-xs font-bold mt-0.5">{role}</p>
                  <p className="text-slate-500 text-[11px] leading-relaxed mt-2">{bio}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>

    {/* 14. Our Process */}
    <section className="py-14 sm:py-20 px-4 sm:px-6 lg:px-12 bg-slate-50">
      <div className="max-w-6xl mx-auto">
        <SectionHeading
          eyebrow="Our Process"
          title="How It Works"
          subtitle="Four simple steps from your first inquiry to worldwide delivery."
        />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {PROCESS_STEPS.map(({ icon: Icon, title, desc }, i) => (
            <Reveal key={title} delay={i * 120}>
              <div className="relative h-full bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md hover:-translate-y-1 transition-all duration-300">
                <span className="absolute top-4 right-5 text-4xl font-extrabold text-slate-100 select-none">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center mb-4 shadow-md">
                  <Icon size={21} className="text-white" />
                </div>
                <h3 className="font-extrabold text-slate-900 mb-1.5">{title}</h3>
                <p className="text-slate-500 text-xs leading-relaxed">{desc}</p>
                {i < PROCESS_STEPS.length - 1 && (
                  <ArrowRight size={18} className="hidden lg:block absolute top-1/2 -right-[21px] -translate-y-1/2 text-teal-300 z-10" />
                )}
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>

    {/* 15. Testimonials */}
    <section className="py-14 sm:py-20 px-4 sm:px-6 lg:px-12 bg-white">
      <div className="max-w-6xl mx-auto">
        <SectionHeading
          eyebrow="Customer Testimonials"
          title="What Our Partners Say"
        />
        <div className="grid md:grid-cols-3 gap-4 sm:gap-6">
          {TESTIMONIALS.map(({ quote, name, company }, i) => (
            <Reveal key={company} delay={i * 120}>
              <div className="h-full bg-slate-50 rounded-2xl p-6 border border-slate-100 hover:shadow-md hover:-translate-y-1 transition-all duration-300 flex flex-col">
                <Quote size={24} className="text-teal-500 mb-4" />
                <p className="text-slate-600 text-sm leading-relaxed flex-1">&ldquo;{quote}&rdquo;</p>
                <div className="flex items-center gap-1 mt-4 mb-3">
                  {Array(5).fill(null).map((_, s) => (
                    <Star key={s} size={13} className="text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-sm font-extrabold text-slate-900">{name}</p>
                <p className="text-xs text-slate-500">{company}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>

    {/* 16. FAQ */}
    <section className="py-14 sm:py-20 px-4 sm:px-6 lg:px-12 bg-slate-50">
      <div className="max-w-3xl mx-auto">
        <SectionHeading
          eyebrow="FAQ"
          title="Frequently Asked Questions"
        />
        <Reveal>
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden divide-y divide-slate-100 shadow-sm">
            {FAQS.map(({ q, a }) => (
              <Disclosure key={q}>
                {({ open }) => (
                  <div>
                    <Disclosure.Button className="w-full flex items-center justify-between gap-3 px-5 sm:px-6 py-4 text-left hover:bg-slate-50 transition-colors">
                      <span className="text-sm font-semibold text-slate-800">{q}</span>
                      <ChevronDown
                        size={16}
                        className={`shrink-0 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                      />
                    </Disclosure.Button>
                    <Disclosure.Panel className="px-5 sm:px-6 pb-5 text-sm text-slate-600 leading-relaxed">
                      {a}
                    </Disclosure.Panel>
                  </div>
                )}
              </Disclosure>
            ))}
          </div>
        </Reveal>
        <Reveal delay={100}>
          <p className="text-center text-sm text-slate-500 mt-6">
            Still have questions?{' '}
            <Link to="/customer/help" className="text-teal-600 font-bold hover:underline">
              Visit our Help Center
            </Link>
          </p>
        </Reveal>
      </div>
    </section>

    {/* 17. Call to Action */}
    <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-12 bg-gradient-to-br from-slate-900 via-slate-800 to-teal-950 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
      <GridOverlay />
      <div className="max-w-3xl mx-auto text-center relative z-10">
        <Reveal>
          <div className="inline-flex items-center gap-2 bg-teal-500/15 border border-teal-500/30 rounded-full px-4 py-2 mb-6 text-teal-300 text-xs font-bold uppercase tracking-wider">
            <Globe size={11} /> Let&apos;s Trade Together
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white mb-4">
            Ready to Grow Your Business Globally?
          </h2>
          <p className="text-slate-400 mb-10 leading-relaxed">
            Partner with RIPOMA GLOBAL TRADING (PVT) LTD for trusted import-export solutions
            and quality products delivered worldwide.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/customer/help"
              className="inline-flex items-center justify-center gap-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold px-8 py-3.5 rounded-xl transition-all duration-200 shadow-lg shadow-teal-500/25 hover:scale-105 text-sm"
            >
              Contact Us Today <ArrowRight size={16} />
            </Link>
            <Link
              to="/customer/register"
              className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 text-white font-bold px-8 py-3.5 rounded-xl transition-all duration-200 border border-white/20 backdrop-blur-sm text-sm"
            >
              Create Free Account <ChevronRight size={16} />
            </Link>
          </div>
        </Reveal>
      </div>
    </section>

    <CustomerFooter />
  </div>
);

export default CustomerAbout;
