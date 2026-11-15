import React, { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { inventoryService } from "../../../services/inventory.service";
import type { InventoryItem } from "../../../services/inventory.service";
import { Field, PanelForm } from "../../../components/subscription/kit";
import { FIELD, apiMessage } from "../../../components/subscription/kitUtils";
import { toast } from "../../../components/ui/toastStore";
import { ItemPicker, LocationSelect, useActor } from "../../../components/inventory/invKit";
import { ReferenceFields } from "./StockParts";

const parseSerials = (v: string) => v.split(/[\n,;]/).map((s) => s.trim()).filter(Boolean);
const EMPTY = { locationCode: "", quantity: 1, unitCost: 0, lotNumber: "", expiryDate: "", referenceType: "", referenceCode: "", reasonDetails: "", serialsText: "" };

export const StockInForm: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const actor = useActor();
  const queryClient = useQueryClient();
  const [item, setItem] = useState<InventoryItem | null>(null);
  const [f, setF] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const set = (p: Partial<typeof EMPTY>) => setF((x) => ({ ...x, ...p }));
  const serials = useMemo(() => parseSerials(f.serialsText), [f.serialsText]);

  const save = useMutation({
    mutationFn: () =>
      inventoryService.stockIn({
        itemCode: item!.itemCode,
        locationCode: f.locationCode,
        quantity: f.quantity,
        unitCost: f.unitCost,
        lotNumber: f.lotNumber || undefined,
        expiryDate: f.expiryDate || undefined,
        referenceType: f.referenceType || undefined,
        referenceCode: f.referenceCode || undefined,
        reasonDetails: f.reasonDetails || undefined,
        performedBy: actor,
        assetSerialNumbers: item?.requiresSerialNumber ? serials : undefined,
      }),
    onSuccess: async () => {
      toast.success("Entrée de stock enregistrée");
      await Promise.all([queryClient.invalidateQueries({ queryKey: ["stock-levels"] }), queryClient.invalidateQueries({ queryKey: ["stock-movements"] }), queryClient.invalidateQueries({ queryKey: ["stock-lots"] })]);
      onClose();
    },
    onError: (e) => setError(apiMessage(e, "Entrée de stock impossible")),
  });

  const validate = (): string | null => {
    if (!item || !f.locationCode) return "Choisissez un article et un emplacement.";
    if (f.quantity <= 0) return "La quantité doit être supérieure à 0.";
    if (f.unitCost < 0) return "Le coût unitaire ne peut pas être négatif.";
    if (f.referenceType && !f.referenceCode) return "Le code de référence est obligatoire quand le type de référence est renseigné.";
    if (item.requiresLotNumber && !f.lotNumber.trim()) return "Le numéro de lot est obligatoire pour cet article.";
    if (item.requiresExpiryDate && !f.expiryDate) return "La date d'expiration est obligatoire pour cet article.";
    if (item.requiresSerialNumber && serials.length !== f.quantity) return `Saisissez exactement ${f.quantity} numéro(s) de série.`;
    return null;
  };

  return (
    <PanelForm
      title="Entrée de stock"
      onCancel={onClose}
      pending={save.isPending}
      submitLabel="Enregistrer l'entrée"
      submitDisabled={!item || !f.locationCode}
      error={error}
      onSubmit={(e) => {
        e.preventDefault();
        const v = validate();
        setError(v);
        if (!v) save.mutate();
      }}
    >
      <Field label="Article" required>
        <ItemPicker
          value={item}
          onChange={(it) => {
            setItem(it);
            setF((x) => ({ ...x, lotNumber: it?.requiresLotNumber ? x.lotNumber : "", expiryDate: it?.requiresExpiryDate ? x.expiryDate : "", serialsText: it?.requiresSerialNumber ? x.serialsText : "" }));
            setError(null);
          }}
        />
      </Field>
      <Field label="Emplacement" required>
        <LocationSelect value={f.locationCode} onChange={(v) => set({ locationCode: v })} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Quantité" required>
          <input type="number" min={1} value={f.quantity} onChange={(e) => set({ quantity: Number(e.target.value) || 0 })} className={FIELD} />
        </Field>
        <Field label="Coût unitaire (FCFA)" required>
          <input type="number" min={0} value={f.unitCost} onChange={(e) => set({ unitCost: Number(e.target.value) || 0 })} className={FIELD} />
        </Field>
      </div>
      {item?.requiresLotNumber && (
        <Field label="Numéro de lot" required>
          <input value={f.lotNumber} onChange={(e) => set({ lotNumber: e.target.value })} placeholder="Ex : LOT-2026-06" className={FIELD} />
        </Field>
      )}
      {item?.requiresExpiryDate && (
        <Field label="Date d'expiration" required>
          <input type="date" value={f.expiryDate} onChange={(e) => set({ expiryDate: e.target.value })} className={FIELD} />
        </Field>
      )}
      {item?.requiresSerialNumber && (
        <Field label="Numéros de série" required hint={`${serials.length} sur ${f.quantity} saisi${serials.length > 1 ? "s" : ""}. Un par ligne, ou séparés par une virgule.`}>
          <textarea value={f.serialsText} onChange={(e) => set({ serialsText: e.target.value })} rows={4} className={`${FIELD} resize-none`} />
        </Field>
      )}
      <ReferenceFields type={f.referenceType} code={f.referenceCode} onType={(v) => set({ referenceType: v })} onCode={(v) => set({ referenceCode: v })} />
      <Field label="Motif ou détail">
        <textarea value={f.reasonDetails} onChange={(e) => set({ reasonDetails: e.target.value })} rows={2} placeholder="Réception de commande, retour, régularisation" className={`${FIELD} resize-none`} />
      </Field>
    </PanelForm>
  );
};
