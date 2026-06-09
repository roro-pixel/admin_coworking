import React, { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Loader2,
  Search,
  Wallet as WalletIcon,
  Eye,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { walletService, formatAmount } from "../../services/wallet.service";
import type { Wallet } from "../../services/wallet.service";
import { CustomerAutocomplete } from "../../components/customers/CustomerAutocomplete";
import { MemberAutocomplete } from "../../components/members/MemberAutocomplete";
import type { CustomerSummaryResponse } from "../../services/customer.service";
import type { MemberSummaryResponse } from "../../services/member.service";

type OwnerType = "CUSTOMER" | "MEMBER" | "BUSINESS_ENTITY";

const ownerTypeLabels: Record<OwnerType, string> = {
  CUSTOMER: "Customer",
  MEMBER: "Membre",
  BUSINESS_ENTITY: "Entreprise",
};

const statusLabels: Record<string, string> = {
  ACTIVE: "Actif",
  SUSPENDED: "Suspendu",
  LOCKED: "Verrouillé",
  CLOSED: "Fermé",
  UNDER_REVIEW: "En révision",
};

export const WalletLookupPanel: React.FC = () => {
  const navigate = useNavigate();
  const [ownerType, setOwnerType] = useState<OwnerType>("CUSTOMER");
  const [ownerCode, setOwnerCode] = useState("");
  const [currency, setCurrency] = useState("XAF");
  const [manualMode, setManualMode] = useState(false);
  const [selectedCustomer, setSelectedCustomer] =
    useState<CustomerSummaryResponse | null>(null);
  const [selectedMember, setSelectedMember] =
    useState<MemberSummaryResponse | null>(null);
  const [result, setResult] = useState<Wallet | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: existingWallets, isFetching: isSearching } = useQuery({
    queryKey: ["wallet-owner-search", ownerType, ownerCode, currency],
    queryFn: () =>
      walletService.getWallets({ ownerType, ownerCode, currency, size: 5 }),
    enabled: !!ownerType && !!ownerCode,
  });

  const getOrCreateMutation = useMutation({
    mutationFn: () =>
      walletService.getOrCreateWallet(ownerType, ownerCode, currency),
    onSuccess: (wallet) => {
      setResult(wallet);
      setMessage(
        `Portefeuille ${wallet.walletNumber} disponible pour ${ownerTypeLabels[ownerType]} ${ownerCode}.`,
      );
      setError(null);
    },
    onError: (e: any) => {
      setError(
        e?.response?.data?.message ||
          "Impossible de récupérer ou créer le portefeuille.",
      );
      setMessage(null);
    },
  });

  const resetOwner = (nextType: OwnerType) => {
    setOwnerType(nextType);
    setOwnerCode("");
    setSelectedCustomer(null);
    setSelectedMember(null);
    setResult(null);
    setMessage(null);
    setError(null);
  };

  const existing = existingWallets?.content || [];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <div className="xl:col-span-2 bg-white rounded-xl shadow-sm border p-6 space-y-5">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Recherche et création automatisée
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Sélectionnez un propriétaire. Le backend retrouve le wallet existant
            ou le crée automatiquement avec ownerType, ownerCode et currency.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm flex items-center gap-2">
            <AlertCircle size={16} /> {error}
          </div>
        )}
        {message && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded-lg text-sm flex items-center gap-2">
            <CheckCircle size={16} /> {message}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Type de propriétaire
          </label>
          <div className="flex flex-wrap gap-3">
            {(["CUSTOMER", "MEMBER", "BUSINESS_ENTITY"] as OwnerType[]).map(
              (type) => (
                <label
                  key={type}
                  className="flex items-center gap-2 text-sm cursor-pointer"
                >
                  <input
                    type="radio"
                    checked={ownerType === type}
                    onChange={() => resetOwner(type)}
                  />
                  {ownerTypeLabels[type]}
                </label>
              ),
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-500">
          <input
            type="checkbox"
            checked={manualMode}
            onChange={(e) => setManualMode(e.target.checked)}
          />
          Saisie manuelle du code propriétaire
        </div>

        {!manualMode && ownerType === "MEMBER" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Membre
            </label>
            <MemberAutocomplete
              selectedMember={selectedMember}
              onSelect={(member) => {
                setSelectedMember(member);
                setOwnerCode(member?.memberId || "");
                setResult(null);
              }}
              placeholder="Rechercher un membre..."
            />
          </div>
        )}

        {!manualMode && ownerType !== "MEMBER" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {ownerType === "BUSINESS_ENTITY" ? "Entreprise" : "Customer"}
            </label>
            <CustomerAutocomplete
              selectedCustomer={selectedCustomer}
              onSelect={(customer) => {
                setSelectedCustomer(customer);
                setOwnerCode(customer?.customerId || "");
                setResult(null);
              }}
              typeFilter={
                ownerType === "BUSINESS_ENTITY" ? "COMPANY" : undefined
              }
              placeholder={
                ownerType === "BUSINESS_ENTITY"
                  ? "Rechercher une entreprise..."
                  : "Rechercher un customer..."
              }
            />
          </div>
        )}

        {manualMode && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Code propriétaire
            </label>
            <input
              value={ownerCode}
              onChange={(e) => {
                setOwnerCode(e.target.value);
                setResult(null);
              }}
              placeholder="CUS-000001, MBR-000001..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg"
            />
          </div>
        )}

        <div className="max-w-xs">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Devise
          </label>
          <input
            value={currency}
            onChange={(e) => setCurrency(e.target.value.toUpperCase())}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg font-mono"
          />
        </div>

        <button
          onClick={() => getOrCreateMutation.mutate()}
          disabled={!ownerCode || getOrCreateMutation.isPending}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
        >
          {getOrCreateMutation.isPending ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Search size={16} />
          )}
          Récupérer ou créer le wallet
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border p-6 space-y-4">
        <h3 className="font-semibold text-gray-900">Résultat</h3>
        {isSearching && ownerCode && !result ? (
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <Loader2 size={16} className="animate-spin" /> Recherche...
          </div>
        ) : result ? (
          <WalletCard
            wallet={result}
            onOpen={() => navigate(`/wallets/${result.walletNumber}`)}
          />
        ) : existing.length > 0 ? (
          <div className="space-y-3">
            {existing.map((wallet) => (
              <WalletCard
                key={wallet.walletNumber}
                wallet={wallet}
                onOpen={() => navigate(`/wallets/${wallet.walletNumber}`)}
              />
            ))}
          </div>
        ) : ownerCode ? (
          <div className="text-center py-8 text-sm text-gray-500">
            <WalletIcon size={38} className="mx-auto text-gray-300 mb-3" />
            Aucun wallet trouvé. Utilisez le bouton pour le créer
            automatiquement.
          </div>
        ) : (
          <div className="text-center py-8 text-sm text-gray-500">
            Sélectionnez un propriétaire pour vérifier son wallet.
          </div>
        )}
      </div>
    </div>
  );
};

