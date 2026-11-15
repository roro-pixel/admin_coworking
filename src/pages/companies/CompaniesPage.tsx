import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Building2, Plus } from "lucide-react";
import { companyService } from "../../services/company.service";
import type { CompanyResponse } from "../../services/company.service";
import { ActionButton, DataCard, EmptyState, ErrorBlock, HeadRow, ListHeader, Pagination, SearchField, StatusChip } from "../../components/subscription/kit";
import { FOCUS, ROW_HOVER, formatMoney } from "../../components/subscription/kitUtils";
import { statusOf } from "../../components/subscription/labels";
import { ListSkeleton } from "../../components/ui/Skeleton";
import { CompanyShell } from "../../components/companies/CompanyShell";
import { COMPANIES_KEY, COMPANY_STATUS, COMPANY_STATUS_FILTERS, ORG_TYPE_LABEL } from "../../components/companies/companyLabels";
import { useDebounced } from "../../components/companies/companyKit";

const PAGE_SIZE = 15;
const COLS = "lg:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)_minmax(0,1.2fr)_minmax(0,1.3fr)_4rem_5rem_6rem]";

const niuOf = (c: CompanyResponse): string => c.identifiers?.find((i) => i.type === "NIU")?.value ?? "";

const OutstandingCell: React.FC<{ company: CompanyResponse }> = ({ company }) => {
  const currency = company.currencyCode ?? "XAF";
  const over = company.creditLimit != null && company.outstanding > company.creditLimit;
  return (
    <div className="min-w-0 lg:text-right">
      <p className={`text-sm font-bold tabular-nums ${over ? "text-red-600" : "text-gray-950"}`}>{formatMoney(company.outstanding ?? 0, currency)}</p>
      {company.creditLimit != null && <p className="truncate text-xs text-gray-400">Plafond {formatMoney(company.creditLimit, currency)}</p>}
    </div>
  );
};

/** Liste des organisations clientes : recherche sur le nom, les courriels, le code et tous les identifiants. */
export const CompaniesPage: React.FC = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(0);
  const q = useDebounced(search.trim());

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: [COMPANIES_KEY, "list", q, status, page],
    queryFn: () => companyService.getCompanies({ q: q || undefined, status: status || undefined, page, size: PAGE_SIZE }),
    placeholderData: keepPreviousData,
  });
  const rows = data?.content ?? [];

  return (
    <CompanyShell>
      <div className="mx-auto w-full max-w-6xl space-y-5">
        <ListHeader
          title="Entreprises"
          subtitle="Organisations clientes : fiche légale, membres, facturation et portefeuille"
          action={
            <ActionButton icon={Plus} onClick={() => navigate("/companies/create")}>
              Nouvelle entreprise
            </ActionButton>
          }
        />

        <div className="space-y-3">
          <SearchField
            value={search}
            onChange={(v) => {
              setSearch(v);
              setPage(0);
            }}
            placeholder="Nom, courriel, code client ou identifiant (NIU, RCCM...)"
          />
          <div className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
            {COMPANY_STATUS_FILTERS.map((f) => {
              const on = status === f.value;
              return (
                <button
                  key={f.value || "all"}
                  type="button"
                  onClick={() => {
                    setStatus(f.value);
                    setPage(0);
                  }}
                  className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${FOCUS} ${
                    on ? "bg-[color:var(--logo-pink-dark)] text-white" : "bg-white text-gray-600 shadow-sm hover:bg-gray-50"
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>

        {isLoading ? (
          <ListSkeleton rows={6} />
        ) : isError ? (
          <ErrorBlock message="Impossible de charger les entreprises." onRetry={() => refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Building2}
            title={q || status ? "Aucune entreprise ne correspond" : "Aucune entreprise"}
            hint={q || status ? "Ajustez la recherche ou le filtre." : "Créez la première organisation cliente."}
            action={
              !q && !status ? (
                <ActionButton icon={Plus} onClick={() => navigate("/companies/create")}>
                  Nouvelle entreprise
                </ActionButton>
              ) : undefined
            }
          />
        ) : (
          <>
            <HeadRow cols={COLS}>
              <span>Entreprise</span>
              <span>Type</span>
              <span>NIU</span>
              <span className="text-right">Encours</span>
              <span className="text-right">Membres</span>
              <span className="text-right">Abonnements</span>
              <span>Statut</span>
            </HeadRow>
            <DataCard>
              {rows.map((c) => {
                const st = statusOf(COMPANY_STATUS, c.status);
                return (
                  <Link
                    key={c.customerId}
                    to={`/companies/${encodeURIComponent(c.customerId)}`}
                    className={`grid grid-cols-1 items-center gap-x-4 gap-y-1 rounded-2xl p-4 max-lg:mb-2 max-lg:bg-gray-50 ${ROW_HOVER} ${FOCUS} ${COLS}`}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-gray-950">{c.name}</p>
                      <p className="truncate font-mono text-xs text-[color:var(--logo-pink-dark)]">{c.customerId}</p>
                    </div>
                    <p className="truncate text-sm text-gray-600">{ORG_TYPE_LABEL[c.organizationType] ?? c.organizationTypeLabel ?? c.organizationType}</p>
                    <p className="truncate font-mono text-xs text-gray-600">{niuOf(c)}</p>
                    <OutstandingCell company={c} />
                    <p className="text-sm tabular-nums text-gray-700 lg:text-right">{c.membersCount ?? 0}</p>
                    <p className="text-sm tabular-nums text-gray-700 lg:text-right">{c.activeSubscriptions ?? 0}</p>
                    <div>
                      <StatusChip tone={st.tone}>{st.label}</StatusChip>
                    </div>
                  </Link>
                );
              })}
            </DataCard>
            <Pagination page={page} totalPages={data?.totalPages ?? 1} total={data?.totalElements ?? rows.length} noun="entreprise" onChange={setPage} />
          </>
        )}
      </div>
    </CompanyShell>
  );
};
