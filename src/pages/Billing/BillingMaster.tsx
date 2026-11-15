import React from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import {
  BarChart3,
  BellRing,
  CalendarClock,
  FilePlus2,
  FileText,
  Package,
  PackageCheck,
  Search,
  User,
  Wrench,
} from "lucide-react";
import { AdminLayout } from "../../components/layout/AdminLayout";
import { brandVars } from "../../components/layout/adminTheme";
import { PageHeader, Tabs } from "../../components/subscription/kit";
import type { TabItem } from "../../components/subscription/kit";
import { Toaster } from "../../components/ui/Toaster";
import { BillingDocumentsList } from "./BillingDocumentsList";
import { BillingDocumentDetailPage } from "./BillingDocumentDetailPage";
import { CreateInvoiceModal } from "./CreateInvoiceModal";
import { BillingDocumentEditPage } from "./BillingDocumentEditPage";
import { CreateQuoteModal } from "./CreateQuoteModal";
import { BillingSourceInvoiceManager } from "./BillingSourceInvoiceManager";
import { BillingDocumentTools } from "./BillingDocumentTools";
import { BillingCustomerStatement } from "./BillingCustomerStatement";
import { BillingScheduleManager } from "./BillingScheduleManager";
import { BillingCatalogManager } from "./BillingCatalogManager";
import { BillingCatalogLookupPanel } from "./BillingCatalogLookupPanel";
import { BillingAgingReport } from "./BillingAgingReport";
import { BillingRecoverablesPanel } from "./BillingRecoverablesPanel";
import { BillingDunning } from "./BillingDunning";

const navItems: TabItem<string>[] = [
  { id: "/billing", label: "Documents", icon: FileText },
  { id: "/billing/sources", label: "Sources métier", icon: FilePlus2 },
  { id: "/billing/tools", label: "Outils", icon: Wrench },
  { id: "/billing/statement", label: "Relevé client", icon: User },
  { id: "/billing/schedules", label: "Échéanciers", icon: CalendarClock },
  { id: "/billing/catalog", label: "Catalogue", icon: Package },
  { id: "/billing/lookup", label: "Recherche catalogue", icon: Search },
  { id: "/billing/recoverables", label: "À récupérer", icon: PackageCheck },
  { id: "/billing/aging", label: "Créances", icon: BarChart3 },
  { id: "/billing/dunning", label: "Relances", icon: BellRing },
];

/** Onglet actif d'après l'adresse ; null sur les pages création et détail, qui n'affichent pas la navigation. */
const activeTab = (pathname: string): string | null => {
  const clean = pathname.replace(/\/+$/, "") || "/";
  if (clean === "/billing") return "/billing";
  const hit = navItems.find((i) => i.id !== "/billing" && clean.startsWith(i.id));
  return hit ? hit.id : null;
};

/**
 * Monté sur /billing/*. Les chemins /billing/documents/:documentNumber,
 * /billing/invoices/create et /billing/quotes/create restent ceux utilisés par la liste.
 */
export const BillingMaster: React.FC = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const active = activeTab(pathname);

  const routes = (
    <Routes>
      <Route path="/" element={<BillingDocumentsList />} />
      <Route path="/documents/:documentNumber" element={<BillingDocumentDetailPage />} />
      <Route path="/documents/:documentNumber/edit" element={<BillingDocumentEditPage />} />
      <Route path="/invoices/create" element={<CreateInvoiceModal />} />
      <Route path="/quotes/create" element={<CreateQuoteModal />} />
      <Route path="/sources" element={<BillingSourceInvoiceManager />} />
      <Route path="/tools" element={<BillingDocumentTools />} />
      <Route path="/statement" element={<BillingCustomerStatement />} />
      <Route path="/schedules" element={<BillingScheduleManager />} />
      <Route path="/catalog" element={<BillingCatalogManager />} />
      <Route path="/lookup" element={<BillingCatalogLookupPanel />} />
      <Route path="/recoverables" element={<BillingRecoverablesPanel />} />
      <Route path="/aging" element={<BillingAgingReport />} />
      <Route path="/dunning" element={<BillingDunning />} />
      <Route path="*" element={<Navigate to="/billing" replace />} />
    </Routes>
  );

  // Détail et création portent leur propre habillage (BillingShell) : on ne les enveloppe pas une seconde fois.
  if (!active) return routes;

  return (
    <AdminLayout>
      <div style={brandVars}>
        <Toaster />
        <PageHeader title="Facturation" subtitle="Factures, devis, avoirs, échéanciers, catalogue, créances et relances" />
        <div className="mb-6">
          <Tabs items={navItems} active={active} onChange={(id) => navigate(id)} />
        </div>
        {routes}
      </div>
    </AdminLayout>
  );
};
