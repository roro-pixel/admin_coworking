import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileCheck2, Percent, Plus } from "lucide-react";
import { billingService } from "../../services/billing.service";
import type { Withholding } from "../../services/billing.service";
import { ActionButton, EmptyState, ErrorBlock, Field, ItemRow, PanelForm, Section, StatusChip } from "../subscription/kit";
import { FIELD_SOFT, formatDate, formatMoney } from "../subscription/kitUtils";
import { Skeleton } from "../ui/Skeleton";
import { toast } from "../ui/toastStore";
import { currencyLabel } from "../payment/paymentUtils";
import { billingError } from "./billingErrors";
import { WITHHOLDING_BASE_LABEL } from "./billingLabels";

const RecordForm: React.FC<{ documentNumber: string; onDone: () => void; onCancel: () => void }> = ({ documentNumber, onDone, onCancel }) => {
  const qc = useQueryClient();
  const types = useQuery({ queryKey: ["billing-withholding-types"], queryFn: () => billingService.listWithholdingTypes() });
  const [typeCode, setTypeCode] = useState("");
  const [amount, setAmount] = useState("");
  const [withheldOn, setWithheldOn] = useState("");
  const [ref, setRef] = useState("");
  const [doc, setDoc] = useState("");
  const [error, setError] = useState<string | null>(null);
  const selected = types.data?.find((t) => t.code === typeCode);
  const m = useMutation({
    mutationFn: () => billingService.recordWithholding(documentNumber, {
      typeCode, amount: amount ? Number(amount) : undefined, withheldOn: withheldOn || undefined,
      certificateReference: ref.trim() || undefined, certificateDocument: doc.trim() || undefined,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["billing-withholdings", documentNumber] }); qc.invalidateQueries({ queryKey: ["billing-document", documentNumber] }); toast.success("Retenue enregistrée."); onDone(); },
    onError: (e: unknown) => setError(billingError(e, "Impossible d'enregistrer la retenue.")),
  });
  return (
    <PanelForm title="Enregistrer une retenue à la source" submitLabel="Enregistrer" pending={m.isPending} submitDisabled={!typeCode} error={error} onCancel={onCancel}
      onSubmit={(e) => { e.preventDefault(); setError(null); m.mutate(); }}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Type de retenue" required hint={selected ? `${selected.rate != null ? `${selected.rate} % ` : "Taux libre "}sur ${WITHHOLDING_BASE_LABEL[selected.base ?? ""] ?? selected.base}` : undefined}>
          <select className={FIELD_SOFT} value={typeCode} onChange={(e) => setTypeCode(e.target.value)}>
            <option value="">Choisir…</option>
            {(types.data ?? []).filter((t) => t.active !== false).map((t) => <option key={t.code} value={t.code}>{t.label}</option>)}
          </select>
        </Field>
        <Field label="Montant retenu" hint={selected?.rate != null ? "Vide : calculé avec le taux du type" : "Obligatoire pour un type à taux libre"}>
          <input type="number" min={0} className={FIELD_SOFT} value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <Field label="Date de retenue"><input type="date" className={FIELD_SOFT} value={withheldOn} onChange={(e) => setWithheldOn(e.target.value)} /></Field>
        <Field label="Référence de l'attestation"><input className={FIELD_SOFT} maxLength={120} value={ref} onChange={(e) => setRef(e.target.value)} /></Field>
        <Field label="Document de l'attestation" hint="Facultatif : peut être joint plus tard" className="sm:col-span-2"><input className={FIELD_SOFT} maxLength={120} value={doc} onChange={(e) => setDoc(e.target.value)} /></Field>
      </div>
    </PanelForm>
  );
};

const CertificateForm: React.FC<{ w: Withholding; documentNumber: string; onDone: () => void; onCancel: () => void }> = ({ w, documentNumber, onDone, onCancel }) => {
  const qc = useQueryClient();
  const [certificateDocument, setDoc] = useState("");
  const [certificateReference, setRef] = useState(w.certificateReference ?? "");
  const [error, setError] = useState<string | null>(null);
  const m = useMutation({
    mutationFn: () => billingService.attachWithholdingCertificate(w.withholdingNumber, { certificateDocument: certificateDocument.trim(), certificateReference: certificateReference.trim() || undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["billing-withholdings", documentNumber] }); toast.success("Attestation jointe."); onDone(); },
    onError: (e: unknown) => setError(billingError(e, "Impossible de joindre l'attestation.")),
  });
  return (
    <PanelForm title={`Attestation de ${w.withholdingNumber}`} submitLabel="Joindre" pending={m.isPending} submitDisabled={!certificateDocument.trim()} error={error} onCancel={onCancel}
      onSubmit={(e) => { e.preventDefault(); setError(null); m.mutate(); }}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Document" required><input className={FIELD_SOFT} maxLength={120} value={certificateDocument} onChange={(e) => setDoc(e.target.value)} /></Field>
        <Field label="Référence"><input className={FIELD_SOFT} maxLength={120} value={certificateReference} onChange={(e) => setRef(e.target.value)} /></Field>
      </div>
    </PanelForm>
  );
};

