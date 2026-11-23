import { apiClient } from "./api";
import { API } from "./pagination";

// Achats fournisseurs (PurchaseController) et suivi comptable des ventes (SalesAccountingController).
// Droits lus dans la doc : PURCHASE:READ, SUPPLIER:MANAGE, SUPPLIER_INVOICE:MANAGE, SUPPLIER_PAYMENT:MANAGE,
// PURCHASE_ORDER:MANAGE / :VALIDATE, ACCOUNTING_REPORT:READ, ACCOUNTING_LETTERING:MANUAL, ACCOUNTING_POSTING:REPLAY.

export interface Supplier {
  id?: number;
  code?: string;
  name?: string;
  niu?: string;
  rccm?: string;
  address?: string;
  phone?: string;
  email?: string;
  bankDetails?: string;
  paymentTermsDays?: number;
  accountNumber?: string;
  defaultAccount?: string;
  vatExempt?: boolean;
  withholdingRate?: number;
  withholdingAccount?: string;
  withholdingBase?: string;
  withholdingLabel?: string;
  inventorySupplierId?: number;
  status?: string;
  createdBy?: string;
  createdAt?: string;
}

export interface SupplierInvoice {
  id?: number;
  number?: string;
  kind?: string;
  supplierCode?: string;
  supplierReference?: string;
  invoiceDate?: string;
  dueDate?: string;
  orderNumber?: string;
  originalNumber?: string;
  subject?: string;
  totalHt?: number;
  totalVat?: number;
  totalTtc?: number;
  withholdingAmount?: number;
  netToPay?: number;
  paidAmount?: number;
  closeOrder?: boolean;
  documentRef?: string;
  status?: string;
  entryNumber?: string;
  payableAccount?: string;
  postedBy?: string;
  postedAt?: string;
  createdBy?: string;
  createdAt?: string;
}

export interface InvoiceLine {
  id?: number;
  lineNo?: number;
  designation?: string;
  natureCode?: string;
  accountNumber?: string;
  amountHt?: number;
  vatRate?: number;
  vatAmount?: number;
  vatAccount?: string;
  sectionCode?: string;
  orderLineNo?: number;
  quantity?: number;
  fixedAssetCode?: string;
  serviceStart?: string;
  serviceEnd?: string;
  recognitionMethod?: string;
}

export interface SupplierPayment {
  id?: number;
  invoiceNumber?: string;
  supplierCode?: string;
  paymentDate?: string;
  amount?: number;
  treasuryAccount?: string;
  journalCode?: string;
  reference?: string;
  entryNumber?: string;
  createdBy?: string;
  createdAt?: string;
}

export interface InvoiceView {
  invoice: SupplierInvoice;
  lines: InvoiceLine[];
  payments: SupplierPayment[];
  supplier?: Supplier;
}

export interface LineInput {
  designation?: string;
  quantity?: number;
  unitPrice?: number;
  natureCode?: string;
  accountNumber?: string;
  vatRate?: number;
  sectionCode?: string;
  orderLineNo?: number;
  fixedAssetCode?: string;
}

export interface InvoiceRequest {
  supplierCode?: string;
  supplierReference?: string;
  kind?: string;
  invoiceDate?: string;
  dueDate?: string;
  orderNumber?: string;
  originalNumber?: string;
  subject?: string;
  documentRef?: string;
  closeOrder?: boolean;
  withholdingAmount?: number;
  lines: LineInput[];
}

export interface PaymentRequest {
  amount?: number;
  date?: string;
  treasuryAccount?: string;
  journalCode?: string;
  reference?: string;
}

export interface PurchaseOrder {
  id?: number;
  number?: string;
  supplierCode?: string;
  needStatementNumber?: string;
  subject?: string;
  orderDate?: string;
  expectedDate?: string;
  sectionCode?: string;
  totalHt?: number;
  totalVat?: number;
  totalTtc?: number;
  invoicedHt?: number;
  status?: string;
  budgetCommitted?: boolean;
  validatedBy?: string;
  validatedAt?: string;
  cancelledBy?: string;
  cancelReason?: string;
  createdBy?: string;
  createdAt?: string;
}

export interface OrderLine {
  id?: number;
  lineNo?: number;
  designation?: string;
  quantity?: number;
  unitPrice?: number;
  natureCode?: string;
  accountNumber?: string;
  vatRate?: number;
  amountHt?: number;
  vatAmount?: number;
  sectionCode?: string;
  invoicedHt?: number;
  needLineNo?: number;
}

