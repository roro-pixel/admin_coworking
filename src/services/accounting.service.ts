import { apiClient } from "./api";
import { API } from "./pagination";

// Module comptabilité (SYSCOHADA révisé) : socle (AccountingController).
// Droits lus dans la doc des routes :
//   ACCOUNTING_REPORT:READ (toutes les lectures), ACCOUNTING_ACCOUNT:CREATE / :MANAGE,
//   ACCOUNTING_ENTRY:CREATE / :VALIDATE / :REVERSE / :BALANCE,
//   ACCOUNTING_PERIOD:CLOSE / :LOCK, ACCOUNTING_JOURNAL:CREATE / :MANAGE,
//   ACCOUNTING_LETTERING:MANUAL / :UNLETTER.

export type AccountNature = "BALANCE" | "MANAGEMENT" | "HAO" | "ANALYTIC" | "OFF_BALANCE";
export type Side = "DEBIT" | "CREDIT";
export type ThirdPartyType = "CUSTOMER" | "SUPPLIER" | "EMPLOYEE" | "PARTNER" | "OTHER";
export type TreasuryType = "CASH" | "BANK" | "MOBILE_MONEY";
export type AccountStatus = "PENDING_APPROVAL" | "ACTIVE" | "INACTIVE" | "MERGED";
export type EntryStatus = "DRAFT" | "PENDING_BALANCE" | "VALIDATED" | "REVERSED" | "REJECTED";
export type EntryOrigin = "MANUAL" | "CASH" | "PLATFORM" | "IMPORT" | "CLOSING" | "OPENING" | "REVERSAL" | "REGULARIZATION";
export type PendingReason = "UNBALANCED" | "COUNTERPART_NOT_ALLOWED" | "MISSING_ACCOUNT" | "ANALYTIC_INCOMPLETE" | "INACTIVE_ACCOUNT";
export type JournalType =
  | "SALES" | "PURCHASES" | "CASH" | "BANK" | "MOBILE_MONEY" | "WALLET" | "MISC"
  | "STOCK" | "OPENING" | "REVERSAL" | "OFF_BALANCE" | "ANALYTIC" | "PAYROLL";
export type PeriodStatus = "OPEN" | "LOCKED" | "CLOSED";
export type FiscalYearStatus = "OPEN" | "CLOSING" | "CLOSED";

export interface Account {
  number: string;
  label: string;
  parentNumber?: string | null;
  classCode?: string | null;
  nature?: AccountNature;
  normalSide?: Side;
  reconcilable?: boolean;
  thirdPartyType?: ThirdPartyType | null;
  treasuryType?: TreasuryType | null;
  analyticRequired?: boolean;
  taxCode?: string | null;
  statementLineCode?: string | null;
  status?: AccountStatus;
  mergedInto?: string | null;
  hasPostings?: boolean;
  childCount?: number;
  createdBy?: string | null;
  createdAt?: string | null;
}

export interface AccountProposal {
  parentNumber?: string;
  proposedNumber?: string;
  classCode?: string;
  nature?: AccountNature;
  normalSide?: Side;
  reconcilable?: boolean;
  thirdPartyType?: ThirdPartyType | null;
  treasuryType?: TreasuryType | null;
  analyticRequired?: boolean;
  taxCode?: string | null;
  statementLineCode?: string | null;
  needsApproval?: boolean;
}

export interface CreateAccountInput {
  parentNumber?: string;
  number?: string;
  label: string;
  reconcilable?: boolean;
  thirdPartyType?: ThirdPartyType | null;
  treasuryType?: TreasuryType | null;
  analyticRequired?: boolean;
  taxCode?: string;
  statementLineCode?: string;
  reason?: string;
}

export type UpdateAccountInput = Omit<CreateAccountInput, "parentNumber" | "number" | "label"> & { label?: string };

export interface AccountHistory {
  field?: string;
  oldValue?: string | null;
  newValue?: string | null;
  reason?: string | null;
  changedBy?: string | null;
  changedAt?: string | null;
}

export interface AccountThirdParty {
  accountNumber?: string;
  partyType?: ThirdPartyType;
  partyCode?: string;
  label?: string;
  createdAt?: string | null;
}

