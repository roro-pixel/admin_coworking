import React, { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardList, Save } from "lucide-react";
import { errorCode, pieceFieldService } from "../../services/documentTemplate.service";
import type { PieceField, PieceFields } from "../../services/documentTemplate.service";
import { ActionButton, ErrorBanner, Field, Section, Switch } from "../subscription/kit";
import { FIELD, apiMessage } from "../subscription/kitUtils";
import { toast } from "../ui/toastStore";

type Value = string | number | boolean | null;

/** Le serveur refuse d'imprimer tant qu'un champ obligatoire n'est pas saisi : ouvrir alors ce panneau, puis relancer l'impression. */
export const needsFields = (e: unknown): boolean => errorCode(e) === "CHAMPS_A_SAISIR";

const Input: React.FC<{ f: PieceField; value: Value; onChange: (v: Value) => void }> = ({ f, value, onChange }) => {
  if (f.type === "CHECKBOX") return <Switch checked={value === true} onChange={onChange} label={f.label} hint={f.help ?? undefined} />;
  if (f.type === "LIST")
    return (
      <select className={FIELD} value={String(value ?? "")} onChange={(e) => onChange(e.target.value || null)}>
        <option value="">—</option>
        {(f.options ?? []).map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    );
  const type = f.type === "DATE" ? "date" : f.type === "NUMBER" || f.type === "AMOUNT" ? "number" : "text";
  return <input type={type} className={FIELD} value={String(value ?? "")} onChange={(e) => onChange(e.target.value === "" ? null : e.target.value)} />;
};

/**
 * Encart « Informations complémentaires » d'une pièce (mouvement de caisse, état de besoin, demande de fonds,
 * bon de décaissement). `path` vient de pieceFieldPaths ; les droits sont ceux de la pièce.
 */
export const DocumentFieldsPanel: React.FC<{ path: string; onSaved?: () => void }> = ({ path, onSaved }) => {
  const queryClient = useQueryClient();
  const key = ["piece-fields", path];
  const q = useQuery<PieceFields>({ queryKey: key, queryFn: () => pieceFieldService.get(path), retry: false });
  const [values, setValues] = useState<Record<string, Value>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (q.data) setValues(Object.fromEntries(q.data.fields.filter((f) => f.mode === "CAPTURED").map((f) => [f.key, (f.value ?? null) as Value])));
  }, [q.data]);

  const save = useMutation({
    mutationFn: () => pieceFieldService.save(path, values),
    onSuccess: (data) => {
      queryClient.setQueryData(key, data);
      setError(null);
      toast.success("Informations enregistrées");
      onSaved?.();
    },
    onError: (e) => setError(apiMessage(e, "Enregistrement impossible.")),
  });

  // AUCUN_CHAMP : le modèle publié n'en déclare pas, on masque l'encart.
  if (q.isLoading || q.isError || !q.data || q.data.fields.length === 0) return null;

  const captured = q.data.fields.filter((f) => f.mode === "CAPTURED");
  const blank = q.data.fields.filter((f) => f.mode === "PRINTED_BLANK");

  return (
    <Section title="Informations complémentaires" description="Saisies avant l'impression de la pièce." icon={ClipboardList}>
      <div className="space-y-4 px-3 pb-3">
        {q.data.missingRequired.length > 0 && (
          <p className="rounded-2xl bg-amber-50 px-4 py-2.5 text-sm text-amber-800">À saisir avant d'imprimer : {q.data.missingRequired.join(", ")}.</p>
        )}
        <ErrorBanner message={error} />
        <div className="grid gap-4 sm:grid-cols-2">
          {captured.map((f) => (
            <div key={f.key} className={f.type === "CHECKBOX" ? "sm:col-span-2" : ""}>
              {f.type === "CHECKBOX" ? (
                <Input f={f} value={values[f.key] ?? null} onChange={(v) => setValues({ ...values, [f.key]: v })} />
              ) : (
                <Field label={f.label} required={f.required} hint={f.help ?? undefined}>
                  <Input f={f} value={values[f.key] ?? null} onChange={(v) => setValues({ ...values, [f.key]: v })} />
                </Field>
              )}
            </div>
          ))}
        </div>
        {blank.length > 0 && <p className="text-xs text-gray-500">Zones à remplir à la main sur le papier : {blank.map((f) => f.label).join(", ")}.</p>}
        {captured.length > 0 && (
          <ActionButton icon={Save} pending={save.isPending} onClick={() => save.mutate()}>
            Enregistrer
          </ActionButton>
        )}
      </div>
    </Section>
  );
};
