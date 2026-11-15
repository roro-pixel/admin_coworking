import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DollarSign, Pencil, Power, Tag as TagIcon, Trash2 } from "lucide-react";
import { resourceService } from "../../../services/resource.service";
import { ActionButton, Detail, EmptyState, PageHeader, PanelForm, Section, StatusChip } from "../../../components/subscription/kit";
import { apiMessage, formatDate, formatMoney } from "../../../components/subscription/kitUtils";
import { DetailsSkeleton } from "../../../components/ui/Skeleton";
import { toast } from "../../../components/ui/toastStore";
import { ADJ_LABEL, DetailShell, UNIT_LABEL, dayLabel, hhmm } from "../../../components/resources/resKit";
import { PricingFields, pricingError, pricingPayload, ruleToForm } from "../../../components/resources/PricingFields";
import type { PricingForm } from "../../../components/resources/PricingFields";

export const PricingRuleDetailPage: React.FC = () => {
  const { ruleId } = useParams<{ ruleId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const id = Number(ruleId);
  const [form, setForm] = useState<PricingForm | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: rule, isLoading, isError } = useQuery({
    queryKey: ["resource-pricing-rule", id],
    queryFn: () => resourceService.getPricingRule(id),
    enabled: Number.isFinite(id),
  });

  const refresh = () =>
    Promise.all(
      [["resource-pricing-rule", id], ["resource-pricing-rules"], ["resource-pricing"]].map((queryKey) => queryClient.invalidateQueries({ queryKey })),
    );
  const update = useMutation({
    mutationFn: () => resourceService.updatePricingRule(id, pricingPayload(form!, "update")),
    onSuccess: async () => {
      await refresh();
      toast.success("Règle modifiée");
      setForm(null);
      setError(null);
    },
    onError: (e) => setError(apiMessage(e, "Modification impossible")),
  });
  const toggle = useMutation({
    mutationFn: () => resourceService.updatePricingRuleActive(id, !rule?.active),
    onSuccess: refresh,
    onError: (e) => toast.error(apiMessage(e, "Changement d'état impossible")),
  });
  const remove = useMutation({ mutationFn: () => resourceService.deletePricingRule(id) });

  const back = () => navigate("/resources?tab=pricing");

  if (isLoading) return <DetailShell><DetailsSkeleton /></DetailShell>;
  if (isError || !rule) {
    return (
      <DetailShell>
        <EmptyState icon={DollarSign} title="Règle introuvable" hint="Elle a peut-être été supprimée." action={<ActionButton onClick={back}>Retour aux tarifs</ActionButton>} />
      </DetailShell>
    );
  }

  const from = rule.validFrom ? formatDate(rule.validFrom) : "dès maintenant";
  const until = rule.validUntil ? formatDate(rule.validUntil) : "sans fin";

  return (
    <DetailShell>
      <PageHeader
        title={rule.label || `Règle n° ${rule.id}`}
        subtitle={
          <>
            Ressource <button type="button" onClick={() => navigate(`/resources/${rule.resourceCode}`)} className="font-mono font-semibold text-[color:var(--logo-pink-dark)] hover:underline">{rule.resourceCode}</button>
          </>
        }
        onBack={back}
        backLabel="Retour aux tarifs"
        badge={<StatusChip tone={rule.active ? "success" : "neutral"}>{rule.active ? "Active" : "Inactive"}</StatusChip>}
        actions={
          !form && (
            <>
              <ActionButton variant="ghost" icon={Power} pending={toggle.isPending} onClick={() => toggle.mutate()}>{rule.active ? "Désactiver" : "Activer"}</ActionButton>
              <ActionButton icon={Pencil} onClick={() => { setError(null); setForm(ruleToForm(rule)); }}>Modifier</ActionButton>
            </>
          )
        }
      />

      {form ? (
        <PanelForm
          title="Modifier la règle"
          onCancel={() => setForm(null)}
          pending={update.isPending}
          submitLabel="Enregistrer"
          error={error}
          onSubmit={(e) => {
            e.preventDefault();
            const msg = pricingError(form);
            if (msg) return setError(msg);
            setError(null);
            update.mutate();
          }}
        >
          <PricingFields value={form} onChange={(patch) => setForm((p) => (p ? { ...p, ...patch } : p))} />
        </PanelForm>
      ) : (
        <div className="space-y-4">
          <Section title="Prix" icon={DollarSign}>
            <div className="grid gap-4 sm:grid-cols-3">
              <Detail label="Prix">{formatMoney(rule.price)}</Detail>
              <Detail label="Unité">{UNIT_LABEL[rule.bookingUnit] ?? rule.bookingUnit}</Detail>
              <Detail label="Priorité">{String(rule.priority ?? 0)}</Detail>
            </div>
          </Section>
          <Section title="Conditions" icon={TagIcon}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Detail label="Jour">{dayLabel(rule.dayOfWeek)}</Detail>
              <Detail label="Plage horaire">{rule.startsAt || rule.endsAt ? `de ${hhmm(rule.startsAt) || "00:00"} à ${hhmm(rule.endsAt) || "24:00"}` : "Toute la journée"}</Detail>
              <Detail label="Validité">{`${from}, ${until}`}</Detail>
              <Detail label="Ajustement">{rule.adjustmentType ? `${ADJ_LABEL[rule.adjustmentType]}: ${rule.adjustmentValue ?? 0}` : "Aucun"}</Detail>
              <Detail label="Dernière minute">{rule.lastMinuteMinutes ? `${rule.lastMinuteMinutes} min avant le début` : "Non"}</Detail>
            </div>
          </Section>
          <div className="flex justify-end">
            <ActionButton
              variant="danger"
              icon={Trash2}
              onClick={() =>
                toast.confirm({
                  message: "Supprimer cette règle de prix ?",
                  confirmLabel: "Supprimer",
                  pendingLabel: "Suppression",
                  successMessage: "Règle supprimée",
                  errorMessage: "Suppression impossible",
                  onConfirm: async () => {
                    await remove.mutateAsync();
                    await refresh();
                    back();
                  },
                })
              }
            >
              Supprimer la règle
            </ActionButton>
          </div>
        </div>
      )}
    </DetailShell>
  );
};
