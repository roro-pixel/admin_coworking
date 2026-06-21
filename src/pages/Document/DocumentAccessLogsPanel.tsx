import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Filter, History, Search } from "lucide-react";
import { documentService } from "../../services/document.service";

export const DocumentAccessLogsPanel: React.FC<{ documentCode: string }> = ({
  documentCode,
}) => {
  const [actor, setActor] = useState("");
  const [action, setAction] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["document-access-logs", documentCode],
    queryFn: () =>
      documentService.getDocumentAccessLogs(documentCode, { size: 100 }),
    enabled: !!documentCode,
  });

  const logs = data?.content || [];

  const filteredLogs = useMemo(
    () =>
      logs.filter((log: any) => {
        const actorText = String(
          log.actorName || log.userId || log.performedBy || log.email || "",
        ).toLowerCase();
        const actionText = String(
          log.action || log.eventType || "",
        ).toLowerCase();
        const dateValue = log.createdAt || log.occurredAt || log.accessedAt;
        const date = dateValue ? new Date(dateValue) : null;

        if (actor && !actorText.includes(actor.toLowerCase())) return false;
        if (action && !actionText.includes(action.toLowerCase())) return false;
        if (fromDate && date && date < new Date(`${fromDate}T00:00:00`))
          return false;
        if (toDate && date && date > new Date(`${toDate}T23:59:59`))
          return false;
        return true;
      }),
    [logs, actor, action, fromDate, toDate],
  );

  const exportCsv = () => {
    const header = ["action", "actor", "date", "ip", "userAgent"];
    const rows = filteredLogs.map((log: any) => [
      log.action || log.eventType || "Accès",
      log.actorName || log.userId || log.performedBy || "",
      log.createdAt || log.occurredAt || log.accessedAt || "",
      log.ipAddress || log.ip || "",
      log.userAgent || "",
    ]);
    const csv = [header, ...rows]
      .map((row) =>
        row
          .map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`)
          .join(","),
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement("a");
    a.href = url;
    a.download = `access_logs_${documentCode}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="border rounded-xl p-4 space-y-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h4 className="font-semibold flex items-center gap-2">
          <History size={16} /> Journal d’accès
        </h4>
        <div className="flex gap-2">
          <button
            onClick={() => refetch()}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
          >
            Actualiser
          </button>
          <button
            onClick={exportCsv}
            disabled={filteredLogs.length === 0}
            className="inline-flex items-center gap-1 rounded-lg bg-primary-600 px-3 py-1.5 text-xs text-white hover:bg-primary-700 disabled:opacity-50"
          >
            <Download size={13} /> Export CSV
          </button>
        </div>
      </div>

      <div className="rounded-xl bg-gray-50 p-3">
        <div className="mb-2 flex items-center gap-2 text-xs font-medium text-gray-500">
          <Filter size={13} /> Filtres audit
        </div>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              value={actor}
              onChange={(e) => setActor(e.target.value)}
              placeholder="Acteur"
              className="w-full rounded-lg border border-gray-200 py-2 pl-8 pr-3 text-xs"
            />
          </div>
          <input
            value={action}
            onChange={(e) => setAction(e.target.value)}
            placeholder="Action"
            className="rounded-lg border border-gray-200 px-3 py-2 text-xs"
          />
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-xs"
          />
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-xs"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="text-sm text-gray-500">Chargement...</div>
      ) : filteredLogs.length === 0 ? (
        <div className="text-sm text-gray-500">Aucun accès enregistré.</div>
      ) : (
        <div className="divide-y divide-gray-100">
          {filteredLogs.map((log: any, i: number) => (
            <div key={log.id || i} className="py-2 text-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">
                    {log.action || log.eventType || "Accès"}
                  </p>
                  <p className="text-xs text-gray-500">
                    {log.actorName || log.userId || log.performedBy || "—"} ·{" "}
                    {log.createdAt || log.occurredAt || log.accessedAt || "—"}
                  </p>
                </div>
                {(log.ipAddress || log.ip) && (
                  <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-500">
                    {log.ipAddress || log.ip}
                  </span>
                )}
              </div>
              {log.userAgent && (
                <p className="mt-1 truncate text-xs text-gray-400">
                  {log.userAgent}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
