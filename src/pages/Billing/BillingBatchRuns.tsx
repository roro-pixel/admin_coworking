import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Layers, Plus } from "lucide-react";
import { billingService } from "../../services/billing.service";
import { ActionButton, Detail, ErrorBanner, Field, ItemRow, ListHeader, PanelForm, Section, StatusChip, Switch } from "../../components/subscription/kit";
import { FIELD_SOFT, MONO_LINK, formatDate, formatDateTime, formatMoney } from "../../components/subscription/kitUtils";
import { KpiRow } from "../../components/operations/OpsCharts";
import { toast } from "../../components/ui/toastStore";
import { useAuth } from "../../contexts/AuthContext";
import { BATCH_STATUS_LABEL, BATCH_STATUS_TONE, SOURCE_TYPE_LABEL } from "../../components/billing/billingLabels";
import { billingError } from "../../components/billing/billingErrors";
import { QueryState } from "../../components/billing/pageKit";

const monthStart = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toLocaleDateString("sv-SE"); };
const today = () => new Date().toLocaleDateString("sv-SE");

const RunDetail: React.FC<{ runNumber: string; onBack: () => void }> = ({ runNumber, onBack }) => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const canUpdate = hasPermission("BILLING:UPDATE");
  const canCreate = hasPermission("BILLING:CREATE");
  const canCancel = hasPermission("BILLING:CANCEL");
  const [error, setError] = useState<string | null>(null);
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ["billing-batch-run", runNumber], queryFn: () => billingService.getBatchRun(runNumber) });
  const refresh = () => { qc.invalidateQueries({ queryKey: ["billing-batch-run", runNumber] }); qc.invalidateQueries({ queryKey: ["billing-batch-runs"] }); };

  const exclude = useMutation({
    mutationFn: (v: { id: number; excluded: boolean }) => billingService.excludeBatchItem(runNumber, v.id, v.excluded),
    onSuccess: refresh,
    onError: (e: unknown) => setError(billingError(e, "Modification impossible.")),
  });
  const issue = useMutation({
    mutationFn: () => billingService.issueBatchRun(runNumber),
    onSuccess: () => { refresh(); setError(null); toast.success("Factures émises."); },
    onError: (e: unknown) => setError(billingError(e, "Émission impossible.")),
  });
  const cancel = useMutation({
    mutationFn: () => billingService.cancelBatchRun(runNumber),
    onSuccess: () => { refresh(); setError(null); toast.success("Lot annulé."); },
    onError: (e: unknown) => setError(billingError(e, "Annulation impossible.")),
  });

  return (
    <QueryState isLoading={isLoading} isError={isError} onRetry={() => refetch()} isEmpty={!data} icon={Layers} title="Lot introuvable">
      {data && (
        <div className="space-y-5">
          <ListHeader
            title={data.title || data.runNumber}
            subtitle={`${data.runNumber} · du ${formatDate(data.periodFrom)} au ${formatDate(data.periodTo)}`}
            action={<ActionButton variant="ghost" onClick={onBack}>Retour aux lots</ActionButton>}
          />
          <ErrorBanner message={error} />
          <KpiRow columns={3} items={[
            { label: "Statut", value: BATCH_STATUS_LABEL[data.status ?? ""] ?? data.status ?? "" },
            { label: "Clients", value: (data.customers ?? []).filter((c) => !c.excluded).length, hint: `${(data.customers ?? []).length} au total` },
            { label: "Total à facturer", value: formatMoney(data.totalToInvoice ?? 0), tone: "pink" },
          ]} />
          <Section title="Clients du lot" icon={Layers} description={data.status === "PREVIEW" ? "Excluez les clients à ne pas facturer avant l'émission." : undefined}
            action={data.status === "PREVIEW" ? (
              <div className="flex gap-2">
                {canCancel && <ActionButton variant="ghost" className="!px-4 !py-2" pending={cancel.isPending} onClick={() => cancel.mutate()}>Annuler le lot</ActionButton>}
                {canCreate && <ActionButton className="!px-4 !py-2" pending={issue.isPending} onClick={() => toast.confirm({ message: "Émettre toutes les factures du lot ?", detail: "Une facture est créée et émise par client non exclu.", confirmLabel: "Émettre", pendingLabel: "Émission", successMessage: "Factures émises.", errorMessage: "Émission impossible.", onConfirm: async () => { await billingService.issueBatchRun(runNumber); refresh(); } })}>Émettre les factures</ActionButton>}
              </div>
            ) : undefined}>
            <div className="space-y-2">
              {(data.customers ?? []).map((c) => (
                <ItemRow key={c.itemId} className={c.excluded ? "opacity-60" : ""}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{c.customerName ?? c.customerCode}</p>
                      <p className="text-xs text-gray-500">{c.itemCount} élément{(c.itemCount ?? 0) > 1 ? "s" : ""}{c.billingCompany ? ` · facturé à ${c.billingCompany}` : ""}</p>
                      {c.error && <p className="mt-1 text-xs text-red-600">{c.error}</p>}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold tabular-nums text-gray-950">{formatMoney(c.totalAmount ?? 0)}</span>
                      {c.invoiceNumber && <button type="button" className={MONO_LINK} onClick={() => navigate(`/billing/documents/${c.invoiceNumber}`)}>{c.invoiceNumber}</button>}
                      {data.status === "PREVIEW" && canUpdate && (
                        <ActionButton variant="ghost" className="!px-4 !py-2" pending={exclude.isPending && exclude.variables?.id === c.itemId} onClick={() => exclude.mutate({ id: c.itemId, excluded: !c.excluded })}>
                          {c.excluded ? "Réintégrer" : "Exclure"}
                        </ActionButton>
                      )}
                    </div>
                  </div>
                </ItemRow>
              ))}
            </div>
            <p className="mt-3 text-xs text-gray-400">
              Créé par {data.createdBy ?? "—"}{data.issuedAt ? ` · émis le ${formatDateTime(data.issuedAt)} par ${data.issuedBy ?? "—"}` : ""}
            </p>
          </Section>
        </div>
      )}
    </QueryState>
  );
};

