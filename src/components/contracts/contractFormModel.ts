import type {
  ContractParty,
  ContractPartyResponse,
  ContractResponse,
  CreateContractRequest,
} from "../../services/contract.service";
import { dateOnly } from "./contractUtils";

export interface PartyDraft {
  partyType: string;
  partyCode: string;
  displayName: string;
  email: string;
  phone?: string;
  role: string;
  signOrder: number;
  mustSign: boolean;
}

export interface ContractFormValues {
  title: string;
  description: string;
  templateCode: string;
  ownerType: "MEMBER" | "CUSTOMER" | "BUSINESS";
  ownerCode: string;
  businessCode: string;
  renewalType: "NONE" | "FIXED_TERM" | "AUTO_RENEW";
  effectiveDate: string;
  startDate: string;
  endDate: string;
}

const today = () => new Date().toISOString().split("T")[0];

export const emptyContractForm = (): ContractFormValues => ({
  title: "",
  description: "",
  templateCode: "",
  ownerType: "MEMBER",
  ownerCode: "",
  businessCode: "",
  renewalType: "FIXED_TERM",
  effectiveDate: today(),
  startDate: today(),
  endDate: "",
});

/** Valeurs d'édition à partir d'un contrat existant (dates coupées avant le "T"). */
export const formFromContract = (c: ContractResponse): ContractFormValues => ({
  title: c.title ?? "",
  description: c.description ?? "",
  templateCode: c.templateCode ?? "",
  ownerType: (c.ownerType as ContractFormValues["ownerType"]) ?? "MEMBER",
  ownerCode: c.ownerCode ?? "",
  businessCode: c.businessCode ?? "",
  renewalType: (c.renewalType as ContractFormValues["renewalType"]) ?? "FIXED_TERM",
  effectiveDate: dateOnly(c.effectiveDate),
  startDate: dateOnly(c.startDate),
  endDate: dateOnly(c.endDate),
});

export const partiesFromContract = (parties?: ContractPartyResponse[]): PartyDraft[] =>
  (parties ?? []).map((p, i) => ({
    partyType: p.partyType,
    partyCode: p.partyCode,
    displayName: p.displayName,
    email: p.email ?? "",
    phone: p.phone,
    role: p.role,
    signOrder: p.signOrder ?? i + 1,
    mustSign: p.mustSign ?? p.role === "SIGNATORY",
  }));

export const validateContract = (
  v: ContractFormValues,
  parties: PartyDraft[],
): Record<string, string> => {
  const e: Record<string, string> = {};
  if (!v.title.trim()) e.title = "Le titre est requis";
  if (!v.templateCode) e.templateCode = "Veuillez sélectionner un template";
  if (!v.ownerCode) e.ownerCode = "Veuillez sélectionner un propriétaire";
  if (!v.effectiveDate) e.effectiveDate = "Date d'effet requise";
  if (!v.startDate) e.startDate = "Date de début requise";
  if (v.endDate && v.startDate && v.endDate < v.startDate) e.endDate = "La date de fin précède la date de début";
  if (parties.length === 0) e.parties = "Au moins une partie est requise";
  if (!parties.some((p) => p.role === "SIGNATORY")) e.parties = "Au moins un signataire est requis";
  return e;
};

export const buildContractRequest = (
  v: ContractFormValues,
  parties: PartyDraft[],
  createdBy: number,
): CreateContractRequest => ({
  title: v.title,
  description: v.description || undefined,
  templateCode: v.templateCode,
  ownerType: v.ownerType,
  ownerCode: v.ownerCode,
  businessCode: v.businessCode || undefined,
  renewalType: v.renewalType,
  effectiveDate: v.effectiveDate,
  startDate: v.startDate,
  endDate: v.endDate || undefined,
  createdBy,
  parties: parties.map((p, idx) => ({
    partyType: p.partyType as ContractParty["partyType"],
    partyCode: p.partyCode,
    displayName: p.displayName,
    email: p.email,
    phone: p.phone || undefined,
    role: p.role as ContractParty["role"],
    signOrder: idx + 1,
    mustSign: p.mustSign,
  })),
});
