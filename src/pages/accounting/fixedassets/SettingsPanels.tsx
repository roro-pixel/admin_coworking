import React, { useState } from "react";
import { Layers } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ActionForm } from "../../../components/accounting/ActionForm";
import type { FieldDef } from "../../../components/accounting/ActionForm";
import { fixedAssetService } from "../../../services/fixedAsset.service";
import type { DepreciationProfile, FaCategory } from "../../../services/fixedAsset.service";
import { useAuth } from "../../../contexts/AuthContext";
import { ActionButton, EmptyState, ErrorBlock, ListHeader, StatusChip } from "../../../components/subscription/kit";
import { toast } from "../../../components/ui/toastStore";
import { ListSkeleton } from "../../../components/ui/Skeleton";

const t = (key: string, label: string, extra: Partial<FieldDef> = {}): FieldDef => ({ key, label, ...extra });
const n = (key: string, label: string, extra: Partial<FieldDef> = {}): FieldDef => ({ key, label, type: "number", ...extra });
const b = (key: string, label: string): FieldDef => ({ key, label, type: "bool" });

const CATEGORY_FIELDS: FieldDef[] = [
  t("code", "Code", { required: true }), t("label", "Libellé", { required: true }), t("assetAccount", "Compte du bien"), t("depreciationAccount", "Compte d'amortissement"), t("expenseAccount", "Compte de dotation"),
  t("impairmentAccount", "Compte de dépréciation"), t("impairmentExpenseAccount", "Dotation aux dépréciations"), t("impairmentReversalAccount", "Reprise de dépréciation"),
  t("disposalValueAccount", "Valeur de sortie"), t("disposalIncomeAccount", "Produit de cession"),
  t("method", "Mode", { hint: "Selon le serveur" }), n("durationMonths", "Durée (mois)"), n("coefficient", "Coefficient"), n("annualRate", "Taux annuel %", { hint: "Déduit la durée" }), n("threshold", "Seuil"),
  t("tracking", "Suivi"), t("taxMethod", "Mode fiscal"), n("taxDurationMonths", "Durée fiscale (mois)"), t("componentTypes", "Types de composants"),
  b("trackOffBooks", "Suivi hors bilan"), b("vatRecoverable", "TVA récupérable"), b("inProgress", "Catégorie d'en-cours"), b("active", "Active"),
];
const PROFILE_FIELDS: FieldDef[] = [
  t("label", "Libellé", { required: true }), t("categoryCode", "Catégorie"), t("brand", "Marque"), t("modelPattern", "Motif de modèle", { hint: "ex. MacBook" }), t("method", "Mode"),
  n("annualRate", "Taux annuel %"), n("durationMonths", "Durée (mois)"), n("coefficient", "Coefficient"), n("residualRate", "Valeur résiduelle %"), n("priority", "Priorité"), b("active", "Actif"), t("notes", "Notes"),
];
const withDefaults = (fields: FieldDef[], o: object | undefined): FieldDef[] =>
  fields.map((f) => ({ ...f, def: o ? (f.type === "bool" ? !!(o as Record<string, unknown>)[f.key] : String((o as Record<string, unknown>)[f.key] ?? "")) : f.type === "bool" && f.key === "active" ? true : f.def }));

