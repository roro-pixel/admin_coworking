import { apiClient } from "./api";
import { API } from "./pagination";

// Budget (BudgetController). Droits : BUDGET_REPORT:READ (lectures, simulation), BUDGET:PREPARE (versions, lignes, postes, circuit),
// BUDGET_FORECAST:MANAGE (prévisions), BUDGET:TRANSFER_REQUEST (virements). Les droits fins (consolider, approuver, geler…) sont vérifiés par le serveur.

export interface BudgetLine {
  id: number; itemCode?: string; itemLabel?: string; sectionCode?: string; annualAmount?: number; months?: number[]; controlLevel?: string; tolerancePct?: number;
  responsible?: string; frozen?: boolean; committed?: number; realized?: number; available?: number; consumptionPct?: number;
}
export interface Budget {
  id: number; fiscalYearCode?: string; version?: number; label?: string; status?: string; reason?: string; submittedBy?: string; consolidatedBy?: string; approvedBy?: string;
  approvedAt?: string; createdBy?: string; totalCharges?: number; totalProducts?: number; lines?: BudgetLine[];
}
export interface BudgetItem {
  code: string; label?: string; parentCode?: string | null; itemType?: string; responsible?: string; controlLevel?: string; tolerancePct?: number; controlAtParent?: boolean;
  status?: string; mergedInto?: string; accounts?: string[]; expenseItems?: string[]; natures?: string[];
}
export interface Forecast {
  id?: number; number?: string; itemCode?: string; sectionCode?: string; subject?: string; amount?: number; plannedMonth?: string; recurrence?: string; occurrences?: number;
  supplier?: string; responsible?: string; priority?: string; status?: string; realizedAmount?: number; remindedAt?: string; createdBy?: string; createdAt?: string;
}
export interface Transfer { id: number; fromLineId?: number; toLineId?: number; amount?: number; reason?: string; status?: string; requestedBy?: string; decidedBy?: string; decidedAt?: string; createdAt?: string }
export interface Spend { natureCode?: string; accountNumber?: string; sectionCode?: string; amount: number }
export interface LineImpact {
  lineId?: number; itemCode?: string; itemLabel?: string; sectionCode?: string; controlLevel?: string; budgeted?: number; committed?: number; realized?: number; available?: number;
  requested?: number; availableAfter?: number; status?: "GREEN" | "ORANGE" | "RED"; openForecasts?: string[];
}
export interface Impact { budgetActive?: boolean; lines: LineImpact[]; blocked?: boolean; unbudgeted: string[]; messages: string[] }
export interface Commitment { sourceType?: string; reference?: string; itemCode?: string; sectionCode?: string; amount?: number; open?: number; forecastNumber?: string; unplanned?: boolean; unplannedCode?: string; createdBy?: string; createdAt?: string; ageDays?: number }
export interface MonthRow { month?: string; budgeted?: number; realizedCumulative?: number; budgetedCumulative?: number }
export interface FollowUp { line: BudgetLine; months: MonthRow[]; projection?: number; projectedVariance?: number }
export interface ForecastRow { forecast: Forecast; overdue?: boolean; gap?: number }
export interface PlannedSplit { itemCode?: string; planned?: number; unplanned?: number; unplannedPct?: number; reasons?: Record<string, number> }

const B = `${API}/accounting/budget`;
const enc = encodeURIComponent;
const list = <T,>(d: any): T[] => (Array.isArray(d) ? d : (d?.data ?? d?.content ?? []));
const clean = <T extends object>(o: T): T => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== "" && v !== undefined && v !== null)) as T;
const unwrap = (d: any) => (d && d.data !== undefined && !Array.isArray(d) && d.id === undefined && d.code === undefined ? d.data : d);

