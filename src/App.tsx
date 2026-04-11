import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { AdminLogin } from './pages/Login';
import { AdminDashboard } from './pages/Dashboard';
import { AdminCustomers } from './pages/Customers';
import { AdminMembers } from './pages/Members';
import { AdminSpaces } from './pages/Spaces';
import { AdminBookings } from './pages/Bookings';
import { AdminInvoices } from './pages/Invoices';
import { AdminReports } from './pages/Reports';
import { CustomerDetail } from './pages/CustomerDetail';
import { MemberDetail } from './pages/MemberDetail';
import { CreateCustomer } from './pages/CreateCustomer';
import { CreateMember } from './pages/CreateMember';
import { AdminKycReviewQueue } from './pages/KycReviewQueue';
import { AdminContracts } from './pages/Contracts';


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
            <Route path="/spaces" element={<AdminSpaces />} />
            <Route path="/bookings" element={<AdminBookings />} />
            <Route path="/invoices" element={<AdminInvoices />} />
            <Route path="/reports" element={<AdminReports />} />
            <Route path="/customers/:id" element={<CustomerDetail />} />
            <Route path="/members/:id" element={<MemberDetail />} />
            <Route path="/customers/create" element={<CreateCustomer />} />
            <Route path="/members/create" element={<CreateMember />} />
            <Route path="/kyc-review" element={<AdminKycReviewQueue />} />
            <Route path="/contracts" element={<AdminContracts />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;