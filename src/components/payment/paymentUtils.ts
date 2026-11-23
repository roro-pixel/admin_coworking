import type { PaymentIntent } from "../../services/payment.service";

/** Déclenche le téléchargement d'un Blob (PDF) côté navigateur. */
export const saveBlob = (blob: Blob, fileName: string): void => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
};

/** Montant sans devise ni espace insécable pour les graphiques (ex. 4,85 M) */
export const compactAmount = (n: number): string => {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1).replace(".", ",")} M`;
  if (abs >= 1_000) return `${Math.round(n / 1_000)} k`;
  return String(n);
};

/** "XAF" est la devise technique, "FCFA" la devise affichée */
export const currencyLabel = (c?: string | null): string => (!c || c === "XAF" ? "FCFA" : c);

/**
 * Ce qu'on peut encaisser maintenant sur une intention : `payableAmount` du serveur,
 * sinon total - encaissé - en attente d'un opérateur.
 */
export const payableOf = (i: Pick<PaymentIntent, "amount" | "paidAmount" | "processingAmount" | "payableAmount">): number =>
  i.payableAmount ?? Math.max(0, i.amount - (i.paidAmount ?? 0) - (i.processingAmount ?? 0));

/** Une intention reçoit un encaissement si elle est PENDING ou PROCESSING et qu'il reste du payable. */
export const isPayableNow = (i: PaymentIntent): boolean =>
  (i.status === "PENDING" || i.status === "PROCESSING") && payableOf(i) > 0;

/**
 * Monnaie à rendre, même règle que le serveur :
 * `amount` absent → on encaisse le dû, plafonné au montant remis.
 */
export const computeChange = (
  due: number,
  tendered: number,
  amount?: number,
): { applied: number; change: number; remainingAfter: number; invalid: boolean } => {
  const applied = amount && amount > 0 ? amount : Math.min(tendered, due);
  const invalid = !!(amount && amount > 0 && tendered < amount);
  return {
    applied,
    change: Math.max(tendered - applied, 0),
    remainingAfter: Math.max(due - applied, 0),
    invalid,
  };
};

/** Copie un texte dans le presse-papiers ; renvoie false si le navigateur refuse. */
export const copyText = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};

/** Début de journée locale en instant ISO (paramètre `fromDate` des métriques de caisse). */
export const startOfDayIso = (yyyyMmDd: string): string =>
  new Date(`${yyyyMmDd}T00:00:00`).toISOString();

/** Fin de journée locale en instant ISO (paramètre `toDate` des métriques de caisse). */
export const endOfDayIso = (yyyyMmDd: string): string =>
  new Date(`${yyyyMmDd}T23:59:59.999`).toISOString();

/** Aujourd'hui moins `days` jours au format AAAA-MM-JJ (fuseau local). */
export const isoDay = (offsetDays = 0): string => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
};

/** Entier de FCFA saisi au clavier : ne garde que les chiffres. */
export const parseDigits = (raw: string): number => {
  const v = raw.replace(/\D/g, "");
  return v === "" ? 0 : parseInt(v, 10);
};
