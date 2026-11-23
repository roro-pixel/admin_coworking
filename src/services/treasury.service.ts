import { apiClient } from "./api";
import { API } from "./pagination";
import type { Journal } from "./accounting.service";

// Trésorerie : banque et rapprochement (BankController), caisse comptable (CashAccountingController).
// Droits lus dans la doc : ACCOUNTING_REPORT:READ (lectures), BANK_ACCOUNT:MANAGE, BANK_STATEMENT:IMPORT,
// BANK_RECONCILIATION:MANAGE / :VALIDATE, CASH:READ, CASH_EXCHANGE_RATE:MANAGE,
// ACCOUNTING_POSTING:REPLAY (alimentation de la caisse), ACCOUNTING_JOURNAL:CREATE / :MANAGE.

export interface BankAccount {
  id?: number;
  code: string;
  kind?: string | null;
  bankName?: string | null;
  branch?: string | null;
  label?: string | null;
  rib?: string | null;
  currency?: string | null;
  accountNumber?: string | null;
  journalCode?: string | null;
  importTemplateCode?: string | null;
  openingBalance?: number | null;
  openingDate?: string | null;
  active?: boolean;
}

export interface BankDashboard {
  code: string;
  label?: string;
  accountNumber?: string;
  statementBalance?: number;
  bookBalance?: number;
  bookOutstanding?: number;
  statementOutstanding?: number;
  oldestOutstandingDays?: number;
  lastStatement?: string | null;
  lastReconciliation?: string | null;
}

export interface StatementLine {
  id: number;
  statementNumber?: string;
  date?: string;
  valueDate?: string | null;
  label?: string;
  reference?: string | null;
  amount?: number;
  matchingCode?: string | null;
  awaitingPayment?: string | null;
  postedEntry?: string | null;
}

export interface BookLine {
  id: number;
  entryNumber?: string;
  date?: string;
  label?: string;
  reference?: string | null;
  sourceCode?: string | null;
  amount?: number;
  matchingCode?: string | null;
}

export interface MatchProposal {
  statementLineIds: number[];
  entryLineIds: number[];
  amount?: number;
  kind?: string;
  confidence?: number;
}

export interface MatchingScreen {
  bankAccountCode?: string;
  statementLines: StatementLine[];
  bookLines: BookLine[];
  proposals: MatchProposal[];
  statementOpen?: number;
  bookOpen?: number;
}

export interface BankStatement {
  id: number;
  number?: string;
  bankAccountCode?: string;
  periodFrom?: string;
  periodTo?: string;
  openingBalance?: number;
  closingBalance?: number;
  fileName?: string | null;
  source?: string | null;
  missingBefore?: boolean;
  duplicates?: number;
  status?: string;
  replacedBy?: string | null;
  importedBy?: string | null;
  importedAt?: string | null;
}

export interface ImportResult {
  statement?: BankStatement;
  lines?: number;
  duplicates?: number;
  autoMatched?: number;
  warnings?: string[];
}

export interface ManualLine {
  date?: string;
  valueDate?: string;
  label?: string;
  reference?: string;
  amount?: number;
}

export interface ManualStatement {
  periodFrom?: string;
  periodTo?: string;
  openingBalance?: number;
  closingBalance?: number;
  lines: ManualLine[];
}

export interface Reconciliation {
  id?: number;
  number?: string;
  bankAccountCode?: string;
  date?: string;
  reconciliationDate?: string;
  statementBalance?: number;
  bookBalance?: number;
  bookOutstanding?: BookLine[];
  statementOutstanding?: StatementLine[];
  reconciledBalance?: number;
  difference?: number;
  status?: string;
  preparedBy?: string | null;
  validatedBy?: string | null;
  validatedAt?: string | null;
}

export interface PostLineInput {
  ruleId?: number;
  accountNumber?: string;
  thirdParty?: string;
  label?: string;
  invoiceNumber?: string;
}

export interface AssignmentRule {
  id?: number;
  label?: string;
  labelPattern?: string;
  direction?: string;
  minAmount?: number | null;
  maxAmount?: number | null;
  accountNumber?: string;
  thirdParty?: string;
  priority?: number;
  active?: boolean;
}

export interface ImportTemplate {
  id?: number;
  code: string;
  label?: string;
  format?: string;
  delimiter?: string;
  headerRows?: number;
  dateColumn?: string;
  valueDateColumn?: string;
  labelColumn?: string;
  referenceColumn?: string;
  amountColumn?: string;
  debitColumn?: string;
  creditColumn?: string;
  dateFormat?: string;
  decimalSeparator?: string;
  encoding?: string;
}

export interface Cheque {
  id: number;
  transactionNumber: string;
  chequeNumber?: string;
  bankName?: string;
  drawer?: string;
  amount?: number;
  registerCode?: string;
  sessionNumber?: string;
  status?: string;
  slipNumber?: string | null;
  depositedAt?: string | null;
  clearedAt?: string | null;
  rejectedAt?: string | null;
  rejectedReason?: string | null;
  receivedAt?: string | null;
}

