import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Info, Package, Pencil, Plus, Power, Trash2, X, XCircle } from "lucide-react";
import { billingService } from "../../services/billing.service";
import type { BillingDiscountPolicy, BillingItemMode, ClearableCatalogField, ServiceCatalogItem } from "../../services/billing.service";
import {
  ActionButton,
  CheckField,
  DataCard,
  EmptyState,
  ErrorBanner,
  ErrorBlock,
  Field,
  HeadRow,
  IconButton,
  ListHeader,
  PanelForm,
  Pagination,
  SearchField,
  StatusChip,
} from "../../components/subscription/kit";
import { FIELD, FIELD_SOFT, ROW_HOVER, apiMessage, formatMoney } from "../../components/subscription/kitUtils";
import { ListSkeleton } from "../../components/ui/Skeleton";
import { toast } from "../../components/ui/toastStore";
import { currencyLabel } from "../../components/payment/paymentUtils";

const discountPolicies: { value: BillingDiscountPolicy; label: string }[] = [
  { value: "NONE", label: "Aucune limite" },
  { value: "WARN", label: "Avertir seulement" },
  { value: "BLOCK", label: "Bloquer à l'émission" },
];

const billingModes: { value: BillingItemMode; label: string }[] = [
  { value: "UNIT", label: "À l'unité" },
  { value: "HOURLY", label: "À l'heure" },
  { value: "DAILY", label: "À la journée" },
  { value: "MONTHLY", label: "Au mois" },
  { value: "FIXED", label: "Forfait" },
];

const floorOriginLabels: Record<string, string> = {
  EXPLICIT: "Saisi explicitement",
  DERIVED_FROM_MARGIN: "Dérivé de la marge minimale",
  COST_PRICE: "Dérivé du coût",
  NONE: "Aucun plancher",
};

interface CatalogFormState {
  name: string;
  description: string;
  category: string;
  unit: string;
  unitPrice: number;
  currency: string;
  taxRuleCode: string;
  displayOrder: number;
  costPrice: string;
  floorPrice: string;
  minMarginRate: string;
  maxDiscountRate: string;
  discountPolicy: BillingDiscountPolicy;
  detailedDescription: string;
  includedItemsText: string;
  imageUrl: string;
  billingMode: BillingItemMode | "";
  defaultQuantity: string;
  minQuantity: string;
  maxQuantity: string;
  taxableByDefault: boolean;
  subcategory: string;
  tagsText: string;
  externalReference: string;
  validFrom: string;
  validUntil: string;
}

const defaultForm: CatalogFormState = {
  name: "",
  description: "",
  category: "",
  unit: "",
  unitPrice: 0,
  currency: "XAF",
  taxRuleCode: "TVA_CG_18",
  displayOrder: 1,
  costPrice: "",
  floorPrice: "",
  minMarginRate: "",
  maxDiscountRate: "",
  discountPolicy: "NONE",
  detailedDescription: "",
  includedItemsText: "",
  imageUrl: "",
  billingMode: "",
  defaultQuantity: "",
  minQuantity: "",
  maxQuantity: "",
  taxableByDefault: true,
  subcategory: "",
  tagsText: "",
  externalReference: "",
  validFrom: "",
  validUntil: "",
};

const COLS = "lg:grid-cols-[8rem_minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)_8rem_8rem]";

/** Champ optionnel avec bouton « vider » : le champ est marqué dans clearFields au lieu d'être omis
    (un champ absent est CONSERVÉ par le backend, ne pas confondre les deux). */
function ClearableField({
  label,
  value,
  onChange,
  onClear,
  cleared,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onClear?: () => void;
  cleared?: boolean;
  placeholder?: string;
  type?: string;
}) {
  return (
    <Field label={label}>
      <div className="relative">
        <input
          type={type}
          value={cleared ? "" : value}
          onChange={(e) => onChange(e.target.value)}
          disabled={cleared}
          placeholder={cleared ? "Sera vidé à l'enregistrement" : placeholder}
          className={`${FIELD} ${onClear ? "pr-11" : ""} ${cleared ? "italic" : ""}`}
        />
        {onClear && value && !cleared && (
          <button type="button" onClick={onClear} title="Vider ce champ" aria-label="Vider ce champ" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-red-500">
            <XCircle size={17} />
          </button>
        )}
        {cleared && (
          <button type="button" onClick={onClear} title="Annuler" aria-label="Annuler le vidage" className="absolute right-3 top-1/2 -translate-y-1/2 text-red-400 hover:text-gray-600">
            <X size={17} />
          </button>
        )}
      </div>
    </Field>
  );
}

