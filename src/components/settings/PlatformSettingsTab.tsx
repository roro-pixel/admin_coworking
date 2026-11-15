import React, { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { AlertTriangle, History, KeyRound, RotateCcw, Save, SlidersHorizontal } from "lucide-react";
import { platformSettingsService } from "../../services/platformSettings.service";
import type { SettingChange, SettingDomainView, SettingView } from "../../services/platformSettings.service";
import { ActionButton, EmptyState, ErrorBlock, Section, Switch, Tag } from "../subscription/kit";
import { FIELD, apiMessage, formatDateTime } from "../subscription/kitUtils";
import { ListSkeleton } from "../ui/Skeleton";
import { toast } from "../ui/toastStore";

const DOMAINS_KEY = "platform-settings-domains";
const SETTINGS_KEY = "platform-settings";

/** Contrôles faits avant l'appel (le serveur refait les mêmes et répond en français). */
const localProblem = (s: SettingView, v: string): string | null => {
  const t = v.trim();
  if (t.includes("${")) return "La valeur ne peut pas contenir de référence à une autre valeur.";
  switch (s.type) {
    case "INTEGER": {
      if (!/^\d+$/.test(t)) return "Un nombre entier positif ou nul est attendu.";
      if (s.key.endsWith("delay-ms") && !s.key.includes("initial") && Number(t) < 1000) return "La cadence doit être d'au moins 1000 ms.";
      return null;
    }
    case "DECIMAL":
      return /^\d+(\.\d+)?$/.test(t) ? null : "Un nombre positif ou nul est attendu (point décimal).";
    case "EMAIL":
      return !t || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t) ? null : "Adresse e-mail non valide.";
    case "TIME_RANGE": {
      if (!t) return null;
      const m = /^(\d{2}:\d{2})-(\d{2}:\d{2})$/.exec(t);
      return m && m[1] < m[2] ? null : "Plage HH:mm-HH:mm, ouverture avant fermeture.";
    }
    default:
      return null;
  }
};

/** « HH:mm-HH:mm » ou vide (fermé) */
const parseRange = (v: string): { from: string; to: string } => {
  const [from = "", to = ""] = (v || "").split("-");
  return { from, to };
};

const Control: React.FC<{
  setting: SettingView;
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
}> = ({ setting, value, onChange, disabled }) => {
  switch (setting.type) {
    case "BOOLEAN":
      return (
        <Switch
          checked={value === "true"}
          onChange={(v) => !disabled && onChange(v ? "true" : "false")}
          label={value === "true" ? "Activé" : "Désactivé"}
        />
      );
    case "INTEGER":
      return (
        <input type="number" step={1} className={FIELD} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} />
      );
    case "DECIMAL":
      return (
        <input type="number" step="any" className={FIELD} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} />
      );
    case "EMAIL":
      return <input type="email" className={FIELD} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} />;
    case "TIME":
      return <input type="time" className={FIELD} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} />;
    case "TIME_RANGE": {
      const { from, to } = parseRange(value);
      const set = (f: string, t: string) => onChange(f || t ? `${f}-${t}` : "");
      return (
        <div className="flex flex-wrap items-center gap-2">
          <input type="time" className={`${FIELD} !w-auto`} value={from} disabled={disabled} onChange={(e) => set(e.target.value, to)} />
          <span className="text-gray-400">à</span>
          <input type="time" className={`${FIELD} !w-auto`} value={to} disabled={disabled} onChange={(e) => set(from, e.target.value)} />
          {value && !disabled && (
            <button type="button" className="text-xs font-semibold text-gray-500 hover:text-gray-800" onClick={() => onChange("")}>
              Fermé
            </button>
          )}
          {!value && <Tag>Fermé</Tag>}
        </div>
      );
    }
    case "ENUM":
      return (
        <select className={FIELD} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)}>
          {(setting.options ?? []).map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      );
    case "CRON":
      return (
        <>
          <input className={`${FIELD} font-mono`} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} />
          <p className="mt-1 text-xs text-gray-500">6 champs : seconde minute heure jour mois jour-de-semaine (ex. 0 0 2 * * *).</p>
        </>
      );
    default:
      return <input className={FIELD} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} />;
  }
};

