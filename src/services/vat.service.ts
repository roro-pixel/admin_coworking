import { apiClient } from "./api";
import { API } from "./pagination";

// Déclarations de TVA (VatController). Droits : VAT_RETURN:READ / :PREPARE / :VALIDATE.

export interface VatReturn {
  id: number;
  periodCode?: string;
  startDate?: string;
  endDate?: string;
  regime?: string;
  collected?: number;
  deductible?: number;
  deductionProrata?: number;
  deductibleGross?: number;
  nonDeductible?: number;
  creditBroughtForward?: number;
  dueAmount?: number;
  creditCarriedForward?: number;
  revenue?: number;
  invoiceTaxTotal?: number;
  controlDifference?: number;
  pendingBalance?: number;
  detailJson?: string;
  status?: string;
  voucherNumber?: string;
  liquidationEntryNumber?: string;
  preparedBy?: string;
  preparedAt?: string;
  validatedBy?: string;
  validatedAt?: string;
  liquidatedBy?: string;
  liquidatedAt?: string;
}

export interface AccountAmount { account?: string; label?: string; amount?: number }
export interface CodeAmount { taxCode?: string; base?: number; tax?: number }
export interface DocumentTax {
  documentNumber?: string;
  documentType?: string;
  date?: string;
  customerName?: string;
  currency?: string;
  taxable?: number;
  vat?: number;
  extraTax?: number;
  taxXaf?: number;
  accountingTax?: number;
  difference?: number;
  event?: string;
  sealed?: boolean;
  fiscalNumber?: string;
}
export interface VatDetail {
  collected: AccountAmount[];
  deductible: AccountAmount[];
  byCode: CodeAmount[];
  documents: DocumentTax[];
  sealedTaxTotal?: number;
}

const BASE = `${API}/accounting/vat-returns`;
const list = <T,>(d: any): T[] => (Array.isArray(d) ? d : (d?.data ?? d?.content ?? []));
const one = (d: any): VatReturn => (d && d.id === undefined && d.data !== undefined ? d.data : d);

export const vatService = {
  async list(): Promise<VatReturn[]> {
    return list<VatReturn>((await apiClient.get(BASE)).data);
  },
  async get(id: number): Promise<VatReturn> {
    return one((await apiClient.get(`${BASE}/${id}`)).data);
  },
  async prepare(period: string): Promise<VatReturn> {
    return one((await apiClient.post(BASE, null, { params: { period } })).data);
  },
  async remove(id: number): Promise<void> {
    await apiClient.delete(`${BASE}/${id}`);
  },
  async detail(id: number): Promise<VatDetail> {
    const d: any = (await apiClient.get(`${BASE}/${id}/detail`)).data;
    const s = d?.collected || d?.documents ? d : (d?.data ?? d);
    return { collected: [], deductible: [], byCode: [], documents: [], ...s };
  },
  async validate(id: number): Promise<VatReturn> {
    return one((await apiClient.patch(`${BASE}/${id}/validate`)).data);
  },
  async liquidate(id: number): Promise<VatReturn> {
    return one((await apiClient.post(`${BASE}/${id}/liquidate`)).data);
  },
  async pdf(id: number): Promise<Blob> {
    return (await apiClient.get(`${BASE}/${id}/pdf`, { responseType: "blob" })).data;
  },
  async exportFile(id: number): Promise<Blob> {
    return (await apiClient.get(`${BASE}/${id}/export`, { responseType: "blob" })).data;
  },
};
