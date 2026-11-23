import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { FileStack, Plus, Trash2 } from "lucide-react";
import { billingService } from "../../services/billing.service";
import type { QuoteTemplate, QuoteTemplateLine } from "../../services/billing.service";
import { ActionButton, Field, IconButton, ItemRow, ListHeader, PanelForm, StatusChip, Switch } from "../../components/subscription/kit";
import { FIELD_SOFT } from "../../components/subscription/kitUtils";
import { toast } from "../../components/ui/toastStore";
import { useAuth } from "../../contexts/AuthContext";
import { CatalogPicker } from "../../components/billing/CatalogPicker";
import { billingError } from "../../components/billing/billingErrors";
import { CustomerPicker, QueryState, toNum } from "../../components/billing/pageKit";
import type { PickedCustomer } from "../../components/billing/pageKit";

type FormLine = { itemCode: string; quantity: string; description: string };
const emptyLine = (): FormLine => ({ itemCode: "", quantity: "1", description: "" });
const emptyForm = { code: "", name: "", description: "", validityDays: "", terms: "", active: true };

/** Modèles de devis : paquets d'articles réutilisables, et création d'un devis depuis un modèle. */
export const BillingQuoteTemplates: React.FC = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const canUpdate = hasPermission("BILLING:UPDATE");
  const canCreate = hasPermission("BILLING:CREATE");
  const [inactive, setInactive] = useState(false);
  const [editing, setEditing] = useState<{ isNew: boolean } | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [lines, setLines] = useState<FormLine[]>([emptyLine()]);
  const [pickerIdx, setPickerIdx] = useState<number | null>(null);
  const [using, setUsing] = useState<QuoteTemplate | null>(null);
  const [customer, setCustomer] = useState<PickedCustomer | null>(null);
  const [extra, setExtra] = useState({ email: "", phone: "", title: "" });
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ["billing-quote-templates", inactive], queryFn: () => billingService.listQuoteTemplates(inactive) });
  const list = data ?? [];

  const edit = async (t?: QuoteTemplate) => {
    setError(null);
    setUsing(null);
    setEditing({ isNew: !t });
    if (!t) { setForm(emptyForm); setLines([emptyLine()]); return; }
    // La liste ne renvoie pas toujours les lignes : on relit la fiche.
    const full = t.lines ? t : await billingService.getQuoteTemplate(t.code);
    setForm({ code: full.code, name: full.name, description: full.description ?? "", validityDays: full.validityDays?.toString() ?? "", terms: full.terms ?? "", active: full.active !== false });
    setLines(full.lines.length ? full.lines.map((l) => ({ itemCode: l.itemCode, quantity: String(l.quantity), description: l.description ?? "" })) : [emptyLine()]);
  };

  const save = useMutation({
    mutationFn: () => {
      const payloadLines: QuoteTemplateLine[] = lines.filter((l) => l.itemCode.trim()).map((l) => ({ itemCode: l.itemCode.trim(), quantity: toNum(l.quantity) ?? 1, description: l.description.trim() || undefined }));
      return billingService.saveQuoteTemplate({ code: form.code.trim().toUpperCase(), name: form.name.trim(), description: form.description.trim() || undefined, validityDays: toNum(form.validityDays), terms: form.terms.trim() || undefined, lines: payloadLines, active: form.active });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["billing-quote-templates"] }); setEditing(null); setError(null); toast.success("Modèle enregistré."); },
    onError: (e: unknown) => setError(billingError(e, "Enregistrement impossible.")),
  });

  const create = useMutation({
    mutationFn: () => billingService.createQuoteFromTemplate(using!.code, { customerType: customer!.type, customerCode: customer!.code, customerName: customer!.label, customerEmail: extra.email.trim() || undefined, customerPhone: extra.phone.trim() || undefined, title: extra.title.trim() || undefined }),
    onSuccess: (doc) => { toast.success(`Devis ${doc.documentNumber} créé.`); setUsing(null); navigate(`/billing/documents/${doc.documentNumber}`); },
    onError: (e: unknown) => setError(billingError(e, "Création du devis impossible.")),
  });

  const setLine = (i: number, patch: Partial<FormLine>) => setLines((ls) => ls.map((l, k) => (k === i ? { ...l, ...patch } : l)));

  return (
    <div className="space-y-5">
      <ListHeader title="Modèles de devis" subtitle="Des devis types prêts à l'emploi : articles, quantités, validité et conditions" action={canUpdate ? <ActionButton icon={Plus} onClick={() => edit()}>Nouveau modèle</ActionButton> : undefined} />

      {editing && (
        <PanelForm title={editing.isNew ? "Nouveau modèle" : `Modifier ${form.code}`} submitLabel="Enregistrer" pending={save.isPending} submitDisabled={!form.code.trim() || !form.name.trim() || !lines.some((l) => l.itemCode.trim())} error={error} onCancel={() => setEditing(null)} onSubmit={(e) => { e.preventDefault(); setError(null); save.mutate(); }}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Code" required hint={editing.isNew ? undefined : "Le code ne change pas"}><input className={`${FIELD_SOFT} font-mono uppercase`} value={form.code} disabled={!editing.isNew} onChange={(e) => setForm({ ...form, code: e.target.value })} /></Field>
            <Field label="Nom" required><input className={FIELD_SOFT} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Validité (jours)"><input type="number" min={1} className={FIELD_SOFT} value={form.validityDays} onChange={(e) => setForm({ ...form, validityDays: e.target.value })} /></Field>
          </div>
          <Field label="Description"><input className={FIELD_SOFT} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          <Field label="Conditions"><textarea rows={2} className={`${FIELD_SOFT} resize-none`} value={form.terms} onChange={(e) => setForm({ ...form, terms: e.target.value })} /></Field>
          <div className="space-y-3">
            {lines.map((l, i) => (
              <div key={i} className="rounded-2xl bg-gray-50 p-3">
                <div className="grid grid-cols-2 gap-3 md:grid-cols-[minmax(0,1fr)_6rem_minmax(0,1.2fr)_auto] md:items-end">
                  <Field label="Code article" required className="col-span-2 md:col-span-1"><input className={`${FIELD_SOFT} font-mono`} value={l.itemCode} onChange={(e) => setLine(i, { itemCode: e.target.value })} onFocus={() => setPickerIdx(i)} /></Field>
                  <Field label="Qté"><input type="number" min={0} step="any" className={FIELD_SOFT} value={l.quantity} onChange={(e) => setLine(i, { quantity: e.target.value })} /></Field>
                  <Field label="Description" hint="Vide : celle de l'article"><input className={FIELD_SOFT} value={l.description} onChange={(e) => setLine(i, { description: e.target.value })} /></Field>
                  <IconButton icon={Trash2} tone="danger" label="Retirer la ligne" disabled={lines.length === 1} onClick={() => setLines(lines.filter((_, k) => k !== i))} />
                </div>
                {pickerIdx === i && <CatalogPicker onPick={(item) => { setLine(i, { itemCode: item.sourceCode, description: l.description }); setPickerIdx(null); }} onClose={() => setPickerIdx(null)} />}
              </div>
            ))}
            <ActionButton variant="ghost" icon={Plus} className="!px-4 !py-2" onClick={() => setLines([...lines, emptyLine()])}>Ajouter une ligne</ActionButton>
          </div>
          <Switch checked={form.active} onChange={(v) => setForm({ ...form, active: v })} label="Modèle actif" hint="Un modèle inactif n'est plus proposé à la création d'un devis" />
        </PanelForm>
      )}

      {using && (
        <PanelForm title={`Créer un devis depuis « ${using.name} »`} submitLabel="Créer le devis" pending={create.isPending} submitDisabled={!customer} error={error} onCancel={() => setUsing(null)} onSubmit={(e) => { e.preventDefault(); setError(null); create.mutate(); }}>
          <CustomerPicker value={customer} onChange={setCustomer} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="E-mail"><input type="email" className={FIELD_SOFT} value={extra.email} onChange={(e) => setExtra({ ...extra, email: e.target.value })} /></Field>
            <Field label="Téléphone"><input className={FIELD_SOFT} value={extra.phone} onChange={(e) => setExtra({ ...extra, phone: e.target.value })} /></Field>
            <Field label="Titre du devis" hint="Vide : nom du modèle"><input className={FIELD_SOFT} value={extra.title} onChange={(e) => setExtra({ ...extra, title: e.target.value })} /></Field>
          </div>
        </PanelForm>
      )}

      <Switch checked={inactive} onChange={setInactive} label="Afficher aussi les modèles inactifs" />

      <QueryState isLoading={isLoading} isError={isError} onRetry={() => refetch()} isEmpty={list.length === 0} icon={FileStack} title="Aucun modèle de devis" hint="Un modèle accélère les devis récurrents.">
        <div className="space-y-2">
          {list.map((t) => (
            <ItemRow key={t.code}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{t.name} <span className="font-mono text-xs font-normal text-gray-400">{t.code}</span></p>
                  <p className="text-xs text-gray-500">{t.lines?.length ?? "?"} ligne(s){t.validityDays ? ` · validité ${t.validityDays} j` : ""}{t.description ? ` · ${t.description}` : ""}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusChip tone={t.active === false ? "neutral" : "success"}>{t.active === false ? "Inactif" : "Actif"}</StatusChip>
                  {canCreate && t.active !== false && <ActionButton className="!px-4 !py-2" onClick={() => { setUsing(t); setEditing(null); setCustomer(null); setExtra({ email: "", phone: "", title: "" }); setError(null); }}>Créer un devis</ActionButton>}
                  {canUpdate && <ActionButton variant="ghost" className="!px-4 !py-2" onClick={() => edit(t)}>Modifier</ActionButton>}
                </div>
              </div>
            </ItemRow>
          ))}
        </div>
      </QueryState>
    </div>
  );
};
