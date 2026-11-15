import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban, Check, CheckCheck, CircleSlash, FileText, Undo2 } from "lucide-react";
import { subscriptionLifecycleService } from "../../../services/subscriptionLifecycle.service";
import type { ExitItem, TerminationView } from "../../../services/subscriptionLifecycle.service";
import { ActionButton, Detail, ErrorBlock, IconButton, ItemRow, PageHeader, Section, StatusChip, Tag } from "../../../components/subscription/kit";
import { apiMessage, formatDate, formatDateTime, formatMoney } from "../../../components/subscription/kitUtils";
import { DetailsSkeleton } from "../../../components/ui/Skeleton";
import { toast } from "../../../components/ui/toastStore";
import { statusOf } from "../../../components/subscription/labels";
import { LifecycleShell } from "../../../components/subscription/lifecycle/LifecycleShell";
import { ReasonPanel } from "../../../components/subscription/lifecycle/ReasonPanel";
import { EXIT_ITEM_HINTS, EXIT_ITEM_STATUS, TERMINATION_CHANNELS, TERMINATION_REASONS, TERMINATION_STATUS } from "../../../components/subscription/lifecycle/lifecycleLabels";

type Panel = { kind: "retract" } | { kind: "waiveFee" } | { kind: "waiveItem"; item: ExitItem } | null;

