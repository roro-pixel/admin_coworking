import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AdminLayout } from '../components/layout/AdminLayout';
import { Search, Eye, User, Plus } from 'lucide-react';
import { customerService } from '../services/customer.service';
import type { CustomerResponse } from '../services/customer.service';

export const AdminCustomers: React.FC = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: customers, isLoading, error } = useQuery({
  queryKey: ['customers', search, typeFilter, statusFilter],
  queryFn: async () => {
    const allCustomers = await customerService.getAllCustomers(false) as CustomerResponse[];
    
    let filtered = allCustomers;
    
    if (search) {
      filtered = filtered.filter(c => {
        const displayName = c.type === 'PERSON' 
          ? `${c.firstname} ${c.lastname}` 
          : c.companyName || '';
        return displayName.toLowerCase().includes(search.toLowerCase()) ||
               c.email.toLowerCase().includes(search.toLowerCase());
      });
    }
    
    if (typeFilter !== 'all') {
      filtered = filtered.filter(c => c.type === typeFilter);
    }
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(c => c.status === statusFilter);
    }
    
    return filtered;
  },
});

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600">
          Erreur lors du chargement des customers
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="mb-6 opacity-0 animate-[fadeUp_0.6s_ease-out_forwards]">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
            <p className="text-gray-600 mt-1">Gérez tous vos customers (personnes et compagnies)</p>
          </div>
          <button
            onClick={() => navigate('/customers/create')}
            className="mt-4 md:mt-0 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors flex items-center"
          >
            <Plus size={18} className="mr-2" />
            Créer un customer
          </button>
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-xl p-4 shadow-sm mb-6 opacity-0 animate-[fadeUp_0.6s_ease-out_forwards]" style={{ animationDelay: '0.1s' }}>
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
            <option value="PERSON">Personnes</option>
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
      <div className="bg-white rounded-xl shadow-sm overflow-hidden opacity-0 animate-[fadeUp_0.6s_ease-out_forwards]" style={{ animationDelay: '0.2s' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Customer</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Contact</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Statut</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">ID</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {customers?.map((customer) => (
                <tr key={customer.customerId} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                        <User size={20} className="text-gray-500" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                           {customer.type === 'PERSON' 
                             ? `${customer.firstname} ${customer.lastname}` 
                             : customer.companyName}
                        </p>
                        <p className="text-xs text-gray-500">{customer.customerId}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-900">{customer.email}</p>
                    <p className="text-xs text-gray-500">{customer.phone || '-'}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      customer.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 
                      customer.status === 'INACTIVE' ? 'bg-gray-100 text-gray-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {customer.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{customer.customerId}</td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => navigate(`/customers/${customer.customerId}`)}
                      className="text-primary-600 hover:text-primary-700"
                    >
                      <Eye size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {(!customers || customers.length === 0) && (
          <div className="text-center py-12">
            <User size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">Aucun customer trouvé</p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};