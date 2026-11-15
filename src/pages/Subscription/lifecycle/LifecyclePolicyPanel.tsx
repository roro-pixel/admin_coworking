import React, { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Gavel, Snowflake } from "lucide-react";
import { subscriptionLifecycleService } from "../../../services/subscriptionLifecycle.service";
import type { LifecyclePolicy } from "../../../services/subscriptionLifecycle.service";
import { subscriptionDerivationService } from "../../../services/subscriptionDerivation.service";
import type { DerivationApprovalRule } from "../../../services/subscriptionDerivation.service";
import { ActionButton, ErrorBlock, Field, Section } from "../../../components/subscription/kit";
import { FIELD_SOFT, apiMessage } from "../../../components/subscription/kitUtils";
import { DetailsSkeleton } from "../../../components/ui/Skeleton";
import { toast } from "../../../components/ui/toastStore";
import { FORMULA_LABELS, PRORATION_LABELS } from "../../../components/subscription/lifecycle/lifecycleLabels";

const N: React.FC<{ label: string; hint?: string; value: number | null | undefined; onChange: (v: number) => void; step?: number }> = ({ label, hint, value, onChange, step }) => (
  <Field label={label} hint={hint}>
    <input type="number" min={0} step={step} value={value ?? ""} onChange={(e) => onChange(Number(e.target.value))} className={FIELD_SOFT} />
  </Field>
);