/** Suivi d'une résiliation : synthèse, liste de sortie, acceptation, retrait, achèvement. */
export const TerminationDetailPage: React.FC = () => {
  const { code = "" } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [panel, setPanel] = useState<Panel>(null);

  const { data: t, isLoading, isError, refetch } = useQuery({
    queryKey: ["termination", code],
    queryFn: () => subscriptionLifecycleService.getTermination(code),
    enabled: !!code,
  });

  const done = (msg: string) => (v: TerminationView) => {
    if (msg) toast.success(msg);
    setPanel(null);
    qc.setQueryData(["termination", code], v);
    qc.invalidateQueries({ queryKey: ["terminations"] });
    qc.invalidateQueries({ queryKey: ["sub-lifecycle", v.subscriptionNumber] });
  };
  const fail = (fallback: string) => (e: unknown) => toast.error(apiMessage(e, fallback));

  const retract = useMutation({ mutationFn: (reason: string) => subscriptionLifecycleService.retractTermination(code, reason), onSuccess: done("Résiliation retirée"), onError: fail("Retrait impossible.") });
  const waiveFee = useMutation({ mutationFn: (reason: string) => subscriptionLifecycleService.waiveTerminationFee(code, reason), onSuccess: done("Indemnité dispensée"), onError: fail("Dispense impossible.") });
  const waiveItem = useMutation({
    mutationFn: (v: { itemCode: string; reason: string }) => subscriptionLifecycleService.waiveExitItem(code, v.itemCode, v.reason),
    onSuccess: done("Point de sortie dispensé"),
    onError: fail("Dispense impossible."),
  });
  const markDone = useMutation({
    mutationFn: (itemCode: string) => subscriptionLifecycleService.markExitItemDone(code, itemCode),
    onSuccess: done("Point de sortie fait"),
    onError: fail("Action impossible."),
  });

  const accept = () =>
    toast.confirm({
      message: "Accepter cette résiliation ?",
      detail: "L'indemnité et les jours de raccordement seront facturés.",
      confirmLabel: "Accepter",
      pendingLabel: "Acceptation",
      successMessage: "Résiliation acceptée",
      errorMessage: "Acceptation impossible",
      onConfirm: async () => done("")(await subscriptionLifecycleService.acceptTermination(code)),
    });
  const complete = () =>
    toast.confirm({
      message: "Clore cette résiliation ?",
      detail: "L'abonnement prendra fin.",
      confirmLabel: "Clore",
      pendingLabel: "Clôture",
      successMessage: "Résiliation terminée",
      errorMessage: "Clôture impossible",
      onConfirm: async () => done("")(await subscriptionLifecycleService.completeTermination(code)),
    });

  return (
    <LifecycleShell>
      <div className="mx-auto w-full max-w-4xl">
        {isLoading ? (
          <DetailsSkeleton />
        ) : isError || !t ? (
          <ErrorBlock message="Résiliation introuvable." onRetry={() => refetch()} />
        ) : (
          (() => {
            const st = statusOf(TERMINATION_STATUS, t.status);
            const reason = TERMINATION_REASONS.find((r) => r.value === t.reasonCategory)?.label;
            const channel = TERMINATION_CHANNELS.find((c) => c.value === t.channel)?.label;
            const requested = t.status === "REQUESTED";
            const accepted = t.status === "ACCEPTED";
            return (
              <>
                <PageHeader
                  title={t.terminationCode}
                  subtitle={`Abonnement ${t.subscriptionNumber}`}
                  onBack={() => navigate("/subscriptions/terminations")}
                  backLabel="Retour aux résiliations"
                  badge={<StatusChip tone={st.tone}>{st.label}</StatusChip>}
                  actions={
                    panel === null && (
                      <div className="flex flex-wrap gap-2">
                        {requested && <ActionButton icon={Check} onClick={accept}>Accepter</ActionButton>}
                        {accepted && <ActionButton icon={CheckCheck} onClick={complete} disabled={!t.exitChecklistClear}>Clore</ActionButton>}
                        {requested && <ActionButton variant="ghost" icon={CircleSlash} onClick={() => setPanel({ kind: "waiveFee" })}>Dispenser l'indemnité</ActionButton>}
                        {(requested || accepted) && <ActionButton variant="danger" icon={Undo2} onClick={() => setPanel({ kind: "retract" })}>Retirer</ActionButton>}
                      </div>
                    )
                  }
                />
                <div className="space-y-5">
                  {panel?.kind === "retract" && (
                    <ReasonPanel title="Retirer la résiliation" description="L'abonnement reprend son cours. Impossible si des frais ont déjà été facturés : émettez d'abord un avoir." submitLabel="Retirer" pending={retract.isPending} onSubmit={(r) => retract.mutate(r)} onCancel={() => setPanel(null)} />
                  )}
                  {panel?.kind === "waiveFee" && (
                    <ReasonPanel title="Dispenser l'indemnité" description="Réservé aux administrateurs, avant l'acceptation." submitLabel="Dispenser" pending={waiveFee.isPending} onSubmit={(r) => waiveFee.mutate(r)} onCancel={() => setPanel(null)} />
                  )}
                  {panel?.kind === "waiveItem" && (
                    <ReasonPanel title={`Dispenser « ${panel.item.label} »`} submitLabel="Dispenser" pending={waiveItem.isPending} onSubmit={(r) => waiveItem.mutate({ itemCode: panel.item.itemCode, reason: r })} onCancel={() => setPanel(null)} />
                  )}

                  <Section title="Synthèse" icon={FileText}>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      <Detail label="Motif">{reason}</Detail>
                      <Detail label="Canal">{channel}</Detail>
                      <Detail label="Date d'effet">{t.effectiveDate ? formatDate(t.effectiveDate) : undefined}</Detail>
                      <Detail label="Indemnité">{t.feeAmount != null ? formatMoney(t.feeAmount, "FCFA") : "Aucune"}</Detail>
                      <Detail label="Jours de raccordement">{t.bridgingAmount != null ? formatMoney(t.bridgingAmount, "FCFA") : "Aucun"}</Detail>
                      <Detail label="Abonnement"><button type="button" onClick={() => navigate(`/subscriptions/${t.subscriptionNumber}`)} className="font-mono font-semibold text-[color:var(--logo-pink-dark)] hover:underline">{t.subscriptionNumber}</button></Detail>
                      <Detail label="Précisions" wide>{t.reason ?? undefined}</Detail>
                    </div>
                  </Section>

                  <Section title="Liste de sortie" description={t.exitChecklistClear ? "Tous les points obligatoires sont réglés." : "Les points obligatoires à faire bloquent la clôture."} icon={Ban}>
                    {t.exitItems.length === 0 ? (
                      <p className="rounded-2xl bg-white px-4 py-3 text-sm text-gray-500 shadow-sm">Aucun point de sortie pour cette résiliation.</p>
                    ) : (
                      <div className="space-y-2">
                        {t.exitItems.map((i) => {
                          const is = statusOf(EXIT_ITEM_STATUS, i.status);
                          const hint = EXIT_ITEM_HINTS[i.itemCode];
                          const todo = i.status === "PENDING" && (requested || accepted);
                          return (
                            <ItemRow key={i.itemCode}>
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-gray-900">
                                    {i.label} {i.mandatory ? <Tag tone="pink">Obligatoire</Tag> : <Tag>Facultatif</Tag>}
                                  </p>
                                  <p className="text-xs text-gray-400">
                                    {i.status !== "PENDING" && i.doneAt ? `${i.doneBy ?? ""} · ${formatDateTime(i.doneAt)}` : hint}
                                    {i.detail ? ` · ${i.detail}` : ""}
                                  </p>
                                </div>
                                <div className="flex items-center gap-1">
                                  <StatusChip tone={is.tone}>{is.label}</StatusChip>
                                  {todo && <IconButton icon={Check} label="Marquer comme fait" tone="success" pending={markDone.isPending && markDone.variables === i.itemCode} onClick={() => markDone.mutate(i.itemCode)} />}
                                  {todo && <IconButton icon={CircleSlash} label="Dispenser" onClick={() => setPanel({ kind: "waiveItem", item: i })} />}
                                </div>
                              </div>
                            </ItemRow>
                          );
                        })}
                      </div>
                    )}
                  </Section>
                </div>
              </>
            );
          })()
        )}
      </div>
    </LifecycleShell>
  );
};
