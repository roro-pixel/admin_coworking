import type { Endpoint } from "../../../components/accounting/EndpointConsole";
import { A, b, d, ep, j, n, q, req, t } from "./epHelpers";

const R = "ACCOUNTING_POSTING:READ";
const P = "ACCOUNTING_POSTING:REPLAY";
const M = "ACCOUNTING_POSTING:MANAGE";
const id = req(t("id", "Identifiant"));

export const POSTING_ENDPOINTS: Endpoint[] = [
  ep("GET", `${A}/posting/events/summary`, "Synthèse des événements", "Événements", R, undefined, { auto: true }),
  ep("GET", `${A}/posting/events`, "Événements", "Événements", R, [q(t("status", "Statut", { hint: "PENDING, POSTED, UNBALANCED, FAILED, IGNORED" })), q(t("eventType", "Type d'événement")), q(d("from", "Du")), q(d("to", "Au")), q(n("limit", "Limite", { def: "100" }))], { auto: true }),
  ep("GET", `${A}/posting/events/{id}`, "Détail d'un événement", "Événements", R, [id]),
  ep("PATCH", `${A}/posting/events/{id}/ignore`, "Ignorer", "Événements", P, [id, t("reason", "Motif", { required: true })]),
  ep("PATCH", `${A}/posting/events/{id}/regenerate`, "Régénérer l'écriture", "Événements", P, [id]),
  ep("POST", `${A}/posting/events`, "Soumettre un événement", "Événements", P, [j("$body", "Événement (JSON SubmitEvent)", { required: true, hint: "eventType, reference, family, eventDate, payload, replay" })]),
  ep("POST", `${A}/posting/run`, "Lancer le passage", "Événements", P, undefined, { confirm: "Lancer le passage des événements en attente ?" }),
  ep("POST", `${A}/posting/drafts/validate`, "Valider les brouillons", "Événements", P, [q(t("journalCode", "Journal")), q(d("to", "Jusqu'au"))]),
  ep("GET", `${A}/posting/rules`, "Règles de comptabilisation", "Règles", R, [q(t("eventType", "Type d'événement"))], { auto: true }),
  ep("GET", `${A}/posting/rules/{code}/versions`, "Versions d'une règle", "Règles", R, [req(t("code", "Code de la règle"))]),
  ep("POST", `${A}/posting/rules`, "Créer une version de règle", "Règles", M, [j("$body", "Règle (JSON RuleRequest)", { required: true, hint: "code, eventType, label, journal, entryLabel, lines, conditions…" })]),
  ep("PATCH", `${A}/posting/rules/{id}/activate`, "Activer", "Règles", M, [id]),
  ep("PATCH", `${A}/posting/rules/{id}/retire`, "Retirer", "Règles", M, [id]),
  ep("POST", `${A}/posting/preview`, "Aperçu d'une règle", "Règles", R, [j("$body", "Aperçu (JSON PreviewRequest)", { required: true, hint: "ruleId ou rule, et eventId ou payload" })]),
  ep("GET", `${A}/posting/resolvers`, "Résolveurs disponibles", "Règles", R, undefined, { auto: true }),
];
void b;
