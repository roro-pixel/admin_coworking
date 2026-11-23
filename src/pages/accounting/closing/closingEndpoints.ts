import type { Endpoint } from "../../../components/accounting/EndpointConsole";
import { A, b, d, ep, j, l, n, q, req, t } from "../period/epHelpers";

const R = "ACCOUNTING_REPORT:READ";
const W = "ACCOUNTING_SETTINGS:MANAGE";
const year = req(t("year", "Exercice", { hint: "ex. 2026" }));
const fmt = q(t("format", "Format", { def: "json", hint: "json, csv ou pdf" }));
const num = req(t("number", "N° de compte"));
const conf = req(t("number", "N° de confirmation"));

export const STATEMENT_TEMPLATES = ["BILAN", "COMPTE_RESULTAT"];

export const STATEMENT_ENDPOINTS: Endpoint[] = [
  ep("GET", `${A}/statements/balance-sheet`, "Bilan", "États financiers", R, [q(d("date", "À la date du")), fmt]),
  ep("GET", `${A}/statements/income-statement`, "Compte de résultat", "États financiers", R, [q(d("from", "Du")), q(d("to", "Au")), fmt]),
  ep("GET", `${A}/statements/cash-flow`, "Tableau des flux", "États financiers", R, [q(t("year", "Exercice")), fmt]),
  ep("GET", `${A}/statements/{template}/mappings`, "Correspondance des comptes", "Correspondance", R, [req(t("template", "Modèle", { def: "BILAN", hint: "BILAN ou COMPTE_RESULTAT" }))]),
  ep("POST", `${A}/statements/{template}/mappings`, "Ajouter une correspondance", "Correspondance", W, [req(t("template", "Modèle", { def: "BILAN" })), t("lineCode", "Poste", { required: true }), t("accountPrefix", "Préfixe de compte", { required: true }), t("balanceSide", "Sens du solde"), t("valueColumn", "Colonne")]),
  ep("DELETE", `${A}/statements/mappings/{id}`, "Supprimer une correspondance", "Correspondance", W, [req(t("id", "Identifiant"))], { confirm: "Supprimer cette correspondance ?" }),
  ep("PATCH", `${A}/entries/{reference}/cash-flow-code`, "Code flux d'une écriture", "Correspondance", "ACCOUNTING_ENTRY:CREATE", [req(t("reference", "Écriture")), t("code", "Code flux", { required: true })]),
  ep("PATCH", `${A}/posting-rules/{code}/cash-flow-code`, "Code flux d'une règle", "Correspondance", "ACCOUNTING_POSTING:REPLAY", [req(t("code", "Règle")), j("$body", "Corps JSON", { required: true, hint: '{"code":"..."}' })]),
];

