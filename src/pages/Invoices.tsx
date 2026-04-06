import React, { useState } from 'react';
import { AdminLayout } from '../components/layout/AdminLayout';
import { FileText, Download, Search, Calendar, Eye, TrendingUp, TrendingDown } from 'lucide-react';

interface Invoice {
  id: string;
  number: string;
  memberName: string;
  memberEmail: string;
  date: string;
  dueDate: string;
  amount: number;
  status: 'paid' | 'pending' | 'overdue';
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
}

const mockInvoices: Invoice[] = [
  {
    id: '1',
    number: 'FACT-2026-001',
    memberName: 'Jean Malala',
    memberEmail: 'jean@email.com',
    date: '15 Fév 2026',
    dueDate: '15 Mar 2026',
    amount: 199000,
    status: 'paid',
    items: [
      { description: 'Abonnement Premium - Février 2026', quantity: 1, unitPrice: 199000, total: 199000 }
    ]
  },
  {
    id: '2',
    number: 'FACT-2026-002',
    memberName: 'Marie Konde',
    memberEmail: 'marie@email.com',
    date: '15 Fév 2026',
    dueDate: '15 Mar 2026',
    amount: 199000,
    status: 'pending',
    items: [
      { description: 'Abonnement Premium - Février 2026', quantity: 1, unitPrice: 199000, total: 199000 }
    ]
  },
  {
    id: '3',
    number: 'FACT-2026-003',
    memberName: 'Paul Ndinga',
    memberEmail: 'paul@email.com',
    date: '15 Jan 2026',
    dueDate: '15 Fév 2026',
    amount: 199000,
    status: 'overdue',
    items: [
      { description: 'Abonnement Premium - Janvier 2026', quantity: 1, unitPrice: 199000, total: 199000 }
    ]
  }
];

const statusConfig = {
  paid: { label: 'Payée', color: 'text-green-600 bg-green-50' },
  pending: { label: 'En attente', color: 'text-yellow-600 bg-yellow-50' },
  overdue: { label: 'En retard', color: 'text-red-600 bg-red-50' }
};

export const AdminInvoices: React.FC = () => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState('2026');

  const filteredInvoices = mockInvoices.filter(inv => {
    if (search && !inv.number.toLowerCase().includes(search.toLowerCase()) && !inv.memberName.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== 'all' && inv.status !== statusFilter) return false;
    if (yearFilter && !inv.date.includes(yearFilter)) return false;
    return true;
  });

  const totalRevenue = filteredInvoices
    .filter(inv => inv.status === 'paid')
    .reduce((sum, inv) => sum + inv.amount, 0);
  
  const pendingAmount = filteredInvoices
    .filter(inv => inv.status === 'pending')
    .reduce((sum, inv) => sum + inv.amount, 0);
  
  const overdueAmount = filteredInvoices
    .filter(inv => inv.status === 'overdue')
    .reduce((sum, inv) => sum + inv.amount, 0);

  return (
    <AdminLayout>
      <div className="mb-6 opacity-0 animate-[fadeUp_0.6s_ease-out_forwards]">
        <h1 className="text-2xl font-bold text-gray-900">Factures</h1>
        <p className="text-gray-600 mt-1">Gérez toutes les factures des membres</p>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 opacity-0 animate-[fadeUp_0.6s_ease-out_forwards]" style={{ animationDelay: '0.1s' }}>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-sm text-gray-500">Total facturé</p>
          <p className="text-2xl font-bold text-gray-900">{totalRevenue.toLocaleString()} FCFA</p>
          <div className="flex items-center text-xs text-green-600 mt-1">
            <TrendingUp size={12} className="mr-1" />
            +15% vs mois dernier
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-sm text-gray-500">En attente</p>
          <p className="text-2xl font-bold text-yellow-600">{pendingAmount.toLocaleString()} FCFA</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-sm text-gray-500">En retard</p>
          <p className="text-2xl font-bold text-red-600">{overdueAmount.toLocaleString()} FCFA</p>
          <div className="flex items-center text-xs text-red-600 mt-1">
            <TrendingDown size={12} className="mr-1" />
            À relancer
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-sm text-gray-500">Taux de recouvrement</p>
          <p className="text-2xl font-bold text-primary-600">
            {Math.round((totalRevenue / (totalRevenue + pendingAmount + overdueAmount)) * 100)}%
          </p>
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-xl p-4 shadow-sm mb-6 opacity-0 animate-[fadeUp_0.6s_ease-out_forwards]" style={{ animationDelay: '0.2s' }}>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par numéro ou membre..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg bg-white"
          >
            <option value="all">Tous les statuts</option>
            <option value="paid">Payées</option>
            <option value="pending">En attente</option>
            <option value="overdue">En retard</option>
          </select>
          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg bg-white"
          >
            <option value="2026">2026</option>
            <option value="2025">2025</option>
            <option value="2024">2024</option>
          </select>
        </div>
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden opacity-0 animate-[fadeUp_0.6s_ease-out_forwards]" style={{ animationDelay: '0.3s' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">N° Facture</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Membre</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Date</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Échéance</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Montant</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Statut</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredInvoices.map((invoice, index) => (
                <tr key={invoice.id} className="hover:bg-gray-50 transition-colors" style={{ animationDelay: `${0.4 + index * 0.05}s` }}>
                  <td className="px-6 py-4">
                    <p className="font-medium text-gray-900">{invoice.number}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-900">{invoice.memberName}</p>
                    <p className="text-xs text-gray-500">{invoice.memberEmail}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar size={14} className="mr-1 text-gray-400" />
                      {invoice.date}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{invoice.dueDate}</td>
                  <td className="px-6 py-4">
                    <p className="font-semibold text-gray-900">{invoice.amount.toLocaleString()} FCFA</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-xs px-2 py-1 rounded-full ${statusConfig[invoice.status].color}`}>
                      {statusConfig[invoice.status].label}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-primary-600 hover:text-primary-700 mr-3">
                      <Eye size={18} />
                    </button>
                    <button className="text-primary-600 hover:text-primary-700">
                      <Download size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredInvoices.length === 0 && (
          <div className="text-center py-12">
            <FileText size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">Aucune facture trouvée</p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};