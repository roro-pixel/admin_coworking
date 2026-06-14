import React, { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, Loader2, Search, X } from "lucide-react";
import { apiClient } from "../../../services/api";
import type { EntitlementDefinition } from "../../../services/subscription.service";

export const entitlementTypes = [
  { value: "ACCESS", label: "Accès" },
  { value: "CREDIT", label: "Crédit" },
  { value: "TIME", label: "Temps" },
  { value: "DISCOUNT", label: "Réduction" },
  { value: "QUOTA", label: "Quota" },
  { value: "FEATURE_FLAG", label: "Fonctionnalité" },
  { value: "SERVICE_ALLOWANCE", label: "Forfait service" },
] as const;

export const units = [
  { value: "DAY", label: "Jour" },
  { value: "HOUR", label: "Heure" },
  { value: "CREDIT", label: "Crédit" },
  { value: "BOOKING", label: "Réservation" },
  { value: "VISIT", label: "Visite" },
  { value: "MEMBER", label: "Membre" },
  { value: "PERCENT", label: "Pourcentage" },
  { value: "AMOUNT", label: "Montant" },
  { value: "BOOLEAN", label: "Booléen" },
] as const;

export const consumptionModes = [
  { value: "CHECK_ONLY", label: "Vérification uniquement" },
  { value: "RESERVABLE", label: "Réservable" },
  { value: "CONSUMABLE", label: "Consommable" },
  { value: "RESERVE_THEN_CONSUME", label: "Réservation puis consommation" },
] as const;

export const resetPolicies = [
  { value: "NEVER", label: "Jamais" },
  { value: "DAILY", label: "Quotidien" },
  { value: "WEEKLY", label: "Hebdomadaire" },
  { value: "MONTHLY", label: "Mensuel" },
  { value: "PER_BILLING_CYCLE", label: "Par cycle de facturation" },
] as const;

export const entitlementTypeLabels = Object.fromEntries(
  entitlementTypes.map((item) => [item.value, item.label]),
) as Record<string, string>;

export const unitLabels = Object.fromEntries(units.map((item) => [item.value, item.label])) as Record<string, string>;

export const consumptionModeLabels = Object.fromEntries(
  consumptionModes.map((item) => [item.value, item.label]),
) as Record<string, string>;

export const resetPolicyLabels = Object.fromEntries(
  resetPolicies.map((item) => [item.value, item.label]),
) as Record<string, string>;

export type EntitlementFormData = {
  name: string;
  description: string;
  entitlementType: EntitlementDefinition["entitlementType"];
  unit: EntitlementDefinition["unit"];
  consumptionMode: EntitlementDefinition["consumptionMode"];
  resetPolicy: EntitlementDefinition["resetPolicy"];
  stackable: boolean;
  transferable: boolean;
  resourceTypeCode: string;
  resourceGroupCode: string;
  metadataJson: string;
  active: boolean;
};

export const buildDefaultEntitlementFormData = (def?: EntitlementDefinition | null): EntitlementFormData => ({
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
  metadataJson: def?.metadataJson ?? "",
  active: def?.active ?? true,
});

export const buildEntitlementPayload = (formData: EntitlementFormData) => ({
  name: formData.name.trim(),
  description: formData.description.trim() || undefined,
  entitlementType: formData.entitlementType,
  unit: formData.unit,
  consumptionMode: formData.consumptionMode,
  resetPolicy: formData.resetPolicy,
  stackable: formData.stackable,
  transferable: formData.transferable,
  resourceTypeCode: formData.resourceTypeCode.trim() || undefined,
  resourceGroupCode: formData.resourceGroupCode.trim() || undefined,
  metadataJson: formData.metadataJson.trim() || undefined,
  active: formData.active,
});

const normalizeSearchResults = (raw: any): { code: string; name: string }[] => {
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.content)) return raw.content;
  if (Array.isArray(raw?.data)) return raw.data;
  return [];
};

const searchResourceTypes = async (query: string): Promise<{ code: string; name: string }[]> => {
  const response = await apiClient.get("/sni/api/v1/resource-types/search/basic", { params: { query } });
  return normalizeSearchResults(response.data);
};

const searchResourceGroups = async (query: string): Promise<{ code: string; name: string }[]> => {
  const response = await apiClient.get("/sni/api/v1/resource-groups/search/basic", { params: { query } });
  return normalizeSearchResults(response.data);
};

type ResourceComboboxProps = {
  value: string;
  onChange: (code: string) => void;
  searchFn: (query: string) => Promise<{ code: string; name: string }[]>;
  queryKeyPrefix: string;
  placeholder: string;
  disabled?: boolean;
};

