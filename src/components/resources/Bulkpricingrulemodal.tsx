import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Copy, Eye, RotateCcw } from "lucide-react";
import { resourceService } from "../../services/resource.service";
import type { BulkOperationResult, PricingRuleBulkPreviewResponse, ResourceSummaryResponse } from "../../services/resource.service";
import { ActionButton, Field, PanelForm } from "../subscription/kit";
import { apiMessage, formatMoney } from "../subscription/kitUtils";
import { toast } from "../ui/toastStore";
import { ResourceMultiPicker } from "./Resourcemultipicker";
import { PRICING_DEFAULTS, PricingFields, pricingError, pricingPayload } from "./PricingFields";
import type { PricingForm } from "./PricingFields";

interface BulkPricingRuleModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Step = "form" | "preview" | "result";

/**
 * Pose la même grille tarifaire sur plusieurs ressources (POST /resource-pricing-rules/bulk),
 * avec une prévisualisation obligatoire avant l'envoi (n'écrit rien).
 * Un chevauchement n'est pas une erreur: seul `wins: true` sur une règle existante mérite
 * un avertissement franc, car la règle proposée ne serait jamais appliquée sur cette plage.
 * Affiché comme un panneau intégré à la page, pas comme une fenêtre.
 */
export const BulkPricingRuleModal: React.FC<BulkPricingRuleModalProps> = ({ isOpen, onClose }) => {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>("form");
  const [resources, setResources] = useState<ResourceSummaryResponse[]>([]);
  const [form, setForm] = useState<PricingForm>({ ...PRICING_DEFAULTS });
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PricingRuleBulkPreviewResponse | null>(null);
  const [result, setResult] = useState<BulkOperationResult | null>(null);

  const close = () => {
    setStep("form");
    setResources([]);
    setForm({ ...PRICING_DEFAULTS });
    setError(null);
    setPreview(null);
    setResult(null);
    onClose();
  };

  const payload = () => ({ resourceCodes: resources.map((r) => r.code), ...pricingPayload(form, "create", false) });

  const previewMutation = useMutation({
    mutationFn: () => resourceService.previewPricingRulesBulk(payload() as never),
    onSuccess: (data) => {
      setPreview(data);
      setStep("preview");
      setError(null);
    },
    onError: (e: any) => {
      // Un code inconnu fait échouer toute la prévisualisation en 404, contrairement à la création
      setError(e?.response?.status === 404 ? "Une des ressources choisies est introuvable. Vérifiez la sélection." : apiMessage(e, "Prévisualisation impossible"));
    },
  });
  const submitMutation = useMutation({
    mutationFn: () => resourceService.createPricingRulesBulk(payload() as never),
    onSuccess: async (data) => {
      setResult(data);
      setStep("result");
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ["resource-pricing-rules"] });
      toast.success(`${data.processed} règle${data.processed > 1 ? "s" : ""} posée${data.processed > 1 ? "s" : ""}`);
    },
    onError: (e) => setError(apiMessage(e, "Pose de la grille impossible")),
  });

  const retrySkipped = () => {
    if (!result) return;
    const skipped = new Set(result.results.filter((r) => r.status === "SKIPPED").map((r) => r.resourceCode));
    setResources(resources.filter((r) => skipped.has(r.code)));
    setResult(null);
    setPreview(null);
    setStep("form");
  };

  if (!isOpen) return null;

  if (step === "form") {
    return (
      <PanelForm
        title="Poser une grille tarifaire sur plusieurs ressources"
        onCancel={close}
        pending={previewMutation.isPending}
        submitLabel="Prévisualiser les conflits"
        error={error}
        onSubmit={(e) => {
          e.preventDefault();
          if (resources.length === 0) return setError("Choisissez au moins une ressource.");
          const msg = pricingError(form);
          if (msg) return setError(msg);
          setError(null);
          previewMutation.mutate();
        }}
      >
        <Field label="Ressources" required>
          <ResourceMultiPicker selected={resources} onChange={setResources} />
        </Field>
        <PricingFields value={form} extended={false} onChange={(patch) => setForm((p) => ({ ...p, ...patch }))} />
      </PanelForm>
    );
  }

  const nb = (n: number, one: string, many = `${one}s`) => `${n} ${n > 1 ? many : one}`;

  return (
    <section className="rounded-[1.75rem] border border-gray-100 bg-white p-3 shadow-sm">
      <h3 className="px-3 pb-3 pt-2 text-base font-bold text-gray-950">{step === "preview" ? "Conflits possibles avant la pose" : "Résultat de la pose"}</h3>
      <div className="space-y-4 rounded-2xl bg-gray-50 p-4 sm:p-5">
        {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}

        {step === "preview" && preview && (
          <>
            <p className="text-sm text-gray-700">
              <b>{nb(preview.resourcesInspected, "ressource")}</b> inspectée{preview.resourcesInspected > 1 ? "s" : ""}, <b>{preview.resourcesWithOverlap}</b> avec chevauchement
              {preview.strictDuplicates > 0 && (
                <>
                  , <b className="text-red-700">{nb(preview.strictDuplicates, "doublon")} strict{preview.strictDuplicates > 1 ? "s" : ""}</b>
                </>
              )}
              .
            </p>
            <p className="text-xs text-gray-500">Un chevauchement est normal dans une grille tarifaire, la priorité départage. Seule une règle existante qui l'emporterait sur la vôtre mérite attention.</p>
            <div className="max-h-96 space-y-2 overflow-y-auto">
              {preview.results.map((r) => (
                <div key={r.resourceCode} className="rounded-2xl bg-white p-3.5 shadow-sm">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-mono text-xs text-gray-500">{r.resourceCode}</p>
                    {r.duplicate && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600">
                        <Copy size={12} /> Doublon strict déjà présent
                      </span>
                    )}
                  </div>
                  {r.overlapping.length === 0 ? (
                    <p className="mt-1 text-sm text-emerald-700">Aucun conflit.</p>
                  ) : (
                    <div className="mt-2 space-y-1.5">
                      {r.overlapping.map((o) => (
                        <div key={o.id} className={`flex flex-wrap items-center justify-between gap-2 rounded-xl p-2.5 text-sm ${o.wins ? "bg-red-50 text-red-700" : "bg-gray-50 text-gray-600"}`}>
                          <span>
                            {o.label || "Règle sans libellé"}, {formatMoney(o.price)}, priorité {o.priority}
                          </span>
                          {o.wins && (
                            <span className="inline-flex items-center gap-1 text-xs font-bold">
                              <AlertTriangle size={12} /> L'emporterait sur la vôtre
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <ActionButton variant="ghost" onClick={() => setStep("form")}>Retour</ActionButton>
              <ActionButton icon={Eye} pending={submitMutation.isPending} onClick={() => submitMutation.mutate()}>
                Confirmer sur {nb(resources.length, "ressource")}
              </ActionButton>
            </div>
          </>
        )}

        {step === "result" && result && (
          <>
            <p className="text-sm text-gray-700">
              <b className="text-emerald-700">{nb(result.processed, "règle posée", "règles posées")}</b>
              {result.skipped > 0 && (
                <>
                  , <b className="text-amber-700">{nb(result.skipped, "ressource écartée", "ressources écartées")}</b>
                </>
              )}
              .
            </p>
            <div className="max-h-80 space-y-2 overflow-y-auto">
              {result.results.map((r) => (
                <div key={r.resourceCode} className={`flex items-start gap-3 rounded-2xl p-3 text-sm ${r.status === "PROCESSED" ? "bg-emerald-50" : "bg-amber-50"}`}>
                  {r.status === "PROCESSED" ? <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" /> : <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-600" />}
                  <div>
                    <p className="font-mono text-xs text-gray-500">{r.resourceCode}</p>
                    {r.status === "SKIPPED" && <p className="text-amber-800">{r.reason}</p>}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <ActionButton variant="ghost" onClick={close}>Fermer</ActionButton>
              {result.skipped > 0 && (
                <ActionButton icon={RotateCcw} onClick={retrySkipped}>
                  Relancer sur les {result.skipped} écartées
                </ActionButton>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );
};
