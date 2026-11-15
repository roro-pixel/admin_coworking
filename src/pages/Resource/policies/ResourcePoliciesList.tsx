import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban, ChevronRight, Plus, Power, ShieldCheck, Trash2 } from "lucide-react";
import { resourceService } from "../../../services/resource.service";
import type { ResourcePolicyResponse } from "../../../services/resource.service";
import { ActionButton, DataCard, EmptyState, ErrorBlock, HeadRow, IconButton, ListHeader, PanelForm, Pagination, SearchField, StatusChip } from "../../../components/subscription/kit";
import { ROW_HOVER, apiMessage } from "../../../components/subscription/kitUtils";
import { ListSkeleton } from "../../../components/ui/Skeleton";
import { toast } from "../../../components/ui/toastStore";
import { Cell, formatDuration, useDebounced } from "../../../components/resources/resKit";
import { POLICY_DEFAULTS, PolicyFields, policyError, policyPayload } from "../../../components/resources/PolicyFields";
import type { PolicyForm } from "../../../components/resources/PolicyFields";

const COLS = "lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1.2fr)_8rem_7rem_auto]";
const SIZE = 15;

export const ResourcePoliciesList: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [creating, setCreating] = useState<PolicyForm | null>(null);
  const [error, setError] = useState<string | null>(null);
  const q = useDebounced(search.trim());

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["resource-policies", page, q],
    queryFn: () => (q ? resourceService.searchResourcePolicies(q, { page, size: SIZE }) : resourceService.getResourcePolicies({ page, size: SIZE })),
  });
  const policies = data?.content ?? [];
  const total = data?.totalElements ?? 0;

  const invalidate = () => Promise.all([queryClient.invalidateQueries({ queryKey: ["resource-policies"] }), queryClient.invalidateQueries({ queryKey: ["resource-policies-list"] })]);
  const create = useMutation({
    mutationFn: () => resourceService.createResourcePolicy(policyPayload(creating!)),
    onSuccess: async () => {
      toast.success("Politique créée");
      await invalidate();
      setCreating(null);
      setError(null);
    },
    onError: (e) => setError(apiMessage(e, "Création impossible")),
  });
  const toggleStatus = useMutation({
    mutationFn: (p: ResourcePolicyResponse) => resourceService.updateResourcePolicyStatus(p.code, !p.active),
    onSuccess: invalidate,
    onError: (e) => toast.error(apiMessage(e, "Changement d'état impossible")),
  });
  const toggleCancel = useMutation({
    mutationFn: (p: ResourcePolicyResponse) => resourceService.updateResourcePolicyAllowCancellation(p.code, !p.allowCancellation),
    onSuccess: invalidate,
    onError: (e) => toast.error(apiMessage(e, "Modification de l'annulation impossible")),
  });
  const remove = useMutation({ mutationFn: (code: string) => resourceService.deleteResourcePolicy(code), onSuccess: invalidate });

  return (
    <div className="space-y-5">
      <ListHeader
        title="Politiques de réservation"
        subtitle={isLoading ? undefined : `${total} politique${total > 1 ? "s" : ""}: durées, préavis et règles d'annulation`}
        action={<ActionButton icon={Plus} onClick={() => { setError(null); setCreating({ ...POLICY_DEFAULTS }); }}>Nouvelle politique</ActionButton>}
      />

      {creating && (
        <PanelForm
          title="Nouvelle politique de réservation"
          onCancel={() => setCreating(null)}
          pending={create.isPending}
          submitLabel="Créer"
          submitDisabled={!creating.name.trim()}
          error={error}
          onSubmit={(e) => {
            e.preventDefault();
            const msg = policyError(creating);
            if (msg) return setError(msg);
            setError(null);
            create.mutate();
          }}
        >
          <PolicyFields value={creating} onChange={(patch) => setCreating((p) => (p ? { ...p, ...patch } : p))} />
        </PanelForm>
      )}

      <SearchField value={search} onChange={(v) => { setSearch(v); setPage(0); }} placeholder="Nom ou code de la politique" />

      {isLoading ? (
        <ListSkeleton rows={6} />
      ) : isError ? (
        <ErrorBlock message="Impossible de charger les politiques." onRetry={() => refetch()} />
      ) : policies.length === 0 ? (
        <EmptyState icon={ShieldCheck} title="Aucune politique" hint={q ? "Aucun résultat pour cette recherche." : "Créez la première politique de réservation."} />
      ) : (
        <>
          <HeadRow cols={COLS}>
            <span>Politique</span>
            <span>Durée de réservation</span>
            <span>Préavis</span>
            <span>État</span>
            <span className="text-right">Actions</span>
          </HeadRow>
          <DataCard>
            {policies.map((p) => (
              <div key={p.code} className={`rounded-2xl max-lg:mb-2 max-lg:bg-gray-50 ${ROW_HOVER}`}>
                <div onClick={() => navigate(`/resources/policies/${p.code}`)} className={`grid cursor-pointer grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 p-4 ${COLS}`}>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-900">{p.name}</p>
                    <p className="font-mono text-xs text-gray-400">{p.code}</p>
                  </div>
                  <Cell title="Durée" className="max-lg:order-3 max-lg:col-span-2">
                    <span className="text-sm text-gray-700">
                      {formatDuration(p.minBookingDurationMinutes)} à {formatDuration(p.maxBookingDurationMinutes)}
                    </span>
                  </Cell>
                  <Cell title="Préavis" className="max-lg:order-4 max-lg:col-span-2">
                    <span className="text-sm text-gray-700">{formatDuration(p.minBookingNoticeMinutes) || "Aucun"}</span>
                  </Cell>
                  <div className="flex flex-wrap gap-1.5 max-lg:order-2 max-lg:justify-self-end">
                    <StatusChip tone={p.active ? "success" : "neutral"}>{p.active ? "Active" : "Inactive"}</StatusChip>
                  </div>
                  <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-1 max-lg:order-5 max-lg:col-span-2 lg:justify-end">
                    <IconButton icon={Ban} label={p.allowCancellation ? "Bloquer l'annulation" : "Autoriser l'annulation"} tone={p.allowCancellation ? "success" : "neutral"} pending={toggleCancel.isPending && toggleCancel.variables?.code === p.code} onClick={() => toggleCancel.mutate(p)} />
                    <IconButton icon={Power} label={p.active ? "Désactiver" : "Activer"} tone={p.active ? "success" : "neutral"} pending={toggleStatus.isPending && toggleStatus.variables?.code === p.code} onClick={() => toggleStatus.mutate(p)} />
                    <IconButton
                      icon={Trash2}
                      label="Supprimer"
                      tone="danger"
                      onClick={() =>
                        toast.confirm({
                          message: `Supprimer la politique « ${p.name} » ?`,
                          detail: "La suppression échoue si des ressources l'utilisent.",
                          confirmLabel: "Supprimer",
                          pendingLabel: "Suppression",
                          successMessage: "Politique supprimée",
                          errorMessage: "Suppression impossible : la politique est probablement utilisée",
                          onConfirm: () => remove.mutateAsync(p.code),
                        })
                      }
                    />
                    <ChevronRight size={16} className="ml-1 hidden text-gray-300 lg:block" />
                  </div>
                </div>
              </div>
            ))}
          </DataCard>
          <Pagination page={page} totalPages={data?.totalPages ?? 1} total={total} noun="politique" onChange={setPage} />
        </>
      )}
    </div>
  );
};
