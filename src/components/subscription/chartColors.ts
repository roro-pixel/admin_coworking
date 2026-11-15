/*
 * Couleurs des graphiques.
 * PRIMARY = rose du logo foncé : assez contrasté sur blanc pour porter une barre.
 * Les teintes d'état (succès, attente, danger) sont réservées aux statuts et
 * toujours accompagnées d'un libellé : jamais la couleur seule.
 */
export const CHART = {
  primary: "#8A4F6E",
  soft: "#C290AD",
  track: "#F3E7EE",
  success: "#059669",
  warn: "#D97706",
  danger: "#DC2626",
  info: "#0284C7",
  neutral: "#94A3B8",
} as const;

/** Couleurs claires : le texte posé dessus doit être foncé */
export const LIGHT_FILLS: string[] = [CHART.neutral, CHART.soft];
