import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { inventoryService } from "../../../services/inventory.service";
import type { InventoryItem, StockOutReasonCode } from "../../../services/inventory.service";
import { Field, PanelForm } from "../../../components/subscription/kit";
import { FIELD, apiMessage } from "../../../components/subscription/kitUtils";
import { toast } from "../../../components/ui/toastStore";
import { ItemPicker, LocationSelect, REASON_LABEL, qty, useActor } from "../../../components/inventory/invKit";
import { AvailableFact, ReferenceFields, useAvailable } from "./StockParts";

const REASONS: StockOutReasonCode[] = ["LOSS", "DAMAGE", "INTERNAL_USE", "CONSUMPTION", "OTHER"];
const EMPTY = { locationCode: "", delta: 0, reasonCode: "LOSS" as StockOutReasonCode, reasonDetails: "", referenceType: "", referenceCode: "" };

export const StockAdjustmentForm: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const actor = useActor();
  const queryClient = useQueryClient();
  const [item, setItem] = useState<InventoryItem | null>(null);
  const [f, setF] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const set = (p: Partial<typeof EMPTY>) => setF((x) => ({ ...x, ...p }));
  const { available, loaded } = useAvailable(item?.itemCode ?? "", f.locationCode);

  const save = useMutation({
    mutationFn: () =>
      inventoryService.stockAdjust({
        itemCode: item!.itemCode,
        locationCode: f.locationCode,
        quantityDelta: f.delta,
        reasonCode: f.reasonCode,
        reasonDetails: f.reasonDetails || undefined,
        referenceType: f.referenceType || undefined,
        referenceCode: f.referenceCode || undefined,
        performedBy: actor,
      }),
    onSuccess: async () => {
      toast.success("Ajustement appliqué");
      await Promise.all([queryClient.invalidateQueries({ queryKey: ["stock-levels"] }), queryClient.invalidateQueries({ queryKey: ["stock-movements"] })]);
      onClose();
    },
    onError: (e) => setError(apiMessage(e, "Ajustement impossible")),
  });

  const validate = (): string | null => {
    if (!item || !f.locationCode) return "Choisissez un article et un emplacement.";
    if (f.delta === 0) return "La variation ne peut pas être nulle.";
    if (f.referenceType && !f.referenceCode) return "Le code de référence est obligatoire quand le type de référence est renseigné.";
    if (f.delta < 0 && f.reasonCode === "OTHER" && !f.reasonDetails.trim()) return "Le détail du motif est obligatoire pour un ajustement négatif avec le motif Autre.";
    if (f.delta < 0 && Math.abs(f.delta) > available) return `Ajustement négatif trop important : stock actuel ${available}.`;
    return null;
  };

  return (
    <PanelForm
      title="Ajustement de stock"
      onCancel={onClose}
      pending={save.isPending}
      submitLabel="Appliquer l'ajustement"
      submitDisabled={!item || !f.locationCode || f.delta === 0}
      error={error}
      onSubmit={(e) => {
        e.preventDefault();
        const v = validate();
        setError(v);
        if (!v) save.mutate();
      }}
    >
      <Field label="Article" required>
        <ItemPicker value={item} onChange={(it) => { setItem(it); setError(null); }} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Emplacement" required>
          <LocationSelect value={f.locationCode} onChange={(v) => { set({ locationCode: v }); setError(null); }} />
        </Field>
        {f.locationCode && item && <AvailableFact title="Stock actuel" value={available} loaded={loaded} />}
      </div>
      <Field label="Variation" required hint={f.delta !== 0 ? `Nouveau stock : ${qty(available)} vers ${qty(available + f.delta)}` : "Positive pour ajouter, négative pour retirer. Exemple : 10 ou -5."}>
        <input type="number" value={f.delta} onChange={(e) => set({ delta: Number(e.target.value) || 0 })} className={FIELD} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Motif">
          <select value={f.reasonCode} onChange={(e) => set({ reasonCode: e.target.value as StockOutReasonCode })} className={FIELD}>
            {REASONS.map((r) => <option key={r} value={r}>{REASON_LABEL[r]}</option>)}
          </select>
        </Field>
        <Field label="Détail du motif">
          <input value={f.reasonDetails} onChange={(e) => set({ reasonDetails: e.target.value })} placeholder="Correction après comptage, casse" className={FIELD} />
        </Field>
      </div>
      <ReferenceFields type={f.referenceType} code={f.referenceCode} onType={(v) => set({ referenceType: v })} onCode={(v) => set({ referenceCode: v })} />
    </PanelForm>
  );
};
