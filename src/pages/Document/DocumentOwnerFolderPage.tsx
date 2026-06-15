import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FolderOpen, Search, AlertTriangle, CheckCircle } from "lucide-react";
import { documentService } from "../../services/document.service";

const ownerTypes = [
  "CUSTOMER",
  "MEMBER",
  "BUSINESS",
  "CONTRACT",
  "INVOICE",
  "PAYMENT",
  "PROPOSAL",
  "ASSET",
];

export const DocumentOwnerFolderPage: React.FC = () => {
  const [ownerType, setOwnerType] = useState("MEMBER");
  const [ownerCode, setOwnerCode] = useState("");
  const [submitted, setSubmitted] = useState<{
    ownerType: string;
    ownerCode: string;
  } | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ["document-folder", submitted?.ownerType, submitted?.ownerCode],
    queryFn: () =>
      documentService.getDocumentFolder(
        submitted!.ownerType,
        submitted!.ownerCode,
      ),
    enabled: !!submitted?.ownerCode,
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">
          Dossier documentaire propriétaire
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Consultez les documents groupés par espace et les exigences
          manquantes.
        </p>
      </div>
      <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
        <select
          value={ownerType}
          onChange={(e) => setOwnerType(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-xl bg-white"
        >
          {ownerTypes.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <input
          value={ownerCode}
          onChange={(e) => setOwnerCode(e.target.value)}
          placeholder="Code propriétaire"
          className="md:col-span-2 px-3 py-2 border border-gray-200 rounded-xl font-mono"
        />
        <button
          disabled={!ownerCode}
          onClick={() => setSubmitted({ ownerType, ownerCode })}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Search size={16} /> Charger
        </button>
      </div>
      {isLoading && <div className="text-center py-10">Chargement...</div>}
      {data && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl p-5 shadow-sm ring-1 ring-gray-100">
              <p className="text-sm text-gray-500">Total documents</p>
              <p className="text-2xl font-bold">{data.totalDocuments}</p>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm ring-1 ring-gray-100">
              <p className="text-sm text-gray-500">Complétude</p>
              <p className="text-2xl font-bold">
                {Math.round((data.completeness ?? 0) * 100)}%
              </p>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm ring-1 ring-gray-100">
              <p className="text-sm text-gray-500">Types manquants</p>
              <p className="text-2xl font-bold">
                {data.missingRequiredTypes?.length ?? 0}
              </p>
            </div>
          </div>
          {(data.missingRequiredTypes || []).length > 0 ? (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-orange-700 flex gap-2">
              <AlertTriangle size={18} /> {data.missingRequiredTypes.join(", ")}
            </div>
          ) : (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-green-700 flex gap-2">
              <CheckCircle size={18} /> Aucun type obligatoire manquant.
            </div>
          )}
          {Object.entries(data.bySpace || {}).map(([space, documentsRaw]) => {
            const documents = documentsRaw as any[];
            return (
              <div
                key={space}
                className="bg-white rounded-xl shadow-sm overflow-hidden"
              >
                <div className="px-5 py-3 border-b flex items-center gap-2">
                  <FolderOpen size={16} />
                  <h3 className="font-semibold">{space}</h3>
                  <span className="text-sm text-gray-500">
                    {documents.length}
                  </span>
                </div>
                <div className="divide-y divide-gray-100">
                  {documents.map((doc) => (
                    <div
                      key={doc.code}
                      className="px-5 py-3 flex justify-between"
                    >
                      <div>
                        <p className="font-medium">{doc.title}</p>
                        <p className="text-xs text-gray-500 font-mono">
                          {doc.code} · {doc.documentTypeName}
                        </p>
                      </div>
                      <span className="text-xs px-2 py-1 rounded-full bg-gray-100 self-start">
                        {doc.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
