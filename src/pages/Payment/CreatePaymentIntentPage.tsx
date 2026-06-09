import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { paymentService } from "../../services/payment.service";
import { useAuth } from "../../contexts/AuthContext";

export const CreatePaymentIntentPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { admin } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    customerType: "MEMBER",
    customerCode: "",
    amount: 0,
    currency: "XAF",
    purpose: "Paiement",
    sourceType: "MANUAL",
    sourceCode: "",
    description: "",
    expiresAt: "",
    metadataJson: "",
  });

  const mutation = useMutation({
    mutationFn: () =>
      paymentService.createPaymentIntent({
        customerType: form.customerType,
        customerCode: form.customerCode,
        amount: form.amount,
        currency: form.currency,
        purpose: form.purpose,
        sourceType: form.sourceType,
        sourceCode: form.sourceCode || undefined,
        description: form.description || undefined,
        expiresAt: form.expiresAt || undefined,
        metadataJson: form.metadataJson || undefined,
        createdBy: admin?.email || "admin",
        idempotencyKey: `manual-payment-${Date.now()}`,
      }),
    onSuccess: (intent) => {
      queryClient.invalidateQueries({ queryKey: ["payment-intents"] });
      navigate(`/payments/${intent.intentNumber}`, { replace: true });
    },
    onError: (e: any) =>
      setError(
        e?.response?.data?.message ||
          "Erreur lors de la création de l’intention.",
      ),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customerCode.trim())
      return setError("Le code client est obligatoire.");
    if (form.amount <= 0)
      return setError("Le montant doit être supérieur à 0.");
    setError(null);
    mutation.mutate();
  };

  return (
    <div className="max-w-4xl mx-auto">
      <button
        onClick={() => navigate("/payments")}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft size={18} /> Retour
      </button>
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Nouvelle intention de paiement
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Création manuelle d’une intention hors facture.
        </p>
        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}
        <form onSubmit={submit} className="mt-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium">Type client *</label>
              <select
                value={form.customerType}
                onChange={(e) =>
                  setForm({ ...form, customerType: e.target.value })
                }
                className="w-full mt-1 px-3 py-2 border rounded-lg bg-white"
              >
                <option value="MEMBER">Membre</option>
                <option value="CUSTOMER">Client</option>
                <option value="BUSINESS_ENTITY">Business entity</option>
                <option value="EXTERNAL">Externe</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Code client *</label>
              <input
                value={form.customerCode}
                onChange={(e) =>
                  setForm({ ...form, customerCode: e.target.value })
                }
                className="w-full mt-1 px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Montant *</label>
              <input
                type="number"
                min={1}
                value={form.amount}
                onChange={(e) =>
                  setForm({ ...form, amount: Number(e.target.value) || 0 })
                }
                className="w-full mt-1 px-3 py-2 border rounded-lg"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium">Devise</label>
              <input
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
                className="w-full mt-1 px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Objet</label>
              <input
                value={form.purpose}
                onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                className="w-full mt-1 px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Expiration</label>
              <input
                type="datetime-local"
                value={form.expiresAt}
                onChange={(e) =>
                  setForm({ ...form, expiresAt: e.target.value })
                }
                className="w-full mt-1 px-3 py-2 border rounded-lg"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Source type</label>
              <input
                value={form.sourceType}
                onChange={(e) =>
                  setForm({ ...form, sourceType: e.target.value })
                }
                className="w-full mt-1 px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Source code</label>
              <input
                value={form.sourceCode}
                onChange={(e) =>
                  setForm({ ...form, sourceCode: e.target.value })
                }
                className="w-full mt-1 px-3 py-2 border rounded-lg"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Description</label>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              rows={3}
              className="w-full mt-1 px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Métadonnées JSON</label>
            <textarea
              value={form.metadataJson}
              onChange={(e) =>
                setForm({ ...form, metadataJson: e.target.value })
              }
              rows={3}
              className="w-full mt-1 px-3 py-2 border rounded-lg font-mono text-sm"
            />
          </div>
          <div className="flex justify-end gap-3 border-t pt-4">
            <button
              type="button"
              onClick={() => navigate("/payments")}
              className="px-4 py-2 border rounded-lg"
            >
              Annuler
            </button>
            <button
              disabled={mutation.isPending}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
            >
              {mutation.isPending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Save size={16} />
              )}{" "}
              Créer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
