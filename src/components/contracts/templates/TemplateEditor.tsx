import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Eye, FileText, LayoutTemplate, ListOrdered, Save, Trash2, Variable } from "lucide-react";
import { contractService } from "../../../services/contract.service";
import type { ContractTemplateResponse, TemplateVariableDefinition } from "../../../services/contract.service";
import { ActionButton, ErrorBanner, ErrorBlock, Field, PageHeader, Section, StatusChip, Switch } from "../../subscription/kit";
import { FIELD, apiMessage } from "../../subscription/kitUtils";
import { Skeleton } from "../../ui/Skeleton";
import { HtmlFrame } from "../../ui/HtmlFrame";
import { toast } from "../../ui/toastStore";
import { TEMPLATE_CATEGORIES } from "../contractLabels";
import { SectionsEditor } from "./SectionsEditor";
import { VariablesEditor } from "./VariablesEditor";

interface Form {
  name: string;
  description: string;
  language: string;
  category: string;
  htmlContent: string;
  cssContent: string;
  headerHtml: string;
  footerHtml: string;
  active: boolean;
}
const empty: Form = { name: "", description: "", language: "fr", category: "COWORKING", htmlContent: "", cssContent: "", headerHtml: "", footerHtml: "", active: true };
const fromTemplate = (t: ContractTemplateResponse): Form => ({
  name: t.name,
  description: t.description ?? "",
  language: t.language || "fr",
  category: t.category || "COWORKING",
  htmlContent: t.htmlContent ?? "",
  cssContent: t.cssContent ?? "",
  headerHtml: t.headerHtml ?? "",
  footerHtml: t.footerHtml ?? "",
  active: t.active !== false,
});

/** Variables {{nom}} présentes dans un contenu */
const usedVariables = (...contents: string[]): string[] => {
  const found = new Set<string>();
  for (const c of contents) for (const m of c.matchAll(/\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}\}/g)) found.add(m[1]);
  return [...found];
};

/** Création et modification d'un template. `code` absent : création. */
export const TemplateEditor: React.FC<{ code?: string; onBack: () => void; onOpen: (code: string) => void }> = ({ code, onBack, onOpen }) => {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["contract-template", code],
    queryFn: () => contractService.getTemplate(code!),
    enabled: !!code,
  });

  if (code && isLoading) {
    return (
      <div className="mx-auto w-full max-w-4xl space-y-4" role="status" aria-label="Chargement">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-72 w-full rounded-[1.75rem]" />
      </div>
    );
  }
  if (code && (isError || !data)) {
    return (
      <div className="mx-auto w-full max-w-4xl">
        <PageHeader title="Template introuvable" onBack={onBack} backLabel="Retour aux templates" />
        <ErrorBlock message="Impossible de charger ce template." onRetry={() => refetch()} />
      </div>
    );
  }
  // key : le formulaire repart des données serveur quand on change de template
  return <Inner key={code ?? "new"} template={data} queryClient={queryClient} onBack={onBack} onOpen={onOpen} />;
};

