import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban, HandCoins, PackageCheck, Send, Truck } from "lucide-react";
import { cashRegisterService } from "../../services/cashRegister.service";
import type { CashTransfer, CashTransferStatus } from "../../services/cashRegister.service";
import { useAuth } from "../../contexts/AuthContext";
import { ActionButton, DataCard, EmptyState, ErrorBlock, Field, IconButton, ListHeader, PanelForm, Section, StatusChip } from "../../components/subscription/kit";
import { FIELD_SOFT, apiMessage, formatDateTime, formatMoney } from "../../components/subscription/kitUtils";
import { statusOf } from "../../components/subscription/labels";
import { ListSkeleton } from "../../components/ui/Skeleton";
import { toast } from "../../components/ui/toastStore";
import { RefreshButton } from "../../components/reporting/reportKit";
import { CountForm, buildCountRequest, countTotal, emptyCount } from "../../components/cash/CountForm";
import type { CountDraft } from "../../components/cash/CountForm";
import { RegisterSelect, useDenominations } from "../../components/cash/cashPickers";
import { TRANSFER_KIND, TRANSFER_STATUS } from "../../components/cash/cashLabels";
import { parseDigits } from "../../components/payment/paymentUtils";

type Panel = null | { kind: "send" } | { kind: "refill" } | { kind: "receive"; t: CashTransfer } | { kind: "cancel"; t: CashTransfer };

const fmt = (n?: number | null) => (n == null ? "—" : formatMoney(n, "FCFA"));

