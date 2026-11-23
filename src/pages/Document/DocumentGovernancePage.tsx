import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Power, PowerOff, ShieldCheck, Tag as TagIcon, Trash2 } from "lucide-react";
import { documentService } from "../../services/document.service";
import { gedService } from "../../services/ged.service";
import type { DocumentRetentionAction, DocumentRetentionReference } from "../../services/document.service";
import { ActionButton, CheckField, EmptyState, ErrorBlock, Field, IconButton, ListHeader, PanelForm, Tag } from "../../components/subscription/kit";
import { FIELD, apiMessage } from "../../components/subscription/kitUtils";
import { ListSkeleton } from "../../components/ui/Skeleton";
import { toast } from "../../components/ui/toastStore";
import { SPACES, SPACE_LABEL, fmtInt, label } from "../../components/documents/docUtils";

const EMPTY_TAG = { code: "", name: "", color: "#E0529C", space: "KYC_SPACE" };
const EMPTY_POLICY = {
  code: "",
  name: "",
  space: "KYC_SPACE",
  documentTypeCode: "",
  folderCode: "",
  retentionDays: 365,
  retentionReference: "UPLOAD_DATE" as DocumentRetentionReference,
  action: "ARCHIVE" as DocumentRetentionAction,
  active: true,
};
const ACTION_LABEL: Record<string, string> = { ARCHIVE: "Archiver", PURGE_FLAG: "Marquer pour purge" };
const REF_LABEL: Record<string, string> = { UPLOAD_DATE: "date d'envoi", EXPIRY_DATE: "date d'expiration" };

