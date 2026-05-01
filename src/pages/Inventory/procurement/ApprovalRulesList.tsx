import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, X } from 'lucide-react';
import { ModalPortal } from '../../../components/ui/ModalPortal';
import { inventoryService } from '../../../services/inventory.service';

const approvalLevels = [
  { value: 'MANAGER', label: 'Manager' },
  { value: 'DIRECTOR', label: 'Directeur' },
  { value: 'FINANCE', label: 'Finance' },
];

export const ApprovalRulesList: React.FC = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<any>(null);
  const [formData, setFormData] = useState({
    approvalLevel: 'MANAGER',
    minAmount: 0,
    maxAmount: 500000,
    requiredApprovals: 1,
    active: true,
  });

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['approval-rules'],
    queryFn: () => inventoryService.getApprovalRules(),
  });

  const createMutation = useMutation({
    mutationFn: () => inventoryService.createApprovalRule([formData]),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approval-rules'] });
      handleCloseModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: () => inventoryService.updateApprovalRule(editingRule.id, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approval-rules'] });
      handleCloseModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => inventoryService.deleteApprovalRule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approval-rules'] });
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
        approvalLevel: 'MANAGER',
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
    if (confirm('Êtes-vous sûr de vouloir supprimer cette règle ?')) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Règles d'approbation</h2>
        <button
          onClick={() => handleOpenModal()}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center gap-2"
        >
          <Plus size={18} />
          Nouvelle règle
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold">Niveau</th>
              <th className="px-6 py-3 text-right text-sm font-semibold">Montant min</th>
              <th className="px-6 py-3 text-right text-sm font-semibold">Montant max</th>
              <th className="px-6 py-3 text-center text-sm font-semibold">Approbations requises</th>
              <th className="px-6 py-3 text-center text-sm font-semibold">Actif</th>
              <th className="px-6 py-3 text-right text-sm font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rules.map((rule: any) => (
              <tr key={rule.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-medium">{approvalLevels.find(l => l.value === rule.approvalLevel)?.label}</td>
                <td className="px-6 py-4 text-right">{rule.minAmount.toLocaleString()} FCFA</td>
                <td className="px-6 py-4 text-right">{rule.maxAmount ? `${rule.maxAmount.toLocaleString()} FCFA` : '∞'}</td>
                <td className="px-6 py-4 text-center">{rule.requiredApprovals}</td>
                <td className="px-6 py-4 text-center">
                  <span className={`px-2 py-1 rounded-full text-xs ${rule.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {rule.active ? 'Actif' : 'Inactif'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button onClick={() => handleOpenModal(rule)} className="p-1 text-blue-600 hover:text-blue-800 mr-2">
                    <Edit size={16} />
                  </button>
                  <button onClick={() => handleDelete(rule.id)} className="p-1 text-red-600 hover:text-red-800">
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rules.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl">
          <p className="text-gray-500">Aucune règle d'approbation configurée</p>
        </div>
      )}

      {isModalOpen && (
        <ModalPortal onClose={handleCloseModal}>
          <div className="relative bg-white rounded-2xl w-full max-w-md">
            <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center rounded-t-2xl">
              <h3 className="text-xl font-bold">{editingRule ? 'Modifier' : 'Nouvelle'} règle</h3>
              <button onClick={handleCloseModal} className="p-1 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Niveau *</label>
                <select
                  value={formData.approvalLevel}
                  onChange={(e) => setFormData({ ...formData, approvalLevel: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                >
                  {approvalLevels.map(level => (
                    <option key={level.value} value={level.value}>{level.label}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
  <label className="block text-sm font-medium text-gray-700 mb-1">Montant min (FCFA)</label>
  <input
    type="text"
    inputMode="numeric"
    value={formData.minAmount === 0 ? '' : formData.minAmount}
    onChange={(e) => {
      const val = e.target.value.replace(/\D/g, '');
      setFormData({ ...formData, minAmount: val === '' ? 0 : parseInt(val) });
    }}
    placeholder="0"
    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
  />
</div>
<div>
  <label className="block text-sm font-medium text-gray-700 mb-1">Montant max (FCFA)</label>
  <input
    type="text"
    inputMode="numeric"
    value={formData.maxAmount === 0 ? '' : formData.maxAmount}
    onChange={(e) => {
      const val = e.target.value.replace(/\D/g, '');
      setFormData({ ...formData, maxAmount: val === '' ? 0 : parseInt(val) });
    }}
    placeholder="Illimité"
    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
  />
</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Approbations requises *</label>
                <input
                  type="number"
                  value={formData.requiredApprovals}
                  onChange={(e) => setFormData({ ...formData, requiredApprovals: Number(e.target.value) || 1 })}
                  min="1"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                />
              </div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm">Actif</span>
              </label>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={handleCloseModal} className="flex-1 px-4 py-2 border rounded-lg text-gray-700">
                  Annuler
                </button>
                <button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="flex-1 bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50">
                  {editingRule ? 'Mettre à jour' : 'Créer'}
                </button>
              </div>
            </form>
            </div>
        </ModalPortal>
      )}
    </div>
  );
};