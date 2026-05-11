import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
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
import { SettingsMaster } from './pages/Settings/SettingsMaster';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<AdminLogin />} />
            <Route path="/" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
            <Route path="/customers" element={<ProtectedRoute><AdminCustomers /></ProtectedRoute>} />
            <Route path="/members" element={<ProtectedRoute><AdminMembers /></ProtectedRoute>} />
            <Route path="/resources/*" element={<ProtectedRoute><ResourceMaster /></ProtectedRoute>} />
            <Route path="/bookings/*" element={<ProtectedRoute><BookingMaster /></ProtectedRoute>} />
            <Route path="/customers/:id" element={<ProtectedRoute><CustomerDetail /></ProtectedRoute>} />
            <Route path="/members/:id" element={<ProtectedRoute><MemberDetail /></ProtectedRoute>} />
            <Route path="/customers/create" element={<ProtectedRoute><CreateCustomer /></ProtectedRoute>} />
            <Route path="/members/create" element={<ProtectedRoute><CreateMember /></ProtectedRoute>} />
            <Route path="/document/*" element={<ProtectedRoute><DocumentMaster /></ProtectedRoute>} />
            <Route path="/contracts" element={<ProtectedRoute><AdminContracts /></ProtectedRoute>} />
            <Route path="/inventory/*" element={<ProtectedRoute><InventoryMaster /></ProtectedRoute>} />
            <Route path="/subscriptions/*" element={<ProtectedRoute><SubscriptionMaster /></ProtectedRoute>} />
            <Route path="/payments/*" element={<ProtectedRoute><PaymentMaster /></ProtectedRoute>} />
            <Route path="/wallets/*" element={<ProtectedRoute><WalletMaster /></ProtectedRoute>} />
            <Route path="/billing/*" element={<ProtectedRoute><BillingMaster /></ProtectedRoute>} />
            <Route path="/reports/*" element={<ProtectedRoute><ReportingMaster /></ProtectedRoute>} />
            <Route path="/operations" element={<ProtectedRoute><OperationsMaster /></ProtectedRoute>} />
            <Route path="/settings/*" element={<ProtectedRoute><SettingsMaster /></ProtectedRoute>} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;