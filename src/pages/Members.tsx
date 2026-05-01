import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AdminLayout } from '../components/layout/AdminLayout';
import {
  Search, Eye, User, Plus, CheckCircle, XCircle,
  Lock, Unlock, ChevronLeft, ChevronRight, Loader2,
} from 'lucide-react';
import { memberService } from '../services/member.service';
import type { MemberSummaryResponse, MemberResponse } from '../services/member.service';

// ============================================================
// Stratégie de recherche selon le MD :
//
// 1. Pas de critère → GET /members?page=...&size=... (listing simple)
// 2. Texte libre seulement → GET /members/search/basic?query=...
//    (léger, non-paginé, pour la frappe instantanée)
// 3. Filtres structurés (statut, portail, customerId) avec ou
//    sans texte → POST /members/search (payload propre, paginé)
//
// On n'envoie JAMAIS la même valeur de saisie sur plusieurs
// champs simultanément (memberId + firstname + lastname + email...).
// ============================================================


// Normalise MemberResponse (fullname) → MemberSummaryResponse (fullName)
const normalizeMember = (m: MemberResponse | MemberSummaryResponse): MemberSummaryResponse => ({
  memberId:    m.memberId,
  customerId:  m.customerId,
  fullName:    (m as MemberSummaryResponse).fullName || (m as MemberResponse).fullname || '',
  email:       m.email,
  phone:       m.phone,
  status:      m.status,
  portalAccess: m.portalAccess,
});

const PAGE_SIZE = 20;

const statusBadge = (status: string) => {
  switch (status) {
    case 'ACTIVE':
      return (
        <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-700 inline-flex items-center gap-1">
          <CheckCircle size={11} /> Actif
        </span>
      );
    case 'PENDING':
      return <span className="px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-700">En attente</span>;
    case 'INACTIVE':
      return <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-600">Inactif</span>;
    case 'SUSPENDED':
      return (
        <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-700 inline-flex items-center gap-1">
          <XCircle size={11} /> Suspendu
        </span>
      );
    default:
      return <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-600">{status}</span>;
  }
};

