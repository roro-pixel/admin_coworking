import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle,
  Download,
  Loader2,
  Plus,
  Search,
  XCircle,
} from "lucide-react";
import { paymentService } from "../../services/payment.service";
import type {
  CashRequest,
  CashRequestType,
  CashSession,
} from "../../services/payment.service";
import { useAuth } from "../../contexts/AuthContext";
import { ModalPortal } from '../../components/ui/ModalPortal';

const PAGE_SIZE = 20;
const statusLabels: Record<string, string> = {
  PENDING: "En attente",
  APPROVED: "Approuvée",
  REJECTED: "Rejetée",
  EXECUTED: "Exécutée",
  CANCELLED: "Annulée",
};
const typeLabels: Record<string, string> = {
  JUSTIFICATIF: "Justificatif",
  REMISE_DE_FONDS: "Remise de fonds",
  CASH_ADVANCE: "Avance caisse",
  EXPENSE_REIMBURSEMENT: "Remboursement dépense",
};

export const CashRequestsList: React.FC = () => {
  const { admin } = useAuth();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [sessionNumber, setSessionNumber] = useState("");
  const [status, setStatus] = useState("");
  const [requestType, setRequestType] = useState("");
  const [searchText, setSearchText] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [reviewNote, setReviewNote] = useState("");
  const [form, setForm] = useState({
    sessionNumber: "",
    requestType: "JUSTIFICATIF" as CashRequestType,
    amount: 0,
    currency: "XAF",
    reason: "",
  });
  const [error, setError] = useState<string | null>(null);

  const { data: sessionsData } = useQuery({
    queryKey: ["cash-sessions-open-select"],
    queryFn: () =>
      paymentService.getCashSessions({ status: "OPEN", size: 100 }),
  });
  const sessions: CashSession[] = sessionsData?.content || [];
  const { data, isLoading } = useQuery({
    queryKey: [
      "cash-requests",
      page,
      sessionNumber,
      status,
      requestType,
      searchText,
    ],
    queryFn: () =>
      paymentService.getCashRequests({
        sessionNumber: sessionNumber || undefined,
        status: status || undefined,
        requestType: requestType || undefined,
        searchText: searchText || undefined,
        page,
        size: PAGE_SIZE,
        sort: "createdAt,desc",
      }),
  });
  const requests: CashRequest[] = data?.content || [];
  const totalPages = data?.totalPages ?? 1;

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["cash-requests"] });
  const createMutation = useMutation({
    mutationFn: () =>
      paymentService.createCashRequest(form.sessionNumber, {
        requestType: form.requestType,
        amount: form.amount,
        currency: form.currency,
        reason: form.reason,
        requestedBy: admin?.email || "admin",
      }),
    onSuccess: () => {
      invalidate();
      setIsFormOpen(false);
      setError(null);
      setForm({
        sessionNumber: "",
        requestType: "JUSTIFICATIF",
        amount: 0,
        currency: "XAF",
        reason: "",
      });
    },
    onError: (e: any) =>
      setError(
        e?.response?.data?.message ||
          "Erreur lors de la création de la demande.",
      ),
  });
  const approveMutation = useMutation({
    mutationFn: (r: CashRequest) =>
      paymentService.approveCashRequest(r.requestNumber, {
        reviewedBy: admin?.email || "admin",
        note: reviewNote || undefined,
      }),
    onSuccess: () => {
      invalidate();
      setReviewNote("");
    },
    onError: () => alert("Erreur lors de l’approbation."),
  });
  const rejectMutation = useMutation({
    mutationFn: (r: CashRequest) =>
      paymentService.rejectCashRequest(r.requestNumber, {
        reviewedBy: admin?.email || "admin",
        note: reviewNote || undefined,
      }),
    onSuccess: () => {
      invalidate();
      setReviewNote("");
    },
    onError: () => alert("Erreur lors du rejet."),
  });
  const downloadPdf = async (requestNumber: string) => {
    const blob = await paymentService.getCashRequestDocumentPdf(requestNumber);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `demande_caisse_${requestNumber}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Demandes de caisse
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Création, validation, rejet et génération PDF des demandes.
          </p>
        </div>
        <button
          onClick={() => setIsFormOpen(true)}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg flex items-center gap-2"
        >
          <Plus size={16} /> Nouvelle demande
        </button>
      </div>
      <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-4 grid grid-cols-1 md:grid-cols-5 gap-3">
        <input
          value={searchText}
          onChange={(e) => {
            setSearchText(e.target.value);
            setPage(0);
          }}
          placeholder="Recherche"
          className="px-3 py-2 border border-gray-200 rounded-xl"
        />
        <select
          value={sessionNumber}
          onChange={(e) => {
            setSessionNumber(e.target.value);
            setPage(0);
          }}
          className="px-3 py-2 border border-gray-200 rounded-xl bg-white"
        >
          <option value="">Toutes sessions</option>
          {sessions.map((s) => (
            <option key={s.sessionNumber} value={s.sessionNumber}>
              {s.sessionNumber}
            </option>
          ))}
        </select>
        <select
          value={requestType}
          onChange={(e) => {
            setRequestType(e.target.value);
            setPage(0);
          }}
          className="px-3 py-2 border border-gray-200 rounded-xl bg-white"
        >
          <option value="">Tous types</option>
          {Object.entries(typeLabels).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(0);
          }}
          className="px-3 py-2 border border-gray-200 rounded-xl bg-white"
        >
          <option value="">Tous statuts</option>
          {Object.entries(statusLabels).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Search size={16} /> {data?.totalElements ?? 0} résultat(s)
        </div>
      </div>
      {isLoading ? (
        <div className="text-center py-8">
          <Loader2 className="animate-spin mx-auto" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 overflow-hidden">
          <table className="w-full border-separate border-spacing-y-2">
            <thead className="bg-gray-50/70">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Demande</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Session</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Type</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Montant</th>
                <th className="px-4 py-3 text-center text-sm">Statut</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.requestNumber}>
                  <td className="px-4 py-3">
                    <p className="font-mono text-sm">{r.requestNumber}</p>
                    <p className="text-xs text-gray-500">{r.reason}</p>
                  </td>
                  <td className="px-4 py-3 text-sm font-mono">
                    {r.sessionNumber}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {typeLabels[r.requestType] || r.requestType}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">
                    {(r.amount ?? 0).toLocaleString("fr-FR")} {r.currency}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-xs px-2 py-1 rounded-full bg-gray-100">
                      {statusLabels[r.status] || r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => downloadPdf(r.requestNumber)}
                        className="p-1 text-gray-600"
                      >
                        <Download size={16} />
                      </button>
                      {r.status === "PENDING" && (
                        <>
                          <button
                            onClick={() => approveMutation.mutate(r)}
                            className="p-1 text-green-600"
                          >
                            <CheckCircle size={16} />
                          </button>
                          <button
                            onClick={() => rejectMutation.mutate(r)}
                            className="p-1 text-red-600"
                          >
                            <XCircle size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="flex justify-end gap-2">
        <button
          disabled={page <= 0}
          onClick={() => setPage((p) => p - 1)}
          className="px-3 py-1 border rounded disabled:opacity-50"
        >
          Précédent
        </button>
        <span className="px-3 py-1 text-sm">
          {page + 1}/{Math.max(totalPages, 1)}
        </span>
        <button
          disabled={page + 1 >= totalPages}
          onClick={() => setPage((p) => p + 1)}
          className="px-3 py-1 border rounded disabled:opacity-50"
        >
          Suivant
        </button>
      </div>
      {isFormOpen && (
  <ModalPortal
    size="lg"
    onClose={() => setIsFormOpen(false)}
  >
    <div className="border-b px-6 py-4">
      <h3 className="text-lg font-semibold">
        Nouvelle demande de caisse
      </h3>
    </div>

    <div className="p-6 space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
          {error}
        </div>
      )}

      <select
        value={form.sessionNumber}
        onChange={(e) =>
          setForm({
            ...form,
            sessionNumber: e.target.value,
          })
        }
        className="w-full px-3 py-2 border rounded-lg bg-white"
      >
        <option value="">Session</option>
        {sessions.map((s) => (
          <option key={s.sessionNumber} value={s.sessionNumber}>
            {s.sessionNumber}
          </option>
        ))}
      </select>

      <select
        value={form.requestType}
        onChange={(e) =>
          setForm({
            ...form,
            requestType: e.target.value as CashRequestType,
          })
        }
        className="w-full px-3 py-2 border rounded-lg bg-white"
      >
        {Object.entries(typeLabels).map(([k, v]) => (
          <option key={k} value={k}>
            {v}
          </option>
        ))}
      </select>

      <input
        type="number"
        value={form.amount}
        onChange={(e) =>
          setForm({
            ...form,
            amount: Number(e.target.value) || 0,
          })
        }
        className="w-full px-3 py-2 border rounded-lg"
        placeholder="Montant"
      />

      <input
        value={form.currency}
        onChange={(e) =>
          setForm({
            ...form,
            currency: e.target.value,
          })
        }
        className="w-full px-3 py-2 border rounded-lg"
      />

      <textarea
        value={form.reason}
        onChange={(e) =>
          setForm({
            ...form,
            reason: e.target.value,
          })
        }
        rows={4}
        className="w-full px-3 py-2 border rounded-lg"
        placeholder="Motif"
      />

      <div className="flex justify-end gap-3 pt-4 border-t">
        <button
          onClick={() => setIsFormOpen(false)}
          className="px-4 py-2 border border-gray-200 rounded-xl"
        >
          Annuler
        </button>

        <button
          onClick={() => createMutation.mutate()}
          disabled={createMutation.isPending}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg disabled:opacity-50"
        >
          Créer
        </button>
      </div>
    </div>
  </ModalPortal>
)}
    </div>
  );
};
