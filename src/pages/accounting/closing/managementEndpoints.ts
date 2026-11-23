import type { Endpoint } from "../../../components/accounting/EndpointConsole";
import { A, d, ep, n, q, req, t } from "../period/epHelpers";

const R = "ACCOUNTING_REPORT:READ";
const W = "ACCOUNTING_SETTINGS:MANAGE";
const year = req(t("year", "Exercice", { hint: "ex. 2026" }));
const fmt = (hint = "json, csv ou pdf") => q(t("format", "Format", { def: "json", hint }));
const date = q(d("date", "À la date du"));

export const MANAGEMENT_ENDPOINTS: Endpoint[] = [
  ep("GET", `${A}/management/dashboard`, "Tableau de bord financier", "Gestion", R, [date], { auto: true }),
  ep("GET", `${A}/management/ratios`, "Ratios", "Gestion", R, [date], { auto: true }),
  ep("GET", `${A}/management/sig`, "Soldes intermédiaires de gestion", "Gestion", R, [q(t("year", "Exercice")), fmt()]),
  ep("GET", `${A}/management/cash-forecast`, "Prévisionnel de trésorerie", "Gestion", R, [date, q(t("horizon", "Horizon", { def: "WEEKS", hint: "WEEKS (13 semaines) ou MONTHS (12 mois)" })), fmt()]),
];

export const TAX_ENDPOINTS: Endpoint[] = [
  ep("GET", `${A}/tax-result/{year}`, "Passage au résultat fiscal", "Résultat fiscal", R, [year, fmt()]),
  ep("POST", `${A}/tax-result/{year}/adjustments`, "Ajouter une réintégration / déduction", "Résultat fiscal", W, [year, t("kind", "Nature", { required: true, hint: "réintégration ou déduction (valeur du serveur)" }), t("code", "Code"), t("label", "Libellé"), t("accountNumber", "Compte"), n("amount", "Montant", { required: true }), t("comment", "Commentaire")]),
  ep("DELETE", `${A}/tax-result/adjustments/{id}`, "Supprimer une ligne saisie", "Résultat fiscal", W, [req(t("id", "Ligne (id)"))], { confirm: "Supprimer cette ligne ?" }),
  ep("POST", `${A}/tax-result/{year}/save`, "Arrêter le résultat fiscal", "Résultat fiscal", W, [year], { confirm: "Arrêter le résultat fiscal ? Il sert de base au report des déficits." }),
  ep("POST", `${A}/tax-result/{year}/post`, "Comptabiliser l'impôt dû", "Résultat fiscal", W, [year], { confirm: "Comptabiliser l'impôt dû ?" }),
  ep("PATCH", `${A}/accounts/{number}/non-deductible`, "Part non déductible d'un compte", "Résultat fiscal", "ACCOUNTING_ACCOUNT:CREATE", [req(t("number", "N° de compte")), n("rate", "Taux", { required: true })]),
  ep("GET", `${A}/liasse/{year}`, "Liasse (aperçu par feuillet)", "Liasse", R, [year, fmt("json, pdf ou xls")]),
  ep("POST", `${A}/liasse/{year}/finalize`, "Liasse définitive", "Liasse", W, [year], { confirm: "Produire la liasse définitive ?" }),
];