export interface EntryLine {
  id?: number;
  lineNo?: number;
  accountNumber: string;
  accountLabel?: string | null;
  thirdPartyType?: ThirdPartyType | null;
  thirdPartyCode?: string | null;
  label?: string | null;
  debit?: number | null;
  credit?: number | null;
  currency?: string | null;
  foreignAmount?: number | null;
  rate?: number | null;
  taxCode?: string | null;
  taxBase?: number | null;
  dueDate?: string | null;
  reference?: string | null;
  letteringCode?: string | null;
  letteredAmount?: number | null;
}

export interface Entry {
  entryNumber: string;
  provisionalNumber?: string | null;
  journalCode?: string;
  fiscalYearCode?: string;
  periodCode?: string;
  entryDate?: string;
  originalDate?: string | null;
  documentDate?: string | null;
  label?: string;
  origin?: EntryOrigin;
  sourceType?: string | null;
  sourceCode?: string | null;
  status: EntryStatus;
  acceptedUnbalanced?: boolean;
  unbalancedAmount?: number | null;
  pendingReason?: PendingReason | null;
  pendingDetail?: string | null;
  totalDebit?: number;
  totalCredit?: number;
  difference?: number;
  createdBy?: string | null;
  createdAt?: string | null;
  validatedBy?: string | null;
  validatedAt?: string | null;
  reversalOf?: string | null;
  reversedByEntry?: string | null;
  reversalReason?: string | null;
  regularizationOf?: string | null;
  regularizedBy?: string | null;
  rejectedBy?: string | null;
  rejectionReason?: string | null;
  contentHash?: string | null;
  lines?: EntryLine[];
  /** Messages du serveur (avertissements, comptes ajoutés...) à afficher tels quels. */
  messages?: string[];
}

export interface EntryLineInput {
  accountNumber: string;
  thirdPartyCode?: string;
  label?: string;
  debit?: number;
  credit?: number;
  currency?: string;
  foreignAmount?: number;
  rate?: number;
  taxCode?: string;
  taxBase?: number;
  dueDate?: string;
  reference?: string;
  analytic?: Record<string, string>;
}

export interface EntryInput {
  journalCode: string;
  entryDate: string;
  documentDate?: string;
  label: string;
  sourceType?: string;
  sourceCode?: string;
  lines: EntryLineInput[];
  /** true = valider tout de suite (droit ACCOUNTING_ENTRY:VALIDATE). */
  validate?: boolean;
}

export interface EntryFilters {
  journalCode?: string;
  status?: EntryStatus;
  from?: string;
  to?: string;
}

export interface Period {
  code: string;
  startDate?: string;
  endDate?: string;
  status: PeriodStatus;
  lockedAt?: string | null;
  lockedBy?: string | null;
  closedAt?: string | null;
  closedBy?: string | null;
  pendingEntries?: number;
  draftEntries?: number;
}

export interface FiscalYear {
  code: string;
  startDate?: string;
  endDate?: string;
  status: FiscalYearStatus;
  periods?: Period[];
}

export interface Journal {
  code: string;
  label: string;
  type: JournalType;
  treasuryAccountNumber?: string | null;
  numberingReset?: "YEAR" | "PERIOD";
  autoValidate?: boolean;
  allowedAccounts?: string[];
  cashRegisterCode?: string | null;
  active?: boolean;
}

const BASE = `${API}/accounting`;
const enc = encodeURIComponent;
const list = <T,>(d: any): T[] => (Array.isArray(d) ? d : (d?.data ?? d?.content ?? []));
const one = <T,>(d: any): T => (d && d.data !== undefined && !Array.isArray(d) && d.number === undefined && d.entryNumber === undefined && d.code === undefined ? d.data : d);

/** Retire les champs vides : le serveur n'aime pas "" pour une date ou un code. */
const clean = <T extends object>(o: T): T =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== "" && v !== undefined && v !== null)) as T;

