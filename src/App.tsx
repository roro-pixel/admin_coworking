import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AdminLogin } from "./pages/Login";
import { AdminDashboard } from "./pages/Dashboard";
import { AdminCustomers } from "./pages/Customers";
import { AdminMembers } from "./pages/Members";
import { ResourceMaster } from "./pages/Resource/ResourceMaster";
import { BookingMaster } from "./pages/Booking/BookingMaster";
import { CustomerDetail } from "./pages/CustomerDetail";
import { MemberDetail } from "./pages/MemberDetail";
import { CreateCustomer } from "./pages/CreateCustomer";
import { CreateMember } from "./pages/CreateMember";
import { DocumentMaster } from "./pages/Document/DocumentMaster";
import { AdminContracts } from "./pages/Contracts";
import { InventoryMaster } from "./pages/Inventory/InventoryMaster";
import { SubscriptionMaster } from "./pages/Subscription/SubscriptionMaster";
import { CreateEntitlementDefinition } from "./pages/Subscription/entitlements/CreateEntitlementDefinition";
import { EntitlementDefinitionDetail } from "./pages/Subscription/entitlements/EntitlementDefinitionDetail";
import { PaymentMaster } from "./pages/Payment/PaymentMaster";
import { WalletMaster } from "./pages/Wallet/WalletMaster";
import { WalletDetailModal } from "./pages/Wallet/WalletDetailModal";
import { BillingMaster } from "./pages/Billing/BillingMaster";
import { ReportingMaster } from "./pages/Reporting/ReportingMaster";
import { OperationsMaster } from "./pages/Support/Operationsmaster";
import { TicketCreatePage } from "./pages/Support/TicketCreatePage";
import { TicketDetailPage } from "./pages/Support/TicketDetailPage";
import { SettingsMaster } from "./pages/Settings/SettingsMaster";
import { CreateQuoteModal } from "./pages/Billing/CreateQuoteModal";
import { CreateInvoiceModal } from "./pages/Billing/CreateInvoiceModal";
import { ContractCreatePage } from "./components/contracts/ContractCreatePage";
import { ContractDetailPage } from "./components/contracts/ContractDetailPage";
import { NotificationsPage } from "./pages/NotificationsPage";
import { BillingDocumentDetailPage } from "./pages/Billing/BillingDocumentDetailPage";
import { AdminUserDetailsPage } from "./pages/Settings/AdminUserDetailsPage";
import { ContractPreviewPage } from "./components/contracts/ContractPreviewPage";
import { BookingCreatePage } from "./components/bookings/BookingCreatePage";
import { BookingDetailPage } from "./components/bookings/BookingDetailPage";
import { PublicQuoteSignaturePage } from "./pages/Billing/PublicQuoteSignaturePage";
import { SubscriptionDetailPage } from "./pages/Subscription/subscriptions/SubscriptionDetailPage";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<AdminLogin />} />
            <Route
              path="/quote/sign/:token"
              element={<PublicQuoteSignaturePage />}
            />
            <Route
              path="/public/quotes/sign/:token"
              element={<PublicQuoteSignaturePage />}
            />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/customers"
              element={
                <ProtectedRoute>
                  <AdminCustomers />
                </ProtectedRoute>
              }
            />
            <Route
              path="/members"
              element={
                <ProtectedRoute>
                  <AdminMembers />
                </ProtectedRoute>
              }
            />
            <Route
              path="/resources/*"
              element={
                <ProtectedRoute>
                  <ResourceMaster />
                </ProtectedRoute>
              }
            />
            <Route
              path="/bookings/*"
              element={
                <ProtectedRoute>
                  <BookingMaster />
                </ProtectedRoute>
              }
            />
            <Route
              path="/bookings/create"
              element={
                <ProtectedRoute>
                  <BookingCreatePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/bookings/:bookingNumber"
              element={
                <ProtectedRoute>
                  <BookingDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/customers/:id"
              element={
                <ProtectedRoute>
                  <CustomerDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/members/:id"
              element={
                <ProtectedRoute>
                  <MemberDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/customers/create"
              element={
                <ProtectedRoute>
                  <CreateCustomer />
                </ProtectedRoute>
              }
            />
            <Route
              path="/members/create"
              element={
                <ProtectedRoute>
                  <CreateMember />
                </ProtectedRoute>
              }
            />
            <Route
              path="/document/*"
              element={
                <ProtectedRoute>
                  <DocumentMaster />
                </ProtectedRoute>
              }
            />
            <Route
              path="/contracts"
              element={
                <ProtectedRoute>
                  <AdminContracts />
                </ProtectedRoute>
              }
            />
            <Route
              path="/contracts/new"
              element={
                <ProtectedRoute>
                  <ContractCreatePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/contracts/:contractCode"
              element={
                <ProtectedRoute>
                  <ContractDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/contracts/preview/:contractCode"
              element={
                <ProtectedRoute>
                  <ContractPreviewPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/inventory/*"
              element={
                <ProtectedRoute>
                  <InventoryMaster />
                </ProtectedRoute>
              }
            />
            <Route
              path="/subscriptions/entitlements/create"
              element={
                <ProtectedRoute>
                  <CreateEntitlementDefinition />
                </ProtectedRoute>
              }
            />
            <Route
              path="/subscriptions/entitlements/:code"
              element={
                <ProtectedRoute>
                  <EntitlementDefinitionDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/subscriptions/:subscriptionNumber"
              element={
                <ProtectedRoute>
                  <SubscriptionDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/subscriptions/*"
              element={
                <ProtectedRoute>
                  <SubscriptionMaster />
                </ProtectedRoute>
              }
            />
            <Route
              path="/payments/*"
              element={
                <ProtectedRoute>
                  <PaymentMaster />
                </ProtectedRoute>
              }
            />
            <Route
              path="/wallets/*"
              element={
                <ProtectedRoute>
                  <WalletMaster />
                </ProtectedRoute>
              }
            />
            <Route
              path="/wallets/:walletNumber"
              element={
                <ProtectedRoute>
                  <WalletDetailModal />
                </ProtectedRoute>
              }
            />
            <Route
              path="/billing/*"
              element={
                <ProtectedRoute>
                  <BillingMaster />
                </ProtectedRoute>
              }
            />
            <Route
              path="/billing/invoices/create"
              element={
                <ProtectedRoute>
                  <CreateInvoiceModal />
                </ProtectedRoute>
              }
            />
            <Route
              path="/billing/quotes/create"
              element={
                <ProtectedRoute>
                  <CreateQuoteModal />
                </ProtectedRoute>
              }
            />
            <Route
              path="/billing/documents/:documentNumber"
              element={
                <ProtectedRoute>
                  <BillingDocumentDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports/*"
              element={
                <ProtectedRoute>
                  <ReportingMaster />
                </ProtectedRoute>
              }
            />
            <Route
              path="/operations"
              element={
                <ProtectedRoute>
                  <OperationsMaster />
                </ProtectedRoute>
              }
            />
            <Route
              path="/operations/support/create"
              element={
                <ProtectedRoute>
                  <TicketCreatePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/operations/support/:ticketNumber"
              element={
                <ProtectedRoute>
                  <TicketDetailPage />
                </ProtectedRoute>
              }
            />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route
              path="/settings/*"
              element={
                <ProtectedRoute>
                  <SettingsMaster />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings/users/:userId"
              element={
                <ProtectedRoute>
                  <AdminUserDetailsPage />
                </ProtectedRoute>
              }
            />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
