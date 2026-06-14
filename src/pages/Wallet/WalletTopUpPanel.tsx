import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  CheckCircle,
  Loader2,
  PlusCircle,
  Wallet as WalletIcon,
  ArrowRight,
  Building2,
  User,
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
      const w = await walletService.getOrCreateWallet(ownerType, ownerCode, currency);
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
      queryClient.invalidateQueries({ queryKey: ["wallet", updatedWallet.walletNumber] });
      queryClient.invalidateQueries({ queryKey: ["wallet-ledger", updatedWallet.walletNumber] });
    },
    onError: (e: any) =>
      setError(e?.response?.data?.message || e?.message || "Erreur lors du top-up."),
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
    if (!form.ownerCode) return setError("Veuillez sélectionner ou saisir un propriétaire.");
    if (form.amount <= 0) return setError("Le montant doit être supérieur à 0.");
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

  const projectedBalance = wallet ? wallet.availableBalance + form.amount : 0;
  const progressBase = wallet ? Math.max(wallet.availableBalance + form.amount, 1) : 1;
  const currentPct = wallet ? Math.max(0, Math.min(100, (wallet.availableBalance / progressBase) * 100)) : 0;
  const topupPct = wallet ? Math.max(0, Math.min(100, (form.amount / progressBase) * 100)) : 0;

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
      <div className="xl:col-span-2 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
        <div className="mb-6">
          <p className="mb-2 inline-flex items-center gap-1 rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700">
            <PlusCircle size={13} /> Crédit manuel
          </p>
          <h2 className="text-xl font-semibold text-gray-900">Top-up admin automatisé</h2>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Le top-up crée automatiquement le wallet si nécessaire, crédite le solde et écrit une ligne ledger ADMIN_TOPUP.
          </p>
        </div>

        {error && (
          <div className="mb-4 flex gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-100">
            <AlertCircle size={16} /> {error}
          </div>
        )}
        {success && (
          <div className="mb-4 flex gap-2 rounded-xl bg-green-50 px-3 py-2 text-sm text-green-700 ring-1 ring-green-100">
            <CheckCircle size={16} /> {success}
          </div>
        )}

        <div className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Type de propriétaire
            </label>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {(["CUSTOMER", "MEMBER", "BUSINESS_ENTITY"] as OwnerType[]).map((type) => {
                const selected = form.ownerType === type;
                const Icon = type === "MEMBER" ? User : Building2;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => changeOwnerType(type)}
                    className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-left transition ${
                      selected
                        ? "bg-primary-50 text-primary-700 ring-2 ring-primary-200"
                        : "bg-gray-50 text-gray-600 ring-1 ring-gray-100 hover:bg-gray-100"
                    }`}
                  >
                    <span className={`rounded-xl p-2 ${selected ? "bg-primary-100" : "bg-white"}`}>
                      <Icon size={17} />
                    </span>
                    <span className="text-sm font-semibold">
                      {type === "CUSTOMER" ? "Customer" : type === "MEMBER" ? "Membre" : "Entreprise"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {form.ownerType === "MEMBER" ? (
            <Field label="Membre *">
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
            </Field>
          ) : (
            <Field label={`${form.ownerType === "BUSINESS_ENTITY" ? "Entreprise" : "Customer"} *`}>
              <CustomerAutocomplete
                selectedCustomer={selectedCustomer}
                typeFilter={form.ownerType === "BUSINESS_ENTITY" ? "COMPANY" : undefined}
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
            </Field>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Field label="Devise *">
              <input
                value={form.currency}
                onChange={(e) =>
                  setForm((f) => ({ ...f, currency: e.target.value.toUpperCase() }))
                }
                onBlur={() => resolveWallet(form.ownerType, form.ownerCode, form.currency)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 font-mono text-sm outline-none transition focus:border-primary-400 focus:ring-4 focus:ring-primary-50"
              />
            </Field>
            <Field label="Montant *">
              <input
                type="text"
                inputMode="decimal"
                value={form.amount === 0 ? "" : form.amount}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^\d.]/g, "");
                  setForm((f) => ({ ...f, amount: val === "" ? 0 : Number(val) }));
                }}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-primary-400 focus:ring-4 focus:ring-primary-50"
                placeholder="100000"
              />
            </Field>
            <Field label="Référence">
              <input
                value={form.reference}
                onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-primary-400 focus:ring-4 focus:ring-primary-50"
                placeholder="CASH-TOPUP-001"
              />
            </Field>
          </div>

          <Field label="Metadata JSON">
            <textarea
              value={form.metadataJson}
              onChange={(e) => setForm((f) => ({ ...f, metadataJson: e.target.value }))}
              rows={3}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 font-mono text-sm outline-none transition focus:border-primary-400 focus:ring-4 focus:ring-primary-50"
              placeholder='{"cashSessionNumber":"CSS-202604-000001"}'
            />
            <p className="mt-1 text-xs text-gray-400">
              Optionnel. Doit être une chaîne JSON valide.
            </p>
          </Field>

          <button
            onClick={submit}
            disabled={topUpMutation.isPending || checking || !form.ownerCode || form.amount <= 0}
            className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700 disabled:opacity-50"
          >
            {topUpMutation.isPending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <PlusCircle size={16} />
            )}
            Créditer le wallet
          </button>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
        <h3 className="font-semibold text-gray-900">Wallet cible</h3>
        <p className="mt-1 text-sm text-gray-500">Aperçu du solde avant validation.</p>

        <div className="mt-5">
          {checking ? (
            <div className="flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-4 text-sm text-gray-500">
              <Loader2 size={16} className="animate-spin" /> Vérification...
            </div>
          ) : wallet ? (
            <div className="space-y-4">
              <div className="rounded-2xl bg-primary-50 p-4 ring-1 ring-primary-100">
                <p className="font-mono font-semibold text-primary-900">{wallet.walletNumber}</p>
                <p className="mt-1 text-xs text-primary-600">
                  {wallet.ownerType} · {wallet.ownerCode}
                </p>
              </div>

              <div className="rounded-2xl bg-gray-50 p-4">
                <div className="mb-3 flex items-center justify-between text-sm">
                  <span className="text-gray-500">Solde actuel</span>
                  <span className="font-semibold text-green-600">
                    {formatAmountOnly(wallet.availableBalance)} {wallet.currency}
                  </span>
                </div>
                <div className="mb-3 flex items-center justify-between text-sm">
                  <span className="text-gray-500">Top-up</span>
                  <span className="font-semibold text-primary-600">
                    + {formatAmountOnly(form.amount)} {wallet.currency}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-sm">
                  <span className="font-medium text-gray-900">Après opération</span>
                  <span className="font-bold text-primary-700">
                    {formatAmountOnly(projectedBalance)} {wallet.currency}
                  </span>
                </div>

                {form.amount > 0 && (
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-gray-200">
                    <div className="flex h-full">
                      <div className="bg-green-500" style={{ width: `${currentPct}%` }} />
                      <div className="bg-primary-500" style={{ width: `${topupPct}%` }} />
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={() => navigate(`/wallets/${wallet.walletNumber}`)}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm ring-1 ring-gray-100 transition hover:bg-gray-50"
              >
                Ouvrir le détail <ArrowRight size={15} />
              </button>
            </div>
          ) : (
            <div className="rounded-2xl bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
              <WalletIcon size={40} className="mx-auto mb-3 text-gray-300" />
              Sélectionnez un propriétaire.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({
  label,
  children,
}) => (
  <label className="block">
    <span className="mb-1.5 block text-sm font-medium text-gray-700">{label}</span>
    {children}
  </label>
);
