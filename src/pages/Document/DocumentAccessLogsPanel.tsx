import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, History } from "lucide-react";
import { documentService } from "../../services/document.service";
import { ActionButton, EmptyState, ErrorBlock, Field, Pagination, SearchField } from "../../components/subscription/kit";
import { FIELD_SOFT } from "../../components/subscription/kitUtils";
import { ListSkeleton } from "../../components/ui/Skeleton";
import { RefreshButton } from "../../components/reporting/reportKit";
import { saveBlob } from "../../components/payment/paymentUtils";
import { dateTime, toCsv, usePaged } from "../../components/documents/docUtils";

type Log = Record<string, unknown>;
const FETCH_SIZE = 100;
const text = (v: unknown): string => (v === undefined || v === null ? "" : String(v));
const actorOf = (l: Log) => text(l.actorName || l.userId || l.performedBy || l.email);
const actionOf = (l: Log) => text(l.action || l.eventType);
const dateOf = (l: Log) => text(l.createdAt || l.occurredAt || l.accessedAt);
const ipOf = (l: Log) => text(l.ipAddress || l.ip);

export const DocumentAccessLogsPanel: React.FC<{ documentCode: string }> = ({ documentCode }) => {
  const [actor, setActor] = useState("");
  const [action, setAction] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: ["document-access-logs", documentCode],
    queryFn: () => documentService.getDocumentAccessLogs(documentCode, { size: FETCH_SIZE }),
    enabled: !!documentCode,
  });

  const logs = (data?.content ?? []) as Log[];
  const total = data?.totalElements ?? logs.length;

  const filtered = useMemo(
    () =>
      logs.filter((l) => {
        const raw = dateOf(l);
        const date = raw ? new Date(raw) : null;
        if (actor && !actorOf(l).toLowerCase().includes(actor.toLowerCase())) return false;
        if (action && !actionOf(l).toLowerCase().includes(action.toLowerCase())) return false;
        if (fromDate && date && date < new Date(`${fromDate}T00:00:00`)) return false;
        if (toDate && date && date > new Date(`${toDate}T23:59:59`)) return false;
        return true;
      }),
    [logs, actor, action, fromDate, toDate],
  );
  const { page, setPage, slice, totalPages } = usePaged(filtered, 10);

  const exportCsv = () => {
    const rows = [["action", "acteur", "date", "ip", "agent"], ...filtered.map((l) => [actionOf(l) || "Accès", actorOf(l), dateOf(l), ipOf(l), text(l.userAgent)])];
    saveBlob(new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" }), `access_logs_${documentCode}.csv`);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="flex items-center gap-2 text-base font-bold text-gray-950">
          <History size={18} /> Journal d'accès
        </h4>
        <div className="flex items-center gap-2">
          <RefreshButton fetching={isFetching} onClick={() => refetch()} />
          <ActionButton variant="ghost" icon={Download} disabled={filtered.length === 0} onClick={exportCsv}>
            Export CSV
          </ActionButton>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SearchField
          value={actor}
          onChange={(v) => {
            setActor(v);
            setPage(0);
          }}
          placeholder="Acteur"
        />
        <input
          value={action}
          onChange={(e) => {
            setAction(e.target.value);
            setPage(0);
          }}
          placeholder="Action"
          aria-label="Action"
          className={FIELD_SOFT}
        />
        <Field label="Du" className="sm:col-span-1">
          <input type="date" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setPage(0); }} className={FIELD_SOFT} />
        </Field>
        <Field label="Au">
          <input type="date" value={toDate} onChange={(e) => { setToDate(e.target.value); setPage(0); }} className={FIELD_SOFT} />
        </Field>
      </div>

      {total > FETCH_SIZE && <p className="text-xs text-gray-400">Seuls les {FETCH_SIZE} accès les plus récents sont chargés, sur {total} au total.</p>}

      {isLoading ? (
        <ListSkeleton rows={4} />
      ) : isError ? (
        <ErrorBlock message="Impossible de charger le journal d'accès." onRetry={() => refetch()} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={History} title="Aucun accès enregistré" hint="Aucune entrée ne correspond aux filtres." />
      ) : (
        <>
          <div className="space-y-2">
            {slice.map((l, i) => (
              <div key={`${dateOf(l)}-${i}`} className="flex items-start justify-between gap-3 rounded-2xl bg-gray-50 p-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{actionOf(l) || "Accès"}</p>
                  <p className="text-xs text-gray-500">
                    {actorOf(l) || "Acteur inconnu"} · {dateOf(l) ? dateTime(dateOf(l)) : "Date inconnue"}
                  </p>
                </div>
                {ipOf(l) && <span className="shrink-0 font-mono text-xs text-gray-400">{ipOf(l)}</span>}
              </div>
            ))}
          </div>
          <Pagination page={page} totalPages={totalPages} total={filtered.length} noun="accès" onChange={setPage} />
        </>
      )}
    </div>
  );
};
