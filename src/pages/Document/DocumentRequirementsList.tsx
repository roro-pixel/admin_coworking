import React, { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, Search, Plus, Power, Trash2, X } from "lucide-react";
import { documentService } from "../../services/document.service";
import type {
  DocumentOwnerType,
  DocumentRequirement,
  DocumentType,
} from "../../services/document.service";
import { DocumentRequirementDetailModal } from "./DocumentRequirementDetailModal";
import { ModalPortal } from "../../components/ui/ModalPortal";

const ownerTypes: DocumentOwnerType[] = [
  "CUSTOMER",
  "MEMBER",
  "BUSINESS",
  "CONTRACT",
  "INVOICE",
  "PAYMENT",
  "PROPOSAL",
  "ASSET",
];

export const DocumentRequirementsList: React.FC = () => {
  const queryClient = useQueryClient();
  const [ownerType, setOwnerType] = useState<DocumentOwnerType>("MEMBER");
  const [search, setSearch] = useState("");
  const [requiredFilter, setRequiredFilter] = useState("all");
  const [selectedReq, setSelectedReq] = useState<DocumentRequirement | null>(
    null,
  );
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<DocumentRequirement | null>(null);
  const [form, setForm] = useState({
    ownerType: "MEMBER" as DocumentOwnerType,
    documentTypeCode: "",
    required: true,
    active: true,
  });
  const [error, setError] = useState<string | null>(null);

  const { data: requirements, isLoading } = useQuery({
    queryKey: ["documentRequirements", ownerType],
    queryFn: () => documentService.getDocumentRequirements(ownerType),
  });
  const { data: documentTypes = [] } = useQuery({
    queryKey: ["documentTypes", ownerType],
    queryFn: () => documentService.getDocumentTypes(ownerType, true),
  });

  useEffect(() => {
    if (!isFormOpen) return;
    if (editing)
      setForm({
        ownerType: editing.ownerType as DocumentOwnerType,
        documentTypeCode: editing.documentTypeCode,
        required: editing.required,
        active: editing.active,
      });
    else
      setForm({
        ownerType,
        documentTypeCode: "",
        required: true,
        active: true,
      });
    setError(null);
  }, [isFormOpen, editing, ownerType]);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["documentRequirements"] });
  const createMutation = useMutation({
    mutationFn: () => documentService.createDocumentRequirement(form),
    onSuccess: () => {
      invalidate();
      setIsFormOpen(false);
    },
    onError: (e: any) =>
      setError(e?.response?.data?.message || "Erreur création exigence"),
  });
  const updateMutation = useMutation({
    mutationFn: () =>
      documentService.updateDocumentRequirement(editing!.id, form),
    onSuccess: () => {
      invalidate();
      setIsFormOpen(false);
      setEditing(null);
    },
    onError: (e: any) =>
      setError(e?.response?.data?.message || "Erreur modification exigence"),
  });
  const activateMutation = useMutation({
    mutationFn: (id: number) => documentService.activateDocumentRequirement(id),
    onSuccess: invalidate,
  });
  const deactivateMutation = useMutation({
    mutationFn: (id: number) =>
      documentService.deactivateDocumentRequirement(id),
    onSuccess: invalidate,
  });
  const deleteMutation = useMutation({
    mutationFn: (id: number) => documentService.deleteDocumentRequirement(id),
    onSuccess: invalidate,
  });

  const filteredRequirements = (requirements || []).filter((req) => {
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

  const submit = () =>
    editing ? updateMutation.mutate() : createMutation.mutate();

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">
          Exigences documentaires
        </h2>
        <div className="flex gap-3">
          <select
            value={ownerType}
            onChange={(e) => setOwnerType(e.target.value as DocumentOwnerType)}
            className="px-4 py-2 border border-gray-200 rounded-xl text-sm bg-white"
          >
            {ownerTypes.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
          <button
            onClick={() => {
              setEditing(null);
              setIsFormOpen(true);
            }}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center gap-2 text-sm"
          >
            <Plus size={18} /> Nouvelle exigence
          </button>
        </div>
      </div>
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            placeholder="Rechercher une exigence..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl"
          />
        </div>
        <select
          value={requiredFilter}
          onChange={(e) => setRequiredFilter(e.target.value)}
          className="px-4 py-2 border border-gray-200 rounded-xl bg-white text-sm"
        >
          <option value="all">Toutes</option>
          <option value="required">Obligatoires</option>
          <option value="optional">Optionnelles</option>
        </select>
      </div>
      {isLoading ? (
        <div className="text-center py-8">Chargement...</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50/70">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold">
                  Document
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold">
                  Propriétaire
                </th>
                <th className="px-6 py-3 text-center text-sm font-semibold">
                  Obligatoire
                </th>
                <th className="px-6 py-3 text-center text-sm font-semibold">
                  Actif
                </th>
                <th className="px-6 py-3 text-right text-sm font-semibold">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRequirements.map((req) => (
                <tr key={req.id} className="hover:bg-gray-100">
                  <td className="px-6 py-4">
                    <p className="font-medium">{req.documentTypeName}</p>
                    <p className="text-xs text-gray-500 font-mono">
                      {req.documentTypeCode}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-sm">{req.ownerType}</td>
                  <td className="px-6 py-4 text-center">
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${req.required ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"}`}
                    >
                      {req.required ? "Oui" : "Non"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() =>
                        req.active
                          ? deactivateMutation.mutate(req.id)
                          : activateMutation.mutate(req.id)
                      }
                      className={
                        req.active ? "text-green-600" : "text-gray-400"
                      }
                    >
                      <Power size={16} />
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => {
                          setSelectedReq(req);
                          setIsDetailOpen(true);
                        }}
                        className="p-1 text-blue-600"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => {
                          setEditing(req);
                          setIsFormOpen(true);
                        }}
                        className="px-2 py-1 text-xs border rounded"
                      >
                        Modifier
                      </button>
                      <button
                        onClick={() =>
                          confirm("Supprimer cette exigence ?") &&
                          deleteMutation.mutate(req.id)
                        }
                        className="p-1 text-red-600"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {selectedReq && (
        <DocumentRequirementDetailModal
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
          requirement={selectedReq}
        />
      )}
      {isFormOpen && (
        <ModalPortal onClose={() => setIsFormOpen(false)} size="lg">
          <div className="sticky top-0 bg-white border-b p-5 flex justify-between items-center rounded-t-2xl">
            <h3 className="text-xl font-bold">
              {editing ? "Modifier" : "Créer"} une exigence
            </h3>
            <button onClick={() => setIsFormOpen(false)}>
              <X size={22} />
            </button>
          </div>
          <div className="p-6 space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
                {error}
              </div>
            )}
            <select
              value={form.ownerType}
              onChange={(e) =>
                setForm({
                  ...form,
                  ownerType: e.target.value as DocumentOwnerType,
                })
              }
              className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-white"
            >
              {ownerTypes.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
            <select
              value={form.documentTypeCode}
              onChange={(e) =>
                setForm({ ...form, documentTypeCode: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-white"
            >
              <option value="">Type de document</option>
              {(documentTypes as DocumentType[]).map((dt) => (
                <option key={dt.code} value={dt.code}>
                  {dt.name} · {dt.code}
                </option>
              ))}
            </select>
            <div className="flex gap-6 text-sm">
              <label>
                <input
                  type="checkbox"
                  checked={form.required}
                  onChange={(e) =>
                    setForm({ ...form, required: e.target.checked })
                  }
                />{" "}
                Obligatoire
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) =>
                    setForm({ ...form, active: e.target.checked })
                  }
                />{" "}
                Actif
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t">
              <button
                onClick={() => setIsFormOpen(false)}
                className="px-4 py-2 border border-gray-200 rounded-xl"
              >
                Annuler
              </button>
              <button
                onClick={submit}
                disabled={
                  !form.documentTypeCode ||
                  createMutation.isPending ||
                  updateMutation.isPending
                }
                className="px-4 py-2 bg-primary-600 text-white rounded-lg disabled:opacity-50"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
};
