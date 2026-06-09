import React, { useState, useEffect, useRef } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { X, Loader2, ChevronDown } from "lucide-react";
import { subscriptionService } from "../../../services/subscription.service";
import { apiClient } from "../../../services/api";
import type { EntitlementDefinition } from "../../../services/subscription.service";
import { ModalPortal } from "../../../components/ui/ModalPortal";

interface EntitlementDefinitionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingDefinition: EntitlementDefinition | null;
  onSuccess: () => void;
}

const entitlementTypes = [
  { value: "ACCESS", label: "Accès" },
  { value: "CREDIT", label: "Crédit" },
  { value: "TIME", label: "Temps" },
  { value: "DISCOUNT", label: "Réduction" },
  { value: "QUOTA", label: "Quota" },
  { value: "FEATURE_FLAG", label: "Fonctionnalité" },
  { value: "SERVICE_ALLOWANCE", label: "Forfait service" },
];

const units = [
  { value: "DAY", label: "Jour" },
  { value: "HOUR", label: "Heure" },
  { value: "CREDIT", label: "Crédit" },
  { value: "BOOKING", label: "Réservation" },
  { value: "VISIT", label: "Visite" },
  { value: "MEMBER", label: "Membre" },
  { value: "PERCENT", label: "Pourcentage" },
  { value: "AMOUNT", label: "Montant" },
  { value: "BOOLEAN", label: "Booléen" },
];

const consumptionModes = [
  { value: "CHECK_ONLY", label: "Vérification uniquement" },
  { value: "RESERVABLE", label: "Réservable" },
  { value: "CONSUMABLE", label: "Consommable" },
  { value: "RESERVE_THEN_CONSUME", label: "Réservation puis consommation" },
];

const resetPolicies = [
  { value: "NEVER", label: "Jamais" },
  { value: "DAILY", label: "Quotidien" },
  { value: "WEEKLY", label: "Hebdomadaire" },
  { value: "MONTHLY", label: "Mensuel" },
  { value: "PER_BILLING_CYCLE", label: "Par cycle de facturation" },
];

// ─────────────────────────────────────────────
// Helpers API resource-types / resource-groups
// ─────────────────────────────────────────────
const searchResourceTypes = async (
  query: string,
): Promise<{ code: string; name: string }[]> => {
  const response = await apiClient.get(
    "/sni/api/v1/resource-types/search/basic",
    {
      params: { query },
    },
  );
  if (Array.isArray(response.data)) return response.data;
  if (Array.isArray(response.data?.content)) return response.data.content;
  if (Array.isArray(response.data?.data)) return response.data.data;
  return [];
};

const searchResourceGroups = async (
  query: string,
): Promise<{ code: string; name: string }[]> => {
  const response = await apiClient.get(
    "/sni/api/v1/resource-groups/search/basic",
    {
      params: { query },
    },
  );
  if (Array.isArray(response.data)) return response.data;
  if (Array.isArray(response.data?.content)) return response.data.content;
  if (Array.isArray(response.data?.data)) return response.data.data;
  return [];
};

// ─────────────────────────────────────────────
// Composant ResourceCombobox
// ─────────────────────────────────────────────
interface ResourceComboboxProps {
  id: string;
  value: string;
  onChange: (code: string) => void;
  searchFn: (query: string) => Promise<{ code: string; name: string }[]>;
  queryKeyPrefix: string;
  placeholder?: string;
  disabled?: boolean;
}

