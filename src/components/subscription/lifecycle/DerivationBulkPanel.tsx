import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Layers, ShieldCheck } from "lucide-react";
import { subscriptionDerivationService } from "../../../services/subscriptionDerivation.service";
import type { DerivationOutcome } from "../../../services/subscriptionDerivation.service";
import { ActionButton, Field, PanelForm, Section } from "../kit";
import { FIELD_SOFT, apiMessage } from "../kitUtils";
import { toast } from "../../ui/toastStore";
import { DerivationOutcomeCard } from "./DerivationOutcomeCard";
import { DerivationSpecForm, buildSpec, emptySpecState, specIsValid } from "./DerivationSpecForm";

const parseNumbers = (s: string): string[] => Array.from(new Set(s.split(/[\s,;]+/).map((x) => x.trim()).filter(Boolean)));

/** Prix négocié sur plusieurs abonnements, et maintien d'un ancien tarif. Toujours simuler d'abord. */
export const DerivationBulkPanel: React.FC = () => {
  const qc = useQueryClient();
  const [numbers, setNumbers] = useState("");
  const [spec, setSpec] = useState(emptySpecState());
  const [bulkOut, setBulkOut] = useState<{ o: DerivationOutcome; simulated: boolean } | null>(null);
  const [versionId, setVersionId] = useState("");
  const [until, setUntil] = useState("");
  const [protOut, setProtOut] = useState<{ o: DerivationOutcome; simulated: boolean } | null>(null);

  const list = parseNumbers(numbers);
  const refresh = () => qc.invalidateQueries({ queryKey: ["derivations"] });

  const bulk = useMutation({
    mutationFn: (simulateOnly: boolean) => subscriptionDerivationService.bulk({ subscriptionNumbers: list, spec: buildSpec(spec), simulateOnly }),
    onSuccess: (o, simulateOnly) => {
      setBulkOut({ o, simulated: simulateOnly });
      if (!simulateOnly) refresh();
    },
    onError: (e, simulateOnly) => simulateOnly && toast.error(apiMessage(e, "Traitement impossible.")),
  });
  const protect = useMutation({
    mutationFn: (simulateOnly: boolean) => subscriptionDerivationService.protect({ previousVersionId: versionId.trim(), protectedUntil: until, simulateOnly }),
    onSuccess: (o, simulateOnly) => {
      setProtOut({ o, simulated: simulateOnly });
      if (!simulateOnly) refresh();
    },
    onError: (e, simulateOnly) => simulateOnly && toast.error(apiMessage(e, "Traitement impossible.")),
  });

  const applyBulk = () =>
    toast.confirm({
      message: `Appliquer ce prix négocié à ${list.length} abonnement${list.length > 1 ? "s" : ""} ?`,
      confirmLabel: "Appliquer",
      pendingLabel: "Application",
      successMessage: "Lot appliqué",
      errorMessage: "Traitement impossible",
      onConfirm: () => bulk.mutateAsync(false),
    });
  const applyProtect = () =>
    toast.confirm({
      message: "Maintenir l'ancien tarif des abonnés de cette version ?",
      detail: `Jusqu'au ${until}`,
      confirmLabel: "Maintenir",
      pendingLabel: "Application",
      successMessage: "Tarif maintenu",
      errorMessage: "Traitement impossible",
      onConfirm: () => protect.mutateAsync(false),
    });

  return (
    <div className="space-y-5">
      <Section title="Prix négocié en lot" description="Un même prix négocié pour plusieurs abonnements" icon={Layers}>
        <PanelForm title="Abonnements concernés" submitLabel="Simuler" pending={bulk.isPending && bulk.variables === true} submitDisabled={list.length === 0 || !specIsValid(spec)} onCancel={() => { setNumbers(""); setSpec(emptySpecState()); setBulkOut(null); }} onSubmit={(e) => { e.preventDefault(); bulk.mutate(true); }}>
          <Field label="Numéros d'abonnement" hint={`${list.length} numéro${list.length > 1 ? "s" : ""} reconnu${list.length > 1 ? "s" : ""}. Un par ligne ou séparés par des virgules.`}>
            <textarea value={numbers} onChange={(e) => { setNumbers(e.target.value); setBulkOut(null); }} rows={3} className={`${FIELD_SOFT} resize-none font-mono`} />
          </Field>
          <DerivationSpecForm value={spec} onChange={(v) => { setSpec(v); setBulkOut(null); }} />
          {bulkOut && <DerivationOutcomeCard outcome={bulkOut.o} simulated={bulkOut.simulated} />}
          {bulkOut?.simulated && bulkOut.o.succeeded > 0 && (
            <ActionButton variant="ghost" onClick={applyBulk}>Appliquer au lot</ActionButton>
          )}
        </PanelForm>
      </Section>

      <Section title="Maintien d'un ancien tarif" description="Les abonnés d'une ancienne version de plan gardent leur prix jusqu'à une date" icon={ShieldCheck}>
        <PanelForm title="Version de plan à protéger" submitLabel="Simuler" pending={protect.isPending && protect.variables === true} submitDisabled={!versionId.trim() || !until} onCancel={() => { setVersionId(""); setUntil(""); setProtOut(null); }} onSubmit={(e) => { e.preventDefault(); protect.mutate(true); }}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Identifiant de l'ancienne version" required>
              <input value={versionId} onChange={(e) => { setVersionId(e.target.value); setProtOut(null); }} className={`${FIELD_SOFT} font-mono`} />
            </Field>
            <Field label="Protégé jusqu'au" required>
              <input type="date" value={until} onChange={(e) => { setUntil(e.target.value); setProtOut(null); }} className={FIELD_SOFT} />
            </Field>
          </div>
          {protOut && <DerivationOutcomeCard outcome={protOut.o} simulated={protOut.simulated} />}
          {protOut?.simulated && protOut.o.succeeded > 0 && <ActionButton variant="ghost" onClick={applyProtect}>Maintenir le tarif</ActionButton>}
        </PanelForm>
      </Section>
    </div>
  );
};
