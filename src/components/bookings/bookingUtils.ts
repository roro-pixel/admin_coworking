/* Aides de calcul de créneaux de la création de réservation */

export const toLocalDateTime = (datetimeLocal: string): string => {
  if (!datetimeLocal) return "";
  return datetimeLocal.length === 16 ? `${datetimeLocal}:00` : datetimeLocal.substring(0, 19);
};

export const snapToHalfHour = (datetimeLocal: string): string => {
  if (!datetimeLocal) return datetimeLocal;
  const [datePart, timePart] = datetimeLocal.slice(0, 16).split("T");
  const [h, m] = timePart.split(":").map(Number);
  const snappedM = m <= 0 ? 0 : m <= 30 ? 30 : 0;
  const snappedH = m > 30 ? (h + 1) % 24 : h;
  const newDate =
    m > 30 && h === 23
      ? (() => {
          const d = new Date(`${datePart}T12:00:00`);
          d.setDate(d.getDate() + 1);
          return d.toISOString().slice(0, 10);
        })()
      : datePart;
  return `${newDate}T${String(snappedH).padStart(2, "0")}:${String(snappedM).padStart(2, "0")}`;
};

export const addMinutesToLocalDatetime = (datetimeLocal: string, minutes: number): string => {
  if (!datetimeLocal) return "";
  const [datePart, timePart] = datetimeLocal.slice(0, 16).split("T");
  const [h, m] = timePart.split(":").map(Number);
  const totalMinutes = h * 60 + m + minutes;
  const newH = Math.floor(totalMinutes / 60) % 24;
  const newM = totalMinutes % 60;
  if (totalMinutes >= 24 * 60) {
    const date = new Date(`${datePart}T12:00:00`);
    date.setDate(date.getDate() + Math.floor(totalMinutes / (24 * 60)));
    const newDate = date.toISOString().slice(0, 10);
    return `${newDate}T${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}`;
  }
  return `${datePart}T${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}`;
};

export const DURATION_OPTIONS = [
  { value: 30, label: "30 min" },
  { value: 60, label: "1 heure" },
  { value: 90, label: "1h30" },
  { value: 120, label: "2 heures" },
  { value: 180, label: "3 heures" },
  { value: 240, label: "4 heures" },
  { value: 480, label: "8 heures" },
];

/** Traduit les erreurs de vérification de disponibilité en consignes lisibles. */
export const availabilityErrorMessage = (message: string): string => {
  if (
    message.includes("subscription") ||
    message.includes("abonnement") ||
    message.includes("no active subscription")
  ) {
    return (
      "Aucun abonnement actif pour ce client.\n\n" +
      "Actions possibles :\n" +
      "• Souscrire un abonnement\n" +
      "• Utiliser un pass\n" +
      '• Changer le mode de paiement en "Paiement direct"'
    );
  }
  if (message.includes("entitlement") || message.includes("solde") || message.includes("insufficient")) {
    return (
      "Solde de droits insuffisant pour cette réservation.\n\n" +
      "Actions possibles :\n" +
      "• Utiliser un autre mode de paiement\n" +
      "• Contacter l'administrateur pour un ajustement"
    );
  }
  if (
    message.includes("resource type") ||
    message.includes("resource group") ||
    message.includes("not covered")
  ) {
    return (
      "Cette ressource n'est pas couverte par votre abonnement/pass.\n\n" +
      `Type de ressource requis: ${message.match(/resourceType[:\s]*(\w+)/i)?.[1] || "?"}\n` +
      "Action possible : Changer de mode de paiement ou choisir une autre ressource"
    );
  }
  return message || "Erreur lors de la vérification de disponibilité.";
};

export const formatDuration = (minutes: number): string => {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h${m}` : `${h}h`;
};
