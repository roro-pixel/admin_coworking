import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { subscriptionService } from "../../../services/subscription.service";
import type { MemberSummaryResponse } from "../../../services/member.service";
import { MemberAutocomplete } from "../../../components/members/MemberAutocomplete";
import { toast } from "../../../components/ui/toastStore";
import { Field, PanelForm } from "../../../components/subscription/kit";
import { FIELD_SOFT, apiMessage } from "../../../components/subscription/kitUtils";

interface Props {
  subscriptionNumber: string;
  onDone: () => void;
  onCancel: () => void;
}

const roles = [
  { value: "MEMBER", label: "Membre" },
  { value: "ADMIN", label: "Administrateur" },
  { value: "GUEST", label: "Invité" },
];

/** Remplace AddSeatModal : formulaire déplié dans l'onglet Sièges. */
export const AddSeatPanel: React.FC<Props> = ({ subscriptionNumber, onDone, onCancel }) => {
  const queryClient = useQueryClient();
  const [selectedMember, setSelectedMember] = useState<MemberSummaryResponse | null>(null);
  const [memberCode, setMemberCode] = useState("");
  const [role, setRole] = useState<"OWNER" | "ADMIN" | "MEMBER" | "GUEST">("MEMBER");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const addMutation = useMutation({
    mutationFn: () => subscriptionService.addSeat(subscriptionNumber, { memberCode, role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription-seats", subscriptionNumber] });
      toast.success("Siège ajouté");
      onDone();
    },
    onError: (error: unknown) =>
      setErrorMessage(apiMessage(error, "Erreur lors de l'ajout du siège.")),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberCode) {
      setErrorMessage("Veuillez sélectionner un membre.");
      return;
    }
    setErrorMessage(null);
    addMutation.mutate();
  };

  return (
    <PanelForm
      title="Ajouter un siège"
      onSubmit={handleSubmit}
      onCancel={onCancel}
      pending={addMutation.isPending}
      submitLabel="Ajouter"
      submitDisabled={!memberCode}
      error={errorMessage}
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <span className="mb-1.5 block text-xs font-semibold text-gray-600">
            Membre<span className="text-[color:var(--logo-pink-dark)]"> *</span>
          </span>
          <MemberAutocomplete
            selectedMember={selectedMember}
            onSelect={(m) => {
              setSelectedMember(m);
              setMemberCode(m?.memberId ?? "");
            }}
            placeholder="Rechercher un membre..."
          />
          {memberCode && <p className="mt-1 font-mono text-xs text-gray-400">Code : {memberCode}</p>}
        </div>
        <Field label="Rôle" required>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as typeof role)}
            className={FIELD_SOFT}
          >
            {roles.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </Field>
      </div>
    </PanelForm>
  );
};