const ResourceCombobox: React.FC<ResourceComboboxProps> = ({
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

  useEffect(() => {
    setInputText(value);
    setDebouncedQuery(value);
  }, [value]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(inputText.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [inputText]);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const { data: suggestions = [], isFetching } = useQuery({
    queryKey: [queryKeyPrefix, debouncedQuery],
    queryFn: () => searchFn(debouncedQuery),
    enabled: open && !disabled,
    staleTime: 30_000,
  });

  const handleSelect = (item: { code: string; name: string }) => {
    onChange(item.code);
    setInputText(item.code);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={inputText}
          onChange={(event) => {
            setInputText(event.target.value);
            setOpen(true);
          }}
          onFocus={() => !disabled && setOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-20 text-sm outline-none transition focus:border-primary-500 focus:ring-4 focus:ring-primary-50 disabled:bg-gray-50 disabled:text-gray-400"
        />
        <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
          {isFetching && <Loader2 size={14} className="animate-spin text-gray-400" />}
          {value && !disabled && (
            <button
              type="button"
              onClick={() => {
                onChange("");
                setInputText("");
                setDebouncedQuery("");
                setOpen(false);
              }}
              className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              aria-label="Effacer"
            >
              <X size={14} />
            </button>
          )}
          <button
            type="button"
            onClick={() => !disabled && setOpen((current) => !current)}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:cursor-not-allowed"
            disabled={disabled}
            aria-label="Afficher les résultats"
          >
            <ChevronDown size={16} className={open ? "rotate-180 transition-transform" : "transition-transform"} />
          </button>
        </div>
      </div>

      {open && !disabled && (
        <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-xl border border-gray-100 bg-white shadow-xl shadow-gray-200/70">
          <div className="max-h-60 overflow-y-auto py-1">
            {isFetching && suggestions.length === 0 && (
              <div className="flex items-center gap-2 px-4 py-3 text-sm text-gray-400">
                <Loader2 size={14} className="animate-spin" /> Recherche...
              </div>
            )}

            {!isFetching && suggestions.length === 0 && (
              <div className="px-4 py-3 text-sm text-gray-400">
                {inputText ? "Aucun résultat" : "Tapez pour rechercher"}
              </div>
            )}

            {suggestions.map((item) => (
              <button
                key={item.code}
                type="button"
                onMouseDown={(event) => {
                  event.preventDefault();
                  handleSelect(item);
                }}
                className={`block w-full px-4 py-3 text-left text-sm transition hover:bg-primary-50 ${
                  item.code === value ? "bg-primary-50 text-primary-700" : "text-gray-700"
                }`}
              >
                <span className="font-medium">{item.name}</span>
                <span className="ml-2 font-mono text-xs text-gray-400">{item.code}</span>
              </button>
            ))}

            {inputText && !suggestions.some((item) => item.code === inputText) && (
              <button
                type="button"
                onMouseDown={(event) => {
                  event.preventDefault();
                  onChange(inputText.trim());
                  setOpen(false);
                }}
                className="block w-full border-t border-gray-100 px-4 py-3 text-left text-sm font-medium text-primary-600 transition hover:bg-primary-50"
              >
                Utiliser “{inputText}” directement
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

type EntitlementDefinitionFieldsProps = {
  formData: EntitlementFormData;
  onChange: (next: EntitlementFormData) => void;
  disabled?: boolean;
};

export const EntitlementDefinitionFields: React.FC<EntitlementDefinitionFieldsProps> = ({
  formData,
  onChange,
  disabled = false,
}) => {
  const update = <K extends keyof EntitlementFormData>(key: K, value: EntitlementFormData[K]) => {
    onChange({ ...formData, [key]: value });
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-white p-6 shadow-sm shadow-gray-200/70 ring-1 ring-gray-100">
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-gray-900">Informations générales</h2>
          <p className="mt-1 text-sm text-gray-500">Nom, description et typologie du droit.</p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Nom du droit *</label>
            <input
              value={formData.name}
              onChange={(event) => update("name", event.target.value)}
              required
              disabled={disabled}
              className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-primary-500 focus:ring-4 focus:ring-primary-50 disabled:bg-gray-50"
              placeholder="Ex: Accès coworking mensuel"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Type *</label>
            <select
              value={formData.entitlementType}
              onChange={(event) => update("entitlementType", event.target.value as EntitlementFormData["entitlementType"])}
              disabled={disabled}
              className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-primary-500 focus:ring-4 focus:ring-primary-50 disabled:bg-gray-50"
            >
              {entitlementTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Unité *</label>
            <select
              value={formData.unit}
              onChange={(event) => update("unit", event.target.value as EntitlementFormData["unit"])}
              disabled={disabled}
              className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-primary-500 focus:ring-4 focus:ring-primary-50 disabled:bg-gray-50"
            >
              {units.map((unit) => (
                <option key={unit.value} value={unit.value}>
                  {unit.label}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Description</label>
            <textarea
              value={formData.description}
              onChange={(event) => update("description", event.target.value)}
              disabled={disabled}
              rows={4}
              className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-primary-500 focus:ring-4 focus:ring-primary-50 disabled:bg-gray-50"
              placeholder="Décrivez clairement ce que ce droit autorise ou consomme."
            />
          </div>
        </div>
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm shadow-gray-200/70 ring-1 ring-gray-100">
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-gray-900">Règles de consommation</h2>
          <p className="mt-1 text-sm text-gray-500">Définissez comment le droit est vérifié, réservé, consommé et réinitialisé.</p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Mode de consommation *</label>
            <select
              value={formData.consumptionMode}
              onChange={(event) => update("consumptionMode", event.target.value as EntitlementFormData["consumptionMode"])}
              disabled={disabled}
              className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-primary-500 focus:ring-4 focus:ring-primary-50 disabled:bg-gray-50"
            >
              {consumptionModes.map((mode) => (
                <option key={mode.value} value={mode.value}>
                  {mode.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Politique de reset *</label>
            <select
              value={formData.resetPolicy}
              onChange={(event) => update("resetPolicy", event.target.value as EntitlementFormData["resetPolicy"])}
              disabled={disabled}
              className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-primary-500 focus:ring-4 focus:ring-primary-50 disabled:bg-gray-50"
            >
              {resetPolicies.map((policy) => (
                <option key={policy.value} value={policy.value}>
                  {policy.label}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50/70 p-4">
            <input
              type="checkbox"
              checked={formData.stackable}
              onChange={(event) => update("stackable", event.target.checked)}
              disabled={disabled}
              className="mt-1 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span>
              <span className="block text-sm font-medium text-gray-800">Cumulable</span>
              <span className="mt-0.5 block text-xs text-gray-500">Les quantités peuvent s’additionner sur plusieurs sources.</span>
            </span>
          </label>

          <label className="flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50/70 p-4">
            <input
              type="checkbox"
              checked={formData.transferable}
              onChange={(event) => update("transferable", event.target.checked)}
              disabled={disabled}
              className="mt-1 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span>
              <span className="block text-sm font-medium text-gray-800">Transférable</span>
              <span className="mt-0.5 block text-xs text-gray-500">Le droit peut être transféré ou partagé selon les règles métier.</span>
            </span>
          </label>
        </div>
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm shadow-gray-200/70 ring-1 ring-gray-100">
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-gray-900">Ressources liées</h2>
          <p className="mt-1 text-sm text-gray-500">Associez le droit à un type ou à un groupe de ressources si nécessaire.</p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Type de ressource</label>
            <ResourceCombobox
              value={formData.resourceTypeCode}
              onChange={(value) => update("resourceTypeCode", value)}
              searchFn={searchResourceTypes}
              queryKeyPrefix="resource-types-basic-search"
              placeholder="Rechercher un type de ressource"
              disabled={disabled}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Groupe de ressources</label>
            <ResourceCombobox
              value={formData.resourceGroupCode}
              onChange={(value) => update("resourceGroupCode", value)}
              searchFn={searchResourceGroups}
              queryKeyPrefix="resource-groups-basic-search"
              placeholder="Rechercher un groupe"
              disabled={disabled}
            />
          </div>
        </div>
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm shadow-gray-200/70 ring-1 ring-gray-100">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Paramètres avancés</h2>
            <p className="mt-1 text-sm text-gray-500">Statut et métadonnées JSON optionnelles.</p>
          </div>
          <label className="inline-flex items-center gap-2 rounded-full bg-gray-50 px-3 py-2 text-sm text-gray-700 ring-1 ring-gray-100">
            <input
              type="checkbox"
              checked={formData.active}
              onChange={(event) => update("active", event.target.checked)}
              disabled={disabled}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            Actif
          </label>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Métadonnées JSON</label>
          <textarea
            value={formData.metadataJson}
            onChange={(event) => update("metadataJson", event.target.value)}
            disabled={disabled}
            rows={6}
            className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 font-mono text-sm outline-none transition focus:border-primary-500 focus:ring-4 focus:ring-primary-50 disabled:bg-gray-50"
            placeholder='{"scope":"premium", "displayOrder": 1}'
          />
        </div>
      </section>
    </div>
  );
};

export const DetailValue: React.FC<{ label: string; value?: React.ReactNode }> = ({ label, value }) => (
  <div className="rounded-xl bg-gray-50/80 px-4 py-3 ring-1 ring-gray-100">
    <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</p>
    <div className="mt-1 text-sm font-medium text-gray-900">{value || "—"}</div>
  </div>
);
