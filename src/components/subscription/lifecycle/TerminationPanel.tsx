import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, DoorOpen, LogOut } from "lucide-react";
import { subscriptionLifecycleService } from "../../../services/subscriptionLifecycle.service";
import type { TerminationPreview, TerminationRequest } from "../../../services/subscriptionLifecycle.service";
import { ActionButton, Detail, EmptyState, ErrorBlock, Field, ItemRow, PanelForm, Section, StatusChip } from "../kit";
import { FIELD_SOFT, apiMessage, formatDate, formatMoney } from "../kitUtils";
import { Skeleton } from "../../ui/Skeleton";
import { toast } from "../../ui/toastStore";
import { statusOf } from "../labels";
import { TERMINATION_CHANNELS, TERMINATION_REASONS, TERMINATION_STATUS } from "./lifecycleLabels";

const OPEN = ["REQUESTED", "ACCEPTED"];

const emptyRequest = (): TerminationRequest => ({
  reasonCategory: "NO_LONGER_NEEDED",
  reason: "",
  channel: "STAFF",
  requestedEffectiveDate: null,
  noticePeriodDays: null,
});

/** Aperçu chiffré d'une résiliation : préavis, date d'effet, indemnité, jours de raccordement. */
export const TerminationPreviewCard: React.FC<{ preview: TerminationPreview }> = ({ preview }) => (
  <div className="rounded-2xl bg-gray-50 p-4">
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Detail label="Préavis">{preview.noticePeriodDays} jours</Detail>
      <Detail label="Date d'effet au plus tôt">{formatDate(preview.earliestEffectiveDate)}</Detail>
      <Detail label="Date d'effet retenue">{formatDate(preview.effectiveDate)}</Detail>
      <Detail label="Fin d'engagement">{preview.earlyTermination ? formatDate(preview.commitmentEnd) : "Engagement terminé"}</Detail>
      <Detail label="Indemnité de sortie anticipée">{formatMoney(preview.feeAmount, preview.currency)}</Detail>
      <Detail label="Jours de raccordement">{formatMoney(preview.bridgingAmount, preview.currency)}</Detail>
    </div>
    {preview.exitChecklist.length > 0 && (
      <div className="mt-4">
        <p className="text-xs font-semibold text-gray-400">Liste de sortie</p>
        <ul className="mt-1 flex flex-wrap gap-2">
          {preview.exitChecklist.map((l) => (
            <li key={l} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-700 shadow-sm">
              {l}
            </li>
          ))}
        </ul>
      </div>
    )}
  </div>
);

/**
 * Résiliation d'un abonnement : historique des demandes et nouvelle demande avec aperçu.
 * L'abonnement passe en préavis (PENDING_TERMINATION) à l'enregistrement ;
 * le suivi complet (liste de sortie, acceptation) se fait sur la page de la résiliation.
 */
