import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgePercent, Plus } from "lucide-react";
import { billingService } from "../../services/billing.service";
import type { CustomerPricePayload } from "../../services/billing.service";
import { ActionButton, EmptyState, Field, ItemRow, ListHeader, PanelForm, StatusChip, Switch } from "../../components/subscription/kit";
import { FIELD_SOFT, formatDate, formatMoney } from "../../components/subscription/kitUtils";
import { toast } from "../../components/ui/toastStore";
import { currencyLabel } from "../../components/payment/paymentUtils";
import { useAuth } from "../../contexts/AuthContext";
import { billingError } from "../../components/billing/billingErrors";
import { CustomerPicker, QueryState, toNum } from "../../components/billing/pageKit";
import type { PickedCustomer } from "../../components/billing/pageKit";

const today = () => new Date().toLocaleDateString("sv-SE");
const empty = { itemCode: "", unitPrice: "", discountRate: "", validFrom: today(), validUntil: "", contractReference: "", reason: "" };

/** Tarifs négociés par client : prix fixe ou remise, avec période de validité et référence de contrat. */
export const BillingCustomerPrices: React.FC = () => {
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const canCreate = hasPermission("BILLING:CREATE");
  const [customer, setCustomer] = useState<PickedCustomer | null>(null);
  const [current, setCurrent] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(empty);
  const [ending, setEnding] = useState<{ id: number; date: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["billing-customer-prices", customer?.type, customer?.code, current],
    queryFn: () => billingService.listCustomerPrices(customer!.type, customer!.code, current),
    enabled: !!customer,
  });
  const list = data ?? [];
  const set = (k: keyof typeof empty) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const invalid = !form.itemCode.trim() || !form.validFrom || (toNum(form.unitPrice) == null && toNum(form.discountRate) == null);

  const create = useMutation({
    mutationFn: () => {
      const payload: CustomerPricePayload = {
        itemCode: form.itemCode.trim(), unitPrice: toNum(form.unitPrice), discountRate: toNum(form.discountRate), validFrom: form.validFrom,
        validUntil: form.validUntil || undefined, contractReference: form.contractReference.trim() || undefined, reason: form.reason.trim() || undefined,
      };
      return billingService.createCustomerPrice(customer!.type, customer!.code, payload);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["billing-customer-prices"] }); setCreating(false); setForm(empty); setError(null); toast.success("Tarif enregistré."); },
    onError: (e: unknown) => setError(billingError(e, "Enregistrement impossible.")),
  });
  const end = useMutation({
    mutationFn: () => billingService.endCustomerPrice(customer!.type, customer!.code, ending!.id, ending!.date),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["billing-customer-prices"] }); setEnding(null); setError(null); toast.success("Tarif clôturé."); },
    onError: (e: unknown) => setError(billingError(e, "Clôture impossible.")),
  });

  return (
    <div className="space-y-5">
      <ListHeader title="Tarifs clients" subtitle="Prix et remises négociés, appliqués automatiquement aux nouveaux devis et factures" action={canCreate && customer ? <ActionButton icon={Plus} onClick={() => { setCreating((c) => !c); setError(null); }}>Nouveau tarif</ActionButton> : undefined} />
      <div className="space-y-4 rounded-[1.75rem] border border-gray-100 bg-white p-4 shadow-sm">
        <CustomerPicker value={customer} onChange={(c) => { setCustomer(c); setCreating(false); }} />
        {customer && <Switch checked={current} onChange={setCurrent} label="Tarifs en vigueur seulement" />}
      </div>

      {creating && customer && (
        <PanelForm title={`Nouveau tarif pour ${customer.label}`} submitLabel="Enregistrer" pending={create.isPending} submitDisabled={invalid} error={error} onCancel={() => setCreating(false)} onSubmit={(e) => { e.preventDefault(); setError(null); create.mutate(); }}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Code article" required><input className={`${FIELD_SOFT} font-mono`} value={form.itemCode} onChange={set("itemCode")} /></Field>
            <Field label="Prix unitaire" hint="Ou une remise ci-contre"><input type="number" min={0} step="any" className={FIELD_SOFT} value={form.unitPrice} onChange={set("unitPrice")} /></Field>
            <Field label="Remise (%)"><input type="number" min={0} max={100} step="any" className={FIELD_SOFT} value={form.discountRate} onChange={set("discountRate")} /></Field>
            <Field label="Valable du" required><input type="date" className={FIELD_SOFT} value={form.validFrom} onChange={set("validFrom")} /></Field>
            <Field label="Jusqu'au" hint="Vide : sans fin"><input type="date" className={FIELD_SOFT} value={form.validUntil} onChange={set("validUntil")} /></Field>
            <Field label="Référence du contrat"><input className={FIELD_SOFT} value={form.contractReference} onChange={set("contractReference")} /></Field>
          </div>
          <Field label="Motif"><input className={FIELD_SOFT} value={form.reason} onChange={set("reason")} /></Field>
        </PanelForm>
      )}

      {ending && (
        <PanelForm title="Clôturer le tarif" submitLabel="Clôturer" pending={end.isPending} submitDisabled={!ending.date} error={error} onCancel={() => setEnding(null)} onSubmit={(e) => { e.preventDefault(); setError(null); end.mutate(); }}>
          <Field label="Valable jusqu'au" required><input type="date" className={FIELD_SOFT} value={ending.date} onChange={(e) => setEnding({ ...ending, date: e.target.value })} /></Field>
        </PanelForm>
      )}

      {!customer ? (
        <EmptyState icon={BadgePercent} title="Aucun client sélectionné" hint="Choisissez un client pour voir ses tarifs négociés." />
      ) : (
        <QueryState isLoading={isLoading} isError={isError} onRetry={() => refetch()} isEmpty={list.length === 0} icon={BadgePercent} title="Aucun tarif négocié" rows={3}>
          <div className="space-y-2">
            {list.map((p) => (
              <ItemRow key={p.id}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{p.itemName ?? p.itemCode} <span className="font-mono text-xs font-normal text-gray-400">{p.itemCode}</span></p>
                    <p className="text-xs text-gray-500">Du {formatDate(p.validFrom)}{p.validUntil ? ` au ${formatDate(p.validUntil)}` : " sans fin"}{p.contractReference ? ` · contrat ${p.contractReference}` : ""}{p.reason ? ` · ${p.reason}` : ""}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold tabular-nums text-gray-950">{p.unitPrice != null ? formatMoney(p.unitPrice, currencyLabel(p.currency ?? "XAF")) : `-${p.discountRate} %`}</span>
                    <StatusChip tone={p.currentlyValid ? "success" : "neutral"}>{p.currentlyValid ? "En vigueur" : "Hors période"}</StatusChip>
                    {canCreate && p.currentlyValid && !p.validUntil && <ActionButton variant="ghost" className="!px-4 !py-2" onClick={() => { setEnding({ id: p.id, date: today() }); setError(null); }}>Clôturer</ActionButton>}
                  </div>
                </div>
              </ItemRow>
            ))}
          </div>
        </QueryState>
      )}
    </div>
  );
};
