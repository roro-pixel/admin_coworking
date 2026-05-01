import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Plus, Send, CheckCircle, XCircle, Search, X, Loader2, Truck, Package, 
  Clock, Trash2, Eye
} from 'lucide-react';
import { ModalPortal } from '../../../components/ui/ModalPortal';
import { inventoryService } from '../../../services/inventory.service';
import type { PurchaseOrder, Supplier, InventoryItem } from '../../../services/inventory.service';
import { useAuth } from '../../../contexts/AuthContext';

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  DRAFT: { label: 'Brouillon', color: 'bg-gray-100 text-gray-700', icon: null },
  PENDING_APPROVAL: { label: 'En attente', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  APPROVED: { label: 'Approuvé', color: 'bg-blue-100 text-blue-700', icon: CheckCircle },
  ORDERED: { label: 'Commandé', color: 'bg-purple-100 text-purple-700', icon: Send },
  PARTIALLY_RECEIVED: { label: 'Partiellement reçu', color: 'bg-orange-100 text-orange-700', icon: Truck },
  RECEIVED: { label: 'Reçu', color: 'bg-green-100 text-green-700', icon: Package },
  CANCELLED: { label: 'Annulé', color: 'bg-red-100 text-red-700', icon: XCircle },
};

export const PurchaseOrdersList: React.FC = () => {
  const { admin } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    supplierCode: '',
    locationCode: '',
    expectedDeliveryDate: '',
    lines: [{ itemCode: '', quantity: 1, unitCost: 0 }],
  });
  const [itemSearch, setItemSearch] = useState('');
  const [showItemResults, setShowItemResults] = useState(false);

  // Détail
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const { data: ordersData, isLoading } = useQuery({
    queryKey: ['purchase-orders', statusFilter],
    queryFn: () => inventoryService.getPurchaseOrders({ status: statusFilter || undefined, size: 100 }),
  });

  const { data: suppliersData } = useQuery({
    queryKey: ['suppliers-active'],
    queryFn: () => inventoryService.getSuppliers({ status: 'ACTIVE', size: 100 }),
  });

  const { data: locations = [] } = useQuery({
    queryKey: ['inventory-locations'],
    queryFn: () => inventoryService.getLocations(true),
  });

  const { data: itemsData } = useQuery({
    queryKey: ['inventory-items-search', itemSearch],
    queryFn: () => inventoryService.getItems({ query: itemSearch || undefined, size: 20 }),
    enabled: itemSearch.length > 1,
  });

  const orders = ordersData?.content || [];
  const suppliers = suppliersData?.content || [];
  const items = itemsData?.content || [];

  const createMutation = useMutation({
    mutationFn: () => inventoryService.createPurchaseOrder({
      supplierCode: formData.supplierCode,
      locationCode: formData.locationCode,
      expectedDeliveryDate: formData.expectedDeliveryDate,
      orderedBy: admin?.email || 'admin',
      lines: formData.lines.filter(l => l.itemCode && l.quantity > 0),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      setIsModalOpen(false);
      resetForm();
    },
  });

  const approveMutation = useMutation({
    mutationFn: ({ code, approvedBy }: { code: string; approvedBy: string }) =>
      inventoryService.approvePurchaseOrder(code, approvedBy),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
    },
  });

  const markOrderedMutation = useMutation({
    mutationFn: ({ code, orderedBy }: { code: string; orderedBy: string }) =>
      inventoryService.markOrdered(code, orderedBy),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (code: string) => inventoryService.cancelPurchaseOrder(code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
    },
  });

  const resetForm = () => {
    setFormData({
      supplierCode: '',
      locationCode: '',
      expectedDeliveryDate: '',
      lines: [{ itemCode: '', quantity: 1, unitCost: 0 }],
    });
  };

  const addLine = () => {
    setFormData({
      ...formData,
      lines: [...formData.lines, { itemCode: '', quantity: 1, unitCost: 0 }],
    });
  };

  const removeLine = (index: number) => {
    setFormData({
      ...formData,
      lines: formData.lines.filter((_, i) => i !== index),
    });
  };

  const updateLine = (index: number, field: string, value: any) => {
    const newLines = [...formData.lines];
    newLines[index] = { ...newLines[index], [field]: value };
    setFormData({ ...formData, lines: newLines });
  };

  const selectItemForLine = (index: number, item: InventoryItem) => {
    updateLine(index, 'itemCode', item.itemCode);
    setItemSearch('');
    setShowItemResults(false);
  };

  const handleViewDetail = (order: PurchaseOrder) => {
    setSelectedOrder(order);
    setIsDetailOpen(true);
  };

  const filteredOrders = orders.filter((order: PurchaseOrder) =>
    order.orderCode.toLowerCase().includes(search.toLowerCase()) ||
    order.supplierName.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Bons de commande</h2>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center gap-2"
        >
          <Plus size={18} />
          Nouveau bon de commande
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher un bon de commande..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-200 rounded-lg bg-white"
        >
          <option value="">Tous les statuts</option>
          <option value="DRAFT">Brouillon</option>
          <option value="PENDING_APPROVAL">En attente</option>
          <option value="APPROVED">Approuvé</option>
          <option value="ORDERED">Commandé</option>
          <option value="PARTIALLY_RECEIVED">Partiellement reçu</option>
          <option value="RECEIVED">Reçu</option>
          <option value="CANCELLED">Annulé</option>
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold">Code</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Fournisseur</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Emplacement</th>
              <th className="px-4 py-3 text-right text-sm font-semibold">Montant</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Statut</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Date</th>
              <th className="px-4 py-3 text-center text-sm font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredOrders.map((order: PurchaseOrder) => {
              const status = statusConfig[order.status];
              const StatusIcon = status?.icon;
              return (
                <tr key={order.orderCode} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-mono">{order.orderCode}</td>
                  <td className="px-4 py-3 text-sm">{order.supplierName}</td>
                  <td className="px-4 py-3 text-sm">{order.locationCode}</td>
                  <td className="px-4 py-3 text-right font-medium">{order.totalAmount.toLocaleString()} FCFA</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${status?.color}`}>
                      {StatusIcon && <StatusIcon size={12} />}
                      {status?.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">{new Date(order.createdAt).toLocaleDateString('fr-FR')}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center gap-1">
                      <button
                        onClick={() => handleViewDetail(order)}
                        className="p-1 text-gray-600 hover:text-primary-600"
                        title="Voir détail"
                      >
                        <Eye size={16} />
                      </button>
                      {order.status === 'DRAFT' && (
                        <button
                          onClick={() => approveMutation.mutate({ code: order.orderCode, approvedBy: admin?.email || 'admin' })}
                          className="p-1 text-blue-600 hover:text-blue-800"
                          title="Approuver"
                        >
                          <CheckCircle size={16} />
                        </button>
                      )}
                      {order.status === 'APPROVED' && (
                        <button
                          onClick={() => markOrderedMutation.mutate({ code: order.orderCode, orderedBy: admin?.email || 'admin' })}
                          className="p-1 text-purple-600 hover:text-purple-800"
                          title="Marquer comme commandé"
                        >
                          <Send size={16} />
                        </button>
                      )}
                      {(order.status === 'DRAFT' || order.status === 'PENDING_APPROVAL') && (
                        <button
                          onClick={() => cancelMutation.mutate(order.orderCode)}
                          className="p-1 text-red-600 hover:text-red-800"
                          title="Annuler"
                        >
                          <XCircle size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filteredOrders.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl">
          <p className="text-gray-500">Aucun bon de commande trouvé</p>
        </div>
      )}

      {/* ========== MODAL DÉTAIL BON DE COMMANDE ========== */}
      {isDetailOpen && selectedOrder && (
        <ModalPortal onClose={() => setIsDetailOpen(false)} size="lg">
          <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center rounded-t-2xl">
            <div>
              <h3 className="text-xl font-bold">{selectedOrder.orderCode}</h3>
              <p className="text-sm text-gray-500">Bon de commande</p>
            </div>
            <button onClick={() => setIsDetailOpen(false)} className="p-1 hover:bg-gray-100 rounded-lg">
              <X size={20} />
            </button>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Statut</p>
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${statusConfig[selectedOrder.status]?.color}`}>
                  {statusConfig[selectedOrder.status]?.label}
                </span>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Date de création</p>
                <p className="text-sm">{new Date(selectedOrder.createdAt).toLocaleString('fr-FR')}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Fournisseur</p>
                <p className="font-medium text-sm">{selectedOrder.supplierName}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Emplacement</p>
                <p className="text-sm">{selectedOrder.locationCode}</p>
              </div>
              {selectedOrder.expectedDeliveryDate && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Livraison prévue</p>
                  <p className="text-sm">{new Date(selectedOrder.expectedDeliveryDate).toLocaleDateString('fr-FR')}</p>
                </div>
              )}
              {selectedOrder.approvedBy && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Approuvé par</p>
                  <p className="text-sm">{selectedOrder.approvedBy}</p>
                </div>
              )}
            </div>

            {/* Lignes */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">
                Lignes ({selectedOrder.lines?.length || 0})
              </h4>
              <div className="space-y-2">
                {selectedOrder.lines?.map((line, idx) => (
                  <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{line.itemName || line.itemCode}</p>
                      <p className="text-xs text-gray-500 font-mono">{line.itemCode}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm">{line.quantity} × {line.unitCost.toLocaleString()} FCFA</p>
                      <p className="font-bold text-sm">{line.totalCost.toLocaleString()} FCFA</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between font-bold text-base pt-3 border-t mt-2">
                <span>Total</span>
                <span>{selectedOrder.totalAmount.toLocaleString()} FCFA</span>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* ========== MODAL CRÉATION BON DE COMMANDE ========== */}
      {isModalOpen && (
        <ModalPortal onClose={() => setIsModalOpen(false)} size="2xl">
          <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center rounded-t-2xl">
            <h3 className="text-xl font-bold">Nouveau bon de commande</h3>
            <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-gray-100 rounded-lg">
              <X size={20} />
            </button>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fournisseur *</label>
                <select
                  value={formData.supplierCode}
                  onChange={(e) => setFormData({ ...formData, supplierCode: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                >
                  <option value="">Sélectionner</option>
                  {suppliers.map((sup: Supplier) => (
                    <option key={sup.code} value={sup.code}>{sup.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Emplacement *</label>
                <select
                  value={formData.locationCode}
                  onChange={(e) => setFormData({ ...formData, locationCode: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                >
                  <option value="">Sélectionner</option>
                  {locations.map((loc: any) => (
                    <option key={loc.locationCode} value={loc.locationCode}>{loc.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date livraison prévue</label>
              <input
                type="date"
                value={formData.expectedDeliveryDate}
                onChange={(e) => setFormData({ ...formData, expectedDeliveryDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Articles</label>
              {formData.lines.map((line, idx) => (
                <div key={idx} className="flex gap-2 mb-2">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      placeholder="Rechercher un article..."
                      value={itemSearch}
                      onChange={(e) => {
                        setItemSearch(e.target.value);
                        setShowItemResults(true);
                      }}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                    />
                    {showItemResults && items.length > 0 && (
                      <div className="absolute z-10 mt-1 w-full bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {items.map((item: InventoryItem) => (
                          <button
                            key={item.itemCode}
                            type="button"
                            onClick={() => {
                              selectItemForLine(idx, item);
                              setItemSearch('');
                              setShowItemResults(false);
                            }}
                            className="w-full px-3 py-2 text-left hover:bg-gray-50 border-b"
                          >
                            <p className="font-medium">{item.name}</p>
                            <p className="text-xs text-gray-500">{item.itemCode}</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                 <input
  type="text"
  inputMode="numeric"
  placeholder="Qté"
  value={line.quantity === 0 ? '' : line.quantity}
  onChange={(e) => {
    const val = e.target.value.replace(/\D/g, '');
    updateLine(idx, 'quantity', val === '' ? 0 : parseInt(val));
  }}
  className="w-24 px-3 py-2 border border-gray-200 rounded-lg"
/>
<input
  type="text"
  inputMode="numeric"
  placeholder="Prix"
  value={line.unitCost === 0 ? '' : line.unitCost}
  onChange={(e) => {
    const val = e.target.value.replace(/\D/g, '');
    updateLine(idx, 'unitCost', val === '' ? 0 : parseInt(val));
  }}
  className="w-32 px-3 py-2 border border-gray-200 rounded-lg"
/>
                  <button type="button" onClick={() => removeLine(idx)} className="p-2 text-red-600">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              <button type="button" onClick={addLine} className="mt-2 text-primary-600 text-sm flex items-center gap-1">
                <Plus size={14} /> Ajouter un article
              </button>
            </div>

            <div className="flex gap-3 pt-4">
              <button onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2 border rounded-lg text-gray-700">
                Annuler
              </button>
              <button
                onClick={() => createMutation.mutate()}
                disabled={!formData.supplierCode || !formData.locationCode || formData.lines.length === 0 || createMutation.isPending}
                className="flex-1 bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                {createMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : 'Créer'}
              </button>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
};