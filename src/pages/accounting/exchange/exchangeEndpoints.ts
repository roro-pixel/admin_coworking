import type { Endpoint } from "../../../components/accounting/EndpointConsole";
import { A, b, d, ep, req, t } from "../period/epHelpers";

const R = "ACCOUNTING_REPORT:READ";
const W = "ACCOUNTING_SETTINGS:MANAGE";
const file = { ...req(t("file", "Fichier")), type: "file" as const };
const FORMATS = "SAGE100, SAGEX3, ODOO ou CSV";

export const EXCHANGE_ENDPOINTS: Endpoint[] = [
  ep("POST", `${A}/exports`, "Exporter", "Export", W, [t("format", "Format", { required: true, hint: FORMATS }), t("mode", "Mode"), d("from", "Du"), d("to", "Au"), t("journal", "Journal")], { help: "Le fichier est téléchargé ; un lot d'export est historisé." }),
  ep("GET", `${A}/exports`, "Derniers lots d'export", "Export", R, undefined, { auto: true }),
  ep("GET", `${A}/exports/mappings`, "Correspondance des comptes et journaux", "Correspondances", R, [req({ ...t("format", "Format", { hint: FORMATS }), in: "query" })]),
  ep("POST", `${A}/exports/mappings`, "Ajouter une correspondance", "Correspondances", W, [t("format", "Format", { required: true }), t("kind", "Nature", { required: true, hint: "compte ou journal" }), t("source", "Source", { required: true }), t("target", "Cible", { required: true })]),
  ep("DELETE", `${A}/exports/mappings/{id}`, "Supprimer une correspondance", "Correspondances", W, [req(t("id", "Identifiant"))], { confirm: "Supprimer cette correspondance ?" }),
  ep("POST", `${A}/imports/entries`, "Reprise : import d'écritures", "Reprise", W, [file, { ...b("validate", "Valider les pièces"), in: "query" }], { help: "Colonnes : journal;date;piece;compte;tiers;libelle;debit;credit;reference;echeance. Une pièce par journal et numéro, en brouillard (validée si demandé)." }),
  ep("POST", `${A}/imports/opening/{year}`, "Reprise : soldes d'ouverture", "Reprise", W, [req(t("year", "Exercice")), file], { help: "Colonnes : compte;tiers;reference;echeance;debit;credit;libelle." }),
  ep("POST", `${A}/imports/compare`, "Double tenue : comparer une balance", "Reprise", W, [file, { ...d("date", "À la date du"), in: "query" }, { ...t("format", "Format", { def: "CSV" }), in: "query" }], { help: "Colonnes : compte;debit;credit ou compte;solde." }),
  ep("POST", `${A}/archives/{year}`, "Produire l'archive annuelle (ZIP)", "Archives", W, [req(t("year", "Exercice"))], { blob: "archive-comptable.zip" }),
  ep("GET", `${A}/archives/{year}`, "Archives produites", "Archives", R, [req(t("year", "Exercice"))]),
];
