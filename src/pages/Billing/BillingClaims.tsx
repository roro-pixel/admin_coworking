import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { HandCoins, ListChecks, MessageSquareWarning } from "lucide-react";
import { billingService } from "../../services/billing.service";
import { ActionButton, Field, ItemRow, ListHeader, PanelForm, Section, StatusChip, Switch, Tabs } from "../../components/subscription/kit";
import type { TabItem } from "../../components/subscription/kit";
import { FIELD_SOFT, MONO_LINK, formatDate, formatMoney } from "../../components/subscription/kitUtils";
import { toast } from "../../components/ui/toastStore";
import { currencyLabel } from "../../components/payment/paymentUtils";
import { useAuth } from "../../contexts/AuthContext";
import { ClaimsPanel } from "../../components/billing/ClaimPanels";
import { PROMISE_CHANNEL_LABEL, PROMISE_STATUS_LABEL, PROMISE_STATUS_TONE } from "../../components/billing/billingLabels";
import { billingError } from "../../components/billing/billingErrors";
import { QueryState } from "../../components/billing/pageKit";

type Tab = "claims" | "promises" | "reasons";
const TABS: TabItem<Tab>[] = [
  { id: "claims", label: "Réclamations", icon: MessageSquareWarning },
  { id: "promises", label: "Promesses de paiement", icon: HandCoins },
  { id: "reasons", label: "Motifs", icon: ListChecks },
];

const PromisesTab: React.FC = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [openOnly, setOpenOnly] = useState(true);
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ["billing-promises", "all", openOnly], queryFn: () => billingService.listPaymentPromises({ openOnly }) });
  const cancel = useMutation({
    mutationFn: (n: string) => billingService.cancelPaymentPromise(n),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["billing-promises"] }); toast.success("Promesse annulée."); },
    onError: (e: unknown) => toast.error(billingError(e, "Annulation impossible.")),
  });
  const list = data ?? [];
  return (
    <Section title="Promesses de paiement" icon={HandCoins} description="Engagements pris par les clients ; une promesse non tenue à l'échéance passe en « non tenue ».">
      <div className="mb-3"><Switch checked={openOnly} onChange={setOpenOnly} label="Promesses en cours seulement" /></div>
      <QueryState isLoading={isLoading} isError={isError} onRetry={() => refetch()} isEmpty={list.length === 0} icon={HandCoins} title="Aucune promesse" rows={3}>
        <div className="space-y-2">
          {list.map((p) => (
            <ItemRow key={p.promiseNumber}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900">
                    {p.amount != null ? formatMoney(p.amount, currencyLabel("XAF")) : "Solde complet"} avant le {formatDate(p.promisedDate)}
                    <span className="ml-2 font-mono text-xs font-normal text-gray-400">{p.promiseNumber}</span>
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {p.documentNumber && <button type="button" className={MONO_LINK} onClick={() => navigate(`/billing/documents/${p.documentNumber}`)}>{p.documentNumber}</button>}
                    {p.channel ? ` · ${PROMISE_CHANNEL_LABEL[p.channel] ?? p.channel}` : ""}{p.createdBy ? ` · ${p.createdBy}` : ""}
                  </p>
                  {p.note && <p className="mt-1 text-sm text-gray-600">{p.note}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <StatusChip tone={PROMISE_STATUS_TONE[p.status ?? ""] ?? "neutral"}>{PROMISE_STATUS_LABEL[p.status ?? ""] ?? p.status}</StatusChip>
                  {p.status === "OPEN" && <ActionButton variant="ghost" className="!px-4 !py-2" pending={cancel.isPending && cancel.variables === p.promiseNumber} onClick={() => cancel.mutate(p.promiseNumber)}>Annuler</ActionButton>}
                </div>
              </div>
            </ItemRow>
          ))}
        </div>
      </QueryState>
    </Section>
  );
};

