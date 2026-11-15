import { apiClient } from "./api";
import { API, toList } from "./pagination";

// Relances d'impayés
// /billing/dunning · staff ; écriture (PUT /policies, deactivate, run) : ADMIN, SUPER_ADMIN.

const BASE = `${API}/billing/dunning`;
const enc = encodeURIComponent;

export type DunningSegment = "DEFAULT" | "MEMBER" | "CUSTOMER" | "BUSINESS_ENTITY";
export type DunningTone = "SOFT" | "STANDARD" | "FIRM";
export type DunningAction =
  | "REMINDER"
  | "FORMAL_NOTICE"
  | "GRACE_PERIOD"
  | "SUSPEND"
  | "HANDOVER";
export type DunningChannel = "EMAIL" | "IN_APP" | "STAFF";
export type DunningOutcome = "SENT" | "SKIPPED" | "FAILED";

/**
 * Gabarits : {documentNumber} {balanceDue} {currency} {dueDate}
 * {daysOverdue} {customerName} {subscriptionNumber}
 */
export const DUNNING_TEMPLATE_VARIABLES = [
  "documentNumber",
  "balanceDue",
  "currency",
  "dueDate",
  "daysOverdue",
  "customerName",
  "subscriptionNumber",
] as const;

export interface DunningStepRequest {
  daysAfterDue: number;
  action: DunningAction;
  channel: DunningChannel;
  subjectTemplate?: string;
  messageTemplate?: string;
}

/** Les paliers se donnent dans l'ordre croissant des jours (409 sinon). */
export interface DunningPolicyRequest {
  policyCode: string;
  name: string;
  segment: DunningSegment;
  tone: DunningTone;
  active: boolean;
  steps: DunningStepRequest[];
}

export interface DunningPolicyView extends DunningPolicyRequest {
  [key: string]: unknown;
}

export interface DunningNoticeView {
  documentNumber: string;
  policyCode: string;
  stepOrder: number;
  action: DunningAction | string;
  customerType: string;
  customerCode: string;
  subscriptionNumber?: string | null;
  daysOverdue: number;
  balanceDue: number;
  outcome: DunningOutcome | string;
  /** SKIPPED porte la raison (« facture sans abonnement », « aucune adresse de contact »). */
  detail?: string | null;
  executedAt: string;
}

export interface DunningRunResult {
  documents: number;
  notices: number;
  failed: number;
}

export const dunningService = {
  getPolicies: async (): Promise<DunningPolicyView[]> =>
    toList<DunningPolicyView>((await apiClient.get(`${BASE}/policies`)).data),

  getPolicy: async (code: string): Promise<DunningPolicyView> =>
    (await apiClient.get(`${BASE}/policies/${enc(code)}`)).data,

  /**
   * Création ou remplacement. Une seule politique active par segment :
   * en activer une désactive l'autre.
   */
  savePolicy: async (data: DunningPolicyRequest): Promise<DunningPolicyView> =>
    (await apiClient.put(`${BASE}/policies`, data)).data,

  deactivatePolicy: async (code: string): Promise<DunningPolicyView> =>
    (await apiClient.post(`${BASE}/policies/${enc(code)}/deactivate`)).data,

  /** Les 200 dernières relances. */
  getNotices: async (): Promise<DunningNoticeView[]> =>
    toList<DunningNoticeView>((await apiClient.get(`${BASE}/notices`)).data),

  /** Chronologie des relances d'une facture. */
  getDocumentNotices: async (
    documentNumber: string,
  ): Promise<DunningNoticeView[]> =>
    toList<DunningNoticeView>(
      (await apiClient.get(`${BASE}/notices/documents/${enc(documentNumber)}`))
        .data,
    ),

  /** Chronologie des relances d'un client. */
  getCustomerNotices: async (
    customerType: string,
    customerCode: string,
  ): Promise<DunningNoticeView[]> =>
    toList<DunningNoticeView>(
      (
        await apiClient.get(
          `${BASE}/notices/customers/${enc(customerType)}/${enc(customerCode)}`,
        )
      ).data,
    ),

  /** Un passage à la main. */
  run: async (): Promise<DunningRunResult> =>
    (await apiClient.post(`${BASE}/run`)).data,
};
