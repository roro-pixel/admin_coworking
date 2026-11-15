import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BellRing, Upload, UserMinus, UserPlus, Users } from "lucide-react";
import { pricingService } from "../../../services/pricing.service";
import type { BeneficiaryImportReport, PromotionBeneficiaryInput, PromotionBeneficiaryUsage } from "../../../services/pricing.service";
import { ActionButton, EmptyState, ErrorBlock, Field, IconButton, ItemRow, Pagination, PanelForm, Section } from "../kit";
import { FIELD_SOFT, apiMessage } from "../kitUtils";
import { Skeleton } from "../../ui/Skeleton";
import { toast } from "../../ui/toastStore";
import { SubscriberPicker } from "./SubscriberPicker";
import type { SubscriberRef } from "./SubscriberPicker";
import { OpenReport } from "./OpenReport";
import { SUBSCRIBER_TYPE_OPTIONS, formatOpenValue, humanKey } from "./promoLabels";

const PAGE_SIZE = 10;

type Panel = null | "add" | "import";
type RowMode = { index: number; kind: "remove" | "notify" } | null;

const SUBSCRIBER_TYPES = new Set(SUBSCRIBER_TYPE_OPTIONS.map((o) => o.value));


/** Une ligne « TYPE,CODE » par bénéficiaire ; renvoie les lignes invalides à part. */
const parseLines = (text: string): { ok: PromotionBeneficiaryInput[]; bad: string[] } => {
  const ok: PromotionBeneficiaryInput[] = [];
  const bad: string[] = [];
  text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean)
    .forEach((line) => {
      const [type, code] = line.split(/[,;\t]/).map((p) => p.trim());
      if (type && code && SUBSCRIBER_TYPES.has(type.toUpperCase())) ok.push({ subscriberType: type.toUpperCase(), subscriberCode: code });
      else bad.push(line);
    });
  return { ok, bad };
};

