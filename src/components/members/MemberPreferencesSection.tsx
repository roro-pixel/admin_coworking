import React, { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Save, SlidersHorizontal } from "lucide-react";
import { memberSettingsService, NOTIFICATION_CHANNELS, NOTIFICATION_EVENTS } from "../../services/memberSettings.service";
import type {
  MemberSettings,
  NotificationChannel,
  NotificationEvent,
  NotificationPref,
} from "../../services/memberSettings.service";
import { ActionButton, ErrorBlock, Field, Section, Switch } from "../subscription/kit";
import { FIELD, apiMessage } from "../subscription/kitUtils";
import { ListSkeleton } from "../ui/Skeleton";
import { toast } from "../ui/toastStore";

const KEY = "member-settings";

const EVENT_LABEL: Record<NotificationEvent, string> = {
  BOOKING_CONFIRMED: "Réservation confirmée",
  BOOKING_CANCELLED: "Réservation annulée",
  BOOKING_REMINDER: "Rappel de réservation",
  BOOKING_FAILED: "Réservation échouée",
  INVOICE_ISSUED: "Facture émise",
  PAYMENT_RECEIVED: "Paiement reçu",
  PAYMENT_FAILED: "Paiement échoué",
};
const CHANNEL_LABEL: Record<NotificationChannel, string> = {
  SMS: "SMS",
  WHATSAPP: "WhatsApp",
  IN_APP: "Application",
  PUSH: "Push",
  EMAIL: "E-mail",
};

const numText = (n?: number | null) => (n === null || n === undefined ? "" : String(n));
const EMAIL_RE = /^[^\s@,]+@[^\s@,]+\.[^\s@,]+$/;

/** Retourne un message d'erreur, ou null si le formulaire peut partir. */
const validate = (f: MemberSettings): string | null => {
  const b = f.billingPref ?? {};
  if ((b.billingCompanyName ?? "").length > 255) return "Le nom de l'entreprise dépasse 255 caractères.";
  if ((b.billlingAddress ?? "").length > 255) return "L'adresse de facturation dépasse 255 caractères.";
  const emails = (b.billingEmail ?? "").split(",").map((e) => e.trim()).filter(Boolean);
  if ((b.billingEmail ?? "").length > 500) return "Les e-mails de facturation dépassent 500 caractères.";
  if (emails.some((e) => !EMAIL_RE.test(e))) return "Une adresse e-mail de facturation n'est pas valide.";
  return null;
};

/** Le serveur répond « Member not found » en anglais. */
const frMessage = (e: unknown, fallback: string) => {
  const m = apiMessage(e, fallback);
  return /member not found/i.test(m) ? "Membre introuvable ou supprimé." : m;
};

const toInt = (v: string): number | null => (v.trim() === "" ? null : Math.max(0, Math.trunc(Number(v))));

