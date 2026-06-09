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
  { path: "/document", icon: FolderOpen, label: "Gestion documentaire" },
  { path: "/contracts", icon: FileText, label: "Contrats" },
  { path: "/inventory", icon: Package, label: "Inventaire" },
  { path: "/operations", icon: Briefcase, label: "Opérations" },
  { path: "/reports", icon: BarChart3, label: "Rapports" },
  { path: "/settings", icon: Settings, label: "Paramètres" },
];

export const AdminSidebar: React.FC = () => {
  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-gray-200 z-30 overflow-y-auto">
      <div className="p-6">
        <div className="flex justify-center items-center pb-6">
          <img src={Logo} alt="logo" className="w-12 h-12 object-contain" />
        </div>

        <nav className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;

            // if (item.disabled) {
            //   return (
            //     <div
            //       key={item.path}
            //       className="flex items-center px-4 py-3 rounded-lg text-gray-400 cursor-not-allowed opacity-50"
            //     >
            //       <Icon size={20} className="mr-3" />
            //       <span className="text-sm font-medium">{item.label}</span>
            //     </div>
            //   );
            // }

            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/"}
                className={({ isActive }) =>
                  `flex items-center px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? "bg-primary-50 text-primary-600"
                      : "text-gray-700 hover:bg-gray-100"
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