const ResourceCombobox: React.FC<ResourceComboboxProps> = ({
  id,
  value,
  onChange,
  searchFn,
  queryKeyPrefix,
  placeholder,
  disabled = false,
}) => {
  const [inputText, setInputText] = useState(value);
  const [debouncedQuery, setDebouncedQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync avec valeur externe (reset du formulaire)
  useEffect(() => {
    setInputText(value);
    setDebouncedQuery(value);
  }, [value]);

  // Debounce 350 ms
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(inputText), 350);
    return () => clearTimeout(timer);
  }, [inputText]);

  const { data: suggestions = [], isFetching } = useQuery({
    queryKey: [queryKeyPrefix, debouncedQuery],
    queryFn: () => searchFn(debouncedQuery),
    enabled: open && !disabled,
    staleTime: 30_000,
  });

  // Fermeture clic extérieur
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (item: { code: string; name: string }) => {
    onChange(item.code);
    setInputText(item.code);
    setOpen(false);
  };

  const handleClear = () => {
    onChange("");
    setInputText("");
    setDebouncedQuery("");
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative flex items-center">
        <input
          id={id}
          type="text"
          value={inputText}
          onChange={(e) => {
            setInputText(e.target.value);
            setOpen(true);
          }}
          onFocus={() => !disabled && setOpen(true)}
          placeholder={placeholder}
          autoComplete="off"
          disabled={disabled}
          className="w-full px-3 py-2 pr-16 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm disabled:bg-gray-50 disabled:cursor-not-allowed"
        />
        <div className="absolute right-2 flex items-center gap-1">
          {isFetching && (
            <Loader2 size={12} className="animate-spin text-gray-400" />
          )}
          {value && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="text-gray-300 hover:text-gray-500 text-xs leading-none"
              tabIndex={-1}
              title="Effacer"
            >
              ✕
            </button>
          )}
          <button
            type="button"
            onClick={() => !disabled && setOpen((o) => !o)}
            className="text-gray-400 hover:text-gray-600 disabled:cursor-not-allowed"
            tabIndex={-1}
            disabled={disabled}
          >
            <ChevronDown
              size={14}
              className={`transition-transform ${open ? "rotate-180" : ""}`}
            />
          </button>
        </div>
      </div>

      {open && !disabled && (
        <ul className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
          {isFetching && suggestions.length === 0 && (
            <li className="px-3 py-2 text-sm text-gray-400 italic flex items-center gap-2">
              <Loader2 size={12} className="animate-spin" /> Recherche...
            </li>
          )}

          {!isFetching && suggestions.length === 0 && (
            <li className="px-3 py-2 text-sm text-gray-400 italic">
              {inputText ? "Aucun résultat" : "Tapez pour rechercher"}
            </li>
          )}

          {suggestions.map((item) => (
            <li
              key={item.code}
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(item);
              }}
              className={`px-3 py-2 text-sm cursor-pointer hover:bg-primary-50 hover:text-primary-700 ${
                item.code === value
                  ? "bg-primary-50 text-primary-700 font-medium"
                  : ""
              }`}
            >
              <span className="font-medium">{item.name}</span>
              <span className="ml-2 text-xs text-gray-400 font-mono">
                {item.code}
              </span>
            </li>
          ))}

          {/* Saisie libre si aucune correspondance exacte */}
          {inputText && !suggestions.find((s) => s.code === inputText) && (
            <li
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(inputText);
                setOpen(false);
              }}
              className="px-3 py-2 text-sm text-primary-600 hover:bg-primary-50 cursor-pointer border-t border-gray-100"
            >
              Utiliser &ldquo;{inputText}&rdquo; directement
            </li>
          )}
        </ul>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────
// Helpers formData
// ─────────────────────────────────────────────
const buildDefaultFormData = (def: EntitlementDefinition | null) => ({
  name: def?.name ?? "",
  description: def?.description ?? "",
  entitlementType: def?.entitlementType ?? "ACCESS",
  unit: def?.unit ?? "HOUR",
  consumptionMode: def?.consumptionMode ?? "RESERVE_THEN_CONSUME",
  resetPolicy: def?.resetPolicy ?? "PER_BILLING_CYCLE",
  stackable: def?.stackable ?? true,
  transferable: def?.transferable ?? false,
  resourceTypeCode: def?.resourceTypeCode ?? "",
  resourceGroupCode: def?.resourceGroupCode ?? "",
  // FIX : metadataJson exposé dans le formulaire (champ présent dans l'interface et le payload API)
  metadataJson: def?.metadataJson ?? "",
  active: def?.active ?? true,
});

// ─────────────────────────────────────────────
// Modal principal
// ─────────────────────────────────────────────
export const EntitlementDefinitionFormModal: React.FC<
  EntitlementDefinitionFormModalProps
