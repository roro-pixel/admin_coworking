import React, { useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Info, DollarSign, Star, Shield, FileText, Tag as TagIcon } from "lucide-react";
import { subscriptionService } from "../../../services/subscription.service";
import type {
  PlanVersion,
  EntitlementDefinition,
  PlanEntitlement,
} from "../../../services/subscription.service";
import { AdminLayout } from "../../../components/layout/AdminLayout";
import { brandVars } from "../../../components/layout/adminTheme";
import { DetailsSkeleton } from "../../../components/ui/Skeleton";
import { Toaster } from "../../../components/ui/Toaster";
import { toast } from "../../../components/ui/toastStore";
import {
  ActionButton,
  ErrorBanner,
  ErrorBlock,
  Field,
  IconButton,
  ItemRow,
  PageHeader,
  Pagination,
  Section,
} from "../../../components/subscription/kit";
import { FIELD, FIELD_SOFT, PINK_SOFT, apiMessage } from "../../../components/subscription/kitUtils";
import { BILLING_CYCLE_LABELS } from "../../../components/subscription/labels";

const currencies = [
  { value: "XAF", label: "FCFA (XAF)" },
  { value: "EUR", label: "Euro (EUR)" },
  { value: "USD", label: "USD" },
  { value: "GBP", label: "GBP" },
  { value: "XOF", label: "CFA (XOF)" },
];

const benefitCategories = [
  { value: "ACCESS", label: "Accès" },
  { value: "SERVICE", label: "Service inclus" },
  { value: "SUPPORT", label: "Support" },
  { value: "FINANCIAL", label: "Avantage financier" },
  { value: "FLEXIBILITY", label: "Flexibilité" },
  { value: "COMFORT", label: "Confort" },
  { value: "COMMUNITY", label: "Communauté" },
  { value: "SECURITY", label: "Sécurité" },
  { value: "BOOKING", label: "Réservation" },
  { value: "BUSINESS_SERVICE", label: "Service pour business" },
  { value: "DISCOUNT", label: "Réduction" },
  { value: "INVENTORY", label: "Inventaire" },
  { value: "CUSTOM", label: "Personnalisé" },
  { value: "OTHER", label: "Autre" },
];

const ENTITLEMENTS_PER_PAGE = 8;

interface KeyValuePair {
  key: string;
  value: string;
}

const createEmptyEntitlement = (priority: number): PlanEntitlement => ({
  entitlementCode: "",
  quantity: 0,
  unlimited: false,
  rolloverAllowed: false,
  rolloverLimit: 0,
  validForDays: 0,
  priority,
  restrictionsJson: "",
});

const emptyPrice = () => ({
  billingCycle: "MONTHLY" as const,
  currency: "XAF",
  amount: 0,
  setupFee: 0,
  depositAmount: 0,
  taxIncluded: true,
  commitmentMonths: 1,
});

const emptyBenefit = (displayOrder: number) => ({
  title: "",
  description: "",
  icon: "",
  category: "OTHER",
  displayOrder,
  highlighted: false,
  included: true,
});

const buildFormData = (v: PlanVersion | null) => ({
  name: v?.name ?? "",
  description: v?.description ?? "",
  effectiveFrom: v?.effectiveFrom?.split("T")[0] ?? new Date().toISOString().split("T")[0],
  effectiveTo: v?.effectiveTo?.split("T")[0] ?? "",
  prices: v?.prices?.length ? v.prices : [emptyPrice()],
  benefits: v?.benefits?.length ? v.benefits : [emptyBenefit(1)],
});

const buildKV = (json?: string): KeyValuePair[] => {
  if (!json) return [];
  try {
    return Object.entries(JSON.parse(json)).map(([key, value]) => ({ key, value: String(value) }));
  } catch {
    return [];
  }
};

// ─── Page : charge le plan (et la version de départ éventuelle), puis monte le formulaire ───

