import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban, Clock, Pencil, ShieldCheck, ShieldOff } from "lucide-react";
import { resourceService } from "../../../services/resource.service";
import { ActionButton, Detail, EmptyState, PageHeader, PanelForm, Section, StatusChip, Switch } from "../../../components/subscription/kit";
import { apiMessage } from "../../../components/subscription/kitUtils";
import { DetailsSkeleton } from "../../../components/ui/Skeleton";
import { toast } from "../../../components/ui/toastStore";
import { DetailShell, formatDuration } from "../../../components/resources/resKit";
import { PolicyFields, policyError, policyPayload, policyToForm } from "../../../components/resources/PolicyFields";
import type { PolicyForm } from "../../../components/resources/PolicyFields";

export const ResourcePolicyDetailPage: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<PolicyForm | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: policy, isLoading, isError } = useQuery({
    queryKey: ["resource-policy", code],
    queryFn: () => resourceService.getResourcePolicy(code!),
    enabled: !!code,
  });
  useEffect(() => {
    setForm(null);
  }, [code]);

  const refresh = () =>
    Promise.all(
      [["resource-policy", code], ["resource-policies"], ["resource-policies-list"]].map((queryKey) => queryClient.invalidateQueries({ queryKey })),
    );
  const update = useMutation({
    mutationFn: () => resourceService.updateResourcePolicy(code!, policyPayload(form!)),
    onSuccess: async () => {
      toast.success("Politique modifiée");
      await refresh();
      setForm(null);
      setError(null);
    },
    onError: (e) => setError(apiMessage(e, "Modification impossible")),
  });
  const toggleStatus = useMutation({
    mutationFn: (active: boolean) => resourceService.updateResourcePolicyStatus(code!, active),
    onSuccess: refresh,
    onError: (e) => toast.error(apiMessage(e, "Changement d'état impossible")),
  });
  const toggleCancel = useMutation({
    mutationFn: (allowed: boolean) => resourceService.updateResourcePolicyAllowCancellation(code!, allowed),
    onSuccess: refresh,
    onError: (e) => toast.error(apiMessage(e, "Modification de l'annulation impossible")),
  });

  const back = () => navigate("/resources", { state: { activeTab: "policies" } });

  if (isLoading) return <DetailShell><DetailsSkeleton /></DetailShell>;
  if (isError || !policy) {
    return (
      <DetailShell>
        <EmptyState icon={ShieldOff} title="Politique introuvable" hint="Elle a peut-être été supprimée." action={<ActionButton onClick={back}>Retour aux politiques</ActionButton>} />
      </DetailShell>
    );
  }

  return (
    <DetailShell>
      <PageHeader
        title={policy.name}
        subtitle={<span className="font-mono">{policy.code}</span>}
        onBack={back}
        backLabel="Retour aux politiques"
        badge={<StatusChip tone={policy.active ? "success" : "neutral"}>{policy.active ? "Active" : "Inactive"}</StatusChip>}
        actions={!form && <ActionButton icon={Pencil} onClick={() => { setError(null); setForm(policyToForm(policy)); }}>Modifier</ActionButton>}
      />

      {form ? (
        <PanelForm
          title="Modifier la politique"
          onCancel={() => setForm(null)}
          pending={update.isPending}
          submitLabel="Enregistrer"
          submitDisabled={!form.name.trim()}
          error={error}
          onSubmit={(e) => {
            e.preventDefault();
            const msg = policyError(form);
            if (msg) return setError(msg);
            setError(null);
            update.mutate();
          }}
        >
          <PolicyFields value={form} onChange={(patch) => setForm((p) => (p ? { ...p, ...patch } : p))} />
        </PanelForm>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Switch checked={policy.active} onChange={(v) => toggleStatus.mutate(v)} label="Politique active" hint="Désactivée, elle n'est plus proposée aux ressources." />
            <Switch checked={policy.allowCancellation} onChange={(v) => toggleCancel.mutate(v)} label="Annulation autorisée" hint="Bloquée, les réservations ne peuvent plus être annulées." />
          </div>
          <Section title="Durées" icon={Clock}>
            <div className="grid gap-4 sm:grid-cols-3">
              <Detail label="Durée minimale">{formatDuration(policy.minBookingDurationMinutes)}</Detail>
              <Detail label="Durée maximale">{formatDuration(policy.maxBookingDurationMinutes)}</Detail>
              <Detail label="Préavis de réservation">{formatDuration(policy.minBookingNoticeMinutes) || "Aucun"}</Detail>
            </div>
          </Section>
          <Section title="Annulation" icon={Ban}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Detail label="Annulation">{policy.allowCancellation ? "Autorisée" : "Bloquée"}</Detail>
              <Detail label="Délai d'annulation">{policy.allowCancellation ? formatDuration(policy.cancellationNoticeMinutes) || "Aucun délai" : "Sans objet"}</Detail>
            </div>
          </Section>
          <Section title="Description" icon={ShieldCheck}>
            <p className="text-sm text-gray-700">{policy.description || "Aucune description."}</p>
          </Section>
        </div>
      )}
    </DetailShell>
  );
};
