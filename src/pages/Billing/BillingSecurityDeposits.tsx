import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ChevronUp, ShieldCheck } from "lucide-react";
import { billingService } from "../../services/billing.service";
import type { SecurityDeposit } from "../../services/billing.service";
import { ActionButton, Field, IconButton, ItemRow, ListHeader, PanelForm, StatusChip, Switch, Tabs } from "../../components/subscription/kit";
import type { TabItem } from "../../components/subscription/kit";
import { FIELD_SOFT, MONO_LINK, formatDate, formatDateTime, formatMoney } from "../../components/subscription/kitUtils";
import { PillChoice } from "../../components/operations/opsKit";
import { toast } from "../../components/ui/toastStore";
import { currencyLabel } from "../../components/payment/paymentUtils";
import { useAuth } from "../../contexts/AuthContext";
import { SECURITY_DEPOSIT_KIND_LABEL } from "../../components/billing/billingLabels";
import { billingError } from "../../components/billing/billingErrors";
import { CustomerPicker, QueryState, toNum } from "../../components/billing/pageKit";
import type { PickedCustomer } from "../../components/billing/pageKit";

type Tab = "deposits" | "legacy";
const TABS: TabItem<Tab>[] = [{ id: "deposits", label: "Cautions", icon: ShieldCheck }, { id: "legacy", label: "Anciennes cautions" }];

const DepositRow: React.FC<{ d: SecurityDeposit; canMove: boolean }> = ({ d, canMove }) => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const cur = currencyLabel(d.currency ?? "XAF");
  const [open, setOpen] = useState(false);
  const [moving, setMoving] = useState(false);
  const [kind, setKind] = useState<"RELEASE" | "RETAIN" | "APPLY">("RELEASE");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [target, setTarget] = useState("");
  const [error, setError] = useState<string | null>(null);

  const move = useMutation({
    mutationFn: () => billingService.addSecurityDepositMovement(d.depositNumber, { kind, amount: toNum(amount), reason: reason.trim() || undefined, targetDocumentNumber: kind === "APPLY" ? target.trim() : undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["billing-security-deposits"] }); toast.success("Mouvement enregistré."); setMoving(false); setAmount(""); setReason(""); setTarget(""); setError(null); },
    onError: (e: unknown) => setError(billingError(e, "Mouvement impossible.")),
  });

  return (
    <ItemRow>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-xs font-semibold text-[color:var(--logo-pink-dark)]">{d.depositNumber}</p>
          <p className="mt-0.5 text-sm text-gray-800">{d.customerName ?? d.customerCode ?? "—"}</p>
          <p className="text-xs text-gray-500">
            {d.documentNumber && <button type="button" className={MONO_LINK} onClick={() => navigate(`/billing/documents/${d.documentNumber}`)}>{d.documentNumber}</button>}
            {d.subscriptionNumber ? ` · abonnement ${d.subscriptionNumber}` : ""} · {formatDate(d.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-lg font-bold tabular-nums text-gray-950">{formatMoney(d.remaining ?? 0, cur)}</p>
            <p className="text-xs text-gray-400">restant sur {formatMoney(d.amount ?? 0, cur)}</p>
          </div>
          <StatusChip tone={(d.remaining ?? 0) > 0 ? "warn" : "neutral"}>{d.status ?? ((d.remaining ?? 0) > 0 ? "Ouverte" : "Soldée")}</StatusChip>
          <IconButton icon={open ? ChevronUp : ChevronDown} label="Mouvements" onClick={() => setOpen((o) => !o)} />
        </div>
      </div>
      {open && (
        <div className="mt-3 space-y-2">
          <p className="text-xs text-gray-500">Restitué {formatMoney(d.releasedAmount ?? 0, cur)} · retenu {formatMoney(d.retainedAmount ?? 0, cur)} · imputé {formatMoney(d.appliedAmount ?? 0, cur)}</p>
          {(d.movements ?? []).length === 0 ? <p className="text-sm text-gray-400">Aucun mouvement.</p> : d.movements!.map((m, i) => (
            <div key={m.movementNumber ?? i} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-gray-50 px-3 py-2 text-sm">
              <span className="text-gray-800">{SECURITY_DEPOSIT_KIND_LABEL[m.kind ?? ""] ?? m.kind}{m.reason ? ` · ${m.reason}` : ""}{m.targetDocumentNumber ? ` · ${m.targetDocumentNumber}` : ""}</span>
              <span className="tabular-nums text-gray-600">{formatMoney(m.amount ?? 0, cur)} · {formatDateTime(m.createdAt ?? m.movementDate)}</span>
            </div>
          ))}
          {canMove && (d.remaining ?? 0) > 0 && !moving && <ActionButton variant="ghost" onClick={() => setMoving(true)}>Nouveau mouvement</ActionButton>}
          {moving && (
            <PanelForm title="Mouvement de caution" submitLabel="Enregistrer" pending={move.isPending} submitDisabled={kind === "APPLY" && !target.trim()} error={error} onCancel={() => { setMoving(false); setError(null); }} onSubmit={(e) => { e.preventDefault(); setError(null); move.mutate(); }}>
              <PillChoice label="Type" options={(Object.keys(SECURITY_DEPOSIT_KIND_LABEL) as Array<"RELEASE" | "RETAIN" | "APPLY">).map((k) => ({ value: k, label: SECURITY_DEPOSIT_KIND_LABEL[k] }))} value={kind} onChange={(v) => setKind(v as typeof kind)} />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label={`Montant (${cur})`} hint="Vide : tout le solde restant"><input type="number" min={0} step="any" className={FIELD_SOFT} value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
                {kind === "APPLY" && <Field label="Facture cible" required><input className={`${FIELD_SOFT} font-mono`} value={target} onChange={(e) => setTarget(e.target.value)} /></Field>}
              </div>
              <Field label="Motif"><input className={FIELD_SOFT} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
            </PanelForm>
          )}
        </div>
      )}
    </ItemRow>
  );
};

const Legacy: React.FC = () => {
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ["billing-security-deposits-legacy"], queryFn: () => billingService.listLegacySecurityDeposits() });
  const list = data ?? [];
  return (
    <QueryState isLoading={isLoading} isError={isError} onRetry={() => refetch()} isEmpty={list.length === 0} icon={ShieldCheck} title="Aucune ancienne caution" hint="Factures de caution émises avant la gestion dédiée.">
      <div className="space-y-2">
        {list.map((l) => (
          <ItemRow key={l.documentNumber}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <button type="button" className={MONO_LINK} onClick={() => navigate(`/billing/documents/${l.documentNumber}`)}>{l.documentNumber}</button>
                <p className="text-sm text-gray-700">{l.customerName ?? l.customerCode}{l.description ? ` · ${l.description}` : ""}</p>
                <p className="text-xs text-gray-400">{formatDate(l.issueDate)}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold tabular-nums">{formatMoney(l.totalAmount ?? 0)}</span>
                <StatusChip tone={l.posted ? "success" : "neutral"}>{l.posted ? "Comptabilisée" : "Non comptabilisée"}</StatusChip>
              </div>
            </div>
          </ItemRow>
        ))}
      </div>
    </QueryState>
  );
};