export interface OrderView {
  order: PurchaseOrder;
  lines: OrderLine[];
  supplier?: Supplier;
  invoices: SupplierInvoice[];
}

export interface OrderRequest {
  supplierCode?: string;
  subject?: string;
  orderDate?: string;
  expectedDate?: string;
  sectionCode?: string;
  lines: LineInput[];
}

export interface FromNeedRequest {
  needNumber?: string;
  supplierCode?: string;
  lineNos?: number[];
}

export interface Payable {
  number?: string;
  supplierCode?: string;
  supplierName?: string;
  supplierReference?: string;
  invoiceDate?: string;
  dueDate?: string;
  netToPay?: number;
  remaining?: number;
  daysLate?: number;
}

export interface StatementLine {
  date?: string;
  entryNumber?: string;
  journal?: string;
  label?: string;
  reference?: string;
  debit?: number;
  credit?: number;
  balance?: number;
}

export interface SupplierStatement {
  supplier?: Supplier;
  from?: string;
  to?: string;
  opening?: number;
  lines: StatementLine[];
  closing?: number;
}

export interface Withholding {
  invoiceNumber?: string;
  supplierCode?: string;
  supplierName?: string;
  niu?: string;
  supplierReference?: string;
  invoiceDate?: string;
  base?: number;
  rate?: number;
  amount?: number;
  account?: string;
}

export interface WithholdingStatement {
  period?: string;
  lines: Withholding[];
  total?: number;
  accountMovements?: Record<string, number>;
}

// ─── Comptabilité des ventes ───
export interface BatchResult {
  processed?: number;
  succeeded?: number;
  failed?: number;
  errors?: string[];
}

export interface InvoiceGap {
  documentNumber?: string;
  customerCode?: string;
  balanceDue?: number;
  accountingOpen?: number;
  difference?: number;
}

export interface SalesChecks {
  walletTotal?: number;
  account4191Balance?: number;
  walletDifference?: number;
  invoicesNotPosted?: number;
  paymentsNotPosted?: number;
  walletEntriesNotPosted?: number;
  invoiceGaps: InvoiceGap[];
}

export interface OpenLine {
  lineId?: number;
  entryNumber?: string;
  entryDate?: string;
  journalCode?: string;
  label?: string;
  reference?: string;
  thirdPartyCode?: string;
  debit?: number;
  credit?: number;
  remaining?: number;
  side?: "DEBIT" | "CREDIT";
}

export interface LetteringProposal {
  accountNumber?: string;
  thirdPartyCode?: string;
  debit?: OpenLine;
  credit?: OpenLine;
}

export interface PostingEvent {
  id?: number;
  eventType?: string;
  reference?: string;
  family?: string;
  eventDate?: string;
  payload?: string;
  status?: "PENDING" | "POSTED" | "UNBALANCED" | "FAILED" | "IGNORED";
  replay?: boolean;
  failureReason?: string;
  ruleCode?: string;
  ruleVersion?: number;
  entryNumber?: string;
  provisionalNumber?: string;
  shiftedNote?: string;
  attempts?: number;
  lastAttemptAt?: string;
  postedAt?: string;
  ignoredBy?: string;
  ignoredReason?: string;
  createdAt?: string;
}

const P = `${API}/accounting/purchases`;
const S = `${API}/accounting/sales`;
const enc = encodeURIComponent;
const list = <T,>(d: any): T[] => (Array.isArray(d) ? d : (d?.data ?? d?.content ?? []));
const unwrap = <T,>(d: any, key: string): T => (d && d[key] === undefined && d.data !== undefined ? d.data : d);
const clean = <T extends object>(o: T): T =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== "" && v !== undefined && v !== null)) as T;

