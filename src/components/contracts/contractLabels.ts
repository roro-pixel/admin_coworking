import {
  Ban,
  CheckCircle,
  Clock,
  FileText,
  Pause,
  Play,
  StopCircle,
  Upload,
  XCircle,
} from "lucide-react";
import type { ElementType } from "react";
import { statusOf } from "../subscription/labels";
import type { StatusStyle } from "../subscription/labels";

export { statusOf };

export const CONTRACT_STATUS: Record<string, StatusStyle> = {
  DRAFT: { label: "Brouillon", tone: "neutral" },
  GENERATED: { label: "Généré", tone: "info" },
  UNDER_REVIEW: { label: "En relecture", tone: "warn" },
  AWAITING_SIGNATURE: { label: "Attente signature", tone: "pink" },
  SIGNED: { label: "Signé", tone: "success" },
  ACTIVE: { label: "Actif", tone: "success" },
  SUSPENDED: { label: "Suspendu", tone: "danger" },
  AMENDED: { label: "Avenanté", tone: "success" },
  TERMINATED: { label: "Résilié", tone: "neutral" },
  EXPIRED: { label: "Expiré", tone: "neutral" },
  CANCELLED: { label: "Annulé", tone: "neutral" },
};

export const OWNER_TYPE_LABELS: Record<string, string> = {
  MEMBER: "Membre",
  CUSTOMER: "Customer",
  BUSINESS: "Business",
};

export const RENEWAL_LABELS: Record<string, string> = {
  FIXED_TERM: "Durée déterminée",
  AUTO_RENEW: "Renouvellement automatique",
  NONE: "Aucun renouvellement",
};

export const OWNER_TYPE_CHOICES = [
  { value: "MEMBER", label: "Membre", description: "Contrat avec un membre individuel" },
  { value: "CUSTOMER", label: "Customer", description: "Contrat avec un customer" },
  { value: "BUSINESS", label: "Business", description: "Contrat avec une entreprise" },
];

export const RENEWAL_CHOICES = [
  { value: "FIXED_TERM", label: "Durée déterminée", description: "Se termine à une date précise" },
  { value: "AUTO_RENEW", label: "Renouvellement automatique", description: "Se renouvelle automatiquement" },
  { value: "NONE", label: "Aucun renouvellement", description: "Pas de renouvellement" },
];

export const PARTY_ROLES: Record<string, { label: string; tone: "pink" | "success" | "info" | "neutral" }> = {
  SIGNATORY: { label: "Signataire", tone: "success" },
  BENEFICIARY: { label: "Bénéficiaire", tone: "info" },
  OPERATOR: { label: "Opérateur", tone: "neutral" },
  BILLING_CONTACT: { label: "Contact facturation", tone: "pink" },
};

/** Rôles proposés à l'ajout d'une partie  */
export const PARTY_ROLE_CHOICES = ["SIGNATORY", "BENEFICIARY", "OPERATOR"];

export const PARTY_TYPE_CHOICES = [
  { value: "MEMBER", label: "Membre" },
  { value: "CUSTOMER", label: "Customer" },
  { value: "BUSINESS", label: "Business" },
];

export const DRAFT_STATUS: Record<string, StatusStyle> = {
  DRAFTING: { label: "En rédaction", tone: "warn" },
  READY: { label: "Prêt", tone: "success" },
  GENERATED: { label: "Généré", tone: "info" },
};

/** Statuts d'un avenant. */
export const AMENDMENT_STATUS: Record<string, StatusStyle> = {
  DRAFT: { label: "En rédaction", tone: "neutral" },
  UNDER_REVIEW: { label: "En examen", tone: "warn" },
  PENDING_SIGNATURE: { label: "Attente signature", tone: "pink" },
  ACTIVE: { label: "Appliqué", tone: "success" },
  REJECTED: { label: "Refusé", tone: "danger" },
  CANCELLED: { label: "Annulé", tone: "neutral" },
};

/** Nature d'une version dans l'historique d'un contrat. */
export const VERSION_KIND: Record<string, string> = {
  ORIGINAL: "Original",
  AMENDMENT: "Avenant",
  EXTENSION: "Prolongation",
};

export const SECTION_TYPE_LABELS: Record<string, string> = {
  PREAMBLE: "Préambule",
  ARTICLE: "Article",
  CLAUSE: "Clause",
  SIGNATURE_BLOCK: "Bloc de signature",
  ANNEXE: "Annexe",
};

export const TEMPLATE_CATEGORIES: Record<string, string> = {
  COWORKING: "Coworking",
  MEMBERSHIP: "Adhésion",
  SERVICE: "Service",
  LEGAL: "Juridique",
  OTHER: "Autre",
};

export type ContractActionKey =
  | "generate"
  | "under_review"
  | "awaiting_signature"
  | "attach_signed"
  | "activate"
  | "suspend"
  | "terminate"
  | "cancel"
  | "approve_review"
  | "reject_review";

