import React from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import {
  Activity,
  ArrowRightLeft,
  BookOpen,
  Landmark,
  Settings,
  Users,
  AlertTriangle,
  BarChart3,
  Banknote,
  ClipboardList,
  CreditCard,
  FileText,
  Receipt,
  RefreshCw,
  Smartphone,
  Wallet,
  HandCoins,
  Scale,
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
import { CashRegisterDetailPage } from "./CashRegisterDetailPage";
import { CashSessionDetailPage } from "./CashSessionDetailPage";
import { CashVarianceReviews } from "./CashVarianceReviews";
import { CashMovementsList } from "./CashMovementsList";
import { ReconciliationPanel } from "./ReconciliationPanel";
import { PaymentRecoveryPanel } from "./PaymentRecoveryPanel";
import { PaymentReceiptViewer } from "./PaymentReceiptViewer";
import { CashMetricsDashboard } from "./CashMetricsDashboard";
import { CashRequestsList } from "./CashRequestsList";
import { CashAnomaliesPanel } from "./CashAnomaliesPanel";
import { CashVouchersPanel } from "./CashVouchersPanel";
import { CashDeclarationsPanel } from "./CashDeclarationsPanel";
import { CashTransfersPage } from "./CashTransfersPage";
import { CashStaffPage } from "./CashStaffPage";
import { CashPositionPage } from "./CashPositionPage";
import { CashAccountingPage } from "./CashAccountingPage";
import { CashSettingsPage } from "./CashSettingsPage";

const paymentTabs: TabItem<string>[] = [
  { id: "/payments", label: "Intentions", icon: CreditCard },
  { id: "/payments/recovery", label: "Recouvrement", icon: RefreshCw },
  { id: "/payments/declarations", label: "Déclarations", icon: HandCoins },
  { id: "/payments/receipts", label: "Reçus", icon: Receipt },
  { id: "/payments/reconciliation", label: "Mobile money", icon: Smartphone },
];

const cashTabs: TabItem<string>[] = [
  { id: "/payments/registers", label: "Caisses", icon: Wallet },
  { id: "/payments/sessions", label: "Sessions", icon: Activity },
  { id: "/payments/variances", label: "Écarts", icon: Scale },
  { id: "/payments/movements", label: "Mouvements", icon: Banknote },
  { id: "/payments/vouchers", label: "Bons", icon: FileText },
  { id: "/payments/requests", label: "Demandes", icon: ClipboardList },
  { id: "/payments/transfers", label: "Transferts", icon: ArrowRightLeft },
  { id: "/payments/staff", label: "Personnel", icon: Users },
  { id: "/payments/position", label: "Position", icon: Landmark },
  { id: "/payments/metrics", label: "Métriques", icon: BarChart3 },
  { id: "/payments/anomalies", label: "Anomalies", icon: AlertTriangle },
  { id: "/payments/accounting", label: "Comptabilité", icon: BookOpen },
  { id: "/payments/settings", label: "Paramètres", icon: Settings },
];

/** Onglet actif d'après l'adresse ; null sur les pages création et détail, qui n'affichent pas la navigation. */
const activeTab = (pathname: string): { id: string; cash: boolean } | null => {
  const clean = pathname.replace(/\/+$/, "") || "/";
  if (clean === "/payments") return { id: "/payments", cash: false };
  const cash = cashTabs.find((i) => clean.startsWith(i.id));
  if (cash) return { id: cash.id, cash: true };
  const pay = paymentTabs.find((i) => i.id !== "/payments" && clean.startsWith(i.id));
  return pay ? { id: pay.id, cash: false } : null;
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
            <PageHeader
              title={active.cash ? "Caisse" : "Paiements"}
              subtitle={active.cash ? "Caisses, sessions, écarts, mouvements, transferts, personnel, position et comptabilité" : "Intentions, recouvrement, déclarations d'espèces, reçus et mobile money"}
            />
            <div className="mb-6">
              <Tabs items={active.cash ? cashTabs : paymentTabs} active={active.id} onChange={(id) => navigate(id)} />
            </div>
          </>
        )}
        <Routes>
          <Route path="/" element={<PaymentIntentsList />} />
          <Route path="/create" element={<CreatePaymentIntentPage />} />
          <Route path="/recovery" element={<PaymentRecoveryPanel />} />
          <Route path="/declarations" element={<CashDeclarationsPanel />} />
          <Route path="/receipts" element={<PaymentReceiptViewer />} />
          <Route path="/registers" element={<CashRegistersList />} />
          <Route path="/registers/:registerCode" element={<CashRegisterDetailPage />} />
          <Route path="/sessions" element={<CashSessionsList />} />
          <Route path="/sessions/:sessionNumber" element={<CashSessionDetailPage />} />
          <Route path="/variances" element={<CashVarianceReviews />} />
          {/* Liens des e-mails d'assistance */}
          <Route path="/cash-registers/sessions/:sessionNumber" element={<CashSessionDetailPage />} />
          <Route path="/movements" element={<CashMovementsList />} />
          <Route path="/vouchers" element={<CashVouchersPanel />} />
          <Route path="/requests" element={<CashRequestsList />} />
          <Route path="/transfers" element={<CashTransfersPage />} />
          <Route path="/staff" element={<CashStaffPage />} />
          <Route path="/position" element={<CashPositionPage />} />
          <Route path="/accounting" element={<CashAccountingPage />} />
          <Route path="/settings" element={<CashSettingsPage />} />
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
