import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Receipt } from "lucide-react";
import { AccountingShell } from "../../../components/accounting/AccountingShell";
import { vatService } from "../../../services/vat.service";
import { useAuth } from "../../../contexts/AuthContext";
import { money } from "../../../components/accounting/accountingLabels";
import { ActionButton, EmptyState, ErrorBlock, Field, ListHeader, PanelForm, StatusChip } from "../../../components/subscription/kit";
import { FIELD, apiMessage, formatDate } from "../../../components/subscription/kitUtils";
import { ListSkeleton } from "../../../components/ui/Skeleton";
import { toast } from "../../../components/ui/toastStore";

export const VAT_KEY = "vat-returns";
export const vatTone = (s?: string) => (s === "LIQUIDATED" ? "success" : s === "VALIDATED" ? "info" : s === "DRAFT" || s === "PREPARED" ? "warn" : "neutral");

export const VatPage: React.FC = () => {
  const qc = useQueryClient();
  const nav = useNavigate();
  const { hasPermission } = useAuth();
  const canPrepare = hasPermission("VAT_RETURN:PREPARE");
  const [open, setOpen] = useState(false);
  const [period, setPeriod] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const q = useQuery({ queryKey: [VAT_KEY], queryFn: vatService.list });
  const prep = useMutation({
    mutationFn: () => vatService.prepare(period.trim()),
    onSuccess: (r) => { qc.invalidateQueries({ queryKey: [VAT_KEY] }); toast.success("Déclaration préparée"); setOpen(false); setPeriod(""); if (r?.id != null) nav(`/accounting/vat/${r.id}`); },
    onError: (e) => setErr(apiMessage(e, "Préparation impossible.")),
  });
  return (
    <AccountingShell>
      <div className="space-y-5">
        <ListHeader title="Déclarations de TVA" subtitle="TVA collectée, TVA déductible et crédit reporté, période par période."
          action={canPrepare && !open ? <ActionButton onClick={() => setOpen(true)}>Préparer une déclaration</ActionButton> : undefined} />
        {open && (
          <PanelForm title="Préparer une déclaration" onSubmit={(e) => { e.preventDefault(); setErr(null); prep.mutate(); }} onCancel={() => setOpen(false)} pending={prep.isPending} submitLabel="Préparer" submitDisabled={!period.trim()} error={err}>
            <Field label="Période" required hint="Code de la période comptable (ex. 2026-10)"><input className={FIELD} value={period} onChange={(e) => setPeriod(e.target.value)} /></Field>
          </PanelForm>
        )}
        {q.isLoading ? <ListSkeleton /> : q.isError ? <ErrorBlock message="Chargement impossible." onRetry={() => q.refetch()} /> : (q.data ?? []).length === 0 ? <EmptyState icon={Receipt} title="Aucune déclaration" /> : (
          <div className="space-y-2">
            {q.data!.map((r) => (
              <button key={r.id} onClick={() => nav(`/accounting/vat/${r.id}`)} className="flex w-full flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-3 text-left shadow-sm hover:bg-gray-50">
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-gray-900">{r.periodCode} <span className="font-normal text-gray-400">· {formatDate(r.startDate)} → {formatDate(r.endDate)}{r.regime ? ` · ${r.regime}` : ""}</span></span>
                  <span className="block text-xs text-gray-400">Collectée {money(r.collected)} · déductible {money(r.deductible)}</span>
                </span>
                <span className="flex items-center gap-3 text-sm">
                  <span className="font-mono">{(r.dueAmount ?? 0) > 0 ? `À payer ${money(r.dueAmount)}` : `Crédit ${money(r.creditCarriedForward)}`}</span>
                  {r.status && <StatusChip tone={vatTone(r.status)}>{r.status}</StatusChip>}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </AccountingShell>
  );
};
