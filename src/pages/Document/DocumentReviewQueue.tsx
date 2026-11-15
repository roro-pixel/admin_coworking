import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckSquare, FileDown, FolderSearch, Plus, UserRound } from "lucide-react";
import { kycService } from "../../services/document.service";
import { useAuth } from "../../contexts/AuthContext";
import { ActionButton, ErrorBlock, EmptyState, Field, FilterButton, FilterPanel, IconButton, ListHeader, Pagination, SearchField } from "../../components/subscription/kit";
import { FIELD, apiMessage } from "../../components/subscription/kitUtils";
import { ListSkeleton } from "../../components/ui/Skeleton";
import { toast } from "../../components/ui/toastStore";
import { KpiRow, KpiRowSkeleton } from "../../components/operations/OpsCharts";
import { saveBlob } from "../../components/payment/paymentUtils";
import { CaseCard, CaseHead, CaseRow } from "../../components/documents/CaseList";
import { RowCheck } from "../../components/documents/docKit";
import { KYC_FILTER_STATUSES, KYC_STATUS_LABEL, KYC_OWNER_TYPES, OWNER_LABEL, RISK_LEVELS, fmtInt, label, useDebounced } from "../../components/documents/docUtils";
import { kycRiskLevelLabels } from "../../services/document.service";
import { CreateKycCasePanel } from "./CreateKycCasePanel";

const PAGE_SIZE = 20;

