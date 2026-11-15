import { useMutation, useQueryClient } from "@tanstack/react-query";
import { contractService } from "../../services/contract.service";
import { apiMessage } from "../subscription/kitUtils";
import { toast } from "../ui/toastStore";
import { ERROR_MESSAGE, SUCCESS_MESSAGE } from "./contractLabels";
import type { ContractActionKey } from "./contractLabels";
import { useActorId } from "./contractUtils";

export type RunnableAction = Exclude<ContractActionKey, "attach_signed">;
interface Vars {
  action: RunnableAction;
  code: string;
  reason?: string;
}

/** Actions de cycle de vie d'un contrat, partagées par la liste et la fiche. Motifs et commentaires partent en paramètres de requête, comme l'attend le serveur. */
export const useContractActions = (onDone?: (v: Vars) => void) => {
  const qc = useQueryClient();
  const actor = useActorId();

  const m = useMutation({
    mutationFn: ({ action, code, reason }: Vars) => {
      switch (action) {
        case "generate":
          return contractService.generateDraft(code, actor);
        case "under_review":
          return contractService.updateContractStatus(code, "UNDER_REVIEW");
        case "awaiting_signature":
          return contractService.updateContractStatus(code, "AWAITING_SIGNATURE");
        case "activate":
          return contractService.activateContract(code);
        case "suspend":
          return contractService.suspendContract(code, reason);
        case "terminate":
          return contractService.terminateContract(code, reason);
        case "cancel":
          return contractService.cancelContract(code, reason || undefined);
        case "approve_review":
          return contractService.approveReview(code, actor, reason || undefined);
        case "reject_review":
          return contractService.rejectReview(code, actor, reason || undefined);
      }
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["contracts"] });
      qc.invalidateQueries({ queryKey: ["contract", v.code] });
      toast.success(SUCCESS_MESSAGE[v.action]);
      onDone?.(v);
    },
    onError: (e, v) => toast.error(apiMessage(e, ERROR_MESSAGE[v.action])),
  });

  const remove = useMutation({
    mutationFn: (code: string) => contractService.deleteContract(code),
    onSuccess: (_d, code) => {
      qc.invalidateQueries({ queryKey: ["contracts"] });
      qc.removeQueries({ queryKey: ["contract", code] });
    },
  });

  return {
    run: m.mutate,
    runAsync: m.mutateAsync,
    pending: m.isPending,
    /** Cette action précise est-elle en cours sur ce contrat ? */
    isRunning: (code: string, action: RunnableAction) =>
      m.isPending && m.variables?.code === code && m.variables?.action === action,
    remove,
  };
};
