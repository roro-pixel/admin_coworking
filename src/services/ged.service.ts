import { apiClient } from "./api";
import type { DocumentResponse, DocumentFolderTreeNode, DocumentBulkActionResponse, KycCaseResponse, PaginatedResponse } from "./document.service";

/**
 * Explorateur GED (/ged/**), espaces documentaires (/spaces/**) et centre KYC.
 * Toutes les routes viennent des fiches GedExplorerController, DocumentSpaceController,
 * KycCenterController et KycController.
 */
const API = "/sni/api/v1";
const enc = encodeURIComponent;

/** Les paramètres tableau partent en clés répétées (?a=1&a=2), comme Spring les lit. */
const REPEAT = { paramsSerializer: { indexes: null } };

const newIdemKey = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `idem-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const idem = () => ({ "Idempotency-Key": newIdemKey() });

const toList = <T>(raw: any): T[] => (Array.isArray(raw) ? raw : Array.isArray(raw?.content) ? raw.content : Array.isArray(raw?.data) ? raw.data : []);

// ==================== Types explorateur ====================
export type GedAccessLevel = "NONE" | "READ" | "DOWNLOAD" | "EDIT" | "DELETE" | "ADMIN";

export interface GedLock {
  lockedBy?: string;
  lockedAt?: string;
  expiresAt?: string;
  mine?: boolean;
}

export interface GedItem {
  kind?: "FOLDER" | "FILE" | string;
  code: string;
  name: string;
  folderCode?: string;
  createdAt?: string;
  updatedAt?: string;
  childrenCount?: number;
  documentsCount?: number;
  color?: string;
  icon?: string;
  fileName?: string;
  extension?: string;
  mimeType?: string;
  size?: number;
  status?: string;
  documentTypeCode?: string;
  documentTypeName?: string;
  ownerType?: string;
  version?: number;
  protectedItem?: boolean;
  previewUrl?: string;
  downloadUrl?: string;
  restricted?: boolean;
  lock?: GedLock;
  held?: boolean;
  destructionDueAt?: string;
}

export interface GedFolderRef {
  code: string;
  name: string;
  parentCode?: string;
}

export interface GedBreadcrumb {
  code: string;
  name: string;
  depth?: number;
}

export interface GedAccessSummary {
  level?: GedAccessLevel;
  canDownload?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  canManage?: boolean;
}

export interface GedListing {
  folder?: GedFolderRef;
  breadcrumb?: GedBreadcrumb[];
  items: GedItem[];
  page?: { page?: number; size?: number; totalElements?: number; totalPages?: number; folderCount?: number; fileCount?: number };
  access?: GedAccessSummary;
}

export interface GedSearchHit {
  item: GedItem;
  snippet?: string;
  rank?: number;
  location?: string;
}

export interface GedSearchResult {
  query?: string;
  folderCode?: string;
  hits: GedSearchHit[];
  page?: number;
  size?: number;
  totalElements?: number;
  totalPages?: number;
}

export interface GedUploadResult {
  uploaded: GedItem[];
  failed: { fileName?: string; message?: string }[];
}

export interface GedGrant {
  granteeType: string;
  grantee: string;
  granteeLabel?: string;
  level: GedAccessLevel;
  grantedAt?: string;
  grantedBy?: string;
}

export interface GedGrantRequest {
  granteeType: string;
  grantee: string;
  level: GedAccessLevel;
}

export interface GedFolderAccess {
  folderCode?: string;
  restricted?: boolean;
  restrictedAt?: string;
  restrictedBy?: string;
  systemFolder?: boolean;
  inheritedFrom?: GedFolderRef[];
  grants?: GedGrant[];
  myLevel?: GedAccessLevel;
  canManage?: boolean;
}

export interface GedUsage {
  folderCode?: string;
  folderName?: string;
  usedBytes?: number;
  files?: number;
  quotaBytes?: number;
  remainingBytes?: number;
  limitingFolderCode?: string;
  totalUsedBytes?: number;
  totalQuotaBytes?: number;
}

export interface GedHold {
  code: string;
  targetType?: string;
  targetCode?: string;
  targetName?: string;
  reason?: string;
  reference?: string;
  placedBy?: string;
  placedAt?: string;
  releasedBy?: string;
  releasedAt?: string;
  releaseReason?: string;
  active?: boolean;
}

export interface GedHoldRequest {
  targetType: string;
  targetCode: string;
  reason: string;
  reference?: string;
}

export interface GedTrashBatch {
  batch: string;
  trashedAt?: string;
  trashedBy?: number;
  folders?: number;
  documents?: number;
  items?: GedItem[];
}

export interface GedTrashResult {
  batch?: string;
  folders?: number;
  documents?: number;
}

export interface GedPurgeResult {
  batches?: number;
  folders?: number;
  documents?: number;
  filesErased?: number;
  heldSkipped?: number;
  failed?: number;
}

export interface GedDestructionCandidate {
  item: GedItem;
  policyCode?: string;
  dueAt?: string;
  location?: string;
}

export interface GedFileText {
  code?: string;
  status?: string;
  method?: string;
  pageCount?: number;
  ocrPages?: number;
  length?: number;
  truncated?: boolean;
  extractedAt?: string;
  error?: string;
  upToDate?: boolean;
  content?: string;
}

export interface GedTextStatus {
  pending?: number;
  byStatus?: Record<string, number>;
}

export interface GedTextRunResult {
  processed?: number;
  done?: number;
  empty?: number;
  unsupported?: number;
  failed?: number;
  remaining?: number;
}

export interface GedFilingResult {
  filed?: number;
  skipped?: number;
  remaining?: number;
}

export interface GedUploadOptions {
  folderCode?: string;
  /** Un chemin relatif par fichier (dépôt d'un dossier), dans le même ordre que les fichiers */
  relativePaths?: string[];
  documentTypeCode?: string;
  ownerType?: string;
  ownerCode?: string;
}

export interface GedScanOptions {
  folderCode?: string;
  title?: string;
  documentTypeCode?: string;
  ownerType?: string;
  ownerCode?: string;
}

// ==================== Types espaces ====================
export type SpaceKey = "administrative" | "assets" | "contracts" | "financial" | "general";

export interface SpaceDashboard {
  space?: string;
  total?: number;
  byStatus?: Record<string, number>;
  byCategory?: Record<string, number>;
  pendingReviewOlderThan48h?: number;
  needsCorrectionCount?: number;
  expiringIn30Days?: number;
  rejectionRate30d?: number;
  avgReviewTimeHours?: number;
  topTags?: { tagCode?: string; tagLabel?: string; count?: number }[];
}

export interface SpaceListParams {
  ownerType?: string;
  ownerCode?: string;
  statuses?: string[];
  q?: string;
  /** Espace financier seulement */
  uploadedAfter?: string;
  uploadedBefore?: string;
  page?: number;
  size?: number;
  sort?: string;
}

export interface SpaceUploadRequest {
  ownerType: string;
  ownerCode: string;
  documentTypeCode: string;
  title: string;
  description?: string;
  documentNumber?: string;
  issueDate?: string;
  expiryDate?: string;
  referenceCode?: string;
  folderCode?: string;
  tagCodes?: string[];
  metadata?: Record<string, string>;
}

// ==================== Types KYC ====================
export interface KycCaseRef {
  code: string;
  status?: string;
  ownerType?: string;
  ownerId?: string;
  since?: string;
  detail?: string;
}

export interface KycCenterDashboard {
  from?: string;
  to?: string;
  byStatus?: Record<string, number>;
  waitingReview?: { underTwoDays?: number; twoToSevenDays?: number; overSevenDays?: number };
  averageProcessingHours?: number;
  medianProcessingHours?: number;
  decidedInPeriod?: number;
  overdue?: KycCaseRef[];
  agents?: { userId?: string; name?: string; assignedOpen?: number; decidedInPeriod?: number }[];
  blocked?: KycCaseRef[];
  duplicateGroups?: number;
}

export interface KycDuplicateGroup {
  documentType?: string;
  normalizedNumber?: string;
  pieces: {
    kycDocumentId?: string;
    kycCaseCode?: string;
    ownerType?: string;
    ownerId?: string;
    documentNumber?: string;
    status?: string;
  }[];
}

export interface KycRenewalItem {
  kycDocumentId: string;
  kycCaseCode?: string;
  documentType?: string;
  documentNumber?: string;
  ownerType?: string;
  ownerId?: string;
  expiryDate?: string;
  daysLeft?: number;
  lastRemindedAt?: string;
}

export interface KycRenewalWeek {
  weekStart: string;
  items: KycRenewalItem[];
}

export interface KycReason {
  code: string;
  label: string;
  kind?: string;
  requiresText?: boolean;
  active?: boolean;
  sortOrder?: number;
  systemReason?: boolean;
}

export type KycReasonRequest = Partial<Omit<KycReason, "systemReason">>;

export interface KycCrossCheck {
  ruleCode?: string;
  ruleName?: string;
  ruleType?: string;
  blocking?: boolean;
  outcome?: "PASSED" | "FAILED" | "SKIPPED" | string;
  documentType?: string;
  detail?: string;
}

export interface DocumentAccessLog {
  id?: string;
  documentCode?: string;
  userId?: string;
  action?: string;
  accessedAt?: string;
  ipAddress?: string;
  userAgent?: string;
}

const pageParams = (p?: { page?: number; size?: number; sort?: string }) => ({ page: p?.page, size: p?.size, sort: p?.sort });

const normalizePage = <T>(raw: any): PaginatedResponse<T> => {
  if (Array.isArray(raw?.content)) return raw;
  if (Array.isArray(raw?.data)) {
    return {
      content: raw.data,
      totalElements: raw.pageable?.totalElements ?? raw.data.length,
      totalPages: raw.pageable?.totalPages ?? 1,
      size: raw.pageable?.size,
      number: raw.pageable?.page,
    };
  }
  return { content: [], totalElements: 0, totalPages: 0 };
};

export const gedService = {
  // ---------- Arborescence et listes ----------
  tree: async (): Promise<DocumentFolderTreeNode[]> => toList<DocumentFolderTreeNode>((await apiClient.get(`${API}/ged/tree`)).data),

  items: async (p: { folderCode?: string; search?: string; sort?: string; direction?: "asc" | "desc"; page?: number; size?: number }): Promise<GedListing> => {
    const d = (await apiClient.get(`${API}/ged/items`, { params: p })).data;
    return { ...d, items: Array.isArray(d?.items) ? d.items : [] };
  },

  search: async (p: { q: string; folderCode?: string; page?: number; size?: number }): Promise<GedSearchResult> => {
    const d = (await apiClient.get(`${API}/ged/search`, { params: p })).data;
    return { ...d, hits: Array.isArray(d?.hits) ? d.hits : [] };
  },

  // ---------- Dossiers et fichiers ----------
  createFolder: async (data: { name: string; parentCode?: string; description?: string; color?: string; icon?: string }): Promise<GedItem> =>
    (await apiClient.post(`${API}/ged/folders`, data)).data,

  renameFolder: async (code: string, name: string): Promise<GedItem> => (await apiClient.patch(`${API}/ged/folders/${enc(code)}`, { name })).data,

  renameFile: async (code: string, name: string): Promise<GedItem> => (await apiClient.patch(`${API}/ged/files/${enc(code)}`, { name })).data,

  move: async (data: { documentCodes?: string[]; folderCodes?: string[]; targetFolderCode?: string }): Promise<void> => {
    await apiClient.post(`${API}/ged/move`, data);
  },

  copy: async (data: { documentCodes?: string[]; targetFolderCode?: string }): Promise<GedUploadResult> => (await apiClient.post(`${API}/ged/copy`, data)).data,

  lock: async (code: string, hours?: number): Promise<GedItem> => (await apiClient.post(`${API}/ged/files/${enc(code)}/lock`, null, { params: { hours } })).data,

  unlock: async (code: string): Promise<GedItem> => (await apiClient.post(`${API}/ged/files/${enc(code)}/unlock`)).data,

  // ---------- Dépôt ----------
  /** Une requête = 10 Mo au plus : le découpage en lots est fait par l'appelant (voir chunkFiles). */
  upload: async (files: File[], o: GedUploadOptions = {}): Promise<GedUploadResult> => {
    const fd = new FormData();
    files.forEach((f) => fd.append("files", f));
    const d = (
      await apiClient.post(`${API}/ged/files`, fd, {
        ...REPEAT,
        headers: { "Content-Type": "multipart/form-data" },
        params: { folderCode: o.folderCode, relativePaths: o.relativePaths, documentTypeCode: o.documentTypeCode, ownerType: o.ownerType, ownerCode: o.ownerCode },
      })
    ).data;
    return { uploaded: Array.isArray(d?.uploaded) ? d.uploaded : [], failed: Array.isArray(d?.failed) ? d.failed : [] };
  },

  /** Plusieurs photos de pages assemblées en un seul document. */
  scan: async (pages: File[], o: GedScanOptions = {}): Promise<GedItem> => {
    const fd = new FormData();
    pages.forEach((f) => fd.append("pages", f));
    return (
      await apiClient.post(`${API}/ged/scans`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
        params: { folderCode: o.folderCode, title: o.title, documentTypeCode: o.documentTypeCode, ownerType: o.ownerType, ownerCode: o.ownerCode },
      })
    ).data;
  },

  // ---------- Corbeille ----------
  trashContent: async (): Promise<GedTrashBatch[]> => toList<GedTrashBatch>((await apiClient.get(`${API}/ged/trash`)).data),

  trash: async (data: { documentCodes?: string[]; folderCodes?: string[] }): Promise<GedTrashResult> => (await apiClient.post(`${API}/ged/trash`, data)).data,

  restoreBatch: async (batch: string): Promise<GedTrashResult> => (await apiClient.post(`${API}/ged/trash/${enc(batch)}/restore`)).data,

  purgeBatch: async (batch: string, reason: string): Promise<GedPurgeResult> => (await apiClient.post(`${API}/ged/trash/${enc(batch)}/purge`, { reason })).data,

  emptyTrash: async (reason: string, olderThanDays = 0): Promise<GedPurgeResult> => (await apiClient.post(`${API}/ged/trash/empty`, { reason }, { params: { olderThanDays } })).data,

  // ---------- Accès restreint ----------
  folderAccess: async (code: string): Promise<GedFolderAccess> => (await apiClient.get(`${API}/ged/folders/${enc(code)}/access`)).data,

  restrict: async (code: string, grants?: GedGrantRequest[]): Promise<GedFolderAccess> =>
    (await apiClient.post(`${API}/ged/folders/${enc(code)}/restrict`, grants && grants.length ? { grants } : undefined)).data,

  unrestrict: async (code: string): Promise<GedFolderAccess> => (await apiClient.post(`${API}/ged/folders/${enc(code)}/unrestrict`)).data,

  grant: async (code: string, data: GedGrantRequest): Promise<GedFolderAccess> => (await apiClient.put(`${API}/ged/folders/${enc(code)}/grants`, data)).data,

  revoke: async (code: string, granteeType: string, grantee: string): Promise<GedFolderAccess> =>
    (await apiClient.delete(`${API}/ged/folders/${enc(code)}/grants`, { params: { granteeType, grantee } })).data,

  // ---------- Quotas ----------
  usage: async (folderCode?: string): Promise<GedUsage> => (await apiClient.get(`${API}/ged/usage`, { params: { folderCode } })).data,

  setQuota: async (code: string, quotaBytes: number | null): Promise<GedUsage> => (await apiClient.put(`${API}/ged/folders/${enc(code)}/quota`, { quotaBytes })).data,

  // ---------- Gel juridique ----------
  holds: async (active = true): Promise<GedHold[]> => toList<GedHold>((await apiClient.get(`${API}/ged/holds`, { params: { active } })).data),

  placeHold: async (data: GedHoldRequest): Promise<GedHold> => (await apiClient.post(`${API}/ged/holds`, data)).data,

  releaseHold: async (code: string, reason: string): Promise<GedHold> => (await apiClient.post(`${API}/ged/holds/${enc(code)}/release`, { reason })).data,

  // ---------- Conservation et destruction ----------
  retentionDue: async (limit = 200): Promise<GedDestructionCandidate[]> => toList<GedDestructionCandidate>((await apiClient.get(`${API}/ged/retention/due`, { params: { limit } })).data),

  retentionDestroy: async (documentCodes: string[], reason: string): Promise<GedPurgeResult> => (await apiClient.post(`${API}/ged/retention/destroy`, { documentCodes, reason })).data,

  retentionKeep: async (documentCodes: string[], reason: string): Promise<Record<string, number>> => (await apiClient.post(`${API}/ged/retention/keep`, { documentCodes, reason })).data,

  retentionRun: async (): Promise<Record<string, number>> => (await apiClient.post(`${API}/ged/retention/run`)).data,

  // ---------- Texte intégral et classement ----------
  fileText: async (code: string): Promise<GedFileText> => (await apiClient.get(`${API}/ged/files/${enc(code)}/text`)).data,

  refreshText: async (code: string): Promise<GedFileText> => (await apiClient.post(`${API}/ged/files/${enc(code)}/text/refresh`)).data,

  textStatus: async (): Promise<GedTextStatus> => (await apiClient.get(`${API}/ged/text/status`)).data,

  runText: async (limit = 20): Promise<GedTextRunResult> => (await apiClient.post(`${API}/ged/text/run`, null, { params: { limit } })).data,

  runFiling: async (limit = 1000): Promise<GedFilingResult> => (await apiClient.post(`${API}/ged/filing/run`, null, { params: { limit } })).data,

  // ---------- Espaces documentaires ----------
  spaceDashboard: async (space: SpaceKey): Promise<SpaceDashboard> => (await apiClient.get(`${API}/spaces/${space}/dashboard`)).data,

  spaceDocuments: async (space: SpaceKey, p: SpaceListParams = {}): Promise<PaginatedResponse<DocumentResponse>> =>
    normalizePage<DocumentResponse>(
      (
        await apiClient.get(`${API}/spaces/${space}/documents`, {
          ...REPEAT,
          params: {
            ownerType: p.ownerType,
            ownerCode: p.ownerCode,
            statuses: p.statuses,
            q: p.q,
            uploadedAfter: space === "financial" ? p.uploadedAfter : undefined,
            uploadedBefore: space === "financial" ? p.uploadedBefore : undefined,
            ...pageParams(p),
          },
        })
      ).data,
    ),

  spaceUpload: async (space: SpaceKey, file: File, r: SpaceUploadRequest): Promise<DocumentResponse> => {
    const fd = new FormData();
    fd.append("file", file);
    (["ownerType", "ownerCode", "documentTypeCode", "title", "description", "documentNumber", "issueDate", "expiryDate", "referenceCode", "folderCode"] as const).forEach((k) => {
      const v = r[k];
      if (v !== undefined && v !== "") fd.append(k, String(v));
    });
    r.tagCodes?.forEach((t) => fd.append("tagCodes", t));
    Object.entries(r.metadata ?? {}).forEach(([k, v]) => fd.append(`metadata[${k}]`, v));
    return (await apiClient.post(`${API}/spaces/${space}/documents/upload`, fd, { headers: { ...idem(), "Content-Type": "multipart/form-data" } })).data;
  },

  // ---------- Documents : routes complémentaires ----------
  documentPreviewToken: async (code: string): Promise<Record<string, unknown>> => (await apiClient.get(`${API}/documents/${enc(code)}/preview-token`)).data,

  /** Aperçu public signé : jeton court obtenu par documentPreviewToken, utilisable dans un cadre (X-Frame-Options étant DENY côté fichier brut). */
  signedPreviewBlob: async (code: string, token: string): Promise<Blob> => (await apiClient.get(`${API}/documents/${enc(code)}/signed-preview`, { params: { token }, responseType: "blob" })).data,

  accessLogsByUser: async (userId: string | number, p?: { page?: number; size?: number }): Promise<PaginatedResponse<DocumentAccessLog>> =>
    normalizePage<DocumentAccessLog>((await apiClient.get(`${API}/documents/access-logs/by-user`, { params: { userId, ...pageParams(p) } })).data),

  shareFile: async (token: string, password?: string): Promise<Blob> =>
    (await apiClient.get(`${API}/shares/${enc(token)}/file`, { responseType: "blob", headers: password ? { "X-Share-Password": password } : undefined })).data,

  activateRetentionPolicy: async (code: string): Promise<unknown> => (await apiClient.patch(`${API}/document-retention-policies/${enc(code)}/activate`)).data,

  // ---------- KYC : actions de dossier ----------
  kycCrossChecks: async (code: string): Promise<KycCrossCheck[]> => toList<KycCrossCheck>((await apiClient.get(`${API}/kyc/cases/${enc(code)}/cross-checks`)).data),

  kycChangeLevel: async (code: string, level: number, reason?: string): Promise<KycCaseResponse> => (await apiClient.patch(`${API}/kyc/cases/${enc(code)}/level`, { level, reason })).data,

  kycReopen: async (code: string, comment?: string): Promise<KycCaseResponse> => (await apiClient.post(`${API}/kyc/cases/${enc(code)}/reopen`, comment ? { comment } : undefined)).data,

  kycRejectFinal: async (code: string, data: { comment?: string; reasonCode?: string }): Promise<KycCaseResponse> =>
    (await apiClient.post(`${API}/kyc/cases/${enc(code)}/reject-final`, data, { headers: idem() })).data,

  kycBackfill: async (apply = false): Promise<Record<string, number>> => (await apiClient.post(`${API}/kyc/cases/backfill`, null, { params: { apply } })).data,

  // ---------- KYC : centre ----------
  kycCenterDashboard: async (from?: string, to?: string): Promise<KycCenterDashboard> => (await apiClient.get(`${API}/kyc/dashboard/center`, { params: { from, to } })).data,

  kycDuplicates: async (): Promise<KycDuplicateGroup[]> => toList<KycDuplicateGroup>((await apiClient.get(`${API}/kyc/duplicates`)).data),

  kycRenewals: async (days = 90): Promise<KycRenewalWeek[]> => toList<KycRenewalWeek>((await apiClient.get(`${API}/kyc/renewals`, { params: { days } })).data),

  kycRemind: async (data: { days?: number; kycDocumentIds?: string[] }): Promise<{ reminded?: number; skippedRecentlyReminded?: number }> =>
    (await apiClient.post(`${API}/kyc/renewals/remind`, data)).data,

  kycReasons: async (kind?: string, activeOnly = true): Promise<KycReason[]> => toList<KycReason>((await apiClient.get(`${API}/kyc/reasons`, { params: { kind, activeOnly } })).data),

  kycCreateReason: async (data: KycReasonRequest): Promise<KycReason> => (await apiClient.post(`${API}/kyc/reasons`, data)).data,

  kycUpdateReason: async (code: string, data: KycReasonRequest): Promise<KycReason> => (await apiClient.put(`${API}/kyc/reasons/${enc(code)}`, data)).data,

  kycDeleteReason: async (code: string): Promise<void> => {
    await apiClient.delete(`${API}/kyc/reasons/${enc(code)}`);
  },
};

/** Découpe une liste de fichiers en lots de 10 Mo au plus (limite d'une requête multipart). */
export const MAX_REQUEST_BYTES = 10 * 1024 * 1024;

export function chunkFiles<T extends { file: File }>(entries: T[], max = MAX_REQUEST_BYTES - 256 * 1024): T[][] {
  const batches: T[][] = [];
  let current: T[] = [];
  let size = 0;
  for (const e of entries) {
    if (current.length > 0 && size + e.file.size > max) {
      batches.push(current);
      current = [];
      size = 0;
    }
    current.push(e);
    size += e.file.size;
  }
  if (current.length > 0) batches.push(current);
  return batches;
}

export type { DocumentBulkActionResponse };
