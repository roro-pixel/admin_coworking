import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, BarChart3, RefreshCw } from "lucide-react";
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

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

export const DocumentAnalyticsExportPage: React.FC = () => {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [space, setSpace] = useState("");
  const params = {
    from: from || undefined,
    to: to || undefined,
    space: space || undefined,
  };
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["document-analytics", params],
    queryFn: () => documentService.getDocumentAnalytics(params),
  });

  const exportCsv = async () => {
    const blob = await documentService.exportDocumentsCsv(params);
    downloadBlob(blob, "documents_export.csv");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Analytics & exports GED
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Analyse documentaire et export CSV.
          </p>
        </div>
        <button
          onClick={exportCsv}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg flex items-center gap-2"
        >
          <Download size={16} /> Export CSV
        </button>
      </div>
      <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-xl"
        />
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-xl"
        />
        <select
          value={space}
          onChange={(e) => setSpace(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-xl bg-white"
        >
          <option value="">Tous espaces</option>
          {spaces.filter(Boolean).map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 border border-gray-200 rounded-xl flex items-center justify-center gap-2"
        >
          <RefreshCw size={16} /> Actualiser
        </button>
      </div>
      {isLoading && (
        <div className="text-center py-10">
          <RefreshCw className="animate-spin mx-auto" />
        </div>
      )}
      {data && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Metric label="Uploadés" value={data.totalUploaded ?? 0} />
            <Metric label="Revus" value={data.totalReviewed ?? 0} />
            <Metric label="Approuvés" value={data.totalApproved ?? 0} />
            <Metric label="Rejetés" value={data.totalRejected ?? 0} />
            <Metric
              label="Délai moyen"
              value={`${data.avgReviewHours ?? 0} h`}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Breakdown title="Par statut" data={data.byStatus} />
            <Breakdown title="Par espace" data={data.bySpace} />
            <Breakdown title="Par catégorie" data={data.byCategory} />
          </div>
        </div>
      )}
    </div>
  );
};

const Metric: React.FC<{ label: string; value: number | string }> = ({
  label,
  value,
}) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
    <div className="flex items-center gap-2 text-sm text-gray-500">
      <BarChart3 size={16} /> {label}
    </div>
    <p className="text-2xl font-bold mt-2">
      {typeof value === "number" ? value.toLocaleString("fr-FR") : value}
    </p>
  </div>
);
const Breakdown: React.FC<{ title: string; data?: Record<string, number> }> = ({
  title,
  data,
}) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
    <h3 className="font-semibold mb-3">{title}</h3>
    <div className="space-y-2">
      {Object.entries(data || {}).map(([k, v]) => (
        <div key={k} className="flex justify-between text-sm border-b pb-2">
          <span>{k}</span>
          <strong>{Number(v).toLocaleString("fr-FR")}</strong>
        </div>
      ))}
    </div>
  </div>
);
