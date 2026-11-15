import { formatOpenValue, humanKey } from "../../subscription/promotions/promoLabels";

export { formatOpenValue, humanKey };

/** Télécharge un contenu reçu du backend sous le nom donné. */
export const saveBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

/** Date « jj/mm/aaaa » au format attendu par le backend (aaaa-mm-jj) depuis un champ date */
export const todayIso = () => new Date().toISOString().slice(0, 10);

/** Champs d'un objet de forme libre, sans en connaître les noms, hors ceux déjà montrés ailleurs. */
export const extraEntries = (row: Record<string, unknown>, skip: string[]): [string, unknown][] =>
  Object.entries(row).filter(([k, v]) => !skip.includes(k) && v !== null && v !== undefined && v !== "");

/** Libellés français des champs de réponses de forme libre dont le nom est connu par la documentation. */
export const FIELD_LABEL: Record<string, string> = {
  reconciliationNumber: "N° de rapprochement",
  date: "Date",
  currency: "Devise",
  ledgerAccountBalance: "Solde du compte ledger",
  availableCash: "Encaisse disponible",
  explanation: "Explication",
  checkNumber: "N° de contrôle",
  subjectType: "Type de sujet",
  subjectCode: "Code du sujet",
  result: "Résultat",
  freezeNumber: "N° de gel",
  walletNumber: "Portefeuille",
  authority: "Autorité",
  instructionReference: "Référence de l'instruction",
  instructionDate: "Date de l'instruction",
  rationale: "Justification",
  liftReference: "Référence de la levée",
  liftRationale: "Justification de la levée",
  requestedBy: "Demandée par",
  decidedBy: "Décidée par",
  ruleCode: "Règle",
  fullName: "Nom complet",
  birthYear: "Année de naissance",
  entries: "Entrées",
  brokenEntries: "Entrées rompues",
};

/** Valeur d'un champ ouvert : nombres au format français, le reste comme pour les autres réponses libres. */
export const formatFieldValue = (v: unknown): string => (typeof v === "number" ? v.toLocaleString("fr-FR") : formatOpenValue(v));
