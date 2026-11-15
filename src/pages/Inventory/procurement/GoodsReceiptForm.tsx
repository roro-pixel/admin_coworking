import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { inventoryService } from "../../../services/inventory.service";
import type { PurchaseOrder } from "../../../services/inventory.service";
import { Field, PanelForm } from "../../../components/subscription/kit";
import { FIELD, apiMessage } from "../../../components/subscription/kitUtils";
import { toast } from "../../../components/ui/toastStore";
import { LocationSelect, useActor } from "../../../components/inventory/invKit";

interface ReceiptLine {
  itemCode: string;
  itemName?: string;
  orderedQuantity: number;
  receivedQuantity: number;
  rejectedQuantity: number;
  qualityAccepted: boolean;
  quarantineAcceptedStock: boolean;
  unitCost: number;
}

/** Réception d'un bon de commande, dans un panneau ouvert depuis la ligne du bon (remplace GoodsReceiptFormModal) */
export const GoodsReceiptForm: React.FC<{ order: PurchaseOrder; onClose: () => void }> = ({ order, onClose }) => {
  const actor = useActor();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [locationCode, setLocationCode] = useState(order.locationCode);
  const [docs, setDocs] = useState({ invoice: "", deliveryNote: "", proof: "" });
  const [lines, setLines] = useState<ReceiptLine[]>(
    order.lines.map((l) => ({ itemCode: l.itemCode, itemName: l.itemName, orderedQuantity: l.quantity, receivedQuantity: 0, rejectedQuantity: 0, qualityAccepted: true, quarantineAcceptedStock: false, unitCost: l.unitCost })),
  );
  const patch = (i: number, p: Partial<ReceiptLine>) => setLines((ls) => ls.map((l, k) => (k === i ? { ...l, ...p } : l)));

  const save = useMutation({
    mutationFn: () =>
      inventoryService.createGoodsReceipt({
        orderCode: order.orderCode,
        locationCode,
        receivedBy: actor,
        invoiceDocumentCode: docs.invoice || undefined,
        deliveryNoteDocumentCode: docs.deliveryNote || undefined,
        proofDocumentCode: docs.proof || undefined,
        lines: lines.map(({ itemName: _n, ...rest }) => rest),
      }),
    onSuccess: async () => {
      toast.success("Réception enregistrée");
      await Promise.all([queryClient.invalidateQueries({ queryKey: ["purchase-orders"] }), queryClient.invalidateQueries({ queryKey: ["stock-levels"] }), queryClient.invalidateQueries({ queryKey: ["stock-movements"] })]);
      onClose();
    },
    onError: (e) => setError(apiMessage(e, "Réception impossible")),
  });

  return (
    <PanelForm
      title={`Réceptionner ${order.orderCode}`}
      onCancel={onClose}
      pending={save.isPending}
      submitLabel="Enregistrer la réception"
      submitDisabled={!locationCode}
      error={error}
      onSubmit={(e) => { e.preventDefault(); save.mutate(); }}
    >
      <Field label="Emplacement de réception" required>
        <LocationSelect value={locationCode} onChange={setLocationCode} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Document facture"><input value={docs.invoice} onChange={(e) => setDocs({ ...docs, invoice: e.target.value })} placeholder="DOC-..." className={FIELD} /></Field>
        <Field label="Bon de livraison"><input value={docs.deliveryNote} onChange={(e) => setDocs({ ...docs, deliveryNote: e.target.value })} placeholder="DOC-..." className={FIELD} /></Field>
        <Field label="Preuve ou justificatif"><input value={docs.proof} onChange={(e) => setDocs({ ...docs, proof: e.target.value })} placeholder="DOC-..." className={FIELD} /></Field>
      </div>
      <Field label="Quantités reçues">
        <div className="space-y-3">
          {lines.map((l, i) => (
            <div key={l.itemCode} className="rounded-2xl bg-gray-50 p-3 sm:p-4">
              <p className="text-sm font-semibold text-gray-900">{l.itemName || l.itemCode}</p>
              <p className="mb-3 font-mono text-xs text-gray-400">{l.itemCode}</p>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-white p-3 shadow-sm"><p className="text-xs font-semibold text-gray-400">Commandé</p><p className="mt-1 text-sm font-bold text-gray-950">{l.orderedQuantity.toLocaleString("fr-FR")}</p></div>
                <Field label="Reçu">
                  <input type="number" min={0} max={l.orderedQuantity} value={l.receivedQuantity} onChange={(e) => patch(i, { receivedQuantity: Math.min(l.orderedQuantity, Number(e.target.value) || 0) })} className={FIELD} />
                </Field>
                <Field label="Rejeté">
                  <input type="number" min={0} value={l.rejectedQuantity} onChange={(e) => patch(i, { rejectedQuantity: Number(e.target.value) || 0 })} className={FIELD} />
                </Field>
              </div>
            </div>
          ))}
        </div>
      </Field>
    </PanelForm>
  );
};
