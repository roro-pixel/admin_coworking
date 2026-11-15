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
import { CreateSubscription } from "./pages/Subscription/subscriptions/CreateSubscription";
import { CreateUsageRecord } from "./pages/Subscription/usage/CreateUsageRecord";
import { PlanDetailPage } from "./pages/Subscription/plans/PlanDetailPage";
import { PlanVersionFormPage } from "./pages/Subscription/plans/PlanVersionFormPage";
import { PlanVersionDetailPage } from "./pages/Subscription/plans/PlanVersionDetailPage";
import { CreatePass } from "./pages/Subscription/passes/CreatePass";
import { PassDetailPage } from "./pages/Subscription/passes/PassDetailPage";
import { PassPlanDetailPage } from "./pages/Subscription/pass-plans/PassPlanDetailPage";
import { PromotionFormPage } from "./pages/Subscription/promotions/PromotionFormPage";
import { PromotionDetailPage } from "./pages/Subscription/promotions/PromotionDetailPage";
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
import { ContractCreatePage } from "./pages/contracts/ContractCreatePage";
import { ContractDetailPage } from "./pages/contracts/ContractDetailPage";
import { NotificationsPage } from "./pages/NotificationsPage";
import { BillingDocumentDetailPage } from "./pages/Billing/BillingDocumentDetailPage";
import { AdminUserDetailsPage } from "./pages/Settings/AdminUserDetailsPage";
import { ContractPreviewPage } from "./pages/contracts/ContractPreviewPage";
import { ContractTemplatesDraftingPage } from "./pages/contracts/ContractTemplatesDraftingPage";
import { PublicContractSignaturePage } from "./pages/contracts/PublicContractSignaturePage";
import { BookingCreatePage } from "./components/bookings/BookingCreatePage";
import { BookingDetailPage } from "./components/bookings/BookingDetailPage";
import { PublicQuoteSignaturePage } from "./pages/Billing/PublicQuoteSignaturePage";
import { SubscriptionDetailPage } from "./pages/Subscription/subscriptions/SubscriptionDetailPage";
import { TerminationDetailPage } from "./pages/Subscription/lifecycle/TerminationDetailPage";
import { QuoteCreatePage } from "./pages/Subscription/lifecycle/QuoteCreatePage";
import { QuoteDetailPage } from "./pages/Subscription/lifecycle/QuoteDetailPage";
import { DerivationDetailPage } from "./pages/Subscription/lifecycle/DerivationDetailPage";
import { ServicesMaster } from "./pages/Services/ServicesMaster";
import { DomiciliationContractCreatePage } from "./pages/Services/DomiciliationContractCreatePage";
import { DomiciliationContractDetailPage } from "./pages/Services/DomiciliationContractDetailPage";
import { CompaniesPage } from "./pages/companies/CompaniesPage";
import { CompanyCreatePage } from "./pages/companies/CompanyCreatePage";
import { CompanyDetailPage } from "./pages/companies/CompanyDetailPage";
import { MarketplacePage } from "./pages/marketplace/MarketplacePage";
import { MarketplaceOrderDetailPage } from "./pages/marketplace/MarketplaceOrderDetailPage";
import { SectionHub } from "./pages/SectionHub";

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { KycCaseDetailPage } from "./pages/Document/KycCaseDetailPage";

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
              path="/contracts/sign/:signatureToken"
              element={<PublicContractSignaturePage />}
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
              path="/contracts/templates-drafting"
              element={
                <ProtectedRoute>
                  <ContractTemplatesDraftingPage />
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
              path="/subscriptions/subscriptions/create"
              element={
                <ProtectedRoute>
                  <CreateSubscription />
                </ProtectedRoute>
              }
            />
            <Route
              path="/subscriptions/usage/create"
              element={
                <ProtectedRoute>
                  <CreateUsageRecord />
                </ProtectedRoute>
              }
            />
            <Route
              path="/subscriptions/plans/:planCode"
              element={
                <ProtectedRoute>
                  <PlanDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/subscriptions/plans/:planCode/versions/new"
              element={
                <ProtectedRoute>
                  <PlanVersionFormPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/subscriptions/plans/:planCode/versions/:versionId"
              element={
                <ProtectedRoute>
                  <PlanVersionDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/subscriptions/passes/create"
              element={
                <ProtectedRoute>
                  <CreatePass />
                </ProtectedRoute>
              }
            />
            <Route
              path="/subscriptions/passes/:passNumber"
              element={
                <ProtectedRoute>
                  <PassDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/subscriptions/pass-plans/:planCode"
              element={
                <ProtectedRoute>
                  <PassPlanDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/subscriptions/promotions/create"
              element={
                <ProtectedRoute>
                  <PromotionFormPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/subscriptions/promotions/:code"
              element={
                <ProtectedRoute>
                  <PromotionDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/subscriptions/promotions/:code/edit"
              element={
                <ProtectedRoute>
                  <PromotionFormPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/subscriptions/plans"
              element={
                <ProtectedRoute>
                  <SubscriptionMaster />
                </ProtectedRoute>
              }
            />
            <Route
              path="/subscriptions/entitlements"
              element={
                <ProtectedRoute>
                  <SubscriptionMaster />
                </ProtectedRoute>
              }
            />
            <Route
              path="/subscriptions/subscriptions"
              element={
                <ProtectedRoute>
                  <SubscriptionMaster />
                </ProtectedRoute>
              }
            />
            <Route
              path="/subscriptions/passes"
              element={
                <ProtectedRoute>
                  <SubscriptionMaster />
                </ProtectedRoute>
              }
            />
            <Route
              path="/subscriptions/pass-plans"
              element={
                <ProtectedRoute>
                  <SubscriptionMaster />
                </ProtectedRoute>
              }
            />
            <Route
              path="/subscriptions/usage"
              element={
                <ProtectedRoute>
                  <SubscriptionMaster />
                </ProtectedRoute>
              }
            />
            <Route
              path="/subscriptions/billable"
              element={
                <ProtectedRoute>
                  <SubscriptionMaster />
                </ProtectedRoute>
              }
            />
            <Route
              path="/subscriptions/promotions"
              element={
                <ProtectedRoute>
                  <SubscriptionMaster />
                </ProtectedRoute>
              }
            />
            <Route
              path="/subscriptions/terminations"
              element={
                <ProtectedRoute>
                  <SubscriptionMaster />
                </ProtectedRoute>
              }
            />
            <Route
              path="/subscriptions/quotes"
              element={
                <ProtectedRoute>
                  <SubscriptionMaster />
                </ProtectedRoute>
              }
            />
            <Route
              path="/subscriptions/derivations"
              element={
                <ProtectedRoute>
                  <SubscriptionMaster />
                </ProtectedRoute>
              }
            />
            <Route
              path="/subscriptions/policy"
              element={
                <ProtectedRoute>
                  <SubscriptionMaster />
                </ProtectedRoute>
              }
            />
            <Route
              path="/subscriptions/terminations/:code"
              element={
                <ProtectedRoute>
                  <TerminationDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/subscriptions/quotes/new"
              element={
                <ProtectedRoute>
                  <QuoteCreatePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/subscriptions/quotes/:number"
              element={
                <ProtectedRoute>
                  <QuoteDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/subscriptions/derivations/:code"
              element={
                <ProtectedRoute>
                  <DerivationDetailPage />
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
              path="/documents/kyc/cases/:code"
              element={
                <ProtectedRoute>
                  <KycCaseDetailPage />
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
            <Route
              path="/section/:groupId"
              element={
                <ProtectedRoute>
                  <SectionHub />
                </ProtectedRoute>
              }
            />
            <Route
              path="/marketplace"
              element={
                <ProtectedRoute>
                  <MarketplacePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/marketplace/orders/:orderNumber"
              element={
                <ProtectedRoute>
                  <MarketplaceOrderDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/companies"
              element={
                <ProtectedRoute>
                  <CompaniesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/companies/create"
              element={
                <ProtectedRoute>
                  <CompanyCreatePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/companies/:customerId"
              element={
                <ProtectedRoute>
                  <CompanyDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/services/contracts/new"
              element={
                <ProtectedRoute>
                  <DomiciliationContractCreatePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/services/contracts/:contractNumber"
              element={
                <ProtectedRoute>
                  <DomiciliationContractDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/services/*"
              element={
                <ProtectedRoute>
                  <ServicesMaster />
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
          <ToastContainer
    position="top-right"
    autoClose={3000}
    hideProgressBar={false}
    newestOnTop
    closeOnClick
    rtl={false}
    pauseOnFocusLoss
    draggable
    pauseOnHover
    theme="light"
    limit={3}
    stacked
  />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;