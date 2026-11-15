import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Inbox, PackagePlus } from "lucide-react";
import { domiciliationService } from "../../services/domiciliation.service";
import { ActionButton, DataCard, EmptyState, ErrorBlock, ListHeader, Pagination } from "../../components/subscription/kit";
import { ListSkeleton } from "../../components/ui/Skeleton";
import { MAIL_KEY, MailRow, ReceiveMailForm } from "../../components/services/MailParts";

const PAGE_SIZE = 10;

/** Courrier en attente de traitement, tous domiciliés confondus, et réception d'un nouveau courrier. */
export const MailPanel: React.FC = () => {
  const [page, setPage] = useState(0);
  const [receiving, setReceiving] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: [MAIL_KEY, "pending", page],
    queryFn: () => domiciliationService.getPendingMail({ page, size: PAGE_SIZE }),
  });
  const rows = data?.content ?? [];
  const total = data?.totalElements ?? 0;

  return (
    <div className="space-y-5">
      <ListHeader
        title="Courrier à traiter"
        subtitle={isLoading ? undefined : `${total} courrier${total > 1 ? "s" : ""} en attente de traitement`}
        action={
          !receiving && (
            <ActionButton icon={PackagePlus} onClick={() => setReceiving(true)}>
              Réceptionner un courrier
            </ActionButton>
          )
        }
      />

      {receiving && <ReceiveMailForm onDone={() => setReceiving(false)} onCancel={() => setReceiving(false)} />}

      {isLoading ? (
        <ListSkeleton rows={4} />
      ) : isError ? (
        <ErrorBlock message="Impossible de charger le courrier en attente." onRetry={() => refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState icon={Inbox} title="Aucun courrier en attente" hint="Le courrier réceptionné apparaît ici jusqu'à son scan, son retrait ou sa réexpédition." />
      ) : (
        <DataCard>
          <div className="space-y-2">
            {rows.map((m) => (
              <MailRow key={m.itemNumber} item={m} />
            ))}
          </div>
        </DataCard>
      )}
      <Pagination page={page} totalPages={data?.totalPages ?? 0} total={total} noun="courrier" onChange={setPage} />
    </div>
  );
};
