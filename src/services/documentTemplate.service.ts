import { apiClient } from "./api";
import { API } from "./pagination";

// Centre des modèles de documents et de courriels
// Droit SYSTEM:DOCUMENT_TEMPLATES (SUPER_ADMIN et ADMIN par défaut).
// La saisie des champs ajoutés sur une pièce suit les droits de la pièce.

export type TemplateFamily = "PDF" | "EMAIL";
export type VersionStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
export type PageFormat = "A4" | "A5_TWO_UP" | "A6";

export interface TemplateSummary {
  code: string;
  label: string;
  family: TemplateFamily;
  domain: string;
  active: boolean;
  publishedVersion: number | null;
  publishedAt: string | null;
  hasDraft: boolean;
}

export type TemplateBlock = { type: string } & Record<string, unknown>;

export interface TemplateCopy {
  label: string;
}

export interface AddedField {
  key: string;
  label: string;
  type: "TEXT" | "NUMBER" | "AMOUNT" | "DATE" | "LIST" | "CHECKBOX";
  mode: "PRINTED_BLANK" | "CAPTURED";
  required?: boolean;
  options?: string[];
  help?: string;
}

/** Contenu d'une version : corps de PUT .../draft et de POST .../preview. */
export interface TemplateContent {
  pageFormat?: PageFormat | null;
  copies?: TemplateCopy[] | null;
  style?: { accent?: string | null } | null;
  blocks: TemplateBlock[];
  fields?: AddedField[] | null;
  note?: string | null;
}

export interface TemplateVersion extends TemplateContent {
  versionNumber: number;
  status: VersionStatus;
  createdBy?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  publishedBy?: string | null;
  publishedAt?: string | null;
  archivedAt?: string | null;
}

export interface TemplateVersionSummary {
  versionNumber: number;
  status: VersionStatus;
  note?: string | null;
  createdBy?: string | null;
  createdAt?: string | null;
  publishedBy?: string | null;
  publishedAt?: string | null;
  archivedAt?: string | null;
}

export interface TemplateDetail {
  code: string;
  label: string;
  family: TemplateFamily;
  domain: string;
  fallbackTemplate?: string | null;
  description?: string | null;
  active: boolean;
  published: TemplateVersion | null;
  draft: TemplateVersion | null;
  versions: TemplateVersionSummary[];
}

export interface CatalogField {
  key: string;
  label: string;
  sample?: string | null;
}
export interface CatalogTable {
  key: string;
  title: string;
  columns: { key: string; label: string; numeric?: boolean }[];
}
export interface CatalogSigner {
  key: string;
  role: string;
}
export interface TemplateCatalog {
  code: string;
  fields: CatalogField[];
  tables?: CatalogTable[];
  signers?: CatalogSigner[];
  commonTokens?: string[];
  blockTypes?: string[];
  pageFormats?: string[];
  realPreview?: boolean;
  previewNumberHint?: string | null;
}

// ── Champs ajoutés saisis sur une pièce ──
export interface PieceField {
  key: string;
  blockKey?: string | null;
  label: string;
  type: AddedField["type"];
  mode: AddedField["mode"];
  required?: boolean;
  options?: string[] | null;
  help?: string | null;
  value?: string | number | boolean | null;
  enteredBy?: string | null;
  enteredAt?: string | null;
}
export interface PieceFields {
  templateCode: string;
  publishedVersion: number | null;
  sourceCode?: string | null;
  fields: PieceField[];
  missingRequired: string[];
}

const BASE = `${API}/document-templates`;
const enc = encodeURIComponent;
const list = <T,>(d: any): T[] => (Array.isArray(d) ? d : (d?.data ?? d?.content ?? []));
const one = <T,>(d: any): T => (d && d.data !== undefined && !Array.isArray(d) && d.code === undefined ? d.data : d);

/** Un aperçu en blob renvoie ses erreurs en blob : on relit le message JSON. */
const blobError = async (e: any): Promise<never> => {
  const b = e?.response?.data;
  if (b instanceof Blob) {
    try {
      const j = JSON.parse(await b.text());
      e.response.data = j;
    } catch {
      /* corps non JSON */
    }
  }
  throw e;
};

