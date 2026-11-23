import type { Endpoint } from "../../../components/accounting/EndpointConsole";
import { A, b, d, ep, j, l, n, q, req, t } from "./epHelpers";

const R = "ACCOUNTING_REPORT:READ";
const W = "ACCOUNTING_SETTINGS:MANAGE";
const dn = req(t("documentNumber", "N° de document"));
const rid = req(t("id", "Identifiant"));
const code = req(t("code", "Code du risque"));

export const PROVISION_REPORTS = ["aging", "doubtful", "impairment-variation", "provision-variation", "risk-register", "contingent-liabilities", "losses", "tax-reintegrations", "indicators"];

export const RECEIVABLE_ENDPOINTS: Endpoint[] = [
  ep("GET", `${A}/receivables/aging`, "Balance âgée avec risque", "Suivi", R, [q(d("date", "À la date du")), q(t("segment", "Segment"))], { auto: true }),
  ep("GET", `${A}/receivables/controls`, "Contrôles", "Suivi", R, undefined, { auto: true }),
  ep("GET", `${A}/receivables/proposals`, "File de revue (propositions)", "Revue", R, undefined, { auto: true }),
  ep("POST", `${A}/receivables/proposals/{id}/decision`, "Décider sur une proposition", "Revue", W, [rid, t("decision", "Décision", { required: true }), d("postponedUntil", "Reporté jusqu'au"), t("reason", "Motif"), t("targetStatus", "Statut cible")]),
  ep("GET", `${A}/receivables/impairment-runs/preview`, "Ajustement : simulation", "Ajustement", R, [q(req(t("period", "Période")))]),
  ep("POST", `${A}/receivables/impairment-runs`, "Ajustement : passer", "Ajustement", W, [q(req(t("period", "Période")))], { confirm: "Passer l'ajustement des dépréciations ?" }),
  ep("GET", `${A}/receivables/write-offs`, "Décisions de passage en perte", "Pertes", R, undefined, { auto: true }),
  ep("POST", `${A}/receivables/write-offs`, "Préparer un passage en perte", "Pertes", W, [l("documentNumbers", "N° de documents", { required: true }), t("reason", "Motif", { required: true }), t("comment", "Commentaire"), l("justificationRefs", "Justificatifs"), b("vatRecovered", "TVA récupérée")]),
  ep("POST", `${A}/receivables/write-offs/{id}/approve`, "Approuver (seconde validation)", "Pertes", W, [rid]),
  ep("POST", `${A}/receivables/write-offs/{id}/reject`, "Rejeter", "Pertes", W, [rid]),
  ep("GET", `${A}/receivables/{documentNumber}`, "Fiche de créance", "Fiche de créance", R, [dn]),
  ep("POST", `${A}/receivables/{documentNumber}/classify`, "Classer", "Fiche de créance", W, [dn, t("status", "Statut", { required: true }), t("reason", "Motif"), d("date", "Date"), n("individualRate", "Taux individuel"), t("rateReason", "Motif du taux"), b("deductible", "Déductible")]),
  ep("POST", `${A}/receivables/{documentNumber}/back-to-normal`, "Retour en normal", "Fiche de créance", W, [dn, t("reason", "Motif"), d("date", "Date")]),
  ep("POST", `${A}/receivables/{documentNumber}/individual-rate`, "Taux individuel", "Fiche de créance", W, [dn, n("rate", "Taux", { required: true }), t("reason", "Motif")]),
];

export const RISK_ENDPOINTS: Endpoint[] = [
  ep("GET", `${A}/risks`, "Registre des risques", "Registre", R, [q(t("status", "Statut"))], { auto: true }),
  ep("GET", `${A}/risks/{code}`, "Fiche d'un risque", "Registre", R, [code]),
  ep("POST", `${A}/risks`, "Enregistrer un risque", "Registre", W, [j("$body", "Risque (JSON RiskRequest)", { required: true })], { help: "Corps JSON RiskRequest du contrat." }),
  ep("POST", `${A}/risks/{code}/valuations`, "Estimation", "Registre", W, [code, d("date", "Date"), n("amount", "Montant"), n("probability", "Probabilité"), t("reason", "Motif"), t("documentRef", "Pièce"), d("outflowDate", "Date de sortie")]),
  ep("POST", `${A}/risks/{code}/provision`, "Provision", "Registre", W, [code, t("kind", "Nature", { required: true }), n("amount", "Montant"), d("date", "Date"), t("reason", "Motif"), b("closeRisk", "Clore le risque")]),
  ep("POST", `${A}/risks/reclass-short-term`, "Reclasser à court terme", "Registre", W, [q(d("date", "À la date du"))]),
  ep("POST", `${A}/risks/retirement-obligations`, "Engagements de retraite", "Registre", W, [n("fiscalYear", "Exercice"), t("method", "Méthode"), t("assumptions", "Hypothèses", { type: "textarea" }), n("headcount", "Effectif"), n("amount", "Montant"), t("detail", "Détail", { type: "textarea" })]),
];

export const PROVISION_CLOSING: Endpoint[] = [
  ep("GET", `${A}/provisions/closing-check`, "Revue de clôture : contrôle", "Clôture", R, [q(req(t("year", "Exercice")))]),
  ep("POST", `${A}/provisions/reviews`, "Ouvrir la revue de clôture", "Clôture", W, [n("fiscalYear", "Exercice", { required: true }), t("summary", "Synthèse", { type: "textarea" })]),
  ep("POST", `${A}/provisions/reviews/{id}/validate`, "Valider la revue", "Clôture", W, [rid]),
  ...PROVISION_REPORTS.map((r) => ep("GET", `${A}/provisions/reports/${r}`, `État : ${r}`, "États", R, [q(t("year", "Exercice")), q(d("date", "À la date du")), q(t("segment", "Segment")), q(t("format", "Format", { def: "json" }))])),
];
