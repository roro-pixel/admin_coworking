import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Download, Handshake, Plus } from "lucide-react";
import { billingService } from "../../services/billing.service";
import type { DealFilter, DealPayload } from "../../services/billing.service";
import { ActionButton, DataCard, Field, HeadRow, ListHeader, PanelForm, Pagination, SearchField, StatusChip } from "../../components/subscription/kit";
import { FIELD_SOFT, FOCUS, ROW_HOVER, formatDate, formatMoney } from "../../components/subscription/kitUtils";
import { PillChoice } from "../../components/operations/opsKit";
import { toast } from "../../components/ui/toastStore";
import { saveBlob, currencyLabel } from "../../components/payment/paymentUtils";
import { useAuth } from "../../contexts/AuthContext";
import { DEAL_SOURCE_LABEL, DEAL_STAGE_LABEL, DEAL_STAGE_TONE } from "../../components/billing/billingLabels";
import { billingError } from "../../components/billing/billingErrors";
import { CustomerPicker, QueryState, toNum } from "../../components/billing/pageKit";
import type { PickedCustomer } from "../../components/billing/pageKit";

const SIZE = 20;
const COLS = "lg:grid-cols-[7rem_minmax(0,1.4fr)_minmax(0,1fr)_8rem_9rem_5rem_7rem]";
const STAGES = ["", "PROSPECTING", "PROPOSAL", "NEGOTIATION", "WON", "LOST"] as const;

const emptyForm = { title: "", expectedAmount: "", probability: "", expectedCloseDate: "", owner: "", analyticSection: "", notes: "", customerName: "" };

