import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Lock, LockOpen, Trash2, UserPlus } from "lucide-react";
import { gedService } from "../../services/ged.service";
import type { GedAccessLevel, GedFolderAccess } from "../../services/ged.service";
import { ActionButton, ErrorBlock, Field, IconButton, ItemRow, Section, StatusChip } from "../subscription/kit";
import { FIELD, apiMessage } from "../subscription/kitUtils";
import { toast } from "../ui/toastStore";
import { dateTime, formatBytes } from "../documents/docUtils";
import { ACCESS_HINT, ACCESS_LABEL, ACCESS_LEVELS, GRANTEE_LABEL, percent } from "./gedUtils";

/** Accès restreint, droits et quota d'un dossier. Les droits se gèrent au niveau « gérer l'accès » du dossier. */
export const GedFolderAccessPanel: React.FC<{ folderCode: string; folderName: string; canWrite: boolean; isAdmin: boolean; onChanged: () => void }> = ({ folderCode, folderName, canWrite, isAdmin, onChanged }) => {
  const queryClient = useQueryClient();
  const accessKey = ["ged-folder-access", folderCode];
  const usageKey = ["ged-usage", folderCode];
  const [granteeType, setGranteeType] = useState("USER");
  const [grantee, setGrantee] = useState("");
  const [level, setLevel] = useState<GedAccessLevel>("READ");
  const [quotaGb, setQuotaGb] = useState("");

  const accessQuery = useQuery({ queryKey: accessKey, queryFn: () => gedService.folderAccess(folderCode) });
  const usageQuery = useQuery({ queryKey: usageKey, queryFn: () => gedService.usage(folderCode) });
  const access = accessQuery.data;
  const usage = usageQuery.data;

  const done = (data: GedFolderAccess, msg: string) => {
    queryClient.setQueryData(accessKey, data);
    queryClient.invalidateQueries({ queryKey: ["ged-items"] });
    onChanged();
    toast.success(msg);
  };
  const fail = (fallback: string) => (e: unknown) => toast.error(apiMessage(e, fallback));

  const restrict = useMutation({ mutationFn: () => gedService.restrict(folderCode), onSuccess: (d) => done(d, "Dossier restreint"), onError: fail("Restriction impossible") });
  const unrestrict = useMutation({ mutationFn: () => gedService.unrestrict(folderCode), onSuccess: (d) => done(d, "Dossier rouvert"), onError: fail("Réouverture impossible") });
  const grant = useMutation({
    mutationFn: () => gedService.grant(folderCode, { granteeType, grantee: grantee.trim(), level }),
    onSuccess: (d) => {
      setGrantee("");
      done(d, "Droit enregistré");
    },
    onError: fail("Droit non enregistré"),
  });
  const revoke = useMutation({
    mutationFn: (g: { granteeType: string; grantee: string }) => gedService.revoke(folderCode, g.granteeType, g.grantee),
    onSuccess: (d) => done(d, "Droit retiré"),
    onError: fail("Retrait impossible (le dernier droit « Gérer l'accès » ne se retire pas)"),
  });
  const quota = useMutation({
    mutationFn: (bytes: number | null) => gedService.setQuota(folderCode, bytes),
    onSuccess: (d) => {
      queryClient.setQueryData(usageKey, d);
      toast.success("Quota enregistré");
      setQuotaGb("");
    },
    onError: fail("Quota non enregistré"),
  });

  if (accessQuery.isLoading) return <p className="p-4 text-sm text-gray-500">Chargement des droits…</p>;
  if (accessQuery.isError || !access) return <ErrorBlock message="Les droits du dossier n'ont pas pu être chargés." onRetry={() => accessQuery.refetch()} />;

  const canManage = access.canManage && canWrite;
  const grants = access.grants ?? [];
  const quotaPct = percent(usage?.usedBytes, usage?.quotaBytes);

  return (
    <div className="space-y-4">
      <Section title={`Accès à « ${folderName} »`} description="Un dossier ouvert suit les droits généraux ; un dossier restreint n'existe que pour les personnes et les rôles qui y ont un droit.">
        <div className="flex flex-wrap items-center gap-2">
          <StatusChip tone={access.restricted ? "warn" : "success"}>{access.restricted ? "Restreint" : "Ouvert"}</StatusChip>
          {access.systemFolder && <StatusChip tone="neutral">Dossier du plan de classement</StatusChip>}
          {access.myLevel && <span className="text-xs text-gray-500">Votre niveau : {ACCESS_LABEL[access.myLevel] ?? access.myLevel}</span>}
          {access.restricted && access.restrictedAt && (
            <span className="text-xs text-gray-500">
              depuis le {dateTime(access.restrictedAt)}
              {access.restrictedBy ? ` par ${access.restrictedBy}` : ""}
            </span>
          )}
        </div>

        {(access.inheritedFrom ?? []).length > 0 && (
          <p className="mt-3 rounded-2xl bg-amber-50 p-3 text-xs text-amber-800">Restriction héritée de : {(access.inheritedFrom ?? []).map((f) => f.name).join(" › ")}. Il faut un droit sur chacun de ces dossiers, le plus faible l'emporte.</p>
        )}

        {canManage && !access.systemFolder && (
          <div className="mt-4">
            {access.restricted ? (
              <ActionButton variant="ghost" icon={LockOpen} pending={unrestrict.isPending} onClick={() => toast.confirm({ message: `Rouvrir « ${folderName} » à tous les comptes qui ont DOCUMENT:READ ?`, confirmLabel: "Rouvrir", pendingLabel: "Réouverture", onConfirm: () => unrestrict.mutateAsync() })}>
                Rouvrir le dossier
              </ActionButton>
            ) : (
              <ActionButton icon={Lock} pending={restrict.isPending} onClick={() => restrict.mutate()}>
                Restreindre l'accès
              </ActionButton>
            )}
            {!access.restricted && <p className="mt-2 text-xs text-gray-500">Vous gardez la gestion du dossier ; ajoutez ensuite les personnes et les rôles autorisés.</p>}
          </div>
        )}
      </Section>

      {access.restricted && (
        <Section title="Droits" description="Un bénéficiaire n'a qu'un niveau par dossier : le nouveau remplace l'ancien.">
          <div className="space-y-2">
            {grants.length === 0 && <p className="text-sm text-gray-500">Aucun droit donné.</p>}
            {grants.map((g) => (
              <ItemRow key={`${g.granteeType}:${g.grantee}`} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-gray-900">{g.granteeLabel || g.grantee}</p>
                  <p className="text-xs text-gray-500">
                    {GRANTEE_LABEL[g.granteeType] ?? g.granteeType} · {g.grantee}
                    {g.grantedAt ? ` · donné le ${dateTime(g.grantedAt)}` : ""}
                    {g.grantedBy ? ` par ${g.grantedBy}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <StatusChip tone={g.level === "ADMIN" ? "pink" : "neutral"}>{ACCESS_LABEL[g.level] ?? g.level}</StatusChip>
                  {canManage && <IconButton icon={Trash2} label="Retirer le droit" tone="danger" pending={revoke.isPending} onClick={() => revoke.mutate({ granteeType: g.granteeType, grantee: g.grantee })} />}
                </div>
              </ItemRow>
            ))}
          </div>

          {canManage && (
            <div className="mt-4 grid gap-3 sm:grid-cols-[9rem_1fr_11rem_auto] sm:items-end">
              <Field label="Bénéficiaire">
                <select value={granteeType} onChange={(e) => setGranteeType(e.target.value)} className={FIELD}>
                  <option value="USER">Utilisateur</option>
                  <option value="ROLE">Rôle</option>
                </select>
              </Field>
              <Field label={granteeType === "USER" ? "E-mail" : "Nom du rôle"}>
                <input value={grantee} onChange={(e) => setGrantee(e.target.value)} placeholder={granteeType === "USER" ? "alice@exemple.cg" : "STAFF"} className={FIELD} />
              </Field>
              <Field label="Niveau" hint={ACCESS_HINT[level]}>
                <select value={level} onChange={(e) => setLevel(e.target.value as GedAccessLevel)} className={FIELD}>
                  {ACCESS_LEVELS.map((l) => (
                    <option key={l} value={l}>
                      {ACCESS_LABEL[l]}
                    </option>
                  ))}
                </select>
              </Field>
              <ActionButton icon={UserPlus} pending={grant.isPending} disabled={!grantee.trim()} onClick={() => grant.mutate()}>
                Donner
              </ActionButton>
            </div>
          )}
        </Section>
      )}

      <Section title="Espace utilisé" description="Toutes les versions des fichiers, sous-dossiers et corbeille compris.">
        {usageQuery.isLoading ? (
          <p className="text-sm text-gray-500">Chargement…</p>
        ) : usage ? (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-700">
              <span>
                <strong>{formatBytes(usage.usedBytes)}</strong> dans {(usage.files ?? 0).toLocaleString("fr-FR")} fichier{(usage.files ?? 0) > 1 ? "s" : ""}
              </span>
              <span>Quota du dossier : {usage.quotaBytes ? formatBytes(usage.quotaBytes) : "aucun"}</span>
              {usage.remainingBytes !== undefined && usage.remainingBytes !== null && <span>Reste sous le quota le plus serré : {formatBytes(usage.remainingBytes)}</span>}
            </div>
            {usage.quotaBytes ? (
              <div className="h-2 overflow-hidden rounded-full bg-gray-100" role="progressbar" aria-valuenow={quotaPct} aria-valuemin={0} aria-valuemax={100}>
                <div className={`h-full rounded-full ${quotaPct >= 90 ? "bg-red-500" : "bg-[color:var(--logo-pink-dark)]"}`} style={{ width: `${quotaPct}%` }} />
              </div>
            ) : null}
            {usage.limitingFolderCode && usage.limitingFolderCode !== folderCode && <p className="text-xs text-gray-500">Le quota qui limite ce dossier est porté par le dossier {usage.limitingFolderCode}.</p>}
            <p className="text-xs text-gray-500">
              Toute la GED : {formatBytes(usage.totalUsedBytes)}
              {usage.totalQuotaBytes ? ` sur ${formatBytes(usage.totalQuotaBytes)}` : ""}
            </p>
          </div>
        ) : null}

        {isAdmin && canWrite && (
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <Field label="Quota du dossier (Go)" hint="Vide ou 0 : retire le quota.">
              <input type="number" min={0} step="0.1" value={quotaGb} onChange={(e) => setQuotaGb(e.target.value)} className={`${FIELD} w-40`} />
            </Field>
            <ActionButton variant="ghost" pending={quota.isPending} disabled={quotaGb === ""} onClick={() => quota.mutate(Number(quotaGb) > 0 ? Math.round(Number(quotaGb) * 1024 ** 3) : null)}>
              Enregistrer le quota
            </ActionButton>
          </div>
        )}
      </Section>
    </div>
  );
};