const History_: React.FC<{ settingKey: string }> = ({ settingKey }) => {
  const q = useQuery<SettingChange[]>({
    queryKey: [SETTINGS_KEY, "history", settingKey],
    queryFn: () => platformSettingsService.getHistory(settingKey),
  });
  if (q.isLoading) return <ListSkeleton rows={3} />;
  if (q.isError) return <ErrorBlock message="Historique indisponible." onRetry={() => q.refetch()} />;
  if (!q.data?.length) return <p className="px-1 py-2 text-sm text-gray-500">Aucune modification enregistrée.</p>;
  return (
    <ul className="divide-y divide-gray-100 text-sm">
      {q.data.map((c, i) => {
        const [author, ...rest] = (c.reason ?? "").split(" · ");
        const motif = rest.join(" · ");
        return (
          <li key={i} className="py-2">
            <p className="text-gray-900">
              <span className="font-mono text-gray-500">{c.oldValue ?? "—"}</span> →{" "}
              <span className="font-mono font-semibold">{c.newValue ?? "—"}</span>
            </p>
            <p className="text-xs text-gray-500">
              {formatDateTime(c.changedAt)}
              {author ? ` · ${author}` : ""}
              {motif ? ` · ${motif}` : ""}
            </p>
          </li>
        );
      })}
    </ul>
  );
};

const SettingCard: React.FC<{ setting: SettingView; canEdit: boolean; onSaved: () => void }> = ({
  setting,
  canEdit,
  onSaved,
}) => {
  const queryClient = useQueryClient();
  const server = setting.value ?? "";
  const [value, setValue] = useState(server);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    setValue(server);
    setError(null);
  }, [server, setting.key]);

  const secret = setting.type === "SECRET";
  const editable = canEdit && setting.editable && !secret;
  const dirty = value !== server;

  const done = (msg: string) => {
    setReason("");
    setError(null);
    queryClient.invalidateQueries({ queryKey: [SETTINGS_KEY] });
    queryClient.invalidateQueries({ queryKey: [DOMAINS_KEY] });
    if (msg) toast.success(msg);
    onSaved();
  };

  const save = useMutation({
    mutationFn: async () => {
      const problem = localProblem(setting, value);
      if (problem) throw new Error(problem);
      return platformSettingsService.update(setting.key, value, reason);
    },
    onSuccess: () => done("Paramètre enregistré"),
    onError: (e) => setError(e instanceof Error && !("response" in e) ? e.message : apiMessage(e, "Enregistrement impossible.")),
  });
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-gray-900">{setting.label}</p>
          <p className="break-all font-mono text-xs text-gray-400">{setting.key}</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Tag tone={setting.effect === "RESTART" ? "pink" : "gray"}>
            {setting.effect === "RESTART" ? "au redémarrage" : "immédiat"}
          </Tag>
          {setting.modified && <Tag tone="pink">modifié</Tag>}
          {setting.restartPending && <Tag tone="pink">redémarrage requis</Tag>}
        </div>
      </div>

      <div className="mt-3">
        {secret ? (
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <KeyRound size={16} className="text-gray-400" />
            {setting.configured ? "configuré" : "non configuré"}
          </div>
        ) : (
          <Control setting={setting} value={value} onChange={setValue} disabled={!editable} />
        )}
        {error && <p className="mt-1.5 text-sm font-medium text-red-600">{error}</p>}
      </div>

      {!secret && (
        <p className="mt-2 text-xs text-gray-500">
          Valeur du fichier : <span className="font-mono">{setting.defaultValue || "—"}</span>
          {setting.updatedBy ? ` · modifié par ${setting.updatedBy} le ${formatDateTime(setting.updatedAt)}` : ""}
        </p>
      )}

      {editable && (dirty || setting.modified) && (
        <input
          className={`${FIELD} mt-3`}
          placeholder="Motif (facultatif)"
          maxLength={200}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {editable && (
          <ActionButton icon={Save} pending={save.isPending} disabled={!dirty} onClick={() => save.mutate()}>
            Enregistrer
          </ActionButton>
        )}
        {editable && setting.modified && (
          <ActionButton
            variant="ghost"
            icon={RotateCcw}
            disabled={save.isPending}
            onClick={() =>
              toast.confirm({
                message: `Rétablir « ${setting.label} » ?`,
                detail:
                  setting.effect === "LIVE" && !setting.key.startsWith("subscription.policy.")
                    ? "Attention : pour ce réglage immédiat, l'application garde la dernière valeur enregistrée jusqu'à son prochain redémarrage."
                    : "La valeur du fichier de configuration sera de nouveau utilisée.",
                confirmLabel: "Rétablir",
                pendingLabel: "Rétablissement",
                successMessage: setting.effect === "LIVE" && !setting.key.startsWith("subscription.policy.")
                  ? "Rétabli : l'ancienne valeur reste utilisée jusqu'au redémarrage"
                  : "Valeur d'origine rétablie",
                errorMessage: "Réinitialisation impossible.",
                onConfirm: async () => {
                  await platformSettingsService.reset(setting.key, reason);
                  done("");
                },
              })
            }
          >
            Rétablir
          </ActionButton>
        )}
        <ActionButton variant="ghost" icon={History} onClick={() => setShowHistory((s) => !s)}>
          Historique
        </ActionButton>
      </div>

      {showHistory && (
        <div className="mt-3 rounded-xl bg-gray-50 px-3 py-1">
          <History_ settingKey={setting.key} />
        </div>
      )}
    </div>
  );
};

