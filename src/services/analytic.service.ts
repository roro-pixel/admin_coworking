import { apiClient } from "./api";
import { API } from "./pagination";

// Comptabilité analytique (AnalyticController).
// Droits : ANALYTIC_REPORT:READ (lectures), ANALYTIC_ITEM:CREATE (créer / proposer une section), ANALYTIC_SETTINGS:MANAGE (axes, règles, clés,
// répartition, validation / fermeture / fusion de sections), ANALYTIC:RECLASS (reclassement).
// Activation côté serveur : accounting.analytic.enabled.

export interface Axis { code: string; label?: string; requiredOn?: string; defaultSection?: string; sortOrder?: number; active?: boolean; sections?: number }
export interface Section {
  axisCode?: string; code: string; label?: string; parentCode?: string | null; family?: string; costBehavior?: string; auxiliary?: boolean; responsible?: string;
  validFrom?: string; validTo?: string; status?: string; mergedInto?: string; color?: string; sortOrder?: number; createdBy?: string; approvedBy?: string;
  accounts?: string[]; children?: Section[];
}
export interface KeyLine { sectionCode: string; percentage: number }
export interface AllocKey { code: string; label?: string; axisCode?: string; effectiveFrom?: string; lines?: KeyLine[] }
export interface Rule {
  id?: number; priority?: number; axisCode?: string; accountPrefix?: string; journalCode?: string; sourceType?: string; thirdParty?: string; sectionCode?: string;
  keyCode?: string; label?: string; active?: boolean; createdBy?: string; createdAt?: string;
}
export interface Distribution { id?: number; periodCode?: string; axisCode?: string; fromSection?: string; toSection?: string; keyCode?: string; amount?: number; createdBy?: string; createdAt?: string }
export interface Allocation { entryLineId?: number; axisCode?: string; sectionCode?: string; percentage?: number; amount?: number; origin?: string }
export interface Reclass { entryLineId: number; axisCode: string; fromSection: string; toSection: string; amount?: number; reason: string }
export interface BalanceLine { section?: string; label?: string; account?: string; debit?: number; credit?: number; balance?: number }
export interface DashboardRow { item?: string; label?: string; family?: string; period?: number; previousPeriod?: number; variancePercent?: number; averageThreeMonths?: number; drift?: number }
export interface Breakdown { key?: string; label?: string; amount?: number }
export interface ItemAnalysis {
  item?: string; label?: string; family?: string; costBehavior?: string; from?: string; to?: string; period?: number; yearToDate?: number; previousYearSamePeriod?: number;
  variancePercent?: number; projectionYearEnd?: number; monthly: { month?: string; amount?: number }[]; bySite: Breakdown[]; byCentre: Breakdown[]; bySupplier: Breakdown[]; byJournal: Breakdown[];
  detail: { date?: string; entryNumber?: string; journal?: string; label?: string; account?: string; thirdParty?: string; amount?: number }[]; alerts: string[];
}
export interface SectionResult { section?: string; label?: string; products?: number; directCharges?: number; distributedIn?: number; distributedOut?: number; margin?: number; result?: number }
export interface AnalyticResult { axis?: string; from?: string; to?: string; sections: SectionResult[]; total?: SectionResult }

const B = `${API}/accounting/analytic`;
const enc = encodeURIComponent;
const list = <T,>(d: any): T[] => (Array.isArray(d) ? d : (d?.data ?? d?.content ?? []));
const clean = <T extends object>(o: T): T => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== "" && v !== undefined && v !== null)) as T;
const unwrap = (d: any) => (d && d.data !== undefined && !Array.isArray(d) ? d.data : d);
type Range = { from: string; to: string };

export const analyticService = {
  async axes(): Promise<Axis[]> { return list<Axis>((await apiClient.get(`${B}/axes`)).data); },
  async saveAxis(b: object): Promise<Axis> { return unwrap((await apiClient.post(`${B}/axes`, clean(b))).data); },
  async sections(axis: string, includeClosed = false): Promise<Section[]> { return list<Section>((await apiClient.get(`${B}/axes/${enc(axis)}/sections`, { params: { includeClosed } })).data); },
  async pending(): Promise<Section[]> { return list<Section>((await apiClient.get(`${B}/sections/pending`)).data); },
  async createSection(axis: string, b: object): Promise<Section> { return unwrap((await apiClient.post(`${B}/axes/${enc(axis)}/sections`, clean(b))).data); },
  async updateSection(axis: string, code: string, b: object): Promise<Section> { return unwrap((await apiClient.patch(`${B}/axes/${enc(axis)}/sections/${enc(code)}`, clean(b))).data); },
  async sectionAction(axis: string, code: string, action: "approve" | "reject" | "close" | "reopen"): Promise<Section> {
    return unwrap((await apiClient.patch(`${B}/axes/${enc(axis)}/sections/${enc(code)}/${action}`)).data);
  },
  async mergeSection(axis: string, code: string, into: string, restate: boolean): Promise<Section> {
    return unwrap((await apiClient.patch(`${B}/axes/${enc(axis)}/sections/${enc(code)}/merge`, null, { params: { into, restate } })).data);
  },

  async rules(): Promise<Rule[]> { return list<Rule>((await apiClient.get(`${B}/rules`)).data); },
  async createRule(b: object): Promise<Rule> { return unwrap((await apiClient.post(`${B}/rules`, clean(b))).data); },
  async updateRule(id: number, b: object): Promise<Rule> { return unwrap((await apiClient.put(`${B}/rules/${id}`, clean(b))).data); },
  async deleteRule(id: number): Promise<void> { await apiClient.delete(`${B}/rules/${id}`); },

  async keys(): Promise<AllocKey[]> { return list<AllocKey>((await apiClient.get(`${B}/keys`)).data); },
  async saveKey(b: AllocKey): Promise<AllocKey> { return unwrap((await apiClient.post(`${B}/keys`, clean(b))).data); },
  async distribute(p: { periodCode: string; axisCode: string; keyCode: string }): Promise<Distribution[]> { return list<Distribution>((await apiClient.post(`${B}/distribution`, null, { params: p })).data); },
  async allocations(reference: string): Promise<Allocation[]> { return list<Allocation>((await apiClient.get(`${B}/entries/${enc(reference)}/allocations`)).data); },
  async reclass(b: Reclass): Promise<Allocation> { return unwrap((await apiClient.post(`${B}/reclass`, clean(b))).data); },

  async balance(axis: string, r: Range): Promise<BalanceLine[]> { return list<BalanceLine>((await apiClient.get(`${B}/reports/balance`, { params: { axis, ...r } })).data); },
  async control(axis: string, r: Range): Promise<Record<string, number>> { return unwrap((await apiClient.get(`${B}/reports/control`, { params: { axis, ...r } })).data); },
  async dashboard(r: Range): Promise<DashboardRow[]> { return list<DashboardRow>((await apiClient.get(`${B}/reports/dashboard`, { params: r })).data); },
  async item(item: string, r: Range): Promise<ItemAnalysis> {
    const d: any = unwrap((await apiClient.get(`${B}/reports/items/${enc(item)}`, { params: r })).data);
    return { monthly: [], bySite: [], byCentre: [], bySupplier: [], byJournal: [], detail: [], alerts: [], ...d };
  },
  async result(axis: string, r: Range): Promise<AnalyticResult> {
    const d: any = unwrap((await apiClient.get(`${B}/reports/result`, { params: { axis, ...r } })).data);
    return { sections: [], ...d };
  },
};
