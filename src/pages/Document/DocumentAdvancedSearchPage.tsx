import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Download, Eye, Archive, RefreshCw } from "lucide-react";
import { documentService } from "../../services/document.service";
import type { DocumentResponse } from "../../services/document.service";
import { DocumentDetailModal } from "./DocumentDetail";

const spaces = [
  "KYC_SPACE",
  "CONTRACT_SPACE",
  "FINANCIAL_SPACE",
  "ASSET_SPACE",
  "ADMINISTRATIVE",
  "GENERIC",
];
const categories = ["KYC", "LEGAL", "SYSTEM", "FINANCIAL", "ASSET", "OTHER"];
const statuses = [
  "DRAFT",
  "UPLOADED",
  "PENDING_REVIEW",
  "NEEDS_CORRECTION",
  "APPROVED",
  "REJECTED",
  "SIGNED",
  "EXPIRED",
  "ARCHIVED",
  "SUPERSEDED",
];
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

export const DocumentAdvancedSearchPage: React.FC = () => {
  const [form, setForm] = useState({
    q: "",
    space: "",
    category: "",
    ownerType: "",
    ownerCode: "",
    status: "",
    expiresInDays: "",
    isExpired: "",
    uploadedAfter: "",
    uploadedBefore: "",
    metaKey: "",
    metaValue: "",
  });
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<DocumentResponse | null>(null);
  const [submitted, setSubmitted] = useState(form);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["document-advanced-search", submitted, page],
    queryFn: () =>
      documentService.searchDocuments({
        q: submitted.q || undefined,
        space: submitted.space || undefined,
        category: submitted.category || undefined,
        ownerType: submitted.ownerType || undefined,
        ownerCode: submitted.ownerCode || undefined,
        statuses: submitted.status ? [submitted.status] : undefined,
        expiresInDays: submitted.expiresInDays
          ? Number(submitted.expiresInDays)
          : undefined,
        isExpired:
          submitted.isExpired === ""
            ? undefined
            : submitted.isExpired === "true",
        uploadedAfter: submitted.uploadedAfter || undefined,
        uploadedBefore: submitted.uploadedBefore || undefined,
        metaKey: submitted.metaKey || undefined,
        metaValue: submitted.metaValue || undefined,
        page,
        size: 20,
        sort: "uploadedAt,desc",
      }),
  });

  const documents = data?.content || [];
  const totalPages = data?.totalPages ?? 1;

  const download = async (code: string) => {
    const blob = await documentService.downloadDocument(code);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${code}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const archive = async (code: string) => {
    const reason = prompt("Motif d'archivage :") || undefined;
    await documentService.archiveDocument(code, reason);
    refetch();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">
          Recherche documentaire avancée
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Recherche sur texte, espace, catégorie, propriétaire, statut, dates et
          métadonnées.
        </p>
      </div>
      <div className="bg-white rounded-xl shadow-sm p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
        <input
          value={form.q}
          onChange={(e) => setForm({ ...form, q: e.target.value })}
          placeholder="Recherche texte"
          className="px-3 py-2 border rounded-lg"
        />
        <select
          value={form.space}
          onChange={(e) => setForm({ ...form, space: e.target.value })}
          className="px-3 py-2 border rounded-lg bg-white"
        >
          <option value="">Tous espaces</option>
          {spaces.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
          className="px-3 py-2 border rounded-lg bg-white"
        >
          <option value="">Toutes catégories</option>
          {categories.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select
          value={form.status}
          onChange={(e) => setForm({ ...form, status: e.target.value })}
          className="px-3 py-2 border rounded-lg bg-white"
        >
          <option value="">Tous statuts</option>
          {statuses.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select
          value={form.ownerType}
          onChange={(e) => setForm({ ...form, ownerType: e.target.value })}
          className="px-3 py-2 border rounded-lg bg-white"
        >
          <option value="">Tous propriétaires</option>
          {ownerTypes.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <input
          value={form.ownerCode}
          onChange={(e) => setForm({ ...form, ownerCode: e.target.value })}
          placeholder="Code propriétaire"
          className="px-3 py-2 border rounded-lg font-mono"
        />
        <input
          type="number"
          value={form.expiresInDays}
          onChange={(e) => setForm({ ...form, expiresInDays: e.target.value })}
          placeholder="Expire dans N jours"
          className="px-3 py-2 border rounded-lg"
        />
        <select
          value={form.isExpired}
          onChange={(e) => setForm({ ...form, isExpired: e.target.value })}
          className="px-3 py-2 border rounded-lg bg-white"
        >
          <option value="">Expiration</option>
          <option value="true">Expirés</option>
          <option value="false">Non expirés</option>
        </select>
        <input
          type="date"
          value={form.uploadedAfter}
          onChange={(e) => setForm({ ...form, uploadedAfter: e.target.value })}
          className="px-3 py-2 border rounded-lg"
        />
        <input
          type="date"
          value={form.uploadedBefore}
          onChange={(e) => setForm({ ...form, uploadedBefore: e.target.value })}
          className="px-3 py-2 border rounded-lg"
        />
        <input
          value={form.metaKey}
          onChange={(e) => setForm({ ...form, metaKey: e.target.value })}
          placeholder="Meta key"
          className="px-3 py-2 border rounded-lg"
        />
        <input
          value={form.metaValue}
          onChange={(e) => setForm({ ...form, metaValue: e.target.value })}
          placeholder="Meta value"
          className="px-3 py-2 border rounded-lg"
        />
        <button
          onClick={() => {
            setPage(0);
            setSubmitted(form);
          }}
          className="md:col-span-4 px-4 py-2 bg-primary-600 text-white rounded-lg flex items-center justify-center gap-2"
        >
          <Search size={16} /> Rechercher
        </button>
      </div>
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-10 text-center">
            <RefreshCw className="animate-spin mx-auto" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left">Document</th>
                <th className="px-4 py-3 text-left">Propriétaire</th>
                <th className="px-4 py-3 text-left">Statut</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {documents.map((doc) => (
                <tr key={doc.code}>
                  <td className="px-4 py-3">
                    <p className="font-medium">{doc.title}</p>
                    <p className="text-xs text-gray-500 font-mono">
                      {doc.code} · {doc.documentTypeName}
                    </p>
                  </td>
                  <td className="px-4 py-3 font-mono">
                    {doc.ownerType} · {doc.ownerCode || doc.ownerId}
                  </td>
                  <td className="px-4 py-3">{doc.status}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setSelected(doc)}
                        className="p-1 text-blue-600"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => download(doc.code)}
                        className="p-1 text-gray-600"
                      >
                        <Download size={16} />
                      </button>
                      <button
                        onClick={() => archive(doc.code)}
                        className="p-1 text-orange-600"
                      >
                        <Archive size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className="flex justify-end gap-2">
        <button
          disabled={page <= 0}
          onClick={() => setPage((p) => p - 1)}
          className="px-3 py-1 border rounded disabled:opacity-50"
        >
          Précédent
        </button>
        <span className="px-3 py-1 text-sm">
          {page + 1}/{Math.max(totalPages, 1)}
        </span>
        <button
          disabled={page + 1 >= totalPages}
          onClick={() => setPage((p) => p + 1)}
          className="px-3 py-1 border rounded disabled:opacity-50"
        >
          Suivant
        </button>
      </div>
      {selected && (
        <DocumentDetailModal
          isOpen={!!selected}
          onClose={() => setSelected(null)}
          document={selected}
        />
      )}
    </div>
  );
};
