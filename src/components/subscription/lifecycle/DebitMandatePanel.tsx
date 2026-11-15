import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban, Landmark, Plus, RefreshCw, RotateCcw } from "lucide-react";
import { subscriptionLifecycleService } from "../../../services/subscriptionLifecycle.service";
import type { DebitMandateView } from "../../../services/subscriptionLifecycle.service";
import { ActionButton, Detail, EmptyState, ErrorBlock, Field, IconButton, ItemRow, PanelForm, Section, StatusChip } from "../kit";
import { FIELD_SOFT, apiMessage, formatDate, formatDateTime, formatMoney } from "../kitUtils";
import { Skeleton } from "../../ui/Skeleton";
import { toast } from "../../ui/toastStore";
import { ATTEMPT_STATUS, MANDATE_CHANNELS, MANDATE_STATUS } from "./lifecycleLabels";
import { statusOf } from "../labels";

type Panel = { kind: "create" } | { kind: "revoke"; mandate: DebitMandateView } | null;

/**
 * Prélèvement automatique sur portefeuille : mandats, tentatives, reprise manuelle.
 * Sans mandat actif, rien n'est prélevé. Trois échecs de suite suspendent le mandat.
 */
export const DebitMandatePanel: React.FC<{ subscriptionNumber: string; currency?: string; onChanged?: () => void }> = ({
  subscriptionNumber,
  currency = "FCFA",
  onChanged,
}) => {
  const qc = useQueryClient();
  const [panel, setPanel] = useState<Panel>(null);
  const [wallet, setWallet] = useState("");
  const [channel, setChannel] = useState("STAFF");
  const [reference, setReference] = useState("");
  const [max, setMax] = useState("");
  const [reason, setReason] = useState("");
  const [retrying, setRetrying] = useState<string | null>(null);

  const mandates = useQuery({
    queryKey: ["sub-lifecycle", subscriptionNumber, "mandates"],
    queryFn: () => subscriptionLifecycleService.getDebitMandates(subscriptionNumber),
  });
  const attempts = useQuery({
    queryKey: ["sub-lifecycle", subscriptionNumber, "attempts"],
    queryFn: () => subscriptionLifecycleService.getDebitAttempts(subscriptionNumber),
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["sub-lifecycle", subscriptionNumber] });
    onChanged?.();
  };

  const create = useMutation({
    mutationFn: () =>
      subscriptionLifecycleService.createDebitMandate(subscriptionNumber, {
        walletNumber: wallet.trim(),
        channel: channel as "STAFF",
        reference: reference.trim() || undefined,
        maxAmountPerDebit: max ? Number(max) : null,
      }),
    onSuccess: () => {
      toast.success("Mandat de prélèvement créé");
      setPanel(null);
      setWallet("");
      setReference("");
      setMax("");
      refresh();
    },
    onError: (e) => toast.error(apiMessage(e, "Création impossible.")),
  });

  const revoke = useMutation({
    mutationFn: (code: string) => subscriptionLifecycleService.revokeDebitMandate(code, reason.trim()),
    onSuccess: () => {
      toast.success("Mandat révoqué");
      setPanel(null);
      setReason("");
      refresh();
    },
    onError: (e) => toast.error(apiMessage(e, "Révocation impossible.")),
  });

  const reactivate = useMutation({
    mutationFn: (code: string) => subscriptionLifecycleService.reactivateDebitMandate(code),
    onSuccess: () => {
      toast.success("Mandat réactivé");
      refresh();
    },
    onError: (e) => toast.error(apiMessage(e, "Réactivation impossible.")),
  });

  const retry = async (invoiceNumber: string) => {
    setRetrying(invoiceNumber);
    try {
      const r = await subscriptionLifecycleService.collectInvoice(subscriptionNumber, invoiceNumber);
      if (r.status === "SUCCEEDED") toast.success("Facture prélevée");
      else toast.error(r.message || statusOf(ATTEMPT_STATUS, r.status).label);
      refresh();
    } catch (e) {
      toast.error(apiMessage(e, "Prélèvement impossible."));
    } finally {
      setRetrying(null);
    }
  };

  const hasActive = (mandates.data ?? []).some((m) => m.status === "ACTIVE");

  return (
    <Section
      title="Prélèvement automatique"
      description="Sur le portefeuille du client"
      icon={Landmark}
      action={panel === null && !hasActive && <ActionButton icon={Plus} variant="ghost" onClick={() => setPanel({ kind: "create" })}>Nouveau mandat</ActionButton>}
    >
      {panel?.kind === "create" && (
        <PanelForm
          title="Nouveau mandat de prélèvement"
          pending={create.isPending}
          submitLabel="Créer le mandat"
          submitDisabled={!wallet.trim()}
          onCancel={() => setPanel(null)}
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate();
          }}
        >
          <p className="-mt-2 text-sm text-gray-500">Le client doit avoir donné son accord : indiquez comment il l'a donné.</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Numéro de portefeuille" required>
              <input value={wallet} onChange={(e) => setWallet(e.target.value)} placeholder="WAL-000123" className={`${FIELD_SOFT} font-mono`} />
            </Field>
            <Field label="Canal du consentement" required>
              <select value={channel} onChange={(e) => setChannel(e.target.value)} className={FIELD_SOFT}>
                {MANDATE_CHANNELS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Référence du consentement" hint="Facultatif : numéro du formulaire signé, de l'e-mail…">
              <input value={reference} onChange={(e) => setReference(e.target.value)} className={FIELD_SOFT} />
            </Field>
            <Field label={`Plafond par prélèvement (${currency})`} hint="Facultatif">
              <input type="number" min={0} value={max} onChange={(e) => setMax(e.target.value)} className={FIELD_SOFT} />
            </Field>
          </div>
        </PanelForm>
      )}

      {panel?.kind === "revoke" && (
        <PanelForm
          title="Révoquer le mandat"
          pending={revoke.isPending}
          submitLabel="Révoquer"
          submitDisabled={!reason.trim()}
          onCancel={() => setPanel(null)}
          onSubmit={(e) => {
            e.preventDefault();
            revoke.mutate(panel.mandate.mandateCode);
          }}
        >
          <p className="-mt-2 text-sm text-gray-500">
            Mandat <span className="font-mono font-semibold text-gray-700">{panel.mandate.mandateCode}</span> : plus aucun prélèvement ne sera tenté.
          </p>
          <Field label="Motif" required>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className={`${FIELD_SOFT} resize-none`} />
          </Field>
        </PanelForm>
      )}

      {mandates.isLoading ? (
        <Skeleton className="h-20 w-full rounded-2xl" />
      ) : mandates.isError ? (
        <ErrorBlock message="Impossible de charger les mandats." onRetry={() => mandates.refetch()} />
      ) : (mandates.data ?? []).length === 0 ? (
        panel === null && <EmptyState icon={Landmark} title="Aucun mandat" hint="Sans mandat, aucune facture n'est prélevée automatiquement." />
      ) : (
        <div className="space-y-2">
          {mandates.data!.map((m) => {
            const st = statusOf(MANDATE_STATUS, m.status);
            return (
              <ItemRow key={m.mandateCode}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-mono text-sm font-semibold text-gray-900">{m.mandateCode}</p>
                    <p className="text-xs text-gray-400">Portefeuille {m.walletNumber}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <StatusChip tone={st.tone}>{st.label}</StatusChip>
                    {m.status === "SUSPENDED" && (
                      <IconButton icon={RotateCcw} label="Réactiver le mandat" tone="success" pending={reactivate.isPending && reactivate.variables === m.mandateCode} onClick={() => reactivate.mutate(m.mandateCode)} />
                    )}
                    {m.status !== "REVOKED" && <IconButton icon={Ban} label="Révoquer le mandat" tone="danger" onClick={() => { setReason(""); setPanel({ kind: "revoke", mandate: m }); }} />}
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Detail label="Consentement">{formatDate(m.consentGivenAt)}</Detail>
                  <Detail label="Recueilli par">{m.consentGivenBy ?? undefined}</Detail>
                  <Detail label="Plafond par prélèvement">{m.maxAmountPerDebit ? formatMoney(m.maxAmountPerDebit, currency) : undefined}</Detail>
                  <Detail label="Échecs de suite">{m.consecutiveFailures}</Detail>
                  <Detail label="Dernier prélèvement">{formatDateTime(m.lastDebitAt)}</Detail>
                  <Detail label="Révoqué le">{formatDate(m.revokedAt)}</Detail>
                  <Detail label="Motif de révocation" wide>
                    {m.revocationReason ?? undefined}
                  </Detail>
                </div>
                {m.status === "SUSPENDED" && (
                  <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700">
                    Suspendu après trois échecs de suite. Réactivez-le une fois le portefeuille approvisionné.
                  </p>
                )}
              </ItemRow>
            );
          })}
        </div>
      )}

      <div className="mt-5">
        <p className="mb-2 text-xs font-semibold text-gray-400">Tentatives de prélèvement</p>
        {attempts.isLoading ? (
          <Skeleton className="h-16 w-full rounded-2xl" />
        ) : attempts.isError ? (
          <ErrorBlock message="Impossible de charger les tentatives." onRetry={() => attempts.refetch()} />
        ) : (attempts.data ?? []).length === 0 ? (
          <p className="rounded-2xl bg-white px-4 py-3 text-sm text-gray-500 shadow-sm">Aucune tentative pour le moment.</p>
        ) : (
          <div className="space-y-2">
            {attempts.data!.map((t) => {
              const st = statusOf(ATTEMPT_STATUS, t.status);
              return (
                <ItemRow key={`${t.invoiceNumber}-${t.executedAt}`} className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-mono text-sm font-semibold text-gray-900">{t.invoiceNumber}</p>
                    <p className="text-xs text-gray-400">
                      {formatDateTime(t.executedAt)}
                      {t.message ? ` · ${t.message}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-900">{formatMoney(t.amount, t.currency || currency)}</span>
                    <StatusChip tone={st.tone}>{st.label}</StatusChip>
                    {t.status !== "SUCCEEDED" && hasActive && (
                      <IconButton icon={RefreshCw} label="Retenter le prélèvement" pending={retrying === t.invoiceNumber} onClick={() => retry(t.invoiceNumber)} />
                    )}
                  </div>
                </ItemRow>
              );
            })}
          </div>
        )}
      </div>
    </Section>
  );
};
