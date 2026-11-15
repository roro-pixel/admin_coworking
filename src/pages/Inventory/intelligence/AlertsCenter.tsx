import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BellOff, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { inventoryService } from "../../../services/inventory.service";
import type { Alert } from "../../../services/inventory.service";
import { DataCard, EmptyState, ErrorBlock, Field, FilterButton, FilterPanel, IconButton, ListHeader, PanelForm, Pagination, SearchField, Tabs } from "../../../components/subscription/kit";
import { FIELD, apiMessage, formatDateTime } from "../../../components/subscription/kitUtils";
import { ListSkeleton } from "../../../components/ui/Skeleton";
import { toast } from "../../../components/ui/toastStore";
import { ALERT_STATUS_LABEL, ALERT_STATUS_TONE, ALERT_TYPE_LABEL, Chip, SEVERITY_LABEL, label, useActor, useServerPaged } from "../../../components/inventory/invKit";

const SIZE = 15;
const STATUS_TABS = [{ id: "", label: "Toutes" }, { id: "OPEN", label: "Ouvertes" }, { id: "ACKNOWLEDGED", label: "Prises en compte" }, { id: "RESOLVED", label: "Résolues" }, { id: "DISMISSED", label: "Ignorées" }];

export const AlertsCenter: React.FC = () => {
  const queryClient = useQueryClient();
  const actor = useActor();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("OPEN");
  const [type, setType] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [resolving, setResolving] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  // Pas de recherche texte documentée côté backend : filtre côté client sur la page chargée
  const list = useServerPaged<Alert>({
    key: ["alerts", status, type],
    size: SIZE,
    search,
    resetKey: `${status}|${type}`,
    match: (a, q) => a.message.toLowerCase().includes(q) || (a.itemName ?? "").toLowerCase().includes(q),
    fetch: (p) => inventoryService.getAlerts({ status: status || undefined, alertType: type || undefined, ...p }),
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["alerts"] });

  const ack = useMutation({
    mutationFn: (code: string) => inventoryService.acknowledgeAlert(code, actor),
    onMutate: (c) => setBusy(`ack-${c}`),
    onSuccess: async () => { toast.success("Alerte prise en compte"); await refresh(); },
    onError: (e) => toast.error(apiMessage(e, "Action impossible")),
    onSettled: () => setBusy(null),
  });
  const resolve = useMutation({
    mutationFn: () => inventoryService.resolveAlert(resolving!, actor, note.trim()),
    onSuccess: async () => { toast.success("Alerte résolue"); await refresh(); setResolving(null); setNote(""); setError(null); },
    onError: (e) => setError(apiMessage(e, "Résolution impossible")),
  });
  const dismiss = useMutation({ mutationFn: (code: string) => inventoryService.dismissAlert(code), onSuccess: refresh });

  return (
    <div className="space-y-5">
      <ListHeader title="Centre d'alertes" subtitle={list.isLoading ? undefined : `${list.total} alerte${list.total > 1 ? "s" : ""}`} />

      <Tabs variant="soft" active={status} onChange={setStatus} items={STATUS_TABS} />

      <div className="flex flex-col gap-3 sm:flex-row">
        <SearchField className="flex-1" value={search} onChange={setSearch} placeholder="Message ou article" />
        <FilterButton open={showFilters} active={!!type} onClick={() => setShowFilters(!showFilters)} />
      </div>
      {showFilters && (
        <FilterPanel canReset={!!(search || type)} onReset={() => { setSearch(""); setType(""); }}>
          <Field label="Type d'alerte">
            <select value={type} onChange={(e) => setType(e.target.value)} className={FIELD}>
              <option value="">Tous les types</option>
              {Object.entries(ALERT_TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
        </FilterPanel>
      )}

      {resolving && (
        <PanelForm title="Résoudre l'alerte" onCancel={() => { setResolving(null); setError(null); }} pending={resolve.isPending} submitLabel="Marquer comme résolue" submitDisabled={!note.trim()} error={error} onSubmit={(e) => { e.preventDefault(); resolve.mutate(); }}>
          <Field label="Note de résolution" required><textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Décrivez comment le problème a été résolu" className={`${FIELD} resize-none`} /></Field>
        </PanelForm>
      )}

      {list.isLoading ? (
        <ListSkeleton rows={6} />
      ) : list.isError ? (
        <ErrorBlock message="Impossible de charger les alertes." onRetry={() => list.refetch()} />
      ) : list.rows.length === 0 ? (
        <EmptyState icon={BellOff} title="Aucune alerte" hint={status === "OPEN" && !search && !type ? "Rien à traiter pour le moment." : "Aucun résultat pour ces filtres."} />
      ) : (
        <>
          <DataCard>
            {list.rows.map((a) => {
              const severity = (a as any).severity as string | undefined;
              return (
                <div key={a.alertCode} className="flex flex-col gap-3 rounded-2xl p-4 transition hover:bg-gray-50 max-lg:mb-2 max-lg:bg-gray-50 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1.5 flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900">{label(ALERT_TYPE_LABEL, a.alertType)}</span>
                      <Chip map={ALERT_STATUS_LABEL} tones={ALERT_STATUS_TONE} value={a.status} />
                      {severity && <span className="text-xs text-gray-400">Gravité {label(SEVERITY_LABEL, severity).toLowerCase()}</span>}
                    </div>
                    <p className="text-sm text-gray-700">{a.message}</p>
                    <p className="mt-1.5 text-xs text-gray-400">
                      {[a.itemName, a.locationName, a.currentQuantity !== undefined && a.currentQuantity !== null ? `Stock ${a.currentQuantity} pour un seuil de ${a.thresholdQuantity ?? 0}` : null, a.assetCode, formatDateTime(a.createdAt)].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {a.status === "OPEN" && <IconButton icon={Eye} label="Prendre en compte" pending={busy === `ack-${a.alertCode}`} onClick={() => ack.mutate(a.alertCode)} />}
                    {(a.status === "OPEN" || a.status === "ACKNOWLEDGED") && <IconButton icon={CheckCircle2} label="Résoudre" tone="success" onClick={() => { setResolving(a.alertCode); setNote(""); setError(null); window.scrollTo({ top: 0, behavior: "smooth" }); }} />}
                    {a.status !== "DISMISSED" && a.status !== "RESOLVED" && (
                      <IconButton icon={EyeOff} label="Ignorer" tone="neutral" onClick={() => toast.confirm({ message: "Ignorer cette alerte ?", detail: "Elle ne sera plus proposée au traitement.", confirmLabel: "Ignorer", pendingLabel: "Traitement", successMessage: "Alerte ignorée", errorMessage: "Action impossible", onConfirm: () => dismiss.mutateAsync(a.alertCode) })} />
                    )}
                  </div>
                </div>
              );
            })}
          </DataCard>
          <Pagination page={list.page} totalPages={list.totalPages} total={list.total} noun="alerte" onChange={list.setPage} />
        </>
      )}
    </div>
  );
};
