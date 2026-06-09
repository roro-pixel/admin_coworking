import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle, Loader2, Search } from "lucide-react";
import { paymentService } from "../../services/payment.service";
import type {
  CashAnomalyFlag,
  CashAnomalyReviewStatus,
} from "../../services/payment.service";
import { useAuth } from "../../contexts/AuthContext";

const PAGE_SIZE = 20;
const severityClass: Record<string, string> = {
  LOW: "bg-blue-100 text-blue-700",
  MEDIUM: "bg-yellow-100 text-yellow-700",
  HIGH: "bg-red-100 text-red-700",
};

export const CashAnomaliesPanel: React.FC = () => {
  const { admin } = useAuth();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [sessionNumber, setSessionNumber] = useState("");
  const [registerCode, setRegisterCode] = useState("");
  const [severity, setSeverity] = useState("");
  const [reviewStatus, setReviewStatus] = useState("");
  const [analyzeSession, setAnalyzeSession] = useState("");
  const [reviewNote, setReviewNote] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: [
      "cash-anomalies",
      page,
      sessionNumber,
      registerCode,
      severity,
      reviewStatus,
    ],
    queryFn: () =>
      paymentService.getCashAnomalies({
        sessionNumber: sessionNumber || undefined,
        registerCode: registerCode || undefined,
        severity: severity || undefined,
        reviewStatus: reviewStatus || undefined,
        page,
        size: PAGE_SIZE,
        sort: "createdAt,desc",
      }),
  });
  const anomalies: CashAnomalyFlag[] = data?.content || [];
  const totalPages = data?.totalPages ?? 1;
  const analyzeMutation = useMutation({
    mutationFn: () => paymentService.analyzeCashSession(analyzeSession),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["cash-anomalies"] }),
    onError: () => alert("Erreur lors de l’analyse de session."),
  });
  const reviewMutation = useMutation({
    mutationFn: ({
      flag,
      status,
    }: {
      flag: CashAnomalyFlag;
      status: CashAnomalyReviewStatus;
    }) =>
      paymentService.reviewCashAnomaly(flag.flagNumber, {
        reviewedBy: admin?.email || "admin",
        status,
        note: reviewNote || undefined,
      }),
    onSuccess: () => {
      setReviewNote("");
      queryClient.invalidateQueries({ queryKey: ["cash-anomalies"] });
    },
    onError: () => alert("Erreur lors de la revue."),
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">
          Anomalies de caisse
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Analyse, suivi et revue des anomalies de caisse.
        </p>
      </div>
      <div className="bg-white rounded-xl shadow-sm p-4 grid grid-cols-1 md:grid-cols-5 gap-3">
        <input
          value={sessionNumber}
          onChange={(e) => setSessionNumber(e.target.value)}
          placeholder="Session"
          className="px-3 py-2 border rounded-lg font-mono"
        />
        <input
          value={registerCode}
          onChange={(e) => setRegisterCode(e.target.value)}
          placeholder="Caisse"
          className="px-3 py-2 border rounded-lg font-mono"
        />
        <select
          value={severity}
          onChange={(e) => setSeverity(e.target.value)}
          className="px-3 py-2 border rounded-lg bg-white"
        >
          <option value="">Toutes sévérités</option>
          <option value="LOW">Faible</option>
          <option value="MEDIUM">Moyenne</option>
          <option value="HIGH">Élevée</option>
        </select>
        <select
          value={reviewStatus}
          onChange={(e) => setReviewStatus(e.target.value)}
          className="px-3 py-2 border rounded-lg bg-white"
        >
          <option value="">Tous statuts</option>
          <option value="PENDING">En attente</option>
          <option value="ACKNOWLEDGED">Reconnue</option>
          <option value="FALSE_POSITIVE">Faux positif</option>
          <option value="ESCALATED">Escaladée</option>
          <option value="RESOLVED">Résolue</option>
        </select>
        <div className="flex items-center text-sm text-gray-500 gap-2">
          <Search size={16} /> {data?.totalElements ?? 0} anomalie(s)
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-sm p-4 flex flex-col md:flex-row gap-3 items-end">
        <div className="flex-1">
          <label className="text-sm font-medium">Analyser une session</label>
          <input
            value={analyzeSession}
            onChange={(e) => setAnalyzeSession(e.target.value)}
            placeholder="N° session"
            className="w-full mt-1 px-3 py-2 border rounded-lg font-mono"
          />
        </div>
        <button
          onClick={() => analyzeMutation.mutate()}
          disabled={!analyzeSession || analyzeMutation.isPending}
          className="px-4 py-2 bg-orange-600 text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
        >
          {analyzeMutation.isPending ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <AlertTriangle size={16} />
          )}{" "}
          Lancer analyse
        </button>
      </div>
      <div>
        <label className="text-sm font-medium">Note de revue</label>
        <input
          value={reviewNote}
          onChange={(e) => setReviewNote(e.target.value)}
          className="w-full mt-1 px-3 py-2 border rounded-lg"
          placeholder="Note optionnelle appliquée à la prochaine action de revue"
        />
      </div>
      {isLoading ? (
        <div className="text-center py-8">
          <Loader2 className="animate-spin mx-auto" />
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-sm">Flag</th>
                <th className="px-4 py-3 text-left text-sm">Session</th>
                <th className="px-4 py-3 text-center text-sm">Sévérité</th>
                <th className="px-4 py-3 text-left text-sm">Description</th>
                <th className="px-4 py-3 text-center text-sm">Revue</th>
                <th className="px-4 py-3 text-right text-sm">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {anomalies.map((a) => (
                <tr key={a.flagNumber}>
                  <td className="px-4 py-3 font-mono text-sm">
                    {a.flagNumber}
                  </td>
                  <td className="px-4 py-3 font-mono text-sm">
                    {a.sessionNumber}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${severityClass[a.severity] || "bg-gray-100"}`}
                    >
                      {a.severity}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <p>{a.anomalyType}</p>
                    <p className="text-xs text-gray-500">
                      {a.description || "—"}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-center text-sm">
                    {a.reviewStatus || "PENDING"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() =>
                          reviewMutation.mutate({
                            flag: a,
                            status: "ACKNOWLEDGED",
                          })
                        }
                        className="p-1 text-blue-600"
                        title="Reconnaître"
                      >
                        <CheckCircle size={16} />
                      </button>
                      <button
                        onClick={() =>
                          reviewMutation.mutate({ flag: a, status: "RESOLVED" })
                        }
                        className="p-1 text-green-600"
                        title="Résoudre"
                      >
                        <CheckCircle size={16} />
                      </button>
                      <button
                        onClick={() =>
                          reviewMutation.mutate({
                            flag: a,
                            status: "FALSE_POSITIVE",
                          })
                        }
                        className="p-1 text-gray-500"
                        title="Faux positif"
                      >
                        FP
                      </button>
                      <button
                        onClick={() =>
                          reviewMutation.mutate({
                            flag: a,
                            status: "ESCALATED",
                          })
                        }
                        className="p-1 text-orange-600"
                        title="Escalader"
                      >
                        <AlertTriangle size={16} />
                      </button>
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
    </div>
  );
};
