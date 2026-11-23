import { apiClient } from "./api";
import { API } from "./pagination";

// Module demandes de fonds (FundController + VoucherController). Préfixe /sni/api/v1.
// Droits : FUND_REQUEST:CREATE (saisie, files personnelles), :READ (toutes les demandes, avances), :DISBURSE (caisse), :APPROVE_L1 (états de besoin),
// FUND_JUSTIFICATION:VALIDATE (comptable).

export type FundType = "DIRECT_EXPENSE" | "ADVANCE" | "EXPENSE_REFUND" | "SUPPLIER_PAYMENT" | "STAFF_ADVANCE" | "CASH_SUPPLY" | "FUND_REMITTANCE";
export const FUND_TYPES: { code: FundType; label: string; hint: string }[] = [
  { code: "DIRECT_EXPENSE", label: "Dépense directe", hint: "Payée en une fois par la caisse" },
  { code: "ADVANCE", label: "Avance à justifier", hint: "Mission, déplacement : à justifier ensuite" },
  { code: "EXPENSE_REFUND", label: "Remboursement de frais", hint: "Frais déjà avancés par l'employé" },
  { code: "SUPPLIER_PAYMENT", label: "Paiement fournisseur", hint: "Règlement d'un fournisseur en espèces" },
  { code: "STAFF_ADVANCE", label: "Acompte au personnel", hint: "Avance sur salaire" },
  { code: "CASH_SUPPLY", label: "Approvisionnement de caisse", hint: "Transfert vers une caisse" },
  { code: "FUND_REMITTANCE", label: "Remise de fonds", hint: "Versement de la caisse vers la banque" },
];
export const FUND_STATUSES = ["DRAFT", "SUBMITTED", "IN_APPROVAL", "APPROVED", "PARTIALLY_DISBURSED", "DISBURSED", "TO_JUSTIFY", "PARTIALLY_JUSTIFIED", "JUSTIFIED", "SETTLED", "REJECTED", "CANCELLED", "EXPIRED"];

export interface NeedLine { lineNo?: number; designation: string; quantity?: number; unit?: string; unitPrice?: number; totalAmount?: number; natureCode?: string; supplier?: string; supplierCode?: string; transformedRequestNumber?: string }
export interface Need {
  number: string; requester?: string; department?: string; locationCode?: string; costCenter?: string; subject?: string; urgency?: string; wantedDate?: string; status?: string;
  totalAmount?: number; totalInWords?: string; submittedAt?: string; decidedBy?: string; decidedAt?: string; decisionNote?: string; attachments?: string; createdAt?: string; lines?: NeedLine[];
}
export interface RequestLine { natureCode?: string; designation: string; amount: number; supplier?: string; section?: string; supplierCode?: string }
export interface Approval { level?: number; approver?: string; decision?: string; amountBefore?: number; amountAfter?: number; comment?: string; delegatedFrom?: string; decidedAt?: string }
export interface Disbursement { kind?: string; movementNumber?: string; sessionNumber?: string; amount?: number; signedByName?: string; createdBy?: string; createdAt?: string }
export interface ExpenseLine {
  number?: string; lineNo?: number; expenseDate?: string; natureCode?: string; supplier?: string; designation?: string; amount?: number; vatAmount?: number; section?: string;
  documentReference?: string; honourStatement?: boolean; requestLineNo?: number; status?: string; rejectReason?: string; enteredBy?: string; validatedBy?: string; validatedAt?: string; supplierCode?: string;
}
export interface BudgetLineImpact { lineId?: number; itemCode?: string; itemLabel?: string; sectionCode?: string; controlLevel?: string; budgeted?: number; committed?: number; realized?: number; available?: number; requested?: number; availableAfter?: number; status?: string; openForecasts?: string[] }
export interface Insight {
  requiredLevels?: number; levelLabels?: string[]; registerBalance?: number; registerCanCover?: boolean; openAdvances?: string[]; blockedByOverdueAdvance?: boolean; warning?: string;
  budget?: { budgetActive?: boolean; lines?: BudgetLineImpact[]; blocked?: boolean; unbudgeted?: string[]; messages?: string[] }; budgetApproval?: string;
}
export interface FundRequest {
  number: string; type?: FundType; status?: string; requester?: string; requesterDepartment?: string; requesterPhone?: string; beneficiaryType?: string; beneficiaryCode?: string; beneficiaryName?: string;
  beneficiaryIdNumber?: string; beneficiaryPhone?: string; registerCode?: string; subject?: string; totalAmount?: number; totalInWords?: string; approvedAmount?: number; disbursedAmount?: number;
  justifiedAmount?: number; returnedAmount?: number; complementAmount?: number; remainingToJustify?: number; remainingToDisburse?: number; deliveryMode?: string; wantedDate?: string;
  missionDestination?: string; missionStart?: string; missionEnd?: string; unplanned?: boolean; unplannedReason?: string; needStatementNumber?: string; transferOrderNumber?: string;
  requiredLevels?: number; currentLevel?: number; lastComment?: string; submittedAt?: string; approvedAt?: string; expiresAt?: string; disbursedAt?: string; justificationDueDate?: string; settledAt?: string;
  legacyRequestNumber?: string; attachments?: string; createdAt?: string;
  lines?: RequestLine[]; timeline?: Approval[]; disbursements?: Disbursement[]; justification?: ExpenseLine[]; insight?: Insight;
}
export interface AdvanceRow { number: string; beneficiaryCode?: string; beneficiaryName?: string; disbursed?: number; justified?: number; returned?: number; remaining?: number; dueDate?: string; daysOverdue?: number; status?: string }
export interface DelegationView { id: number; delegator?: string; delegate?: string; level?: number; startsOn?: string; endsOn?: string }
export interface Suggestion { rank?: number; supplierCode?: string; supplierName?: string; phone?: string; email?: string; score?: number; reasons?: string[]; declared?: boolean; historyCount?: number; leadTimeDays?: number }
export interface LineSuggestion { lineNo?: number; designation?: string; natureCode?: string; supplierCode?: string; supplier?: string; result?: { natureCode?: string; natureLabel?: string; natureGuessed?: boolean; suggestions?: Suggestion[] } }
export interface Verification { number?: string; type?: string; amount?: number; issuedAt?: string; printCount?: number; status?: string }

