import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Flag } from "lucide-react";
import { walletControlService } from "../../../services/walletControl.service";
import { EmptyState, ErrorBlock, Field, ListHeader, Pagination } from "../../../components/subscription/kit";
import { FIELD } from "../../../components/subscription/kitUtils";
import { ListSkeleton } from "../../../components/ui/Skeleton";
import { FlagRow } from "../../../components/wallet/control/FlagRow";

const PAGE_SIZE = 10;
const FILTERS = [
  { value: "OPEN,UNDER_REVIEW", label: "Ouvertes et en revue" },
  { value: "OPEN", label: "Ouvertes" },
  { value: "UNDER_REVIEW", label: "En revue" },
  { value: "CONFIRMED", label: "Confirmées" },
  { value: "DISMISSED", label: "Écartées" },
  { value: "", label: "Toutes" },
];

/** Alertes de surveillance détectées sur les portefeuilles. */
export const FlagsPanel: React.FC = () => {
  const [status, setStatus] = useState("OPEN,UNDER_REVIEW");
  const [page, setPage] = useState(0);
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["wallet-flags", "list", status, page],
    queryFn: () => walletControlService.getFlags({ status: status || undefined, page, size: PAGE_SIZE }),
  });
  const rows = data?.content ?? [];

  return (
    <div className="space-y-5">
      <ListHeader
        title="Alertes"
        subtitle={isLoading ? undefined : `${data?.totalElements ?? 0} alerte${(data?.totalElements ?? 0) > 1 ? "s" : ""}`}
        action={
          <div className="w-full sm:w-64">
            <Field label="Statut">
              <select
                className={FIELD}
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(0);
                }}
              >
                {FILTERS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        }
      />
      {isLoading ? (
        <ListSkeleton rows={4} />
      ) : isError ? (
        <ErrorBlock message="Impossible de charger les alertes." onRetry={() => refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState icon={Flag} title="Aucune alerte" hint="Rien à signaler pour ce filtre." />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            {rows.map((f) => (
              <FlagRow key={f.flagNumber} flag={f} />
            ))}
          </div>
          <Pagination page={page} totalPages={data?.totalPages ?? 0} total={data?.totalElements ?? 0} noun="alerte" onChange={setPage} />
        </>
      )}
    </div>
  );
};
