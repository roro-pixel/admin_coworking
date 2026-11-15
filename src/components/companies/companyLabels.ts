import type { StatusStyle } from "../subscription/labels";
import type { CompanyIdentifierType, InvoiceLinkMode, OrganizationType } from "../../services/company.service";

export const ORG_TYPES: OrganizationType[] = [
  "SOCIETE",
  "ETABLISSEMENT",
  "ENTREPRENEUR_INDIVIDUEL",
  "PROFESSION_LIBERALE",
  "ASSOCIATION",
  "ONG",
  "INSTITUTION_PUBLIQUE",
];

export const ORG_TYPE_LABEL: Record<string, string> = {
  SOCIETE: "Société",
  ETABLISSEMENT: "Établissement",
  ENTREPRENEUR_INDIVIDUEL: "Entrepreneur individuel",
  PROFESSION_LIBERALE: "Profession libérale",
  ASSOCIATION: "Association",
  ONG: "ONG",
  INSTITUTION_PUBLIQUE: "Institution publique",
};

export const LEGAL_FORMS = ["SARL", "SARLU", "SA", "SAU", "SAS", "SASU", "SNC", "SCS", "SP", "SCOOP", "SCI"] as const;

export const IDENTIFIER_TYPES: CompanyIdentifierType[] = [
  "NIU",
  "RCCM",
  "ORDRE_PROFESSIONNEL",
  "RECEPISSE",
  "AGREMENT",
  "ACTE_CREATION",
  "CODE_ADMINISTRATIF",
  "AUTRE",
];

export const IDENTIFIER_LABEL: Record<string, string> = {
  NIU: "NIU",
  RCCM: "RCCM",
  ORDRE_PROFESSIONNEL: "N° d'inscription à l'ordre",
  RECEPISSE: "N° de récépissé",
  AGREMENT: "N° d'agrément",
  ACTE_CREATION: "Acte de création",
  CODE_ADMINISTRATIF: "Code administratif",
  AUTRE: "Autre",
};

/** Format attendu */
export const IDENTIFIER_HINT: Record<string, string> = {
  NIU: "Une lettre (P ou E) suivie de 15 chiffres",
  RCCM: "CG-BZV-01-2024-B12-00001 (l'ancien format CG/BZV/16 B 6261 est accepté)",
};

export const VAT_LABEL: Record<string, string> = { SUBJECT: "Assujettie à la TVA", EXEMPT: "Exonérée de TVA" };

export const COMPANY_STATUS: Record<string, StatusStyle> = {
  ACTIVE: { label: "Active", tone: "success" },
  BLOCKED: { label: "Bloquée", tone: "danger" },
  INACTIVE: { label: "Inactive", tone: "neutral" },
};

export const COMPANY_STATUS_FILTERS = [
  { value: "", label: "Toutes" },
  { value: "ACTIVE", label: "Actives" },
  { value: "BLOCKED", label: "Bloquées" },
] as const;

export const ROLE_LABEL: Record<string, string> = { OWNER: "Gérant", EMPLOYEE: "Employé" };

export const LINK_MODE_LABEL: Record<InvoiceLinkMode, string> = {
  AUTOMATIC: "Automatique",
  ON_CHOICE: "Au choix",
};

export const LINK_MODE_HINT: Record<InvoiceLinkMode, string> = {
  AUTOMATIC: "Toutes les factures du membre sont reliées d'office à l'organisation.",
  ON_CHOICE: "Le membre choisit à chaque fois : pour lui ou pour l'organisation.",
};

export const COMPANIES_KEY = "companies";

export const isCompanyCustomerId = (customerId?: string | null): boolean => !!customerId && customerId.includes("-COM-");

export const customerPath = (customerId: string): string =>
  isCompanyCustomerId(customerId) ? `/companies/${encodeURIComponent(customerId)}` : `/customers/${encodeURIComponent(customerId)}`;
