import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { inventoryService } from "../../../services/inventory.service";
import type { InventoryItem, StockOutReasonCode } from "../../../services/inventory.service";
import { ActionButton, CheckField, Field, PanelForm } from "../../../components/subscription/kit";
import { FIELD, apiMessage } from "../../../components/subscription/kitUtils";
import { toast } from "../../../components/ui/toastStore";
import { ItemPicker, LocationSelect, REASON_LABEL, useActor } from "../../../components/inventory/invKit";
import { AvailableFact, LotSelect, ReferenceFields, SerialPicker, lotNotFoundOf, useAvailable } from "./StockParts";

const REASONS: StockOutReasonCode[] = ["CONSUMPTION", "DAMAGE", "LOSS", "INTERNAL_USE", "SAMPLE", "DONATION", "OTHER"];
const EMPTY = { locationCode: "", quantity: 1, reasonCode: "CONSUMPTION" as StockOutReasonCode, reasonDetails: "", referenceType: "", referenceCode: "", allowNegativeOverride: false, lotNumber: "", serialNumbers: [] as string[] };

export const StockOutForm: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const actor = useActor();
  const queryClient = useQueryClient();
  const [item, setItem] = useState<InventoryItem | null>(null);
  const [f, setF] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [lotMissing, setLotMissing] = useState(false);
  const set = (p: Partial<typeof EMPTY>) => setF((x) => ({ ...x, ...p }));
  const { available, loaded } = useAvailable(item?.itemCode ?? "", f.locationCode);

  const save = useMutation({
    mutationFn: (confirmCreateLot?: boolean) =>
      inventoryService.stockOut({
        itemCode: item!.itemCode,
        locationCode: f.locationCode,
        quantity: f.quantity,
        reasonCode: f.reasonCode,
        reasonDetails: f.reasonDetails || undefined,
        referenceType: f.referenceType || undefined,
        referenceCode: f.referenceCode || undefined,
        allowNegativeOverride: f.allowNegativeOverride,
        performedBy: actor,
        lotNumber: f.lotNumber || undefined,
        confirmCreateLot: !!confirmCreateLot,
        serialNumbers: item?.requiresSerialNumber ? f.serialNumbers : undefined,
      }),
    onSuccess: async () => {
      toast.success("Sortie de stock enregistrée");
      await Promise.all([queryClient.invalidateQueries({ queryKey: ["stock-levels"] }), queryClient.invalidateQueries({ queryKey: ["stock-movements"] }), queryClient.invalidateQueries({ queryKey: ["stock-lots"] })]);
      onClose();
    },
    onError: (e) => {
      setLotMissing(lotNotFoundOf(e));
      setError(apiMessage(e, "Sortie de stock impossible"));
    },
  });

  const validate = (): string | null => {
    if (!item || !f.locationCode) return "Choisissez un article et un emplacement.";
    if (f.quantity <= 0) return "La quantité doit être supérieure à 0.";
    if (f.referenceType && !f.referenceCode) return "Le code de référence est obligatoire quand le type de référence est renseigné.";
    if (f.reasonCode === "OTHER" && !f.reasonDetails.trim()) return "Le détail du motif est obligatoire pour le motif Autre.";
    if (item.requiresLotNumber && !f.lotNumber) return "Le lot est obligatoire pour cet article.";
    if (item.requiresSerialNumber && f.serialNumbers.length !== f.quantity) return `Sélectionnez exactement ${f.quantity} numéro(s) de série.`;
    if (!f.allowNegativeOverride && f.quantity > available) return `Stock insuffisant : ${f.quantity} demandé, ${available} disponible.`;
    return null;
  };

  return (
    <PanelForm
      title="Sortie de stock"
      onCancel={onClose}
      pending={save.isPending && !save.variables}
      submitLabel="Sortir le stock"
      submitDisabled={!item || !f.locationCode || f.quantity <= 0}
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
        <Field label="Emplacement" required>
          <LocationSelect value={f.locationCode} onChange={(v) => { set({ locationCode: v, lotNumber: "", serialNumbers: [] }); setError(null); }} />
        </Field>
        {f.locationCode && item && <AvailableFact title="Stock disponible" value={available} loaded={loaded} />}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Quantité à sortir" required>
          <input type="number" min={1} value={f.quantity} onChange={(e) => set({ quantity: Number(e.target.value) || 0 })} className={FIELD} />
        </Field>
        <Field label="Motif" required>
          <select value={f.reasonCode} onChange={(e) => set({ reasonCode: e.target.value as StockOutReasonCode })} className={FIELD}>
            {REASONS.map((r) => <option key={r} value={r}>{REASON_LABEL[r]}</option>)}
          </select>
        </Field>
      </div>
      <LotSelect item={item} locationCode={f.locationCode} queryKey="item-lots" value={f.lotNumber} onChange={(v) => set({ lotNumber: v })} />
      <SerialPicker item={item} locationCode={f.locationCode} queryKey="item-serials" value={f.serialNumbers} onChange={(v) => set({ serialNumbers: v })} quantity={f.quantity} />
      <ReferenceFields type={f.referenceType} code={f.referenceCode} onType={(v) => set({ referenceType: v })} onCode={(v) => set({ referenceCode: v })} />
      <Field label="Détail du motif">
        <textarea value={f.reasonDetails} onChange={(e) => set({ reasonDetails: e.target.value })} rows={2} className={`${FIELD} resize-none`} />
      </Field>
      <CheckField checked={f.allowNegativeOverride} onChange={(v) => set({ allowNegativeOverride: v })} label="Autoriser la sortie même si le stock est insuffisant" />
      {lotMissing && (
        <ActionButton variant="ghost" pending={save.isPending && save.variables === true} onClick={() => save.mutate(true)}>
          Créer le lot et relancer
        </ActionButton>
      )}
    </PanelForm>
  );
};