export const PlanVersionFormPage: React.FC = () => {
  const { planCode = "" } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const baseId = searchParams.get("base");

  const { data: plan, isLoading: planLoading, error } = useQuery({
    queryKey: ["subscription-plan-detail", planCode],
    queryFn: () => subscriptionService.getPlan(planCode),
    enabled: !!planCode,
  });

  const { data: versions, isLoading: versionsLoading } = useQuery({
    queryKey: ["plan-versions", planCode],
    queryFn: () => subscriptionService.getPlanVersions(planCode),
    enabled: !!planCode && !!baseId,
  });

  if (planLoading || (!!baseId && versionsLoading)) {
    return (
      <AdminLayout>
        <div style={brandVars} className="mx-auto w-full max-w-4xl">
          <DetailsSkeleton />
        </div>
      </AdminLayout>
    );
  }

  if (error || !plan) {
    return (
      <AdminLayout>
        <div style={brandVars} className="mx-auto w-full max-w-4xl">
          <PageHeader title="Plan introuvable" onBack={() => navigate("/subscriptions/plans")} backLabel="Plans" />
          <ErrorBlock message="Ce plan n'existe pas ou n'est plus accessible." />
        </div>
      </AdminLayout>
    );
  }

  const baseVersion = baseId ? (versions?.find((v) => String(v.id) === baseId) ?? null) : null;

  return (
    <VersionForm planCode={plan.code} planName={plan.name} baseVersion={baseVersion} />
  );
};

// ─── Formulaire ──────────────────────────────────────────────────────────────