/** Cautions : soldes, mouvements (restitution, retenue, imputation) et reprise des anciennes cautions. */
export const BillingSecurityDeposits: React.FC = () => {
  const { hasPermission } = useAuth();
  const canMove = hasPermission("BILLING:CREATE");
  const [tab, setTab] = useState<Tab>("deposits");
  const [open, setOpen] = useState(true);
  const [customer, setCustomer] = useState<PickedCustomer | null>(null);
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["billing-security-deposits", open, customer?.type, customer?.code],
    queryFn: () => billingService.listSecurityDeposits({ open: open || undefined, customerType: customer?.type, customerCode: customer?.code }),
    enabled: tab === "deposits",
  });
  const list = data ?? [];
  return (
    <div className="space-y-5">
      <ListHeader title="Cautions" subtitle="Dépôts de garantie encaissés : restitution, retenue ou imputation sur facture" />
      <Tabs items={TABS} active={tab} onChange={setTab} variant="soft" />
      {tab === "legacy" ? <Legacy /> : (
        <>
          <div className="space-y-4 rounded-[1.75rem] border border-gray-100 bg-white p-4 shadow-sm">
            <Switch checked={open} onChange={setOpen} label="Cautions avec un solde restant seulement" />
            <CustomerPicker value={customer} onChange={setCustomer} />
          </div>
          <QueryState isLoading={isLoading} isError={isError} onRetry={() => refetch()} isEmpty={list.length === 0} icon={ShieldCheck} title="Aucune caution">
            <div className="space-y-3">{list.map((d) => <DepositRow key={d.depositNumber} d={d} canMove={canMove} />)}</div>
          </QueryState>
        </>
      )}
    </div>
  );
};
