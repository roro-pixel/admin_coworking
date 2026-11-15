import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { GitCompareArrows, Pencil, Plus, Trash2 } from "lucide-react";
import { documentService } from "../../services/document.service";
import type { KycCrossValidationRuleRequest, KycCrossValidationRuleResponse } from "../../services/document.service";
import { ActionButton, DataCard, EmptyState, ErrorBlock, Field, HeadRow, IconButton, ListHeader, PanelForm, StatusChip, Switch } from "../../components/subscription/kit";
import { FIELD, ROW_HOVER, apiMessage } from "../../components/subscription/kitUtils";
import { ListSkeleton } from "../../components/ui/Skeleton";
import { toast } from "../../components/ui/toastStore";
import { Cell } from "../../components/documents/docKit";

const COLS = "lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.8fr)_7rem_7rem_6rem]";
const EMPTY: KycCrossValidationRuleRequest = { documentTypeCode1: "", documentTypeCode2: "", fieldToCompare: "", blocking: true, active: true };

export const KycCrossValidationPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<{ id: number | null; form: KycCrossValidationRuleRequest } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: rules = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["kyc-cross-validation-rules"],
    queryFn: () => documentService.getKycCrossValidationRules({ activeOnly: false }),
  });
  const { data: types = [] } = useQuery({
    queryKey: ["documentTypes", "kyc-cross-validation"],
    queryFn: () => documentService.getDocumentTypes(),
  });
  const typeName = (code: string) => types.find((t) => t.code === code)?.name ?? code;

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["kyc-cross-validation-rules"] });

  const save = useMutation({
    mutationFn: () => {
      const f = editing!.form;
      const body = { documentTypeCode1: f.documentTypeCode1, documentTypeCode2: f.documentTypeCode2, fieldToCompare: f.fieldToCompare.trim(), blocking: f.blocking, active: f.active };
      return editing!.id === null ? documentService.createKycCrossValidationRule(body) : documentService.updateKycCrossValidationRule(editing!.id, body);
    },
    onSuccess: () => {
      toast.success(editing?.id === null ? "Règle créée" : "Règle modifiée");
      refresh();
      setEditing(null);
      setError(null);
    },
    onError: (e) => setError(apiMessage(e, "Enregistrement impossible")),
  });

  const remove = useMutation({
    mutationFn: (id: number) => documentService.deleteKycCrossValidationRule(id),
    onSuccess: refresh,
  });
  const askDelete = (r: KycCrossValidationRuleResponse) =>
    toast.confirm({
      message: "Supprimer cette règle ?",
      detail: `${typeName(r.documentTypeCode1)} et ${typeName(r.documentTypeCode2)}, champ ${r.fieldToCompare}.`,
      confirmLabel: "Supprimer",
      pendingLabel: "Suppression",
      successMessage: "Règle supprimée",
      errorMessage: "Suppression impossible",
      onConfirm: () => remove.mutateAsync(r.id),
    });

  const f = editing?.form;
  const set = (patch: Partial<KycCrossValidationRuleRequest>) => setEditing((p) => (p ? { ...p, form: { ...p.form, ...patch } } : p));
  const valid = !!f && f.documentTypeCode1 !== "" && f.documentTypeCode2 !== "" && f.fieldToCompare.trim() !== "" && f.documentTypeCode1 !== f.documentTypeCode2;

  const typeSelect = (value: string, onChange: (v: string) => void) => (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={FIELD}>
      <option value="">Choisir un type</option>
      {types.map((t) => (
        <option key={t.code} value={t.code}>
          {t.name}
        </option>
      ))}
    </select>
  );

  return (
    <div className="space-y-5">
      <ListHeader
        title="Validation croisée"
        subtitle="Règles qui comparent un champ entre deux documents d'un même dossier"
        action={
          <ActionButton icon={Plus} onClick={() => { setError(null); setEditing({ id: null, form: EMPTY }); }}>
            Nouvelle règle
          </ActionButton>
        }
      />

      {editing && f && (
        <PanelForm
          title={editing.id === null ? "Nouvelle règle" : "Modifier la règle"}
          onCancel={() => setEditing(null)}
          pending={save.isPending}
          submitLabel={editing.id === null ? "Créer" : "Enregistrer"}
          submitDisabled={!valid}
          error={error}
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Premier document" required>
              {typeSelect(f.documentTypeCode1, (v) => set({ documentTypeCode1: v }))}
            </Field>
            <Field label="Second document" required error={f.documentTypeCode1 && f.documentTypeCode1 === f.documentTypeCode2 ? "Choisissez deux types différents." : undefined}>
              {typeSelect(f.documentTypeCode2, (v) => set({ documentTypeCode2: v }))}
            </Field>
          </div>
          <Field label="Champ à comparer" required hint="Nom du champ présent sur les deux documents.">
            <input value={f.fieldToCompare} onChange={(e) => set({ fieldToCompare: e.target.value })} className={`${FIELD} font-mono`} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Switch checked={!!f.blocking} onChange={(v) => set({ blocking: v })} label="Bloquante" hint="Un écart empêche l'approbation du dossier." />
            <Switch checked={!!f.active} onChange={(v) => set({ active: v })} label="Active" />
          </div>
        </PanelForm>
      )}

      {isLoading ? (
        <ListSkeleton rows={4} />
      ) : isError ? (
        <ErrorBlock message="Impossible de charger les règles." onRetry={() => refetch()} />
      ) : rules.length === 0 ? (
        <EmptyState icon={GitCompareArrows} title="Aucune règle de validation croisée" hint="Créez une règle pour comparer un champ entre deux documents." />
      ) : (
        <>
          <HeadRow cols={COLS}>
            <span>Premier document</span>
            <span>Second document</span>
            <span>Champ</span>
            <span>Mode</span>
            <span>État</span>
            <span className="text-right">Actions</span>
          </HeadRow>
          <DataCard>
            {rules.map((r) => (
              <div key={r.id} className={`grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 rounded-2xl p-4 max-lg:mb-2 max-lg:bg-gray-50 ${COLS} ${ROW_HOVER}`}>
                <p className="min-w-0 truncate text-sm font-semibold text-gray-900">{typeName(r.documentTypeCode1)}</p>
                <div className="flex gap-1 max-lg:order-2 lg:hidden">
                  <IconButton icon={Pencil} label="Modifier" onClick={() => { setError(null); setEditing({ id: r.id, form: { documentTypeCode1: r.documentTypeCode1, documentTypeCode2: r.documentTypeCode2, fieldToCompare: r.fieldToCompare, blocking: r.blocking, active: r.active } }); }} />
                  <IconButton icon={Trash2} label="Supprimer" tone="danger" onClick={() => askDelete(r)} />
                </div>
                <Cell title="Avec" className="max-lg:order-3 max-lg:col-span-2">
                  <span className="text-sm font-semibold text-gray-900">{typeName(r.documentTypeCode2)}</span>
                </Cell>
                <Cell title="Champ" className="max-lg:order-4 max-lg:col-span-2">
                  <span className="font-mono text-xs text-gray-700">{r.fieldToCompare}</span>
                </Cell>
                <div className="max-lg:order-5">
                  <StatusChip tone={r.blocking ? "warn" : "neutral"}>{r.blocking ? "Bloquante" : "Informative"}</StatusChip>
                </div>
                <div className="max-lg:order-6 max-lg:justify-self-end">
                  <StatusChip tone={r.active ? "success" : "neutral"}>{r.active ? "Active" : "Inactive"}</StatusChip>
                </div>
                <div className="hidden justify-end gap-1 lg:flex">
                  <IconButton icon={Pencil} label="Modifier" onClick={() => { setError(null); setEditing({ id: r.id, form: { documentTypeCode1: r.documentTypeCode1, documentTypeCode2: r.documentTypeCode2, fieldToCompare: r.fieldToCompare, blocking: r.blocking, active: r.active } }); }} />
                  <IconButton icon={Trash2} label="Supprimer" tone="danger" onClick={() => askDelete(r)} />
                </div>
              </div>
            ))}
          </DataCard>
        </>
      )}
    </div>
  );
};
