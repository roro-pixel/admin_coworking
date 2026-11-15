import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { inventoryService } from "../../../services/inventory.service";
import type { InventoryItem, StockOutReasonCode } from "../../../services/inventory.service";
import { ActionButton, Field, PanelForm } from "../../../components/subscription/kit";
import { FIELD, apiMessage } from "../../../components/subscription/kitUtils";
import { toast } from "../../../components/ui/toastStore";
import { ItemPicker, LocationSelect, REASON_LABEL, useActor } from "../../../components/inventory/invKit";
import { AvailableFact, LotSelect, SerialPicker, lotNotFoundOf, useAvailable } from "./StockParts";

const REASONS: StockOutReasonCode[] = ["INTERNAL_USE", "CONSUMPTION", "DAMAGE", "LOSS", "OTHER"];
const EMPTY = { from: "", to: "", quantity: 1, reasonCode: "INTERNAL_USE" as StockOutReasonCode, reasonDetails: "", lotNumber: "", serialNumbers: [] as string[] };

export const StockTransferForm: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const actor = useActor();
  const queryClient = useQueryClient();
  const [item, setItem] = useState<InventoryItem | null>(null);
  const [f, setF] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [lotMissing, setLotMissing] = useState(false);
  const set = (p: Partial<typeof EMPTY>) => setF((x) => ({ ...x, ...p }));
  const { available, loaded } = useAvailable(item?.itemCode ?? "", f.from);

  const save = useMutation({
    mutationFn: (confirmCreateLot?: boolean) =>
      inventoryService.stockTransfer({
        itemCode: item!.itemCode,
        locationFromCode: f.from,
        locationToCode: f.to,
        quantity: f.quantity,
        reasonCode: f.reasonCode,
        reasonDetails: f.reasonDetails || undefined,
        performedBy: actor,
        lotNumber: f.lotNumber || undefined,
        confirmCreateLot: !!confirmCreateLot,
        serialNumbers: item?.requiresSerialNumber ? f.serialNumbers : undefined,
      }),
    onSuccess: async () => {
      toast.success("Transfert enregistré");
      await Promise.all([queryClient.invalidateQueries({ queryKey: ["stock-levels"] }), queryClient.invalidateQueries({ queryKey: ["stock-movements"] }), queryClient.invalidateQueries({ queryKey: ["stock-lots"] })]);
      onClose();
    },
    onError: (e) => {
      setLotMissing(lotNotFoundOf(e));
      setError(apiMessage(e, "Transfert impossible"));
    },
  });

  const validate = (): string | null => {
    if (!item || !f.from || !f.to) return "Choisissez l'article, la source et la destination.";
    if (f.from === f.to) return "La source et la destination doivent être différentes.";
    if (f.quantity <= 0) return "La quantité doit être supérieure à 0.";
    if (f.quantity > available) return `Stock insuffisant : ${available} disponible.`;
    if (f.reasonCode === "OTHER" && !f.reasonDetails.trim()) return "Le détail est obligatoire pour le motif Autre.";
    if (item.requiresLotNumber && !f.lotNumber) return "Le lot est obligatoire pour cet article.";
    if (item.requiresSerialNumber && f.serialNumbers.length !== f.quantity) return `Sélectionnez exactement ${f.quantity} numéro(s) de série.`;
    return null;
  };

  return (
    <PanelForm
      title="Transfert de stock"
      onCancel={onClose}
      pending={save.isPending && !save.variables}
      submitLabel="Transférer"
      submitDisabled={!item || !f.from || !f.to || f.quantity <= 0}
      error={error}
      onSubmit={(e) => {
        e.preventDefault();
        const v = validate();
        setError(v);
        setLotMissing(false);
        if (!v) save.mutate(false);
      }}
    >
      <Field label="Article" required>
        <ItemPicker value={item} onChange={(it) => { setItem(it); set({ lotNumber: "", serialNumbers: [] }); setError(null); }} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Source" required>
          <LocationSelect value={f.from} onChange={(v) => { set({ from: v, lotNumber: "", serialNumbers: [] }); setError(null); }} placeholder="Emplacement source" />
        </Field>
        <Field label="Destination" required>
          <LocationSelect value={f.to} onChange={(v) => set({ to: v })} exclude={f.from} placeholder="Emplacement destination" />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Quantité" required>
          <input type="number" min={1} value={f.quantity} onChange={(e) => set({ quantity: Number(e.target.value) || 0 })} className={FIELD} />
        </Field>
        <Field label="Motif" required>
          <select value={f.reasonCode} onChange={(e) => set({ reasonCode: e.target.value as StockOutReasonCode })} className={FIELD}>
            {REASONS.map((r) => <option key={r} value={r}>{REASON_LABEL[r]}</option>)}
          </select>
        </Field>
        {f.from && item && <AvailableFact title="Disponible à la source" value={available} loaded={loaded} />}
      </div>
      <LotSelect item={item} locationCode={f.from} queryKey="item-lots-transfer" value={f.lotNumber} onChange={(v) => set({ lotNumber: v })} />
      <SerialPicker item={item} locationCode={f.from} queryKey="item-serials-transfer" value={f.serialNumbers} onChange={(v) => set({ serialNumbers: v })} quantity={f.quantity} />
      <Field label="Détail du motif">
        <textarea value={f.reasonDetails} onChange={(e) => set({ reasonDetails: e.target.value })} rows={2} placeholder="Raison du transfert" className={`${FIELD} resize-none`} />
      </Field>
      {lotMissing && (
        <ActionButton variant="ghost" pending={save.isPending && save.variables === true} onClick={() => save.mutate(true)}>
          Créer le lot et relancer
        </ActionButton>
      )}
    </PanelForm>
  );
};
