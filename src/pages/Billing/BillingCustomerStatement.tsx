import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Download, FileText, User, X } from "lucide-react";
import { billingService } from "../../services/billing.service";
import type { BillingDocument } from "../../services/billing.service";
import { CustomerAutocomplete } from "../../components/customers/CustomerAutocomplete";
import { MemberAutocomplete } from "../../components/members/MemberAutocomplete";
import type { CustomerSummaryResponse } from "../../services/customer.service";
import type { MemberSummaryResponse } from "../../services/member.service";
import { DataCard, EmptyState, HeadRow, IconButton, ListHeader, StatusChip, Tag } from "../../components/subscription/kit";
import { FOCUS, PINK_SOFT, ROW_HOVER, formatDate, formatMoney } from "../../components/subscription/kitUtils";
import { ListSkeleton } from "../../components/ui/Skeleton";
import { Dots } from "../../components/ui/Toaster";
import { toast } from "../../components/ui/toastStore";
import { saveBlob } from "../../components/payment/paymentUtils";
import { ChartCard, KpiRow, KpiRowSkeleton, RatioBar } from "../../components/operations/OpsCharts";
import { PillChoice } from "../../components/operations/opsKit";
import { StatementActions } from "../../components/billing/StatementActions";
import { NoticeTimeline } from "../../components/billing/dunning/NoticeTimeline";
import { DOC_TYPE_LABEL, STATUS_LABEL, STATUS_TONE } from "../../components/billing/billingLabels";

type CustomerKind = "CUSTOMER" | "MEMBER" | "BUSINESS_ENTITY";
const KIND_OPTIONS: { value: CustomerKind; label: string }[] = [
  { value: "MEMBER", label: "Membre" },
  { value: "CUSTOMER", label: "Client" },
  { value: "BUSINESS_ENTITY", label: "Entreprise" },
];
const PAGE_SIZE = 20;
const COLS = "lg:grid-cols-[minmax(0,1.2fr)_7rem_6.5rem_9rem_9rem_6.5rem_9.5rem_3.5rem]";

