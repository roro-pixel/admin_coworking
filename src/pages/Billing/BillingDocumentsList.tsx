import React, { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Check, Copy, Download, FileMinus2, FileText, Mail, Plus, Send, Stamp } from "lucide-react";
import { billingService } from "../../services/billing.service";
import type { BillingDocument } from "../../services/billing.service";
import {
  ActionButton,
  DataCard,
  EmptyState,
  ErrorBlock,
  Field,
  FilterButton,
  FilterPanel,
  HeadRow,
  IconButton,
  ListHeader,
  Pagination,
  SearchField,
  StatusChip,
  Tag,
} from "../../components/subscription/kit";
import { FIELD, ROW_HOVER, apiMessage, formatDate, formatMoney } from "../../components/subscription/kitUtils";
import { ListSkeleton } from "../../components/ui/Skeleton";
import { Dots } from "../../components/ui/Toaster";
import { toast } from "../../components/ui/toastStore";
import { saveBlob, currencyLabel } from "../../components/payment/paymentUtils";
import { DOC_TYPE_LABEL, DOC_TYPE_OPTIONS, STATUS_LABEL, STATUS_OPTIONS, STATUS_TONE } from "../../components/billing/billingLabels";

const PAGE_SIZE = 20;
const COLS = "lg:grid-cols-[minmax(0,1.1fr)_7rem_minmax(0,1.2fr)_9rem_9rem_7rem_9.5rem_9rem]";

