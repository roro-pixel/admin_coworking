import type { Endpoint } from "../../../components/accounting/EndpointConsole";
import { A, b, d, ep, j, n, q, req, t } from "./epHelpers";

const R = "ACCOUNTING_REPORT:READ";
const W = "ACCOUNTING_SETTINGS:MANAGE";
const id = req(t("id", "Identifiant"));
const sched = req(t("id", "Échéancier (id)"));

export const DEFERRAL_REPORTS = ["revenue-detail", "expense-detail", "revenue-forecast", "billed-vs-recognized", "accruals", "pass-credits", "anomalies"];

export const DEFERRAL_ENDPOINTS: Endpoint[] = [
  ep("GET", `${A}/deferrals`, "Détail des 477 / 476 à une date", "Constatations", R, [q(req(t("kind", "Nature", { hint: "Valeur attendue par le serveur (produits / charges)" }))), q(d("date", "À la date du"))]),
  ep("GET", `${A}/deferrals/schedules/{id}`, "Fiche d'échéancier", "Constatations", R, [sched], { help: "Échéancier, événements, consommation et besoin mensuel." }),
  ep("POST", `${A}/deferrals/schedules/{id}/events`, "Événement sur un échéancier", "Constatations", W, [sched, t("type", "Type", { required: true }), d("date", "Date"), n("days", "Jours"), d("newDate", "Nouvelle date"), t("reason", "Motif")]),
  ep("POST", `${A}/deferrals/schedules/{id}/usage`, "Consommation (unités d'œuvre)", "Constatations", W, [sched, d("date", "Date", { required: true }), n("units", "Unités", { required: true }), t("sourceRef", "Référence source"), n("totalUnits", "Total d'unités")]),
  ep("PATCH", "/billing/documents/{number}/lines/{lineId}/service-period", "Période de service d'une ligne de facture", "Constatations", "BILLING:UPDATE", [req(t("number", "N° de document")), req(t("lineId", "Ligne (id)")), d("serviceStart", "Début de service"), d("serviceEnd", "Fin de service"), t("method", "Méthode"), t("reason", "Motif")]),

  ep("POST", `${A}/deferral-runs/preview`, "Traitement de fin de période : simulation", "Fin de période", W, [q(req(t("period", "Période", { hint: "ex. 2026-10" }))), q(t("kind", "Nature"))]),
  ep("POST", `${A}/deferral-runs`, "Traitement de fin de période : comptabiliser", "Fin de période", W, [q(req(t("period", "Période"))), q(t("kind", "Nature"))], { confirm: "Comptabiliser le traitement de fin de période ?" }),
  ep("GET", `${A}/deferrals/closing-check`, "Liste de clôture (constatations)", "Fin de période", R, [q(req(t("year", "Exercice")))]),
  ep("GET", `${A}/deferrals/controls`, "Contrôles", "Fin de période", R, undefined, { auto: true }),

  ep("GET", `${A}/accruals`, "Factures à établir / non parvenues", "À établir et non parvenues", R, [q(t("period", "Période"))], { auto: true }),
  ep("POST", `${A}/accruals`, "Créer une constatation", "À établir et non parvenues", W, [t("kind", "Nature", { required: true }), t("reference", "Référence"), t("thirdParty", "Tiers"), t("label", "Libellé"), t("accountNumber", "Compte"), t("sectionCode", "Section"), t("period", "Période", { required: true }), n("amount", "Montant", { required: true }), n("vatAmount", "TVA"), t("sourceType", "Type de source")]),
  ep("POST", `${A}/accruals/{id}/match`, "Rapprocher avec la pièce réelle", "À établir et non parvenues", W, [id, t("actualReference", "Pièce réelle"), n("actualAmount", "Montant réel")]),
  ep("POST", `${A}/accruals/{id}/post`, "Comptabiliser", "À établir et non parvenues", W, [id]),

  ...DEFERRAL_REPORTS.map((r) => ep("GET", `${A}/deferrals/reports/${r}`, `État : ${r}`, "États", R, [q(t("year", "Exercice")), q(d("date", "À la date du")), q(t("format", "Format", { def: "json" }))])),
];
void b; void j;
