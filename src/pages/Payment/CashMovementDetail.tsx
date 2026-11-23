import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Ban, CheckCircle2, Download, PenLine, Paperclip, Printer, Undo2, X } from "lucide-react";
import { paymentService } from "../../services/payment.service";
import type { CashMovement } from "../../services/payment.service";
import { cashRegisterService } from "../../services/cashRegister.service";
import { useAuth } from "../../contexts/AuthContext";
import { ModalPortal } from "../../components/ui/ModalPortal";
import { brandVars } from "../../components/layout/adminTheme";
import { ActionButton, Detail, Field, IconButton, ItemRow, PanelForm, Section, StatusChip } from "../../components/subscription/kit";
import { FIELD_SOFT, apiMessage, formatDateTime, formatMoney } from "../../components/subscription/kitUtils";
import { statusOf } from "../../components/subscription/labels";
import { toast } from "../../components/ui/toastStore";
import { saveBlob } from "../../components/payment/paymentUtils";
import { DocumentFieldsPanel } from "../../components/templates/DocumentFieldsPanel";
import { pieceFieldPaths, readPdfError } from "../../services/documentTemplate.service";
import { MOVEMENT_STATUS, MOVEMENT_TYPES } from "../../components/payment/paymentLabels";
import { CASH_DOCUMENT_TYPE, MOVEMENT_CHANNEL } from "../../components/cash/cashLabels";

type Form = null | "cancel" | "reverse" | "sign" | "attach";

/**
 * Détail d'un mouvement de caisse et ses actions : approuver, annuler, contre-passer, signer, imprimer, joindre une pièce.
 * Droits : CASH_MOVEMENT:APPROVE (approuver), CASH_MOVEMENT:CREATE (les autres).
 */
