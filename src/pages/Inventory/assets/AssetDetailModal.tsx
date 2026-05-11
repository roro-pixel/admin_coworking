import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Wrench, Clock, Loader2 } from 'lucide-react';
import { inventoryService } from '../../../services/inventory.service';
import type { Asset } from '../../../services/inventory.service';
import { useAuth } from '../../../contexts/AuthContext';
import { ModalPortal } from '../../../components/ui/ModalPortal';

interface AssetDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: Asset;
}

const statusOptions = [
  { value: 'AVAILABLE', label: 'Disponible', color: 'bg-green-100 text-green-700' },
  { value: 'RESERVED', label: 'Réservé', color: 'bg-blue-100 text-blue-700' },
  { value: 'ASSIGNED', label: 'Attribué', color: 'bg-purple-100 text-purple-700' },
  { value: 'IN_USE', label: 'En utilisation', color: 'bg-cyan-100 text-cyan-700' },
  { value: 'IN_MAINTENANCE', label: 'En maintenance', color: 'bg-orange-100 text-orange-700' },
  { value: 'LOST', label: 'Perdu', color: 'bg-red-100 text-red-700' },
  { value: 'RETIRED', label: 'Retiré', color: 'bg-gray-100 text-gray-700' },
  { value: 'DAMAGED', label: 'Endommagé', color: 'bg-red-100 text-red-700' },
];

