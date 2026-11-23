import React, { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Calculator, GitCompare, History, TriangleAlert } from "lucide-react";
import { resourceOpsService } from "../../services/resourceOps.service";
import type { PriceQuote } from "../../services/resourceOps.service";
import { ActionButton, EmptyState, ErrorBlock, Field, Section, StatusChip } from "../subscription/kit";
import { FIELD, apiMessage, formatDateTime, formatMoney } from "../subscription/kitUtils";
import { ListSkeleton } from "../ui/Skeleton";
import { ResourceAutocomplete } from "./ResourceAutocomplete";
import { UNITS, UNIT_LABEL, label, withSeconds } from "./resKit";
import { CHANNELS } from "./PricingFields";

const OWNER: Record<string, string> = { MEMBER: "Membre", CUSTOMER: "Client", BUSINESS_ENTITY: "Entreprise" };

/** Détail d'un devis : tranches, ajustements, unités possibles */
export const QuoteResult: React.FC<{ quote: PriceQuote }> = ({ quote: q }) => (
  <div className="space-y-3 rounded-2xl bg-gray-50 p-4">
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <p className="text-sm text-gray-600">
        Unité retenue : <span className="font-semibold">{label(UNIT_LABEL, q.bookingUnit)}</span>
        {q.units != null ? ` · ${q.units} unité(s)` : ""}
        {q.quantity && q.quantity > 1 ? ` · quantité ${q.quantity}` : ""}
      </p>
      <p className="text-xl font-bold text-gray-900">{formatMoney(q.finalPrice ?? q.amount, q.currency || "XAF")}</p>
    </div>
    {q.amount != null && q.finalPrice != null && q.amount !== q.finalPrice && <p className="text-xs text-gray-500">Montant exact {q.amount}, arrondi à {q.finalPrice}.</p>}
    {(q.lines ?? []).length > 0 && (
      <div className="space-y-1">
        <p className="text-xs font-semibold text-gray-500">Tranches</p>
        {q.lines!.map((l, i) => (
          <div key={i} className="rounded-xl bg-white px-3 py-2 text-xs text-gray-700">
            {l.from ? String(l.from).replace("T", " ").slice(0, 16) : ""} → {l.to ? String(l.to).replace("T", " ").slice(0, 16) : ""} · {l.units} × {l.unitPrice} = <span className="font-semibold">{l.amount}</span>
            {l.baseRuleLabel ? ` · base : ${l.baseRuleLabel}` : ""}
            {(l.adjustments ?? []).map((a, k) => (
              <span key={k} className="ml-2 inline-block">
                <StatusChip tone="pink">
                  {a.label || a.ruleId} ({a.type} {a.value})
                </StatusChip>
              </span>
            ))}
          </div>
        ))}
      </div>
    )}
    {(q.alternatives ?? []).length > 0 && (
      <div className="space-y-1">
        <p className="text-xs font-semibold text-gray-500">Coût de chaque unité possible</p>
        <div className="flex flex-wrap gap-2">
          {q.alternatives!.map((a) => (
            <StatusChip key={a.unit} tone={a.chosen ? "success" : "neutral"}>
              {label(UNIT_LABEL, a.unit)} : {formatMoney(a.amount, "XAF")}
            </StatusChip>
          ))}
        </div>
      </div>
    )}
  </div>
);