export const DocumentReviewQueue: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { admin } = useAuth();
  const adminId = Number(admin?.id) || 1;

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [ownerType, setOwnerType] = useState("");
  const [risk, setRisk] = useState("");
  const [mine, setMine] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [creating, setCreating] = useState(false);
  const [bulk, setBulk] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const debounced = useDebounced(search);

  // Tout changement de filtre ramène à la première page.
  useEffect(() => setPage(0), [debounced, status, ownerType, risk, mine]);

  const { data: dashboard, isLoading: dashLoading } = useQuery({ queryKey: ["kyc-dashboard"], queryFn: () => kycService.getKycDashboard() });

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["kycCases", { status, ownerType, riskLevel: risk, myQueue: mine, search: debounced, page, pageSize: PAGE_SIZE }],
    queryFn: () =>
      kycService.getAllKycCases({
        status: status || undefined,
        ownerType: ownerType || undefined,
        riskLevel: risk || undefined,
        assignedTo: mine ? adminId : undefined,
        searchText: debounced.trim() || undefined,
        page,
        size: PAGE_SIZE,
        sort: "submittedAt,desc",
      }),
    placeholderData: keepPreviousData,
  });

  const cases = data?.content ?? [];
  const total = data?.totalElements ?? 0;
  const hasFilters = !!(search || status || ownerType || risk);
  const reset = () => {
    setSearch("");
    setStatus("");
    setOwnerType("");
    setRisk("");
  };

  const bulkApprove = useMutation({
    mutationFn: async () => {
      const results = await Promise.allSettled(selected.map((code) => kycService.approveKycCase(code, adminId, "Approuvé en masse")));
      const succeeded = results.filter((r) => r.status === "fulfilled").length;
      return { succeeded, failed: results.length - succeeded };
    },
  });

  const confirmBulk = () =>
    toast.confirm({
      message: `Approuver ${selected.length} dossier${selected.length > 1 ? "s" : ""} ?`,
      detail: "Chaque dossier sera approuvé avec le commentaire « Approuvé en masse ».",
      confirmLabel: "Approuver",
      pendingLabel: "Approbation",
      successMessage: "Dossiers approuvés",
      errorMessage: "Certains dossiers n'ont pas pu être approuvés",
      onConfirm: async () => {
        const r = await bulkApprove.mutateAsync();
        queryClient.invalidateQueries({ queryKey: ["kycCases"] });
        queryClient.invalidateQueries({ queryKey: ["kyc-dashboard"] });
        setBulk(false);
        setSelected([]);
        if (r.failed > 0) throw new Error(`${r.failed} échec(s)`);
      },
    });

  const exportPdf = useMutation({
    mutationFn: async (code: string) => saveBlob(await kycService.exportPdf(code), `kyc_${code}.pdf`),
    onError: (e) => toast.error(apiMessage(e, "Export PDF impossible")),
  });

  const onPage = cases.map((c) => c.code);
  const allOnPage = onPage.length > 0 && onPage.every((c) => selected.includes(c));
  const toggle = (code: string) => setSelected((p) => (p.includes(code) ? p.filter((c) => c !== code) : [...p, code]));
  const togglePage = () => setSelected((p) => (allOnPage ? p.filter((c) => !onPage.includes(c)) : Array.from(new Set([...p, ...onPage]))));

  const s = dashboard?.summary;
  const pending = Number(s?.PENDING_REVIEW ?? s?.SUBMITTED ?? 0);
  const inReview = Number(s?.IN_REVIEW ?? s?.UNDER_REVIEW ?? 0);

  return (
    <div className="space-y-5">
      <ListHeader
        title="Revue des dossiers KYC"
        subtitle={isLoading ? undefined : `${fmtInt(total)} dossier${total > 1 ? "s" : ""}`}
        action={
          <div className="flex flex-wrap gap-2">
            <ActionButton variant={mine ? "primary" : "ghost"} icon={UserRound} onClick={() => setMine(!mine)}>
              {mine ? "Tous les dossiers" : "Mes dossiers"}
            </ActionButton>
            {bulk ? (
              <>
                <ActionButton
                  variant="ghost"
                  onClick={() => {
                    setBulk(false);
                    setSelected([]);
                  }}
                >
                  Annuler
                </ActionButton>
                <ActionButton disabled={selected.length === 0} onClick={confirmBulk}>
                  Approuver ({selected.length})
                </ActionButton>
              </>
            ) : (
              <ActionButton variant="ghost" icon={CheckSquare} onClick={() => setBulk(true)}>
                Sélection multiple
              </ActionButton>
            )}
            <ActionButton icon={Plus} onClick={() => setCreating(true)}>
              Créer un dossier
            </ActionButton>
          </div>
        }
      />

      {creating && <CreateKycCasePanel onClose={() => setCreating(false)} />}

      {dashLoading ? (
        <KpiRowSkeleton count={4} columns={4} />
      ) : (
        s && (
          <KpiRow
            items={[
              { label: "Dossiers", value: fmtInt(Number(s.totalCases ?? 0)) },
              { label: "En attente", value: fmtInt(pending), tone: "pink" },
              { label: "En revue", value: fmtInt(inReview) },
              { label: "SLA dépassé", value: fmtInt(Number(dashboard?.sla?.casesExceeding48h ?? 0)), tone: Number(dashboard?.sla?.casesExceeding48h ?? 0) > 0 ? "danger" : "default" },
            ]}
          />
        )
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <SearchField className="flex-1" value={search} onChange={setSearch} placeholder="Nom, code propriétaire ou code dossier" />
        <FilterButton open={showFilters} active={!!(status || ownerType || risk)} onClick={() => setShowFilters(!showFilters)} />
      </div>
      {showFilters && (
        <FilterPanel canReset={hasFilters} onReset={reset}>
          <Field label="Statut">
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={FIELD}>
              <option value="">Tous les statuts</option>
              {KYC_FILTER_STATUSES.map((k) => (
                <option key={k} value={k}>
                  {label(KYC_STATUS_LABEL, k)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Propriétaire">
            <select value={ownerType} onChange={(e) => setOwnerType(e.target.value)} className={FIELD}>
              <option value="">Tous les types</option>
              {KYC_OWNER_TYPES.map((k) => (
                <option key={k} value={k}>
                  {label(OWNER_LABEL, k)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Risque">
            <select value={risk} onChange={(e) => setRisk(e.target.value)} className={FIELD}>
              <option value="">Tous les niveaux</option>
              {RISK_LEVELS.map((k) => (
                <option key={k} value={k}>
                  {kycRiskLevelLabels[k] ?? k}
                </option>
              ))}
            </select>
          </Field>
        </FilterPanel>
      )}

      {isLoading ? (
        <ListSkeleton rows={8} />
      ) : isError ? (
        <ErrorBlock message="Impossible de charger les dossiers." onRetry={() => refetch()} />
      ) : cases.length === 0 ? (
        <EmptyState
          icon={FolderSearch}
          title="Aucun dossier trouvé"
          hint={hasFilters ? "Ajustez ou réinitialisez les filtres." : "Créez un dossier pour démarrer une vérification."}
          action={hasFilters ? <ActionButton variant="ghost" onClick={reset}>Réinitialiser les filtres</ActionButton> : undefined}
        />
      ) : (
        <>
          {bulk && (
            <label className="flex items-center gap-2 px-2 text-sm text-gray-600">
              <RowCheck checked={allOnPage} onChange={togglePage} name="Tout sélectionner sur la page" />
              Tout sélectionner sur cette page
            </label>
          )}
          <CaseHead />
          <CaseCard>
            {cases.map((c) => (
              <CaseRow
                key={c.code}
                kycCase={c}
                date={c.slaDeadline}
                onOpen={() => (bulk ? toggle(c.code) : navigate(`/documents/kyc/cases/${c.code}`))}
                lead={bulk ? <RowCheck checked={selected.includes(c.code)} onChange={() => toggle(c.code)} name={`Sélectionner ${c.code}`} /> : undefined}
                actions={
                  <IconButton icon={FileDown} label="Exporter en PDF" pending={exportPdf.isPending && exportPdf.variables === c.code} onClick={() => exportPdf.mutate(c.code)} />
                }
              />
            ))}
          </CaseCard>
          <Pagination page={page} totalPages={data?.totalPages ?? 0} total={total} noun="dossier" onChange={setPage} />
        </>
      )}
    </div>
  );
};
