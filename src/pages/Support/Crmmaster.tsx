import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, X, Loader2, TrendingUp, ChevronLeft, ChevronRight, Target, Phone, Mail, Users, Building, Calendar, CheckCircle, ArrowRightLeft } from 'lucide-react';
import { operationsService } from '../../services/operations.service';
import type { Lead, LeadStage, ActivityType } from '../../services/operations.service';
import { useAuth } from '../../contexts/AuthContext';
import { ModalPortal } from '../../components/ui/ModalPortal';

const stageConfig: Record<LeadStage, { label: string; color: string }> = {
  NEW:           { label: 'Nouveau',         color: 'bg-gray-100 text-gray-700' },
  CONTACTED:     { label: 'Contacté',        color: 'bg-blue-100 text-blue-700' },
  QUALIFIED:     { label: 'Qualifié',        color: 'bg-purple-100 text-purple-700' },
  PROPOSAL_SENT: { label: 'Proposition',     color: 'bg-yellow-100 text-yellow-700' },
  WON:           { label: 'Gagné',           color: 'bg-green-100 text-green-700' },
  LOST:          { label: 'Perdu',           color: 'bg-red-100 text-red-700' },
};

const activityTypes: ActivityType[] = ['CALL', 'EMAIL', 'MEETING', 'VISIT', 'NOTE'];
const activityIcons: Record<ActivityType, React.ElementType> = {
  CALL: Phone, EMAIL: Mail, MEETING: Users, VISIT: Building, NOTE: Calendar,
};
const activityLabels: Record<ActivityType, string> = {
  CALL: 'Appel', EMAIL: 'Email', MEETING: 'Réunion', VISIT: 'Visite', NOTE: 'Note',
};

type SubTab = 'pipeline' | 'list' | 'create';

