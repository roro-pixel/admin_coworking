import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, Flame, Gavel, RefreshCw, RotateCcw, ScanText, ShieldCheck, Trash2, Unlock } from "lucide-react";
import { gedService } from "../../services/ged.service";
import type { GedDestructionCandidate, GedHold, GedPurgeResult, GedTrashBatch } from "../../services/ged.service";
import { ActionButton, DataCard, EmptyState, ErrorBlock, Field, IconButton, ItemRow, ListHeader, PanelForm, Section, StatusChip } from "../../components/subscription/kit";
import { FIELD, FIELD_SOFT, apiMessage } from "../../components/subscription/kitUtils";
import { ListSkeleton } from "../../components/ui/Skeleton";
import { toast } from "../../components/ui/toastStore";
import { RefreshButton } from "../../components/reporting/reportKit";
import { dateTime, fmtInt, formatBytes } from "../../components/documents/docUtils";
import { purgeSummary, percent } from "../../components/ged/gedUtils";
import { isFolder } from "../../components/ged/gedUtils";

const Warn: React.FC<{ children: React.ReactNode }> = ({ children }) => <p className="rounded-2xl bg-amber-50 p-3 text-xs text-amber-800">{children}</p>;

/** Saisie d'un motif obligatoire avant une action irréversible. */
const ReasonForm: React.FC<{ title: string; submitLabel: string; hint?: string; pending: boolean; error?: string | null; onSubmit: (reason: string) => void; onCancel: () => void; children?: React.ReactNode }> = ({ title, submitLabel, hint, pending, error, onSubmit, onCancel, children }) => {
  const [reason, setReason] = useState("");
  return (
    <PanelForm
      title={title}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(reason.trim());
      }}
      onCancel={onCancel}
      pending={pending}
      submitLabel={submitLabel}
      submitDisabled={!reason.trim()}
      error={error}
    >
      {children}
      <Field label="Motif" required hint={hint}>
        <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} className={`${FIELD} resize-none`} />
      </Field>
    </PanelForm>
  );
};

// ───────────────────────── Corbeille ─────────────────────────

type TrashAction = { kind: "purge"; batch: GedTrashBatch } | { kind: "empty"; olderThanDays: number };

