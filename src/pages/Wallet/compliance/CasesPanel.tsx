import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FolderOpen } from "lucide-react";
import { walletControlService } from "../../../services/walletControl.service";
import type { ComplianceCaseScope } from "../../../services/walletControl.service";
import { EmptyState, ErrorBlock, Field, ListHeader, Pagination } from "../../../components/subscription/kit";
import { FIELD } from "../../../components/subscription/kitUtils";
import { ListSkeleton } from "../../../components/ui/Skeleton";
import { CaseRow } from "../../../components/wallet/control/CaseRow";
import { CaseDetail } from "./CaseDetail";

const PAGE_SIZE = 10;
const SCOPES: { value: ComplianceCaseScope; label: string }[] = [
  { value: "open", label: "Dossiers ouverts" },
  { value: "mine", label: "Mes dossiers" },
  { value: "all", label: "Tous les dossiers" },
];

/** Liste des dossiers de conformité et accès à leur instruction. */
export const CasesPanel: React.FC = () => {
  const [scope, setScope] = useState<ComplianceCaseScope>("open");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["wallet-cases", scope, page],
    queryFn: () => walletControlService.getCases({ scope, page, size: PAGE_SIZE }),
    enabled: selected === null,
  });
  const rows = data?.content ?? [];

  if (selected) return <CaseDetail caseNumber={selected} onBack={() => setSelected(null)} />;

  return (
    <div className="space-y-5">
      <ListHeader
        title="Dossiers"
        subtitle={isLoading ? undefined : `${data?.totalElements ?? 0} dossier${(data?.totalElements ?? 0) > 1 ? "s" : ""}`}
        action={
          <div className="w-full sm:w-56">
            <Field label="Afficher">
              <select
                className={FIELD}
                value={scope}
                onChange={(e) => {
                  setScope(e.target.value as ComplianceCaseScope);
                  setPage(0);
                }}
              >
                {SCOPES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        }
      />
      {isLoading ? (
        <ListSkeleton rows={5} />
      ) : isError ? (
        <ErrorBlock message="Impossible de charger les dossiers." onRetry={() => refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState icon={FolderOpen} title="Aucun dossier" hint="Les dossiers ouverts par les règles de surveillance apparaissent ici." />
      ) : (
        <>
          <div className="space-y-2">
            {rows.map((c) => (
              <CaseRow key={c.caseNumber} item={c} onOpen={setSelected} />
            ))}
          </div>
          <Pagination page={page} totalPages={data?.totalPages ?? 0} total={data?.totalElements ?? 0} noun="dossier" onChange={setPage} />
        </>
      )}
    </div>
  );
};
