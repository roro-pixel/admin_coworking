import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search, Eye, Plus, Loader2, Wallet as WalletIcon,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import { walletService } from '../../services/wallet.service';
import type { Wallet } from '../../services/wallet.service';
import { useAuth } from '../../contexts/AuthContext';
import { WalletDetailModal } from './WalletDetailModal';
import { CustomerAutocomplete } from '../../components/customers/CustomerAutocomplete';
import { MemberAutocomplete } from '../../components/members/MemberAutocomplete';
import type { CustomerSummaryResponse } from '../../services/customer.service';
import type { MemberSummaryResponse } from '../../services/member.service';
import { ModalPortal } from '../../components/ui/ModalPortal';

const statusConfig: Record<string, { label: string; color: string }> = {
  ACTIVE:       { label: 'Actif',         color: 'bg-green-100 text-green-700'  },
  SUSPENDED:    { label: 'Suspendu',      color: 'bg-yellow-100 text-yellow-700'},
  LOCKED:       { label: 'Verrouillé',    color: 'bg-red-100 text-red-700'      },
  CLOSED:       { label: 'Fermé',         color: 'bg-gray-100 text-gray-500'    },
  UNDER_REVIEW: { label: 'En révision',   color: 'bg-orange-100 text-orange-700'},
};

const PAGE_SIZE = 20;

const buildDefaultTopUp = () => ({
  ownerType: 'CUSTOMER',
  ownerCode: '',
  amount: 0,
  reference: '',
});

