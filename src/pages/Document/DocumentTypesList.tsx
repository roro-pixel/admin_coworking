import React, { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, Plus, Search, FileText, Power, Trash2, X } from "lucide-react";
import { documentService } from "../../services/document.service";
import type {
  DocumentCategory,
  DocumentOwnerType,
  DocumentType,
} from "../../services/document.service";
import { DocumentTypeDetailModal } from "./DocumentTypeDetailModal";
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
const categories: DocumentCategory[] = [
  "KYC",
  "LEGAL",
  "SYSTEM",
  "FINANCIAL",
  "ASSET",
  "OTHER",
];
const defaultForm = {
  code: "",
  name: "",
  category: "KYC" as DocumentCategory,
  ownerType: "MEMBER" as DocumentOwnerType,
  description: "",
  helpText: "",
  documentDetails: "",
  required: true,
  requiresExpiryDate: false,
  requiresReview: true,
  requiresSignature: false,
  multipleAllowed: false,
  allowedMimeTypes: "application/pdf,image/jpeg,image/png",
  maxFileSizeBytes: 10485760,
  active: true,
};

export const DocumentTypesList: React.FC = () => {
  const queryClient = useQueryClient();
  const [ownerType, setOwnerType] = useState<DocumentOwnerType>("MEMBER");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedDoc, setSelectedDoc] = useState<DocumentType | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<DocumentType | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [error, setError] = useState<string | null>(null);

  const { data: documentTypes, isLoading } = useQuery({
    queryKey: ["documentTypes", ownerType],
    queryFn: () => documentService.getDocumentTypes(ownerType),
  });

  useEffect(() => {
    if (!isFormOpen) return;
    if (editing)
      setForm({
        ...defaultForm,
        ...editing,
        description: editing.description || "",
        helpText: editing.helpText || "",
        documentDetails: editing.documentDetails || "",
        requiresSignature: editing.requiresSignature || false,
      });
    else setForm({ ...defaultForm, ownerType });
    setError(null);
  }, [isFormOpen, editing, ownerType]);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["documentTypes"] });
  const createMutation = useMutation({
    mutationFn: () => documentService.createDocumentType(form),
    onSuccess: () => {
      invalidate();
      setIsFormOpen(false);
    },
    onError: (e: any) =>
      setError(e?.response?.data?.message || "Erreur création type"),
  });
  const updateMutation = useMutation({
    mutationFn: () => documentService.updateDocumentType(editing!.code, form),
    onSuccess: () => {
      invalidate();
      setIsFormOpen(false);
      setEditing(null);
    },
    onError: (e: any) =>
      setError(e?.response?.data?.message || "Erreur modification type"),
  });
  const activateMutation = useMutation({
    mutationFn: (code: string) => documentService.activateDocumentType(code),
    onSuccess: invalidate,
  });
  const deactivateMutation = useMutation({
    mutationFn: (code: string) => documentService.deactivateDocumentType(code),
    onSuccess: invalidate,
  });
  const deleteMutation = useMutation({
    mutationFn: (code: string) => documentService.deleteDocumentType(code),
    onSuccess: invalidate,
    onError: () =>
      alert("Suppression impossible : le type est probablement utilisé."),
  });

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

  const submit = () =>
    editing ? updateMutation.mutate() : createMutation.mutate();

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">
          Types de documents
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
            <Plus size={18} /> Nouveau type
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
            placeholder="Rechercher un type..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-4 py-2 border border-gray-200 rounded-xl bg-white text-sm"
        >
          <option value="all">Toutes catégories</option>
          {categories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>
      {isLoading ? (
        <div className="py-12 text-center">Chargement...</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50/70">
              <tr>
                <th className="px-4 py-3 text-left text-sm">Type</th>
                <th className="px-4 py-3 text-left text-sm">Catégorie</th>
                <th className="px-4 py-3 text-center text-sm">Contraintes</th>
                <th className="px-4 py-3 text-center text-sm">Actif</th>
                <th className="px-4 py-3 text-right text-sm">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredTypes.map((dt) => (
                <tr key={dt.code}>
                  <td className="px-4 py-3">
                    <p className="font-medium flex items-center gap-2">
                      <FileText size={16} />
                      {dt.name}
                    </p>
                    <p className="text-xs text-gray-500 font-mono">{dt.code}</p>
                  </td>
                  <td className="px-4 py-3 text-sm">{dt.category}</td>
                  <td className="px-4 py-3 text-center text-xs text-gray-500">
                    {dt.required ? "Obligatoire" : "Optionnel"} ·{" "}
                    {dt.requiresReview ? "Revue" : "Sans revue"} ·{" "}
                    {dt.requiresSignature ? "Signature" : ""}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() =>
                        dt.active
                          ? deactivateMutation.mutate(dt.code)
                          : activateMutation.mutate(dt.code)
                      }
                      className={dt.active ? "text-green-600" : "text-gray-400"}
                    >
                      <Power size={16} />
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => {
                          setSelectedDoc(dt);
                          setIsDetailOpen(true);
                        }}
                        className="p-1 text-blue-600"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => {
                          setEditing(dt);
                          setIsFormOpen(true);
                        }}
                        className="px-2 py-1 text-xs border rounded"
                      >
                        Modifier
                      </button>
                      <button
                        onClick={() =>
                          confirm("Supprimer ce type ?") &&
                          deleteMutation.mutate(dt.code)
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
      {selectedDoc && (
        <DocumentTypeDetailModal
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
          documentType={selectedDoc}
        />
      )}
      {isFormOpen && (
        <ModalPortal onClose={() => setIsFormOpen(false)} size="3xl">
          <div className="sticky top-0 bg-white border-b p-5 flex justify-between items-center rounded-t-2xl">
            <h3 className="text-xl font-bold">
              {editing ? "Modifier" : "Créer"} un type de document
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                disabled={!!editing}
                value={form.code}
                onChange={(e) =>
                  setForm({ ...form, code: e.target.value.toUpperCase() })
                }
                placeholder="Code"
                className="px-3 py-2 border border-gray-200 rounded-xl disabled:bg-gray-50"
              />
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Nom"
                className="px-3 py-2 border border-gray-200 rounded-xl"
              />
              <select
                value={form.ownerType}
                onChange={(e) =>
                  setForm({
                    ...form,
                    ownerType: e.target.value as DocumentOwnerType,
                  })
                }
                className="px-3 py-2 border border-gray-200 rounded-xl bg-white"
              >
                {ownerTypes.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
              <select
                value={form.category}
                onChange={(e) =>
                  setForm({
                    ...form,
                    category: e.target.value as DocumentCategory,
                  })
                }
                className="px-3 py-2 border border-gray-200 rounded-xl bg-white"
              >
                {categories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
              <input
                value={form.allowedMimeTypes}
                onChange={(e) =>
                  setForm({ ...form, allowedMimeTypes: e.target.value })
                }
                placeholder="MIME autorisés"
                className="md:col-span-2 px-3 py-2 border border-gray-200 rounded-xl"
              />
              <input
                type="number"
                value={form.maxFileSizeBytes}
                onChange={(e) =>
                  setForm({
                    ...form,
                    maxFileSizeBytes: Number(e.target.value) || 0,
                  })
                }
                placeholder="Taille max"
                className="px-3 py-2 border border-gray-200 rounded-xl"
              />
              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="Description"
                rows={2}
                className="md:col-span-2 px-3 py-2 border border-gray-200 rounded-xl"
              />
              <textarea
                value={form.documentDetails}
                onChange={(e) =>
                  setForm({ ...form, documentDetails: e.target.value })
                }
                placeholder="Détails"
                rows={2}
                className="md:col-span-2 px-3 py-2 border border-gray-200 rounded-xl"
              />
              <textarea
                value={form.helpText}
                onChange={(e) => setForm({ ...form, helpText: e.target.value })}
                placeholder="Aide"
                rows={2}
                className="md:col-span-2 px-3 py-2 border border-gray-200 rounded-xl"
              />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-sm">
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
                  checked={form.requiresExpiryDate}
                  onChange={(e) =>
                    setForm({ ...form, requiresExpiryDate: e.target.checked })
                  }
                />{" "}
                Expiration
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={form.requiresReview}
                  onChange={(e) =>
                    setForm({ ...form, requiresReview: e.target.checked })
                  }
                />{" "}
                Revue
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={form.requiresSignature}
                  onChange={(e) =>
                    setForm({ ...form, requiresSignature: e.target.checked })
                  }
                />{" "}
                Signature
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={form.multipleAllowed}
                  onChange={(e) =>
                    setForm({ ...form, multipleAllowed: e.target.checked })
                  }
                />{" "}
                Multiple
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
                  !form.code ||
                  !form.name ||
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
