import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Copy,
  Loader2,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  FileText,
  Ban,
  Plus,
  Trash2,
  ExternalLink,
  Lock,
  Send,
  Package,
} from "lucide-react";
import { billingService } from "../../services/billing.service";
import type {
  BillingDocument,
  BillingSchedule,
  UpdateBillingLinePayload,
  BillingCatalogLookupItem,
} from "../../services/billing.service";

const inputCls =
  "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500";

const documentTypeLabels: Record<string, string> = {
  QUOTE: "Devis",
  PROFORMA_INVOICE: "Proforma",
  INVOICE: "Facture",
  CREDIT_NOTE: "Avoir",
  DEBIT_NOTE: "Note de débit",
  CORRECTIVE_INVOICE: "Rectificative",
};

const statusLabels: Record<string, string> = {
  DRAFT: "Brouillon",
  ISSUED: "Émis(e)",
  SENT: "Envoyé(e)",
  VALIDATED: "Validé SEFC",
  PARTIALLY_PAID: "Partiellement payé(e)",
  PAID: "Payé(e)",
  OVERDUE: "En retard",
  CANCELLED: "Annulé(e)",
  VOIDED: "Annulé(e)",
  REFUNDED: "Remboursé(e)",
  WRITTEN_OFF: "Passé(e) en perte",
};

type EditableLine = UpdateBillingLinePayload & { _key: string };

const emptyLine = (lineOrder: number): EditableLine => ({
  _key: `new-${lineOrder}-${Date.now()}`,
  action: "UPSERT",
  lineOrder,
  lineType: "SERVICE",
  description: "",
  quantity: 1,
  unit: "",
  unitPrice: 0,
  discountRate: 0,
  taxable: true,
  optional: false,
});