const WalletCard: React.FC<{ wallet: Wallet; onOpen: () => void }> = ({
  wallet,
  onOpen,
}) => (
  <div className="border rounded-xl p-4 bg-gray-50">
    <div className="flex justify-between gap-3 items-start">
      <div>
        <p className="font-mono font-semibold text-sm">{wallet.walletNumber}</p>
        <p className="text-xs text-gray-500 mt-1">
          {wallet.ownerType} · {wallet.ownerCode}
        </p>
      </div>
      <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">
        {statusLabels[wallet.status] || wallet.status}
      </span>
    </div>
    <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
      <div>
        <p className="text-xs text-gray-400">Disponible</p>
        <p className="font-semibold text-green-600">
          {formatAmount(wallet.availableBalance, wallet.currency)}
        </p>
      </div>
      <div>
        <p className="text-xs text-gray-400">Bloqué</p>
        <p className="font-semibold text-orange-600">
          {formatAmount(wallet.heldBalance, wallet.currency)}
        </p>
      </div>
    </div>
    <button
      onClick={onOpen}
      className="mt-4 w-full px-3 py-2 bg-white border rounded-lg text-sm hover:bg-gray-50 flex items-center justify-center gap-2"
    >
      <Eye size={15} /> Voir détail
    </button>
  </div>
);
