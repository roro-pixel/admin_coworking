import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Scale } from "lucide-react";
import { subscriptionDerivationService } from "../../../services/subscriptionDerivation.service";
import { EmptyState, ErrorBlock, Field, Section } from "../kit";
import { FIELD_SOFT, formatMoney } from "../kitUtils";
import { Skeleton } from "../../ui/Skeleton";
import { DERIVATION_REASONS } from "./lifecycleLabels";

/** Rapport des concessions : combien chaque personne a accordé, par raison, sur une période. */
export const ConcessionsPanel: React.FC = () => {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["derivations", "concessions", from, to],
    queryFn: () => subscriptionDerivationService.getConcessions({ from: from || undefined, to: to || undefined }),
  });
  const rows = data ?? [];
  const max = Math.max(1, ...rows.map((r) => Math.abs(r.totalImpact)));

  return (
    <Section title="Concessions accordées" description="Impact cumulé des prix négociés" icon={Scale}>
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Du"><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={FIELD_SOFT} /></Field>
        <Field label="Au"><input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={FIELD_SOFT} /></Field>
      </div>
      {isLoading ? (
        <Skeleton className="h-32 w-full rounded-2xl" />
      ) : isError ? (
        <ErrorBlock message="Impossible de charger le rapport." onRetry={() => refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState icon={Scale} title="Aucune concession" hint="Aucun prix négocié sur cette période." />
      ) : (
        <div className="space-y-1.5">
          {rows.map((r) => (
            <div key={`${r.requestedBy}-${r.reason}`} className="rounded-xl bg-white px-4 py-3 shadow-sm">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-semibold text-gray-900">
                  {r.requestedBy} <span className="font-normal text-gray-400">· {DERIVATION_REASONS.find((x) => x.value === r.reason)?.label ?? r.reason}</span>
                </p>
                <p className="text-sm text-gray-600">
                  {r.count} dérivation{r.count > 1 ? "s" : ""} · <span className="font-bold text-gray-900">{formatMoney(r.totalImpact, "FCFA")}</span>
                </p>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100" aria-hidden>
                <div className="h-full rounded-full bg-[color:var(--logo-pink)]" style={{ width: `${(Math.abs(r.totalImpact) / max) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
};
