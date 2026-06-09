import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Edit,
  Search,
  Power,
  X,
  Loader2,
  Wallet,
  TrendingUp,
  TrendingDown,
  BarChart3,
} from "lucide-react";
import { paymentService } from "../../services/payment.service";
import type { CashRegister } from "../../services/payment.service";
import { ModalPortal } from "../../components/ui/ModalPortal";

export const CashRegistersList: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRegister, setEditingRegister] = useState<CashRegister | null>(
    null,
  );
  const [formData, setFormData] = useState({
    name: "",
    locationCode: "",
    businessEntityCode: "",
    deviceCode: "",
    cashControlEnabled: true,
    maxCashAmount: 500000,
  });

  const { data: registersData, isLoading } = useQuery({
    queryKey: ["cash-registers"],
    queryFn: () => paymentService.getCashRegisters({ size: 100 }),
  });

  const { data: metrics } = useQuery({
    queryKey: ["cash-metrics-overview-registers-screen"],
    queryFn: () => paymentService.getCashMetricsOverview(),
  });

  const createMutation = useMutation({
    mutationFn: () => paymentService.createCashRegister(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cash-registers"] });
      handleCloseModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      paymentService.updateCashRegister(editingRegister!.registerCode, {
        name: formData.name,
        locationCode: formData.locationCode,
        businessEntityCode: formData.businessEntityCode || undefined,
        deviceCode: formData.deviceCode || undefined,
        cashControlEnabled: formData.cashControlEnabled,
        maxCashAmount: formData.maxCashAmount,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cash-registers"] });
      handleCloseModal();
    },
  });

  const activateMutation = useMutation({
    mutationFn: (code: string) => paymentService.activateCashRegister(code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cash-registers"] });
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (code: string) => paymentService.deactivateCashRegister(code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cash-registers"] });
    },
  });

  const registers: CashRegister[] = registersData?.content || [];

  const filteredRegisters = registers.filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.registerCode.toLowerCase().includes(search.toLowerCase()),
  );

  const handleOpenModal = (register?: CashRegister) => {
    if (register) {
      setEditingRegister(register);
      setFormData({
        name: register.name,
        locationCode: register.locationCode,
        businessEntityCode: register.businessEntityCode || "",
        deviceCode: register.deviceCode || "",
        cashControlEnabled: register.cashControlEnabled,
        maxCashAmount: register.maxCashAmount || 500000,
      });
    } else {
      setEditingRegister(null);
      setFormData({
        name: "",
        locationCode: "",
        businessEntityCode: "",
        deviceCode: "",
        cashControlEnabled: true,
        maxCashAmount: 500000,
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingRegister(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingRegister) {
      updateMutation.mutate();
    } else {
      createMutation.mutate();
    }
  };

  const handleToggleActive = (register: CashRegister) => {
    if (register.active) {
      deactivateMutation.mutate(register.registerCode);
    } else {
      activateMutation.mutate(register.registerCode);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  if (isLoading) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Caisses</h2>
        <button
          onClick={() => handleOpenModal()}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center gap-2"
        >
          <Plus size={18} />
          Nouvelle caisse
        </button>
      </div>

      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 text-gray-500 text-xs">
              <Wallet size={15} /> Revenus
            </div>
            <p className="text-lg font-semibold mt-1">
              {(metrics.totalPayments ?? 0).toLocaleString("fr-FR")} FCFA
            </p>
          </div>
          <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 text-gray-500 text-xs">
              <TrendingUp size={15} /> Entrées cash
            </div>
            <p className="text-lg font-semibold mt-1">
              {(metrics.totalCashIn ?? 0).toLocaleString("fr-FR")} FCFA
            </p>
          </div>
          <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 text-gray-500 text-xs">
              <TrendingDown size={15} /> Sorties cash
            </div>
            <p className="text-lg font-semibold mt-1">
              {(metrics.totalCashOut ?? 0).toLocaleString("fr-FR")} FCFA
            </p>
          </div>
          <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 text-gray-500 text-xs">
              <BarChart3 size={15} /> Sessions ouvertes
            </div>
            <p className="text-lg font-semibold mt-1">
              {metrics.openSessionCount?? 0}
            </p>
          </div>
        </div>
      )}

      <div className="relative mb-6">
        <Search
          size={18}
          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
        />
        <input
          type="text"
          placeholder="Rechercher une caisse..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold">
                Code
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Nom</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">
                Emplacement
              </th>
              <th className="px-6 py-3 text-center text-sm font-semibold">
                Contrôle cash
              </th>
              <th className="px-6 py-3 text-right text-sm font-semibold">
                Montant max
              </th>
              <th className="px-6 py-3 text-center text-sm font-semibold">
                Actif
              </th>
              <th className="px-6 py-3 text-right text-sm font-semibold">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredRegisters.map((register) => (
              <tr key={register.registerCode} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-mono">
                  {register.registerCode}
                </td>
                <td className="px-6 py-4 text-sm font-medium">
                  {register.name}
                </td>
                <td className="px-6 py-4 text-sm">{register.locationCode}</td>
                <td className="px-6 py-4 text-center">
                  {register.cashControlEnabled ? (
                    <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">
                      Activé
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-500">
                      Désactivé
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  {register.maxCashAmount?.toLocaleString()} FCFA
                </td>
                <td className="px-6 py-4 text-center">
                  <button
                    onClick={() => handleToggleActive(register)}
                    className={`p-1 rounded ${register.active ? "text-green-600 hover:text-green-800" : "text-gray-400 hover:text-gray-600"}`}
                  >
                    <Power size={16} />
                  </button>
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => handleOpenModal(register)}
                    className="p-1 text-blue-600 hover:text-blue-800"
                  >
                    <Edit size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredRegisters.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl">
          <Wallet size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">Aucune caisse trouvée</p>
        </div>
      )}

      {isModalOpen && (
        <ModalPortal onClose={handleCloseModal}>
          <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center rounded-t-2xl">
            <h3 className="text-xl font-bold">
              {editingRegister ? "Modifier" : "Nouvelle"} caisse
            </h3>
            <button
              onClick={handleCloseModal}
              className="p-1 hover:bg-gray-100 rounded-lg"
            >
              <X size={20} />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Emplacement *
              </label>
              <input
                type="text"
                value={formData.locationCode}
                onChange={(e) =>
                  setFormData({ ...formData, locationCode: e.target.value })
                }
                required
                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Code business
              </label>
              <input
                type="text"
                value={formData.businessEntityCode}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    businessEntityCode: e.target.value,
                  })
                }
                placeholder="Laissez vide pour génération automatique"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
              />
              <p className="text-xs text-gray-400 mt-1">
                Optionnel — le backend générera un code automatiquement si non
                renseigné
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Code appareil
              </label>
              <input
                type="text"
                value={formData.deviceCode}
                onChange={(e) =>
                  setFormData({ ...formData, deviceCode: e.target.value })
                }
                placeholder="Laissez vide pour génération automatique"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
              />
              <p className="text-xs text-gray-400 mt-1">
                Optionnel — le backend générera un code automatiquement si non
                renseigné
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.cashControlEnabled}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      cashControlEnabled: e.target.checked,
                    })
                  }
                  className="rounded"
                />
                <span className="text-sm">Contrôle cash</span>
              </label>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Montant max (FCFA)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={
                    formData.maxCashAmount === 0 ? "" : formData.maxCashAmount
                  }
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    setFormData({
                      ...formData,
                      maxCashAmount: val === "" ? 0 : parseInt(val),
                    });
                  }}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                />
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={handleCloseModal}
                className="flex-1 px-4 py-2 border rounded-lg text-gray-700"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="flex-1 bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isPending ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : editingRegister ? (
                  "Mettre à jour"
                ) : (
                  "Créer"
                )}
              </button>
            </div>
          </form>
        </ModalPortal>
      )}
    </div>
  );
};
