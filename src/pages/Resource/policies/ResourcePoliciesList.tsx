import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Search, Shield, ToggleLeft, ToggleRight } from "lucide-react";
import { resourceService } from "../../../services/resource.service";
import type { ResourcePolicyResponse } from "../../../services/resource.service";
import { ResourcePolicyFormModal } from "./ResourcePolicyFormModal";

const formatDuration = (minutes: number): string => {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h${mins}` : `${hours}h`;
};

export const ResourcePoliciesList: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: policiesData, isLoading } = useQuery({
    queryKey: ["resource-policies"],
    queryFn: () => resourceService.getResourcePolicies({ size: 500 }),
  });

  const deleteMutation = useMutation({
    mutationFn: (code: string) => resourceService.deleteResourcePolicy(code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resource-policies"] });
      queryClient.invalidateQueries({ queryKey: ["resource-policies-list"] });
    },
    onError: () => alert("Erreur lors de la suppression. Cette politique est peut-être utilisée."),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ code, active }: { code: string; active: boolean }) =>
      resourceService.updateResourcePolicyStatus(code, active),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resource-policies"] });
      queryClient.invalidateQueries({ queryKey: ["resource-policies-list"] });
    },
    onError: () => alert("Erreur lors de la mise à jour du statut."),
  });

  const toggleCancellationMutation = useMutation({
    mutationFn: ({ code, allowCancellation }: { code: string; allowCancellation: boolean }) =>
      resourceService.updateResourcePolicyAllowCancellation(code, allowCancellation),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resource-policies"] });
      queryClient.invalidateQueries({ queryKey: ["resource-policies-list"] });
    },
    onError: () => alert("Erreur lors de la mise à jour de l'autorisation d'annulation."),
  });

  const policies: ResourcePolicyResponse[] = policiesData?.content || [];
  const filteredPolicies = search
    ? policies.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()) || p.code.toLowerCase().includes(search.toLowerCase()))
    : policies;

  const handleDelete = (code: string) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer cette politique ?")) deleteMutation.mutate(code);
  };

  if (isLoading) return <div className="text-center py-8">Chargement...</div>;

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Politiques de réservation</h2>
          <p className="mt-1 text-sm text-gray-500">Définissez les durées, préavis et règles d’annulation des ressources.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700">
          <Plus size={18} /> Nouvelle politique
        </button>
      </div>

      <div className="mb-6 grid gap-3 md:grid-cols-3">
        <Metric label="Politiques" value={policies.length} />
        <Metric label="Actives" value={policies.filter((p) => p.active).length} />
        <Metric label="Annulation autorisée" value={policies.filter((p) => p.allowCancellation).length} />
      </div>

      <div className="mb-6 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Rechercher par nom ou code..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100" />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-y-2">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-gray-400">
              <th className="px-4 py-2 text-left font-semibold">Politique</th>
              <th className="px-4 py-2 text-center font-semibold">Durée min</th>
              <th className="px-4 py-2 text-center font-semibold">Durée max</th>
              <th className="px-4 py-2 text-center font-semibold">Préavis</th>
              <th className="px-4 py-2 text-center font-semibold">Annulation</th>
              <th className="px-4 py-2 text-center font-semibold">Statut</th>
              <th className="px-4 py-2 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredPolicies.map((policy) => (
              <tr key={policy.code} onClick={() => navigate(`/resources/policies/${policy.code}`)} className={`cursor-pointer bg-white shadow-sm ring-1 ring-gray-100 transition hover:-translate-y-0.5 hover:shadow-md ${!policy.active ? "opacity-60" : ""}`}>
                <td className="rounded-l-2xl px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-primary-50 p-2 text-primary-600"><Shield size={18} /></div>
                    <div>
                      <p className="font-medium text-gray-900">{policy.name}</p>
                      <p className="font-mono text-xs text-gray-400">{policy.code}</p>
                      {policy.description && <p className="mt-1 line-clamp-1 text-xs text-gray-500">{policy.description}</p>}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4 text-center text-sm font-medium text-gray-700">{formatDuration(policy.minBookingDurationMinutes)}</td>
                <td className="px-4 py-4 text-center text-sm font-medium text-gray-700">{formatDuration(policy.maxBookingDurationMinutes)}</td>
                <td className="px-4 py-4 text-center text-sm text-gray-600">{formatDuration(policy.minBookingNoticeMinutes)}</td>
                <td className="px-4 py-4 text-center">
                  <button onClick={(e) => { e.stopPropagation(); toggleCancellationMutation.mutate({ code: policy.code, allowCancellation: !policy.allowCancellation }); }} className={`rounded-full px-2.5 py-1 text-xs font-medium ${policy.allowCancellation ? "bg-green-50 text-green-700" : "bg-gray-50 text-gray-500"}`}>{policy.allowCancellation ? "Autorisée" : "Bloquée"}</button>
                </td>
                <td className="px-4 py-4 text-center">
                  <button onClick={(e) => { e.stopPropagation(); toggleStatusMutation.mutate({ code: policy.code, active: !policy.active }); }} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${policy.active ? "bg-green-50 text-green-700" : "bg-gray-50 text-gray-500"}`}>{policy.active ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}{policy.active ? "Active" : "Inactive"}</button>
                </td>
                <td className="rounded-r-2xl px-4 py-4 text-right">
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(policy.code); }} className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredPolicies.length === 0 && <div className="rounded-2xl bg-white p-12 text-center shadow-sm ring-1 ring-gray-100"><Shield size={42} className="mx-auto mb-3 text-gray-300" /><p className="font-medium text-gray-700">Aucune politique trouvée</p></div>}

      <ResourcePolicyFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} editingPolicy={null} onSuccess={() => setIsModalOpen(false)} />
    </div>
  );
};

const Metric: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
    <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</p>
    <p className="mt-1 text-2xl font-bold text-gray-900">{value.toLocaleString("fr-FR")}</p>
  </div>
);
