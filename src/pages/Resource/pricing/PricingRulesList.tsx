import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, Search, DollarSign, Power, Calculator } from 'lucide-react';
import { resourceService } from '../../../services/resource.service';
import type { ResourcePricingRuleResponse, ResourceResponse } from '../../../services/resource.service';
import { PricingRuleFormModal } from './PricingRuleFormModal';
import { ModalPortal } from '../../../components/ui/ModalPortal';

const bookingUnitLabels: Record<string, string> = {
  HOUR: 'Heure',
  HALF_DAY: 'Demi-journée',
  DAY: 'Jour',
  WEEK: 'Semaine',
  MONTH: 'Mois',
};

export const PricingRulesList: React.FC = () => {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [resourceFilter, setResourceFilter] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isQuoteOpen, setIsQuoteOpen] = useState(false);
  const [quoteForm, setQuoteForm] = useState({ resourceCode: '', bookingUnit: 'HOUR', startedAt: '', endedAt: '' });
  const [quoteResult, setQuoteResult] = useState<any>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [editingRule, setEditingRule] = useState<ResourcePricingRuleResponse | null>(null);

  const { data: rulesData, isLoading } = useQuery({
    queryKey: ['resource-pricing-rules', resourceFilter],
    queryFn: () => resourceService.getPricingRules(resourceFilter || undefined, { size: 200 }),
  });

  // Ressources pour le select de filtre
  const { data: resourcesData } = useQuery({
    queryKey: ['resources-list'],
    queryFn: () => resourceService.getResources({ size: 500 }),
  });

  const resources: ResourceResponse[] = resourcesData?.content || [];
  const rules: ResourcePricingRuleResponse[] = rulesData?.content || [];

  // CORRECTION : filtre client-side sur resourceCode uniquement si pas de resourceFilter API
  const filteredRules = search
    ? rules.filter(r => r.resourceCode.toLowerCase().includes(search.toLowerCase()))
    : rules;

  const deleteMutation = useMutation({
    mutationFn: (id: number) => resourceService.deletePricingRule(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['resource-pricing-rules'] }),
    onError: () => alert('Erreur lors de la suppression de la règle.'),
  });

  // CORRECTION : toggle active via updatePricingRuleActive
  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) =>
      resourceService.updatePricingRuleActive(id, active),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['resource-pricing-rules'] }),
    onError: () => alert('Erreur lors de la mise à jour du statut.'),
  });

  const handleDelete = (id: number) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette règle de tarification ?')) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Règles de tarification</h2>
        <button
          onClick={() => {
            setEditingRule(null);
            setIsModalOpen(true);
          }}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center gap-2"
        >
          <Plus size={18} />
          Nouvelle règle
        </button>
        <button onClick={() => { setIsQuoteOpen(true); setQuoteResult(null); setQuoteError(null); }}
          className="border border-primary-600 text-primary-600 px-4 py-2 rounded-lg hover:bg-primary-50 flex items-center gap-2">
          <Calculator size={18} />
          Simulateur de prix
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        {/* CORRECTION : select sur les ressources au lieu d'un input texte libre */}
        <select
          value={resourceFilter}
          onChange={(e) => setResourceFilter(e.target.value)}
          className="px-4 py-2 border border-gray-200 rounded-lg bg-white w-full md:w-64"
        >
          <option value="">Toutes les ressources</option>
          {resources.map((res) => (
            <option key={res.code} value={res.code}>{res.name}</option>
          ))}
        </select>
        <div className="flex-1 relative">
          <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Filtrer par code ressource..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg"
          />
        </div>
        {(resourceFilter || search) && (
          <button
            onClick={() => { setResourceFilter(''); setSearch(''); }}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
          >
            Réinitialiser
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold">Ressource</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Unité</th>
              <th className="px-6 py-3 text-right text-sm font-semibold">Prix</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Label / Ajustement</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Période</th>
              <th className="px-6 py-3 text-center text-sm font-semibold">Actif</th>
              <th className="px-6 py-3 text-right text-sm font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredRules.map((rule) => (
              <tr key={rule.id} className={`hover:bg-gray-50 ${!rule.active ? 'opacity-60' : ''}`}>
                <td className="px-6 py-4 text-sm font-mono">{rule.resourceCode}</td>
                <td className="px-6 py-4 text-sm">{bookingUnitLabels[rule.bookingUnit] || rule.bookingUnit}</td>
                <td className="px-6 py-4 text-right font-medium">{rule.price.toLocaleString('fr-FR')} FCFA</td>
                <td className="px-6 py-4 text-sm">
                  {rule.label && <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs mb-1">{rule.label}</span>}
                  {rule.adjustmentType && (
                    <p className="text-xs text-gray-500">
                      {rule.adjustmentType === 'PERCENT_DELTA' ? `${rule.adjustmentValue}%` :
                       rule.adjustmentType === 'AMOUNT_DELTA' ? `${rule.adjustmentValue?.toLocaleString('fr-FR')} FCFA` :
                       `Fix: ${rule.price.toLocaleString('fr-FR')} FCFA`}
                    </p>
                  )}
                  {rule.dayOfWeek && <p className="text-xs text-gray-400">Jour {rule.dayOfWeek} · {rule.startsAt?.slice(0,5)}–{rule.endsAt?.slice(0,5)}</p>}
                </td>
                <td className="px-6 py-4 text-xs text-gray-500">
                  {rule.validFrom && <p>Du {new Date(rule.validFrom).toLocaleDateString('fr-FR')}</p>}
                  {rule.validUntil && <p>Au {new Date(rule.validUntil).toLocaleDateString('fr-FR')}</p>}
                  {rule.lastMinuteMinutes && <p className="text-orange-500">⚡ Last min {rule.lastMinuteMinutes}min</p>}
                </td>
                <td className="px-6 py-4 text-center">
                  <button
                    onClick={() => toggleActiveMutation.mutate({ id: rule.id, active: !rule.active })}
                    disabled={toggleActiveMutation.isPending}
                    className={`p-1 rounded disabled:opacity-40 ${
                      rule.active ? 'text-green-600 hover:text-green-800' : 'text-gray-400 hover:text-gray-600'
                    }`}
                    title={rule.active ? 'Désactiver' : 'Activer'}
                  >
                    <Power size={16} />
                  </button>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => { setEditingRule(rule); setIsModalOpen(true); }}
                      className="p-1 text-blue-600 hover:text-blue-800"
                      title="Modifier"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(rule.id)}
                      disabled={deleteMutation.isPending}
                      className="p-1 text-red-600 hover:text-red-800 disabled:opacity-40"
                      title="Supprimer"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredRules.length === 0 && !isLoading && (
        <div className="text-center py-12 bg-white rounded-xl">
          <DollarSign size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">Aucune règle de tarification trouvée</p>
        </div>
      )}

      <PricingRuleFormModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingRule(null); }}
        editingRule={editingRule}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['resource-pricing-rules'] });
          setIsModalOpen(false);
          setEditingRule(null);
        }}
      />

      {/* Simulateur de prix */}
      {isQuoteOpen && (
        <ModalPortal onClose={() => setIsQuoteOpen(false)}>
          <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center rounded-t-2xl">
            <h3 className="text-xl font-bold">Simulateur de prix</h3>
            <button onClick={() => setIsQuoteOpen(false)} className="p-1 hover:bg-gray-100 rounded-lg">✕</button>
          </div>
          <div className="p-6 space-y-4">
            {quoteError && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">{quoteError}</div>}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ressource *</label>
              <select value={quoteForm.resourceCode} onChange={(e) => setQuoteForm(f => ({ ...f, resourceCode: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white">
                <option value="">Sélectionner</option>
                {resources.map(r => <option key={r.code} value={r.code}>{r.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unité *</label>
              <select value={quoteForm.bookingUnit} onChange={(e) => setQuoteForm(f => ({ ...f, bookingUnit: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white">
                {[{v:'HOUR',l:'Heure'},{v:'HALF_DAY',l:'Demi-journée'},{v:'DAY',l:'Jour'},{v:'WEEK',l:'Semaine'},{v:'MONTH',l:'Mois'}].map(u =>
                  <option key={u.v} value={u.v}>{u.l}</option>
                )}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Début *</label>
                <input type="datetime-local" value={quoteForm.startedAt} onChange={(e) => setQuoteForm(f => ({ ...f, startedAt: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fin *</label>
                <input type="datetime-local" value={quoteForm.endedAt} onChange={(e) => setQuoteForm(f => ({ ...f, endedAt: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg" />
              </div>
            </div>
            <button disabled={!quoteForm.resourceCode || !quoteForm.startedAt || !quoteForm.endedAt || quoteLoading}
              onClick={async () => {
                setQuoteLoading(true); setQuoteError(null); setQuoteResult(null);
                try {
                  const result = await resourceService.getPricingRuleQuote({
                    resourceCode: quoteForm.resourceCode, bookingUnit: quoteForm.bookingUnit,
                    startedAt: quoteForm.startedAt.replace('T', 'T'),
                    endedAt: quoteForm.endedAt.replace('T', 'T'),
                  });
                  setQuoteResult(result);
                } catch (e: any) { setQuoteError(e?.response?.data?.message || 'Erreur'); }
                setQuoteLoading(false);
              }}
              className="w-full bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2">
              {quoteLoading ? <span>Calcul...</span> : <><Calculator size={15} /> Calculer le prix</>}
            </button>
            {quoteResult && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-xl space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600 text-sm">Prix de base</span>
                  <span className="font-medium">{quoteResult.basePrice?.toLocaleString('fr-FR')} FCFA</span>
                </div>
                <div className="flex justify-between text-lg font-bold">
                  <span className="text-green-700">Prix final</span>
                  <span className="text-green-700">{quoteResult.finalPrice?.toLocaleString('fr-FR')} FCFA</span>
                </div>
                {quoteResult.appliedRuleLabel && (
                  <p className="text-xs text-gray-500">Règle appliquée : <span className="font-medium">{quoteResult.appliedRuleLabel}</span>
                    {quoteResult.adjustmentValue && ` (${quoteResult.adjustmentValue}${quoteResult.adjustmentType === 'PERCENT_DELTA' ? '%' : ' FCFA'})`}
                  </p>
                )}
              </div>
            )}
          </div>
        </ModalPortal>
      )}
    </div>
  );
};