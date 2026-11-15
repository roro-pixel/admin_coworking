import { apiClient } from "./api";
import { API, toList, toPage } from "./pagination";
import type { PageParams, PageResult } from "./pagination";

// Centre de contrôle et conformité des portefeuilles (ADMIN, SUPER_ADMIN).
// Reset PIN, limites et intégrité sont dans wallet.service.ts.

const CONTROL = `${API}/wallets/control`;
const COMPLIANCE = `${API}/wallets/compliance`;

// ═══ Contrôle ═════════════════════════════════════════════════════════════════

export type WalletAdminActionType =
  | "TOPUP"
  | "DEBIT"
  | "ADJUST"
  | "REVERSE"
  | "SUSPEND"
  | "UNSUSPEND"
  | "RESET_PIN"
  | "RAISE_LIMIT"
  | "CLOSE"
  | "REVIEW_FLAG";

/** Quatre yeux : toute action est créée PENDING_APPROVAL. */
export type WalletAdminActionStatus =
  | "PENDING_APPROVAL"
  | "EXECUTED"
  | "REJECTED";

export interface WalletAdminActionRequest {
  type: WalletAdminActionType;
  amount?: number | null;
  reference?: string;
  reason: string;
  /** Fin d'une suspension / d'un relèvement de plafond. */
  until?: string | null;
}

/** Seuls type, status et walletNumber sont garantis. */
export interface AdminActionView {
  actionNumber: string;
  walletNumber: string;
  type: WalletAdminActionType | string;
  status: WalletAdminActionStatus | string;
  amount?: number | null;
  reference?: string | null;
  reason?: string | null;
  until?: string | null;
  requestedBy?: string | null;
  requestedAt?: string | null;
  decidedBy?: string | null;
  decidedAt?: string | null;
  [key: string]: unknown;
}

export type WalletFlagSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type WalletFlagStatus =
  | "OPEN"
  | "UNDER_REVIEW"
  | "CONFIRMED"
  | "DISMISSED";
export type WalletFlagType =
  | "UNUSUAL_VOLUME"
  | "RAPID_IN_OUT"
  | "STRUCTURING"
  | "MANY_COUNTERPARTIES"
  | "DORMANT_REACTIVATION"
  | "FAILED_PIN_BURST"
  | "LIMIT_BREACH_ATTEMPT"
  | "NEGATIVE_BALANCE"
  | "INTEGRITY_BREAK"
  | "REVOKED_DEVICE_USED"
  | "NEW_DEVICE_LARGE_TRANSFER"
  | "LIST_MATCH"
  | "IDENTITY_REVIEW_DUE"
  | "PHONE_CHANGED";

export interface FlagView {
  flagNumber: string;
  walletNumber: string;
  type: WalletFlagType | string;
  severity: WalletFlagSeverity | string;
  status: WalletFlagStatus | string;
  details?: string | null;
  reference?: string | null;
  detectedAt: string;
  detectedBy?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  resolution?: string | null;
}

export interface WalletControlDashboard {
  currency: string;
  totalWalletBalance: number;
  totalHeldBalance: number;
  openWallets: number;
  walletsByStatus: Record<string, number>;
  frozenWallets: number;
  lockedByOwner: number;
  dormantWallets: number;
  negativeBalances: number;
  todayVolume: Array<{
    entryType: string;
    direction: "CREDIT" | "DEBIT" | string;
    count: number;
    amount: number;
  }>;
  openFlags: number;
  pendingApprovals: number;
  latestReconciliation?: TreasuryReconciliation | null;
}

/** Snapshot de trésorerie : type ouvert. */
export interface TreasurySnapshot {
  currency?: string;
  [key: string]: unknown;
}

export interface TreasuryReconciliationRequest {
  date: string;
  currency: string;
  ledgerAccountBalance: number;
  availableCash: number;
  explanation?: string;
}

export interface TreasuryReconciliation {
  reconciliationNumber?: string;
  date?: string;
  currency?: string;
  ledgerAccountBalance?: number;
  availableCash?: number;
  explanation?: string | null;
  [key: string]: unknown;
}

