import React from "react";
import { useQuery } from "@tanstack/react-query";
import { History } from "lucide-react";
import { documentService } from "../../services/document.service";

export const DocumentAccessLogsPanel: React.FC<{ documentCode: string }> = ({
  documentCode,
}) => {
  const { data, isLoading } = useQuery({
    queryKey: ["document-access-logs", documentCode],
    queryFn: () =>
      documentService.getDocumentAccessLogs(documentCode, { size: 20 }),
    enabled: !!documentCode,
  });
  const logs = data?.content || [];
  return (
    <div className="border rounded-xl p-4 space-y-3">
      <h4 className="font-semibold flex items-center gap-2">
        <History size={16} /> Journal d’accès
      </h4>
      {isLoading ? (
        <div className="text-sm text-gray-500">Chargement...</div>
      ) : logs.length === 0 ? (
        <div className="text-sm text-gray-500">Aucun accès enregistré.</div>
      ) : (
        <div className="divide-y divide-gray-100">
          {logs.map((log: any, i: number) => (
            <div key={log.id || i} className="py-2 text-sm">
              <p className="font-medium">
                {log.action || log.eventType || "Accès"}
              </p>
              <p className="text-xs text-gray-500">
                {log.actorName || log.userId || log.performedBy || "—"} ·{" "}
                {log.createdAt || log.occurredAt || log.accessedAt || "—"}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
