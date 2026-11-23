import { apiClient } from "./api";
import { API } from "./pagination";

// Immobilisations (FixedAssetController). Lecture : ACCOUNTING_REPORT:READ ; toute écriture : ACCOUNTING_SETTINGS:MANAGE (tel qu'écrit dans la doc).
// Les actions renvoient la fiche complète (AssetView) à substituer à l'affichage.

type S = string | null;
export interface FixedAsset {
  id?: number; code?: string; parentId?: number; categoryCode?: string; targetCategoryCode?: S; designation?: string; brand?: S; model?: S; serialNumber?: S;
  quantity?: number; entryMode?: S; supplierCode?: S; supplierName?: S; supplierInvoiceNumber?: S; orderNumber?: S; fundRequestRef?: S; justificationRef?: S;
  entryNumber?: S; booked?: boolean; trackedOffBooks?: boolean; acquisitionDate?: S; receivedDate?: S; inServiceDate?: S; entryValue?: number; residualValue?: number;
  deductedVat?: number; accountingStatus?: S; operationalStatus?: S; operationalSince?: S; method?: S; durationMonths?: number; coefficient?: number; totalUnits?: number;
  taxMethod?: S; taxDurationMonths?: number; planVersion?: number; accumulatedDepreciation?: number; accumulatedImpairment?: number; accumulatedDerogatory?: number;
  subsidyAmount?: number; subsidyAccount?: S; subsidyReleased?: number; organisation?: S; site?: S; resourceCode?: S; locationLabel?: S; holder?: S; holderSince?: S;
  analyticSections?: S; warrantyEnd?: S; maintenanceContract?: S; maintenanceEnd?: S; insurer?: S; policyNumber?: S; insuredValue?: number; documentRefs?: S; photoRef?: S;
  qrActive?: boolean; labelPrintCount?: number; notes?: S; disposedOn?: S; createdBy?: S; createdAt?: S; updatedAt?: S; loanCode?: S;
}
export interface FaCategory {
  code: string; label?: string; assetAccount?: string; depreciationAccount?: string; expenseAccount?: string; impairmentAccount?: string; impairmentExpenseAccount?: string;
  impairmentReversalAccount?: string; disposalValueAccount?: string; disposalIncomeAccount?: string; method?: string; durationMonths?: number; coefficient?: number;
  annualRate?: number; threshold?: number; tracking?: string; trackOffBooks?: boolean; taxMethod?: string; taxDurationMonths?: number; componentTypes?: string;
  vatRecoverable?: boolean; inProgress?: boolean; active?: boolean;
}
export interface ValueLine { id?: number; lineType?: string; amount?: number; valueDate?: string; origin?: string; entryNumber?: string; createdBy?: string }
export interface Schedule { id?: number; kind?: string; version?: number; periodCode?: string; planned?: number; posted?: number; cumulative?: number; netValue?: number; status?: string; entryNumber?: string; note?: string }
export interface AssetEvent { id?: number; kind?: string; eventDate?: string; beforeValue?: string; afterValue?: string; reason?: string; amount?: number; voucherNumber?: string; entryNumber?: string; createdBy?: string }
export interface Disposal {
  id: number; assetId?: number; voucherNumber?: string; reason?: string; disposalDate?: string; grossValue?: number; accumulatedDepreciation?: number; accumulatedImpairment?: number;
  netValue?: number; price?: number; vatRate?: number; vatAmount?: number; gainLoss?: number; vatRegularization?: number; buyerName?: string; justificationRef?: string;
  status?: string; complementEntry?: string; exitEntry?: string; saleEntry?: string; collectedAmount?: number; indemnityAmount?: number; indemnityEntry?: string;
  preparedBy?: string; validatedBy?: string; validatedAt?: string; createdAt?: string;
}
export interface Impairment { id: number; kind?: string; impairmentDate?: string; indicator?: string; currentValue?: number; amount?: number; justificationRef?: string; status?: string; requestedBy?: string; approvedBy?: string; entryNumber?: string }
export interface Maintenance { id?: number; maintenanceDate?: string; kind?: string; provider?: string; contractRef?: string; cost?: number; underWarranty?: boolean; supplierInvoiceNumber?: string; description?: string }
export interface AssetView {
  asset: FixedAsset; category?: FaCategory; netValue?: number; analytic?: Record<string, string>; values: ValueLine[]; components: FixedAsset[]; suggestedComponents: string[];
  schedule: Schedule[]; events: AssetEvent[]; disposals: Disposal[]; impairments: Impairment[]; maintenance: Maintenance[]; inventoryAssets: string[]; warnings: string[];
}
export interface Finding { severity?: string; subject?: string; message?: string }
export interface DepreciationProfile { id: number; label?: string; categoryCode?: string; brand?: string; modelPattern?: string; method?: string; annualRate?: number; durationMonths?: number; coefficient?: number; residualRate?: number; priority?: number; active?: boolean; notes?: string }
export interface RunLine { assetCode?: string; designation?: string; categoryCode?: string; sections?: string; period?: string; amount?: number; catchUp?: boolean; estimated?: boolean }
export interface RunResult { period?: string; simulated?: boolean; assets?: number; total?: number; derogatory?: number; subsidyRelease?: number; entries: string[]; lines: RunLine[]; byCategory?: Record<string, number>; bySection?: Record<string, number>; warnings: string[] }
export interface Campaign {
  id?: number; code: string; label?: string; site?: string; resourceCodes?: string; categoryCodes?: string; team?: string; startDate?: string; endDate?: string; status?: string;
  expectedCount?: number; seenCount?: number; missingCount?: number; foundCount?: number; mislocatedCount?: number; missingCodes?: string; mislocatedCodes?: string; decisions?: string;
  witness?: string; voucherNumber?: string; openedBy?: string; closedBy?: string; createdAt?: string; closedAt?: string;
}
export interface Scan { id?: number; assetCode?: string; unregisteredLabel?: string; site?: string; resourceCode?: string; locationLabel?: string; photoRef?: string; mislocated?: boolean; holderAlert?: boolean; scannedBy?: string; scannedAt?: string }
export interface CampaignView { campaign: Campaign; scans: Scan[]; expected: string[]; seen: string[]; missing: string[]; mislocated: string[]; warnings: string[] }
export interface Plan { id?: number; version?: number; kind?: string; method?: string; durationMonths?: number; rate?: number; coefficient?: number; base?: number; validFrom?: string; reason?: string; createdBy?: string }
export interface PlanView { code?: string; kind?: string; versions: Plan[]; current: Schedule[]; history: Schedule[]; byYear?: Record<string, number> }
export interface Resolution { assetCode?: string; method?: string; durationMonths?: number; residualRate?: number; profile?: DepreciationProfile }