export const WalletsList: React.FC = () => {
  const { admin } = useAuth();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(0);

  const [selectedWallet, setSelectedWallet] = useState<Wallet | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isTopUpModalOpen, setIsTopUpModalOpen] = useState(false);

  // États top-up
  const [ownerType, setOwnerType] = useState<'CUSTOMER' | 'MEMBER' | 'BUSINESS_ENTITY'>('CUSTOMER');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSummaryResponse | null>(null);
  const [selectedMember, setSelectedMember] = useState<MemberSummaryResponse | null>(null);
  const [topUpData, setTopUpData] = useState(buildDefaultTopUp);
  const [topUpError, setTopUpError] = useState<string | null>(null);
  // Solde actuel avant top-up (getWalletByOwner)
  const [currentWallet, setCurrentWallet] = useState<Wallet | null>(null);
  const [checkingWallet, setCheckingWallet] = useState(false);

  // CORRECTION : debounce 400ms
  useEffect(() => {
    const timer = setTimeout(() => { setDebouncedSearch(search); setPage(0); }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // CORRECTION : reset modal à l'ouverture
  useEffect(() => {
    if (isTopUpModalOpen) {
      setOwnerType('CUSTOMER');
      setSelectedCustomer(null);
      setSelectedMember(null);
      setTopUpData(buildDefaultTopUp());
      setTopUpError(null);
      setCurrentWallet(null);
    }
  }, [isTopUpModalOpen]);

  const handleFilterChange = <T,>(setter: (v: T) => void, value: T) => {
    setter(value);
    setPage(0);
  };

  const { data: walletsData, isLoading, isFetching } = useQuery({
    queryKey: ['wallets', page, debouncedSearch, statusFilter],
    queryFn: () => walletService.getWallets({
      ownerCode:  debouncedSearch || undefined,
      status:     statusFilter    || undefined,
      page,
      size:       PAGE_SIZE,
      sort:       'openedAt,desc',
    }),
  });

  const wallets: Wallet[] = walletsData?.content || [];
  const totalElements = walletsData?.totalElements ?? 0;
  const totalPages    = walletsData?.totalPages    ?? Math.ceil(totalElements / PAGE_SIZE);

  // CORRECTION : getWalletByOwner pour afficher le solde avant top-up
  const handleOwnerSelect = async (type: string, code: string) => {
    setTopUpData(prev => ({ ...prev, ownerType: type, ownerCode: code }));
    if (!code) { setCurrentWallet(null); return; }
    setCheckingWallet(true);
    try {
      // getOrCreateWallet pour afficher le solde actuel (cree si n'existe pas)
      const w = await walletService.getOrCreateWallet(type, code, 'XAF');
      setCurrentWallet(w);
    } catch {
      setCurrentWallet(null);
    } finally {
      setCheckingWallet(false);
    }
  };

  const topUpMutation = useMutation({
    mutationFn: () => walletService.adminTopUp({
      ownerType: topUpData.ownerType,
      ownerCode: topUpData.ownerCode,
      currency:  'XAF',
      amount:    topUpData.amount,
      createdBy: admin?.email || String(admin?.id || 'admin'),
      reference: topUpData.reference || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
      setIsTopUpModalOpen(false);
    },
    onError: (error: any) => {
      setTopUpError(error?.response?.data?.message || 'Erreur lors du top-up.');
    },
  });

  const handleTopUp = () => {
    if (!topUpData.ownerCode) { setTopUpError('Veuillez sélectionner un client.'); return; }
    if (topUpData.amount <= 0) { setTopUpError('Le montant doit être supérieur à 0.'); return; }
    setTopUpError(null);
    // adminTopUp crée le wallet automatiquement s'il n'existe pas (get-or-create côté backend)
    topUpMutation.mutate();
  };

  if (isLoading) return <div className="text-center py-8">Chargement...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Portefeuilles</h2>
          {totalElements > 0 && (
            <p className="text-sm text-gray-500 mt-0.5">{totalElements} portefeuille{totalElements > 1 ? 's' : ''}</p>
          )}
        </div>
        <button onClick={() => setIsTopUpModalOpen(true)}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center gap-2">
          <Plus size={18} /> Top-up
        </button>
      </div>

      {/* Filtres */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Rechercher par code client..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg" />
          {isFetching && search && (
            <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-gray-400" />
          )}
        </div>
        <select value={statusFilter} onChange={(e) => handleFilterChange(setStatusFilter, e.target.value)}
          className="px-4 py-2 border border-gray-200 rounded-lg bg-white">
          <option value="">Tous les statuts</option>
          {Object.entries(statusConfig).map(([key, v]) => (
            <option key={key} value={key}>{v.label}</option>
          ))}
        </select>
        {(statusFilter || search) && (
          <button onClick={() => { setSearch(''); setDebouncedSearch(''); setStatusFilter(''); setPage(0); }}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 whitespace-nowrap">
            Réinitialiser
          </button>
        )}
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold">N° Portefeuille</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Propriétaire</th>
              <th className="px-6 py-3 text-right text-sm font-semibold">Solde dispo</th>
              <th className="px-6 py-3 text-right text-sm font-semibold">Solde bloqué</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Statut</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Devise</th>
              <th className="px-6 py-3 text-center text-sm font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {wallets.map((wallet) => {
              const sc = statusConfig[wallet.status];
              return (
                <tr key={wallet.walletNumber} className={`hover:bg-gray-50 ${wallet.status !== 'ACTIVE' ? 'opacity-70' : ''}`}>
                  <td className="px-6 py-4 text-sm font-mono">{wallet.walletNumber}</td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium">{wallet.ownerCode}</p>
                    <p className="text-xs text-gray-500">{wallet.ownerType}</p>
                  </td>
                  <td className="px-6 py-4 text-right font-semibold text-green-700">
                    {wallet.availableBalance.toLocaleString('fr-FR')} {wallet.currency}
                  </td>
                  <td className="px-6 py-4 text-right text-orange-600">
                    {wallet.heldBalance > 0
                      ? `${wallet.heldBalance.toLocaleString('fr-FR')} ${wallet.currency}`
                      : '—'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs ${sc?.color || 'bg-gray-100 text-gray-500'}`}>
                      {sc?.label || wallet.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium">{wallet.currency}</td>
                  <td className="px-6 py-4 text-center">
                    <button onClick={() => { setSelectedWallet(wallet); setIsDetailOpen(true); }}
                      className="p-1 text-gray-600 hover:text-primary-600" title="Voir détail, ledger, holds">
                      <Eye size={18} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {wallets.length === 0 && !isLoading && (
        <div className="text-center py-12 bg-white rounded-xl">
          <WalletIcon size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">Aucun portefeuille trouvé</p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 px-2">
          <p className="text-sm text-gray-500">
            {totalElements} portefeuille{totalElements > 1 ? 's' : ''} — Page {page + 1} / {totalPages}
          </p>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
              className="p-1.5 border rounded-lg disabled:opacity-50 hover:bg-gray-50"><ChevronLeft size={16} /></button>
            <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
              className="p-1.5 border rounded-lg disabled:opacity-50 hover:bg-gray-50"><ChevronRight size={16} /></button>
          </div>
        </div>
      )}

      {/* Modal Top-up — CORRECTION : ModalPortal */}
      {isTopUpModalOpen && (
        <ModalPortal onClose={() => setIsTopUpModalOpen(false)}>
          <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center rounded-t-2xl">
            <h3 className="text-xl font-bold">Créditer un portefeuille</h3>
            <button onClick={() => setIsTopUpModalOpen(false)} className="p-1 hover:bg-gray-100 rounded-lg">✕</button>
          </div>
          <div className="p-6 space-y-4">
            {topUpError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">{topUpError}</div>
            )}

            {/* Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Type de client *</label>
              <div className="flex gap-4">
                {(['CUSTOMER', 'MEMBER', 'BUSINESS_ENTITY'] as const).map(type => (
                  <label key={type} className="flex items-center gap-2 cursor-pointer text-sm">
                    <input type="radio" checked={ownerType === type}
                      onChange={() => {
                        setOwnerType(type);
                        setSelectedCustomer(null);
                        setSelectedMember(null);
                        setTopUpData(prev => ({ ...prev, ownerType: type, ownerCode: '' }));
                        setCurrentWallet(null);
                      }} />
                    {type === 'CUSTOMER' ? 'Customer' : type === 'MEMBER' ? 'Membre' : 'Business'}
                  </label>
                ))}
              </div>
            </div>

            {/* Sélection client */}
            {ownerType === 'MEMBER' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Membre *</label>
                <MemberAutocomplete
                  onSelect={(member) => {
                    setSelectedMember(member);
                    handleOwnerSelect('MEMBER', member?.memberId || '');
                  }}
                  selectedMember={selectedMember}
                  placeholder="Rechercher un membre..." />
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {ownerType === 'BUSINESS_ENTITY' ? 'Entreprise' : 'Customer'} *
                </label>
                <CustomerAutocomplete
                  onSelect={(customer) => {
                    setSelectedCustomer(customer);
                    handleOwnerSelect(ownerType, customer?.customerId || '');
                  }}
                  selectedCustomer={selectedCustomer}
                  typeFilter={ownerType === 'BUSINESS_ENTITY' ? 'COMPANY' : undefined}
                  placeholder={ownerType === 'BUSINESS_ENTITY' ? 'Rechercher une entreprise...' : 'Rechercher un customer...'} />
              </div>
            )}

            {/* Solde actuel (getWalletByOwner) */}
            {topUpData.ownerCode && (
              <div className={`p-3 rounded-lg text-sm ${checkingWallet ? 'bg-gray-50' : currentWallet ? 'bg-blue-50 border border-blue-100' : 'bg-amber-50 border border-amber-100'}`}>
                {checkingWallet ? (
                  <div className="flex items-center gap-2 text-gray-500">
                    <Loader2 size={14} className="animate-spin" /> Vérification du portefeuille...
                  </div>
                ) : currentWallet ? (
                  <>
                    <p className="text-xs text-blue-500 mb-1">Portefeuille existant — {currentWallet.walletNumber}</p>
                    <p className="font-medium text-blue-800">
                      Solde disponible : {currentWallet.availableBalance.toLocaleString('fr-FR')} {currentWallet.currency}
                    </p>
                    <p className="text-xs text-blue-500">Statut : {statusConfig[currentWallet.status]?.label || currentWallet.status}</p>
                  </>
                ) : (
                  <p className="text-amber-700 text-xs">Aucun portefeuille trouvé — il sera créé automatiquement lors du top-up.</p>
                )}
              </div>
            )}

            {/* Montant */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Montant (FCFA) *</label>
             <input
  type="text"
  inputMode="decimal"
  value={topUpData.amount === 0 ? '' : topUpData.amount}
  onChange={(e) => {
    const val = e.target.value.replace(/[^\d.]/g, '');
    setTopUpData(prev => ({ ...prev, amount: val === '' ? 0 : parseFloat(val) }));
  }}
  placeholder="100000"
  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
/>
              {topUpData.amount > 0 && currentWallet && (
                <p className="text-xs text-gray-500 mt-1">
                  Nouveau solde estimé : {(currentWallet.availableBalance + topUpData.amount).toLocaleString('fr-FR')} FCFA
                </p>
              )}
            </div>

            {/* Référence */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Référence</label>
              <input type="text" value={topUpData.reference}
                onChange={(e) => setTopUpData(prev => ({ ...prev, reference: e.target.value }))}
                placeholder="Ex: CASH-TOPUP-001, RECU-001"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg" />
              <p className="text-xs text-gray-400 mt-1">
                Recommandé : numéro de caisse, numéro de reçu ou référence manager
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setIsTopUpModalOpen(false)} disabled={topUpMutation.isPending}
                className="flex-1 px-4 py-2 border rounded-lg text-gray-700 disabled:opacity-50">Annuler</button>
              <button onClick={handleTopUp}
                disabled={topUpMutation.isPending || !topUpData.ownerCode || topUpData.amount <= 0}
                className="flex-1 bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2">
                {topUpMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : 'Créditer'}
              </button>
            </div>
          </div>
        </ModalPortal>
      )}

      {selectedWallet && (
        <WalletDetailModal
          isOpen={isDetailOpen}
          onClose={() => { setIsDetailOpen(false); setSelectedWallet(null); }}
          wallet={selectedWallet}
        />
      )}
    </div>
  );
};