export const TerminationPanel: React.FC<{ subscriptionNumber: string; onChanged?: () => void }> = ({ subscriptionNumber, onChanged }) => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<TerminationRequest>(emptyRequest());
  const [preview, setPreview] = useState<TerminationPreview | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["sub-lifecycle", subscriptionNumber, "terminations"],
    queryFn: () => subscriptionLifecycleService.getSubscriptionTerminations(subscriptionNumber),
  });

  const payload = (): TerminationRequest => ({
    ...form,
    reason: form.reason?.trim() || undefined,
    requestedEffectiveDate: form.requestedEffectiveDate || null,
    noticePeriodDays: form.noticePeriodDays || null,
  });

  const makePreview = useMutation({
    mutationFn: () => subscriptionLifecycleService.previewTermination(subscriptionNumber, payload()),
    onSuccess: setPreview,
    onError: (e) => {
      setPreview(null);
      toast.error(apiMessage(e, "Aperçu impossible."));
    },
  });

  const request = useMutation({
    mutationFn: () => subscriptionLifecycleService.requestTermination(subscriptionNumber, payload()),
    onSuccess: (t) => {
      toast.success("Résiliation enregistrée, préavis en cours");
      setOpen(false);
      setPreview(null);
      setForm(emptyRequest());
      qc.invalidateQueries({ queryKey: ["sub-lifecycle", subscriptionNumber] });
      onChanged?.();
      navigate(`/subscriptions/terminations/${t.terminationCode}`);
    },
    onError: (e) => toast.error(apiMessage(e, "Enregistrement impossible.")),
  });

  const hasOpen = (data ?? []).some((t) => OPEN.includes(t.status));
  const change = (patch: Partial<TerminationRequest>) => {
    setForm((f) => ({ ...f, ...patch }));
    setPreview(null);
  };

  return (
    <Section
      title="Résiliation"
      description="Préavis, indemnité et liste de sortie"
      icon={LogOut}
      action={!open && !hasOpen && <ActionButton icon={DoorOpen} variant="ghost" onClick={() => setOpen(true)}>Résilier</ActionButton>}
    >
      {open && (
        <PanelForm
          title="Demander la résiliation"
          pending={request.isPending}
          submitLabel="Enregistrer la résiliation"
          submitDisabled={!preview}
          onCancel={() => {
            setOpen(false);
            setPreview(null);
          }}
          onSubmit={(e) => {
            e.preventDefault();
            request.mutate();
          }}
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Motif" required>
              <select value={form.reasonCategory} onChange={(e) => change({ reasonCategory: e.target.value as TerminationRequest["reasonCategory"] })} className={FIELD_SOFT}>
                {TERMINATION_REASONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Canal de la demande" required>
              <select value={form.channel} onChange={(e) => change({ channel: e.target.value as TerminationRequest["channel"] })} className={FIELD_SOFT}>
                {TERMINATION_CHANNELS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Date d'effet souhaitée" hint="Vide : date d'effet au plus tôt.">
              <input type="date" value={form.requestedEffectiveDate ?? ""} onChange={(e) => change({ requestedEffectiveDate: e.target.value || null })} className={FIELD_SOFT} />
            </Field>
            <Field label="Préavis (jours)" hint="Vide : préavis de la politique.">
              <input type="number" min={0} value={form.noticePeriodDays ?? ""} onChange={(e) => change({ noticePeriodDays: e.target.value === "" ? null : Number(e.target.value) })} className={FIELD_SOFT} />
            </Field>
          </div>
          <Field label="Précisions" hint="Facultatif">
            <textarea value={form.reason ?? ""} onChange={(e) => change({ reason: e.target.value })} rows={2} className={`${FIELD_SOFT} resize-none`} />
          </Field>
          <div>
            <ActionButton variant="ghost" onClick={() => makePreview.mutate()} pending={makePreview.isPending}>
              Voir l'aperçu
            </ActionButton>
            <p className="mt-1.5 text-xs text-gray-400">L'aperçu est obligatoire avant d'enregistrer : il montre l'indemnité et la date d'effet.</p>
          </div>
          {preview && <TerminationPreviewCard preview={preview} />}
        </PanelForm>
      )}

      {isLoading ? (
        <Skeleton className="h-16 w-full rounded-2xl" />
      ) : isError ? (
        <ErrorBlock message="Impossible de charger les résiliations." onRetry={() => refetch()} />
      ) : (data ?? []).length === 0 ? (
        !open && <EmptyState icon={LogOut} title="Aucune résiliation" hint="Aucune demande n'a été enregistrée pour cet abonnement." />
      ) : (
        <div className="space-y-2">
          {data!.map((t) => {
            const st = statusOf(TERMINATION_STATUS, t.status);
            const pendingItems = t.exitItems.filter((i) => i.mandatory && i.status === "PENDING").length;
            return (
              <ItemRow key={t.terminationCode}>
                <button
                  type="button"
                  onClick={() => navigate(`/subscriptions/terminations/${t.terminationCode}`)}
                  className="flex w-full items-center justify-between gap-3 rounded-xl text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--logo-pink)]"
                >
                  <div className="min-w-0">
                    <p className="font-mono text-sm font-semibold text-gray-900">{t.terminationCode}</p>
                    <p className="text-xs text-gray-400">
                      {t.effectiveDate ? `Effet le ${formatDate(t.effectiveDate)}` : "Date d'effet à confirmer"}
                      {pendingItems > 0 && ` · ${pendingItems} point${pendingItems > 1 ? "s" : ""} de sortie à faire`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusChip tone={st.tone}>{st.label}</StatusChip>
                    <ChevronRight size={16} className="text-gray-400" />
                  </div>
                </button>
              </ItemRow>
            );
          })}
        </div>
      )}
    </Section>
  );
};
