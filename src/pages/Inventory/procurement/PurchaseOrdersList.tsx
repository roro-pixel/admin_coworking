import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronDown, PackageCheck, Plus, Send, ShoppingCart, XCircle } from "lucide-react";
import { inventoryService } from "../../../services/inventory.service";
import type { PurchaseOrder } from "../../../services/inventory.service";
import { ActionButton, DataCard, EmptyState, ErrorBlock, Field, FilterButton, FilterPanel, HeadRow, IconButton, ListHeader, PanelForm, Pagination, SearchField } from "../../../components/subscription/kit";
import { FIELD, ROW_HOVER, apiMessage, formatDate, formatDateTime, formatMoney } from "../../../components/subscription/kitUtils";
import { ListSkeleton } from "../../../components/ui/Skeleton";
import { toast } from "../../../components/ui/toastStore";
import { APPROVAL_LEVEL_LABEL, Cell, Chip, Fact, LocationSelect, PO_STATUS_LABEL, PO_STATUS_TONE, label, supCode, useActor, useServerPaged } from "../../../components/inventory/invKit";
import { LinesEditor, LinesView, newLine, validLines } from "./LinesEditor";
import type { DraftLine } from "./LinesEditor";
import { GoodsReceiptForm } from "./GoodsReceiptForm";

const COLS = "lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)_9.5rem_auto]";
const SIZE = 15;