export const CLOSING_ENDPOINTS: Endpoint[] = [
  ep("GET", `${A}/closing/{year}`, "Liste de clôture", "Clôture", R, [year], { help: "Contrôles automatiques, étapes à cocher, étapes bloquantes." }),
  ep("POST", `${A}/closing/{year}/steps/{step}`, "Cocher / décocher une étape", "Clôture", W, [year, req(t("step", "Étape", { hint: "ex. STAFF_ADVANCES, CASH_COUNT, STOCK_COUNT, CHEQUES" })), b("done", "Fait", { def: true }), t("comment", "Commentaire")]),
  ep("POST", `${A}/closing/{year}/steps/{step}/waive`, "Lever une étape", "Clôture", W, [year, req(t("step", "Étape")), t("reason", "Motif", { required: true })]),
  ep("GET", `${A}/closing/{year}/opening-preview`, "Simulation des à-nouveaux", "Clôture", R, [year]),
  ep("POST", `${A}/closing/{year}/close`, "Clôturer l'exercice", "Clôture", W, [year, t("derogation", "Dérogation")], { confirm: "Clôturer l'exercice ? Cette opération génère les à-nouveaux." }),
  ep("GET", `${A}/closing/{year}/editions`, "Éditions définitives", "Éditions", R, [year]),
  ep("POST", `${A}/closing/{year}/editions`, "Produire une édition définitive", "Éditions", W, [year, t("report", "État", { required: true, hint: "BILAN, COMPTE_RESULTAT ou TFT" }), t("derogation", "Dérogation")]),
  ep("GET", `${A}/closing/editions/{number}/pdf`, "PDF d'une édition", "Éditions", R, [conf], { blob: "edition.pdf" }),
  ep("GET", `${A}/closing/editions/{number}/verify`, "Vérifier l'empreinte", "Éditions", R, [conf]),
  ep("GET", `${A}/closing/{year}/notes`, "Notes annexes", "Notes annexes", R, [year], { help: "Montants N et N-1, texte et statut de validation." }),
  ep("PUT", `${A}/closing/{year}/notes/{note}`, "Rédiger une note", "Notes annexes", W, [year, req(t("note", "Code de la note")), t("body", "Texte", { type: "textarea" }), b("notApplicable", "Néant")]),
  ep("POST", `${A}/closing/{year}/notes/{note}/validate`, "Valider / invalider une note", "Notes annexes", W, [year, req(t("note", "Code de la note")), q(b("validate", "Valider", { def: true }))]),
  ep("GET", `${A}/closing/{year}/inventory-balance`, "Balance d'inventaire", "Justification des soldes", R, [year, fmt]),
  ep("GET", `${A}/closing/{year}/justification-file`, "Dossier de justification des soldes", "Justification des soldes", R, [year, fmt]),
  ep("GET", `${A}/accounts/{number}/balance-justification`, "Justificatif de solde", "Justification des soldes", R, [num, q(t("thirdParty", "Tiers")), q(d("date", "À la date du"))]),
  ep("POST", `${A}/accounts/{number}/balance-justification`, "Figer un justificatif", "Justification des soldes", "ACCOUNTING_ACCOUNT:CREATE", [num, t("thirdPartyCode", "Tiers"), d("date", "Date"), t("comment", "Commentaire")]),
  ep("PATCH", `${A}/balance-justifications/{id}/review`, "Revue d'un justificatif", "Justification des soldes", W, [req(t("id", "Justificatif (id)"))]),
  ep("GET", `${A}/accounts/{number}/collective`, "Justification d'un compte collectif", "Justification des soldes", R, [num, q(d("date", "À la date du"))]),
];

export const CONFIRMATION_ENDPOINTS: Endpoint[] = [
  ep("GET", `${A}/confirmations`, "Suivi des confirmations", "Confirmations de solde", R, undefined, { auto: true }),
  ep("POST", `${A}/confirmations`, "Préparer des confirmations", "Confirmations de solde", W, [t("accountNumber", "Compte", { required: true }), d("date", "Date"), n("top", "Les N premiers soldes"), n("threshold", "Seuil"), l("thirdParties", "Tiers")]),
  ep("GET", `${A}/confirmations/{number}/letter`, "Lettre de confirmation", "Confirmations de solde", R, [conf, q(t("format", "Format", { def: "pdf" }))], { blob: "lettre-confirmation.pdf" }),
  ep("POST", `${A}/confirmations/{number}/send`, "Envoyer / relancer", "Confirmations de solde", W, [conf, q(b("reminder", "Relance")), q(t("channel", "Canal", { def: "EMAIL" })), q(t("recipient", "Destinataire"))]),
  ep("POST", `${A}/confirmations/{number}/reply`, "Enregistrer la réponse", "Confirmations de solde", W, [conf, t("channel", "Canal"), n("confirmedBalance", "Solde confirmé"), t("detail", "Détail", { type: "textarea" })]),
  ep("POST", `${A}/confirmations/{number}/reconcile`, "Rapprocher", "Confirmations de solde", W, [conf, t("comment", "Commentaire")]),
];
void j;
