import React from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Banknote,
  ClipboardList,
  CreditCard,
  FileText,
  Receipt,
  RefreshCw,
  Scale,
  Wallet,
} from "lucide-react";
import { AdminLayout } from "../../components/layout/AdminLayout";
import { brandVars } from "../../components/layout/adminTheme";
import { PageHeader, Tabs } from "../../components/subscription/kit";
import type { TabItem } from "../../components/subscription/kit";
import { Toaster } from "../../components/ui/Toaster";
import { PaymentIntentsList } from "./PaymentIntentsList";
import { CreatePaymentIntentPage } from "./CreatePaymentIntentPage";
import { PaymentIntentDetailPage } from "./PaymentIntentDetailPage";
import { CashRegistersList } from "./CashRegistersList";
import { CashSessionsList } from "./CashSessionsList";
import { CashMovementsList } from "./CashMovementsList";
import { ReconciliationPanel } from "./ReconciliationPanel";
import { PaymentRecoveryPanel } from "./PaymentRecoveryPanel";
import { PaymentReceiptViewer } from "./PaymentReceiptViewer";
import { CashMetricsDashboard } from "./CashMetricsDashboard";
import { CashRequestsList } from "./CashRequestsList";
import { CashAnomaliesPanel } from "./CashAnomaliesPanel";
import { CashVouchersPanel } from "./CashVouchersPanel";

const navItems: TabItem<string>[] = [
  { id: "/payments", label: "Intentions", icon: CreditCard },
  { id: "/payments/recovery", label: "Recouvrement", icon: RefreshCw },
  { id: "/payments/receipts", label: "Reçus", icon: Receipt },
  { id: "/payments/registers", label: "Caisses", icon: Wallet },
  { id: "/payments/sessions", label: "Sessions", icon: Activity },
  { id: "/payments/movements", label: "Mouvements", icon: Banknote },
  { id: "/payments/vouchers", label: "Bons", icon: FileText },
  { id: "/payments/requests", label: "Demandes", icon: ClipboardList },
  { id: "/payments/metrics", label: "Métriques", icon: BarChart3 },
  { id: "/payments/anomalies", label: "Anomalies", icon: AlertTriangle },
  { id: "/payments/reconciliation", label: "Réconciliation", icon: Scale },
];

/** Onglet actif d'après l'adresse ; null sur les pages création et détail, qui n'affichent pas la navigation. */
const activeTab = (pathname: string): string | null => {
  const clean = pathname.replace(/\/+$/, "") || "/";
  if (clean === "/payments") return "/payments";
  const hit = navItems.find((i) => i.id !== "/payments" && clean.startsWith(i.id));
  return hit ? hit.id : null;
};

export const PaymentMaster: React.FC = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const active = activeTab(pathname);

  return (
    <AdminLayout>
      <div style={brandVars}>
        <Toaster />
        {active && (
          <>
            <PageHeader title="Paiements et caisse" subtitle="Intentions, recouvrement, reçus, sessions, mouvements et contrôle de caisse" />
            <div className="mb-6">
              <Tabs items={navItems} active={active} onChange={(id) => navigate(id)} />
            </div>
          </>
        )}
        <Routes>
          <Route path="/" element={<PaymentIntentsList />} />
          <Route path="/create" element={<CreatePaymentIntentPage />} />
          <Route path="/recovery" element={<PaymentRecoveryPanel />} />
          <Route path="/receipts" element={<PaymentReceiptViewer />} />
          <Route path="/registers" element={<CashRegistersList />} />
          <Route path="/sessions" element={<CashSessionsList />} />
          <Route path="/movements" element={<CashMovementsList />} />
          <Route path="/vouchers" element={<CashVouchersPanel />} />
          <Route path="/requests" element={<CashRequestsList />} />
          <Route path="/metrics" element={<CashMetricsDashboard />} />
          <Route path="/anomalies" element={<CashAnomaliesPanel />} />
          <Route path="/reconciliation" element={<ReconciliationPanel />} />
          <Route path="/:intentNumber" element={<PaymentIntentDetailPage />} />
          <Route path="*" element={<Navigate to="/payments" replace />} />
        </Routes>
      </div>
    </AdminLayout>
  );
};
