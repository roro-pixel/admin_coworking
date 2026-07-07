import React, { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Archive,
  CheckCircle2,
  Eye,
  EyeOff,
  Plus,
  Search,
  Ticket,
} from "lucide-react";
import { subscriptionService } from "../../../services/subscription.service";
import type {
  PassPlanResponse,
  PassPlanStatus,
  PassType,
} from "../../../services/subscription.service";
import { PassPlanFormModal } from "./PassPlanFormModal";
import { PurchasePassModal } from "./PurchasePassModal";

const passTypes: { value: "" | PassType; label: string }[] = [
  { value: "", label: "Tous types" },
  { value: "DAY_PASS", label: "Pass journée" },
  { value: "TIME_PACK", label: "Pack heures" },
  { value: "MEETING_ROOM_PACK", label: "Pack salle" },
  { value: "COMPANY_SHARED_PASS", label: "Entreprise" },
  { value: "CUSTOM", label: "Custom" },
];
const statuses: { value: "" | PassPlanStatus; label: string }[] = [
  { value: "", label: "Tous statuts" },
  { value: "DRAFT", label: "Brouillon" },
  { value: "ACTIVE", label: "Actif" },
  { value: "ARCHIVED", label: "Archivé" },
];
const statusClass: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  ACTIVE: "bg-green-50 text-green-700",
  ARCHIVED: "bg-red-50 text-red-700",
};

export const PassPlansList: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState<"" | PassPlanStatus>("");
  const [passType, setPassType] = useState<"" | PassType>("");
  const [page, setPage] = useState(0);
  const [editingPlan, setEditingPlan] = useState<PassPlanResponse | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [purchasePlan, setPurchasePlan] = useState<PassPlanResponse | null>(
    null,
  );
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);
  const { data, isLoading } = useQuery({
    queryKey: ["pass-plans", status, passType, debouncedSearch, page],
    queryFn: () =>
      subscriptionService.getPassPlans({
        status: status || undefined,
        passType: passType || undefined,
        searchText: debouncedSearch || undefined,
        page,
        size: 20,
        sort: "sortOrder,asc",
      }),
  });
  const publishMutation = useMutation({
    mutationFn: (code: string) => subscriptionService.publishPassPlan(code),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["pass-plans"] }),
  });
  const archiveMutation = useMutation({
    mutationFn: (code: string) => subscriptionService.archivePassPlan(code),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["pass-plans"] }),
  });
  const plans = data?.content || [];
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Plans de pass</h2>
          <p className="mt-1 text-sm text-gray-500">
            Catalogue, versions, prix, droits et achat depuis un plan.
          </p>
        </div>
        <button
          onClick={() => {
            setEditingPlan(null);
            setIsFormOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-medium text-white"
        >
          <Plus size={18} /> Nouveau plan
        </button>
      </div>
      <div className="grid gap-3 md:grid-cols-[1fr_220px_220px]">
        <div className="relative">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un plan..."
            className="w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-4"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as any)}
          className="rounded-xl border border-gray-200 px-3 py-2.5"
        >
          {statuses.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <select
          value={passType}
          onChange={(e) => setPassType(e.target.value as any)}
          className="rounded-xl border border-gray-200 px-3 py-2.5"
        >
          {passTypes.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
      {isLoading ? (
        <div className="py-10 text-center text-gray-500">Chargement...</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {plans.map((plan) => (
            <article
              key={plan.code}
              className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-100"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-lg font-semibold text-gray-950">
                    {plan.name}
                  </p>
                  <p className="mt-1 font-mono text-xs text-gray-400">
                    {plan.code}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass[plan.status] ?? "bg-gray-100"}`}
                >
                  {plan.status}
                </span>
              </div>
              <p className="mt-3 line-clamp-2 min-h-[40px] text-sm text-gray-500">
                {plan.description || "Aucune description."}
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-gray-50 px-2.5 py-1 text-gray-600">
                  {plan.passType}
                </span>
                <span className="rounded-full bg-gray-50 px-2.5 py-1 text-gray-600">
                  {plan.targetAudience}
                </span>
                <span className="rounded-full bg-gray-50 px-2.5 py-1 text-gray-600">
                  KYC {plan.requiredKycLevel}
                </span>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 ${plan.visible ? "bg-blue-50 text-blue-700" : "bg-gray-50 text-gray-500"}`}
                >
                  {plan.visible ? <Eye size={12} /> : <EyeOff size={12} />}{" "}
                  {plan.visible ? "Visible" : "Masqué"}
                </span>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-2">
                <button
                  onClick={() =>
                    navigate(`/subscriptions/pass-plans/${plan.code}`)
                  }
                  className="rounded-xl bg-gray-950 px-3 py-2 text-sm font-medium text-white"
                >
                  Détail
                </button>
                <button
                  onClick={() => setPurchasePlan(plan)}
                  className="rounded-xl bg-primary-600 px-3 py-2 text-sm font-medium text-white"
                >
                  <Ticket size={14} className="inline" /> Achat
                </button>
                <button
                  onClick={() => {
                    setEditingPlan(plan);
                    setIsFormOpen(true);
                  }}
                  className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700"
                >
                  Modifier
                </button>
                <button
                  onClick={() => publishMutation.mutate(plan.code)}
                  className="rounded-xl border border-green-100 bg-green-50 px-3 py-2 text-sm font-medium text-green-700"
                >
                  <CheckCircle2 size={14} className="inline" /> Publier
                </button>
                <button
                  onClick={() => archiveMutation.mutate(plan.code)}
                  className="col-span-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm font-medium text-red-700"
                >
                  <Archive size={14} className="inline" /> Archiver
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
      {!isLoading && plans.length === 0 && (
        <div className="rounded-3xl bg-white p-12 text-center text-gray-500 ring-1 ring-gray-100">
          Aucun plan trouvé.
        </div>
      )}
      <div className="flex items-center justify-between rounded-2xl bg-white p-3 ring-1 ring-gray-100">
        <button
          disabled={page === 0}
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          className="rounded-xl px-3 py-2 text-sm disabled:opacity-40"
        >
          Précédent
        </button>
        <span className="text-sm text-gray-500">
          Page {page + 1} / {data?.totalPages || 1}
        </span>
        <button
          disabled={page + 1 >= (data?.totalPages || 1)}
          onClick={() => setPage((p) => p + 1)}
          className="rounded-xl px-3 py-2 text-sm disabled:opacity-40"
        >
          Suivant
        </button>
      </div>
      <PassPlanFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingPlan(null);
        }}
        editingPlan={editingPlan}
        onSuccess={() => {
          setIsFormOpen(false);
          setEditingPlan(null);
        }}
      />
      <PurchasePassModal
        isOpen={!!purchasePlan}
        plan={purchasePlan}
        onClose={() => setPurchasePlan(null)}
        onSuccess={(passNumber) => {
          setPurchasePlan(null);
          navigate(`/subscriptions/passes/${passNumber}`);
        }}
      />
    </div>
  );
};
