import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LifeBuoy, UserRound } from "lucide-react";
import { AdminLayout } from "../../components/layout/AdminLayout";
import { brandVars } from "../../components/layout/adminTheme";
import { operationsService } from "../../services/operations.service";
import type {
  TicketPriority,
  TicketCategory,
} from "../../services/operations.service";
import { RichTextEditor } from "../../components/ui/RichTextEditor";
import { apiClient } from "../../services/api";
import { ActionButton, Field, PageHeader, Section } from "../../components/subscription/kit";
import { FIELD, FOCUS, PINK_SOFT, apiMessage } from "../../components/subscription/kitUtils";
import { Dots, Toaster } from "../../components/ui/Toaster";
import { toast } from "../../components/ui/toastStore";
import { Avatar, PillChoice } from "../../components/operations/opsKit";
import { OWNER_TYPE_LABELS, PRIORITY_STYLE, TICKET_CATEGORY } from "../../components/operations/opsLabels";

const priorityOptions = (Object.keys(PRIORITY_STYLE) as TicketPriority[]).map((p) => ({
  value: p,
  label: PRIORITY_STYLE[p].label,
}));
const categoryOptions = (["BILLING", "BOOKING", "ACCESS", "TECHNICAL", "OTHER"] as TicketCategory[]).map((c) => ({
  value: c,
  label: TICKET_CATEGORY[c],
}));

export const TicketCreatePage: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

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
      toast.success("Ticket créé");
      navigate(`/operations/support/${data.ticketNumber}`);
    },
    onError: (e: any) => toast.error(apiMessage(e, "Erreur création ticket")),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.description) return;
    createMutation.mutate();
  };

  return (
    <AdminLayout>
      <div style={brandVars}>
        <Toaster />
        <div className="mx-auto w-full max-w-4xl">
          <PageHeader
            title="Nouveau ticket support"
            subtitle="Créez un ticket pour suivre une demande ou un incident"
            onBack={() => navigate("/operations")}
          />

          <form onSubmit={handleSubmit} className="space-y-5">
            <Section title="La demande" description="Ce que le client rencontre" icon={LifeBuoy}>
              <div className="space-y-4">
                <Field label="Titre" required>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData((f) => ({ ...f, title: e.target.value }))}
                    placeholder="Ex : problème de connexion WiFi"
                    className={FIELD}
                  />
                </Field>
                <div>
                  <p className="mb-1.5 text-xs font-semibold text-gray-600">
                    Description<span className="text-[color:var(--logo-pink-dark)]"> *</span>
                  </p>
                  <RichTextEditor
                    value={formData.description}
                    onChange={(val) => setFormData((f) => ({ ...f, description: val }))}
                    placeholder="Décrivez le problème en détail..."
                  />
                </div>
                <div>
                  <p className="mb-1.5 text-xs font-semibold text-gray-600">Priorité</p>
                  <PillChoice
                    label="Priorité"
                    options={priorityOptions}
                    value={formData.priority}
                    onChange={(priority) => setFormData((f) => ({ ...f, priority }))}
                  />
                </div>
                <div>
                  <p className="mb-1.5 text-xs font-semibold text-gray-600">Catégorie</p>
                  <PillChoice
                    label="Catégorie"
                    options={categoryOptions}
                    value={formData.category}
                    onChange={(category) => setFormData((f) => ({ ...f, category }))}
                  />
                </div>
              </div>
            </Section>

            <Section title="Propriétaire et contact" description="Facultatif : relie le ticket à un membre, un client ou une entreprise" icon={UserRound}>
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Type de propriétaire">
                    <select
                      value={formData.ownerType}
                      onChange={(e) => {
                        setFormData((f) => ({ ...f, ownerType: e.target.value, ownerCode: "" }));
                        setOwnerSearch("");
                      }}
                      className={FIELD}
                    >
                      <option value="">Aucun</option>
                      {Object.entries(OWNER_TYPE_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <div className="relative">
                    <Field label="Rechercher le propriétaire">
                      <input
                        type="text"
                        value={ownerSearch}
                        onChange={(e) => {
                          setOwnerSearch(e.target.value);
                          setShowOwnerResults(true);
                          if (!e.target.value) setFormData((f) => ({ ...f, ownerCode: "" }));
                        }}
                        onFocus={() => setShowOwnerResults(true)}
                        placeholder={
                          formData.ownerType
                            ? `Nom du ${(OWNER_TYPE_LABELS[formData.ownerType] || "propriétaire").toLowerCase()}`
                            : "Choisissez d'abord un type"
                        }
                        disabled={!formData.ownerType}
                        className={FIELD}
                      />
                    </Field>
                    {ownerLoading && (
                      <span className="absolute right-4 top-[2.45rem] text-gray-400">
                        <Dots />
                      </span>
                    )}
                    {showOwnerResults && ownerResults.length > 0 && (
                      <ul className="absolute z-20 mt-2 max-h-60 w-full overflow-y-auto rounded-2xl bg-white p-1.5 shadow-xl ring-1 ring-black/5">
                        {ownerResults.map((owner: any, i: number) => (
                          <li key={owner.memberId || owner.customerId || owner.code || i}>
                            <button
                              type="button"
                              onClick={() => selectOwner(owner)}
                              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition hover:bg-[color:color-mix(in_srgb,var(--logo-pink)_8%,white)] ${FOCUS}`}
                            >
                              <Avatar size="sm" name={owner.fullName || owner.displayName || owner.name || "?"} />
                              <span className="min-w-0">
                                <span className="block truncate text-sm font-semibold text-gray-900">
                                  {owner.fullName || owner.displayName || owner.name}
                                </span>
                                <span className="block truncate text-xs text-gray-500">
                                  {owner.memberId || owner.customerId || owner.code}
                                  {owner.email ? ` · ${owner.email}` : ""}
                                </span>
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                {formData.ownerCode && (
                  <div className={`flex items-center gap-3 rounded-2xl p-3 ${PINK_SOFT}`}>
                    <Avatar name={formData.contactName || formData.ownerCode} />
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-gray-950">
                        {formData.contactName || formData.ownerCode}
                      </p>
                      {formData.contactEmail && (
                        <p className="truncate text-sm text-gray-600">
                          {formData.contactEmail}
                          {formData.contactPhone ? ` · ${formData.contactPhone}` : ""}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <Field label="Contact">
                    <input
                      type="text"
                      value={formData.contactName}
                      onChange={(e) => setFormData((f) => ({ ...f, contactName: e.target.value }))}
                      placeholder="Nom"
                      className={FIELD}
                    />
                  </Field>
                  <Field label="Email">
                    <input
                      type="email"
                      value={formData.contactEmail}
                      onChange={(e) => setFormData((f) => ({ ...f, contactEmail: e.target.value }))}
                      className={FIELD}
                    />
                  </Field>
                  <Field label="Téléphone">
                    <input
                      type="tel"
                      value={formData.contactPhone}
                      onChange={(e) => setFormData((f) => ({ ...f, contactPhone: e.target.value }))}
                      className={FIELD}
                    />
                  </Field>
                </div>
              </div>
            </Section>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <ActionButton variant="ghost" onClick={() => navigate("/operations")} disabled={createMutation.isPending}>
                Annuler
              </ActionButton>
              <ActionButton
                type="submit"
                pending={createMutation.isPending}
                disabled={!formData.title || !formData.description}
              >
                Créer le ticket
              </ActionButton>
            </div>
          </form>
        </div>
      </div>
    </AdminLayout>
  );
};
