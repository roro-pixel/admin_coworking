// src/pages/Customers.tsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminLayout } from '../components/layout/AdminLayout';
import { Search, Eye, User, Building2 } from 'lucide-react';

const mockCustomers = [
  { 
    id: 1, 
    customerId: 'CUST-001',
    displayName: 'Jean Malala',
    email: 'jean@email.com',
    phone: '+242 06 124 36 75',
    type: 'INDIVIDUAL',
    status: 'ACTIVE',
    createdAt: '2026-01-15'
  },
  { 
    id: 2, 
    customerId: 'CUST-002',
    displayName: 'Tech Solutions SARL',
    email: 'contact@tech.com',
    phone: '+242 05 555 55 55',
    type: 'COMPANY',
    status: 'ACTIVE',
    createdAt: '2026-01-20'
  },
  { 
    id: 3, 
    customerId: 'CUST-003',
    displayName: 'Marie Konde',
    email: 'marie@email.com',
    phone: '+242 06 738 76 54',
    type: 'INDIVIDUAL',
    status: 'INACTIVE',
    createdAt: '2026-02-01'
  },
];

export const AdminCustomers: React.FC = () => {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredCustomers = mockCustomers.filter(customer => {
    if (search && !customer.displayName.toLowerCase().includes(search.toLowerCase()) && !customer.email.toLowerCase().includes(search.toLowerCase())) return false;
    if (typeFilter !== 'all' && customer.type !== typeFilter) return false;
    if (statusFilter !== 'all' && customer.status !== statusFilter) return false;
    return true;
  });

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
        <p className="text-gray-600 mt-1">Gérez tous vos customers (personnes et compagnies)</p>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-xl p-4 shadow-sm mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par nom ou email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg bg-white"
          >
            <option value="all">Tous les types</option>
            <option value="INDIVIDUAL">Personnes</option>
            <option value="COMPANY">Compagnies</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg bg-white"
          >
            <option value="all">Tous les statuts</option>
            <option value="ACTIVE">Actif</option>
            <option value="INACTIVE">Inactif</option>
            <option value="SUSPENDED">Suspendu</option>
          </select>
        </div>
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Customer</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Contact</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Type</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Statut</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Créé le</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredCustomers.map((customer) => (
                <tr key={customer.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        customer.type === 'INDIVIDUAL' ? 'bg-blue-100' : 'bg-purple-100'
                      }`}>
                        {customer.type === 'INDIVIDUAL' ? (
                          <User size={20} className="text-blue-600" />
                        ) : (
                          <Building2 size={20} className="text-purple-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{customer.displayName}</p>
                        <p className="text-xs text-gray-500">{customer.customerId}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-900">{customer.email}</p>
                    <p className="text-xs text-gray-500">{customer.phone}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      customer.type === 'INDIVIDUAL' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                    }`}>
                      {customer.type === 'INDIVIDUAL' ? 'Personne' : 'Compagnie'}
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
                  <td className="px-6 py-4 text-sm text-gray-500">{customer.createdAt}</td>
                  <td className="px-6 py-4 text-right">
                    <Link to={`/customers/${customer.id}`} className="text-primary-600 hover:text-primary-700">
                      <Eye size={18} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
};