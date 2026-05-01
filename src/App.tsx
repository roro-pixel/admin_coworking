import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { AdminLogin } from './pages/Login';
import { AdminDashboard } from './pages/Dashboard';
import { AdminCustomers } from './pages/Customers';
import { AdminMembers } from './pages/Members';
import { ResourceMaster } from './pages/Resource/ResourceMaster';
import { BookingMaster } from './pages/Booking/BookingMaster';
import { CustomerDetail } from './pages/CustomerDetail';
import { MemberDetail } from './pages/MemberDetail';
import { CreateCustomer } from './pages/CreateCustomer';
import { CreateMember } from './pages/CreateMember';
import { DocumentMaster } from './pages/Document/DocumentMaster';
import { AdminContracts } from './pages/Contracts';
import { InventoryMaster } from './pages/Inventory/InventoryMaster';
import { SubscriptionMaster } from './pages/Subscription/SubscriptionMaster';
import { PaymentMaster } from './pages/Payment/PaymentMaster';
import { WalletMaster } from './pages/Wallet/WalletMaster';
import { BillingMaster } from './pages/Billing/BillingMaster';
import { ReportingMaster } from './pages/Reporting/ReportingMaster';
import { OperationsMaster } from './pages/Support/Operationsmaster';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<AdminLogin />} />
            <Route path="/" element={<AdminDashboard />} />
            <Route path="/customers" element={<AdminCustomers />} />
            <Route path="/members" element={<AdminMembers />} />
            <Route path="/resources/*" element={<ResourceMaster />} />
            <Route path="/bookings/*" element={<BookingMaster />} />
            <Route path="/customers/:id" element={<CustomerDetail />} />
            <Route path="/members/:id" element={<MemberDetail />} />
            <Route path="/customers/create" element={<CreateCustomer />} />
            <Route path="/members/create" element={<CreateMember />} />
            <Route path="/document/*" element={<DocumentMaster />} />
            <Route path="/contracts" element={<AdminContracts />} />
            <Route path="/inventory/*" element={<InventoryMaster />} />
            <Route path="/subscriptions/*" element={<SubscriptionMaster />} />
            <Route path="/payments/*" element={<PaymentMaster />} />
            <Route path="/wallets/*" element={<WalletMaster />} />
            <Route path="/billing/*" element={<BillingMaster />} />
            <Route path="/reports/*" element={<ReportingMaster />} />
            <Route path="/operations" element={<OperationsMaster />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;