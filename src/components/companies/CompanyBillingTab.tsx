import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Download, FileSpreadsheet, Receipt } from "lucide-react";
import { companyService } from "../../services/company.service";
import type { AccountStatement, CompanyResponse, StatementTotals } from "../../services/company.service";
import { ActionButton, DataCard, EmptyState, ErrorBlock, Field, ItemRow, Section, StatusChip } from "../subscription/kit";
import { FIELD, formatDate, formatMoney } from "../subscription/kitUtils";
import { ListSkeleton } from "../ui/Skeleton";
import { currencyLabel } from "../payment/paymentUtils";
import { COMPANIES_KEY } from "./companyLabels";
import { Stat, downloadFile } from "./companyTabKit";

const AGING: { key: keyof StatementTotals["aging"]; label: string }[] = [
  { key: "notDue", label: "Non échu" },
  { key: "days1To30", label: "1 à 30 j" },
  { key: "days31To60", label: "31 à 60 j" },
  { key: "days61To90", label: "61 à 90 j" },
  { key: "over90", label: "Plus de 90 j" },
];

const ACCOUNT_LABEL: Record<string, string> = { COMPANY: "Organisation", MEMBER: "Membre", PERSONAL: "Fiche personnelle" };

const Totals: React.FC<{ t: StatementTotals }> = ({ t }) => {
  const cur = currencyLabel(t.currency);
  return (
    <Section title={`Solde en ${cur}`} description={`${t.openInvoices} facture(s) ouverte(s), dont ${t.overdueInvoices} en retard`}>
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Facturé" value={formatMoney(t.invoiced, cur)} />
        <Stat label="Réglé" value={formatMoney(t.paid, cur)} />
        <Stat label="Reste dû" value={formatMoney(t.balanceDue, cur)} />
        <Stat label="En retard" value={formatMoney(t.overdue, cur)} tone={t.overdue > 0 ? "danger" : "default"} />
        <Stat label="Avoirs disponibles" value={formatMoney(t.creditAvailable, cur)} />
        <Stat label="Solde net" value={formatMoney(t.netBalanceDue, cur)} />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {AGING.map((a) => (
          <div key={a.key} className="rounded-2xl bg-white p-3 text-center shadow-sm">
            <p className="text-[11px] font-semibold text-gray-500">{a.label}</p>
            <p className="mt-1 text-sm font-bold tabular-nums text-gray-950">{formatMoney(t.aging[a.key], cur)}</p>
          </div>
        ))}
      </div>
    </Section>
  );
};

const Lines: React.FC<{ statement: AccountStatement }> = ({ statement }) => {
  if (statement.lines.length === 0) return <EmptyState icon={Receipt} title="Aucun document sur la période" />;
  return (
    <DataCard>
      <div className="space-y-2">
        {statement.lines.map((l) => (
          <ItemRow key={`${l.documentNumber}-${l.accountCode}`} className={l.inPeriod ? "" : "italic"}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <Link to={`/billing/documents/${encodeURIComponent(l.documentNumber)}`} className="font-mono text-sm font-bold text-[color:var(--logo-pink-dark)] hover:underline">
                  {l.documentNumber}
                </Link>
                <p className="truncate text-xs text-gray-500">
                  {l.accountName} · {ACCOUNT_LABEL[l.accountType] ?? l.accountType} · émise le {formatDate(l.issueDate)}
                  {l.dueDate ? ` · échéance ${formatDate(l.dueDate)}` : ""}
                  {l.companyLinkSource === "ATTACHED" ? " · rattachée après coup" : ""}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3 sm:text-right">
                {l.daysOverdue > 0 && <StatusChip tone="danger">{l.daysOverdue} j de retard</StatusChip>}
                <div>
                  <p className="text-sm font-bold tabular-nums text-gray-950">{formatMoney(l.balanceDue, currencyLabel(l.currency))}</p>
                  <p className="text-xs text-gray-400">sur {formatMoney(l.totalAmount, currencyLabel(l.currency))}</p>
                </div>
              </div>
            </div>
          </ItemRow>
        ))}
      </div>
    </DataCard>
  );
};

/** Onglet Facturation */
export const CompanyBillingTab: React.FC<{ company: CompanyResponse }> = ({ company }) => {
  const id = company.customerId;
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const params = { from: from || undefined, to: to || undefined };

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: [COMPANIES_KEY, "statement", id, from, to],
    queryFn: () => companyService.getCompanyStatement(id, params),
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="grid grid-cols-2 gap-3 sm:w-80">
          <Field label="Du">
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={FIELD} />
          </Field>
          <Field label="Au">
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={FIELD} />
          </Field>
        </div>
        <div className="flex gap-2">
          <ActionButton variant="ghost" icon={Download} onClick={() => downloadFile(() => companyService.getCompanyStatementPdf(id, params), `etat-de-compte-${id}.pdf`, "Export PDF impossible.")}>
            PDF
          </ActionButton>
          <ActionButton variant="ghost" icon={FileSpreadsheet} onClick={() => downloadFile(() => companyService.getCompanyStatementCsv(id, params), `etat-de-compte-${id}.csv`, "Export CSV impossible.")}>
            CSV
          </ActionButton>
        </div>
      </div>

      {isLoading ? (
        <ListSkeleton rows={4} />
      ) : isError || !data ? (
        <ErrorBlock message="Impossible de charger l'état de compte." onRetry={() => refetch()} />
      ) : (
        <>
          <p className="text-sm text-gray-500">
            Du {formatDate(data.from)} au {formatDate(data.to)}, arrêté au {formatDate(data.asOf)}
            {data.paymentTermsDays != null ? ` · paiement à ${data.paymentTermsDays} jours` : ""}
          </p>
          {data.totals.map((t) => (
            <Totals key={t.currency} t={t} />
          ))}
          {data.accounts.length > 0 && (
            <Section title="Comptes concernés" description="Les factures de l'organisation et celles de ses membres reliées à elle">
              <div className="space-y-2">
                {data.accounts.map((a) => (
                  <ItemRow key={`${a.accountType}-${a.accountCode}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-gray-950">{a.accountName}</p>
                        <p className="truncate text-xs text-gray-400">
                          <span className="font-mono">{a.accountCode}</span> · {ACCOUNT_LABEL[a.accountType] ?? a.accountType}
                        </p>
                      </div>
                      <p className="shrink-0 text-sm font-bold tabular-nums text-gray-950">{formatMoney(a.balanceDue, currencyLabel(a.currency))}</p>
                    </div>
                  </ItemRow>
                ))}
              </div>
            </Section>
          )}
          <Lines statement={data} />
        </>
      )}
    </div>
  );
};
