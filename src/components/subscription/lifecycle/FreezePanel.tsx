import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PauseCircle, PlayCircle, Snowflake } from "lucide-react";
import { subscriptionLifecycleService } from "../../../services/subscriptionLifecycle.service";
import { subscriptionService } from "../../../services/subscription.service";
import { ActionButton, Detail, EmptyState, ErrorBlock, Field, ItemRow, PanelForm, Section, Tag } from "../kit";
import { FIELD_SOFT, apiMessage, formatDate, formatMoney } from "../kitUtils";
import { Skeleton } from "../../ui/Skeleton";
import { toast } from "../../ui/toastStore";

const addDays = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

/**
 * Gel d'un abonnement : conditions de la politique, historique, gel et reprise.
 * Le gel respecte l'allowance (409 du backend sinon) : le bouton est désactivé
 * avec la raison quand la politique ne l'autorise plus.
 */
export const FreezePanel: React.FC<{
  subscriptionNumber: string;
  /** Statut courant de l'abonnement (PAUSED : proposer la reprise) */
  status: string;
  currency?: string;
  onChanged?: () => void;
}> = ({ subscriptionNumber, status, currency = "FCFA", onChanged }) => {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [until, setUntil] = useState(addDays(30));
  const [reason, setReason] = useState("");

  const allowance = useQuery({
    queryKey: ["sub-lifecycle", subscriptionNumber, "freeze-allowance"],
    queryFn: () => subscriptionLifecycleService.getFreezeAllowance(subscriptionNumber),
  });
  const history = useQuery({
    queryKey: ["sub-lifecycle", subscriptionNumber, "freezes"],
    queryFn: () => subscriptionLifecycleService.getFreezes(subscriptionNumber),
  });

  const done = (msg: string) => {
    toast.success(msg);
    setOpen(false);
    setReason("");
    qc.invalidateQueries({ queryKey: ["sub-lifecycle", subscriptionNumber] });
    onChanged?.();
  };

  const freeze = useMutation({
    mutationFn: () => subscriptionService.pauseSubscription(subscriptionNumber, { until, reason: reason.trim() || undefined }),
    onSuccess: () => done("Abonnement gelé"),
    onError: (e) => toast.error(apiMessage(e, "Gel impossible.")),
  });
  const resume = useMutation({
    mutationFn: () => subscriptionService.resumeSubscription(subscriptionNumber),
    onSuccess: () => done("Abonnement repris"),
    onError: (e) => toast.error(apiMessage(e, "Reprise impossible.")),
  });

  const a = allowance.data;
  const paused = status === "PAUSED";
  const maxDate = a ? addDays(a.maxDays) : undefined;
  const tooLong = !!maxDate && until > maxDate;
  const canFreeze = !!a?.canFreeze && ["ACTIVE", "GRACE_PERIOD", "TRIALING"].includes(status);

  const action = paused ? (
    <ActionButton icon={PlayCircle} onClick={() => resume.mutate()} pending={resume.isPending}>
      Reprendre
    </ActionButton>
  ) : (
    !open && (
      <ActionButton icon={PauseCircle} variant="ghost" onClick={() => setOpen(true)} disabled={!canFreeze}>
        Geler
      </ActionButton>
    )
  );

  return (
    <Section title="Gel" description="Pause de l'abonnement selon la politique en vigueur" icon={Snowflake} action={action}>
      {open && (
        <PanelForm
          title="Geler l'abonnement"
          pending={freeze.isPending}
          submitLabel="Geler"
          submitDisabled={!until || tooLong}
          onCancel={() => setOpen(false)}
          onSubmit={(e) => {
            e.preventDefault();
            freeze.mutate();
          }}
        >
          <Field
            label="Jusqu'au"
            required
            error={tooLong ? `Le gel ne peut pas dépasser ${a!.maxDays} jours.` : undefined}
            hint={a && a.feePercent > 0 ? `${a.feePercent} % du tarif sur les jours gelés sera facturé.` : undefined}
          >
            <input type="date" min={addDays(1)} max={maxDate} value={until} onChange={(e) => setUntil(e.target.value)} className={FIELD_SOFT} />
          </Field>
          <Field label="Motif" hint="Facultatif">
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} className={`${FIELD_SOFT} resize-none`} />
          </Field>
        </PanelForm>
      )}

      {allowance.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ) : allowance.isError ? (
        <ErrorBlock message="Impossible de charger les conditions de gel." onRetry={() => allowance.refetch()} />
      ) : (
        a && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Detail label="Gels cette année">
                {a.freezesUsedThisYear} sur {a.freezesAllowedPerYear}
              </Detail>
              <Detail label="Durée maximale">{a.maxDays} jours</Detail>
              <Detail label="Frais de gel">{a.feePercent > 0 ? `${a.feePercent} % du tarif` : "Gratuit"}</Detail>
              <Detail label="Gel possible">{a.canFreeze ? "Oui" : "Non"}</Detail>
            </div>
            {!a.canFreeze && !paused && (
              <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
                La politique n'autorise plus de gel pour cet abonnement (quota annuel atteint).
              </p>
            )}
          </div>
        )
      )}

      <div className="mt-5">
        <p className="mb-2 text-xs font-semibold text-gray-400">Historique des gels</p>
        {history.isLoading ? (
          <Skeleton className="h-16 w-full rounded-2xl" />
        ) : history.isError ? (
          <ErrorBlock message="Impossible de charger l'historique." onRetry={() => history.refetch()} />
        ) : (history.data ?? []).length === 0 ? (
          <EmptyState icon={Snowflake} title="Aucun gel" hint="Cet abonnement n'a jamais été gelé." />
        ) : (
          <div className="space-y-2">
            {history.data!.map((f) => (
              <ItemRow key={`${f.startedOn}-${f.plannedUntil ?? ""}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-gray-900">
                    Du {formatDate(f.startedOn)} au {formatDate(f.resumedOn ?? f.plannedUntil)}
                  </p>
                  {f.resumedOn ? <Tag>Terminé</Tag> : <Tag tone="pink">En cours</Tag>}
                </div>
                <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <Detail label="Jours prévus">{f.daysPlanned ?? undefined}</Detail>
                  <Detail label="Jours effectifs">{f.daysEffective ?? undefined}</Detail>
                  <Detail label="Frais">{f.feeAmount ? formatMoney(f.feeAmount, currency) : undefined}</Detail>
                  <Detail label="Motif" wide>
                    {f.reason || undefined}
                  </Detail>
                </div>
              </ItemRow>
            ))}
          </div>
        )}
      </div>
    </Section>
  );
};
