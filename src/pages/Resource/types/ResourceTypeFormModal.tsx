import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Loader2, Tag, CheckCircle2 } from "lucide-react";
import { resourceService } from "../../../services/resource.service";
import type { ResourceTypeResponse } from "../../../services/resource.service";
import { ModalPortal } from "../../../components/ui/ModalPortal";

interface ResourceTypeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingType: ResourceTypeResponse | null;
  onSuccess: () => void;
}

const buildDefaultFormData = (type: ResourceTypeResponse | null) => ({
  name: type?.name || "",
  description: type?.description || "",
  active: type?.active ?? true,
});

export const ResourceTypeFormModal: React.FC<ResourceTypeFormModalProps> = ({
  isOpen,
  onClose,
  editingType,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState(() =>
    buildDefaultFormData(editingType),
  );

  useEffect(() => {
    setFormData(buildDefaultFormData(editingType));
    setErrorMessage(null);
  }, [editingType, isOpen]);

  const createMutation = useMutation({
    mutationFn: () =>
      resourceService.createResourceType({
        name: formData.name,
        description: formData.description || undefined,
        active: formData.active,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resource-types"] });
      queryClient.invalidateQueries({ queryKey: ["resource-types-list"] });
      onSuccess();
    },
    onError: (error: any) => {
      setErrorMessage(
        error?.response?.data?.message || "Erreur lors de la création du type.",
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      resourceService.updateResourceType(editingType!.code, {
        name: formData.name,
        description: formData.description || undefined,
        active: formData.active,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resource-types"] });
      queryClient.invalidateQueries({ queryKey: ["resource-types-list"] });
      onSuccess();
    },
    onError: (error: any) => {
      setErrorMessage(
        error?.response?.data?.message ||
          "Erreur lors de la mise à jour du type.",
      );
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (editingType) updateMutation.mutate();
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
              <Tag size={20} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                {editingType ? "Modifier le type" : "Nouveau type de ressource"}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Classez les ressources pour faciliter leur recherche et leur
                organisation.
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

        {editingType && (
          <div className="rounded-2xl bg-gray-50 px-4 py-3">
            <p className="text-xs text-gray-400 uppercase tracking-wide">
              Code du type
            </p>
            <p className="font-mono text-sm text-gray-800 mt-1">
              {editingType.code}
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
              placeholder="ex: Salle de réunion"
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
              placeholder="Décrivez brièvement ce type de ressource..."
            />
          </div>
        </div>

        <button
          type="button"
          onClick={() => setFormData({ ...formData, active: !formData.active })}
          className={`w-full rounded-2xl px-4 py-3 flex items-center justify-between transition-colors ${
            formData.active
              ? "bg-green-50 text-green-700"
              : "bg-gray-50 text-gray-500"
          }`}
        >
          <span className="flex items-center gap-2 text-sm font-medium">
            <CheckCircle2 size={17} />
            Type actif
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
            ) : editingType ? (
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