export const CashMovementDetail: React.FC<{ movement: CashMovement; onClose: () => void; onChanged: () => void }> = ({ movement, onClose, onChanged }) => {
  const { admin, hasPermission } = useAuth();
  const [m, setM] = useState<CashMovement>(movement);
  const [form, setForm] = useState<Form>(null);
  const [reason, setReason] = useState("");
  const [signedBy, setSignedBy] = useState(admin?.email ?? "");
  const [att, setAtt] = useState({ fileName: "", contentType: "application/pdf", storagePath: "", label: "" });
  const [error, setError] = useState<string | null>(null);
  const [fieldsRefresh, setFieldsRefresh] = useState(0);

  const canApprove = hasPermission("CASH_MOVEMENT:APPROVE");
  const canWrite = hasPermission("CASH_MOVEMENT:CREATE");
  const inflow = (m.flowDirection ? m.flowDirection !== "OUT" : MOVEMENT_TYPES[m.movementType]?.inflow) ?? true;
  const st = statusOf(MOVEMENT_STATUS, m.status ?? "CONFIRMED");
  const isVoucher = m.movementType === "CASH_IN" || m.movementType === "CASH_OUT";

  const close = () => {
    setForm(null);
    setReason("");
    setError(null);
  };
  const after = (msg: string, closeAll = false) => (data: unknown) => {
    toast.success(msg);
    onChanged();
    if (closeAll) return onClose();
    if (data && typeof data === "object" && "movementNumber" in (data as object)) setM(data as CashMovement);
    close();
  };
  const fail = (fallback: string) => (e: unknown) => setError(apiMessage(e, fallback));

  const approve = useMutation({ mutationFn: () => cashRegisterService.approveMovement(m.movementNumber), onSuccess: after("Mouvement approuvé"), onError: (e) => toast.error(apiMessage(e, "Approbation impossible")) });
  const cancel = useMutation({ mutationFn: () => cashRegisterService.cancelMovement(m.movementNumber, { reasonText: reason.trim() }), onSuccess: after("Mouvement annulé"), onError: fail("Annulation impossible") });
  const reverse = useMutation({ mutationFn: () => cashRegisterService.reverseMovement(m.movementNumber, { reasonText: reason.trim() }), onSuccess: after("Mouvement contre-passé"), onError: fail("Contre-passation impossible") });
  const sign = useMutation({ mutationFn: () => paymentService.signCashMovement(m.movementNumber, signedBy.trim()), onSuccess: after("Mouvement signé"), onError: fail("Signature impossible") });
  const print = useMutation({
    mutationFn: async () => {
      const updated = await paymentService.printCashMovement(m.movementNumber);
      saveBlob(await paymentService.getCashMovementDocumentPdf(m.movementNumber), `piece_${m.movementNumber}.pdf`);
      return updated;
    },
    onSuccess: async (d) => {
      setM(d);
      onChanged();
    },
    onError: async (e) => {
      const { code, message } = await readPdfError(e);
      if (code === "CHAMPS_A_SAISIR") setFieldsRefresh((n) => n + 1);
      toast.error(message || "Impression impossible");
    },
  });
  const attach = useMutation({
    mutationFn: () => paymentService.addCashMovementAttachment(m.movementNumber, { fileName: att.fileName.trim(), contentType: att.contentType.trim(), storagePath: att.storagePath.trim(), label: att.label.trim() || undefined }),
    onSuccess: (d) => {
      after("Pièce jointe ajoutée")(d);
      setAtt({ fileName: "", contentType: "application/pdf", storagePath: "", label: "" });
    },
    onError: fail("Ajout impossible"),
  });
  const download = useMutation({
    mutationFn: async () => saveBlob(await paymentService.getCashMovementDocumentPdf(m.movementNumber), `piece_${m.movementNumber}.pdf`),
    onError: async (e) => {
      const { code, message } = await readPdfError(e);
      if (code === "CHAMPS_A_SAISIR") setFieldsRefresh((n) => n + 1);
      toast.error(message || "Téléchargement impossible");
    },
  });

  const pending = m.status === "PENDING";
  const confirmed = !m.status || m.status === "CONFIRMED";
  const needsSign = !!m.requiresSignature && !m.signedAt;
  const acc = m.accounting;

  return (
    <ModalPortal onClose={onClose} size="2xl">
      <div style={brandVars} className="space-y-5 rounded-[1.75rem] bg-white p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="flex flex-wrap items-center gap-2 text-lg font-bold text-gray-950">
              {MOVEMENT_TYPES[m.movementType]?.label ?? m.movementType}
              <StatusChip tone={st.tone}>{st.label}</StatusChip>
            </h3>
            <p className="font-mono text-xs text-gray-400">{m.movementNumber}</p>
          </div>
          <IconButton icon={X} label="Fermer" onClick={onClose} />
        </div>

        <p className={`text-3xl font-bold tracking-tight ${inflow ? "text-emerald-600" : "text-red-600"}`}>
          {inflow ? "+" : "−"} {formatMoney(m.amount)}
        </p>
        {m.reason && <p className="text-sm text-gray-600">{m.reason}</p>}
        {pending && <p className="rounded-2xl bg-amber-50 p-3 text-xs text-amber-800">Ce mouvement attend l'approbation d'un responsable{m.expiresAt ? ` avant le ${formatDateTime(m.expiresAt)}` : ""}.</p>}
        {m.cancelReason && <p className="rounded-2xl bg-gray-50 p-3 text-xs text-gray-600">Motif d'annulation : {m.cancelReason}</p>}
        {m.reversalReason && <p className="rounded-2xl bg-red-50 p-3 text-xs text-red-700">Motif de contre-passation : {m.reversalReason}</p>}

        <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
          <Detail label="Session" mono>{m.sessionNumber}</Detail>
          <Detail label="Caisse">{m.registerName || m.registerCode}</Detail>
          <Detail label="Nature">{m.natureCode}</Detail>
          <Detail label="Canal">{m.channel ? MOVEMENT_CHANNEL[m.channel] ?? m.channel : undefined}</Detail>
          <Detail label="Type de pièce">{m.documentType ? CASH_DOCUMENT_TYPE[m.documentType] ?? m.documentType : undefined}</Detail>
          <Detail label="N° de pièce" mono>{m.documentNumber}</Detail>
          <Detail label="Référence" mono>{m.referenceCode}</Detail>
          <Detail label="Contrepartie">{m.counterpartyName}</Detail>
          <Detail label="Client lié">{m.relatedCustomerName}</Detail>
          <Detail label="Reçu lié" mono>{m.relatedReceiptNumber}</Detail>
          <Detail label="Transaction liée" mono>{m.relatedTransactionNumber}</Detail>
          <Detail label="Mouvement lié" mono>{m.relatedMovementNumber}</Detail>
          <Detail label="Ordre de transfert" mono>{m.transferOrderNumber}</Detail>
          <Detail label="Solde après">{m.runningBalance != null ? formatMoney(m.runningBalance) : undefined}</Detail>
          <Detail label="Créé par">{m.createdBy}</Detail>
          <Detail label="Créé le">{formatDateTime(m.createdAt)}</Detail>
          <Detail label="Approuvé par">{m.approvedBy}</Detail>
          <Detail label="Approuvé le">{m.approvedAt ? formatDateTime(m.approvedAt) : undefined}</Detail>
          <Detail label="Signé par">{m.signedBy}</Detail>
          <Detail label="Signé le">{m.signedAt ? formatDateTime(m.signedAt) : undefined}</Detail>
          <Detail label="Imprimé le">{m.printedAt ? formatDateTime(m.printedAt) : undefined}</Detail>
          {m.exchangeRate != null && <Detail label="Taux de change">{m.exchangeRate}</Detail>}
        </dl>

        {acc && (acc.journalCode || acc.entryNumber || acc.beneficiaryName || acc.vatAmount != null || acc.supplierCode) && (
          <Section title="Comptabilité">
            <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
              <Detail label="Journal">{acc.journalCode}</Detail>
              <Detail label="Écriture" mono>{acc.entryNumber}</Detail>
              <Detail label="Statut">{acc.status}</Detail>
              <Detail label="TVA">{acc.vatAmount != null ? `${formatMoney(acc.vatAmount)}${acc.vatCode ? ` (${acc.vatCode})` : ""}` : undefined}</Detail>
              <Detail label="Fournisseur">{acc.supplierCode}</Detail>
              <Detail label="Bénéficiaire">{acc.beneficiaryName}</Detail>
              <Detail label="Pièce d'identité">{acc.beneficiaryIdNumber}</Detail>
              <Detail label="Téléphone">{acc.beneficiaryPhone}</Detail>
              <Detail label="Demande liée" mono>{acc.requestNumber}</Detail>
              <Detail label="Note">{acc.note}</Detail>
            </dl>
          </Section>
        )}

        {(m.attachments ?? []).length > 0 && (
          <Section title="Pièces jointes">
            <div className="space-y-2">
              {(m.attachments ?? []).map((a, i) => (
                <ItemRow key={a.id ?? `${a.storagePath}-${i}`} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-900">{a.label || a.fileName}</p>
                    <p className="truncate font-mono text-xs text-gray-500">{a.storagePath}</p>
                  </div>
                  <span className="shrink-0 text-xs text-gray-500">
                    {a.uploadedBy ?? ""} {a.uploadedAt ? formatDateTime(a.uploadedAt) : ""}
                  </span>
                </ItemRow>
              ))}
            </div>
          </Section>
        )}

        {isVoucher && <DocumentFieldsPanel key={`${m.movementNumber}-${fieldsRefresh}`} path={pieceFieldPaths.cashMovement(m.movementNumber)} />}

        {form === "cancel" || form === "reverse" ? (
          <PanelForm
            title={form === "cancel" ? "Annuler le mouvement" : "Contre-passer le mouvement"}
            onSubmit={(e) => {
              e.preventDefault();
              (form === "cancel" ? cancel : reverse).mutate();
            }}
            onCancel={close}
            pending={cancel.isPending || reverse.isPending}
            submitLabel={form === "cancel" ? "Annuler le mouvement" : "Contre-passer"}
            submitDisabled={reason.trim().length < 3}
            error={error}
          >
            <p className="text-xs text-gray-500">{form === "cancel" ? "Un mouvement en attente est annulé sans écriture." : "Crée un mouvement inverse : l'original reste visible, marqué contre-passé."}</p>
            <Field label="Motif" required>
              <textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} className={FIELD_SOFT} />
            </Field>
          </PanelForm>
        ) : form === "sign" ? (
          <PanelForm title="Signer la pièce" onSubmit={(e) => { e.preventDefault(); sign.mutate(); }} onCancel={close} pending={sign.isPending} submitLabel="Signer" submitDisabled={!signedBy.trim()} error={error}>
            <Field label="Signataire" required hint="Nom ou e-mail de la personne qui signe.">
              <input value={signedBy} onChange={(e) => setSignedBy(e.target.value)} className={FIELD_SOFT} />
            </Field>
          </PanelForm>
        ) : form === "attach" ? (
          <PanelForm title="Joindre une pièce" onSubmit={(e) => { e.preventDefault(); attach.mutate(); }} onCancel={close} pending={attach.isPending} submitLabel="Joindre" submitDisabled={!att.fileName.trim() || !att.storagePath.trim()} error={error}>
            <p className="text-xs text-gray-500">La pièce est référencée par son chemin de stockage : le fichier doit déjà être enregistré.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Nom du fichier" required>
                <input value={att.fileName} onChange={(e) => setAtt({ ...att, fileName: e.target.value })} className={FIELD_SOFT} />
              </Field>
              <Field label="Type de contenu">
                <input value={att.contentType} onChange={(e) => setAtt({ ...att, contentType: e.target.value })} className={FIELD_SOFT} />
              </Field>
              <Field label="Chemin de stockage" required>
                <input value={att.storagePath} onChange={(e) => setAtt({ ...att, storagePath: e.target.value })} className={`${FIELD_SOFT} font-mono`} />
              </Field>
              <Field label="Libellé">
                <input value={att.label} onChange={(e) => setAtt({ ...att, label: e.target.value })} className={FIELD_SOFT} />
              </Field>
            </div>
          </PanelForm>
        ) : (
          <div className="flex flex-wrap justify-end gap-2">
            {pending && canApprove && (
              <ActionButton icon={CheckCircle2} pending={approve.isPending} onClick={() => toast.confirm({ message: `Approuver ${m.movementNumber} ?`, detail: `${formatMoney(m.amount)} seront comptabilisés dans la session.`, confirmLabel: "Approuver", pendingLabel: "Approbation", onConfirm: () => approve.mutateAsync() })}>
                Approuver
              </ActionButton>
            )}
            {pending && canWrite && (
              <ActionButton variant="ghost" icon={Ban} onClick={() => setForm("cancel")}>
                Annuler
              </ActionButton>
            )}
            {confirmed && canWrite && m.movementType !== "PAYMENT" && (
              <ActionButton variant="danger" icon={Undo2} onClick={() => setForm("reverse")}>
                Contre-passer
              </ActionButton>
            )}
            {needsSign && canWrite && (
              <ActionButton variant="ghost" icon={PenLine} onClick={() => setForm("sign")}>
                Signer
              </ActionButton>
            )}
            {canWrite && (
              <ActionButton variant="ghost" icon={Paperclip} onClick={() => setForm("attach")}>
                Joindre
              </ActionButton>
            )}
            {canWrite && (
              <ActionButton variant="ghost" icon={Printer} pending={print.isPending} onClick={() => print.mutate()}>
                Imprimer
              </ActionButton>
            )}
            <ActionButton variant="ghost" icon={Download} pending={download.isPending} onClick={() => download.mutate()}>
              PDF
            </ActionButton>
          </div>
        )}
      </div>
    </ModalPortal>
  );
};