export const AssetDetailModal: React.FC<AssetDetailModalProps> = ({ isOpen, onClose, asset }) => {
  const { admin } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'info' | 'maintenance' | 'history'>('info');
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [showReturnForm, setShowReturnForm] = useState(false);
  const [showMaintenanceForm, setShowMaintenanceForm] = useState(false);
  const [assignData, setAssignData] = useState({
    assigneeType: 'MEMBER',
    assigneeCode: '',
    notes: '',
  });
  const [returnData, setReturnData] = useState({
    returnedToLocationCode: asset.locationCode,
    condition: 'GOOD',
    notes: '',
  });
  const [maintenanceData, setMaintenanceData] = useState({
    maintenanceType: 'CORRECTIVE',
    description: '',
    scheduledDate: '',
  });
  const [reserveReason, setReserveReason] = useState('');

  const { data: locations = [] } = useQuery({
    queryKey: ['inventory-locations'],
    queryFn: () => inventoryService.getLocations(true),
  });

  const { data: locationHistory } = useQuery({
    queryKey: ['asset-location-history', asset.assetCode],
    queryFn: () => inventoryService.getAssetLocationHistory(asset.assetCode),
    enabled: activeTab === 'history',
  });

  const assignMutation = useMutation({
    mutationFn: () => inventoryService.assignAsset(
      asset.assetCode,
      assignData.assigneeType,
      assignData.assigneeCode,
      admin?.email || String(admin?.id || '1'),
      assignData.notes
    ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      setShowAssignForm(false);
      setAssignData({ assigneeType: 'MEMBER', assigneeCode: '', notes: '' });
    },
  });

  const returnMutation = useMutation({
    mutationFn: () => inventoryService.returnAsset(
      asset.assetCode,
      admin?.email || String(admin?.id || '1'),
      returnData.returnedToLocationCode,
      returnData.condition,
      returnData.notes
    ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      setShowReturnForm(false);
    },
  });

  const createMaintenanceMutation = useMutation({
    mutationFn: () => inventoryService.createAssetMaintenance({
      assetCode: asset.assetCode,
      maintenanceType: maintenanceData.maintenanceType,
      description: maintenanceData.description,
      scheduledDate: maintenanceData.scheduledDate,
      requestedBy: admin?.email || String(admin?.id || '1'),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset-maintenances'] });
      setShowMaintenanceForm(false);
      setMaintenanceData({ maintenanceType: 'CORRECTIVE', description: '', scheduledDate: '' });
    },
  });

  const reserveMutation = useMutation({
    mutationFn: () => inventoryService.reserveAsset(asset.assetCode, {
      reservedFor: assignData.assigneeCode,
      reason: reserveReason,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      setReserveReason('');
    },
  });

  const markDamagedMutation = useMutation({
    mutationFn: () => inventoryService.markAssetDamaged(asset.assetCode, {
      reason: reserveReason,
      reportedBy: admin?.email || String(admin?.id || '1'),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      setReserveReason('');
    },
  });

  const retireMutation = useMutation({
    mutationFn: () => inventoryService.retireAsset(asset.assetCode, {
      reason: reserveReason,
      reportedBy: admin?.email || String(admin?.id || '1'),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      setReserveReason('');
    },
  });

  const canAssign = asset.status === 'AVAILABLE' || asset.status === 'RESERVED';
  const canReturn = asset.status === 'ASSIGNED' || asset.status === 'IN_USE';
  const canMaintain = asset.status !== 'IN_MAINTENANCE' && asset.status !== 'RETIRED' && asset.status !== 'LOST';
  const canReserve = asset.status === 'AVAILABLE';
  const canMarkDamaged = asset.status !== 'DAMAGED' && asset.status !== 'RETIRED';
  const canRetire = asset.status !== 'RETIRED';

  if (!isOpen) return null;

  return (
    <ModalPortal onClose={onClose} size="2xl">
      <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center rounded-t-2xl">
        <h3 className="text-xl font-bold">{asset.assetCode} - {asset.itemName}</h3>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
          <X size={20} />
        </button>
      </div>

      {/* Onglets */}
      <div className="border-b border-gray-200 px-6">
        <div className="flex space-x-6">
          <button
            onClick={() => setActiveTab('info')}
            className={`py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'info' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500'}`}
          >
            Informations
          </button>
          <button
            onClick={() => setActiveTab('maintenance')}
            className={`py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'maintenance' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500'}`}
          >
            Maintenances
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'history' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500'}`}
          >
            Historique
          </button>
        </div>
      </div>

      <div className="p-6">
        {activeTab === 'info' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Statut</p>
                <p className="font-medium">{statusOptions.find(s => s.value === asset.status)?.label}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Condition</p>
                <p className="font-medium">{asset.condition}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Emplacement</p>
                <p className="font-medium">{asset.locationName}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Numéro de série</p>
                <p className="font-medium">{asset.serialNumber || '-'}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Tag</p>
                <p className="font-medium">{asset.assetTag || '-'}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Coût d'achat</p>
                <p className="font-medium">{asset.purchaseCost.toLocaleString()} FCFA</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Date d'achat</p>
                <p className="font-medium">{asset.purchaseDate ? new Date(asset.purchaseDate).toLocaleDateString('fr-FR') : '-'}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Fin garantie</p>
                <p className="font-medium">{asset.warrantyEndDate ? new Date(asset.warrantyEndDate).toLocaleDateString('fr-FR') : '-'}</p>
              </div>
            </div>

            {asset.notes && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Notes</p>
                <p className="text-sm">{asset.notes}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-3 pt-4 border-t">
              {canAssign && (
                <button onClick={() => setShowAssignForm(!showAssignForm)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  Attribuer
                </button>
              )}
              {canReturn && (
                <button onClick={() => setShowReturnForm(!showReturnForm)} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                  Retourner
                </button>
              )}
              {canMaintain && (
                <button onClick={() => setShowMaintenanceForm(!showMaintenanceForm)} className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700">
                  Maintenance
                </button>
              )}
              {canReserve && (
                <button onClick={() => reserveMutation.mutate()} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                  Réserver
                </button>
              )}
              {canMarkDamaged && (
                <button onClick={() => markDamagedMutation.mutate()} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
                  Marquer endommagé
                </button>
              )}
              {canRetire && (
                <button onClick={() => retireMutation.mutate()} className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">
                  Retirer
                </button>
              )}
            </div>

            {/* Formulaire d'attribution */}
            {showAssignForm && (
              <div className="p-4 bg-gray-50 rounded-lg space-y-3">
                <h4 className="font-medium">Attribuer l'actif</h4>
                <select
                  value={assignData.assigneeType}
                  onChange={(e) => setAssignData({ ...assignData, assigneeType: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="MEMBER">Membre</option>
                  <option value="CUSTOMER">Customer</option>
                  <option value="BUSINESS">Business</option>
                  <option value="ROOM">Salle</option>
                  <option value="LOCATION">Emplacement</option>
                </select>
                <input
                  type="text"
                  placeholder="Code du bénéficiaire (ex: MBR-00001)"
                  value={assignData.assigneeCode}
                  onChange={(e) => setAssignData({ ...assignData, assigneeCode: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
                <textarea
                  placeholder="Notes (optionnel)"
                  value={assignData.notes}
                  onChange={(e) => setAssignData({ ...assignData, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg"
                />
                <div className="flex gap-2">
                  <button onClick={() => setShowAssignForm(false)} className="flex-1 px-4 py-2 border rounded-lg text-gray-700">
                    Annuler
                  </button>
                  <button
                    onClick={() => assignMutation.mutate()}
                    disabled={!assignData.assigneeCode || assignMutation.isPending}
                    className="flex-1 bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50"
                  >
                    {assignMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : 'Attribuer'}
                  </button>
                </div>
              </div>
            )}

            {/* Formulaire maintenance */}
            {showMaintenanceForm && (
              <div className="p-4 bg-gray-50 rounded-lg space-y-3">
                <h4 className="font-medium">Demande de maintenance</h4>
                <select
                  value={maintenanceData.maintenanceType}
                  onChange={(e) => setMaintenanceData({ ...maintenanceData, maintenanceType: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="PREVENTIVE">Préventive</option>
                  <option value="CORRECTIVE">Corrective</option>
                  <option value="INSPECTION">Inspection</option>
                </select>
                <textarea
                  placeholder="Description du problème"
                  value={maintenanceData.description}
                  onChange={(e) => setMaintenanceData({ ...maintenanceData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
                <input
                  type="date"
                  placeholder="Date planifiée"
                  value={maintenanceData.scheduledDate}
                  onChange={(e) => setMaintenanceData({ ...maintenanceData, scheduledDate: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
                <div className="flex gap-2">
                  <button onClick={() => setShowMaintenanceForm(false)} className="flex-1 px-4 py-2 border rounded-lg text-gray-700">
                    Annuler
                  </button>
                  <button
                    onClick={() => createMaintenanceMutation.mutate()}
                    disabled={!maintenanceData.description || createMaintenanceMutation.isPending}
                    className="flex-1 bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50"
                  >
                    {createMaintenanceMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : 'Créer'}
                  </button>
                </div>
              </div>
            )}

            {/* Formulaire de retour */}
            {showReturnForm && (
              <div className="p-4 bg-gray-50 rounded-lg space-y-3">
                <h4 className="font-medium">Retourner l'actif</h4>
                <select
                  value={returnData.returnedToLocationCode}
                  onChange={(e) => setReturnData({ ...returnData, returnedToLocationCode: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  {locations.map((loc: any) => (
                    <option key={loc.locationCode} value={loc.locationCode}>{loc.name}</option>
                  ))}
                </select>
                <select
                  value={returnData.condition}
                  onChange={(e) => setReturnData({ ...returnData, condition: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="NEW">Neuf</option>
                  <option value="GOOD">Bon</option>
                  <option value="FAIR">Correct</option>
                  <option value="POOR">Mauvais</option>
                  <option value="DAMAGED">Endommagé</option>
                </select>
                <textarea
                  placeholder="Notes (optionnel)"
                  value={returnData.notes}
                  onChange={(e) => setReturnData({ ...returnData, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg"
                />
                <div className="flex gap-2">
                  <button onClick={() => setShowReturnForm(false)} className="flex-1 px-4 py-2 border rounded-lg text-gray-700">
                    Annuler
                  </button>
                  <button
                    onClick={() => returnMutation.mutate()}
                    disabled={returnMutation.isPending}
                    className="flex-1 bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50"
                  >
                    {returnMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : 'Retourner'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'maintenance' && (
          <div className="text-center py-8 text-gray-500">
            <Wrench size={48} className="mx-auto mb-4 text-gray-300" />
            <p>Liste des maintenances à venir...</p>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-3">
            {locationHistory && locationHistory.length > 0 ? (
              locationHistory.map((h: any, idx: number) => (
                <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{h.locationName}</p>
                    <p className="text-xs text-gray-500">Déplacé par: {h.movedBy}</p>
                  </div>
                  <p className="text-sm text-gray-500">{new Date(h.movedAt).toLocaleDateString('fr-FR')}</p>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Clock size={48} className="mx-auto mb-4 text-gray-300" />
                <p>Aucun historique de localisation</p>
              </div>
            )}
          </div>
        )}
      </div>
    </ModalPortal>
  );
};