import type { Endpoint } from "../../../components/accounting/EndpointConsole";
import { A, b, d, ep, j, l, n, q, req, t } from "./epHelpers";

const R = "FINANCING:READ";
const W = "FINANCING:MANAGE";
const code = req(t("code", "Code"));
const date = q(d("date", "À la date du"));
const body = (label: string, hint?: string) => j("$body", label, { required: true, hint });

export const LOAN_ENDPOINTS: Endpoint[] = [
  ep("GET", `${A}/loans`, "Liste des emprunts", "Emprunts", R, undefined, { auto: true }),
  ep("GET", `${A}/loans/upcoming`, "Échéances à venir", "Emprunts", R, [q(d("from", "Du")), q(d("to", "Au"))]),
  ep("GET", `${A}/loans/{code}`, "Fiche + tableau d'amortissement", "Emprunts", R, [code]),
  ep("GET", `${A}/loans/{code}/history`, "Historique (versions et événements)", "Emprunts", R, [code]),
  ep("GET", `${A}/loans/{code}/pdf`, "Tableau en PDF", "Emprunts", R, [code], { blob: "emprunt.pdf" }),
  ep("GET", `${A}/loans/{code}/export`, "Tableau en CSV", "Emprunts", R, [code], { blob: "emprunt.csv" }),
  ep("POST", `${A}/loans`, "Créer un emprunt", "Actions", W, [body("Emprunt (JSON LoanRequest)", "code, lenderName, principal, firstDueDate, rate, rateType, frequencyMonths, termCount, method, loanAccount, interestAccount, bankAccountCode…")]),
  ep("POST", `${A}/loans/{code}/disburse`, "Débloquer", "Actions", W, [code]),
  ep("POST", `${A}/loans/{code}/installments/{number}/post`, "Écrire l'échéance", "Actions", W, [code, req(t("number", "N° d'échéance"))], { help: "Mode « au relevé » : l'échéance est comptabilisée à la demande." }),
  ep("POST", `${A}/loans/{code}/postpone`, "Reporter l'échéance", "Actions", W, [code, j("$body", "Corps (JSON, optionnel)")]),
  ep("POST", `${A}/loans/{code}/prepay`, "Remboursement anticipé", "Actions", W, [code, d("date", "Date", { required: true }), n("amount", "Montant", { required: true }), n("penalty", "Indemnité"), t("mode", "Mode", { hint: "durée ou échéance réduite" })]),
  ep("POST", `${A}/loans/{code}/rate`, "Changer le taux", "Actions", W, [code, q(n("rate", "Nouveau taux", { required: true })), q(d("date", "À compter du"))]),
  ep("POST", `${A}/loans/accrue`, "Intérêts courus", "Actions", W, [q(d("date", "À la date du", { required: true }))]),
  ep("GET", `${A}/loans/note`, "Note annexe emprunts", "États", R, [date]),
];

export const COMMITMENT_ENDPOINTS: Endpoint[] = [
  ep("GET", `${A}/commitments`, "Registre hors bilan", "Registre", R, undefined, { auto: true }),
  ep("POST", `${A}/commitments`, "Inscrire un engagement", "Registre", W, [body("Engagement (JSON CommitmentRequest)", "code, typeCode, direction, description, amount, startDate, endDate…")]),
  ep("POST", `${A}/commitments/{code}/release`, "Levée", "Registre", W, [code, q(d("date", "Date")), q(t("reference", "Pièce"))]),
  ep("GET", `${A}/commitments/reconciliation`, "Rapprochement registre / comptes 90", "Registre", R, undefined, { auto: true }),
  ep("GET", `${A}/commitments/note`, "Note annexe hors bilan", "Registre", R, [date]),
  ep("GET", `${A}/commitment-types`, "Types d'engagement", "Types", R, undefined, { auto: true }),
  ep("POST", `${A}/commitment-types`, "Créer / modifier un type", "Types", W, [t("code", "Code", { required: true }), t("label", "Libellé"), t("defaultDirection", "Sens par défaut"), b("lease", "Crédit-bail"), b("active", "Actif", { def: true })]),
];