/** Politique du cycle de vie, règle d'approbation des prix négociés et prix plancher d'une version de plan (ADMIN). */
export const LifecyclePolicyPanel: React.FC = () => {
  const qc = useQueryClient();
  const policyQ = useQuery({ queryKey: ["lifecycle-policy"], queryFn: () => subscriptionLifecycleService.getPolicy() });
  const ruleQ = useQuery({ queryKey: ["derivation-rule"], queryFn: () => subscriptionDerivationService.getApprovalRule() });
  const [p, setP] = useState<LifecyclePolicy | null>(null);
  const [r, setR] = useState<DerivationApprovalRule | null>(null);
  const [versionId, setVersionId] = useState("");
  const [floor, setFloor] = useState("");

  useEffect(() => { if (policyQ.data) setP(policyQ.data); }, [policyQ.data]);
  useEffect(() => { if (ruleQ.data) setR(ruleQ.data); }, [ruleQ.data]);

  const savePolicy = useMutation({
    mutationFn: () => subscriptionLifecycleService.updatePolicy(p!),
    onSuccess: (v) => { toast.success("Politique enregistrée"); qc.setQueryData(["lifecycle-policy"], v); },
    onError: (e) => toast.error(apiMessage(e, "Enregistrement impossible.")),
  });
  const saveRule = useMutation({
    mutationFn: () => subscriptionDerivationService.updateApprovalRule(r!),
    onSuccess: (v) => { toast.success("Règle enregistrée"); qc.setQueryData(["derivation-rule"], v); },
    onError: (e) => toast.error(apiMessage(e, "Enregistrement impossible.")),
  });
  const saveFloor = useMutation({
    mutationFn: () => subscriptionDerivationService.setPlanVersionFloorPrice(versionId.trim(), floor.trim() === "" ? null : Number(floor)),
    onSuccess: () => { toast.success(floor.trim() === "" ? "Prix plancher retiré" : "Prix plancher enregistré"); setVersionId(""); setFloor(""); },
    onError: (e) => toast.error(apiMessage(e, "Enregistrement impossible.")),
  });

  const set = (patch: Partial<LifecyclePolicy>) => setP((v) => (v ? { ...v, ...patch } : v));

  return (
      <div className="mx-auto w-full max-w-4xl">
        <p className="mb-5 text-sm text-gray-500">Prorata, préavis, tolérance d'impayé, gel et prix négociés. Modification réservée aux administrateurs.</p>
        <p className="mb-5 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Les modifications faites ici ne sont pas inscrites au journal des paramètres. Pour une modification historisée, utilisez{" "}
          <Link to="/settings?tab=platform&domain=SUBSCRIPTIONS" className="font-semibold underline">
            Paramètres › Plateforme › Abonnements
          </Link>
          .
        </p>
        {policyQ.isLoading || ruleQ.isLoading ? (
          <DetailsSkeleton />
        ) : policyQ.isError || !p ? (
          <ErrorBlock message="Impossible de charger la politique." onRetry={() => policyQ.refetch()} />
        ) : (
          <div className="space-y-5">
            <form onSubmit={(e) => { e.preventDefault(); savePolicy.mutate(); }} className="space-y-5">
              <Section title="Règles générales" description="Un seul prorata pour l'entrée, la sortie et le changement de plan" icon={Gavel}>
                <div className="grid grid-cols-1 gap-4 rounded-2xl bg-white p-5 shadow-sm sm:grid-cols-2">
                  <Field label="Prorata">
                    <select value={p.prorationPolicy} onChange={(e) => set({ prorationPolicy: e.target.value as LifecyclePolicy["prorationPolicy"] })} className={FIELD_SOFT}>
                      {Object.entries(PRORATION_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                    </select>
                  </Field>
                  <N label="Préavis par défaut (jours)" value={p.defaultNoticeDays} onChange={(v) => set({ defaultNoticeDays: v })} />
                  <N label="Tolérance d'impayé (jours)" hint="Avant la suspension." value={p.gracePeriodDays} onChange={(v) => set({ gracePeriodDays: v })} />
                  <N label="Suspension après tolérance (jours)" value={p.suspensionAfterGraceDays} onChange={(v) => set({ suspensionAfterGraceDays: v })} />
                  <N label="Validité d'un devis (jours)" value={p.quoteValidityDays} onChange={(v) => set({ quoteValidityDays: v })} />
                  <Field label="Indemnité de sortie anticipée">
                    <select value={p.earlyTerminationFormula} onChange={(e) => set({ earlyTerminationFormula: e.target.value as LifecyclePolicy["earlyTerminationFormula"] })} className={FIELD_SOFT}>
                      {Object.entries(FORMULA_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                    </select>
                  </Field>
                  {p.earlyTerminationFormula === "PERCENT_OF_REMAINING" && <N label="Pourcentage du reste dû (%)" value={p.earlyTerminationPercent} onChange={(v) => set({ earlyTerminationPercent: v })} />}
                  {p.earlyTerminationFormula === "FIXED_FEE" && <N label="Frais fixes (FCFA)" value={p.earlyTerminationFixedFee} onChange={(v) => set({ earlyTerminationFixedFee: v })} />}
                </div>
              </Section>
              <Section title="Gel d'abonnement" icon={Snowflake}>
                <div className="grid grid-cols-1 gap-4 rounded-2xl bg-white p-5 shadow-sm sm:grid-cols-2">
                  <N label="Gels par an" value={p.freezeMaxPerYear} onChange={(v) => set({ freezeMaxPerYear: v })} />
                  <N label="Durée maximale d'un gel (jours)" value={p.freezeMaxDays} onChange={(v) => set({ freezeMaxDays: v })} />
                  <N label="Préavis avant un gel (jours)" value={p.freezeNoticeDays} onChange={(v) => set({ freezeNoticeDays: v })} />
                  <N label="Frais de gel (%)" value={p.freezeFeePercent} onChange={(v) => set({ freezeFeePercent: v })} />
                </div>
              </Section>
              <div className="flex justify-end"><ActionButton type="submit" pending={savePolicy.isPending}>Enregistrer la politique</ActionButton></div>
            </form>

            {r && (
              <form onSubmit={(e) => { e.preventDefault(); saveRule.mutate(); }}>
                <Section title="Approbation des prix négociés" description="Au-delà de ces seuils, un second visa est demandé ; au-delà du maximum, le prix est refusé">
                  <div className="grid grid-cols-1 gap-4 rounded-2xl bg-white p-5 shadow-sm sm:grid-cols-3">
                    <N label="Remise sans visa (%)" step={0.1} value={r.maxDiscountPercentWithoutApproval} onChange={(v) => setR({ ...r, maxDiscountPercentWithoutApproval: v })} />
                    <N label="Impact sans visa (FCFA)" value={r.maxImpactWithoutApproval} onChange={(v) => setR({ ...r, maxImpactWithoutApproval: v })} />
                    <N label="Remise maximale (%)" step={0.1} value={r.maxDiscountPercentAllowed} onChange={(v) => setR({ ...r, maxDiscountPercentAllowed: v })} />
                  </div>
                  <div className="mt-4 flex justify-end"><ActionButton type="submit" pending={saveRule.isPending}>Enregistrer la règle</ActionButton></div>
                </Section>
              </form>
            )}

            <form onSubmit={(e) => { e.preventDefault(); saveFloor.mutate(); }}>
              <Section title="Prix plancher d'une version de plan" description="Aucun prix négocié ne descendra sous ce montant. Laissez vide pour retirer le plancher.">
                <div className="grid grid-cols-1 gap-4 rounded-2xl bg-white p-5 shadow-sm sm:grid-cols-2">
                  <Field label="Identifiant de la version" required><input value={versionId} onChange={(e) => setVersionId(e.target.value)} className={`${FIELD_SOFT} font-mono`} /></Field>
                  <Field label="Prix plancher (FCFA)"><input type="number" min={0} value={floor} onChange={(e) => setFloor(e.target.value)} className={FIELD_SOFT} /></Field>
                </div>
                <div className="mt-4 flex justify-end"><ActionButton type="submit" pending={saveFloor.isPending} disabled={!versionId.trim()}>{floor.trim() === "" ? "Retirer le plancher" : "Enregistrer le plancher"}</ActionButton></div>
              </Section>
            </form>
          </div>
        )}
      </div>
  );
};