export const CategoriesPanel: React.FC = () => {
  const qc = useQueryClient();
  const canManage = useAuth().hasPermission("ACCOUNTING_SETTINGS:MANAGE");
  const [form, setForm] = useState<FaCategory | "new" | null>(null);
  const q = useQuery({ queryKey: ["fa-categories"], queryFn: fixedAssetService.categories });
  return (
    <div className="space-y-4">
      <ListHeader title="Catégories" subtitle="Comptes, mode et durée par défaut. Le taux annuel déduit la durée (15 % donne 80 mois)."
        action={canManage && !form ? <ActionButton onClick={() => setForm("new")}>Nouvelle catégorie</ActionButton> : undefined} />
      {form && <ActionForm title={form === "new" ? "Nouvelle catégorie" : `Modifier ${form.code}`} fields={withDefaults(CATEGORY_FIELDS, form === "new" ? undefined : form)}
        onSubmit={async (v) => { await fixedAssetService.saveCategory(v); qc.invalidateQueries({ queryKey: ["fa-categories"] }); toast.success("Catégorie enregistrée"); }} onClose={() => setForm(null)} />}
      {q.isLoading ? <ListSkeleton /> : q.isError ? <ErrorBlock message="Chargement impossible." onRetry={() => q.refetch()} /> : (q.data ?? []).length === 0 ? <EmptyState icon={Layers} title="Aucune catégorie" /> : (
        <div className="space-y-2">
          {q.data!.map((c) => (
            <div key={c.code} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-3 shadow-sm">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900">{c.code} · {c.label}</p>
                <p className="truncate text-xs text-gray-400">{[c.assetAccount && `bien ${c.assetAccount}`, c.depreciationAccount && `amort. ${c.depreciationAccount}`, c.method, c.durationMonths && `${c.durationMonths} mois`, c.annualRate && `${c.annualRate} %`].filter(Boolean).join(" · ")}</p>
              </div>
              <div className="flex items-center gap-2">
                {c.active === false && <StatusChip tone="neutral">Inactive</StatusChip>}
                {canManage && <ActionButton variant="ghost" onClick={() => setForm(c)}>Modifier</ActionButton>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const ProfilesPanel: React.FC = () => {
  const qc = useQueryClient();
  const canManage = useAuth().hasPermission("ACCOUNTING_SETTINGS:MANAGE");
  const [form, setForm] = useState<DepreciationProfile | "new" | null>(null);
  const q = useQuery({ queryKey: ["fa-profiles"], queryFn: fixedAssetService.profiles });
  const refresh = () => qc.invalidateQueries({ queryKey: ["fa-profiles"] });
  const off = (p: DepreciationProfile) => toast.confirm({ message: `Désactiver le profil « ${p.label} » ?`, detail: "Il ne s'applique plus aux nouveaux biens.", confirmLabel: "Désactiver", successMessage: "Profil désactivé", errorMessage: "Action impossible", onConfirm: async () => { await fixedAssetService.deactivateProfile(p.id); refresh(); } });
  return (
    <div className="space-y-4">
      <ListHeader title="Profils d'amortissement" subtitle="Par marque, catégorie et modèle. Ordre : fiche, puis profil, puis catégorie. S'applique aux biens mis en service après la création."
        action={canManage && !form ? <ActionButton onClick={() => setForm("new")}>Nouveau profil</ActionButton> : undefined} />
      {form && <ActionForm title={form === "new" ? "Nouveau profil" : `Modifier « ${form.label} »`} fields={withDefaults(PROFILE_FIELDS, form === "new" ? undefined : form)}
        onSubmit={async (v) => { if (form === "new") await fixedAssetService.createProfile(v); else await fixedAssetService.updateProfile(form.id, v); refresh(); toast.success("Profil enregistré"); }} onClose={() => setForm(null)} />}
      {q.isLoading ? <ListSkeleton /> : q.isError ? <ErrorBlock message="Chargement impossible." onRetry={() => q.refetch()} /> : (q.data ?? []).length === 0 ? <EmptyState icon={Layers} title="Aucun profil" /> : (
        <div className="space-y-2">
          {q.data!.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-3 shadow-sm">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900">{p.label}</p>
                <p className="truncate text-xs text-gray-400">{[p.brand, p.modelPattern, p.categoryCode, p.method, p.annualRate && `${p.annualRate} %`, p.durationMonths && `${p.durationMonths} mois`, p.residualRate != null && `résiduel ${p.residualRate} %`, `priorité ${p.priority ?? 0}`].filter(Boolean).join(" · ")}</p>
              </div>
              <div className="flex items-center gap-2">
                {p.active === false && <StatusChip tone="neutral">Inactif</StatusChip>}
                {canManage && <ActionButton variant="ghost" onClick={() => setForm(p)}>Modifier</ActionButton>}
                {canManage && p.active !== false && <ActionButton variant="ghost" onClick={() => off(p)}>Désactiver</ActionButton>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
