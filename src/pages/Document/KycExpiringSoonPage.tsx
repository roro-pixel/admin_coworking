import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CalendarCheck, Eye } from "lucide-react";
import { kycService } from "../../services/document.service";
import { EmptyState, ErrorBlock, Field, IconButton, ListHeader, Pagination } from "../../components/subscription/kit";
import { FIELD } from "../../components/subscription/kitUtils";
import { ListSkeleton } from "../../components/ui/Skeleton";
import { CaseCard, CaseHead, CaseRow } from "../../components/documents/CaseList";

const PAGE_SIZE = 15;

export const KycExpiringSoonPage: React.FC = () => {
  const navigate = useNavigate();
  const [days, setDays] = useState(30);
  const [page, setPage] = useState(0);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["kyc-expiring-soon", days, page],
    queryFn: () => kycService.getExpiringSoon(days, { page, size: PAGE_SIZE }),
  });

  const cases = data?.content ?? [];
  const total = data?.totalElements ?? 0;

  return (
    <div className="space-y-5">
      <ListHeader
        title="Expirations à venir"
        subtitle={isLoading ? undefined : `${total} dossier${total > 1 ? "s" : ""} avec un document qui expire sous ${days} jours`}
        action={
          <Field label="Horizon">
            <select
              value={days}
              onChange={(e) => {
                setDays(Number(e.target.value));
                setPage(0);
              }}
              className={`${FIELD} min-w-[9rem]`}
            >
              <option value={7}>7 jours</option>
              <option value={30}>30 jours</option>
              <option value={60}>60 jours</option>
            </select>
          </Field>
        }
      />

      {isLoading ? (
        <ListSkeleton rows={6} />
      ) : isError ? (
        <ErrorBlock message="Impossible de charger les expirations." onRetry={() => refetch()} />
      ) : cases.length === 0 ? (
        <EmptyState icon={CalendarCheck} title={`Aucune expiration sous ${days} jours`} hint="Tous les documents sont à jour sur cet horizon." />
      ) : (
        <>
          <CaseHead dateTitle="Soumis le" />
          <CaseCard>
            {cases.map((c) => (
              <CaseRow
                key={c.code}
                kycCase={c}
                date={c.submittedAt} alert={false}
                onOpen={() => navigate(`/documents/kyc/cases/${c.code}`)}
                actions={<IconButton icon={Eye} label="Voir le dossier" onClick={() => navigate(`/documents/kyc/cases/${c.code}`)} />}
              />
            ))}
          </CaseCard>
          <Pagination page={page} totalPages={data?.totalPages ?? 0} total={total} noun="dossier" onChange={setPage} />
        </>
      )}
    </div>
  );
};
