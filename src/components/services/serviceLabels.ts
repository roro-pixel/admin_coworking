import type { StatusStyle } from "../subscription/labels";

/** Libellés français des statuts, types et options des écrans Services et domiciliation. */

export const CONTRACT_STATUS: Record<string, StatusStyle> = {
  DRAFT: { label: "Brouillon", tone: "neutral" },
  PENDING_DOCUMENTS: { label: "Pièces à fournir", tone: "warn" },
  PENDING_SIGNATURE: { label: "Signature attendue", tone: "info" },
  PENDING_REGISTRATION: { label: "Enregistrement en cours", tone: "info" },
  ACTIVE: { label: "Actif", tone: "success" },
  SUSPENDED: { label: "Suspendu", tone: "warn" },
  TERMINATED: { label: "Résilié", tone: "neutral" },
  EXPIRED: { label: "Expiré", tone: "danger" },
};

/** Rang d'un statut dans le cycle d'ouverture : les statuts de fin comptent comme « actif passé ». */
export const CONTRACT_STEP_INDEX: Record<string, number> = {
  DRAFT: 0,
  PENDING_DOCUMENTS: 1,
  PENDING_SIGNATURE: 2,
  PENDING_REGISTRATION: 3,
  ACTIVE: 4,
  SUSPENDED: 4,
  TERMINATED: 4,
  EXPIRED: 4,
};

export const CONTRACT_FILTERS: { id: string; label: string }[] = [
  { id: "all", label: "Tous" },
  { id: "PENDING_DOCUMENTS", label: "Pièces à fournir" },
  { id: "PENDING_SIGNATURE", label: "Signature" },
  { id: "PENDING_REGISTRATION", label: "Enregistrement" },
  { id: "ACTIVE", label: "Actifs" },
  { id: "SUSPENDED", label: "Suspendus" },
  { id: "TERMINATED", label: "Résiliés" },
];

/** Seuls ces trois rythmes sont admis pour un contrat de domiciliation. */
export const DOMICILIATION_CYCLE_OPTIONS: { value: string; label: string }[] = [
  { value: "MONTHLY", label: "Mensuel" },
  { value: "QUARTERLY", label: "Trimestriel" },
  { value: "YEARLY", label: "Annuel" },
];

export const FORWARDING_MODE_LABEL: Record<string, string> = {
  HOLD: "Garde au centre",
  FORWARD: "Réexpédition",
  SCAN_AND_FORWARD: "Scan puis réexpédition",
  SCAN_ONLY: "Scan seulement",
};

export const FORWARDING_MODE_OPTIONS = Object.entries(FORWARDING_MODE_LABEL).map(([value, label]) => ({ value, label }));

export const CERTIFICATE_SCOPE_LABEL: Record<string, string> = {
  COMMERCIAL: "Commerciale",
  FISCAL: "Fiscale",
};

export const REGISTRATION_STATUS: Record<string, StatusStyle> = {
  PENDING: { label: "À déposer", tone: "warn" },
  SUBMITTED: { label: "Déposé", tone: "info" },
  REGISTERED: { label: "Enregistré", tone: "success" },
  REJECTED: { label: "Rejeté", tone: "danger" },
};

export const PAID_BY_LABEL: Record<string, string> = {
  COMPANY: "Le centre",
  CLIENT: "Le client",
};

export const MAIL_TYPE_LABEL: Record<string, string> = {
  LETTER: "Lettre",
  REGISTERED_LETTER: "Lettre recommandée",
  PARCEL: "Colis",
  ADMINISTRATIVE: "Courrier administratif",
  LEGAL_NOTICE: "Acte juridique",
  OTHER: "Autre",
};

export const MAIL_TYPE_OPTIONS = Object.entries(MAIL_TYPE_LABEL).map(([value, label]) => ({ value, label }));

export const MAIL_STATUS: Record<string, StatusStyle> = {
  RECEIVED: { label: "Reçu", tone: "warn" },
  NOTIFIED: { label: "Domicilié prévenu", tone: "info" },
  SCANNED: { label: "Scanné", tone: "success" },
  COLLECTED: { label: "Retiré", tone: "success" },
  FORWARDED: { label: "Réexpédié", tone: "success" },
  RETURNED: { label: "Retourné", tone: "neutral" },
  DESTROYED: { label: "Détruit", tone: "neutral" },
};

/** Statuts après lesquels plus aucune action n'est possible sur un courrier. */
export const MAIL_FINAL_STATUS = ["COLLECTED", "FORWARDED", "RETURNED", "DESTROYED"];

export const SERVICE_CATEGORY_LABEL: Record<string, string> = {
  DOMICILIATION: "Domiciliation",
  MAIL_HANDLING: "Gestion du courrier",
  PHONE_ANSWERING: "Standard téléphonique",
  STORAGE: "Stockage",
  MEETING_ROOM: "Salle de réunion",
  COWORKING_ACCESS: "Accès coworking",
  PRIVATE_OFFICE: "Bureau privé",
  ADMIN_SUPPORT: "Appui administratif",
  LEGAL_SUPPORT: "Appui juridique",
  ACCOUNTING_SUPPORT: "Appui comptable",
  IT_SUPPORT: "Support informatique",
  EVENT_SPACE: "Espace événementiel",
  PARKING: "Parking",
  LOCKER: "Casier",
  OTHER: "Autre",
};

export const SERVICE_CATEGORY_OPTIONS = Object.entries(SERVICE_CATEGORY_LABEL).map(([value, label]) => ({ value, label }));

export const DELIVERY_MODE_LABEL: Record<string, string> = {
  CONTINUOUS: "Continu",
  ON_DEMAND: "À la demande",
  SCHEDULED: "Planifié",
  METERED: "Au compteur",
};

export const DELIVERY_MODE_OPTIONS = Object.entries(DELIVERY_MODE_LABEL).map(([value, label]) => ({ value, label }));

export const SUBSCRIBED_SERVICE_STATUS: Record<string, StatusStyle> = {
  PENDING: { label: "En attente", tone: "warn" },
  ACTIVE: { label: "Actif", tone: "success" },
  SUSPENDED: { label: "Suspendu", tone: "warn" },
  TERMINATED: { label: "Résilié", tone: "neutral" },
};

/** Libellé d'un type d'événement de la piste d'audit d'un courrier. */
export const MAIL_EVENT_LABEL: Record<string, string> = {
  RECEIVED: "Réception",
  NOTIFIED: "Domicilié prévenu",
  SCANNED: "Scan",
  COLLECTED: "Retrait",
  FORWARDED: "Réexpédition",
  RETURNED: "Retour à l'expéditeur",
  DESTROYED: "Destruction",
};
