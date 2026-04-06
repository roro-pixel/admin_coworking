import React from 'react';
import { AdminLayout } from '../components/layout/AdminLayout';
import { Users, Building2, Calendar, CreditCard, ArrowUp, ArrowDown } from 'lucide-react';

const stats = [
  {
    title: 'Total Customers',
    value: '156',
    change: '+12%',
    trend: 'up',
    icon: Building2,
    color: 'bg-blue-500'
  },
  {
    title: 'Total Members',
    value: '234',
    change: '+8%',
    trend: 'up',
    icon: Users,
    color: 'bg-green-500'
  },
  {
    title: 'Réservations ce mois',
    value: '45',
    change: '-3%',
    trend: 'down',
    icon: Calendar,
    color: 'bg-orange-500'
  },
  {
    title: 'Chiffre d\'affaires',
    value: '2.5M FCFA',
    change: '+15%',
    trend: 'up',
    icon: CreditCard,
    color: 'bg-purple-500'
  }
];

const recentCustomers = [
  { id: 1, name: 'Jean Malala', email: 'jean@email.com', type: 'INDIVIDUAL', status: 'ACTIVE', date: '24/02/2026' },
  { id: 2, name: 'Tech Solutions SARL', email: 'contact@tech.com', type: 'COMPANY', status: 'ACTIVE', date: '23/02/2026' },
  { id: 3, name: 'Marie Konde', email: 'marie@email.com', type: 'INDIVIDUAL', status: 'INACTIVE', date: '22/02/2026' },
];

export const AdminDashboard: React.FC = () => {
  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Tableau de bord</h1>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white rounded-xl p-6 shadow-sm">
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
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Derniers customers</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nom</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {recentCustomers.map((customer) => (
                <tr key={customer.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{customer.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{customer.email}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      customer.type === 'INDIVIDUAL' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                    }`}>
                      {customer.type === 'INDIVIDUAL' ? 'Personne' : 'Compagnie'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      customer.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {customer.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{customer.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
};