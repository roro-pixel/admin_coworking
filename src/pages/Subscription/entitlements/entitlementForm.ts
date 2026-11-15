/*
 * Options, formulaire et recherches de ressources des définitions de droits.
 * Aucun composant ici (règle react-refresh).
 */
import { apiClient } from "../../../services/api";
import type { EntitlementDefinition } from "../../../services/subscription.service";

export const ENTITLEMENT_TYPE_OPTIONS = [
  { value: "ACCESS", label: "Accès" },
  { value: "CREDIT", label: "Crédit" },
  { value: "TIME", label: "Temps" },
  { value: "DISCOUNT", label: "Réduction" },
  { value: "QUOTA", label: "Quota" },
  { value: "FEATURE_FLAG", label: "Fonctionnalité" },
  { value: "SERVICE_ALLOWANCE", label: "Forfait service" },
] as const;

export const UNIT_OPTIONS = [
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

export const CONSUMPTION_MODE_OPTIONS = [
  { value: "CHECK_ONLY", label: "Vérification uniquement" },
  { value: "RESERVABLE", label: "Réservable" },
  { value: "CONSUMABLE", label: "Consommable" },
  { value: "RESERVE_THEN_CONSUME", label: "Réservation puis consommation" },
] as const;

export const RESET_POLICY_OPTIONS = [
  { value: "NEVER", label: "Jamais" },
  { value: "DAILY", label: "Quotidien" },
  { value: "WEEKLY", label: "Hebdomadaire" },
  { value: "MONTHLY", label: "Mensuel" },
  { value: "PER_BILLING_CYCLE", label: "Par cycle de facturation" },
] as const;

const toMap = (items: readonly { value: string; label: string }[]) =>
  Object.fromEntries(items.map((i) => [i.value, i.label])) as Record<string, string>;

export const TYPE_LABEL = toMap(ENTITLEMENT_TYPE_OPTIONS);
export const UNIT_LABEL = toMap(UNIT_OPTIONS);
export const MODE_LABEL = toMap(CONSUMPTION_MODE_OPTIONS);
export const RESET_LABEL = toMap(RESET_POLICY_OPTIONS);

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

export const buildDefaultEntitlementFormData = (
  def?: EntitlementDefinition | null,
): EntitlementFormData => ({
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

export type ResourceOption = { code: string; name: string };

const normalizeSearchResults = (raw: any): ResourceOption[] => {
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.content)) return raw.content;
  if (Array.isArray(raw?.data)) return raw.data;
  return [];
};

export const searchResourceTypes = async (query: string): Promise<ResourceOption[]> => {
  const response = await apiClient.get("/sni/api/v1/resource-types/search/basic", { params: { query } });
  return normalizeSearchResults(response.data);
};

export const searchResourceGroups = async (query: string): Promise<ResourceOption[]> => {
  const response = await apiClient.get("/sni/api/v1/resource-groups/search/basic", { params: { query } });
  return normalizeSearchResults(response.data);
};