/** Code d'erreur métier (MODELE_INVALIDE, CHAMPS_A_SAISIR...) quand le serveur en donne un. */
export const errorCode = (e: unknown): string | undefined => {
  const d = (e as { response?: { data?: { errorCode?: string; code?: string } } })?.response?.data;
  return d?.errorCode ?? d?.code;
};

export const documentTemplateService = {
  async list(): Promise<TemplateSummary[]> {
    return list<TemplateSummary>((await apiClient.get(BASE)).data);
  },
  async get(code: string): Promise<TemplateDetail> {
    return one<TemplateDetail>((await apiClient.get(`${BASE}/${enc(code)}`)).data);
  },
  async getCatalog(code: string): Promise<TemplateCatalog> {
    return one<TemplateCatalog>((await apiClient.get(`${BASE}/${enc(code)}/fields/catalog`)).data);
  },
  async saveDraft(code: string, content: TemplateContent): Promise<TemplateVersion> {
    return (await apiClient.put(`${BASE}/${enc(code)}/draft`, content)).data;
  },
  async deleteDraft(code: string): Promise<void> {
    await apiClient.delete(`${BASE}/${enc(code)}/draft`);
  },
  /** PDF ; sans `number`, données d'exemple. Le corps facultatif est le contenu en cours d'édition. */
  async previewPdf(code: string, content?: TemplateContent, number?: string): Promise<Blob> {
    try {
      const r = await apiClient.post(`${BASE}/${enc(code)}/preview`, content ?? null, {
        params: number?.trim() ? { number: number.trim() } : undefined,
        responseType: "blob",
      });
      return r.data as Blob;
    } catch (e) {
      return blobError(e);
    }
  },
  /** HTML (text/html), à afficher dans un cadre isolé. */
  async previewEmail(code: string, content?: TemplateContent): Promise<string> {
    const r = await apiClient.post(`${BASE}/${enc(code)}/preview-email`, content ?? null, {
      responseType: "text",
      transformResponse: (d: unknown) => d,
    });
    return String(r.data ?? "");
  },
  async testSend(code: string): Promise<{ sentTo: string }> {
    return (await apiClient.post(`${BASE}/${enc(code)}/test-send`)).data;
  },
  async publish(code: string): Promise<TemplateDetail> {
    return one<TemplateDetail>((await apiClient.post(`${BASE}/${enc(code)}/publish`)).data);
  },
  async restore(code: string, version: number): Promise<TemplateDetail> {
    return one<TemplateDetail>((await apiClient.post(`${BASE}/${enc(code)}/restore/${version}`)).data);
  },
  async reset(code: string): Promise<TemplateDetail> {
    return one<TemplateDetail>((await apiClient.post(`${BASE}/${enc(code)}/reset`)).data);
  },
};

/** Champs ajoutés d'une pièce : chemins fixés par la doc, droits de la pièce. */
export const pieceFieldPaths = {
  cashMovement: (n: string) => `${API}/cash-registers/movements/${enc(n)}/fields`,
  fundNeed: (n: string) => `${API}/fund-needs/${enc(n)}/fields`,
  fundRequest: (n: string, justification?: boolean) =>
    `${API}/fund-requests/${enc(n)}/fields${justification ? "?template=JUSTIFICATION_SHEET" : ""}`,
  disbursement: (n: string, movement: string) =>
    `${API}/fund-requests/${enc(n)}/disbursements/${enc(movement)}/fields`,
};

export const pieceFieldService = {
  async get(path: string): Promise<PieceFields> {
    return (await apiClient.get(path)).data;
  },
  async save(path: string, values: Record<string, string | number | boolean | null>): Promise<PieceFields> {
    return (await apiClient.put(path, { values })).data;
  },
};

/** Lit le code et le message d'une erreur dont le corps est un blob (téléchargement de PDF). */
export const readPdfError = async (e: unknown): Promise<{ code?: string; message?: string }> => {
  const data = (e as { response?: { data?: unknown } })?.response?.data;
  try {
    const body = data instanceof Blob ? JSON.parse(await data.text()) : (data as Record<string, unknown> | undefined);
    return { code: (body?.errorCode ?? body?.code) as string | undefined, message: body?.message as string | undefined };
  } catch {
    return {};
  }
};