/** Facturation groupée : aperçu d'une période, exclusions, émission en un clic. */
export const BillingBatchRuns: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const runNumber = params.get("run");
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const canCreate = hasPermission("BILLING:CREATE");
  const [creating, setCreating] = useState(false);
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(today());
  const [title, setTitle] = useState("");
  const [sources, setSources] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ["billing-batch-runs"], queryFn: () => billingService.listBatchRuns(), enabled: !runNumber });
  const preview = useMutation({
    mutationFn: () => billingService.previewBatchRun({ periodFrom: from, periodTo: to, title: title.trim() || undefined, sourceTypes: sources.size ? Array.from(sources) : undefined }),
    onSuccess: (r) => { qc.invalidateQueries({ queryKey: ["billing-batch-runs"] }); setCreating(false); setError(null); setParams({ run: r.runNumber }); },
    onError: (e: unknown) => setError(billingError(e, "Aperçu impossible.")),
  });

  if (runNumber) return <RunDetail runNumber={runNumber} onBack={() => setParams({})} />;
  const runs = data ?? [];
  const toggle = (k: string) => setSources((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; });

  return (
    <div className="space-y-5">
      <ListHeader title="Facturation groupée" subtitle="Facturer en une fois tous les éléments à facturer d'une période" action={canCreate ? <ActionButton icon={Plus} onClick={() => setCreating((c) => !c)}>Nouveau lot</ActionButton> : undefined} />
      {creating && canCreate && (
        <PanelForm title="Aperçu d'un lot" submitLabel="Calculer l'aperçu" pending={preview.isPending} submitDisabled={!from || !to || from > to} error={error} onCancel={() => setCreating(false)} onSubmit={(e) => { e.preventDefault(); setError(null); preview.mutate(); }}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Du" required><input type="date" className={FIELD_SOFT} value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
            <Field label="Au" required><input type="date" className={FIELD_SOFT} value={to} onChange={(e) => setTo(e.target.value)} /></Field>
            <Field label="Intitulé"><input className={FIELD_SOFT} value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-600">Sources (aucune cochée : toutes)</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {Object.entries(SOURCE_TYPE_LABEL).map(([k, v]) => <Switch key={k} checked={sources.has(k)} onChange={() => toggle(k)} label={v} />)}
            </div>
          </div>
        </PanelForm>
      )}
      <QueryState isLoading={isLoading} isError={isError} onRetry={() => refetch()} isEmpty={runs.length === 0} icon={Layers} title="Aucun lot de facturation" hint="Calculez un aperçu pour une période, puis émettez les factures.">
        <div className="space-y-2">
          {runs.map((r) => (
            <button key={r.runNumber} type="button" onClick={() => setParams({ run: r.runNumber })} className="block w-full text-left">
              <ItemRow>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{r.title || r.runNumber}</p>
                    <p className="font-mono text-xs text-gray-400">{r.runNumber}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <Detail label="Période">{formatDate(r.periodFrom)} → {formatDate(r.periodTo)}</Detail>
                    <Detail label="Clients">{r.customers}</Detail>
                    <Detail label="Factures">{r.invoices}</Detail>
                    <StatusChip tone={BATCH_STATUS_TONE[r.status ?? ""] ?? "neutral"}>{BATCH_STATUS_LABEL[r.status ?? ""] ?? r.status}</StatusChip>
                  </div>
                </div>
              </ItemRow>
            </button>
          ))}
        </div>
      </QueryState>
    </div>
  );
};
