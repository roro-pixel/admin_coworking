import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, Eye, FileText, ListOrdered, Pencil, RotateCcw, Save, Trash2 } from "lucide-react";
import { contractService } from "../../../services/contract.service";
import type { ContractDraftResponse } from "../../../services/contract.service";
import { documentService } from "../../../services/document.service";
import { ActionButton, Detail, ErrorBanner, ErrorBlock, Field, PageHeader, Section, StatusChip } from "../../subscription/kit";
import { FIELD, apiMessage } from "../../subscription/kitUtils";
import { Skeleton } from "../../ui/Skeleton";
import { HtmlFrame } from "../../ui/HtmlFrame";
import { toast } from "../../ui/toastStore";
import { saveBlob } from "../../payment/paymentUtils";
import { DRAFT_STATUS, statusOf } from "../contractLabels";
import { OwnerPicker } from "../OwnerPicker";
import { useActorId } from "../contractUtils";
import { SectionsEditor } from "./SectionsEditor";

export const DraftEditor: React.FC<{ code: string; onBack: () => void }> = ({ code, onBack }) => {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["contract-draft", code],
    queryFn: () => contractService.getDraft(code),
  });

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-4xl space-y-4" role="status" aria-label="Chargement">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-72 w-full rounded-[1.75rem]" />
      </div>
    );
  }
  if (isError || !data) {
    return (
      <div className="mx-auto w-full max-w-4xl">
        <PageHeader title="Rédaction introuvable" onBack={onBack} backLabel="Retour aux rédactions" />
        <ErrorBlock message="Impossible de charger cette rédaction." onRetry={() => refetch()} />
      </div>
    );
  }
  return <Inner draft={data} onBack={onBack} />;
};

