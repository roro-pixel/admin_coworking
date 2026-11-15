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
