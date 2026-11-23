import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2 } from "lucide-react";
import { fixedAssetService } from "../../../services/fixedAsset.service";
import type { Finding } from "../../../services/fixedAsset.service";
import { EmptyState, ErrorBlock, Field, ListHeader, Section, StatusChip } from "../../../components/subscription/kit";
import { FIELD } from "../../../components/subscription/kitUtils";
import { ListSkeleton } from "../../../components/ui/Skeleton";

const tone = (s?: string) => (s && /BLOCK|ERROR|CRIT/i.test(s) ? "danger" : s && /WARN/i.test(s) ? "warn" : "info");
const List: React.FC<{ q: { isLoading: boolean; isError: boolean; data?: Finding[]; refetch: () => unknown } }> = ({ q }) =>
  q.isLoading ? <ListSkeleton /> : q.isError ? <ErrorBlock message="Chargement impossible." onRetry={() => q.refetch()} /> : (q.data ?? []).length === 0 ? <EmptyState icon={CheckCircle2} title="Aucun constat" /> : (
    <div className="space-y-1.5">
      {q.data!.map((f, i) => (
        <div key={i} className="flex flex-wrap items-start justify-between gap-2 rounded-xl bg-white p-2.5 text-sm shadow-sm">
          <span><b className="text-gray-900">{f.subject}</b> <span className="text-gray-600">{f.message}</span></span>
          {f.severity && <StatusChip tone={tone(f.severity)}>{f.severity}</StatusChip>}
        </div>
      ))}
    </div>
  );

export const ControlsPanel: React.FC = () => {
  const [date, setDate] = useState("");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const controls = useQuery({ queryKey: ["fa-controls", date], queryFn: () => fixedAssetService.controls(date || undefined) });
  const closing = useQuery({ queryKey: ["fa-closing", year], queryFn: () => fixedAssetService.closingCheck(Number(year)), enabled: /^\d{4}$/.test(year) });
  return (
    <div className="space-y-6">
      <ListHeader title="Contrôles" subtitle="Constats quotidiens et liste de clôture de l'exercice. Un constat bloquant empêche la clôture." />
      <Section title="Contrôles quotidiens">
        <Field label="À la date du" hint="Aujourd'hui si vide"><input type="date" className={FIELD} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <div className="mt-3"><List q={controls} /></div>
      </Section>
      <Section title="Liste de clôture">
        <Field label="Exercice"><input className={FIELD} inputMode="numeric" value={year} onChange={(e) => setYear(e.target.value)} /></Field>
        <div className="mt-3"><List q={closing} /></div>
      </Section>
    </div>
  );
};
