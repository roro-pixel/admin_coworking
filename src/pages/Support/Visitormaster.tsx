import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Search,
  LogIn,
  LogOut,
  Loader2,
  Users,
  QrCode,
  ChevronLeft,
  ChevronRight,
  ScanLine,
  UserPlus,
  ClipboardList,
  X,
} from "lucide-react";
import { operationsService } from "../../services/operations.service";
import type {
  VisitorPass,
  VisitorPassStatus,
} from "../../services/operations.service";
import { useAuth } from "../../contexts/AuthContext";

const statusConfig: Record<
  VisitorPassStatus,
  { label: string; color: string }
> = {
  SCHEDULED: { label: "Planifié", color: "bg-blue-100 text-blue-700" },
  CHECKED_IN: { label: "Présent", color: "bg-green-100 text-green-700" },
  CHECKED_OUT: { label: "Parti", color: "bg-gray-100 text-gray-600" },
  CANCELLED: { label: "Annulé", color: "bg-red-100 text-red-700" },
  EXPIRED: { label: "Expiré", color: "bg-orange-100 text-orange-700" },
};

type SubTab = "today" | "all" | "checkin" | "create" | "log";

export const VisitorMaster: React.FC = () => {
  const { admin, hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<SubTab>("today");
  const [visitedTabs, setVisitedTabs] = useState<Set<SubTab>>(
    new Set(["today"]),
  );
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<VisitorPassStatus | "">("");
  const [page, setPage] = useState(0);
  const [actionError, setActionError] = useState<string | null>(null);

  const [checkPassNumber, setCheckPassNumber] = useState("");
  const [checkNotes, setCheckNotes] = useState("");
  const [checkResult, setCheckResult] = useState<VisitorPass | null>(null);

  const [createForm, setCreateForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    company: "",
    hostMemberCode: "",
    hostName: "",
    validFrom: "",
    validUntil: "",
    purpose: "",
  });

  const switchTab = (tab: SubTab) => {
    setActiveTab(tab);
    setVisitedTabs((prev) => new Set([...prev, tab]));
    setActionError(null);
  };

  useEffect(() => {
    if (activeTab !== "create") return;
    setCreateForm({
      fullName: "",
      email: "",
      phone: "",
      company: "",
      hostMemberCode: "",
      hostName: "",
      validFrom: "",
      validUntil: "",
      purpose: "",
    });
  }, [activeTab]);

  const { data: todayPasses = [], isLoading: todayLoading } = useQuery({
    queryKey: ["visitor-today"],
    queryFn: () => operationsService.getVisitorPassesToday(),
    enabled: visitedTabs.has("today"),
  });

  const { data: allPassesData, isLoading: allLoading } = useQuery({
    queryKey: ["visitor-passes", statusFilter, page],
    queryFn: () =>
      operationsService.getVisitorPasses({
        status: statusFilter || undefined,
        page,
        size: 20,
      }),
    enabled: visitedTabs.has("all"),
  });

  const { data: logData, isLoading: logLoading } = useQuery({
    queryKey: ["visitor-log", page],
    queryFn: () => operationsService.getVisitorLog({ page, size: 20 }),
    enabled: visitedTabs.has("log"),
  });

  const allPasses = allPassesData?.content || [];
  const logEntries = logData?.content || [];
  const totalPagesAll = allPassesData?.totalPages ?? 0;
  const totalPagesLog = logData?.totalPages ?? 0;

  const filteredAll = search
    ? allPasses.filter(
        (p) =>
          p.fullName.toLowerCase().includes(search.toLowerCase()) ||
          p.passNumber.toLowerCase().includes(search.toLowerCase()),
      )
    : allPasses;

  const createMutation = useMutation({
    mutationFn: () =>
      operationsService.createVisitorPass({
        ...createForm,
        createdBy: admin?.email || "admin",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["visitor-today"] });
      queryClient.invalidateQueries({ queryKey: ["visitor-passes"] });
      switchTab("today");
    },
    onError: (e: any) =>
      setActionError(e?.response?.data?.message || "Erreur création pass"),
  });

  const checkInMutation = useMutation({
    mutationFn: () =>
      operationsService.checkIn(checkPassNumber, {
        agent: admin?.email || "admin",
        notes: checkNotes || undefined,
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["visitor-today"] });
      queryClient.invalidateQueries({ queryKey: ["visitor-passes"] });
      queryClient.invalidateQueries({ queryKey: ["visitor-log"] });
      setCheckResult(data);
    },
    onError: (e: any) =>
      setActionError(e?.response?.data?.message || "Erreur check-in"),
  });

  const checkOutMutation = useMutation({
    mutationFn: () =>
      operationsService.checkOut(checkPassNumber, {
        agent: admin?.email || "admin",
        notes: checkNotes || undefined,
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["visitor-today"] });
      queryClient.invalidateQueries({ queryKey: ["visitor-passes"] });
      queryClient.invalidateQueries({ queryKey: ["visitor-log"] });
      setCheckResult(data);
    },
    onError: (e: any) =>
      setActionError(e?.response?.data?.message || "Erreur check-out"),
  });

  const tabs: {
    id: SubTab;
    label: string;
    icon: React.ElementType;
    permission?: string;
  }[] = [
    {
      id: "today",
      label: `Aujourd'hui (${todayPasses.length})`,
      icon: Users,
      permission: "VISITOR:READ",
    },
    {
      id: "all",
      label: "Tous les passes",
      icon: ClipboardList,
      permission: "VISITOR:READ",
    },
    {
      id: "checkin",
      label: "Check-in/out",
      icon: ScanLine,
      permission: "VISITOR:CHECKIN",
    },
    {
      id: "create",
      label: "Nouveau pass",
      icon: UserPlus,
      permission: "VISITOR:WRITE",
    },
    {
      id: "log",
      label: "Journal",
      icon: ClipboardList,
      permission: "VISITOR:READ",
    },
  ];

  const visibleTabs = tabs.filter(
    (tab) => !tab.permission || hasPermission(tab.permission),
  );

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-4">
        Gestion des visiteurs
      </h2>

      <div className="overflow-x-auto mb-6 rounded-2xl bg-white p-1.5 shadow-sm ring-1 ring-gray-100 flex flex-wrap gap-1">
        {visibleTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => switchTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium rounded-xl transition-colors flex items-center gap-1.5 ${
              activeTab === tab.id
                ? "bg-primary-600 text-white shadow-sm"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            }`}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {actionError && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm flex justify-between">
          {actionError}
          <button
            onClick={() => setActionError(null)}
            className="ml-2 font-bold"
          >
            {" "}
            <X size={14} />
          </button>
        </div>
      )}

      {/* Aujourd'hui */}
      {activeTab === "today" && (
        <div>
          {todayLoading ? (
            <div className="text-center py-8">Chargement...</div>
          ) : (
            <div className="space-y-3">
              {todayPasses.length === 0 && (
                <div className="text-center py-12 bg-white rounded-xl">
                  <Users size={48} className="mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">Aucun visiteur aujourd'hui</p>
                </div>
              )}
              {todayPasses.map((pass) => (
                <div
                  key={pass.passNumber}
                  className="bg-white rounded-xl p-4 shadow-sm flex items-center justify-between"
                >
                  <div>
                    <p className="font-semibold">{pass.fullName}</p>
                    {pass.company && (
                      <p className="text-sm text-gray-500">{pass.company}</p>
                    )}
                    {pass.hostName && (
                      <p className="text-xs text-gray-400">
                        Hôte: {pass.hostName}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 font-mono mt-1">
                      {pass.passNumber}
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${statusConfig[pass.status]?.color}`}
                    >
                      {statusConfig[pass.status]?.label}
                    </span>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(pass.validFrom).toLocaleTimeString("fr-FR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {" — "}
                      {new Date(pass.validUntil).toLocaleTimeString("fr-FR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tous les passes */}
      {activeTab === "all" && (
        <div>
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="flex-1 min-w-48 relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Rechercher..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 ring-1 ring-gray-100 rounded-lg text-sm"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as any);
                setPage(0);
              }}
              className="px-3 py-2 ring-1 ring-gray-100 rounded-lg bg-white text-sm"
            >
              <option value="">Tous les statuts</option>
              {(Object.keys(statusConfig) as VisitorPassStatus[]).map((s) => (
                <option key={s} value={s}>
                  {statusConfig[s].label}
                </option>
              ))}
            </select>
          </div>
          {allLoading ? (
            <div className="text-center py-8">Chargement...</div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-100 overflow-hidden">
              <table className="w-full border-separate border-spacing-y-2">
                <thead className="bg-transparent">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold">
                      Pass
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">
                      Visiteur
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">
                      Hôte
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">
                      Validité
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">
                      Statut
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y-0">
                  {filteredAll.map((pass) => (
                    <tr key={pass.passNumber} className="bg-gray-50/70 hover:bg-gray-100">
                      <td className="px-4 py-3 text-sm font-mono">
                        {pass.passNumber}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium">{pass.fullName}</p>
                        {pass.company && (
                          <p className="text-xs text-gray-400">
                            {pass.company}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {pass.hostName || "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        <p>
                          {new Date(pass.validFrom).toLocaleString("fr-FR")}
                        </p>
                        <p>
                          → {new Date(pass.validUntil).toLocaleString("fr-FR")}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs ${statusConfig[pass.status]?.color}`}
                        >
                          {statusConfig[pass.status]?.label}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredAll.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  Aucun pass trouvé
                </div>
              )}
            </div>
          )}
          {totalPagesAll > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="p-2 border rounded-lg disabled:opacity-50"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="px-3 py-2 text-sm text-gray-600">
                Page {page + 1} / {totalPagesAll}
              </span>
              <button
                onClick={() =>
                  setPage((p) => Math.min(totalPagesAll - 1, p + 1))
                }
                disabled={page >= totalPagesAll - 1}
                className="p-2 border rounded-lg disabled:opacity-50"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Check-in / Check-out desk */}
      {activeTab === "checkin" && (
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-xl p-6 shadow-sm space-y-4">
            <div className="text-center">
              <QrCode size={48} className="mx-auto text-primary-600 mb-2" />
              <h3 className="font-semibold text-gray-900">Guichet d'accueil</h3>
              <p className="text-sm text-gray-500">
                Saisir le numéro de pass ou scanner le QR code
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                N° de pass *
              </label>
              <input
                type="text"
                value={checkPassNumber}
                onChange={(e) => {
                  setCheckPassNumber(e.target.value);
                  setCheckResult(null);
                }}
                placeholder="VIS-..."
                className="w-full px-3 py-2 ring-1 ring-gray-100 rounded-lg font-mono"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <input
                type="text"
                value={checkNotes}
                onChange={(e) => setCheckNotes(e.target.value)}
                placeholder="Badge remis, observation..."
                className="w-full px-3 py-2 ring-1 ring-gray-100 rounded-lg"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => checkInMutation.mutate()}
                disabled={!checkPassNumber || checkInMutation.isPending}
                className="bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {checkInMutation.isPending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <LogIn size={16} />
                )}
                Check-in
              </button>
              <button
                onClick={() => checkOutMutation.mutate()}
                disabled={!checkPassNumber || checkOutMutation.isPending}
                className="bg-orange-600 text-white py-2 rounded-lg hover:bg-orange-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {checkOutMutation.isPending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <LogOut size={16} />
                )}
                Check-out
              </button>
            </div>
            {checkResult && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm">
                <p className="font-medium text-green-700 flex items-center gap-1">
                  <LogIn size={14} /> {checkResult.fullName}
                </p>
                <p className="text-green-600">
                  Statut : {statusConfig[checkResult.status]?.label}
                </p>
                {checkResult.checkedInAt && (
                  <p className="text-xs text-gray-500">
                    Entrée :{" "}
                    {new Date(checkResult.checkedInAt).toLocaleTimeString(
                      "fr-FR",
                    )}
                  </p>
                )}
                {checkResult.checkedOutAt && (
                  <p className="text-xs text-gray-500">
                    Sortie :{" "}
                    {new Date(checkResult.checkedOutAt).toLocaleTimeString(
                      "fr-FR",
                    )}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Création pass */}
      {activeTab === "create" && (
        <div className="max-w-lg mx-auto bg-white rounded-xl p-6 shadow-sm space-y-4">
          <h3 className="font-semibold text-gray-900 mb-2">
            Nouveau pass visiteur
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom complet *
              </label>
              <input
                type="text"
                value={createForm.fullName}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, fullName: e.target.value }))
                }
                className="w-full px-3 py-2 ring-1 ring-gray-100 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={createForm.email}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, email: e.target.value }))
                }
                className="w-full px-3 py-2 ring-1 ring-gray-100 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Téléphone
              </label>
              <input
                type="tel"
                value={createForm.phone}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, phone: e.target.value }))
                }
                className="w-full px-3 py-2 ring-1 ring-gray-100 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Entreprise
              </label>
              <input
                type="text"
                value={createForm.company}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, company: e.target.value }))
                }
                className="w-full px-3 py-2 ring-1 ring-gray-100 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Code hôte membre
              </label>
              <input
                type="text"
                value={createForm.hostMemberCode}
                onChange={(e) =>
                  setCreateForm((f) => ({
                    ...f,
                    hostMemberCode: e.target.value,
                  }))
                }
                placeholder="MBR-000001"
                className="w-full px-3 py-2 ring-1 ring-gray-100 rounded-lg"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom hôte
              </label>
              <input
                type="text"
                value={createForm.hostName}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, hostName: e.target.value }))
                }
                className="w-full px-3 py-2 ring-1 ring-gray-100 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Valide du *
              </label>
              <input
                type="datetime-local"
                value={createForm.validFrom}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, validFrom: e.target.value }))
                }
                className="w-full px-3 py-2 ring-1 ring-gray-100 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Valide jusqu'au *
              </label>
              <input
                type="datetime-local"
                value={createForm.validUntil}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, validUntil: e.target.value }))
                }
                className="w-full px-3 py-2 ring-1 ring-gray-100 rounded-lg"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Objet de la visite
              </label>
              <input
                type="text"
                value={createForm.purpose}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, purpose: e.target.value }))
                }
                placeholder="Rendez-vous commercial, livraison..."
                className="w-full px-3 py-2 ring-1 ring-gray-100 rounded-lg"
              />
            </div>
          </div>
          <button
            onClick={() => createMutation.mutate()}
            disabled={
              !createForm.fullName ||
              !createForm.validFrom ||
              !createForm.validUntil ||
              createMutation.isPending
            }
            className="w-full bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {createMutation.isPending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Plus size={16} />
            )}
            Créer le pass
          </button>
        </div>
      )}

      {/* Journal */}
      {activeTab === "log" && (
        <div>
          {logLoading ? (
            <div className="text-center py-8">Chargement...</div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-100 overflow-hidden">
              <table className="w-full border-separate border-spacing-y-2">
                <thead className="bg-transparent">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold">
                      Date/Heure
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">
                      Visiteur
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">
                      Événement
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">
                      Agent
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">
                      Notes
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y-0">
                  {logEntries.map((entry) => (
                    <tr key={entry.id} className="bg-gray-50/70 hover:bg-gray-100">
                      <td className="px-4 py-3 text-sm">
                        {new Date(entry.eventAt).toLocaleString("fr-FR")}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium">{entry.fullName}</p>
                        <p className="text-xs font-mono text-gray-400">
                          {entry.passNumber}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs ${entry.eventType === "CHECK_IN" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}
                        >
                          {entry.eventType === "CHECK_IN" ? "Entrée" : "Sortie"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">{entry.agent}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {entry.notes || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {logEntries.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  Aucune entrée
                </div>
              )}
            </div>
          )}
          {totalPagesLog > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="p-2 border rounded-lg disabled:opacity-50"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="px-3 py-2 text-sm text-gray-600">
                Page {page + 1} / {totalPagesLog}
              </span>
              <button
                onClick={() =>
                  setPage((p) => Math.min(totalPagesLog - 1, p + 1))
                }
                disabled={page >= totalPagesLog - 1}
                className="p-2 border rounded-lg disabled:opacity-50"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
