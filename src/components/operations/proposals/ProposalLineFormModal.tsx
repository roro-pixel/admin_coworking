import React, { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, X } from "lucide-react";
import { ModalPortal } from "../../ui/ModalPortal";
import { operationsService } from "../../../services/operations.service";
import type {
  ProposalLineResponse,
  ProposalServiceType,
} from "../../../services/operations.service";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  proposalId: number;
  editingLine: ProposalLineResponse | null;
  onSuccess: () => void;
}
const serviceTypes: { value: ProposalServiceType; label: string }[] = [
  { value: "SUBSCRIPTION", label: "Abonnement" },
  { value: "PASS", label: "Pass" },
  { value: "BOOKING", label: "Réservation" },
  { value: "CUSTOM", label: "Personnalisé" },
];
const buildForm = (l: ProposalLineResponse | null) => ({
  label: l?.label || "",
  description: l?.description || "",
  serviceType: (l?.serviceType || "CUSTOM") as ProposalServiceType,
  serviceRefCode: l?.serviceRefCode || "",
  quantity: l?.quantity ?? 1,
  unitPrice: l?.unitPrice ?? 0,
  discountPercent: l?.discountPercent ?? 0,
  taxRate: l?.taxRate ?? 0.19,
  taxIncluded: l?.taxIncluded ?? false,
  sortOrder: l?.sortOrder ?? 0,
  currency: l?.currency || "XAF",
});
export const ProposalLineFormModal: React.FC<Props> = ({
  isOpen,
  onClose,
  proposalId,
  editingLine,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(() => buildForm(editingLine));
  useEffect(() => {
    if (isOpen) setForm(buildForm(editingLine));
  }, [editingLine, isOpen]);
  const addMutation = useMutation({
    mutationFn: () => operationsService.addProposalLine(proposalId, form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-proposal", proposalId] });
      onSuccess();
    },
  });
  const updateMutation = useMutation({
    mutationFn: () =>
      operationsService.updateProposalLine(proposalId, editingLine!.id, form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-proposal", proposalId] });
      onSuccess();
    },
  });
  if (!isOpen) return null;
  const isPending = addMutation.isPending || updateMutation.isPending;
  return (
    <ModalPortal onClose={onClose} size="xl">
      <div className="sticky top-0 z-10 flex justify-between rounded-t-2xl border-b bg-white px-6 py-4">
        <h3 className="text-xl font-bold">
          {editingLine ? "Modifier ligne" : "Ajouter ligne"}
        </h3>
        <button onClick={onClose} className="rounded-xl p-2 hover:bg-gray-100">
          <X size={20} />
        </button>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          editingLine ? updateMutation.mutate() : addMutation.mutate();
        }}
        className="space-y-4 p-6"
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="md:col-span-2">
            <span className="mb-1.5 block text-sm font-medium text-gray-700">
              Libellé *
            </span>
            <input
              required
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5"
            />
          </label>
          <label>
            <span className="mb-1.5 block text-sm font-medium text-gray-700">
              Service
            </span>
            <select
              value={form.serviceType}
              onChange={(e) =>
                setForm({ ...form, serviceType: e.target.value })
              }
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5"
            >
              {serviceTypes.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-1.5 block text-sm font-medium text-gray-700">
              Référence
            </span>
            <input
              value={form.serviceRefCode || ""}
              onChange={(e) =>
                setForm({ ...form, serviceRefCode: e.target.value })
              }
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5"
            />
          </label>
          <label>
            <span className="mb-1.5 block text-sm font-medium text-gray-700">
              Quantité
            </span>
            <input
              type="number"
              value={form.quantity}
              onChange={(e) =>
                setForm({ ...form, quantity: Number(e.target.value) || 1 })
              }
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5"
            />
          </label>
          <label>
            <span className="mb-1.5 block text-sm font-medium text-gray-700">
              PU
            </span>
            <input
              type="number"
              value={form.unitPrice}
              onChange={(e) =>
                setForm({ ...form, unitPrice: Number(e.target.value) || 0 })
              }
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5"
            />
          </label>
          <label>
            <span className="mb-1.5 block text-sm font-medium text-gray-700">
              Remise %
            </span>
            <input
              type="number"
              value={form.discountPercent}
              onChange={(e) =>
                setForm({
                  ...form,
                  discountPercent: Number(e.target.value) || 0,
                })
              }
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5"
            />
          </label>
          <label>
            <span className="mb-1.5 block text-sm font-medium text-gray-700">
              TVA
            </span>
            <input
              type="number"
              step="0.01"
              value={form.taxRate}
              onChange={(e) =>
                setForm({ ...form, taxRate: Number(e.target.value) || 0 })
              }
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5"
            />
          </label>
          <label>
            <span className="mb-1.5 block text-sm font-medium text-gray-700">
              Devise
            </span>
            <input
              value={form.currency}
              onChange={(e) =>
                setForm({ ...form, currency: e.target.value.toUpperCase() })
              }
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5"
            />
          </label>
          <label>
            <span className="mb-1.5 block text-sm font-medium text-gray-700">
              Ordre
            </span>
            <input
              type="number"
              value={form.sortOrder}
              onChange={(e) =>
                setForm({ ...form, sortOrder: Number(e.target.value) || 0 })
              }
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5"
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.taxIncluded}
              onChange={(e) =>
                setForm({ ...form, taxIncluded: e.target.checked })
              }
            />{" "}
            Prix TTC
          </label>
          <label className="md:col-span-2">
            <span className="mb-1.5 block text-sm font-medium text-gray-700">
              Description
            </span>
            <textarea
              rows={3}
              value={form.description || ""}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5"
            />
          </label>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border px-4 py-2.5"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="flex-1 rounded-xl bg-primary-600 px-4 py-2.5 text-white"
          >
            {isPending ? (
              <Loader2 className="mx-auto animate-spin" size={16} />
            ) : (
              "Enregistrer"
            )}
          </button>
        </div>
      </form>
    </ModalPortal>
  );
};
