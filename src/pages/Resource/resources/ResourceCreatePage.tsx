import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Save, Building2, Settings, Eye, MapPin } from "lucide-react";
import { AdminLayout } from "../../../components/layout/AdminLayout";
import { resourceService } from "../../../services/resource.service";
import type {
  ResourceStatus,
  ResourceTypeResponse,
  ResourceGroupResponse,
  ResourcePolicyResponse,
} from "../../../services/resource.service";

const statusOptions: { value: ResourceStatus; label: string }[] = [
  { value: "ACTIVE", label: "Actif" },
  { value: "INACTIVE", label: "Inactif" },
  { value: "MAINTENANCE", label: "Maintenance" },
  { value: "OUT_OF_SERVICE", label: "Hors service" },
  { value: "ARCHIVED", label: "Archivé" },
];

const getEntityId = (entity: any): string => {
  const value = entity?.id ?? entity?.typeId ?? entity?.groupId ?? entity?.policyId;
  return value !== undefined && value !== null ? String(value) : "";
};

const toNumberOrUndefined = (value: string): number | undefined => {
  if (!value) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
};

export const ResourceCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    typeId: "",
    groupId: "",
    policyId: "",
    capacity: 1,
    zone: "",
    locationLabel: "",
    status: "ACTIVE" as ResourceStatus,
    bookingEnabled: true,
    portalVisible: true,
  });

  const { data: typesData, isLoading: typesLoading } = useQuery({
    queryKey: ["resource-types-list"],
    queryFn: () => resourceService.getResourceTypes({ size: 500 }),
  });

  const { data: groupsData, isLoading: groupsLoading } = useQuery({
    queryKey: ["resource-groups-list"],
    queryFn: () => resourceService.getResourceGroups(),
  });

  const { data: policiesData, isLoading: policiesLoading } = useQuery({
    queryKey: ["resource-policies-list"],
    queryFn: () => resourceService.getResourcePolicies({ size: 500 }),
  });

  const types: ResourceTypeResponse[] = typesData?.content || [];
  const groups: ResourceGroupResponse[] = groupsData?.content || [];
  const policies: ResourcePolicyResponse[] = policiesData?.content || [];

  const isLoading = typesLoading || groupsLoading || policiesLoading;

  const selectedTypeName = useMemo(
    () => types.find((t) => getEntityId(t) === formData.typeId)?.name,
    [types, formData.typeId],
  );

  const createMutation = useMutation({
    mutationFn: async () => {
      const typeId = toNumberOrUndefined(formData.typeId);
      if (!typeId) throw new Error("Le type de ressource est obligatoire.");

      await resourceService.createResource({
        typeId,
        groupId: toNumberOrUndefined(formData.groupId),
        policyId: toNumberOrUndefined(formData.policyId),
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        capacity: formData.capacity,
        zone: formData.zone.trim() || undefined,
        locationLabel: formData.locationLabel.trim() || undefined,
        status: formData.status,
        bookingEnabled: formData.bookingEnabled,
        portalVisible: formData.portalVisible,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resources"] });
      navigate("/resources");
    },
    onError: (error: any) =>
      setErrorMessage(
        error?.response?.data?.message || error?.message || "Erreur lors de la création.",
      ),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!formData.name.trim()) return setErrorMessage("Le nom est obligatoire.");
    if (formData.capacity < 1) return setErrorMessage("La capacité doit être supérieure à 0.");
    createMutation.mutate();
  };

  return (
    <AdminLayout>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <button
            onClick={() => navigate("/resources")}
            className="mb-4 flex items-center gap-2 text-sm text-gray-500 transition-colors hover:text-gray-800"
          >
            <ArrowLeft size={16} />
            Retour aux ressources
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Créer une ressource</h1>
          <p className="mt-1 text-gray-600">
            Renseignez les informations générales, la classification et les règles d’affichage.
          </p>
        </div>
        <button
          type="submit"
          form="resource-create-form"
          disabled={createMutation.isPending || isLoading}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
        >
          {createMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Enregistrer
        </button>
      </div>

      {errorMessage && (
        <div className="mb-6 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      {isLoading ? (
        <div className="rounded-2xl bg-white p-12 text-center shadow-sm ring-1 ring-gray-100">
          <Loader2 size={28} className="mx-auto mb-3 animate-spin text-primary-600" />
          <p className="text-sm text-gray-500">Chargement des référentiels...</p>
        </div>
      ) : (
        <form id="resource-create-form" onSubmit={submit} className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <div className="space-y-6">
            <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
              <div className="mb-5 flex items-center gap-3">
                <div className="rounded-xl bg-primary-50 p-2 text-primary-600"><Building2 size={18} /></div>
                <div>
                  <h2 className="font-semibold text-gray-900">Informations générales</h2>
                  <p className="text-sm text-gray-500">Nom, description et capacité d’accueil.</p>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Nom *</label>
                  <input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                    placeholder="Ex. Salle de réunion principale"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Capacité *</label>
                  <input
                    type="number"
                    min={1}
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) || 1 })}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Statut</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as ResourceStatus })}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                  >
                    {statusOptions.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
              </div>
            </section>

            <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
              <div className="mb-5 flex items-center gap-3">
                <div className="rounded-xl bg-blue-50 p-2 text-blue-600"><Settings size={18} /></div>
                <div>
                  <h2 className="font-semibold text-gray-900">Classification</h2>
                  <p className="text-sm text-gray-500">Type, groupe et politique de réservation.</p>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Type *</label>
                  <select
                    value={formData.typeId}
                    onChange={(e) => setFormData({ ...formData, typeId: e.target.value })}
                    required
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                  >
                    <option value="">Sélectionner</option>
                    {types.map((type) => <option key={type.code} value={getEntityId(type)}>{type.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Groupe</label>
                  <select
                    value={formData.groupId}
                    onChange={(e) => setFormData({ ...formData, groupId: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                  >
                    <option value="">Aucun</option>
                    {groups.map((group) => <option key={group.code} value={getEntityId(group)}>{group.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Politique</label>
                  <select
                    value={formData.policyId}
                    onChange={(e) => setFormData({ ...formData, policyId: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                  >
                    <option value="">Aucune</option>
                    {policies.map((policy) => <option key={policy.code} value={getEntityId(policy)}>{policy.name}</option>)}
                  </select>
                </div>
              </div>
            </section>

            <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
              <div className="mb-5 flex items-center gap-3">
                <div className="rounded-xl bg-amber-50 p-2 text-amber-600"><MapPin size={18} /></div>
                <div>
                  <h2 className="font-semibold text-gray-900">Localisation</h2>
                  <p className="text-sm text-gray-500">Zone interne et libellé affiché aux utilisateurs.</p>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Zone</label>
                  <input
                    value={formData.zone}
                    onChange={(e) => setFormData({ ...formData, zone: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Libellé emplacement</label>
                  <input
                    value={formData.locationLabel}
                    onChange={(e) => setFormData({ ...formData, locationLabel: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                  />
                </div>
              </div>
            </section>
          </div>

          <aside className="space-y-6">
            <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
              <div className="mb-5 flex items-center gap-3">
                <div className="rounded-xl bg-green-50 p-2 text-green-600"><Eye size={18} /></div>
                <div>
                  <h2 className="font-semibold text-gray-900">Publication</h2>
                  <p className="text-sm text-gray-500">Contrôlez la visibilité et la réservation.</p>
                </div>
              </div>
              <div className="space-y-4">
                <label className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3 text-sm">
                  <span className="font-medium text-gray-700">Réservable</span>
                  <input
                    type="checkbox"
                    checked={formData.bookingEnabled}
                    onChange={(e) => setFormData({ ...formData, bookingEnabled: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-primary-600"
                  />
                </label>
                <label className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3 text-sm">
                  <span className="font-medium text-gray-700">Visible portail</span>
                  <input
                    type="checkbox"
                    checked={formData.portalVisible}
                    onChange={(e) => setFormData({ ...formData, portalVisible: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-primary-600"
                  />
                </label>
              </div>
            </section>

            <section className="rounded-2xl bg-gray-950 p-6 text-white shadow-sm">
              <p className="text-sm text-gray-300">Résumé</p>
              <h3 className="mt-2 text-lg font-semibold">{formData.name || "Nouvelle ressource"}</h3>
              <div className="mt-4 space-y-2 text-sm text-gray-300">
                <p>Type : <span className="text-white">{selectedTypeName || "Non défini"}</span></p>
                <p>Capacité : <span className="text-white">{formData.capacity}</span></p>
                <p>Statut : <span className="text-white">{statusOptions.find((s) => s.value === formData.status)?.label}</span></p>
              </div>
            </section>
          </aside>
        </form>
      )}
    </AdminLayout>
  );
};
