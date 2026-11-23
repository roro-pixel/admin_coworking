import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { AlertCircle, FileText, Pencil, Plus, Trash2 } from "lucide-react";
import { billingService } from "../../services/billing.service";
import type { DealPayload, DealStage } from "../../services/billing.service";
import { ActionButton, Detail, EmptyState, ErrorBanner, Field, IconButton, ItemRow, PageHeader, PanelForm, Section, StatusChip } from "../../components/subscription/kit";
import { FIELD_SOFT, MONO_LINK, formatDate, formatDateTime, formatMoney } from "../../components/subscription/kitUtils";
import { DetailsSkeleton } from "../../components/ui/Skeleton";
import { PillChoice } from "../../components/operations/opsKit";
import { KpiRow } from "../../components/operations/OpsCharts";
import { toast } from "../../components/ui/toastStore";
import { currencyLabel } from "../../components/payment/paymentUtils";
import { useAuth } from "../../contexts/AuthContext";
import { DEAL_SOURCE_LABEL, DEAL_STAGE_LABEL, DEAL_STAGE_TONE, DOC_TYPE_LABEL, STATUS_LABEL, STATUS_TONE } from "../../components/billing/billingLabels";
import { billingError } from "../../components/billing/billingErrors";
import { toNum } from "../../components/billing/pageKit";

const STAGES = Object.keys(DEAL_STAGE_LABEL) as DealStage[];

