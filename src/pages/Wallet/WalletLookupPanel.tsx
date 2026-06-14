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
  Sparkles,
  Building2,
  User,
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
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
      <div className="xl:col-span-2 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="mb-2 inline-flex items-center gap-1 rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700">
              <Sparkles size={13} /> Automatisation
            </p>
            <h2 className="text-xl font-semibold text-gray-900">
              Recherche et création automatisée
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Sélectionnez un propriétaire. Le backend retrouve le wallet existant ou le crée automatiquement.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-100">
            <AlertCircle size={16} /> {error}
          </div>
        )}
        {message && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-green-50 px-3 py-2 text-sm text-green-700 ring-1 ring-green-100">
            <CheckCircle size={16} /> {message}
          </div>
        )}

        <div className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Type de propriétaire
            </label>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {(["CUSTOMER", "MEMBER", "BUSINESS_ENTITY"] as OwnerType[]).map((type) => {
                const selected = ownerType === type;
                const Icon = type === "MEMBER" ? User : Building2;
                return (
                  <button
                    type="button"
                    key={type}
                    onClick={() => resetOwner(type)}
                    className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-left transition ${
                      selected
                        ? "bg-primary-50 text-primary-700 ring-2 ring-primary-200"
                        : "bg-gray-50 text-gray-600 ring-1 ring-gray-100 hover:bg-gray-100"
                    }`}
                  >
                    <span className={`rounded-xl p-2 ${selected ? "bg-primary-100" : "bg-white"}`}>
                      <Icon size={17} />
                    </span>
                    <span className="text-sm font-semibold">{ownerTypeLabels[type]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <label className="inline-flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={manualMode}
              onChange={(e) => setManualMode(e.target.checked)}
              className="rounded"
            />
            Saisie manuelle du code propriétaire
          </label>

          {!manualMode && ownerType === "MEMBER" && (
            <Field label="Membre">
              <MemberAutocomplete
                selectedMember={selectedMember}
                onSelect={(member) => {
                  setSelectedMember(member);
                  setOwnerCode(member?.memberId || "");
                  setResult(null);
                }}
                placeholder="Rechercher un membre..."
              />
            </Field>
          )}

          {!manualMode && ownerType !== "MEMBER" && (
            <Field label={ownerType === "BUSINESS_ENTITY" ? "Entreprise" : "Customer"}>
              <CustomerAutocomplete
                selectedCustomer={selectedCustomer}
                onSelect={(customer) => {
                  setSelectedCustomer(customer);
                  setOwnerCode(customer?.customerId || "");
                  setResult(null);
                }}
                typeFilter={ownerType === "BUSINESS_ENTITY" ? "COMPANY" : undefined}
                placeholder={
                  ownerType === "BUSINESS_ENTITY"
                    ? "Rechercher une entreprise..."
                    : "Rechercher un customer..."
                }
              />
            </Field>
          )}

          {manualMode && (
            <Field label="Code propriétaire">
              <input
                value={ownerCode}
                onChange={(e) => {
                  setOwnerCode(e.target.value);
                  setResult(null);
                }}
                placeholder="CUS-000001, MBR-000001..."
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-primary-400 focus:ring-4 focus:ring-primary-50"
              />
            </Field>
          )}

          <div className="max-w-xs">
            <Field label="Devise">
              <input
                value={currency}
                onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 font-mono text-sm outline-none transition focus:border-primary-400 focus:ring-4 focus:ring-primary-50"
              />
            </Field>
          </div>

          <button
            onClick={() => getOrCreateMutation.mutate()}
            disabled={!ownerCode || getOrCreateMutation.isPending}
            className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700 disabled:opacity-50"
          >
            {getOrCreateMutation.isPending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Search size={16} />
            )}
            Récupérer ou créer le wallet
          </button>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
        <h3 className="font-semibold text-gray-900">Résultat</h3>
        <p className="mt-1 text-sm text-gray-500">
          Le wallet trouvé ou créé apparaîtra ici.
        </p>

        <div className="mt-5">
          {isSearching && ownerCode && !result ? (
            <div className="flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-4 text-sm text-gray-500">
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
            <div className="rounded-2xl bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
              <WalletIcon size={38} className="mx-auto mb-3 text-gray-300" />
              Aucun wallet trouvé. Utilisez le bouton pour le créer automatiquement.
            </div>
          ) : (
            <div className="rounded-2xl bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
              Sélectionnez un propriétaire pour vérifier son wallet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const WalletCard: React.FC<{ wallet: Wallet; onOpen: () => void }> = ({
  wallet,
  onOpen,
}) => (
  <div className="rounded-2xl bg-gray-50 p-4 ring-1 ring-gray-100">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="font-mono text-sm font-semibold text-gray-900">{wallet.walletNumber}</p>
        <p className="mt-1 text-xs text-gray-500">
          {wallet.ownerType} · {wallet.ownerCode}
        </p>
      </div>
      <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700 ring-1 ring-green-100">
        {statusLabels[wallet.status] || wallet.status}
      </span>
    </div>
    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
      <div className="rounded-xl bg-white p-3">
        <p className="text-xs text-gray-400">Disponible</p>
        <p className="font-semibold text-green-600">
          {formatAmount(wallet.availableBalance, wallet.currency)}
        </p>
      </div>
      <div className="rounded-xl bg-white p-3">
        <p className="text-xs text-gray-400">Bloqué</p>
        <p className="font-semibold text-orange-600">
          {formatAmount(wallet.heldBalance, wallet.currency)}
        </p>
      </div>
    </div>
    <button
      onClick={onOpen}
      className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm ring-1 ring-gray-100 transition hover:bg-gray-50"
    >
      <Eye size={15} /> Voir détail
    </button>
  </div>
);

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label className="block">
    <span className="mb-1.5 block text-sm font-medium text-gray-700">{label}</span>
    {children}
  </label>
);
