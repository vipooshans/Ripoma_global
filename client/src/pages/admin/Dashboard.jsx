import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import userService from '../../services/user.service';
import {
  Users,
  Shield,
  Activity,
  Globe,
  Ship,
  TrendingUp,
  FileText,
  Clock
} from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState({ users: 0, roles: 0 });

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const u = await userService.getUsers({ limit: 1 });
        const r = await userService.getRoles();
        setMetrics({
          users: u.pagination.total,
          roles: r.length
        });
      } catch (e) {
        console.error(e);
      }
    };
    fetchCounts();
  }, []);

  const cards = [
    {
      name: 'Total Accounts',
      value: metrics.users,
      desc: 'Registered user profiles',
      icon: Users,
      color: 'from-slate-800 to-slate-900 text-white'
    },
    {
      name: 'Access Roles',
      value: metrics.roles,
      desc: 'Configured security layers',
      icon: Shield,
      color: 'bg-white text-slate-850 border border-slate-200'
    },
    {
      name: 'Shipment Declarations',
      value: '24',
      desc: 'Awaiting customs approval',
      icon: FileText,
      color: 'bg-white text-slate-850 border border-slate-200'
    },
    {
      name: 'Cargo Shipments',
      value: '8 Active',
      desc: 'Transit ocean freight',
      icon: Ship,
      color: 'bg-white text-slate-850 border border-slate-200'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-slate-900 text-white rounded-xl p-6 md:p-8 shadow-md relative overflow-hidden">
        {/* Subtle background decoration */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-20 -left-10 w-64 h-64 bg-teal-500/15 rounded-full blur-3xl"></div>

        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-1.5 bg-teal-500/20 text-teal-400 border border-teal-500/30 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">
            <Activity size={12} className="animate-pulse" />
            <span>RIPOMA GLOBAL OPERATIONAL HUB</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Welcome back, {user?.name}!
          </h1>
          <p className="text-slate-400 text-sm max-w-xl">
            You are logged in as an <strong className="text-teal-400 capitalize">{user?.role}</strong>. Manage international customs documentation, audit system accesses, and track logistic consignments.
          </p>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, i) => (
          <div
            key={i}
            className={`rounded-xl p-5 shadow-sm flex items-center justify-between gap-4 ${
              card.color.startsWith('from')
                ? `bg-gradient-to-br ${card.color}`
                : card.color
            }`}
          >
            <div>
              <span className={`text-xs font-bold uppercase tracking-wider ${
                card.color.includes('text-white') ? 'text-slate-400' : 'text-slate-450'
              }`}>
                {card.name}
              </span>
              <p className="text-2xl font-extrabold mt-1 tracking-tight">{card.value}</p>
              <p className={`text-[11px] mt-1 ${
                card.color.includes('text-white') ? 'text-slate-400' : 'text-slate-450'
              }`}>
                {card.desc}
              </p>
            </div>
            <div className={`p-3 rounded-lg shrink-0 ${
              card.color.includes('text-white') ? 'bg-white/10 text-teal-400' : 'bg-slate-50 text-slate-400 border border-slate-200'
            }`}>
              <card.icon size={22} />
            </div>
          </div>
        ))}
      </div>

      {/* Info Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent declarations mock table */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
              <Globe className="text-teal-650" size={16} />
              <span>Pending Shipments Tracking</span>
            </h3>
            <span className="text-[10px] text-teal-600 bg-teal-50 border border-teal-150 px-2 py-0.5 rounded font-bold uppercase">
              Live
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="py-2.5">Manifest</th>
                  <th className="py-2.5">Origin</th>
                  <th className="py-2.5">Destination</th>
                  <th className="py-2.5">Cargo Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                <tr>
                  <td className="py-3 font-semibold text-slate-850">SH-9902-A</td>
                  <td className="py-3">Shanghai (CNSHA)</td>
                  <td className="py-3">Rotterdam (NLRTM)</td>
                  <td className="py-3">
                    <span className="bg-teal-50 text-teal-700 border border-teal-200 px-2 py-0.5 rounded font-bold uppercase text-[9px]">
                      In Transit
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="py-3 font-semibold text-slate-850">SH-9905-B</td>
                  <td className="py-3">Hamburg (DEHAM)</td>
                  <td className="py-3">New York (USNYC)</td>
                  <td className="py-3">
                    <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded font-bold uppercase text-[9px]">
                      Customs Hold
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="py-3 font-semibold text-slate-850">SH-9908-C</td>
                  <td className="py-3">Singapore (SGSIN)</td>
                  <td className="py-3">Los Angeles (USLAX)</td>
                  <td className="py-3">
                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-bold uppercase text-[9px]">
                      Cleared
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Audit */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 lg:col-span-1 space-y-4">
          <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
            <Clock className="text-teal-650" size={16} />
            <span>Audit Manifests</span>
          </h3>

          <div className="space-y-3.5 text-xs text-slate-500 font-medium leading-none">
            <div className="flex items-start gap-2.5">
              <div className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-1" />
              <div>
                <p className="text-slate-700 font-bold">Customs declaration document compiled</p>
                <span className="text-[10px] text-slate-400 mt-1 block">10 mins ago</span>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <div className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-1" />
              <div>
                <p className="text-slate-700 font-bold">New Staff user register key created</p>
                <span className="text-[10px] text-slate-400 mt-1 block">1 hour ago</span>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <div className="w-1.5 h-1.5 rounded-full bg-slate-350 mt-1" />
              <div>
                <p className="text-slate-700 font-bold">Global ports table synced with UN database</p>
                <span className="text-[10px] text-slate-400 mt-1 block">Yesterday</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
