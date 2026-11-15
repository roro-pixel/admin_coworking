import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, FileText, Pencil, Plus, Power, Trash2 } from "lucide-react";
import { documentService } from "../../services/document.service";
import type { DocumentType } from "../../services/document.service";
import { ActionButton, CheckField, DataCard, EmptyState, ErrorBlock, Field, FilterButton, FilterPanel, HeadRow, IconButton, ListHeader, PanelForm, SearchField, StatusChip, Tag } from "../../components/subscription/kit";
import { FIELD, ROW_HOVER, apiMessage } from "../../components/subscription/kitUtils";
import { ListSkeleton } from "../../components/ui/Skeleton";
import { toast } from "../../components/ui/toastStore";
import { Cell, Fact } from "../../components/documents/docKit";
import { CATEGORIES, CATEGORY_LABEL, OWNER_LABEL, OWNER_TYPES, formatBytes, label, usePaged } from "../../components/documents/docUtils";
import { Pagination } from "../../components/subscription/kit";

const COLS = "lg:grid-cols-[minmax(0,1.4fr)_9rem_minmax(0,1fr)_7rem_auto]";
const DEFAULT_FORM = {
  code: "",
  name: "",
  category: "KYC",
  ownerType: "MEMBER",
  description: "",
  helpText: "",
  documentDetails: "",
  required: true,
  requiresExpiryDate: false,
  requiresIssueDate: false,
  requiresDocumentNumber: false,
  requiresReview: true,
  autoApprove: false,
  autoApproveAfterDays: 0,
  requiresSignature: false,
  requiresBackSide: false,
  multipleAllowed: false,
  allowedMimeTypes: "application/pdf,image/jpeg,image/png",
  maxFileSizeBytes: 10485760,
  active: true,
};
type Form = typeof DEFAULT_FORM;

const toForm = (t: DocumentType): Form => ({
  code: t.code,
  name: t.name,
  category: String(t.category),
  ownerType: String(t.ownerType ?? "MEMBER"),
  description: t.description || "",
  helpText: t.helpText || "",
  documentDetails: t.documentDetails || "",
  required: Boolean(t.required),
  requiresExpiryDate: Boolean(t.requiresExpiryDate),
  requiresIssueDate: Boolean(t.requiresIssueDate),
  requiresDocumentNumber: Boolean(t.requiresDocumentNumber),
  requiresReview: Boolean(t.requiresReview),
  autoApprove: Boolean(t.autoApprove),
  autoApproveAfterDays: Number(t.autoApproveAfterDays || 0),
  requiresSignature: Boolean(t.requiresSignature),
  requiresBackSide: Boolean(t.requiresBackSide),
  multipleAllowed: Boolean(t.multipleAllowed),
  allowedMimeTypes: Array.isArray(t.allowedMimeTypes) ? t.allowedMimeTypes.join(",") : String(t.allowedMimeTypes || DEFAULT_FORM.allowedMimeTypes),
  maxFileSizeBytes: Number(t.maxFileSizeBytes || DEFAULT_FORM.maxFileSizeBytes),
  active: Boolean(t.active),
});

