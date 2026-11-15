import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, RotateCcw } from "lucide-react";
import { resourceService, SLOT_DURATION_OPTIONS } from "../../services/resource.service";
import type { BulkOperationResult, ResourceSummaryResponse, SlotDurationMinutes } from "../../services/resource.service";
import { ActionButton, CheckField, Field, PanelForm } from "../subscription/kit";
import { FIELD, apiMessage } from "../subscription/kitUtils";
import { toast } from "../ui/toastStore";
import { ResourceMultiPicker } from "./Resourcemultipicker";

interface BulkAvailabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Ouvre la même plage de disponibilité sur plusieurs ressources en un appel
 * (POST /resource-availabilities/bulk). Renvoie toujours 200, même avec des ressources écartées:
 * le récapitulatif n'est donc pas un écran d'erreur mais un compte rendu à lire ligne par ligne.
 * Affiché comme un panneau intégré à la page, pas comme une fenêtre.
 */
export const BulkAvailabilityModal: React.FC<BulkAvailabilityModalProps> = ({ isOpen, onClose }) => {
  const queryClient = useQueryClient();
  const [resources, setResources] = useState<ResourceSummaryResponse[]>([]);
  const [startedAt, setStartedAt] = useState("");
  const [endedAt, setEndedAt] = useState("");
  const [totalCapacity, setTotalCapacity] = useState(1);
  const [active, setActive] = useState(true);
  const [slotDurationOverride, setSlotDurationOverride] = useState<SlotDurationMinutes | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BulkOperationResult | null>(null);

  const close = () => {
    setResources([]);
    setStartedAt("");
    setEndedAt("");
    setTotalCapacity(1);
    setActive(true);
    setSlotDurationOverride(undefined);
    setError(null);
    setResult(null);
    onClose();
  };

  const submit = useMutation({
    mutationFn: (codes: string[]) =>
      resourceService.createAvailabilitiesBulk({ resourceCodes: codes, startedAt, endedAt, slotDurationMinutes: slotDurationOverride, totalCapacity, active }),
    onSuccess: async (data) => {
      setResult(data);
      setError(null);
      await Promise.all([queryClient.invalidateQueries({ queryKey: ["resource-availabilities"] }), queryClient.invalidateQueries({ queryKey: ["resource-availability-grouped"] })]);
      toast.success(`${data.processed} ressource${data.processed > 1 ? "s" : ""} ouverte${data.processed > 1 ? "s" : ""}`);
    },
    // 400 = refus en bloc, rien n'est écrit. Distinct du compte rendu 200 avec des lignes écartées.
    onError: (e) => setError(apiMessage(e, "Ouverture groupée impossible")),
  });

  const retrySkipped = () => {
    if (!result) return;
    const skipped = new Set(result.results.filter((r) => r.status === "SKIPPED").map((r) => r.resourceCode));
    setResources(resources.filter((r) => skipped.has(r.code)));
    setResult(null);
  };

  if (!isOpen) return null;

  if (!result) {
    return (
      <PanelForm
        title="Ouvrir des disponibilités sur plusieurs ressources"
        onCancel={close}
        pending={submit.isPending}
        submitLabel="Ouvrir sur la sélection"
        error={error}
        onSubmit={(e) => {
          e.preventDefault();
          if (resources.length === 0) return setError("Choisissez au moins une ressource.");
          if (!startedAt || !endedAt) return setError("Les dates de début et de fin sont obligatoires.");
          if (endedAt <= startedAt) return setError("La fin doit être après le début.");
          setError(null);
          submit.mutate(resources.map((r) => r.code));
        }}
      >
        <Field label="Ressources" required>
          <ResourceMultiPicker selected={resources} onChange={setResources} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Début" required>
            <input type="datetime-local" value={startedAt} onChange={(e) => setStartedAt(e.target.value)} className={FIELD} />
          </Field>
          <Field label="Fin" required>
            <input type="datetime-local" value={endedAt} min={startedAt} onChange={(e) => setEndedAt(e.target.value)} className={FIELD} />
          </Field>
          <Field label="Capacité par créneau">
            <input type="number" min={1} value={totalCapacity} onChange={(e) => setTotalCapacity(Number(e.target.value) || 1)} className={FIELD} />
          </Field>
        </div>
        <CheckField
          checked={slotDurationOverride !== undefined}
          onChange={(v) => setSlotDurationOverride(v ? 30 : undefined)}
          label="Imposer une durée de créneau à toute la sélection"
        />
        {slotDurationOverride !== undefined ? (
          <Field label="Durée des créneaux" hint="Les ressources qui ont déjà des créneaux futurs à une autre durée seront écartées du lot.">
            <select value={slotDurationOverride} onChange={(e) => setSlotDurationOverride(Number(e.target.value) as SlotDurationMinutes)} className={`${FIELD} sm:max-w-[12rem]`}>
              {SLOT_DURATION_OPTIONS.map((m) => (
                <option key={m} value={m}>
                  {m} min
                </option>
              ))}
            </select>
          </Field>
        ) : (
          <p className="text-sm text-gray-500">Par défaut, chaque ressource garde la durée de créneau déjà configurée.</p>
        )}
        <CheckField checked={active} onChange={setActive} label="Actif immédiatement" />
      </PanelForm>
    );
  }

  return (
    <section className="rounded-[1.75rem] border border-gray-100 bg-white p-3 shadow-sm">
      <h3 className="px-3 pb-3 pt-2 text-base font-bold text-gray-950">Résultat de l'ouverture groupée</h3>
      <div className="space-y-4 rounded-2xl bg-gray-50 p-4 sm:p-5">
        <p className="text-sm text-gray-700">
          <b className="text-emerald-700">
            {result.processed} ressource{result.processed > 1 ? "s" : ""} ouverte{result.processed > 1 ? "s" : ""}
          </b>
          {result.skipped > 0 && (
            <>
              , <b className="text-amber-700">{result.skipped} écartée{result.skipped > 1 ? "s" : ""}</b>
            </>
          )}
          .
        </p>
        <div className="max-h-80 space-y-2 overflow-y-auto">
          {result.results.map((r) => (
            <div key={r.resourceCode} className={`flex items-start gap-3 rounded-2xl p-3 text-sm ${r.status === "PROCESSED" ? "bg-emerald-50" : "bg-amber-50"}`}>
              {r.status === "PROCESSED" ? <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" /> : <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-600" />}
              <div>
                <p className="font-mono text-xs text-gray-500">{r.resourceCode}</p>
                {r.status === "PROCESSED" && r.detail !== null && <p className="text-emerald-800">{r.detail} créneau{r.detail > 1 ? "x" : ""} écrit{r.detail > 1 ? "s" : ""}</p>}
                {r.status === "SKIPPED" && <p className="text-amber-800">{r.reason}</p>}
              </div>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <ActionButton variant="ghost" onClick={close}>Fermer</ActionButton>
          {result.skipped > 0 && (
            <ActionButton icon={RotateCcw} onClick={retrySkipped}>
              Relancer sur les {result.skipped} écartées
            </ActionButton>
          )}
        </div>
      </div>
    </section>
  );
};