export const AdminMembers: React.FC = () => {
  const navigate = useNavigate();

  // Champ de saisie libre (affiché immédiatement)
  const [searchTerm, setSearchTerm] = useState('');
  // Valeur debounce utilisée pour les requêtes (400ms)
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Filtres structurés — utilisent POST /members/search
  const [statusFilter, setStatusFilter] = useState('');
  const [portalFilter, setPortalFilter] = useState('');
  const [customerIdFilter, setCustomerIdFilter] = useState('');

  const [page, setPage] = useState(0);

  // Debounce 400ms — remet page à 0 quand la recherche change
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(0);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Remet page à 0 quand un filtre change
  const handleFilterChange = <T,>(setter: (v: T) => void, value: T) => {
    setter(value);
    setPage(0);
  };

  // Détermine la stratégie selon les critères actifs
  const hasStructuredFilters = !!(statusFilter || portalFilter || customerIdFilter);
  const hasTextSearch = debouncedSearch.length >= 2;

  // Stratégie 1 : texte seul → GET /members/search/basic (non-paginé, léger)
  // On l'utilise quand il n'y a pas de filtre structuré
  const { data: basicSearchResults, isFetching: basicFetching } = useQuery({
    queryKey: ['members-basic', debouncedSearch],
    queryFn: () => memberService.searchMembers(debouncedSearch),
    enabled: hasTextSearch && !hasStructuredFilters,
    staleTime: 30_000,
  });

  // Stratégie 2 : filtres structurés (avec ou sans texte) → POST /members/search
  // Le texte libre est mappé sur `email` uniquement si ça ressemble à un email,
  // sinon sur `lastname` (champ le plus discriminant).
  // On ne duplique JAMAIS la même valeur sur plusieurs champs.
  const buildAdvancedPayload = () => {
    const payload: any = {};
    if (statusFilter)           payload.status       = statusFilter;
    if (portalFilter !== '')    payload.portalAccess = portalFilter === 'active';
    if (customerIdFilter)       payload.customerId   = customerIdFilter;
    if (debouncedSearch) {
      // Détection heuristique : email, ID member, ou nom
      if (debouncedSearch.includes('@')) {
        payload.email = debouncedSearch;
      } else if (debouncedSearch.toUpperCase().startsWith('MEM-') || debouncedSearch.toUpperCase().startsWith('MBR-')) {
        payload.memberId = debouncedSearch;
      } else if (/^\d+/.test(debouncedSearch)) {
        payload.phone = debouncedSearch;
      } else {
        // Nom : on envoie seulement lastname (le backend fait un LIKE)
        payload.lastname = debouncedSearch;
      }
    }
    return payload;
  };

  const { data: advancedResult, isFetching: advancedFetching } = useQuery({
    queryKey: ['members-advanced', debouncedSearch, statusFilter, portalFilter, customerIdFilter, page],
    queryFn: () => memberService.searchMembersAdvanced(buildAdvancedPayload(), page, PAGE_SIZE),
    enabled: hasStructuredFilters || (hasTextSearch && hasStructuredFilters),
    staleTime: 30_000,
  });

  // Stratégie 3 : aucun critère → GET /members (listing simple paginé)
  const { data: listResult, isFetching: listFetching } = useQuery({
    queryKey: ['members-list', page],
    queryFn: () => memberService.getMembers({ page, size: PAGE_SIZE, sort: 'createdAt,desc' }),
    enabled: !hasTextSearch && !hasStructuredFilters,
    staleTime: 60_000,
  });

  // Résolution des données et pagination selon la stratégie active
  let members: MemberSummaryResponse[] = [];
  let totalPages = 0;
  let totalElements = 0;
  const isFetching = basicFetching || advancedFetching || listFetching;

  if (hasStructuredFilters) {
    // POST /members/search paginé
    members = (advancedResult?.data || []) as MemberSummaryResponse[];
    totalPages = advancedResult?.pageable?.totalPages ?? 0;
    totalElements = advancedResult?.pageable?.totalElements ?? 0;
  } else if (hasTextSearch) {
    // GET /search/basic → non-paginé, pas de pagination côté UI
    members = (basicSearchResults || []) as MemberSummaryResponse[];
    totalPages = 0;
    totalElements = members.length;
  } else {
    // GET /members paginé
    members = ((listResult?.data || []) as MemberResponse[]).map(normalizeMember);
    totalPages = listResult?.pageable?.totalPages ?? 0;
    totalElements = listResult?.pageable?.totalElements ?? 0;
  }

  const hasAnyFilter = !!(searchTerm || statusFilter || portalFilter || customerIdFilter);

  const handleClearFilters = () => {
    setSearchTerm('');
    setDebouncedSearch('');
    setStatusFilter('');
    setPortalFilter('');
    setCustomerIdFilter('');
    setPage(0);
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Membres</h1>
            <p className="text-gray-600 mt-1">
              Gérez tous les membres
              {totalElements > 0 && (
                <span className="ml-2 text-sm">· {totalElements} membre{totalElements > 1 ? 's' : ''}</span>
              )}
            </p>
          </div>
          <button
            onClick={() => navigate('/members/create')}
            className="mt-4 md:mt-0 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center gap-2"
          >
            <Plus size={18} /> Créer un membre
          </button>
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-xl p-4 shadow-sm mb-6">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Recherche texte */}
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Nom, email, téléphone, ID membre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-8 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            {isFetching && (
              <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-gray-400" />
            )}
          </div>

          {/* Statut */}
          <select value={statusFilter}
            onChange={(e) => handleFilterChange(setStatusFilter, e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg bg-white">
            <option value="">Tous les statuts</option>
            <option value="ACTIVE">Actif</option>
            <option value="PENDING">En attente</option>
            <option value="INACTIVE">Inactif</option>
            <option value="SUSPENDED">Suspendu</option>
          </select>

          {/* Accès portail */}
          <select value={portalFilter}
            onChange={(e) => handleFilterChange(setPortalFilter, e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg bg-white">
            <option value="">Accès portail (tous)</option>
            <option value="active">Avec accès</option>
            <option value="inactive">Sans accès</option>
          </select>

          {/* Customer ID */}
          <input
            type="text"
            placeholder="Customer ID"
            value={customerIdFilter}
            onChange={(e) => handleFilterChange(setCustomerIdFilter, e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 w-44"
          />

          {hasAnyFilter && (
            <button onClick={handleClearFilters}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 whitespace-nowrap">
              Réinitialiser
            </button>
          )}
        </div>

        {/* Indicateur de stratégie active */}
        {hasTextSearch && !hasStructuredFilters && (
          <p className="text-xs text-blue-500 mt-2">
            Recherche rapide — min. 2 caractères
            {debouncedSearch !== searchTerm && ' · en cours...'}
          </p>
        )}
        {hasStructuredFilters && (
          <p className="text-xs text-primary-500 mt-2">
            Recherche avancée — filtres actifs
          </p>
        )}
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Membre</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Contact</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Statut</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Portail</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Customer</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {members.map((member) => (
                <tr
                  key={member.memberId}
                  onClick={() => navigate(`/members/${member.memberId}`)}
                  className="hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <User size={18} className="text-primary-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{member.fullName}</p>
                        <p className="text-xs text-gray-400 font-mono">{member.memberId}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-900">{member.email}</p>
                    <p className="text-xs text-gray-500">{member.phone || '—'}</p>
                  </td>
                  <td className="px-6 py-4">{statusBadge(member.status)}</td>
                  <td className="px-6 py-4">
                    {member.portalAccess ? (
                      <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-700 inline-flex items-center gap-1">
                        <Unlock size={11} /> Actif
                      </span>
                    ) : (
                      <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-500 inline-flex items-center gap-1">
                        <Lock size={11} /> Désactivé
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-primary-600 font-mono hover:underline"
                      onClick={(e) => { e.stopPropagation(); navigate(`/customers/${member.customerId}`); }}>
                      {member.customerId}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate(`/members/${member.memberId}`); }}
                      className="p-1 text-primary-600 hover:text-primary-800"
                      title="Voir le détail"
                    >
                      <Eye size={17} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {members.length === 0 && !isFetching && (
          <div className="text-center py-12">
            <User size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">Aucun membre trouvé</p>
            {hasAnyFilter && (
              <button onClick={handleClearFilters}
                className="mt-2 text-primary-600 hover:underline text-sm">
                Effacer les filtres
              </button>
            )}
          </div>
        )}

        {/* Skeleton pendant chargement initial */}
        {isFetching && members.length === 0 && (
          <div className="divide-y divide-gray-100">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="px-6 py-4 flex items-center gap-4 animate-pulse">
                <div className="w-9 h-9 bg-gray-200 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-40" />
                  <div className="h-2 bg-gray-100 rounded w-24" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination — uniquement pour listing paginé et recherche avancée */}
        {totalPages > 1 && !hasTextSearch && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              {totalElements} membre{totalElements > 1 ? 's' : ''} — Page {page + 1} / {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => { setPage(p => Math.max(0, p - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                disabled={page === 0}
                className="p-1.5 border rounded-lg disabled:opacity-50 hover:bg-gray-50"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => { setPage(p => Math.min(totalPages - 1, p + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                disabled={page >= totalPages - 1}
                className="p-1.5 border rounded-lg disabled:opacity-50 hover:bg-gray-50"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Note résultats basique */}
        {hasTextSearch && !hasStructuredFilters && members.length > 0 && (
          <div className="px-6 py-3 border-t border-gray-100 text-xs text-gray-400 text-center">
            {members.length} résultat{members.length > 1 ? 's' : ''} — ajoutez un filtre (statut, portail, customer) pour paginer
          </div>
        )}
      </div>
    </AdminLayout>
  );
};