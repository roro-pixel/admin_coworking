import { apiClient } from "./api";
import { API } from "./pagination";

// Paramètres de la plateforme (administration)
// Rôles ADMIN et SUPER_ADMIN + droit SYSTEM:SETTINGS. Le serveur filtre les
// domaines : 27 pour SUPER_ADMIN, 13 pour ADMIN. Toutes les valeurs voyagent
// sous forme de texte.

export type SettingType =
  | "TEXT"
  | "EMAIL"
  | "INTEGER"
  | "DECIMAL"
  | "BOOLEAN"
  | "CRON"
  | "TIME"
  | "TIME_RANGE"
  | "ENUM"
  | "SECRET";

export type SettingEffect = "LIVE" | "RESTART";

export interface SettingView {
  key: string;
  label: string;
  domain: string;
  type: SettingType;
  effect: SettingEffect;
  value: string | null;
  defaultValue: string | null;
  modified: boolean;
  editable: boolean;
  configured?: boolean | null;
  restartPending?: boolean;
  updatedBy?: string | null;
  updatedAt?: string | null;
  options?: string[] | null;
}

export interface SettingDomainView {
  domain: string;
  label: string;
  adminEditable: boolean;
  settings: number;
}

export interface SettingChange {
  oldValue: string | null;
  newValue: string | null;
  /** « <auteur> · <motif> » */
  reason: string | null;
  changedAt: string;
}

const BASE = `${API}/admin/settings`;
const key = (k: string) => encodeURIComponent(k);

export const platformSettingsService = {
  async getDomains(): Promise<SettingDomainView[]> {
    const { data } = await apiClient.get(`${BASE}/domains`);
    return Array.isArray(data) ? data : (data?.data ?? []);
  },

  async getSettings(domain?: string, q?: string): Promise<SettingView[]> {
    const params: Record<string, string> = {};
    if (domain) params.domain = domain;
    if (q) params.q = q;
    const { data } = await apiClient.get(BASE, { params: Object.keys(params).length ? params : undefined });
    return Array.isArray(data) ? data : (data?.data ?? []);
  },

  /** Un seul réglage, avec son domaine (404 : clé inconnue ; 403 : domaine réservé au super administrateur). */
  async getSetting(settingKey: string): Promise<SettingView> {
    try {
      const { data } = await apiClient.get(`${BASE}/${key(settingKey)}`);
      return data?.data ?? data;
    } catch (error) {
      // Repli : la route de liste filtrée (?q=) renvoie le même réglage, avec son domaine.
      try {
        const found = (await platformSettingsService.getSettings(undefined, settingKey)).find((x) => x.key === settingKey);
        if (found) return found;
      } catch {
        /* on garde l'erreur d'origine */
      }
      throw error;
    }
  },

  async update(settingKey: string, value: string, reason?: string): Promise<SettingView> {
    const body: { value: string; reason?: string } = { value };
    if (reason?.trim()) body.reason = reason.trim();
    const { data } = await apiClient.put(`${BASE}/${key(settingKey)}`, body);
    return data?.data ?? data;
  },

  /** Revient à la valeur du fichier de configuration. */
  async reset(settingKey: string, reason?: string): Promise<SettingView> {
    const { data } = await apiClient.delete(`${BASE}/${key(settingKey)}`, {
      params: reason?.trim() ? { reason: reason.trim() } : undefined,
    });
    return data?.data ?? data;
  },

  async getHistory(settingKey: string): Promise<SettingChange[]> {
    const { data } = await apiClient.get(`${BASE}/${key(settingKey)}/history`);
    return Array.isArray(data) ? data : (data?.data ?? []);
  },
};
