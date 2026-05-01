import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Tag, ChevronLeft, ChevronRight, PowerOff } from 'lucide-react';
import { subscriptionService } from '../../../services/subscription.service';
import type { EntitlementDefinition } from '../../../services/subscription.service';
import { EntitlementDefinitionFormModal } from './EntitlementDefinitionFormModal';

const entitlementTypeLabels: Record<string, string> = {
  ACCESS: 'Accès',
  CREDIT: 'Crédit',
  TIME: 'Temps',
  DISCOUNT: 'Réduction',
  QUOTA: 'Quota',
  FEATURE_FLAG: 'Fonctionnalité',
  SERVICE_ALLOWANCE: 'Forfait service',
};

const unitLabels: Record<string, string> = {
  DAY: 'Jour',
  HOUR: 'Heure',
  CREDIT: 'Crédit',
  BOOKING: 'Réservation',
  VISIT: 'Visite',
  MEMBER: 'Membre',
  PERCENT: 'Pourcentage',
  AMOUNT: 'Montant',
  BOOLEAN: 'Booléen',
};

const consumptionModeLabels: Record<string, string> = {
  CHECK_ONLY: 'Vérification uniquement',
  RESERVABLE: 'Réservable',
  CONSUMABLE: 'Consommable',
  RESERVE_THEN_CONSUME: 'Réservation puis consommation',
};

const resetPolicyLabels: Record<string, string> = {
  NEVER: 'Jamais',
  DAILY: 'Quotidien',
  WEEKLY: 'Hebdomadaire',
  MONTHLY: 'Mensuel',
  PER_BILLING_CYCLE: 'Par cycle de facturation',
};

const PAGE_SIZE = 20;

export const EntitlementDefinitionsList: React.FC = () => {
  const queryClient = useQueryClient();

  // Recherche : debounce 400ms pour ne pas spammer l'API
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Filtre actif/inactif exposé dans l'UI
  const [activeFilter, setActiveFilter] = useState<'' | 'true' | 'false'>('');
  const [page, setPage] = useState(0);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDefinition, setEditingDefinition] = useState<EntitlementDefinition | null>(null);

  // Debounce sur la recherche
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Filtre actif remet à la page 0
  const handleActiveFilterChange = (value: '' | 'true' | 'false') => {
    setActiveFilter(value);
    setPage(0);
  };

  const { data: definitionsData, isLoading, isFetching } = useQuery({
    queryKey: ['entitlement-definitions', debouncedSearch, activeFilter, page],
    queryFn: () => subscriptionService.getEntitlementDefinitions({
      // CORRECTION : filtre active envoyé à l'API quand renseigné
      active: activeFilter !== '' ? activeFilter === 'true' : undefined,
      page,
      size: PAGE_SIZE,
    }),
  });

  // CORRECTION : désactivation via updateEntitlementDefinition (pas d'endpoint DELETE)
  // L'intitulé "Désactiver" est plus honnête que "Supprimer"
  const toggleActiveMutation = useMutation({
    mutationFn: ({ code, active }: { code: string; active: boolean }) =>
      subscriptionService.updateEntitlementDefinition(code, { active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entitlement-definitions'] });
    },
    onError: () => {
      alert('Erreur lors de la mise à jour du statut.');
    },
  });

  const definitions = definitionsData?.content || [];
  const totalPages = (definitionsData as any)?.totalPages ?? 1;
  const totalElements = (definitionsData as any)?.totalElements ?? definitions.length;

  // Filtre client-side sur le search uniquement si l'API ne supporte pas la recherche par nom
  // (getEntitlementDefinitions n'a pas de param `name` dans le service actuel)
  const filteredDefinitions = debouncedSearch
    ? definitions.filter(def =>
        def.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        def.code.toLowerCase().includes(debouncedSearch.toLowerCase())
      )
    : definitions;

  const handleToggleActive = (def: EntitlementDefinition) => {
    const label = def.active ? 'désactiver' : 'réactiver';
    if (confirm(`Êtes-vous sûr de vouloir ${label} "${def.name}" ?`)) {
      toggleActiveMutation.mutate({ code: def.code, active: !def.active });
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Définitions de droits</h2>
        <button
          onClick={() => {
            setEditingDefinition(null);
            setIsModalOpen(true);
          }}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center gap-2"
        >
          <Plus size={18} />
          Nouveau droit
        </button>
      </div>

      {/* Barre de recherche + filtre actif */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <Tag size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher par nom ou code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg"
          />
          {isFetching && search !== '' && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 animate-pulse">
              Recherche...
            </span>
          )}
        </div>
        {/* CORRECTION : filtre actif/inactif exposé */}
        <select
          value={activeFilter}
          onChange={(e) => handleActiveFilterChange(e.target.value as '' | 'true' | 'false')}
          className="px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm"
        >
          <option value="">Tous (actifs + inactifs)</option>
          <option value="true">Actifs seulement</option>
          <option value="false">Inactifs seulement</option>
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold">Code</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Nom</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Type</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Unité</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Mode consommation</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Reset</th>
              <th className="px-6 py-3 text-center text-sm font-semibold">Statut</th>
              <th className="px-6 py-3 text-right text-sm font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredDefinitions.map((def) => (
              <tr key={def.code} className={`hover:bg-gray-50 ${!def.active ? 'opacity-60' : ''}`}>
                <td className="px-6 py-4 text-sm font-mono">{def.code}</td>
                <td className="px-6 py-4 text-sm font-medium">{def.name}</td>
                <td className="px-6 py-4 text-sm">{entitlementTypeLabels[def.entitlementType] || def.entitlementType}</td>
                <td className="px-6 py-4 text-sm">{unitLabels[def.unit] || def.unit}</td>
                <td className="px-6 py-4 text-sm">{consumptionModeLabels[def.consumptionMode] || def.consumptionMode}</td>
                <td className="px-6 py-4 text-sm">{resetPolicyLabels[def.resetPolicy] || def.resetPolicy}</td>
                <td className="px-6 py-4 text-center">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    def.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {def.active ? 'Actif' : 'Inactif'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => {
                        setEditingDefinition(def);
                        setIsModalOpen(true);
                      }}
                      className="p-1 text-blue-600 hover:text-blue-800"
                      title="Modifier"
                    >
                      <Edit size={16} />
                    </button>
                    {/* CORRECTION : libellé "Désactiver/Réactiver" honnête */}
                    <button
                      onClick={() => handleToggleActive(def)}
                      disabled={toggleActiveMutation.isPending}
                      className={`p-1 disabled:opacity-40 ${
                        def.active
                          ? 'text-red-600 hover:text-red-800'
                          : 'text-green-600 hover:text-green-800'
                      }`}
                      title={def.active ? 'Désactiver' : 'Réactiver'}
                    >
                      <PowerOff size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredDefinitions.length === 0 && !isLoading && (
        <div className="text-center py-12 bg-white rounded-xl">
          <Tag size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">Aucune définition de droit trouvée</p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 px-2">
          <p className="text-sm text-gray-500">
            {totalElements} droit{totalElements > 1 ? 's' : ''} au total
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="p-1 rounded border disabled:opacity-40 hover:bg-gray-50"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm text-gray-600">
              Page {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="p-1 rounded border disabled:opacity-40 hover:bg-gray-50"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      <EntitlementDefinitionFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingDefinition(null);
        }}
        editingDefinition={editingDefinition}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['entitlement-definitions'] });
          setIsModalOpen(false);
          setEditingDefinition(null);
        }}
      />
    </div>
  );
};