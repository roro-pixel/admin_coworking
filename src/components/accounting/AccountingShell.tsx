import React from "react";
import { NavLink } from "react-router-dom";
import { AdminLayout } from "../layout/AdminLayout";
import { brandVars } from "../layout/adminTheme";
import { Toaster } from "../ui/Toaster";

/** Sous-navigation du module : chaque lot ajoute ses entrées ici. */
export const ACCOUNTING_LINKS: { to: string; label: string }[] = [
  { to: "/accounting/entries", label: "Écritures" },
  { to: "/accounting/accounts", label: "Plan de comptes" },
  { to: "/accounting/treasury", label: "Trésorerie" },
  { to: "/accounting/purchases", label: "Achats" },
  { to: "/accounting/sales-control", label: "Contrôle des ventes" },
  { to: "/accounting/vat", label: "TVA" },
  { to: "/accounting/fixed-assets", label: "Immobilisations" },
  { to: "/accounting/analytic", label: "Analytique" },
  { to: "/accounting/budget", label: "Budget" },
  { to: "/accounting/period", label: "Fin de période" },
  { to: "/accounting/closing", label: "Clôture et états" },
  { to: "/accounting/exchange", label: "Échanges" },
  { to: "/accounting/fund", label: "Demandes de fonds" },
  { to: "/accounting/approvals", label: "Approbations" },
];

export const AccountingShell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AdminLayout>
    <div style={brandVars}>
      <Toaster />
      <nav className="mb-6 flex flex-wrap gap-2" aria-label="Comptabilité">
        {ACCOUNTING_LINKS.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            className={({ isActive }) =>
              `rounded-full px-4 py-2 text-sm font-semibold shadow-sm transition ${
                isActive
                  ? "bg-[color:var(--logo-pink-dark)] text-white"
                  : "bg-white text-gray-700 hover:bg-gray-100"
              }`
            }
          >
            {l.label}
          </NavLink>
        ))}
      </nav>
      {children}
    </div>
  </AdminLayout>
);
