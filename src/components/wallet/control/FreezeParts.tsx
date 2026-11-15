import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Snowflake, Unlock } from "lucide-react";
import type { FreezeView } from "../../../services/walletControl.service";
import { walletControlService } from "../../../services/walletControl.service";
import { ActionButton, Field, ItemRow, PanelForm } from "../../subscription/kit";
import { FIELD_SOFT, apiMessage } from "../../subscription/kitUtils";
import { toast } from "../../ui/toastStore";
import { OpenFields } from "./OpenFields";
import { extraEntries, todayIso } from "./controlUtils";

const refreshAll = (qc: ReturnType<typeof useQueryClient>) => {
  qc.invalidateQueries({ queryKey: ["wallet-freezes"] });
  qc.invalidateQueries({ queryKey: ["wallet-compliance-dashboard"] });
  qc.invalidateQueries({ queryKey: ["wallet"] });
  qc.invalidateQueries({ queryKey: ["wallets"] });
};

/** Gel sur instruction d'une autorité. Le portefeuille est fixe dans sa fiche, à saisir ailleurs. */
export const FreezeForm: React.FC<{ walletNumber?: string; onClose: () => void }> = ({ walletNumber, onClose }) => {
  const qc = useQueryClient();
  const [wallet, setWallet] = useState(walletNumber ?? "");
  const [authority, setAuthority] = useState("");
  const [instructionReference, setReference] = useState("");
  const [instructionDate, setDate] = useState(todayIso());
  const [rationale, setRationale] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      walletControlService.freezeWallet(wallet.trim(), {
        authority: authority.trim(),
        instructionReference: instructionReference.trim(),
        instructionDate,
        rationale: rationale.trim(),
      }),
    onSuccess: () => {
      toast.success("Portefeuille gelé");
      refreshAll(qc);
      onClose();
    },
    onError: (e) => setError(apiMessage(e, "Gel impossible.")),
  });

  return (
    <PanelForm
      title="Geler sur instruction"
      pending={mutation.isPending}
      submitLabel="Geler le portefeuille"
      submitDisabled={!wallet.trim() || !authority.trim() || !instructionReference.trim() || !instructionDate || !rationale.trim()}
      error={error}
      onCancel={onClose}
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        mutation.mutate();
      }}
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {!walletNumber && (
          <Field label="N° de portefeuille" required className="md:col-span-2">
            <input className={`${FIELD_SOFT} font-mono`} value={wallet} onChange={(e) => setWallet(e.target.value)} />
          </Field>
        )}
        <Field label="Autorité" required>
          <input className={FIELD_SOFT} value={authority} onChange={(e) => setAuthority(e.target.value)} />
        </Field>
        <Field label="Référence de l'instruction" required>
          <input className={`${FIELD_SOFT} font-mono`} value={instructionReference} onChange={(e) => setReference(e.target.value)} />
        </Field>
        <Field label="Date de l'instruction" required>
          <input type="date" className={FIELD_SOFT} value={instructionDate} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Justification" required className="md:col-span-2">
          <textarea className={`${FIELD_SOFT} resize-none`} rows={2} value={rationale} onChange={(e) => setRationale(e.target.value)} />
        </Field>
      </div>
    </PanelForm>
  );
};

const lifted = (f: FreezeView) => !!f.liftedAt || (typeof f.status === "string" && f.status.toUpperCase().startsWith("LIFT"));

/** Un gel sur instruction, avec sa levée. */
export const FreezeRow: React.FC<{ freeze: FreezeView; showWallet?: boolean }> = ({ freeze, showWallet = true }) => {
  const qc = useQueryClient();
  const [lifting, setLifting] = useState(false);
  const [liftReference, setLiftReference] = useState("");
  const [liftRationale, setLiftRationale] = useState("");

  const mutation = useMutation({
    mutationFn: () => walletControlService.liftFreeze(freeze.freezeNumber, { liftReference: liftReference.trim(), liftRationale: liftRationale.trim() }),
    onSuccess: () => {
      setLifting(false);
      refreshAll(qc);
    },
  });
  const askLift = () =>
    toast.confirm({
      message: `Lever le gel ${freeze.freezeNumber} ?`,
      detail: "Le portefeuille redevient utilisable. La levée est tracée avec sa référence.",
      confirmLabel: "Lever le gel",
      pendingLabel: "Levée",
      successMessage: "Gel levé",
      errorMessage: "Levée refusée ou impossible",
      onConfirm: () => mutation.mutateAsync(),
    });

  return (
    <ItemRow>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-2 font-mono text-sm font-bold text-gray-950">
            <Snowflake size={14} className="text-sky-600" />
            {freeze.freezeNumber}
          </p>
          {showWallet && freeze.walletNumber && (
            <p className="mt-0.5 text-xs">
              <Link to={`/wallets/${freeze.walletNumber}`} className="font-mono font-semibold text-[color:var(--logo-pink-dark)] hover:underline">
                {freeze.walletNumber}
              </Link>
            </p>
          )}
        </div>
        {!lifted(freeze) && !lifting && (
          <ActionButton variant="ghost" icon={Unlock} className="!px-4 !py-2" onClick={() => setLifting(true)}>
            Lever le gel
          </ActionButton>
        )}
      </div>
      <OpenFields entries={extraEntries(freeze, ["freezeNumber", "walletNumber"])} className="mt-2" />
      {lifting && (
        <div className="mt-3 grid grid-cols-1 gap-3 rounded-2xl bg-gray-50 p-3 sm:grid-cols-2">
          <Field label="Référence de la levée" required>
            <input className={`${FIELD_SOFT} !bg-white font-mono`} value={liftReference} onChange={(e) => setLiftReference(e.target.value)} />
          </Field>
          <Field label="Justification" required>
            <input className={`${FIELD_SOFT} !bg-white`} value={liftRationale} onChange={(e) => setLiftRationale(e.target.value)} />
          </Field>
          <div className="flex gap-2 sm:col-span-2">
            <ActionButton variant="ghost" onClick={() => setLifting(false)}>
              Annuler
            </ActionButton>
            <ActionButton disabled={!liftReference.trim() || !liftRationale.trim()} onClick={askLift}>
              Lever le gel
            </ActionButton>
          </div>
        </div>
      )}
    </ItemRow>
  );
};
