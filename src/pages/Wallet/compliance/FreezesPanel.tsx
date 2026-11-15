import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Snowflake } from "lucide-react";
import { walletControlService } from "../../../services/walletControl.service";
import { ActionButton, EmptyState, ErrorBlock, ListHeader, Pagination } from "../../../components/subscription/kit";
import { ListSkeleton } from "../../../components/ui/Skeleton";
import { FreezeForm, FreezeRow } from "../../../components/wallet/control/FreezeParts";

const PAGE_SIZE = 10;

/** Gels de portefeuilles décidés sur instruction d'une autorité. */
export const FreezesPanel: React.FC = () => {
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState(false);
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["wallet-freezes", "list", page],
    queryFn: () => walletControlService.getFreezes({ page, size: PAGE_SIZE }),
  });
  const rows = data?.content ?? [];

  return (
    <div className="space-y-5">
      <ListHeader
        title="Gels"
        subtitle={isLoading ? undefined : `${data?.totalElements ?? 0} gel${(data?.totalElements ?? 0) > 1 ? "s" : ""}`}
        action={
          !open && (
            <ActionButton icon={Snowflake} onClick={() => setOpen(true)}>
              Geler un portefeuille
            </ActionButton>
          )
        }
      />
      {open && <FreezeForm onClose={() => setOpen(false)} />}
      {isLoading ? (
        <ListSkeleton rows={4} />
      ) : isError ? (
        <ErrorBlock message="Impossible de charger les gels." onRetry={() => refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState icon={Snowflake} title="Aucun gel" hint="Les gels sur instruction apparaissent ici." />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            {rows.map((f) => (
              <FreezeRow key={f.freezeNumber} freeze={f} />
            ))}
          </div>
          <Pagination page={page} totalPages={data?.totalPages ?? 0} total={data?.totalElements ?? 0} noun="gel" onChange={setPage} />
        </>
      )}
    </div>
  );
};