export const BillingDocumentsList: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [copiedNumber, setCopiedNumber] = useState<string | null>(null);

  const copyDocumentNumber = (e: React.MouseEvent, documentNumber: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(documentNumber).then(() => {
      setCopiedNumber(documentNumber);
      setTimeout(() => setCopiedNumber((c) => (c === documentNumber ? null : c)), 1500);
    });
  };

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(0);
  const [pdfFor, setPdfFor] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const handleFilterChange = <T,>(setter: (v: T) => void, value: T) => {
    setter(value);
    setPage(0);
  };

  const {
    data: documentsData,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["billing-documents", fromDate, toDate, page, typeFilter, statusFilter, debouncedSearch],
    queryFn: () =>
      billingService.getDocuments({
        type: typeFilter || undefined,
        status: statusFilter || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        searchText: debouncedSearch || undefined,
        page,
        size: PAGE_SIZE,
        sort: "createdAt,desc",
      }),
  });

  const documents: BillingDocument[] = documentsData?.content ?? [];
  const totalElements = documentsData?.totalElements ?? 0;
  const totalPages = documentsData?.totalPages ?? 1;

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["billing-documents"] });

  const issueMutation = useMutation({
    mutationFn: (documentNumber: string) => billingService.issueDocument(documentNumber),
    onSuccess: () => {
      invalidate();
      toast.success("Document émis.");
    },
    // La dérogation (discountOverrideReason) se fait sur la fiche du document, où le contexte complet est visible.
    onError: (e: unknown) => {
      const violations = (e as { response?: { data?: { violations?: { message: string }[] } } })?.response?.data?.violations;
      if (Array.isArray(violations) && violations.length > 0) {
        toast.error(
          `Émission bloquée par un dépassement de remise : ${violations.map((v) => v.message).join(" ; ")}. Ouvrez le document pour fournir un motif de dérogation.`,
        );
      } else {
        toast.error(apiMessage(e, "Erreur lors de l'émission du document."));
      }
    },
  });

  const sendMutation = useMutation({
    mutationFn: (documentNumber: string) => billingService.sendDocument(documentNumber),
    onSuccess: () => {
      invalidate();
      toast.success("Document marqué comme envoyé.");
    },
    onError: (e: unknown) => toast.error(apiMessage(e, "Erreur lors de l'envoi du document.")),
  });

  const sendEmailMutation = useMutation({
    mutationFn: (documentNumber: string) => billingService.sendEmail(documentNumber),
    onSuccess: () => toast.success("E-mail envoyé."),
    onError: (e: unknown) => toast.error(apiMessage(e, "Erreur lors de l'envoi de l'e-mail.")),
  });

  const handleDownloadPdf = async (doc: BillingDocument, e: React.MouseEvent) => {
    e.stopPropagation();
    setPdfFor(doc.documentNumber);
    try {
      const blob = await billingService.getPdf(doc.documentNumber);
      saveBlob(blob, `${doc.documentType}_${doc.documentNumber}.pdf`);
    } catch {
      toast.error("Erreur lors du téléchargement du PDF.");
    } finally {
      setPdfFor(null);
    }
  };

  const open = (documentNumber: string) => navigate(`/billing/documents/${documentNumber}`);

  const hasActiveFilters = Boolean(typeFilter || statusFilter || fromDate || toDate || search);

  const handleReset = () => {
    setSearch("");
    setDebouncedSearch("");
    setTypeFilter("");
    setStatusFilter("");
    setFromDate("");
    setToDate("");
    setPage(0);
  };

  const pendingOf = (m: { isPending: boolean; variables?: string }, n: string) => m.isPending && m.variables === n;

  return (
    <div className="space-y-5">
      <ListHeader
        title="Documents de facturation"
        subtitle={totalElements > 0 ? `${totalElements.toLocaleString("fr-FR")} document${totalElements > 1 ? "s" : ""}` : undefined}
        action={
          <div className="flex flex-wrap gap-2">
            <ActionButton icon={Plus} onClick={() => navigate("/billing/invoices/create")}>
              Nouvelle facture
            </ActionButton>
            <ActionButton variant="ghost" icon={Plus} onClick={() => navigate("/billing/quotes/create")}>
              Nouveau devis
            </ActionButton>
          </div>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row">
        <SearchField className="flex-1" value={search} onChange={setSearch} placeholder="Numéro, client, titre" />
        <FilterButton open={showFilters} active={hasActiveFilters} onClick={() => setShowFilters(!showFilters)} />
      </div>

      {showFilters && (
        <FilterPanel canReset={hasActiveFilters} onReset={handleReset}>
          <Field label="Type">
            <select value={typeFilter} onChange={(e) => handleFilterChange(setTypeFilter, e.target.value)} className={FIELD}>
              <option value="">Tous les types</option>
              {DOC_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Statut">
            <select value={statusFilter} onChange={(e) => handleFilterChange(setStatusFilter, e.target.value)} className={FIELD}>
              <option value="">Tous les statuts</option>
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Du">
              <input type="date" value={fromDate} onChange={(e) => handleFilterChange(setFromDate, e.target.value)} className={FIELD} />
            </Field>
            <Field label="Au">
              <input type="date" value={toDate} min={fromDate} onChange={(e) => handleFilterChange(setToDate, e.target.value)} className={FIELD} />
            </Field>
          </div>
        </FilterPanel>
      )}

      {isLoading ? (
        <ListSkeleton rows={8} />
      ) : isError ? (
        <ErrorBlock message="Impossible de charger les documents." onRetry={() => refetch()} />
      ) : documents.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Aucun document trouvé"
          hint={hasActiveFilters ? "Ajustez ou réinitialisez les filtres." : "Créez une première facture ou un devis."}
          action={
            hasActiveFilters ? (
              <ActionButton variant="ghost" onClick={handleReset}>
                Réinitialiser les filtres
              </ActionButton>
            ) : undefined
          }
        />
      ) : (
        <>
          <HeadRow cols={COLS}>
            <span>N° document</span>
            <span>Type</span>
            <span>Client</span>
            <span className="text-right">Total</span>
            <span className="text-right">Solde dû</span>
            <span>Échéance</span>
            <span>Statut</span>
            <span className="text-right">Actions</span>
          </HeadRow>
          <DataCard>
            {documents.map((doc) => {
              const overdue = doc.status === "OVERDUE";
              const cur = currencyLabel(doc.currency);
              return (
                <div
                  key={doc.documentNumber}
                  role="link"
                  tabIndex={0}
                  onClick={() => open(doc.documentNumber)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") open(doc.documentNumber);
                  }}
                  className={`grid cursor-pointer grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 rounded-2xl p-4 transition max-lg:mb-2 max-lg:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--logo-pink)] ${COLS} ${ROW_HOVER}`}
                >
                  <div className="min-w-0">
                    <span className="inline-flex max-w-full items-center gap-1.5">
                      <span className="truncate font-mono text-xs font-semibold text-[color:var(--logo-pink-dark)]">{doc.documentNumber}</span>
                      <button
                        type="button"
                        onClick={(e) => copyDocumentNumber(e, doc.documentNumber)}
                        title="Copier le numéro"
                        aria-label="Copier le numéro"
                        className="rounded p-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-700"
                      >
                        {copiedNumber === doc.documentNumber ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                      </button>
                    </span>
                    {doc.title && <p className="mt-0.5 truncate text-xs text-gray-400">{doc.title}</p>}
                  </div>
                  <div className="lg:order-none max-lg:text-right">
                    <Tag>{DOC_TYPE_LABEL[doc.documentType] ?? doc.documentType}</Tag>
                  </div>
                  <div className="col-span-2 min-w-0 lg:col-span-1">
                    <p className="truncate font-semibold text-gray-950">{doc.customerName ?? doc.customerCode}</p>
                    {doc.customerEmail && <p className="truncate text-xs text-gray-400">{doc.customerEmail}</p>}
                  </div>
                  <p className="text-sm font-bold tabular-nums text-gray-950 lg:text-right">{formatMoney(doc.totalAmount, cur)}</p>
                  <p className={`text-sm font-semibold tabular-nums max-lg:text-right lg:text-right ${doc.balanceDue > 0 ? (overdue ? "text-red-600" : "text-gray-800") : "text-emerald-600"}`}>
                    {doc.balanceDue > 0 ? formatMoney(doc.balanceDue, cur) : "Soldé"}
                  </p>
                  <p className={`text-sm ${overdue ? "font-semibold text-red-600" : "text-gray-500"}`}>{formatDate(doc.dueDate)}</p>
                  <div className="max-lg:text-right">
                    <StatusChip tone={STATUS_TONE[doc.status] ?? "neutral"}>{STATUS_LABEL[doc.status] ?? doc.status}</StatusChip>
                  </div>
                  <div className="col-span-2 flex justify-end gap-1 lg:col-span-1" onClick={(e) => e.stopPropagation()}>
                    {pdfFor === doc.documentNumber ? (
                      <span className="flex h-9 w-9 items-center justify-center">
                        <Dots />
                      </span>
                    ) : (
                      <IconButton icon={Download} label="Télécharger le PDF" onClick={(e) => handleDownloadPdf(doc, e)} />
                    )}
                    {doc.documentType === "INVOICE" && ["PAID", "PARTIALLY_PAID"].includes(doc.status) && (
                      <IconButton
                        icon={FileMinus2}
                        label="Créer un avoir"
                        onClick={() => navigate(`/billing/documents/${doc.documentNumber}?panel=creditNote`)}
                      />
                    )}
                    {doc.status === "DRAFT" && (
                      <IconButton
                        icon={Stamp}
                        label="Émettre"
                        pending={pendingOf(issueMutation, doc.documentNumber)}
                        onClick={() => issueMutation.mutate(doc.documentNumber)}
                      />
                    )}
                    {doc.status === "ISSUED" && (
                      <>
                        <IconButton
                          icon={Send}
                          label="Marquer comme envoyé"
                          tone="success"
                          pending={pendingOf(sendMutation, doc.documentNumber)}
                          onClick={() => sendMutation.mutate(doc.documentNumber)}
                        />
                        <IconButton
                          icon={Mail}
                          label="Envoyer par e-mail"
                          pending={pendingOf(sendEmailMutation, doc.documentNumber)}
                          onClick={() => sendEmailMutation.mutate(doc.documentNumber)}
                        />
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </DataCard>
          <Pagination page={page} totalPages={totalPages} total={totalElements} noun="document" onChange={setPage} />
        </>
      )}
    </div>
  );
};