> = ({ isOpen, onClose, editingDefinition, onSuccess }) => {
  const queryClient = useQueryClient();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState(() =>
    buildDefaultFormData(editingDefinition),
  );

  useEffect(() => {
    setFormData(buildDefaultFormData(editingDefinition));
    setErrorMessage(null);
  }, [editingDefinition, isOpen]);

  // FIX : payload propre — code jamais envoyé (généré par le backend)
  const buildPayload = () => ({
    name: formData.name,
    description: formData.description || undefined,
    entitlementType: formData.entitlementType,
    unit: formData.unit,
    consumptionMode: formData.consumptionMode,
    resetPolicy: formData.resetPolicy,
    stackable: formData.stackable,
    transferable: formData.transferable,
    resourceTypeCode: formData.resourceTypeCode || undefined,
    resourceGroupCode: formData.resourceGroupCode || undefined,
    // FIX : metadataJson envoyé uniquement s'il est non vide — undefined et non null (Partial<EntitlementDefinition> n'accepte pas null)
    metadataJson: formData.metadataJson.trim() || undefined,
    active: formData.active,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      subscriptionService.createEntitlementDefinition(buildPayload()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entitlement-definitions"] });
      onSuccess();
    },
    onError: (error: any) => {
      const msg =
        error?.response?.data?.message ??
        "Erreur lors de la création du droit.";
      setErrorMessage(msg);
    },
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      subscriptionService.updateEntitlementDefinition(
        editingDefinition!.code,
        buildPayload(),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entitlement-definitions"] });
      onSuccess();
    },
    onError: (error: any) => {
      const msg =
        error?.response?.data?.message ??
        "Erreur lors de la mise à jour du droit.";
      setErrorMessage(msg);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (editingDefinition) {
      updateMutation.mutate();
    } else {
      createMutation.mutate();
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  if (!isOpen) return null;

  return (
    <ModalPortal onClose={onClose}>
      <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center rounded-t-2xl">
        <h3 className="text-xl font-bold">
          {editingDefinition ? "Modifier le droit" : "Nouveau droit"}
        </h3>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 rounded-lg"
          aria-label="Fermer"
        >
          <X size={20} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {errorMessage && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
            {errorMessage}
          </div>
        )}

        {/* FIX : code affiché en lecture seule en mode édition (non modifiable, généré par le backend) */}
        {editingDefinition && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Code
            </label>
            <input
              type="text"
              value={editingDefinition.code}
              readOnly
              className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 font-mono text-sm cursor-not-allowed"
            />
          </div>
        )}

        <div>
          <label
            htmlFor="ent-name"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Nom *
          </label>
          <input
            id="ent-name"
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>

        <div>
          <label
            htmlFor="ent-description"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Description
          </label>
          <textarea
            id="ent-description"
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            rows={2}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="ent-type"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Type *
            </label>
            <select
              id="ent-type"
              value={formData.entitlementType}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  entitlementType: e.target
                    .value as EntitlementDefinition["entitlementType"],
                })
              }
              className="w-full px-3 py-2 border border-gray-200 rounded-lg"
            >
              {entitlementTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="ent-unit"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Unité *
            </label>
            <select
              id="ent-unit"
              value={formData.unit}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  unit: e.target.value as EntitlementDefinition["unit"],
                })
              }
              className="w-full px-3 py-2 border border-gray-200 rounded-lg"
            >
              {units.map((unit) => (
                <option key={unit.value} value={unit.value}>
                  {unit.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="ent-consumption"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Mode consommation *
            </label>
            <select
              id="ent-consumption"
              value={formData.consumptionMode}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  consumptionMode: e.target
                    .value as EntitlementDefinition["consumptionMode"],
                })
              }
              className="w-full px-3 py-2 border border-gray-200 rounded-lg"
            >
              {consumptionModes.map((mode) => (
                <option key={mode.value} value={mode.value}>
                  {mode.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="ent-reset"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Politique reset *
            </label>
            <select
              id="ent-reset"
              value={formData.resetPolicy}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  resetPolicy: e.target
                    .value as EntitlementDefinition["resetPolicy"],
                })
              }
              className="w-full px-3 py-2 border border-gray-200 rounded-lg"
            >
              {resetPolicies.map((policy) => (
                <option key={policy.value} value={policy.value}>
                  {policy.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Combobox API-driven pour resourceTypeCode et resourceGroupCode */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="ent-resourceType"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Type de ressource
            </label>
            <ResourceCombobox
              id="ent-resourceType"
              value={formData.resourceTypeCode}
              onChange={(code) =>
                setFormData({ ...formData, resourceTypeCode: code })
              }
              searchFn={searchResourceTypes}
              queryKeyPrefix="resource-types-search"
              placeholder="Rechercher un type..."
            />
          </div>
          <div>
            <label
              htmlFor="ent-resourceGroup"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Groupe de ressource
            </label>
            <ResourceCombobox
              id="ent-resourceGroup"
              value={formData.resourceGroupCode}
              onChange={(code) =>
                setFormData({ ...formData, resourceGroupCode: code })
              }
              searchFn={searchResourceGroups}
              queryKeyPrefix="resource-groups-search"
              placeholder="Rechercher un groupe..."
            />
          </div>
        </div>

        {/* FIX : champ metadataJson exposé (présent dans l'interface et le payload create/update) */}
        <div>
          <label
            htmlFor="ent-metadata"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Métadonnées (JSON)
            <span className="ml-1 text-xs text-gray-400 font-normal">
              optionnel
            </span>
          </label>
          <textarea
            id="ent-metadata"
            value={formData.metadataJson}
            onChange={(e) =>
              setFormData({ ...formData, metadataJson: e.target.value })
            }
            rows={2}
            placeholder='{"key": "value"}'
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none font-mono text-sm"
          />
        </div>

        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.stackable}
              onChange={(e) =>
                setFormData({ ...formData, stackable: e.target.checked })
              }
              className="rounded"
            />
            <span className="text-sm">Empilable</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.transferable}
              onChange={(e) =>
                setFormData({ ...formData, transferable: e.target.checked })
              }
              className="rounded"
            />
            <span className="text-sm">Transférable</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.active}
              onChange={(e) =>
                setFormData({ ...formData, active: e.target.checked })
              }
              className="rounded"
            />
            <span className="text-sm">Actif</span>
          </label>
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="flex-1 px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="flex-1 bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isPending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : editingDefinition ? (
              "Mettre à jour"
            ) : (
              "Créer"
            )}
          </button>
        </div>
      </form>
    </ModalPortal>
  );
};