export const DocumentTypesList: React.FC = () => {
  const queryClient = useQueryClient();
  const [ownerType, setOwnerType] = useState("MEMBER");
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ code: string | null; form: Form } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["documentTypes", ownerType],
    queryFn: () => documentService.getDocumentTypes(ownerType),
  });

  const q = search.trim().toLowerCase();
  const types = data.filter((t) => (q === "" || t.name.toLowerCase().includes(q) || t.code.toLowerCase().includes(q)) && (category === "" || t.category === category));
  const { page, setPage, slice, totalPages, total } = usePaged(types, 15);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["documentTypes"] });
  const save = useMutation({
    mutationFn: () => (editing!.code === null ? documentService.createDocumentType(editing!.form as never) : documentService.updateDocumentType(editing!.code, editing!.form as never)),
    onSuccess: () => {
      toast.success(editing?.code === null ? "Type créé" : "Type modifié");
      invalidate();
      setEditing(null);
      setError(null);
    },
    onError: (e) => setError(apiMessage(e, "Enregistrement impossible")),
  });
  const toggle = useMutation({
    mutationFn: (t: DocumentType) => (t.active ? documentService.deactivateDocumentType(t.code) : documentService.activateDocumentType(t.code)),
    onSuccess: invalidate,
    onError: (e) => toast.error(apiMessage(e, "Changement d'état impossible")),
  });
  const remove = useMutation({
    mutationFn: (code: string) => documentService.deleteDocumentType(code),
    onSuccess: invalidate,
  });

  const f = editing?.form;
  const set = (patch: Partial<Form>) => setEditing((p) => (p ? { ...p, form: { ...p.form, ...patch } } : p));
  const hasFilters = !!(search || category);

  return (
    <div className="space-y-5">
      <ListHeader
        title="Types de documents"
        subtitle={isLoading ? undefined : `${total} type${total > 1 ? "s" : ""} pour ${label(OWNER_LABEL, ownerType).toLowerCase()}`}
        action={
          <ActionButton icon={Plus} onClick={() => { setError(null); setEditing({ code: null, form: { ...DEFAULT_FORM, ownerType } }); }}>
            Nouveau type
          </ActionButton>
        }
      />

      {editing && f && (
        <PanelForm
          title={editing.code === null ? "Nouveau type de document" : `Modifier ${editing.code}`}
          onCancel={() => setEditing(null)}
          pending={save.isPending}
          submitLabel={editing.code === null ? "Créer" : "Enregistrer"}
          submitDisabled={!f.code.trim() || !f.name.trim()}
          error={error}
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Code" required>
              <input value={f.code} disabled={editing.code !== null} onChange={(e) => set({ code: e.target.value.toUpperCase() })} className={`${FIELD} font-mono disabled:opacity-60`} />
            </Field>
            <Field label="Nom" required>
              <input value={f.name} onChange={(e) => set({ name: e.target.value })} className={FIELD} />
            </Field>
            <Field label="Propriétaire">
              <select value={f.ownerType} onChange={(e) => set({ ownerType: e.target.value })} className={FIELD}>
                {OWNER_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {label(OWNER_LABEL, t)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Catégorie">
              <select value={f.category} onChange={(e) => set({ category: e.target.value })} className={FIELD}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {label(CATEGORY_LABEL, c)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Types MIME autorisés" hint="Séparés par des virgules.">
              <input value={f.allowedMimeTypes} onChange={(e) => set({ allowedMimeTypes: e.target.value })} className={FIELD} />
            </Field>
            <Field label="Taille maximale (octets)" hint={formatBytes(f.maxFileSizeBytes)}>
              <input type="number" min={0} value={f.maxFileSizeBytes} onChange={(e) => set({ maxFileSizeBytes: Number(e.target.value) || 0 })} className={FIELD} />
            </Field>
          </div>
          <Field label="Description">
            <textarea value={f.description} onChange={(e) => set({ description: e.target.value })} rows={2} className={`${FIELD} resize-none`} />
          </Field>
          <Field label="Détails du document">
            <textarea value={f.documentDetails} onChange={(e) => set({ documentDetails: e.target.value })} rows={2} className={`${FIELD} resize-none`} />
          </Field>
          <Field label="Texte d'aide">
            <textarea value={f.helpText} onChange={(e) => set({ helpText: e.target.value })} rows={2} className={`${FIELD} resize-none`} />
          </Field>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <CheckField checked={f.required} onChange={(v) => set({ required: v })} label="Obligatoire" />
            <CheckField checked={f.requiresReview} onChange={(v) => set({ requiresReview: v })} label="Revue requise" />
            <CheckField checked={f.requiresSignature} onChange={(v) => set({ requiresSignature: v })} label="Signature requise" />
            <CheckField checked={f.requiresDocumentNumber} onChange={(v) => set({ requiresDocumentNumber: v })} label="Numéro requis" />
            <CheckField checked={f.requiresIssueDate} onChange={(v) => set({ requiresIssueDate: v })} label="Date d'émission requise" />
            <CheckField checked={f.requiresExpiryDate} onChange={(v) => set({ requiresExpiryDate: v })} label="Date d'expiration requise" />
            <CheckField checked={f.requiresBackSide} onChange={(v) => set({ requiresBackSide: v })} label="Verso requis" />
            <CheckField checked={f.multipleAllowed} onChange={(v) => set({ multipleAllowed: v })} label="Plusieurs fichiers" />
            <CheckField checked={f.autoApprove} onChange={(v) => set({ autoApprove: v })} label="Approbation automatique" />
            <CheckField checked={f.active} onChange={(v) => set({ active: v })} label="Actif" />
          </div>
          {f.autoApprove && (
            <Field label="Approbation automatique après (jours)">
              <input type="number" min={0} value={f.autoApproveAfterDays} onChange={(e) => set({ autoApproveAfterDays: Number(e.target.value) || 0 })} className={`${FIELD} sm:max-w-[10rem]`} />
            </Field>
          )}
        </PanelForm>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <select value={ownerType} onChange={(e) => { setOwnerType(e.target.value); setPage(0); }} aria-label="Propriétaire" className="rounded-2xl bg-gray-100 px-4 py-3 text-sm font-semibold text-gray-800 outline-none focus:ring-2 focus:ring-[color:var(--logo-pink)] sm:w-56">
          {OWNER_TYPES.map((t) => (
            <option key={t} value={t}>
              {label(OWNER_LABEL, t)}
            </option>
          ))}
        </select>
        <SearchField className="flex-1" value={search} onChange={(v) => { setSearch(v); setPage(0); }} placeholder="Nom ou code du type" />
        <FilterButton open={showFilters} active={!!category} onClick={() => setShowFilters(!showFilters)} />
      </div>
      {showFilters && (
        <FilterPanel canReset={hasFilters} onReset={() => { setSearch(""); setCategory(""); setPage(0); }}>
          <Field label="Catégorie">
            <select value={category} onChange={(e) => { setCategory(e.target.value); setPage(0); }} className={FIELD}>
              <option value="">Toutes les catégories</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {label(CATEGORY_LABEL, c)}
                </option>
              ))}
            </select>
          </Field>
        </FilterPanel>
      )}

      {isLoading ? (
        <ListSkeleton rows={6} />
      ) : isError ? (
        <ErrorBlock message="Impossible de charger les types de documents." onRetry={() => refetch()} />
      ) : types.length === 0 ? (
        <EmptyState icon={FileText} title="Aucun type de document" hint={hasFilters ? "Ajustez les filtres." : "Créez le premier type pour ce propriétaire."} />
      ) : (
        <>
          <HeadRow cols={COLS}>
            <span>Type</span>
            <span>Catégorie</span>
            <span>Règles</span>
            <span>État</span>
            <span className="text-right">Actions</span>
          </HeadRow>
          <DataCard>
            {slice.map((t) => {
              const open = expanded === t.code;
              return (
                <div key={t.code} className={`rounded-2xl max-lg:mb-2 max-lg:bg-gray-50 ${ROW_HOVER}`}>
                  <div onClick={() => setExpanded(open ? null : t.code)} className={`grid cursor-pointer grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 p-4 ${COLS}`}>
                    <div className="flex min-w-0 items-center gap-2">
                      <ChevronDown size={16} className={`shrink-0 text-gray-400 transition ${open ? "" : "-rotate-90"}`} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-900">{t.name}</p>
                        <p className="font-mono text-xs text-gray-400">{t.code}</p>
                      </div>
                    </div>
                    <Cell title="Catégorie" className="max-lg:order-3 max-lg:col-span-2">
                      <Tag tone={t.category === "KYC" ? "pink" : "gray"}>{label(CATEGORY_LABEL, String(t.category))}</Tag>
                    </Cell>
                    <Cell title="Règles" className="max-lg:order-4 max-lg:col-span-2">
                      <span className="text-sm text-gray-600">
                        {[t.required ? "Obligatoire" : "Optionnel", t.requiresReview ? "Revue" : "Sans revue", t.requiresSignature ? "Signature" : null].filter(Boolean).join(" · ")}
                      </span>
                    </Cell>
                    <div className="max-lg:order-2 max-lg:justify-self-end">
                      <StatusChip tone={t.active ? "success" : "neutral"}>{t.active ? "Actif" : "Inactif"}</StatusChip>
                    </div>
                    <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-1 max-lg:order-5 max-lg:col-span-2 lg:justify-end">
                      <IconButton icon={Power} label={t.active ? "Désactiver" : "Activer"} tone={t.active ? "success" : "neutral"} pending={toggle.isPending && toggle.variables?.code === t.code} onClick={() => toggle.mutate(t)} />
                      <IconButton icon={Pencil} label="Modifier" onClick={() => { setError(null); setEditing({ code: t.code, form: toForm(t) }); }} />
                      <IconButton
                        icon={Trash2}
                        label="Supprimer"
                        tone="danger"
                        onClick={() =>
                          toast.confirm({
                            message: `Supprimer le type « ${t.name} » ?`,
                            detail: "La suppression échoue si le type est déjà utilisé.",
                            confirmLabel: "Supprimer",
                            pendingLabel: "Suppression",
                            successMessage: "Type supprimé",
                            errorMessage: "Suppression impossible : le type est probablement utilisé",
                            onConfirm: () => remove.mutateAsync(t.code),
                          })
                        }
                      />
                    </div>
                  </div>
                  {open && (
                    <div className="grid gap-3 rounded-2xl bg-gray-50 p-3 sm:grid-cols-2 lg:grid-cols-3 lg:mx-3 lg:mb-3">
                      <Fact title="Description">{t.description || "Aucune"}</Fact>
                      <Fact title="Détails">{t.documentDetails || "Aucun"}</Fact>
                      <Fact title="Aide">{t.helpText || "Aucune"}</Fact>
                      <Fact title="Types MIME">{Array.isArray(t.allowedMimeTypes) ? t.allowedMimeTypes.join(", ") : t.allowedMimeTypes || "Non précisés"}</Fact>
                      <Fact title="Taille maximale">{formatBytes(t.maxFileSizeBytes)}</Fact>
                      <Fact title="Exigé à l'envoi">
                        {[t.requiresDocumentNumber ? "Numéro" : null, t.requiresIssueDate ? "Émission" : null, t.requiresExpiryDate ? "Expiration" : null, t.requiresBackSide ? "Verso" : null].filter(Boolean).join(", ") || "Rien de particulier"}
                      </Fact>
                      <Fact title="Plusieurs fichiers">{t.multipleAllowed ? "Autorisé" : "Un seul"}</Fact>
                      <Fact title="Approbation automatique">{t.autoApprove ? `Oui${t.autoApproveAfterDays ? `, après ${t.autoApproveAfterDays} jour(s)` : ""}` : "Non"}</Fact>
                    </div>
                  )}
                </div>
              );
            })}
          </DataCard>
          <Pagination page={page} totalPages={totalPages} total={total} noun="type" onChange={setPage} />
        </>
      )}
    </div>
  );
};