const NotificationGrid: React.FC<{ memberId: string }> = ({ memberId }) => {
  const queryClient = useQueryClient();
  const q = useQuery<NotificationPref[]>({
    queryKey: [KEY, memberId, "notifications"],
    queryFn: () => memberSettingsService.getNotifications(memberId),
  });
  const toggle = useMutation({
    mutationFn: (p: NotificationPref) => memberSettingsService.setNotification(memberId, p),
    onSuccess: (list) => queryClient.setQueryData([KEY, memberId, "notifications"], list),
    onError: (e) => toast.error(frMessage(e, "Modification impossible.")),
  });

  if (q.isLoading) return <ListSkeleton rows={4} />;
  if (q.isError) return <ErrorBlock message="Notifications indisponibles." onRetry={() => q.refetch()} />;

  const enabled = (e: NotificationEvent, c: NotificationChannel) =>
    !!q.data?.find((p) => p.eventType === e && p.channel === c)?.enabled;

  return (
    <div className="overflow-x-auto px-1 pb-2">
      <table className="w-full min-w-[34rem] text-sm">
        <thead>
          <tr className="text-left text-xs font-semibold text-gray-500">
            <th className="py-2 pr-3">Événement</th>
            {NOTIFICATION_CHANNELS.map((c) => (
              <th key={c} className="px-2 py-2 text-center">
                {CHANNEL_LABEL[c]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {NOTIFICATION_EVENTS.map((e) => (
            <tr key={e}>
              <td className="py-2 pr-3 font-medium text-gray-800">{EVENT_LABEL[e]}</td>
              {NOTIFICATION_CHANNELS.map((c) => (
                <td key={c} className="px-2 py-2 text-center">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[color:var(--logo-pink-dark)]"
                    aria-label={`${EVENT_LABEL[e]} — ${CHANNEL_LABEL[c]}`}
                    checked={enabled(e, c)}
                    disabled={toggle.isPending}
                    onChange={(ev) => toggle.mutate({ eventType: e, channel: c, enabled: ev.target.checked })}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-gray-500">
        Un choix jamais modifié s'affiche décoché, même si le canal peut être utilisé par défaut.
      </p>
    </div>
  );
};

export const MemberPreferencesSection: React.FC<{ memberId: string; canEdit?: boolean }> = ({
  memberId,
  canEdit = true,
}) => {
  const queryClient = useQueryClient();
  const q = useQuery<MemberSettings>({
    queryKey: [KEY, memberId],
    queryFn: () => memberSettingsService.get(memberId),
  });

  const [form, setForm] = useState<MemberSettings | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (q.data) setForm(q.data);
  }, [q.data]);

  const save = useMutation({
    mutationFn: async () => {
      const problem = validate(form as MemberSettings);
      if (problem) throw new Error(problem);
      return memberSettingsService.update(memberId, form as MemberSettings, reason);
    },
    onSuccess: (data) => {
      queryClient.setQueryData([KEY, memberId], data);
      setReason("");
      setError(null);
      toast.success("Préférences enregistrées");
    },
    onError: (e) => setError(e instanceof Error && !("response" in e) ? e.message : frMessage(e, "Enregistrement impossible.")),
  });

  if (q.isLoading || !form) {
    return q.isError ? (
      <ErrorBlock message={frMessage(q.error, "Préférences indisponibles.")} onRetry={() => q.refetch()} />
    ) : (
      <ListSkeleton rows={5} />
    );
  }

  const set = (patch: Partial<MemberSettings>) => setForm({ ...form, ...patch });
  const billing = form.billingPref ?? {};
  const wallet = form.walletPref ?? {};
  const setBilling = (p: object) => set({ billingPref: { ...billing, ...p } });
  const setWallet = (p: object) => set({ walletPref: { ...wallet, ...p } });
  const ro = !canEdit;

  return (
    <div className="space-y-4">
      <Section title="Préférences" description="Ces préférences ne sont lues par aucun autre module pour l'instant." icon={SlidersHorizontal}>
        <div className="space-y-5 px-3 pb-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Langue">
              <select className={FIELD} disabled={ro} value={form.langage ?? "fr"} onChange={(e) => set({ langage: e.target.value })}>
                <option value="fr">Français</option>
                <option value="en">English</option>
              </select>
            </Field>
            <Field label="Fuseau horaire">
              <>
                <input className={FIELD} list="member-timezones" disabled={ro} value={form.timeZone ?? ""} placeholder="Africa/Brazzaville" onChange={(e) => set({ timeZone: e.target.value })} />
                <datalist id="member-timezones">
                  {["Africa/Brazzaville", "Africa/Lagos", "Africa/Kinshasa", "Africa/Douala", "Africa/Libreville", "Europe/Paris", "UTC"].map((z) => (
                    <option key={z} value={z} />
                  ))}
                </datalist>
              </>
            </Field>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <Switch checked={!!form.showNameOnDisplay} onChange={(v) => !ro && set({ showNameOnDisplay: v })} label="Nom affiché" />
            <Switch checked={!!form.showEmail} onChange={(v) => !ro && set({ showEmail: v })} label="E-mail visible" />
            <Switch checked={!!form.showPhone} onChange={(v) => !ro && set({ showPhone: v })} label="Téléphone visible" />
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-gray-900">Facturation</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Facturer à">
                <select
                  className={FIELD}
                  disabled={ro}
                  value={billing.billingEntityType ?? ""}
                  onChange={(e) => setBilling({ billingEntityType: e.target.value || null })}
                >
                  <option value="">Non défini</option>
                  <option value="PERSONAL">Le membre</option>
                  <option value="COMPANY">Une entreprise</option>
                </select>
              </Field>
              <Field label="Nom de l'entreprise">
                <input className={FIELD} maxLength={255} disabled={ro} value={billing.billingCompanyName ?? ""} onChange={(e) => setBilling({ billingCompanyName: e.target.value })} />
              </Field>
              <Field label="E-mail(s) de facturation" hint="Plusieurs adresses séparées par une virgule.">
                <input className={FIELD} maxLength={500} disabled={ro} value={billing.billingEmail ?? ""} onChange={(e) => setBilling({ billingEmail: e.target.value })} />
              </Field>
              <Field label="Adresse de facturation">
                <input className={FIELD} maxLength={255} disabled={ro} value={billing.billlingAddress ?? ""} onChange={(e) => setBilling({ billlingAddress: e.target.value })} />
              </Field>
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-gray-900">Portefeuille</p>
            <Switch checked={!!wallet.autoTopupEnabled} onChange={(v) => !ro && setWallet({ autoTopupEnabled: v })} label="Recharge automatique" />
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {(
                [
                  ["autoTopupThreshold", "Seuil de recharge"],
                  ["autoTopupAmount", "Montant de recharge"],
                  ["spendingDailyLimit", "Plafond journalier"],
                  ["spendingWeeklyLimit", "Plafond hebdomadaire"],
                ] as const
              ).map(([k, label]) => (
                <Field key={k} label={label}>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    className={FIELD}
                    disabled={ro}
                    value={numText(wallet[k])}
                    onChange={(e) => setWallet({ [k]: toInt(e.target.value) })}
                  />
                </Field>
              ))}
            </div>
          </div>

          {canEdit && (
            <div className="flex flex-wrap items-center gap-3">
              <input className={`${FIELD} sm:max-w-xs`} placeholder="Motif (facultatif)" maxLength={200} value={reason} onChange={(e) => setReason(e.target.value)} />
              <ActionButton icon={Save} pending={save.isPending} onClick={() => save.mutate()}>
                Enregistrer
              </ActionButton>
            </div>
          )}
          {error && <p className="text-sm font-medium text-red-600">{error}</p>}
        </div>
      </Section>

      <Section title="Notifications" description="Chaque case s'enregistre immédiatement." icon={Bell}>
        <NotificationGrid memberId={memberId} />
      </Section>
    </div>
  );
};

export default MemberPreferencesSection;
