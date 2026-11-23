import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
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
import { TemplatesPage } from "./pages/templates/TemplatesPage";
import { TemplateDetailPage } from "./pages/templates/TemplateDetailPage";
import { MarketplaceOrderDetailPage } from "./pages/marketplace/MarketplaceOrderDetailPage";
import { SectionHub } from "./pages/SectionHub";
import { AccountsPage } from "./pages/accounting/AccountsPage";
import { EntriesPage } from "./pages/accounting/EntriesPage";
import { EntryFormPage } from "./pages/accounting/EntryFormPage";
import { EntryDetailPage } from "./pages/accounting/EntryDetailPage";
import { TreasuryPage } from "./pages/accounting/treasury/TreasuryPage";
import { BankAccountPage } from "./pages/accounting/treasury/BankAccountPage";
import { PurchasesPage } from "./pages/accounting/purchases/PurchasesPage";
import { InvoiceDetailPage } from "./pages/accounting/purchases/InvoiceDetailPage";
import { OrderDetailPage } from "./pages/accounting/purchases/OrderDetailPage";
import { SupplierStatementPage } from "./pages/accounting/purchases/SupplierStatementPage";
import { SalesControlPage } from "./pages/accounting/purchases/SalesControlPage";
import { VatPage } from "./pages/accounting/vat/VatPage";
import { VatReturnPage } from "./pages/accounting/vat/VatReturnPage";
import { FixedAssetsPage } from "./pages/accounting/fixedassets/FixedAssetsPage";
import { FixedAssetDetailPage } from "./pages/accounting/fixedassets/FixedAssetDetailPage";
import { InventoryDetailPage } from "./pages/accounting/fixedassets/InventoryDetailPage";
import { AnalyticPage } from "./pages/accounting/analytic/AnalyticPage";
import { BudgetPage } from "./pages/accounting/budget/BudgetPage";
import { BudgetDetailPage } from "./pages/accounting/budget/BudgetDetailPage";
import { PeriodPage } from "./pages/accounting/period/PeriodPage";
import { ClosingPage } from "./pages/accounting/closing/ClosingPage";
import { ExchangePage } from "./pages/accounting/exchange/ExchangePage";
import { FundPage } from "./pages/accounting/fund/FundPage";
import { RequestFormPage } from "./pages/accounting/fund/RequestFormPage";
import { RequestDetailPage } from "./pages/accounting/fund/RequestDetailPage";
import { NeedFormPage } from "./pages/accounting/fund/NeedFormPage";
import { VoucherVerifyPage } from "./pages/accounting/fund/VoucherVerifyPage";
import { ApprovalsPage } from "./pages/accounting/approval/ApprovalsPage";
import { AuditPage } from "./pages/audit/AuditPage";
import { ApprovalDetailPage } from "./pages/accounting/approval/ApprovalDetailPage";

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
            <Route path="/verify/voucher/:number" element={<VoucherVerifyPage />} />
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
              path="/accounting"
              element={
                <ProtectedRoute>
                  <Navigate to="/accounting/entries" replace />
                </ProtectedRoute>
              }
            />
            <Route
              path="/accounting/entries"
              element={
                <ProtectedRoute>
                  <EntriesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/accounting/entries/new"
              element={
                <ProtectedRoute>
                  <EntryFormPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/accounting/entries/:reference"
              element={
                <ProtectedRoute>
                  <EntryDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/accounting/entries/:reference/edit"
              element={
                <ProtectedRoute>
                  <EntryFormPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/accounting/accounts"
              element={
                <ProtectedRoute>
                  <AccountsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/accounting/treasury"
              element={
                <ProtectedRoute>
                  <TreasuryPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/accounting/treasury/:code"
              element={
                <ProtectedRoute>
                  <BankAccountPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/accounting/purchases"
              element={
                <ProtectedRoute>
                  <PurchasesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/accounting/purchases/invoices/:number"
              element={
                <ProtectedRoute>
                  <InvoiceDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/accounting/purchases/orders/:number"
              element={
                <ProtectedRoute>
                  <OrderDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/accounting/purchases/suppliers/:code"
              element={
                <ProtectedRoute>
                  <SupplierStatementPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/accounting/sales-control"
              element={
                <ProtectedRoute>
                  <SalesControlPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/accounting/vat"
              element={
                <ProtectedRoute>
                  <VatPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/accounting/vat/:id"
              element={
                <ProtectedRoute>
                  <VatReturnPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/accounting/fixed-assets"
              element={
                <ProtectedRoute>
                  <FixedAssetsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/accounting/fixed-assets/inventories/:code"
              element={
                <ProtectedRoute>
                  <InventoryDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/accounting/fixed-assets/:code"
              element={
                <ProtectedRoute>
                  <FixedAssetDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/accounting/analytic"
              element={
                <ProtectedRoute>
                  <AnalyticPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/accounting/budget"
              element={
                <ProtectedRoute>
                  <BudgetPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/accounting/budget/:id"
              element={
                <ProtectedRoute>
                  <BudgetDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/accounting/period"
              element={
                <ProtectedRoute>
                  <PeriodPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/accounting/closing"
              element={
                <ProtectedRoute>
                  <ClosingPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/accounting/exchange"
              element={
                <ProtectedRoute>
                  <ExchangePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/accounting/fund"
              element={
                <ProtectedRoute>
                  <FundPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/accounting/fund/new"
              element={
                <ProtectedRoute>
                  <RequestFormPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/accounting/fund/needs/new"
              element={
                <ProtectedRoute>
                  <NeedFormPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/accounting/fund/needs/:number/edit"
              element={
                <ProtectedRoute>
                  <NeedFormPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/accounting/fund/:number/edit"
              element={
                <ProtectedRoute>
                  <RequestFormPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/accounting/fund/:number"
              element={
                <ProtectedRoute>
                  <RequestDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/accounting/approvals"
              element={
                <ProtectedRoute>
                  <ApprovalsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/accounting/approvals/:number"
              element={
                <ProtectedRoute>
                  <ApprovalDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/templates"
              element={
                <ProtectedRoute>
                  <TemplatesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/templates/:code"
              element={
                <ProtectedRoute>
                  <TemplateDetailPage />
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
            <Route
              path="/audit"
              element={
                <ProtectedRoute>
                  <AuditPage />
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