import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  UserCircle,
  Building2,
  Calendar,
  FileText,
  BarChart3,
  Settings,
  HelpCircle
} from 'lucide-react';
import Logo from '../../assets/img/logo.jpeg'

const menuItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/customers', icon: Building2, label: 'Customers' },
  { path: '/members', icon: Users, label: 'Members' },
  { path: '/spaces', icon: UserCircle, label: 'Espaces' },
  { path: '/bookings', icon: Calendar, label: 'Réservations' },
  { path: '/invoices', icon: FileText, label: 'Factures' },
  { path: '/reports', icon: BarChart3, label: 'Rapports' },
  { path: '/settings', icon: Settings, label: 'Paramètres' },
  { path: '/support', icon: HelpCircle, label: 'Support' },
];

export const AdminSidebar: React.FC = () => {
  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-gray-200">
      <div className="p-6">
        <div className="flex justify-center align-center pb-2">
         <img src={Logo} alt="logo" className='w-15 h-15'/>
        </div>

        <nav className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-primary-50 text-[#C84C9A]'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`
                }
              >
                <Icon size={20} className="mr-3" />
                <span className="text-sm font-medium">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>
    </aside>
  );
};