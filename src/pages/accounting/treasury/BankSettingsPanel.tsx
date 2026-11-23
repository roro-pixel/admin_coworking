import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { treasuryService } from "../../../services/treasury.service";
import type { AssignmentRule, ImportTemplate } from "../../../services/treasury.service";
import { useAuth } from "../../../contexts/AuthContext";
import { money } from "../../../components/accounting/accountingLabels";
import { ActionButton, CheckField, Field, ListHeader, PanelForm, Section, Tag } from "../../../components/subscription/kit";
import { FIELD, apiMessage } from "../../../components/subscription/kitUtils";
import { toast } from "../../../components/ui/toastStore";

const num = (s: string) => (s.trim() === "" ? undefined : Number(s.replace(",", ".")));

const RuleForm: React.FC<{ initial?: AssignmentRule; onClose: () => void }> = ({ initial, onClose }) => {
  const qc = useQueryClient();
  const [f, setF] = useState({
    label: initial?.label ?? "", labelPattern: initial?.labelPattern ?? "", direction: initial?.direction ?? "",
    minAmount: initial?.minAmount?.toString() ?? "", maxAmount: initial?.maxAmount?.toString() ?? "",
    accountNumber: initial?.accountNumber ?? "", thirdParty: initial?.thirdParty ?? "", priority: initial?.priority?.toString() ?? "100", active: initial?.active !== false,
  });
  const [err, setErr] = useState<string | null>(null);
  const save = useMutation({
    mutationFn: () => treasuryService.saveRule({ id: initial?.id, label: f.label, labelPattern: f.labelPattern, direction: f.direction, minAmount: num(f.minAmount), maxAmount: num(f.maxAmount), accountNumber: f.accountNumber, thirdParty: f.thirdParty, priority: num(f.priority), active: f.active }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["treasury-rules"] }); toast.success("Règle enregistrée"); onClose(); },
    onError: (e) => setErr(apiMessage(e, "Enregistrement impossible.")),
  });
  return (
    <PanelForm title={initial ? "Modifier la règle" : "Nouvelle règle d'affectation"} onSubmit={(e) => { e.preventDefault(); setErr(null); save.mutate(); }} onCancel={onClose} pending={save.isPending} submitLabel="Enregistrer" submitDisabled={!f.label.trim() || !f.accountNumber.trim()} error={err}>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Libellé de la règle" required><input className={FIELD} value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })} /></Field>
        <Field label="Motif dans le libellé du relevé" hint="Texte à retrouver"><input className={FIELD} value={f.labelPattern} onChange={(e) => setF({ ...f, labelPattern: e.target.value })} /></Field>
        <Field label="Sens"><input className={FIELD} value={f.direction} placeholder="Selon la doc du serveur" onChange={(e) => setF({ ...f, direction: e.target.value })} /></Field>
        <Field label="Montant min"><input className={FIELD} inputMode="decimal" value={f.minAmount} onChange={(e) => setF({ ...f, minAmount: e.target.value })} /></Field>
        <Field label="Montant max"><input className={FIELD} inputMode="decimal" value={f.maxAmount} onChange={(e) => setF({ ...f, maxAmount: e.target.value })} /></Field>
        <Field label="Priorité"><input className={FIELD} inputMode="numeric" value={f.priority} onChange={(e) => setF({ ...f, priority: e.target.value })} /></Field>
        <Field label="Compte" required><input className={FIELD} value={f.accountNumber} onChange={(e) => setF({ ...f, accountNumber: e.target.value })} /></Field>
        <Field label="Tiers"><input className={FIELD} value={f.thirdParty} onChange={(e) => setF({ ...f, thirdParty: e.target.value })} /></Field>
      </div>
      <CheckField checked={f.active} onChange={(v) => setF({ ...f, active: v })} label="Règle active" />
    </PanelForm>
  );
};

