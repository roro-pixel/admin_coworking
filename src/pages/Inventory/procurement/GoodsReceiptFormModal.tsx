import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Loader2, Package} from 'lucide-react';
import { ModalPortal } from '../../../components/ui/ModalPortal';
import { inventoryService} from '../../../services/inventory.service';
import type { PurchaseOrder } from '../../../services/inventory.service';
import { useAuth } from '../../../contexts/AuthContext';

interface GoodsReceiptFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderCode?: string;
}

export const GoodsReceiptFormModal: React.FC<GoodsReceiptFormModalProps> = ({ isOpen, onClose, orderCode }) => {
  const { admin } = useAuth();
  const queryClient = useQueryClient();

  React.useEffect(() => {
    if (!isOpen) return;
    // reset form on open
  }, [isOpen]);
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [formData, setFormData] = useState({
    orderCode: orderCode || '',
    locationCode: '',
    lines: [] as any[],
  });
  const [orderSearch, setOrderSearch] = useState('');
  const [showOrderResults, setShowOrderResults] = useState(false);

  const { data: ordersData } = useQuery({
    queryKey: ['purchase-orders-ordered', orderSearch],
    queryFn: () => inventoryService.getPurchaseOrders({ status: 'ORDERED', size: 100 }),
    enabled: orderSearch.length > 1,
  });

  const { data: locations = [] } = useQuery({
    queryKey: ['inventory-locations'],
    queryFn: () => inventoryService.getLocations(true),
  });

   const orders = ordersData?.content || [];

 const createMutation = useMutation({
    mutationFn: () => inventoryService.createGoodsReceipt({
      orderCode: formData.orderCode,
      locationCode: formData.locationCode,
      receivedBy: admin?.email || 'admin',
      lines: formData.lines,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      onClose();
      resetForm();
    },
    onError: (err: any) => setActionError(err?.response?.data?.message || 'Une erreur est survenue.'),
  });

  const resetForm = () => {
    setFormData({ orderCode: '', locationCode: '', lines: [] });
    setSelectedOrder(null);
  };

  const selectOrder = (order: PurchaseOrder) => {
    setSelectedOrder(order);
    setFormData({
      orderCode: order.orderCode,
      locationCode: order.locationCode,
      lines: order.lines.map(line => ({
        itemCode: line.itemCode,
        orderedQuantity: line.quantity,
        receivedQuantity: 0,
        rejectedQuantity: 0,
        qualityAccepted: true,
        quarantineAcceptedStock: false,
        unitCost: line.unitCost,
      })),
    });
    setOrderSearch('');
    setShowOrderResults(false);
  };

  const updateLine = (index: number, field: string, value: any) => {
    const newLines = [...formData.lines];
    newLines[index] = { ...newLines[index], [field]: value };
    setFormData({ ...formData, lines: newLines });
  };

  if (!isOpen) return null;

  return (
    <ModalPortal onClose={onClose}>
      <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center rounded-t-2xl">
        <h3 className="text-xl font-bold">Réception de marchandises</h3>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
          <X size={20} />
        </button>
      </div>
      <div className="overflow-y-auto max-h-[80vh]">

        <div className="p-6 space-y-4">
          {!formData.orderCode && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bon de commande *</label>
              <div className="relative">
                <input
                  type="text"
                  value={orderSearch}
                  onChange={(e) => {
                    setOrderSearch(e.target.value);
                    setShowOrderResults(true);
                  }}
                  placeholder="Rechercher un bon de commande..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                />
              </div>
              {showOrderResults && orders.length > 0 && (
                <div className="absolute z-10 mt-1 w-full max-w-md bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {orders.map((order: PurchaseOrder) => (
                    <button
                      key={order.orderCode}
                      onClick={() => selectOrder(order)}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 border-b"
                    >
                      <p className="font-medium">{order.orderCode}</p>
                      <p className="text-xs text-gray-500">{order.supplierName}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {selectedOrder && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <p><span className="font-medium">Bon de commande:</span> {selectedOrder.orderCode}</p>
              <p><span className="font-medium">Fournisseur:</span> {selectedOrder.supplierName}</p>
              <p><span className="font-medium">Emplacement:</span> {selectedOrder.locationCode}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Emplacement de réception *</label>
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

          <div>
            <h4 className="font-medium mb-2">Articles reçus</h4>
            <div className="space-y-3">
              {formData.lines.map((line, idx) => (
                <div key={idx} className="border rounded-lg p-3">
                  <p className="font-medium mb-2">{line.itemCode}</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs text-gray-500">Commandé</label>
                      <p className="font-medium">{line.orderedQuantity}</p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Reçu *</label>
                      <input
                        type="number"
                        value={line.receivedQuantity}
                        onChange={(e) => updateLine(idx, 'receivedQuantity', Number(e.target.value) || 0)}
                        className="w-full px-2 py-1 border rounded"
                        min="0"
                        max={line.orderedQuantity}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Rejeté</label>
                      <input
                        type="number"
                        value={line.rejectedQuantity}
                        onChange={(e) => updateLine(idx, 'rejectedQuantity', Number(e.target.value) || 0)}
                        className="w-full px-2 py-1 border rounded"
                        min="0"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {actionError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{actionError}</div>
          )}
          <div className="flex gap-3 pt-4">
            <button onClick={onClose} className="flex-1 px-4 py-2 border rounded-lg text-gray-700">
              Annuler
            </button>
            <button
              onClick={() => createMutation.mutate()}
              disabled={!formData.orderCode || !formData.locationCode || createMutation.isPending}
              className="flex-1 bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {createMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Package size={16} />}
              Valider la réception
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};