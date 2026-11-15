import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, LogOut } from "lucide-react";
import { domiciliationService } from "../../services/domiciliation.service";
import type { DomiciliationBillingCycle, DomiciliationContractView } from "../../services/domiciliation.service";
import { ActionButton, Field, PanelForm } from "../subscription/kit";
import { FIELD_SOFT, apiMessage } from "../subscription/kitUtils";
import { toast } from "../ui/toastStore";
import { DOMICILIATION_CYCLE_OPTIONS } from "./serviceLabels";

type Mode = null | "commitment" | "terminate";

/** Modification de l'engagement et résiliation d'un contrat de domiciliation, sous forme de petits formulaires en ligne. */
export const ContractEngagement: React.FC<{ contract: DomiciliationContractView }> = ({ contract }) => {
  const qc = useQueryClient();
  const n = contract.contractNumber;
  const [mode, setMode] = useState<Mode>(null);
  const [commitment, setCommitment] = useState({
    billingCycle: String(contract.billingCycle ?? "MONTHLY"),
    commitmentMonths: contract.commitmentMonths != null ? String(contract.commitmentMonths) : "",
  });
  const [terminate, setTerminate] = useState({ reason: "", effectiveDate: "" });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["domiciliation-contract", n] });
    qc.invalidateQueries({ queryKey: ["domiciliation-contracts"] });
  };

  const update = useMutation({
    mutationFn: () =>
      domiciliationService.updateCommitment(n, {
        billingCycle: commitment.billingCycle as DomiciliationBillingCycle,
        commitmentMonths: Number(commitment.commitmentMonths),
      }),
    onSuccess: () => {
      toast.success("Engagement mis à jour");
      setMode(null);
      refresh();
    },
    onError: (e) => toast.error(apiMessage(e, "Modification impossible.")),
  });

  const end = useMutation({
    mutationFn: () => domiciliationService.terminateContract(n, { reason: terminate.reason.trim(), effectiveDate: terminate.effectiveDate }),
    onSuccess: refresh,
  });

  const askTerminate = () =>
    toast.confirm({
      message: "Résilier ce contrat de domiciliation ?",
      detail: `Date d'effet : ${new Date(terminate.effectiveDate).toLocaleDateString("fr-FR")}. Motif : ${terminate.reason.trim()}`,
      confirmLabel: "Résilier le contrat",
      pendingLabel: "Résiliation en cours",
      successMessage: "Contrat résilié",
      errorMessage: "La résiliation a été refusée",
      onConfirm: async () => {
        await end.mutateAsync();
        setMode(null);
      },
    });

  const months = Number(commitment.commitmentMonths);
  const revokes = commitment.commitmentMonths !== "" && months < 12 && contract.certificateScope === "FISCAL" && contract.certificateInForce;
  const closed = contract.status === "TERMINATED" || contract.status === "EXPIRED";
  if (closed) return null;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <ActionButton variant="ghost" icon={CalendarClock} onClick={() => setMode(mode === "commitment" ? null : "commitment")}>
          Modifier l'engagement
        </ActionButton>
        <ActionButton variant="ghost" icon={LogOut} onClick={() => setMode(mode === "terminate" ? null : "terminate")}>
          Résilier le contrat
        </ActionButton>
      </div>

      {mode === "commitment" && (
        <PanelForm
          title="Modifier l'engagement"
          pending={update.isPending}
          submitLabel="Enregistrer"
          submitDisabled={commitment.commitmentMonths === "" || !Number.isInteger(months) || months < 0}
          onCancel={() => setMode(null)}
          onSubmit={(e) => {
            e.preventDefault();
            update.mutate();
          }}
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Rythme de facturation" required>
              <select className={FIELD_SOFT} value={commitment.billingCycle} onChange={(e) => setCommitment({ ...commitment, billingCycle: e.target.value })}>
                {DOMICILIATION_CYCLE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Engagement (mois)" required>
              <input
                type="number"
                min={0}
                className={FIELD_SOFT}
                value={commitment.commitmentMonths}
                onChange={(e) => setCommitment({ ...commitment, commitmentMonths: e.target.value })}
              />
            </Field>
          </div>
          {revokes && (
            <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
              Passer sous douze mois d'engagement révoque l'attestation fiscale en cours.
            </p>
          )}
        </PanelForm>
      )}

      {mode === "terminate" && (
        <PanelForm
          title="Résilier le contrat"
          pending={false}
          submitLabel="Résilier"
          submitDisabled={!terminate.reason.trim() || !terminate.effectiveDate}
          onCancel={() => setMode(null)}
          onSubmit={(e) => {
            e.preventDefault();
            askTerminate();
          }}
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Date d'effet" required>
              <input type="date" className={FIELD_SOFT} value={terminate.effectiveDate} onChange={(e) => setTerminate({ ...terminate, effectiveDate: e.target.value })} />
            </Field>
            <Field label="Motif" required className="md:col-span-2">
              <textarea className={FIELD_SOFT} rows={2} value={terminate.reason} onChange={(e) => setTerminate({ ...terminate, reason: e.target.value })} />
            </Field>
          </div>
        </PanelForm>
      )}
    </div>
  );
};
