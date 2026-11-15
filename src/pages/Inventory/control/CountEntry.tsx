import React, { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ClipboardList } from "lucide-react";
import { inventoryService } from "../../../services/inventory.service";
import type { InventoryCount } from "../../../services/inventory.service";
import { EmptyState, ErrorBlock, IconButton, PageHeader, Pagination, SearchField, StatusChip } from "../../../components/subscription/kit";
import { FIELD, apiMessage } from "../../../components/subscription/kitUtils";
import { ListSkeleton } from "../../../components/ui/Skeleton";
import { toast } from "../../../components/ui/toastStore";
import { COUNT_STATUS_LABEL, COUNT_STATUS_TONE, Chip, qty, signed, usePaged } from "../../../components/inventory/invKit";

type Line = { itemCode: string; itemName: string; systemQuantity: number; countedQuantity?: number | null };

/** Saisie d'un comptage, affichée à la place de la liste (remplace l'ancienne fenêtre modale) */
export const CountEntry: React.FC<{ count: InventoryCount; onBack: () => void }> = ({ count, onBack }) => {
  const queryClient = useQueryClient();
  const [lines, setLines] = useState<Line[]>([]);
  const [search, setSearch] = useState("");
  const [savingCode, setSavingCode] = useState<string | null>(null);
  const editable = count.status === "IN_PROGRESS";

  const detail = useQuery({
    queryKey: ["inventory-count-detail", count.countCode],
    queryFn: () => inventoryService.getInventoryCount(count.countCode),
  });
  useEffect(() => {
    if (detail.data?.items) setLines(detail.data.items);
  }, [detail.data]);

  const save = useMutation({
    mutationFn: ({ itemCode, value }: { itemCode: string; value: number }) => inventoryService.saveInventoryCountLine(count.countCode, itemCode, value),
    onMutate: ({ itemCode }) => setSavingCode(itemCode),
    onSuccess: async () => {
      toast.success("Quantité enregistrée");
      await detail.refetch();
    },
    onError: (e) => toast.error(apiMessage(e, "Enregistrement impossible")),
    onSettled: () => {
      setSavingCode(null);
      queryClient.invalidateQueries({ queryKey: ["inventory-counts"] });
    },
  });

  const q = search.trim().toLowerCase();
  const filtered = lines.filter((l) => !q || l.itemName?.toLowerCase().includes(q) || l.itemCode?.toLowerCase().includes(q));
  const pg = usePaged(filtered, 20);
  const counted = lines.filter((l) => l.countedQuantity !== null && l.countedQuantity !== undefined).length;
  const progress = lines.length ? Math.round((counted / lines.length) * 100) : 0;
  const locationName = (count as any).locationName || count.locationCode;

  return (
    <div className="mx-auto w-full max-w-4xl">
      <PageHeader onBack={onBack} backLabel="Retour aux comptages" title={`Comptage ${count.countCode}`} subtitle={locationName} badge={<Chip map={COUNT_STATUS_LABEL} tones={COUNT_STATUS_TONE} value={count.status} />} />

      {detail.isLoading ? (
        <ListSkeleton rows={6} />
      ) : detail.isError ? (
        <ErrorBlock message="Impossible de charger le comptage." onRetry={() => detail.refetch()} />
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="mb-2 flex justify-between text-sm text-gray-600">
              <span>Progression</span>
              <span className="font-semibold text-gray-900">{counted} sur {lines.length} articles comptés</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
              <div className="h-full rounded-full bg-[color:var(--logo-pink)] transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
            {counted === lines.length && lines.length > 0 && editable && <p className="mt-3 text-sm text-gray-500">Tous les articles sont comptés. Vous pouvez envoyer le comptage en revue depuis la liste.</p>}
            {!editable && <p className="mt-3 text-sm text-gray-500">Ce comptage n'est plus en cours : les quantités sont en lecture seule.</p>}
          </div>

          <SearchField value={search} onChange={setSearch} placeholder="Rechercher un article" className="max-w-sm" />

          {pg.slice.length === 0 ? (
            <EmptyState icon={ClipboardList} title="Aucun article" hint={q ? "Aucun résultat pour cette recherche." : "Ce comptage ne contient aucun article."} />
          ) : (
            <div className="space-y-2">
              {pg.slice.map((l) => {
                const has = l.countedQuantity !== null && l.countedQuantity !== undefined;
                const variance = has ? (l.countedQuantity as number) - l.systemQuantity : null;
                return (
                  <div key={l.itemCode} className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-900">{l.itemName}</p>
                      <p className="text-xs text-gray-400"><span className="font-mono">{l.itemCode}</span> · Stock système {qty(l.systemQuantity)}</p>
                      {variance !== null && variance !== 0 && <div className="mt-1"><StatusChip tone={variance > 0 ? "success" : "danger"}>Écart {signed(variance)}</StatusChip></div>}
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        inputMode="numeric"
                        disabled={!editable}
                        value={has ? String(l.countedQuantity) : ""}
                        onChange={(e) => {
                          const v = e.target.value.replace(/\D/g, "");
                          setLines((prev) => prev.map((x) => (x.itemCode === l.itemCode ? { ...x, countedQuantity: v === "" ? null : parseInt(v, 10) } : x)));
                        }}
                        placeholder="Quantité"
                        className={`${FIELD} w-32 text-center`}
                      />
                      {editable && <IconButton icon={Check} label="Enregistrer" tone="pink" pending={savingCode === l.itemCode} disabled={!has} onClick={() => save.mutate({ itemCode: l.itemCode, value: l.countedQuantity ?? 0 })} />}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <Pagination page={pg.page} totalPages={pg.totalPages} total={pg.total} noun="article" onChange={pg.setPage} />
        </div>
      )}
    </div>
  );
};
