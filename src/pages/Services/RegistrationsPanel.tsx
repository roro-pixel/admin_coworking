import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ClipboardList } from "lucide-react";
import { domiciliationService } from "../../services/domiciliation.service";
import { DataCard, EmptyState, ErrorBlock, HeadRow, ListHeader, Pagination, StatusChip } from "../../components/subscription/kit";
import { ROW_HOVER, formatDate, formatMoney } from "../../components/subscription/kitUtils";
import { statusOf } from "../../components/subscription/labels";
import { ListSkeleton } from "../../components/ui/Skeleton";
import { PAID_BY_LABEL, REGISTRATION_STATUS } from "../../components/services/serviceLabels";

const PAGE_SIZE = 10;
const COLS = "lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1.2fr)_minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)_9rem]";

/** Dossiers d'enregistrement en cours : un clic ouvre le contrat pour le déposer, le confirmer ou le rejeter. */
export const RegistrationsPanel: React.FC = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["domiciliation-registrations", "in-progress", page],
    queryFn: () => domiciliationService.getRegistrationsInProgress({ page, size: PAGE_SIZE }),
  });
  const rows = data?.content ?? [];

  return (
    <div className="space-y-5">
      <ListHeader title="Dossiers d'enregistrement" subtitle="Démarches ouvertes auprès de l'administration, en attente de confirmation." />
      {isLoading ? (
        <ListSkeleton rows={5} />
      ) : isError ? (
        <ErrorBlock message="Impossible de charger les dossiers en cours." onRetry={() => refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState icon={ClipboardList} title="Aucun dossier en cours" hint="Une démarche s'ouvre quand le contrat signé est déposé." />
      ) : (
        <DataCard>
          <HeadRow cols={COLS}>
            <span>Dossier</span>
            <span>Contrat</span>
            <span>Administration</span>
            <span>Droits et timbre</span>
            <span>Pris en charge par</span>
            <span>Statut</span>
          </HeadRow>
          <div className="space-y-1.5">
            {rows.map((r, i) => {
              const st = statusOf(REGISTRATION_STATUS, r.status);
              const fees = (r.stampDutyAmount ?? 0) + (r.registrationFeeAmount ?? 0);
              const go = () => r.contractNumber && navigate(`/services/contracts/${encodeURIComponent(r.contractNumber)}`);
              return (
                <div
                  key={r.registrationNumber ?? `${r.contractNumber}-${i}`}
                  role="link"
                  tabIndex={0}
                  onClick={go}
                  onKeyDown={(e) => e.key === "Enter" && go()}
                  className={`grid cursor-pointer items-center gap-x-4 gap-y-2 rounded-2xl bg-gray-50 px-4 py-3 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--logo-pink)] ${ROW_HOVER} ${COLS}`}
                >
                  <div className="min-w-0">
                    <p className="truncate font-mono text-sm font-semibold text-gray-900">{r.registrationNumber ?? "Sans numéro"}</p>
                    {r.administrationReference && <p className="truncate text-xs text-gray-400">Réf. {r.administrationReference}</p>}
                  </div>
                  <p className="truncate font-mono text-xs text-gray-600">{r.contractNumber}</p>
                  <p className="truncate text-sm text-gray-700">{r.administrationOffice || "À préciser"}</p>
                  <p className="text-sm font-semibold text-gray-900">{fees > 0 ? formatMoney(fees) : "Aucun frais"}</p>
                  <p className="text-sm text-gray-600">
                    {PAID_BY_LABEL[r.paidBy ?? ""] ?? "À préciser"}
                    {r.registrationDate && <span className="block text-xs text-gray-400">Le {formatDate(r.registrationDate)}</span>}
                  </p>
                  <div>
                    <StatusChip tone={st.tone}>{st.label}</StatusChip>
                  </div>
                </div>
              );
            })}
          </div>
        </DataCard>
      )}
      <Pagination page={page} totalPages={data?.totalPages ?? 0} total={data?.totalElements ?? 0} noun="dossier" onChange={setPage} />
    </div>
  );
};
