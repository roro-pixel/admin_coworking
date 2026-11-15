import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Handshake, X } from "lucide-react";
import { subscriptionDerivationService } from "../../../services/subscriptionDerivation.service";
import type { DerivationView } from "../../../services/subscriptionDerivation.service";
import { ActionButton, Detail, ErrorBlock, PageHeader, Section, StatusChip } from "../../../components/subscription/kit";
import { apiMessage, formatDate, formatMoney } from "../../../components/subscription/kitUtils";
import { DetailsSkeleton, Skeleton } from "../../../components/ui/Skeleton";
import { toast } from "../../../components/ui/toastStore";
import { statusOf } from "../../../components/subscription/labels";
import { LifecycleShell } from "../../../components/subscription/lifecycle/LifecycleShell";
import { ReasonPanel } from "../../../components/subscription/lifecycle/ReasonPanel";
import { DELTA_TYPE_LABELS, DERIVATION_REASONS, DERIVATION_STATUS } from "../../../components/subscription/lifecycle/lifecycleLabels";

/** Fiche d'un prix négocié : différences avec le catalogue, visa ou refus par une autre personne que le demandeur. */
export const DerivationDetailPage: React.FC = () => {
  const { code = "" } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [rejecting, setRejecting] = useState(false);

  const { data: d, isLoading, isError, refetch } = useQuery({
    queryKey: ["derivation", code],
    queryFn: () => subscriptionDerivationService.getDerivation(code),
    enabled: !!code,
  });
  const deltas = useQuery({
    queryKey: ["derivation", code, "deltas"],
    queryFn: () => subscriptionDerivationService.getDerivationDeltas(code),
    enabled: !!code,
  });

  const update = (msg: string) => (v: DerivationView) => {
    toast.success(msg);
    setRejecting(false);
    qc.setQueryData(["derivation", code], v);
    qc.invalidateQueries({ queryKey: ["derivations"] });
    if (v.subscriptionNumber) qc.invalidateQueries({ queryKey: ["sub-lifecycle", v.subscriptionNumber] });
  };
  const approve = useMutation({ mutationFn: () => subscriptionDerivationService.approve(code), onSuccess: update("Prix négocié approuvé"), onError: (e) => toast.error(apiMessage(e, "Approbation impossible.")) });
  const reject = useMutation({ mutationFn: (r: string) => subscriptionDerivationService.reject(code, r), onSuccess: update("Prix négocié refusé"), onError: (e) => toast.error(apiMessage(e, "Refus impossible.")) });

  return (
    <LifecycleShell>
      <div className="mx-auto w-full max-w-4xl">
        {isLoading ? (
          <DetailsSkeleton />
        ) : isError || !d ? (
          <ErrorBlock message="Prix négocié introuvable." onRetry={() => refetch()} />
        ) : (
          (() => {
            const st = statusOf(DERIVATION_STATUS, d.status);
            const reason = DERIVATION_REASONS.find((r) => r.value === d.reason)?.label;
            const pending = d.status === "PENDING_APPROVAL";
            return (
              <>
                <PageHeader
                  title={d.derivationCode}
                  subtitle={d.subscriptionNumber ? `Abonnement ${d.subscriptionNumber}` : undefined}
                  onBack={() => navigate("/subscriptions/derivations")}
                  backLabel="Retour aux prix négociés"
                  badge={<StatusChip tone={st.tone}>{st.label}</StatusChip>}
                  actions={
                    pending && !rejecting && (
                      <div className="flex flex-wrap gap-2">
                        <ActionButton icon={Check} pending={approve.isPending} onClick={() => approve.mutate()}>Approuver</ActionButton>
                        <ActionButton variant="danger" icon={X} onClick={() => setRejecting(true)}>Refuser</ActionButton>
                      </div>
                    )
                  }
                />
                <div className="space-y-5">
                  {pending && <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-700">Le visa doit venir d'une autre personne que le demandeur ({d.requestedBy ?? "Non renseigné"}).</p>}
                  {rejecting && <ReasonPanel title="Refuser le prix négocié" submitLabel="Refuser" pending={reject.isPending} onSubmit={(r) => reject.mutate(r)} onCancel={() => setRejecting(false)} />}

                  <Section title="Dérivation" icon={Handshake}>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      <Detail label="Raison">{reason}</Detail>
                      <Detail label="Détail de la raison">{d.reasonDetails ?? undefined}</Detail>
                      <Detail label="Demandée par">{d.requestedBy ?? undefined}</Detail>
                      <Detail label="Approuvée par">{d.approvedBy ?? undefined}</Detail>
                      <Detail label="Effet à partir du">{d.effectiveFrom ? formatDate(d.effectiveFrom) : undefined}</Detail>
                      <Detail label="Jusqu'au">{d.effectiveTo ? formatDate(d.effectiveTo) : undefined}</Detail>
                      <Detail label="Abonnement">
                        {d.subscriptionNumber ? <button type="button" onClick={() => navigate(`/subscriptions/${d.subscriptionNumber}`)} className="font-mono font-semibold text-[color:var(--logo-pink-dark)] hover:underline">{d.subscriptionNumber}</button> : undefined}
                      </Detail>
                    </div>
                  </Section>

                  <Section title="Ce qui change" description="Comparé au catalogue">
                    {deltas.isLoading ? (
                      <Skeleton className="h-16 w-full rounded-2xl" />
                    ) : deltas.isError ? (
                      <ErrorBlock message="Différences indisponibles." onRetry={() => deltas.refetch()} />
                    ) : (deltas.data ?? []).length === 0 ? (
                      <p className="rounded-2xl bg-white px-4 py-3 text-sm text-gray-500 shadow-sm">Aucune différence enregistrée.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {deltas.data!.map((x, i) => (
                          <div key={`${x.type}-${x.target ?? ""}-${i}`} className="grid grid-cols-1 gap-1 rounded-xl bg-white px-4 py-2.5 shadow-sm sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)_8rem] sm:items-center sm:gap-3">
                            <p className="text-sm font-semibold text-gray-900">
                              {DELTA_TYPE_LABELS[x.type] ?? x.type}
                              {x.target && <span className="font-mono text-xs font-normal text-gray-400"> · {x.target}</span>}
                            </p>
                            <p className="text-sm text-gray-500"><span className="text-xs text-gray-400 sm:hidden">Catalogue : </span>{x.catalogueValue != null && x.catalogueValue !== "" ? (typeof x.catalogueValue === "number" && ["PRICE", "SETUP_FEE"].includes(x.type) ? formatMoney(x.catalogueValue, "FCFA") : String(x.catalogueValue)) : "Aucune"}</p>
                            <p className="text-sm font-semibold text-gray-900"><span className="text-xs font-normal text-gray-400 sm:hidden">Dérivé : </span>{x.derivedValue != null && x.derivedValue !== "" ? (typeof x.derivedValue === "number" && ["PRICE", "SETUP_FEE"].includes(x.type) ? formatMoney(x.derivedValue, "FCFA") : String(x.derivedValue)) : "Aucune"}</p>
                            <p className="text-sm font-semibold text-gray-700 sm:text-right">{x.impact != null ? formatMoney(x.impact, "FCFA") : ""}</p>
                          </div>
                        ))}
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
