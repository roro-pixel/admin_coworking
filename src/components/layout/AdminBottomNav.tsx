import React, { useEffect, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  BarChart3,
  Briefcase,
  Building2,
  Calendar,
  CreditCard,
  FileText,
  FolderOpen,
  LayoutDashboard,
  Menu,
  Package,
  Settings,
  Users,
  Wallet,
} from "lucide-react";

const mainNavItems = [
  { label: "Accueil", to: "/", icon: LayoutDashboard },
  { label: "Réserv.", to: "/bookings", icon: Calendar },
  { label: "Docs", to: "/document", icon: FolderOpen },
  { label: "Stock", to: "/inventory", icon: Package },
];

const moreItems = [
  { label: "Customers", to: "/customers", icon: Building2 },
  { label: "Members", to: "/members", icon: Users },
  { label: "Abonnements", to: "/subscriptions", icon: CreditCard },
  { label: "Ressources", to: "/resources", icon: Building2 },
  { label: "Paiements", to: "/payments", icon: CreditCard },
  { label: "Facturation", to: "/billing", icon: FileText },
  { label: "Portefeuilles", to: "/wallets", icon: Wallet },
  { label: "Contrats", to: "/contracts", icon: FileText },
  { label: "Opérations", to: "/operations", icon: Briefcase },
  { label: "Rapports", to: "/reports", icon: BarChart3 },
  { label: "Paramètres", to: "/settings", icon: Settings },
];

export const AdminBottomNav: React.FC = () => {
  const [moreOpen, setMoreOpen] = useState(false);
  const location = useLocation();
  const rootRef = useRef<HTMLDivElement | null>(null);

  const moreActive = moreItems.some((item) =>
    item.to === "/"
      ? location.pathname === "/"
      : location.pathname.startsWith(item.to),
  );

  useEffect(() => {
    setMoreOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setMoreOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  return (
    <div ref={rootRef} className="fixed inset-x-3 bottom-3 z-50 lg:hidden">
      {moreOpen && (
        <div className="mb-3 rounded-[1.7rem] bg-white/95 p-3 shadow-[0_18px_50px_rgba(15,23,42,0.18)] ring-1 ring-gray-100 backdrop-blur">
          <div className="mb-2 flex items-center justify-between px-1">
            <button
              type="button"
              onClick={() => setMoreOpen(false)}
              className="rounded-full bg-gray-50 px-3 py-1 text-xs font-black text-gray-500"
            >
              Fermer
            </button>
          </div>

          <div className="grid max-h-[55vh] grid-cols-2 gap-2 overflow-y-auto pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {moreItems.map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-2 rounded-2xl px-3 py-3 text-xs font-black transition ${
                      isActive
                        ? "bg-primary-600 text-white shadow-lg shadow-primary-600/20"
                        : "bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-950"
                    }`
                  }
                >
                  <Icon size={17} className="shrink-0" />
                  <span className="truncate">{item.label}</span>
                </NavLink>
              );
            })}
          </div>
        </div>
      )}

      <nav className="rounded-[1.7rem] bg-white/95 px-3 py-2 shadow-[0_18px_50px_rgba(15,23,42,0.18)] ring-1 ring-gray-100 backdrop-blur">
        <div className="grid grid-cols-5 items-end gap-1">
          {mainNavItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-1 rounded-2xl px-1 py-1.5 text-[10px] font-semibold transition ${
                    isActive
                      ? "text-primary-600"
                      : "text-gray-500 hover:text-gray-900"
                  }`
                }
              >
                <Icon size={20} />
                <span className="max-w-[64px] truncate">{item.label}</span>
              </NavLink>
            );
          })}

          <button
            type="button"
            onClick={() => setMoreOpen((open) => !open)}
            className={`flex flex-col items-center gap-1 rounded-2xl px-1 py-1.5 text-[10px] font-semibold transition ${
              moreOpen || moreActive
                ? "text-primary-600"
                : "text-gray-500 hover:text-gray-900"
            }`}
            aria-expanded={moreOpen}
            aria-label="Ouvrir les autres sections"
          >
            <Menu size={20} />
            <span className="max-w-[64px] truncate">Plus</span>
          </button>
        </div>
      </nav>
    </div>
  );
};
