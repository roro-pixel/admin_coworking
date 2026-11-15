import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftRight, ChevronDown, Undo2 } from "lucide-react";
import { inventoryService } from "../../../services/inventory.service";
import type { StockMovement } from "../../../services/inventory.service";
import { DataCard, EmptyState, ErrorBlock, Field, FilterButton, FilterPanel, HeadRow, IconButton, ListHeader, PanelForm, Pagination, SearchField, StatusChip } from "../../../components/subscription/kit";
import { FIELD, ROW_HOVER, apiMessage, formatDateTime, formatMoney } from "../../../components/subscription/kitUtils";
import { ListSkeleton } from "../../../components/ui/Skeleton";
import { toast } from "../../../components/ui/toastStore";
import { Cell, Chip, Fact, MOVEMENTS, MOVEMENT_LABEL, MOVEMENT_TONE, REASON_LABEL, signed, useActor, useServerPaged } from "../../../components/inventory/invKit";

const COLS = "lg:grid-cols-[minmax(0,1.5fr)_8rem_5rem_minmax(0,1fr)_minmax(0,1fr)_6rem_auto]";
const SIZE = 15;

export const StockMovements: React.FC = () => {
  const actor = useActor();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [reversing, setReversing] = useState<StockMovement | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  // getStockMovements convertit fromDate/toDate en from/to, noms attendus par cet endpoint
  const list = useServerPaged<StockMovement>({
    key: ["stock-movements", type, from, to],
    size: SIZE,
    search,
    resetKey: `${type}|${from}|${to}`,
    match: (m, q) => (m.itemName ?? "").toLowerCase().includes(q) || (m.itemCode ?? "").toLowerCase().includes(q) || (m.movementCode ?? "").toLowerCase().includes(q),
    fetch: (p) => inventoryService.getStockMovements({ movementType: type || undefined, fromDate: from || undefined, toDate: to || undefined, ...p }),
  });
  const hasFilters = !!(search || type || from || to);

  const reverse = useMutation({
    mutationFn: () => inventoryService.reverseMovement(reversing!.movementCode, actor, reason.trim()),
    onSuccess: async () => {
      toast.success("Mouvement annulé");
      await Promise.all([queryClient.invalidateQueries({ queryKey: ["stock-movements"] }), queryClient.invalidateQueries({ queryKey: ["stock-levels"] })]);
      setReversing(null);
      setReason("");
      setError(null);
    },
    onError: (e) => setError(apiMessage(e, "Annulation impossible")),
  });

  return (
    <div className="space-y-5">
      <ListHeader title="Historique des mouvements" subtitle={list.isLoading ? undefined : `${list.total} mouvement${list.total > 1 ? "s" : ""}`} />

      {reversing && (
        <PanelForm
          title={`Annuler le mouvement ${reversing.movementCode}`}
          onCancel={() => { setReversing(null); setReason(""); setError(null); }}
          pending={reverse.isPending}
          submitLabel="Confirmer l'annulation"
          submitDisabled={!reason.trim()}
          error={error}
          onSubmit={(e) => { e.preventDefault(); reverse.mutate(); }}
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <Fact title="Article">{reversing.itemName}</Fact>
            <Fact title="Type">{MOVEMENT_LABEL[reversing.movementType] ?? reversing.movementType}</Fact>
            <Fact title="Quantité">{signed(reversing.quantity)}</Fact>
          </div>
          <Field label="Motif de l'annulation" required>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="Expliquez pourquoi ce mouvement est annulé" className={`${FIELD} resize-none`} autoFocus />
          </Field>
        </PanelForm>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <SearchField className="flex-1" value={search} onChange={setSearch} placeholder="Code, article ou référence du mouvement" />
        <FilterButton open={showFilters} active={!!(type || from || to)} onClick={() => setShowFilters(!showFilters)} />
      </div>
      {showFilters && (
        <FilterPanel canReset={hasFilters} onReset={() => { setSearch(""); setType(""); setFrom(""); setTo(""); }}>
          <Field label="Type de mouvement">
            <select value={type} onChange={(e) => setType(e.target.value)} className={FIELD}>
              <option value="">Tous les types</option>
              {MOVEMENTS.map((m) => <option key={m} value={m}>{MOVEMENT_LABEL[m]}</option>)}
            </select>
          </Field>
          <Field label="Du">
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={FIELD} />
          </Field>
          <Field label="Au">
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={FIELD} />
          </Field>
        </FilterPanel>
      )}

      {list.isLoading ? (
        <ListSkeleton rows={8} />
      ) : list.isError ? (
        <ErrorBlock message="Impossible de charger les mouvements." onRetry={() => list.refetch()} />
      ) : list.rows.length === 0 ? (
        <EmptyState icon={ArrowLeftRight} title="Aucun mouvement" hint={hasFilters ? "Aucun résultat pour ces filtres." : "Les entrées, sorties et transferts apparaîtront ici."} />
      ) : (
        <>
          <HeadRow cols={COLS}>
            <span>Article</span>
            <span>Type</span>
            <span>Quantité</span>
            <span>Référence</span>
            <span>Opérateur</span>
            <span>État</span>
            <span className="text-right">Actions</span>
          </HeadRow>
          <DataCard>
            {list.rows.map((m) => {
              const open = expanded === m.movementCode;
              return (
                <div key={m.movementCode} className={`rounded-2xl max-lg:mb-2 max-lg:bg-gray-50 ${ROW_HOVER}`}>
                  <div onClick={() => setExpanded(open ? null : m.movementCode)} className={`grid cursor-pointer grid-cols-2 items-center gap-x-4 gap-y-2 p-4 ${COLS}`}>
                    <div className="flex min-w-0 items-center gap-2 max-lg:col-span-2">
                      <ChevronDown size={16} className={`shrink-0 text-gray-400 transition ${open ? "" : "-rotate-90"}`} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-900">{m.itemName}</p>
                        <p className="font-mono text-xs text-gray-400">{m.movementCode}</p>
                      </div>
                    </div>
                    <div><Chip map={MOVEMENT_LABEL} tones={MOVEMENT_TONE} value={m.movementType} /></div>
                    <Cell title="Quantité"><span className={`text-sm font-bold ${m.quantity < 0 ? "text-red-600" : "text-gray-950"}`}>{signed(m.quantity)}</span></Cell>
                    <Cell title="Référence"><span className="truncate text-sm text-gray-600">{m.referenceCode || "Aucune"}</span></Cell>
                    <Cell title="Opérateur">
                      <span className="block truncate text-sm text-gray-600">{m.performedBy}</span>
                      <span className="block text-xs text-gray-400">{formatDateTime(m.performedAt)}</span>
                    </Cell>
                    <div><StatusChip tone={m.reversed ? "danger" : "success"}>{m.reversed ? "Annulé" : "Actif"}</StatusChip></div>
                    <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-1 max-lg:col-span-2 lg:justify-end">
                      {!m.reversed ? (
                        <IconButton icon={Undo2} label="Annuler le mouvement" tone="danger" onClick={() => { setError(null); setReason(""); setReversing(m); window.scrollTo({ top: 0, behavior: "smooth" }); }} />
                      ) : (
                        <span className="w-9" />
                      )}
                    </div>
                  </div>
                  {open && (
                    <div className="grid gap-3 rounded-2xl bg-gray-50 p-3 sm:grid-cols-2 lg:mx-3 lg:mb-3 lg:grid-cols-4">
                      <Fact title="Origine">{m.locationFromCode || "Aucune"}</Fact>
                      <Fact title="Destination">{m.locationToCode || "Aucune"}</Fact>
                      <Fact title="Coût unitaire">{m.unitCost !== undefined ? formatMoney(m.unitCost) : "Non renseigné"}</Fact>
                      <Fact title="Coût total">{m.totalCost !== undefined ? formatMoney(m.totalCost) : "Non renseigné"}</Fact>
                      <Fact title="Motif">{m.reasonCode ? REASON_LABEL[m.reasonCode] ?? m.reasonCode : "Aucun"}</Fact>
                      <Fact title="Type de référence">{m.referenceType || "Aucun"}</Fact>
                      <div className="sm:col-span-2"><Fact title="Détail">{m.reasonDetails || m.reason || "Aucun"}</Fact></div>
                    </div>
                  )}
                </div>
              );
            })}
          </DataCard>
          <Pagination page={list.page} totalPages={list.totalPages} total={list.total} noun="mouvement" onChange={list.setPage} />
        </>
      )}
    </div>
  );
};
