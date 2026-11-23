import React from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import {
  BadgePercent,
  BarChart3,
  BellRing,
  CalendarClock,
  FileCheck2,
  FilePlus2,
  FileStack,
  FileText,
  Gauge,
  ClipboardCheck,
  Handshake,
  Layers,
  MessageSquareWarning,
  Package,
  PackageCheck,
  Percent,
  Ruler,
  Search,
  ShieldAlert,
  ShieldCheck,
  Truck,
  TrendingUp,
  User,
  Wallet,
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
import { BillingDeals } from "./BillingDeals";
import { BillingDealDetail } from "./BillingDealDetail";
import { BillingClaims } from "./BillingClaims";
import { BillingDeliveryNotes } from "./BillingDeliveryNotes";
import { BillingBatchRuns } from "./BillingBatchRuns";
import { BillingUnallocated } from "./BillingUnallocated";
import { BillingSecurityDeposits } from "./BillingSecurityDeposits";
import { BillingCustomerPrices } from "./BillingCustomerPrices";
import { BillingCatalogReferences } from "./BillingCatalogReferences";
import { BillingCatalogMargins } from "./BillingCatalogMargins";
import { BillingTaxRules } from "./BillingTaxRules";
import { BillingWithholdings } from "./BillingWithholdings";
import { BillingQuoteTemplates } from "./BillingQuoteTemplates";
import { BillingDashboard } from "./BillingDashboard";
import { BillingApprovals, BillingApprovalDetail } from "./BillingApprovals";
import { BillingFiscalIntegrity } from "./BillingFiscalIntegrity";

/** Navigation à deux niveaux : un groupe, puis ses écrans. */
const GROUPS: { id: string; label: string; icon: React.ElementType; items: TabItem<string>[] }[] = [
  {
    id: "sales", label: "Ventes", icon: FileText,
    items: [
      { id: "/billing", label: "Documents", icon: FileText },
      { id: "/billing/sources", label: "Sources métier", icon: FilePlus2 },
      { id: "/billing/approvals", label: "Approbations", icon: ClipboardCheck },
      { id: "/billing/deals", label: "Affaires", icon: Handshake },
      { id: "/billing/quote-templates", label: "Modèles de devis", icon: FileStack },
      { id: "/billing/batch", label: "Facturation groupée", icon: Layers },
      { id: "/billing/delivery-notes", label: "Bons de livraison", icon: Truck },
      { id: "/billing/tools", label: "Outils", icon: Wrench },
    ],
  },
  {
    id: "customers", label: "Clients", icon: User,
    items: [
      { id: "/billing/statement", label: "Relevé client", icon: User },
      { id: "/billing/customer-prices", label: "Tarifs clients", icon: BadgePercent },
      { id: "/billing/security-deposits", label: "Cautions", icon: ShieldCheck },
    ],
  },
  {
    id: "collection", label: "Encaissement", icon: Wallet,
    items: [
      { id: "/billing/aging", label: "Créances", icon: BarChart3 },
      { id: "/billing/dunning", label: "Relances", icon: BellRing },
      { id: "/billing/claims", label: "Réclamations", icon: MessageSquareWarning },
      { id: "/billing/unallocated", label: "Paiements non alloués", icon: Wallet },
      { id: "/billing/schedules", label: "Échéanciers", icon: CalendarClock },
      { id: "/billing/recoverables", label: "À récupérer", icon: PackageCheck },
    ],
  },
  {
    id: "catalog", label: "Catalogue", icon: Package,
    items: [
      { id: "/billing/catalog", label: "Articles", icon: Package },
      { id: "/billing/lookup", label: "Recherche", icon: Search },
      { id: "/billing/margins", label: "Marges et prix", icon: TrendingUp },
      { id: "/billing/references", label: "Références", icon: Ruler },
    ],
  },
  {
    id: "tax", label: "Fiscalité", icon: Percent,
    items: [
      { id: "/billing/tax-rules", label: "Règles de taxe", icon: Percent },
      { id: "/billing/withholdings", label: "Retenues", icon: FileCheck2 },
      { id: "/billing/fiscal-integrity", label: "Intégrité fiscale", icon: ShieldAlert },
    ],
  },
  { id: "dashboard", label: "Pilotage", icon: Gauge, items: [{ id: "/billing/dashboard", label: "Tableau de bord", icon: Gauge }] },
];

const ALL_ITEMS = GROUPS.flatMap((g) => g.items.map((i) => ({ ...i, group: g.id })));

/** Écran actif d'après l'adresse (préfixe le plus long) ; null sur les pages création et détail de document. */
const activeItem = (pathname: string) => {
  const clean = pathname.replace(/\/+$/, "") || "/";
  if (clean === "/billing") return ALL_ITEMS[0];
  const hits = ALL_ITEMS.filter((i) => i.id !== "/billing" && (clean === i.id || clean.startsWith(i.id + "/")));
  return hits.sort((a, b) => b.id.length - a.id.length)[0] ?? null;
};

/**
 * Monté sur /billing/*. Les chemins /billing/documents/:documentNumber,
 * /billing/invoices/create et /billing/quotes/create restent ceux utilisés par la liste.
 */
export const BillingMaster: React.FC = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const active = activeItem(pathname);
  const group = GROUPS.find((g) => g.id === active?.group);

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
      <Route path="/approvals" element={<BillingApprovals />} />
      <Route path="/approvals/:number" element={<BillingApprovalDetail />} />
      <Route path="/deals" element={<BillingDeals />} />
      <Route path="/deals/:code" element={<BillingDealDetail />} />
      <Route path="/claims" element={<BillingClaims />} />
      <Route path="/delivery-notes" element={<BillingDeliveryNotes />} />
      <Route path="/batch" element={<BillingBatchRuns />} />
      <Route path="/unallocated" element={<BillingUnallocated />} />
      <Route path="/security-deposits" element={<BillingSecurityDeposits />} />
      <Route path="/customer-prices" element={<BillingCustomerPrices />} />
      <Route path="/references" element={<BillingCatalogReferences />} />
      <Route path="/margins" element={<BillingCatalogMargins />} />
      <Route path="/tax-rules" element={<BillingTaxRules />} />
      <Route path="/withholdings" element={<BillingWithholdings />} />
      <Route path="/quote-templates" element={<BillingQuoteTemplates />} />
      <Route path="/dashboard" element={<BillingDashboard />} />
      <Route path="/fiscal-integrity" element={<BillingFiscalIntegrity />} />
      <Route path="*" element={<Navigate to="/billing" replace />} />
    </Routes>
  );

  // Détail et création portent leur propre habillage (BillingShell) : on ne les enveloppe pas une seconde fois.
  if (!active) return routes;

  return (
    <AdminLayout>
      <div style={brandVars}>
        <Toaster />
        <PageHeader title="Facturation" subtitle="Ventes, clients, encaissement, catalogue et fiscalité" />
        <div className="mb-6 space-y-3">
          <Tabs
            items={GROUPS.map((g) => ({ id: g.items[0].id, label: g.label, icon: g.icon }))}
            active={group?.items[0].id ?? "/billing"}
            onChange={(id) => navigate(id)}
          />
          {group && group.items.length > 1 && <Tabs items={group.items} active={active!.id} onChange={(id) => navigate(id)} variant="soft" />}
        </div>
        {routes}
      </div>
    </AdminLayout>
  );
};