export const BillingDocumentTools: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [documentNumber, setDocumentNumber] = useState("");
  const [scheduleNumber, setScheduleNumber] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Formulaire d'édition - champs communs aux deux modes (DRAFT / restreint)
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    issueDate: "",
    dueDate: "",
    terms: "",
    customerReference: "",
    poNumber: "",
    projectCode: "",
    salespersonCode: "",
    paymentInstructions: "",
    bankDetailsJson: "",
    language: "fr",
    internalNotes: "",
  });
  const [editLines, setEditLines] = useState<EditableLine[]>([]);

  // Recherche catalogue pour préremplir une ligne en édition - même mécanisme
  // qu'en création (billing-enhancements.md §3.2 : "création ou édition")
  const [catalogPickerKey, setCatalogPickerKey] = useState<string | null>(
    null,
  );
  const [catalogQuery, setCatalogQuery] = useState("");
  const { data: catalogResults } = useQuery({
    queryKey: ["billing-catalog-lookup-line", catalogQuery],
    queryFn: () => billingService.catalogLookup({ q: catalogQuery, size: 8 }),
    enabled: catalogPickerKey !== null && catalogQuery.trim().length > 1,
  });
  const catalogItems: BillingCatalogLookupItem[] =
    catalogResults?.content ?? [];

  const applyCatalogItem = (key: string, item: BillingCatalogLookupItem) => {
    setEditLines((current) =>
      current.map((l) =>
        l._key === key
          ? {
              ...l,
              description: item.name,
              unitPrice: item.unitPrice,
              unit: item.unit || l.unit,
              catalogSourceType: item.sourceType,
              catalogSourceCode: item.sourceCode,
            }
          : l,
      ),
    );
    setCatalogPickerKey(null);
    setCatalogQuery("");
  };
  const [removedLineOrders, setRemovedLineOrders] = useState<number[]>([]);

  // Panneau "Créer un avoir" compact
  const [showCreditNotePanel, setShowCreditNotePanel] = useState(false);
  const [creditNoteForm, setCreditNoteForm] = useState({
    amount: "",
    reason: "",
    validateImmediately: false,
    applyImmediately: false,
  });

  // Panneau "Réappliquer un avoir"
  const [showApplyToPanel, setShowApplyToPanel] = useState(false);
  const [applyToTarget, setApplyToTarget] = useState("");

  const {
    data: document,
    isLoading: documentLoading,
    refetch,
  } = useQuery({
    queryKey: ["billing-tools-document", documentNumber],
    queryFn: () => billingService.getDocument(documentNumber.trim()),
    enabled: false,
  });

  const typedDocument = document as BillingDocument | undefined;

  const {
    data: schedule,
    isLoading: scheduleLoading,
    refetch: refetchSchedule,
  } = useQuery({
    queryKey: ["billing-tools-schedule", scheduleNumber],
    queryFn: () => billingService.getSchedule(scheduleNumber.trim()),
    enabled: false,
  });

  const typedSchedule = schedule as BillingSchedule | undefined;

  const resetPanels = () => {
    setShowCreditNotePanel(false);
    setShowApplyToPanel(false);
    setCreditNoteForm({
      amount: "",
      reason: "",
      validateImmediately: false,
      applyImmediately: false,
    });
    setApplyToTarget("");
  };

  const loadDocument = async () => {
    if (!documentNumber.trim()) {
      setError("Renseigne un numéro de document.");
      return;
    }
    setError(null);
    setNotice(null);
    resetPanels();
    const result = await refetch();
    const doc = result.data as BillingDocument | undefined;
    if (doc) {
      setEditForm({
        title: doc.title || "",
        description: doc.description || "",
        issueDate: doc.issueDate || "",
        dueDate: doc.dueDate || "",
        terms: doc.terms || "",
        customerReference: doc.customerReference || "",
        poNumber: doc.poNumber || "",
        projectCode: doc.projectCode || "",
        salespersonCode: doc.salespersonCode || "",
        paymentInstructions: doc.paymentInstructions || "",
        bankDetailsJson: doc.bankDetailsJson || "",
        language: doc.language || "fr",
        internalNotes: doc.internalNotes || "",
      });
      setEditLines(
        (doc.lines || []).map((l, idx) => ({
          _key: `existing-${l.lineOrder ?? idx}`,
          action: "UPSERT",
          lineOrder: l.lineOrder ?? idx + 1,
          lineType: l.lineType,
          description: l.description,
          quantity: l.quantity,
          unit: l.unit,
          unitPrice: l.unitPrice,
          discountRate: l.discountRate,
          taxable: l.taxable,
          optional: l.optional,
          externalReference: l.externalReference,
          notes: l.notes,
        })),
      );
      setRemovedLineOrders([]);
    } else {
      setError("Document introuvable.");
    }
  };

  const t = typedDocument?.documentType;
  const s = typedDocument?.status;
  const locked = !!typedDocument?.locked;
  const isDraft = s === "DRAFT";
  const isRestrictedEditable = s === "ISSUED" || s === "SENT";
  const isEditable = isDraft || isRestrictedEditable;
  const isInvoice = t === "INVOICE";
  const isCreditNote = t === "CREDIT_NOTE";
  const canValidate =
    !locked &&
    !!t &&
    ["INVOICE", "CREDIT_NOTE", "DEBIT_NOTE", "PROFORMA_INVOICE"].includes(t) &&
    !!s &&
    ["DRAFT", "ISSUED"].includes(s);
  const canApplyToAnother = isCreditNote && locked && s !== "ISSUED";
  const cancellableStatuses = new Set([
    "DRAFT",
    "ISSUED",
    "SENT",
    "VIEWED",
    "ACCEPTED",
    "NEGOTIATION",
    "VALIDATED",
    "PARTIALLY_PAID",
    "PAID",
    "OVERDUE",
  ]);
  const canCancel = !!s && cancellableStatuses.has(s);

  const invalidateDoc = (num: string) => {
    queryClient.invalidateQueries({ queryKey: ["billing-documents"] });
    queryClient.invalidateQueries({ queryKey: ["billing-document", num] });
    refetch();
  };

  const updateMutation = useMutation({
    mutationFn: () => {
      if (!typedDocument) throw new Error("Charge d’abord un document.");
      const base = {
        dueDate: editForm.dueDate || undefined,
        terms: editForm.terms || undefined,
        paymentInstructions: editForm.paymentInstructions || undefined,
        bankDetailsJson: editForm.bankDetailsJson || undefined,
        internalNotes: editForm.internalNotes || undefined,
      };
      if (!isDraft) {
        // Édition restreinte (ISSUED / SENT) - seuls ces champs sont acceptés,
        // le reste est ignoré silencieusement par le backend.
        return billingService.updateDocument(typedDocument.documentNumber, base);
      }
      // Édition complète (DRAFT)
      const lines: UpdateBillingLinePayload[] = [
        ...editLines.map(({ _key, ...line }) => line),
        ...removedLineOrders.map((lineOrder) => ({
          action: "REMOVE" as const,
          lineOrder,
        })),
      ];
      return billingService.updateDocument(typedDocument.documentNumber, {
        ...base,
        title: editForm.title || undefined,
        description: editForm.description || undefined,
        issueDate: editForm.issueDate || undefined,
        customerReference: editForm.customerReference || undefined,
        poNumber: editForm.poNumber || undefined,
        projectCode: editForm.projectCode || undefined,
        salespersonCode: editForm.salespersonCode || undefined,
        language: editForm.language || undefined,
        lines,
      });
    },
    onSuccess: (doc) => {
      setError(null);
      setNotice("Document mis à jour.");
      invalidateDoc(doc.documentNumber);
    },
    onError: (e: any) =>
      setError(
        e?.response?.data?.message ||
          e?.message ||
          "Erreur lors de la mise à jour.",
      ),
  });

  const duplicateMutation = useMutation({
    mutationFn: () => {
      if (!typedDocument) throw new Error("Charge d’abord un document.");
      return billingService.duplicateDocument(typedDocument.documentNumber);
    },
    onSuccess: (doc) => {
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["billing-documents"] });
      navigate(`/billing/documents/${doc.documentNumber}`);
    },
    onError: (e: any) =>
      setError(
        e?.response?.data?.message ||
          e?.message ||
          "Erreur lors de la duplication.",
      ),
  });

  const issueMutation = useMutation({
    mutationFn: () => billingService.issueDocument(typedDocument!.documentNumber),
    onSuccess: (doc) => {
      setError(null);
      setNotice("Document émis.");
      invalidateDoc(doc.documentNumber);
    },
    onError: (e: any) =>
      setError(e?.response?.data?.message || "Erreur lors de l’émission."),
  });

  const validateMutation = useMutation({
    mutationFn: () =>
      billingService.validateDocument(typedDocument!.documentNumber),
    onSuccess: (doc) => {
      setError(null);
      setNotice(`Document validé fiscalement - n° ${doc.fiscalNumber}.`);
      invalidateDoc(doc.documentNumber);
    },
    onError: (e: any) =>
      setError(
        e?.response?.data?.message || "Erreur lors de la validation fiscale.",
      ),
  });

  const cancelMutation = useMutation({
    mutationFn: (reason: string) =>
      billingService.cancelDocument(typedDocument!.documentNumber, reason),
    onSuccess: (doc) => {
      setError(null);
      setNotice(
        doc.locked
          ? `Facture annulée via avoir. Reste validée (SEFC), statut : ${statusLabels[doc.status] ?? doc.status}.`
          : "Document annulé.",
      );
      invalidateDoc(doc.documentNumber);
    },
    onError: (e: any) =>
      setError(e?.response?.data?.message || "Erreur lors de l’annulation."),
  });

  const createCreditNoteMutation = useMutation({
    mutationFn: () =>
      billingService.createCreditNote(typedDocument!.documentNumber, {
        amount: creditNoteForm.amount ? parseFloat(creditNoteForm.amount) : null,
        reason: creditNoteForm.reason,
        validateImmediately: creditNoteForm.validateImmediately,
        applyImmediately: creditNoteForm.applyImmediately,
      }),
    onSuccess: (creditNote) => {
      setError(null);
      resetPanels();
      queryClient.invalidateQueries({ queryKey: ["billing-documents"] });
      navigate(`/billing/documents/${creditNote.documentNumber}`);
    },
    onError: (e: any) =>
      setError(e?.response?.data?.message || "Erreur lors de la création de l’avoir."),
  });

  const applyCreditNoteToMutation = useMutation({
    mutationFn: () =>
      billingService.applyCreditNoteTo(
        typedDocument!.documentNumber,
        applyToTarget.trim(),
      ),
    onSuccess: (doc) => {
      setError(null);
      setNotice(`Avoir appliqué sur ${applyToTarget.trim()}.`);
      resetPanels();
      invalidateDoc(doc.documentNumber);
    },
    onError: (e: any) =>
      setError(
        e?.response?.data?.message ||
          "Erreur lors de la ré-application de l’avoir.",
      ),
  });

  const loadSchedule = async () => {
    if (!scheduleNumber.trim()) {
      setError("Renseigne un numéro d’échéancier.");
      return;
    }
    setError(null);
    await refetchSchedule();
  };

  const updateLine = (
    key: string,
    field: keyof EditableLine,
    value: any,
  ) => {
    setEditLines((lines) =>
      lines.map((l) => (l._key === key ? { ...l, [field]: value } : l)),
    );
  };

  const removeLine = (line: EditableLine) => {
    setEditLines((lines) => lines.filter((l) => l._key !== line._key));
    if (typeof line.lineOrder === "number" && !line._key.startsWith("new-")) {
      setRemovedLineOrders((prev) => [...prev, line.lineOrder as number]);
    }
  };

  const addLine = () => {
    const nextOrder =
      Math.max(0, ...editLines.map((l) => l.lineOrder ?? 0)) + 1;
    setEditLines((lines) => [...lines, emptyLine(nextOrder)]);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">
          Outils documents
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Recherchez un document une fois pour accéder à toutes les actions
          transversales : édition, duplication, avoir, rectificative,
          validation fiscale et annulation.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="underline shrink-0 ml-3">
            Fermer
          </button>
        </div>
      )}
      {notice && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm flex justify-between items-center">
          <span>{notice}</span>
          <button onClick={() => setNotice(null)} className="underline shrink-0 ml-3">
            Fermer
          </button>
        </div>
      )}

      {/* Recherche unique */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex gap-3">
          <input
            className={inputCls}
            placeholder="Numéro de document (INV-..., DEV-..., CRN-...)"
            value={documentNumber}
            onChange={(e) => setDocumentNumber(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && loadDocument()}
          />
          <button
            onClick={loadDocument}
            disabled={documentLoading}
            className="px-5 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 inline-flex items-center gap-2 disabled:opacity-50 shrink-0"
          >
            {documentLoading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Search size={16} />
            )}
            Charger
          </button>
        </div>
      </div>

      {typedDocument && (
        <>
          {/* Résumé + statut */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h3 className="text-lg font-bold text-gray-900 font-mono">
                  {typedDocument.fiscalNumber ?? typedDocument.documentNumber}
                </h3>
                <span className="px-2.5 py-1 rounded-full text-xs bg-gray-100 text-gray-700">
                  {documentTypeLabels[t!] ?? t}
                </span>
                <span className="px-2.5 py-1 rounded-full text-xs bg-blue-100 text-blue-700">
                  {statusLabels[s!] ?? s}
                </span>
                {locked && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <Lock size={11} /> Verrouillé SEFC
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-1">
                {typedDocument.customerName ??
                  typedDocument.customerCode ??
                  "Client non renseigné"}
              </p>
            </div>
            <button
              onClick={() =>
                navigate(`/billing/documents/${typedDocument.documentNumber}`)
              }
              className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 inline-flex items-center gap-2 text-sm"
            >
              <ExternalLink size={15} /> Ouvrir le détail
            </button>
          </div>

          {/* Actions rapides */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Actions</h3>
            <div className="flex flex-wrap gap-3">
              {isDraft && (
                <button
                  onClick={() => issueMutation.mutate()}
                  disabled={issueMutation.isPending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm inline-flex items-center gap-2 disabled:opacity-50"
                >
                  {issueMutation.isPending ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <Send size={15} />
                  )}
                  Émettre
                </button>
              )}
              <button
                onClick={() => duplicateMutation.mutate()}
                disabled={duplicateMutation.isPending}
                className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 inline-flex items-center gap-2 disabled:opacity-50 text-sm"
              >
                {duplicateMutation.isPending ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Copy size={16} />
                )}
                Dupliquer
              </button>

              {canValidate && (
                <button
                  onClick={() => {
                    const confirmed = confirm(
                      `⚠️ Valider ce document SEFC ?\n\nCette action est définitive. Une fois validé :\n• Le numéro fiscal sera assigné et ne pourra plus changer\n• Le document sera verrouillé et ne pourra plus être modifié\n• Un avoir devra être créé pour toute correction\n\nNuméro actuel : ${typedDocument.documentNumber}\nType : ${documentTypeLabels[t!] ?? t}`,
                    );
                    if (confirmed) validateMutation.mutate();
                  }}
                  disabled={validateMutation.isPending}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm inline-flex items-center gap-2 disabled:opacity-50"
                >
                  {validateMutation.isPending ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <ShieldCheck size={15} />
                  )}
                  Valider (SEFC)
                </button>
              )}

              {isInvoice && locked && (
                <button
                  onClick={() => {
                    setShowApplyToPanel(false);
                    setShowCreditNotePanel((v) => !v);
                  }}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm inline-flex items-center gap-2"
                >
                  <FileText size={15} /> Créer un avoir
                </button>
              )}

              {isInvoice && locked && (
                <button
                  onClick={() =>
                    navigate(
                      `/billing/documents/${typedDocument.documentNumber}?panel=corrective`,
                    )
                  }
                  className="px-4 py-2 bg-violet-600 text-white rounded-lg text-sm inline-flex items-center gap-2"
                >
                  <FileText size={15} /> Créer une rectificative
                </button>
              )}

              {canApplyToAnother && (
                <button
                  onClick={() => {
                    setShowCreditNotePanel(false);
                    setShowApplyToPanel((v) => !v);
                  }}
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm inline-flex items-center gap-2"
                >
                  <RefreshCw size={15} /> Réappliquer à une autre facture
                </button>
              )}

              {canCancel && (
                <button
                  onClick={() => {
                    const reason = window.prompt(
                      "Motif de l’annulation (obligatoire) :",
                    );
                    if (reason && reason.trim())
                      cancelMutation.mutate(reason.trim());
                  }}
                  disabled={cancelMutation.isPending}
                  className="px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 text-sm inline-flex items-center gap-2 disabled:opacity-50"
                >
                  {cancelMutation.isPending ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <Ban size={15} />
                  )}
                  Annuler
                </button>
              )}
            </div>

            {/* Panneau avoir compact */}
            {showCreditNotePanel && (
              <div className="mt-5 p-5 bg-orange-50/60 rounded-xl space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Montant{" "}
                      <span className="text-gray-400 font-normal">
                        (vide = solde dû,{" "}
                        {typedDocument.balanceDue.toLocaleString("fr-FR")}{" "}
                        {typedDocument.currency})
                      </span>
                    </label>
                    <input
                      type="number"
                      className={inputCls}
                      value={creditNoteForm.amount}
                      onChange={(e) =>
                        setCreditNoteForm({
                          ...creditNoteForm,
                          amount: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Motif *
                    </label>
                    <input
                      className={inputCls}
                      value={creditNoteForm.reason}
                      onChange={(e) =>
                        setCreditNoteForm({
                          ...creditNoteForm,
                          reason: e.target.value,
                        })
                      }
                      placeholder="Ex: Erreur sur la ligne TVA"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-5">
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={creditNoteForm.validateImmediately}
                      onChange={(e) =>
                        setCreditNoteForm({
                          ...creditNoteForm,
                          validateImmediately: e.target.checked,
                        })
                      }
                    />
                    Sceller immédiatement (SEFC)
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={creditNoteForm.applyImmediately}
                      onChange={(e) =>
                        setCreditNoteForm({
                          ...creditNoteForm,
                          applyImmediately: e.target.checked,
                        })
                      }
                    />
                    Appliquer immédiatement
                  </label>
                </div>
                <button
                  onClick={() => createCreditNoteMutation.mutate()}
                  disabled={
                    !creditNoteForm.reason.trim() ||
                    createCreditNoteMutation.isPending
                  }
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm hover:bg-orange-700 disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {createCreditNoteMutation.isPending ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    "Créer l'avoir"
                  )}
                </button>
              </div>
            )}

            {/* Panneau réapplication compact */}
            {showApplyToPanel && (
              <div className="mt-5 p-5 bg-teal-50/60 rounded-xl space-y-3">
                <p className="text-sm text-gray-500">
                  La facture cible doit appartenir au même client.
                </p>
                <div className="flex gap-3">
                  <input
                    className={`${inputCls} font-mono`}
                    placeholder="N° de la facture cible (INV-... ou PRF-...)"
                    value={applyToTarget}
                    onChange={(e) => setApplyToTarget(e.target.value)}
                  />
                  <button
                    onClick={() => applyCreditNoteToMutation.mutate()}
                    disabled={
                      !applyToTarget.trim() ||
                      applyCreditNoteToMutation.isPending
                    }
                    className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm hover:bg-teal-700 disabled:opacity-50 inline-flex items-center gap-2 shrink-0"
                  >
                    {applyCreditNoteToMutation.isPending ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      "Appliquer"
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Édition - deux modes selon le statut */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">
                {isDraft
                  ? "Édition complète (brouillon)"
                  : isRestrictedEditable
                    ? "Édition restreinte"
                    : "Lecture seule"}
              </h3>
              {!isEditable && (
                <span className="text-xs text-gray-400 inline-flex items-center gap-1">
                  <Lock size={12} /> Document non modifiable à ce statut
                </span>
              )}
            </div>

            {!isEditable && (
              <p className="text-sm text-gray-500">
                Seuls les documents en statut Brouillon (édition complète),
                Émis ou Envoyé (édition restreinte) peuvent être modifiés.
                Pour corriger un document verrouillé, utilisez « Créer un
                avoir » ou « Créer une rectificative » ci-dessus.
              </p>
            )}

            {isEditable && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {isDraft && (
                    <>
                      <div>
                        <label className="block text-sm font-medium mb-1">Titre</label>
                        <input
                          className={inputCls}
                          value={editForm.title}
                          onChange={(e) =>
                            setEditForm({ ...editForm, title: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Date d'émission
                        </label>
                        <input
                          type="date"
                          className={inputCls}
                          value={editForm.issueDate}
                          onChange={(e) =>
                            setEditForm({ ...editForm, issueDate: e.target.value })
                          }
                        />
                      </div>
                    </>
                  )}
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Date d'échéance
                    </label>
                    <input
                      type="date"
                      className={inputCls}
                      value={editForm.dueDate}
                      onChange={(e) =>
                        setEditForm({ ...editForm, dueDate: e.target.value })
                      }
                    />
                  </div>
                  {isDraft && (
                    <>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium mb-1">
                          Description
                        </label>
                        <textarea
                          className={inputCls}
                          rows={2}
                          value={editForm.description}
                          onChange={(e) =>
                            setEditForm({ ...editForm, description: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Référence client
                        </label>
                        <input
                          className={inputCls}
                          value={editForm.customerReference}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              customerReference: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          N° bon de commande
                        </label>
                        <input
                          className={inputCls}
                          value={editForm.poNumber}
                          onChange={(e) =>
                            setEditForm({ ...editForm, poNumber: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Code projet
                        </label>
                        <input
                          className={inputCls}
                          value={editForm.projectCode}
                          onChange={(e) =>
                            setEditForm({ ...editForm, projectCode: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Commercial
                        </label>
                        <input
                          className={inputCls}
                          value={editForm.salespersonCode}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              salespersonCode: e.target.value,
                            })
                          }
                        />
                      </div>
                    </>
                  )}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1">
                      Conditions
                    </label>
                    <textarea
                      className={inputCls}
                      rows={2}
                      value={editForm.terms}
                      onChange={(e) =>
                        setEditForm({ ...editForm, terms: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Instructions de paiement
                    </label>
                    <input
                      className={inputCls}
                      value={editForm.paymentInstructions}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          paymentInstructions: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Coordonnées bancaires (JSON)
                    </label>
                    <input
                      className={`${inputCls} font-mono`}
                      value={editForm.bankDetailsJson}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          bankDetailsJson: e.target.value,
                        })
                      }
                      placeholder='{"bank":"Eco Bank","rib":"..."}'
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1">
                      Notes internes{" "}
                      <span className="text-gray-400 font-normal">
                        (jamais visibles du client)
                      </span>
                    </label>
                    <textarea
                      className={inputCls}
                      rows={2}
                      value={editForm.internalNotes}
                      onChange={(e) =>
                        setEditForm({ ...editForm, internalNotes: e.target.value })
                      }
                    />
                  </div>
                </div>

                {isDraft && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Lignes
                      </label>
                      <button
                        onClick={addLine}
                        className="text-sm text-primary-600 hover:text-primary-700 inline-flex items-center gap-1"
                      >
                        <Plus size={14} /> Ajouter une ligne
                      </button>
                    </div>
                    <div className="space-y-2">
                      {editLines.map((line) => (
                        <div
                          key={line._key}
                          className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center bg-gray-50 rounded-lg p-3"
                        >
                          <div className="md:col-span-4 relative">
                            <div className="relative">
                              <input
                                value={line.description ?? ""}
                                onChange={(e) =>
                                  updateLine(
                                    line._key,
                                    "description",
                                    e.target.value,
                                  )
                                }
                                placeholder="Description"
                                className="w-full pl-3 pr-8 py-2 border border-gray-200 rounded-lg text-sm"
                              />
                              <button
                                type="button"
                                title="Rechercher dans le catalogue"
                                onClick={() => {
                                  setCatalogPickerKey(
                                    catalogPickerKey === line._key
                                      ? null
                                      : line._key,
                                  );
                                  setCatalogQuery("");
                                }}
                                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-primary-600 rounded"
                              >
                                <Package size={14} />
                              </button>
                              {line.catalogSourceCode && (
                                <span
                                  title={`Depuis le catalogue (${line.catalogSourceCode})`}
                                  className="absolute -left-2 -top-2 inline-flex items-center justify-center w-4 h-4 bg-primary-50 text-primary-600 rounded-full border border-white"
                                >
                                  <Package size={9} />
                                </span>
                              )}
                            </div>
                            {catalogPickerKey === line._key && (
                              <div className="absolute z-20 mt-1 w-80 bg-white border border-gray-200 rounded-xl shadow-lg">
                                <div className="p-2 border-b border-gray-100 relative">
                                  <Search
                                    size={13}
                                    className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                                  />
                                  <input
                                    autoFocus
                                    type="text"
                                    value={catalogQuery}
                                    onChange={(e) =>
                                      setCatalogQuery(e.target.value)
                                    }
                                    placeholder="Rechercher un article, un service..."
                                    className="w-full pl-7 pr-2 py-1.5 text-sm border-0 focus:outline-none"
                                  />
                                </div>
                                <div className="max-h-56 overflow-y-auto">
                                  {catalogQuery.trim().length <= 1 ? (
                                    <p className="p-3 text-xs text-gray-400">
                                      Tapez au moins 2 caractères pour
                                      rechercher.
                                    </p>
                                  ) : catalogItems.length === 0 ? (
                                    <p className="p-3 text-xs text-gray-400">
                                      Aucun résultat.
                                    </p>
                                  ) : (
                                    catalogItems.map((item) => (
                                      <button
                                        key={`${item.sourceType}-${item.sourceCode}`}
                                        type="button"
                                        onClick={() =>
                                          applyCatalogItem(line._key, item)
                                        }
                                        className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b border-gray-50 last:border-0"
                                      >
                                        <p className="text-sm font-medium text-gray-900">
                                          {item.name}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                          {item.unitPrice.toLocaleString(
                                            "fr-FR",
                                          )}{" "}
                                          {item.currency}
                                          {item.unit
                                            ? ` / ${item.unit}`
                                            : ""}{" "}
                                          · {item.sourceType}
                                        </p>
                                      </button>
                                    ))
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setCatalogPickerKey(null)}
                                  className="w-full text-center py-1.5 text-xs text-gray-400 hover:text-gray-600 border-t border-gray-100"
                                >
                                  Fermer
                                </button>
                              </div>
                            )}
                          </div>
                          <input
                            type="number"
                            value={line.quantity ?? 1}
                            onChange={(e) =>
                              updateLine(
                                line._key,
                                "quantity",
                                Number(e.target.value) || 0,
                              )
                            }
                            placeholder="Qté"
                            className="md:col-span-2 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                          />
                          <input
                            value={line.unit ?? ""}
                            onChange={(e) => updateLine(line._key, "unit", e.target.value)}
                            placeholder="Unité"
                            className="md:col-span-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                          />
                          <input
                            type="number"
                            value={line.unitPrice ?? 0}
                            onChange={(e) =>
                              updateLine(
                                line._key,
                                "unitPrice",
                                Number(e.target.value) || 0,
                              )
                            }
                            placeholder="Prix unitaire"
                            className="md:col-span-2 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                          />
                          <label className="md:col-span-2 flex items-center gap-2 text-xs text-gray-600 px-1">
                            <input
                              type="checkbox"
                              checked={line.taxable ?? true}
                              onChange={(e) =>
                                updateLine(line._key, "taxable", e.target.checked)
                              }
                            />
                            Taxable
                          </label>
                          <button
                            onClick={() => removeLine(line)}
                            className="md:col-span-1 p-2 text-red-500 hover:bg-red-50 rounded-lg flex justify-center"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                      {editLines.length === 0 && (
                        <p className="text-sm text-gray-400 py-3">
                          Aucune ligne - cliquez sur « Ajouter une ligne ».
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-3 pt-2">
                  <button
                    onClick={() => updateMutation.mutate()}
                    disabled={updateMutation.isPending}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 inline-flex items-center gap-2 disabled:opacity-50"
                  >
                    {updateMutation.isPending ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Save size={16} />
                    )}
                    Mettre à jour
                  </button>
                </div>
              </>
            )}
          </div>
        </>
      )}

      {/* Échéancier par numéro */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
        <h3 className="font-semibold text-gray-900">Échéancier par numéro</h3>
        <div className="flex gap-3">
          <input
            className={inputCls}
            placeholder="Numéro échéancier"
            value={scheduleNumber}
            onChange={(e) => setScheduleNumber(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && loadSchedule()}
          />
          <button
            onClick={loadSchedule}
            disabled={scheduleLoading}
            className="px-5 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 inline-flex items-center gap-2 disabled:opacity-50 shrink-0"
          >
            {scheduleLoading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <RefreshCw size={16} />
            )}
            Charger
          </button>
        </div>

        {typedSchedule && (
          <div className="border rounded-xl overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 text-sm font-medium">
              {typedSchedule.scheduleNumber}
            </div>
            <div className="divide-y">
              {(typedSchedule.installments || []).map((i: any) => (
                <div
                  key={i.installmentNumber}
                  className="px-4 py-3 flex justify-between text-sm"
                >
                  <span>
                    {i.installmentNumber} - {i.dueDate}
                  </span>
                  <span>
                    {(i.amount ?? 0).toLocaleString("fr-FR")} XAF · {i.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};