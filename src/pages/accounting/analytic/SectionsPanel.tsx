import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Layers } from "lucide-react";
import { ActionForm } from "../../../components/accounting/ActionForm";
import type { FieldDef } from "../../../components/accounting/ActionForm";
import { analyticService } from "../../../services/analytic.service";
import type { Section } from "../../../services/analytic.service";
import { useAuth } from "../../../contexts/AuthContext";
import { ActionButton, CheckField, EmptyState, ErrorBlock, Field, ListHeader, StatusChip } from "../../../components/subscription/kit";
import { FIELD } from "../../../components/subscription/kitUtils";
import { ListSkeleton } from "../../../components/ui/Skeleton";
import { toast } from "../../../components/ui/toastStore";

const SECTION_FIELDS: FieldDef[] = [
  { key: "label", label: "Libellé", required: true }, { key: "code", label: "Code", hint: "Proposé depuis le libellé si vide" }, { key: "parentCode", label: "Section parente" },
  { key: "family", label: "Famille" }, { key: "costBehavior", label: "Nature du coût", hint: "Fixe ou variable, selon le serveur" }, { key: "responsible", label: "Responsable" },
  { key: "validFrom", label: "Valide du", type: "date" }, { key: "validTo", label: "Valide jusqu'au", type: "date" }, { key: "color", label: "Couleur" },
  { key: "sortOrder", label: "Ordre", type: "number" }, { key: "accounts", label: "Comptes rattachés", type: "list", hint: "Préfixes séparés par des virgules" },
  { key: "auxiliary", label: "Section auxiliaire (répartition secondaire)", type: "bool" },
];

const flat = (rows: Section[], depth = 0): { s: Section; depth: number }[] => rows.flatMap((s) => [{ s, depth }, ...flat(s.children ?? [], depth + 1)]);
const tone = (s?: string) => (s === "ACTIVE" ? "success" : s === "PENDING" || s === "PENDING_APPROVAL" ? "warn" : s === "CLOSED" || s === "REJECTED" ? "danger" : "neutral");

