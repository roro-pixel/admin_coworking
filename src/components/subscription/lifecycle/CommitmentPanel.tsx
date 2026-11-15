import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, Pencil, Trash2 } from "lucide-react";
import { subscriptionLifecycleService } from "../../../services/subscriptionLifecycle.service";
import type { CommitmentRequest, EarlyTerminationFormula } from "../../../services/subscriptionLifecycle.service";
import { ActionButton, CheckField, Detail, EmptyState, ErrorBlock, Field, IconButton, PanelForm, Section, Tag } from "../kit";
import { FIELD_SOFT, apiMessage, formatDate, formatMoney } from "../kitUtils";
import { Skeleton } from "../../ui/Skeleton";
import { toast } from "../../ui/toastStore";
import { COMMITMENT_SOURCE_LABELS, FORMULA_LABELS } from "./lifecycleLabels";

const FORMULAS = Object.keys(FORMULA_LABELS) as EarlyTerminationFormula[];
const today = () => new Date().toISOString().slice(0, 10);

/**
 * Engagement d'un abonnement : durée, formule d'indemnité de sortie anticipée,
 * et simulation du coût d'une sortie à une date donnée.
 * Retirer l'engagement est réservé aux ADMIN (le backend répond 403 sinon).
 */
export const CommitmentPanel: React.FC<{ subscriptionNumber: string; currency?: string; onChanged?: () => void }> = ({
  subscriptionNumber,
  currency = "FCFA",
  onChanged,
}) => {
  const qc = useQueryClient();
  const key = ["sub-lifecycle", subscriptionNumber, "commitment"];
  const [editing, setEditing] = useState(false);
  const [simDate, setSimDate] = useState(today());
  const [simulate, setSimulate] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: key,
    queryFn: () => subscriptionLifecycleService.getCommitment(subscriptionNumber),
  });

  const early = useQuery({
    queryKey: ["sub-lifecycle", subscriptionNumber, "early-termination", simDate],
    queryFn: () => subscriptionLifecycleService.getEarlyTermination(subscriptionNumber, simDate),
    enabled: simulate && !!data && !!simDate,
  });

  const [form, setForm] = useState<CommitmentRequest>({
    commitmentMonths: 12,
    commitmentStart: today(),
    formula: "NONE",
    percent: null,
    fixedFee: null,
    autoRenewCommitment: false,
  });

  const openEdit = () => {
    if (data) {
      setForm({
        commitmentMonths: data.commitmentMonths,
        commitmentStart: data.commitmentStart.slice(0, 10),
        formula: data.earlyTerminationFormula as EarlyTerminationFormula,
        percent: data.earlyTerminationPercent ?? null,
        fixedFee: data.earlyTerminationFixedFee ?? null,
        autoRenewCommitment: data.autoRenewCommitment,
      });
    }
    setEditing(true);
  };

  const save = useMutation({
    mutationFn: () =>
      subscriptionLifecycleService.saveCommitment(subscriptionNumber, {
        ...form,
        percent: form.formula === "PERCENT_OF_REMAINING" ? form.percent : null,
        fixedFee: form.formula === "FIXED_FEE" ? form.fixedFee : null,
      }),
    onSuccess: () => {
      toast.success("Engagement enregistré");
      setEditing(false);
      qc.invalidateQueries({ queryKey: ["sub-lifecycle", subscriptionNumber] });
      onChanged?.();
    },
    onError: (e) => toast.error(apiMessage(e, "Enregistrement impossible.")),
  });

  const remove = () =>
    toast.confirm({
      message: "Retirer l'engagement ?",
      detail: "L'abonnement ne sera plus soumis à une indemnité de sortie anticipée.",
      confirmLabel: "Retirer",
      pendingLabel: "Retrait…",
      successMessage: "Engagement retiré",
      errorMessage: "Retrait impossible (réservé aux administrateurs).",
      onConfirm: async () => {
        await subscriptionLifecycleService.deleteCommitment(subscriptionNumber);
        qc.invalidateQueries({ queryKey: ["sub-lifecycle", subscriptionNumber] });
        setSimulate(false);
        onChanged?.();
      },
    });

  const needsPercent = form.formula === "PERCENT_OF_REMAINING";
  const needsFee = form.formula === "FIXED_FEE";
  const valid =
    form.commitmentMonths > 0 &&
    !!form.commitmentStart &&
    (!needsPercent || (form.percent ?? 0) > 0) &&
    (!needsFee || (form.fixedFee ?? 0) > 0);

  const action = !editing && (
    <div className="flex gap-1">
      <IconButton icon={Pencil} label={data ? "Modifier l'engagement" : "Poser un engagement"} onClick={openEdit} />
      {data && <IconButton icon={Trash2} label="Retirer l'engagement" tone="danger" onClick={remove} />}
    </div>
  );

  return (
    <Section title="Engagement" description="Durée minimale et sortie anticipée" icon={CalendarClock} action={action}>
      {editing && (
        <PanelForm
          title={data ? "Modifier l'engagement" : "Poser un engagement"}
          pending={save.isPending}
          submitLabel="Enregistrer"
          submitDisabled={!valid}
          onCancel={() => setEditing(false)}
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Durée (mois)" required>
              <input
                type="number"
                min={1}
                value={form.commitmentMonths}
                onChange={(e) => setForm({ ...form, commitmentMonths: Number(e.target.value) })}
                className={FIELD_SOFT}
              />
            </Field>
            <Field label="Début de l'engagement" required>
              <input
                type="date"
                value={form.commitmentStart}
                onChange={(e) => setForm({ ...form, commitmentStart: e.target.value })}
                className={FIELD_SOFT}
              />
            </Field>
          </div>
          <Field label="Indemnité en cas de sortie anticipée">
            <select
              value={form.formula}
              onChange={(e) => setForm({ ...form, formula: e.target.value as EarlyTerminationFormula })}
              className={FIELD_SOFT}
            >
              {FORMULAS.map((f) => (
                <option key={f} value={f}>
                  {FORMULA_LABELS[f]}
                </option>
              ))}
            </select>
          </Field>
          {needsPercent && (
            <Field label="Pourcentage du reste dû" required hint="Appliqué aux périodes restantes jusqu'à la fin de l'engagement.">
              <input
                type="number"
                min={0}
                max={100}
                value={form.percent ?? ""}
                onChange={(e) => setForm({ ...form, percent: e.target.value === "" ? null : Number(e.target.value) })}
                className={FIELD_SOFT}
              />
            </Field>
          )}
          {needsFee && (
            <Field label={`Montant fixe (${currency})`} required>
              <input
                type="number"
                min={0}
                value={form.fixedFee ?? ""}
                onChange={(e) => setForm({ ...form, fixedFee: e.target.value === "" ? null : Number(e.target.value) })}
                className={FIELD_SOFT}
              />
            </Field>
          )}
          <CheckField
            checked={form.autoRenewCommitment}
            onChange={(v) => setForm({ ...form, autoRenewCommitment: v })}
            label="Reconduire l'engagement automatiquement"
          />
        </PanelForm>
      )}

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-2/5" />
        </div>
      ) : isError ? (
        <ErrorBlock message="Impossible de charger l'engagement." onRetry={() => refetch()} />
      ) : !data ? (
        !editing && (
          <EmptyState icon={CalendarClock} title="Aucun engagement" hint="L'abonnement peut être résilié sans indemnité de rupture d'engagement." />
        )
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Detail label="Durée">{data.commitmentMonths} mois</Detail>
            <Detail label="Début">{formatDate(data.commitmentStart)}</Detail>
            <Detail label="Fin">{formatDate(data.commitmentEnd)}</Detail>
            <Detail label="Sortie anticipée">
              {FORMULA_LABELS[data.earlyTerminationFormula] ?? data.earlyTerminationFormula}
              {data.earlyTerminationFormula === "PERCENT_OF_REMAINING" && data.earlyTerminationPercent != null && ` · ${data.earlyTerminationPercent} %`}
              {data.earlyTerminationFormula === "FIXED_FEE" && data.earlyTerminationFixedFee != null && ` · ${formatMoney(data.earlyTerminationFixedFee, currency)}`}
            </Detail>
            <Detail label="Origine">
              <Tag>{COMMITMENT_SOURCE_LABELS[data.source] ?? data.source}</Tag>
            </Detail>
            <Detail label="Reconduction">{data.autoRenewCommitment ? "Automatique" : "Non"}</Detail>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-sm font-bold text-gray-950">Coût d'une sortie à une date donnée</p>
            <p className="mt-0.5 text-xs text-gray-500">À consulter avant d'enregistrer un préavis.</p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
              <Field label="Date de sortie" className="sm:w-56">
                <input
                  type="date"
                  value={simDate}
                  onChange={(e) => {
                    setSimDate(e.target.value);
                    setSimulate(true);
                  }}
                  className={FIELD_SOFT}
                />
              </Field>
              <ActionButton variant="ghost" onClick={() => setSimulate(true)} pending={early.isFetching}>
                Calculer
              </ActionButton>
            </div>
            {early.isError && <p className="mt-3 text-sm text-red-600">{apiMessage(early.error, "Calcul impossible.")}</p>}
            {early.data && !early.isFetching && (
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Detail label="Sortie anticipée">{early.data.early ? "Oui" : "Non, l'engagement sera terminé"}</Detail>
                <Detail label="Mois restants">{early.data.remainingMonths}</Detail>
                <Detail label="Indemnité">{formatMoney(early.data.fee, currency)}</Detail>
              </div>
            )}
          </div>
        </div>
      )}
    </Section>
  );
};
