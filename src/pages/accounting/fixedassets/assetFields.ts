import type { FieldDef } from "../../../components/accounting/ActionForm";

const d = (k: string, l: string, extra: Partial<FieldDef> = {}): FieldDef => ({ key: k, label: l, type: "date", ...extra });
const t = (k: string, l: string, extra: Partial<FieldDef> = {}): FieldDef => ({ key: k, label: l, ...extra });
const n = (k: string, l: string, extra: Partial<FieldDef> = {}): FieldDef => ({ key: k, label: l, type: "number", ...extra });
const b = (k: string, l: string): FieldDef => ({ key: k, label: l, type: "bool" });

/** Champs de création / complément d'une fiche (AssetRequest). */
export const ASSET_FIELDS: FieldDef[] = [
  t("categoryCode", "Catégorie", { required: true }), t("designation", "Désignation", { required: true }), t("brand", "Marque"), t("model", "Modèle"), t("serialNumber", "N° de série"),
  n("quantity", "Quantité"), t("entryMode", "Mode d'entrée", { hint: "Selon le serveur" }), n("entryValue", "Valeur d'entrée"), n("residualValue", "Valeur résiduelle"), n("deductedVat", "TVA déduite"),
  d("acquisitionDate", "Date d'acquisition"), d("receivedDate", "Date de réception"),
  t("supplierCode", "Fournisseur (code)"), t("supplierName", "Fournisseur (nom)"), t("supplierInvoiceNumber", "Facture fournisseur"), t("orderNumber", "Commande"),
  t("fundRequestRef", "Demande de fonds"), t("justificationRef", "Justificatif"), t("counterAccount", "Compte de contrepartie"), t("entryNumber", "Écriture existante"),
  t("organisation", "Organisation"), t("site", "Site"), t("resourceCode", "Espace (code)"), t("locationLabel", "Emplacement"),
  d("warrantyEnd", "Fin de garantie"), t("maintenanceContract", "Contrat de maintenance"), d("maintenanceEnd", "Fin de maintenance"),
  t("insurer", "Assureur"), t("policyNumber", "N° de police"), n("insuredValue", "Valeur assurée"), t("documentRefs", "Documents (références)"), t("photoRef", "Photo (référence)"),
  t("method", "Mode d'amortissement", { hint: "Selon le serveur" }), n("durationMonths", "Durée (mois)"), n("coefficient", "Coefficient"), n("totalUnits", "Unités totales"),
  t("taxMethod", "Mode fiscal"), n("taxDurationMonths", "Durée fiscale (mois)"), t("targetCategoryCode", "Catégorie cible (en-cours)"),
  { key: "inventoryAssetCodes", label: "Articles d'inventaire liés", type: "list", hint: "Codes séparés par des virgules" },
  b("trackedOffBooks", "Suivi hors bilan"), t("notes", "Notes", { type: "textarea" } as Partial<FieldDef>),
];

export interface ActionDef { id: string; label: string; path: string; fields: FieldDef[]; array?: boolean; hint?: string }

export const ACTIONS: ActionDef[] = [
  { id: "commission", label: "Mettre en service", path: "commission", fields: [d("date", "Date", { required: true }), t("site", "Site"), t("resourceCode", "Espace"), t("locationLabel", "Emplacement"), t("holder", "Détenteur"), t("organisation", "Organisation"), t("targetCategoryCode", "Catégorie cible"), t("notes", "Notes")] },
  { id: "assign", label: "Affecter", path: "assignments", fields: [d("date", "Date"), t("holder", "Détenteur", { required: true }), t("condition", "État"), t("accessories", "Accessoires")] },
  { id: "return", label: "Restituer", path: "returns", fields: [d("date", "Date"), t("holder", "Détenteur"), t("condition", "État"), t("accessories", "Accessoires")] },
  { id: "transfer", label: "Transférer", path: "transfers", fields: [d("date", "Date"), t("site", "Site"), t("resourceCode", "Espace"), t("locationLabel", "Emplacement"), t("organisation", "Organisation"), t("reason", "Motif")] },
  { id: "reclass", label: "Reclasser", path: "reclassifications", fields: [t("categoryCode", "Nouvelle catégorie", { required: true }), d("date", "Date"), t("reason", "Motif")] },
  { id: "revision", label: "Réviser le plan", path: "revisions", fields: [t("reason", "Motif", { required: true }), t("comment", "Commentaire"), n("durationMonths", "Durée (mois)"), n("residualValue", "Valeur résiduelle"), t("method", "Mode"), n("coefficient", "Coefficient"), n("totalUnits", "Unités totales"), t("taxMethod", "Mode fiscal"), n("taxDurationMonths", "Durée fiscale (mois)")] },
  { id: "impair", label: "Déprécier ou reprendre", path: "impairments", fields: [t("kind", "Nature", { hint: "Dépréciation ou reprise, selon le serveur", required: true }), d("date", "Date"), n("currentValue", "Valeur actuelle", { required: true }), t("indicator", "Indice de perte de valeur"), t("justificationRef", "Justificatif")] },
  { id: "maintenance", label: "Enregistrer un entretien", path: "maintenance", fields: [d("date", "Date"), t("kind", "Nature"), t("provider", "Prestataire"), t("contractRef", "Contrat"), n("cost", "Coût"), t("supplierInvoiceNumber", "Facture"), t("description", "Description")] },
  { id: "meter", label: "Relever les unités d'œuvre", path: "meter-readings", fields: [t("period", "Période", { required: true }), n("units", "Unités", { required: true })] },
  { id: "opstatus", label: "Changer l'état d'usage", path: "operational-status", fields: [t("status", "État", { required: true, hint: "Selon le serveur" }), d("date", "Date"), t("reason", "Motif")] },
  { id: "vat", label: "Régulariser la TVA", path: "vat-regularizations", fields: [d("date", "Date"), n("amount", "Montant"), t("reason", "Motif")] },
  { id: "invlink", label: "Lier à l'inventaire", path: "inventory-links", fields: [{ key: "inventoryCodes", label: "Codes d'inventaire", type: "list", required: true }, b("unlink", "Délier au lieu de lier")] },
  { id: "lease", label: "Rattacher à un emprunt", path: "lease", fields: [t("loanCode", "Code de l'emprunt", { required: true })] },
  { id: "components", label: "Découper en composants", path: "components", array: true, hint: "Un composant par ligne : désignation ; valeur ; durée (mois) ; catégorie ; mode", fields: [] },
];

export const DISPOSAL_FIELDS: FieldDef[] = [t("reason", "Motif", { required: true }), d("date", "Date", { required: true }), n("price", "Prix de cession"), n("vatRate", "Taux de TVA %"), t("buyerName", "Acheteur"), t("justificationRef", "Justificatif"), b("removeAmenity", "Retirer l'équipement de l'espace")];
export const COLLECT_FIELDS: FieldDef[] = [d("date", "Date"), n("amount", "Montant", { required: true }), t("treasuryAccount", "Compte de trésorerie"), t("journalCode", "Journal")];
export const INDEMNITY_FIELDS: FieldDef[] = [d("date", "Date"), n("amount", "Montant", { required: true }), t("insurerAccount", "Compte de l'assureur")];