export const purchaseService = {
  async suppliers(): Promise<Supplier[]> {
    return list<Supplier>((await apiClient.get(`${P}/suppliers`)).data);
  },
  async saveSupplier(s: Supplier): Promise<Supplier> {
    const d = (await apiClient.post(`${P}/suppliers`, clean(s))).data;
    return d?.data && !d.code ? d.data : d;
  },
  async supplierFromInventory(inventoryCode: string): Promise<Supplier> {
    const d = (await apiClient.post(`${P}/suppliers/from-inventory/${enc(inventoryCode)}`)).data;
    return d?.data && !d.code ? d.data : d;
  },
  async supplierStatement(code: string, p?: { from?: string; to?: string }): Promise<SupplierStatement> {
    const d = unwrap<SupplierStatement>((await apiClient.get(`${P}/suppliers/${enc(code)}/statement`, { params: clean(p ?? {}) })).data, "lines");
    return { ...d, lines: d?.lines ?? [] };
  },

  async invoices(): Promise<SupplierInvoice[]> {
    return list<SupplierInvoice>((await apiClient.get(`${P}/invoices`)).data);
  },
  async invoice(number: string): Promise<InvoiceView> {
    const d = unwrap<InvoiceView>((await apiClient.get(`${P}/invoices/${enc(number)}`)).data, "invoice");
    return { ...d, lines: d?.lines ?? [], payments: d?.payments ?? [] };
  },
  async createInvoice(r: InvoiceRequest): Promise<InvoiceView> {
    return unwrap<InvoiceView>((await apiClient.post(`${P}/invoices`, { ...clean(r), lines: r.lines.map(clean) })).data, "invoice");
  },
  async deleteInvoice(number: string): Promise<void> {
    await apiClient.delete(`${P}/invoices/${enc(number)}`);
  },
  async postInvoice(number: string): Promise<InvoiceView> {
    return unwrap<InvoiceView>((await apiClient.post(`${P}/invoices/${enc(number)}/post`)).data, "invoice");
  },
  async payInvoice(number: string, r: PaymentRequest): Promise<InvoiceView> {
    return unwrap<InvoiceView>((await apiClient.post(`${P}/invoices/${enc(number)}/pay`, clean(r))).data, "invoice");
  },

  async orders(): Promise<PurchaseOrder[]> {
    return list<PurchaseOrder>((await apiClient.get(`${P}/orders`)).data);
  },
  async order(number: string): Promise<OrderView> {
    const d = unwrap<OrderView>((await apiClient.get(`${P}/orders/${enc(number)}`)).data, "order");
    return { ...d, lines: d?.lines ?? [], invoices: d?.invoices ?? [] };
  },
  async createOrder(r: OrderRequest): Promise<OrderView> {
    return unwrap<OrderView>((await apiClient.post(`${P}/orders`, { ...clean(r), lines: r.lines.map(clean) })).data, "order");
  },
  async orderFromNeed(r: FromNeedRequest): Promise<OrderView> {
    return unwrap<OrderView>((await apiClient.post(`${P}/orders/from-need`, clean(r))).data, "order");
  },
  async validateOrder(number: string, reason?: string): Promise<OrderView> {
    return unwrap<OrderView>((await apiClient.patch(`${P}/orders/${enc(number)}/validate`, reason ? { reason } : undefined)).data, "order");
  },
  async cancelOrder(number: string, reason: string): Promise<OrderView> {
    return unwrap<OrderView>((await apiClient.patch(`${P}/orders/${enc(number)}/cancel`, { reason })).data, "order");
  },
  async orderPdf(number: string): Promise<Blob> {
    return (await apiClient.get(`${P}/orders/${enc(number)}/pdf`, { responseType: "blob" })).data;
  },

  async payables(until?: string): Promise<Payable[]> {
    return list<Payable>((await apiClient.get(`${P}/payables`, { params: clean({ until }) })).data);
  },
  async withholdings(period: string): Promise<WithholdingStatement> {
    const d = unwrap<WithholdingStatement>((await apiClient.get(`${P}/withholdings`, { params: { period } })).data, "lines");
    return { ...d, lines: d?.lines ?? [] };
  },
  async withholdingsCsv(period: string): Promise<Blob> {
    return (await apiClient.get(`${P}/withholdings/export`, { params: { period }, responseType: "blob" })).data;
  },
};

export const salesAccountingService = {
  async checks(limit?: number): Promise<SalesChecks> {
    const d = unwrap<SalesChecks>((await apiClient.get(`${S}/checks`, { params: clean({ limit }) })).data, "invoiceGaps");
    return { ...d, invoiceGaps: d?.invoiceGaps ?? [] };
  },
  async feed(): Promise<BatchResult> {
    const d = (await apiClient.post(`${S}/feed`)).data;
    return d?.data ?? d;
  },
  async autoLetter(): Promise<BatchResult> {
    const d = (await apiClient.post(`${S}/auto-letter`)).data;
    return d?.data ?? d;
  },
  async letteringProposals(p?: { accountNumber?: string; limit?: number }): Promise<LetteringProposal[]> {
    return list<LetteringProposal>((await apiClient.get(`${S}/lettering-proposals`, { params: clean(p ?? {}) })).data);
  },
  async status(reference: string): Promise<PostingEvent[]> {
    return list<PostingEvent>((await apiClient.get(`${S}/status/${enc(reference)}`)).data);
  },
};