export const BillingCustomerStatement: React.FC = () => {
  const navigate = useNavigate();
  const [customerType, setCustomerType] = useState<CustomerKind>("MEMBER");
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSummaryResponse | null>(null);
  const [selectedMember, setSelectedMember] = useState<MemberSummaryResponse | null>(null);
  const [page, setPage] = useState(0);
  const [pdfFor, setPdfFor] = useState<string | null>(null);

  const resolvedCode: string = customerType === "MEMBER" ? (selectedMember?.memberId ?? "") : (selectedCustomer?.customerId ?? "");

  const handleTypeChange = (type: CustomerKind) => {
    setCustomerType(type);
    setSelectedCustomer(null);
    setSelectedMember(null);
    setPage(0);
  };

  const { data: statementData, isLoading } = useQuery({
    queryKey: ["customer-statement", customerType, resolvedCode, page],
    queryFn: () => billingService.getCustomerStatement(customerType, resolvedCode, { page, size: PAGE_SIZE, sort: "createdAt,desc" }),
    enabled: resolvedCode.length > 0,
  });

  const documents: BillingDocument[] = statementData?.documents ?? [];
  const totalInvoiced = statementData?.totalInvoiced ?? 0;
  const totalPaid = statementData?.totalPaid ?? 0;
  const totalBalanceDue = statementData?.totalBalanceDue ?? 0;
  // Le relevé ne renvoie ni totalElements ni totalPages : une page pleine laisse supposer une suite.
  const hasNext = documents.length >= PAGE_SIZE;

  const handleDownloadPdf = async (doc: BillingDocument) => {
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

  const selectedLabel =
    customerType === "MEMBER" && selectedMember
      ? `${selectedMember.fullName ?? ""}`.trim() || selectedMember.memberId
      : selectedCustomer
        ? (selectedCustomer.displayName ?? selectedCustomer.customerId)
        : resolvedCode;

  const hasSelection = resolvedCode.length > 0;
  const clearSelection = () => {
    setSelectedCustomer(null);
    setSelectedMember(null);
    setPage(0);
  };
  const btn = `flex h-9 w-9 items-center justify-center rounded-full bg-white text-gray-700 shadow-sm transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS}`;

  return (
    <div className="space-y-5">
      <ListHeader title="Relevé client" subtitle="Historique des factures, devis et avoirs d'un client" />

      <div className="space-y-4 rounded-[1.75rem] border border-gray-100 bg-white p-5 shadow-sm">
        <PillChoice label="Type de client" options={KIND_OPTIONS} value={customerType} onChange={handleTypeChange} />
        {customerType === "MEMBER" ? (
          <MemberAutocomplete
            selectedMember={selectedMember}
            onSelect={(m) => {
              setSelectedMember(m);
              setPage(0);
            }}
            placeholder="Rechercher un membre par nom ou e-mail"
          />
        ) : (
          <CustomerAutocomplete
            selectedCustomer={selectedCustomer}
            onSelect={(c) => {
              setSelectedCustomer(c);
              setPage(0);
            }}
            typeFilter={customerType === "BUSINESS_ENTITY" ? "COMPANY" : undefined}
            placeholder={customerType === "BUSINESS_ENTITY" ? "Rechercher une entreprise" : "Rechercher un client par nom ou e-mail"}
          />
        )}

        {hasSelection && (
          <div className={`flex items-center justify-between gap-3 rounded-2xl p-3 ${PINK_SOFT}`}>
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[color:var(--logo-pink-dark)]">
                <User size={16} />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-gray-950">{selectedLabel}</p>
                <p className="truncate font-mono text-xs text-gray-500">{resolvedCode}</p>
              </div>
            </div>
            <IconButton icon={X} label="Effacer la sélection" onClick={clearSelection} />
          </div>
        )}
      </div>

      {!hasSelection ? (
        <EmptyState icon={User} title="Aucun client sélectionné" hint="Recherchez un client par nom ou e-mail pour afficher son relevé." />
      ) : isLoading ? (
        <div className="space-y-5">
          <KpiRowSkeleton count={3} columns={3} />
          <ListSkeleton rows={6} />
        </div>
      ) : (
        <>
          {totalInvoiced > 0 && (
            <ChartCard title="Situation du compte" subtitle="Part réglée du total facturé">
              <KpiRow
                columns={3}
                items={[
                  { label: "Total facturé", value: formatMoney(totalInvoiced) },
                  { label: "Total payé", value: formatMoney(totalPaid), tone: "success" },
                  { label: "Solde restant", value: formatMoney(totalBalanceDue), tone: totalBalanceDue > 0 ? "danger" : "default" },
                ]}
              />
              <div className="mt-5">
                <RatioBar value={totalPaid} total={totalInvoiced} />
                <p className="mt-2 text-xs text-gray-500">{Math.round((totalPaid / totalInvoiced) * 100)} % encaissé</p>
              </div>
            </ChartCard>
          )}

          {documents.length === 0 ? (
            <EmptyState icon={FileText} title="Aucun document pour ce client" />
          ) : (
            <>
              <HeadRow cols={COLS}>
                <span>N° document</span>
                <span>Type</span>
                <span>Date</span>
                <span className="text-right">Total</span>
                <span className="text-right">Solde dû</span>
                <span>Échéance</span>
                <span>Statut</span>
                <span />
              </HeadRow>
              <DataCard>
                {documents.map((doc) => (
                  <div
                    key={doc.documentNumber}
                    role="link"
                    tabIndex={0}
                    onClick={() => navigate(`/billing/documents/${doc.documentNumber}`)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") navigate(`/billing/documents/${doc.documentNumber}`);
                    }}
                    className={`grid cursor-pointer grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 rounded-2xl p-4 transition max-lg:mb-2 max-lg:bg-gray-50 ${FOCUS} ${COLS} ${ROW_HOVER}`}
                  >
                    <p className="truncate font-mono text-xs font-semibold text-[color:var(--logo-pink-dark)]">{doc.documentNumber}</p>
                    <div className="max-lg:text-right">
                      <Tag>{DOC_TYPE_LABEL[doc.documentType] ?? doc.documentType}</Tag>
                    </div>
                    <p className="text-sm text-gray-500">{formatDate(doc.issueDate)}</p>
                    <p className="text-sm font-bold tabular-nums text-gray-950 max-lg:text-right lg:text-right">{formatMoney(doc.totalAmount)}</p>
                    <p className={`text-sm font-semibold tabular-nums max-lg:text-right lg:text-right ${doc.balanceDue > 0 ? "text-red-600" : "text-emerald-600"}`}>
                      {doc.balanceDue > 0 ? formatMoney(doc.balanceDue) : "Soldé"}
                    </p>
                    <p className="text-sm text-gray-500">{formatDate(doc.dueDate)}</p>
                    <div className="max-lg:text-right">
                      <StatusChip tone={STATUS_TONE[doc.status] ?? "neutral"}>{STATUS_LABEL[doc.status] ?? doc.status}</StatusChip>
                    </div>
                    <div className="col-span-2 flex justify-end lg:col-span-1" onClick={(e) => e.stopPropagation()}>
                      {pdfFor === doc.documentNumber ? (
                        <span className="flex h-9 w-9 items-center justify-center">
                          <Dots />
                        </span>
                      ) : (
                        <IconButton icon={Download} label="Télécharger le PDF" onClick={() => handleDownloadPdf(doc)} />
                      )}
                    </div>
                  </div>
                ))}
              </DataCard>
              {(page > 0 || hasNext) && (
                <div className="flex items-center justify-between px-1">
                  <p className="text-sm text-gray-500">Page {page + 1}</p>
                  <div className="flex items-center gap-2">
                    <button type="button" aria-label="Page précédente" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className={btn}>
                      <ChevronLeft size={16} />
                    </button>
                    <button type="button" aria-label="Page suivante" onClick={() => setPage((p) => p + 1)} disabled={!hasNext} className={btn}>
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          <StatementActions customerType={customerType} customerCode={resolvedCode} defaultEmail={customerType === "MEMBER" ? selectedMember?.email : selectedCustomer?.email} />

          <NoticeTimeline customer={{ type: customerType, code: resolvedCode }} />
        </>
      )}
    </div>
  );
};
