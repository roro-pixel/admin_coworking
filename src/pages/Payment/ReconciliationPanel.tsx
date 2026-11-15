import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, RotateCcw } from "lucide-react";
import { paymentService } from "../../services/payment.service";
import { useAuth } from "../../contexts/AuthContext";
import { ActionButton, Detail, ErrorBanner, Field, ListHeader, Section } from "../../components/subscription/kit";
import { FIELD, apiMessage } from "../../components/subscription/kitUtils";
import { toast } from "../../components/ui/toastStore";

const STEPS = ["Créer le lot", "Clôturer le lot"];

export const ReconciliationPanel: React.FC = () => {
  const { admin } = useAuth();

  const [provider, setProvider] = useState("CASH");
  const [createdBatch, setCreatedBatch] = useState<{ batchNumber: string; status: string } | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [completeSuccess, setCompleteSuccess] = useState(false);

  const createMutation = useMutation({
    mutationFn: () => paymentService.createReconciliationBatch({ provider, createdBy: admin?.email || "admin" }),
    onSuccess: (data) => {
      setCreatedBatch(data);
      setCreateError(null);
      toast.success("Lot créé");
    },
    onError: (e: unknown) => setCreateError(apiMessage(e, "Erreur lors de la création du lot.")),
  });

  const completeMutation = useMutation({
    mutationFn: () => paymentService.completeReconciliationBatch(createdBatch!.batchNumber),
    onSuccess: () => setCompleteSuccess(true),
  });

  const reset = () => {
    setCreatedBatch(null);
    setCreateError(null);
    setCompleteSuccess(false);
  };

  const confirmComplete = () =>
    toast.confirm({
      message: `Clôturer le lot ${createdBatch!.batchNumber} ?`,
      detail: "Une fois clôturé, le lot ne peut plus être modifié.",
      confirmLabel: "Clôturer le lot",
      successMessage: "Lot clôturé",
      errorMessage: "Clôture impossible",
      onConfirm: () => completeMutation.mutateAsync(),
    });

  const step = completeSuccess ? 2 : createdBatch ? 1 : 0;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5">
      <ListHeader
        title="Réconciliation"
        subtitle="Créez un lot pour rapprocher les paiements avec le fournisseur, puis clôturez-le."
      />

      <ol className="flex items-center gap-3 text-sm font-semibold">
        {STEPS.map((label, i) => {
          const done = i < step || completeSuccess;
          const current = i === step && !completeSuccess;
          return (
            <li key={label} className="flex items-center gap-3">
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs ${
                  done
                    ? "bg-emerald-500 text-white"
                    : current
                      ? "bg-[color:var(--logo-pink-dark)] text-white"
                      : "bg-gray-200 text-gray-500"
                }`}
              >
                {done ? "✓" : i + 1}
              </span>
              <span className={current || done ? "text-gray-950" : "text-gray-400"}>{label}</span>
            </li>
          );
        })}
      </ol>

      {completeSuccess ? (
        <div className="rounded-[1.75rem] bg-emerald-50 p-8 text-center">
          <CheckCircle2 size={40} className="mx-auto text-emerald-600" />
          <p className="mt-3 text-lg font-bold text-emerald-900">
            Lot <span className="font-mono">{createdBatch?.batchNumber}</span> clôturé
          </p>
          <ActionButton onClick={reset} className="mt-5">
            Nouveau lot
          </ActionButton>
        </div>
      ) : !createdBatch ? (
        <Section title="Créer un lot" description="Choisissez le fournisseur à rapprocher.">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate();
            }}
            className="space-y-4"
          >
            <ErrorBanner message={createError} />
            <Field label="Fournisseur" required hint="Seuls les espèces et le portefeuille sont disponibles : le Mobile Money n'est pas encore actif en production.">
              <select value={provider} onChange={(e) => setProvider(e.target.value)} className={FIELD}>
                <option value="CASH">Espèces (CASH)</option>
                <option value="WALLET">Portefeuille (WALLET)</option>
              </select>
            </Field>
            <div className="flex justify-end">
              <ActionButton type="submit" pending={createMutation.isPending}>
                Créer le lot de réconciliation
              </ActionButton>
            </div>
          </form>
        </Section>
      ) : (
        <Section title="Clôturer le lot" description="Vérifiez que toutes les transactions ont été rapprochées.">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
            <Detail label="N° du lot" mono>{createdBatch.batchNumber}</Detail>
            <Detail label="Statut">{createdBatch.status}</Detail>
            <Detail label="Fournisseur">{provider}</Detail>
            <Detail label="Créé par">{admin?.email || "admin"}</Detail>
          </dl>
          <p className="mt-5 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Une fois clôturé, le lot ne peut plus être modifié.
          </p>
          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <ActionButton variant="ghost" icon={RotateCcw} onClick={reset} disabled={completeMutation.isPending}>
              Recommencer
            </ActionButton>
            <ActionButton icon={CheckCircle2} onClick={confirmComplete}>
              Clôturer le lot
            </ActionButton>
          </div>
        </Section>
      )}
    </div>
  );
};
