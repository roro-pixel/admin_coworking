import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, Handshake, Undo2 } from "lucide-react";
import { subscriptionDerivationService } from "../../../services/subscriptionDerivation.service";
import type { DerivationPreview } from "../../../services/subscriptionDerivation.service";
import { ActionButton, EmptyState, ErrorBlock, Field, ItemRow, PanelForm, Section, StatusChip, Tag } from "../kit";
import { FIELD_SOFT, apiMessage, formatDate } from "../kitUtils";
import { Skeleton } from "../../ui/Skeleton";
import { toast } from "../../ui/toastStore";
import { statusOf } from "../labels";
import { DERIVATION_REASONS, DERIVATION_STATUS } from "./lifecycleLabels";
import { DerivationPreviewCard } from "./DerivationPreviewCard";
import { DerivationSpecForm, buildSpec, emptySpecState, specIsValid } from "./DerivationSpecForm";
import type { DerivationSpecState } from "./DerivationSpecForm";

type Panel = "create" | "revert" | null;

/**
 * Prix négocié d'un abonnement : historique des dérivations, nouvelle dérivation
 * (toujours simulée avant création), retour au catalogue.
 */
export const DerivationPanel: React.FC<{ subscriptionNumber: string; currency?: string; onChanged?: () => void }> = ({
  subscriptionNumber,
  currency = "FCFA",
  onChanged,
}) => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [panel, setPanel] = useState<Panel>(null);
  const [spec, setSpec] = useState<DerivationSpecState>(emptySpecState());
  const [preview, setPreview] = useState<DerivationPreview | null>(null);
  const [reason, setReason] = useState("");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["sub-lifecycle", subscriptionNumber, "derivations"],
    queryFn: () => subscriptionDerivationService.getHistory(subscriptionNumber),
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["sub-lifecycle", subscriptionNumber] });
    qc.invalidateQueries({ queryKey: ["derivations"] });
    onChanged?.();
  };

  const simulate = useMutation({
    mutationFn: () => subscriptionDerivationService.simulate(subscriptionNumber, buildSpec(spec)),
    onSuccess: setPreview,
    onError: (e) => {
      setPreview(null);
      toast.error(apiMessage(e, "Simulation impossible."));
    },
  });

  const create = useMutation({
    mutationFn: () => subscriptionDerivationService.create(subscriptionNumber, buildSpec(spec)),
    onSuccess: (d) => {
      toast.success(d.status === "PENDING_APPROVAL" ? "Dérivation créée, en attente d'un second visa" : "Dérivation appliquée");
      setPanel(null);
      setPreview(null);
      setSpec(emptySpecState());
      refresh();
    },
    onError: (e) => toast.error(apiMessage(e, "Création impossible.")),
  });

  const revert = useMutation({
    mutationFn: () => subscriptionDerivationService.revert(subscriptionNumber, reason.trim()),
    onSuccess: () => {
      toast.success("Retour au prix du catalogue");
      setPanel(null);
      setReason("");
      refresh();
    },
    onError: (e) => toast.error(apiMessage(e, "Retour impossible.")),
  });

  const hasActive = (data ?? []).some((d) => d.status === "ACTIVE");
  const changeSpec = (v: DerivationSpecState) => {
    setSpec(v);
    setPreview(null);
  };

  return (
    <Section
      title="Prix négocié"
      description="Prix, droits et avantages propres à cet abonnement"
      icon={Handshake}
      action={
        panel === null && (
          <div className="flex gap-2">
            {hasActive && (
              <ActionButton variant="ghost" icon={Undo2} onClick={() => { setReason(""); setPanel("revert"); }}>
                Revenir au catalogue
              </ActionButton>
            )}
            <ActionButton variant="ghost" onClick={() => setPanel("create")}>
              {hasActive ? "Nouvelle dérivation" : "Négocier un prix"}
            </ActionButton>
          </div>
        )
      }
    >
      {panel === "create" && (
        <PanelForm
          title="Nouvelle dérivation"
          pending={create.isPending}
          submitLabel="Créer la dérivation"
          submitDisabled={!preview || !!preview.blockingReason}
          onCancel={() => {
            setPanel(null);
            setPreview(null);
          }}
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate();
          }}
        >
          <DerivationSpecForm value={spec} onChange={changeSpec} currency={currency} />
          <div>
            <ActionButton variant="ghost" onClick={() => simulate.mutate()} pending={simulate.isPending} disabled={!specIsValid(spec)}>
              Simuler
            </ActionButton>
            <p className="mt-1.5 text-xs text-gray-400">La simulation est obligatoire : elle ne crée rien et montre ce qui change.</p>
          </div>
          {preview && <DerivationPreviewCard preview={preview} />}
        </PanelForm>
      )}

      {panel === "revert" && (
        <PanelForm
          title="Revenir au prix du catalogue"
          pending={revert.isPending}
          submitLabel="Revenir au catalogue"
          submitDisabled={!reason.trim()}
          onCancel={() => setPanel(null)}
          onSubmit={(e) => {
            e.preventDefault();
            revert.mutate();
          }}
        >
          <p className="-mt-2 text-sm text-gray-500">La dérivation en cours devient expirée et l'abonnement reprend la version courante du plan.</p>
          <Field label="Motif" required>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className={`${FIELD_SOFT} resize-none`} />
          </Field>
        </PanelForm>
      )}

      {isLoading ? (
        <Skeleton className="h-16 w-full rounded-2xl" />
      ) : isError ? (
        <ErrorBlock message="Impossible de charger les dérivations." onRetry={() => refetch()} />
      ) : (data ?? []).length === 0 ? (
        panel === null && <EmptyState icon={Handshake} title="Aucun prix négocié" hint="Cet abonnement suit le prix du catalogue." />
      ) : (
        <div className="space-y-2">
          {data!.map((d) => {
            const st = statusOf(DERIVATION_STATUS, d.status);
            const reasonLabel = DERIVATION_REASONS.find((r) => r.value === d.reason)?.label ?? d.reason;
            return (
              <ItemRow key={d.derivationCode}>
                <button
                  type="button"
                  onClick={() => navigate(`/subscriptions/derivations/${d.derivationCode}`)}
                  className="flex w-full items-center justify-between gap-3 rounded-xl text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--logo-pink)]"
                >
                  <div className="min-w-0">
                    <p className="font-mono text-sm font-semibold text-gray-900">{d.derivationCode}</p>
                    <p className="text-xs text-gray-400">
                      {d.effectiveFrom ? `Depuis le ${formatDate(d.effectiveFrom)}` : "Dès la création"}
                      {d.effectiveTo ? ` · jusqu'au ${formatDate(d.effectiveTo)}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {reasonLabel && <Tag>{reasonLabel}</Tag>}
                    <StatusChip tone={st.tone}>{st.label}</StatusChip>
                    <ChevronRight size={16} className="text-gray-400" />
                  </div>
                </button>
              </ItemRow>
            );
          })}
        </div>
      )}
    </Section>
  );
};
