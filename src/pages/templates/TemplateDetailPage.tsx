import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, Eye, History, Pencil, RotateCcw, Save, Send, Trash2, Undo2 } from "lucide-react";
import { documentTemplateService } from "../../services/documentTemplate.service";
import type { TemplateContent, TemplateDetail } from "../../services/documentTemplate.service";
import { ActionButton, ErrorBanner, ErrorBlock, PageHeader, Section, StatusChip, Tabs, Tag } from "../../components/subscription/kit";
import type { TabItem } from "../../components/subscription/kit";
import { apiMessage, formatDateTime } from "../../components/subscription/kitUtils";
import { DetailsSkeleton } from "../../components/ui/Skeleton";
import { toast } from "../../components/ui/toastStore";
import { TemplateShell } from "../../components/templates/TemplateShell";
import { TemplateEditor } from "../../components/templates/TemplateEditor";
import { TemplatePreview } from "../../components/templates/TemplatePreview";
import { STATUS_LABEL, cleanContent, emptyContent } from "../../components/templates/templateLabels";
import { TEMPLATES_KEY } from "./TemplatesPage";

type Tab = "editor" | "preview" | "history";

const toContent = (d: TemplateDetail): TemplateContent => {
  const v = d.draft ?? d.published;
  if (!v) return emptyContent(d.family);
  return {
    pageFormat: v.pageFormat,
    copies: v.copies ?? [],
    style: v.style ?? null,
    blocks: v.blocks?.length ? v.blocks : emptyContent(d.family).blocks,
    fields: v.fields ?? [],
    note: d.draft ? (v.note ?? "") : "",
  };
};

const TokenPanel: React.FC<{ fields: { key: string; label: string; sample?: string | null }[]; common: string[]; hint?: string | null; family: string }> = ({ fields, common, hint, family }) => {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = async (token: string) => {
    try {
      await navigator.clipboard.writeText(token);
      setCopied(token);
      setTimeout(() => setCopied(null), 1200);
    } catch {
      toast.error("Copie impossible : sélectionnez le jeton à la main.");
    }
  };
  if (!fields.length && !common.length) return null;
  const chip = (token: string, title?: string) => (
    <button key={token} type="button" title={title} onClick={() => copy(token)} className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 font-mono text-xs text-gray-700 transition hover:bg-gray-200">
      {copied === token ? <Check size={11} /> : <Copy size={11} />}
      {token}
    </button>
  );
  return (
    <Section title="Jetons disponibles" description="Cliquez pour copier, puis collez dans un texte ou un libellé.">
      <div className="space-y-3 px-3 pb-3">
        {family === "EMAIL" && hint && /obligatoire/i.test(hint) && <p className="rounded-2xl bg-amber-50 px-4 py-2.5 text-sm text-amber-800">{hint}</p>}
        <div className="flex flex-wrap gap-2">
          {fields.map((f) => chip(`{{${f.key}}}`, f.label))}
          {common.map((c) => chip(c.startsWith("{{") ? c : `{{${c}}}`, "Jeton commun"))}
        </div>
      </div>
    </Section>
  );
};

