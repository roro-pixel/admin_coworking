import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Download } from "lucide-react";
import { paymentService } from "../../services/payment.service";
import type { CashMovement } from "../../services/payment.service";
import { useAuth } from "../../contexts/AuthContext";
import { ActionButton, ErrorBanner, Field, ListHeader, Section } from "../../components/subscription/kit";
import { FIELD, apiMessage, formatMoney } from "../../components/subscription/kitUtils";
import { toast } from "../../components/ui/toastStore";
import { PillChoice } from "../../components/operations/opsKit";
import { saveBlob } from "../../components/payment/paymentUtils";

type Kind = "ENTRY" | "EXIT";

const initial = {
  kind: "ENTRY" as Kind,
  sessionNumber: "",
  amount: 0,
  reason: "",
  documentNumber: "",
  flowCategory: "",
  referenceType: "",
  referenceCode: "",
  counterpartyType: "",
  counterpartyCode: "",
  counterpartyName: "",
  metadataJson: "",
};

export const CashVouchersPanel: React.FC = () => {
  const { admin } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(initial);
  const [createdMovement, setCreatedMovement] = useState<CashMovement | null>(null);
  const [createdKind, setCreatedKind] = useState<Kind>("ENTRY");
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  const { data: sessionsData } = useQuery({
    queryKey: ["cash-sessions-open-select"],
    queryFn: () => paymentService.getCashSessions({ status: "OPEN", size: 100 }),
  });
  const sessions = sessionsData?.content || [];

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        amount: form.amount,
        reason: form.reason,
        documentNumber: form.documentNumber || undefined,
        flowCategory: form.flowCategory || undefined,
        referenceType: form.referenceType || undefined,
        referenceCode: form.referenceCode || undefined,
        counterpartyType: form.counterpartyType || undefined,
        counterpartyCode: form.counterpartyCode || undefined,
        counterpartyName: form.counterpartyName || undefined,
        metadataJson: form.metadataJson || undefined,
        createdBy: admin?.email || "admin",
      };
      return form.kind === "ENTRY"
        ? paymentService.createEntryVoucher(form.sessionNumber, payload)
        : paymentService.createExitVoucher(form.sessionNumber, payload);
    },
    onSuccess: (movement) => {
      setCreatedMovement(movement);
      setCreatedKind(form.kind);
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["cash-movements"] });
      toast.success(form.kind === "ENTRY" ? "Bon d'entrée créé" : "Bon de sortie créé");
    },
    onError: (e: unknown) => setError(apiMessage(e, "Erreur lors de la création du bon.")),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.sessionNumber) return setError("La session est obligatoire.");
    if (form.amount <= 0) return setError("Le montant doit être supérieur à 0.");
    if (!form.reason.trim()) return setError("Le motif est obligatoire.");
    setError(null);
    mutation.mutate();
  };

  const download = async () => {
    if (!createdMovement?.movementNumber) return;
    setDownloading(true);
    try {
      const blob = await paymentService.getCashMovementDocumentPdf(createdMovement.movementNumber);
      saveBlob(blob, `${createdKind === "ENTRY" ? "bon_entree" : "bon_sortie"}_${createdMovement.movementNumber}.pdf`);
    } catch {
      toast.error("Téléchargement impossible");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5">
      <ListHeader title="Bons de caisse" subtitle="Créez un bon d'entrée ou un bon de sortie sur une session ouverte." />

      <form onSubmit={submit} className="space-y-5">
        <ErrorBanner message={error} />

        {createdMovement && (
          <div className="flex flex-col gap-3 rounded-[1.75rem] bg-emerald-50 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="shrink-0 text-emerald-600" size={22} />
              <div>
                <p className="font-bold text-emerald-900">
                  Bon créé : <span className="font-mono">{createdMovement.movementNumber}</span>
                </p>
                <p className="text-sm text-emerald-800">{formatMoney(createdMovement.amount ?? form.amount)}</p>
              </div>
            </div>
            <ActionButton variant="ghost" icon={Download} pending={downloading} onClick={download}>
              PDF
            </ActionButton>
          </div>
        )}

        <Section title="Bon" description="Le type et la session concernée.">
          <div className="space-y-4">
            <PillChoice
              label="Type de bon"
              value={form.kind}
              onChange={(v) => setForm({ ...form, kind: v })}
              options={[
                { value: "ENTRY", label: "Bon d'entrée" },
                { value: "EXIT", label: "Bon de sortie" },
              ]}
            />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Session" required>
                <select value={form.sessionNumber} onChange={(e) => setForm({ ...form, sessionNumber: e.target.value })} className={FIELD}>
                  <option value="">Choisir une session ouverte</option>
                  {sessions.map((s) => (
                    <option key={s.sessionNumber} value={s.sessionNumber}>
                      {s.sessionNumber} · {s.registerCode}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Montant (FCFA)" required>
                <input
                  type="number"
                  min={1}
                  value={form.amount || ""}
                  onChange={(e) => setForm({ ...form, amount: Number(e.target.value) || 0 })}
                  placeholder="25000"
                  className={FIELD}
                />
              </Field>
            </div>
            <Field label="Motif" required>
              <textarea rows={3} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} className={FIELD} />
            </Field>
          </div>
        </Section>

        <Section title="Références" description="Tout est facultatif.">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Field label="N° de document">
              <input value={form.documentNumber} onChange={(e) => setForm({ ...form, documentNumber: e.target.value })} className={`${FIELD} font-mono`} />
            </Field>
            <Field label="Catégorie de flux">
              <input value={form.flowCategory} onChange={(e) => setForm({ ...form, flowCategory: e.target.value })} className={FIELD} />
            </Field>
            <Field label="Type de référence">
              <input value={form.referenceType} onChange={(e) => setForm({ ...form, referenceType: e.target.value })} className={FIELD} />
            </Field>
            <Field label="Code de référence">
              <input value={form.referenceCode} onChange={(e) => setForm({ ...form, referenceCode: e.target.value })} className={`${FIELD} font-mono`} />
            </Field>
            <Field label="Type de contrepartie">
              <input value={form.counterpartyType} onChange={(e) => setForm({ ...form, counterpartyType: e.target.value })} className={FIELD} />
            </Field>
            <Field label="Nom de la contrepartie">
              <input value={form.counterpartyName} onChange={(e) => setForm({ ...form, counterpartyName: e.target.value })} className={FIELD} />
            </Field>
            <Field label="Métadonnées JSON" className="md:col-span-2 lg:col-span-3">
              <textarea rows={3} value={form.metadataJson} onChange={(e) => setForm({ ...form, metadataJson: e.target.value })} className={`${FIELD} font-mono`} />
            </Field>
          </div>
        </Section>

        <div className="flex justify-end">
          <ActionButton type="submit" pending={mutation.isPending}>
            {form.kind === "ENTRY" ? "Créer le bon d'entrée" : "Créer le bon de sortie"}
          </ActionButton>
        </div>
      </form>
    </div>
  );
};
