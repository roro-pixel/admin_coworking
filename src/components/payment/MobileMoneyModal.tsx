import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Loader2, Smartphone, AlertCircle, CheckCircle } from 'lucide-react';
import { paymentService } from '../../services/payment.service';
import type { PaymentIntent } from '../../services/payment.service';
import { ModalPortal } from '../../components/ui/ModalPortal';
import { useAuth } from '../../contexts/AuthContext';

interface MobileMoneyModalProps {
  isOpen: boolean;
  onClose: () => void;
  intent: PaymentIntent;
  onPaymentSuccess?: (transactionNumber: string) => void;
}

export const MobileMoneyModal: React.FC<MobileMoneyModalProps> = ({
  isOpen,
  onClose,
  intent,
  onPaymentSuccess,
}) => {
  const { admin } = useAuth();
  const queryClient = useQueryClient();

  const [phoneNumber, setPhoneNumber] = useState('');
  const [correspondent, setCorrespondent] = useState('');
  const [amount, setAmount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  const { data: providers = [], isLoading: providersLoading } = useQuery({
    queryKey: ['mobile-money-providers'],
    queryFn: () => paymentService.getMobileMoneyProviders(),
    enabled: isOpen,
  });

  const depositMutation = useMutation({
    mutationFn: () => paymentService.initiateMobileMoneyDeposit({
      intentNumber: intent.intentNumber,
      phoneNumber,
      correspondent,
      amount: amount > 0 ? amount : undefined,
      createdBy: admin?.email || 'admin',
    }),
    onSuccess: (data) => {
      setResult(data);
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['payment-intents'] });
      if (data.transactionNumber && onPaymentSuccess) {
        onPaymentSuccess(data.transactionNumber);
      }
    },
    onError: (err: any) => {
      setError(err?.response?.data?.message || 'Erreur lors de l\'initiation du paiement.');
    },
  });

  const handleSubmit = () => {
    if (!phoneNumber.trim()) {
      setError('Le numéro de téléphone est obligatoire.');
      return;
    }
    if (!correspondent) {
      setError('Veuillez sélectionner un provider.');
      return;
    }
    setError(null);
    depositMutation.mutate();
  };

  if (!isOpen) return null;

  return (
    <ModalPortal onClose={onClose}>
      <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center rounded-t-2xl">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <Smartphone size={20} />
          Paiement Mobile Money
        </h3>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
          <X size={20} />
        </button>
      </div>

      <div className="p-6 space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm flex items-start gap-2">
            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
            {error}
          </div>
        )}

        {result ? (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded-lg text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle size={16} className="text-green-600" />
                <span>Paiement initié avec succès</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Statut</p>
                <p className="font-medium text-yellow-600">{result.status}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Provider</p>
                <p className="font-medium">{result.provider}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Montant</p>
                <p className="font-bold">{result.amount?.toLocaleString('fr-FR')} {result.currency}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Transaction</p>
                <p className="font-mono text-sm">{result.transactionNumber}</p>
              </div>
              {result.depositId && (
                <div className="p-3 bg-gray-50 rounded-lg col-span-2">
                  <p className="text-xs text-gray-500">ID Dépôt PawaPay</p>
                  <p className="font-mono text-xs">{result.depositId}</p>
                </div>
              )}
            </div>

            {result.customerMessage && (
              <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
                <p className="text-xs text-blue-500">Message</p>
                <p>{result.customerMessage}</p>
              </div>
            )}

            <button
              onClick={onClose}
              className="w-full bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700"
            >
              Fermer
            </button>
          </div>
        ) : (
          <>
            <div className="bg-gray-50 p-3 rounded-lg text-sm">
              <p>Intention : <span className="font-mono font-medium">{intent.intentNumber}</span></p>
              <p>Montant : <span className="font-bold">{intent.amount.toLocaleString('fr-FR')} {intent.currency}</span></p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Provider *</label>
              {providersLoading ? (
                <div className="text-center py-2">
                  <Loader2 size={14} className="animate-spin mx-auto" />
                </div>
              ) : (
                <select
                  value={correspondent}
                  onChange={(e) => setCorrespondent(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                >
                  <option value="">Sélectionner un provider</option>
                  {providers.map((p) => (
                    <option key={p.code} value={p.code}>
                      {p.displayName} ({p.countryCode})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Numéro de téléphone *</label>
              <input
                type="text"
                inputMode="numeric"
                value={phoneNumber}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  setPhoneNumber(val);
                }}
                placeholder="242061135836"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg font-mono"
              />
              <p className="text-xs text-gray-400 mt-1">Format international sans "+"</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Montant (laisser vide = montant total)
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={amount === 0 ? '' : amount}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  setAmount(val === '' ? 0 : parseInt(val));
                }}
                placeholder={`Total : ${intent.amount.toLocaleString('fr-FR')} ${intent.currency}`}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
              />
              <p className="text-xs text-gray-400 mt-1">
                Si vide, le backend utilisera le solde restant de l'intention
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={onClose}
                disabled={depositMutation.isPending}
                className="flex-1 px-4 py-2 border rounded-lg text-gray-700 disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={handleSubmit}
                disabled={depositMutation.isPending || !phoneNumber.trim() || !correspondent}
                className="flex-1 bg-yellow-600 text-white py-2 rounded-lg hover:bg-yellow-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {depositMutation.isPending ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <>
                    <Smartphone size={16} /> Initier le paiement
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </ModalPortal>
  );
};