// ═══ Conformité ═══════════════════════════════════════════════════════════════

export type ComplianceCaseStatus =
  | "OPEN"
  | "IN_REVIEW"
  | "ESCALATED"
  | "CLOSED_CLEARED"
  | "CLOSED_CONFIRMED"
  | "CLOSED_REPORTED";
export type CompliancePriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type ComplianceDecision = "CLEARED" | "CONFIRMED" | "REPORTED";
export type ComplianceCaseScope = "open" | "mine" | "all";

export interface CaseView {
  caseNumber: string;
  subjectType: string;
  subjectCode: string;
  walletNumber?: string | null;
  title: string;
  triggeredByFlags?: string[] | string | null;
  status: ComplianceCaseStatus | string;
  priority: CompliancePriority | string;
  assignedTo?: string | null;
  assignedAt?: string | null;
  dueAt?: string | null;
  overdue: boolean;
  findings?: string | null;
  decision?: ComplianceDecision | string | null;
  decisionRationale?: string | null;
  decidedBy?: string | null;
  decidedAt?: string | null;
  escalatedTo?: string | null;
  escalatedAt?: string | null;
  openedBy?: string | null;
  createdAt: string;
}

export interface CaseNote {
  note: string;
  author?: string | null;
  createdAt?: string | null;
  [key: string]: unknown;
}

export interface ComplianceRuleStat {
  ruleCode: string;
  [key: string]: unknown;
}

export interface ComplianceDashboard {
  openCases: number;
  overdueCases: number;
  openByPriority: Record<string, number>;
  openByAge: Record<string, number>;
  unreviewedListMatches: number;
  activeFreezes: number;
  rules: ComplianceRuleStat[];
}

export type ComplianceRuleCategory =
  | "VELOCITY"
  | "AMOUNT"
  | "PATTERN"
  | "COUNTERPARTY"
  | "IDENTITY"
  | "GEOGRAPHY";
export type ComplianceRuleSeverity =
  | "INFO"
  | "LOW"
  | "MEDIUM"
  | "HIGH"
  | "CRITICAL";
export type ComplianceRuleAction =
  | "FLAG"
  | "REQUIRE_REVIEW"
  | "BLOCK_OPERATION"
  | "FREEZE_WALLET";

export interface ComplianceRule {
  ruleCode: string;
  name: string;
  description?: string | null;
  category?: ComplianceRuleCategory | string;
  severity: ComplianceRuleSeverity | string;
  action: ComplianceRuleAction | string;
  amountThreshold?: number | null;
  countThreshold?: number | null;
  ratioThreshold?: number | null;
  windowMinutes?: number | null;
  active: boolean;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  rationale?: string | null;
}

export interface ComplianceRuleUpdateRequest {
  name: string;
  description?: string | null;
  severity: ComplianceRuleSeverity;
  action: ComplianceRuleAction;
  amountThreshold?: number | null;
  countThreshold?: number | null;
  ratioThreshold?: number | null;
  windowMinutes?: number | null;
  active: boolean;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  /** Justification de la modification (tracée). */
  rationale: string;
}

export interface RuleEvaluationResult {
  ruleCode: string;
  action: ComplianceRuleAction | string;
  details?: string | null;
  newFlag: boolean;
}

export interface CloseCaseRequest {
  decision: ComplianceDecision;
  rationale: string;
  findings?: string;
}

export type ScreeningListType = "SANCTION" | "PEP";

export interface ScreeningListEntryInput {
  fullName: string;
  aliases?: string[];
  birthYear?: number | null;
  nationality?: string | null;
  reference?: string | null;
}

export interface ScreeningListUpload {
  listCode: string;
  listVersion: string;
  type: ScreeningListType;
  entries: ScreeningListEntryInput[];
}

export type ScreeningResult = "CLEAR" | "POSSIBLE_MATCH" | "MATCH";

export interface ScreeningCheckRequest {
  subjectType: string;
  subjectCode: string;
  fullName: string;
  birthYear?: number | null;
}

