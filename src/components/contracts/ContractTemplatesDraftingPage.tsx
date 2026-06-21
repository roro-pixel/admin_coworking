import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Copy,
  Eye,
  FileText,
  GitPullRequestDraft,
  Loader2,
  Plus,
  Save,
  Search,
  Trash2,
  Variable,
  Wand2,
  XCircle,
} from "lucide-react";
import { contractService } from "../../services/contract.service";
import type {
  ContractDraftResponse,
  ContractSectionType,
  ContractTemplateResponse,
  DocumentOwnerType,
  TemplateVariableDefinition,
  VariableSource,
} from "../../services/contract.service";

const inputClass =
  "w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100";
const primaryBtn =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50";
const softBtn =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50";
const dangerBtn =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-red-100 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50";

const ownerTypes: DocumentOwnerType[] = ["MEMBER", "CUSTOMER", "BUSINESS", "COMPANY"];
const sectionTypes: ContractSectionType[] = ["PREAMBLE", "ARTICLE", "CLAUSE", "SIGNATURE_BLOCK", "ANNEXE"];
const variableSources: VariableSource[] = ["AUTO", "MANUAL"];

const SectionCard: React.FC<{
  title: string;
  description: string;
  icon: React.ElementType;
  children: React.ReactNode;
}> = ({ title, description, icon: Icon, children }) => (
  <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
    <div className="mb-5 flex items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        <div className="rounded-2xl bg-primary-50 p-3 text-primary-600">
          <Icon size={20} />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-950">{title}</h3>
          <p className="mt-1 text-sm text-gray-500">{description}</p>
        </div>
      </div>
    </div>
    {children}
  </section>
);

const emptyTemplateForm = {
  code: "",
  name: "",
  description: "",
  category: "COWORKING",
  contentHtml: "",
  contentMarkdown: "",
  active: true,
};

const emptyDraftForm = {
  title: "",
  description: "",
  ownerType: "MEMBER" as DocumentOwnerType,
  ownerCode: "",
  businessCode: "",
  templateCode: "",
  createdBy: "1",
};

export const ContractTemplatesDraftingPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [activePanel, setActivePanel] = useState<"templates" | "drafts">("templates");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<ContractTemplateResponse | null>(null);
  const [templateForm, setTemplateForm] = useState(emptyTemplateForm);
  const [variableForm, setVariableForm] = useState<TemplateVariableDefinition>({
    name: "",
    label: "",
    description: "",
    source: "MANUAL",
    required: false,
    defaultValue: "",
    sampleValue: "",
  });
  const [templateVariables, setTemplateVariables] = useState<TemplateVariableDefinition[]>([]);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [duplicateName, setDuplicateName] = useState("");

  const [draftSearch, setDraftSearch] = useState("");
  const [draftForm, setDraftForm] = useState(emptyDraftForm);
  const [selectedDraft, setSelectedDraft] = useState<ContractDraftResponse | null>(null);
  const [draftEditForm, setDraftEditForm] = useState({
    title: "",
    description: "",
    ownerType: "MEMBER" as DocumentOwnerType,
    ownerCode: "",
    businessCode: "",
    templateCode: "",
  });
  const [editingSectionId, setEditingSectionId] = useState<number | null>(null);
  const [sectionEditForm, setSectionEditForm] = useState({
    title: "",
    content: "",
    type: "ARTICLE" as ContractSectionType,
    displayOrder: 1,
  });
  const [sectionForm, setSectionForm] = useState({
    title: "",
    content: "",
    type: "ARTICLE" as ContractSectionType,
    displayOrder: 1,
  });
  const [draftPreviewHtml, setDraftPreviewHtml] = useState<string | null>(null);

  const templatesQuery = useQuery({
    queryKey: ["contract-templates-admin", search, categoryFilter],
    queryFn: async () => {
      if (search.trim()) return contractService.searchTemplates(search, { size: 50 });
      if (categoryFilter) {
        const byCategory = await contractService.getTemplatesByCategory(categoryFilter);
        return { content: byCategory, totalElements: byCategory.length, totalPages: 1 };
      }
      return contractService.getTemplatesPage({ size: 50, sort: "createdAt,desc" });
    },
  });

  const draftsQuery = useQuery({
    queryKey: ["contract-drafts-admin", draftSearch],
    queryFn: () =>
      draftSearch.trim()
        ? contractService.searchDrafts(draftSearch, { size: 50 })
        : contractService.getDrafts({ size: 50, sort: "createdAt,desc" }),
  });

  const templates = templatesQuery.data?.content || [];
  const drafts = draftsQuery.data?.content || [];

  const activeTemplates = useMemo(() => templates.filter((t) => t.active !== false).length, [templates]);
  const readyDrafts = useMemo(() => drafts.filter((d) => d.status === "READY").length, [drafts]);

  const success = (text: string) => {
    setMessage(text);
    setError(null);
  };
  const fail = (e: any, fallback: string) => {
    setError(e?.response?.data?.message || e?.message || fallback);
    setMessage(null);
  };

  const resetTemplateForm = () => {
    setSelectedTemplate(null);
    setTemplateForm(emptyTemplateForm);
    setTemplateVariables([]);
    setPreviewHtml(null);
  };

  const loadTemplate = async (code: string) => {
    try {
      const tpl = await contractService.getTemplate(code);
      setSelectedTemplate(tpl);
      setTemplateForm({
        code: tpl.code,
        name: tpl.name,
        description: tpl.description || "",
        category: tpl.category || "COWORKING",
        contentHtml: tpl.contentHtml || "",
        contentMarkdown: tpl.contentMarkdown || "",
        active: tpl.active !== false,
      });
      setTemplateVariables(tpl.variables || []);
      setPreviewHtml(null);
    } catch (e) {
      fail(e, "Erreur chargement template.");
    }
  };

  const saveTemplateMutation = useMutation({
    mutationFn: () => {
      const payload = {
        code: templateForm.code || undefined,
        name: templateForm.name,
        description: templateForm.description || undefined,
        category: templateForm.category || undefined,
        contentHtml: templateForm.contentHtml || undefined,
        contentMarkdown: templateForm.contentMarkdown || undefined,
        active: templateForm.active,
        variables: templateVariables,
      };
      return selectedTemplate
        ? contractService.updateTemplate(selectedTemplate.code, payload)
        : contractService.createTemplate(payload);
    },
    onSuccess: (tpl) => {
      queryClient.invalidateQueries({ queryKey: ["contract-templates-admin"] });
      setSelectedTemplate(tpl);
      success("Template enregistré.");
    },
    onError: (e) => fail(e, "Erreur sauvegarde template."),
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (code: string) => contractService.deleteTemplate(code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contract-templates-admin"] });
      resetTemplateForm();
      success("Template supprimé.");
    },
    onError: (e) => fail(e, "Erreur suppression template."),
  });

  const previewTemplateMutation = useMutation({
    mutationFn: () => {
      if (!selectedTemplate?.code && !templateForm.code) throw new Error("Enregistrez d'abord le template.");
      const sampleVariables = Object.fromEntries(
        templateVariables.map((v) => [v.name, v.sampleValue || v.defaultValue || `{{${v.name}}}`]),
      );
      return contractService.previewTemplate(selectedTemplate?.code || templateForm.code, sampleVariables);
    },
    onSuccess: (result) => {
      setPreviewHtml(result.html);
      success("Prévisualisation générée.");
    },
    onError: (e) => fail(e, "Erreur prévisualisation template."),
  });

  const duplicateTemplateMutation = useMutation({
    mutationFn: () => {
      if (!selectedTemplate) throw new Error("Aucun template sélectionné.");
      return contractService.duplicateTemplate(selectedTemplate.code, {
        name: duplicateName || `${selectedTemplate.name} - copie`,
        description: selectedTemplate.description || undefined,
      });
    },
    onSuccess: (tpl) => {
      queryClient.invalidateQueries({ queryKey: ["contract-templates-admin"] });
      setDuplicateName("");
      success(`Template dupliqué : ${tpl.code}`);
    },
    onError: (e) => fail(e, "Erreur duplication template."),
  });

  const addVariable = () => {
    if (!variableForm.name.trim()) return;
    setTemplateVariables((prev) => [...prev, { ...variableForm, name: variableForm.name.trim() }]);
    setVariableForm({ name: "", label: "", description: "", source: "MANUAL", required: false, defaultValue: "", sampleValue: "" });
  };

  const removeVariable = (index: number) => setTemplateVariables((prev) => prev.filter((_, i) => i !== index));

  const createDraftMutation = useMutation({
    mutationFn: () => {
      const payload = {
        title: draftForm.title,
        description: draftForm.description || undefined,
        ownerType: draftForm.ownerType,
        ownerCode: draftForm.ownerCode || undefined,
        businessCode: draftForm.businessCode || undefined,
        templateCode: draftForm.templateCode || undefined,
        createdBy: Number(draftForm.createdBy) || 1,
      };
      return draftForm.templateCode
        ? contractService.createDraftFromTemplate(draftForm.templateCode, payload)
        : contractService.createDraft(payload);
    },
    onSuccess: (draft) => {
      queryClient.invalidateQueries({ queryKey: ["contract-drafts-admin"] });
      setSelectedDraft(draft);
      setDraftForm(emptyDraftForm);
      success("Rédaction créée.");
    },
    onError: (e) => fail(e, "Erreur création rédaction."),
  });

  const loadDraft = async (code: string) => {
    try {
      const draft = await contractService.getDraft(code);
      setSelectedDraft(draft);
      setDraftEditForm({
        title: draft.title || "",
        description: draft.description || "",
        ownerType: (draft.ownerType as DocumentOwnerType) || "MEMBER",
        ownerCode: draft.ownerCode || "",
        businessCode: draft.businessCode || "",
        templateCode: draft.templateCode || "",
      });
      setEditingSectionId(null);
      setDraftPreviewHtml(null);
    } catch (e) {
      fail(e, "Erreur chargement rédaction.");
    }
  };

  const updateDraftMutation = useMutation({
    mutationFn: () => {
      if (!selectedDraft) throw new Error("Aucune rédaction sélectionnée.");
      return contractService.updateDraft(selectedDraft.code, {
        title: draftEditForm.title,
        description: draftEditForm.description || undefined,
        ownerType: draftEditForm.ownerType,
        ownerCode: draftEditForm.ownerCode || undefined,
        businessCode: draftEditForm.businessCode || undefined,
        templateCode: draftEditForm.templateCode || undefined,
      });
    },
    onSuccess: (draft) => {
      setSelectedDraft(draft);
      queryClient.invalidateQueries({ queryKey: ["contract-drafts-admin"] });
      success("Rédaction mise à jour.");
    },
    onError: (e) => fail(e, "Erreur modification rédaction."),
  });

  const startEditSection = (section: any) => {
    setEditingSectionId(section.id);
    setSectionEditForm({
      title: section.title || "",
      content: section.content || "",
      type: section.type || "ARTICLE",
      displayOrder: section.displayOrder || 1,
    });
  };

  const updateSectionMutation = useMutation({
    mutationFn: () => {
      if (!selectedDraft || editingSectionId === null) throw new Error("Aucune section sélectionnée.");
      return contractService.updateDraftSection(selectedDraft.code, editingSectionId, {
        title: sectionEditForm.title,
        content: sectionEditForm.content,
        type: sectionEditForm.type,
        displayOrder: Number(sectionEditForm.displayOrder) || 1,
      });
    },
    onSuccess: async () => {
      if (selectedDraft) await loadDraft(selectedDraft.code);
      setEditingSectionId(null);
      success("Section mise à jour.");
    },
    onError: (e) => fail(e, "Erreur modification section."),
  });

  const updateDraftStatusMutation = useMutation({
    mutationFn: (status: string) => {
      if (!selectedDraft) throw new Error("Aucune rédaction sélectionnée.");
      return contractService.updateDraftStatus(selectedDraft.code, status);
    },
    onSuccess: (draft) => {
      setSelectedDraft(draft);
      queryClient.invalidateQueries({ queryKey: ["contract-drafts-admin"] });
      success("Statut rédaction mis à jour.");
    },
    onError: (e) => fail(e, "Erreur statut rédaction."),
  });

  const addSectionMutation = useMutation({
    mutationFn: () => {
      if (!selectedDraft) throw new Error("Aucune rédaction sélectionnée.");
      return contractService.addDraftSection(selectedDraft.code, {
        title: sectionForm.title,
        content: sectionForm.content,
        type: sectionForm.type,
        displayOrder: Number(sectionForm.displayOrder) || 1,
      });
    },
    onSuccess: async () => {
      if (selectedDraft) await loadDraft(selectedDraft.code);
      setSectionForm({ title: "", content: "", type: "ARTICLE", displayOrder: (selectedDraft?.sections?.length || 0) + 2 });
      success("Section ajoutée.");
    },
    onError: (e) => fail(e, "Erreur ajout section."),
  });

  const deleteSectionMutation = useMutation({
    mutationFn: (sectionId: number) => {
      if (!selectedDraft) throw new Error("Aucune rédaction sélectionnée.");
      return contractService.deleteDraftSection(selectedDraft.code, sectionId);
    },
    onSuccess: async () => {
      if (selectedDraft) await loadDraft(selectedDraft.code);
      success("Section supprimée.");
    },
    onError: (e) => fail(e, "Erreur suppression section."),
  });

  const previewDraftMutation = useMutation({
    mutationFn: () => {
      if (!selectedDraft) throw new Error("Aucune rédaction sélectionnée.");
      return contractService.previewDraft(selectedDraft.code);
    },
    onSuccess: (result) => {
      setDraftPreviewHtml(result.html);
      success("Aperçu rédaction généré.");
    },
    onError: (e) => fail(e, "Erreur aperçu rédaction."),
  });

  const generateDraftPdfMutation = useMutation({
    mutationFn: () => {
      if (!selectedDraft) throw new Error("Aucune rédaction sélectionnée.");
      return contractService.generateDraftPdf(selectedDraft.code, Number(draftForm.createdBy) || 1);
    },
    onSuccess: (doc) => {
      success(`PDF généré : ${doc.code}`);
      const url = doc.previewUrl || doc.downloadUrl || doc.fileUrl;
      if (url) window.open(url, "_blank");
    },
    onError: (e) => fail(e, "Erreur génération PDF."),
  });

  const deleteDraftMutation = useMutation({
    mutationFn: (code: string) => contractService.deleteDraft(code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contract-drafts-admin"] });
      setSelectedDraft(null);
      success("Rédaction supprimée.");
    },
    onError: (e) => fail(e, "Erreur suppression rédaction."),
  });

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-600">Contrathèque</p>
            <h1 className="mt-2 text-2xl font-bold text-gray-950">Templates & rédaction</h1>
            <p className="mt-1 text-sm text-gray-500">
              Gérez les modèles, variables, duplications, brouillons contractuels, sections et génération PDF.
            </p>
          </div>
          <div className="flex rounded-2xl bg-gray-50 p-1 ring-1 ring-gray-100">
            <button onClick={() => setActivePanel("templates")} className={`rounded-xl px-4 py-2 text-sm font-medium ${activePanel === "templates" ? "bg-white text-primary-600 shadow-sm" : "text-gray-500"}`}>Templates</button>
            <button onClick={() => setActivePanel("drafts")} className={`rounded-xl px-4 py-2 text-sm font-medium ${activePanel === "drafts" ? "bg-white text-primary-600 shadow-sm" : "text-gray-500"}`}>Rédaction</button>
          </div>
        </div>
      </div>

      {(message || error) && (
        <div className={`rounded-2xl px-4 py-3 text-sm ${error ? "bg-red-50 text-red-700 ring-1 ring-red-100" : "bg-green-50 text-green-700 ring-1 ring-green-100"}`}>
          {error || message}
        </div>
      )}

      {activePanel === "templates" && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[380px_1fr]">
          <SectionCard title="Bibliothèque" description={`${templates.length} modèles · ${activeTemplates} actifs`} icon={FileText}>
            <div className="relative mb-4">
              <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input className={`${inputClass} pl-9`} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un template..." />
            </div>
            <select className={`${inputClass} mb-4`} value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="">Toutes les catégories</option>
              <option value="COWORKING">COWORKING</option>
              <option value="MEMBERSHIP">MEMBERSHIP</option>
              <option value="SERVICE">SERVICE</option>
              <option value="LEGAL">LEGAL</option>
              <option value="OTHER">OTHER</option>
            </select>
            <button className={`${primaryBtn} mb-4 w-full`} onClick={resetTemplateForm}><Plus size={16} /> Nouveau template</button>
            <div className="max-h-[720px] space-y-2 overflow-y-auto pr-1">
              {templatesQuery.isLoading ? <p className="py-6 text-center text-sm text-gray-500">Chargement...</p> : templates.map((tpl) => (
                <button key={tpl.code} onClick={() => loadTemplate(tpl.code)} className={`w-full rounded-2xl p-3 text-left ring-1 transition ${selectedTemplate?.code === tpl.code ? "bg-primary-50 ring-primary-100" : "bg-gray-50 ring-gray-100 hover:bg-white"}`}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-gray-900">{tpl.name}</p>
                    <span className={`rounded-full px-2 py-0.5 text-xs ${tpl.active === false ? "bg-gray-100 text-gray-500" : "bg-green-50 text-green-700"}`}>{tpl.active === false ? "Inactif" : "Actif"}</span>
                  </div>
                  <p className="mt-1 font-mono text-xs text-gray-400">{tpl.code}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-gray-500">{tpl.description || "—"}</p>
                </button>
              ))}
            </div>
          </SectionCard>

          <div className="space-y-6">
            <SectionCard title="Édition du template" description="Contenu HTML/Markdown et paramètres principaux." icon={Save}>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <input className={inputClass} value={templateForm.code} onChange={(e) => setTemplateForm({ ...templateForm, code: e.target.value })} placeholder="Code template" disabled={!!selectedTemplate} />
                <input className={inputClass} value={templateForm.name} onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })} placeholder="Nom du modèle" />
                <input className={inputClass} value={templateForm.category} onChange={(e) => setTemplateForm({ ...templateForm, category: e.target.value })} placeholder="Catégorie" />
                <label className="flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2.5 text-sm text-gray-700 ring-1 ring-gray-100">
                  <input type="checkbox" checked={templateForm.active} onChange={(e) => setTemplateForm({ ...templateForm, active: e.target.checked })} /> Actif
                </label>
              </div>
              <textarea className={`${inputClass} mt-3`} rows={2} value={templateForm.description} onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })} placeholder="Description" />
              <textarea className={`${inputClass} mt-3 font-mono`} rows={8} value={templateForm.contentHtml} onChange={(e) => setTemplateForm({ ...templateForm, contentHtml: e.target.value })} placeholder="Contenu HTML du contrat avec variables {{clientName}}..." />
              <textarea className={`${inputClass} mt-3 font-mono`} rows={5} value={templateForm.contentMarkdown} onChange={(e) => setTemplateForm({ ...templateForm, contentMarkdown: e.target.value })} placeholder="Contenu Markdown optionnel" />
              <div className="mt-4 flex flex-wrap gap-3">
                <button className={primaryBtn} disabled={!templateForm.name || saveTemplateMutation.isPending} onClick={() => saveTemplateMutation.mutate()}>{saveTemplateMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Enregistrer</button>
                <button className={softBtn} disabled={previewTemplateMutation.isPending || (!selectedTemplate && !templateForm.code)} onClick={() => previewTemplateMutation.mutate()}><Eye size={16} /> Prévisualiser</button>
                {selectedTemplate && <button className={dangerBtn} onClick={() => deleteTemplateMutation.mutate(selectedTemplate.code)}><Trash2 size={16} /> Supprimer</button>}
              </div>
            </SectionCard>

            <SectionCard title="Variables" description="Déclarez les variables AUTO/MANUAL utilisées par le modèle." icon={Variable}>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
                <input className={inputClass} value={variableForm.name} onChange={(e) => setVariableForm({ ...variableForm, name: e.target.value })} placeholder="name" />
                <input className={inputClass} value={variableForm.label || ""} onChange={(e) => setVariableForm({ ...variableForm, label: e.target.value })} placeholder="Label" />
                <select className={inputClass} value={variableForm.source} onChange={(e) => setVariableForm({ ...variableForm, source: e.target.value as VariableSource })}>{variableSources.map((s) => <option key={s}>{s}</option>)}</select>
                <input className={inputClass} value={variableForm.defaultValue || ""} onChange={(e) => setVariableForm({ ...variableForm, defaultValue: e.target.value })} placeholder="Défaut" />
                <input className={inputClass} value={variableForm.sampleValue || ""} onChange={(e) => setVariableForm({ ...variableForm, sampleValue: e.target.value })} placeholder="Exemple" />
                <button className={softBtn} onClick={addVariable} disabled={!variableForm.name}><Plus size={16} /> Ajouter</button>
              </div>
              <div className="mt-4 space-y-2">
                {templateVariables.map((v, index) => (
                  <div key={`${v.name}-${index}`} className="flex items-center justify-between rounded-xl bg-gray-50 p-3 text-sm ring-1 ring-gray-100">
                    <span><b>{v.name}</b> · {v.source} {v.required ? "· requis" : ""}</span>
                    <button className="text-red-600" onClick={() => removeVariable(index)}>Retirer</button>
                  </div>
                ))}
                {templateVariables.length === 0 && <p className="rounded-xl bg-gray-50 p-4 text-sm text-gray-500">Aucune variable.</p>}
              </div>
            </SectionCard>

            {selectedTemplate && (
              <SectionCard title="Duplication" description="Créer une copie d'un modèle existant." icon={Copy}>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto]">
                  <input className={inputClass} value={duplicateName} onChange={(e) => setDuplicateName(e.target.value)} placeholder="Nom de la copie" />
                  <button className={softBtn} onClick={() => duplicateTemplateMutation.mutate()} disabled={duplicateTemplateMutation.isPending}><Copy size={16} /> Dupliquer</button>
                </div>
              </SectionCard>
            )}

            {previewHtml && (
              <SectionCard title="Aperçu template" description="Rendu HTML généré par le backend." icon={Eye}>
                <div className="max-h-[520px] overflow-auto rounded-2xl border border-gray-100 bg-white p-5" dangerouslySetInnerHTML={{ __html: previewHtml }} />
              </SectionCard>
            )}
          </div>
        </div>
      )}

      {activePanel === "drafts" && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[380px_1fr]">
          <SectionCard title="Rédactions" description={`${drafts.length} brouillons · ${readyDrafts} prêts`} icon={GitPullRequestDraft}>
            <div className="relative mb-4">
              <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input className={`${inputClass} pl-9`} value={draftSearch} onChange={(e) => setDraftSearch(e.target.value)} placeholder="Rechercher une rédaction..." />
            </div>
            <div className="max-h-[720px] space-y-2 overflow-y-auto pr-1">
              {draftsQuery.isLoading ? <p className="py-6 text-center text-sm text-gray-500">Chargement...</p> : drafts.map((draft) => (
                <button key={draft.code} onClick={() => loadDraft(draft.code)} className={`w-full rounded-2xl p-3 text-left ring-1 transition ${selectedDraft?.code === draft.code ? "bg-primary-50 ring-primary-100" : "bg-gray-50 ring-gray-100 hover:bg-white"}`}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-gray-900">{draft.title}</p>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{draft.status}</span>
                  </div>
                  <p className="mt-1 font-mono text-xs text-gray-400">{draft.code}</p>
                  <p className="mt-1 text-xs text-gray-500">{draft.ownerType || "—"} · {draft.ownerCode || "—"}</p>
                </button>
              ))}
            </div>
          </SectionCard>

          <div className="space-y-6">
            <SectionCard title="Nouvelle rédaction" description="Créer un brouillon libre ou depuis un template." icon={Plus}>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <input className={inputClass} value={draftForm.title} onChange={(e) => setDraftForm({ ...draftForm, title: e.target.value })} placeholder="Titre" />
                <select className={inputClass} value={draftForm.ownerType} onChange={(e) => setDraftForm({ ...draftForm, ownerType: e.target.value as DocumentOwnerType })}>{ownerTypes.map((t) => <option key={t}>{t}</option>)}</select>
                <input className={inputClass} value={draftForm.ownerCode} onChange={(e) => setDraftForm({ ...draftForm, ownerCode: e.target.value })} placeholder="Code propriétaire" />
                <input className={inputClass} value={draftForm.businessCode} onChange={(e) => setDraftForm({ ...draftForm, businessCode: e.target.value })} placeholder="Business code" />
                <select className={inputClass} value={draftForm.templateCode} onChange={(e) => setDraftForm({ ...draftForm, templateCode: e.target.value })}>
                  <option value="">Sans template</option>
                  {templates.map((tpl) => <option key={tpl.code} value={tpl.code}>{tpl.name}</option>)}
                </select>
                <input className={inputClass} value={draftForm.createdBy} onChange={(e) => setDraftForm({ ...draftForm, createdBy: e.target.value })} placeholder="Créé par" />
              </div>
              <textarea className={`${inputClass} mt-3`} rows={2} value={draftForm.description} onChange={(e) => setDraftForm({ ...draftForm, description: e.target.value })} placeholder="Description" />
              <button className={`${primaryBtn} mt-4`} disabled={!draftForm.title || createDraftMutation.isPending} onClick={() => createDraftMutation.mutate()}><Plus size={16} /> Créer rédaction</button>
            </SectionCard>

            {selectedDraft && (
              <SectionCard title={`Rédaction ${selectedDraft.code}`} description="Sections, statut, aperçu et génération PDF." icon={Wand2}>
                <div className="mb-4 flex flex-wrap gap-2">
                  <button className={softBtn} onClick={() => updateDraftStatusMutation.mutate("READY")}>Marquer prêt</button>
                  <button className={softBtn} onClick={() => updateDraftStatusMutation.mutate("DRAFTING")}>Remettre en rédaction</button>
                  <button className={softBtn} onClick={() => previewDraftMutation.mutate()}><Eye size={16} /> Aperçu</button>
                  <button className={primaryBtn} onClick={() => generateDraftPdfMutation.mutate()}><FileText size={16} /> Générer PDF</button>
                  <button className={dangerBtn} onClick={() => deleteDraftMutation.mutate(selectedDraft.code)}><Trash2 size={16} /> Supprimer</button>
                </div>

                <div className="rounded-2xl bg-gray-50 p-4 ring-1 ring-gray-100 space-y-3">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <input className={inputClass} value={draftEditForm.title} onChange={(e) => setDraftEditForm({ ...draftEditForm, title: e.target.value })} placeholder="Titre rédaction" />
                    <select className={inputClass} value={draftEditForm.ownerType} onChange={(e) => setDraftEditForm({ ...draftEditForm, ownerType: e.target.value as DocumentOwnerType })}>{ownerTypes.map((t) => <option key={t}>{t}</option>)}</select>
                    <input className={inputClass} value={draftEditForm.ownerCode} onChange={(e) => setDraftEditForm({ ...draftEditForm, ownerCode: e.target.value })} placeholder="Code propriétaire" />
                    <input className={inputClass} value={draftEditForm.businessCode} onChange={(e) => setDraftEditForm({ ...draftEditForm, businessCode: e.target.value })} placeholder="Business code" />
                    <select className={inputClass} value={draftEditForm.templateCode} onChange={(e) => setDraftEditForm({ ...draftEditForm, templateCode: e.target.value })}>
                      <option value="">Sans template</option>
                      {templates.map((tpl) => <option key={tpl.code} value={tpl.code}>{tpl.name}</option>)}
                    </select>
                    <button className={softBtn} onClick={() => updateDraftMutation.mutate()} disabled={!draftEditForm.title || updateDraftMutation.isPending}><Save size={16} /> Enregistrer infos</button>
                  </div>
                  <textarea className={inputClass} rows={2} value={draftEditForm.description} onChange={(e) => setDraftEditForm({ ...draftEditForm, description: e.target.value })} placeholder="Description rédaction" />
                  <p className="text-xs text-gray-500">Statut : {selectedDraft.status} · Sections : {selectedDraft.sections?.length || 0}</p>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-[1fr_180px_100px]">
                  <input className={inputClass} value={sectionForm.title} onChange={(e) => setSectionForm({ ...sectionForm, title: e.target.value })} placeholder="Titre section" />
                  <select className={inputClass} value={sectionForm.type} onChange={(e) => setSectionForm({ ...sectionForm, type: e.target.value as ContractSectionType })}>{sectionTypes.map((t) => <option key={t}>{t}</option>)}</select>
                  <input className={inputClass} type="number" value={sectionForm.displayOrder} onChange={(e) => setSectionForm({ ...sectionForm, displayOrder: Number(e.target.value) })} />
                </div>
                <textarea className={`${inputClass} mt-3 font-mono`} rows={5} value={sectionForm.content} onChange={(e) => setSectionForm({ ...sectionForm, content: e.target.value })} placeholder="Contenu de la section" />
                <button className={`${softBtn} mt-3`} disabled={!sectionForm.title || !sectionForm.content || addSectionMutation.isPending} onClick={() => addSectionMutation.mutate()}><Plus size={16} /> Ajouter section</button>

                <div className="mt-5 space-y-2">
                  {(selectedDraft.sections || []).map((section) => (
                    <div key={section.id} className="rounded-2xl bg-white p-4 ring-1 ring-gray-100">
                      {editingSectionId === section.id ? (
                        <div className="space-y-3">
                          <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_180px_100px]">
                            <input className={inputClass} value={sectionEditForm.title} onChange={(e) => setSectionEditForm({ ...sectionEditForm, title: e.target.value })} />
                            <select className={inputClass} value={sectionEditForm.type} onChange={(e) => setSectionEditForm({ ...sectionEditForm, type: e.target.value as ContractSectionType })}>{sectionTypes.map((t) => <option key={t}>{t}</option>)}</select>
                            <input className={inputClass} type="number" value={sectionEditForm.displayOrder} onChange={(e) => setSectionEditForm({ ...sectionEditForm, displayOrder: Number(e.target.value) })} />
                          </div>
                          <textarea className={`${inputClass} font-mono`} rows={5} value={sectionEditForm.content} onChange={(e) => setSectionEditForm({ ...sectionEditForm, content: e.target.value })} />
                          <div className="flex gap-2">
                            <button className={softBtn} onClick={() => updateSectionMutation.mutate()} disabled={updateSectionMutation.isPending || !sectionEditForm.title || !sectionEditForm.content}><Save size={16} /> Enregistrer section</button>
                            <button className={softBtn} onClick={() => setEditingSectionId(null)}>Annuler</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-medium text-gray-900">{section.displayOrder}. {section.title}</p>
                              <p className="mt-0.5 text-xs text-gray-400">{section.type}</p>
                            </div>
                            <div className="flex gap-2">
                              <button className="text-primary-600" onClick={() => startEditSection(section)}><Save size={18} /></button>
                              <button className="text-red-600" onClick={() => deleteSectionMutation.mutate(section.id)}><XCircle size={18} /></button>
                            </div>
                          </div>
                          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-gray-600">{section.content}</p>
                        </>
                      )}
                    </div>
                  ))}
                  {(selectedDraft.sections || []).length === 0 && <p className="rounded-xl bg-gray-50 p-4 text-sm text-gray-500">Aucune section.</p>}
                </div>
              </SectionCard>
            )}

            {draftPreviewHtml && (
              <SectionCard title="Aperçu rédaction" description="Rendu HTML du brouillon." icon={Eye}>
                <div className="max-h-[540px] overflow-auto rounded-2xl border border-gray-100 bg-white p-5" dangerouslySetInnerHTML={{ __html: draftPreviewHtml }} />
              </SectionCard>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
