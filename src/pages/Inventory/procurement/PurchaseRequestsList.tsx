import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronDown, ClipboardList, Plus, Send, X } from "lucide-react";
import { inventoryService } from "../../../services/inventory.service";
import type { PurchaseRequest } from "../../../services/inventory.service";
import { ActionButton, DataCard, EmptyState, ErrorBlock, Field, FilterButton, FilterPanel, HeadRow, IconButton, ListHeader, PanelForm, Pagination, SearchField } from "../../../components/subscription/kit";
import { FIELD, ROW_HOVER, apiMessage, formatDateTime } from "../../../components/subscription/kitUtils";
import { ListSkeleton } from "../../../components/ui/Skeleton";
import { toast } from "../../../components/ui/toastStore";
import { Cell, Chip, Fact, LocationSelect, PR_STATUS_LABEL, PR_STATUS_TONE, label, supCode, useActor, useServerPaged } from "../../../components/inventory/invKit";
import { LinesEditor, LinesView, newLine, validLines } from "./LinesEditor";
import type { DraftLine } from "./LinesEditor";

const COLS = "lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_8rem_auto]";
const SIZE = 15;
type Panel = { kind: "create" } | { kind: "approve"; code: string } | { kind: "reject"; code: string };

export const PurchaseRequestsList: React.FC = () => {
  const actor = useActor();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [panel, setPanel] = useState<Panel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [location, setLocation] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([newLine()]);
  const [supplier, setSupplier] = useState("");
  const [reason, setReason] = useState("");

  const list = useServerPaged<PurchaseRequest>({
    key: ["purchase-requests", status],
    size: SIZE,
    search,
    resetKey: status,
    match: (r, q) => r.requestCode.toLowerCase().includes(q) || (r.requestedBy ?? "").toLowerCase().includes(q) || (r.locationName ?? "").toLowerCase().includes(q),
    fetch: (p) => inventoryService.getPurchaseRequests({ status: status || undefined, ...p }),
  });
  const { data: suppliersData } = useQuery({ queryKey: ["suppliers-active"], queryFn: () => inventoryService.getSuppliers({ status: "ACTIVE", size: 100 }), enabled: panel?.kind === "approve" });
  const suppliers = suppliersData?.content ?? [];
  const hasFilters = !!(search || status);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["purchase-requests"] });
  const close = () => { setPanel(null); setError(null); setLocation(""); setLines([newLine()]); setSupplier(""); setReason(""); };
  const openPanel = (p: Panel) => { setError(null); setPanel(p); window.scrollTo({ top: 0, behavior: "smooth" }); };

  const create = useMutation({
    mutationFn: () => inventoryService.createPurchaseRequest({ locationCode: location, requestedBy: actor, lines: validLines(lines) as PurchaseRequest["lines"] }),
    onSuccess: async () => { toast.success("Demande créée"); await invalidate(); close(); },
    onError: (e) => setError(apiMessage(e, "Création impossible")),
  });
  const submit = useMutation({
    mutationFn: (code: string) => inventoryService.submitPurchaseRequest(code),
    onSuccess: async () => { toast.success("Demande soumise à approbation"); await invalidate(); },
    onError: (e) => toast.error(apiMessage(e, "Soumission impossible")),
  });
  const approve = useMutation({
    mutationFn: (code: string) => inventoryService.approvePurchaseRequest(code, actor, supplier || undefined),
    onSuccess: async (data) => {
      toast.success(data.autoCreatedOrderCode ? `Demande approuvée. Bon de commande créé : ${data.autoCreatedOrderCode}` : "Demande approuvée");
      await Promise.all([invalidate(), queryClient.invalidateQueries({ queryKey: ["purchase-orders"] })]);
      close();
    },
    onError: (e) => setError(apiMessage(e, "Approbation impossible")),
  });
  const reject = useMutation({
    mutationFn: (code: string) => inventoryService.rejectPurchaseRequest(code, actor, reason.trim()),
    onSuccess: async () => { toast.success("Demande rejetée"); await invalidate(); close(); },
    onError: (e) => setError(apiMessage(e, "Rejet impossible")),
  });

  return (
    <div className="space-y-5">
      <ListHeader title="Demandes d'achat" subtitle={list.isLoading ? undefined : `${list.total} demande${list.total > 1 ? "s" : ""}`} action={<ActionButton icon={Plus} onClick={() => openPanel({ kind: "create" })}>Nouvelle demande</ActionButton>} />

      {panel?.kind === "create" && (
        <PanelForm
          title="Nouvelle demande d'achat"
          onCancel={close}
          pending={create.isPending}
          submitLabel="Créer la demande"
          submitDisabled={!location || validLines(lines).length === 0}
          error={error}
          onSubmit={(e) => { e.preventDefault(); create.mutate(); }}
        >
          <Field label="Emplacement à approvisionner" required>
            <LocationSelect value={location} onChange={setLocation} />
          </Field>
          <Field label="Articles demandés" required>
            <LinesEditor lines={lines} onChange={setLines} />
          </Field>
        </PanelForm>
      )}
      {panel?.kind === "approve" && (
        <PanelForm
          title={`Approuver ${panel.code}`}
          onCancel={close}
          pending={approve.isPending}
          submitLabel="Approuver"
          error={error}
          onSubmit={(e) => { e.preventDefault(); approve.mutate(panel.code); }}
        >
          <Field label="Fournisseur" hint="Facultatif. S'il est choisi, le serveur crée automatiquement le bon de commande.">
            <select value={supplier} onChange={(e) => setSupplier(e.target.value)} className={FIELD}>
              <option value="">Ne pas créer de bon de commande</option>
              {suppliers.map((s) => <option key={supCode(s)} value={supCode(s)}>{s.name}</option>)}
            </select>
          </Field>
        </PanelForm>
      )}
      {panel?.kind === "reject" && (
        <PanelForm
          title={`Rejeter ${panel.code}`}
          onCancel={close}
          pending={reject.isPending}
          submitLabel="Rejeter la demande"
          submitDisabled={!reason.trim()}
          error={error}
          onSubmit={(e) => { e.preventDefault(); reject.mutate(panel.code); }}
        >
          <Field label="Motif du rejet" required>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="Expliquez pourquoi la demande est rejetée" className={`${FIELD} resize-none`} autoFocus />
          </Field>
        </PanelForm>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <SearchField className="flex-1" value={search} onChange={setSearch} placeholder="Code, demandeur ou emplacement" />
        <FilterButton open={showFilters} active={!!status} onClick={() => setShowFilters(!showFilters)} />
      </div>
      {showFilters && (
        <FilterPanel canReset={hasFilters} onReset={() => { setSearch(""); setStatus(""); }}>
          <Field label="Statut">
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={FIELD}>
              <option value="">Tous les statuts</option>
              {Object.entries(PR_STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
        </FilterPanel>
      )}

      {list.isLoading ? (
        <ListSkeleton rows={6} />
      ) : list.isError ? (
        <ErrorBlock message="Impossible de charger les demandes." onRetry={() => list.refetch()} />
      ) : list.rows.length === 0 ? (
        <EmptyState icon={ClipboardList} title="Aucune demande d'achat" hint={hasFilters ? "Aucun résultat pour ces filtres." : "Une demande exprime un besoin avant qu'il devienne un bon de commande."} />
      ) : (
        <>
          <HeadRow cols={COLS}>
            <span>Demande</span>
            <span>Emplacement</span>
            <span>Demandeur</span>
            <span>Créée le</span>
            <span>Statut</span>
            <span className="text-right">Actions</span>
          </HeadRow>
          <DataCard>
            {list.rows.map((r) => {
              const isOpen = expanded === r.requestCode;
              return (
                <div key={r.requestCode} className={`rounded-2xl max-lg:mb-2 max-lg:bg-gray-50 ${ROW_HOVER}`}>
                  <div onClick={() => setExpanded(isOpen ? null : r.requestCode)} className={`grid cursor-pointer grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 p-4 ${COLS}`}>
                    <div className="flex min-w-0 items-center gap-2">
                      <ChevronDown size={16} className={`shrink-0 text-gray-400 transition ${isOpen ? "" : "-rotate-90"}`} />
                      <div className="min-w-0"><p className="truncate font-mono text-sm font-semibold text-gray-900">{r.requestCode}</p><p className="text-xs text-gray-400">{r.lines?.length ?? 0} ligne{(r.lines?.length ?? 0) > 1 ? "s" : ""}</p></div>
                    </div>
                    <Cell title="Emplacement" className="max-lg:order-3 max-lg:col-span-2"><span className="text-sm text-gray-600">{r.locationName || r.locationCode}</span></Cell>
                    <Cell title="Demandeur" className="max-lg:order-3 max-lg:col-span-2"><span className="truncate text-sm text-gray-600">{r.requestedBy}</span></Cell>
                    <Cell title="Créée le" className="max-lg:order-3 max-lg:col-span-2"><span className="text-sm text-gray-500">{formatDateTime(r.createdAt)}</span></Cell>
                    <div className="max-lg:order-2 max-lg:justify-self-end"><Chip map={PR_STATUS_LABEL} tones={PR_STATUS_TONE} value={r.status} /></div>
                    <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-1 max-lg:order-4 max-lg:col-span-2 lg:justify-end">
                      {r.status === "DRAFT" && <IconButton icon={Send} label="Soumettre à approbation" tone="pink" pending={submit.isPending && submit.variables === r.requestCode} onClick={() => submit.mutate(r.requestCode)} />}
                      {r.status === "SUBMITTED" && (
                        <>
                          <IconButton icon={Check} label="Approuver" tone="success" onClick={() => openPanel({ kind: "approve", code: r.requestCode })} />
                          <IconButton icon={X} label="Rejeter" tone="danger" onClick={() => { setReason(""); openPanel({ kind: "reject", code: r.requestCode }); }} />
                        </>
                      )}
                    </div>
                  </div>
                  {isOpen && (
                    <div className="space-y-3 rounded-2xl bg-gray-50 p-3 lg:mx-3 lg:mb-3">
                      <div className="grid gap-3 sm:grid-cols-3">
                        <Fact title="Statut">{label(PR_STATUS_LABEL, r.status)}</Fact>
                        <Fact title="Approuvée par">{r.approvedBy || "Pas encore"}</Fact>
                        <Fact title="Bon de commande créé">{r.autoCreatedOrderCode ? <span className="font-mono">{r.autoCreatedOrderCode}</span> : "Aucun"}</Fact>
                      </div>
                      {r.rejectionReason && <Fact title="Motif du rejet"><span className="text-red-700">{r.rejectionReason}</span></Fact>}
                      <LinesView lines={r.lines} />
                    </div>
                  )}
                </div>
              );
            })}
          </DataCard>
          <Pagination page={list.page} totalPages={list.totalPages} total={list.total} noun="demande" onChange={list.setPage} />
        </>
      )}
    </div>
  );
};
