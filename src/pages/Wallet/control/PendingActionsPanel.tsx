import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ShieldCheck } from "lucide-react";
import { walletControlService } from "../../../services/walletControl.service";
import { EmptyState, ErrorBlock, ListHeader, Pagination } from "../../../components/subscription/kit";
import { ListSkeleton } from "../../../components/ui/Skeleton";
import { ActionRow } from "../../../components/wallet/control/ActionRow";

const PAGE_SIZE = 10;

/** Actions en attente d'un second visa, à approuver ou rejeter. */
export const PendingActionsPanel: React.FC = () => {
  const [page, setPage] = useState(0);
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["wallet-actions", "pending", page],
    queryFn: () => walletControlService.getPendingActions({ page, size: PAGE_SIZE }),
  });
  const rows = data?.content ?? [];

  return (
    <div className="space-y-5">
      <ListHeader title="Approbations" subtitle={isLoading ? undefined : `${data?.totalElements ?? 0} action${(data?.totalElements ?? 0) > 1 ? "s" : ""} en attente du second visa`} />
      {isLoading ? (
        <ListSkeleton rows={4} />
      ) : isError ? (
        <ErrorBlock message="Impossible de charger les actions en attente." onRetry={() => refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState icon={ShieldCheck} title="Rien à approuver" hint="Les actions demandées par un administrateur apparaissent ici pour un second visa." />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            {rows.map((a) => (
              <ActionRow key={a.actionNumber} action={a} />
            ))}
          </div>
          <Pagination page={page} totalPages={data?.totalPages ?? 0} total={data?.totalElements ?? 0} noun="action" onChange={setPage} />
        </>
      )}
    </div>
  );
};
