import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Loader2, TrendingDown, TrendingUp } from "lucide-react";
import { paymentService } from "../../services/payment.service";
import type { CashSession } from "../../services/payment.service";
import { useAuth } from "../../contexts/AuthContext";

const initial = {
  kind: "ENTRY" as "ENTRY" | "EXIT",
  sessionNumber: "",
  amount: 0,
  reason: "",
  documentNumber: "",
  flowCategory: "",
  referenceType: "",
  referenceCode: "",
  counterpartyType: "",
  counterpartyCode: "",
  counterpartyName: "",
  metadataJson: "",
};

export const CashVouchersPanel: React.FC = () => {
  const { admin } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(initial);
  const [createdMovement, setCreatedMovement] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const { data: sessionsData } = useQuery({
    queryKey: ["cash-sessions-open-select"],
    queryFn: () =>
      paymentService.getCashSessions({ status: "OPEN", size: 100 }),
  });
  const sessions: CashSession[] = sessionsData?.content || [];
  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        amount: form.amount,
        reason: form.reason,
        documentNumber: form.documentNumber || undefined,
        flowCategory: form.flowCategory || undefined,
        referenceType: form.referenceType || undefined,
        referenceCode: form.referenceCode || undefined,
        counterpartyType: form.counterpartyType || undefined,
        counterpartyCode: form.counterpartyCode || undefined,
        counterpartyName: form.counterpartyName || undefined,
        metadataJson: form.metadataJson || undefined,
        createdBy: admin?.email || "admin",
      };
      return form.kind === "ENTRY"
        ? paymentService.createEntryVoucher(form.sessionNumber, payload)
        : paymentService.createExitVoucher(form.sessionNumber, payload);
    },
    onSuccess: (movement) => {
      setCreatedMovement(movement);
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["cash-movements"] });
    },
    onError: (e: any) =>
      setError(
        e?.response?.data?.message || "Erreur lors de la création du bon.",
      ),
  });

  const submit = () => {
    if (!form.sessionNumber) return setError("La session est obligatoire.");
    if (form.amount <= 0)
      return setError("Le montant doit être supérieur à 0.");
    if (!form.reason.trim()) return setError("Le motif est obligatoire.");
    mutation.mutate();
  };

  const download = async () => {
    if (!createdMovement?.movementNumber) return;
    const blob = await paymentService.getCashMovementDocumentPdf(
      createdMovement.movementNumber,
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${form.kind === "ENTRY" ? "bon_entree" : "bon_sortie"}_${createdMovement.movementNumber}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Bons de caisse</h2>
        <p className="text-sm text-gray-500 mt-1">
          Création de bons d’entrée et de bons de sortie à partir des APIs
          dédiées.
        </p>
      </div>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}
      <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium">Type de bon</label>
            <select
              value={form.kind}
              onChange={(e) =>
                setForm({ ...form, kind: e.target.value as any })
              }
              className="w-full mt-1 px-3 py-2 border rounded-lg bg-white"
            >
              <option value="ENTRY">Bon d’entrée</option>
              <option value="EXIT">Bon de sortie</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Session *</label>
            <select
              value={form.sessionNumber}
              onChange={(e) =>
                setForm({ ...form, sessionNumber: e.target.value })
              }
              className="w-full mt-1 px-3 py-2 border rounded-lg bg-white"
            >
              <option value="">Sélectionner</option>
              {sessions.map((s) => (
                <option key={s.sessionNumber} value={s.sessionNumber}>
                  {s.sessionNumber} — {s.registerCode}
                </option>
              ))}
            </select>
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
        <div>
          <label className="text-sm font-medium">Motif *</label>
          <textarea
            rows={3}
            value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
            className="w-full mt-1 px-3 py-2 border rounded-lg"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            placeholder="N° document"
            value={form.documentNumber}
            onChange={(e) =>
              setForm({ ...form, documentNumber: e.target.value })
            }
            className="px-3 py-2 border border-gray-200 rounded-xl"
          />
          <input
            placeholder="Catégorie flux"
            value={form.flowCategory}
            onChange={(e) => setForm({ ...form, flowCategory: e.target.value })}
            className="px-3 py-2 border border-gray-200 rounded-xl"
          />
          <input
            placeholder="Type référence"
            value={form.referenceType}
            onChange={(e) =>
              setForm({ ...form, referenceType: e.target.value })
            }
            className="px-3 py-2 border border-gray-200 rounded-xl"
          />
          <input
            placeholder="Code référence"
            value={form.referenceCode}
            onChange={(e) =>
              setForm({ ...form, referenceCode: e.target.value })
            }
            className="px-3 py-2 border border-gray-200 rounded-xl"
          />
          <input
            placeholder="Type contrepartie"
            value={form.counterpartyType}
            onChange={(e) =>
              setForm({ ...form, counterpartyType: e.target.value })
            }
            className="px-3 py-2 border border-gray-200 rounded-xl"
          />
          <input
            placeholder="Nom contrepartie"
            value={form.counterpartyName}
            onChange={(e) =>
              setForm({ ...form, counterpartyName: e.target.value })
            }
            className="px-3 py-2 border border-gray-200 rounded-xl"
          />
        </div>
        <textarea
          placeholder="Métadonnées JSON"
          rows={3}
          value={form.metadataJson}
          onChange={(e) => setForm({ ...form, metadataJson: e.target.value })}
          className="w-full px-3 py-2 border rounded-lg font-mono text-sm"
        />
        <button
          onClick={submit}
          disabled={mutation.isPending}
          className={`px-4 py-2 text-white rounded-lg flex items-center gap-2 ${form.kind === "ENTRY" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"} disabled:opacity-50`}
        >
          {mutation.isPending ? (
            <Loader2 size={16} className="animate-spin" />
          ) : form.kind === "ENTRY" ? (
            <TrendingUp size={16} />
          ) : (
            <TrendingDown size={16} />
          )}{" "}
          Créer le bon
        </button>
      </div>
      {createdMovement && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex justify-between items-center">
          <div>
            <p className="font-semibold text-green-800">
              Bon créé : {createdMovement.movementNumber}
            </p>
            <p className="text-sm text-green-700">
              Montant :{" "}
              {(createdMovement.amount ?? form.amount).toLocaleString("fr-FR")}{" "}
              FCFA
            </p>
          </div>
          <button
            onClick={download}
            className="px-3 py-2 bg-white border rounded-lg flex items-center gap-2 text-sm"
          >
            <Download size={15} /> PDF
          </button>
        </div>
      )}
    </div>
  );
};
