import { apiClient } from "./api";
import { API } from "./pagination";

// Pass · identifiants, validation, usage, transfert
// Personnel, borne ou API de contrôle d'accès (utilisateur authentifié).
// La gestion du catalogue de pass et des pass eux-mêmes reste dans
// subscription.service.ts.

export type PassCredentialType =
  | "QR_CODE"
  | "BARCODE"
  | "NFC_TAG"
  | "ACCESS_CODE";

export type PassUsageType =
  | "CHECK_IN"
  | "BOOKING"
  | "SERVICE"
  | "MEETING_ROOM"
  | "PRINT"
  | "OTHER";

export type PassValidationChannel = "QR_SCAN" | "MANUAL" | "KIOSK" | "API";

export type PassTransferStatus =
  | "PENDING_ACCEPTANCE"
  | "ACCEPTED"
  | "REJECTED"
  | "CANCELLED"
  | "COMPLETED";

export interface IssuedCredential {
  value: string;
  credentialType: PassCredentialType | string;
  /** Un identifiant rotatif change à chaque émission et expire. */
  rotating: boolean;
  validUntil?: string | null;
  /** Directement utilisable dans <img src>. */
  imageDataUri?: string | null;
}

/** passNumber OU credentialValue (contenu scanné) : au moins l'un des deux. */
export interface PassPresentation {
  passNumber?: string;
  credentialValue?: string;
  /** Qui présente le pass (le titulaire ou un utilisateur autorisé). */
  bearerType: string;
  bearerCode: string;
  locationCode?: string;
  resourceTypeCode?: string;
}

export interface PassValidationResult {
  valid: boolean;
  /** Dit quelle règle refuse (jour, plage horaire, lieu, ressource, etc.). */
  reason?: string | null;
  passNumber?: string;
  remainingUses?: number | null;
}

export interface PassUseRequest extends PassPresentation {
  usageType: PassUsageType;
  resourceCode?: string;
  channel: PassValidationChannel;
  validatedBy?: string;
  referenceType?: string;
  referenceCode?: string;
}

export interface PassUseResult {
  usageNumber: string;
  passNumber: string;
  remainingUses?: number | null;
}

export interface PassTransferRequest {
  toOwnerType: string;
  toOwnerCode: string;
  reason?: string;
  transferFee?: number;
}

export interface PassTransferResult {
  transferNumber: string;
  status: PassTransferStatus | string;
}

export const passAccessService = {
  // ── Identifiants ───────────────────────────────────────────────────────────

  /** L'identifiant courant, image incluse. */
  getCredential: async (
    passNumber: string,
    type: PassCredentialType = "QR_CODE",
  ): Promise<IssuedCredential> =>
    (
      await apiClient.get(
        `${API}/passes/${encodeURIComponent(passNumber)}/credentials`,
        { params: { type } },
      )
    ).data,

  /** Émet un nouvel identifiant et révoque le précédent du même type. */
  issueCredential: async (
    passNumber: string,
    params?: { type?: PassCredentialType; rotating?: boolean },
  ): Promise<IssuedCredential> =>
    (
      await apiClient.post(
        `${API}/passes/${encodeURIComponent(passNumber)}/credentials`,
        null,
        { params: { type: "QR_CODE", ...params } },
      )
    ).data,

  revokeCredentials: async (
    passNumber: string,
    reason?: string,
  ): Promise<{ revoked: number }> =>
    (
      await apiClient.delete(
        `${API}/passes/${encodeURIComponent(passNumber)}/credentials`,
        { params: { reason } },
      )
    ).data,

  // ── Valider, consommer, annuler ────────────────────────────────────────────

  /** Au scan : vert/rouge + reason. */
  validate: async (data: PassPresentation): Promise<PassValidationResult> =>
    (await apiClient.post(`${API}/passes/validate`, data)).data,

  /** À l'entrée effective, après validate. */
  use: async (data: PassUseRequest): Promise<PassUseResult> =>
    (await apiClient.post(`${API}/passes/use`, data)).data,

  reverseUsage: async (
    usageNumber: string,
    params: { reason: string; reversedBy?: string },
  ): Promise<void> => {
    await apiClient.post(
      `${API}/passes/usages/${encodeURIComponent(usageNumber)}/reverse`,
      null,
      { params },
    );
  },

  // ── Transferts ─────────────────────────────────────────────────────────────

  requestTransfer: async (
    passNumber: string,
    data: PassTransferRequest,
    requestedBy: string,
  ): Promise<PassTransferResult> =>
    (
      await apiClient.post(
        `${API}/passes/${encodeURIComponent(passNumber)}/transfers`,
        data,
        { params: { requestedBy } },
      )
    ).data,

  acceptTransfer: async (
    transferNumber: string,
    acceptedBy: string,
  ): Promise<PassTransferResult> =>
    (
      await apiClient.post(
        `${API}/passes/transfers/${encodeURIComponent(transferNumber)}/accept`,
        null,
        { params: { acceptedBy } },
      )
    ).data,

  rejectTransfer: async (
    transferNumber: string,
    reason: string,
  ): Promise<PassTransferResult> =>
    (
      await apiClient.post(
        `${API}/passes/transfers/${encodeURIComponent(transferNumber)}/reject`,
        null,
        { params: { reason } },
      )
    ).data,

  cancelTransfer: async (
    transferNumber: string,
    reason?: string,
  ): Promise<void> => {
    await apiClient.delete(
      `${API}/passes/transfers/${encodeURIComponent(transferNumber)}`,
      { params: { reason } },
    );
  },
};
