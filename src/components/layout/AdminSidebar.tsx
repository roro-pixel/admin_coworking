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

interface AdminSidebarProps {
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
}

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

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  expanded,
  onExpandedChange,
}) => {
  return (
    <aside
      onMouseEnter={() => onExpandedChange(true)}
      onMouseLeave={() => onExpandedChange(false)}
      className={`
        fixed left-0 top-24 z-30 hidden overflow-hidden rounded-r-[2rem]
        border border-l-0 border-gray-100 bg-white/95 shadow-xl shadow-slate-950/5
        backdrop-blur transition-all duration-300 lg:block
        ${expanded ? "w-64" : "w-20"}
      `}
    >
      <div className="py-4">
        <nav className="max-h-[calc(100vh-8rem)] space-y-1 overflow-y-auto overflow-x-hidden px-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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

                <span
                  className={`truncate transition-opacity duration-200 ${
                    expanded ? "opacity-100" : "opacity-0"
                  }`}
                >
                  {item.label}
                </span>
              </NavLink>
            );
          })}
        </nav>
      </div>
    </aside>
  );
};