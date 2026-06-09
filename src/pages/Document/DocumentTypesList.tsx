import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Eye,
  Plus,
  Search,
  FileText,
  Shield,
  Calendar,
  HardDrive,
} from "lucide-react";
import { documentService } from "../../services/document.service";
import type { DocumentType } from "../../services/document.service";
import { DocumentTypeDetailModal } from "./DocumentTypeDetailModal";

export const DocumentTypesList: React.FC = () => {
  const [ownerType, setOwnerType] = useState("MEMBER");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedDoc, setSelectedDoc] = useState<DocumentType | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const { data: documentTypes, isLoading } = useQuery({
    queryKey: ["documentTypes", ownerType],
    queryFn: () => documentService.getDocumentTypes(ownerType),
  });

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const handleViewDetail = (doc: DocumentType) => {
    setSelectedDoc(doc);
    setIsDetailOpen(true);
  };

  const filteredTypes = (documentTypes || []).filter((dt) => {
    if (
      search &&
      !dt.name.toLowerCase().includes(search.toLowerCase()) &&
      !dt.code.toLowerCase().includes(search.toLowerCase())
    )
      return false;
    if (categoryFilter !== "all" && dt.category !== categoryFilter)
      return false;
    return true;
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">
          Types de documents
        </h2>
        <div className="flex gap-3">
          <select
            value={ownerType}
            onChange={(e) => setOwnerType(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg text-sm"
          >
            <option value="MEMBER">Membres</option>
            <option value="CUSTOMER">Customers</option>
            <option value="BUSINESS">Business</option>
          </select>
          <button className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center gap-2 text-sm">
            <Plus size={18} />
            Nouveau type
          </button>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search
            size={18}
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Rechercher un type de document..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-4 py-2 border border-gray-200 rounded-lg bg-white text-sm"
        >
          <option value="all">Toutes les catégories</option>
          <option value="KYC">KYC</option>
          <option value="LEGAL">Légal</option>
        </select>
        {(search || categoryFilter !== "all") && (
          <button
            onClick={() => {
              setSearch("");
              setCategoryFilter("all");
            }}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
          >
            Réinitialiser
          </button>
        )}
      </div>

      {/* Liste */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-8">Chargement...</div>
        ) : filteredTypes.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl">
            <FileText size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">Aucun type de document trouvé</p>
          </div>
        ) : (
          filteredTypes.map((dt) => (
            <div
              key={dt.code}
              className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="p-5">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-gray-900">{dt.name}</h3>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${dt.required ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"}`}
                      >
                        {dt.required ? "Obligatoire" : "Optionnel"}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${dt.active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}
                      >
                        {dt.active ? "Actif" : "Inactif"}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${dt.category === "KYC" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"}`}
                      >
                        {dt.category}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {dt.description}
                    </p>
                    <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <FileText size={12} />
                        Code: {dt.code}
                      </span>
                      <span className="flex items-center gap-1">
                        <HardDrive size={12} />
                        Taille max: {formatBytes(dt.maxFileSizeBytes)}
                      </span>
                      {dt.requiresExpiryDate && (
                        <span className="flex items-center gap-1 text-orange-600">
                          <Calendar size={12} />
                          Date d'expiration requise
                        </span>
                      )}
                      {dt.requiresReview && (
                        <span className="flex items-center gap-1 text-blue-600">
                          <Shield size={12} />
                          Revue obligatoire
                        </span>
                      )}
                      {dt.multipleAllowed && (
                        <span className="flex items-center gap-1 text-gray-400">
                          Documents multiples autorisés
                        </span>
                      )}
                    </div>
                    {dt.allowedMimeTypes && (
                      <p className="text-xs text-gray-400 mt-2">
                        Formats: {dt.allowedMimeTypes}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleViewDetail(dt)}
                    className="p-2 text-gray-400 hover:text-primary-600 rounded-lg flex-shrink-0"
                    title="Voir détail"
                  >
                    <Eye size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal de détail */}
      {selectedDoc && (
        <DocumentTypeDetailModal
          isOpen={isDetailOpen}
          onClose={() => {
            setIsDetailOpen(false);
            setSelectedDoc(null);
          }}
          documentType={selectedDoc}
        />
      )}
    </div>
  );
};