export const SectionsPanel: React.FC = () => {
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const canAdmin = hasPermission("ANALYTIC_SETTINGS:MANAGE");
  const canCreate = canAdmin || hasPermission("ANALYTIC_ITEM:CREATE");
  const [axis, setAxis] = useState("");
  const [closed, setClosed] = useState(false);
  const [form, setForm] = useState<Section | "new" | null>(null);
  const [merge, setMerge] = useState<Section | null>(null);
  const axes = useQuery({ queryKey: ["an-axes"], queryFn: analyticService.axes });
  const cur = axis || axes.data?.[0]?.code || "";
  const q = useQuery({ queryKey: ["an-sections", cur, closed], queryFn: () => analyticService.sections(cur, closed), enabled: !!cur });
  const pending = useQuery({ queryKey: ["an-pending"], queryFn: analyticService.pending });
  const refresh = () => { qc.invalidateQueries({ queryKey: ["an-sections"] }); qc.invalidateQueries({ queryKey: ["an-pending"] }); };

  const act = (s: Section, a: "approve" | "reject" | "close" | "reopen", label: string) => toast.confirm({
    tone: a === "reject" || a === "close" ? "danger" : "primary", message: `${label} la section ${s.code} ?`, detail: a === "close" ? "Plus d'imputation possible ; l'historique est conservé." : undefined, confirmLabel: label,
    successMessage: "Section mise à jour", errorMessage: "Action impossible", onConfirm: async () => { await analyticService.sectionAction(s.axisCode ?? cur, s.code, a); refresh(); },
  });
  const rows = flat(q.data ?? []);

  return (
    <div className="space-y-4">
      <ListHeader title="Sections analytiques" subtitle="Arbre par axe. Une section ne se supprime pas : elle se ferme ou se fusionne."
        action={canCreate && !form ? <ActionButton onClick={() => setForm("new")}>Nouvelle section</ActionButton> : undefined} />
      <div className="flex flex-wrap items-end gap-4">
        <Field label="Axe"><select className={FIELD} value={cur} onChange={(e) => setAxis(e.target.value)}>{(axes.data ?? []).map((a) => <option key={a.code} value={a.code}>{a.label ?? a.code}</option>)}</select></Field>
        <CheckField checked={closed} onChange={setClosed} label="Afficher les sections fermées" />
      </div>

      {(pending.data ?? []).length > 0 && canAdmin && (
        <div className="space-y-1.5 rounded-2xl bg-amber-50 p-3">
          <p className="text-sm font-semibold text-amber-800">Propositions à valider ({pending.data!.length})</p>
          {pending.data!.map((s) => (
            <div key={`${s.axisCode}-${s.code}`} className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span>{s.axisCode} · {s.code} · {s.label}{s.createdBy ? ` · proposée par ${s.createdBy}` : ""}</span>
              <span className="flex gap-2"><ActionButton onClick={() => act(s, "approve", "Valider")}>Valider</ActionButton><ActionButton variant="ghost" onClick={() => act(s, "reject", "Rejeter")}>Rejeter</ActionButton></span>
            </div>
          ))}
        </div>
      )}

      {form && (
        <ActionForm title={form === "new" ? `Nouvelle section (${cur})` : `Modifier ${form.code}`} fields={SECTION_FIELDS.map((f) => ({ ...f, def: form === "new" ? f.def : f.type === "bool" ? !!(form as unknown as Record<string, unknown>)[f.key] : Array.isArray((form as unknown as Record<string, unknown>)[f.key]) ? ((form as unknown as Record<string, unknown>)[f.key] as string[]).join(", ") : String((form as unknown as Record<string, unknown>)[f.key] ?? "") }))}
          onSubmit={async (v) => { if (form === "new") await analyticService.createSection(cur, v); else await analyticService.updateSection(cur, form.code, v); refresh(); toast.success("Section enregistrée"); }} onClose={() => setForm(null)} />
      )}
      {merge && (
        <ActionForm title={`Fusionner ${merge.code} dans…`} submitLabel="Fusionner" fields={[{ key: "into", label: "Section cible", required: true }, { key: "restate", label: "Retraiter le passé (déplacer les imputations passées)", type: "bool" }]}
          onSubmit={async (v) => { await analyticService.mergeSection(merge.axisCode ?? cur, merge.code, String(v.into), !!v.restate); refresh(); toast.success("Sections fusionnées"); }} onClose={() => setMerge(null)} />
      )}

      {q.isLoading ? <ListSkeleton /> : q.isError ? <ErrorBlock message="Chargement impossible." onRetry={() => q.refetch()} /> : rows.length === 0 ? <EmptyState icon={Layers} title="Aucune section" /> : (
        <div className="space-y-1.5">
          {rows.map(({ s, depth }) => (
            <div key={s.code} style={{ marginLeft: depth * 20 }} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-white p-3 shadow-sm">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900">{s.label} <span className="font-normal text-gray-400">· {s.code}</span></p>
                <p className="truncate text-xs text-gray-400">{[s.family, s.costBehavior, s.auxiliary && "auxiliaire", s.responsible, s.accounts?.length ? `comptes ${s.accounts.join(", ")}` : null, s.mergedInto && `fusionnée dans ${s.mergedInto}`].filter(Boolean).join(" · ")}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {s.status && <StatusChip tone={tone(s.status)}>{s.status}</StatusChip>}
                {canAdmin && <>
                  <ActionButton variant="ghost" onClick={() => setForm(s)}>Modifier</ActionButton>
                  {s.status === "CLOSED" ? <ActionButton variant="ghost" onClick={() => act(s, "reopen", "Rouvrir")}>Rouvrir</ActionButton> : <ActionButton variant="ghost" onClick={() => act(s, "close", "Fermer")}>Fermer</ActionButton>}
                  <ActionButton variant="ghost" onClick={() => setMerge(s)}>Fusionner</ActionButton>
                </>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