export interface RequestInput {
  type: FundType; subject: string; requesterDepartment?: string; requesterPhone?: string; beneficiaryType?: string; beneficiaryCode?: string; beneficiaryName?: string; beneficiaryIdNumber?: string;
  beneficiaryPhone?: string; registerCode?: string; deliveryMode?: string; wantedDate?: string; missionDestination?: string; missionStart?: string; missionEnd?: string; unplanned?: boolean;
  unplannedReason?: string; lines: RequestLine[]; attachments?: string; submit?: boolean; forecastNumber?: string; unplannedCode?: string;
}
export interface NeedInput { subject: string; department?: string; locationCode?: string; costCenter?: string; urgency?: string; wantedDate?: string; lines: Omit<NeedLine, "lineNo" | "totalAmount" | "transformedRequestNumber">[]; attachments?: string }
export interface Decision { comment?: string; reducedAmount?: number }
export interface Money { sessionNumber: string; amount?: number; signedByName?: string; signature?: string }
export interface ExpenseInput { expenseDate: string; natureCode: string; supplier?: string; designation: string; amount: number; vatAmount?: number; section?: string; documentReference?: string; honourStatement?: boolean; requestLineNo?: number; supplierCode?: string }

const F = `${API}/fund-requests`;
const N = `${API}/fund-needs`;
const enc = encodeURIComponent;
const list = <T,>(d: unknown): T[] => (Array.isArray(d) ? (d as T[]) : ((d as { data?: T[]; content?: T[] })?.data ?? (d as { content?: T[] })?.content ?? []));
const clean = <T extends object>(o: T): T => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== "" && v !== undefined && v !== null)) as T;
const blob = async (url: string) => (await apiClient.get(url, { responseType: "blob" })).data as Blob;

