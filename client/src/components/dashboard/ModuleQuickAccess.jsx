import React from 'react';
import { Link } from 'react-router-dom';
import {
  Boxes,
  Users,
  Globe,
  Package,
  Truck,
  FolderOpen,
  BarChart2,
  DollarSign,
  Bell,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

const modules = [
  { name: 'Inventory', icon: Boxes, to: '/inventory', color: 'from-indigo-500 to-indigo-600' },
  { name: 'Suppliers', icon: Users, to: '/suppliers', color: 'from-blue-500 to-blue-600' },
  { name: 'Customers', icon: Users, to: '/customers', color: 'from-cyan-500 to-cyan-600' },
  { name: 'Imports', icon: Globe, to: '/imports', color: 'from-teal-500 to-teal-600' },
  { name: 'Exports', icon: Package, to: '/exports', color: 'from-violet-500 to-violet-600' },
  { name: 'Documents', icon: FolderOpen, to: '/documents', color: 'from-amber-500 to-amber-600' },
  { name: 'Finance', icon: DollarSign, to: '/finance', color: 'from-emerald-500 to-emerald-600', permission: 'finance:read' },
  { name: 'Reports', icon: BarChart2, to: '/reports', color: 'from-rose-500 to-rose-600' },
  { name: 'Notifications', icon: Bell, to: '/notifications', color: 'from-pink-500 to-pink-600' },
  { name: 'Users', icon: ShieldCheck, to: '/admin/users', color: 'from-slate-500 to-slate-600', permission: 'users:read' },
];

const ModuleQuickAccess = () => {
  const { hasPermission } = useAuth();

  const visible = modules.filter((m) => !m.permission || hasPermission(m.permission));

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-slate-800">Quick Access</h3>
        <span className="text-xs text-slate-400 font-medium">{visible.length} modules</span>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
        {visible.map((mod) => (
          <Link
            key={mod.name}
            to={mod.to}
            className="group flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-slate-50 transition-all duration-200"
          >
            <div
              className={`w-10 h-10 rounded-xl bg-gradient-to-br ${mod.color} flex items-center justify-center shadow-sm group-hover:shadow-md group-hover:scale-105 transition-all duration-200`}
            >
              <mod.icon size={18} className="text-white" />
            </div>
            <span className="text-[10px] font-semibold text-slate-600 group-hover:text-slate-800 text-center leading-tight">
              {mod.name}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default ModuleQuickAccess;