const VersionForm: React.FC<{
  planCode: string;
  planName: string;
  baseVersion: PlanVersion | null;
}> = ({ planCode, planName, baseVersion }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState(() => buildFormData(baseVersion));
  const [localEntitlements, setLocalEntitlements] = useState<PlanEntitlement[]>(() =>
    baseVersion?.entitlements?.length ? baseVersion.entitlements : [createEmptyEntitlement(1)],
  );
  const [conditions, setConditions] = useState<KeyValuePair[]>(() => buildKV(baseVersion?.termsJson));
  const [metadataFields, setMetadataFields] = useState<KeyValuePair[]>(() =>
    buildKV(baseVersion?.metadataJson),
  );
  const [newCondition, setNewCondition] = useState<KeyValuePair>({ key: "", value: "" });
  const [newMeta, setNewMeta] = useState<KeyValuePair>({ key: "", value: "" });
  const [entPage, setEntPage] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: entDefData } = useQuery({
    queryKey: ["entitlement-definitions", "", "", 0],
    queryFn: () => subscriptionService.getEntitlementDefinitions({ active: true, size: 100 }),
  });
  const entDefs: EntitlementDefinition[] = entDefData?.content ?? [];

  const goBack = () => navigate(`/subscriptions/plans/${planCode}`);

  // ── Payload ──
  const buildPayload = () => {
    const termsObj: Record<string, string> = {};
    conditions.forEach((c) => {
      if (c.key && c.value) termsObj[c.key] = c.value;
    });
    const metaObj: Record<string, string> = {};
    metadataFields.forEach((f) => {
      if (f.key && f.value) metaObj[f.key] = f.value;
    });
    return {
      name: formData.name,
      description: formData.description || undefined,
      effectiveFrom: formData.effectiveFrom,
      effectiveTo: formData.effectiveTo || undefined,
      prices: formData.prices.map((p) => ({
        ...p,
        billingCycle: p.billingCycle as
          | "ONE_TIME"
          | "DAILY"
          | "WEEKLY"
          | "MONTHLY"
          | "QUARTERLY"
          | "YEARLY",
        amount: parseFloat(String(p.amount)) || 0,
        setupFee: parseFloat(String(p.setupFee)) || 0,
        depositAmount: parseFloat(String(p.depositAmount)) || 0,
      })),
      benefits: formData.benefits.filter((b) => b.title.trim() !== ""),
      entitlements: localEntitlements.filter((e) => e.entitlementCode.trim() !== ""),
      termsJson: Object.keys(termsObj).length > 0 ? JSON.stringify(termsObj) : undefined,
      metadataJson: Object.keys(metaObj).length > 0 ? JSON.stringify(metaObj) : undefined,
    };
  };

  const createMutation = useMutation({
    mutationFn: () => subscriptionService.createPlanVersion(planCode, buildPayload()),
    onSuccess: (newVersion) => {
      queryClient.invalidateQueries({ queryKey: ["plan-versions", planCode] });
      toast.success("Version créée");
      navigate(`/subscriptions/plans/${planCode}/versions/${newVersion.id}`);
    },
    onError: (e: unknown) =>
      setErrorMessage(apiMessage(e, "Erreur lors de la création de la version.")),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (formData.prices.length === 0) {
      setErrorMessage("Ajoutez au moins un tarif.");
      return;
    }
    if (formData.prices.some((p) => p.amount <= 0)) {
      setErrorMessage("Chaque tarif doit avoir un montant > 0.");
      return;
    }
    createMutation.mutate();
  };

  // ── Conditions et métadonnées ──
  const addCondition = () => {
    if (newCondition.key && newCondition.value) {
      setConditions([...conditions, { ...newCondition }]);
      setNewCondition({ key: "", value: "" });
    }
  };
  const addMeta = () => {
    if (newMeta.key && newMeta.value) {
      setMetadataFields([...metadataFields, { ...newMeta }]);
      setNewMeta({ key: "", value: "" });
    }
  };

  // ── Prix ──
  const addPrice = () => setFormData({ ...formData, prices: [...formData.prices, emptyPrice()] });
  const removePrice = (i: number) =>
    setFormData({ ...formData, prices: formData.prices.filter((_, idx) => idx !== i) });
  const updatePrice = (i: number, field: string, value: unknown) => {
    const arr = [...formData.prices];
    arr[i] = { ...arr[i], [field]: value };
    setFormData({ ...formData, prices: arr });
  };

  // ── Avantages ──
  const addBenefit = () =>
    setFormData({
      ...formData,
      benefits: [...formData.benefits, emptyBenefit(formData.benefits.length + 1)],
    });
  const removeBenefit = (i: number) =>
    setFormData({ ...formData, benefits: formData.benefits.filter((_, idx) => idx !== i) });
  const updateBenefit = (i: number, field: string, value: unknown) => {
    const arr = [...formData.benefits];
    arr[i] = { ...arr[i], [field]: value };
    setFormData({ ...formData, benefits: arr });
  };

  // ── Droits ──
  const addEntitlement = () => {
    const updated = [...localEntitlements, createEmptyEntitlement(localEntitlements.length + 1)];
    setLocalEntitlements(updated);
    setEntPage(Math.ceil(updated.length / ENTITLEMENTS_PER_PAGE) - 1);
  };
  const removeEntitlement = (i: number) => {
    const updated = localEntitlements.filter((_, idx) => idx !== i);
    setLocalEntitlements(updated);
    const maxPage = Math.max(0, Math.ceil(updated.length / ENTITLEMENTS_PER_PAGE) - 1);
    if (entPage > maxPage) setEntPage(maxPage);
  };
  const updateEntitlement = (i: number, field: string, value: unknown) => {
    const arr = [...localEntitlements];
    arr[i] = { ...arr[i], [field]: value };
    setLocalEntitlements(arr);
  };

  const totalEntPages = Math.max(1, Math.ceil(localEntitlements.length / ENTITLEMENTS_PER_PAGE));
  const pagedEnts = localEntitlements.slice(
    entPage * ENTITLEMENTS_PER_PAGE,
    (entPage + 1) * ENTITLEMENTS_PER_PAGE,
  );

  const addButton = (label: string, onClick: () => void) => (
    <ActionButton variant="ghost" icon={Plus} className="!px-4 !py-2" onClick={onClick}>
      {label}
    </ActionButton>
  );

  return (
    <AdminLayout>
      <div style={brandVars} className="mx-auto w-full max-w-4xl">
        <PageHeader
          title="Nouvelle version de plan"
          subtitle={
            <div>
              <p>
                Plan : <span className="font-semibold text-gray-700">{planName}</span>
                <span className="ml-2 font-mono text-xs">{planCode}</span>
              </p>
              {baseVersion && (
                <p
                  className={`mt-3 inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs text-[color:var(--logo-pink-dark)] ${PINK_SOFT}`}
                >
                  <Info size={14} className="shrink-0" />
                  Basée sur la version {baseVersion.versionNumber} : les versions publiées ne sont pas
                  modifiables.
                </p>
              )}
            </div>
          }
          onBack={goBack}
          backLabel={planName}
        />

        <form onSubmit={handleSubmit} className="space-y-4">
          <ErrorBanner message={errorMessage} />

          {/* ── Informations générales ── */}
          <Section title="Informations générales" icon={Info}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Nom" required>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="ex : Version mensuelle 2026"
                  className={FIELD}
                />
              </Field>
              <Field label="Description">
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Description courte"
                  className={FIELD}
                />
              </Field>
              <Field label="Date d'effet" required>
                <input
                  type="date"
                  required
                  value={formData.effectiveFrom}
                  onChange={(e) => setFormData({ ...formData, effectiveFrom: e.target.value })}
                  className={FIELD}
                />
              </Field>
              <Field label="Date de fin">
                <input
                  type="date"
                  value={formData.effectiveTo}
                  min={formData.effectiveFrom}
                  onChange={(e) => setFormData({ ...formData, effectiveTo: e.target.value })}
                  className={FIELD}
                />
              </Field>
            </div>
          </Section>

          {/* ── Tarifs ── */}
          <Section title="Tarifs" icon={DollarSign} action={addButton("Ajouter un tarif", addPrice)}>
            <div className="space-y-3">
              {formData.prices.map((price, idx) => (
                <ItemRow key={idx}>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <Field label="Cycle">
                      <select
                        value={price.billingCycle}
                        onChange={(e) => updatePrice(idx, "billingCycle", e.target.value)}
                        className={FIELD_SOFT}
                      >
                        {Object.entries(BILLING_CYCLE_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Devise">
                      <select
                        value={price.currency}
                        onChange={(e) => updatePrice(idx, "currency", e.target.value)}
                        className={FIELD_SOFT}
                      >
                        {currencies.map((c) => (
                          <option key={c.value} value={c.value}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Montant" required>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={price.amount === 0 ? "" : price.amount}
                        onChange={(e) => {
                          const v = e.target.value.replace(/[^\d.]/g, "");
                          updatePrice(idx, "amount", v === "" ? 0 : parseFloat(v));
                        }}
                        placeholder="0"
                        className={FIELD_SOFT}
                      />
                    </Field>
                    <Field label="Frais d'activation">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={price.setupFee}
                        onChange={(e) => updatePrice(idx, "setupFee", parseFloat(e.target.value) || 0)}
                        className={FIELD_SOFT}
                      />
                    </Field>
                    <Field label="Dépôt de garantie">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={price.depositAmount === 0 ? "" : price.depositAmount}
                        onChange={(e) => {
                          const v = e.target.value.replace(/[^\d.]/g, "");
                          updatePrice(idx, "depositAmount", v === "" ? 0 : parseFloat(v));
                        }}
                        placeholder="0"
                        className={FIELD_SOFT}
                      />
                    </Field>
                    <Field label="Engagement (mois)">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={price.commitmentMonths === 0 ? "" : price.commitmentMonths}
                        onChange={(e) => {
                          const v = e.target.value.replace(/\D/g, "");
                          updatePrice(idx, "commitmentMonths", v === "" ? 0 : parseInt(v));
                        }}
                        placeholder="0"
                        className={FIELD_SOFT}
                      />
                    </Field>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-gray-700">
                      <input
                        type="checkbox"
                        checked={price.taxIncluded}
                        onChange={(e) => updatePrice(idx, "taxIncluded", e.target.checked)}
                        className="h-4 w-4 rounded accent-[color:var(--logo-pink-dark)]"
                      />
                      Prix TTC
                    </label>
                    <IconButton
                      icon={Trash2}
                      label="Supprimer ce tarif"
                      tone="danger"
                      disabled={formData.prices.length === 1}
                      onClick={() => removePrice(idx)}
                    />
                  </div>
                </ItemRow>
              ))}
            </div>
          </Section>

          {/* ── Conditions générales ── */}
          <Section
            title="Conditions générales"
            description="Stockées en JSON (ex : commitment: monthly)"
            icon={FileText}
          >
            <KVEditor
              rows={conditions}
              onRemove={(i) => setConditions(conditions.filter((_, idx) => idx !== i))}
              newRow={newCondition}
              onNewRowChange={setNewCondition}
              onAdd={addCondition}
              keyPlaceholder="commitment"
              valuePlaceholder="monthly"
            />
          </Section>

          {/* ── Avantages ── */}
          <Section title="Avantages" icon={Star} action={addButton("Ajouter", addBenefit)}>
            {formData.benefits.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-500">
                Aucun avantage. Utilisez « Ajouter » pour en créer un.
              </p>
            ) : (
              <div className="space-y-3">
                {formData.benefits.map((b, idx) => (
                  <ItemRow key={idx}>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-[5rem_minmax(0,1fr)] md:grid-cols-[5rem_minmax(0,1fr)_minmax(0,1fr)]">
                      <Field label="Icône">
                        <input
                          type="text"
                          placeholder="✨"
                          value={b.icon ?? ""}
                          onChange={(e) => updateBenefit(idx, "icon", e.target.value)}
                          className={`${FIELD_SOFT} text-center`}
                        />
                      </Field>
                      <Field label="Titre" required>
                        <input
                          type="text"
                          value={b.title}
                          onChange={(e) => updateBenefit(idx, "title", e.target.value)}
                          className={FIELD_SOFT}
                        />
                      </Field>
                      <Field label="Description" className="sm:col-span-2 md:col-span-1">
                        <input
                          type="text"
                          value={b.description ?? ""}
                          onChange={(e) => updateBenefit(idx, "description", e.target.value)}
                          className={FIELD_SOFT}
                        />
                      </Field>
                    </div>
                    <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
                      <Field label="Catégorie" className="sm:w-60">
                        <select
                          value={b.category ?? "OTHER"}
                          onChange={(e) => updateBenefit(idx, "category", e.target.value)}
                          className={FIELD_SOFT}
                        >
                          {benefitCategories.map((c) => (
                            <option key={c.value} value={c.value}>
                              {c.label}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <div className="flex flex-1 items-center justify-between gap-3 sm:justify-end">
                        <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-gray-700">
                          <input
                            type="checkbox"
                            checked={b.highlighted}
                            onChange={(e) => updateBenefit(idx, "highlighted", e.target.checked)}
                            className="h-4 w-4 rounded accent-[color:var(--logo-pink-dark)]"
                          />
                          Favori
                        </label>
                        <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-gray-700">
                          <input
                            type="checkbox"
                            checked={b.included}
                            onChange={(e) => updateBenefit(idx, "included", e.target.checked)}
                            className="h-4 w-4 rounded accent-[color:var(--logo-pink-dark)]"
                          />
                          Inclus
                        </label>
                        <IconButton
                          icon={Trash2}
                          label="Supprimer cet avantage"
                          tone="danger"
                          onClick={() => removeBenefit(idx)}
                        />
                      </div>
                    </div>
                  </ItemRow>
                ))}
              </div>
            )}
          </Section>

          {/* ── Droits inclus ── */}
          <Section title="Droits inclus" icon={Shield} action={addButton("Ajouter un droit", addEntitlement)}>
            {localEntitlements.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-500">
                Aucun droit. Utilisez « Ajouter un droit » pour en inclure un.
              </p>
            ) : (
              <div className="space-y-3">
                {pagedEnts.map((ent, idx) => {
                  const globalIdx = entPage * ENTITLEMENTS_PER_PAGE + idx;
                  return (
                    <ItemRow key={globalIdx}>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <Field label="Droit" className="sm:col-span-2 lg:col-span-2">
                          <select
                            value={ent.entitlementCode}
                            onChange={(e) => updateEntitlement(globalIdx, "entitlementCode", e.target.value)}
                            className={FIELD_SOFT}
                          >
                            <option value="">Sélectionner un droit</option>
                            {entDefs.map((d) => (
                              <option key={d.code} value={d.code}>
                                {d.name} ({d.unit})
                              </option>
                            ))}
                          </select>
                        </Field>
                        <Field label="Quantité">
                          <input
                            type="number"
                            min="0"
                            value={ent.quantity}
                            onChange={(e) =>
                              updateEntitlement(globalIdx, "quantity", parseInt(e.target.value) || 0)
                            }
                            disabled={ent.unlimited}
                            className={FIELD_SOFT}
                          />
                        </Field>
                        <Field label="Validité (jours)">
                          <input
                            type="number"
                            min="0"
                            value={ent.validForDays}
                            onChange={(e) =>
                              updateEntitlement(globalIdx, "validForDays", parseInt(e.target.value) || 0)
                            }
                            className={FIELD_SOFT}
                          />
                        </Field>
                      </div>
                      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                        <div className="flex flex-wrap items-end gap-x-5 gap-y-3">
                          <label className="flex cursor-pointer items-center gap-2 pb-2.5 text-sm font-semibold text-gray-700">
                            <input
                              type="checkbox"
                              checked={ent.unlimited}
                              onChange={(e) => updateEntitlement(globalIdx, "unlimited", e.target.checked)}
                              className="h-4 w-4 rounded accent-[color:var(--logo-pink-dark)]"
                            />
                            Illimité
                          </label>
                          <label className="flex cursor-pointer items-center gap-2 pb-2.5 text-sm font-semibold text-gray-700">
                            <input
                              type="checkbox"
                              checked={ent.rolloverAllowed}
                              onChange={(e) =>
                                updateEntitlement(globalIdx, "rolloverAllowed", e.target.checked)
                              }
                              className="h-4 w-4 rounded accent-[color:var(--logo-pink-dark)]"
                            />
                            Report autorisé
                          </label>
                          <Field label="Limite de report" className="w-36">
                            <input
                              type="number"
                              min="0"
                              value={ent.rolloverLimit}
                              onChange={(e) =>
                                updateEntitlement(globalIdx, "rolloverLimit", parseInt(e.target.value) || 0)
                              }
                              disabled={!ent.rolloverAllowed}
                              className={FIELD_SOFT}
                            />
                          </Field>
                        </div>
                        <IconButton
                          icon={Trash2}
                          label="Retirer ce droit"
                          tone="danger"
                          onClick={() => removeEntitlement(globalIdx)}
                        />
                      </div>
                    </ItemRow>
                  );
                })}
                <Pagination
                  page={entPage}
                  totalPages={totalEntPages}
                  total={localEntitlements.length}
                  noun="droit"
                  onChange={setEntPage}
                />
              </div>
            )}
          </Section>

          {/* ── Métadonnées ── */}
          <Section title="Métadonnées" description="Champs libres stockés en JSON" icon={TagIcon}>
            <KVEditor
              rows={metadataFields}
              onRemove={(i) => setMetadataFields(metadataFields.filter((_, idx) => idx !== i))}
              newRow={newMeta}
              onNewRowChange={setNewMeta}
              onAdd={addMeta}
              keyPlaceholder="internal_note"
              valuePlaceholder="Tarif spécial Q1"
            />
          </Section>

          <div className="flex flex-col-reverse gap-2 pb-4 sm:flex-row sm:justify-end">
            <ActionButton variant="ghost" onClick={goBack} disabled={createMutation.isPending}>
              Annuler
            </ActionButton>
            <ActionButton type="submit" pending={createMutation.isPending}>
              Créer la version
            </ActionButton>
          </div>
        </form>
      </div>
      <Toaster />
    </AdminLayout>
  );
};

// ─── Éditeur clé / valeur ────────────────────────────────────────────────────

const KVEditor: React.FC<{
  rows: KeyValuePair[];
  onRemove: (i: number) => void;
  newRow: KeyValuePair;
  onNewRowChange: (r: KeyValuePair) => void;
  onAdd: () => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
}> = ({
  rows,
  onRemove,
  newRow,
  onNewRowChange,
  onAdd,
  keyPlaceholder = "Clé",
  valuePlaceholder = "Valeur",
}) => (
  <div className="space-y-2">
    {rows.map((row, i) => (
      <ItemRow key={i} className="flex items-center gap-3 !p-3">
        <span className="min-w-0 shrink-0 basis-1/3 truncate rounded-xl bg-gray-50 px-3 py-2 font-mono text-xs font-semibold text-gray-700">
          {row.key}
        </span>
        <span className="min-w-0 flex-1 truncate rounded-xl bg-gray-50 px-3 py-2 text-sm text-gray-700">
          {row.value}
        </span>
        <IconButton icon={Trash2} label="Supprimer" tone="danger" onClick={() => onRemove(i)} />
      </ItemRow>
    ))}
    <ItemRow className="grid grid-cols-1 gap-2 !p-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_auto] md:items-center">
      <input
        type="text"
        placeholder={keyPlaceholder}
        value={newRow.key}
        onChange={(e) => onNewRowChange({ ...newRow, key: e.target.value })}
        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), onAdd())}
        className={FIELD_SOFT}
      />
      <input
        type="text"
        placeholder={valuePlaceholder}
        value={newRow.value}
        onChange={(e) => onNewRowChange({ ...newRow, value: e.target.value })}
        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), onAdd())}
        className={FIELD_SOFT}
      />
      <ActionButton
        icon={Plus}
        className="!px-4 !py-2.5"
        onClick={onAdd}
        disabled={!newRow.key || !newRow.value}
      >
        Ajouter
      </ActionButton>
    </ItemRow>
  </div>
);