/** Retenues à la source d'une facture : liste, enregistrement, attestation, annulation. */
export const WithholdingsPanel: React.FC<{ documentNumber: string; currency: string; canRecord: boolean }> = ({ documentNumber, currency, canRecord }) => {
  const qc = useQueryClient();
  const cur = currencyLabel(currency);
  const [adding, setAdding] = useState(false);
  const [certFor, setCertFor] = useState<Withholding | null>(null);
  const [cancelFor, setCancelFor] = useState<Withholding | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelError, setCancelError] = useState<string | null>(null);
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ["billing-withholdings", documentNumber], queryFn: () => billingService.getDocumentWithholdings(documentNumber) });

  const cancel = useMutation({
    mutationFn: ({ n, reason }: { n: string; reason: string }) => billingService.cancelWithholding(n, reason),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["billing-withholdings", documentNumber] }); qc.invalidateQueries({ queryKey: ["billing-document", documentNumber] }); toast.success("Retenue annulée."); setCancelFor(null); setCancelReason(""); },
    onError: (e: unknown) => setCancelError(billingError(e, "Impossible d'annuler la retenue.")),
  });

  return (
    <Section title="Retenues à la source" icon={Percent}
      action={canRecord && !adding ? <ActionButton variant="ghost" icon={Plus} className="!px-4 !py-2" onClick={() => setAdding(true)}>Enregistrer</ActionButton> : undefined}>
      {adding && <RecordForm documentNumber={documentNumber} onDone={() => setAdding(false)} onCancel={() => setAdding(false)} />}
      {cancelFor && (
        <PanelForm title={`Annuler ${cancelFor.withholdingNumber}`} submitLabel="Annuler la retenue" pending={cancel.isPending} submitDisabled={!cancelReason.trim()} error={cancelError}
          onCancel={() => { setCancelFor(null); setCancelError(null); }}
          onSubmit={(e) => { e.preventDefault(); setCancelError(null); cancel.mutate({ n: cancelFor.withholdingNumber, reason: cancelReason.trim() }); }}>
          <Field label="Motif" required><input className={FIELD_SOFT} maxLength={500} value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} /></Field>
        </PanelForm>
      )}
      {certFor && <CertificateForm w={certFor} documentNumber={documentNumber} onDone={() => setCertFor(null)} onCancel={() => setCertFor(null)} />}
      {isLoading ? <Skeleton className="h-14 w-full rounded-2xl" />
        : isError ? <ErrorBlock message="Impossible de charger les retenues." onRetry={() => refetch()} />
        : (data ?? []).length === 0 ? <EmptyState icon={Percent} title="Aucune retenue" />
        : (
          <div className="space-y-2">
            {(data ?? []).map((w) => (
              <ItemRow key={w.withholdingNumber}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{w.typeLabel ?? w.typeCode} <span className="font-mono text-xs font-normal text-gray-400">{w.withholdingNumber}</span></p>
                    <p className="mt-0.5 text-xs text-gray-500">{formatMoney(w.amount, cur)}{w.rate != null ? ` (${w.rate} %)` : ""} · {formatDate(w.withheldOn)}{w.certificateReference ? ` · attestation ${w.certificateReference}` : ""}</p>
                    {w.cancelReason && <p className="mt-1 text-xs text-gray-400">Annulée : {w.cancelReason}</p>}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {w.certificateMissing && w.status !== "CANCELLED" && <StatusChip tone="warn">Attestation manquante</StatusChip>}
                    {w.status === "CANCELLED" ? <StatusChip tone="neutral">Annulée</StatusChip> : (
                      <>
                        {w.certificateMissing && <ActionButton variant="ghost" icon={FileCheck2} className="!px-4 !py-2" onClick={() => setCertFor(w)}>Attestation</ActionButton>}
                        <ActionButton variant="ghost" className="!px-4 !py-2" onClick={() => { setCancelFor(w); setCancelError(null); }}>Annuler</ActionButton>
                      </>
                    )}
                  </div>
                </div>
              </ItemRow>
            ))}
          </div>
        )}
    </Section>
  );
};
