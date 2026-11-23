import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Ban, CalendarClock, Copy, ExternalLink, FileMinus2, FilePen, Lock, RefreshCw, Search, ShieldCheck, Stamp } from "lucide-react";
import { billingService } from "../../services/billing.service";
import type { BillingDocument, BillingSchedule } from "../../services/billing.service";
import { ActionButton, ErrorBanner, ItemRow, ListHeader, Section, StatusChip, Tag } from "../../components/subscription/kit";
import { FIELD, FIELD_SOFT, apiMessage, formatDate, formatMoney } from "../../components/subscription/kitUtils";
import { toast } from "../../components/ui/toastStore";
import { currencyLabel } from "../../components/payment/paymentUtils";
import { DOC_TYPE_LABEL, STATUS_LABEL, STATUS_TONE } from "../../components/billing/billingLabels";
import { ApplyToPanel, CancelPanel, CreditNotePanel } from "../../components/billing/CreditNotePanel";

const CANCELLABLE = new Set(["DRAFT", "ISSUED", "SENT", "VIEWED", "ACCEPTED", "NEGOTIATION", "VALIDATED", "PARTIALLY_PAID", "PAID", "OVERDUE"]);

type Panel = null | "creditNote" | "applyTo" | "cancel";

export const BillingDocumentTools: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [documentNumber, setDocumentNumber] = useState("");
  const [scheduleNumber, setScheduleNumber] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [panel, setPanel] = useState<Panel>(null);

  const { data: document, isFetching: documentLoading, refetch } = useQuery({
    queryKey: ["billing-tools-document", documentNumber],
    queryFn: () => billingService.getDocument(documentNumber.trim()),
    enabled: false,
  });
  const typedDocument = document as BillingDocument | undefined;

  const { data: schedule, isFetching: scheduleLoading, refetch: refetchSchedule } = useQuery({
    queryKey: ["billing-tools-schedule", scheduleNumber],
    queryFn: () => billingService.getSchedule(scheduleNumber.trim()),
    enabled: false,
  });
  const typedSchedule = schedule as BillingSchedule | undefined;

  const loadDocument = async () => {
    if (!documentNumber.trim()) {
      setError("Renseignez un numéro de document.");
      return;
    }
    setError(null);
    setPanel(null);
    const result = await refetch();
    const doc = result.data as BillingDocument | undefined;
    if (!doc) {
      setError("Document introuvable.");
    }
  };

  const t = typedDocument?.documentType;
  const s = typedDocument?.status;
  const locked = !!typedDocument?.locked;
  const isDraft = s === "DRAFT";
  const isQuoteDoc = t === "QUOTE";
  const unpaid = (typedDocument?.paidAmount ?? 0) === 0;
  // Devis : révision jusqu'à l'acceptation incluse. Facture : brouillon, ou émise non payée (demande approuvée).
  const isEditable = isDraft || (isQuoteDoc && ["ISSUED", "SENT", "VIEWED", "NEGOTIATION", "ACCEPTED"].includes(s ?? "")) || (t === "INVOICE" && ["ISSUED", "SENT"].includes(s ?? "") && unpaid) || (!isQuoteDoc && t !== "INVOICE" && ["ISSUED", "SENT"].includes(s ?? ""));
  const isInvoice = t === "INVOICE";
  const isCreditNote = t === "CREDIT_NOTE";
  const canValidate = !locked && !!t && ["INVOICE", "CREDIT_NOTE", "DEBIT_NOTE", "PROFORMA_INVOICE"].includes(t) && !!s && ["DRAFT", "ISSUED"].includes(s);
  const canApplyToAnother = isCreditNote && locked && s !== "ISSUED";
  const canCancel = !!s && CANCELLABLE.has(s);
  const cur = currencyLabel(typedDocument?.currency);

  const invalidateDoc = (num: string) => {
    queryClient.invalidateQueries({ queryKey: ["billing-documents"] });
    queryClient.invalidateQueries({ queryKey: ["billing-document", num] });
    refetch();
  };

  const duplicateMutation = useMutation({
    mutationFn: () => billingService.duplicateDocument(typedDocument!.documentNumber),
    onSuccess: (doc) => {
      queryClient.invalidateQueries({ queryKey: ["billing-documents"] });
      toast.success("Document dupliqué.");
      navigate(`/billing/documents/${doc.documentNumber}`);
    },
    onError: (e: unknown) => setError(apiMessage(e, "Erreur lors de la duplication.")),
  });

  const issueMutation = useMutation({
    mutationFn: () => billingService.issueDocument(typedDocument!.documentNumber),
    onSuccess: (doc) => {
      setError(null);
      toast.success("Document émis.");
      invalidateDoc(doc.documentNumber);
    },
    // La dérogation (discountOverrideReason) se fait sur la fiche du document.
    onError: (e: unknown) => {
      const violations = (e as { response?: { data?: { violations?: { message: string }[] } } })?.response?.data?.violations;
      if (Array.isArray(violations) && violations.length > 0) {
        setError(`Émission bloquée par un dépassement de remise : ${violations.map((v) => v.message).join(" · ")}. Ouvrez le document pour fournir un motif de dérogation.`);
      } else {
        setError(apiMessage(e, "Erreur lors de l'émission."));
      }
    },
  });

  const validateMutation = useMutation({
    mutationFn: () => billingService.validateDocument(typedDocument!.documentNumber),
    onSuccess: (doc) => invalidateDoc(doc.documentNumber),
  });

  const askValidate = () =>
    toast.confirm({
      message: "Valider ce document (SEFC) ?",
      detail: `${DOC_TYPE_LABEL[t!] ?? t} ${typedDocument!.documentNumber}. Définitif : le numéro fiscal est attribué, le document est verrouillé et toute correction passera par un avoir.`,
      confirmLabel: "Valider",
      pendingLabel: "Validation",
      successMessage: "Document validé fiscalement.",
      errorMessage: "Erreur lors de la validation fiscale.",
      onConfirm: () => validateMutation.mutateAsync(),
    });

  const loadSchedule = async () => {
    if (!scheduleNumber.trim()) {
      setError("Renseignez un numéro d'échéancier.");
      return;
    }
    setError(null);
    await refetchSchedule();
  };


  return (
    <div className="mx-auto w-full max-w-4xl space-y-5">
      <ListHeader
        title="Outils documents"
        subtitle="Chargez un document une fois pour accéder aux actions transversales : édition, duplication, avoir, rectificative, validation fiscale et annulation."
      />

      <ErrorBanner message={error} />

      <div className="flex flex-col gap-3 rounded-[1.75rem] border border-gray-100 bg-white p-4 shadow-sm sm:flex-row">
        <input
          className={FIELD_SOFT}
          placeholder="Numéro de document (INV-, DEV-, CRN-)"
          value={documentNumber}
          onChange={(e) => setDocumentNumber(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && loadDocument()}
        />
        <ActionButton icon={Search} pending={documentLoading} onClick={loadDocument}>
          Charger
        </ActionButton>
      </div>

      {typedDocument && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-[1.75rem] border border-gray-100 bg-white p-5 shadow-sm">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-mono text-lg font-bold text-gray-950">{typedDocument.fiscalNumber ?? typedDocument.documentNumber}</h3>
                <Tag>{DOC_TYPE_LABEL[t!] ?? t}</Tag>
                <StatusChip tone={STATUS_TONE[s!] ?? "neutral"}>{STATUS_LABEL[s!] ?? s}</StatusChip>
                {locked && (
                  <StatusChip tone="success">
                    <Lock size={11} className="mr-1 inline" />
                    Scellé SEFC
                  </StatusChip>
                )}
              </div>
              <p className="mt-1 text-sm text-gray-500">
                {typedDocument.customerName ?? typedDocument.customerCode ?? "Client non renseigné"} · {formatMoney(typedDocument.totalAmount, cur)}
              </p>
            </div>
            <ActionButton variant="ghost" icon={ExternalLink} onClick={() => navigate(`/billing/documents/${typedDocument.documentNumber}`)}>
              Ouvrir le détail
            </ActionButton>
          </div>

          <Section title="Actions" icon={FilePen}>
            <div className="flex flex-wrap gap-2">
              {isDraft && (
                <ActionButton icon={Stamp} pending={issueMutation.isPending} onClick={() => issueMutation.mutate()}>
                  Émettre
                </ActionButton>
              )}
              <ActionButton variant="ghost" icon={Copy} pending={duplicateMutation.isPending} onClick={() => duplicateMutation.mutate()}>
                Dupliquer
              </ActionButton>
              {canValidate && (
                <ActionButton icon={ShieldCheck} onClick={askValidate}>
                  Valider (SEFC)
                </ActionButton>
              )}
              {isInvoice && locked && (
                <>
                  <ActionButton variant="ghost" icon={FileMinus2} onClick={() => setPanel(panel === "creditNote" ? null : "creditNote")}>
                    Créer un avoir
                  </ActionButton>
                  <ActionButton variant="ghost" icon={FilePen} onClick={() => navigate(`/billing/documents/${typedDocument.documentNumber}?panel=corrective`)}>
                    Créer une rectificative
                  </ActionButton>
                </>
              )}
              {canApplyToAnother && (
                <ActionButton variant="ghost" icon={RefreshCw} onClick={() => setPanel(panel === "applyTo" ? null : "applyTo")}>
                  Réappliquer à une autre facture
                </ActionButton>
              )}
              {canCancel && (
                <ActionButton variant="ghost" icon={Ban} onClick={() => setPanel(panel === "cancel" ? null : "cancel")}>
                  Annuler
                </ActionButton>
              )}
            </div>

            {panel && (
              <div className="mt-4">
                {panel === "creditNote" && (
                  <CreditNotePanel
                    invoiceNumber={typedDocument.documentNumber}
                    balanceDue={typedDocument.balanceDue}
                    currency={typedDocument.currency}
                    onCancel={() => setPanel(null)}
                    onCreated={(cn) => navigate(`/billing/documents/${cn.documentNumber}`)}
                  />
                )}
                {panel === "applyTo" && (
                  <ApplyToPanel
                    creditNoteNumber={typedDocument.documentNumber}
                    onCancel={() => setPanel(null)}
                    onApplied={(doc) => {
                      setPanel(null);
                      invalidateDoc(doc.documentNumber);
                    }}
                  />
                )}
                {panel === "cancel" && (
                  <CancelPanel
                    documentNumber={typedDocument.documentNumber}
                    locked={locked}
                    onCancel={() => setPanel(null)}
                    onCancelled={(doc) => {
                      setPanel(null);
                      invalidateDoc(doc.documentNumber);
                    }}
                  />
                )}
              </div>
            )}
          </Section>

          <Section title="Modification" icon={FilePen}>
            {isEditable && !locked ? (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-gray-600">{isDraft ? "Brouillon : le formulaire complet s'ouvre prérempli." : isQuoteDoc ? "Devis déjà émis : une révision (motif obligatoire) archive la version et remet le devis en négociation ; un devis accepté perd ses signatures et libère son stock réservé." : "Facture émise non payée : la modification passe par une demande soumise au circuit d'approbation (nouvelle version, ou rectificative si la facture est certifiée)."}</p>
                <ActionButton icon={FilePen} onClick={() => navigate(`/billing/documents/${typedDocument!.documentNumber}/edit`)}>{isDraft ? "Modifier le document" : isQuoteDoc ? "Réviser le devis" : "Demander une modification"}</ActionButton>
              </div>
            ) : (
              <span className="inline-flex items-center gap-1 text-sm text-gray-500"><Lock size={14} /> Ce document n'est plus modifiable à ce statut.</span>
            )}
          </Section>
        </>
      )}

      <Section title="Échéancier par numéro" icon={CalendarClock}>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input className={FIELD} placeholder="Numéro d'échéancier" value={scheduleNumber} onChange={(e) => setScheduleNumber(e.target.value)} onKeyDown={(e) => e.key === "Enter" && loadSchedule()} />
          <ActionButton icon={Search} pending={scheduleLoading} onClick={loadSchedule}>
            Charger
          </ActionButton>
        </div>
        {typedSchedule && (
          <div className="mt-4 space-y-2">
            <p className="font-mono text-sm font-bold text-gray-950">{typedSchedule.scheduleNumber}</p>
            {(typedSchedule.installments || []).map((i) => (
              <ItemRow key={i.installmentNumber} className="flex items-center justify-between gap-3 !p-3 text-sm">
                <span className="min-w-0 truncate">
                  <span className="font-mono text-xs font-semibold text-[color:var(--logo-pink-dark)]">{i.installmentNumber}</span> · {formatDate(i.dueDate)}
                </span>
                <span className="shrink-0 font-semibold tabular-nums text-gray-900">
                  {formatMoney(i.amount ?? 0, currencyLabel(typedDocument?.currency))} <Tag>{i.status}</Tag>
                </span>
              </ItemRow>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
};
