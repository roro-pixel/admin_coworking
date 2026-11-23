/* Erreurs de la facturation : on teste `reason` (code stable), jamais le texte du message. */

export const apiReason = (error: unknown): string | undefined =>
  (error as { response?: { data?: { reason?: string } } })?.response?.data?.reason;

export const apiStatus = (error: unknown): number | undefined =>
  (error as { response?: { status?: number } })?.response?.status;

/** Message utile pour un code connu ; le message du serveur (déjà en français) reste la base. */
export const REASON_HINT: Record<string, string> = {
  DEROGATION_EN_ATTENTE: "Une demande de dérogation est partie ou en attente d'approbation (centre d'approbation Facturation).",
  DEROGATION_MOTIF_REQUIS: "La remise dépasse la limite : indiquez le motif de dérogation.",
  DEROGATION_REFUSEE: "La dérogation a été refusée.",
  INVOICE_CHANGE: "La facture a été payée entre la demande et l'accord : passez par un avoir.",
  QUOTE_SIGNATURE: "Le devis a été révisé ou n'est plus en circuit : une nouvelle demande de signature est nécessaire.",
  PAYMENT_SCHEDULE: "Un échéancier actif existe déjà sur cette facture.",
  CUSTOMER_NO_EMAIL: "Ce client n'a pas d'adresse e-mail.",
  MOTIF_REQUIS: "Le motif est obligatoire.",
};

/** Message à afficher : celui du serveur, sinon l'aide liée au code, sinon le texte de repli. */
export const billingError = (error: unknown, fallback: string): string => {
  const data = (error as { response?: { data?: { message?: string; reason?: string } } })?.response?.data;
  if (data?.message) return data.message;
  if (data?.reason && REASON_HINT[data.reason]) return REASON_HINT[data.reason];
  return fallback;
};

/** Vrai si la remise dépasse la limite et qu'un motif de dérogation peut débloquer la demande. */
export const needsOverrideReason = (error: unknown): boolean => apiReason(error) === "DEROGATION_MOTIF_REQUIS";
