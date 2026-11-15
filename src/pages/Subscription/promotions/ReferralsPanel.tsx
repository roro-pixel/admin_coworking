import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link2, UserCheck, UserX } from "lucide-react";
import { pricingService } from "../../../services/pricing.service";
import type { ReferralLink, ReferralRecord } from "../../../services/pricing.service";
import { ActionButton, Field, ListHeader, Section } from "../../../components/subscription/kit";
import { FIELD_SOFT, apiMessage } from "../../../components/subscription/kitUtils";
import { toast } from "../../../components/ui/toastStore";
import { SubscriberPicker } from "../../../components/subscription/promotions/SubscriberPicker";
import type { SubscriberRef } from "../../../components/subscription/promotions/SubscriberPicker";
import { OpenReport } from "../../../components/subscription/promotions/OpenReport";

/** Parrainage : lien d'un parrain, enregistrement d'un filleul et rejet d'un parrainage. */
export const ReferralsPanel: React.FC = () => {
  const [programCode, setProgramCode] = useState("");
  const [referrer, setReferrer] = useState<SubscriberRef>({ type: "MEMBER", code: "" });
  const [link, setLink] = useState<ReferralLink | null>(null);

  const [linkCode, setLinkCode] = useState("");
  const [referee, setReferee] = useState<SubscriberRef>({ type: "MEMBER", code: "" });
  const [registered, setRegistered] = useState<ReferralRecord | null>(null);

  const [referralNumber, setReferralNumber] = useState("");
  const [rejectReason, setRejectReason] = useState("");

  const linkMutation = useMutation({
    mutationFn: () => pricingService.getReferralLink({ programCode: programCode.trim(), referrerType: referrer.type, referrerCode: referrer.code }),
    onSuccess: (l) => {
      setLink(l);
      setLinkCode(l.linkCode ?? "");
    },
    onError: (e) => {
      setLink(null);
      toast.error(apiMessage(e, "Lien introuvable pour ce programme et ce parrain."));
    },
  });

  const registerMutation = useMutation({
    mutationFn: () => pricingService.registerReferral({ linkCode: linkCode.trim(), refereeType: referee.type, refereeCode: referee.code }),
    onSuccess: (r) => {
      toast.success("Filleul enregistré");
      setRegistered(r);
      setReferee({ type: referee.type, code: "" });
    },
    onError: (e) => toast.error(apiMessage(e, "Enregistrement impossible.")),
  });

  const rejectMutation = useMutation({
    mutationFn: () => pricingService.rejectReferral(referralNumber.trim(), rejectReason.trim()),
    onSuccess: () => {
      setReferralNumber("");
      setRejectReason("");
    },
  });

  const askReject = () =>
    toast.confirm({
      message: `Rejeter le parrainage ${referralNumber.trim()} ?`,
      detail: `La récompense du parrain ne sera pas accordée. Motif : ${rejectReason.trim()}`,
      confirmLabel: "Rejeter",
      pendingLabel: "Rejet en cours",
      successMessage: "Parrainage rejeté",
      errorMessage: "Rejet refusé ou impossible",
      onConfirm: () => rejectMutation.mutateAsync(),
    });

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5">
      <ListHeader title="Parrainage" subtitle="Lien d'un parrain, enregistrement d'un filleul et rejet d'un parrainage." />

      <Section title="Lien de parrainage" description="Le lien d'un abonné dans un programme" icon={Link2}>
        <div className="space-y-4">
          <Field label="Code du programme" required hint="Les programmes sont gérés en base : le code se saisit à la main.">
            <input className={`${FIELD_SOFT} !bg-white`} value={programCode} onChange={(e) => setProgramCode(e.target.value)} />
          </Field>
          <SubscriberPicker value={referrer} onChange={setReferrer} label="Parrain" />
          <div className="flex justify-end">
            <ActionButton icon={Link2} pending={linkMutation.isPending} disabled={!programCode.trim() || !referrer.code} onClick={() => linkMutation.mutate()}>
              Chercher le lien
            </ActionButton>
          </div>
          {link && <OpenReport title="Lien de parrainage" data={link} onClose={() => setLink(null)} />}
        </div>
      </Section>

      <Section title="Enregistrer un filleul" description="Rattache un abonné au lien d'un parrain" icon={UserCheck}>
        <div className="space-y-4">
          <Field label="Code du lien" required hint="Repris automatiquement du lien recherché ci-dessus.">
            <input className={`${FIELD_SOFT} !bg-white font-mono`} value={linkCode} onChange={(e) => setLinkCode(e.target.value)} />
          </Field>
          <SubscriberPicker value={referee} onChange={setReferee} label="Filleul" />
          <div className="flex justify-end">
            <ActionButton icon={UserCheck} pending={registerMutation.isPending} disabled={!linkCode.trim() || !referee.code} onClick={() => registerMutation.mutate()}>
              Enregistrer le filleul
            </ActionButton>
          </div>
          {registered && (
            <OpenReport
              title="Parrainage enregistré"
              data={registered}
              onClose={() => setRegistered(null)}
            />
          )}
        </div>
      </Section>

      <Section title="Rejeter un parrainage" description="Pour un parrainage frauduleux ou invalide" icon={UserX}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="N° de parrainage" required>
            <input className={`${FIELD_SOFT} !bg-white font-mono`} value={referralNumber} onChange={(e) => setReferralNumber(e.target.value)} />
          </Field>
          <Field label="Motif" required>
            <input className={`${FIELD_SOFT} !bg-white`} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
          </Field>
        </div>
        <div className="mt-4 flex justify-end">
          <ActionButton variant="danger" icon={UserX} disabled={!referralNumber.trim() || !rejectReason.trim()} onClick={askReject}>
            Rejeter
          </ActionButton>
        </div>
      </Section>
    </div>
  );
};