export const PlatformSettingsTab: React.FC = () => {
  // « ?domain=SUBSCRIPTIONS » ouvre directement le domaine demandé
  const [searchParams] = useSearchParams();
  const [domain, setDomain] = useState<string | null>(searchParams.get("domain"));

  const domains = useQuery<SettingDomainView[]>({
    queryKey: [DOMAINS_KEY],
    queryFn: platformSettingsService.getDomains,
  });

  useEffect(() => {
    if (!domains.data?.length) return;
    if (!domain || !domains.data.some((d) => d.domain === domain)) setDomain(domains.data[0].domain);
  }, [domains.data, domain]);

  const settings = useQuery<SettingView[]>({
    queryKey: [SETTINGS_KEY, domain],
    queryFn: () => platformSettingsService.getSettings(domain ?? undefined),
    enabled: !!domain,
  });

  const current = useMemo(() => domains.data?.find((d) => d.domain === domain), [domains.data, domain]);
  const restartPending = settings.data?.some((s) => s.restartPending);

  if (domains.isLoading) return <ListSkeleton rows={6} />;
  if (domains.isError)
    return <ErrorBlock message={apiMessage(domains.error, "Paramètres indisponibles.")} onRetry={() => domains.refetch()} />;
  if (!domains.data?.length)
    return <EmptyState icon={SlidersHorizontal} title="Aucun domaine de paramètres" />;

  return (
    <div className="grid gap-4 lg:grid-cols-[16rem_1fr]">
      <nav className="lg:sticky lg:top-4 lg:self-start">
        <select
          className={`${FIELD} lg:hidden`}
          value={domain ?? ""}
          onChange={(e) => setDomain(e.target.value)}
          aria-label="Domaine"
        >
          {domains.data.map((d) => (
            <option key={d.domain} value={d.domain}>
              {d.label} ({d.settings})
            </option>
          ))}
        </select>
        <ul className="hidden space-y-1 rounded-[1.75rem] border border-gray-100 bg-white p-2 shadow-sm lg:block">
          {domains.data.map((d) => (
            <li key={d.domain}>
              <button
                type="button"
                onClick={() => setDomain(d.domain)}
                className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-sm transition ${
                  d.domain === domain
                    ? "bg-gray-900 font-semibold text-white"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <span className="truncate">{d.label}</span>
                <span className="text-xs opacity-60">{d.settings}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="space-y-3">
        {restartPending && (
          <div role="status" className="flex items-start gap-2 rounded-2xl bg-amber-50 p-3 text-sm text-amber-800">
            <AlertTriangle size={18} className="mt-0.5 shrink-0" />
            Des modifications ne prendront effet qu'au prochain redémarrage de l'application.
          </div>
        )}
        <Section title={current?.label} description={current && !current.adminEditable ? "Domaine réservé au super administrateur." : undefined} icon={SlidersHorizontal}>
          {settings.isLoading ? (
            <ListSkeleton rows={4} />
          ) : settings.isError ? (
            <ErrorBlock message={apiMessage(settings.error, "Chargement impossible.")} onRetry={() => settings.refetch()} />
          ) : !settings.data?.length ? (
            <p className="px-3 pb-3 text-sm text-gray-500">Aucun paramètre dans ce domaine.</p>
          ) : (
            <div className="space-y-3">
              {settings.data.map((s) => (
                <SettingCard key={s.key} setting={s} canEdit onSaved={() => undefined} />
              ))}
            </div>
          )}
        </Section>
      </div>
    </div>
  );
};

export default PlatformSettingsTab;
