import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, PackageCheck, Truck } from "lucide-react";
import { billingService } from "../../services/billing.service";
import type { DeliveryNoteSummary } from "../../services/billing.service";
import { ActionButton, EmptyState, ErrorBlock, Field, ItemRow, PanelForm, Section, StatusChip } from "../subscription/kit";
import { FIELD_SOFT, formatDateTime } from "../subscription/kitUtils";
import { Skeleton } from "../ui/Skeleton";
import { toast } from "../ui/toastStore";
import { saveBlob } from "../payment/paymentUtils";
import { billingError } from "./billingErrors";
import { DELIVERY_STATUS_LABEL, DELIVERY_STATUS_TONE } from "./billingLabels";

/** Création d'un bon de livraison : quantités à livrer par ligne (vide = tout le reste à livrer). */
const NoteForm: React.FC<{ documentNumber: string; onDone: () => void; onCancel: () => void }> = ({ documentNumber, onDone, onCancel }) => {
  const qc = useQueryClient();
  const status = useQuery({ queryKey: ["billing-delivery-status", documentNumber], queryFn: () => billingService.getDeliveryStatus(documentNumber) });
  const [qty, setQty] = useState<Record<number, string>>({});
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const m = useMutation({
    mutationFn: () => {
      const lines = Object.entries(qty).filter(([, v]) => Number(v) > 0).map(([k, v]) => ({ lineOrder: Number(k), quantity: Number(v) }));
      return billingService.createDeliveryNote(documentNumber, { lines: lines.length ? lines : undefined, deliveryAddress: address.trim() || undefined, notes: notes.trim() || undefined });
    },
    onSuccess: (n) => {
      qc.invalidateQueries({ queryKey: ["billing-delivery-status", documentNumber] });
      qc.invalidateQueries({ queryKey: ["billing-delivery-notes"] });
      toast.success(`Bon de livraison ${n.noteNumber} créé.`);
      onDone();
    },
    onError: (e: unknown) => setError(billingError(e, "Impossible de créer le bon de livraison.")),
  });
  return (
    <PanelForm title="Nouveau bon de livraison" submitLabel="Créer le bon" pending={m.isPending} error={error} onCancel={onCancel}
      onSubmit={(e) => { e.preventDefault(); setError(null); m.mutate(); }}>
      <div className="space-y-2">
        {(status.data?.lines ?? []).filter((l) => (l.remaining ?? 0) > 0).map((l) => (
          <div key={l.lineOrder} className="grid grid-cols-[minmax(0,1fr)_8rem] items-end gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-gray-900">{l.description ?? l.itemCode}</p>
              <p className="text-xs text-gray-500">Commandé {l.ordered} · livré {l.delivered}{(l.inDraft ?? 0) > 0 ? ` · en brouillon ${l.inDraft}` : ""} · reste {l.remaining} {l.unit ?? ""}</p>
            </div>
            <input type="number" min={0} max={l.remaining} step="any" placeholder={String(l.remaining)} className={FIELD_SOFT} value={qty[l.lineOrder ?? 0] ?? ""} onChange={(e) => setQty((q) => ({ ...q, [l.lineOrder ?? 0]: e.target.value }))} />
          </div>
        ))}
        {status.data && (status.data.lines ?? []).every((l) => (l.remaining ?? 0) <= 0) && <p className="text-sm text-gray-500">Tout est déjà livré ou en brouillon.</p>}
      </div>
      <Field label="Adresse de livraison"><textarea rows={2} className={`${FIELD_SOFT} resize-none`} maxLength={2000} value={address} onChange={(e) => setAddress(e.target.value)} /></Field>
      <Field label="Notes"><textarea rows={2} className={`${FIELD_SOFT} resize-none`} maxLength={4000} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
    </PanelForm>
  );
};