export const GedTrashPanel: React.FC<{ canWrite: boolean; isAdmin: boolean; onChanged: () => void }> = ({ canWrite, isAdmin, onChanged }) => {
  const queryClient = useQueryClient();
  const [action, setAction] = useState<TrashAction | null>(null);
  const [days, setDays] = useState("0");
  const [error, setError] = useState<string | null>(null);

  const query = useQuery({ queryKey: ["ged-trash"], queryFn: () => gedService.trashContent() });
  const batches = query.data ?? [];
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["ged-trash"] });
    queryClient.invalidateQueries({ queryKey: ["ged-tree"] });
    queryClient.invalidateQueries({ queryKey: ["ged-items"] });
    queryClient.invalidateQueries({ queryKey: ["ged-usage"] });
    onChanged();
  };

  const restore = useMutation({
    mutationFn: (batch: string) => gedService.restoreBatch(batch),
    onSuccess: (r) => {
      toast.success(`Restauré : ${r.folders ?? 0} dossier(s), ${r.documents ?? 0} fichier(s)`);
      refresh();
    },
    onError: (e) => toast.error(apiMessage(e, "Restauration impossible")),
  });
  const destroy = useMutation({
    mutationFn: ({ a, reason }: { a: TrashAction; reason: string }) => (a.kind === "purge" ? gedService.purgeBatch(a.batch.batch, reason) : gedService.emptyTrash(reason, a.olderThanDays)),
    onSuccess: (r) => {
      toast.success(purgeSummary(r));
      setAction(null);
      setError(null);
      refresh();
    },
    onError: (e) => setError(apiMessage(e, "Destruction impossible")),
  });

  return (
    <div className="space-y-4">
      <ListHeader
        title="Corbeille"
        subtitle="Les éléments sont détruits définitivement 30 jours après leur suppression."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <RefreshButton fetching={query.isFetching} onClick={() => query.refetch()} />
            {isAdmin && canWrite && batches.length > 0 && (
              <ActionButton variant="danger" icon={Flame} onClick={() => setAction({ kind: "empty", olderThanDays: Math.max(0, Number(days) || 0) })}>
                Vider la corbeille
              </ActionButton>
            )}
          </div>
        }
      />

      {isAdmin && canWrite && batches.length > 0 && (
        <Field label="Vider seulement ce qui y est depuis plus de (jours)" hint="0 : tout vider.">
          <input type="number" min={0} value={days} onChange={(e) => setDays(e.target.value)} className={`${FIELD_SOFT} w-40`} />
        </Field>
      )}

      {action && (
        <ReasonForm
          title={action.kind === "purge" ? "Détruire définitivement ce lot" : action.olderThanDays > 0 ? `Détruire ce qui est à la corbeille depuis plus de ${action.olderThanDays} jours` : "Vider toute la corbeille"}
          submitLabel="Détruire définitivement"
          hint="Le motif est conservé avec la trace de la destruction."
          pending={destroy.isPending}
          error={error}
          onSubmit={(reason) => destroy.mutate({ a: action, reason })}
          onCancel={() => {
            setAction(null);
            setError(null);
          }}
        >
          <Warn>Action irréversible : toutes les versions des fichiers sont effacées du stockage. Un fichier sous gel juridique est épargné. La ligne du document reste comme trace (qui, quand, pourquoi).</Warn>
        </ReasonForm>
      )}

      {query.isLoading ? (
        <ListSkeleton rows={4} />
      ) : query.isError ? (
        <ErrorBlock message="La corbeille n'a pas pu être chargée." onRetry={() => query.refetch()} />
      ) : batches.length === 0 ? (
        <EmptyState icon={Trash2} title="La corbeille est vide" hint="Les éléments supprimés y restent 30 jours, le temps de les restaurer." />
      ) : (
        <DataCard>
          <div className="divide-y divide-gray-100">
            {batches.map((b) => (
              <div key={b.batch} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{(b.items ?? []).map((i) => i.name).slice(0, 3).join(", ") || b.batch}{(b.items ?? []).length > 3 ? "…" : ""}</p>
                  <p className="text-xs text-gray-500">
                    <span className="font-mono">{b.batch}</span> · supprimé le {dateTime(b.trashedAt)} · {fmtInt(b.folders ?? 0)} dossier(s), {fmtInt(b.documents ?? 0)} fichier(s)
                  </p>
                  <p className="mt-1 text-xs text-gray-400">{(b.items ?? []).map((i) => (isFolder(i) ? `📁 ${i.name}` : i.name)).join(" · ")}</p>
                </div>
                {canWrite && (
                  <div className="flex shrink-0 items-center gap-2">
                    <ActionButton variant="ghost" icon={RotateCcw} pending={restore.isPending} onClick={() => restore.mutate(b.batch)}>
                      Restaurer
                    </ActionButton>
                    {isAdmin && <IconButton icon={Flame} label="Détruire ce lot" tone="danger" onClick={() => setAction({ kind: "purge", batch: b })} />}
                  </div>
                )}
              </div>
            ))}
          </div>
        </DataCard>
      )}
    </div>
  );
};

// ───────────────────────── Gel juridique ─────────────────────────

