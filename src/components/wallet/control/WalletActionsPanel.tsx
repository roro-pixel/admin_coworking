import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ClipboardList, Plus } from "lucide-react";
import { walletControlService } from "../../../services/walletControl.service";
import { ActionButton, EmptyState, ErrorBlock, Pagination } from "../../subscription/kit";
import { ListSkeleton } from "../../ui/Skeleton";
import { ActionForm } from "./ActionForm";
import { ActionRow } from "./ActionRow";

const PAGE_SIZE = 10;

/** Actions administratives d'un portefeuille : historique et nouvelle demande à deux visas. */
export const WalletActionsPanel: React.FC<{ walletNumber: string; currency: string }> = ({ walletNumber, currency }) => {
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState(false);
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["wallet-actions", "wallet", walletNumber, page],
    queryFn: () => walletControlService.getWalletActions(walletNumber, { page, size: PAGE_SIZE }),
  });
  const rows = data?.content ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-500">Actions demandées sur ce portefeuille, exécutées après un second visa</p>
        {!open && (
          <ActionButton icon={Plus} onClick={() => setOpen(true)}>
            Nouvelle action
          </ActionButton>
        )}
      </div>
      {open && <ActionForm walletNumber={walletNumber} onClose={() => setOpen(false)} />}
      {isLoading ? (
        <ListSkeleton rows={3} />
      ) : isError ? (
        <ErrorBlock message="Impossible de charger les actions." onRetry={() => refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState icon={ClipboardList} title="Aucune action" hint="Les actions administratives demandées sur ce portefeuille apparaissent ici." />
      ) : (
        <>
          <div className="space-y-3">
            {rows.map((a) => (
              <ActionRow key={a.actionNumber} action={a} currency={currency} showWallet={false} />
            ))}
          </div>
          <Pagination page={page} totalPages={data?.totalPages ?? 0} total={data?.totalElements ?? 0} noun="action" onChange={setPage} />
        </>
      )}
    </div>
  );
};
