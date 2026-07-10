import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Trash2, X } from "lucide-react";
import { ModalPortal } from "../../../components/ui/ModalPortal";
import { inventoryService } from "../../../services/inventory.service";

const approvalLevels = [
  { value: "MANAGER", label: "Manager" },
  { value: "DIRECTOR", label: "Directeur" },
  { value: "FINANCE", label: "Finance" },
];

export const ApprovalRulesList: React.FC = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<any>(null);
  const [formData, setFormData] = useState({
    approvalLevel: "MANAGER",
    minAmount: 0,
    maxAmount: 500000,
    requiredApprovals: 1,
    active: true,
  });

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ["approval-rules"],
    queryFn: () => inventoryService.getApprovalRules(),
  });

  const createMutation = useMutation({
    mutationFn: () => inventoryService.createApprovalRule([formData]),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["approval-rules"] });
      handleCloseModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      inventoryService.updateApprovalRule(editingRule.id, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["approval-rules"] });
      handleCloseModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => inventoryService.deleteApprovalRule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["approval-rules"] });
    },
  });

  const handleOpenModal = (rule?: any) => {
    if (rule) {
      setEditingRule(rule);
      setFormData({
        approvalLevel: rule.approvalLevel,
        minAmount: rule.minAmount,
        maxAmount: rule.maxAmount,
        requiredApprovals: rule.requiredApprovals,
        active: rule.active,
      });
    } else {
      setEditingRule(null);
      setFormData({
        approvalLevel: "MANAGER",
        minAmount: 0,
        maxAmount: 500000,
        requiredApprovals: 1,
        active: true,
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingRule(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingRule) {
      updateMutation.mutate();
    } else {
      createMutation.mutate();
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer cette règle ?")) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  return (
    <div className="p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-8">
        <h2 className="text-lg sm:text-xl sm:text-2xl font-semibold text-gray-900">
          Règles d'approbation
        </h2>
        <button
          onClick={() => handleOpenModal()}
          className="bg-primary-600 text-white px-4 py-2.5 sm:px-5 rounded-2xl hover:bg-primary-700 flex items-center gap-2 text-sm sm:text-base font-medium w-full sm:w-auto justify-center"
        >
          <Plus size={20} />
          Nouvelle règle
        </button>
      </div>

      {/* Tableau - AGRANDI */}
      <div className="bg-white rounded-3xl shadow-sm ring-1 ring-gray-100 overflow-hidden">
        <table className="w-full text-sm sm:text-base block md:table">
          <thead className="bg-gray-50 ring-1 ring-gray-100 hidden md:table-header-group">
            <tr>
              <th className="px-6 py-4 text-left font-semibold hidden md:table-cell">Niveau</th>
              <th className="px-6 py-4 text-right font-semibold hidden md:table-cell">
                Montant min
              </th>
              <th className="px-6 py-4 text-right font-semibold hidden md:table-cell">
                Montant max
              </th>
              <th className="px-6 py-4 text-center font-semibold hidden md:table-cell">
                Approbations requises
              </th>
              <th className="px-6 py-4 text-center font-semibold hidden md:table-cell">Actif</th>
              <th className="px-6 py-4 text-right font-semibold hidden md:table-cell">Actions</th>
            </tr>
          </thead>
          <tbody className="space-y-2 md:space-y-0 block md:table-row-group">
            {rules.map((rule: any) => (
              <tr key={rule.id} className="hover:bg-gray-50 block md:table-row rounded-3xl bg-white p-4 mb-3 shadow-sm ring-1 ring-gray-100">
                <td className="px-6 py-4 font-medium flex justify-between gap-4 md:table-cell text-sm">
                  {
                    approvalLevels.find((l) => l.value === rule.approvalLevel)
                      ?.label
                  }
                </td>
                <td className="px-6 py-4 text-right flex justify-between gap-4 md:table-cell text-sm">
                  {rule.minAmount.toLocaleString()} FCFA
                </td>
                <td className="px-6 py-4 text-right flex justify-between gap-4 md:table-cell text-sm">
                  {rule.maxAmount
                    ? `${rule.maxAmount.toLocaleString()} FCFA`
                    : "∞"}
                </td>
                <td className="px-6 py-4 text-center flex justify-between gap-4 md:table-cell text-sm">
                  {rule.requiredApprovals}
                </td>
                <td className="px-6 py-4 text-center flex justify-between gap-4 md:table-cell text-sm">
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs ${rule.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}
                  >
                    {rule.active ? "Actif" : "Inactif"}
                  </span>
                </td>
                <td className="px-6 py-4 text-right flex justify-between gap-4 md:table-cell text-sm">
                  <button
                    onClick={() => handleOpenModal(rule)}
                    className="p-1.5 text-blue-600 hover:text-blue-800 mr-2"
                  >
                    <Edit size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(rule.id)}
                    className="p-1.5 text-red-600 hover:text-red-800"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rules.length === 0 && (
        <div className="text-center py-16 bg-white rounded-3xl">
          <p className="text-gray-500 text-sm sm:text-base">
            Aucune règle d'approbation configurée
          </p>
        </div>
      )}

      {/* Modal - AGRANDI */}
      {isModalOpen && (
        <ModalPortal onClose={handleCloseModal} size="2xl">
          <div className="relative bg-white rounded-3xl w-full max-w-lg">
            <div className="sticky top-0 bg-white ring-1 ring-gray-100 p-4 sm:p-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-t-2xl">
              <h3 className="text-lg sm:text-xl sm:text-2xl font-bold">
                {editingRule ? "Modifier" : "Nouvelle"} règle
              </h3>
              <button
                onClick={handleCloseModal}
                className="p-2 hover:bg-gray-100 rounded-2xl"
              >
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div>
                <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">
                  Niveau *
                </label>
                <select
                  value={formData.approvalLevel}
                  onChange={(e) =>
                    setFormData({ ...formData, approvalLevel: e.target.value })
                  }
                  className="w-full px-4 py-3 ring-1 ring-gray-100 rounded-2xl text-sm sm:text-base"
                >
                  {approvalLevels.map((level) => (
                    <option key={level.value} value={level.value}>
                      {level.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">
                    Montant min (FCFA)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formData.minAmount === 0 ? "" : formData.minAmount}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      setFormData({
                        ...formData,
                        minAmount: val === "" ? 0 : parseInt(val),
                      });
                    }}
                    placeholder="0"
                    className="w-full px-4 py-3 ring-1 ring-gray-100 rounded-2xl text-sm sm:text-base"
                  />
                </div>
                <div>
                  <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">
                    Montant max (FCFA)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formData.maxAmount === 0 ? "" : formData.maxAmount}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      setFormData({
                        ...formData,
                        maxAmount: val === "" ? 0 : parseInt(val),
                      });
                    }}
                    placeholder="Illimité"
                    className="w-full px-4 py-3 ring-1 ring-gray-100 rounded-2xl text-sm sm:text-base"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">
                  Approbations requises *
                </label>
                <input
                  type="number"
                  value={formData.requiredApprovals}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      requiredApprovals: Number(e.target.value) || 1,
                    })
                  }
                  min="1"
                  className="w-full px-4 py-3 ring-1 ring-gray-100 rounded-2xl text-sm sm:text-base"
                />
              </div>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.active}
                  onChange={(e) =>
                    setFormData({ ...formData, active: e.target.checked })
                  }
                  className="rounded w-5 h-5"
                />
                <span className="text-base">Actif</span>
              </label>
              <div className="flex flex-col gap-3 sm:flex-row sm:gap-4 pt-6">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-3 sm:px-5 ring-1 rounded-2xl text-gray-700 hover:bg-gray-50 text-sm sm:text-base"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={
                    createMutation.isPending || updateMutation.isPending
                  }
                  className="flex-1 bg-primary-600 text-white py-3 rounded-2xl hover:bg-primary-700 disabled:opacity-50 text-sm sm:text-base font-medium w-full sm:w-auto justify-center"
                >
                  {editingRule ? "Mettre à jour" : "Créer"}
                </button>
              </div>
            </form>
          </div>
        </ModalPortal>
      )}
    </div>
  );
};