/** Fiche d'une affaire : tableau de bord financier, étape, documents rattachés, modification. */
export const BillingDealDetail: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const canUpdate = hasPermission("BILLING:UPDATE");
  const canCancel = hasPermission("BILLING:CANCEL");
  const [panel, setPanel] = useState<"edit" | "lost" | null>(null);
  const [lostReason, setLostReason] = useState("");
  const [attach, setAttach] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", expectedAmount: "", probability: "", expectedCloseDate: "", owner: "", analyticSection: "", notes: "" });

  const { data, isLoading, isError } = useQuery({ queryKey: ["billing-deal", code], queryFn: () => billingService.getDeal(code!), enabled: !!code });
  const refresh = () => { qc.invalidateQueries({ queryKey: ["billing-deal", code] }); qc.invalidateQueries({ queryKey: ["billing-deals"] }); };

  const stage = useMutation({
    mutationFn: (v: { stage: DealStage; lostReason?: string }) => billingService.setDealStage(code!, v.stage, v.lostReason),
    onSuccess: () => { refresh(); setPanel(null); setLostReason(""); setError(null); toast.success("Étape mise à jour."); },
    onError: (e: unknown) => setError(billingError(e, "Changement d'étape impossible.")),
  });
  const update = useMutation({
    mutationFn: () => {
      const d = data!.deal;
      const payload: DealPayload = {
        title: form.title.trim(),
        customerType: d.customerType, customerCode: d.customerCode, customerName: d.customerName, currency: d.currency,
        expectedAmount: toNum(form.expectedAmount), probability: toNum(form.probability),
        expectedCloseDate: form.expectedCloseDate || undefined, owner: form.owner.trim() || undefined,
        analyticSection: form.analyticSection.trim() || undefined, notes: form.notes.trim() || undefined,
      };
      return billingService.updateDeal(code!, payload);
    },
    onSuccess: () => { refresh(); setPanel(null); setError(null); toast.success("Affaire modifiée."); },
    onError: (e: unknown) => setError(billingError(e, "Modification impossible.")),
  });
  const attachDoc = useMutation({
    mutationFn: () => billingService.attachDealDocument(code!, attach.trim()),
    onSuccess: () => { refresh(); setAttach(""); setError(null); toast.success("Document rattaché."); },
    onError: (e: unknown) => setError(billingError(e, "Rattachement impossible.")),
  });

  if (isLoading) return <div className="mx-auto w-full max-w-4xl"><DetailsSkeleton /></div>;
  if (isError || !data) {
    return (
      <div className="mx-auto w-full max-w-4xl">
        <EmptyState icon={AlertCircle} title="Affaire introuvable" action={<ActionButton onClick={() => navigate("/billing/deals")}>Retour aux affaires</ActionButton>} />
      </div>
    );
  }

  const d = data.deal;
  const cur = currencyLabel(d.currency ?? "XAF");
  const money = (n?: number | null) => formatMoney(n ?? 0, cur);
  const openEdit = () => {
    setForm({ title: d.title ?? "", expectedAmount: d.expectedAmount?.toString() ?? "", probability: d.probability?.toString() ?? "", expectedCloseDate: d.expectedCloseDate?.slice(0, 10) ?? "", owner: d.owner ?? "", analyticSection: d.analyticSection ?? "", notes: d.notes ?? "" });
    setError(null);
    setPanel("edit");
  };
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5">
      <PageHeader
        title={d.title ?? d.code}
        subtitle={<span className="font-mono text-xs">{d.code}{d.customerName ? ` · ${d.customerName}` : ""}</span>}
        onBack={() => navigate("/billing/deals")}
        backLabel="Retour aux affaires"
        badge={<StatusChip tone={DEAL_STAGE_TONE[d.stage as DealStage] ?? "neutral"}>{DEAL_STAGE_LABEL[d.stage as DealStage] ?? d.stage}</StatusChip>}
        actions={canUpdate ? <ActionButton variant="ghost" icon={Pencil} onClick={openEdit}>Modifier</ActionButton> : undefined}
      />
      <ErrorBanner message={panel ? null : error} />

      {panel === "edit" && (
        <PanelForm title="Modifier l'affaire" submitLabel="Enregistrer" pending={update.isPending} submitDisabled={!form.title.trim()} error={error} onCancel={() => setPanel(null)} onSubmit={(e) => { e.preventDefault(); setError(null); update.mutate(); }}>
          <Field label="Intitulé" required><input className={FIELD_SOFT} value={form.title} onChange={set("title")} /></Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Montant attendu"><input type="number" min={0} step="any" className={FIELD_SOFT} value={form.expectedAmount} onChange={set("expectedAmount")} /></Field>
            <Field label="Probabilité (%)"><input type="number" min={0} max={100} className={FIELD_SOFT} value={form.probability} onChange={set("probability")} /></Field>
            <Field label="Clôture prévue"><input type="date" className={FIELD_SOFT} value={form.expectedCloseDate} onChange={set("expectedCloseDate")} /></Field>
            <Field label="Responsable"><input className={FIELD_SOFT} value={form.owner} onChange={set("owner")} /></Field>
            <Field label="Section analytique"><input className={FIELD_SOFT} value={form.analyticSection} onChange={set("analyticSection")} /></Field>
          </div>
          <Field label="Notes"><textarea rows={2} className={`${FIELD_SOFT} resize-none`} value={form.notes} onChange={set("notes")} /></Field>
        </PanelForm>
      )}

      {panel === "lost" && (
        <PanelForm title="Affaire perdue" submitLabel="Marquer perdue" pending={stage.isPending} error={error} onCancel={() => setPanel(null)} onSubmit={(e) => { e.preventDefault(); setError(null); stage.mutate({ stage: "LOST", lostReason: lostReason.trim() || undefined }); }}>
          <Field label="Motif de la perte" hint="Facultatif, conservé sur l'affaire."><input className={FIELD_SOFT} value={lostReason} onChange={(e) => setLostReason(e.target.value)} /></Field>
        </PanelForm>
      )}

      <KpiRow
        columns={4}
        items={[
          { label: "Devisé", value: money(data.quoted) },
          { label: "Accepté", value: money(data.accepted) },
          { label: "Facturé net", value: money(data.invoicedNet), hint: `Avoirs ${money(data.creditNotes)}` },
          { label: "Encaissé", value: money(data.collected), tone: "success" },
          { label: "Reste à facturer", value: money(data.remainingToInvoice) },
          { label: "Reste à encaisser", value: money(data.remainingToCollect), tone: (data.remainingToCollect ?? 0) > 0 ? "danger" : "default" },
          { label: "Acomptes facturés", value: money(data.depositsInvoiced), hint: `Payés ${money(data.depositsPaid)}` },
          { label: "Marge réalisée", value: money(data.realizedMargin), tone: "pink", hint: `Prévue ${money(data.plannedMargin)}${data.costedShare != null ? ` · ${Math.round(data.costedShare * 100)} % costé` : ""}` },
        ]}
      />

      {canUpdate && (
        <Section title="Étape" icon={FileText}>
          <PillChoice
            label="Changer l'étape"
            options={STAGES.map((s) => ({ value: s, label: DEAL_STAGE_LABEL[s] }))}
            value={d.stage ?? ""}
            onChange={(v) => {
              if (v === d.stage) return;
              if (v === "LOST") { setError(null); setPanel("lost"); return; }
              stage.mutate({ stage: v as DealStage });
            }}
          />
          {d.lostReason && <p className="mt-3 text-sm text-gray-600">Motif de perte : {d.lostReason}</p>}
        </Section>
      )}

      <Section title="Détails" icon={FileText}>
        <div className="grid grid-cols-1 gap-x-6 gap-y-4 rounded-2xl bg-white p-5 shadow-sm sm:grid-cols-2">
          <Detail label="Montant attendu">{d.expectedAmount != null ? money(d.expectedAmount) : undefined}</Detail>
          <Detail label="Probabilité">{d.probability != null ? `${d.probability} %` : undefined}</Detail>
          <Detail label="Clôture prévue">{d.expectedCloseDate ? formatDate(d.expectedCloseDate) : undefined}</Detail>
          <Detail label="Clôturée le">{d.closedAt ? formatDateTime(d.closedAt) : undefined}</Detail>
          <Detail label="Responsable">{d.ownerName ?? d.owner}</Detail>
          <Detail label="Origine">{DEAL_SOURCE_LABEL[d.source ?? ""] ?? d.source}</Detail>
          <Detail label="Opportunité CRM" mono>{d.crmOpportunityRef}</Detail>
          <Detail label="Section analytique" mono>{d.analyticSection}</Detail>
          <Detail label="Client" mono>{d.customerType ? `${d.customerType} ${d.customerCode ?? ""}` : undefined}</Detail>
          <Detail label="Notes" wide>{d.notes}</Detail>
        </div>
      </Section>

      <Section title="Documents de l'affaire" icon={FileText}>
        {canUpdate && (
          <div className="mb-3 flex flex-wrap items-end gap-3">
            <Field label="Rattacher un document" hint="Numéro du devis ou de la facture" className="min-w-[14rem] flex-1">
              <input className={`${FIELD_SOFT} font-mono`} value={attach} onChange={(e) => setAttach(e.target.value)} />
            </Field>
            <ActionButton icon={Plus} variant="ghost" pending={attachDoc.isPending} disabled={!attach.trim()} onClick={() => attachDoc.mutate()}>Rattacher</ActionButton>
          </div>
        )}
        {(data.documents ?? []).length === 0 ? (
          <p className="py-2 text-center text-sm text-gray-400">Aucun document rattaché.</p>
        ) : (
          <div className="space-y-2">
            {data.documents!.map((doc) => (
              <ItemRow key={doc.documentNumber}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <button type="button" className={MONO_LINK} onClick={() => navigate(`/billing/documents/${doc.documentNumber}`)}>{doc.documentNumber}</button>
                    <p className="mt-0.5 text-xs text-gray-500">{DOC_TYPE_LABEL[doc.documentType as keyof typeof DOC_TYPE_LABEL] ?? doc.documentType}{doc.deposit ? " · acompte" : ""} · {formatDate(doc.issueDate)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-bold tabular-nums text-gray-950">{formatMoney(doc.totalAmount ?? 0, currencyLabel(doc.currency ?? d.currency ?? "XAF"))}</p>
                      {!!doc.balanceDue && doc.balanceDue > 0 && <p className="text-xs tabular-nums text-red-600">Reste {formatMoney(doc.balanceDue, currencyLabel(doc.currency ?? d.currency ?? "XAF"))}</p>}
                    </div>
                    <StatusChip tone={STATUS_TONE[doc.status as keyof typeof STATUS_TONE] ?? "neutral"}>{STATUS_LABEL[doc.status as keyof typeof STATUS_LABEL] ?? doc.status}</StatusChip>
                    {canCancel && (
                      <IconButton
                        icon={Trash2}
                        tone="danger"
                        label="Détacher le document"
                        onClick={() =>
                          toast.confirm({
                            message: `Détacher ${doc.documentNumber} de l'affaire ?`,
                            confirmLabel: "Détacher",
                            pendingLabel: "Détachement",
                            successMessage: "Document détaché.",
                            errorMessage: "Détachement impossible.",
                            onConfirm: async () => { await billingService.detachDealDocument(code!, doc.documentNumber); refresh(); },
                          })
                        }
                      />
                    )}
                  </div>
                </div>
              </ItemRow>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
};