const Inner: React.FC<{
  template?: ContractTemplateResponse;
  queryClient: ReturnType<typeof useQueryClient>;
  onBack: () => void;
  onOpen: (code: string) => void;
}> = ({ template, queryClient, onBack, onOpen }) => {
  const editing = !!template;
  const [form, setForm] = useState<Form>(template ? fromTemplate(template) : empty);
  const [variables, setVariables] = useState<TemplateVariableDefinition[]>(template?.variableDefinitions ?? []);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  // Listes de référence du serveur : langues, types et sources de variables
  const { data: reference } = useQuery({ queryKey: ["contract-drafting-reference"], queryFn: () => contractService.getTemplatesDrafting(), staleTime: 5 * 60_000 });
  const languages = reference?.languages?.length ? reference.languages : ["fr", "en"];

  const dirty = useMemo(
    () => JSON.stringify([form, variables]) !== JSON.stringify([template ? fromTemplate(template) : empty, template?.variableDefinitions ?? []]),
    [form, variables, template],
  );
  const undeclared = useMemo(
    () => usedVariables(form.htmlContent, form.headerHtml, form.footerHtml).filter((n) => !variables.some((v) => v.key === n)),
    [form.htmlContent, form.headerHtml, form.footerHtml, variables],
  );

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        name: form.name.trim(),
        description: form.description || undefined,
        language: form.language || undefined,
        category: form.category || undefined,
        htmlContent: form.htmlContent || undefined,
        cssContent: form.cssContent || undefined,
        headerHtml: form.headerHtml || undefined,
        footerHtml: form.footerHtml || undefined,
        variableDefinitions: variables,
      };
      // `active` ne se règle qu'à la modification ; le code (CTM-NNNN) est attribué par le serveur
      return editing ? contractService.updateTemplate(template!.code, { ...payload, active: form.active }) : contractService.createTemplate(payload);
    },
    onSuccess: (t) => {
      queryClient.invalidateQueries({ queryKey: ["contract-templates-admin"] });
      queryClient.invalidateQueries({ queryKey: ["contract-templates"] });
      queryClient.setQueryData(["contract-template", t.code], t);
      toast.success("Template enregistré");
      setError(null);
      if (!editing) onOpen(t.code);
    },
    onError: (e: unknown) => setError(apiMessage(e, "Erreur lors de l'enregistrement du template.")),
  });

  const previewM = useMutation({
    mutationFn: () => {
      const sample = Object.fromEntries(variables.map((v) => [v.key, v.defaultValue || `{{${v.key}}}`]));
      return contractService.previewTemplate(template!.code, sample);
    },
    onSuccess: (r) => setPreview(r.html),
    onError: (e: unknown) => toast.error(apiMessage(e, "Erreur lors de la prévisualisation.")),
  });

  // Le serveur nomme la copie « <nom> (copie) » et reprend ses sections
  const duplicate = useMutation({
    mutationFn: () => contractService.duplicateTemplate(template!.code),
    onSuccess: (t) => {
      queryClient.invalidateQueries({ queryKey: ["contract-templates-admin"] });
      toast.success(`Template dupliqué : ${t.code}`);
      onOpen(t.code);
    },
    onError: (e: unknown) => toast.error(apiMessage(e, "Erreur lors de la duplication.")),
  });

  const remove = useMutation({
    mutationFn: () => contractService.deleteTemplate(template!.code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contract-templates-admin"] });
      queryClient.invalidateQueries({ queryKey: ["contract-templates"] });
      queryClient.removeQueries({ queryKey: ["contract-template", template!.code] });
    },
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return setError("Le nom du modèle est requis.");
    setError(null);
    save.mutate();
  };

  return (
    <form onSubmit={submit} className="mx-auto w-full max-w-4xl">
      <PageHeader
        title={editing ? template!.name : "Nouveau template"}
        subtitle={editing ? <span className="font-mono text-xs">{template!.code}</span> : "Définissez le contenu, les sections et les variables du modèle."}
        badge={editing ? <StatusChip tone={form.active ? "success" : "neutral"}>{form.active ? "Actif" : "Inactif"}</StatusChip> : undefined}
        onBack={onBack}
        backLabel="Retour aux templates"
        actions={
          <>
            {editing && (
              <>
                <ActionButton variant="ghost" icon={Copy} pending={duplicate.isPending} onClick={() => duplicate.mutate()}>Dupliquer</ActionButton>
                <ActionButton
                  variant="ghost"
                  icon={Trash2}
                  onClick={() =>
                    toast.confirm({
                      message: `Supprimer le template « ${template!.name} » ?`,
                      detail: `${template!.code} · suppression définitive. Pour le masquer sans le perdre, passez-le en inactif.`,
                      confirmLabel: "Supprimer",
                      pendingLabel: "Suppression",
                      successMessage: "Template supprimé",
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
              </>
            )}
            <ActionButton type="submit" icon={Save} pending={save.isPending}>Enregistrer</ActionButton>
          </>
        }
      />

      <div className="space-y-4">
        <ErrorBanner message={error} />

        <Section title="Informations" icon={FileText}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Nom du modèle" required>
              <input value={form.name} onChange={(e) => set("name", e.target.value)} className={FIELD} />
            </Field>
            <Field label="Catégorie">
              <select value={form.category} onChange={(e) => set("category", e.target.value)} className={FIELD}>
                {Object.entries(TEMPLATE_CATEGORIES).map(([k, l]) => (
                  <option key={k} value={k}>{l}</option>
                ))}
                {form.category && !(form.category in TEMPLATE_CATEGORIES) && <option value={form.category}>{form.category}</option>}
              </select>
            </Field>
            <Field label="Langue">
              <select value={form.language} onChange={(e) => set("language", e.target.value)} className={FIELD}>
                {languages.map((l) => (
                  <option key={l} value={l}>{l === "fr" ? "Français" : l === "en" ? "Anglais" : l}</option>
                ))}
                {form.language && !languages.includes(form.language) && <option value={form.language}>{form.language}</option>}
              </select>
            </Field>
            {editing && (
              <div className="flex items-end">
                <Switch checked={form.active} onChange={(v) => set("active", v)} label="Template actif" hint="Seuls les templates actifs sont proposés à la création d'un contrat" />
              </div>
            )}
          </div>
          <Field label="Description" className="mt-4">
            <textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={2} className={`${FIELD} resize-none`} />
          </Field>
        </Section>

        <Section title="Contenu" description="Insérez les variables avec {{nom}}. Les sections actives, quand il y en a, remplacent ce contenu dans l'aperçu." icon={FileText}>
          <Field label="Contenu HTML">
            <textarea value={form.htmlContent} onChange={(e) => set("htmlContent", e.target.value)} rows={10} placeholder="<h1>Contrat</h1><p>{{clientName}}</p>" className={`${FIELD} font-mono text-xs`} />
          </Field>
        </Section>

        <Section
          title="Sections"
          description={editing ? `${template!.sections?.length ?? 0} section${(template!.sections?.length ?? 0) > 1 ? "s" : ""}` : "Enregistrez le template pour pouvoir ajouter des sections"}
          icon={ListOrdered}
        >
          {editing ? <SectionsEditor kind="template" code={template!.code} sections={template!.sections ?? []} /> : <p className="text-sm text-gray-500">Les sections s'ajoutent une fois le template créé.</p>}
        </Section>

        <Section title="Mise en page" description="En-tête, pied de page et styles du PDF" icon={LayoutTemplate}>
          <div className="space-y-4">
            <Field label="En-tête HTML" hint="Facultatif">
              <textarea value={form.headerHtml} onChange={(e) => set("headerHtml", e.target.value)} rows={3} className={`${FIELD} font-mono text-xs`} />
            </Field>
            <Field label="Pied de page HTML" hint="Facultatif">
              <textarea value={form.footerHtml} onChange={(e) => set("footerHtml", e.target.value)} rows={3} className={`${FIELD} font-mono text-xs`} />
            </Field>
            <Field label="CSS" hint="Facultatif">
              <textarea value={form.cssContent} onChange={(e) => set("cssContent", e.target.value)} rows={5} className={`${FIELD} font-mono text-xs`} />
            </Field>
          </div>
        </Section>

        <Section title="Variables" description="Automatiques (système) ou manuelles (saisies à la génération)" icon={Variable}>
          <VariablesEditor variables={variables} onChange={setVariables} undeclared={undeclared} types={reference?.variableTypes} sources={reference?.variableSources} />
        </Section>

        {editing && (
          <Section
            title="Aperçu"
            description={dirty ? "L'aperçu reflète la dernière version enregistrée : enregistrez d'abord vos modifications" : "Rendu généré par le serveur avec les valeurs par défaut"}
            icon={Eye}
            action={
              <ActionButton variant="ghost" icon={Eye} pending={previewM.isPending} onClick={() => previewM.mutate()}>
                {preview ? "Actualiser" : "Prévisualiser"}
              </ActionButton>
            }
          >
            {preview ? (
              <HtmlFrame html={preview} title="Aperçu du template" height="50vh" className="shadow-sm" />
            ) : (
              <p className="text-sm text-gray-500">Aucun aperçu généré.</p>
            )}
          </Section>
        )}
      </div>
    </form>
  );
};