export const accountingService = {
  // ─── Plan de comptes ───
  async accounts(params?: { search?: string; classCode?: string; includeInactive?: boolean }): Promise<Account[]> {
    return list<Account>((await apiClient.get(`${BASE}/accounts`, { params: clean(params ?? {}) })).data);
  },
  async account(number: string): Promise<Account> {
    return one<Account>((await apiClient.get(`${BASE}/accounts/${enc(number)}`)).data);
  },
  async accountProposal(parentNumber: string): Promise<AccountProposal> {
    return one<AccountProposal>((await apiClient.get(`${BASE}/accounts/proposal`, { params: { parentNumber } })).data);
  },
  async createAccount(input: CreateAccountInput): Promise<Account> {
    return one<Account>((await apiClient.post(`${BASE}/accounts`, clean(input))).data);
  },
  async updateAccount(number: string, input: UpdateAccountInput): Promise<Account> {
    return one<Account>((await apiClient.patch(`${BASE}/accounts/${enc(number)}`, clean(input))).data);
  },
  async activateAccount(number: string): Promise<Account> {
    return one<Account>((await apiClient.patch(`${BASE}/accounts/${enc(number)}/activate`)).data);
  },
  async deactivateAccount(number: string, reason?: string): Promise<Account> {
    return one<Account>((await apiClient.patch(`${BASE}/accounts/${enc(number)}/deactivate`, { reason })).data);
  },
  async accountHistory(number: string): Promise<AccountHistory[]> {
    return list<AccountHistory>((await apiClient.get(`${BASE}/accounts/${enc(number)}/history`)).data);
  },
  async accountThirdParties(number: string): Promise<AccountThirdParty[]> {
    return list<AccountThirdParty>((await apiClient.get(`${BASE}/accounts/${enc(number)}/third-parties`)).data);
  },

  // ─── Écritures ───
  async entries(filters?: EntryFilters): Promise<Entry[]> {
    return list<Entry>((await apiClient.get(`${BASE}/entries`, { params: clean(filters ?? {}) })).data);
  },
  async pendingEntries(): Promise<Entry[]> {
    return list<Entry>((await apiClient.get(`${BASE}/entries/pending`)).data);
  },
  async entry(reference: string): Promise<Entry> {
    return one<Entry>((await apiClient.get(`${BASE}/entries/${enc(reference)}`)).data);
  },
  async createEntry(input: EntryInput): Promise<Entry> {
    return one<Entry>((await apiClient.post(`${BASE}/entries`, input)).data);
  },
  async updateEntry(reference: string, input: EntryInput): Promise<Entry> {
    return one<Entry>((await apiClient.put(`${BASE}/entries/${enc(reference)}`, input)).data);
  },
  async deleteEntry(reference: string): Promise<void> {
    await apiClient.delete(`${BASE}/entries/${enc(reference)}`);
  },
  async validateEntry(reference: string): Promise<Entry> {
    return one<Entry>((await apiClient.patch(`${BASE}/entries/${enc(reference)}/validate`)).data);
  },
  async reverseEntry(reference: string, input: { reason: string; date?: string }): Promise<Entry> {
    return one<Entry>((await apiClient.patch(`${BASE}/entries/${enc(reference)}/reverse`, clean(input))).data);
  },
  async rejectEntry(reference: string, reason?: string): Promise<Entry> {
    return one<Entry>((await apiClient.patch(`${BASE}/entries/${enc(reference)}/reject`, { reason })).data);
  },
  async regularizeEntry(reference: string, input: { label: string; lines: EntryLineInput[] }): Promise<Entry> {
    return one<Entry>((await apiClient.post(`${BASE}/entries/${enc(reference)}/regularize`, input)).data);
  },

  // ─── Référentiels utiles aux formulaires ───
  async journals(): Promise<Journal[]> {
    return list<Journal>((await apiClient.get(`${BASE}/journals`)).data);
  },
  async fiscalYears(): Promise<FiscalYear[]> {
    return list<FiscalYear>((await apiClient.get(`${BASE}/fiscal-years`)).data);
  },
  async periods(): Promise<Period[]> {
    return list<Period>((await apiClient.get(`${BASE}/periods`)).data);
  },
};