export interface DepositSlip {
  id: number;
  number: string;
  bankAccountCode?: string;
  registerCode?: string;
  cashAmount?: number;
  chequeTotal?: number;
  status?: string;
  createdBy?: string;
  createdAt?: string;
  depositedAt?: string | null;
  creditedAt?: string | null;
  creditEntry?: string | null;
}

export interface SlipInput {
  bankAccountCode?: string;
  registerCode?: string;
  cashAmount?: number;
  chequeTransactions?: string[];
}

export interface ExchangeRate {
  id?: number;
  currency: string;
  rate: number;
  validOn?: string;
  setBy?: string;
  source?: string;
  provider?: string;
}

export interface CurrencyBalance {
  currency: string;
  balance?: number;
  rate?: number;
  baseEquivalent?: number;
}

export interface RegisterReconciliation {
  registerCode: string;
  registerName?: string;
  treasuryAccount?: string;
  journalCode?: string;
  accountingBalance?: number;
  operationalBalance?: number;
  difference?: number;
  operationalSource?: string;
  movementsNotPosted?: number;
}

export interface BatchResult {
  processed?: number;
  succeeded?: number;
  failed?: number;
  errors?: string[];
}

const BASE = `${API}/accounting`;
const enc = encodeURIComponent;
const list = <T,>(d: any): T[] => (Array.isArray(d) ? d : (d?.data ?? d?.content ?? []));
const one = <T,>(d: any): T => (d && d.data !== undefined && !Array.isArray(d) && d.code === undefined && d.id === undefined && d.number === undefined ? d.data : d);
const clean = <T extends object>(o: T): T =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== "" && v !== undefined && v !== null)) as T;