const ReasonsTab: React.FC<{ canEdit: boolean }> = ({ canEdit }) => {
  const qc = useQueryClient();
  const [code, setCode] = useState("");
  const [label, setLabel] = useState("");
  const [order, setOrder] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ["billing-claim-reasons", "all"], queryFn: () => billingService.listClaimReasons(true) });
  const save = useMutation({
    mutationFn: (v: { code: string; label: string; displayOrder?: number; active?: boolean }) => billingService.saveClaimReason({ code: v.code, label: v.label, displayOrder: v.displayOrder }, v.active),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["billing-claim-reasons"] }); setCode(""); setLabel(""); setOrder(""); setError(null); toast.success("Motif enregistré."); },
    onError: (e: unknown) => setError(billingError(e, "Enregistrement impossible.")),
  });
  const list = data ?? [];
  return (
    <Section title="Motifs de réclamation" icon={ListChecks} description="Liste proposée à l'ouverture d'une réclamation. Un motif désactivé n'est plus proposé mais reste lisible sur les réclamations existantes.">
      {canEdit && (
        <PanelForm title="Ajouter ou modifier un motif" submitLabel="Enregistrer" pending={save.isPending} submitDisabled={!code.trim() || !label.trim()} error={error} onCancel={() => { setCode(""); setLabel(""); setOrder(""); setError(null); }} onSubmit={(e) => { e.preventDefault(); setError(null); save.mutate({ code: code.trim().toUpperCase(), label: label.trim(), displayOrder: order ? Number(order) : undefined }); }}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Code" required hint="Reprendre un code existant pour le modifier"><input className={`${FIELD_SOFT} font-mono uppercase`} value={code} onChange={(e) => setCode(e.target.value)} maxLength={40} /></Field>
            <Field label="Libellé" required><input className={FIELD_SOFT} value={label} onChange={(e) => setLabel(e.target.value)} /></Field>
            <Field label="Ordre"><input type="number" className={FIELD_SOFT} value={order} onChange={(e) => setOrder(e.target.value)} /></Field>
          </div>
        </PanelForm>
      )}
      <QueryState isLoading={isLoading} isError={isError} onRetry={() => refetch()} isEmpty={list.length === 0} icon={ListChecks} title="Aucun motif" rows={3}>
        <div className="space-y-2">
          {list.map((r) => (
            <ItemRow key={r.code}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{r.label}</p>
                  <p className="font-mono text-xs text-gray-400">{r.code}{r.displayOrder != null ? ` · ordre ${r.displayOrder}` : ""}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusChip tone={r.active === false ? "neutral" : "success"}>{r.active === false ? "Inactif" : "Actif"}</StatusChip>
                  {canEdit && (
                    <>
                      <ActionButton variant="ghost" className="!px-4 !py-2" onClick={() => { setCode(r.code); setLabel(r.label); setOrder(r.displayOrder?.toString() ?? ""); }}>Modifier</ActionButton>
                      <ActionButton variant="ghost" className="!px-4 !py-2" pending={save.isPending && save.variables?.code === r.code} onClick={() => save.mutate({ code: r.code, label: r.label, displayOrder: r.displayOrder, active: r.active === false })}>
                        {r.active === false ? "Activer" : "Désactiver"}
                      </ActionButton>
                    </>
                  )}
                </div>
              </div>
            </ItemRow>
          ))}
        </div>
      </QueryState>
    </Section>
  );
};

/** Recouvrement et litiges : toutes les réclamations, toutes les promesses de paiement, motifs de réclamation. */
export const BillingClaims: React.FC = () => {
  const { hasPermission } = useAuth();
  const canUpdate = hasPermission("BILLING:UPDATE");
  const canPromises = hasPermission("PAYMENT:PROCESS");
  const tabs = TABS.filter((t) => t.id !== "promises" || canPromises);
  const [tab, setTab] = useState<Tab>("claims");
  return (
    <div className="space-y-5">
      <ListHeader title="Réclamations et recouvrement" subtitle="Litiges clients, engagements de paiement et motifs" />
      <Tabs items={tabs} active={tab} onChange={setTab} variant="soft" />
      {tab === "claims" && <ClaimsPanel currency="XAF" canDecide={canUpdate} />}
      {tab === "promises" && canPromises && <PromisesTab />}
      {tab === "reasons" && <ReasonsTab canEdit={canUpdate} />}
    </div>
  );
};