export const budgetService = {
  async budgets(fiscalYearCode: string): Promise<Budget[]> { return list<Budget>((await apiClient.get(B, { params: { fiscalYearCode } })).data); },
  async budget(id: number): Promise<Budget> { const b: Budget = unwrap((await apiClient.get(`${B}/${id}`)).data); return { ...b, lines: b.lines ?? [] }; },
  async create(b: object): Promise<Budget> { return unwrap((await apiClient.post(B, clean(b))).data); },
  async addLine(id: number, b: object): Promise<BudgetLine> { return unwrap((await apiClient.post(`${B}/${id}/lines`, clean(b))).data); },
  async freeze(lineId: number, frozen: boolean): Promise<BudgetLine> { return unwrap((await apiClient.patch(`${B}/lines/${lineId}/freeze`, null, { params: { frozen } })).data); },
  async circuit(id: number, action: "submit" | "consolidate" | "approve" | "reject", reason?: string): Promise<Budget> {
    return unwrap((await apiClient.patch(`${B}/${id}/${action}`, reason ? { reason } : undefined)).data);
  },

  async items(): Promise<BudgetItem[]> { return list<BudgetItem>((await apiClient.get(`${B}/items`)).data); },
  async saveItem(b: object): Promise<BudgetItem> { return unwrap((await apiClient.post(`${B}/items`, clean(b))).data); },
  async itemDecision(code: string, decision: "approve" | "reject" | "close" | "reopen" | "merge", into?: string): Promise<BudgetItem> {
    return unwrap((await apiClient.patch(`${B}/items/${enc(code)}/${decision}`, null, { params: clean({ into }) })).data);
  },

  async forecasts(itemCode?: string): Promise<Forecast[]> { return list<Forecast>((await apiClient.get(`${B}/forecasts`, { params: clean({ itemCode }) })).data); },
  async createForecast(b: object): Promise<Forecast> { return unwrap((await apiClient.post(`${B}/forecasts`, clean(b))).data); },
  async updateForecast(number: string, b: object): Promise<Forecast> { return unwrap((await apiClient.put(`${B}/forecasts/${enc(number)}`, clean(b))).data); },
  async forecastStatus(number: string, status: string): Promise<Forecast> { return unwrap((await apiClient.patch(`${B}/forecasts/${enc(number)}/status`, null, { params: { status } })).data); },
  async unplannedReasons(): Promise<Record<string, unknown>[]> { return list<Record<string, unknown>>((await apiClient.get(`${B}/unplanned-reasons`)).data); },

  async transfers(): Promise<Transfer[]> { return list<Transfer>((await apiClient.get(`${B}/transfers`)).data); },
  async requestTransfer(b: object): Promise<Transfer> { return unwrap((await apiClient.post(`${B}/transfers`, clean(b))).data); },
  async decideTransfer(id: number, decision: "approve" | "reject"): Promise<Transfer> { return unwrap((await apiClient.patch(`${B}/transfers/${id}/${decision}`)).data); },

  async check(spends: Spend[], date?: string): Promise<Impact> {
    const d: any = unwrap((await apiClient.post(`${B}/check`, spends.map(clean), { params: clean({ date }) })).data);
    return { lines: [], unbudgeted: [], messages: [], ...d };
  },
  async followUp(fiscalYearCode: string, month?: string): Promise<FollowUp[]> { return list<FollowUp>((await apiClient.get(`${B}/reports/follow-up`, { params: clean({ fiscalYearCode, month }) })).data); },
  async commitments(): Promise<Commitment[]> { return list<Commitment>((await apiClient.get(`${B}/reports/commitments`)).data); },
  async forecastReport(): Promise<ForecastRow[]> { return list<ForecastRow>((await apiClient.get(`${B}/reports/forecasts`)).data); },
  async planned(): Promise<PlannedSplit[]> { return list<PlannedSplit>((await apiClient.get(`${B}/reports/planned`)).data); },
  async reserve(fiscalYearCode: string): Promise<Record<string, number>> { return unwrap((await apiClient.get(`${B}/reports/reserve`, { params: { fiscalYearCode } })).data); },
};
