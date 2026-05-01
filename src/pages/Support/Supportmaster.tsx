import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Send, Clock, CheckCircle, AlertTriangle, X, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { operationsService } from '../../services/operations.service';
import type { SupportTicket, TicketStatus, TicketPriority, TicketCategory } from '../../services/operations.service';
import { useAuth } from '../../contexts/AuthContext';
import { ModalPortal } from '../../components/ui/ModalPortal';

const statusConfig: Record<TicketStatus, { label: string; color: string }> = {
  OPEN:           { label: 'Ouvert',          color: 'bg-red-100 text-red-700' },
  IN_PROGRESS:    { label: 'En cours',        color: 'bg-blue-100 text-blue-700' },
  WAITING_CLIENT: { label: 'Attente client',  color: 'bg-yellow-100 text-yellow-700' },
  RESOLVED:       { label: 'Résolu',          color: 'bg-green-100 text-green-700' },
  CLOSED:         { label: 'Fermé',           color: 'bg-gray-100 text-gray-600' },
};

const priorityConfig: Record<TicketPriority, { label: string; color: string }> = {
  LOW:    { label: 'Faible',  color: 'bg-gray-100 text-gray-600' },
  MEDIUM: { label: 'Moyen',   color: 'bg-blue-100 text-blue-700' },
  HIGH:   { label: 'Élevé',   color: 'bg-orange-100 text-orange-700' },
  URGENT: { label: 'Urgent',  color: 'bg-red-100 text-red-700' },
};

const categories: TicketCategory[] = ['BILLING', 'BOOKING', 'ACCESS', 'TECHNICAL', 'OTHER'];
const categoryLabels: Record<TicketCategory, string> = {
  BILLING: 'Facturation', BOOKING: 'Réservation', ACCESS: 'Accès', TECHNICAL: 'Technique', OTHER: 'Autre',
};

