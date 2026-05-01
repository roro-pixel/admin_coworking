import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { AdminLayout } from '../components/layout/AdminLayout';
import { 
  Users, 
  Building2, 
  Calendar, 
  CreditCard, 
  ArrowUp, 
  ArrowDown, 
  User, 
  Building,
  Package,
  AlertCircle,
  Wallet,
  FileText,
} from 'lucide-react';
import { customerService } from '../services/customer.service';
import type { CustomerResponse } from '../services/customer.service';
import { memberService } from '../services/member.service';
import { subscriptionService } from '../services/subscription.service';
import { bookingService } from '../services/booking.service';
import { inventoryService } from '../services/inventory.service';
// import { paymentService } from '../services/payment.service';
import { walletService } from '../services/wallet.service';
import { billingService } from '../services/billing.service';

export const AdminDashboard: React.FC = () => {
  // Customers & Members
  const { data: customers, isLoading: customersLoading } = useQuery({
    queryKey: ['dashboard-customers'],
    queryFn: () => customerService.getAllCustomers(false) as Promise<CustomerResponse[]>,
  });

  const { data: members, isLoading: membersLoading } = useQuery({
    queryKey: ['dashboard-members'],
    queryFn: () => memberService.getAllMembers(),
  });

  // Subscriptions
  const { data: subscriptionsData } = useQuery({
    queryKey: ['dashboard-subscriptions'],
    queryFn: () => subscriptionService.getSubscriptions({ size: 100 }),
  });

  // Bookings
  const { data: bookingsData } = useQuery({
    queryKey: ['dashboard-bookings'],
    queryFn: () => bookingService.getBookings({ size: 100 }),
  });

  // Inventory
  const { data: inventoryMetrics } = useQuery({
    queryKey: ['dashboard-inventory'],
    queryFn: () => inventoryService.getDashboardMetrics(),
  });

  // Payments
  // const { data: paymentsData } = useQuery({
  //   queryKey: ['dashboard-payments'],
  //   queryFn: () => paymentService.getPaymentIntents({ size: 100 }),
  // });

  // Wallets
  const { data: walletsData } = useQuery({
    queryKey: ['dashboard-wallets'],
    queryFn: () => walletService.getWallets({ size: 100 }),
  });

  // Billing
  const { data: billingData } = useQuery({
    queryKey: ['dashboard-billing'],
    queryFn: () => billingService.getDocuments({ size: 100 }),
  });

  const isLoading = customersLoading || membersLoading;

  const recentCustomers = customers
  ?.slice()
  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  .slice(0, 5) || [];

// Derniers members (5 derniers)
const recentMembers = members
  ?.slice()
  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  .slice(0, 5) || [];

  // Calculs
  const totalCustomers = customers?.length || 0;
  const totalMembers = members?.length || 0;
  const activeCustomers = customers?.filter(c => c.status === 'ACTIVE').length || 0;
  const activeMembers = members?.filter(m => m.status === 'ACTIVE').length || 0;
  
  const activeSubscriptions = subscriptionsData?.content?.filter(s => s.status === 'ACTIVE').length || 0;
  const pendingSubscriptions = subscriptionsData?.content?.filter(s => s.status === 'PENDING_ACTIVATION').length || 0;
  
  const confirmedBookings = bookingsData?.data?.filter(b => b.status === 'CONFIRMED').length || 0;
  const pendingBookings = bookingsData?.data?.filter(b => b.status === 'PENDING_APPROVAL').length || 0;
  
  const openAlerts = inventoryMetrics?.openAlerts || 0;
  const lowStockAlerts = inventoryMetrics?.lowStockAlerts || 0;
  const totalStockValue = inventoryMetrics?.totalStockValue || 0;
  
  // const pendingPayments = paymentsData?.content?.filter(p => p.status === 'PENDING').length || 0;
  const totalWallets = walletsData?.content?.length || 0;
  const totalWalletBalance = walletsData?.content?.reduce((sum, w: any) => sum + w.availableBalance, 0) || 0;
  
  const unpaidInvoices = billingData?.content?.filter(d => 
    d.documentType === 'INVOICE' && (d.status === 'ISSUED' || d.status === 'PARTIALLY_PAID')
  ).length || 0;
  const totalOutstanding = billingData?.content?.filter(d => d.documentType === 'INVOICE')
    .reduce((sum, d) => sum + (d.balanceDue || 0), 0) || 0;

  const stats = [
    {
      title: 'Customers',
      value: totalCustomers.toString(),
      change: `${activeCustomers} actifs`,
      trend: 'up',
      icon: Building2,
      color: 'bg-blue-500'
    },
    {
      title: 'Members',
      value: totalMembers.toString(),
      change: `${activeMembers} actifs`,
      trend: 'up',
      icon: Users,
      color: 'bg-green-500'
    },
    {
      title: 'Abonnements actifs',
      value: activeSubscriptions.toString(),
      change: `${pendingSubscriptions} en attente`,
      trend: 'up',
      icon: CreditCard,
      color: 'bg-purple-500'
    },
    {
      title: 'Réservations',
      value: confirmedBookings.toString(),
      change: `${pendingBookings} en attente`,
      trend: confirmedBookings > pendingBookings ? 'up' : 'down',
      icon: Calendar,
      color: 'bg-orange-500'
    },
    {
      title: 'Valeur du stock',
      value: `${(totalStockValue / 1000000).toFixed(1)}M FCFA`,
      change: `${lowStockAlerts} alertes stock`,
      trend: lowStockAlerts > 0 ? 'down' : 'up',
      icon: Package,
      color: 'bg-teal-500'
    },
    {
      title: 'Alertes',
      value: openAlerts.toString(),
      change: `${lowStockAlerts} stock bas`,
      trend: openAlerts > 0 ? 'down' : 'up',
      icon: AlertCircle,
      color: 'bg-red-500'
    },
    {
      title: 'Portefeuilles',
      value: totalWallets.toString(),
      change: `${(totalWalletBalance / 1000000).toFixed(1)}M FCFA`,
      trend: 'up',
      icon: Wallet,
      color: 'bg-indigo-500'
    },
    {
      title: 'Factures impayées',
      value: unpaidInvoices.toString(),
      change: `${(totalOutstanding / 1000000).toFixed(1)}M FCFA`,
      trend: unpaidInvoices > 0 ? 'down' : 'up',
      icon: FileText,
      color: 'bg-rose-500'
    }
  ];

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Tableau de bord</h1>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className={`${stat.color} p-3 rounded-lg text-white`}>
                  <Icon size={24} />
                </div>
                <div className={`flex items-center text-sm ${stat.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                  {stat.trend === 'up' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                  <span className="ml-1">{stat.change}</span>
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</p>
              <p className="text-sm text-gray-600">{stat.title}</p>
            </div>
          );
        })}
      </div>

      {/* Derniers customers */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">Derniers customers</h2>
          <span className="text-sm text-gray-500">Total: {totalCustomers}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Créé le</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {recentCustomers.map((customer) => (
                <tr key={customer.customerId} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                        {customer.type === 'PERSON' ? (
                          <User size={14} className="text-gray-500" />
                        ) : (
                          <Building size={14} className="text-gray-500" />
                        )}
                      </div>
                      <span className="text-sm font-medium text-gray-900">
                        {customer.type === 'PERSON' 
                          ? `${customer.firstname} ${customer.lastname}` 
                          : customer.companyName}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{customer.email}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      customer.type === 'PERSON' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                    }`}>
                      {customer.type === 'PERSON' ? 'Personne' : 'Compagnie'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      customer.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 
                      customer.status === 'INACTIVE' ? 'bg-gray-100 text-gray-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {customer.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(customer.createdAt).toLocaleDateString('fr-FR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Derniers members */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">Derniers members</h2>
          <span className="text-sm text-gray-500">Total: {totalMembers}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Membre</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Accès portail</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Créé le</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {recentMembers.map((member) => (
                <tr key={member.memberId} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                        <User size={14} className="text-primary-600" />
                      </div>
                      <span className="text-sm font-medium text-gray-900">{member.fullname}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{member.email}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{member.customerId}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      member.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                      member.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                      member.status === 'INACTIVE' ? 'bg-gray-100 text-gray-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {member.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      member.portalAccess ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {member.portalAccess ? 'Activé' : 'Désactivé'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(member.createdAt).toLocaleDateString('fr-FR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dernières factures */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">Dernières factures</h2>
          <span className="text-sm text-gray-500">{unpaidInvoices} impayées</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">N° Facture</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Montant</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Échéance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {billingData?.content?.slice(0, 5).map((doc) => (
                <tr key={doc.documentNumber} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-mono">{doc.documentNumber}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{doc.customerName || doc.customerCode || '-'}</td>
                  <td className="px-6 py-4 text-right font-semibold">{doc.totalAmount.toLocaleString()} FCFA</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      doc.status === 'PAID' ? 'bg-green-100 text-green-700' :
                      doc.status === 'PARTIALLY_PAID' ? 'bg-yellow-100 text-yellow-700' :
                      doc.status === 'OVERDUE' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {doc.status === 'PAID' ? 'Payée' :
                       doc.status === 'PARTIALLY_PAID' ? 'Partiellement payée' :
                       doc.status === 'OVERDUE' ? 'En retard' : 'Émise'}
                    </span>
                   </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {doc.dueDate ? new Date(doc.dueDate).toLocaleDateString('fr-FR') : '-'}
                   </td>
                 </tr>
              ))}
              {(!billingData?.content || billingData.content.length === 0) && (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-gray-500">
                    Aucune facture trouvée
                  </td>
                </tr>
              )}
            </tbody>
           </table>
        </div>
      </div>
    </AdminLayout>
  );
};