/** Livraison d'un document : avancement par ligne, bons de livraison, livrer / annuler / PDF. */
export const DeliveryPanel: React.FC<{ documentNumber: string; canCreate: boolean }> = ({ documentNumber, canCreate }) => {
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [receivedBy, setReceivedBy] = useState("");
  const [delivering, setDelivering] = useState<DeliveryNoteSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ["billing-delivery-status", documentNumber], queryFn: () => billingService.getDeliveryStatus(documentNumber) });
  const refresh = () => { qc.invalidateQueries({ queryKey: ["billing-delivery-status", documentNumber] }); qc.invalidateQueries({ queryKey: ["billing-delivery-notes"] }); };

  const deliver = useMutation({
    mutationFn: (n: string) => billingService.deliverDeliveryNote(n, receivedBy.trim() || undefined),
    onSuccess: () => { refresh(); setDelivering(null); setReceivedBy(""); toast.success("Livraison enregistrée."); },
    onError: (e: unknown) => setError(billingError(e, "Impossible d'enregistrer la livraison.")),
  });
  const cancel = useMutation({
    mutationFn: (n: string) => billingService.cancelDeliveryNote(n),
    onSuccess: () => { refresh(); toast.success("Bon annulé."); },
    onError: (e: unknown) => toast.error(billingError(e, "Impossible d'annuler le bon.")),
  });
  const pdf = useMutation({
    mutationFn: async (n: string) => saveBlob(await billingService.getDeliveryNotePdf(n), `${n}.pdf`),
    onError: (e: unknown) => toast.error(billingError(e, "PDF indisponible.")),
  });

  return (
    <Section title="Livraison" icon={Truck} description={data ? (data.complete ? "Tout est livré" : "Livraison en cours") : undefined}
      action={canCreate && !creating ? <ActionButton variant="ghost" icon={PackageCheck} className="!px-4 !py-2" disabled={!!data?.complete} onClick={() => setCreating(true)}>Nouveau bon</ActionButton> : undefined}>
      {creating && <NoteForm documentNumber={documentNumber} onDone={() => setCreating(false)} onCancel={() => setCreating(false)} />}
      {delivering && (
        <PanelForm title={`Livrer ${delivering.noteNumber}`} submitLabel="Confirmer la livraison" pending={deliver.isPending} error={error} onCancel={() => { setDelivering(null); setError(null); }}
          onSubmit={(e) => { e.preventDefault(); setError(null); deliver.mutate(delivering.noteNumber); }}>
          <Field label="Réceptionné par" hint="Le stock est sorti à la livraison"><input className={FIELD_SOFT} maxLength={255} value={receivedBy} onChange={(e) => setReceivedBy(e.target.value)} /></Field>
        </PanelForm>
      )}
      {isLoading ? <Skeleton className="h-16 w-full rounded-2xl" />
        : isError ? <ErrorBlock message="Impossible de charger la livraison." onRetry={() => refetch()} />
        : !data || ((data.lines ?? []).length === 0 && (data.notes ?? []).length === 0) ? <EmptyState icon={Truck} title="Rien à livrer sur ce document" />
        : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              {(data.lines ?? []).map((l) => (
                <div key={l.lineOrder} className="flex items-center justify-between gap-3 rounded-xl bg-white px-4 py-2.5 text-sm">
                  <span className="min-w-0 truncate font-semibold text-gray-800">{l.description ?? l.itemCode}</span>
                  <span className="shrink-0 tabular-nums text-gray-500">{l.delivered}/{l.ordered} {l.unit ?? ""}</span>
                </div>
              ))}
            </div>
            {(data.notes ?? []).length > 0 && (
              <div className="space-y-2">
                {data.notes!.map((n) => (
                  <ItemRow key={n.noteNumber}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-mono text-sm font-semibold text-gray-900">{n.noteNumber}</p>
                        <p className="text-xs text-gray-500">{n.deliveredAt ? `Livré ${formatDateTime(n.deliveredAt)}` : `Créé ${formatDateTime(n.createdAt)}`}{n.invoiceNumber ? ` · facture ${n.invoiceNumber}` : ""}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <StatusChip tone={DELIVERY_STATUS_TONE[n.status ?? ""] ?? "neutral"}>{DELIVERY_STATUS_LABEL[n.status ?? ""] ?? n.status}</StatusChip>
                        <ActionButton variant="ghost" icon={Download} className="!px-4 !py-2" pending={pdf.isPending && pdf.variables === n.noteNumber} onClick={() => pdf.mutate(n.noteNumber)}>PDF</ActionButton>
                        {n.status === "DRAFT" && (
                          <>
                            <ActionButton variant="ghost" className="!px-4 !py-2" onClick={() => { setDelivering(n); setError(null); }}>Livrer</ActionButton>
                            <ActionButton variant="ghost" className="!px-4 !py-2" pending={cancel.isPending && cancel.variables === n.noteNumber} onClick={() => cancel.mutate(n.noteNumber)}>Annuler</ActionButton>
                          </>
                        )}
                      </div>
                    </div>
                  </ItemRow>
                ))}
              </div>
            )}
          </div>
        )}
    </Section>
  );
};
