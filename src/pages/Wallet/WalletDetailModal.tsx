import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  X, TrendingUp, TrendingDown, Clock, Wallet as WalletIcon,
  ChevronLeft, ChevronRight, Plus, CheckCircle, XCircle, Loader2,
} from 'lucide-react';
import { walletService } from '../../services/wallet.service';
import type { Wallet, LedgerEntry, WalletHold } from '../../services/wallet.service';
import { ModalPortal } from '../../components/ui/ModalPortal';
import { useAuth } from '../../contexts/AuthContext';

interface WalletDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  wallet: Wallet;
}

const entryTypeLabels: Record<string, string> = {
  ADMIN_TOPUP:         'Top-up admin',
  ADMIN_DEBIT:         'Débit admin',
  PAYMENT:             'Paiement',
  REFUND:              'Remboursement',
  REVERSAL:            'Inversion',
  HOLD:                'Réservation',
  HOLD_RELEASE:        'Libération réservation',
  ADJUSTMENT:          'Ajustement',
  CASHBACK:            'Cashback',
  PROMOTIONAL_CREDIT:  'Crédit promotionnel',
  OVERPAYMENT_CREDIT:  'Trop-perçu',
};

const holdStatusConfig: Record<string, { label: string; color: string }> = {
  ACTIVE:   { label: 'Actif',    color: 'bg-blue-100 text-blue-700'   },
  CAPTURED: { label: 'Capturé', color: 'bg-green-100 text-green-700'  },
  RELEASED: { label: 'Libéré',  color: 'bg-gray-100 text-gray-500'    },
  EXPIRED:  { label: 'Expiré',  color: 'bg-red-100 text-red-700'      },
};

const PAGE_SIZE = 20;

const buildDefaultHoldForm = () => ({
  amount: 0,
  sourceType: 'BOOKING',
  sourceCode: '',
  expiresAt: (() => {
    const d = new Date();
    d.setHours(d.getHours() + 24);
    return d.toISOString().slice(0, 16);
  })(),
});