export interface AssetFilters { status?: string; category?: string; site?: string; resource?: string; holder?: string }
export type Body = Record<string, unknown>;

export const REPORTS: { code: string; label: string; needs: "date" | "year" | "none" }[] = [
  { code: "registry", label: "Fichier à une date", needs: "date" },
  { code: "note-3a", label: "Tableau des immobilisations (3A)", needs: "year" },
  { code: "note-3b", label: "Location-acquisition (3B)", needs: "year" },
  { code: "note-3c", label: "Tableau des amortissements (3C)", needs: "year" },
  { code: "note-3d", label: "Plus et moins-values (3D)", needs: "year" },
  { code: "impairments", label: "Dépréciations", needs: "year" },
  { code: "forecast", label: "Prévisionnel 12 mois et 5 exercices", needs: "date" },
  { code: "fully-depreciated", label: "Biens totalement amortis encore en service", needs: "date" },
  { code: "pending", label: "Biens en attente de mise en service et en cours", needs: "date" },
  { code: "warranties", label: "Garanties et contrats à échéance", needs: "date" },
  { code: "holders", label: "Biens par détenteur", needs: "date" },
  { code: "reconciliation", label: "Fichier et comptes 2x, 28x, 29x", needs: "date" },
  { code: "cost-by-resource", label: "Dotations par espace", needs: "year" },
];

const B = `${API}/accounting/fixed-assets`;
const enc = encodeURIComponent;
const list = <T,>(d: any): T[] => (Array.isArray(d) ? d : (d?.data ?? d?.content ?? []));
const clean = <T extends object>(o: T): T => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== "" && v !== undefined && v !== null)) as T;
const view = (d: any): AssetView => {
  const v = d?.asset ? d : (d?.data ?? d);
  return { values: [], components: [], suggestedComponents: [], schedule: [], events: [], disposals: [], impairments: [], maintenance: [], inventoryAssets: [], warnings: [], ...v };
};
const cview = (d: any): CampaignView => {
  const v = d?.campaign ? d : (d?.data ?? d);
  return { scans: [], expected: [], seen: [], missing: [], mislocated: [], warnings: [], ...v };
};
const blob = async (url: string, params?: object) => (await apiClient.get(url, { params, responseType: "blob" })).data as Blob;
const post = async (url: string, body?: unknown, params?: object) => (await apiClient.post(url, body, { params })).data;