/** result est le seul champ garanti ; un POSSIBLE_MATCH/MATCH non revu attend review. */
export interface CheckView {
  checkNumber: string;
  subjectType?: string;
  subjectCode?: string;
  result: ScreeningResult | string;
  [key: string]: unknown;
}

export interface FreezeRequest {
  authority: string;
  instructionReference: string;
  instructionDate: string;
  rationale: string;
}

export interface FreezeView {
  freezeNumber: string;
  walletNumber?: string;
  [key: string]: unknown;
}

export interface AuditVerifyResult {
  entries: number;
  brokenEntries: number;
}

// ═══ Service ══════════════════════════════════════════════════════════════════

export const walletControlService = {
  // ── Contrôle · tableau de bord et export ───────────────────────────────────

  getDashboard: async (currency = "XAF"): Promise<WalletControlDashboard> =>
    (await apiClient.get(`${CONTROL}/dashboard`, { params: { currency } }))
      .data,

  /** CSV des mouvements. */
  exportMovements: async (params: {
    from?: string;
    to?: string;
  }): Promise<Blob> =>
    (
      await apiClient.get(`${CONTROL}/export`, {
        params,
        responseType: "blob",
      })
    ).data,

  // ── Contrôle · actions à deux visas ────────────────────────────────────────

  createAction: async (
    walletNumber: string,
    data: WalletAdminActionRequest,
  ): Promise<AdminActionView> =>
    (
      await apiClient.post(
        `${CONTROL}/wallets/${encodeURIComponent(walletNumber)}/actions`,
        data,
      )
    ).data,

  getWalletActions: async (
    walletNumber: string,
    params?: PageParams,
  ): Promise<PageResult<AdminActionView>> =>
    toPage<AdminActionView>(
      (
        await apiClient.get(
          `${CONTROL}/wallets/${encodeURIComponent(walletNumber)}/actions`,
          { params },
        )
      ).data,
      params?.size,
    ),

  /** Ce qui attend un second visa. */
  getPendingActions: async (
    params?: PageParams,
  ): Promise<PageResult<AdminActionView>> =>
    toPage<AdminActionView>(
      (await apiClient.get(`${CONTROL}/actions/pending`, { params })).data,
      params?.size,
    ),

  /** Refusé en 409 si le même utilisateur a créé l'action. */
  approveAction: async (actionNumber: string): Promise<AdminActionView> =>
    (
      await apiClient.post(
        `${CONTROL}/actions/${encodeURIComponent(actionNumber)}/approve`,
      )
    ).data,

  rejectAction: async (
    actionNumber: string,
    reason: string,
  ): Promise<AdminActionView> =>
    (
      await apiClient.post(
        `${CONTROL}/actions/${encodeURIComponent(actionNumber)}/reject`,
        { reason },
      )
    ).data,

  // ── Contrôle · signalements ────────────────────────────────────────────────

  /** status : liste séparée par des virgules, ex. "OPEN,UNDER_REVIEW". */
  getFlags: async (
    params?: PageParams & { status?: string },
  ): Promise<PageResult<FlagView>> =>
    toPage<FlagView>(
      (await apiClient.get(`${CONTROL}/flags`, { params })).data,
      params?.size,
    ),

  getWalletFlags: async (walletNumber: string): Promise<FlagView[]> =>
    toList<FlagView>(
      (
        await apiClient.get(
          `${CONTROL}/wallets/${encodeURIComponent(walletNumber)}/flags`,
        )
      ).data,
    ),

  reviewFlag: async (
    flagNumber: string,
    data: { holdWallet: boolean },
  ): Promise<FlagView> =>
    (
      await apiClient.post(
        `${CONTROL}/flags/${encodeURIComponent(flagNumber)}/review`,
        data,
      )
    ).data,

  resolveFlag: async (
    flagNumber: string,
    data: { confirmed: boolean; resolution: string },
  ): Promise<FlagView> =>
    (
      await apiClient.post(
        `${CONTROL}/flags/${encodeURIComponent(flagNumber)}/resolve`,
        data,
      )
    ).data,

  // ── Contrôle · trésorerie ──────────────────────────────────────────────────

  getTreasurySnapshot: async (currency = "XAF"): Promise<TreasurySnapshot> =>
    (
      await apiClient.get(`${CONTROL}/treasury/snapshot`, {
        params: { currency },
      })
    ).data,

  createReconciliation: async (
    data: TreasuryReconciliationRequest,
  ): Promise<TreasuryReconciliation> =>
    (await apiClient.post(`${CONTROL}/treasury/reconciliations`, data)).data,

  getReconciliations: async (
    params?: PageParams,
  ): Promise<PageResult<TreasuryReconciliation>> =>
    toPage<TreasuryReconciliation>(
      (await apiClient.get(`${CONTROL}/treasury/reconciliations`, { params }))
        .data,
      params?.size,
    ),

  getReconciliation: async (
    reconciliationNumber: string,
  ): Promise<TreasuryReconciliation> =>
    (
      await apiClient.get(
        `${CONTROL}/treasury/reconciliations/${encodeURIComponent(reconciliationNumber)}`,
      )
    ).data,

  // ── Conformité · tableau de bord et règles ─────────────────────────────────

  getComplianceDashboard: async (): Promise<ComplianceDashboard> =>
    (await apiClient.get(`${COMPLIANCE}/dashboard`)).data,

  getRules: async (): Promise<ComplianceRule[]> =>
    toList<ComplianceRule>((await apiClient.get(`${COMPLIANCE}/rules`)).data),

  updateRule: async (
    ruleCode: string,
    data: ComplianceRuleUpdateRequest,
  ): Promise<ComplianceRule> =>
    (
      await apiClient.put(
        `${COMPLIANCE}/rules/${encodeURIComponent(ruleCode)}`,
        data,
      )
    ).data,

  /** Évaluation à la demande des règles sur un portefeuille. */
  evaluateWallet: async (
    walletNumber: string,
  ): Promise<RuleEvaluationResult[]> =>
    toList<RuleEvaluationResult>(
      (
        await apiClient.post(
          `${COMPLIANCE}/wallets/${encodeURIComponent(walletNumber)}/evaluate`,
        )
      ).data,
    ),

  // ── Conformité · dossiers ──────────────────────────────────────────────────

  getCases: async (
    params?: PageParams & { scope?: ComplianceCaseScope },
  ): Promise<PageResult<CaseView>> =>
    toPage<CaseView>(
      (await apiClient.get(`${COMPLIANCE}/cases`, { params })).data,
      params?.size,
    ),

  getCase: async (caseNumber: string): Promise<CaseView> =>
    (
      await apiClient.get(
        `${COMPLIANCE}/cases/${encodeURIComponent(caseNumber)}`,
      )
    ).data,

  getCaseNotes: async (caseNumber: string): Promise<CaseNote[]> =>
    toList<CaseNote>(
      (
        await apiClient.get(
          `${COMPLIANCE}/cases/${encodeURIComponent(caseNumber)}/notes`,
        )
      ).data,
    ),

  getWalletCases: async (walletNumber: string): Promise<CaseView[]> =>
    toList<CaseView>(
      (
        await apiClient.get(
          `${COMPLIANCE}/wallets/${encodeURIComponent(walletNumber)}/cases`,
        )
      ).data,
    ),

  assignCase: async (
    caseNumber: string,
    assignee: string,
  ): Promise<CaseView> =>
    (
      await apiClient.post(
        `${COMPLIANCE}/cases/${encodeURIComponent(caseNumber)}/assign`,
        { assignee },
      )
    ).data,

  addCaseNote: async (caseNumber: string, note: string): Promise<CaseNote> =>
    (
      await apiClient.post(
        `${COMPLIANCE}/cases/${encodeURIComponent(caseNumber)}/notes`,
        { note },
      )
    ).data,

  escalateCase: async (
    caseNumber: string,
    data: { escalatedTo: string; reason: string },
  ): Promise<CaseView> =>
    (
      await apiClient.post(
        `${COMPLIANCE}/cases/${encodeURIComponent(caseNumber)}/escalate`,
        data,
      )
    ).data,

  closeCase: async (
    caseNumber: string,
    data: CloseCaseRequest,
  ): Promise<CaseView> =>
    (
      await apiClient.post(
        `${COMPLIANCE}/cases/${encodeURIComponent(caseNumber)}/close`,
        data,
      )
    ).data,

  /** JSON du dossier pour déclaration / coopération avec les autorités. */
  exportCase: async (
    caseNumber: string,
    activityDays = 90,
  ): Promise<Record<string, unknown>> =>
    (
      await apiClient.get(
        `${COMPLIANCE}/cases/${encodeURIComponent(caseNumber)}/export`,
        { params: { activityDays } },
      )
    ).data,

  // ── Conformité · filtrage (sanctions, PEP) ─────────────────────────────────

  uploadScreeningList: async (data: ScreeningListUpload): Promise<unknown> =>
    (await apiClient.post(`${COMPLIANCE}/screening/lists`, data)).data,

  runScreeningCheck: async (data: ScreeningCheckRequest): Promise<CheckView> =>
    (await apiClient.post(`${COMPLIANCE}/screening/checks`, data)).data,

  getScreeningChecks: async (
    params?: PageParams & { scope?: "pending" | "all" },
  ): Promise<PageResult<CheckView>> =>
    toPage<CheckView>(
      (await apiClient.get(`${COMPLIANCE}/screening/checks`, { params })).data,
      params?.size,
    ),

  getScreeningSubject: async (
    subjectType: string,
    subjectCode: string,
  ): Promise<CheckView[]> =>
    toList<CheckView>(
      (
        await apiClient.get(
          `${COMPLIANCE}/screening/subjects/${encodeURIComponent(subjectType)}/${encodeURIComponent(subjectCode)}`,
        )
      ).data,
    ),

  reviewScreeningCheck: async (
    checkNumber: string,
    data: { trueMatch: boolean; rationale: string },
  ): Promise<CheckView> =>
    (
      await apiClient.post(
        `${COMPLIANCE}/screening/checks/${encodeURIComponent(checkNumber)}/review`,
        data,
      )
    ).data,

  // ── Conformité · gels sur instruction ──────────────────────────────────────

  freezeWallet: async (
    walletNumber: string,
    data: FreezeRequest,
  ): Promise<FreezeView> =>
    (
      await apiClient.post(
        `${COMPLIANCE}/wallets/${encodeURIComponent(walletNumber)}/freeze`,
        data,
      )
    ).data,

  liftFreeze: async (
    freezeNumber: string,
    data: { liftReference: string; liftRationale: string },
  ): Promise<FreezeView> =>
    (
      await apiClient.post(
        `${COMPLIANCE}/freezes/${encodeURIComponent(freezeNumber)}/lift`,
        data,
      )
    ).data,

  getFreezes: async (params?: PageParams): Promise<PageResult<FreezeView>> =>
    toPage<FreezeView>(
      (await apiClient.get(`${COMPLIANCE}/freezes`, { params })).data,
      params?.size,
    ),

  getWalletFreezes: async (walletNumber: string): Promise<FreezeView[]> =>
    toList<FreezeView>(
      (
        await apiClient.get(
          `${COMPLIANCE}/wallets/${encodeURIComponent(walletNumber)}/freezes`,
        )
      ).data,
    ),

  // ── Conformité · piste d'audit chaînée ─────────────────────────────────────

  getAuditTrail: async (
    subjectType: string,
    subjectCode: string,
  ): Promise<Array<Record<string, unknown>>> =>
    toList<Record<string, unknown>>(
      (
        await apiClient.get(
          `${COMPLIANCE}/audit/${encodeURIComponent(subjectType)}/${encodeURIComponent(subjectCode)}`,
        )
      ).data,
    ),

  verifyAuditChain: async (): Promise<AuditVerifyResult> =>
    (await apiClient.get(`${COMPLIANCE}/audit/verify`)).data,
};
