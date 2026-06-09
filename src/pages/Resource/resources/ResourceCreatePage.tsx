import React, { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { AdminLayout } from "../../../components/layout/AdminLayout";
import { resourceService } from "../../../services/resource.service";
import type {
  ResourceResponse,
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

const toNumberOrUndefined = (value: string): number | undefined => {
  if (!value) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
};

const getEntityId = (entity: any): string => {
  const value =
    entity?.id ?? entity?.typeId ?? entity?.groupId ?? entity?.policyId;
  return value !== undefined && value !== null ? String(value) : "";
};

export const ResourceCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const { code } = useParams<{ code?: string }>();
  const isEdit = Boolean(code);
  const queryClient = useQueryClient();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: resource, isLoading: resourceLoading } = useQuery({
    queryKey: ["resource", code],
    queryFn: () => resourceService.getResource(code!),
    enabled: isEdit,
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

  const initialForm = useMemo(() => {
    const r = resource as ResourceResponse | undefined;
    return {
      name: r?.name || "",
      description: r?.description || "",
      typeId: "",
      groupId: "",
      policyId: "",
      capacity: r?.capacity ?? 1,
      zone: r?.zone || "",
      locationLabel: r?.locationLabel || "",
      status: r?.status || "ACTIVE",
      bookingEnabled: r?.bookingEnabled ?? true,
      portalVisible: r?.portalVisible ?? true,
      active: r?.active ?? true,
      displayOrder: r?.displayOrder ?? 0,
    };
  }, [resource]);

  const [formData, setFormData] = useState(initialForm);

  React.useEffect(() => {
    if (resource) setFormData(initialForm);
  }, [resource, initialForm]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const typeId = toNumberOrUndefined(formData.typeId);
      if (!typeId)
        throw new Error(
          "Le type de ressource est obligatoire. Vérifie que la liste des types expose un identifiant numérique.",
        );
      await resourceService.createResource({
        typeId,
        groupId: toNumberOrUndefined(formData.groupId),
        policyId: toNumberOrUndefined(formData.policyId),
        name: formData.name,
        description: formData.description || undefined,
        capacity: formData.capacity,
        zone: formData.zone || undefined,
        locationLabel: formData.locationLabel || undefined,
        status: formData.status as ResourceStatus,
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
        error?.response?.data?.message ||
          error?.message ||
          "Erreur lors de la création.",
      ),
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!code) return;
      await resourceService.updateResource(code, {
        name: formData.name,
        description: formData.description || undefined,
        capacity: formData.capacity,
        zone: formData.zone || undefined,
        locationLabel: formData.locationLabel || undefined,
        bookingEnabled: formData.bookingEnabled,
        portalVisible: formData.portalVisible,
      });

      const typeId = toNumberOrUndefined(formData.typeId);
      const groupId = toNumberOrUndefined(formData.groupId);
      const policyId = toNumberOrUndefined(formData.policyId);
      if (typeId || groupId || policyId) {
        if (!typeId)
          throw new Error(
            "Le type est requis pour modifier la classification.",
          );
        await resourceService.updateResourceClassification(code, {
          typeId,
          groupId,
          policyId,
        });
      }

      await resourceService.updateResourceStatus(
        code,
        formData.status as ResourceStatus,
      );
      await resourceService.updateResourceActive(code, formData.active);
      await resourceService.updateResourceDisplayOrder(
        code,
        formData.displayOrder,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resources"] });
      queryClient.invalidateQueries({ queryKey: ["resource", code] });
      navigate("/resources");
    },
    onError: (error: any) =>
      setErrorMessage(
        error?.response?.data?.message ||
          error?.message ||
          "Erreur lors de la modification.",
      ),
  });

  const isLoading =
    resourceLoading || typesLoading || groupsLoading || policiesLoading;
  const isPending = createMutation.isPending || updateMutation.isPending;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!formData.name.trim())
      return setErrorMessage("Le nom est obligatoire.");
    if (formData.capacity < 1)
      return setErrorMessage("La capacité doit être supérieure à 0.");
    if (isEdit) updateMutation.mutate();
    else createMutation.mutate();
  };

  return (
    <AdminLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <button
            onClick={() => navigate("/resources")}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-2"
          >
            <ArrowLeft size={16} /> Retour aux ressources
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? "Modifier la ressource" : "Créer une ressource"}
          </h1>
          <p className="text-gray-600 mt-1">
            Renseignez les informations générales, la classification et les
            règles d’affichage.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-xl p-10 text-center">
          <Loader2
            className="animate-spin mx-auto text-primary-600"
            size={28}
          />
          <p className="text-sm text-gray-500 mt-3">Chargement...</p>
        </div>
      ) : (
        <form
          onSubmit={submit}
          className="bg-white rounded-xl shadow-sm p-6 space-y-8 max-w-5xl"
        >
          {errorMessage && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {errorMessage}
            </div>
          )}

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Informations générales
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium mb-1">Nom *</label>
                <input
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Capacité *
                </label>
                <input
                  type="number"
                  min={1}
                  value={formData.capacity}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      capacity: Number(e.target.value) || 1,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                />
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Classification
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <label className="block text-sm font-medium mb-1">Type *</label>
                <select
                  value={formData.typeId}
                  onChange={(e) =>
                    setFormData({ ...formData, typeId: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white"
                  required={!isEdit}
                >
                  <option value="">Sélectionner</option>
                  {types.map((type: any) => (
                    <option key={type.code} value={getEntityId(type)}>
                      {type.name} ({type.code})
                    </option>
                  ))}
                </select>
                {isEdit && (
                  <p className="text-xs text-gray-400 mt-1">
                    Type actuel : {resource?.typeCode || "—"}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Groupe</label>
                <select
                  value={formData.groupId}
                  onChange={(e) =>
                    setFormData({ ...formData, groupId: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white"
                >
                  <option value="">Aucun</option>
                  {groups.map((group: any) => (
                    <option key={group.code} value={getEntityId(group)}>
                      {group.name} ({group.code})
                    </option>
                  ))}
                </select>
                {isEdit && (
                  <p className="text-xs text-gray-400 mt-1">
                    Groupe actuel : {resource?.groupCode || "—"}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Politique
                </label>
                <select
                  value={formData.policyId}
                  onChange={(e) =>
                    setFormData({ ...formData, policyId: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white"
                >
                  <option value="">Aucune</option>
                  {policies.map((policy: any) => (
                    <option key={policy.code} value={getEntityId(policy)}>
                      {policy.name} ({policy.code})
                    </option>
                  ))}
                </select>
                {isEdit && (
                  <p className="text-xs text-gray-400 mt-1">
                    Politique actuelle : {resource?.policyCode || "—"}
                  </p>
                )}
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Localisation
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium mb-1">Zone</label>
                <input
                  value={formData.zone}
                  onChange={(e) =>
                    setFormData({ ...formData, zone: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Libellé emplacement
                </label>
                <input
                  value={formData.locationLabel}
                  onChange={(e) =>
                    setFormData({ ...formData, locationLabel: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                />
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Statut et visibilité
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
              <div>
                <label className="block text-sm font-medium mb-1">Statut</label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      status: e.target.value as ResourceStatus,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white"
                >
                  {statusOptions.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Ordre d’affichage
                </label>
                <input
                  type="number"
                  value={formData.displayOrder}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      displayOrder: Number(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                />
              </div>
              <label className="flex items-center gap-2 mt-7">
                <input
                  type="checkbox"
                  checked={formData.bookingEnabled}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      bookingEnabled: e.target.checked,
                    })
                  }
                />
                <span className="text-sm">Réservable</span>
              </label>
              <label className="flex items-center gap-2 mt-7">
                <input
                  type="checkbox"
                  checked={formData.portalVisible}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      portalVisible: e.target.checked,
                    })
                  }
                />
                <span className="text-sm">Visible portail</span>
              </label>
            </div>
            <label className="flex items-center gap-2 mt-5">
              <input
                type="checkbox"
                checked={formData.active}
                onChange={(e) =>
                  setFormData({ ...formData, active: e.target.checked })
                }
              />
              <span className="text-sm">Actif</span>
            </label>
          </section>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={() => navigate("/resources")}
              className="px-5 py-2 border rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-5 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
            >
              {isPending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Save size={16} />
              )}
              {isEdit ? "Mettre à jour" : "Créer la ressource"}
            </button>
          </div>
        </form>
      )}
    </AdminLayout>
  );
};
