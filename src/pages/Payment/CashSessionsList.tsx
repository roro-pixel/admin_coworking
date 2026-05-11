import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Play, CheckCircle, XCircle, AlertCircle, Loader2, Wallet, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { paymentService } from '../../services/payment.service';
import type { CashSession, CashRegister } from '../../services/payment.service';
import { useAuth } from '../../contexts/AuthContext';
import { ModalPortal } from '../../components/ui/ModalPortal';

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  OPEN:            { label: 'Ouverte',  color: 'bg-green-100 text-green-700',  icon: Play          },
  CLOSING_REVIEW:  { label: 'En revue', color: 'bg-yellow-100 text-yellow-700', icon: AlertCircle   },
  CLOSED:          { label: 'Fermée',   color: 'bg-gray-100 text-gray-500',    icon: CheckCircle   },
};

const PAGE_SIZE = 20;

export const CashSessionsList: React.FC = () => {
  const { admin } = useAuth();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [registerFilter, setRegisterFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(0);

  const [isOpenModal, setIsOpenModal] = useState(false);
  const [isCloseModal, setIsCloseModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState<CashSession | null>(null);
  const [sessionSummary, setSessionSummary] = useState<CashSession | null>(null);

  const [selectedRegisterForOpen, setSelectedRegisterForOpen] = useState('');
  const [openingAmount, setOpeningAmount] = useState(0);
  const [openError, setOpenError] = useState<string | null>(null);

  const [countedAmount, setCountedAmount] = useState(0);
  const [varianceReason, setVarianceReason] = useState('');
  const [closeError, setCloseError] = useState<string | null>(null);

  const handleFilterChange = <T,>(setter: (v: T) => void, value: T) => {
    setter(value);
    setPage(0);
  };

  const { data: registersData } = useQuery({
    queryKey: ['cash-registers-list'],
    queryFn: () => paymentService.getCashRegisters({ active: true, size: 200 }),
  });

  const { data: sessionsData, isLoading } = useQuery({
    queryKey: ['cash-sessions', page, registerFilter, statusFilter],
    queryFn: () => paymentService.getCashSessions({
      registerCode: registerFilter || undefined,
      status: statusFilter || undefined,
      page,
      size: PAGE_SIZE,
    }),
  });

  const registers: CashRegister[] = registersData?.content || [];
  const sessions: CashSession[] = sessionsData?.content || [];
  const totalPages = (sessionsData as any)?.totalPages ?? 0;
  const totalElements = (sessionsData as any)?.totalElements ?? 0;

  const filteredSessions = search
    ? sessions.filter(s =>
        s.sessionNumber.toLowerCase().includes(search.toLowerCase()) ||
        s.registerCode.toLowerCase().includes(search.toLowerCase()) ||
        s.openedBy.toLowerCase().includes(search.toLowerCase())
      )
    : sessions;

  useEffect(() => {
    if (!isOpenModal) { setOpeningAmount(0); setOpenError(null); setSelectedRegisterForOpen(''); }
  }, [isOpenModal]);

  useEffect(() => {
    if (!isCloseModal) { setCountedAmount(0); setVarianceReason(''); setCloseError(null); }
  }, [isCloseModal]);

  const openSessionMutation = useMutation({
    mutationFn: () => paymentService.openCashSession({
      registerCode: selectedRegisterForOpen || registerFilter,
      openedBy: admin?.email || String(admin?.id || 'admin'),
      openingAmount: openingAmount || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash-sessions'] });
      setIsOpenModal(false);
    },
    onError: (error: any) => {
      setOpenError(error?.response?.data?.message || 'Erreur lors de l\'ouverture.');
    },
  });

  const closeSessionMutation = useMutation({
    mutationFn: () => paymentService.closeCashSession(selectedSession!.sessionNumber, {
      closedBy: admin?.email || String(admin?.id || 'admin'),
      countedClosingAmount: countedAmount,
      varianceReason: varianceReason || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash-sessions'] });
      setIsCloseModal(false);
      setSelectedSession(null);
    },
    onError: (error: any) => {
      setCloseError(error?.response?.data?.message || 'Erreur lors de la fermeture.');
    },
  });

  const requestClosingMutation = useMutation({
    mutationFn: (session: CashSession) => paymentService.requestSessionClosing(session.sessionNumber, {
      closedBy: admin?.email || String(admin?.id || 'admin'),
      countedClosingAmount: session.expectedClosingAmount,
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cash-sessions'] }),
    onError: (error: any) => alert(error?.response?.data?.message || 'Erreur lors de la demande de fermeture.'),
  });

  const approveVarianceMutation = useMutation({
    mutationFn: ({ sessionNumber, note }: { sessionNumber: string; note?: string }) =>
      paymentService.approveVariance(sessionNumber, { reviewedBy: admin?.email || 'admin', note }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cash-sessions'] }),
    onError: () => alert('Erreur lors de la validation de l\'écart.'),
  });

  const handleOpenCloseModal = async (session: CashSession) => {
    setSelectedSession(session);
    setCloseError(null);
    try {
      const summary = await paymentService.getCashSessionSummary(session.sessionNumber);
      setSessionSummary(summary);
      setCountedAmount(summary.expectedClosingAmount ?? 0);
    } catch {
      setSessionSummary(session);
      setCountedAmount(session.expectedClosingAmount ?? 0);
    }
    setIsCloseModal(true);
  };

  const currentSummary = sessionSummary || selectedSession;
  const hasVariance = currentSummary && countedAmount !== (currentSummary.expectedClosingAmount ?? 0);

  if (isLoading) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Sessions de caisse</h2>
        <button
          onClick={() => setIsOpenModal(true)}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center gap-2"
        >
          <Play size={18} />
          Ouvrir une session
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Rechercher une session..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg" />
        </div>
        <select value={registerFilter}
          onChange={(e) => handleFilterChange(setRegisterFilter, e.target.value)}
          className="px-4 py-2 border border-gray-200 rounded-lg bg-white">
          <option value="">Toutes les caisses</option>
          {registers.map(reg => (
            <option key={reg.registerCode} value={reg.registerCode}>{reg.name}</option>
          ))}
        </select>
        <select value={statusFilter}
          onChange={(e) => handleFilterChange(setStatusFilter, e.target.value)}
          className="px-4 py-2 border border-gray-200 rounded-lg bg-white">
          <option value="">Tous les statuts</option>
          <option value="OPEN">Ouvertes</option>
          <option value="CLOSING_REVIEW">En revue</option>
          <option value="CLOSED">Fermées</option>
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold">Session</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Caisse</th>
              <th className="px-6 py-3 text-right text-sm font-semibold">Ouverture</th>
              <th className="px-6 py-3 text-right text-sm font-semibold">Paiements</th>
              <th className="px-6 py-3 text-right text-sm font-semibold">Attendu</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Statut</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Ouvert par</th>
              <th className="px-6 py-3 text-center text-sm font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredSessions.map((session) => {
              const status = statusConfig[session.status];
              const StatusIcon = status?.icon;
              return (
                <tr key={session.sessionNumber} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-mono">{session.sessionNumber}</td>
                  <td className="px-6 py-4 text-sm">{session.registerCode}</td>
                  <td className="px-6 py-4 text-right text-sm">{(session.openingAmount ?? 0).toLocaleString('fr-FR')} FCFA</td>
                  <td className="px-6 py-4 text-right text-sm">{(session.totalPayments ?? 0).toLocaleString('fr-FR')} FCFA</td>
                  <td className="px-6 py-4 text-right text-sm font-semibold">{(session.expectedClosingAmount ?? 0).toLocaleString('fr-FR')} FCFA</td>
                  <td className="px-6 py-4">
                    {status && (
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${status.color}`}>
                        <StatusIcon size={12} />
                        {status.label}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm">{session.openedBy}</td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex justify-center gap-1">
                      {session.status === 'OPEN' && (
                        <>
                          <button onClick={() => handleOpenCloseModal(session)}
                            className="p-1 text-red-600 hover:text-red-800" title="Fermer la session (comptage)">
                            <XCircle size={18} />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Demander la fermeture de ${session.sessionNumber} avec le montant attendu (${(session.expectedClosingAmount ?? 0).toLocaleString('fr-FR')} FCFA) ?`)) {
                                requestClosingMutation.mutate(session);
                              }
                            }}
                            disabled={requestClosingMutation.isPending}
                            className="px-2 py-1 text-xs bg-amber-100 text-amber-700 hover:bg-amber-200 rounded disabled:opacity-40"
                            title="Demande de fermeture rapide (sans comptage)"
                          >
                            Clôture rapide
                          </button>
                        </>
                      )}
                      {session.status === 'CLOSING_REVIEW' && (
                        <button
                          onClick={() => {
                            if (confirm(`Valider l'écart pour la session ${session.sessionNumber} ?`)) {
                              approveVarianceMutation.mutate({ sessionNumber: session.sessionNumber });
                            }
                          }}
                          disabled={approveVarianceMutation.isPending}
                          className="p-1 text-green-600 hover:text-green-800 disabled:opacity-40"
                          title="Approuver l'écart"
                        >
                          <CheckCircle size={18} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filteredSessions.length === 0 && !isLoading && (
        <div className="text-center py-12 bg-white rounded-xl">
          <Wallet size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">Aucune session trouvée</p>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 px-2">
          <p className="text-sm text-gray-500">{totalElements} session{totalElements > 1 ? 's' : ''}</p>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
              className="p-1.5 border rounded-lg disabled:opacity-50 hover:bg-gray-50"><ChevronLeft size={16} /></button>
            <span className="text-sm self-center">Page {page + 1} / {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
              className="p-1.5 border rounded-lg disabled:opacity-50 hover:bg-gray-50"><ChevronRight size={16} /></button>
          </div>
        </div>
      )}

      {/* Modal ouverture session */}
      {isOpenModal && (
        <ModalPortal onClose={() => setIsOpenModal(false)}>
          <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center rounded-t-2xl">
            <h3 className="text-xl font-bold">Ouvrir une session de caisse</h3>
            <button onClick={() => setIsOpenModal(false)} className="p-1 hover:bg-gray-100 rounded-lg">
              <X size={20} />
            </button>
          </div>
          <div className="p-6 space-y-4">
            {openError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">{openError}</div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Caisse *</label>
              <select value={selectedRegisterForOpen || registerFilter}
                onChange={(e) => setSelectedRegisterForOpen(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg">
                <option value="">Sélectionner une caisse</option>
                {registers.map(reg => (
                  <option key={reg.registerCode} value={reg.registerCode}>{reg.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fond de caisse initial (FCFA)</label>
              <input
  type="text"
  inputMode="numeric"
  value={openingAmount === 0 ? '' : openingAmount}
  onChange={(e) => {
    const val = e.target.value.replace(/\D/g, '');
    setOpeningAmount(val === '' ? 0 : parseInt(val));
  }}
  placeholder="0"
  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
/>
              <p className="text-xs text-gray-400 mt-1">Si &gt; 0, un mouvement OPENING_FLOAT est créé automatiquement</p>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setIsOpenModal(false)} disabled={openSessionMutation.isPending}
                className="flex-1 px-4 py-2 border rounded-lg text-gray-700 disabled:opacity-50">Annuler</button>
              <button onClick={() => openSessionMutation.mutate()}
                disabled={openSessionMutation.isPending || !(selectedRegisterForOpen || registerFilter)}
                className="flex-1 bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2">
                {openSessionMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : 'Ouvrir'}
              </button>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Modal fermeture session */}
      {isCloseModal && currentSummary && (
        <ModalPortal onClose={() => setIsCloseModal(false)}>
          <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center rounded-t-2xl">
            <h3 className="text-xl font-bold">Fermer la session</h3>
            <button onClick={() => setIsCloseModal(false)} className="p-1 hover:bg-gray-100 rounded-lg">
              <X size={20} />
            </button>
          </div>
          <div className="p-6 space-y-4">
            {closeError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">{closeError}</div>
            )}
            <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-xs text-gray-500">Fond initial</p>
                <p className="font-medium">{(currentSummary.openingAmount ?? 0).toLocaleString('fr-FR')} FCFA</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Paiements</p>
                <p className="font-medium text-green-700">+{(currentSummary.totalPayments ?? 0).toLocaleString('fr-FR')} FCFA</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Remboursements</p>
                <p className="font-medium text-red-600">-{(currentSummary.totalRefunds ?? 0).toLocaleString('fr-FR')} FCFA</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Sorties caisse</p>
                <p className="font-medium text-red-600">-{(currentSummary.totalCashOut ?? 0).toLocaleString('fr-FR')} FCFA</p>
              </div>
              <div className="col-span-2 pt-2 border-t">
                <p className="text-xs text-gray-500">Montant attendu</p>
                <p className="text-lg font-bold">{(currentSummary.expectedClosingAmount ?? 0).toLocaleString('fr-FR')} FCFA</p>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Montant compté physiquement (FCFA) *</label>
<input
  type="text"
  inputMode="numeric"
  value={countedAmount === 0 ? '' : countedAmount}
  onChange={(e) => {
    const val = e.target.value.replace(/\D/g, '');
    setCountedAmount(val === '' ? 0 : parseInt(val));
  }}
  required
  placeholder="0"
  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-lg font-semibold"
/>
            </div>
            {hasVariance && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-sm font-medium text-amber-800">
                  Écart détecté : {(countedAmount - (currentSummary.expectedClosingAmount ?? 0)).toLocaleString('fr-FR')} FCFA
                </p>
                <p className="text-xs text-amber-600 mt-1">La session passera en "En revue" et nécessitera une validation manager</p>
              </div>
            )}
            {hasVariance && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Motif de l'écart *</label>
                <textarea value={varianceReason} onChange={(e) => setVarianceReason(e.target.value)}
                  rows={2} required placeholder="Expliquez la raison de l'écart..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg resize-none" />
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <button onClick={() => setIsCloseModal(false)} disabled={closeSessionMutation.isPending}
                className="flex-1 px-4 py-2 border rounded-lg text-gray-700 disabled:opacity-50">Annuler</button>
              <button onClick={() => closeSessionMutation.mutate()}
                disabled={closeSessionMutation.isPending || (!!hasVariance && !varianceReason)}
                className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2">
                {closeSessionMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : 'Fermer la session'}
              </button>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
};