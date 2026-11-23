import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileCheck2 } from "lucide-react";
import { treasuryService } from "../../../services/treasury.service";
import type { Cheque, DepositSlip } from "../../../services/treasury.service";
import { useAuth } from "../../../contexts/AuthContext";
import { money } from "../../../components/accounting/accountingLabels";
import { ActionButton, DataCard, EmptyState, ErrorBlock, Field, ListHeader, PanelForm, Section, StatusChip } from "../../../components/subscription/kit";
import { FIELD, apiMessage, formatDate, formatDateTime } from "../../../components/subscription/kitUtils";
import { ListSkeleton } from "../../../components/ui/Skeleton";
import { toast } from "../../../components/ui/toastStore";

const KEY = "treasury-cheques";
const TONE: Record<string, "success" | "warn" | "danger" | "neutral" | "info"> = { RECEIVED: "info", IN_SLIP: "warn", DEPOSITED: "warn", CLEARED: "success", REJECTED: "danger", CREDITED: "success" };

export const ChequesPanel: React.FC = () => {
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const canManage = hasPermission("BANK_RECONCILIATION:MANAGE");
  const [status, setStatus] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [slipForm, setSlipForm] = useState({ bankAccountCode: "", registerCode: "", cashAmount: "" });
  const [slipOpen, setSlipOpen] = useState(false);
  const [rejecting, setRejecting] = useState<Cheque | null>(null);
  const [rej, setRej] = useState({ reason: "", fees: "", bankAccountCode: "" });
  const [err, setErr] = useState<string | null>(null);

  const cheques = useQuery({ queryKey: [KEY, "cheques", status], queryFn: () => treasuryService.cheques(status || undefined) });
  const slips = useQuery({ queryKey: [KEY, "slips"], queryFn: treasuryService.slips });
  const banks = useQuery({ queryKey: ["treasury-banks", "accounts"], queryFn: treasuryService.bankAccounts });
  const refresh = () => qc.invalidateQueries({ queryKey: [KEY] });

  const prepare = useMutation({
    mutationFn: () => treasuryService.prepareSlip({ bankAccountCode: slipForm.bankAccountCode, registerCode: slipForm.registerCode, cashAmount: slipForm.cashAmount ? Number(slipForm.cashAmount.replace(",", ".")) : undefined, chequeTransactions: picked }),
    onSuccess: () => { refresh(); setPicked([]); setSlipOpen(false); toast.success("Bordereau préparé"); },
    onError: (e) => setErr(apiMessage(e, "Préparation impossible.")),
  });
  const reject = useMutation({
    mutationFn: () => treasuryService.rejectCheque(rejecting!.transactionNumber, { reason: rej.reason, fees: rej.fees ? Number(rej.fees.replace(",", ".")) : undefined, bankAccountCode: rej.bankAccountCode }),
    onSuccess: () => { refresh(); setRejecting(null); toast.success("Chèque rejeté"); },
    onError: (e) => setErr(apiMessage(e, "Rejet impossible.")),
  });
  const step = (s: DepositSlip, kind: "deposit" | "credit") =>
    toast.confirm({
      message: kind === "deposit" ? `Marquer le bordereau ${s.number} comme déposé ?` : `Créditer le bordereau ${s.number} ?`,
      detail: kind === "credit" ? "Génère l'écriture de crédit en banque." : undefined,
      confirmLabel: kind === "deposit" ? "Déposer" : "Créditer",
      successMessage: kind === "deposit" ? "Bordereau déposé" : "Bordereau crédité",
      errorMessage: "Action impossible",
      onConfirm: async () => { await (kind === "deposit" ? treasuryService.depositSlip(s.number) : treasuryService.creditSlip(s.number)); refresh(); },
    });

  const toggle = (tn: string) => setPicked((p) => (p.includes(tn) ? p.filter((x) => x !== tn) : [...p, tn]));

  return (
    <div className="space-y-5">
      <ListHeader title="Chèques et bordereaux de remise" subtitle="Chèques reçus en caisse, remise en banque, rejets." />

      {rejecting && (
        <PanelForm title={`Rejeter le chèque ${rejecting.chequeNumber ?? rejecting.transactionNumber}`} onSubmit={(e) => { e.preventDefault(); setErr(null); reject.mutate(); }} onCancel={() => setRejecting(null)} pending={reject.isPending} submitLabel="Rejeter" submitDisabled={!rej.reason.trim()} error={err}>
          <Field label="Motif" required><input className={FIELD} value={rej.reason} onChange={(e) => setRej({ ...rej, reason: e.target.value })} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Frais bancaires"><input className={FIELD} inputMode="decimal" value={rej.fees} onChange={(e) => setRej({ ...rej, fees: e.target.value })} /></Field>
            <Field label="Compte bancaire">
              <select className={FIELD} value={rej.bankAccountCode} onChange={(e) => setRej({ ...rej, bankAccountCode: e.target.value })}>
                <option value="">Par défaut</option>
                {(banks.data ?? []).map((b) => <option key={b.code} value={b.code}>{b.label || b.code}</option>)}
              </select>
            </Field>
          </div>
        </PanelForm>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <input className={`${FIELD} w-auto`} value={status} onChange={(e) => setStatus(e.target.value.toUpperCase())} placeholder="Statut (code exact)" aria-label="Statut" />
        {canManage && picked.length > 0 && !slipOpen && <ActionButton onClick={() => setSlipOpen(true)}>Préparer un bordereau ({picked.length})</ActionButton>}
      </div>

      {slipOpen && (
        <PanelForm title="Nouveau bordereau de remise" onSubmit={(e) => { e.preventDefault(); setErr(null); prepare.mutate(); }} onCancel={() => setSlipOpen(false)} pending={prepare.isPending} submitLabel="Préparer" submitDisabled={!slipForm.bankAccountCode} error={err}>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Compte bancaire" required>
              <select className={FIELD} value={slipForm.bankAccountCode} onChange={(e) => setSlipForm({ ...slipForm, bankAccountCode: e.target.value })}>
                <option value="">Choisir…</option>
                {(banks.data ?? []).map((b) => <option key={b.code} value={b.code}>{b.label || b.code}</option>)}
              </select>
            </Field>
            <Field label="Code caisse"><input className={FIELD} value={slipForm.registerCode} onChange={(e) => setSlipForm({ ...slipForm, registerCode: e.target.value })} /></Field>
            <Field label="Espèces à remettre"><input className={FIELD} inputMode="decimal" value={slipForm.cashAmount} onChange={(e) => setSlipForm({ ...slipForm, cashAmount: e.target.value })} /></Field>
          </div>
          <p className="text-xs text-gray-500">{picked.length} chèque(s) sélectionné(s).</p>
        </PanelForm>
      )}

      {cheques.isLoading ? <ListSkeleton rows={5} /> : cheques.isError ? (
        <ErrorBlock message={apiMessage(cheques.error, "Chèques indisponibles.")} onRetry={() => cheques.refetch()} />
      ) : (cheques.data ?? []).length === 0 ? (
        <EmptyState icon={FileCheck2} title="Aucun chèque" />
      ) : (
        <DataCard>
          <div className="space-y-1">
            {cheques.data!.map((c) => {
              const selectable = canManage && !c.slipNumber && c.status !== "REJECTED";
              return (
                <div key={c.transactionNumber} className="flex flex-wrap items-center gap-3 rounded-xl px-4 py-3">
                  {selectable && <input type="checkbox" aria-label="Sélectionner" checked={picked.includes(c.transactionNumber)} onChange={() => toggle(c.transactionNumber)} className="h-4 w-4 accent-[color:var(--logo-pink-dark)]" />}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900">Chèque {c.chequeNumber} · {c.bankName}</p>
                    <p className="truncate text-xs text-gray-400">{c.drawer} · reçu {formatDate(c.receivedAt)} · {c.transactionNumber}{c.slipNumber ? ` · bordereau ${c.slipNumber}` : ""}{c.rejectedReason ? ` · ${c.rejectedReason}` : ""}</p>
                  </div>
                  <span className="font-mono text-sm font-bold">{money(c.amount)}</span>
                  <StatusChip tone={TONE[c.status ?? ""] ?? "neutral"}>{c.status}</StatusChip>
                  {canManage && c.status !== "REJECTED" && c.status !== "CLEARED" && (
                    <ActionButton variant="ghost" onClick={() => { setRejecting(c); setRej({ reason: "", fees: "", bankAccountCode: "" }); setErr(null); }}>Rejeter</ActionButton>
                  )}
                </div>
              );
            })}
          </div>
        </DataCard>
      )}

      <Section title="Bordereaux de remise">
        {(slips.data ?? []).length === 0 ? <p className="text-sm text-gray-400">Aucun bordereau.</p> : (
          <div className="space-y-2">
            {slips.data!.map((s) => (
              <div key={s.number} className="flex flex-wrap items-center gap-3 rounded-2xl bg-white p-3 shadow-sm">
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-xs font-bold">{s.number}</p>
                  <p className="text-xs text-gray-400">{s.bankAccountCode} · chèques {money(s.chequeTotal)} · espèces {money(s.cashAmount)} · {formatDateTime(s.createdAt)}{s.creditEntry ? ` · écriture ${s.creditEntry}` : ""}</p>
                </div>
                <StatusChip tone={TONE[s.status ?? ""] ?? "neutral"}>{s.status}</StatusChip>
                {canManage && !s.depositedAt && <ActionButton variant="ghost" onClick={() => step(s, "deposit")}>Déposer</ActionButton>}
                {canManage && s.depositedAt && !s.creditedAt && <ActionButton onClick={() => step(s, "credit")}>Créditer</ActionButton>}
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
};
