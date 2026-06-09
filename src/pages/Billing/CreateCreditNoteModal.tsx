import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Loader2 } from "lucide-react";
import { billingService } from "../../services/billing.service";
import { useAuth } from "../../contexts/AuthContext";
import { ModalPortal } from "../../components/ui/ModalPortal";

interface CreateCreditNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceNumber: string;
  onSuccess: () => void;
}

export const CreateCreditNoteModal: React.FC<CreateCreditNoteModalProps> = ({
  isOpen,
  onClose,
  invoiceNumber,
  onSuccess,
}) => {
  const { admin } = useAuth();
  const queryClient = useQueryClient();

  const [amount, setAmount] = useState(0);
  const [reason, setReason] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // CORRECTION : reset à chaque ouverture
  useEffect(() => {
    if (isOpen) {
      setAmount(0);
      setReason("");
      setErrorMessage(null);
    }
  }, [isOpen]);

  const createMutation = useMutation({
    mutationFn: () =>
      billingService.createCreditNote(invoiceNumber, {
        amount,
        reason,

        createdBy: admin?.email || String(admin?.id) || "admin",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billing-documents"] });
      queryClient.invalidateQueries({
        queryKey: ["billing-document", invoiceNumber],
      });
      onSuccess();
    },
    onError: (error: any) => {
      setErrorMessage(
        error?.response?.data?.message ||
          "Erreur lors de la création de l'avoir.",
      );
    },
  });

  const handleSubmit = () => {
    if (amount <= 0) {
      setErrorMessage("Le montant doit être supérieur à 0.");
      return;
    }
    if (!reason.trim()) {
      setErrorMessage("Le motif est obligatoire.");
      return;
    }
    setErrorMessage(null);
    createMutation.mutate();
  };

  if (!isOpen) return null;

  return (
    // CORRECTION : ModalPortal au lieu du fixed interne
    <ModalPortal onClose={onClose}>
      <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center rounded-t-2xl">
        <h3 className="text-xl font-bold">Créer un avoir</h3>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
          <X size={20} />
        </button>
      </div>

      <div className="p-6 space-y-4">
        {errorMessage && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
            {errorMessage}
          </div>
        )}

        <div className="bg-gray-50 p-3 rounded-lg text-sm">
          <p className="text-xs text-gray-500 mb-1">Facture concernée</p>
          <p className="font-mono font-medium">{invoiceNumber}</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Montant (FCFA) *
          </label>
          <input
            type="text"
            inputMode="numeric"
            value={amount === 0 ? "" : amount}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, "");
              setAmount(val === "" ? 0 : parseFloat(val));
            }}
            placeholder="25000"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Motif *
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            required
            placeholder="Ex: Annulation de réservation, Erreur de facturation, Correction commerciale..."
            className="w-full px-3 py-2 border border-gray-200 rounded-lg resize-none"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            disabled={createMutation.isPending}
            className="flex-1 px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={createMutation.isPending || amount <= 0 || !reason.trim()}
            className="flex-1 bg-orange-600 text-white py-2 rounded-lg hover:bg-orange-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {createMutation.isPending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              "Créer l'avoir"
            )}
          </button>
        </div>
      </div>
    </ModalPortal>
  );
};