export const TemplateDetailPage: React.FC = () => {
  const { code = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("editor");
  const [content, setContent] = useState<TemplateContent | null>(null);
  const [baseline, setBaseline] = useState("");
  const [error, setError] = useState<string | null>(null);
  const loadedFor = useRef<string>("");

  const detail = useQuery({ queryKey: [TEMPLATES_KEY, code], queryFn: () => documentTemplateService.get(code) });
  const catalog = useQuery({ queryKey: [TEMPLATES_KEY, code, "catalog"], queryFn: () => documentTemplateService.getCatalog(code) });
  const d = detail.data;

  // Le contenu de l'éditeur part du brouillon, sinon de la version publiée, sinon d'un modèle vide.
  useEffect(() => {
    if (d && loadedFor.current !== code) {
      const c = toContent(d);
      loadedFor.current = code;
      setContent(c);
      setBaseline(JSON.stringify(cleanContent(d.family, c)));
    }
  }, [d, code]);

  const cleaned = useMemo(() => (d && content ? cleanContent(d.family, content) : null), [d, content]);
  const dirty = !!cleaned && JSON.stringify(cleaned) !== baseline;

  const refresh = (fresh?: TemplateDetail, resetEditor = false) => {
    queryClient.invalidateQueries({ queryKey: [TEMPLATES_KEY] });
    if (fresh && resetEditor) {
      const c = toContent(fresh);
      setContent(c);
      setBaseline(JSON.stringify(cleanContent(fresh.family, c)));
    }
  };

  const fail = (e: unknown, fallback: string) => setError(apiMessage(e, fallback));

  const save = useMutation({
    mutationFn: () => documentTemplateService.saveDraft(code, cleaned as TemplateContent),
    onSuccess: () => {
      setError(null);
      setBaseline(JSON.stringify(cleaned));
      refresh();
      toast.success("Brouillon enregistré");
    },
    onError: (e) => fail(e, "Enregistrement impossible."),
  });

  const publish = useMutation({
    mutationFn: async () => {
      if (dirty || !d?.draft) await documentTemplateService.saveDraft(code, cleaned as TemplateContent);
      return documentTemplateService.publish(code);
    },
    onSuccess: (fresh) => {
      setError(null);
      refresh(fresh, true);
      toast.success("Modèle publié : il prend effet en moins d'une minute");
    },
    onError: (e) => fail(e, "Publication impossible."),
  });

  const dropDraft = useMutation({
    mutationFn: () => documentTemplateService.deleteDraft(code),
    onSuccess: async () => {
      setError(null);
      const fresh = await documentTemplateService.get(code);
      queryClient.setQueryData([TEMPLATES_KEY, code], fresh);
      refresh(fresh, true);
      toast.success("Brouillon supprimé");
    },
    onError: (e) => fail(e, "Suppression impossible."),
  });

  const reset = useMutation({
    mutationFn: () => documentTemplateService.reset(code),
    onSuccess: (fresh) => {
      setError(null);
      refresh(fresh);
      toast.success("Gabarit d'origine rétabli");
    },
    onError: (e) => fail(e, "Retour à l'original impossible."),
  });

  const restore = useMutation({
    mutationFn: (version: number) => documentTemplateService.restore(code, version),
    onSuccess: (fresh) => {
      setError(null);
      refresh(fresh, true);
      setTab("editor");
      toast.success("Version copiée dans le brouillon : relisez-la puis publiez");
    },
    onError: (e) => fail(e, "Restauration impossible."),
  });

  const confirmReset = () =>
    toast.confirm({
      message: "Revenir au gabarit d'origine ?",
      detail: "La version publiée est archivée. Une facture ou un avoir déjà certifié garde la version qui l'a produit.",
      confirmLabel: "Revenir à l'original",
      pendingLabel: "Retour à l'original",
      successMessage: "Gabarit d'origine rétabli",
      errorMessage: "Retour à l'original impossible.",
      onConfirm: () => reset.mutateAsync(),
    });

  const confirmPublish = () =>
    toast.confirm({
      message: `Publier « ${d?.label} » ?`,
      detail: "Les prochaines impressions ou envois utiliseront ce modèle. La version publiée actuelle sera archivée.",
      confirmLabel: "Publier",
      pendingLabel: "Publication",
      successMessage: "Modèle publié",
      errorMessage: "Publication impossible.",
      onConfirm: () => publish.mutateAsync(),
    });

  const confirmDrop = () =>
    toast.confirm({
      message: "Supprimer le brouillon ?",
      detail: "La version publiée, s'il y en a une, n'est pas touchée.",
      confirmLabel: "Supprimer",
      pendingLabel: "Suppression",
      successMessage: "Brouillon supprimé",
      errorMessage: "Suppression impossible.",
      onConfirm: () => dropDraft.mutateAsync(),
    });

  const tabs: TabItem<Tab>[] = [
    { id: "editor", label: "Éditeur", icon: Pencil },
    { id: "preview", label: "Aperçu", icon: Eye },
    { id: "history", label: "Historique", icon: History, count: d?.versions.length },
  ];

  return (
    <TemplateShell>
      <div className="mx-auto w-full max-w-4xl space-y-5">
        {detail.isLoading || (d && !content) ? (
          <DetailsSkeleton />
        ) : detail.isError || !d || !content ? (
          <ErrorBlock message={apiMessage(detail.error, "Modèle introuvable.")} onRetry={() => detail.refetch()} />
        ) : (
          <>
            <PageHeader
              title={d.label}
              subtitle={d.description || d.fallbackTemplate || undefined}
              onBack={() => navigate("/templates")}
              backLabel="Retour aux modèles"
              badge={
                <div className="flex flex-wrap gap-2">
                  <Tag>{d.family === "PDF" ? "Pièce PDF" : "Courriel"}</Tag>
                  {d.published ? <StatusChip tone="success">Version {d.published.versionNumber} publiée</StatusChip> : <StatusChip tone="neutral">Gabarit d'origine</StatusChip>}
                  {d.draft && <Tag tone="pink">Brouillon</Tag>}
                  {dirty && <Tag tone="pink">Modifications non enregistrées</Tag>}
                </div>
              }
            />

            <ErrorBanner message={error} />

            <div className="flex flex-wrap items-center gap-2">
              <ActionButton icon={Save} pending={save.isPending} disabled={!dirty || publish.isPending} onClick={() => save.mutate()}>
                Enregistrer le brouillon
              </ActionButton>
              <ActionButton icon={Send} variant="ghost" disabled={(!d.draft && !dirty) || save.isPending} onClick={confirmPublish}>
                Publier
              </ActionButton>
              {d.draft && (
                <ActionButton icon={Trash2} variant="ghost" onClick={confirmDrop}>
                  Supprimer le brouillon
                </ActionButton>
              )}
              {d.published && (
                <ActionButton icon={Undo2} variant="ghost" onClick={confirmReset}>
                  Revenir à l'original
                </ActionButton>
              )}
            </div>

            <Tabs variant="soft" items={tabs} active={tab} onChange={setTab} />

            {tab === "editor" && (
              <div className="space-y-5">
                <TokenPanel fields={catalog.data?.fields ?? []} common={catalog.data?.commonTokens ?? []} hint={catalog.data?.previewNumberHint} family={d.family} />
                <TemplateEditor family={d.family} content={content} onChange={setContent} catalog={catalog.data} />
              </div>
            )}

            {tab === "preview" && cleaned && <TemplatePreview code={code} family={d.family} content={cleaned} catalog={catalog.data} />}

            {tab === "history" && (
              <Section title="Versions" icon={History}>
                {d.versions.length === 0 ? (
                  <p className="px-3 pb-3 text-sm text-gray-500">Aucune version : le gabarit d'origine sert.</p>
                ) : (
                  <ul className="space-y-2">
                    {[...d.versions].sort((a, b) => b.versionNumber - a.versionNumber).map((v) => (
                      <li key={v.versionNumber} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm">
                        <div className="min-w-0">
                          <p className="flex items-center gap-2 font-semibold text-gray-900">
                            Version {v.versionNumber}
                            <StatusChip tone={v.status === "PUBLISHED" ? "success" : v.status === "DRAFT" ? "pink" : "neutral"}>{STATUS_LABEL[v.status]}</StatusChip>
                          </p>
                          <p className="text-xs text-gray-500">
                            {v.publishedAt ? `Publiée le ${formatDateTime(v.publishedAt)}${v.publishedBy ? ` par ${v.publishedBy}` : ""}` : `Créée le ${formatDateTime(v.createdAt)}${v.createdBy ? ` par ${v.createdBy}` : ""}`}
                          </p>
                          {v.note && <p className="mt-1 text-sm text-gray-700">{v.note}</p>}
                        </div>
                        {v.status !== "DRAFT" && (
                          <ActionButton
                            variant="ghost"
                            icon={RotateCcw}
                            pending={restore.isPending && restore.variables === v.versionNumber}
                            onClick={() =>
                              dirty
                                ? toast.confirm({
                                    message: "Écraser vos modifications non enregistrées ?",
                                    detail: `La version ${v.versionNumber} sera copiée dans le brouillon.`,
                                    confirmLabel: "Restaurer",
                                    pendingLabel: "Restauration",
                                    successMessage: "Version copiée dans le brouillon",
                                    errorMessage: "Restauration impossible.",
                                    onConfirm: () => restore.mutateAsync(v.versionNumber),
                                  })
                                : restore.mutate(v.versionNumber)
                            }
                          >
                            Restaurer
                          </ActionButton>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </Section>
            )}
          </>
        )}
      </div>
    </TemplateShell>
  );
};