export const GedHoldsPanel: React.FC<{ canWrite: boolean; isAdmin: boolean }> = ({ canWrite, isAdmin }) => {
  const queryClient = useQueryClient();
  const [showAll, setShowAll] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [form, setForm] = useState({ targetType: "FOLDER", targetCode: "", reference: "" });
  const [releasing, setReleasing] = useState<GedHold | null>(null);
  const [error, setError] = useState<string | null>(null);

  const query = useQuery({ queryKey: ["ged-holds", showAll], queryFn: () => gedService.holds(!showAll), enabled: isAdmin });
  const holds = query.data ?? [];
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["ged-holds"] });
    queryClient.invalidateQueries({ queryKey: ["ged-items"] });
  };

  const place = useMutation({
    mutationFn: (reason: string) => gedService.placeHold({ targetType: form.targetType, targetCode: form.targetCode.trim(), reason, reference: form.reference.trim() || undefined }),
    onSuccess: () => {
      toast.success("Gel posé");
      setPlacing(false);
      setForm({ targetType: "FOLDER", targetCode: "", reference: "" });
      setError(null);
      refresh();
    },
    onError: (e) => setError(apiMessage(e, "Gel impossible")),
  });
  const release = useMutation({
    mutationFn: ({ code, reason }: { code: string; reason: string }) => gedService.releaseHold(code, reason),
    onSuccess: () => {
      toast.success("Gel levé");
      setReleasing(null);
      setError(null);
      refresh();
    },
    onError: (e) => setError(apiMessage(e, "Levée impossible (déjà levé ?)")),
  });

  if (!isAdmin) return <EmptyState icon={Gavel} title="Réservé aux administrateurs" hint="Le gel juridique se consulte et se gère avec le rôle ADMIN ou SUPER_ADMIN." />;

  return (
    <div className="space-y-4">
      <ListHeader
        title="Gel juridique"
        subtitle="Un contentieux ou un contrôle impose de garder des documents tels quels : ils ne partent ni à la corbeille, ni en destruction, ni en archive, et ne se remplacent plus."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <RefreshButton fetching={query.isFetching} onClick={() => query.refetch()} />
            {canWrite && (
              <ActionButton icon={Gavel} onClick={() => setPlacing(true)}>
                Poser un gel
              </ActionButton>
            )}
          </div>
        }
      />

      {placing && (
        <ReasonForm title="Poser un gel juridique" submitLabel="Poser le gel" pending={place.isPending} error={error} onSubmit={(r) => place.mutate(r)} onCancel={() => { setPlacing(false); setError(null); }}>
          <p className="text-xs text-gray-500">Un gel porte sur un fichier, ou sur un dossier et tout ce qu'il contient, y compris ce qui y sera déposé ensuite. Lire, télécharger, renommer et déplacer restent permis.</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Cible" required>
              <select value={form.targetType} onChange={(e) => setForm({ ...form, targetType: e.target.value })} className={FIELD}>
                <option value="FOLDER">Dossier</option>
                <option value="DOCUMENT">Fichier</option>
              </select>
            </Field>
            <Field label="Code" required hint="Code du dossier ou du fichier, visible dans la liste.">
              <input value={form.targetCode} onChange={(e) => setForm({ ...form, targetCode: e.target.value })} className={FIELD} />
            </Field>
            <Field label="Référence" hint="Facultatif : numéro de dossier ou d'affaire.">
              <input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} className={FIELD} />
            </Field>
          </div>
          {!form.targetCode.trim() && <p className="text-xs text-amber-700">Le code de la cible est obligatoire.</p>}
        </ReasonForm>
      )}

      {releasing && (
        <ReasonForm title={`Lever le gel ${releasing.code}`} submitLabel="Lever le gel" pending={release.isPending} error={error} onSubmit={(r) => release.mutate({ code: releasing.code, reason: r })} onCancel={() => { setReleasing(null); setError(null); }}>
          <p className="text-xs text-gray-500">Un gel se lève, il ne s'efface pas : qui l'a posé et levé, quand et pourquoi restent consultables.</p>
        </ReasonForm>
      )}

      <label className="flex w-fit cursor-pointer items-center gap-2 text-sm text-gray-700">
        <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} className="h-4 w-4 rounded accent-[color:var(--logo-pink-dark)]" />
        Afficher aussi les gels levés
      </label>

      {query.isLoading ? (
        <ListSkeleton rows={3} />
      ) : query.isError ? (
        <ErrorBlock message="Les gels n'ont pas pu être chargés." onRetry={() => query.refetch()} />
      ) : holds.length === 0 ? (
        <EmptyState icon={ShieldCheck} title="Aucun gel en cours" />
      ) : (
        <div className="space-y-2">
          {holds.map((h) => (
            <ItemRow key={h.code} className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 space-y-1">
                <p className="text-sm font-semibold text-gray-900">
                  {h.targetName || h.targetCode} <span className="font-normal text-gray-500">· {h.targetType === "FOLDER" ? "dossier" : "fichier"}</span>
                </p>
                <p className="text-xs text-gray-500">
                  <span className="font-mono">{h.code}</span>
                  {h.reference ? ` · réf. ${h.reference}` : ""} · posé le {dateTime(h.placedAt)} par {h.placedBy}
                </p>
                <p className="text-sm text-gray-700">{h.reason}</p>
                {!h.active && (
                  <p className="text-xs text-gray-500">
                    Levé le {dateTime(h.releasedAt)} par {h.releasedBy} : {h.releaseReason}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <StatusChip tone={h.active ? "warn" : "neutral"}>{h.active ? "En cours" : "Levé"}</StatusChip>
                {h.active && canWrite && <IconButton icon={Unlock} label="Lever le gel" onClick={() => { setReleasing(h); setError(null); window.scrollTo({ top: 0, behavior: "smooth" }); }} />}
              </div>
            </ItemRow>
          ))}
        </div>
      )}
    </div>
  );
};