export const fixedAssetService = {
  // Fichier
  async assets(f?: AssetFilters): Promise<FixedAsset[]> { return list<FixedAsset>((await apiClient.get(B, { params: clean(f ?? {}) })).data); },
  async asset(code: string): Promise<AssetView> { return view((await apiClient.get(`${B}/${enc(code)}`)).data); },
  async create(b: Body): Promise<AssetView> { return view(await post(B, clean(b))); },
  async update(code: string, b: Body): Promise<AssetView> { return view((await apiClient.patch(`${B}/${enc(code)}`, clean(b))).data); },
  async plan(code: string, kind?: string): Promise<PlanView> {
    const d: any = (await apiClient.get(`${B}/${enc(code)}/plan`, { params: clean({ kind }) })).data;
    return { versions: [], current: [], history: [], ...(d?.data ?? d) };
  },
  async profileFor(code: string): Promise<Resolution> { const d: any = (await apiClient.get(`${B}/${enc(code)}/depreciation-profile`)).data; return d?.data ?? d; },

  // Actions sur une fiche : path = commission, assignments, returns, transfers, reclassifications, revisions, impairments, maintenance, meter-readings,
  // operational-status, vat-regularizations, inventory-links, lease, components (corps = tableau).
  async act(code: string, path: string, body: unknown): Promise<AssetView> {
    return view(await post(`${B}/${enc(code)}/${path}`, Array.isArray(body) ? body.map((x) => clean(x)) : clean(body as object)));
  },
  async decideImpairment(id: number, approve: boolean): Promise<AssetView> { return view(await post(`${B}/impairments/${id}/decision`, { approve })); },

  // Sorties
  async dispose(code: string, b: Body): Promise<Disposal> { const d = await post(`${B}/${enc(code)}/disposals`, clean(b)); return d?.data ?? d; },
  async disposalStep(id: number, step: "validate" | "cancel" | "collections" | "indemnities", b?: Body): Promise<Disposal> {
    const d = await post(`${B}/disposals/${id}/${step}`, b ? clean(b) : undefined); return d?.data ?? d;
  },
  disposalPdf: (id: number) => blob(`${B}/disposals/${id}/pdf`),

  // Documents
  sheetPdf: (code: string) => blob(`${B}/${enc(code)}/sheet.pdf`),
  labelPdf: (code: string) => blob(`${B}/${enc(code)}/label.pdf`),
  commissionPdf: (code: string) => blob(`${B}/${enc(code)}/commission.pdf`),
  handoverPdf: (code: string) => blob(`${B}/${enc(code)}/handover.pdf`),
  async labels(codes: string[]): Promise<Blob> { return (await apiClient.post(`${B}/labels`, { codes }, { responseType: "blob" })).data; },

  // Catégories et profils
  async categories(): Promise<FaCategory[]> { return list<FaCategory>((await apiClient.get(`${B}/categories`)).data); },
  async saveCategory(c: Body): Promise<FaCategory> { const d = await post(`${B}/categories`, clean(c)); return d?.data ?? d; },
  async profiles(): Promise<DepreciationProfile[]> { return list<DepreciationProfile>((await apiClient.get(`${B}/depreciation-profiles`)).data); },
  async createProfile(b: Body): Promise<DepreciationProfile> { const d = await post(`${B}/depreciation-profiles`, clean(b)); return d?.data ?? d; },
  async updateProfile(id: number, b: Body): Promise<DepreciationProfile> { const d = (await apiClient.patch(`${B}/depreciation-profiles/${id}`, clean(b))).data; return d?.data ?? d; },
  async deactivateProfile(id: number): Promise<DepreciationProfile> { const d = await post(`${B}/depreciation-profiles/${id}/deactivate`); return d?.data ?? d; },

  // Dotations
  async previewRun(period: string): Promise<RunResult> { const d: any = (await apiClient.get(`${B}/depreciation-runs/preview`, { params: { period } })).data; return { entries: [], lines: [], warnings: [], ...(d?.data ?? d) }; },
  async run(period: string): Promise<RunResult> { const d: any = await post(`${B}/depreciation-runs`, undefined, { period }); return { entries: [], lines: [], warnings: [], ...(d?.data ?? d) }; },

  // Inventaires
  async campaigns(): Promise<Campaign[]> { return list<Campaign>((await apiClient.get(`${B}/inventories`)).data); },
  async campaign(code: string): Promise<CampaignView> { return cview((await apiClient.get(`${B}/inventories/${enc(code)}`)).data); },
  async createCampaign(b: Body): Promise<CampaignView> { return cview(await post(`${B}/inventories`, clean(b))); },
  async scan(code: string, b: Body): Promise<CampaignView> { return cview(await post(`${B}/inventories/${enc(code)}/scans`, clean(b))); },
  async closeCampaign(code: string, b?: Body): Promise<CampaignView> { return cview(await post(`${B}/inventories/${enc(code)}/close`, b ? clean(b) : undefined)); },
  campaignPdf: (code: string) => blob(`${B}/inventories/${enc(code)}/pdf`),

  // États et contrôles
  async report(report: string, p: { year?: number; date?: string; category?: string; site?: string; resource?: string; holder?: string }): Promise<unknown> {
    const d = (await apiClient.get(`${B}/reports/${enc(report)}`, { params: { ...clean(p), format: "json" } })).data;
    return d?.data ?? d;
  },
  reportFile: (report: string, format: "csv" | "pdf", p: { year?: number; date?: string }) => blob(`${B}/reports/${enc(report)}`, { ...clean(p), format }),
  async controls(date?: string): Promise<Finding[]> { return list<Finding>((await apiClient.get(`${B}/controls`, { params: clean({ date }) })).data); },
  async closingCheck(year: number): Promise<Finding[]> { return list<Finding>((await apiClient.get(`${B}/closing-check`, { params: { year } })).data); },
};