/** Centre des affaires : liste filtrable, export, création et création depuis une opportunité CRM. */
export const BillingDeals: React.FC = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const canCreate = hasPermission("BILLING:CREATE");
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState<string>("");
  const [page, setPage] = useState(0);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [customer, setCustomer] = useState<PickedCustomer | null>(null);
  const [opportunity, setOpportunity] = useState("");
  const [error, setError] = useState<string | null>(null);

  const filter: DealFilter = { search: search.trim() || undefined, stage: stage || undefined, page, size: SIZE };
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ["billing-deals", filter], queryFn: () => billingService.listDeals(filter) });
  const deals = data?.content ?? [];

  const exportMutation = useMutation({
    mutationFn: async () => saveBlob(await billingService.exportDeals({ ...filter, page: undefined, size: undefined }), "affaires.csv"),
    onError: (e: unknown) => toast.error(billingError(e, "Export impossible.")),
  });

  const create = useMutation({
    mutationFn: () => {
      const payload: DealPayload = {
        title: form.title.trim(),
        customerType: customer?.type,
        customerCode: customer?.code,
        customerName: customer?.label ?? (form.customerName.trim() || undefined),
        expectedAmount: toNum(form.expectedAmount),
        probability: toNum(form.probability),
        expectedCloseDate: form.expectedCloseDate || undefined,
        owner: form.owner.trim() || undefined,
        analyticSection: form.analyticSection.trim() || undefined,
        notes: form.notes.trim() || undefined,
      };
      return billingService.createDeal(payload);
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["billing-deals"] });
      toast.success(`Affaire ${d.code} créée.`);
      setCreating(false);
      setForm(emptyForm);
      setCustomer(null);
      navigate(`/billing/deals/${d.code}`);
    },
    onError: (e: unknown) => setError(billingError(e, "Création impossible.")),
  });

  const fromOpportunity = useMutation({
    mutationFn: () => billingService.createDealFromOpportunity(opportunity.trim()),
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["billing-deals"] });
      toast.success(`Affaire ${d.code} créée depuis l'opportunité.`);
      setOpportunity("");
      navigate(`/billing/deals/${d.code}`);
    },
    onError: (e: unknown) => setError(billingError(e, "Opportunité introuvable ou déjà liée.")),
  });

  const set = (k: keyof typeof emptyForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="space-y-5">
      <ListHeader
        title="Affaires"
        subtitle="Suivi commercial : devis, factures et encaissements rattachés à une affaire"
        action={
          <div className="flex flex-wrap gap-2">
            <ActionButton variant="ghost" icon={Download} pending={exportMutation.isPending} onClick={() => exportMutation.mutate()}>Exporter</ActionButton>
            {canCreate && <ActionButton icon={Plus} onClick={() => { setCreating((c) => !c); setError(null); }}>Nouvelle affaire</ActionButton>}
          </div>
        }
      />

      {creating && canCreate && (
        <div className="space-y-4">
          <PanelForm
            title="Nouvelle affaire"
            submitLabel="Créer l'affaire"
            pending={create.isPending}
            submitDisabled={!form.title.trim()}
            error={error}
            onCancel={() => setCreating(false)}
            onSubmit={(e) => { e.preventDefault(); setError(null); create.mutate(); }}
          >
            <Field label="Intitulé" required><input className={FIELD_SOFT} value={form.title} onChange={set("title")} maxLength={200} /></Field>
            <CustomerPicker value={customer} onChange={setCustomer} />
            {!customer && <Field label="Nom du client (client externe)"><input className={FIELD_SOFT} value={form.customerName} onChange={set("customerName")} /></Field>}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="Montant attendu"><input type="number" min={0} step="any" className={FIELD_SOFT} value={form.expectedAmount} onChange={set("expectedAmount")} /></Field>
              <Field label="Probabilité (%)"><input type="number" min={0} max={100} className={FIELD_SOFT} value={form.probability} onChange={set("probability")} /></Field>
              <Field label="Clôture prévue"><input type="date" className={FIELD_SOFT} value={form.expectedCloseDate} onChange={set("expectedCloseDate")} /></Field>
              <Field label="Responsable" hint="Identifiant du commercial"><input className={FIELD_SOFT} value={form.owner} onChange={set("owner")} /></Field>
              <Field label="Section analytique"><input className={FIELD_SOFT} value={form.analyticSection} onChange={set("analyticSection")} /></Field>
            </div>
            <Field label="Notes"><textarea rows={2} className={`${FIELD_SOFT} resize-none`} value={form.notes} onChange={set("notes")} /></Field>
          </PanelForm>
          <div className="flex flex-wrap items-end gap-3 rounded-[1.5rem] bg-white p-4 shadow-sm">
            <Field label="Ou depuis une opportunité CRM" hint="Numéro de l'opportunité" className="min-w-[14rem] flex-1">
              <input className={`${FIELD_SOFT} font-mono`} value={opportunity} onChange={(e) => setOpportunity(e.target.value)} />
            </Field>
            <ActionButton variant="ghost" pending={fromOpportunity.isPending} disabled={!opportunity.trim()} onClick={() => { setError(null); fromOpportunity.mutate(); }}>Créer depuis l'opportunité</ActionButton>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 rounded-[1.75rem] border border-gray-100 bg-white p-4 shadow-sm">
        <SearchField value={search} onChange={(v) => { setSearch(v); setPage(0); }} placeholder="Rechercher par code, intitulé ou client" />
        <PillChoice
          label="Étape"
          options={STAGES.map((s) => ({ value: s, label: s === "" ? "Toutes" : DEAL_STAGE_LABEL[s] }))}
          value={stage}
          onChange={(v) => { setStage(v); setPage(0); }}
        />
      </div>

      <QueryState isLoading={isLoading} isError={isError} onRetry={() => refetch()} isEmpty={deals.length === 0} icon={Handshake} title="Aucune affaire" hint="Créez une affaire pour suivre un dossier commercial de bout en bout.">
        <HeadRow cols={COLS}>
          <span>Code</span><span>Intitulé</span><span>Client</span><span className="text-right">Montant attendu</span><span>Étape</span><span className="text-right">Prob.</span><span>Clôture</span>
        </HeadRow>
        <DataCard>
          {deals.map((d) => (
            <div
              key={d.code}
              role="link"
              tabIndex={0}
              onClick={() => navigate(`/billing/deals/${d.code}`)}
              onKeyDown={(e) => { if (e.key === "Enter") navigate(`/billing/deals/${d.code}`); }}
              className={`grid cursor-pointer grid-cols-1 items-center gap-x-4 gap-y-1 rounded-2xl p-4 transition max-lg:mb-2 max-lg:bg-gray-50 ${FOCUS} ${COLS} ${ROW_HOVER}`}
            >
              <p className="truncate font-mono text-xs font-semibold text-[color:var(--logo-pink-dark)]">{d.code}</p>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-gray-900">{d.title}</p>
                <p className="truncate text-xs text-gray-400">{DEAL_SOURCE_LABEL[d.source ?? ""] ?? d.source}{d.ownerName ? ` · ${d.ownerName}` : ""}</p>
              </div>
              <p className="truncate text-sm text-gray-600">{d.customerName ?? d.customerCode ?? "—"}</p>
              <p className="text-sm font-bold tabular-nums text-gray-950 lg:text-right">{d.expectedAmount != null ? formatMoney(d.expectedAmount, currencyLabel(d.currency ?? "XAF")) : "—"}</p>
              <div><StatusChip tone={DEAL_STAGE_TONE[d.stage as keyof typeof DEAL_STAGE_TONE] ?? "neutral"}>{DEAL_STAGE_LABEL[d.stage as keyof typeof DEAL_STAGE_LABEL] ?? d.stage}</StatusChip></div>
              <p className="text-sm tabular-nums text-gray-600 lg:text-right">{d.probability != null ? `${d.probability} %` : "—"}</p>
              <p className="text-sm text-gray-500">{formatDate(d.expectedCloseDate)}</p>
            </div>
          ))}
        </DataCard>
        <Pagination page={page} totalPages={data?.totalPages ?? 1} total={data?.totalElements ?? deals.length} noun="affaire" onChange={setPage} />
      </QueryState>
    </div>
  );
};
