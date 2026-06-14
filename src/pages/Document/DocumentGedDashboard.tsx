import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  FileText,
  AlertTriangle,
  Clock,
  RefreshCw,
} from "lucide-react";
import { documentService } from "../../services/document.service";

const spaces = [
  "",
  "KYC_SPACE",
  "CONTRACT_SPACE",
  "FINANCIAL_SPACE",
  "ASSET_SPACE",
  "ADMINISTRATIVE",
  "GENERIC",
];

const Stat: React.FC<{
  label: string;
  value: number;
  icon: React.ElementType;
}> = ({ label, value, icon: Icon }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
    <div className="flex items-center gap-2 text-sm text-gray-500">
      <Icon size={16} /> {label}
    </div>
    <p className="text-2xl font-bold text-gray-900 mt-2">
      {value.toLocaleString("fr-FR")}
    </p>
  </div>
);

export const DocumentGedDashboard: React.FC = () => {
  const [space, setSpace] = useState("");
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["document-dashboard", space],
    queryFn: () => documentService.getDocumentDashboard(space || undefined),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Dashboard GED</h2>
          <p className="text-sm text-gray-500 mt-1">
            Synthèse globale des documents par statut et espace.
          </p>
        </div>
        <div className="flex gap-2">
          <select
            value={space}
            onChange={(e) => setSpace(e.target.value)}
            className="px-3 py-2 border rounded-lg bg-white text-sm"
          >
            <option value="">Tous les espaces</option>
            {spaces.filter(Boolean).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <button
            onClick={() => refetch()}
            className="px-3 py-2 border rounded-lg text-sm flex items-center gap-2"
          >
            <RefreshCw size={15} /> Actualiser
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="text-center py-10">
          <RefreshCw className="animate-spin mx-auto" />
        </div>
      )}

      {data && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Stat
              label="Total documents"
              value={data.totalDocuments ?? 0}
              icon={FileText}
            />
            <Stat
              label="En revue"
              value={data.pendingReview ?? 0}
              icon={Clock}
            />
            <Stat
              label="Expirés"
              value={data.expiredDocuments ?? 0}
              icon={AlertTriangle}
            />
            <Stat
              label="Corrections"
              value={data.needsCorrection ?? 0}
              icon={BarChart3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h3 className="font-semibold mb-4">Par statut</h3>
              <div className="space-y-2">
                {Object.entries(data.byStatus || {}).map(([key, value]) => (
                  <div
                    key={key}
                    className="flex justify-between text-sm border-b pb-2"
                  >
                    <span>{key}</span>
                    <strong>{Number(value).toLocaleString("fr-FR")}</strong>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h3 className="font-semibold mb-4">Par espace</h3>
              <div className="space-y-2">
                {Object.entries(data.bySpace || {}).map(([key, value]) => (
                  <div
                    key={key}
                    className="flex justify-between text-sm border-b pb-2"
                  >
                    <span>{key}</span>
                    <strong>{Number(value).toLocaleString("fr-FR")}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
