import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Forward, History, PackageCheck, ScanLine, Trash2, Undo2 } from "lucide-react";
import { domiciliationService } from "../../services/domiciliation.service";
import type { MailItemType, MailItemView } from "../../services/domiciliation.service";
import { ActionButton, ErrorBanner, Field, PanelForm, StatusChip, Tag } from "../subscription/kit";
import { FIELD_SOFT, formatDate, formatDateTime, formatMoney, formatNumber, apiMessage } from "../subscription/kitUtils";
import { statusOf } from "../subscription/labels";
import { humanKey } from "../subscription/promotions/promoLabels";
import { Skeleton } from "../ui/Skeleton";
import { toast } from "../ui/toastStore";
import { MAIL_EVENT_LABEL, MAIL_FINAL_STATUS, MAIL_STATUS, MAIL_TYPE_LABEL, MAIL_TYPE_OPTIONS } from "./serviceLabels";

/** Clé de cache commune : toute action sur un courrier rafraîchit les listes qui le montrent. */
export const MAIL_KEY = "domiciliation-mail";

type Mode = null | "scan" | "collect" | "forward" | "return" | "destroy";

/** Piste d'audit d'un courrier, chargée à l'ouverture. */
const MailTrail: React.FC<{ itemNumber: string }> = ({ itemNumber }) => {
  const { data, isLoading, isError } = useQuery({
    queryKey: [MAIL_KEY, "trail", itemNumber],
    queryFn: () => domiciliationService.getMailTrail(itemNumber),
  });
  if (isLoading) return <Skeleton className="h-16 w-full rounded-xl" />;
  if (isError) return <ErrorBanner message="Impossible de charger l'historique de ce courrier." />;
  if (!data || data.length === 0) return <p className="text-sm text-gray-500">Aucun événement enregistré.</p>;
  return (
    <ol className="space-y-2">
      {data.map((e, i) => (
        <li key={i} className="flex items-start justify-between gap-3 rounded-xl bg-white px-3 py-2 text-sm shadow-sm">
          <div className="min-w-0">
            <p className="font-semibold text-gray-900">{MAIL_EVENT_LABEL[e.eventType] ?? humanKey(e.eventType)}</p>
            {e.details && <p className="break-words text-xs text-gray-500">{e.details}</p>}
            {e.actor && <p className="text-xs text-gray-400">Par {e.actor}</p>}
          </div>
          <p className="shrink-0 text-xs text-gray-500">{formatDateTime(e.occurredAt)}</p>
        </li>
      ))}
    </ol>
  );
};

/**
 * Un courrier : informations, actes possibles et historique.
 * Chaque acte ouvre son petit formulaire sous la ligne ; retour et destruction demandent une confirmation.
 */