export const PurchaseOrdersList: React.FC = () => {
  const actor = useActor();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [receiving, setReceiving] = useState<PurchaseOrder | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [supplier, setSupplier] = useState("");
  const [location, setLocation] = useState("");
  const [delivery, setDelivery] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([newLine()]);

  const list = useServerPaged<PurchaseOrder>({
    key: ["purchase-orders", status],
    size: SIZE,
    search,
    resetKey: status,
    match: (o, q) => o.orderCode.toLowerCase().includes(q) || (o.supplierName ?? "").toLowerCase().includes(q),
    fetch: (p) => inventoryService.getPurchaseOrders({ status: status || undefined, ...p }),
  });
  const { data: suppliersData } = useQuery({ queryKey: ["suppliers-active"], queryFn: () => inventoryService.getSuppliers({ status: "ACTIVE", size: 100 }), enabled: creating });
  const suppliers = suppliersData?.content ?? [];
  const hasFilters = !!(search || status);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
  const closeCreate = () => { setCreating(false); setError(null); setSupplier(""); setLocation(""); setDelivery(""); setLines([newLine()]); };

  const create = useMutation({
    mutationFn: () => inventoryService.createPurchaseOrder({ supplierCode: supplier, locationCode: location, expectedDeliveryDate: delivery || undefined, orderedBy: actor, lines: validLines(lines) }),
    onSuccess: async () => { toast.success("Bon de commande créé"); await invalidate(); closeCreate(); },
    onError: (e) => setError(apiMessage(e, "Création impossible")),
  });
  const approve = useMutation({
    mutationFn: (code: string) => inventoryService.approvePurchaseOrder(code, actor),
    onSuccess: async () => { toast.success("Bon de commande approuvé"); await invalidate(); },
    onError: (e) => toast.error(apiMessage(e, "Approbation impossible")),
  });
  const markOrdered = useMutation({
    mutationFn: (code: string) => inventoryService.markOrdered(code),
    onSuccess: async () => { toast.success("Bon de commande marqué comme commandé"); await invalidate(); },
    onError: (e) => toast.error(apiMessage(e, "Changement de statut impossible")),
  });
  // PATCH .../purchase-orders/{code}/cancel n'est pas documenté côté backend : à confirmer
  const cancel = useMutation({ mutationFn: (code: string) => inventoryService.cancelPurchaseOrder(code), onSuccess: invalidate });

  return (
    <div className="space-y-5">
      <ListHeader title="Bons de commande" subtitle={list.isLoading ? undefined : `${list.total} bon${list.total > 1 ? "s" : ""} de commande`} action={<ActionButton icon={Plus} onClick={() => { setReceiving(null); setCreating(true); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Nouveau bon de commande</ActionButton>} />

      {creating && (
        <PanelForm
          title="Nouveau bon de commande"
          onCancel={closeCreate}
          pending={create.isPending}
          submitLabel="Créer le bon de commande"
          submitDisabled={!supplier || !location || validLines(lines).length === 0}
          error={error}
          onSubmit={(e) => { e.preventDefault(); create.mutate(); }}
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Fournisseur" required>
              <select value={supplier} onChange={(e) => setSupplier(e.target.value)} className={FIELD}>
                <option value="">Choisir un fournisseur</option>
                {suppliers.map((s) => <option key={supCode(s)} value={supCode(s)}>{s.name}</option>)}
              </select>
            </Field>
            <Field label="Emplacement de livraison" required><LocationSelect value={location} onChange={setLocation} /></Field>
            <Field label="Livraison prévue"><input type="date" value={delivery} onChange={(e) => setDelivery(e.target.value)} className={FIELD} /></Field>
          </div>
          <Field label="Articles commandés" required>
            <LinesEditor lines={lines} onChange={setLines} />
          </Field>
        </PanelForm>
      )}
      {receiving && <GoodsReceiptForm order={receiving} onClose={() => setReceiving(null)} />}

      <div className="flex flex-col gap-3 sm:flex-row">
        <SearchField className="flex-1" value={search} onChange={setSearch} placeholder="Code du bon ou nom du fournisseur" />
        <FilterButton open={showFilters} active={!!status} onClick={() => setShowFilters(!showFilters)} />
      </div>
      {showFilters && (
        <FilterPanel canReset={hasFilters} onReset={() => { setSearch(""); setStatus(""); }}>
          <Field label="Statut">
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={FIELD}>
              <option value="">Tous les statuts</option>
              {Object.entries(PO_STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
        </FilterPanel>
      )}

      {list.isLoading ? (
        <ListSkeleton rows={6} />
      ) : list.isError ? (
        <ErrorBlock message="Impossible de charger les bons de commande." onRetry={() => list.refetch()} />
      ) : list.rows.length === 0 ? (
        <EmptyState icon={ShoppingCart} title="Aucun bon de commande" hint={hasFilters ? "Aucun résultat pour ces filtres." : "Créez un bon de commande pour approvisionner vos emplacements."} />
      ) : (
        <>
          <HeadRow cols={COLS}>
            <span>Bon de commande</span>
            <span>Fournisseur</span>
            <span>Montant</span>
            <span>Livraison prévue</span>
            <span>Statut</span>
            <span className="text-right">Actions</span>
          </HeadRow>
          <DataCard>
            {list.rows.map((o) => {
              const isOpen = expanded === o.orderCode;
              const canApprove = o.status === "DRAFT" || o.status === "PENDING_APPROVAL";
              return (
                <div key={o.orderCode} className={`rounded-2xl max-lg:mb-2 max-lg:bg-gray-50 ${ROW_HOVER}`}>
                  <div onClick={() => setExpanded(isOpen ? null : o.orderCode)} className={`grid cursor-pointer grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 p-4 ${COLS}`}>
                    <div className="flex min-w-0 items-center gap-2">
                      <ChevronDown size={16} className={`shrink-0 text-gray-400 transition ${isOpen ? "" : "-rotate-90"}`} />
                      <div className="min-w-0"><p className="truncate font-mono text-sm font-semibold text-gray-900">{o.orderCode}</p><p className="text-xs text-gray-400">{formatDateTime(o.createdAt)}</p></div>
                    </div>
                    <Cell title="Fournisseur" className="max-lg:order-3 max-lg:col-span-2"><span className="truncate text-sm text-gray-700">{o.supplierName || o.supplierCode}</span></Cell>
                    <Cell title="Montant" className="max-lg:order-3"><span className="text-sm font-bold text-gray-950">{formatMoney(o.totalAmount)}</span></Cell>
                    <Cell title="Livraison" className="max-lg:order-3"><span className="text-sm text-gray-600">{o.expectedDeliveryDate ? formatDate(o.expectedDeliveryDate) : "Non précisée"}</span></Cell>
                    <div className="max-lg:order-2 max-lg:justify-self-end"><Chip map={PO_STATUS_LABEL} tones={PO_STATUS_TONE} value={o.status} /></div>
                    <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-1 max-lg:order-4 max-lg:col-span-2 lg:justify-end">
                      {canApprove && <IconButton icon={Check} label="Approuver" tone="success" pending={approve.isPending && approve.variables === o.orderCode} onClick={() => approve.mutate(o.orderCode)} />}
                      {o.status === "APPROVED" && <IconButton icon={Send} label="Marquer comme commandé" tone="pink" pending={markOrdered.isPending && markOrdered.variables === o.orderCode} onClick={() => markOrdered.mutate(o.orderCode)} />}
                      {(o.status === "ORDERED" || o.status === "PARTIALLY_RECEIVED") && <IconButton icon={PackageCheck} label="Réceptionner" tone="pink" onClick={() => { setCreating(false); setReceiving(o); window.scrollTo({ top: 0, behavior: "smooth" }); }} />}
                      {(o.status === "DRAFT" || o.status === "PENDING_APPROVAL") && (
                        <IconButton
                          icon={XCircle}
                          label="Annuler"
                          tone="danger"
                          onClick={() =>
                            toast.confirm({
                              message: `Annuler le bon de commande ${o.orderCode} ?`,
                              confirmLabel: "Annuler le bon",
                              pendingLabel: "Annulation",
                              successMessage: "Bon de commande annulé",
                              errorMessage: "Annulation impossible",
                              onConfirm: () => cancel.mutateAsync(o.orderCode),
                            })
                          }
                        />
                      )}
                    </div>
                  </div>
                  {isOpen && (
                    <div className="space-y-3 rounded-2xl bg-gray-50 p-3 lg:mx-3 lg:mb-3">
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <Fact title="Emplacement">{o.locationCode}</Fact>
                        <Fact title="Commandé par">{o.orderedBy || "Non renseigné"}</Fact>
                        <Fact title="Niveau d'approbation">{label(APPROVAL_LEVEL_LABEL, o.approvalLevel) || "Aucun"}</Fact>
                        <Fact title="Approuvé par">{o.approvedBy ? `${o.approvedBy}${o.approvedAt ? `, le ${formatDate(o.approvedAt)}` : ""}` : "Pas encore"}</Fact>
                        {o.sourceRequestCode && <Fact title="Demande d'origine"><span className="font-mono">{o.sourceRequestCode}</span></Fact>}
                      </div>
                      <LinesView lines={o.lines} />
                    </div>
                  )}
                </div>
              );
            })}
          </DataCard>
          <Pagination page={list.page} totalPages={list.totalPages} total={list.total} noun="bon de commande" onChange={list.setPage} />
        </>
      )}
    </div>
  );
};