export const DocumentGovernancePage: React.FC = () => {
  const queryClient = useQueryClient();
  const [tagForm, setTagForm] = useState<typeof EMPTY_TAG | null>(null);
  const [policyForm, setPolicyForm] = useState<typeof EMPTY_POLICY | null>(null);
  const [error, setError] = useState<string | null>(null);

  const tagsQuery = useQuery({ queryKey: ["document-tags"], queryFn: () => documentService.getDocumentTags() });
  const policiesQuery = useQuery({ queryKey: ["document-retention-policies"], queryFn: () => documentService.getRetentionPolicies() });
  const { data: types = [] } = useQuery({ queryKey: ["documentTypes", "governance"], queryFn: () => documentService.getDocumentTypes(), enabled: policyForm !== null });
  const tags = tagsQuery.data ?? [];
  const policies = policiesQuery.data ?? [];

  const createTag = useMutation({
    mutationFn: () => documentService.createDocumentTag(tagForm!),
    onSuccess: () => {
      toast.success("Tag créé");
      queryClient.invalidateQueries({ queryKey: ["document-tags"] });
      setTagForm(null);
      setError(null);
    },
    onError: (e) => setError(apiMessage(e, "Création du tag impossible")),
  });
  const deleteTag = useMutation({
    mutationFn: (code: string) => documentService.deleteDocumentTag(code),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["document-tags"] }),
  });
  const createPolicy = useMutation({
    mutationFn: () => documentService.createRetentionPolicy({ ...policyForm!, folderCode: policyForm!.folderCode || undefined, documentTypeCode: policyForm!.documentTypeCode || undefined }),
    onSuccess: () => {
      toast.success("Politique créée");
      queryClient.invalidateQueries({ queryKey: ["document-retention-policies"] });
      setPolicyForm(null);
      setError(null);
    },
    onError: (e) => setError(apiMessage(e, "Création de la politique impossible")),
  });
  const activatePolicy = useMutation({
    mutationFn: (code: string) => gedService.activateRetentionPolicy(code),
    onSuccess: () => {
      toast.success("Politique réactivée");
      queryClient.invalidateQueries({ queryKey: ["document-retention-policies"] });
    },
    onError: (e) => toast.error(apiMessage(e, "Réactivation impossible")),
  });
  const deletePolicy = useMutation({
    mutationFn: (code: string) => documentService.deleteRetentionPolicy(code),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["document-retention-policies"] }),
  });

  const spaceSelect = (value: string, onChange: (v: string) => void) => (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={FIELD}>
      {SPACES.map((s) => (
        <option key={s} value={s}>
          {label(SPACE_LABEL, s)}
        </option>
      ))}
    </select>
  );

  return (
    <div className="space-y-8">
      <ListHeader title="Gouvernance documentaire" subtitle="Tags et politiques de rétention" />

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 text-lg font-bold text-gray-950">
            <TagIcon size={18} /> Tags
          </h3>
          <ActionButton icon={Plus} onClick={() => { setError(null); setTagForm(EMPTY_TAG); }}>
            Nouveau tag
          </ActionButton>
        </div>

        {tagForm && (
          <PanelForm title="Nouveau tag" onCancel={() => setTagForm(null)} pending={createTag.isPending} submitLabel="Créer le tag" submitDisabled={!tagForm.code.trim() || !tagForm.name.trim()} error={error} onSubmit={(e) => { e.preventDefault(); createTag.mutate(); }}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Code" required>
                <input value={tagForm.code} onChange={(e) => setTagForm({ ...tagForm, code: e.target.value.toUpperCase() })} className={`${FIELD} font-mono`} />
              </Field>
              <Field label="Nom" required>
                <input value={tagForm.name} onChange={(e) => setTagForm({ ...tagForm, name: e.target.value })} className={FIELD} />
              </Field>
              <Field label="Espace">{spaceSelect(tagForm.space, (v) => setTagForm({ ...tagForm, space: v }))}</Field>
              <Field label="Couleur">
                <input type="color" value={tagForm.color} onChange={(e) => setTagForm({ ...tagForm, color: e.target.value })} aria-label="Couleur du tag" className="h-12 w-full cursor-pointer rounded-2xl bg-white p-1" />
              </Field>
            </div>
          </PanelForm>
        )}

        {tagsQuery.isLoading ? (
          <ListSkeleton rows={3} />
        ) : tagsQuery.isError ? (
          <ErrorBlock message="Impossible de charger les tags." onRetry={() => tagsQuery.refetch()} />
        ) : tags.length === 0 ? (
          <EmptyState icon={TagIcon} title="Aucun tag" hint="Créez un tag pour classer les documents." />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {tags.map((t) => (
              <div key={t.code} className="flex items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="h-8 w-8 shrink-0 rounded-full" style={{ backgroundColor: t.color || "#B8BCC6" }} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-900">{t.name}</p>
                    <p className="truncate font-mono text-xs text-gray-400">
                      {t.code}
                      {t.space ? ` · ${label(SPACE_LABEL, String(t.space))}` : ""}
                    </p>
                  </div>
                </div>
                <IconButton
                  icon={Trash2}
                  label="Supprimer le tag"
                  tone="danger"
                  onClick={() =>
                    toast.confirm({
                      message: `Supprimer le tag « ${t.name} » ?`,
                      confirmLabel: "Supprimer",
                      pendingLabel: "Suppression",
                      successMessage: "Tag supprimé",
                      errorMessage: "Suppression impossible",
                      onConfirm: () => deleteTag.mutateAsync(t.code),
                    })
                  }
                />
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 text-lg font-bold text-gray-950">
            <ShieldCheck size={18} /> Politiques de rétention
          </h3>
          <ActionButton icon={Plus} onClick={() => { setError(null); setPolicyForm(EMPTY_POLICY); }}>
            Nouvelle politique
          </ActionButton>
        </div>

        {policyForm && (
          <PanelForm title="Nouvelle politique de rétention" onCancel={() => setPolicyForm(null)} pending={createPolicy.isPending} submitLabel="Créer la politique" submitDisabled={!policyForm.code.trim() || !policyForm.name.trim()} error={error} onSubmit={(e) => { e.preventDefault(); createPolicy.mutate(); }}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Code" required>
                <input value={policyForm.code} onChange={(e) => setPolicyForm({ ...policyForm, code: e.target.value.toUpperCase() })} className={`${FIELD} font-mono`} />
              </Field>
              <Field label="Nom" required>
                <input value={policyForm.name} onChange={(e) => setPolicyForm({ ...policyForm, name: e.target.value })} className={FIELD} />
              </Field>
              <Field label="Espace">{spaceSelect(policyForm.space, (v) => setPolicyForm({ ...policyForm, space: v }))}</Field>
              <Field label="Type de document" hint="Facultatif.">
                <select value={policyForm.documentTypeCode} onChange={(e) => setPolicyForm({ ...policyForm, documentTypeCode: e.target.value })} className={FIELD}>
                  <option value="">Tous les types</option>
                  {types.map((t) => (
                    <option key={`${t.ownerType}-${t.code}`} value={t.code}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Dossier" hint="Facultatif : code du dossier concerné.">
                <input value={policyForm.folderCode} onChange={(e) => setPolicyForm({ ...policyForm, folderCode: e.target.value })} className={FIELD} />
              </Field>
              <Field label="Durée de conservation (jours)">
                <input type="number" min={1} value={policyForm.retentionDays} onChange={(e) => setPolicyForm({ ...policyForm, retentionDays: Number(e.target.value) || 0 })} className={FIELD} />
              </Field>
              <Field label="Calculée depuis la">
                <select value={policyForm.retentionReference} onChange={(e) => setPolicyForm({ ...policyForm, retentionReference: e.target.value as DocumentRetentionReference })} className={FIELD}>
                  <option value="UPLOAD_DATE">Date d'envoi</option>
                  <option value="EXPIRY_DATE">Date d'expiration</option>
                </select>
              </Field>
              <Field label="Action à l'échéance">
                <select value={policyForm.action} onChange={(e) => setPolicyForm({ ...policyForm, action: e.target.value as DocumentRetentionAction })} className={FIELD}>
                  <option value="ARCHIVE">Archiver</option>
                  <option value="PURGE_FLAG">Marquer pour purge</option>
                </select>
              </Field>
            </div>
            <CheckField checked={policyForm.active} onChange={(v) => setPolicyForm({ ...policyForm, active: v })} label="Politique active" />
          </PanelForm>
        )}

        {policiesQuery.isLoading ? (
          <ListSkeleton rows={3} />
        ) : policiesQuery.isError ? (
          <ErrorBlock message="Impossible de charger les politiques." onRetry={() => policiesQuery.refetch()} />
        ) : policies.length === 0 ? (
          <EmptyState icon={ShieldCheck} title="Aucune politique de rétention" hint="Définissez combien de temps les documents sont conservés." />
        ) : (
          <div className="space-y-2">
            {policies.map((p) => (
              <div key={p.code} className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{p.name}</p>
                  <p className="text-xs text-gray-500">
                    <span className="font-mono">{p.code}</span> · {label(SPACE_LABEL, String(p.space))} · {fmtInt(p.retentionDays)} jours depuis la {REF_LABEL[String(p.retentionReference)] ?? String(p.retentionReference ?? "")}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Tag tone="pink">{ACTION_LABEL[String(p.action)] ?? String(p.action)}</Tag>
                  {p.active === false && <Tag>Inactive</Tag>}
                  {p.active === false ? (
                    <IconButton icon={Power} label="Réactiver la politique" tone="success" pending={activatePolicy.isPending} onClick={() => activatePolicy.mutate(p.code)} />
                  ) : (
                    <IconButton
                      icon={PowerOff}
                      label="Désactiver la politique"
                      tone="danger"
                      onClick={() =>
                        toast.confirm({
                          message: `Désactiver la politique « ${p.name} » ? Elle reste listée et peut être réactivée.`,
                          confirmLabel: "Désactiver",
                          pendingLabel: "Désactivation",
                          successMessage: "Politique désactivée",
                          errorMessage: "Désactivation impossible",
                          onConfirm: () => deletePolicy.mutateAsync(p.code),
                        })
                      }
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