// ───────────────────────── À détruire ─────────────────────────

type DueAction = "destroy" | "keep";

export const GedRetentionPanel: React.FC<{ canWrite: boolean; isAdmin: boolean }> = ({ canWrite, isAdmin }) => {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<string[]>([]);
  const [action, setAction] = useState<DueAction | null>(null);
  const [error, setError] = useState<string | null>(null);

  const query = useQuery({ queryKey: ["ged-retention-due"], queryFn: () => gedService.retentionDue(200) });
  const due: GedDestructionCandidate[] = query.data ?? [];
  const refresh = () => {
    setSelected([]);
    setAction(null);
    setError(null);
    queryClient.invalidateQueries({ queryKey: ["ged-retention-due"] });
    queryClient.invalidateQueries({ queryKey: ["ged-usage"] });
  };

  const run = useMutation({
    mutationFn: () => gedService.retentionRun(),
    onSuccess: (r) => {
      toast.success(`${r.applied ?? 0} règle(s) appliquée(s)`);
      refresh();
    },
    onError: (e) => toast.error(apiMessage(e, "Application impossible")),
  });
  const decide = useMutation<GedPurgeResult | Record<string, number>, Error, { kind: DueAction; reason: string }>({
    mutationFn: ({ kind, reason }) => (kind === "destroy" ? gedService.retentionDestroy(selected, reason) : gedService.retentionKeep(selected, reason)),
    onSuccess: (r, v) => {
      toast.success(v.kind === "destroy" ? purgeSummary(r as never) : `${(r as Record<string, number>).kept ?? selected.length} fichier(s) conservé(s)`);
      refresh();
    },
    onError: (e) => setError(apiMessage(e, "Action impossible")),
  });

  const toggle = (code: string) => setSelected((p) => (p.includes(code) ? p.filter((c) => c !== code) : [...p, code]));
  const selectable = due.filter((d) => !d.item.held).map((d) => d.item.code);

  return (
    <div className="space-y-4">
      <ListHeader
        title="À détruire"
        subtitle="Les fichiers marqués par une règle de conservation attendent la décision d'un administrateur. Les règles se gèrent dans Administration › Gouvernance."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <RefreshButton fetching={query.isFetching} onClick={() => query.refetch()} />
            {isAdmin && canWrite && (
              <ActionButton variant="ghost" icon={RefreshCw} pending={run.isPending} onClick={() => run.mutate()}>
                Appliquer les règles maintenant
              </ActionButton>
            )}
          </div>
        }
      />

      {action && (
        <ReasonForm
          title={action === "destroy" ? `Détruire ${selected.length} fichier${selected.length > 1 ? "s" : ""}` : `Conserver ${selected.length} fichier${selected.length > 1 ? "s" : ""}`}
          submitLabel={action === "destroy" ? "Détruire définitivement" : "Conserver"}
          hint={action === "keep" ? "Le fichier sort du marquage et des règles ; le motif est ajouté à sa description." : undefined}
          pending={decide.isPending}
          error={error}
          onSubmit={(reason) => decide.mutate({ kind: action, reason })}
          onCancel={() => {
            setAction(null);
            setError(null);
          }}
        >
          {action === "destroy" && <Warn>Action irréversible : toutes les versions sont effacées du stockage. Un fichier sous gel juridique n'est jamais détruit.</Warn>}
        </ReasonForm>
      )}

      {isAdmin && canWrite && selected.length > 0 && !action && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-white p-3 shadow-sm">
          <span className="text-sm font-semibold text-gray-700">{selected.length} sélectionné(s)</span>
          <ActionButton variant="danger" icon={Flame} onClick={() => setAction("destroy")}>
            Confirmer la destruction
          </ActionButton>
          <ActionButton variant="ghost" icon={Archive} onClick={() => setAction("keep")}>
            Garder
          </ActionButton>
        </div>
      )}

      {query.isLoading ? (
        <ListSkeleton rows={4} />
      ) : query.isError ? (
        <ErrorBlock message="La liste n'a pas pu être chargée." onRetry={() => query.refetch()} />
      ) : due.length === 0 ? (
        <EmptyState icon={ShieldCheck} title="Rien à détruire" hint="Aucun fichier n'est marqué par une règle de conservation." />
      ) : (
        <DataCard>
          <div className="divide-y divide-gray-100">
            {isAdmin && canWrite && (
              <label className="flex items-center gap-3 px-4 py-2 text-xs font-semibold text-gray-500">
                <input type="checkbox" checked={selectable.length > 0 && selected.length === selectable.length} onChange={(e) => setSelected(e.target.checked ? selectable : [])} className="h-4 w-4 rounded accent-[color:var(--logo-pink-dark)]" />
                Tout sélectionner
              </label>
            )}
            {due.map((d) => (
              <div key={d.item.code} className="flex items-center gap-3 p-4">
                {isAdmin && canWrite && <input type="checkbox" aria-label={`Sélectionner ${d.item.name}`} disabled={d.item.held} checked={selected.includes(d.item.code)} onChange={() => toggle(d.item.code)} className="h-4 w-4 rounded accent-[color:var(--logo-pink-dark)]" />}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-900">{d.item.name}</p>
                  <p className="truncate text-xs text-gray-500">
                    {d.location || "Racine"} · règle <span className="font-mono">{d.policyCode}</span> · échue le {dateTime(d.dueAt)} · {formatBytes(d.item.size)}
                  </p>
                </div>
                {d.item.held && <StatusChip tone="warn">Sous gel</StatusChip>}
              </div>
            ))}
          </div>
        </DataCard>
      )}
    </div>
  );
};

