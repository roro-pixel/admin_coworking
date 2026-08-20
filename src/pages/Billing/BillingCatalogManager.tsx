import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Loader2, Power, Trash2, Save, X } from "lucide-react";
import { billingService } from "../../services/billing.service";
import type { ServiceCatalogItem } from "../../services/billing.service";

const inputCls =
  "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white";

interface CatalogFormState {
  name: string;
  description: string;
  category: string;
  unit: string;
  unitPrice: number;
  currency: string;
  taxRuleCode: string;
  displayOrder: number;
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
};

export const BillingCatalogManager: React.FC = () => {
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [active, setActive] = useState<string>("true");
  const [page, setPage] = useState(0);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ServiceCatalogItem | null>(
    null,
  );
  const [form, setForm] = useState<CatalogFormState>(defaultForm);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
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

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["billing-catalog-items"] });

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        category: form.category.trim() || undefined,
        unit: form.unit.trim() || undefined,
        unitPrice: form.unitPrice,
        currency: form.currency,
        taxRuleCode: form.taxRuleCode.trim() || undefined,
        displayOrder: form.displayOrder,
      };
      if (editingItem)
        return billingService.updateCatalogItem(editingItem.itemCode, payload);
      return billingService.createCatalogItem(payload);
    },
    onSuccess: () => {
      invalidate();
      setIsFormOpen(false);
      setEditingItem(null);
      setForm(defaultForm);
      setError(null);
    },
    onError: (e: any) =>
      setError(
        e?.response?.data?.message ?? "Erreur lors de l’enregistrement.",
      ),
  });

  const activateMutation = useMutation({
    mutationFn: (item: ServiceCatalogItem) =>
      item.active === false
        ? billingService.activateCatalogItem(item.itemCode)
        : billingService.deactivateCatalogItem(item.itemCode),
    onSuccess: invalidate,
    onError: (e: any) =>
      setError(
        e?.response?.data?.message ?? "Erreur lors du changement de statut.",
      ),
  });

  const deleteMutation = useMutation({
    mutationFn: (itemCode: string) =>
      billingService.deleteCatalogItem(itemCode),
    onSuccess: invalidate,
    onError: (e: any) =>
      setError(
        e?.response?.data?.message ?? "Suppression refusée ou impossible.",
      ),
  });

  const openCreateForm = () => {
    setEditingItem(null);
    setForm(defaultForm);
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
    });
    setIsFormOpen(true);
    setError(null);
  };

  const handleSave = () => {
    if (!form.name.trim()) {
      setError("Le nom est obligatoire.");
      return;
    }
    if (form.unitPrice < 0) {
      setError("Le prix unitaire ne peut pas être négatif.");
      return;
    }
    saveMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Catalogue de services
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            Articles réutilisables pour préremplir les lignes de devis et
            factures.
          </p>
        </div>
        <button
          onClick={openCreateForm}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center gap-2 text-sm font-medium"
        >
          <Plus size={15} /> Nouvel article
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm flex justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="underline">
            Fermer
          </button>
        </div>
      )}

      {isFormOpen && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-gray-900">
              {editingItem
                ? "Modifier l’article"
                : "Créer un article catalogue"}
            </h3>
            <button
              onClick={() => setIsFormOpen(false)}
              className="p-1 hover:bg-gray-100 rounded-lg"
            >
              <X size={18} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Nom *">
              <input
                className={inputCls}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </Field>
            <Field label="Catégorie">
              <input
                className={inputCls}
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="ESPACE"
              />
            </Field>
            <Field label="Unité">
              <input
                className={inputCls}
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                placeholder="jour, heure, mois"
              />
            </Field>
            <Field label="Prix unitaire">
              <input
                className={inputCls}
                type="number"
                min="0"
                value={form.unitPrice}
                onChange={(e) =>
                  setForm({
                    ...form,
                    unitPrice: parseFloat(e.target.value) || 0,
                  })
                }
              />
            </Field>
            <Field label="Devise">
              <input
                className={inputCls}
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
              />
            </Field>
            <Field label="Règle taxe">
              <input
                className={inputCls}
                value={form.taxRuleCode}
                onChange={(e) =>
                  setForm({ ...form, taxRuleCode: e.target.value })
                }
              />
            </Field>
            <Field label="Ordre d’affichage">
              <input
                className={inputCls}
                type="number"
                min="0"
                value={form.displayOrder}
                onChange={(e) =>
                  setForm({
                    ...form,
                    displayOrder: parseInt(e.target.value, 10) || 0,
                  })
                }
              />
            </Field>
            <div className="col-span-2">
              <Field label="Description">
                <textarea
                  className={inputCls}
                  rows={2}
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                />
              </Field>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={() => setIsFormOpen(false)}
              className="px-4 py-2 border rounded-lg text-sm text-gray-700 hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
            >
              {saveMutation.isPending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Save size={14} />
              )}{" "}
              Enregistrer
            </button>
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="grid grid-cols-4 gap-3">
          <div className="col-span-2 relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(0);
              }}
              placeholder="Rechercher un article"
            />
          </div>
          <input
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(0);
            }}
            placeholder="Catégorie"
          />
          <select
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
            value={active}
            onChange={(e) => {
              setActive(e.target.value);
              setPage(0);
            }}
          >
            <option value="true">Actifs</option>
            <option value="false">Inactifs</option>
            <option value="">Tous</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="animate-spin text-primary-600" />
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50/80">
              <tr>
                <th className="px-5 py-3 text-left text-sm font-semibold">
                  Code
                </th>
                <th className="px-5 py-3 text-left text-sm font-semibold">
                  Nom
                </th>
                <th className="px-5 py-3 text-left text-sm font-semibold">
                  Catégorie
                </th>
                <th className="px-5 py-3 text-right text-sm font-semibold">
                  Prix
                </th>
                <th className="px-5 py-3 text-center text-sm font-semibold">
                  Statut
                </th>
                <th className="px-5 py-3 text-center text-sm font-semibold">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((item) => (
                <tr key={item.itemCode} className="hover:bg-gray-50">
                  <td className="px-5 py-4 text-sm font-mono">
                    {item.itemCode}
                  </td>
                  <td className="px-5 py-4 text-sm">
                    <button
                      onClick={() => openEditForm(item)}
                      className="font-medium text-left hover:text-primary-600"
                    >
                      {item.name}
                    </button>
                    {item.description && (
                      <p className="text-xs text-gray-500 mt-1">
                        {item.description}
                      </p>
                    )}
                  </td>
                  <td className="px-5 py-4 text-sm">{item.category ?? "-"}</td>
                  <td className="px-5 py-4 text-sm text-right">
                    {item.unitPrice.toLocaleString("fr-FR")} {item.currency}
                    {item.unit ? ` / ${item.unit}` : ""}
                  </td>
                  <td className="px-5 py-4 text-center">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${item.active === false ? "bg-gray-100 text-gray-600" : "bg-green-100 text-green-700"}`}
                    >
                      {item.active === false ? "Inactif" : "Actif"}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => activateMutation.mutate(item)}
                        className="p-1 text-gray-600 hover:text-primary-600"
                        title={item.active === false ? "Activer" : "Désactiver"}
                      >
                        <Power size={15} />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm("Supprimer cet article catalogue ?"))
                            deleteMutation.mutate(item.itemCode);
                        }}
                        className="p-1 text-red-500 hover:text-red-700"
                        title="Supprimer"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="flex justify-between items-center text-sm text-gray-500">
        <span>
          {totalElements} article{totalElements > 1 ? "s" : ""}
        </span>
        <div className="flex gap-2">
          <button
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Précédent
          </button>
          <span className="px-2 py-1">
            {page + 1} / {totalPages}
          </span>
          <button
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Suivant
          </button>
        </div>
      </div>
    </div>
  );
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({
  label,
  children,
}) => (
  <label className="block">
    <span className="block text-sm font-medium text-gray-700 mb-1">
      {label}
    </span>
    {children}
  </label>
);
