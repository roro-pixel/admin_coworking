import React from "react";
import { Link, Navigate, Routes, Route, useLocation } from "react-router-dom";
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
  { to: "/payments", label: "Intentions" },
  { to: "/payments/recovery", label: "Recouvrement" },
  { to: "/payments/receipts", label: "Reçus" },
  { to: "/payments/registers", label: "Caisses" },
  { to: "/payments/sessions", label: "Sessions" },
  { to: "/payments/movements", label: "Mouvements" },
  { to: "/payments/vouchers", label: "Bons" },
  { to: "/payments/requests", label: "Demandes" },
  { to: "/payments/metrics", label: "Métriques" },
  { to: "/payments/anomalies", label: "Anomalies" },
  { to: "/payments/reconciliation", label: "Réconciliation" },
];

const PaymentNav: React.FC = () => {
  const { pathname } = useLocation();
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold text-gray-900">Paiements & caisse</h1>
      <p className="text-gray-600 mt-1">
        Intentions, recouvrement, reçus, sessions, mouvements et contrôle de
        caisse.
      </p>
      <div className="mt-5 flex flex-wrap gap-2 border-b border-gray-200 pb-2">
        {navItems.map((item) => {
          const active =
            pathname === item.to ||
            (item.to !== "/payments" && pathname.startsWith(item.to));
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`px-3 py-2 rounded-lg text-sm transition ${active ? "bg-primary-50 text-primary-700 font-medium" : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"}`}
            >
              {item.label}
            </Link>
          );
        })}
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
      <Route
        path="/reconciliation"
        element={withLayout(<ReconciliationPanel />)}
      />
      <Route
        path="/:intentNumber"
        element={withLayout(<PaymentIntentDetailPage />)}
      />
      <Route path="*" element={<Navigate to="/payments" replace />} />
    </Routes>
  );
};
