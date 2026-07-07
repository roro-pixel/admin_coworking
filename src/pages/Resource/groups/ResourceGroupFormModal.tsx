import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Loader2, Users, Eye, CheckCircle2 } from "lucide-react";
import { resourceService } from "../../../services/resource.service";
import type { ResourceGroupResponse } from "../../../services/resource.service";
import { ModalPortal } from "../../../components/ui/ModalPortal";

interface ResourceGroupFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingGroup: ResourceGroupResponse | null;
  onSuccess: () => void;
}

const buildDefaultFormData = (group: ResourceGroupResponse | null) => ({
  name: group?.name || "",
  description: group?.description || "",
  portalVisible: group?.portalVisible ?? true,
  active: group?.active ?? true,
});

export const ResourceGroupFormModal: React.FC<ResourceGroupFormModalProps> = ({
  isOpen,
  onClose,
  editingGroup,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState(() =>
    buildDefaultFormData(editingGroup),
  );

  useEffect(() => {
    setFormData(buildDefaultFormData(editingGroup));
    setErrorMessage(null);
  }, [editingGroup, isOpen]);

  const createMutation = useMutation({
    mutationFn: () =>
      resourceService.createResourceGroup({
        name: formData.name,
        description: formData.description || undefined,
        portalVisible: formData.portalVisible,
        active: formData.active,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resource-groups"] });
      queryClient.invalidateQueries({ queryKey: ["resource-groups-list"] });
      onSuccess();
    },
    onError: (error: any) => {
      setErrorMessage(
        error?.response?.data?.message ||
          "Erreur lors de la création du groupe.",
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      resourceService.updateResourceGroup(editingGroup!.code, {
        name: formData.name,
        description: formData.description || undefined,
        portalVisible: formData.portalVisible,
        active: formData.active,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resource-groups"] });
      queryClient.invalidateQueries({ queryKey: ["resource-groups-list"] });
      onSuccess();
    },
    onError: (error: any) => {
      setErrorMessage(
        error?.response?.data?.message ||
          "Erreur lors de la mise à jour du groupe.",
      );
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (editingGroup) updateMutation.mutate();
    else createMutation.mutate();
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  if (!isOpen) return null;

  return (
    <ModalPortal onClose={onClose} size="lg">
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="h-11 w-11 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center">
              <Users size={20} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                {editingGroup
                  ? "Modifier le groupe"
                  : "Nouveau groupe de ressources"}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Regroupez les ressources par zone, usage, bâtiment ou niveau de
                service.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-5">
        {errorMessage && (
          <div className="bg-red-50 border border-red-100 text-red-700 px-4 py-3 rounded-xl text-sm">
            {errorMessage}
          </div>
        )}

        {editingGroup && (
          <div className="rounded-2xl bg-gray-50 px-4 py-3">
            <p className="text-xs text-gray-400 uppercase tracking-wide">
              Code du groupe
            </p>
            <p className="font-mono text-sm text-gray-800 mt-1">
              {editingGroup.code}
            </p>
          </div>
        )}

        <div className="rounded-2xl border border-gray-100 bg-white p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Nom *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
              placeholder="ex: Rez-de-chaussée, Zone premium..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={3}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none resize-none"
              placeholder="Décrivez la logique de regroupement..."
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() =>
              setFormData({
                ...formData,
                portalVisible: !formData.portalVisible,
              })
            }
            className={`rounded-2xl px-4 py-3 flex items-center justify-between transition-colors ${
              formData.portalVisible
                ? "bg-blue-50 text-blue-700"
                : "bg-gray-50 text-gray-500"
            }`}
          >
            <span className="flex items-center gap-2 text-sm font-medium">
              <Eye size={17} />
              Visible portail
            </span>
            <span
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                formData.portalVisible ? "bg-blue-600" : "bg-gray-300"
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                  formData.portalVisible ? "translate-x-5" : "translate-x-1"
                }`}
              />
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              setFormData({ ...formData, active: !formData.active })
            }
            className={`rounded-2xl px-4 py-3 flex items-center justify-between transition-colors ${
              formData.active
                ? "bg-green-50 text-green-700"
                : "bg-gray-50 text-gray-500"
            }`}
          >
            <span className="flex items-center gap-2 text-sm font-medium">
              <CheckCircle2 size={17} />
              Groupe actif
            </span>
            <span
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                formData.active ? "bg-green-600" : "bg-gray-300"
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                  formData.active ? "translate-x-5" : "translate-x-1"
                }`}
              />
            </span>
          </button>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="flex-1 bg-primary-600 text-white py-2.5 rounded-xl hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isPending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : editingGroup ? (
              "Mettre à jour"
            ) : (
              "Créer"
            )}
          </button>
        </div>
      </form>
    </ModalPortal>
  );
};