export interface ContractAction {
  action: ContractActionKey;
  label: string;
  icon: ElementType;
  tone: "neutral" | "pink" | "success" | "danger";
}

/** Actions de cycle de vie disponibles selon le statut (table de transitions du serveur). */
export const actionsFor = (status: string): ContractAction[] => {
  const a: ContractAction[] = [];
  if (status === "DRAFT") {
    a.push({ action: "generate", label: "Générer le PDF", icon: FileText, tone: "pink" });
    a.push({ action: "under_review", label: "Mettre en relecture", icon: Clock, tone: "pink" });
  }
  if (status === "GENERATED") {
    a.push({ action: "generate", label: "Régénérer le PDF", icon: FileText, tone: "neutral" });
    a.push({ action: "approve_review", label: "Approuver", icon: CheckCircle, tone: "success" });
    a.push({ action: "under_review", label: "Mettre en relecture", icon: Clock, tone: "pink" });
    a.push({ action: "attach_signed", label: "Joindre la copie signée", icon: Upload, tone: "pink" });
  }
  if (status === "UNDER_REVIEW") {
    a.push({ action: "generate", label: "Régénérer le PDF", icon: FileText, tone: "neutral" });
    a.push({ action: "approve_review", label: "Approuver", icon: CheckCircle, tone: "success" });
    a.push({ action: "reject_review", label: "Renvoyer en correction", icon: XCircle, tone: "danger" });
    a.push({ action: "attach_signed", label: "Joindre la copie signée", icon: Upload, tone: "pink" });
  }
  if (status === "AWAITING_SIGNATURE") {
    a.push({ action: "generate", label: "Régénérer le PDF", icon: FileText, tone: "neutral" });
    a.push({ action: "attach_signed", label: "Joindre la copie signée", icon: Upload, tone: "pink" });
  }
  if (status === "SIGNED" || status === "SUSPENDED") {
    a.push({ action: "activate", label: "Activer", icon: Play, tone: "success" });
  }
  if (status === "ACTIVE") {
    a.push({ action: "suspend", label: "Suspendre", icon: Pause, tone: "neutral" });
  }
  if (["ACTIVE", "SUSPENDED", "AMENDED"].includes(status)) {
    a.push({ action: "terminate", label: "Résilier", icon: StopCircle, tone: "danger" });
  }
  if (["DRAFT", "GENERATED", "UNDER_REVIEW", "AWAITING_SIGNATURE", "SIGNED", "SUSPENDED"].includes(status)) {
    a.push({ action: "cancel", label: "Annuler le contrat", icon: Ban, tone: "danger" });
  }
  return a;
};

/** Le serveur supprime sans contrôle de statut : on réserve le bouton aux contrats brouillon ou annulés. */
export const canDelete = (status: string): boolean => status === "DRAFT" || status === "CANCELLED";

/** Statuts où la fiche peut encore être modifiée en place. */
export const canEdit = (status: string): boolean => ["DRAFT", "GENERATED", "UNDER_REVIEW", "AWAITING_SIGNATURE"].includes(status);

/** Titre et libellé de bouton des panneaux de motif */
export const REASON_COPY: Partial<Record<ContractActionKey, { title: string; submit: string; required: boolean }>> = {
  suspend: { title: "Suspendre le contrat", submit: "Suspendre", required: true },
  terminate: { title: "Résilier le contrat", submit: "Résilier", required: true },
  cancel: { title: "Annuler le contrat", submit: "Annuler le contrat", required: false },
  approve_review: { title: "Approuver le contrat", submit: "Approuver", required: false },
  reject_review: { title: "Renvoyer en correction", submit: "Renvoyer", required: true },
};

export const SUCCESS_MESSAGE: Record<ContractActionKey, string> = {
  generate: "PDF généré",
  under_review: "Contrat mis en relecture",
  awaiting_signature: "Contrat en attente de signature",
  attach_signed: "Document signé rattaché",
  activate: "Contrat activé",
  suspend: "Contrat suspendu",
  terminate: "Contrat résilié",
  cancel: "Contrat annulé",
  approve_review: "Contrat approuvé",
  reject_review: "Contrat renvoyé en correction",
};

export const ERROR_MESSAGE: Record<ContractActionKey, string> = {
  generate: "Erreur lors de la génération du PDF.",
  under_review: "Erreur lors du changement de statut.",
  awaiting_signature: "Erreur lors du changement de statut.",
  attach_signed: "Erreur lors du rattachement.",
  activate: "Erreur lors de l'activation.",
  suspend: "Erreur lors de la suspension.",
  terminate: "Erreur lors de la résiliation.",
  cancel: "Erreur lors de l'annulation.",
  approve_review: "Erreur lors de l'approbation de la revue.",
  reject_review: "Erreur lors du rejet de la revue.",
};
