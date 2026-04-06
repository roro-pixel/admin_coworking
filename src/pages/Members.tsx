import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminLayout } from '../components/layout/AdminLayout';
import { Search, Eye, User, MoreVertical, CheckCircle, XCircle, Lock, Unlock } from 'lucide-react';

const mockMembers = [
  { 
    id: 1,
    memberId: 'MEM-001',
    fullName: 'Jean Malala',
    email: 'jean@email.com',
    phone: '+242 06 124 36 75',
    status: 'ACTIVE',
    portalAccess: true,
    customerId: 'CUST-001',
    createdAt: '2026-01-15'
  },
  { 
    id: 2,
    memberId: 'MEM-002',
    fullName: 'Marie Konde',
    email: 'marie@email.com',
    phone: '+242 06 738 76 54',
    status: 'ACTIVE',
    portalAccess: true,
    customerId: 'CUST-003',
    createdAt: '2026-02-01'
  },
  { 
    id: 3,
    memberId: 'MEM-003',
    fullName: 'Paul Ndinga',
    email: 'paul@email.com',
    phone: '+242 04 041 25 88',
    status: 'INACTIVE',
    portalAccess: false,
    customerId: 'CUST-004',
    createdAt: '2026-01-28'
  },
  { 
    id: 4,
    memberId: 'MEM-004',
    fullName: 'Sophie Mbemba',
    email: 'sophie@email.com',
    phone: '+242 06 100 67 11',
    status: 'SUSPENDED',
    portalAccess: true,
    customerId: 'CUST-005',
    createdAt: '2026-02-10'
  },
];

export const AdminMembers: React.FC = () => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [portalFilter, setPortalFilter] = useState('all');

  const filteredMembers = mockMembers.filter(member => {
    if (search && !member.fullName.toLowerCase().includes(search.toLowerCase()) && !member.email.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== 'all' && member.status !== statusFilter) return false;
    if (portalFilter !== 'all' && (portalFilter === 'active' ? member.portalAccess : !member.portalAccess)) return false;
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'ACTIVE':
        return <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-700 flex items-center w-fit"><CheckCircle size={12} className="mr-1" /> Actif</span>;
      case 'INACTIVE':
        return <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700 flex items-center w-fit">Inactif</span>;
      case 'SUSPENDED':
        return <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-700 flex items-center w-fit"><XCircle size={12} className="mr-1" /> Suspendu</span>;
      default:
        return <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700">{status}</span>;
    }
  };

  return (
    <AdminLayout>
      <div className="mb-6 opacity-0 animate-[fadeUp_0.6s_ease-out_forwards]">
        <h1 className="text-2xl font-bold text-gray-900">Membres</h1>
        <p className="text-gray-600 mt-1">Gérez tous les membres ayant accès au portail client</p>
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
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">Tous les statuts</option>
            <option value="ACTIVE">Actif</option>
            <option value="INACTIVE">Inactif</option>
            <option value="SUSPENDED">Suspendu</option>
          </select>
          <select
            value={portalFilter}
            onChange={(e) => setPortalFilter(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">Accès portail</option>
            <option value="active">Avec accès</option>
            <option value="inactive">Sans accès</option>
          </select>
        </div>
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden opacity-0 animate-[fadeUp_0.6s_ease-out_forwards]" style={{ animationDelay: '0.2s' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Membre</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Contact</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Statut</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Accès portail</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Customer ID</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredMembers.map((member, index) => (
                <tr key={member.id} className="hover:bg-gray-50 transition-colors" style={{ animationDelay: `${0.3 + index * 0.05}s` }}>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                        <User size={20} className="text-primary-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{member.fullName}</p>
                        <p className="text-xs text-gray-500">{member.memberId}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-900">{member.email}</p>
                    <p className="text-xs text-gray-500">{member.phone}</p>
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(member.status)}
                  </td>
                  <td className="px-6 py-4">
                    {member.portalAccess ? (
                      <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-700 flex items-center w-fit">
                        <Unlock size={12} className="mr-1" /> Actif
                      </span>
                    ) : (
                      <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-500 flex items-center w-fit">
                        <Lock size={12} className="mr-1" /> Désactivé
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    <Link to={`/customers/${member.customerId}`} className="text-primary-600 hover:underline">
                      {member.customerId}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link to={`/members/${member.id}`} className="text-primary-600 hover:text-primary-700 mr-3">
                      <Eye size={18} />
                    </Link>
                    <button className="text-gray-400 hover:text-gray-600">
                      <MoreVertical size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredMembers.length === 0 && (
          <div className="text-center py-12">
            <User size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">Aucun membre trouvé</p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};