import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import { subscriptionService } from "../../../services/subscription.service";
import type {
  Plan,
  PlanVersion,
  EntitlementDefinition,
  PlanEntitlement,
} from "../../../services/subscription.service";

// ─── Constantes ───────────────────────────────────────────────────────────────

const billingCycles = [
  { value: "ONE_TIME", label: "Unique" },
  { value: "DAILY", label: "Journalier" },
  { value: "WEEKLY", label: "Hebdomadaire" },
  { value: "MONTHLY", label: "Mensuel" },
  { value: "QUARTERLY", label: "Trimestriel" },
  { value: "YEARLY", label: "Annuel" },
];

const currencies = [
  { value: "XAF", label: "FCFA (XAF)" },
  { value: "EUR", label: "Euro (EUR)" },
  { value: "USD", label: "USD" },
  { value: "GBP", label: "GBP" },
  { value: "XOF", label: "CFA (XOF)" },
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

// ─── Builders ─────────────────────────────────────────────────────────────────

const buildFormData = (v: PlanVersion | null) => ({
  name: v?.name ?? "",
  description: v?.description ?? "",
  effectiveFrom:
    v?.effectiveFrom?.split("T")[0] ?? new Date().toISOString().split("T")[0],
  effectiveTo: v?.effectiveTo?.split("T")[0] ?? "",
  prices: v?.prices?.length
    ? v.prices
    : [
        {
          billingCycle: "MONTHLY",
          currency: "XAF",
          amount: 0,
          setupFee: 0,
          depositAmount: 0,
          taxIncluded: true,
          commitmentMonths: 1,
        },
      ],
  benefits: v?.benefits?.length
    ? v.benefits
    : [
        {
          title: "",
          description: "",
          icon: "",
          category: "",
          displayOrder: 1,
          highlighted: false,
          included: true,
        },
      ],
});

const buildKV = (json?: string): KeyValuePair[] => {
  if (!json) return [];
  try {
    return Object.entries(JSON.parse(json)).map(([key, value]) => ({
      key,
      value: String(value),
    }));
  } catch {
    return [];
  }
};

// ─── Props ───────────────────────────────────────────────────────────────────

interface PlanVersionFormPageProps {
  plan: Plan;
  /** Si fourni, le formulaire est pré-rempli avec cette version (création d'une nouvelle basée dessus) */
  baseVersion?: PlanVersion | null;
  onBack: () => void;
  onSuccess: (newVersion: PlanVersion) => void;
}

// ─── Composant ───────────────────────────────────────────────────────────────

export const PlanVersionFormPage: React.FC<PlanVersionFormPageProps> = ({
  plan,
  baseVersion = null,
  onBack,
  onSuccess,
}) => {
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState(() => buildFormData(baseVersion));
  const [localEntitlements, setLocalEntitlements] = useState<PlanEntitlement[]>(
    () =>
      baseVersion?.entitlements?.length
        ? baseVersion.entitlements
        : [createEmptyEntitlement(1)],
  );
  const [conditions, setConditions] = useState<KeyValuePair[]>(() =>
    buildKV(baseVersion?.termsJson),
  );
  const [metadataFields, setMetadataFields] = useState<KeyValuePair[]>(() =>
    buildKV(baseVersion?.metadataJson),
  );
  const [newCondition, setNewCondition] = useState<KeyValuePair>({
    key: "",
    value: "",
  });
  const [newMeta, setNewMeta] = useState<KeyValuePair>({ key: "", value: "" });
  const [entPage, setEntPage] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: entDefData } = useQuery({
    queryKey: ["entitlement-definitions", "", "", 0],
    queryFn: () =>
      subscriptionService.getEntitlementDefinitions({
        active: true,
        size: 100,
      }),
  });
  const entDefs: EntitlementDefinition[] = entDefData?.content ?? [];

  // ── Payload ───────────────────────────────────────────────────────────────
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
      entitlements: localEntitlements.filter(
        (e) => e.entitlementCode.trim() !== "",
      ),
      termsJson:
        Object.keys(termsObj).length > 0 ? JSON.stringify(termsObj) : undefined,
      metadataJson:
        Object.keys(metaObj).length > 0 ? JSON.stringify(metaObj) : undefined,
    };
  };

  const createMutation = useMutation({
    mutationFn: () =>
      subscriptionService.createPlanVersion(plan.code, buildPayload()),
    onSuccess: (newVersion) => {
      queryClient.invalidateQueries({ queryKey: ["plan-versions", plan.code] });
      onSuccess(newVersion);
    },
    onError: (e: any) => {
      setErrorMessage(
        e?.response?.data?.message ??
          "Erreur lors de la création de la version.",
      );
    },
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

  // ── Handlers ──────────────────────────────────────────────────────────────

  // Conditions
  const addCondition = () => {
    if (newCondition.key && newCondition.value) {
      setConditions([...conditions, { ...newCondition }]);
      setNewCondition({ key: "", value: "" });
    }
  };

  // Métadonnées
  const addMeta = () => {
    if (newMeta.key && newMeta.value) {
      setMetadataFields([...metadataFields, { ...newMeta }]);
      setNewMeta({ key: "", value: "" });
    }
  };

  // Prix
  const addPrice = () =>
    setFormData({
      ...formData,
      prices: [
        ...formData.prices,
        {
          billingCycle: "MONTHLY",
          currency: "XAF",
          amount: 0,
          setupFee: 0,
          depositAmount: 0,
          taxIncluded: true,
          commitmentMonths: 1,
        },
      ],
    });
  const removePrice = (i: number) =>
    setFormData({
      ...formData,
      prices: formData.prices.filter((_, idx) => idx !== i),
    });
  const updatePrice = (i: number, field: string, value: any) => {
    const arr = [...formData.prices];
    arr[i] = { ...arr[i], [field]: value };
    setFormData({ ...formData, prices: arr });
  };

  // Avantages
  const addBenefit = () =>
    setFormData({
      ...formData,
      benefits: [
        ...formData.benefits,
        {
          title: "",
          description: "",
          icon: "",
          category: "",
          displayOrder: formData.benefits.length + 1,
          highlighted: false,
          included: true,
        },
      ],
    });
  const removeBenefit = (i: number) =>
    setFormData({
      ...formData,
      benefits: formData.benefits.filter((_, idx) => idx !== i),
    });
  const updateBenefit = (i: number, field: string, value: any) => {
    const arr = [...formData.benefits];
    arr[i] = { ...arr[i], [field]: value };
    setFormData({ ...formData, benefits: arr });
  };

  // Entitlements
  const addEntitlement = () => {
    const updated = [
      ...localEntitlements,
      createEmptyEntitlement(localEntitlements.length + 1),
    ];
    setLocalEntitlements(updated);
    setEntPage(Math.ceil(updated.length / ENTITLEMENTS_PER_PAGE) - 1);
  };
  const removeEntitlement = (i: number) => {
    const updated = localEntitlements.filter((_, idx) => idx !== i);
    setLocalEntitlements(updated);
    const maxPage = Math.max(
      0,
      Math.ceil(updated.length / ENTITLEMENTS_PER_PAGE) - 1,
    );
    if (entPage > maxPage) setEntPage(maxPage);
  };
  const updateEntitlement = (i: number, field: string, value: any) => {
    const arr = [...localEntitlements];
    arr[i] = { ...arr[i], [field]: value };
    setLocalEntitlements(arr);
  };

  const totalEntPages = Math.max(
    1,
    Math.ceil(localEntitlements.length / ENTITLEMENTS_PER_PAGE),
  );
  const pagedEnts = localEntitlements.slice(
    entPage * ENTITLEMENTS_PER_PAGE,
    (entPage + 1) * ENTITLEMENTS_PER_PAGE,
  );

  return (
    <>
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-4 transition-colors"
        >
          <ArrowLeft size={16} />
          Retour à {plan.name}
        </button>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Nouvelle version de plan
            </h1>
            <p className="text-gray-500 mt-1">
              Plan : <span className="font-medium">{plan.name}</span>
              <span className="mx-2 text-gray-300">·</span>
              <span className="font-mono text-sm">{plan.code}</span>
            </p>
            {baseVersion && (
              <div className="mt-2 flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 w-fit">
                <AlertCircle size={13} className="flex-shrink-0" />
                Basée sur la version {baseVersion.versionNumber} — les versions
                publiées ne sont pas modifiables.
              </div>
            )}
          </div>

          <div className="flex gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={onBack}
              disabled={createMutation.isPending}
              className="px-4 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              form="version-form"
              type="submit"
              disabled={createMutation.isPending}
              className="px-5 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2 font-medium"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Création...
                </>
              ) : (
                "Créer la version"
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── Formulaire ──────────────────────────────────────────────────────── */}
      <form id="version-form" onSubmit={handleSubmit}>
        {errorMessage && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
            <AlertCircle size={16} className="flex-shrink-0" />
            {errorMessage}
          </div>
        )}

        <div className="space-y-6">
          {/* ── Infos générales ── */}
          <Section title="Informations générales">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Nom *">
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="ex: Version mensuelle 2026"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </Field>
              <Field label="Description">
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Description courte"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </Field>
              <Field label="Date d'effet *">
                <input
                  type="date"
                  required
                  value={formData.effectiveFrom}
                  onChange={(e) =>
                    setFormData({ ...formData, effectiveFrom: e.target.value })
                  }
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg"
                />
              </Field>
              <Field label="Date de fin">
                <input
                  type="date"
                  value={formData.effectiveTo}
                  min={formData.effectiveFrom}
                  onChange={(e) =>
                    setFormData({ ...formData, effectiveTo: e.target.value })
                  }
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg"
                />
              </Field>
            </div>
          </Section>

          {/* ── Tarifs ── */}
          <Section
            title="Tarifs *"
            action={
              <button
                type="button"
                onClick={addPrice}
                className="text-primary-600 text-sm flex items-center gap-1 hover:text-primary-700"
              >
                <Plus size={14} /> Ajouter un tarif
              </button>
            }
          >
            <div className="space-y-3">
              {formData.prices.map((price, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 p-4 bg-gray-50 rounded-xl items-end"
                >
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      Cycle
                    </label>
                    <select
                      value={price.billingCycle}
                      onChange={(e) =>
                        updatePrice(idx, "billingCycle", e.target.value)
                      }
                      className="w-full px-2 py-2 border rounded-lg text-sm bg-white"
                    >
                      {billingCycles.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      Devise
                    </label>
                    <select
                      value={price.currency}
                      onChange={(e) =>
                        updatePrice(idx, "currency", e.target.value)
                      }
                      className="w-full px-2 py-2 border rounded-lg text-sm bg-white"
                    >
                      {currencies.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      Montant *
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={price.amount === 0 ? "" : price.amount}
                      onChange={(e) => {
                        const v = e.target.value.replace(/[^\d.]/g, "");
                        updatePrice(
                          idx,
                          "amount",
                          v === "" ? 0 : parseFloat(v),
                        );
                      }}
                      placeholder="0"
                      className="w-full px-2 py-2 border rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      Setup fee
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={price.setupFee}
                      onChange={(e) =>
                        updatePrice(
                          idx,
                          "setupFee",
                          parseFloat(e.target.value) || 0,
                        )
                      }
                      className="w-full px-2 py-2 border rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      Dépôt
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={
                        price.depositAmount === 0 ? "" : price.depositAmount
                      }
                      onChange={(e) => {
                        const v = e.target.value.replace(/[^\d.]/g, "");
                        updatePrice(
                          idx,
                          "depositAmount",
                          v === "" ? 0 : parseFloat(v),
                        );
                      }}
                      placeholder="0"
                      className="w-full px-2 py-2 border rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      Engagement (mois)
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={
                        price.commitmentMonths === 0
                          ? ""
                          : price.commitmentMonths
                      }
                      onChange={(e) => {
                        const v = e.target.value.replace(/\D/g, "");
                        updatePrice(
                          idx,
                          "commitmentMonths",
                          v === "" ? 0 : parseInt(v),
                        );
                      }}
                      placeholder="0"
                      className="w-full px-2 py-2 border rounded-lg text-sm"
                    />
                  </div>
                  <div className="flex items-end gap-2">
                    <label className="flex items-center gap-1 text-xs text-gray-500 pb-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={price.taxIncluded}
                        onChange={(e) =>
                          updatePrice(idx, "taxIncluded", e.target.checked)
                        }
                        className="rounded"
                      />
                      TTC
                    </label>
                    <button
                      type="button"
                      onClick={() => removePrice(idx)}
                      disabled={formData.prices.length === 1}
                      className="p-2 text-red-500 hover:text-red-700 disabled:opacity-30 mb-0.5"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* ── Conditions générales ── */}
          <Section
            title="Conditions générales"
            subtitle="Stockées en JSON (ex: commitment: monthly)"
          >
            <KVTable
              rows={conditions}
              onRemove={(i) =>
                setConditions(conditions.filter((_, idx) => idx !== i))
              }
              newRow={newCondition}
              onNewRowChange={setNewCondition}
              onAdd={addCondition}
              keyPlaceholder="commitment"
              valuePlaceholder="monthly"
            />
          </Section>

          {/* ── Avantages ── */}
          <Section
            title="Avantages"
            action={
              <button
                type="button"
                onClick={addBenefit}
                className="text-primary-600 text-sm flex items-center gap-1 hover:text-primary-700"
              >
                <Plus size={14} /> Ajouter
              </button>
            }
          >
            {formData.benefits.length === 0 ? (
              <p className="text-sm text-gray-400 italic">
                Aucun avantage. Cliquez sur &laquo; Ajouter &raquo;.
              </p>
            ) : (
              <div className="space-y-2">
                {formData.benefits.map((b, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-2 md:grid-cols-6 gap-2 items-center p-3 bg-gray-50 rounded-xl"
                  >
                    <input
                      type="text"
                      placeholder="Icône (emoji)"
                      value={b.icon ?? ""}
                      onChange={(e) =>
                        updateBenefit(idx, "icon", e.target.value)
                      }
                      className="px-2 py-1.5 border rounded-lg text-sm"
                    />
                    <input
                      type="text"
                      placeholder="Titre *"
                      value={b.title}
                      onChange={(e) =>
                        updateBenefit(idx, "title", e.target.value)
                      }
                      className="md:col-span-2 px-2 py-1.5 border rounded-lg text-sm"
                    />
                    <input
                      type="text"
                      placeholder="Description"
                      value={b.description ?? ""}
                      onChange={(e) =>
                        updateBenefit(idx, "description", e.target.value)
                      }
                      className="px-2 py-1.5 border rounded-lg text-sm"
                    />
                    <input
                      type="text"
                      placeholder="Catégorie"
                      value={b.category ?? ""}
                      onChange={(e) =>
                        updateBenefit(idx, "category", e.target.value)
                      }
                      className="px-2 py-1.5 border rounded-lg text-sm"
                    />
                    <div className="flex items-center gap-2 justify-end">
                      <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={b.highlighted}
                          onChange={(e) =>
                            updateBenefit(idx, "highlighted", e.target.checked)
                          }
                          className="rounded"
                        />
                        Favori
                      </label>
                      <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={b.included}
                          onChange={(e) =>
                            updateBenefit(idx, "included", e.target.checked)
                          }
                          className="rounded"
                        />
                        Inclus
                      </label>
                      <button
                        type="button"
                        onClick={() => removeBenefit(idx)}
                        className="p-1 text-red-500 hover:text-red-700"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* ── Droits inclus ── */}
          <Section
            title="Droits inclus"
            action={
              <button
                type="button"
                onClick={addEntitlement}
                className="text-primary-600 text-sm flex items-center gap-1 hover:text-primary-700"
              >
                <Plus size={14} /> Ajouter un droit
              </button>
            }
          >
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                      Droit
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase w-24">
                      Quantité
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase w-20">
                      ∞
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase w-36">
                      Report
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase w-28">
                      Validité (j)
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase w-16"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {pagedEnts.map((ent, idx) => {
                    const globalIdx = entPage * ENTITLEMENTS_PER_PAGE + idx;
                    return (
                      <tr key={globalIdx} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <select
                            value={ent.entitlementCode}
                            onChange={(e) =>
                              updateEntitlement(
                                globalIdx,
                                "entitlementCode",
                                e.target.value,
                              )
                            }
                            className="w-full px-2 py-1.5 border rounded-lg text-sm bg-white"
                          >
                            <option value="">Sélectionner un droit</option>
                            {entDefs.map((d) => (
                              <option key={d.code} value={d.code}>
                                {d.name} ({d.unit})
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <input
                            type="number"
                            min="0"
                            value={ent.quantity}
                            onChange={(e) =>
                              updateEntitlement(
                                globalIdx,
                                "quantity",
                                parseInt(e.target.value) || 0,
                              )
                            }
                            disabled={ent.unlimited}
                            className="w-20 px-2 py-1.5 border rounded-lg text-sm text-center disabled:bg-gray-50"
                          />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={ent.unlimited}
                            onChange={(e) =>
                              updateEntitlement(
                                globalIdx,
                                "unlimited",
                                e.target.checked,
                              )
                            }
                            className="rounded"
                          />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <input
                              type="checkbox"
                              checked={ent.rolloverAllowed}
                              onChange={(e) =>
                                updateEntitlement(
                                  globalIdx,
                                  "rolloverAllowed",
                                  e.target.checked,
                                )
                              }
                              className="rounded"
                            />
                            <input
                              type="number"
                              min="0"
                              placeholder="Limite"
                              value={ent.rolloverLimit}
                              onChange={(e) =>
                                updateEntitlement(
                                  globalIdx,
                                  "rolloverLimit",
                                  parseInt(e.target.value) || 0,
                                )
                              }
                              disabled={!ent.rolloverAllowed}
                              className="w-16 px-1 py-1.5 border rounded text-sm text-center disabled:bg-gray-50"
                            />
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <input
                            type="number"
                            min="0"
                            value={ent.validForDays}
                            onChange={(e) =>
                              updateEntitlement(
                                globalIdx,
                                "validForDays",
                                parseInt(e.target.value) || 0,
                              )
                            }
                            className="w-24 px-2 py-1.5 border rounded-lg text-sm text-center"
                          />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => removeEntitlement(globalIdx)}
                            className="p-1 text-red-500 hover:text-red-700"
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {localEntitlements.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-10 text-center text-gray-400 text-sm"
                      >
                        Aucun droit — cliquez sur &laquo; Ajouter un droit
                        &raquo;
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {totalEntPages > 1 && (
                <div className="flex justify-end items-center gap-2 p-3 border-t bg-gray-50">
                  <button
                    type="button"
                    onClick={() => setEntPage((p) => Math.max(0, p - 1))}
                    disabled={entPage === 0}
                    className="p-1 rounded border disabled:opacity-40 hover:bg-gray-100"
                  >
                    <ChevronLeft size={15} />
                  </button>
                  <span className="text-sm text-gray-600">
                    Page {entPage + 1} / {totalEntPages}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setEntPage((p) => Math.min(totalEntPages - 1, p + 1))
                    }
                    disabled={entPage >= totalEntPages - 1}
                    className="p-1 rounded border disabled:opacity-40 hover:bg-gray-100"
                  >
                    <ChevronRight size={15} />
                  </button>
                </div>
              )}
            </div>
          </Section>

          {/* ── Métadonnées ── */}
          <Section title="Métadonnées" subtitle="Champs libres stockés en JSON">
            <KVTable
              rows={metadataFields}
              onRemove={(i) =>
                setMetadataFields(metadataFields.filter((_, idx) => idx !== i))
              }
              newRow={newMeta}
              onNewRowChange={setNewMeta}
              onAdd={addMeta}
              keyPlaceholder="internal_note"
              valuePlaceholder="Tarif spécial Q1"
            />
          </Section>
        </div>

        {/* ── Bouton bas de page (sticky) ──────────────────────────────────── */}
        <div className="sticky bottom-0 bg-white border-t border-gray-100 py-4 mt-8 flex gap-3">
          <button
            type="button"
            onClick={onBack}
            disabled={createMutation.isPending}
            className="flex-1 max-w-xs px-4 py-2.5 border rounded-xl text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="flex-1 max-w-xs bg-primary-600 text-white py-2.5 rounded-xl hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
          >
            {createMutation.isPending ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Création...
              </>
            ) : (
              "Créer la version"
            )}
          </button>
        </div>
      </form>
    </>
  );
};

// ─── Sous-composants locaux ────────────────────────────────────────────────────

const Section: React.FC<{
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, subtitle, action, children }) => (
  <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
      <div>
        <h3 className="font-semibold text-gray-800">{title}</h3>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
    <div className="p-5">{children}</div>
  </div>
);

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({
  label,
  children,
}) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1.5">
      {label}
    </label>
    {children}
  </div>
);

interface KVTableProps {
  rows: KeyValuePair[];
  onRemove: (i: number) => void;
  newRow: KeyValuePair;
  onNewRowChange: (r: KeyValuePair) => void;
  onAdd: () => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
}
const KVTable: React.FC<KVTableProps> = ({
  rows,
  onRemove,
  newRow,
  onNewRowChange,
  onAdd,
  keyPlaceholder = "Clé",
  valuePlaceholder = "Valeur",
}) => (
  <div className="border border-gray-100 rounded-lg overflow-hidden">
    <table className="w-full">
      <thead className="bg-gray-50">
        <tr>
          <th className="px-4 py-2 text-left text-xs text-gray-500 font-medium">
            Clé
          </th>
          <th className="px-4 py-2 text-left text-xs text-gray-500 font-medium">
            Valeur
          </th>
          <th className="w-12" />
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-50">
        {rows.map((row, i) => (
          <tr key={i}>
            <td className="px-4 py-2 text-sm font-mono">{row.key}</td>
            <td className="px-4 py-2 text-sm">{row.value}</td>
            <td className="px-4 py-2 text-center">
              <button
                type="button"
                onClick={() => onRemove(i)}
                className="text-red-500 hover:text-red-700"
              >
                <Trash2 size={14} />
              </button>
            </td>
          </tr>
        ))}
        <tr className="bg-gray-50">
          <td className="px-4 py-2">
            <input
              type="text"
              placeholder={keyPlaceholder}
              value={newRow.key}
              onChange={(e) =>
                onNewRowChange({ ...newRow, key: e.target.value })
              }
              onKeyDown={(e) =>
                e.key === "Enter" && (e.preventDefault(), onAdd())
              }
              className="w-full px-2 py-1 border rounded text-sm"
            />
          </td>
          <td className="px-4 py-2">
            <input
              type="text"
              placeholder={valuePlaceholder}
              value={newRow.value}
              onChange={(e) =>
                onNewRowChange({ ...newRow, value: e.target.value })
              }
              onKeyDown={(e) =>
                e.key === "Enter" && (e.preventDefault(), onAdd())
              }
              className="w-full px-2 py-1 border rounded text-sm"
            />
          </td>
          <td className="px-4 py-2 text-center">
            <button
              type="button"
              onClick={onAdd}
              disabled={!newRow.key || !newRow.value}
              className="text-primary-600 hover:text-primary-800 disabled:opacity-30"
            >
              <Plus size={16} />
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
);