export const fundService = {
  // États de besoin
  async myNeeds(): Promise<Need[]> { return list<Need>((await apiClient.get(`${N}/mine`)).data); },
  async submittedNeeds(): Promise<Need[]> { return list<Need>((await apiClient.get(`${N}/submitted`)).data); },
  async need(n: string): Promise<Need> { return (await apiClient.get(`${N}/${enc(n)}`)).data; },
  async createNeed(b: NeedInput): Promise<Need> { return (await apiClient.post(N, clean(b))).data; },
  async updateNeed(n: string, b: NeedInput): Promise<Need> { return (await apiClient.put(`${N}/${enc(n)}`, clean(b))).data; },
  async submitNeed(n: string): Promise<Need> { return (await apiClient.patch(`${N}/${enc(n)}/submit`)).data; },
  async validateNeed(n: string, d?: Decision): Promise<Need> { return (await apiClient.patch(`${N}/${enc(n)}/validate`, d ? clean(d) : null)).data; },
  async rejectNeed(n: string, d: Decision): Promise<Need> { return (await apiClient.patch(`${N}/${enc(n)}/reject`, clean(d))).data; },
  async transformNeed(n: string, b: { type: FundType; lineNos?: number[]; registerCode?: string }): Promise<FundRequest> { return (await apiClient.post(`${N}/${enc(n)}/transform`, clean(b))).data; },
  async needSuggestions(n: string, limit?: number): Promise<LineSuggestion[]> { return list<LineSuggestion>((await apiClient.get(`${N}/${enc(n)}/supplier-suggestions`, { params: { limit } })).data); },
  async needPdf(n: string): Promise<Blob> { return blob(`${N}/${enc(n)}/pdf`); },

  // Demandes
  async mine(): Promise<FundRequest[]> { return list<FundRequest>((await apiClient.get(`${F}/mine`)).data); },
  async toApprove(): Promise<FundRequest[]> { return list<FundRequest>((await apiClient.get(`${F}/to-approve`)).data); },
  async toDisburse(registerCode?: string): Promise<FundRequest[]> { return list<FundRequest>((await apiClient.get(`${F}/to-disburse`, { params: { registerCode: registerCode || undefined } })).data); },
  async justificationsToValidate(): Promise<FundRequest[]> { return list<FundRequest>((await apiClient.get(`${F}/justifications-to-validate`)).data); },
  async all(status?: string): Promise<FundRequest[]> { return list<FundRequest>((await apiClient.get(F, { params: { status: status || undefined } })).data); },
  async advances(): Promise<AdvanceRow[]> { return list<AdvanceRow>((await apiClient.get(`${F}/advances`)).data); },
  async get(n: string): Promise<FundRequest> { return (await apiClient.get(`${F}/${enc(n)}`)).data; },
  async insight(n: string): Promise<Insight> { return (await apiClient.get(`${F}/${enc(n)}/insight`)).data; },
  async create(b: RequestInput): Promise<FundRequest> { return (await apiClient.post(F, clean(b))).data; },
  async update(n: string, b: RequestInput): Promise<FundRequest> { return (await apiClient.put(`${F}/${enc(n)}`, clean(b))).data; },
  async duplicate(n: string): Promise<FundRequest> { return (await apiClient.post(`${F}/${enc(n)}/duplicate`)).data; },
  async submit(n: string): Promise<FundRequest> { return (await apiClient.patch(`${F}/${enc(n)}/submit`)).data; },
  async cancel(n: string, d?: Decision): Promise<FundRequest> { return (await apiClient.patch(`${F}/${enc(n)}/cancel`, d ? clean(d) : null)).data; },
  async approve(n: string, d?: Decision): Promise<FundRequest> { return (await apiClient.patch(`${F}/${enc(n)}/approve`, d ? clean(d) : null)).data; },
  async reject(n: string, d: Decision): Promise<FundRequest> { return (await apiClient.patch(`${F}/${enc(n)}/reject`, clean(d))).data; },
  async sendBack(n: string, d: Decision): Promise<FundRequest> { return (await apiClient.patch(`${F}/${enc(n)}/send-back`, clean(d))).data; },
  async requestSuggestions(n: string, limit?: number): Promise<LineSuggestion[]> { return list<LineSuggestion>((await apiClient.get(`${F}/${enc(n)}/supplier-suggestions`, { params: { limit } })).data); },

  // Caisse
  async disburse(n: string, b: Money): Promise<FundRequest> { return (await apiClient.post(`${F}/${enc(n)}/disburse`, clean(b))).data; },
  async returnRemainder(n: string, b: Money): Promise<FundRequest> { return (await apiClient.post(`${F}/${enc(n)}/return`, clean(b))).data; },
  async complement(n: string, b: Money): Promise<FundRequest> { return (await apiClient.post(`${F}/${enc(n)}/complement`, clean(b))).data; },
  async linkTransfer(n: string, transferOrderNumber: string): Promise<FundRequest> { return (await apiClient.patch(`${F}/${enc(n)}/transfer`, { transferOrderNumber })).data; },

  // Justification
  async addExpense(n: string, b: ExpenseInput): Promise<FundRequest> { return (await apiClient.post(`${F}/${enc(n)}/expenses`, clean(b))).data; },
  async deleteExpense(n: string, line: string | number): Promise<FundRequest> { return (await apiClient.delete(`${F}/${enc(n)}/expenses/${enc(String(line))}`)).data; },
  async validateExpense(n: string, line: string | number): Promise<FundRequest> { return (await apiClient.patch(`${F}/${enc(n)}/expenses/${enc(String(line))}/validate`)).data; },
  async rejectExpense(n: string, line: string | number, reason: string): Promise<FundRequest> { return (await apiClient.patch(`${F}/${enc(n)}/expenses/${enc(String(line))}/reject`, { reason })).data; },

  // Délégations et reprise
  async delegations(): Promise<DelegationView[]> { return list<DelegationView>((await apiClient.get(`${F}/delegations`)).data); },
  async delegate(b: { delegate: string; level: number; startsOn: string; endsOn: string }): Promise<DelegationView> { return (await apiClient.post(`${F}/delegations`, b)).data; },
  async cancelDelegation(id: number): Promise<void> { await apiClient.delete(`${F}/delegations/${id}`); },
  async importLegacy(): Promise<Record<string, number>> { return (await apiClient.post(`${F}/import-legacy`)).data; },

  // Pièces imprimables et vérification publique
  async requestPdf(n: string): Promise<Blob> { return blob(`${F}/${enc(n)}/pdf`); },
  async disbursementPdf(n: string, movement: string): Promise<Blob> { return blob(`${F}/${enc(n)}/disbursements/${enc(movement)}/pdf`); },
  async justificationPdf(n: string): Promise<Blob> { return blob(`${F}/${enc(n)}/justification/pdf`); },
  async verify(n: string): Promise<Verification> { return (await apiClient.get(`/verify/voucher/${enc(n)}`)).data; },
};