/** Bénéficiaires nominatifs d'une promotion : ajout, import, retrait, notification et utilisation. */
export const BeneficiariesPanel: React.FC<{ promotionCode: string }> = ({ promotionCode }) => {
  const qc = useQueryClient();
  const [panel, setPanel] = useState<Panel>(null);
  const [page, setPage] = useState(0);
  const [rowMode, setRowMode] = useState<RowMode>(null);
  const [rowText, setRowText] = useState("");

  const [addSubscriber, setAddSubscriber] = useState<SubscriberRef>({ type: "MEMBER", code: "" });
  const [addReason, setAddReason] = useState("");
  const [importText, setImportText] = useState("");
  const [importReason, setImportReason] = useState("");
  const [report, setReport] = useState<BeneficiaryImportReport | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["promotion-beneficiaries", promotionCode],
    queryFn: () => pricingService.getPromotionBeneficiaryUsage(promotionCode),
  });
  const rows: PromotionBeneficiaryUsage[] = data ?? [];
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const start = page * PAGE_SIZE;
  const visible = rows.slice(start, start + PAGE_SIZE);

  const refresh = () => qc.invalidateQueries({ queryKey: ["promotion-beneficiaries", promotionCode] });

  const addMutation = useMutation({
    mutationFn: () =>
      pricingService.addPromotionBeneficiary(promotionCode, {
        subscriberType: addSubscriber.type,
        subscriberCode: addSubscriber.code,
        reason: addReason.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success("Bénéficiaire ajouté");
      setAddSubscriber({ type: addSubscriber.type, code: "" });
      setAddReason("");
      setPanel(null);
      refresh();
    },
    onError: (e) => toast.error(apiMessage(e, "Ajout impossible.")),
  });

  const parsed = parseLines(importText);
  const importMutation = useMutation({
    mutationFn: () => pricingService.importPromotionBeneficiaries(promotionCode, { beneficiaries: parsed.ok, reason: importReason.trim() || undefined }),
    onSuccess: (r) => {
      toast.success("Import terminé");
      setReport(r);
      setImportText("");
      setImportReason("");
      setPanel(null);
      refresh();
    },
    onError: (e) => toast.error(apiMessage(e, "Import impossible.")),
  });

  const removeMutation = useMutation({
    mutationFn: (ref: PromotionBeneficiaryInput) => pricingService.removePromotionBeneficiary(promotionCode, { ...ref, reason: rowText.trim() || undefined }),
    onSuccess: () => {
      setRowMode(null);
      setRowText("");
      refresh();
    },
  });

  const notifyMutation = useMutation({
    mutationFn: (ref: PromotionBeneficiaryInput) => pricingService.markPromotionBeneficiaryNotified(promotionCode, { ...ref, channel: rowText.trim() }),
    onSuccess: () => {
      toast.success("Bénéficiaire marqué comme prévenu");
      setRowMode(null);
      setRowText("");
      refresh();
    },
    onError: (e) => toast.error(apiMessage(e, "Mise à jour impossible.")),
  });

  const askRemove = (ref: PromotionBeneficiaryInput) =>
    toast.confirm({
      message: `Retirer ${ref.subscriberCode} de cette promotion ?`,
      detail: "Il ne pourra plus en bénéficier.",
      confirmLabel: "Retirer",
      pendingLabel: "Retrait",
      successMessage: "Bénéficiaire retiré",
      errorMessage: "Retrait refusé ou impossible",
      onConfirm: () => removeMutation.mutateAsync(ref),
    });

  return (
    <Section
      title="Bénéficiaires nominatifs"
      description="Abonnés à qui cette promotion est accordée nommément"
      icon={Users}
    >
      {panel === null && (
        <div className="mb-4 flex flex-wrap justify-end gap-2">
          <ActionButton variant="ghost" icon={Upload} className="!px-4 !py-2" onClick={() => setPanel("import")}>
            Importer
          </ActionButton>
          <ActionButton variant="ghost" icon={UserPlus} className="!px-4 !py-2" onClick={() => setPanel("add")}>
            Ajouter
          </ActionButton>
        </div>
      )}
      {report && <div className="mb-4"><OpenReport title="Rapport d'import" data={report} onClose={() => setReport(null)} /></div>}

      {panel === "add" && (
        <PanelForm
          title="Ajouter un bénéficiaire"
          pending={addMutation.isPending}
          submitLabel="Ajouter"
          submitDisabled={!addSubscriber.code}
          onCancel={() => setPanel(null)}
          onSubmit={(e) => {
            e.preventDefault();
            addMutation.mutate();
          }}
        >
          <SubscriberPicker value={addSubscriber} onChange={setAddSubscriber} />
          <Field label="Motif">
            <input className={FIELD_SOFT} value={addReason} onChange={(e) => setAddReason(e.target.value)} />
          </Field>
        </PanelForm>
      )}

      {panel === "import" && (
        <PanelForm
          title="Importer des bénéficiaires"
          pending={importMutation.isPending}
          submitLabel={`Importer ${parsed.ok.length} bénéficiaire${parsed.ok.length > 1 ? "s" : ""}`}
          submitDisabled={parsed.ok.length === 0 || parsed.bad.length > 0}
          onCancel={() => setPanel(null)}
          onSubmit={(e) => {
            e.preventDefault();
            importMutation.mutate();
          }}
        >
          <Field label="Bénéficiaires" required hint="Une ligne par bénéficiaire : type puis code, séparés par une virgule (MEMBER,MBR-000012).">
            <textarea className={`${FIELD_SOFT} resize-none font-mono`} rows={6} value={importText} onChange={(e) => setImportText(e.target.value)} placeholder={"MEMBER,MBR-000012\nCUSTOMER,CUS-0100"} />
          </Field>
          {parsed.bad.length > 0 && (
            <p className="text-sm text-red-600">
              {parsed.bad.length} ligne{parsed.bad.length > 1 ? "s" : ""} invalide{parsed.bad.length > 1 ? "s" : ""} (type MEMBER, CUSTOMER ou BUSINESS_ENTITY, puis un code) : {parsed.bad.slice(0, 3).join(" | ")}
              {parsed.bad.length > 3 ? " ..." : ""}
            </p>
          )}
          <Field label="Motif">
            <input className={FIELD_SOFT} value={importReason} onChange={(e) => setImportReason(e.target.value)} />
          </Field>
        </PanelForm>
      )}

      {isLoading ? (
        <Skeleton className="h-16 w-full rounded-2xl" />
      ) : isError ? (
        <ErrorBlock message="Impossible de charger les bénéficiaires." onRetry={() => refetch()} />
      ) : rows.length === 0 ? (
        panel === null && <EmptyState icon={Users} title="Aucun bénéficiaire nominatif" hint="Ajoutez des abonnés un par un ou par import." />
      ) : (
        <>
          <div className="space-y-2">
            {visible.map((row, i) => {
              const index = start + i;
              const type = typeof row.subscriberType === "string" ? row.subscriberType : undefined;
              const code = typeof row.subscriberCode === "string" ? row.subscriberCode : undefined;
              const ref = type && code ? { subscriberType: type, subscriberCode: code } : null;
              const mode = rowMode?.index === index ? rowMode.kind : null;
              const rest = Object.entries(row).filter(([k]) => k !== "subscriberType" && k !== "subscriberCode");
              return (
                <ItemRow key={index}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-mono text-sm font-bold text-gray-950">{code ?? `Bénéficiaire ${index + 1}`}</p>
                      {type && <p className="text-xs text-gray-400">{SUBSCRIBER_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type}</p>}
                    </div>
                    {ref && !mode && (
                      <div className="flex gap-1">
                        <IconButton
                          icon={BellRing}
                          label="Marquer comme prévenu"
                          onClick={() => {
                            setRowMode({ index, kind: "notify" });
                            setRowText("");
                          }}
                        />
                        <IconButton
                          icon={UserMinus}
                          tone="danger"
                          label="Retirer"
                          onClick={() => {
                            setRowMode({ index, kind: "remove" });
                            setRowText("");
                          }}
                        />
                      </div>
                    )}
                  </div>
                  {rest.length > 0 && (
                    <dl className="mt-2 grid grid-cols-1 gap-x-8 gap-y-1 text-xs sm:grid-cols-2">
                      {rest.map(([k, v]) => (
                        <div key={k} className="flex items-baseline justify-between gap-3">
                          <dt className="capitalize text-gray-400">{humanKey(k)}</dt>
                          <dd className="break-all text-right font-semibold text-gray-700">{formatOpenValue(v)}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                  {ref && mode && (
                    <div className="mt-3 grid grid-cols-1 gap-3 rounded-2xl bg-gray-50 p-3 sm:grid-cols-[1fr_auto]">
                      <Field label={mode === "notify" ? "Canal utilisé pour le prévenir" : "Motif du retrait"} required={mode === "notify"}>
                        <input className={`${FIELD_SOFT} !bg-white`} value={rowText} onChange={(e) => setRowText(e.target.value)} placeholder={mode === "notify" ? "EMAIL" : undefined} />
                      </Field>
                      <div className="flex items-end gap-2">
                        <ActionButton variant="ghost" onClick={() => setRowMode(null)}>
                          Annuler
                        </ActionButton>
                        {mode === "notify" ? (
                          <ActionButton pending={notifyMutation.isPending} disabled={!rowText.trim()} onClick={() => notifyMutation.mutate(ref)}>
                            Valider
                          </ActionButton>
                        ) : (
                          <ActionButton variant="danger" onClick={() => askRemove(ref)}>
                            Retirer
                          </ActionButton>
                        )}
                      </div>
                    </div>
                  )}
                </ItemRow>
              );
            })}
          </div>
          <Pagination page={page} totalPages={totalPages} total={rows.length} noun="bénéficiaire" onChange={setPage} />
        </>
      )}
    </Section>
  );
};