/** Simulateur : vérifier une grille avant de la publier (POST /resource-pricing-rules/simulate) */
export const PricingSimulator: React.FC<{ resourceCode?: string }> = ({ resourceCode: initial = "" }) => {
  const [f, setF] = useState({ resourceCode: initial, startedAt: "", endedAt: "", quantity: "", bookingUnit: "", ownerType: "", ownerCode: "", channel: "" });
  const [error, setError] = useState<string | null>(null);
  const [quote, setQuote] = useState<PriceQuote | null>(null);
  const set = (p: Partial<typeof f>) => setF((s) => ({ ...s, ...p }));

  const sim = useMutation({
    mutationFn: () =>
      resourceOpsService.simulatePrice({
        resourceCode: f.resourceCode,
        startedAt: withSeconds(f.startedAt),
        endedAt: withSeconds(f.endedAt),
        quantity: f.quantity === "" ? undefined : Number(f.quantity),
        bookingUnit: f.bookingUnit || undefined,
        ownerType: f.ownerCode.trim() ? f.ownerType || undefined : undefined,
        ownerCode: f.ownerCode.trim() || undefined,
        channel: f.channel || undefined,
      }),
    onSuccess: (q) => {
      setQuote(q);
      setError(null);
    },
    onError: (e) => setError(apiMessage(e, "Simulation impossible")),
  });

  return (
    <Section title="Simulateur de prix" description="Le devis annonce ce qui sera facturé : même moteur que la réservation, le portail et le catalogue." icon={Calculator}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!f.resourceCode || !f.startedAt || !f.endedAt) return setError("Ressource, début et fin sont obligatoires.");
          if (f.endedAt <= f.startedAt) return setError("La fin doit être postérieure au début.");
          setError(null);
          sim.mutate();
        }}
      >
        <Field label="Ressource" required>
          <ResourceAutocomplete selectedCode={f.resourceCode} onSelect={(r) => set({ resourceCode: r?.code || "" })} required />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Début" required>
            <input type="datetime-local" value={f.startedAt} onChange={(e) => set({ startedAt: e.target.value })} className={FIELD} />
          </Field>
          <Field label="Fin" required>
            <input type="datetime-local" value={f.endedAt} min={f.startedAt} onChange={(e) => set({ endedAt: e.target.value })} className={FIELD} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Quantité" hint="Postes ou participants.">
            <input type="number" min={1} value={f.quantity} onChange={(e) => set({ quantity: e.target.value })} className={FIELD} />
          </Field>
          <Field label="Unité imposée" hint="Vide : la moins chère.">
            <select value={f.bookingUnit} onChange={(e) => set({ bookingUnit: e.target.value })} className={FIELD}>
              <option value="">Automatique</option>
              {UNITS.map((u) => (
                <option key={u} value={u}>
                  {UNIT_LABEL[u]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Canal">
            <select value={f.channel} onChange={(e) => set({ channel: e.target.value })} className={FIELD}>
              <option value="">Par défaut</option>
              {Object.entries(CHANNELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Prix pour un client précis" hint="Facultatif : applique le segment du titulaire.">
          <div className="flex gap-2">
            <select value={f.ownerType} onChange={(e) => set({ ownerType: e.target.value })} className={`${FIELD} !w-44`}>
              <option value="">Type</option>
              {Object.entries(OWNER).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            <input value={f.ownerCode} onChange={(e) => set({ ownerCode: e.target.value })} placeholder="Code" className={FIELD} />
          </div>
        </Field>
        {error && <p className="rounded-2xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <ActionButton type="submit" icon={Calculator} pending={sim.isPending}>
          Simuler
        </ActionButton>
      </form>
      {quote && <QuoteResult quote={quote} />}
    </Section>
  );
};

/** Paires de règles ambiguës d'une ressource (GET /resource-pricing-rules/conflicts) */
export const PricingConflictsPanel: React.FC = () => {
  const [resourceCode, setResourceCode] = useState("");
  const q = useQuery({ queryKey: ["resource-pricing-conflicts", resourceCode], queryFn: () => resourceOpsService.getPricingConflicts(resourceCode), enabled: !!resourceCode });
  const list = q.data ?? [];
  return (
    <Section title="Conflits de tarifs" description="Deux prix de base, ou deux ajustements non cumulables, de même priorité et précision sur les mêmes créneaux : la plus récente l'emporte." icon={GitCompare}>
      <Field label="Ressource">
        <ResourceAutocomplete selectedCode={resourceCode} onSelect={(r) => setResourceCode(r?.code || "")} />
      </Field>
      {!resourceCode ? null : q.isLoading ? (
        <ListSkeleton rows={2} />
      ) : q.isError ? (
        <ErrorBlock message="Les conflits n'ont pas pu être chargés." onRetry={() => q.refetch()} />
      ) : list.length === 0 ? (
        <p className="text-sm text-emerald-700">Aucun conflit sur cette ressource.</p>
      ) : (
        <div className="space-y-2">
          {list.map((c, i) => (
            <div key={i} className="flex items-start gap-3 rounded-2xl bg-amber-50 p-3 text-sm text-amber-900">
              <TriangleAlert size={16} className="mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold">
                  {c.firstLabel || `Règle ${c.firstRuleId}`} (n° {c.firstRuleId}) et {c.secondLabel || `règle ${c.secondRuleId}`} (n° {c.secondRuleId})
                </p>
                <p className="text-xs">
                  {c.unit ? `${label(UNIT_LABEL, c.unit)} · ` : ""}
                  {c.reason}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
};

const CHANGE: Record<string, string> = { CREATED: "Création", UPDATED: "Modification", ACTIVATED: "Activation", DEACTIVATED: "Désactivation", DELETED: "Suppression" };

/** Versions d'une règle : chaque changement avec la règle complète, la plus récente d'abord */
export const RuleHistory: React.FC<{ ruleId: string | number }> = ({ ruleId }) => {
  const q = useQuery({ queryKey: ["resource-pricing-rule-history", ruleId], queryFn: () => resourceOpsService.getPricingRuleHistory(ruleId) });
  const [open, setOpen] = useState<number | null>(null);
  const list = q.data ?? [];
  return (
    <Section title="Historique" description="Chaque création, modification, activation et suppression, avec la règle complète à ce moment." icon={History}>
      {q.isLoading ? (
        <ListSkeleton rows={3} />
      ) : q.isError ? (
        <ErrorBlock message="L'historique n'a pas pu être chargé." onRetry={() => q.refetch()} />
      ) : list.length === 0 ? (
        <EmptyState icon={History} title="Aucune version" />
      ) : (
        <div className="space-y-2">
          {list.map((v) => {
            let pretty = v.snapshot ?? "";
            try {
              pretty = JSON.stringify(JSON.parse(v.snapshot ?? ""), null, 2);
            } catch {
              /* texte brut */
            }
            return (
              <div key={`${v.id}-${v.version}`} className="rounded-2xl bg-gray-50 p-3">
                <button type="button" onClick={() => setOpen(open === v.version ? null : v.version)} className="flex w-full flex-wrap items-center gap-3 text-left text-sm">
                  <span className="font-semibold text-gray-900">Version {v.version}</span>
                  <StatusChip tone="pink">{CHANGE[v.changeType] ?? v.changeType}</StatusChip>
                  <span className="text-xs text-gray-500">
                    {v.changedBy || "?"} · {formatDateTime(v.changedAt)}
                  </span>
                </button>
                {open === v.version && pretty && <pre className="mt-2 max-h-64 overflow-auto rounded-xl bg-white p-3 text-xs text-gray-700">{pretty}</pre>}
              </div>
            );
          })}
        </div>
      )}
    </Section>
  );
};