// ───────────────────────── Lecture du texte et classement ─────────────────────────

export const GedIndexPanel: React.FC<{ canWrite: boolean }> = ({ canWrite }) => {
  const queryClient = useQueryClient();
  const status = useQuery({ queryKey: ["ged-text-status"], queryFn: () => gedService.textStatus(), refetchInterval: 60_000 });
  const usage = useQuery({ queryKey: ["ged-usage", "all"], queryFn: () => gedService.usage() });
  const [limit, setLimit] = useState("20");
  const [filingLimit, setFilingLimit] = useState("1000");

  const runText = useMutation({
    mutationFn: () => gedService.runText(Math.max(1, Number(limit) || 20)),
    onSuccess: (r) => {
      toast.success(`${r.processed ?? 0} lu(s) : ${r.done ?? 0} réussi(s), ${r.empty ?? 0} vide(s), ${r.unsupported ?? 0} non lu(s), ${r.failed ?? 0} en échec. Il en reste ${fmtInt(r.remaining ?? 0)}.`);
      queryClient.invalidateQueries({ queryKey: ["ged-text-status"] });
    },
    onError: (e) => toast.error(apiMessage(e, "Lecture impossible")),
  });
  const runFiling = useMutation({
    mutationFn: () => gedService.runFiling(Math.max(1, Number(filingLimit) || 1000)),
    onSuccess: (r) => {
      toast.success(`${r.filed ?? 0} rangé(s), ${r.skipped ?? 0} ignoré(s). Il en reste ${fmtInt(r.remaining ?? 0)}.`);
      queryClient.invalidateQueries({ queryKey: ["ged-tree"] });
      queryClient.invalidateQueries({ queryKey: ["ged-items"] });
    },
    onError: (e) => toast.error(apiMessage(e, "Classement impossible")),
  });

  const s = status.data;
  const u = usage.data;
  const globalPct = percent(u?.totalUsedBytes, u?.totalQuotaBytes);

  return (
    <div className="space-y-4">
      <ListHeader title="Indexation et classement" subtitle="Lecture du texte des fichiers pour la recherche plein texte, rangement automatique des pièces, espace utilisé." />

      <Section title={`Indexation : ${fmtInt(s?.pending ?? 0)} fichier${(s?.pending ?? 0) > 1 ? "s" : ""} en attente`} description="Le serveur lit les fichiers déposés en tâche de fond (toutes les minutes, 20 par passage). Un échec est retenté seul après six heures, trois fois au plus.">
        <div className="flex flex-wrap gap-2">
          {Object.entries(s?.byStatus ?? {}).map(([k, v]) => (
            <StatusChip key={k} tone={k === "DONE" ? "success" : k === "FAILED" ? "danger" : k === "PENDING" ? "warn" : "neutral"}>
              {k === "DONE" ? "Lus" : k === "FAILED" ? "En échec" : k === "PENDING" ? "En attente" : k === "EMPTY" ? "Vides" : k === "UNSUPPORTED" ? "Non lus" : k} : {fmtInt(v)}
            </StatusChip>
          ))}
        </div>
        {canWrite && (
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <Field label="Fichiers à lire">
              <input type="number" min={1} value={limit} onChange={(e) => setLimit(e.target.value)} className={`${FIELD} w-32`} />
            </Field>
            <ActionButton icon={ScanText} pending={runText.isPending} onClick={() => runText.mutate()}>
              Lire un lot maintenant
            </ActionButton>
          </div>
        )}
        {runText.isPending && <p className="mt-2 text-xs text-gray-500">L'OCR prend 2 à 3 secondes par page : l'opération peut durer.</p>}
      </Section>

      <Section title="Classement automatique" description="Range dans le plan de classement les documents qui n'ont pas encore de dossier. Un fichier déplacé à la main n'est jamais repris.">
        {canWrite ? (
          <div className="flex flex-wrap items-end gap-3">
            <Field label="Documents à classer">
              <input type="number" min={1} value={filingLimit} onChange={(e) => setFilingLimit(e.target.value)} className={`${FIELD} w-32`} />
            </Field>
            <ActionButton icon={Archive} pending={runFiling.isPending} onClick={() => runFiling.mutate()}>
              Classer maintenant
            </ActionButton>
          </div>
        ) : (
          <p className="text-sm text-gray-500">Il faut le droit DOCUMENT:WRITE.</p>
        )}
      </Section>

      <Section title="Espace de toute la GED">
        {u ? (
          <div className="space-y-2">
            <p className="text-sm text-gray-700">
              <strong>{formatBytes(u.totalUsedBytes ?? u.usedBytes)}</strong>
              {u.totalQuotaBytes ? ` sur ${formatBytes(u.totalQuotaBytes)}` : " (aucun quota global)"} · {fmtInt(u.files ?? 0)} fichiers
            </p>
            {u.totalQuotaBytes ? (
              <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                <div className={`h-full rounded-full ${globalPct >= 90 ? "bg-red-500" : "bg-[color:var(--logo-pink-dark)]"}`} style={{ width: `${globalPct}%` }} />
              </div>
            ) : null}
            <p className="text-xs text-gray-500">La corbeille compte dans l'espace utilisé : la vider libère de la place.</p>
          </div>
        ) : (
          <p className="text-sm text-gray-500">Chargement…</p>
        )}
      </Section>
    </div>
  );
};
