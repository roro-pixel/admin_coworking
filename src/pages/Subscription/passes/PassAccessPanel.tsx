import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeftRight, Ban, CheckCircle2, ScanLine, XCircle } from "lucide-react";
import { passAccessService } from "../../../services/passAccess.service";
import type { PassPresentation, PassTransferResult, PassUsageType, PassUseResult, PassValidationChannel, PassValidationResult } from "../../../services/passAccess.service";
import { useAuth } from "../../../contexts/AuthContext";
import { ActionButton, Field, ItemRow, ListHeader, Section } from "../../../components/subscription/kit";
import { FIELD, apiMessage } from "../../../components/subscription/kitUtils";
import { toast } from "../../../components/ui/toastStore";
import { SubscriberPicker } from "../../../components/subscription/promotions/SubscriberPicker";
import type { SubscriberRef } from "../../../components/subscription/promotions/SubscriberPicker";
import { CHANNEL_OPTIONS, USAGE_TYPE_OPTIONS } from "../../../components/subscription/pass/passAccessLabels";
import { TransferCard } from "../../../components/subscription/pass/TransferParts";

type Source = "pass" | "credential";

/** Contrôle d'accès : valider un pass, consommer un usage, annuler un usage, traiter un transfert. */
export const PassAccessPanel: React.FC = () => {
  const { admin } = useAuth();
  const actor = admin?.email || String(admin?.id || "admin");

  const [source, setSource] = useState<Source>("pass");
  const [reference, setReference] = useState("");
  const [bearer, setBearer] = useState<SubscriberRef>({ type: "MEMBER", code: "" });
  const [locationCode, setLocationCode] = useState("");
  const [resourceTypeCode, setResourceTypeCode] = useState("");
  const [validation, setValidation] = useState<PassValidationResult | null>(null);

  const [usageType, setUsageType] = useState<PassUsageType>("CHECK_IN");
  const [channel, setChannel] = useState<PassValidationChannel>("MANUAL");
  const [resourceCode, setResourceCode] = useState("");
  const [referenceType, setReferenceType] = useState("");
  const [referenceCode, setReferenceCode] = useState("");
  const [usage, setUsage] = useState<PassUseResult | null>(null);
  const [useError, setUseError] = useState<string | null>(null);

  const [reverseNumber, setReverseNumber] = useState("");
  const [reverseReason, setReverseReason] = useState("");

  const [transferNumber, setTransferNumber] = useState("");
  const [transfer, setTransfer] = useState<PassTransferResult | null>(null);

  // Le même contexte de présentation sert à valider puis à consommer.
  const presentation = (): PassPresentation => ({
    ...(source === "pass" ? { passNumber: reference.trim() } : { credentialValue: reference.trim() }),
    bearerType: bearer.type,
    bearerCode: bearer.code,
    locationCode: locationCode.trim() || undefined,
    resourceTypeCode: resourceTypeCode.trim() || undefined,
  });
  const resetResults = () => {
    setValidation(null);
    setUsage(null);
    setUseError(null);
  };

  const validate = useMutation({
    mutationFn: () => passAccessService.validate(presentation()),
    onSuccess: (r) => {
      setValidation(r);
      setUsage(null);
      setUseError(null);
    },
    onError: (e) => toast.error(apiMessage(e, "Validation impossible.")),
  });

  const use = useMutation({
    mutationFn: () =>
      passAccessService.use({
        ...presentation(),
        usageType,
        channel,
        resourceCode: resourceCode.trim() || undefined,
        validatedBy: actor,
        referenceType: referenceType.trim() || undefined,
        referenceCode: referenceCode.trim() || undefined,
      }),
    onSuccess: (r) => {
      toast.success("Usage enregistré");
      setUsage(r);
      setUseError(null);
      setReverseNumber(r.usageNumber);
      setValidation((v) => (v ? { ...v, remainingUses: r.remainingUses ?? v.remainingUses } : v));
    },
    onError: (e) => setUseError(apiMessage(e, "Consommation impossible.")),
  });

  const reverse = useMutation({
    mutationFn: () => passAccessService.reverseUsage(reverseNumber.trim(), { reason: reverseReason.trim(), reversedBy: actor }),
    onSuccess: () => {
      setReverseReason("");
      setUsage(null);
    },
  });
  const askReverse = () =>
    toast.confirm({
      message: `Annuler l'usage ${reverseNumber.trim()} ?`,
      detail: `L'utilisation est rendue au pass. Motif : ${reverseReason.trim()}`,
      confirmLabel: "Annuler l'usage",
      pendingLabel: "Annulation",
      successMessage: "Usage annulé",
      errorMessage: "Annulation refusée ou impossible",
      tone: "danger",
      onConfirm: () => reverse.mutateAsync(),
    });

  const canValidate = !!reference.trim() && !!bearer.code;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5">
      <ListHeader title="Contrôle d'accès" subtitle="Valider un pass à l'entrée, consommer un usage, corriger une erreur" />

      <Section title="Valider un pass" description="Vérifie les règles du pass : jour, plage horaire, lieu, ressource, plafonds" icon={ScanLine}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-[14rem_minmax(0,1fr)]">
            <Field label="Présenté sous forme de">
              <select
                className={FIELD}
                value={source}
                onChange={(e) => {
                  setSource(e.target.value as Source);
                  setReference("");
                  resetResults();
                }}
              >
                <option value="pass">N° de pass</option>
                <option value="credential">Contenu scanné</option>
              </select>
            </Field>
            <Field label={source === "pass" ? "N° de pass" : "Contenu du QR code ou du badge"} required>
              <input
                className={`${FIELD} font-mono`}
                value={reference}
                onChange={(e) => {
                  setReference(e.target.value);
                  resetResults();
                }}
                autoFocus
              />
            </Field>
          </div>
          <SubscriberPicker value={bearer} onChange={(b) => { setBearer(b); resetResults(); }} label="Porteur" onGray />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Lieu" hint="Code du lieu où le pass est présenté">
              <input className={`${FIELD} font-mono`} value={locationCode} onChange={(e) => setLocationCode(e.target.value)} />
            </Field>
            <Field label="Type de ressource" hint="Code du type de ressource visée">
              <input className={`${FIELD} font-mono`} value={resourceTypeCode} onChange={(e) => setResourceTypeCode(e.target.value)} />
            </Field>
          </div>
          <div className="flex justify-end">
            <ActionButton icon={ScanLine} pending={validate.isPending} disabled={!canValidate} onClick={() => validate.mutate()}>
              Valider
            </ActionButton>
          </div>

          {validation && (
            <div role="status" className={`flex items-start gap-4 rounded-2xl p-5 ${validation.valid ? "bg-emerald-50 text-emerald-900" : "bg-red-50 text-red-800"}`}>
              {validation.valid ? <CheckCircle2 size={36} className="shrink-0 text-emerald-600" /> : <XCircle size={36} className="shrink-0 text-red-600" />}
              <div className="min-w-0">
                <p className="text-lg font-bold">{validation.valid ? "Accès autorisé" : "Accès refusé"}</p>
                {validation.reason && <p className="mt-1 text-sm">{validation.reason}</p>}
                <p className="mt-1 text-sm">
                  {validation.passNumber && <span className="font-mono font-semibold">{validation.passNumber}</span>}
                  {validation.remainingUses !== null && validation.remainingUses !== undefined && ` · ${validation.remainingUses} utilisation${validation.remainingUses > 1 ? "s" : ""} restante${validation.remainingUses > 1 ? "s" : ""}`}
                </p>
              </div>
            </div>
          )}
        </div>
      </Section>

      {validation?.valid && (
        <Section title="Consommer un usage" description="À faire à l'entrée effective, après la validation" icon={CheckCircle2}>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Field label="Type d'usage" required>
                <select className={FIELD} value={usageType} onChange={(e) => setUsageType(e.target.value as PassUsageType)}>
                  {USAGE_TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Canal" required>
                <select className={FIELD} value={channel} onChange={(e) => setChannel(e.target.value as PassValidationChannel)}>
                  {CHANNEL_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Ressource">
                <input className={`${FIELD} font-mono`} value={resourceCode} onChange={(e) => setResourceCode(e.target.value)} />
              </Field>
              <Field label="Type de référence" hint="Ex. BOOKING">
                <input className={`${FIELD} font-mono`} value={referenceType} onChange={(e) => setReferenceType(e.target.value)} />
              </Field>
              <Field label="Code de référence">
                <input className={`${FIELD} font-mono`} value={referenceCode} onChange={(e) => setReferenceCode(e.target.value)} />
              </Field>
            </div>
            {useError && (
              <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
                {useError}
              </p>
            )}
            <div className="flex justify-end">
              <ActionButton icon={CheckCircle2} pending={use.isPending} onClick={() => use.mutate()}>
                Consommer l'usage
              </ActionButton>
            </div>
            {usage && (
              <ItemRow>
                <p className="text-sm font-bold text-gray-950">Usage enregistré</p>
                <p className="mt-1 text-sm text-gray-600">
                  <span className="font-mono font-semibold">{usage.usageNumber}</span> sur {usage.passNumber}
                  {usage.remainingUses !== null && usage.remainingUses !== undefined && ` · ${usage.remainingUses} utilisation${usage.remainingUses > 1 ? "s" : ""} restante${usage.remainingUses > 1 ? "s" : ""}`}
                </p>
              </ItemRow>
            )}
          </div>
        </Section>
      )}

      <Section title="Annuler un usage" description="Rend l'utilisation au pass en cas d'erreur de saisie ou d'entrée refusée" icon={Ban}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_auto] md:items-end">
          <Field label="N° d'usage" required>
            <input className={`${FIELD} font-mono`} value={reverseNumber} onChange={(e) => setReverseNumber(e.target.value)} />
          </Field>
          <Field label="Motif" required>
            <input className={FIELD} value={reverseReason} onChange={(e) => setReverseReason(e.target.value)} />
          </Field>
          <ActionButton variant="danger" icon={Ban} disabled={!reverseNumber.trim() || !reverseReason.trim()} onClick={askReverse}>
            Annuler l'usage
          </ActionButton>
        </div>
      </Section>

      <Section title="Traiter un transfert" description="Accepter, rejeter ou annuler un transfert de pass à partir de son numéro" icon={ArrowLeftRight}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
            <Field label="N° de transfert">
              <input
                className={`${FIELD} font-mono`}
                value={transferNumber}
                onChange={(e) => {
                  setTransferNumber(e.target.value);
                  setTransfer(null);
                }}
              />
            </Field>
            <ActionButton variant="ghost" icon={ArrowLeftRight} disabled={!transferNumber.trim()} onClick={() => setTransfer({ transferNumber: transferNumber.trim(), status: "PENDING_ACCEPTANCE" })}>
              Ouvrir
            </ActionButton>
          </div>
          <p className="text-xs text-gray-500">Le statut actuel n'est pas consultable : l'état affiché est celui d'un transfert en attente, le backend refuse l'action si ce n'est plus le cas.</p>
          {transfer && <TransferCard transfer={transfer} onChange={setTransfer} />}
        </div>
      </Section>
    </div>
  );
};
