import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  CheckCircle,
  Loader2,
  PlusCircle,
  Wallet as WalletIcon,
} from "lucide-react";
import { walletService, formatAmountOnly } from "../../services/wallet.service";
import type { Wallet } from "../../services/wallet.service";
import { useAuth } from "../../contexts/AuthContext";
import { CustomerAutocomplete } from "../../components/customers/CustomerAutocomplete";
import { MemberAutocomplete } from "../../components/members/MemberAutocomplete";
import type { CustomerSummaryResponse } from "../../services/customer.service";
import type { MemberSummaryResponse } from "../../services/member.service";

type OwnerType = "CUSTOMER" | "MEMBER" | "BUSINESS_ENTITY";

const defaultForm = {
  ownerType: "CUSTOMER" as OwnerType,
  ownerCode: "",
  currency: "XAF",
  amount: 0,
  reference: "",
  metadataJson: "",
};

export const WalletTopUpPanel: React.FC = () => {
  const { admin } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(defaultForm);
  const [selectedCustomer, setSelectedCustomer] =
    useState<CustomerSummaryResponse | null>(null);
  const [selectedMember, setSelectedMember] =
    useState<MemberSummaryResponse | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const resolveWallet = async (
    ownerType: OwnerType,
    ownerCode: string,
    currency = "XAF",
  ) => {
    if (!ownerCode) {
      setWallet(null);
      return;
    }
    setChecking(true);
    setError(null);
    try {
      const w = await walletService.getOrCreateWallet(
        ownerType,
        ownerCode,
        currency,
      );
      setWallet(w);
    } catch (e: any) {
      setWallet(null);
      setError(
        e?.response?.data?.message ||
          "Impossible de récupérer ou créer le wallet.",
      );
    } finally {
      setChecking(false);
    }
  };

  const topUpMutation = useMutation({
    mutationFn: () => {
      if (form.metadataJson.trim()) {
        JSON.parse(form.metadataJson);
      }
      return walletService.adminTopUp({
        ownerType: form.ownerType,
        ownerCode: form.ownerCode,
        currency: form.currency,
        amount: form.amount,
        createdBy: admin?.email || String(admin?.id || "admin"),
        reference: form.reference || undefined,
        metadataJson: form.metadataJson.trim() || undefined,
      });
    },
    onSuccess: (updatedWallet) => {
      setWallet(updatedWallet);
      setSuccess(
        `Top-up effectué. Nouveau solde disponible : ${formatAmountOnly(updatedWallet.availableBalance)} ${updatedWallet.currency}.`,
      );
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["wallets"] });
      queryClient.invalidateQueries({
        queryKey: ["wallet", updatedWallet.walletNumber],
      });
      queryClient.invalidateQueries({
        queryKey: ["wallet-ledger", updatedWallet.walletNumber],
      });
    },
    onError: (e: any) =>
      setError(
        e?.response?.data?.message || e?.message || "Erreur lors du top-up.",
      ),
  });

  const changeOwnerType = (ownerType: OwnerType) => {
    setForm({ ...defaultForm, ownerType });
    setWallet(null);
    setSelectedCustomer(null);
    setSelectedMember(null);
    setError(null);
    setSuccess(null);
  };

  const submit = () => {
    if (!form.ownerCode)
      return setError("Veuillez sélectionner ou saisir un propriétaire.");
    if (form.amount <= 0)
      return setError("Le montant doit être supérieur à 0.");
    if (form.metadataJson.trim()) {
      try {
        JSON.parse(form.metadataJson);
      } catch {
        return setError("metadataJson doit être un JSON valide.");
      }
    }
    setError(null);
    setSuccess(null);
    topUpMutation.mutate();
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <div className="xl:col-span-2 bg-white rounded-xl shadow-sm border p-6 space-y-5">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Top-up admin automatisé
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Le top-up crée automatiquement le wallet si nécessaire, crédite le
            solde et écrit une ligne ledger ADMIN_TOPUP.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm flex gap-2">
            <AlertCircle size={16} /> {error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded-lg text-sm flex gap-2">
            <CheckCircle size={16} /> {success}
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
                    checked={form.ownerType === type}
                    onChange={() => changeOwnerType(type)}
                  />
                  {type === "CUSTOMER"
                    ? "Customer"
                    : type === "MEMBER"
                      ? "Membre"
                      : "Entreprise"}
                </label>
              ),
            )}
          </div>
        </div>

        {form.ownerType === "MEMBER" ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Membre *
            </label>
            <MemberAutocomplete
              selectedMember={selectedMember}
              onSelect={(member) => {
                setSelectedMember(member);
                const code = member?.memberId || "";
                setForm((f) => ({ ...f, ownerCode: code }));
                resolveWallet("MEMBER", code, form.currency);
              }}
              placeholder="Rechercher un membre..."
            />
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {form.ownerType === "BUSINESS_ENTITY" ? "Entreprise" : "Customer"}{" "}
              *
            </label>
            <CustomerAutocomplete
              selectedCustomer={selectedCustomer}
              typeFilter={
                form.ownerType === "BUSINESS_ENTITY" ? "COMPANY" : undefined
              }
              onSelect={(customer) => {
                setSelectedCustomer(customer);
                const code = customer?.customerId || "";
                setForm((f) => ({ ...f, ownerCode: code }));
                resolveWallet(form.ownerType, code, form.currency);
              }}
              placeholder={
                form.ownerType === "BUSINESS_ENTITY"
                  ? "Rechercher une entreprise..."
                  : "Rechercher un customer..."
              }
            />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Devise *
            </label>
            <input
              value={form.currency}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  currency: e.target.value.toUpperCase(),
                }))
              }
              onBlur={() =>
                resolveWallet(form.ownerType, form.ownerCode, form.currency)
              }
              className="w-full px-3 py-2 border border-gray-200 rounded-lg font-mono"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Montant *
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={form.amount === 0 ? "" : form.amount}
              onChange={(e) => {
                const val = e.target.value.replace(/[^\d.]/g, "");
                setForm((f) => ({
                  ...f,
                  amount: val === "" ? 0 : Number(val),
                }));
              }}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg"
              placeholder="100000"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Référence
            </label>
            <input
              value={form.reference}
              onChange={(e) =>
                setForm((f) => ({ ...f, reference: e.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-200 rounded-lg"
              placeholder="CASH-TOPUP-001"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Metadata JSON
          </label>
          <textarea
            value={form.metadataJson}
            onChange={(e) =>
              setForm((f) => ({ ...f, metadataJson: e.target.value }))
            }
            rows={3}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg font-mono text-sm"
            placeholder='{"cashSessionNumber":"CSS-202604-000001"}'
          />
          <p className="text-xs text-gray-400 mt-1">
            Optionnel. Doit être une chaîne JSON valide.
          </p>
        </div>

        <button
          onClick={submit}
          disabled={
            topUpMutation.isPending ||
            checking ||
            !form.ownerCode ||
            form.amount <= 0
          }
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
        >
          {topUpMutation.isPending ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <PlusCircle size={16} />
          )}
          Créditer le wallet
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Wallet cible</h3>
        {checking ? (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Loader2 size={16} className="animate-spin" /> Vérification...
          </div>
        ) : wallet ? (
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
              <p className="font-mono font-semibold text-blue-900">
                {wallet.walletNumber}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                {wallet.ownerType} · {wallet.ownerCode}
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 text-sm">
              <div>
                <p className="text-xs text-gray-400">Solde actuel</p>
                <p className="font-semibold text-green-600">
                  {formatAmountOnly(wallet.availableBalance)} {wallet.currency}
                </p>
              </div>
              {form.amount > 0 && (
                <div>
                  <p className="text-xs text-gray-400">Solde après top-up</p>
                  <p className="font-semibold text-primary-600">
                    {formatAmountOnly(wallet.availableBalance + form.amount)}{" "}
                    {wallet.currency}
                  </p>
                </div>
              )}
            </div>
            <button
              onClick={() => navigate(`/wallets/${wallet.walletNumber}`)}
              className="w-full border px-3 py-2 rounded-lg text-sm hover:bg-gray-50"
            >
              Ouvrir le détail
            </button>
          </div>
        ) : (
          <div className="text-center py-8 text-sm text-gray-500">
            <WalletIcon size={40} className="mx-auto text-gray-300 mb-3" />
            Sélectionnez un propriétaire.
          </div>
        )}
      </div>
    </div>
  );
};
