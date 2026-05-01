import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '../components/layout/AdminLayout';
import { Search, Eye, User, Plus, Trash2 } from 'lucide-react';
import { customerService } from '../services/customer.service';
import type { CustomerSummaryResponse } from '../services/customer.service';
import { useDebounce } from '../hooks/useDebounce';

export const AdminCustomers: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // États pour la recherche
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  
  // États pour les filtres
  const [typeFilter, setTypeFilter] = useState<'PERSON' | 'COMPANY' | ''>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  
  // Pagination - seulement utilisée pour la vue liste (pas pour la recherche)
  const [page, setPage] = useState(0);
  const pageSize = 20;

  // Cas 1: Recherche active (query non vide)
  // Utilise GET /customers/search/basic?query=...&type=...
  const { 
    data: searchResults, 
    isLoading: isSearchLoading,
    error: searchError 
  } = useQuery({
    queryKey: ['customers', 'search-basic', debouncedSearch, typeFilter],
    queryFn: () => customerService.searchCustomers(debouncedSearch, typeFilter || undefined),
    enabled: debouncedSearch.length >= 2, // Ne chercher qu'à partir de 2 caractères
  });

  // Cas 2: Pas de recherche active - afficher la liste paginée
  // Utilise GET /customers?summary=true&page=...
  const { 
    data: paginatedResult, 
    isLoading: isListLoading,
    error: listError 
  } = useQuery({
    queryKey: ['customers', 'paginated', page, statusFilter],
    queryFn: () => customerService.getCustomersPaginated({
      page,
      size: pageSize,
      sort: 'createdAt,desc',
    }),
    enabled: debouncedSearch.length < 2, // Désactivé quand on recherche
  });

  // Application du filtre status sur les résultats de recherche
  // Note: Le filtre status n'est pas supporté par /search/basic, on filtre côté client
  const filteredSearchResults = searchResults?.filter(customer => {
    if (statusFilter && customer.status !== statusFilter) return false;
    return true;
  }) || [];

  // Déterminer les données à afficher
  const isSearchMode = debouncedSearch.length >= 2;
  const customers = isSearchMode ? filteredSearchResults : (paginatedResult?.data || []);
  const pagination = isSearchMode ? null : paginatedResult?.pageable;
  const isLoading = isSearchMode ? isSearchLoading : isListLoading;
  const error = isSearchMode ? searchError : listError;

  const deleteMutation = useMutation({
    mutationFn: (customerId: string) => customerService.deleteCustomer(customerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });

  const handleDelete = (e: React.MouseEvent, customerId: string) => {
    e.stopPropagation(); // Empêche le clic sur la ligne
    if (confirm('Êtes-vous sûr de vouloir supprimer ce customer ?')) {
      deleteMutation.mutate(customerId);
    }
  };

  const handleRowClick = (customerId: string) => {
    navigate(`/customers/${customerId}`);
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setTypeFilter('');
    setStatusFilter('');
    setPage(0);
  };

  if (isLoading && page === 0 && !isSearchMode) {
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
          Erreur lors du chargement des customers : {(error as Error).message}
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
        <div className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher par nom, email ou téléphone..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(0);
                }}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value as 'PERSON' | 'COMPANY' | '');
                setPage(0);
              }}
              className="px-4 py-2 border border-gray-200 rounded-lg bg-white"
            >
              <option value="">Tous les types</option>
              <option value="PERSON">Personnes</option>
              <option value="COMPANY">Compagnies</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(0);
              }}
              className="px-4 py-2 border border-gray-200 rounded-lg bg-white"
            >
              <option value="">Tous les statuts</option>
              <option value="ACTIVE">Actif</option>
              <option value="INACTIVE">Inactif</option>
              <option value="SUSPENDED">Suspendu</option>
            </select>
            {(searchTerm || typeFilter || statusFilter) && (
              <button
                onClick={handleClearFilters}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-200 rounded-lg whitespace-nowrap"
              >
                Effacer les filtres
              </button>
            )}
          </div>
          {searchTerm && searchTerm !== debouncedSearch && (
            <div className="text-sm text-gray-500 italic">
              Recherche en cours...
            </div>
          )}
          {isSearchMode && searchResults && (
            <div className="text-sm text-gray-500">
              {searchResults.length} résultat(s) trouvé(s)
            </div>
          )}
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
              {customers.map((customer: CustomerSummaryResponse) => (
                <tr 
                  key={customer.customerId} 
                  onClick={() => handleRowClick(customer.customerId)}
                  className="hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                        <User size={20} className="text-primary-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{customer.displayName}</p>
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
                      {customer.status === 'ACTIVE' ? 'Actif' : 
                       customer.status === 'INACTIVE' ? 'Inactif' : 'Suspendu'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 font-mono">
                    {customer.customerId}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation(); // Empêche le clic sur la ligne
                          navigate(`/customers/${customer.customerId}`);
                        }}
                        className="text-primary-600 hover:text-primary-700 p-1"
                        title="Voir le détail"
                      >
                        <Eye size={18} />
                      </button>
                      <button
                        onClick={(e) => handleDelete(e, customer.customerId)}
                        className="text-red-600 hover:text-red-700 p-1"
                        title="Supprimer"
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {customers.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <User size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">Aucun customer trouvé</p>
            {(searchTerm || typeFilter || statusFilter) && (
              <button
                onClick={handleClearFilters}
                className="mt-2 text-primary-600 hover:underline"
              >
                Effacer les filtres
              </button>
            )}
          </div>
        )}

        {/* Pagination - seulement pour la vue liste (pas en mode recherche) */}
        {!isSearchMode && pagination && pagination.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Affichage de {page * pageSize + 1} à {Math.min((page + 1) * pageSize, pagination.totalElements)} sur {pagination.totalElements} customers
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Précédent
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={!pagination.hasNext}
                className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Suivant
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};