/** Transferts de fonds entre caisses : envoi, réception avec comptage, annulation, réapprovisionnement de petite caisse. */
export const CashTransfersPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const canSend = hasPermission("CASH_TRANSFER:SEND");
  const canReceive = hasPermission("CASH_TRANSFER:RECEIVE");
  const [registerCode, setRegisterCode] = useState("");
  const [status, setStatus] = useState<CashTransferStatus | "">("");
  const [panel, setPanel] = useState<Panel>(null);
  const [error, setError] = useState<string | null>(null);

  // Formulaire d'envoi
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [mode, setMode] = useState<"amount" | "count">("amount");
  const [amount, setAmount] = useState(0);
  const [carrier, setCarrier] = useState("");
  const [note, setNote] = useState("");
  const [draft, setDraft] = useState<CountDraft>(emptyCount());
  const [reason, setReason] = useState("");
  const [refillRegister, setRefillRegister] = useState("");

  const denoms = useDenominations();
  const withLines = (denoms.data ?? []).length > 0;

  const list = useQuery({ queryKey: ["cash-transfers", registerCode, status], queryFn: () => cashRegisterService.getTransfers({ registerCode: registerCode || undefined, status: status || undefined }) });
  const refill = useQuery({ queryKey: ["cash-petty-refill", refillRegister], queryFn: () => cashRegisterService.getPettyRefill(refillRegister), enabled: panel?.kind === "refill" && !!refillRegister });

  const done = (msg: string) => () => {
    toast.success(msg);
    setPanel(null);
    setError(null);
    setDraft(emptyCount());
    setReason("");
    queryClient.invalidateQueries({ queryKey: ["cash-transfers"] });
    queryClient.invalidateQueries({ queryKey: ["cash-position"] });
  };
  const fail = (fallback: string) => (e: unknown) => setError(apiMessage(e, fallback));

  const send = useMutation({
    mutationFn: () =>
      cashRegisterService.createTransfer({
        fromRegisterCode: from,
        toRegisterCode: to || undefined,
        ...(mode === "amount" ? { amount } : { count: buildCountRequest(draft, denoms.data ?? [], "XAF", withLines, {}) }),
        carrierEmail: carrier.trim() || undefined,
        note: note.trim() || undefined,
      }),
    onSuccess: done("Transfert envoyé"),
    onError: fail("Envoi impossible"),
  });
  const receive = useMutation({
    mutationFn: (t: CashTransfer) => cashRegisterService.receiveTransfer(t.transferNumber, { count: buildCountRequest(draft, denoms.data ?? [], t.currency ?? "XAF", withLines, {}), reason: reason.trim() || undefined }),
    onSuccess: done("Transfert reçu"),
    onError: fail("Réception impossible"),
  });
  const cancel = useMutation({
    mutationFn: (t: CashTransfer) => cashRegisterService.cancelTransfer(t.transferNumber, { reasonText: reason.trim() }),
    onSuccess: done("Transfert annulé"),
    onError: fail("Annulation impossible"),
  });
  const doRefill = useMutation({
    mutationFn: () => cashRegisterService.createPettyRefill(refillRegister, carrier.trim() || undefined),
    onSuccess: done("Réapprovisionnement envoyé"),
    onError: fail("Réapprovisionnement impossible"),
  });

  const open = (p: Panel) => {
    setPanel(p);
    setError(null);
    setDraft(emptyCount());
    setReason("");
  };
  const transfers = list.data ?? [];
  const sendReady = !!from && (mode === "amount" ? amount > 0 : countTotal(draft, denoms.data ?? [], withLines) > 0) && from !== to;

  return (
    <div className="space-y-5">
      <ListHeader
        title="Transferts de fonds"
        subtitle="Envois entre caisses, coffre et petites caisses : l'envoi sort l'argent, la réception le compte."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <RefreshButton fetching={list.isFetching} onClick={() => list.refetch()} />
            {canSend && (
              <>
                <ActionButton variant="ghost" icon={HandCoins} onClick={() => open({ kind: "refill" })}>
                  Petite caisse
                </ActionButton>
                <ActionButton icon={Send} onClick={() => open({ kind: "send" })}>
                  Nouveau transfert
                </ActionButton>
              </>
            )}
          </div>
        }
      />

      {panel?.kind === "send" && (
        <PanelForm title="Nouveau transfert" onSubmit={(e) => { e.preventDefault(); send.mutate(); }} onCancel={() => setPanel(null)} pending={send.isPending} submitLabel="Envoyer" submitDisabled={!sendReady} error={error}>
          <div className="grid gap-4 md:grid-cols-2">
            <RegisterSelect label="Caisse d'envoi" required value={from} onChange={setFrom} />
            <RegisterSelect label="Caisse de destination" value={to} onChange={setTo} emptyLabel="Sans destination (remise externe)" hint="Laissez vide pour une remise hors caisse (banque, convoyeur)." />
          </div>
          <div className="flex gap-2">
            {(["amount", "count"] as const).map((m) => (
              <button key={m} type="button" onClick={() => setMode(m)} className={`rounded-full px-4 py-2 text-sm font-semibold ${mode === m ? "bg-gray-950 text-white" : "bg-white text-gray-600 shadow-sm"}`}>
                {m === "amount" ? "Montant" : "Comptage par coupures"}
              </button>
            ))}
          </div>
          {mode === "amount" ? (
            <Field label="Montant (FCFA)" required>
              <input inputMode="numeric" value={amount || ""} onChange={(e) => setAmount(parseDigits(e.target.value))} className={`${FIELD_SOFT} w-56`} />
            </Field>
          ) : (
            <CountForm draft={draft} onChange={setDraft} denominations={denoms.data ?? []} withLines={withLines} showVariance={false} />
          )}
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Convoyeur" hint="E-mail du porteur des fonds. Facultatif.">
              <input value={carrier} onChange={(e) => setCarrier(e.target.value)} className={FIELD_SOFT} />
            </Field>
            <Field label="Note">
              <input value={note} onChange={(e) => setNote(e.target.value)} className={FIELD_SOFT} />
            </Field>
          </div>
          {from && from === to && <p className="text-xs text-red-600">La caisse d'envoi et la destination doivent être différentes.</p>}
        </PanelForm>
      )}

      {panel?.kind === "refill" && (
        <PanelForm title="Réapprovisionner une petite caisse" onSubmit={(e) => { e.preventDefault(); doRefill.mutate(); }} onCancel={() => setPanel(null)} pending={doRefill.isPending} submitLabel="Envoyer le montant proposé" submitDisabled={!refillRegister || !refill.data || refill.data.amount <= 0} error={error}>
          <RegisterSelect label="Petite caisse" required value={refillRegister} onChange={setRefillRegister} filter={(r) => r.registerType === "PETTY_CASH"} />
          {refillRegister && (refill.isLoading ? (
            <p className="text-sm text-gray-500">Calcul de la proposition…</p>
          ) : refill.isError ? (
            <p className="text-sm text-red-600">La proposition n'a pas pu être calculée.</p>
          ) : refill.data ? (
            <div className="rounded-2xl bg-gray-50 p-4 text-sm text-gray-700">
              <p>
                <strong>{fmt(refill.data.amount)}</strong> à remettre : {refill.data.expenseCount} dépense(s)
                {refill.data.since ? ` depuis le ${formatDateTime(refill.data.since)}` : ""}.
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Fonds standard : {fmt(refill.data.standardFloat)}
                {refill.data.parentRegisterCode ? ` · caisse mère ${refill.data.parentRegisterCode}` : ""}
              </p>
            </div>
          ) : null)}
          <Field label="Convoyeur" hint="Facultatif.">
            <input value={carrier} onChange={(e) => setCarrier(e.target.value)} className={FIELD_SOFT} />
          </Field>
        </PanelForm>
      )}

      {panel?.kind === "receive" && (
        <PanelForm title={`Recevoir ${panel.t.transferNumber}`} onSubmit={(e) => { e.preventDefault(); receive.mutate(panel.t); }} onCancel={() => setPanel(null)} pending={receive.isPending} submitLabel="Valider la réception" submitDisabled={countTotal(draft, denoms.data ?? [], withLines) <= 0} error={error}>
          <p className="text-sm text-gray-600">Comptez ce que vous recevez. Un écart avec le montant envoyé ({fmt(panel.t.sentAmount)}) ouvre une revue d'écart.</p>
          <CountForm draft={draft} onChange={setDraft} denominations={denoms.data ?? []} withLines={withLines} currency={panel.t.currency} showVariance={false} />
          <Field label="Motif de l'écart" hint="Facultatif.">
            <input value={reason} onChange={(e) => setReason(e.target.value)} className={FIELD_SOFT} />
          </Field>
        </PanelForm>
      )}

      {panel?.kind === "cancel" && (
        <PanelForm title={`Annuler ${panel.t.transferNumber}`} onSubmit={(e) => { e.preventDefault(); cancel.mutate(panel.t); }} onCancel={() => setPanel(null)} pending={cancel.isPending} submitLabel="Annuler le transfert" submitDisabled={reason.trim().length < 3} error={error}>
          <p className="text-xs text-gray-500">Seul un transfert encore en transit s'annule : les fonds reviennent à la caisse d'envoi.</p>
          <Field label="Motif" required>
            <input value={reason} onChange={(e) => setReason(e.target.value)} className={FIELD_SOFT} />
          </Field>
        </PanelForm>
      )}

      <div className="flex flex-wrap gap-3">
        <div className="w-full sm:w-72">
          <RegisterSelect label="Caisse" value={registerCode} onChange={setRegisterCode} emptyLabel="Toutes les caisses" />
        </div>
        <Field label="Statut">
          <select value={status} onChange={(e) => setStatus(e.target.value as CashTransferStatus | "")} className={`${FIELD_SOFT} w-48`}>
            <option value="">Tous</option>
            {Object.entries(TRANSFER_STATUS).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {list.isLoading ? (
        <ListSkeleton rows={4} />
      ) : list.isError ? (
        <ErrorBlock message="Les transferts n'ont pas pu être chargés." onRetry={() => list.refetch()} />
      ) : transfers.length === 0 ? (
        <EmptyState icon={Truck} title="Aucun transfert" hint="Aucun transfert ne correspond à ces filtres." />
      ) : (
        <DataCard>
          <div className="divide-y divide-gray-100">
            {transfers.map((t) => {
              const st = statusOf(TRANSFER_STATUS, t.status);
              const late = t.status === "IN_TRANSIT" && Number(t.minutesInTransit ?? 0) > 240;
              return (
                <div key={t.transferNumber} className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0 space-y-1">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-gray-950">
                      <span className="font-mono text-xs text-[color:var(--logo-pink-dark)]">{t.transferNumber}</span>
                      {TRANSFER_KIND[t.kind] ?? t.kind}
                      <StatusChip tone={st.tone}>{st.label}</StatusChip>
                      {late && <StatusChip tone="danger">En transit depuis longtemps</StatusChip>}
                    </p>
                    <p className="text-sm text-gray-600">
                      {t.fromRegister} → {t.toRegister || "hors caisse"}
                      {t.carrier ? ` · convoyeur ${t.carrier}` : ""}
                    </p>
                    <p className="text-xs text-gray-500">
                      Envoyé{t.sentBy ? ` par ${t.sentBy}` : ""} le {formatDateTime(t.sentAt)}
                      {t.receivedAt ? ` · reçu${t.receivedBy ? ` par ${t.receivedBy}` : ""} le ${formatDateTime(t.receivedAt)}` : ""}
                      {t.status === "IN_TRANSIT" && t.minutesInTransit != null ? ` · ${Math.round(Number(t.minutesInTransit) / 60 * 10) / 10} h en transit` : ""}
                    </p>
                    {t.cancelReason && <p className="text-xs text-gray-500">Annulé : {t.cancelReason}</p>}
                    {t.reviewNumber && <p className="text-xs text-amber-700">Écart en revue : {t.reviewNumber}</p>}
                    {t.note && <p className="text-xs text-gray-500">{t.note}</p>}
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <div className="text-right text-sm">
                      <p className="font-bold tabular-nums text-gray-950">{fmt(t.sentAmount)}</p>
                      {t.receivedAmount != null && (
                        <p className={`text-xs tabular-nums ${t.difference ? "text-red-600" : "text-gray-500"}`}>
                          reçu {fmt(t.receivedAmount)}
                          {t.difference ? ` (écart ${fmt(t.difference)})` : ""}
                        </p>
                      )}
                    </div>
                    {t.status === "IN_TRANSIT" && (
                      <div className="flex items-center gap-1">
                        {canReceive && <IconButton icon={PackageCheck} label="Recevoir" tone="success" onClick={() => open({ kind: "receive", t })} />}
                        {canSend && <IconButton icon={Ban} label="Annuler" tone="danger" onClick={() => open({ kind: "cancel", t })} />}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </DataCard>
      )}
      <Section title="Rappel">
        <p className="text-sm text-gray-600">Le montant reçu est celui que vous comptez : le serveur le compare à l'envoi et ouvre lui-même la revue d'écart.</p>
      </Section>
    </div>
  );
};
