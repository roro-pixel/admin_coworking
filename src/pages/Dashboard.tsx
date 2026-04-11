import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { AdminLayout } from '../components/layout/AdminLayout';
import { Users, Building2, Calendar, CreditCard, ArrowUp, ArrowDown, User, Building } from 'lucide-react';
import { customerService } from '../services/customer.service';
import type { CustomerResponse } from '../services/customer.service';
import { memberService } from '../services/member.service';
// import type { MemberResponse } from '../services/member.service';

export const AdminDashboard: React.FC = () => {
  // Récupérer tous les customers
  const { data: customers, isLoading: customersLoading } = useQuery({
    queryKey: ['dashboard-customers'],
    queryFn: () => customerService.getAllCustomers(false) as Promise<CustomerResponse[]>,
  });

  // Récupérer tous les members
  const { data: members, isLoading: membersLoading } = useQuery({
    queryKey: ['dashboard-members'],
    queryFn: () => memberService.getAllMembers(),
  });

  const isLoading = customersLoading || membersLoading;

  // Calculer les statistiques
  const totalCustomers = customers?.length || 0;
  const totalMembers = members?.length || 0;
  
  // Customers actifs vs inactifs
  const activeCustomers = customers?.filter(c => c.status === 'ACTIVE').length || 0;
  const activeMembers = members?.filter(m => m.status === 'ACTIVE').length || 0;
  
  // Taux de conversion (membres / customers)
  const conversionRate = totalCustomers > 0 ? Math.round((totalMembers / totalCustomers) * 100) : 0;
  
  // Derniers customers (5 derniers)
  const recentCustomers = customers
    ?.slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5) || [];

  // Récupérer les derniers members
  const recentMembers = members
    ?.slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5) || [];

  // Statistiques pour les cartes
  const stats = [
    {
      title: 'Total Customers',
      value: totalCustomers.toString(),
      change: `+${activeCustomers} actifs`,
      trend: 'up',
      icon: Building2,
      color: 'bg-blue-500'
    },
    {
      title: 'Total Members',
      value: totalMembers.toString(),
      change: `+${activeMembers} actifs`,
      trend: 'up',
      icon: Users,
      color: 'bg-green-500'
    },
    {
      title: 'Taux de conversion',
      value: `${conversionRate}%`,
      change: `${totalMembers} membres / ${totalCustomers} customers`,
      trend: conversionRate > 50 ? 'up' : 'down',
      icon: Calendar,
      color: 'bg-orange-500'
    },
    {
      title: 'Nouveaux ce mois',
      value: recentCustomers.length.toString(),
      change: 'Derniers 5',
      trend: 'up',
      icon: CreditCard,
      color: 'bg-purple-500'
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
        {recentCustomers.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            Aucun customer trouvé
          </div>
        )}
      </div>

      {/* Derniers members */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
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
        {recentMembers.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            Aucun member trouvé
          </div>
        )}
      </div>
    </AdminLayout>
  );
};