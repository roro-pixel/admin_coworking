import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Save } from "lucide-react";
import { contractService } from "../../services/contract.service";
import { ActionButton, ErrorBanner, PageHeader } from "../../components/subscription/kit";
import { apiMessage } from "../../components/subscription/kitUtils";
import { toast } from "../../components/ui/toastStore";
import { useFormDraft, readDraft } from "../../components/billing/useFormDraft";
import { ContractShell } from "../../components/contracts/ContractShell";
import { ContractForm } from "../../components/contracts/ContractForm";
import { useActorId, useIdempotencyKey } from "../../components/contracts/contractUtils";
import { buildContractRequest, emptyContractForm, validateContract } from "../../components/contracts/contractFormModel";
import type { ContractFormValues, PartyDraft } from "../../components/contracts/contractFormModel";

const DRAFT_KEY = "contract-draft-new";
type Saved = { values: ContractFormValues; parties: PartyDraft[] };

/** Création avancée d'un contrat : mêmes champs et mêmes règles que le panneau rapide, sur une page. */
export const ContractCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const actorId = useActorId();
  const idem = useIdempotencyKey();

  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ["contract-templates"],
    queryFn: () => contractService.getTemplates(),
  });

  const initial = React.useRef<Saved | null>(readDraft<Saved>(DRAFT_KEY));
  const [restored, setRestored] = useState(!!initial.current);
  const [values, setValues] = useState<ContractFormValues>(initial.current?.values ?? emptyContractForm());
  const [parties, setParties] = useState<PartyDraft[]>(initial.current?.parties ?? []);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Brouillon local : on peut quitter la page vérifier une information et retrouver sa saisie
  const pristine = JSON.stringify(values) === JSON.stringify(emptyContractForm()) && parties.length === 0;
  const { clearDraft } = useFormDraft<Saved>(DRAFT_KEY, { values, parties }, !pristine);

  const create = useMutation({
    mutationFn: () => contractService.createContract(buildContractRequest(values, parties, actorId), idem.get()),
    onSuccess: (c) => {
      clearDraft();
      idem.renew();
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      toast.success("Contrat créé");
      navigate(`/contracts/${c.contractCode}`);
    },
    onError: (e: unknown) => setSubmitError(apiMessage(e, "Erreur lors de la création du contrat.")),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    const found = validateContract(values, parties);
    setErrors(found);
    if (Object.keys(found).length === 0) create.mutate();
    else toast.error("Corrigez les champs signalés.");
  };

  const discard = () => {
    clearDraft();
    setValues(emptyContractForm());
    setParties([]);
    setErrors({});
    setRestored(false);
    // clearDraft bloque les écritures : on recharge la page de création vierge
    navigate(0);
  };

  return (
    <ContractShell>
      <form onSubmit={submit} className="mx-auto w-full max-w-4xl">
        <PageHeader
          title="Créer un contrat"
          subtitle="Remplissez les informations, ajoutez les parties prenantes puis créez le contrat."
          onBack={() => navigate("/contracts")}
          backLabel="Retour aux contrats"
          actions={
            <ActionButton type="submit" icon={Save} pending={create.isPending}>
              Créer le contrat
            </ActionButton>
          }
        />

        {restored && (
          <div className="mb-4 flex flex-col gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800 sm:flex-row sm:items-center sm:justify-between">
            <span>Votre saisie précédente a été retrouvée.</span>
            <button type="button" onClick={discard} className="self-start rounded-full px-3 py-1 font-semibold underline sm:self-auto">
              Repartir de zéro
            </button>
          </div>
        )}

        <div className="mb-4">
          <ErrorBanner message={submitError} />
        </div>

        <ContractForm
          values={values}
          onChange={(patch) => setValues((v) => ({ ...v, ...patch }))}
          parties={parties}
          onPartiesChange={setParties}
          templates={templates}
          templatesLoading={templatesLoading}
          errors={errors}
        />

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <ActionButton variant="ghost" onClick={() => navigate("/contracts")} disabled={create.isPending}>
            Annuler
          </ActionButton>
          <ActionButton type="submit" icon={Save} pending={create.isPending}>
            Créer le contrat
          </ActionButton>
        </div>
      </form>
    </ContractShell>
  );
};
