import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Download, FileText } from "lucide-react";
import { paymentService } from "../../services/payment.service";
import type { CashMovement } from "../../services/payment.service";
import { useAuth } from "../../contexts/AuthContext";
import { ActionButton, DataCard, EmptyState, ErrorBanner, Field, ListHeader, Pagination, SearchField, Section, StatusChip } from "../../components/subscription/kit";
import { FIELD, apiMessage, formatDateTime, formatMoney } from "../../components/subscription/kitUtils";
import { toast } from "../../components/ui/toastStore";
import { PillChoice } from "../../components/operations/opsKit";
import { saveBlob } from "../../components/payment/paymentUtils";
import { DocumentFieldsPanel } from "../../components/templates/DocumentFieldsPanel";
import { pieceFieldPaths, readPdfError } from "../../services/documentTemplate.service";
import { cashRegisterService } from "../../services/cashRegister.service";
import { statusOf } from "../../components/subscription/labels";
import { MOVEMENT_STATUS } from "../../components/payment/paymentLabels";
import { CASH_DOCUMENT_TYPE } from "../../components/cash/cashLabels";
import { CashMovementDetail } from "./CashMovementDetail";

type Kind = "ENTRY" | "EXIT";

const initial = {
  kind: "ENTRY" as Kind,
  sessionNumber: "",
  amount: 0,
  reason: "",
  documentType: "",
  natureCode: "",
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
  const [fieldsRefresh, setFieldsRefresh] = useState(0);

  const { data: sessionsData } = useQuery({
    queryKey: ["cash-sessions-open-select"],
    queryFn: () => paymentService.getCashSessions({ status: "OPEN", size: 100 }),
  });
  const sessions = sessionsData?.content || [];

  const natures = useQuery({ queryKey: ["cash-natures", "voucher-form"], queryFn: () => cashRegisterService.getNatures(), staleTime: 300_000 });
  const wanted = form.kind === "ENTRY" ? "IN" : "OUT";
  const natureChoices = (natures.data ?? []).filter((n) => n.active !== false && n.direction === wanted);
  const nature = natureChoices.find((n) => n.code === form.natureCode);

  // Liste des bons de la session choisie
  const [listPage, setListPage] = useState(0);
  const [listSearch, setListSearch] = useState("");
  const [open, setOpen] = useState<CashMovement | null>(null);
  const list = useQuery({
    queryKey: ["cash-vouchers", form.kind, form.sessionNumber, listSearch, listPage],
    queryFn: () => paymentService.getSessionVouchers(form.kind, form.sessionNumber, { searchText: listSearch || undefined, page: listPage, size: 10, sort: "createdAt,desc" }),
    enabled: !!form.sessionNumber,
  });

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        amount: form.amount,
        reason: form.reason,
        documentType: form.documentType || undefined,
        natureCode: form.natureCode || undefined,
        documentNumber: form.documentNumber.trim(),
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
      queryClient.invalidateQueries({ queryKey: ["cash-vouchers"] });
      toast.success(form.kind === "ENTRY" ? "Bon d'entrée créé" : "Bon de sortie créé");
    },
    onError: (e: unknown) => setError(apiMessage(e, "Erreur lors de la création du bon.")),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.sessionNumber) return setError("La session est obligatoire.");
    if (form.amount <= 0) return setError("Le montant doit être supérieur à 0.");
    if (!form.reason.trim()) return setError("Le motif est obligatoire.");
    if (!form.documentNumber.trim()) return setError("Le numéro de document est obligatoire.");
    if (nature?.maxPerOperation && form.amount > nature.maxPerOperation) return setError(`Cette nature est plafonnée à ${formatMoney(nature.maxPerOperation)} par opération.`);
    setError(null);
    mutation.mutate();
  };

  const download = async () => {
    if (!createdMovement?.movementNumber) return;
    setDownloading(true);
    try {
      const blob = await paymentService.getCashMovementDocumentPdf(createdMovement.movementNumber);
      saveBlob(blob, `${createdKind === "ENTRY" ? "bon_entree" : "bon_sortie"}_${createdMovement.movementNumber}.pdf`);
    } catch (e) {
      const { code, message } = await readPdfError(e);
      // CHAMPS_A_SAISIR : le panneau « Informations complémentaires » est juste dessous, on le rafraîchit
      if (code === "CHAMPS_A_SAISIR") setFieldsRefresh((n) => n + 1);
      toast.error(message || "Téléchargement impossible");
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

        {createdMovement?.movementNumber && (
          <DocumentFieldsPanel
            key={`${createdMovement.movementNumber}-${fieldsRefresh}`}
            path={pieceFieldPaths.cashMovement(createdMovement.movementNumber)}
          />
        )}

        <Section title="Bon" description="Le type et la session concernée.">
          <div className="space-y-4">
            <PillChoice
              label="Type de bon"
              value={form.kind}
              onChange={(v) => { setForm({ ...form, kind: v, natureCode: "" }); setListPage(0); }}
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
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Nature" hint={nature ? [nature.accountNumber ? `Compte ${nature.accountNumber}` : "", nature.maxPerOperation ? `plafond ${formatMoney(nature.maxPerOperation)}` : "", nature.priorRequestRequired ? "demande préalable obligatoire" : ""].filter(Boolean).join(" · ") || undefined : "Facultatif."}>
                <select value={form.natureCode} onChange={(e) => setForm({ ...form, natureCode: e.target.value })} className={FIELD}>
                  <option value="">Aucune</option>
                  {natureChoices.map((n) => (
                    <option key={n.code} value={n.code}>
                      {n.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Type de pièce">
                <select value={form.documentType} onChange={(e) => setForm({ ...form, documentType: e.target.value })} className={FIELD}>
                  <option value="">Selon le type de bon</option>
                  {Object.entries(CASH_DOCUMENT_TYPE).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Motif" required>
              <textarea rows={3} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} className={FIELD} />
            </Field>
          </div>
        </Section>

        <Section title="Références" description="Seul le numéro de document est obligatoire.">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Field label="N° de document" required>
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
            <Field label="Code de la contrepartie">
              <input value={form.counterpartyCode} onChange={(e) => setForm({ ...form, counterpartyCode: e.target.value })} className={`${FIELD} font-mono`} />
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

      {form.sessionNumber && (
        <section className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-base font-bold text-gray-950">{form.kind === "ENTRY" ? "Bons d'entrée" : "Bons de sortie"} de la session</h3>
            <SearchField className="sm:w-72" value={listSearch} onChange={(v) => { setListSearch(v); setListPage(0); }} placeholder="N° de document, contrepartie" />
          </div>
          {list.isError ? (
            <p className="text-sm text-red-600">La liste n'a pas pu être chargée.</p>
          ) : (list.data?.content ?? []).length === 0 ? (
            <EmptyState icon={FileText} title="Aucun bon" hint="Aucun bon de ce type sur cette session." />
          ) : (
            <DataCard>
              <div className="divide-y divide-gray-100">
                {(list.data?.content ?? []).map((m) => {
                  const st = statusOf(MOVEMENT_STATUS, m.status ?? "CONFIRMED");
                  return (
                    <button key={m.movementNumber} type="button" onClick={() => setOpen(m)} className="flex w-full items-center justify-between gap-3 p-4 text-left hover:bg-gray-50">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-900">
                          {m.documentNumber || m.movementNumber} <span className="font-normal text-gray-500">{m.counterpartyName ? `· ${m.counterpartyName}` : ""}</span>
                        </p>
                        <p className="truncate text-xs text-gray-500">
                          <span className="font-mono">{m.movementNumber}</span> · {formatDateTime(m.createdAt)}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <StatusChip tone={st.tone}>{st.label}</StatusChip>
                        <span className="text-sm font-bold tabular-nums">{formatMoney(m.amount)}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </DataCard>
          )}
          <Pagination page={listPage} totalPages={list.data?.totalPages ?? 1} total={list.data?.totalElements ?? 0} noun="bon" onChange={setListPage} />
        </section>
      )}

      {open && <CashMovementDetail key={open.movementNumber} movement={open} onClose={() => setOpen(null)} onChanged={() => queryClient.invalidateQueries({ queryKey: ["cash-vouchers"] })} />}
    </div>
  );
};