const Group: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="rounded-2xl bg-gray-50 p-4">
    <h5 className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-400">{title}</h5>
    {children}
  </div>
);

export const BillingCatalogManager: React.FC = () => {
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [active, setActive] = useState<string>("true");
  const [page, setPage] = useState(0);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ServiceCatalogItem | null>(null);
  const [form, setForm] = useState<CatalogFormState>(defaultForm);
  const [clearedFields, setClearedFields] = useState<Set<ClearableCatalogField>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["billing-catalog-items", q, category, active, page],
    queryFn: () =>
      billingService.getCatalogItems({
        q: q || undefined,
        category: category || undefined,
        active: active === "" ? undefined : active === "true",
        page,
        size: 20,
      }),
  });

  const items = data?.content ?? [];
  const totalElements = data?.totalElements ?? 0;
  const totalPages = data?.totalPages ?? 1;

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["billing-catalog-items"] });

  const toggleClear = (field: ClearableCatalogField) => {
    setClearedFields((prev) => {
      const next = new Set(prev);
      if (next.has(field)) next.delete(field);
      else next.add(field);
      return next;
    });
  };

  const num = (v: string) => (v.trim() === "" ? undefined : Number(v));
  const list = (v: string) => (v.trim() === "" ? undefined : v.split(",").map((s) => s.trim()).filter(Boolean));

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingItem(null);
    setForm(defaultForm);
    setClearedFields(new Set());
    setError(null);
  };

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload: Partial<ServiceCatalogItem> = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        category: form.category.trim() || undefined,
        unit: form.unit.trim() || undefined,
        unitPrice: form.unitPrice,
        currency: form.currency,
        taxRuleCode: form.taxRuleCode.trim() || undefined,
        displayOrder: form.displayOrder,
        costPrice: num(form.costPrice),
        floorPrice: num(form.floorPrice),
        minMarginRate: num(form.minMarginRate),
        maxDiscountRate: num(form.maxDiscountRate),
        discountPolicy: form.discountPolicy,
        detailedDescription: form.detailedDescription.trim() || undefined,
        includedItems: list(form.includedItemsText),
        imageUrl: form.imageUrl.trim() || undefined,
        billingMode: form.billingMode || undefined,
        defaultQuantity: num(form.defaultQuantity),
        minQuantity: num(form.minQuantity),
        maxQuantity: num(form.maxQuantity),
        taxableByDefault: form.taxableByDefault,
        subcategory: form.subcategory.trim() || undefined,
        tags: list(form.tagsText),
        externalReference: form.externalReference.trim() || undefined,
        validFrom: form.validFrom || undefined,
        validUntil: form.validUntil || undefined,
      };
      if (editingItem) return billingService.updateCatalogItem(editingItem.itemCode, payload, Array.from(clearedFields));
      return billingService.createCatalogItem(payload as Omit<ServiceCatalogItem, "itemCode">);
    },
    onSuccess: () => {
      invalidate();
      toast.success(editingItem ? "Article mis à jour." : "Article créé.");
      closeForm();
    },
    onError: (e: unknown) => setError(apiMessage(e, "Erreur lors de l'enregistrement.")),
  });

  const activateMutation = useMutation({
    mutationFn: (item: ServiceCatalogItem) =>
      item.active === false ? billingService.activateCatalogItem(item.itemCode) : billingService.deactivateCatalogItem(item.itemCode),
    onSuccess: invalidate,
    onError: (e: unknown) => toast.error(apiMessage(e, "Erreur lors du changement de statut.")),
  });

  const deleteMutation = useMutation({
    mutationFn: (itemCode: string) => billingService.deleteCatalogItem(itemCode),
    onSuccess: invalidate,
  });

  const openCreateForm = () => {
    setEditingItem(null);
    setForm(defaultForm);
    setClearedFields(new Set());
    setIsFormOpen(true);
    setError(null);
  };

  const openEditForm = (item: ServiceCatalogItem) => {
    setEditingItem(item);
    setForm({
      name: item.name ?? "",
      description: item.description ?? "",
      category: item.category ?? "",
      unit: item.unit ?? "",
      unitPrice: item.unitPrice ?? 0,
      currency: item.currency ?? "XAF",
      taxRuleCode: item.taxRuleCode ?? "TVA_CG_18",
      displayOrder: item.displayOrder ?? 1,
      costPrice: item.costPrice?.toString() ?? "",
      floorPrice: item.floorPrice?.toString() ?? "",
      minMarginRate: item.minMarginRate?.toString() ?? "",
      maxDiscountRate: item.maxDiscountRate?.toString() ?? "",
      discountPolicy: item.discountPolicy ?? "NONE",
      detailedDescription: item.detailedDescription ?? "",
      includedItemsText: (item.includedItems ?? []).join(", "),
      imageUrl: item.imageUrl ?? "",
      billingMode: item.billingMode ?? "",
      defaultQuantity: item.defaultQuantity?.toString() ?? "",
      minQuantity: item.minQuantity?.toString() ?? "",
      maxQuantity: item.maxQuantity?.toString() ?? "",
      taxableByDefault: item.taxableByDefault ?? true,
      subcategory: item.subcategory ?? "",
      tagsText: (item.tags ?? []).join(", "),
      externalReference: item.externalReference ?? "",
      validFrom: item.validFrom?.slice(0, 10) ?? "",
      validUntil: item.validUntil?.slice(0, 10) ?? "",
    });
    setClearedFields(new Set());
    setIsFormOpen(true);
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return setError("Le nom est obligatoire.");
    if (form.unitPrice < 0) return setError("Le prix unitaire ne peut pas être négatif.");
    if (form.floorPrice && !clearedFields.has("floorPrice") && Number(form.floorPrice) > form.unitPrice) {
      return setError("Le plancher ne peut pas dépasser le prix de vente : l'article serait invendable.");
    }
    if (form.minQuantity && form.maxQuantity && !clearedFields.has("minQuantity") && !clearedFields.has("maxQuantity") && Number(form.minQuantity) > Number(form.maxQuantity)) {
      return setError("La quantité minimale ne peut pas dépasser la quantité maximale.");
    }
    setError(null);
    saveMutation.mutate();
  };

  const askDelete = (item: ServiceCatalogItem) =>
    toast.confirm({
      message: `Supprimer « ${item.name} » ?`,
      detail: "L'article disparaît du catalogue. Les documents déjà émis ne sont pas modifiés.",
      confirmLabel: "Supprimer",
      pendingLabel: "Suppression",
      successMessage: "Article supprimé.",
      errorMessage: "Suppression refusée ou impossible.",
      onConfirm: () => deleteMutation.mutateAsync(item.itemCode),
    });

  const set = <K extends keyof CatalogFormState>(k: K, v: CatalogFormState[K]) => setForm({ ...form, [k]: v });

  return (
    <div className="space-y-5">
      <ListHeader
        title="Catalogue de services"
        subtitle="Articles réutilisables pour préremplir les lignes de devis et de factures."
        action={
          !isFormOpen ? (
            <ActionButton icon={Plus} onClick={openCreateForm}>
              Nouvel article
            </ActionButton>
          ) : undefined
        }
      />

      {isFormOpen && (
        <PanelForm
          title={editingItem ? "Modifier l'article" : "Créer un article du catalogue"}
          onSubmit={handleSave}
          onCancel={closeForm}
          pending={saveMutation.isPending}
          submitLabel="Enregistrer"
          error={error}
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Field label="Nom" required className="xl:col-span-2">
              <input className={FIELD_SOFT} value={form.name} onChange={(e) => set("name", e.target.value)} />
            </Field>
            <Field label="Catégorie">
              <input className={FIELD_SOFT} value={form.category} onChange={(e) => set("category", e.target.value)} placeholder="ESPACE" />
            </Field>
            <Field label="Unité">
              <input className={FIELD_SOFT} value={form.unit} onChange={(e) => set("unit", e.target.value)} placeholder="jour, heure, mois" />
            </Field>
            <Field label="Prix unitaire">
              <input className={FIELD_SOFT} type="number" min="0" value={form.unitPrice} onChange={(e) => set("unitPrice", parseFloat(e.target.value) || 0)} />
            </Field>
            <Field label="Devise">
              <input className={FIELD_SOFT} value={form.currency} onChange={(e) => set("currency", e.target.value)} />
            </Field>
            <Field label="Règle de taxe">
              <input className={FIELD_SOFT} value={form.taxRuleCode} onChange={(e) => set("taxRuleCode", e.target.value)} />
            </Field>
            <Field label="Ordre d'affichage">
              <input className={FIELD_SOFT} type="number" min="0" value={form.displayOrder} onChange={(e) => set("displayOrder", parseInt(e.target.value, 10) || 0)} />
            </Field>
            <Field label="Description" className="sm:col-span-2 xl:col-span-4">
              <textarea className={FIELD_SOFT} rows={2} value={form.description} onChange={(e) => set("description", e.target.value)} />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <Group title="Économie">
              {editingItem && (editingItem.effectiveFloorPrice !== undefined || editingItem.floorPriceOrigin) && (
                <div className="mb-3 flex items-start gap-2.5 rounded-2xl bg-white p-3 text-sm text-gray-600 shadow-sm">
                  <Info size={15} className="mt-0.5 shrink-0 text-gray-400" />
                  <p>
                    Plancher réellement appliqué :{" "}
                    <b className="text-gray-900">
                      {editingItem.effectiveFloorPrice !== undefined ? editingItem.effectiveFloorPrice.toLocaleString("fr-FR") : "Aucun"} {editingItem.currency}
                    </b>{" "}
                    <span className="text-gray-400">({floorOriginLabels[editingItem.floorPriceOrigin ?? "NONE"]})</span>
                  </p>
                </div>
              )}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Coût">
                  <input className={FIELD} type="number" min="0" value={form.costPrice} onChange={(e) => set("costPrice", e.target.value)} placeholder="8000" />
                </Field>
                <ClearableField
                  label="Plancher explicite"
                  value={form.floorPrice}
                  onChange={(v) => set("floorPrice", v)}
                  onClear={editingItem ? () => toggleClear("floorPrice") : undefined}
                  cleared={clearedFields.has("floorPrice")}
                  type="number"
                  placeholder="Dérivé du coût si vide"
                />
                <Field label="Marge minimale (%)">
                  <input className={FIELD} type="number" min="0" max="100" value={form.minMarginRate} onChange={(e) => set("minMarginRate", e.target.value)} placeholder="20" />
                </Field>
                <Field label="Remise max sur l'article (%)">
                  <input className={FIELD} type="number" min="0" max="100" value={form.maxDiscountRate} onChange={(e) => set("maxDiscountRate", e.target.value)} />
                </Field>
                <Field label="Politique de remise" className="sm:col-span-2">
                  <select className={FIELD} value={form.discountPolicy} onChange={(e) => set("discountPolicy", e.target.value as BillingDiscountPolicy)}>
                    {discountPolicies.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            </Group>

            <Group title="Saisie">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Mode de facturation">
                  <select className={FIELD} value={form.billingMode} onChange={(e) => set("billingMode", e.target.value as BillingItemMode)}>
                    <option value="">Non précisé</option>
                    {billingModes.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Quantité par défaut">
                  <input className={FIELD} type="number" min="0" value={form.defaultQuantity} onChange={(e) => set("defaultQuantity", e.target.value)} />
                </Field>
                <Field label="Quantité min">
                  <input className={FIELD} type="number" min="0" value={form.minQuantity} onChange={(e) => set("minQuantity", e.target.value)} />
                </Field>
                <Field label="Quantité max">
                  <input className={FIELD} type="number" min="0" value={form.maxQuantity} onChange={(e) => set("maxQuantity", e.target.value)} />
                </Field>
                <div className="sm:col-span-2">
                  <CheckField checked={form.taxableByDefault} onChange={(v) => set("taxableByDefault", v)} label="Taxable par défaut" />
                </div>
              </div>
            </Group>

            <Group title="Classement">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Sous-catégorie">
                  <input className={FIELD} value={form.subcategory} onChange={(e) => set("subcategory", e.target.value)} />
                </Field>
                <Field label="Référence externe">
                  <input className={FIELD} value={form.externalReference} onChange={(e) => set("externalReference", e.target.value)} />
                </Field>
                <Field label="Étiquettes (séparées par une virgule)" className="sm:col-span-2">
                  <input className={FIELD} value={form.tagsText} onChange={(e) => set("tagsText", e.target.value)} placeholder="premium, saisonnier" />
                </Field>
                <Field label="Valide à partir du">
                  <input className={FIELD} type="date" value={form.validFrom} onChange={(e) => set("validFrom", e.target.value)} />
                </Field>
                <Field label="Valide jusqu'au">
                  <input className={FIELD} type="date" value={form.validUntil} onChange={(e) => set("validUntil", e.target.value)} />
                </Field>
              </div>
            </Group>

            <Group title="Contenu">
              <div className="space-y-4">
                <Field label="Description détaillée">
                  <textarea className={FIELD} rows={3} value={form.detailedDescription} onChange={(e) => set("detailedDescription", e.target.value)} />
                </Field>
                <Field label="Éléments inclus (séparés par une virgule)">
                  <input className={FIELD} value={form.includedItemsText} onChange={(e) => set("includedItemsText", e.target.value)} placeholder="Wifi, Vidéoprojecteur, Café" />
                </Field>
                <Field label="URL de l'image">
                  <input className={FIELD} value={form.imageUrl} onChange={(e) => set("imageUrl", e.target.value)} placeholder="https://" />
                </Field>
              </div>
            </Group>
          </div>
        </PanelForm>
      )}

      {!isFormOpen && <ErrorBanner message={error} />}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_12rem]">
        <SearchField value={q} onChange={(v) => { setQ(v); setPage(0); }} placeholder="Rechercher un article" />
        <input className={`${FIELD_SOFT} bg-white shadow-sm`} value={category} onChange={(e) => { setCategory(e.target.value); setPage(0); }} placeholder="Catégorie" aria-label="Catégorie" />
        <select className={`${FIELD_SOFT} bg-white shadow-sm`} value={active} onChange={(e) => { setActive(e.target.value); setPage(0); }} aria-label="Statut">
          <option value="true">Actifs</option>
          <option value="false">Inactifs</option>
          <option value="">Tous</option>
        </select>
      </div>

      {isLoading ? (
        <ListSkeleton rows={6} />
      ) : isError ? (
        <ErrorBlock message="Impossible de charger le catalogue." onRetry={() => refetch()} />
      ) : items.length === 0 ? (
        <EmptyState icon={Package} title="Aucun article" hint="Ajustez les filtres ou créez un premier article." />
      ) : (
        <>
          <HeadRow cols={COLS}>
            <span>Code</span>
            <span>Nom</span>
            <span>Catégorie</span>
            <span>Prix</span>
            <span>Statut</span>
            <span className="text-right">Actions</span>
          </HeadRow>
          <DataCard>
            {items.map((item) => (
              <div key={item.itemCode} className={`grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 rounded-2xl p-4 transition max-lg:mb-2 max-lg:bg-gray-50 ${COLS} ${ROW_HOVER}`}>
                <p className="truncate font-mono text-xs font-semibold text-[color:var(--logo-pink-dark)]">{item.itemCode}</p>
                <div className="lg:order-last lg:text-right">
                  <div className="flex justify-end gap-1">
                    <IconButton icon={Pencil} label="Modifier" onClick={() => openEditForm(item)} />
                    <IconButton
                      icon={Power}
                      label={item.active === false ? "Activer" : "Désactiver"}
                      tone={item.active === false ? "success" : "neutral"}
                      pending={activateMutation.isPending && activateMutation.variables?.itemCode === item.itemCode}
                      onClick={() => activateMutation.mutate(item)}
                    />
                    <IconButton icon={Trash2} label="Supprimer" tone="danger" onClick={() => askDelete(item)} />
                  </div>
                </div>
                <div className="col-span-2 min-w-0 lg:col-span-1">
                  <p className="truncate font-semibold text-gray-950">{item.name}</p>
                  {item.description && <p className="truncate text-xs text-gray-400">{item.description}</p>}
                </div>
                <p className="text-sm text-gray-600">{item.category ?? ""}</p>
                <p className="text-sm font-bold tabular-nums text-gray-950">
                  {formatMoney(item.unitPrice, currencyLabel(item.currency))}
                  {item.unit ? <span className="font-normal text-gray-400"> / {item.unit}</span> : null}
                </p>
                <div className="flex flex-col items-start gap-1">
                  <StatusChip tone={item.active === false ? "neutral" : "success"}>{item.active === false ? "Inactif" : "Actif"}</StatusChip>
                  {item.currentlyValid === false && <span className="text-xs text-amber-600">Hors fenêtre de validité</span>}
                </div>
              </div>
            ))}
          </DataCard>
          <Pagination page={page} totalPages={totalPages} total={totalElements} noun="article" onChange={setPage} />
        </>
      )}
    </div>
  );
};