export const PARTNER_ENDPOINTS: Endpoint[] = [
  ep("GET", `${A}/partners`, "Comptes courants d'associés", "Associés", R, undefined, { auto: true }),
  ep("POST", `${A}/partners`, "Ouvrir / modifier un compte", "Associés", W, [t("code", "Code", { required: true }), t("partnerName", "Associé"), t("thirdPartyCode", "Tiers"), t("accountNumber", "Compte"), b("blocked", "Bloqué"), d("blockedUntil", "Bloqué jusqu'au"), n("rate", "Taux"), n("admittedRate", "Taux admis"), n("cap", "Plafond"), d("openedOn", "Ouvert le")]),
  ep("GET", `${A}/partners/{code}/statement`, "Relevé", "Associés", R, [code, q(d("from", "Du")), q(d("to", "Au"))]),
  ep("POST", `${A}/partners/{code}/movements`, "Saisir un mouvement", "Associés", W, [code, t("type", "Type", { required: true }), d("date", "Date", { required: true }), n("amount", "Montant", { required: true }), t("counterAccount", "Contrepartie"), n("vatAmount", "TVA"), t("vatAccount", "Compte de TVA"), t("journalCode", "Journal"), t("label", "Libellé"), t("reference", "Référence")]),
  ep("POST", `${A}/partners/{code}/interest`, "Calculer les intérêts d'une période", "Associés", W, [code, q(d("from", "Du", { required: true })), q(d("to", "Au", { required: true }))]),
  ep("GET", `${A}/partners/{code}/interests`, "Intérêts calculés", "Associés", R, [code]),
  ep("GET", `${A}/partners/note`, "Note annexe", "Associés", R, [date]),
];

export const PAYROLL_ENDPOINTS: Endpoint[] = [
  ep("GET", `${A}/payroll/imports`, "Historique des imports", "Imports", "PAYROLL:IMPORT", undefined, { auto: true }),
  ep("POST", `${A}/payroll/imports`, "Importer un mois", "Imports", "PAYROLL:IMPORT", [{ ...req(t("file", "Fichier")), type: "file" }, q(req(t("period", "Période", { hint: "ex. 2026-10" }))), q(req(t("template", "Modèle")))]),
  ep("GET", `${A}/payroll/imports/{id}`, "Compte rendu d'un import", "Imports", "PAYROLL:IMPORT", [req(t("id", "Import (id)"))]),
  ep("GET", `${A}/payroll/imports/{id}/lines`, "Lignes importées", "Imports", "PAYROLL:IMPORT", [req(t("id", "Import (id)"))]),
  ep("POST", `${A}/payroll/imports/{id}/post`, "Comptabiliser", "Imports", "PAYROLL:POST", [req(t("id", "Import (id)"))], { confirm: "Comptabiliser cet import de paie ?" }),
  ep("POST", `${A}/payroll/imports/{id}/pay`, "Payer les salariés", "Imports", "PAYROLL:POST", [req(t("id", "Import (id)")), t("treasuryAccount", "Compte de trésorerie", { required: true }), t("journalCode", "Journal", { required: true }), d("date", "Date"), l("matricules", "Matricules", { hint: "Vide = tous" })]),
  ep("GET", `${A}/payroll/employees`, "Salariés", "Paramétrage", "PAYROLL:IMPORT", undefined, { auto: true }),
  ep("POST", `${A}/payroll/employees`, "Ajouter / modifier un salarié", "Paramétrage", "PAYROLL_SETTINGS:MANAGE", [t("matricule", "Matricule", { required: true }), t("fullName", "Nom"), t("thirdPartyCode", "Tiers"), t("sectionCode", "Section"), b("active", "Actif", { def: true })]),
  ep("GET", `${A}/payroll/rubrics`, "Rubriques", "Paramétrage", "PAYROLL:IMPORT", undefined, { auto: true }),
  ep("POST", `${A}/payroll/rubrics`, "Ajouter / modifier une rubrique", "Paramétrage", "PAYROLL_SETTINGS:MANAGE", [t("code", "Code", { required: true }), t("label", "Libellé"), t("kind", "Nature"), t("account", "Compte"), t("counterAccount", "Contrepartie"), b("active", "Actif", { def: true })]),
  ep("GET", `${A}/payroll/templates`, "Modèles d'import", "Paramétrage", "PAYROLL:IMPORT", undefined, { auto: true }),
  ep("POST", `${A}/payroll/templates`, "Ajouter / modifier un modèle", "Paramétrage", "PAYROLL_SETTINGS:MANAGE", [t("code", "Code", { required: true }), t("label", "Libellé"), t("separator", "Séparateur"), n("headerRows", "Lignes d'en-tête"), t("employeeColumn", "Col. matricule"), t("nameColumn", "Col. nom"), t("rubricColumn", "Col. rubrique"), t("amountColumn", "Col. montant"), t("sectionColumn", "Col. section"), t("decimalSeparator", "Séparateur décimal"), t("encoding", "Encodage")]),
];