export const treasuryService = {
  // ─── Comptes bancaires ───
  async bankAccounts(): Promise<BankAccount[]> {
    return list<BankAccount>((await apiClient.get(`${BASE}/bank-accounts`)).data);
  },
  async saveBankAccount(a: BankAccount): Promise<BankAccount> {
    return one<BankAccount>((await apiClient.post(`${BASE}/bank-accounts`, clean(a))).data);
  },
  async dashboard(): Promise<BankDashboard[]> {
    return list<BankDashboard>((await apiClient.get(`${BASE}/bank-dashboard`)).data);
  },

  // ─── Relevés ───
  async statements(code: string): Promise<BankStatement[]> {
    return list<BankStatement>((await apiClient.get(`${BASE}/bank-accounts/${enc(code)}/statements`)).data);
  },
  async importStatement(code: string, file: File, o: { openingBalance?: number; closingBalance?: number; replace?: string }): Promise<ImportResult> {
    const fd = new FormData();
    fd.append("file", file);
    return one<ImportResult>(
      (await apiClient.post(`${BASE}/bank-accounts/${enc(code)}/statements`, fd, { params: clean(o), headers: { "Content-Type": "multipart/form-data" } })).data,
    );
  },
  async importManual(code: string, s: ManualStatement): Promise<ImportResult> {
    return one<ImportResult>((await apiClient.post(`${BASE}/bank-accounts/${enc(code)}/statements/manual`, s)).data);
  },
  async postLine(code: string, id: number, input?: PostLineInput): Promise<StatementLine> {
    return one<StatementLine>((await apiClient.post(`${BASE}/bank-accounts/${enc(code)}/statement-lines/${id}/post`, input ? clean(input) : undefined)).data);
  },

  // ─── Pointage ───
  async matching(code: string): Promise<MatchingScreen> {
    const d: any = (await apiClient.get(`${BASE}/bank-accounts/${enc(code)}/matching`)).data;
    const s = d?.statementLines ? d : (d?.data ?? d);
    return { statementLines: [], bookLines: [], proposals: [], ...s };
  },
  async match(code: string, statementLineIds: number[], entryLineIds: number[]): Promise<void> {
    await apiClient.post(`${BASE}/bank-accounts/${enc(code)}/matching`, { statementLineIds, entryLineIds });
  },
  async autoMatch(code: string): Promise<number> {
    const d: any = (await apiClient.post(`${BASE}/bank-accounts/${enc(code)}/matching/auto`)).data;
    return typeof d === "number" ? d : Number(d?.data ?? 0);
  },
  async unmatch(code: string, matching: string, reason: string): Promise<void> {
    await apiClient.delete(`${BASE}/bank-accounts/${enc(code)}/matching/${enc(matching)}`, { data: { reason } });
  },

  // ─── États de rapprochement ───
  async reconciliations(code: string): Promise<Reconciliation[]> {
    return list<Reconciliation>((await apiClient.get(`${BASE}/bank-accounts/${enc(code)}/reconciliations`)).data);
  },
  async prepareReconciliation(code: string, date: string): Promise<Reconciliation> {
    return one<Reconciliation>((await apiClient.post(`${BASE}/bank-accounts/${enc(code)}/reconciliations`, null, { params: { date } })).data);
  },
  async validateReconciliation(id: number): Promise<Reconciliation> {
    return one<Reconciliation>((await apiClient.patch(`${BASE}/reconciliations/${id}/validate`)).data);
  },
  async reconciliationPdf(id: number): Promise<Blob> {
    return (await apiClient.get(`${BASE}/reconciliations/${id}/pdf`, { responseType: "blob" })).data;
  },

  // ─── Règles et modèles ───
  async rules(): Promise<AssignmentRule[]> {
    return list<AssignmentRule>((await apiClient.get(`${BASE}/bank-assignment-rules`)).data);
  },
  async saveRule(r: AssignmentRule): Promise<AssignmentRule> {
    return one<AssignmentRule>((await apiClient.post(`${BASE}/bank-assignment-rules`, clean(r))).data);
  },
  async templates(): Promise<ImportTemplate[]> {
    return list<ImportTemplate>((await apiClient.get(`${BASE}/bank-import-templates`)).data);
  },
  async saveTemplate(t: ImportTemplate): Promise<ImportTemplate> {
    return one<ImportTemplate>((await apiClient.post(`${BASE}/bank-import-templates`, clean(t))).data);
  },
  async previewTemplate(code: string, file: File): Promise<ManualLine[]> {
    const fd = new FormData();
    fd.append("file", file);
    return list<ManualLine>((await apiClient.post(`${BASE}/bank-import-templates/${enc(code)}/preview`, fd, { headers: { "Content-Type": "multipart/form-data" } })).data);
  },

  // ─── Chèques et bordereaux ───
  async cheques(status?: string): Promise<Cheque[]> {
    return list<Cheque>((await apiClient.get(`${BASE}/cheques`, { params: clean({ status }) })).data);
  },
  async rejectCheque(tn: string, p: { reason: string; fees?: number; bankAccountCode?: string }): Promise<Cheque> {
    return one<Cheque>((await apiClient.patch(`${BASE}/cheques/${enc(tn)}/reject`, null, { params: clean(p) })).data);
  },
  async slips(): Promise<DepositSlip[]> {
    return list<DepositSlip>((await apiClient.get(`${BASE}/deposit-slips`)).data);
  },
  async prepareSlip(i: SlipInput): Promise<void> {
    await apiClient.post(`${BASE}/deposit-slips`, clean(i));
  },
  async depositSlip(number: string): Promise<void> {
    await apiClient.patch(`${BASE}/deposit-slips/${enc(number)}/deposit`);
  },
  async creditSlip(number: string, p?: { statementLineId?: number; date?: string }): Promise<void> {
    await apiClient.patch(`${BASE}/deposit-slips/${enc(number)}/credit`, null, { params: clean(p ?? {}) });
  },

  // ─── Taux de change ───
  async rates(): Promise<ExchangeRate[]> {
    return list<ExchangeRate>((await apiClient.get(`${BASE}/exchange-rates`)).data);
  },
  async rateBoard(date?: string): Promise<ExchangeRate[]> {
    return list<ExchangeRate>((await apiClient.get(`${BASE}/exchange-rates/board`, { params: clean({ date }) })).data);
  },
  async setRate(p: { currency: string; rate: number; validOn?: string }): Promise<ExchangeRate> {
    return one<ExchangeRate>((await apiClient.post(`${BASE}/exchange-rates`, null, { params: clean(p) })).data);
  },
  async fetchRates(): Promise<ExchangeRate[]> {
    return list<ExchangeRate>((await apiClient.post(`${BASE}/exchange-rates/fetch`)).data);
  },
  async convert(p: { amount: number; from: string; to?: string; date?: string }): Promise<number> {
    const d: any = (await apiClient.get(`${BASE}/exchange-rates/convert`, { params: clean(p) })).data;
    return typeof d === "number" ? d : Number(d?.data ?? 0);
  },
  async registerBalances(registerCode: string): Promise<CurrencyBalance[]> {
    return list<CurrencyBalance>((await apiClient.get(`${BASE}/cash/registers/${enc(registerCode)}/balances`)).data);
  },

  // ─── Caisse comptable ───
  async cashReconciliation(): Promise<RegisterReconciliation[]> {
    return list<RegisterReconciliation>((await apiClient.get(`${BASE}/cash/reconciliation`)).data);
  },
  async feedCash(): Promise<BatchResult> {
    return one<BatchResult>((await apiClient.post(`${BASE}/cash/feed`)).data);
  },
  async registerJournals(code: string): Promise<Journal[]> {
    return list<Journal>((await apiClient.get(`${BASE}/cash/registers/${enc(code)}/journals`)).data);
  },
  async createRegisterJournal(code: string, j: { label: string; type: string }): Promise<Journal> {
    return one<Journal>((await apiClient.post(`${BASE}/cash/registers/${enc(code)}/journals`, j)).data);
  },
  async authorizeRegisterJournal(code: string, journal: string): Promise<Journal[]> {
    return list<Journal>((await apiClient.put(`${BASE}/cash/registers/${enc(code)}/journals/${enc(journal)}`)).data);
  },
  async revokeRegisterJournal(code: string, journal: string): Promise<Journal[]> {
    return list<Journal>((await apiClient.delete(`${BASE}/cash/registers/${enc(code)}/journals/${enc(journal)}`)).data);
  },
};