const Inner: React.FC<{ draft: ContractDraftResponse; onBack: () => void }> = ({ draft, onBack }) => {
  const qc = useQueryClient();
  const actor = useActorId();
  const code = draft.code;
  const [info, setInfo] = useState({
    title: draft.title ?? "",
    description: draft.description ?? "",
    ownerType: String(draft.ownerType ?? "MEMBER"),
    ownerCode: draft.ownerCode ?? "",
    businessCode: draft.businessCode ?? "",
    cssContent: draft.cssContent ?? "",
    headerHtml: draft.headerHtml ?? "",
    footerHtml: draft.footerHtml ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const st = statusOf(DRAFT_STATUS, draft.status);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["contract-draft", code] });
    qc.invalidateQueries({ queryKey: ["contract-drafts-admin"] });
  };

  const saveInfo = useMutation({
    mutationFn: () =>
      contractService.updateDraft(code, {
        title: info.title.trim(),
        description: info.description || undefined,
        ownerType: info.ownerType as "MEMBER" | "CUSTOMER" | "BUSINESS",
        ownerCode: info.ownerCode || undefined,
        businessCode: info.businessCode || undefined,
        cssContent: info.cssContent || undefined,
        headerHtml: info.headerHtml || undefined,
        footerHtml: info.footerHtml || undefined,
      }),
    onSuccess: (d) => {
      qc.setQueryData(["contract-draft", code], d);
      refresh();
      setError(null);
      toast.success("Rédaction mise à jour");
    },
    onError: (e: unknown) => setError(apiMessage(e, "Erreur lors de la modification de la rédaction.")),
  });

  const setStatus = useMutation({
    mutationFn: (status: string) => contractService.updateDraftStatus(code, status),
    onSuccess: (_d, status) => {
      refresh();
      toast.success(status === "READY" ? "Rédaction marquée prête" : "Rédaction remise en rédaction");
    },
    onError: (e: unknown) => toast.error(apiMessage(e, "Erreur lors du changement de statut.")),
  });

  const previewM = useMutation({
    mutationFn: () => contractService.previewDraft(code),
    onSuccess: (r) => setPreview(r.html),
    onError: (e: unknown) => toast.error(apiMessage(e, "Erreur lors de l'aperçu.")),
  });

  const pdf = useMutation({
    mutationFn: async () => {
      const doc = await contractService.generateDraftPdf(code, actor);
      if (doc?.code) saveBlob(await documentService.downloadDocument(doc.code), `${code}.pdf`);
      else {
        const url = doc?.previewUrl || doc?.downloadUrl || doc?.fileUrl;
        if (url) window.open(url, "_blank");
      }
      return doc;
    },
    onSuccess: (doc) => {
      refresh();
      toast.success(doc?.code ? `PDF généré : ${doc.code}` : "PDF généré");
    },
    onError: (e: unknown) => toast.error(apiMessage(e, "Erreur lors de la génération du PDF.")),
  });

  const remove = useMutation({
    mutationFn: () => contractService.deleteDraft(code),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contract-drafts-admin"] }),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!info.title.trim()) return setError("Le titre est requis.");
    setError(null);
    saveInfo.mutate();
  };

  return (
    <div className="mx-auto w-full max-w-4xl">
      <PageHeader
        title={draft.title}
        subtitle={<span className="font-mono text-xs">{code}</span>}
        badge={<StatusChip tone={st.tone}>{st.label}</StatusChip>}
        onBack={onBack}
        backLabel="Retour aux rédactions"
        actions={
          <>
            <ActionButton variant="ghost" icon={Eye} pending={previewM.isPending} onClick={() => previewM.mutate()}>
              Aperçu
            </ActionButton>
            <ActionButton icon={FileText} pending={pdf.isPending} onClick={() => pdf.mutate()}>
              Générer le PDF
            </ActionButton>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {draft.status === "DRAFTING" && (
          <ActionButton variant="ghost" icon={CheckCircle} pending={setStatus.isPending} onClick={() => setStatus.mutate("READY")}>
            Marquer prête
          </ActionButton>
        )}
        {draft.status !== "DRAFTING" && (
          <ActionButton variant="ghost" icon={RotateCcw} pending={setStatus.isPending} onClick={() => setStatus.mutate("DRAFTING")}>
            Remettre en rédaction
          </ActionButton>
        )}
        <ActionButton
          variant="ghost"
          icon={Trash2}
          onClick={() =>
            toast.confirm({
              message: `Supprimer la rédaction « ${draft.title} » ?`,
              detail: code,
              confirmLabel: "Supprimer",
              pendingLabel: "Suppression",
              successMessage: "Rédaction supprimée",
              errorMessage: "Suppression impossible",
              onConfirm: async () => {
                await remove.mutateAsync();
                onBack();
              },
            })
          }
        >
          Supprimer
        </ActionButton>
      </div>

      <div className="space-y-4">
        <form onSubmit={submit}>
          <Section
            title="Informations"
            icon={Pencil}
            action={
              <ActionButton type="submit" icon={Save} pending={saveInfo.isPending}>
                Enregistrer
              </ActionButton>
            }
          >
            <div className="space-y-4">
              <ErrorBanner message={error} />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Titre" required>
                  <input value={info.title} onChange={(e) => setInfo({ ...info, title: e.target.value })} className={FIELD} />
                </Field>
                <Detail label="Template" mono>{draft.templateCode}</Detail>
              </div>
              <OwnerPicker value={info} onChange={(p) => setInfo((i) => ({ ...i, ...p }))} />
              <Field label="Description">
                <textarea value={info.description} onChange={(e) => setInfo({ ...info, description: e.target.value })} rows={2} className={`${FIELD} resize-none`} />
              </Field>
              <Field label="En-tête HTML" hint="Facultatif">
                <textarea value={info.headerHtml} onChange={(e) => setInfo({ ...info, headerHtml: e.target.value })} rows={2} className={`${FIELD} resize-y font-mono text-xs`} />
              </Field>
              <Field label="Pied de page HTML" hint="Facultatif">
                <textarea value={info.footerHtml} onChange={(e) => setInfo({ ...info, footerHtml: e.target.value })} rows={2} className={`${FIELD} resize-y font-mono text-xs`} />
              </Field>
              <Field label="CSS" hint="Facultatif">
                <textarea value={info.cssContent} onChange={(e) => setInfo({ ...info, cssContent: e.target.value })} rows={3} className={`${FIELD} resize-y font-mono text-xs`} />
              </Field>
            </div>
          </Section>
        </form>

        <Section title="Sections" description={`${draft.sections?.length ?? 0} section${(draft.sections?.length ?? 0) > 1 ? "s" : ""}`} icon={ListOrdered}>
          <SectionsEditor kind="draft" code={code} sections={draft.sections ?? []} />
        </Section>

        {preview && (
          <Section title="Aperçu de la rédaction" description="Rendu HTML généré par le serveur" icon={Eye}>
            <HtmlFrame html={preview} title="Aperçu de la rédaction" height="50vh" className="shadow-sm" />
          </Section>
        )}
      </div>
    </div>
  );
};