export const CrmMaster: React.FC = () => {
  const { admin } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<SubTab>('pipeline');
  const [visitedTabs, setVisitedTabs] = React.useState<Set<SubTab>>(new Set(['pipeline']));
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<LeadStage | ''>('');
  const [page, setPage] = useState(0);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [activityForm, setActivityForm] = useState({ activityType: 'NOTE' as ActivityType, subject: '', notes: '', performedAt: new Date().toISOString().slice(0, 16) });
  const [convertForm, setConvertForm] = useState({ ownerType: 'CUSTOMER', ownerCode: '' });
  const [isConvertOpen, setIsConvertOpen] = useState(false);

  const [createForm, setCreateForm] = useState({
    fullName: '', email: '', phone: '', company: '', source: '',
    interest: '', estimatedAmount: 0, probability: 30, expectedCloseDate: '',
  });

  const switchTab = (tab: SubTab) => {
    setActiveTab(tab);
    setVisitedTabs(prev => new Set([...prev, tab]));
    setActionError(null);
  };

  useEffect(() => {
    if (activeTab !== 'create') return;
    setCreateForm({ fullName: '', email: '', phone: '', company: '', source: '',
      interest: '', estimatedAmount: 0, probability: 30, expectedCloseDate: '' });
  }, [activeTab]);

  const { data: pipelineData = [], isLoading: pipelineLoading } = useQuery({
    queryKey: ['crm-pipeline'],
    queryFn: () => operationsService.getCrmPipeline(),
    enabled: visitedTabs.has('pipeline'),
  });

  const { data: metrics } = useQuery({
    queryKey: ['crm-metrics'],
    queryFn: () => operationsService.getCrmMetrics(),
  });

  const { data: leadsData, isLoading: leadsLoading } = useQuery({
    queryKey: ['crm-leads', stageFilter, page],
    queryFn: () => operationsService.getLeads({ stage: stageFilter || undefined, page, size: 20 }),
    enabled: visitedTabs.has('list'),
  });

  const { data: leadDetail, refetch: refetchDetail } = useQuery({
    queryKey: ['crm-lead', selectedLead?.id],
    queryFn: () => operationsService.getLead(selectedLead!.id),
    enabled: !!selectedLead && isDetailOpen,
  });

  const leads = leadsData?.content || [];
  const totalPages = leadsData?.totalPages ?? 0;
  const currentLead = leadDetail || selectedLead;

  const filteredLeads = search
    ? leads.filter(l => l.fullName.toLowerCase().includes(search.toLowerCase()) ||
        l.company?.toLowerCase().includes(search.toLowerCase()))
    : leads;

  const createMutation = useMutation({
    mutationFn: () => operationsService.createLead({
      ...createForm,
      estimatedAmount: createForm.estimatedAmount || undefined,
      probability: createForm.probability || undefined,
      expectedCloseDate: createForm.expectedCloseDate || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
      queryClient.invalidateQueries({ queryKey: ['crm-pipeline'] });
      queryClient.invalidateQueries({ queryKey: ['crm-metrics'] });
      switchTab('list');
    },
    onError: (e: any) => setActionError(e?.response?.data?.message || 'Erreur création lead'),
  });

  const stageMutation = useMutation({
    mutationFn: ({ id, stage }: { id: number; stage: LeadStage }) =>
      operationsService.updateLeadStage(id, stage),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
      queryClient.invalidateQueries({ queryKey: ['crm-pipeline'] });
      refetchDetail();
    },
    onError: (e: any) => setActionError(e?.response?.data?.message || 'Erreur changement étape'),
  });

  const qualifyMutation = useMutation({
    mutationFn: (id: number) => operationsService.qualifyLead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
      queryClient.invalidateQueries({ queryKey: ['crm-pipeline'] });
      refetchDetail();
    },
    onError: (e: any) => setActionError(e?.response?.data?.message || 'Erreur qualification'),
  });

  const activityMutation = useMutation({
    mutationFn: () => operationsService.addLeadActivity(selectedLead!.id, {
      ...activityForm,
      performedBy: admin?.email || 'admin',
      performedAt: new Date(activityForm.performedAt).toISOString(),
    }),
    onSuccess: () => {
      refetchDetail();
      setActivityForm({ activityType: 'NOTE', subject: '', notes: '', performedAt: new Date().toISOString().slice(0, 16) });
    },
    onError: (e: any) => setActionError(e?.response?.data?.message || 'Erreur ajout activité'),
  });

  const convertMutation = useMutation({
    mutationFn: () => operationsService.convertLead(selectedLead!.id, convertForm),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
      queryClient.invalidateQueries({ queryKey: ['crm-pipeline'] });
      setIsConvertOpen(false);
      refetchDetail();
    },
    onError: (e: any) => setActionError(e?.response?.data?.message || 'Erreur conversion'),
  });

  const tabs: { id: SubTab; label: string; icon: React.ElementType }[] = [
    { id: 'pipeline', label: 'Pipeline', icon: Target },
    { id: 'list',     label: 'Liste',    icon: Users },
    { id: 'create',   label: 'Nouveau lead', icon: TrendingUp },
  ];

  return (
    <div>
      {/* Métriques */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          {[
            { label: 'Total leads', value: metrics.totalLeads, color: 'text-gray-900' },
            { label: 'Gagnés', value: metrics.wonLeads, color: 'text-green-600' },
            { label: 'Perdus', value: metrics.lostLeads, color: 'text-red-600' },
            { label: 'Valeur pipeline', value: `${(metrics.pipelineValue || 0).toLocaleString('fr-FR')} FCFA`, color: 'text-primary-600' },
            { label: 'Taux conversion', value: `${((metrics.conversionRate || 0) * 100).toFixed(0)}%`, color: 'text-blue-600' },
          ].map(m => (
            <div key={m.label} className="bg-white rounded-xl p-4 shadow-sm">
              <p className={`text-xl font-bold ${m.color}`}>{m.value}</p>
              <p className="text-xs text-gray-500">{m.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Sous-onglets */}
      <div className="flex gap-1 border-b border-gray-200 mb-6">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => switchTab(id)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors flex items-center gap-1.5 ${
              activeTab === id ? 'bg-primary-50 text-primary-600 border-b-2 border-primary-600' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}>
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {actionError && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm flex justify-between">
          {actionError}<button onClick={() => setActionError(null)} className="ml-2 font-bold">x</button>
        </div>
      )}

      {/* Pipeline Kanban */}
      {activeTab === 'pipeline' && (
        <div>
          {pipelineLoading ? <div className="text-center py-8">Chargement...</div> : (
            <div className="flex gap-4 overflow-x-auto pb-4">
              {(Object.keys(stageConfig) as LeadStage[]).map(stage => {
                const col = pipelineData.find(p => p.stage === stage);
                const stageLeads = col?.leads || [];
                return (
                  <div key={stage} className="flex-shrink-0 w-64">
                    <div className={`px-3 py-2 rounded-t-lg font-medium text-sm ${stageConfig[stage].color}`}>
                      {stageConfig[stage].label} ({stageLeads.length})
                      {col?.totalValue ? <span className="ml-2 text-xs opacity-75">{col.totalValue.toLocaleString('fr-FR')} FCFA</span> : null}
                    </div>
                    <div className="space-y-2 bg-gray-50 rounded-b-lg p-2 min-h-24">
                      {stageLeads.map(lead => (
                        <div key={lead.id}
                          className="bg-white rounded-lg p-3 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                          onClick={() => { setSelectedLead(lead); setIsDetailOpen(true); }}>
                          <p className="font-medium text-sm">{lead.fullName}</p>
                          {lead.company && <p className="text-xs text-gray-500">{lead.company}</p>}
                          {lead.estimatedAmount && (
                            <p className="text-xs text-primary-600 font-medium mt-1">{lead.estimatedAmount.toLocaleString('fr-FR')} FCFA</p>
                          )}
                          {lead.probability !== undefined && (
                            <div className="mt-2 bg-gray-100 rounded-full h-1">
                              <div className="bg-primary-500 h-1 rounded-full" style={{ width: `${lead.probability}%` }} />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Liste */}
      {activeTab === 'list' && (
        <div>
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="flex-1 min-w-48 relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" placeholder="Rechercher..." value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm" />
            </div>
            <select value={stageFilter} onChange={(e) => { setStageFilter(e.target.value as any); setPage(0); }}
              className="px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm">
              <option value="">Toutes les étapes</option>
              {(Object.keys(stageConfig) as LeadStage[]).map(s => (
                <option key={s} value={s}>{stageConfig[s].label}</option>
              ))}
            </select>
          </div>
          {leadsLoading ? <div className="text-center py-8">Chargement...</div> : (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Prospect</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Intérêt</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold">Montant</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Étape</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Date clôture</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredLeads.map(lead => (
                    <tr key={lead.id} className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => { setSelectedLead(lead); setIsDetailOpen(true); }}>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium">{lead.fullName}</p>
                        {lead.company && <p className="text-xs text-gray-400">{lead.company}</p>}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{lead.interest || '—'}</td>
                      <td className="px-4 py-3 text-right text-sm font-medium">
                        {lead.estimatedAmount ? `${lead.estimatedAmount.toLocaleString('fr-FR')} FCFA` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs ${stageConfig[lead.stage]?.color}`}>
                          {stageConfig[lead.stage]?.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {lead.expectedCloseDate ? new Date(lead.expectedCloseDate).toLocaleDateString('fr-FR') : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredLeads.length === 0 && <div className="text-center py-12 text-gray-500">Aucun lead trouvé</div>}
            </div>
          )}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                className="p-2 border rounded-lg disabled:opacity-50"><ChevronLeft size={16} /></button>
              <span className="px-3 py-2 text-sm text-gray-600">Page {page + 1} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                className="p-2 border rounded-lg disabled:opacity-50"><ChevronRight size={16} /></button>
            </div>
          )}
        </div>
      )}

      {/* Création lead */}
      {activeTab === 'create' && (
        <div className="max-w-lg mx-auto bg-white rounded-xl p-6 shadow-sm space-y-4">
          <h3 className="font-semibold text-gray-900">Nouveau prospect</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom complet *</label>
              <input type="text" value={createForm.fullName}
                onChange={(e) => setCreateForm(f => ({ ...f, fullName: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={createForm.email}
                onChange={(e) => setCreateForm(f => ({ ...f, email: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
              <input type="tel" value={createForm.phone}
                onChange={(e) => setCreateForm(f => ({ ...f, phone: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Entreprise</label>
              <input type="text" value={createForm.company}
                onChange={(e) => setCreateForm(f => ({ ...f, company: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
              <select value={createForm.source} onChange={(e) => setCreateForm(f => ({ ...f, source: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white">
                <option value="">—</option>
                {['WEBSITE', 'REFERRAL', 'SOCIAL', 'EVENT', 'COLD_CALL', 'OTHER'].map(s =>
                  <option key={s} value={s}>{s}</option>
                )}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Intérêt</label>
              <input type="text" value={createForm.interest}
                onChange={(e) => setCreateForm(f => ({ ...f, interest: e.target.value }))}
                placeholder="Bureau privé, salle de réunion..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Montant estimé (FCFA)</label>
              <input type="text" inputMode="numeric"
                value={createForm.estimatedAmount === 0 ? '' : createForm.estimatedAmount}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  setCreateForm(f => ({ ...f, estimatedAmount: val === '' ? 0 : Number(val) }));
                }}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Probabilité (%)</label>
              <input type="text" inputMode="numeric"
                value={createForm.probability}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  const num = val === '' ? 0 : Math.min(100, Number(val));
                  setCreateForm(f => ({ ...f, probability: num }));
                }}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Date de clôture prévue</label>
              <input type="date" value={createForm.expectedCloseDate}
                onChange={(e) => setCreateForm(f => ({ ...f, expectedCloseDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg" />
            </div>
          </div>
          <button onClick={() => createMutation.mutate()}
            disabled={!createForm.fullName || createMutation.isPending}
            className="w-full bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2">
            {createMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <TrendingUp size={16} />}
            Créer le prospect
          </button>
        </div>
      )}

      {/* Modal Détail lead */}
      {isDetailOpen && currentLead && (
        <ModalPortal onClose={() => { setIsDetailOpen(false); setSelectedLead(null); }} size="2xl">
          <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center rounded-t-2xl">
            <div>
              <h3 className="text-xl font-bold">{currentLead.fullName}</h3>
              {currentLead.company && <p className="text-sm text-gray-500">{currentLead.company}</p>}
            </div>
            <button onClick={() => { setIsDetailOpen(false); setSelectedLead(null); }}
              className="p-1 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
          </div>
          <div className="overflow-y-auto max-h-[80vh] p-6 space-y-4">
            {actionError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm flex justify-between">
                {actionError}<button onClick={() => setActionError(null)} className="ml-2 font-bold">x</button>
              </div>
            )}

            {/* Infos */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Étape</p>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${stageConfig[currentLead.stage]?.color}`}>
                  {stageConfig[currentLead.stage]?.label}
                </span>
              </div>
              {currentLead.estimatedAmount && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Valeur estimée</p>
                  <p className="font-semibold text-primary-600">{currentLead.estimatedAmount.toLocaleString('fr-FR')} FCFA</p>
                </div>
              )}
              {currentLead.email && <div className="p-3 bg-gray-50 rounded-lg"><p className="text-xs text-gray-500">Email</p><p className="text-sm">{currentLead.email}</p></div>}
              {currentLead.phone && <div className="p-3 bg-gray-50 rounded-lg"><p className="text-xs text-gray-500">Téléphone</p><p className="text-sm">{currentLead.phone}</p></div>}
            </div>

            {/* Changer l'étape */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Changer d'étape</label>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(stageConfig) as LeadStage[]).filter(s => s !== currentLead.stage).map(stage => (
                  <button key={stage}
                    onClick={() => stageMutation.mutate({ id: currentLead.id, stage })}
                    disabled={stageMutation.isPending}
                    className={`px-2 py-1 rounded-full text-xs border disabled:opacity-50 ${stageConfig[stage].color}`}>
                    {stageConfig[stage].label}
                  </button>
                ))}
                {currentLead.stage === 'CONTACTED' && (
                  <button onClick={() => qualifyMutation.mutate(currentLead.id)}
                    disabled={qualifyMutation.isPending}
                    className="px-2 py-1 rounded-full text-xs bg-purple-600 text-white disabled:opacity-50 flex items-center gap-1">
                    <CheckCircle size={11} /> Qualifier
                  </button>
                )}
              </div>
            </div>

            {/* Convertir */}
            {!['WON', 'LOST'].includes(currentLead.stage) && (
              <button onClick={() => { setIsConvertOpen(true); setConvertForm({ ownerType: 'CUSTOMER', ownerCode: '' }); }}
                className="w-full border border-primary-600 text-primary-600 py-2 rounded-lg hover:bg-primary-50 text-sm flex items-center justify-center gap-1">
                <ArrowRightLeft size={14} /> Convertir en client
              </button>
            )}
            {currentLead.convertedOwnerCode && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm">
                <p className="text-green-700 font-medium flex items-center gap-1">
                  <CheckCircle size={14} /> Converti
                </p>
                <p className="text-xs">{currentLead.convertedOwnerType} : {currentLead.convertedOwnerCode}</p>
              </div>
            )}

            {/* Activités */}
            <div className="border-t pt-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Activités ({currentLead.activities?.length || 0})</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto mb-4">
                {(currentLead.activities || []).map(act => {
                  const ActIcon = activityIcons[act.activityType] || Calendar;
                  return (
                    <div key={act.id} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex justify-between">
                        <span className="text-xs font-medium flex items-center gap-1">
                          <ActIcon size={12} /> {activityLabels[act.activityType]} — {act.subject}
                        </span>
                        <span className="text-xs text-gray-400">{new Date(act.performedAt).toLocaleDateString('fr-FR')}</span>
                      </div>
                      {act.notes && <p className="text-xs text-gray-500 mt-1">{act.notes}</p>}
                    </div>
                  );
                })}
              </div>
              {/* Ajouter activité */}
              <div className="space-y-2 border rounded-lg p-3 bg-gray-50">
                <p className="text-xs font-medium text-gray-600">Ajouter une activité</p>
                <div className="grid grid-cols-2 gap-2">
                  <select value={activityForm.activityType}
                    onChange={(e) => setActivityForm(f => ({ ...f, activityType: e.target.value as ActivityType }))}
                    className="px-2 py-1.5 border border-gray-200 rounded-lg text-sm bg-white">
                    {activityTypes.map(t => (
                     <option key={t} value={t}>{activityLabels[t]}</option>
                    ))}
                  </select>
                  <input type="datetime-local" value={activityForm.performedAt}
                    onChange={(e) => setActivityForm(f => ({ ...f, performedAt: e.target.value }))}
                    className="px-2 py-1.5 border border-gray-200 rounded-lg text-sm" />
                </div>
                <input type="text" value={activityForm.subject} placeholder="Sujet *"
                  onChange={(e) => setActivityForm(f => ({ ...f, subject: e.target.value }))}
                  className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm" />
                <textarea value={activityForm.notes} placeholder="Notes" rows={2}
                  onChange={(e) => setActivityForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm resize-none" />
                <button onClick={() => activityMutation.mutate()}
                  disabled={!activityForm.subject || activityMutation.isPending}
                  className="w-full bg-primary-600 text-white py-1.5 rounded-lg text-sm hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-1">
                  {activityMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : 'Ajouter'}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Modal Conversion */}
      {isConvertOpen && (
        <ModalPortal onClose={() => setIsConvertOpen(false)}>
          <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center rounded-t-2xl">
            <h3 className="text-xl font-bold">Convertir le prospect</h3>
            <button onClick={() => setIsConvertOpen(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
          </div>
          <div className="p-6 space-y-4">
            <p className="text-sm text-gray-600">Associez ce prospect à un client, membre ou entreprise existant.</p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
              <select value={convertForm.ownerType} onChange={(e) => setConvertForm(f => ({ ...f, ownerType: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white">
                <option value="CUSTOMER">Customer</option>
                <option value="MEMBER">Membre</option>
                <option value="BUSINESS_ENTITY">Entreprise</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Code *</label>
              <input type="text" value={convertForm.ownerCode}
                onChange={(e) => setConvertForm(f => ({ ...f, ownerCode: e.target.value }))}
                placeholder="CUS-000001 ou MBR-000001"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg font-mono" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setIsConvertOpen(false)} className="flex-1 px-4 py-2 border rounded-lg text-gray-700">Annuler</button>
              <button onClick={() => convertMutation.mutate()}
                disabled={!convertForm.ownerCode || convertMutation.isPending}
                className="flex-1 bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2">
                {convertMutation.isPending ? <Loader2 size={15} className="animate-spin" /> : (
                  <><ArrowRightLeft size={15} /> Convertir</>
                )}
              </button>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
};