const TemplateForm: React.FC<{ initial?: ImportTemplate; onClose: () => void }> = ({ initial, onClose }) => {
  const qc = useQueryClient();
  const [f, setF] = useState<ImportTemplate>(initial ?? { code: "", label: "", format: "CSV", delimiter: ";", headerRows: 1, dateFormat: "dd/MM/yyyy", decimalSeparator: ",", encoding: "UTF-8" });
  const [err, setErr] = useState<string | null>(null);
  const set = <K extends keyof ImportTemplate>(k: K, v: ImportTemplate[K]) => setF((p) => ({ ...p, [k]: v }));
  const save = useMutation({
    mutationFn: () => treasuryService.saveTemplate(f),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["treasury-templates"] }); toast.success("Modèle enregistré"); onClose(); },
    onError: (e) => setErr(apiMessage(e, "Enregistrement impossible.")),
  });
  const txt = (k: keyof ImportTemplate, label: string, hint?: string) => (
    <Field label={label} hint={hint}><input className={FIELD} value={(f[k] as string | undefined) ?? ""} onChange={(e) => set(k, e.target.value as never)} /></Field>
  );
  return (
    <PanelForm title={initial ? `Modifier ${initial.code}` : "Nouveau modèle d'import"} onSubmit={(e) => { e.preventDefault(); setErr(null); save.mutate(); }} onCancel={onClose} pending={save.isPending} submitLabel="Enregistrer" submitDisabled={!f.code.trim()} error={err}>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Code" required><input className={FIELD} value={f.code} disabled={!!initial} onChange={(e) => set("code", e.target.value)} /></Field>
        {txt("label", "Libellé")}
        {txt("format", "Format")}
        {txt("delimiter", "Séparateur")}
        <Field label="Lignes d'en-tête"><input className={FIELD} inputMode="numeric" value={f.headerRows ?? ""} onChange={(e) => set("headerRows", num(e.target.value))} /></Field>
        {txt("encoding", "Encodage")}
        {txt("dateColumn", "Colonne date", "Nom ou numéro")}
        {txt("valueDateColumn", "Colonne date de valeur")}
        {txt("labelColumn", "Colonne libellé")}
        {txt("referenceColumn", "Colonne référence")}
        {txt("amountColumn", "Colonne montant", "Si une seule colonne signée")}
        {txt("debitColumn", "Colonne débit")}
        {txt("creditColumn", "Colonne crédit")}
        {txt("dateFormat", "Format de date")}
        {txt("decimalSeparator", "Séparateur décimal")}
      </div>
    </PanelForm>
  );
};

export const BankSettingsPanel: React.FC = () => {
  const { hasPermission } = useAuth();
  const canManage = hasPermission("BANK_ACCOUNT:MANAGE");
  const [rule, setRule] = useState<AssignmentRule | "new" | null>(null);
  const [tpl, setTpl] = useState<ImportTemplate | "new" | null>(null);
  const rules = useQuery({ queryKey: ["treasury-rules"], queryFn: treasuryService.rules });
  const templates = useQuery({ queryKey: ["treasury-templates"], queryFn: treasuryService.templates });
  const [previewFor, setPreviewFor] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ date?: string; label?: string; amount?: number }[] | null>(null);

  const onFile = async (code: string, file?: File) => {
    if (!file) return;
    try {
      setPreview(await treasuryService.previewTemplate(code, file));
      setPreviewFor(code);
    } catch (e) {
      toast.error(apiMessage(e, "Aperçu impossible."));
    }
  };

  return (
    <div className="space-y-6">
      <ListHeader title="Paramétrage bancaire" subtitle="Règles d'affectation des lignes de relevé et modèles d'import de fichiers." />

      <Section title="Règles d'affectation" action={canManage && !rule ? <ActionButton variant="ghost" onClick={() => setRule("new")}>Nouvelle règle</ActionButton> : undefined}>
        {rule && <RuleForm initial={rule === "new" ? undefined : rule} onClose={() => setRule(null)} />}
        {(rules.data ?? []).length === 0 ? <p className="text-sm text-gray-400">Aucune règle.</p> : (
          <div className="space-y-2">
            {rules.data!.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-3 shadow-sm">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{r.label}</p>
                  <p className="truncate text-xs text-gray-400">« {r.labelPattern} » → {r.accountNumber}{r.thirdParty ? ` / ${r.thirdParty}` : ""}{r.minAmount || r.maxAmount ? ` · ${money(r.minAmount)} – ${money(r.maxAmount)}` : ""} · priorité {r.priority}</p>
                </div>
                <div className="flex items-center gap-2">
                  {r.active === false && <Tag>Inactive</Tag>}
                  {canManage && <ActionButton variant="ghost" onClick={() => setRule(r)}>Modifier</ActionButton>}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Modèles d'import" action={canManage && !tpl ? <ActionButton variant="ghost" onClick={() => setTpl("new")}>Nouveau modèle</ActionButton> : undefined}>
        {tpl && <TemplateForm initial={tpl === "new" ? undefined : tpl} onClose={() => setTpl(null)} />}
        {(templates.data ?? []).length === 0 ? <p className="text-sm text-gray-400">Aucun modèle.</p> : (
          <div className="space-y-2">
            {templates.data!.map((t) => (
              <div key={t.code} className="rounded-2xl bg-white p-3 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{t.label || t.code}</p>
                    <p className="text-xs text-gray-400">{t.code} · {t.format} · séparateur « {t.delimiter} »</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="cursor-pointer rounded-full bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200">
                      Tester un fichier
                      <input type="file" className="hidden" onChange={(e) => { onFile(t.code, e.target.files?.[0]); e.target.value = ""; }} />
                    </label>
                    {canManage && <ActionButton variant="ghost" onClick={() => setTpl(t)}>Modifier</ActionButton>}
                  </div>
                </div>
                {previewFor === t.code && preview && (
                  <div className="mt-3 rounded-xl bg-gray-50 p-3 text-xs">
                    <p className="mb-1 font-semibold text-gray-700">{preview.length} ligne(s) lue(s)</p>
                    {preview.slice(0, 8).map((l, i) => <p key={i} className="font-mono text-gray-600">{l.date} · {l.label} · {money(l.amount)}</p>)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
};
