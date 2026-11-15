import React, { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { PlusCircle, Wallet as WalletIcon } from "lucide-react";
import { walletService } from "../../services/wallet.service";
import type { Wallet } from "../../services/wallet.service";
import { useAuth } from "../../contexts/AuthContext";
import { ActionButton, ErrorBanner, Field, Section } from "../../components/subscription/kit";
import { FIELD_SOFT, apiMessage, formatMoney } from "../../components/subscription/kitUtils";
import { Skeleton } from "../../components/ui/Skeleton";
import { toast } from "../../components/ui/toastStore";
import { currencyLabel } from "../../components/payment/paymentUtils";
import { RatioBar } from "../../components/operations/OpsCharts";
import { OwnerPicker } from "../../components/wallet/OwnerPicker";
import { WalletSummary } from "../../components/wallet/WalletSummary";
import type { OwnerType } from "../../components/wallet/walletLabels";
import type { CustomerSummaryResponse } from "../../services/customer.service";
import type { MemberSummaryResponse } from "../../services/member.service";

const defaultForm = { ownerType: "CUSTOMER" as OwnerType, ownerCode: "", currency: "XAF", amount: 0, reference: "", metadataJson: "" };

export const WalletTopUpPanel: React.FC = () => {
  const { admin } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(defaultForm);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSummaryResponse | null>(null);
  const [selectedMember, setSelectedMember] = useState<MemberSummaryResponse | null>(null);
  const [credited, setCredited] = useState<Wallet | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Aperçu du portefeuille cible. L'ancien écran appelait get-or-create dès la sélection du propriétaire, ce qui créait
  // un portefeuille sans qu'aucun crédit ne soit validé. Le top-up crée déjà le portefeuille si besoin : on se contente de lire.
  const [debounced, setDebounced] = useState({ code: "", currency: "XAF" });
  useEffect(() => {
    const t = setTimeout(() => setDebounced({ code: form.ownerCode, currency: form.currency }), 400);
    return () => clearTimeout(t);
  }, [form.ownerCode, form.currency]);

  const { data: lookup, isFetching: checking } = useQuery({
    queryKey: ["wallet-topup-preview", form.ownerType, debounced.code, debounced.currency],
    queryFn: () => walletService.getWallets({ ownerType: form.ownerType, ownerCode: debounced.code, currency: debounced.currency, size: 1 }),
    enabled: !!debounced.code && !!debounced.currency,
  });
  const preview: Wallet | null = credited ?? lookup?.content?.[0] ?? null;
  const cur = currencyLabel(preview?.currency ?? form.currency);

  const topUpMutation = useMutation({
    mutationFn: () =>
      walletService.adminTopUp({
        ownerType: form.ownerType,
        ownerCode: form.ownerCode,
        currency: form.currency,
        amount: form.amount,
        createdBy: admin?.email || String(admin?.id || "admin"),
        reference: form.reference || undefined,
        metadataJson: form.metadataJson.trim() || undefined,
      }),
    onSuccess: (w) => {
      setCredited(w);
      setError(null);
      setForm((f) => ({ ...f, amount: 0, reference: "", metadataJson: "" }));
      queryClient.invalidateQueries({ queryKey: ["wallets"] });
      queryClient.invalidateQueries({ queryKey: ["wallet", w.walletNumber] });
      queryClient.invalidateQueries({ queryKey: ["wallet-ledger", w.walletNumber] });
      queryClient.invalidateQueries({ queryKey: ["wallet-topup-preview"] });
      toast.success(`Top-up effectué. Nouveau solde disponible : ${formatMoney(w.availableBalance, currencyLabel(w.currency))}.`);
    },
    onError: (e: unknown) => setError(apiMessage(e, "Erreur lors du top-up.")),
  });

  const changeOwnerType = (ownerType: OwnerType) => {
    setForm({ ...defaultForm, ownerType });
    setCredited(null);
    setSelectedCustomer(null);
    setSelectedMember(null);
    setError(null);
  };

  const setOwner = (code: string) => {
    setForm((f) => ({ ...f, ownerCode: code }));
    setCredited(null);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.ownerCode) return setError("Sélectionnez un propriétaire.");
    if (form.amount <= 0) return setError("Le montant doit être supérieur à 0.");
    if (form.metadataJson.trim()) {
      try {
        JSON.parse(form.metadataJson);
      } catch {
        return setError("Les métadonnées doivent être un JSON valide.");
      }
    }
    setError(null);
    topUpMutation.mutate();
  };

  const base = preview ? Math.max(preview.availableBalance + form.amount, 1) : 1;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5">
      <Section title="Top-up administrateur" description="Crée le portefeuille si nécessaire, crédite le solde et écrit une ligne ADMIN_TOPUP au ledger." icon={PlusCircle}>
        <form onSubmit={submit} className="space-y-4 rounded-2xl bg-white p-5 shadow-sm">
          <ErrorBanner message={error} />
          <OwnerPicker
            ownerType={form.ownerType}
            onTypeChange={changeOwnerType}
            ownerCode={form.ownerCode}
            onCodeChange={setOwner}
            selectedCustomer={selectedCustomer}
            selectedMember={selectedMember}
            onCustomer={(c) => {
              setSelectedCustomer(c);
              setOwner(c?.customerId ?? "");
            }}
            onMember={(m) => {
              setSelectedMember(m);
              setOwner(m?.memberId ?? "");
            }}
          />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Field label="Devise" required>
              <input
                value={form.currency}
                onChange={(e) => {
                  setForm((f) => ({ ...f, currency: e.target.value.toUpperCase() }));
                  setCredited(null);
                }}
                className={`${FIELD_SOFT} font-mono`}
              />
            </Field>
            <Field label="Montant" required>
              <input
                inputMode="decimal"
                value={form.amount === 0 ? "" : form.amount}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^\d.]/g, "");
                  setForm((f) => ({ ...f, amount: val === "" ? 0 : Number(val) }));
                }}
                placeholder="100000"
                className={FIELD_SOFT}
              />
            </Field>
            <Field label="Référence">
              <input value={form.reference} onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))} placeholder="CASH-TOPUP-001" className={FIELD_SOFT} />
            </Field>
          </div>
          <Field label="Métadonnées JSON" hint="Facultatif. Doit être une chaîne JSON valide.">
            <textarea
              value={form.metadataJson}
              onChange={(e) => setForm((f) => ({ ...f, metadataJson: e.target.value }))}
              rows={3}
              placeholder='{"cashSessionNumber":"CSS-202604-000001"}'
              className={`${FIELD_SOFT} resize-none font-mono text-xs`}
            />
          </Field>
          <ActionButton type="submit" icon={PlusCircle} pending={topUpMutation.isPending} disabled={!form.ownerCode || form.amount <= 0}>
            Créditer le portefeuille
          </ActionButton>
        </form>
      </Section>

      {form.ownerCode &&
        (checking && !credited ? (
          <Skeleton className="h-44 w-full rounded-2xl" />
        ) : preview ? (
          <section className="rounded-[1.75rem] border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
            <h3 className="text-base font-bold text-gray-950">{credited ? "Portefeuille crédité" : "Portefeuille cible"}</h3>
            <div className="mt-4 space-y-4">
              <WalletSummary wallet={preview} onOpen={() => navigate(`/wallets/${preview.walletNumber}`)} />
              {!credited && form.amount > 0 && (
                <div className="rounded-2xl bg-gray-50 p-4">
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="text-gray-500">Après l'opération</span>
                    <span className="text-lg font-bold tabular-nums text-[color:var(--logo-pink-dark)]">{formatMoney(preview.availableBalance + form.amount, cur)}</span>
                  </div>
                  <div className="mt-3">
                    <RatioBar value={preview.availableBalance} total={base} color="#7FB08A" />
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    Solde actuel {formatMoney(preview.availableBalance, cur)}, crédit de {formatMoney(form.amount, cur)}
                  </p>
                </div>
              )}
            </div>
          </section>
        ) : (
          <p className="flex items-center gap-3 rounded-2xl bg-white p-4 text-sm text-gray-500 shadow-sm">
            <WalletIcon size={18} className="shrink-0 text-gray-400" />
            Ce propriétaire n'a pas encore de portefeuille en {form.currency || "cette devise"} : le top-up le créera.
          </p>
        ))}
    </div>
  );
};
