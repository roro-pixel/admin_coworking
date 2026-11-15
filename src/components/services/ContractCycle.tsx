import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Award, Check, ClipboardCheck, FileCheck2, FileSignature, Lock } from "lucide-react";
import { domiciliationService } from "../../services/domiciliation.service";
import type { CertificateScope, DomiciliationContractView, DomiciliationRegistrationView, RegistrationPaidBy } from "../../services/domiciliation.service";
import { ActionButton, Field, StatusChip, Switch } from "../subscription/kit";
import { FIELD_SOFT, apiMessage, formatDate, formatMoney } from "../subscription/kitUtils";
import { statusOf } from "../subscription/labels";
import { Skeleton } from "../ui/Skeleton";
import { toast } from "../ui/toastStore";
import { CERTIFICATE_SCOPE_LABEL, CONTRACT_STEP_INDEX, PAID_BY_LABEL, REGISTRATION_STATUS } from "./serviceLabels";

type StepState = "done" | "current" | "locked";

const Step: React.FC<{ n: number; title: string; state: StepState; summary?: string; children: React.ReactNode }> = ({
  n,
  title,
  state,
  summary,
  children,
}) => (
  <section className="rounded-[1.75rem] border border-gray-100 bg-white p-3 shadow-sm">
    <div className="flex items-center gap-3 px-3 pb-3 pt-2">
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
          state === "done"
            ? "bg-emerald-50 text-emerald-700"
            : state === "current"
              ? "bg-[color:var(--logo-pink-dark)] text-white"
              : "bg-gray-100 text-gray-400"
        }`}
      >
        {state === "done" ? <Check size={17} /> : state === "locked" ? <Lock size={15} /> : n}
      </span>
      <div className="min-w-0">
        <h3 className={`text-base font-bold ${state === "locked" ? "text-gray-400" : "text-gray-950"}`}>{title}</h3>
        {summary && <p className="text-xs text-gray-500">{summary}</p>}
      </div>
    </div>
    <div className="rounded-2xl bg-gray-50 p-4 sm:p-5">{children}</div>
  </section>
);

const Locked: React.FC<{ text: string }> = ({ text }) => <p className="text-sm text-gray-500">{text}</p>;

const Block: React.FC<{ children: React.ReactNode }> = ({ children }) => <div className="rounded-2xl bg-white p-4 shadow-sm">{children}</div>;

const stateOf = (index: number, step: number): StepState => (index > step ? "done" : index === step ? "current" : "locked");

const emptySubmit = () => ({ administrationOffice: "", stampDutyAmount: "", registrationFeeAmount: "", paidBy: "COMPANY", rebilled: false });
const emptyConfirm = () => ({ administrationReference: "", registrationDate: "", expiresAt: "", receiptDocumentCode: "", registeredDocumentCode: "" });

/**
 * Cycle d'ouverture d'un contrat de domiciliation : pièces et contrat, signature, enregistrement, attestation.
 * Chaque étape ne s'ouvre qu'une fois la précédente terminée ; les refus du backend s'affichent tels quels.
 */
export const ContractCycle: React.FC<{ contract: DomiciliationContractView }> = ({ contract }) => {
  const qc = useQueryClient();
  const n = contract.contractNumber;
  const index = CONTRACT_STEP_INDEX[contract.status] ?? 0;

  const [signedCode, setSignedCode] = useState("");
  const [submitForm, setSubmitForm] = useState(emptySubmit);
  const [confirmForm, setConfirmForm] = useState(emptyConfirm);
  const [rejectReason, setRejectReason] = useState("");

  const registrations = useQuery({
    queryKey: ["domiciliation-contract", n, "registrations"],
    queryFn: () => domiciliationService.getContractRegistrations(n),
    enabled: index >= 3,
  });
  const regs: DomiciliationRegistrationView[] = registrations.data ?? [];
  const latest = regs[regs.length - 1];

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["domiciliation-contract", n] });
    qc.invalidateQueries({ queryKey: ["domiciliation-contracts"] });
    qc.invalidateQueries({ queryKey: ["domiciliation-registrations"] });
  };
  const ok = (message: string, after?: () => void) => () => {
    toast.success(message);
    after?.();
    refresh();
  };
  const fail = (fallback: string) => (e: unknown) => toast.error(apiMessage(e, fallback));

  const prepare = useMutation({
    mutationFn: () => domiciliationService.prepareContract(n),
    onSuccess: (c) =>
      ok(c.status === "PENDING_DOCUMENTS" ? "Pièces d'identité encore à vérifier" : "Contrat généré, signature attendue")(),
    onError: fail("Préparation impossible."),
  });
  const signed = useMutation({
    mutationFn: () => domiciliationService.markContractSigned(n, signedCode.trim()),
    onSuccess: ok("Contrat signé, démarche d'enregistrement ouverte", () => setSignedCode("")),
    onError: fail("Enregistrement de la signature impossible."),
  });
  const submit = useMutation({
    mutationFn: () =>
      domiciliationService.submitRegistration(n, {
        administrationOffice: submitForm.administrationOffice.trim(),
        stampDutyAmount: submitForm.stampDutyAmount ? Number(submitForm.stampDutyAmount) : undefined,
        registrationFeeAmount: submitForm.registrationFeeAmount ? Number(submitForm.registrationFeeAmount) : undefined,
        paidBy: submitForm.paidBy as RegistrationPaidBy,
        rebilled: submitForm.rebilled,
      }),
    onSuccess: ok("Dossier déposé auprès de l'administration", () => setSubmitForm(emptySubmit())),
    onError: fail("Dépôt impossible."),
  });
  const confirm = useMutation({
    mutationFn: () =>
      domiciliationService.confirmRegistration(n, {
        administrationReference: confirmForm.administrationReference.trim(),
        registrationDate: confirmForm.registrationDate,
        expiresAt: confirmForm.expiresAt || null,
        receiptDocumentCode: confirmForm.receiptDocumentCode.trim() || undefined,
        registeredDocumentCode: confirmForm.registeredDocumentCode.trim() || undefined,
      }),
    onSuccess: ok("Enregistrement confirmé, contrat actif", () => setConfirmForm(emptyConfirm())),
    onError: fail("Confirmation impossible."),
  });
  const reject = useMutation({
    mutationFn: () => domiciliationService.rejectRegistration(n, rejectReason.trim()),
    onSuccess: refresh,
  });
  const certificate = useMutation({
    mutationFn: (scope: CertificateScope) => domiciliationService.issueCertificate(n, scope),
    onSuccess: ok("Attestation délivrée"),
    onError: fail("Délivrance impossible."),
  });

  const askReject = () =>
    toast.confirm({
      message: "Rejeter ce dossier d'enregistrement ?",
      detail: `Une nouvelle démarche s'ouvrira. Motif : ${rejectReason.trim()}`,
      confirmLabel: "Rejeter le dossier",
      pendingLabel: "Rejet en cours",
      successMessage: "Dossier rejeté, nouvelle démarche ouverte",
      errorMessage: "Le rejet a été refusé",
      onConfirm: async () => {
        await reject.mutateAsync();
        setRejectReason("");
      },
    });

  const isActive = contract.status === "ACTIVE";
  const submitted = latest?.status === "SUBMITTED";
  const fiscalPending = certificate.isPending && certificate.variables === "FISCAL";
  const commercialPending = certificate.isPending && certificate.variables === "COMMERCIAL";

  return (
    <div className="space-y-4">
      <Step
        n={1}
        title="Pièces d'identité et contrat"
        state={stateOf(index, 1)}
        summary={index >= 2 ? "Contrat généré" : "Vérification du représentant légal, puis génération du contrat"}
      >
        {index <= 1 ? (
          <div className="space-y-3">
            {contract.status === "PENDING_DOCUMENTS" && (
              <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
                Les pièces d'identité du représentant légal sont à vérifier avant de générer le contrat.
              </p>
            )}
            <ActionButton icon={FileCheck2} pending={prepare.isPending} onClick={() => prepare.mutate()}>
              {contract.status === "PENDING_DOCUMENTS" ? "Vérifier à nouveau et générer le contrat" : "Vérifier les pièces et générer le contrat"}
            </ActionButton>
          </div>
        ) : (
          <p className="text-sm text-gray-700">
            Document du contrat : <span className="font-mono font-semibold text-gray-900">{contract.contractDocumentCode || "Code non communiqué"}</span>
          </p>
        )}
      </Step>

      <Step n={2} title="Signature" state={stateOf(index, 2)} summary={index >= 3 ? "Contrat signé déposé" : undefined}>
        {index < 2 ? (
          <Locked text="Disponible une fois le contrat généré." />
        ) : index === 2 ? (
          <Block>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
              <Field label="Code du contrat signé" required hint="Le déposer ouvre la démarche d'enregistrement.">
                <input className={FIELD_SOFT} value={signedCode} onChange={(e) => setSignedCode(e.target.value)} />
              </Field>
              <ActionButton icon={FileSignature} pending={signed.isPending} disabled={!signedCode.trim()} onClick={() => signed.mutate()}>
                Marquer comme signé
              </ActionButton>
            </div>
          </Block>
        ) : (
          <p className="text-sm text-gray-700">
            Contrat signé : <span className="font-mono font-semibold text-gray-900">{contract.signedDocumentCode || "Code non communiqué"}</span>
          </p>
        )}
      </Step>

      <Step n={3} title="Enregistrement" state={stateOf(index, 3)} summary={index >= 4 ? "Enregistrement confirmé" : undefined}>
        {index < 3 ? (
          <Locked text="Disponible une fois le contrat signé. Sans enregistrement confirmé, le contrat ne s'active pas." />
        ) : (
          <div className="space-y-4">
            {registrations.isLoading ? (
              <Skeleton className="h-20 w-full rounded-2xl" />
            ) : regs.length === 0 && index > 3 ? (
              <p className="text-sm text-gray-500">Aucun dossier d'enregistrement consigné pour ce contrat.</p>
            ) : (
              regs.length > 0 && (
                <div className="space-y-2">
                  {regs.map((r, i) => {
                    const st = statusOf(REGISTRATION_STATUS, r.status);
                    const fees = (r.stampDutyAmount ?? 0) + (r.registrationFeeAmount ?? 0);
                    return (
                      <Block key={r.registrationNumber ?? i}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="break-words text-sm font-semibold text-gray-900">{r.administrationOffice || "Administration à préciser"}</p>
                            <p className="mt-0.5 text-xs text-gray-500">
                              {r.administrationReference && `Réf. ${r.administrationReference} · `}
                              {fees > 0 ? `${formatMoney(fees)} de droits et timbre` : "Aucun frais"}
                              {r.paidBy && ` · pris en charge par ${(PAID_BY_LABEL[r.paidBy] ?? r.paidBy).toLowerCase()}`}
                            </p>
                            {(r.registrationDate || r.expiresAt) && (
                              <p className="mt-0.5 text-xs text-gray-400">
                                {r.registrationDate && `Enregistré le ${formatDate(r.registrationDate)}`}
                                {r.expiresAt && ` · expire le ${formatDate(r.expiresAt)}`}
                              </p>
                            )}
                          </div>
                          <StatusChip tone={st.tone}>{st.label}</StatusChip>
                        </div>
                      </Block>
                    );
                  })}
                </div>
              )
            )}

            {index === 3 && !registrations.isLoading && (
              <Block>
                {submitted ? (
                  <div className="space-y-4">
                    <h4 className="text-sm font-bold text-gray-950">Confirmer l'enregistrement</h4>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <Field label="Référence de l'administration" required>
                        <input
                          className={FIELD_SOFT}
                          value={confirmForm.administrationReference}
                          onChange={(e) => setConfirmForm({ ...confirmForm, administrationReference: e.target.value })}
                        />
                      </Field>
                      <Field label="Date d'enregistrement" required>
                        <input
                          type="date"
                          className={FIELD_SOFT}
                          value={confirmForm.registrationDate}
                          onChange={(e) => setConfirmForm({ ...confirmForm, registrationDate: e.target.value })}
                        />
                      </Field>
                      <Field label="Expire le">
                        <input type="date" className={FIELD_SOFT} value={confirmForm.expiresAt} onChange={(e) => setConfirmForm({ ...confirmForm, expiresAt: e.target.value })} />
                      </Field>
                      <Field label="Code du reçu">
                        <input
                          className={FIELD_SOFT}
                          value={confirmForm.receiptDocumentCode}
                          onChange={(e) => setConfirmForm({ ...confirmForm, receiptDocumentCode: e.target.value })}
                        />
                      </Field>
                      <Field label="Code du document enregistré" className="md:col-span-2">
                        <input
                          className={FIELD_SOFT}
                          value={confirmForm.registeredDocumentCode}
                          onChange={(e) => setConfirmForm({ ...confirmForm, registeredDocumentCode: e.target.value })}
                        />
                      </Field>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                      <ActionButton
                        icon={ClipboardCheck}
                        pending={confirm.isPending}
                        disabled={!confirmForm.administrationReference.trim() || !confirmForm.registrationDate}
                        onClick={() => confirm.mutate()}
                      >
                        Confirmer l'enregistrement
                      </ActionButton>
                    </div>
                    <div className="space-y-3">
                      <h4 className="text-sm font-bold text-gray-950">Ou rejeter le dossier</h4>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                        <Field label="Motif du rejet" required>
                          <input className={FIELD_SOFT} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
                        </Field>
                        <ActionButton variant="danger" disabled={!rejectReason.trim()} onClick={askReject}>
                          Rejeter le dossier
                        </ActionButton>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <h4 className="text-sm font-bold text-gray-950">Déposer le dossier auprès de l'administration</h4>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <Field label="Administration" required className="md:col-span-2">
                        <input
                          className={FIELD_SOFT}
                          value={submitForm.administrationOffice}
                          onChange={(e) => setSubmitForm({ ...submitForm, administrationOffice: e.target.value })}
                        />
                      </Field>
                      <Field label="Droit de timbre">
                        <input
                          type="number"
                          min={0}
                          className={FIELD_SOFT}
                          value={submitForm.stampDutyAmount}
                          onChange={(e) => setSubmitForm({ ...submitForm, stampDutyAmount: e.target.value })}
                        />
                      </Field>
                      <Field label="Frais d'enregistrement">
                        <input
                          type="number"
                          min={0}
                          className={FIELD_SOFT}
                          value={submitForm.registrationFeeAmount}
                          onChange={(e) => setSubmitForm({ ...submitForm, registrationFeeAmount: e.target.value })}
                        />
                      </Field>
                      <Field label="Frais pris en charge par" required>
                        <select className={FIELD_SOFT} value={submitForm.paidBy} onChange={(e) => setSubmitForm({ ...submitForm, paidBy: e.target.value })}>
                          {Object.entries(PAID_BY_LABEL).map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <div className="self-end rounded-2xl bg-gray-50 p-2">
                        <Switch checked={submitForm.rebilled} onChange={(v) => setSubmitForm({ ...submitForm, rebilled: v })} label="Refacturer au client" />
                      </div>
                    </div>
                    <div className="flex sm:justify-end">
                      <ActionButton pending={submit.isPending} disabled={!submitForm.administrationOffice.trim()} onClick={() => submit.mutate()}>
                        {latest?.status === "REJECTED" ? "Déposer une nouvelle démarche" : "Déposer le dossier"}
                      </ActionButton>
                    </div>
                  </div>
                )}
              </Block>
            )}
          </div>
        )}
      </Step>

      <Step
        n={4}
        title="Attestation"
        state={isActive ? "current" : index >= 4 && contract.certificateInForce ? "done" : "locked"}
        summary={contract.certificateInForce ? "Attestation en vigueur" : undefined}
      >
        {index < 4 ? (
          <Locked text="Disponible une fois l'enregistrement confirmé." />
        ) : (
          <div className="space-y-4">
            {contract.certificateInForce && (
              <Block>
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                    <Award size={17} />
                  </span>
                  <div className="min-w-0 text-sm">
                    <p className="font-semibold text-gray-900">
                      Attestation {(CERTIFICATE_SCOPE_LABEL[contract.certificateScope ?? ""] ?? contract.certificateScope ?? "").toLowerCase()} en vigueur
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {contract.certificateValidUntil && `Valable jusqu'au ${formatDate(contract.certificateValidUntil)}`}
                      {contract.certificateDocumentCode && ` · ${contract.certificateDocumentCode}`}
                    </p>
                  </div>
                </div>
              </Block>
            )}
            {contract.fiscalAddressRevokedAt && (
              <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
                L'attestation fiscale a été révoquée le {formatDate(contract.fiscalAddressRevokedAt)} : l'engagement est passé sous douze mois.
              </p>
            )}
            {isActive ? (
              <div className="space-y-3">
                <div className="flex flex-col gap-2 sm:flex-row">
                  <ActionButton variant="ghost" icon={Award} pending={commercialPending} disabled={certificate.isPending} onClick={() => certificate.mutate("COMMERCIAL")}>
                    Délivrer une attestation commerciale
                  </ActionButton>
                  <ActionButton icon={Award} pending={fiscalPending} disabled={certificate.isPending || !contract.fiscalAddressEligible} onClick={() => certificate.mutate("FISCAL")}>
                    Délivrer une attestation fiscale
                  </ActionButton>
                </div>
                {!contract.fiscalAddressEligible && (
                  <p className="text-xs text-gray-500">L'attestation fiscale exige douze mois d'engagement : seule une attestation commerciale peut être délivrée.</p>
                )}
              </div>
            ) : (
              <Locked text="Une attestation ne se délivre que sur un contrat actif." />
            )}
          </div>
        )}
      </Step>
    </div>
  );
};
