import type { TemplateBlock, TemplateContent, TemplateFamily, VersionStatus } from "../../services/documentTemplate.service";

export const DOMAIN_LABEL: Record<string, string> = {
  CASH: "Caisse",
  FUND: "Fonds",
  ACCOUNTING: "Comptabilité",
  BILLING: "Facturation",
  PAYMENT: "Paiements",
  BOOKING: "Réservations",
  SUBSCRIPTION: "Abonnements",
  WALLET: "Portefeuilles",
  DOMICILIATION: "Domiciliation",
  CONTRACT: "Contrats",
  DOCUMENT: "Documents",
  SECURITY: "Sécurité",
  SUPPORT: "Support",
  TASK: "Tâches",
  CRM: "CRM",
  CLIENT: "Clients",
  EVENT: "Événements",
  SYSTEM: "Système",
};

export const FAMILY_LABEL: Record<TemplateFamily, string> = { PDF: "Pièces PDF", EMAIL: "Courriels" };

export const STATUS_LABEL: Record<VersionStatus, string> = {
  DRAFT: "Brouillon",
  PUBLISHED: "Publiée",
  ARCHIVED: "Archivée",
};

export const PAGE_FORMAT_LABEL: Record<string, string> = {
  A4: "A4",
  A5_TWO_UP: "Deux A5 sur une feuille A4",
  A6: "A6",
};

export const PDF_BLOCKS: Record<string, string> = {
  HEADER: "En-tête de l'exploitant",
  TITLE: "Titre et numéro",
  FIELDS: "Grille de champs",
  LINES: "Tableau de lignes",
  TOTALS: "Total",
  TEXT: "Paragraphe",
  SIGNATURES: "Cases de signature",
  SECTIONS: "Toutes les sections",
  FOOTER: "Pied de page",
};

export const EMAIL_BLOCKS: Record<string, string> = {
  SUBJECT: "Objet",
  PREHEADER: "Aperçu de messagerie",
  TITLE: "Titre",
  GREETING: "Salutation",
  TEXT: "Paragraphe",
  DETAILS: "Tableau libellé / valeur",
  AMOUNT: "Montant",
  BUTTON: "Bouton",
  ATTACHMENT_NOTE: "Mention de pièce jointe",
  SIGNATURE: "Signature",
  LEGAL: "Mentions légales",
};

export const blockLabels = (family: TemplateFamily) => (family === "PDF" ? PDF_BLOCKS : EMAIL_BLOCKS);

/** Bloc neuf, avec seulement les options que l'éditeur sait envoyer. */
export const newBlock = (type: string): TemplateBlock => {
  switch (type) {
    case "HEADER":
      return { type, qr: true };
    case "TITLE":
      return { type, title: "", copyLabel: false };
    case "FIELDS":
      return { type, title: "", columns: 2, fields: [] };
    case "LINES":
      return { type, title: "", table: "" };
    case "TOTALS":
      return { type, label: "Total", words: false };
    case "TEXT":
      return { type, text: "" };
    case "SIGNATURES":
      return { type, boxes: [{ label: "" }] };
    case "SECTIONS":
      return { type, columns: 2 };
    case "FOOTER":
      return { type, text: "" };
    case "DETAILS":
      return { type, title: "", rows: [{ label: "", value: "" }] };
    case "AMOUNT":
      return { type, label: "", value: "" };
    case "BUTTON":
      return { type, label: "", url: "" };
    case "LEGAL":
      return { type };
    default:
      return { type, text: "" };
  }
};

/** Contenu de départ quand le modèle n'a ni brouillon ni version publiée. */
export const emptyContent = (family: TemplateFamily): TemplateContent =>
  family === "PDF"
    ? { pageFormat: "A4", copies: [], style: { accent: null }, blocks: [newBlock("HEADER"), newBlock("TITLE"), newBlock("SECTIONS"), newBlock("FOOTER")], fields: [], note: "" }
    : { blocks: [newBlock("SUBJECT"), newBlock("GREETING"), newBlock("TEXT"), newBlock("LEGAL")], note: "" };

/** Retire les valeurs vides que le serveur refuserait ou qui n'ont pas de sens. */
export const cleanContent = (family: TemplateFamily, c: TemplateContent): TemplateContent => {
  const out: TemplateContent = { blocks: c.blocks, note: c.note?.trim() ? c.note.trim() : undefined };
  if (family === "PDF") {
    out.pageFormat = c.pageFormat ?? "A4";
    out.copies = (c.copies ?? []).filter((x) => x.label.trim());
    out.style = c.style?.accent ? { accent: c.style.accent } : undefined;
    out.fields = c.fields ?? [];
  }
  return out;
};