export const MailRow: React.FC<{ item: MailItemView; showContract?: boolean }> = ({ item, showContract = true }) => {
  const qc = useQueryClient();
  const [mode, setMode] = useState<Mode>(null);
  const [trail, setTrail] = useState(false);
  const [scanCode, setScanCode] = useState("");
  const [collect, setCollect] = useState({ collectedBy: "", collectorIdDocument: "", collectorSignatureUrl: "" });
  const [forward, setForward] = useState({ trackingNumber: "", transportCost: "" });
  const [reason, setReason] = useState("");

  const st = statusOf(MAIL_STATUS, item.status);
  const final = MAIL_FINAL_STATUS.includes(item.status);
  const refresh = () => qc.invalidateQueries({ queryKey: [MAIL_KEY] });
  const close = () => {
    setMode(null);
    setScanCode("");
    setCollect({ collectedBy: "", collectorIdDocument: "", collectorSignatureUrl: "" });
    setForward({ trackingNumber: "", transportCost: "" });
    setReason("");
  };
  const done = (message: string) => () => {
    toast.success(message);
    close();
    refresh();
  };
  const fail = (fallback: string) => (e: unknown) => toast.error(apiMessage(e, fallback));

  const scanMutation = useMutation({
    mutationFn: () => domiciliationService.scanMail(item.itemNumber, scanCode.trim()),
    onSuccess: done("Courrier scanné"),
    onError: fail("Scan impossible."),
  });
  const collectMutation = useMutation({
    mutationFn: () =>
      domiciliationService.collectMail(item.itemNumber, {
        collectedBy: collect.collectedBy.trim(),
        collectorIdDocument: collect.collectorIdDocument.trim() || undefined,
        collectorSignatureUrl: collect.collectorSignatureUrl.trim() || undefined,
      }),
    onSuccess: done("Retrait enregistré"),
    onError: fail("Retrait impossible."),
  });
  const forwardMutation = useMutation({
    mutationFn: () =>
      domiciliationService.forwardMail(item.itemNumber, {
        trackingNumber: forward.trackingNumber.trim() || undefined,
        transportCost: forward.transportCost ? Number(forward.transportCost) : undefined,
      }),
    onSuccess: done("Courrier réexpédié"),
    onError: fail("Réexpédition impossible."),
  });
  const returnMutation = useMutation({
    mutationFn: () => domiciliationService.returnMail(item.itemNumber, reason.trim()),
    onSuccess: refresh,
  });
  const destroyMutation = useMutation({
    mutationFn: () => domiciliationService.destroyMail(item.itemNumber, reason.trim()),
    onSuccess: refresh,
  });

  const askReturn = () =>
    toast.confirm({
      message: `Retourner le courrier ${item.itemNumber} à l'expéditeur ?`,
      detail: `Motif : ${reason.trim()}`,
      confirmLabel: "Retourner",
      pendingLabel: "Retour en cours",
      successMessage: "Courrier retourné",
      errorMessage: "Le retour a été refusé",
      onConfirm: async () => {
        await returnMutation.mutateAsync();
        close();
      },
    });
  const askDestroy = () =>
    toast.confirm({
      message: `Détruire le courrier ${item.itemNumber} ?`,
      detail: `Action définitive. Motif : ${reason.trim()}`,
      confirmLabel: "Détruire",
      pendingLabel: "Destruction en cours",
      successMessage: "Courrier détruit",
      errorMessage: "La destruction a été refusée",
      onConfirm: async () => {
        await destroyMutation.mutateAsync();
        close();
      },
    });

  const open = (m: Exclude<Mode, null>) => setMode(mode === m ? null : m);
  const btn = "!px-3.5 !py-2 !text-xs";

  return (
    <div className="rounded-2xl bg-gray-50 p-4">
      <div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-semibold text-gray-900">{item.itemNumber}</span>
            <Tag>{MAIL_TYPE_LABEL[item.mailType ?? ""] ?? item.mailType ?? "Autre"}</Tag>
            <StatusChip tone={st.tone}>{st.label}</StatusChip>
          </div>
          <p className="mt-1.5 break-words text-sm text-gray-700">
            {item.senderName || "Expéditeur non renseigné"}
            {item.senderReference && <span className="text-gray-400"> · {item.senderReference}</span>}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {showContract && item.contractNumber && (
              <>
                <Link
                  to={`/services/contracts/${encodeURIComponent(item.contractNumber)}`}
                  className="font-mono font-semibold text-[color:var(--logo-pink-dark)] hover:underline"
                >
                  {item.contractNumber}
                </Link>
                {" · "}
              </>
            )}
            {item.weightGrams != null && `${formatNumber(item.weightGrams)} g`}
            {item.weightGrams != null && item.dimensions && " · "}
            {item.dimensions}
          </p>
          {item.notes && <p className="mt-1 break-words text-xs text-gray-500">{item.notes}</p>}
          {item.storageDeadline && (
            <p className="mt-1 text-xs text-amber-600">Garde payante à partir du {formatDate(item.storageDeadline)}</p>
          )}
          {item.billable && item.billedAmount != null && (
            <p className="mt-1 text-xs font-semibold text-emerald-700">Facturé : {formatMoney(item.billedAmount)}</p>
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {!final && (
            <>
              {item.status !== "SCANNED" && (
                <ActionButton variant="ghost" icon={ScanLine} className={btn} onClick={() => open("scan")}>
                  Scanner
                </ActionButton>
              )}
              <ActionButton variant="ghost" icon={PackageCheck} className={btn} onClick={() => open("collect")}>
                Retrait
              </ActionButton>
              <ActionButton variant="ghost" icon={Forward} className={btn} onClick={() => open("forward")}>
                Réexpédier
              </ActionButton>
              <ActionButton variant="ghost" icon={Undo2} className={btn} onClick={() => open("return")}>
                Retourner
              </ActionButton>
              <ActionButton variant="ghost" icon={Trash2} className={btn} onClick={() => open("destroy")}>
                Détruire
              </ActionButton>
            </>
          )}
          <ActionButton variant="ghost" icon={History} className={btn} onClick={() => setTrail(!trail)}>
            Historique
            <ChevronDown size={14} className={`transition ${trail ? "rotate-180" : ""}`} />
          </ActionButton>
        </div>
      </div>

      {mode === "scan" && (
        <div className="mt-4">
          <PanelForm
            title="Scanner le courrier"
            pending={scanMutation.isPending}
            submitLabel="Enregistrer le scan"
            submitDisabled={!scanCode.trim()}
            onCancel={close}
            onSubmit={(e) => {
              e.preventDefault();
              scanMutation.mutate();
            }}
          >
            <Field label="Code du document scanné" required hint="Le scan est facturé à l'acte.">
              <input className={FIELD_SOFT} value={scanCode} onChange={(e) => setScanCode(e.target.value)} />
            </Field>
          </PanelForm>
        </div>
      )}

      {mode === "collect" && (
        <div className="mt-4">
          <PanelForm
            title="Retrait au guichet"
            pending={collectMutation.isPending}
            submitLabel="Enregistrer le retrait"
            submitDisabled={!collect.collectedBy.trim()}
            onCancel={close}
            onSubmit={(e) => {
              e.preventDefault();
              collectMutation.mutate();
            }}
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Retiré par" required>
                <input className={FIELD_SOFT} value={collect.collectedBy} onChange={(e) => setCollect({ ...collect, collectedBy: e.target.value })} />
              </Field>
              <Field label="Pièce d'identité présentée">
                <input
                  className={FIELD_SOFT}
                  value={collect.collectorIdDocument}
                  onChange={(e) => setCollect({ ...collect, collectorIdDocument: e.target.value })}
                />
              </Field>
              <Field label="Lien de la signature" className="md:col-span-2">
                <input
                  className={FIELD_SOFT}
                  value={collect.collectorSignatureUrl}
                  onChange={(e) => setCollect({ ...collect, collectorSignatureUrl: e.target.value })}
                />
              </Field>
            </div>
          </PanelForm>
        </div>
      )}

      {mode === "forward" && (
        <div className="mt-4">
          <PanelForm
            title="Réexpédier le courrier"
            pending={forwardMutation.isPending}
            submitLabel="Enregistrer la réexpédition"
            onCancel={close}
            onSubmit={(e) => {
              e.preventDefault();
              forwardMutation.mutate();
            }}
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="N° de suivi">
                <input className={FIELD_SOFT} value={forward.trackingNumber} onChange={(e) => setForward({ ...forward, trackingNumber: e.target.value })} />
              </Field>
              <Field label="Coût du transport" hint="La réexpédition est facturée à l'acte.">
                <input
                  type="number"
                  min={0}
                  className={FIELD_SOFT}
                  value={forward.transportCost}
                  onChange={(e) => setForward({ ...forward, transportCost: e.target.value })}
                />
              </Field>
            </div>
          </PanelForm>
        </div>
      )}

      {(mode === "return" || mode === "destroy") && (
        <div className="mt-4">
          <PanelForm
            title={mode === "return" ? "Retourner à l'expéditeur" : "Détruire le courrier"}
            pending={false}
            submitLabel={mode === "return" ? "Retourner" : "Détruire"}
            submitDisabled={!reason.trim()}
            onCancel={close}
            onSubmit={(e) => {
              e.preventDefault();
              if (mode === "return") askReturn();
              else askDestroy();
            }}
          >
            <Field label="Motif" required>
              <textarea className={FIELD_SOFT} rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
            </Field>
          </PanelForm>
        </div>
      )}

      {trail && (
        <div className="mt-4">
          <MailTrail itemNumber={item.itemNumber} />
        </div>
      )}
    </div>
  );
};

/** Réception d'un courrier. Sans contrat imposé, le choix se fait parmi les contrats actifs. */
export const ReceiveMailForm: React.FC<{ contractNumber?: string; onDone: () => void; onCancel: () => void }> = ({
  contractNumber,
  onDone,
  onCancel,
}) => {
  const qc = useQueryClient();
  const [contract, setContract] = useState(contractNumber ?? "");
  const [form, setForm] = useState({ mailType: "LETTER", senderName: "", senderReference: "", weightGrams: "", dimensions: "", notes: "" });

  const { data: contracts, isLoading } = useQuery({
    queryKey: ["domiciliation-contracts", "active-choice"],
    queryFn: () => domiciliationService.getContracts({ status: "ACTIVE", size: 100 }),
    enabled: !contractNumber,
  });

  const mutation = useMutation({
    mutationFn: () =>
      domiciliationService.receiveMail(contract, {
        mailType: form.mailType as MailItemType,
        senderName: form.senderName.trim() || undefined,
        senderReference: form.senderReference.trim() || undefined,
        weightGrams: form.weightGrams ? Number(form.weightGrams) : undefined,
        dimensions: form.dimensions.trim() || undefined,
        notes: form.notes.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success("Courrier réceptionné, le domicilié est prévenu");
      qc.invalidateQueries({ queryKey: [MAIL_KEY] });
      onDone();
    },
    onError: (e) => toast.error(apiMessage(e, "Réception impossible.")),
  });

  return (
    <PanelForm
      title="Réceptionner un courrier"
      pending={mutation.isPending}
      submitLabel="Réceptionner"
      submitDisabled={!contract}
      onCancel={onCancel}
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate();
      }}
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {!contractNumber && (
          <Field label="Contrat de domiciliation" required className="md:col-span-2">
            <select className={FIELD_SOFT} value={contract} onChange={(e) => setContract(e.target.value)} disabled={isLoading}>
              <option value="">{isLoading ? "Chargement des contrats" : "Choisir un contrat actif"}</option>
              {(contracts?.content ?? []).map((c) => (
                <option key={c.contractNumber} value={c.contractNumber}>
                  {c.legalName} ({c.contractNumber})
                </option>
              ))}
            </select>
          </Field>
        )}
        <Field label="Type de courrier" required>
          <select className={FIELD_SOFT} value={form.mailType} onChange={(e) => setForm({ ...form, mailType: e.target.value })}>
            {MAIL_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Expéditeur">
          <input className={FIELD_SOFT} value={form.senderName} onChange={(e) => setForm({ ...form, senderName: e.target.value })} />
        </Field>
        <Field label="Référence de l'expéditeur">
          <input className={FIELD_SOFT} value={form.senderReference} onChange={(e) => setForm({ ...form, senderReference: e.target.value })} />
        </Field>
        <Field label="Poids (g)">
          <input type="number" min={0} className={FIELD_SOFT} value={form.weightGrams} onChange={(e) => setForm({ ...form, weightGrams: e.target.value })} />
        </Field>
        <Field label="Dimensions" className="md:col-span-2">
          <input className={FIELD_SOFT} placeholder="30 x 20 x 5 cm" value={form.dimensions} onChange={(e) => setForm({ ...form, dimensions: e.target.value })} />
        </Field>
        <Field label="Notes" className="md:col-span-2">
          <textarea className={FIELD_SOFT} rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </Field>
      </div>
    </PanelForm>
  );
};
