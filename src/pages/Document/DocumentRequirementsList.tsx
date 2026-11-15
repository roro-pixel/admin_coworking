import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ListChecks, Pencil, Plus, Power, Trash2 } from "lucide-react";
import { documentService } from "../../services/document.service";
import type { DocumentRequirement } from "../../services/document.service";
import { ActionButton, CheckField, DataCard, EmptyState, ErrorBlock, Field, HeadRow, IconButton, ListHeader, PanelForm, Pagination, SearchField, StatusChip } from "../../components/subscription/kit";
import { FIELD, ROW_HOVER, apiMessage } from "../../components/subscription/kitUtils";
import { ListSkeleton } from "../../components/ui/Skeleton";
import { toast } from "../../components/ui/toastStore";
import { Cell } from "../../components/documents/docKit";
import { OWNER_LABEL, OWNER_TYPES, label, usePaged } from "../../components/documents/docUtils";

const COLS = "lg:grid-cols-[minmax(0,1.4fr)_9rem_7rem_7rem_auto]";
interface Form {
  ownerType: string;
  documentTypeCode: string;
  required: boolean;
  active: boolean;
}

export const DocumentRequirementsList: React.FC = () => {
  const queryClient = useQueryClient();
  const [ownerType, setOwnerType] = useState("MEMBER");
  const [search, setSearch] = useState("");
  const [requiredFilter, setRequiredFilter] = useState("");
  const [editing, setEditing] = useState<{ id: number | null; form: Form } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["documentRequirements", ownerType],
    queryFn: () => documentService.getDocumentRequirements(ownerType),
  });
  // Types actifs du propriétaire choisi dans le formulaire (et non plus celui de la liste).
  // La clé porte « active » : elle ne doit pas se confondre avec la liste complète des types.
  const formOwner = editing?.form.ownerType ?? ownerType;
  const { data: types = [] } = useQuery({
    queryKey: ["documentTypes", formOwner, "active"],
    queryFn: () => documentService.getDocumentTypes(formOwner, true),
    enabled: editing !== null,
  });

  const q = search.trim().toLowerCase();
  const reqs = data.filter((r) => (q === "" || r.documentTypeName.toLowerCase().includes(q) || r.documentTypeCode.toLowerCase().includes(q)) && (requiredFilter === "" || (requiredFilter === "required") === r.required));
  const { page, setPage, slice, totalPages, total } = usePaged(reqs, 15);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["documentRequirements"] });
  const save = useMutation({
    mutationFn: () => {
      const f = editing!.form;
      const body = { ...f, documentTypeName: types.find((t) => t.code === f.documentTypeCode)?.name || f.documentTypeCode };
      return editing!.id === null ? documentService.createDocumentRequirement(body) : documentService.updateDocumentRequirement(editing!.id, body);
    },
    onSuccess: () => {
      toast.success(editing?.id === null ? "Exigence créée" : "Exigence modifiée");
      invalidate();
      setEditing(null);
      setError(null);
    },
    onError: (e) => setError(apiMessage(e, "Enregistrement impossible")),
  });
  const toggle = useMutation({
    mutationFn: (r: DocumentRequirement) => (r.active ? documentService.deactivateDocumentRequirement(r.id) : documentService.activateDocumentRequirement(r.id)),
    onSuccess: invalidate,
    onError: (e) => toast.error(apiMessage(e, "Changement d'état impossible")),
  });
  const remove = useMutation({ mutationFn: (id: number) => documentService.deleteDocumentRequirement(id), onSuccess: invalidate });

  const f = editing?.form;
  const set = (patch: Partial<Form>) => setEditing((p) => (p ? { ...p, form: { ...p.form, ...patch } } : p));

  return (
    <div className="space-y-5">
      <ListHeader
        title="Exigences documentaires"
        subtitle={isLoading ? undefined : `${total} exigence${total > 1 ? "s" : ""} pour ${label(OWNER_LABEL, ownerType).toLowerCase()}`}
        action={
          <ActionButton icon={Plus} onClick={() => { setError(null); setEditing({ id: null, form: { ownerType, documentTypeCode: "", required: true, active: true } }); }}>
            Nouvelle exigence
          </ActionButton>
        }
      />

      {editing && f && (
        <PanelForm
          title={editing.id === null ? "Nouvelle exigence" : "Modifier l'exigence"}
          onCancel={() => setEditing(null)}
          pending={save.isPending}
          submitLabel={editing.id === null ? "Créer" : "Enregistrer"}
          submitDisabled={!f.documentTypeCode}
          error={error}
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Propriétaire">
              <select value={f.ownerType} onChange={(e) => set({ ownerType: e.target.value, documentTypeCode: "" })} className={FIELD}>
                {OWNER_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {label(OWNER_LABEL, t)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Type de document" required>
              <select value={f.documentTypeCode} onChange={(e) => set({ documentTypeCode: e.target.value })} className={FIELD}>
                <option value="">Choisir un type</option>
                {types.map((t) => (
                  <option key={t.code} value={t.code}>
                    {t.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <CheckField checked={f.required} onChange={(v) => set({ required: v })} label="Obligatoire" />
            <CheckField checked={f.active} onChange={(v) => set({ active: v })} label="Active" />
          </div>
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
        <select value={requiredFilter} onChange={(e) => { setRequiredFilter(e.target.value); setPage(0); }} aria-label="Caractère obligatoire" className="rounded-2xl bg-gray-100 px-4 py-3 text-sm font-semibold text-gray-800 outline-none focus:ring-2 focus:ring-[color:var(--logo-pink)] sm:w-48">
          <option value="">Toutes</option>
          <option value="required">Obligatoires</option>
          <option value="optional">Optionnelles</option>
        </select>
      </div>

      {isLoading ? (
        <ListSkeleton rows={6} />
      ) : isError ? (
        <ErrorBlock message="Impossible de charger les exigences." onRetry={() => refetch()} />
      ) : reqs.length === 0 ? (
        <EmptyState icon={ListChecks} title="Aucune exigence" hint={search || requiredFilter ? "Ajustez les filtres." : "Créez la première exigence pour ce propriétaire."} />
      ) : (
        <>
          <HeadRow cols={COLS}>
            <span>Type de document</span>
            <span>Propriétaire</span>
            <span>Caractère</span>
            <span>État</span>
            <span className="text-right">Actions</span>
          </HeadRow>
          <DataCard>
            {slice.map((r) => (
              <div key={r.id} className={`grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 rounded-2xl p-4 max-lg:mb-2 max-lg:bg-gray-50 ${COLS} ${ROW_HOVER}`}>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-gray-900">{r.documentTypeName}</p>
                  <p className="font-mono text-xs text-gray-400">{r.documentTypeCode}</p>
                </div>
                <Cell title="Propriétaire" className="max-lg:order-3 max-lg:col-span-2">
                  <span className="text-sm text-gray-700">{label(OWNER_LABEL, String(r.ownerType))}</span>
                </Cell>
                <div className="max-lg:order-4 max-lg:col-span-2">
                  <StatusChip tone={r.required ? "warn" : "neutral"}>{r.required ? "Obligatoire" : "Optionnelle"}</StatusChip>
                </div>
                <div className="max-lg:order-2 max-lg:justify-self-end">
                  <StatusChip tone={r.active ? "success" : "neutral"}>{r.active ? "Active" : "Inactive"}</StatusChip>
                </div>
                <div className="flex items-center gap-1 max-lg:order-5 max-lg:col-span-2 lg:justify-end">
                  <IconButton icon={Power} label={r.active ? "Désactiver" : "Activer"} tone={r.active ? "success" : "neutral"} pending={toggle.isPending && toggle.variables?.id === r.id} onClick={() => toggle.mutate(r)} />
                  <IconButton icon={Pencil} label="Modifier" onClick={() => { setError(null); setEditing({ id: r.id, form: { ownerType: String(r.ownerType), documentTypeCode: r.documentTypeCode, required: r.required, active: r.active } }); }} />
                  <IconButton
                    icon={Trash2}
                    label="Supprimer"
                    tone="danger"
                    onClick={() =>
                      toast.confirm({
                        message: `Supprimer l'exigence « ${r.documentTypeName} » ?`,
                        confirmLabel: "Supprimer",
                        pendingLabel: "Suppression",
                        successMessage: "Exigence supprimée",
                        errorMessage: "Suppression impossible",
                        onConfirm: () => remove.mutateAsync(r.id),
                      })
                    }
                  />
                </div>
              </div>
            ))}
          </DataCard>
          <Pagination page={page} totalPages={totalPages} total={total} noun="exigence" onChange={setPage} />
        </>
      )}
    </div>
  );
};
