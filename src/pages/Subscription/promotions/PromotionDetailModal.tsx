import React from 'react';
import { X, Calendar, Users, Tag, Percent, DollarSign, Gift, FileText, Play, CheckCircle, XCircle } from 'lucide-react';
import type { Promotion } from '../../../services/subscription.service';
import { ModalPortal } from '../../../components/ui/ModalPortal';

interface PromotionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  promotion: Promotion;
  onActivate: () => void;
}

const discountTypeIcons: Record<string, React.ReactNode> = {
  PERCENTAGE: <Percent size={16} />,
  FIXED_AMOUNT: <DollarSign size={16} />,
  FREE_ENTITLEMENT: <Gift size={16} />,
  WAIVE_SETUP_FEE: <FileText size={16} />,
};

const discountTypeLabels: Record<string, string> = {
  PERCENTAGE: 'Pourcentage',
  FIXED_AMOUNT: 'Montant fixe',
  FREE_ENTITLEMENT: 'Droit gratuit',
  WAIVE_SETUP_FEE: "Frais d'installation offerts",
};

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  DRAFT: { label: 'Brouillon', color: 'text-gray-700', bg: 'bg-gray-100' },
  ACTIVE: { label: 'Active', color: 'text-green-700', bg: 'bg-green-100' },
  EXPIRED: { label: 'Expirée', color: 'text-gray-500', bg: 'bg-gray-100' },
  CANCELLED: { label: 'Annulée', color: 'text-red-700', bg: 'bg-red-100' },
};

export const PromotionDetailModal: React.FC<PromotionDetailModalProps> = ({
  isOpen,
  onClose,
  promotion,
  onActivate,
}) => {
  if (!isOpen) return null;

  const getDiscountValueDisplay = () => {
    if (promotion.discountType === 'PERCENTAGE') return `${promotion.discountValue}%`;
    if (promotion.discountType === 'FIXED_AMOUNT') return `${promotion.discountValue.toLocaleString('fr-FR')} FCFA`;
    return String(promotion.discountValue);
  };

  const isActive = promotion.status === 'ACTIVE';
  const isDraft = promotion.status === 'DRAFT';
  const isExpired = promotion.status === 'EXPIRED';
  const isCancelled = promotion.status === 'CANCELLED';

  // CORRECTION : utilise ModalPortal au lieu d'un fixed interne
  return (
    <ModalPortal onClose={onClose}>
      <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center rounded-t-2xl">
        <div className="flex items-center gap-2">
          <Tag size={20} className="text-primary-600" />
          <h3 className="text-xl font-bold">{promotion.name}</h3>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
          <X size={20} />
        </button>
      </div>

      <div className="p-6 space-y-4">
        {/* Code */}
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-500">Code promotionnel</p>
          <p className="font-mono text-sm font-medium">{promotion.code}</p>
        </div>

        {/* Badge statut */}
        <div className="flex justify-center">
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${statusConfig[promotion.status]?.bg} ${statusConfig[promotion.status]?.color}`}>
            {isActive && <CheckCircle size={14} />}
            {(isExpired || isCancelled) && <XCircle size={14} />}
            {isDraft && <Tag size={14} />}
            <span>{statusConfig[promotion.status]?.label}</span>
          </div>
        </div>

        {/* Description */}
        {promotion.description && (
          <div>
            <p className="text-xs text-gray-500 mb-1">Description</p>
            <p className="text-sm text-gray-700">{promotion.description}</p>
          </div>
        )}

        {/* Type et valeur */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-500 mb-1">Type de réduction</p>
            <div className="flex items-center gap-1">
              {discountTypeIcons[promotion.discountType]}
              <span className="text-sm font-medium">{discountTypeLabels[promotion.discountType]}</span>
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Valeur</p>
            <p className="text-sm font-medium">{getDiscountValueDisplay()}</p>
          </div>
        </div>

        {/* Période */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-500 mb-1">Date de début</p>
            <div className="flex items-center gap-1">
              <Calendar size={14} className="text-gray-400" />
              <span className="text-sm">{new Date(promotion.startsAt).toLocaleDateString('fr-FR')}</span>
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Date de fin</p>
            <div className="flex items-center gap-1">
              <Calendar size={14} className="text-gray-400" />
              <span className="text-sm">
                {promotion.endsAt
                  ? new Date(promotion.endsAt).toLocaleDateString('fr-FR')
                  : 'Illimitée'}
              </span>
            </div>
          </div>
        </div>

        {/* Utilisations */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-500 mb-1">Utilisations</p>
            <div className="flex items-center gap-1">
              <Users size={14} className="text-gray-400" />
              <span className="text-sm">
                {promotion.redeemedCount} / {promotion.maxRedemptions || '∞'}
              </span>
            </div>
            {/* Barre de progression si maxRedemptions défini */}
            {promotion.maxRedemptions && promotion.maxRedemptions > 0 && (
              <div className="mt-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-500 rounded-full"
                  style={{ width: `${Math.min(100, (promotion.redeemedCount / promotion.maxRedemptions) * 100)}%` }}
                />
              </div>
            )}
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Statut</p>
            <span className={`px-2 py-0.5 rounded-full text-xs ${statusConfig[promotion.status]?.bg} ${statusConfig[promotion.status]?.color}`}>
              {statusConfig[promotion.status]?.label}
            </span>
          </div>
        </div>

        {/* Bannières état */}
        {isActive && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
            <p className="text-sm text-green-700 flex items-center justify-center gap-2">
              <CheckCircle size={16} />
              Cette promotion est active et peut être utilisée
            </p>
          </div>
        )}
        {(isExpired || isCancelled) && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
            <p className="text-sm text-red-700 flex items-center justify-center gap-2">
              <XCircle size={16} />
              {isExpired ? "Cette promotion a expiré et n'est plus utilisable" : "Cette promotion a été annulée"}
            </p>
          </div>
        )}

        {/* Métadonnées */}
        {promotion.metadataJson && (
          <div>
            <p className="text-xs text-gray-500 mb-1">Métadonnées</p>
            <pre className="text-xs bg-gray-50 p-2 rounded-lg overflow-x-auto">
              {(() => {
                try { return JSON.stringify(JSON.parse(promotion.metadataJson), null, 2); }
                catch { return promotion.metadataJson; }
              })()}
            </pre>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t">
          {isDraft && (
            <button
              onClick={onActivate}
              className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
            >
              <Play size={16} />
              Activer la promotion
            </button>
          )}
          {(isActive || isExpired || isCancelled) && (
            <div className="flex-1 text-center text-sm text-gray-500 py-2">
              {isActive ? 'Promotion active — Aucune action disponible' :
               isExpired ? 'Promotion expirée' : 'Promotion annulée'}
            </div>
          )}
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Fermer
          </button>
        </div>
      </div>
    </ModalPortal>
  );
};