import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Eye, Search } from "lucide-react";
import { documentService } from "../../services/document.service";
import { DocumentRequirementDetailModal } from "./DocumentRequirementDetailModal";

export const DocumentRequirementsList: React.FC = () => {
  const [ownerType, setOwnerType] = useState("MEMBER");
  const [search, setSearch] = useState("");
  const [requiredFilter, setRequiredFilter] = useState("all");
  const [selectedReq, setSelectedReq] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const { data: requirements, isLoading } = useQuery({
    queryKey: ["documentRequirements", ownerType],
    queryFn: () => documentService.getDocumentRequirements(ownerType),
  });

  const handleViewDetail = (req: any) => {
    setSelectedReq(req);
    setIsDetailOpen(true);
  };

  const filteredRequirements = (requirements || []).filter((req: any) => {
    if (
      search &&
      !req.documentTypeName.toLowerCase().includes(search.toLowerCase()) &&
      !req.documentTypeCode.toLowerCase().includes(search.toLowerCase())
    )
      return false;
    if (requiredFilter === "required" && !req.required) return false;
    if (requiredFilter === "optional" && req.required) return false;
    return true;
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">
          Exigences documentaires KYC
        </h2>
        <select
          value={ownerType}
          onChange={(e) => setOwnerType(e.target.value)}
          className="px-4 py-2 border border-gray-200 rounded-lg text-sm"
        >
          <option value="MEMBER">Membres</option>
          <option value="CUSTOMER">Customers</option>
          <option value="BUSINESS">Business</option>
        </select>
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
            placeholder="Rechercher une exigence..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <select
          value={requiredFilter}
          onChange={(e) => setRequiredFilter(e.target.value)}
          className="px-4 py-2 border border-gray-200 rounded-lg bg-white text-sm"
        >
          <option value="all">Toutes</option>
          <option value="required">Obligatoires</option>
          <option value="optional">Optionnelles</option>
        </select>
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold">
                Type de document
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold">
                Code
              </th>
              <th className="px-6 py-3 text-center text-sm font-semibold">
                Obligatoire
              </th>
              <th className="px-6 py-3 text-center text-sm font-semibold">
                Actif
              </th>
              <th className="px-6 py-3 text-center text-sm font-semibold">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="text-center py-8">
                  Chargement...
                </td>
              </tr>
            ) : filteredRequirements.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-gray-500">
                  Aucune exigence trouvée
                </td>
              </tr>
            ) : (
              filteredRequirements.map((req: any) => (
                <tr key={req.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium">
                    {req.documentTypeName}
                  </td>
                  <td className="px-6 py-4 text-sm font-mono">
                    {req.documentTypeCode}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${req.required ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"}`}
                    >
                      {req.required ? "Oui" : "Non"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${req.active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}
                    >
                      {req.active ? "Actif" : "Inactif"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => handleViewDetail(req)}
                      className="p-1 text-gray-400 hover:text-primary-600"
                      title="Voir détail"
                    >
                      <Eye size={18} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal détail */}
      {selectedReq && (
        <DocumentRequirementDetailModal
          isOpen={isDetailOpen}
          onClose={() => {
            setIsDetailOpen(false);
            setSelectedReq(null);
          }}
          requirement={selectedReq}
        />
      )}
    </div>
  );
};
