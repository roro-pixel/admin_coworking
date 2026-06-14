import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Building2,
  Calendar,
  FileText,
  BarChart3,
  Settings,
  FolderOpen,
  Package,
  CreditCard,
  Wallet,
  Briefcase,
} from "lucide-react";
import Logo from "../../assets/img/logo.jpeg";

const menuItems = [
  { path: "/", icon: LayoutDashboard, label: "Dashboard" },
  { path: "/customers", icon: Building2, label: "Customers" },
  { path: "/members", icon: Users, label: "Members" },
  { path: "/subscriptions", icon: CreditCard, label: "Abonnements" },
  { path: "/resources", icon: Building2, label: "Ressources" },
  { path: "/bookings", icon: Calendar, label: "Réservations" },
  { path: "/payments", icon: CreditCard, label: "Paiements" },
  { path: "/billing", icon: FileText, label: "Facturation" },
  { path: "/wallets", icon: Wallet, label: "Portefeuilles" },
  { path: "/document", icon: FolderOpen, label: "Documents" },
  { path: "/contracts", icon: FileText, label: "Contrats" },
  { path: "/inventory", icon: Package, label: "Inventaire" },
  { path: "/operations", icon: Briefcase, label: "Opérations" },
  { path: "/reports", icon: BarChart3, label: "Rapports" },
  { path: "/settings", icon: Settings, label: "Paramètres" },
];

export const AdminSidebar: React.FC = () => {
  return (
    <>
      {/* Desktop sidebar: compacte au repos, s'élargit au survol */}
      <aside className="group fixed left-0 top-0 bottom-0 z-30 hidden w-20 overflow-hidden border-r border-gray-100 bg-white/95 shadow-sm backdrop-blur transition-all duration-300 hover:w-64 lg:block">
        <div className="flex h-full flex-col">
          <div className="flex h-20 items-center gap-3 px-4">
            <img src={Logo} alt="logo" className="h-11 w-11 shrink-0 rounded-xl object-contain" />
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto overflow-x-hidden px-3 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === "/"}
                  title={item.label}
                  className={({ isActive }) =>
                    `flex h-12 items-center gap-3 rounded-2xl px-3 text-sm font-medium transition-all ${
                      isActive
                        ? "bg-primary-600 text-white shadow-lg shadow-primary-600/20"
                        : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                    }`
                  }
                >
                  <Icon size={21} className="shrink-0" />
                  <span className="truncate opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                    {item.label}
                  </span>
                </NavLink>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Mobile navigation: barre horizontale façon application mobile */}
      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-gray-100 bg-white/95 px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden">
        <div className="flex items-center gap-2 overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/"}
                className={({ isActive }) =>
                  `flex min-w-[72px] flex-col items-center justify-center gap-1 rounded-2xl px-3 py-2 text-[11px] font-medium transition-all ${
                    isActive
                      ? "bg-primary-600 text-white shadow-lg shadow-primary-600/20"
                      : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                  }`
                }
              >
                <Icon size={20} />
                <span className="max-w-[68px] truncate">{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </>
  );
};
