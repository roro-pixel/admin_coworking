import React, { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { contractService } from "../../services/contract.service";
import type { ContractResponse } from "../../services/contract.service";
import { useActorId, useIdempotencyKey } from "./contractUtils";
import { ActionButton } from "../subscription/kit";
import { apiMessage } from "../subscription/kitUtils";
import { toast } from "../ui/toastStore";
import { ContractForm } from "./ContractForm";
import {
  buildContractRequest,
  emptyContractForm,
  formFromContract,
  partiesFromContract,
  validateContract,
} from "./contractFormModel";
import type { ContractFormValues, PartyDraft } from "./contractFormModel";

/**
 * Création rapide et modification d'un contrat, en panneau dans la liste
 * Sans `contract` : création ; avec : modification.
 */
export const ContractFormPanel: React.FC<{
  contract?: ContractResponse | null;
  onSaved: () => void;
  onCancel: () => void;
}> = ({ contract, onSaved, onCancel }) => {
  const actorId = useActorId();
  const idem = useIdempotencyKey();
  const editing = !!contract;

  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ["contract-templates"],
    queryFn: () => contractService.getTemplates(),
  });

  const [values, setValues] = useState<ContractFormValues>(contract ? formFromContract(contract) : emptyContractForm());
  const [parties, setParties] = useState<PartyDraft[]>(contract ? partiesFromContract(contract.parties) : []);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const save = useMutation({
    mutationFn: () => {
      const data = buildContractRequest(values, parties, actorId);
      if (!editing) return contractService.createContract(data, idem.get());
      // Propriétaire et auteur ne se modifient pas : le serveur ne les accepte qu'à la création
      const { ownerType: _ot, ownerCode: _oc, createdBy: _cb, ...changes } = data;
      return contractService.updateContract(contract!.contractCode, changes, idem.get());
    },
    onSuccess: () => {
      idem.renew();
      toast.success(editing ? "Contrat modifié" : "Contrat créé");
      onSaved();
    },
    onError: (e: unknown) => toast.error(apiMessage(e, "Erreur lors de la sauvegarde.")),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const found = validateContract(values, parties);
    setErrors(found);
    if (Object.keys(found).length === 0) save.mutate();
  };

  return (
    <form onSubmit={submit} className="space-y-4 rounded-[1.75rem] bg-gray-50 p-3 ring-2 ring-[color:color-mix(in_srgb,var(--logo-pink)_30%,white)] sm:p-4">
      <div className="px-2 pt-1">
        <h3 className="text-lg font-bold text-gray-950">
          {editing ? "Modifier le contrat" : "Nouveau contrat"}
        </h3>
        {editing && <p className="font-mono text-xs text-gray-500">{contract!.contractCode}</p>}
      </div>
      <ContractForm
        values={values}
        onChange={(patch) => setValues((v) => ({ ...v, ...patch }))}
        parties={parties}
        onPartiesChange={setParties}
        templates={templates}
        templatesLoading={templatesLoading}
        errors={errors}
        ownerLocked={editing}
      />
      <div className="flex flex-col-reverse gap-2 px-1 pb-1 sm:flex-row sm:justify-end">
        <ActionButton variant="ghost" onClick={onCancel} disabled={save.isPending}>
          Annuler
        </ActionButton>
        <ActionButton type="submit" pending={save.isPending}>
          {editing ? "Enregistrer" : "Créer le contrat"}
        </ActionButton>
      </div>
    </form>
  );
};