export const WalletDetailModal: React.FC<WalletDetailModalProps> = ({ isOpen, onClose, wallet }) => {
  const { admin } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'ledger' | 'holds'>('ledger');
  const [page, setPage] = useState(0);
  const [isCreateHoldOpen, setIsCreateHoldOpen] = useState(false);
  const [holdForm, setHoldForm] = useState(buildDefaultHoldForm);
  const [holdError, setHoldError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (isCreateHoldOpen) {
      setHoldForm(buildDefaultHoldForm());
      setHoldError(null);
    }
  }, [isCreateHoldOpen]);

  useEffect(() => {
    setPage(0);
  }, [activeTab]);

  const { data: ledgerData, isLoading: ledgerLoading } = useQuery({
    queryKey: ['wallet-ledger', wallet.walletNumber, page],
    queryFn: () => walletService.getLedgerEntries(wallet.walletNumber, {
      page,
      size: PAGE_SIZE,
      sort: 'createdAt,desc',
    }),
    enabled: isOpen && activeTab === 'ledger',
  });

  const { data: holdsData, isLoading: holdsLoading } = useQuery({
    queryKey: ['wallet-holds', wallet.walletNumber],
    queryFn: () => walletService.getWalletHolds(wallet.walletNumber, { size: 100 }),
    enabled: isOpen && activeTab === 'holds',
  });

  const ledgerEntries: LedgerEntry[] = ledgerData?.content || [];
  const totalElements = ledgerData?.totalElements ?? 0;
  const totalPages    = ledgerData?.totalPages    ?? Math.ceil(totalElements / PAGE_SIZE);
  const holds: WalletHold[] = holdsData?.content || [];

  const invalidateWallet = () => {
    queryClient.invalidateQueries({ queryKey: ['wallet-holds', wallet.walletNumber] });
    queryClient.invalidateQueries({ queryKey: ['wallet-ledger', wallet.walletNumber] });
    queryClient.invalidateQueries({ queryKey: ['wallets'] });
  };

  // createHold
  const createHoldMutation = useMutation({
    mutationFn: () => walletService.createHold({
      walletNumber: wallet.walletNumber,
      amount: holdForm.amount,
      sourceType: holdForm.sourceType,
      sourceCode: holdForm.sourceCode,
      expiresAt: new Date(holdForm.expiresAt).toISOString(),
      createdBy: admin?.email || 'admin',
    }),
    onSuccess: () => {
      invalidateWallet();
      setIsCreateHoldOpen(false);
      setHoldError(null);
    },
    onError: (error: any) => {
      setHoldError(error?.response?.data?.message || 'Erreur lors de la création du hold.');
    },
  });

  // captureHold
  const captureMutation = useMutation({
    mutationFn: (holdNumber: string) =>
      walletService.captureHold(holdNumber, admin?.email || 'admin'),
    onSuccess: () => { invalidateWallet(); setActionError(null); },
    onError: (error: any) => {
      setActionError(error?.response?.data?.message || 'Erreur lors de la capture du hold.');
    },
  });

  // releaseHold
  const releaseMutation = useMutation({
    mutationFn: (holdNumber: string) =>
      walletService.releaseHold(holdNumber, admin?.email || 'admin'),
    onSuccess: () => { invalidateWallet(); setActionError(null); },
    onError: (error: any) => {
      setActionError(error?.response?.data?.message || 'Erreur lors de la libération du hold.');
    },
  });

  const anyPending = captureMutation.isPending || releaseMutation.isPending;

  if (!isOpen) return null;

  return (
    <ModalPortal onClose={onClose}>
      {/* Header */}
      <div className="border-b p-4 flex justify-between items-center sticky top-0 bg-white rounded-t-2xl">
        <div>
          <h3 className="text-xl font-bold">{wallet.walletNumber}</h3>
          <p className="text-sm text-gray-500">{wallet.ownerType} · {wallet.ownerCode}</p>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
      </div>

      {/* Soldes */}
      <div className="grid grid-cols-3 gap-3 p-4 border-b bg-gray-50">
        <div className="text-center p-2 bg-white rounded-lg">
          <p className="text-xs text-gray-500 mb-1">Solde disponible</p>
          <p className="text-lg font-bold text-green-600">
            {wallet.availableBalance.toLocaleString('fr-FR')} {wallet.currency}
          </p>
        </div>
        <div className="text-center p-2 bg-white rounded-lg">
          <p className="text-xs text-gray-500 mb-1">Solde bloqué</p>
          <p className="text-lg font-bold text-orange-600">
            {wallet.heldBalance.toLocaleString('fr-FR')} {wallet.currency}
          </p>
        </div>
        <div className="text-center p-2 bg-white rounded-lg">
          <p className="text-xs text-gray-500 mb-1">Solde ledger</p>
          <p className="text-lg font-bold text-gray-900">
            {wallet.ledgerBalance.toLocaleString('fr-FR')} {wallet.currency}
          </p>
        </div>
      </div>

      {/* Onglets */}
      <div className="border-b border-gray-200 px-6">
        <div className="flex space-x-6">
          <button onClick={() => setActiveTab('ledger')}
            className={`py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'ledger' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            Historique ({totalElements})
          </button>
          <button onClick={() => setActiveTab('holds')}
            className={`py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'holds' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            Holds ({holds.length})
          </button>
        </div>
      </div>

      <div className="p-6">
        {actionError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm mb-4 flex justify-between">
            {actionError}
            <button onClick={() => setActionError(null)} className="underline text-xs ml-2">Fermer</button>
          </div>
        )}

        {/* Onglet Ledger */}
        {activeTab === 'ledger' && (
          <>
            {ledgerLoading ? (
              <div className="text-center py-8 text-gray-400">Chargement...</div>
            ) : ledgerEntries.length === 0 ? (
              <div className="text-center py-8">
                <WalletIcon size={40} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500 text-sm">Aucune transaction</p>
              </div>
            ) : (
              <div className="space-y-2">
                {ledgerEntries.map((entry) => (
                  <div key={entry.entryNumber} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      {entry.direction === 'CREDIT'
                        ? <TrendingUp size={15} className="text-green-600 flex-shrink-0" />
                        : <TrendingDown size={15} className="text-red-600 flex-shrink-0" />}
                      <div>
                        <p className="font-medium text-sm">{entryTypeLabels[entry.entryType] || entry.entryType}</p>
                        <p className="text-xs text-gray-500">
                          {entry.sourceCode && <span className="font-mono">{entry.sourceCode} · </span>}
                          {new Date(entry.createdAt).toLocaleString('fr-FR')}
                        </p>
                        {entry.reference && (
                          <p className="text-xs text-gray-400">Réf: {entry.reference}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={`font-semibold text-sm ${entry.direction === 'CREDIT' ? 'text-green-600' : 'text-red-600'}`}>
                        {entry.direction === 'CREDIT' ? '+' : '-'}{entry.amount.toLocaleString('fr-FR')} {entry.currency}
                      </p>
                      <p className="text-xs text-gray-400">→ {entry.balanceAfter.toLocaleString('fr-FR')}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination ledger */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-gray-500">Page {page + 1} / {totalPages}</p>
                <div className="flex gap-2">
                  <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                    className="p-1.5 border rounded-lg disabled:opacity-50"><ChevronLeft size={15} /></button>
                  <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                    className="p-1.5 border rounded-lg disabled:opacity-50"><ChevronRight size={15} /></button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Onglet Holds */}
        {activeTab === 'holds' && (
          <>
            <div className="flex justify-between items-center mb-4">
              <p className="text-sm text-gray-600">Réservations de fonds sur ce portefeuille</p>
              {/* CORRECTION : bouton créer un hold */}
              <button onClick={() => setIsCreateHoldOpen(true)}
                className="px-3 py-1.5 bg-primary-600 text-white rounded-lg text-sm flex items-center gap-1 hover:bg-primary-700">
                <Plus size={14} /> Nouveau hold
              </button>
            </div>

            {holdsLoading ? (
              <div className="text-center py-8 text-gray-400">Chargement...</div>
            ) : holds.length === 0 ? (
              <div className="text-center py-8">
                <Clock size={40} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500 text-sm">Aucun hold actif</p>
              </div>
            ) : (
              <div className="space-y-3">
                {holds.map((hold) => {
                  const hs = holdStatusConfig[hold.status];
                  const isActive = hold.status === 'ACTIVE';
                  const isExpired = new Date(hold.expiresAt) < new Date();
                  return (
                    <div key={hold.holdNumber} className={`border rounded-xl p-4 ${!isActive ? 'opacity-60' : ''}`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-mono text-sm font-medium">{hold.holdNumber}</p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {hold.sourceType} · {hold.sourceCode}
                          </p>
                          <p className={`text-xs mt-0.5 ${isExpired && isActive ? 'text-red-500' : 'text-gray-400'}`}>
                            Expire : {new Date(hold.expiresAt).toLocaleString('fr-FR')}
                            {isExpired && isActive && ' (expiré)'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-orange-600">
                            {hold.amount.toLocaleString('fr-FR')} {wallet.currency}
                          </p>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${hs?.color || 'bg-gray-100 text-gray-500'}`}>
                            {hs?.label || hold.status}
                          </span>
                        </div>
                      </div>

                      {/* CORRECTION : boutons capture et release sur holds ACTIVE */}
                      {isActive && (
                        <div className="flex gap-2 mt-3 pt-3 border-t">
                          <button
                            onClick={() => {
                              if (confirm(`Capturer le hold ${hold.holdNumber} (débit définitif de ${hold.amount.toLocaleString('fr-FR')} ${wallet.currency}) ?`)) {
                                captureMutation.mutate(hold.holdNumber);
                              }
                            }}
                            disabled={anyPending}
                            className="flex-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs flex items-center justify-center gap-1 disabled:opacity-50 hover:bg-green-700"
                          >
                            {captureMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                            Capturer
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Libérer le hold ${hold.holdNumber} (remettre ${hold.amount.toLocaleString('fr-FR')} ${wallet.currency} dans le solde disponible) ?`)) {
                                releaseMutation.mutate(hold.holdNumber);
                              }
                            }}
                            disabled={anyPending}
                            className="flex-1 px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg text-xs flex items-center justify-center gap-1 disabled:opacity-50 hover:bg-gray-300"
                          >
                            {releaseMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />}
                            Libérer
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Formulaire créer un hold */}
            {isCreateHoldOpen && (
              <div className="mt-4 border rounded-xl p-4 bg-blue-50 space-y-3">
                <p className="text-sm font-semibold text-blue-800">Nouveau hold</p>
                {holdError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs">{holdError}</div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Montant (FCFA) *</label>
                    <input
  type="text"
  inputMode="decimal"
  value={holdForm.amount === 0 ? '' : holdForm.amount}
  onChange={(e) => {
    const val = e.target.value.replace(/[^\d.]/g, '');
    setHoldForm({ ...holdForm, amount: val === '' ? 0 : parseFloat(val) });
  }}
  placeholder="0"
  className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm bg-white"
/>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Type de source</label>
                    <select value={holdForm.sourceType}
                      onChange={(e) => setHoldForm({ ...holdForm, sourceType: e.target.value })}
                      className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm bg-white">
                      <option value="BOOKING">Réservation</option>
                      <option value="PAYMENT">Paiement</option>
                      <option value="CAUTION">Caution</option>
                      <option value="SUBSCRIPTION">Abonnement</option>
                      <option value="OTHER">Autre</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Code source *</label>
                    <input type="text" value={holdForm.sourceCode} placeholder="BKG-000001"
                      onChange={(e) => setHoldForm({ ...holdForm, sourceCode: e.target.value })}
                      className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm bg-white" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Expiration *</label>
                    <input type="datetime-local" value={holdForm.expiresAt}
                      onChange={(e) => setHoldForm({ ...holdForm, expiresAt: e.target.value })}
                      className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm bg-white" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setIsCreateHoldOpen(false)} disabled={createHoldMutation.isPending}
                    className="flex-1 px-3 py-1.5 border rounded-lg text-xs text-gray-600 bg-white disabled:opacity-50">
                    Annuler
                  </button>
                  <button
                    onClick={() => {
                      if (holdForm.amount <= 0 || !holdForm.sourceCode) {
                        setHoldError('Montant et code source obligatoires.');
                        return;
                      }
                      if (holdForm.amount > wallet.availableBalance) {
                        setHoldError(`Montant supérieur au solde disponible (${wallet.availableBalance.toLocaleString('fr-FR')} FCFA).`);
                        return;
                      }
                      createHoldMutation.mutate();
                    }}
                    disabled={createHoldMutation.isPending}
                    className="flex-1 bg-primary-600 text-white px-3 py-1.5 rounded-lg text-xs disabled:opacity-50 flex items-center justify-center gap-1 hover:bg-primary-700"
                  >
                    {createHoldMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : 'Créer le hold'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </ModalPortal>
  );
};