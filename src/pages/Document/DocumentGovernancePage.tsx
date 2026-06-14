import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Tag, ShieldCheck, Loader2 } from "lucide-react";
import { documentService } from "../../services/document.service";
import type {
  DocumentRetentionAction,
  DocumentRetentionReference,
} from "../../services/document.service";

const spaces = [
  "KYC_SPACE",
  "CONTRACT_SPACE",
  "FINANCIAL_SPACE",
  "ASSET_SPACE",
  "ADMINISTRATIVE",
  "GENERIC",
];
const categories = ["KYC", "LEGAL", "SYSTEM", "FINANCIAL", "ASSET", "OTHER"];

export const DocumentGovernancePage: React.FC = () => {
  const queryClient = useQueryClient();
  const [tagForm, setTagForm] = useState({
    code: "",
    name: "",
    color: "#f97316",
    space: "KYC_SPACE",
  });
  const [policyForm, setPolicyForm] = useState({
    code: "",
    name: "",
    space: "KYC_SPACE",
    category: "",
    documentTypeCode: "",
    retentionDays: 365,
    retentionReference: "UPLOAD_DATE" as DocumentRetentionReference,
    action: "ARCHIVE" as DocumentRetentionAction,
    active: true,
  });
  const [error, setError] = useState<string | null>(null);

  const { data: tags = [], isLoading: tagsLoading } = useQuery({
    queryKey: ["document-tags"],
    queryFn: () => documentService.getDocumentTags(),
  });
  const { data: policies = [], isLoading: policiesLoading } = useQuery({
    queryKey: ["document-retention-policies"],
    queryFn: () => documentService.getRetentionPolicies(),
  });

  const createTag = useMutation({
    mutationFn: () => documentService.createDocumentTag(tagForm),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document-tags"] });
      setTagForm({ code: "", name: "", color: "#f97316", space: "KYC_SPACE" });
      setError(null);
    },
    onError: (e: any) =>
      setError(e?.response?.data?.message || "Erreur création tag"),
  });
  const deleteTag = useMutation({
    mutationFn: (code: string) => documentService.deleteDocumentTag(code),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["document-tags"] }),
  });
  const createPolicy = useMutation({
    mutationFn: () =>
      documentService.createRetentionPolicy({
        ...policyForm,
        category: policyForm.category || undefined,
        documentTypeCode: policyForm.documentTypeCode || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["document-retention-policies"],
      });
      setPolicyForm({
        code: "",
        name: "",
        space: "KYC_SPACE",
        category: "",
        documentTypeCode: "",
        retentionDays: 365,
        retentionReference: "UPLOAD_DATE",
        action: "ARCHIVE",
        active: true,
      });
      setError(null);
    },
    onError: (e: any) =>
      setError(e?.response?.data?.message || "Erreur création politique"),
  });
  const deletePolicy = useMutation({
    mutationFn: (code: string) => documentService.deleteRetentionPolicy(code),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["document-retention-policies"],
      }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">
          Gouvernance documentaire
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Tags, métadonnées et politiques de rétention.
        </p>
      </div>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-5 space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Tag size={17} /> Tags documentaires
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <input
              value={tagForm.code}
              onChange={(e) =>
                setTagForm({ ...tagForm, code: e.target.value.toUpperCase() })
              }
              placeholder="Code"
              className="px-3 py-2 border rounded-lg"
            />
            <input
              value={tagForm.name}
              onChange={(e) => setTagForm({ ...tagForm, name: e.target.value })}
              placeholder="Nom"
              className="px-3 py-2 border rounded-lg"
            />
            <input
              value={tagForm.color}
              onChange={(e) =>
                setTagForm({ ...tagForm, color: e.target.value })
              }
              placeholder="#f97316"
              className="px-3 py-2 border rounded-lg"
            />
            <select
              value={tagForm.space}
              onChange={(e) =>
                setTagForm({ ...tagForm, space: e.target.value })
              }
              className="px-3 py-2 border rounded-lg bg-white"
            >
              {spaces.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <button
              onClick={() => createTag.mutate()}
              disabled={!tagForm.code || !tagForm.name || createTag.isPending}
              className="md:col-span-4 px-4 py-2 bg-primary-600 text-white rounded-lg disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Plus size={16} /> Créer le tag
            </button>
          </div>
          {tagsLoading ? (
            <Loader2 className="animate-spin" />
          ) : (
            <div className="divide-y border rounded-lg">
              {tags.map((tag) => (
                <div key={tag.code} className="p-3 flex justify-between">
                  <div>
                    <p className="font-medium">{tag.name}</p>
                    <p className="text-xs text-gray-500 font-mono">
                      {tag.code} · {tag.space}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteTag.mutate(tag.code)}
                    className="text-red-600"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5 space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <ShieldCheck size={17} /> Politiques de rétention
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <input
              value={policyForm.code}
              onChange={(e) =>
                setPolicyForm({
                  ...policyForm,
                  code: e.target.value.toUpperCase(),
                })
              }
              placeholder="Code"
              className="px-3 py-2 border rounded-lg"
            />
            <input
              value={policyForm.name}
              onChange={(e) =>
                setPolicyForm({ ...policyForm, name: e.target.value })
              }
              placeholder="Nom"
              className="px-3 py-2 border rounded-lg"
            />
            <select
              value={policyForm.space}
              onChange={(e) =>
                setPolicyForm({ ...policyForm, space: e.target.value })
              }
              className="px-3 py-2 border rounded-lg bg-white"
            >
              {spaces.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <select
              value={policyForm.category}
              onChange={(e) =>
                setPolicyForm({ ...policyForm, category: e.target.value })
              }
              className="px-3 py-2 border rounded-lg bg-white"
            >
              <option value="">Toutes catégories</option>
              {categories.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <input
              value={policyForm.documentTypeCode}
              onChange={(e) =>
                setPolicyForm({
                  ...policyForm,
                  documentTypeCode: e.target.value,
                })
              }
              placeholder="Type document optionnel"
              className="px-3 py-2 border rounded-lg"
            />
            <input
              type="number"
              value={policyForm.retentionDays}
              onChange={(e) =>
                setPolicyForm({
                  ...policyForm,
                  retentionDays: Number(e.target.value) || 0,
                })
              }
              placeholder="Jours"
              className="px-3 py-2 border rounded-lg"
            />
            <select
              value={policyForm.retentionReference}
              onChange={(e) =>
                setPolicyForm({
                  ...policyForm,
                  retentionReference: e.target
                    .value as DocumentRetentionReference,
                })
              }
              className="px-3 py-2 border rounded-lg bg-white"
            >
              <option value="UPLOAD_DATE">Date upload</option>
              <option value="EXPIRY_DATE">Date expiration</option>
            </select>
            <select
              value={policyForm.action}
              onChange={(e) =>
                setPolicyForm({
                  ...policyForm,
                  action: e.target.value as DocumentRetentionAction,
                })
              }
              className="px-3 py-2 border rounded-lg bg-white"
            >
              <option value="ARCHIVE">Archiver</option>
              <option value="PURGE_FLAG">Marquer purge</option>
            </select>
            <button
              onClick={() => createPolicy.mutate()}
              disabled={
                !policyForm.code || !policyForm.name || createPolicy.isPending
              }
              className="md:col-span-2 px-4 py-2 bg-primary-600 text-white rounded-lg disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Plus size={16} /> Créer la politique
            </button>
          </div>
          {policiesLoading ? (
            <Loader2 className="animate-spin" />
          ) : (
            <div className="divide-y border rounded-lg">
              {policies.map((p) => (
                <div key={p.code} className="p-3 flex justify-between">
                  <div>
                    <p className="font-medium">{p.name}</p>
                    <p className="text-xs text-gray-500 font-mono">
                      {p.code} · {p.space} · {p.retentionDays}j · {p.action}
                    </p>
                  </div>
                  <button
                    onClick={() => deletePolicy.mutate(p.code)}
                    className="text-red-600"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
