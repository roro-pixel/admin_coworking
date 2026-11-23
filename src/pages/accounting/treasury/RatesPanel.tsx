import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Coins, RefreshCw } from "lucide-react";
import { treasuryService } from "../../../services/treasury.service";
import { useAuth } from "../../../contexts/AuthContext";
import { ActionButton, DataCard, EmptyState, ErrorBlock, Field, ListHeader, PanelForm, Section } from "../../../components/subscription/kit";
import { FIELD, apiMessage, formatDate } from "../../../components/subscription/kitUtils";
import { ListSkeleton } from "../../../components/ui/Skeleton";
import { toast } from "../../../components/ui/toastStore";

const KEY = "treasury-rates";

export const RatesPanel: React.FC = () => {
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const canManage = hasPermission("CASH_EXCHANGE_RATE:MANAGE");
  const [f, setF] = useState({ currency: "", rate: "", validOn: "" });
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [conv, setConv] = useState({ amount: "", from: "", to: "XAF" });
  const [result, setResult] = useState<string | null>(null);

  const board = useQuery({ queryKey: [KEY, "board"], queryFn: () => treasuryService.rateBoard() });
  const refresh = () => qc.invalidateQueries({ queryKey: [KEY] });

  const save = useMutation({
    mutationFn: () => treasuryService.setRate({ currency: f.currency.toUpperCase(), rate: Number(f.rate.replace(",", ".")), validOn: f.validOn || undefined }),
    onSuccess: () => { refresh(); setOpen(false); setF({ currency: "", rate: "", validOn: "" }); toast.success("Taux enregistré"); },
    onError: (e) => setErr(apiMessage(e, "Enregistrement impossible.")),
  });
  const fetchAll = useMutation({
    mutationFn: treasuryService.fetchRates,
    onSuccess: (r) => { refresh(); toast.success(`${r.length} taux mis à jour`); },
    onError: (e) => toast.error(apiMessage(e, "Récupération impossible.")),
  });
  const convert = useMutation({
    mutationFn: () => treasuryService.convert({ amount: Number(conv.amount.replace(",", ".")), from: conv.from.toUpperCase(), to: conv.to.toUpperCase() || undefined }),
    onSuccess: (v) => setResult(`${conv.amount} ${conv.from.toUpperCase()} = ${v.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} ${conv.to.toUpperCase()}`),
    onError: (e) => toast.error(apiMessage(e, "Conversion impossible.")),
  });

  return (
    <div className="space-y-5">
      <ListHeader
        title="Taux de change"
        subtitle="Taux du jour par devise, en équivalent de la devise de base."
        action={canManage ? (
          <div className="flex gap-2">
            <ActionButton variant="ghost" icon={RefreshCw} pending={fetchAll.isPending} onClick={() => fetchAll.mutate()}>Actualiser en ligne</ActionButton>
            {!open && <ActionButton onClick={() => setOpen(true)}>Saisir un taux</ActionButton>}
          </div>
        ) : undefined}
      />
      {open && (
        <PanelForm title="Saisir un taux" onSubmit={(e) => { e.preventDefault(); setErr(null); save.mutate(); }} onCancel={() => setOpen(false)} pending={save.isPending} submitLabel="Enregistrer" submitDisabled={!f.currency.trim() || !f.rate.trim()} error={err}>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Devise" required><input className={FIELD} value={f.currency} maxLength={3} onChange={(e) => setF({ ...f, currency: e.target.value })} /></Field>
            <Field label="Taux" required><input className={FIELD} inputMode="decimal" value={f.rate} onChange={(e) => setF({ ...f, rate: e.target.value })} /></Field>
            <Field label="Valable à partir du" hint="Par défaut : aujourd'hui"><input type="date" className={FIELD} value={f.validOn} onChange={(e) => setF({ ...f, validOn: e.target.value })} /></Field>
          </div>
        </PanelForm>
      )}
      {board.isLoading ? <ListSkeleton rows={3} /> : board.isError ? (
        <ErrorBlock message={apiMessage(board.error, "Taux indisponibles.")} onRetry={() => board.refetch()} />
      ) : (board.data ?? []).length === 0 ? (
        <EmptyState icon={Coins} title="Aucun taux" hint="Saisissez un taux ou actualisez en ligne." />
      ) : (
        <DataCard>
          <div className="space-y-1">
            {board.data!.map((r) => (
              <div key={r.currency} className="flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-3">
                <span className="text-sm font-bold text-gray-900">{r.currency}</span>
                <span className="font-mono text-sm">{r.rate.toLocaleString("fr-FR", { maximumFractionDigits: 6 })}</span>
                <span className="text-xs text-gray-400">{formatDate(r.validOn)} · {r.source}{r.provider ? ` (${r.provider})` : ""}</span>
              </div>
            ))}
          </div>
        </DataCard>
      )}
      <Section title="Convertisseur">
        <div className="grid items-end gap-3 sm:grid-cols-4">
          <Field label="Montant"><input className={FIELD} inputMode="decimal" value={conv.amount} onChange={(e) => setConv({ ...conv, amount: e.target.value })} /></Field>
          <Field label="De"><input className={FIELD} maxLength={3} value={conv.from} onChange={(e) => setConv({ ...conv, from: e.target.value })} /></Field>
          <Field label="Vers"><input className={FIELD} maxLength={3} value={conv.to} onChange={(e) => setConv({ ...conv, to: e.target.value })} /></Field>
          <ActionButton pending={convert.isPending} disabled={!conv.amount || !conv.from} onClick={() => convert.mutate()}>Convertir</ActionButton>
        </div>
        {result && <p className="mt-3 text-sm font-semibold text-gray-900">{result}</p>}
      </Section>
    </div>
  );
};
