import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, User } from "lucide-react";
import { AdminLayout } from "../../components/layout/AdminLayout";
import { operationsService } from "../../services/operations.service";
import type {
  TicketPriority,
  TicketCategory,
} from "../../services/operations.service";
import { RichTextEditor } from "../../components/ui/RichTextEditor";
import { apiClient } from "../../services/api";

const priorityConfig: Record<TicketPriority, { label: string; color: string }> =
  {
    LOW: { label: "Faible", color: "bg-gray-100 text-gray-600" },
    MEDIUM: { label: "Moyen", color: "bg-blue-100 text-blue-700" },
    HIGH: { label: "Élevé", color: "bg-orange-100 text-orange-700" },
    URGENT: { label: "Urgent", color: "bg-red-100 text-red-700" },
  };

const categories: TicketCategory[] = [
  "BILLING",
  "BOOKING",
  "ACCESS",
  "TECHNICAL",
  "OTHER",
];
const categoryLabels: Record<TicketCategory, string> = {
  BILLING: "Facturation",
  BOOKING: "Réservation",
  ACCESS: "Accès",
  TECHNICAL: "Technique",
  OTHER: "Autre",
};

const ownerTypeLabels: Record<string, string> = {
  MEMBER: "Membre",
  CUSTOMER: "Customer",
  BUSINESS_ENTITY: "Entreprise",
};

