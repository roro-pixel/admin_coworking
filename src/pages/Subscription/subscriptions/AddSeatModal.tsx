import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Loader2 } from "lucide-react";
import { subscriptionService } from "../../../services/subscription.service";
import type { MemberSummaryResponse } from "../../../services/member.service";
import { MemberAutocomplete } from "../../../components/members/MemberAutocomplete";
import { ModalPortal } from "../../../components/ui/ModalPortal";

interface AddSeatModalProps {
  isOpen: boolean;
  onClose: () => void;
  subscriptionNumber: string;
  onSuccess: () => void;
}

const roles = [
  { value: "MEMBER", label: "Membre" },
  { value: "ADMIN", label: "Administrateur" },
  { value: "GUEST", label: "Invité" },
];

export const AddSeatModal: React.FC<AddSeatModalProps> = ({
  isOpen,
  onClose,
  subscriptionNumber,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const [selectedMember, setSelectedMember] =
    useState<MemberSummaryResponse | null>(null);
  const [memberCode, setMemberCode] = useState("");
  const [role, setRole] = useState<"OWNER" | "ADMIN" | "MEMBER" | "GUEST">(
    "MEMBER",
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedMember(null);
      setMemberCode("");
      setRole("MEMBER");
      setErrorMessage(null);
    }
  }, [isOpen]);

  const addMutation = useMutation({
    mutationFn: () =>
      subscriptionService.addSeat(subscriptionNumber, { memberCode, role }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["subscription-seats", subscriptionNumber],
      });
      onSuccess();
    },
    onError: (error: any) => {
      setErrorMessage(
        error?.response?.data?.message ?? "Erreur lors de l'ajout du siège.",
      );
    },
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

  if (!isOpen) return null;

  return (
    <ModalPortal onClose={onClose}>
      <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center rounded-t-2xl">
        <h3 className="text-xl font-bold">Ajouter un siège</h3>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
          <X size={20} />
        </button>
      </div>
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {errorMessage && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
            {errorMessage}
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Membre *
          </label>
          <MemberAutocomplete
            selectedMember={selectedMember}
            onSelect={(m) => {
              setSelectedMember(m);
              setMemberCode(m?.memberId ?? "");
            }}
            placeholder="Rechercher un membre..."
          />
          {memberCode && (
            <p className="text-xs text-gray-400 mt-1 font-mono">
              Code : {memberCode}
            </p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Rôle *
          </label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as typeof role)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg"
          >
            {roles.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-3 pt-4 border-t">
          <button
            type="button"
            onClick={onClose}
            disabled={addMutation.isPending}
            className="flex-1 px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={addMutation.isPending || !memberCode}
            className="flex-1 bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {addMutation.isPending ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Ajout...
              </>
            ) : (
              "Ajouter"
            )}
          </button>
        </div>
      </form>
    </ModalPortal>
  );
};
