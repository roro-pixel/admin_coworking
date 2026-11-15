import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ClipboardList, Eye, Pencil, Play, Plus, XCircle } from "lucide-react";
import { inventoryService } from "../../../services/inventory.service";
import type { InventoryCount } from "../../../services/inventory.service";
import { ActionButton, DataCard, EmptyState, ErrorBlock, Field, FilterButton, FilterPanel, HeadRow, IconButton, ListHeader, PanelForm, Pagination, SearchField } from "../../../components/subscription/kit";
import { FIELD, ROW_HOVER, apiMessage, formatDate } from "../../../components/subscription/kitUtils";
import { ListSkeleton } from "../../../components/ui/Skeleton";
import { toast } from "../../../components/ui/toastStore";
import { COUNT_STATUS_LABEL, COUNT_STATUS_TONE, Cell, Chip, LocationSelect, useActor, useServerPaged } from "../../../components/inventory/invKit";
import { CountEntry } from "./CountEntry";

const COLS = "lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_9rem_minmax(0,1fr)_7rem_auto]";
const SIZE = 15;
const STATUSES = ["DRAFT", "IN_PROGRESS", "UNDER_REVIEW", "VALIDATED", "CANCELLED"] as const;

export const InventoryCountsList: React.FC = () => {
  const queryClient = useQueryClient();
  const actor = useActor();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ locationCode: "", notes: "" });
  const [error, setError] = useState<string | null>(null);
  const [entry, setEntry] = useState<InventoryCount | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  // Le backend ne documente pas de recherche texte : filtre côté client sur la page chargée
  const list = useServerPaged<InventoryCount>({
    key: ["inventory-counts", status],
    size: SIZE,
    search,
    resetKey: status,
    match: (c, q) => c.countCode.toLowerCase().includes(q) || String((c as any).locationName ?? c.locationCode).toLowerCase().includes(q),
    fetch: (p) => inventoryService.getInventoryCounts({ status: status || undefined, ...p }),
  });
  const hasFilters = !!(search || status);
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["inventory-counts"] });

  const create = useMutation({
    mutationFn: () => inventoryService.createInventoryCount({ locationCode: form.locationCode, createdBy: actor, notes: form.notes.trim() || undefined }),
    onSuccess: async (c) => {
      toast.success("Comptage créé");
      await refresh();
      setCreating(false);
      setForm({ locationCode: "", notes: "" });
      setEntry(c);
    },
    onError: (e) => setError(apiMessage(e, "Création impossible")),
  });
  const start = useMutation({
    mutationFn: (code: string) => inventoryService.startInventoryCount(code),
    onMutate: (code) => setBusy(`start-${code}`),
    onSuccess: async (c) => { toast.success("Comptage démarré"); await refresh(); setEntry(c); },
    onError: (e) => toast.error(apiMessage(e, "Démarrage impossible")),
    onSettled: () => setBusy(null),
  });
  const review = useMutation({ mutationFn: (code: string) => inventoryService.reviewInventoryCount(code), onSuccess: refresh });
  const validate = useMutation({
    mutationFn: (code: string) => inventoryService.validateInventoryCount(code),
    onSuccess: async () => { await refresh(); queryClient.invalidateQueries({ queryKey: ["stock-levels"] }); },
  });
  const cancel = useMutation({ mutationFn: (code: string) => inventoryService.cancelInventoryCount(code), onSuccess: refresh });

  if (entry) return <CountEntry count={list.rows.find((c) => c.countCode === entry.countCode) ?? entry} onBack={() => { setEntry(null); refresh(); }} />;

  return (
    <div className="space-y-5">
      <ListHeader title="Comptages physiques" subtitle={list.isLoading ? undefined : `${list.total} comptage${list.total > 1 ? "s" : ""}`} action={<ActionButton icon={Plus} onClick={() => { setError(null); setCreating(true); }}>Nouveau comptage</ActionButton>} />

      {creating && (
        <PanelForm title="Nouveau comptage" onCancel={() => setCreating(false)} pending={create.isPending} submitLabel="Créer et saisir" submitDisabled={!form.locationCode} error={error} onSubmit={(e) => { e.preventDefault(); create.mutate(); }}>
          <Field label="Emplacement à compter" required><LocationSelect value={form.locationCode} onChange={(v) => setForm({ ...form, locationCode: v })} /></Field>
          <Field label="Notes"><textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={`${FIELD} resize-none`} /></Field>
        </PanelForm>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <SearchField className="flex-1" value={search} onChange={setSearch} placeholder="Code ou emplacement" />
        <FilterButton open={showFilters} active={!!status} onClick={() => setShowFilters(!showFilters)} />
      </div>
      {showFilters && (
        <FilterPanel canReset={hasFilters} onReset={() => { setSearch(""); setStatus(""); }}>
          <Field label="Statut">
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={FIELD}>
              <option value="">Tous les statuts</option>
              {STATUSES.map((s) => <option key={s} value={s}>{COUNT_STATUS_LABEL[s]}</option>)}
            </select>
          </Field>
        </FilterPanel>
      )}

      {list.isLoading ? (
        <ListSkeleton rows={6} />
      ) : list.isError ? (
        <ErrorBlock message="Impossible de charger les comptages." onRetry={() => list.refetch()} />
      ) : list.rows.length === 0 ? (
        <EmptyState icon={ClipboardList} title="Aucun comptage" hint={hasFilters ? "Aucun résultat pour ces filtres." : "Lancez un comptage pour comparer le stock réel au stock système."} />
      ) : (
        <>
          <HeadRow cols={COLS}>
            <span>Code</span><span>Emplacement</span><span>Statut</span><span>Créé par</span><span>Date</span><span className="text-right">Actions</span>
          </HeadRow>
          <DataCard>
            {list.rows.map((c) => (
              <div key={c.countCode} className={`grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 rounded-2xl p-4 max-lg:mb-2 max-lg:bg-gray-50 ${COLS} ${ROW_HOVER}`}>
                <p className="font-mono text-sm font-semibold text-gray-900">{c.countCode}</p>
                <Cell title="Emplacement" className="max-lg:order-3 max-lg:col-span-2"><span className="text-sm text-gray-600">{(c as any).locationName || c.locationCode}</span></Cell>
                <div className="max-lg:order-2 max-lg:justify-self-end"><Chip map={COUNT_STATUS_LABEL} tones={COUNT_STATUS_TONE} value={c.status} /></div>
                <Cell title="Créé par" className="max-lg:order-3"><span className="truncate text-sm text-gray-600">{c.createdBy || "Non renseigné"}</span></Cell>
                <Cell title="Date" className="max-lg:order-3"><span className="text-sm text-gray-600">{c.createdAt ? formatDate(c.createdAt) : "Non renseignée"}</span></Cell>
                <div className="flex items-center gap-1 max-lg:order-4 max-lg:col-span-2 lg:justify-end">
                  {c.status === "DRAFT" && <IconButton icon={Play} label="Démarrer" pending={busy === `start-${c.countCode}`} onClick={() => start.mutate(c.countCode)} />}
                  {c.status === "IN_PROGRESS" && <IconButton icon={Pencil} label="Saisir les quantités" onClick={() => setEntry(c)} />}
                  {c.status === "IN_PROGRESS" && (
                    <IconButton icon={Eye} label="Envoyer en revue" onClick={() => toast.confirm({ message: `Envoyer le comptage ${c.countCode} en revue ?`, detail: "Les quantités ne seront plus modifiables.", confirmLabel: "Envoyer en revue", pendingLabel: "Envoi", successMessage: "Comptage en revue", errorMessage: "Envoi impossible", onConfirm: () => review.mutateAsync(c.countCode) })} />
                  )}
                  {c.status === "UNDER_REVIEW" && (
                    <IconButton icon={CheckCircle2} label="Valider" tone="success" onClick={() => toast.confirm({ message: `Valider le comptage ${c.countCode} ?`, detail: "Le stock sera ajusté selon les écarts constatés.", confirmLabel: "Valider", pendingLabel: "Validation", successMessage: "Comptage validé, stock ajusté", errorMessage: "Validation impossible", onConfirm: () => validate.mutateAsync(c.countCode) })} />
                  )}
                  {(c.status === "DRAFT" || c.status === "IN_PROGRESS") && (
                    <IconButton icon={XCircle} label="Annuler" tone="danger" onClick={() => toast.confirm({ message: `Annuler le comptage ${c.countCode} ?`, confirmLabel: "Annuler le comptage", pendingLabel: "Annulation", successMessage: "Comptage annulé", errorMessage: "Annulation impossible", onConfirm: () => cancel.mutateAsync(c.countCode) })} />
                  )}
                </div>
              </div>
            ))}
          </DataCard>
          <Pagination page={list.page} totalPages={list.totalPages} total={list.total} noun="comptage" onChange={list.setPage} />
        </>
      )}
    </div>
  );
};
