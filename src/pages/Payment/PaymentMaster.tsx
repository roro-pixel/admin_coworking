import React from "react";
import { Link, Navigate, Routes, Route, useLocation } from "react-router-dom";
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

const navItems = [
  { to: "/payments", label: "Intentions", icon: CreditCard },
  { to: "/payments/recovery", label: "Recouvrement", icon: RefreshCw },
  { to: "/payments/receipts", label: "Reçus", icon: Receipt },
  { to: "/payments/registers", label: "Caisses", icon: Wallet },
  { to: "/payments/sessions", label: "Sessions", icon: Activity },
  { to: "/payments/movements", label: "Mouvements", icon: Banknote },
  { to: "/payments/vouchers", label: "Bons", icon: FileText },
  { to: "/payments/requests", label: "Demandes", icon: ClipboardList },
  { to: "/payments/metrics", label: "Métriques", icon: BarChart3 },
  { to: "/payments/anomalies", label: "Anomalies", icon: AlertTriangle },
  { to: "/payments/reconciliation", label: "Réconciliation", icon: Scale },
];

const PaymentNav: React.FC = () => {
  const { pathname } = useLocation();
  return (
    <div className="mb-6">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-gray-900">Paiements & caisse</h1>
        <p className="text-gray-500 mt-1">
          Intentions, recouvrement, reçus, sessions, mouvements et contrôle de caisse.
        </p>
      </div>
      <div className="overflow-x-auto pb-1">
        <div className="inline-flex min-w-max items-center gap-1 rounded-3xl bg-white p-1.5 shadow-sm ring-1 ring-gray-100">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.to ||
              (item.to !== "/payments" && pathname.startsWith(item.to));
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium transition-all whitespace-nowrap ${
                  active
                    ? "bg-primary-600 text-white shadow-sm"
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <Icon size={17} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const withLayout = (node: React.ReactNode, showNav = true) => (
  <AdminLayout>
    {showNav && <PaymentNav />}
    {node}
  </AdminLayout>
);

export const PaymentMaster: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={withLayout(<PaymentIntentsList />)} />
      <Route path="/create" element={withLayout(<CreatePaymentIntentPage />)} />
      <Route path="/recovery" element={withLayout(<PaymentRecoveryPanel />)} />
      <Route path="/receipts" element={withLayout(<PaymentReceiptViewer />)} />
      <Route path="/registers" element={withLayout(<CashRegistersList />)} />
      <Route path="/sessions" element={withLayout(<CashSessionsList />)} />
      <Route path="/movements" element={withLayout(<CashMovementsList />)} />
      <Route path="/vouchers" element={withLayout(<CashVouchersPanel />)} />
      <Route path="/requests" element={withLayout(<CashRequestsList />)} />
      <Route path="/metrics" element={withLayout(<CashMetricsDashboard />)} />
      <Route path="/anomalies" element={withLayout(<CashAnomaliesPanel />)} />
      <Route path="/reconciliation" element={withLayout(<ReconciliationPanel />)} />
      <Route path="/:intentNumber" element={withLayout(<PaymentIntentDetailPage />)} />
      <Route path="*" element={<Navigate to="/payments" replace />} />
    </Routes>
  );
};