export const TicketCreatePage: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [actionError, setActionError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "MEDIUM" as TicketPriority,
    category: "OTHER" as TicketCategory,
    ownerType: "",
    ownerCode: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    relatedType: "",
    relatedCode: "",
  });

  const [ownerSearch, setOwnerSearch] = useState("");
  const [ownerResults, setOwnerResults] = useState<any[]>([]);
  const [showOwnerResults, setShowOwnerResults] = useState(false);
  const [ownerLoading, setOwnerLoading] = useState(false);

  useEffect(() => {
    if (!ownerSearch || !formData.ownerType || ownerSearch.length < 2) {
      setOwnerResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setOwnerLoading(true);
      try {
        let endpoint = "";
        if (formData.ownerType === "MEMBER")
          endpoint = "/sni/api/v1/members/search/by-name";
        else if (formData.ownerType === "CUSTOMER")
          endpoint = "/sni/api/v1/customers/search/by-name";
        else if (formData.ownerType === "BUSINESS_ENTITY")
          endpoint = "/sni/api/v1/business-entities/search/by-name";

        if (endpoint) {
          const response = await apiClient.get(endpoint, {
            params: { query: ownerSearch, size: 10 },
          });
          const data = Array.isArray(response.data?.content)
            ? response.data.content
            : Array.isArray(response.data?.data)
              ? response.data.data
              : Array.isArray(response.data)
                ? response.data
                : [];
          setOwnerResults(data);
        }
      } catch {
        setOwnerResults([]);
      } finally {
        setOwnerLoading(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [ownerSearch, formData.ownerType]);

  const selectOwner = (owner: any) => {
    const code = owner.memberId || owner.customerId || owner.code || "";
    const name = owner.fullName || owner.displayName || owner.name || "";
    const email = owner.email || "";
    const phone = owner.phone || "";

    setFormData((f) => ({
      ...f,
      ownerCode: code,
      contactName: name,
      contactEmail: email,
      contactPhone: phone,
    }));
    setOwnerSearch(name);
    setShowOwnerResults(false);
  };

  const createMutation = useMutation({
    mutationFn: () => operationsService.createTicket(formData),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["support-metrics"] });
      navigate(`/operations/support/${data.ticketNumber}`);
    },
    onError: (e: any) =>
      setActionError(e?.response?.data?.message || "Erreur création ticket"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.description) return;
    createMutation.mutate();
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <button
          onClick={() => navigate("/operations")}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft size={18} />
          Retour
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm max-w-3xl w-full">
        <div className="border-b px-4 py-3 sm:px-6 sm:py-4">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900">
            Nouveau ticket support
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Créez un ticket pour suivre une demande ou un incident
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5">
          {actionError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
              {actionError}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Titre *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) =>
                setFormData((f) => ({ ...f, title: e.target.value }))
              }
              placeholder="Ex: Problème de connexion WiFi"
              className="w-full px-3 py-2 ring-1 ring-gray-100 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description *
            </label>
            <RichTextEditor
              value={formData.description}
              onChange={(val) =>
                setFormData((f) => ({ ...f, description: val }))
              }
              placeholder="Décrivez le problème en détail..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priorité
              </label>
              <select
                value={formData.priority}
                onChange={(e) =>
                  setFormData((f) => ({
                    ...f,
                    priority: e.target.value as TicketPriority,
                  }))
                }
                className="w-full px-3 py-2 ring-1 ring-gray-100 rounded-lg bg-white"
              >
                {(Object.keys(priorityConfig) as TicketPriority[]).map((p) => (
                  <option key={p} value={p}>
                    {priorityConfig[p].label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Catégorie
              </label>
              <select
                value={formData.category}
                onChange={(e) =>
                  setFormData((f) => ({
                    ...f,
                    category: e.target.value as TicketCategory,
                  }))
                }
                className="w-full px-3 py-2 ring-1 ring-gray-100 rounded-lg bg-white"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {categoryLabels[c]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type propriétaire
              </label>
              <select
                value={formData.ownerType}
                onChange={(e) => {
                  setFormData((f) => ({
                    ...f,
                    ownerType: e.target.value,
                    ownerCode: "",
                  }));
                  setOwnerSearch("");
                }}
                className="w-full px-3 py-2 ring-1 ring-gray-100 rounded-lg bg-white"
              >
                <option value="">Aucun</option>
                <option value="MEMBER">Membre</option>
                <option value="CUSTOMER">Customer</option>
                <option value="BUSINESS_ENTITY">Entreprise</option>
              </select>
            </div>
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rechercher propriétaire
              </label>
              <input
                type="text"
                value={ownerSearch}
                onChange={(e) => {
                  setOwnerSearch(e.target.value);
                  setShowOwnerResults(true);
                  if (!e.target.value)
                    setFormData((f) => ({ ...f, ownerCode: "" }));
                }}
                onFocus={() => setShowOwnerResults(true)}
                placeholder={
                  formData.ownerType
                    ? `Rechercher un ${ownerTypeLabels[formData.ownerType] || "propriétaire"}...`
                    : "Sélectionnez un type"
                }
                disabled={!formData.ownerType}
                className="w-full px-3 py-2 ring-1 ring-gray-100 rounded-lg disabled:bg-gray-100"
              />
              {ownerLoading && (
                <div className="absolute right-3 top-9">
                  <Loader2 size={14} className="animate-spin text-gray-400" />
                </div>
              )}
              {showOwnerResults && ownerResults.length > 0 && (
                <div className="absolute z-10 mt-1 w-full bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {ownerResults.map((owner: any) => (
                    <button
                      key={
                        owner.memberId ||
                        owner.customerId ||
                        owner.code ||
                        Math.random()
                      }
                      type="button"
                      onClick={() => selectOwner(owner)}
                      className="w-full px-3 py-2 text-left hover:bg-gray-50 border-b last:border-0"
                    >
                      <p className="text-sm font-medium">
                        {owner.fullName || owner.displayName || owner.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {owner.memberId || owner.customerId || owner.code}
                        {owner.email ? ` · ${owner.email}` : ""}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {formData.ownerCode && (
            <div className="p-3 bg-blue-50 rounded-lg flex items-center gap-3">
              <User size={18} className="text-blue-600" />
              <div>
                <p className="font-medium text-blue-800">
                  {formData.contactName || formData.ownerCode}
                </p>
                {formData.contactEmail && (
                  <p className="text-sm text-blue-600">
                    {formData.contactEmail}
                    {formData.contactPhone ? ` · ${formData.contactPhone}` : ""}
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contact
              </label>
              <input
                type="text"
                value={formData.contactName}
                onChange={(e) =>
                  setFormData((f) => ({ ...f, contactName: e.target.value }))
                }
                placeholder="Nom"
                className="w-full px-3 py-2 ring-1 ring-gray-100 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={formData.contactEmail}
                onChange={(e) =>
                  setFormData((f) => ({ ...f, contactEmail: e.target.value }))
                }
                className="w-full px-3 py-2 ring-1 ring-gray-100 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Téléphone
              </label>
              <input
                type="tel"
                value={formData.contactPhone}
                onChange={(e) =>
                  setFormData((f) => ({ ...f, contactPhone: e.target.value }))
                }
                className="w-full px-3 py-2 ring-1 ring-gray-100 rounded-lg"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t">
            <button
              type="button"
              onClick={() => navigate("/operations")}
              className="px-6 py-2 ring-1 ring-gray-100 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={
                !formData.title ||
                !formData.description ||
                createMutation.isPending
              }
              className="flex-1 bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {createMutation.isPending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                "Créer le ticket"
              )}
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
};