export const SupportMaster: React.FC = () => {
  const { admin } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = useState<TicketStatus | ''>('');
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority | ''>('');
  const [page, setPage] = useState(0);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [messageContent, setMessageContent] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const [createForm, setCreateForm] = useState({
    title: '', description: '', priority: 'MEDIUM' as TicketPriority,
    category: 'OTHER' as TicketCategory, ownerType: '', ownerCode: '',
    contactName: '', contactEmail: '', contactPhone: '',
    relatedType: '', relatedCode: '',
  });

  useEffect(() => {
    if (!isCreateOpen) return;
    setCreateForm({ title: '', description: '', priority: 'MEDIUM', category: 'OTHER',
      ownerType: '', ownerCode: '', contactName: '', contactEmail: '', contactPhone: '',
      relatedType: '', relatedCode: '' });
    setActionError(null);
  }, [isCreateOpen]);

  const { data: ticketsData, isLoading } = useQuery({
    queryKey: ['support-tickets', statusFilter, priorityFilter, page],
    queryFn: () => operationsService.getTickets({
      status: statusFilter || undefined,
      priority: priorityFilter || undefined,
      page, size: 20,
    }),
  });

  const { data: metrics } = useQuery({
    queryKey: ['support-metrics'],
    queryFn: () => operationsService.getTicketMetrics(),
  });

  const { data: ticketDetail, refetch: refetchDetail } = useQuery({
    queryKey: ['support-ticket', selectedTicket?.ticketNumber],
    queryFn: () => operationsService.getTicket(selectedTicket!.ticketNumber),
    enabled: !!selectedTicket && isDetailOpen,
  });

  const tickets = ticketsData?.content || [];
  const totalPages = ticketsData?.totalPages ?? 0;

  const filteredTickets = debouncedSearch
    ? tickets.filter(t => t.title.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        t.ticketNumber.toLowerCase().includes(debouncedSearch.toLowerCase()))
    : tickets;

  const createMutation = useMutation({
    mutationFn: () => operationsService.createTicket(createForm),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['support-metrics'] });
      setIsCreateOpen(false);
    },
    onError: (e: any) => setActionError(e?.response?.data?.message || 'Erreur création ticket'),
  });

  const statusMutation = useMutation({
    mutationFn: ({ ticketNumber, status }: { ticketNumber: string; status: TicketStatus }) =>
      operationsService.updateTicketStatus(ticketNumber, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
      refetchDetail();
    },
    onError: (e: any) => setActionError(e?.response?.data?.message || 'Erreur changement statut'),
  });

  const messageMutation = useMutation({
    mutationFn: () => operationsService.addTicketMessage(selectedTicket!.ticketNumber, {
      authorId: admin?.email || 'admin',
      authorName: admin?.email || 'Admin',
      content: messageContent,
    }),
    onSuccess: () => { refetchDetail(); setMessageContent(''); },
    onError: (e: any) => setActionError(e?.response?.data?.message || 'Erreur envoi message'),
  });

  const currentTicket = ticketDetail || selectedTicket;

  return (
    <div>
      {/* Métriques */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Ouverts', value: metrics.totalOpen, color: 'text-red-600' },
            { label: 'En cours', value: metrics.totalInProgress, color: 'text-blue-600' },
            { label: 'Résolus', value: metrics.totalResolved, color: 'text-green-600' },
            { label: 'SLA dépassés', value: metrics.slaBreached, color: 'text-orange-600' },
          ].map(m => (
            <div key={m.label} className="bg-white rounded-xl p-4 shadow-sm">
              <p className={`text-2xl font-bold ${m.color}`}>{m.value}</p>
              <p className="text-sm text-gray-500">{m.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-900">Tickets support</h2>
        <button onClick={() => setIsCreateOpen(true)}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center gap-2">
          <Plus size={18} /> Nouveau ticket
        </button>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex-1 min-w-48 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Rechercher..." value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm" />
        </div>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value as any); setPage(0); }}
          className="px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm">
          <option value="">Tous les statuts</option>
          {(Object.keys(statusConfig) as TicketStatus[]).map(s => (
            <option key={s} value={s}>{statusConfig[s].label}</option>
          ))}
        </select>
        <select value={priorityFilter} onChange={(e) => { setPriorityFilter(e.target.value as any); setPage(0); }}
          className="px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm">
          <option value="">Toutes priorités</option>
          {(Object.keys(priorityConfig) as TicketPriority[]).map(p => (
            <option key={p} value={p}>{priorityConfig[p].label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      {isLoading ? <div className="text-center py-8">Chargement...</div> : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">Ticket</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Titre</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Catégorie</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Priorité</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Statut</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredTickets.map(ticket => (
                <tr key={ticket.ticketNumber} className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => { setSelectedTicket(ticket); setIsDetailOpen(true); }}>
                  <td className="px-4 py-3 text-sm font-mono">{ticket.ticketNumber}</td>
                  <td className="px-4 py-3 text-sm font-medium">{ticket.title}</td>
                  <td className="px-4 py-3 text-sm">{categoryLabels[ticket.category] || ticket.category}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${priorityConfig[ticket.priority]?.color}`}>
                      {priorityConfig[ticket.priority]?.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${statusConfig[ticket.status]?.color}`}>
                      {statusConfig[ticket.status]?.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(ticket.createdAt).toLocaleDateString('fr-FR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredTickets.length === 0 && (
            <div className="text-center py-12 text-gray-500">Aucun ticket trouvé</div>
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
            className="p-2 border rounded-lg disabled:opacity-50"><ChevronLeft size={16} /></button>
          <span className="px-3 py-2 text-sm text-gray-600">Page {page + 1} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
            className="p-2 border rounded-lg disabled:opacity-50"><ChevronRight size={16} /></button>
        </div>
      )}

      {/* Modal Création */}
      {isCreateOpen && (
        <ModalPortal onClose={() => setIsCreateOpen(false)}>
          <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center rounded-t-2xl">
            <h3 className="text-xl font-bold">Nouveau ticket</h3>
            <button onClick={() => setIsCreateOpen(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
          </div>
          <div className="overflow-y-auto max-h-[80vh] p-6 space-y-4">
            {actionError && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">{actionError}</div>}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Titre *</label>
              <input type="text" value={createForm.title}
                onChange={(e) => setCreateForm(f => ({ ...f, title: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
              <textarea value={createForm.description} rows={3}
                onChange={(e) => setCreateForm(f => ({ ...f, description: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priorité</label>
                <select value={createForm.priority}
                  onChange={(e) => setCreateForm(f => ({ ...f, priority: e.target.value as TicketPriority }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white">
                  {(Object.keys(priorityConfig) as TicketPriority[]).map(p => (
                    <option key={p} value={p}>{priorityConfig[p].label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
                <select value={createForm.category}
                  onChange={(e) => setCreateForm(f => ({ ...f, category: e.target.value as TicketCategory }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white">
                  {categories.map(c => <option key={c} value={c}>{categoryLabels[c]}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type propriétaire</label>
                <select value={createForm.ownerType}
                  onChange={(e) => setCreateForm(f => ({ ...f, ownerType: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white">
                  <option value="">Aucun</option>
                  <option value="MEMBER">Membre</option>
                  <option value="CUSTOMER">Customer</option>
                  <option value="BUSINESS_ENTITY">Entreprise</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Code propriétaire</label>
                <input type="text" value={createForm.ownerCode}
                  onChange={(e) => setCreateForm(f => ({ ...f, ownerCode: e.target.value }))}
                  placeholder="MBR-000001"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact</label>
                <input type="text" value={createForm.contactName}
                  onChange={(e) => setCreateForm(f => ({ ...f, contactName: e.target.value }))}
                  placeholder="Nom"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" value={createForm.contactEmail}
                  onChange={(e) => setCreateForm(f => ({ ...f, contactEmail: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                <input type="tel" value={createForm.contactPhone}
                  onChange={(e) => setCreateForm(f => ({ ...f, contactPhone: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg" />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setIsCreateOpen(false)} disabled={createMutation.isPending}
                className="flex-1 px-4 py-2 border rounded-lg text-gray-700 disabled:opacity-50">Annuler</button>
              <button onClick={() => createMutation.mutate()}
                disabled={!createForm.title || !createForm.description || createMutation.isPending}
                className="flex-1 bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2">
                {createMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : 'Créer'}
              </button>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Modal Détail */}
      {isDetailOpen && currentTicket && (
        <ModalPortal onClose={() => { setIsDetailOpen(false); setSelectedTicket(null); }}>
          <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center rounded-t-2xl">
            <div>
              <h3 className="text-xl font-bold">{currentTicket.ticketNumber}</h3>
              <p className="text-sm text-gray-500">{currentTicket.title}</p>
            </div>
            <button onClick={() => { setIsDetailOpen(false); setSelectedTicket(null); }}
              className="p-1 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
          </div>
          <div className="overflow-y-auto max-h-[80vh] p-6 space-y-4">
            {actionError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm flex justify-between">
                {actionError}
                <button onClick={() => setActionError(null)} className="underline ml-2">×</button>
              </div>
            )}

            {/* Infos + actions statut */}
            <div className="flex flex-wrap gap-2 items-center">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${priorityConfig[currentTicket.priority]?.color}`}>
                {priorityConfig[currentTicket.priority]?.label}
              </span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusConfig[currentTicket.status]?.color}`}>
                {statusConfig[currentTicket.status]?.label}
              </span>
              <span className="text-xs text-gray-400">{categoryLabels[currentTicket.category]}</span>
              {currentTicket.assignedTo && <span className="text-xs text-gray-500">Agent: {currentTicket.assignedTo}</span>}
            </div>

            {/* Actions de statut */}
            <div className="flex flex-wrap gap-2">
              {currentTicket.status === 'OPEN' && (
                <button onClick={() => statusMutation.mutate({ ticketNumber: currentTicket.ticketNumber, status: 'IN_PROGRESS' })}
                  disabled={statusMutation.isPending}
                  className="px-3 py-1 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  Prendre en charge
                </button>
              )}
              {['OPEN', 'IN_PROGRESS'].includes(currentTicket.status) && (
                <button onClick={() => statusMutation.mutate({ ticketNumber: currentTicket.ticketNumber, status: 'WAITING_CLIENT' })}
                  disabled={statusMutation.isPending}
                  className="px-3 py-1 bg-yellow-500 text-white text-xs rounded-lg hover:bg-yellow-600 disabled:opacity-50">
                  Attente client
                </button>
              )}
              {['OPEN', 'IN_PROGRESS', 'WAITING_CLIENT'].includes(currentTicket.status) && (
                <button onClick={() => statusMutation.mutate({ ticketNumber: currentTicket.ticketNumber, status: 'RESOLVED' })}
                  disabled={statusMutation.isPending}
                  className="px-3 py-1 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 disabled:opacity-50">
                  <CheckCircle size={12} className="inline mr-1" />Résoudre
                </button>
              )}
              {currentTicket.status === 'RESOLVED' && (
                <button onClick={() => statusMutation.mutate({ ticketNumber: currentTicket.ticketNumber, status: 'CLOSED' })}
                  disabled={statusMutation.isPending}
                  className="px-3 py-1 bg-gray-600 text-white text-xs rounded-lg hover:bg-gray-700 disabled:opacity-50">
                  Fermer
                </button>
              )}
            </div>

            {/* SLA */}
            {(currentTicket.firstResponseDueAt || currentTicket.resolutionDueAt) && (
              <div className="p-3 bg-orange-50 border border-orange-100 rounded-lg text-xs space-y-1">
                {currentTicket.firstResponseDueAt && (
                  <p><Clock size={12} className="inline mr-1 text-orange-500" />
                    Première réponse due : {new Date(currentTicket.firstResponseDueAt).toLocaleString('fr-FR')}
                  </p>
                )}
                {currentTicket.resolutionDueAt && (
                  <p><AlertTriangle size={12} className="inline mr-1 text-orange-500" />
                    Résolution due : {new Date(currentTicket.resolutionDueAt).toLocaleString('fr-FR')}
                  </p>
                )}
              </div>
            )}

            {/* Description */}
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-700">{currentTicket.description}</p>
            </div>

            {/* Messages timeline */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Messages ({currentTicket.messages?.length || 0})</h4>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {(currentTicket.messages || []).map(msg => (
                  <div key={msg.id} className="p-3 bg-blue-50 rounded-lg">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-medium text-blue-700">{msg.authorName}</span>
                      <span className="text-xs text-gray-400">{new Date(msg.createdAt).toLocaleString('fr-FR')}</span>
                    </div>
                    <p className="text-sm text-gray-700">{msg.content}</p>
                  </div>
                ))}
                {(currentTicket.messages || []).length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-4">Aucun message</p>
                )}
              </div>
            </div>

            {/* Répondre */}
            {!['CLOSED', 'RESOLVED'].includes(currentTicket.status) && (
              <div className="border-t pt-4">
                <textarea value={messageContent} onChange={(e) => setMessageContent(e.target.value)}
                  rows={3} placeholder="Votre réponse..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg resize-none text-sm" />
                <button onClick={() => messageMutation.mutate()}
                  disabled={!messageContent.trim() || messageMutation.isPending}
                  className="mt-2 w-full bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2">
                  {messageMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  Envoyer
                </button>
              </div>
            )}
          </div>
        </ModalPortal>
      )}
    </div>
  );
};