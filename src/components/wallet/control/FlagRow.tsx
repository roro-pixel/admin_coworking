import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { CheckCircle, Eye } from "lucide-react";
import type { FlagView } from "../../../services/walletControl.service";
import { walletControlService } from "../../../services/walletControl.service";
import { ActionButton, CheckField, Field, ItemRow, StatusChip } from "../../subscription/kit";
import { FIELD_SOFT, formatDateTime } from "../../subscription/kitUtils";
import { toast } from "../../ui/toastStore";
import { FLAG_STATUS, FLAG_TYPE_LABEL, SEVERITY } from "../walletLabels";

/** Une alerte de surveillance, avec sa mise en revue et sa résolution. */
export const FlagRow: React.FC<{ flag: FlagView; showWallet?: boolean }> = ({ flag, showWallet = true }) => {
  const qc = useQueryClient();
  const [mode, setMode] = useState<null | "review" | "resolve">(null);
  const [holdWallet, setHoldWallet] = useState(false);
  const [confirmed, setConfirmed] = useState(true);
  const [resolution, setResolution] = useState("");

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["wallet-flags"] });
    qc.invalidateQueries({ queryKey: ["wallet-control-dashboard"] });
  };
  const close = () => {
    setMode(null);
    setResolution("");
    setHoldWallet(false);
  };

  const reviewMutation = useMutation({
    mutationFn: () => walletControlService.reviewFlag(flag.flagNumber, { holdWallet }),
    onSuccess: () => {
      toast.success(holdWallet ? "Alerte mise en revue" : "Alerte mise en revue");
      close();
      refresh();
    },
    onError: () => toast.error("Mise en revue impossible."),
  });
  const resolveMutation = useMutation({
    mutationFn: () => walletControlService.resolveFlag(flag.flagNumber, { confirmed, resolution: resolution.trim() }),
    onSuccess: () => {
      toast.success(confirmed ? "Alerte confirmée" : "Alerte écartée");
      close();
      refresh();
    },
    onError: () => toast.error("Résolution impossible."),
  });

  const sev = SEVERITY[flag.severity] ?? { label: flag.severity, tone: "neutral" as const };
  const st = FLAG_STATUS[flag.status] ?? { label: flag.status, tone: "neutral" as const };
  const live = flag.status === "OPEN" || flag.status === "UNDER_REVIEW";

  return (
    <ItemRow>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-gray-950">{FLAG_TYPE_LABEL[flag.type] ?? flag.type}</p>
          <p className="mt-0.5 text-xs text-gray-500">
            {showWallet && (
              <Link to={`/wallets/${flag.walletNumber}`} className="font-mono font-semibold text-[color:var(--logo-pink-dark)] hover:underline">
                {flag.walletNumber}
              </Link>
            )}
            {showWallet && " · "}
            {flag.flagNumber} · {formatDateTime(flag.detectedAt)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusChip tone={sev.tone}>{sev.label}</StatusChip>
          <StatusChip tone={st.tone}>{st.label}</StatusChip>
        </div>
      </div>
      {flag.details && <p className="mt-2 text-sm text-gray-600">{flag.details}</p>}
      {flag.resolution && <p className="mt-2 text-xs text-gray-500">Résolution : {flag.resolution}</p>}
      {live && !mode && (
        <div className="mt-3 flex flex-wrap gap-2">
          {flag.status === "OPEN" && (
            <ActionButton variant="ghost" icon={Eye} className="!px-4 !py-2" onClick={() => setMode("review")}>
              Mettre en revue
            </ActionButton>
          )}
          <ActionButton icon={CheckCircle} className="!px-4 !py-2" onClick={() => setMode("resolve")}>
            Résoudre
          </ActionButton>
        </div>
      )}
      {mode === "review" && (
        <div className="mt-3 space-y-3 rounded-2xl bg-gray-50 p-3">
          <CheckField checked={holdWallet} onChange={setHoldWallet} label="Demander aussi la suspension du portefeuille" />
          <div className="flex gap-2">
            <ActionButton variant="ghost" onClick={close}>
              Annuler
            </ActionButton>
            <ActionButton pending={reviewMutation.isPending} onClick={() => reviewMutation.mutate()}>
              Valider
            </ActionButton>
          </div>
        </div>
      )}
      {mode === "resolve" && (
        <div className="mt-3 space-y-3 rounded-2xl bg-gray-50 p-3">
          <CheckField checked={confirmed} onChange={setConfirmed} label="Alerte fondée (décochez pour l'écarter)" />
          <Field label="Résolution" required>
            <input className={`${FIELD_SOFT} !bg-white`} value={resolution} onChange={(e) => setResolution(e.target.value)} />
          </Field>
          <div className="flex gap-2">
            <ActionButton variant="ghost" onClick={close}>
              Annuler
            </ActionButton>
            <ActionButton pending={resolveMutation.isPending} disabled={!resolution.trim()} onClick={() => resolveMutation.mutate()}>
              Valider
            </ActionButton>
          </div>
        </div>
      )}
    </ItemRow>
  );
};
