import React from "react";
import { useQuery } from "@tanstack/react-query";
import { platformSettingsService } from "../../services/platformSettings.service";
import { apiMessage } from "../subscription/kitUtils";
import { SettingCard } from "./PlatformSettingsTab";

/** Carte de modification d'un réglage, lue par GET /admin/settings/{clé} (404 : inconnu ; 403 : réservé au super administrateur). */
export const SettingEditor: React.FC<{ settingKey: string; onSaved?: () => void }> = ({ settingKey, onSaved }) => {
  const q = useQuery({ queryKey: ["platform-setting", settingKey], queryFn: () => platformSettingsService.getSetting(settingKey), retry: false });
  if (q.isLoading) return <p className="text-sm text-gray-500">Chargement du paramètre…</p>;
  if (q.isError || !q.data) return <p role="alert" className="rounded-2xl bg-amber-50 p-3 text-sm text-amber-800">{apiMessage(q.error, "Paramètre introuvable.")}</p>;
  return <SettingCard setting={q.data} canEdit highlight onSaved={() => { q.refetch(); onSaved?.(); }} />;
};

/** Vrai si l'API des domaines expose AUDIT : seul le super administrateur le voit (aucun rôle codé en dur). */
export const useCanEditAuditSettings = (): boolean => {
  const q = useQuery({ queryKey: ["platform-settings-domains"], queryFn: platformSettingsService.getDomains, retry: false, staleTime: 5 * 60_000 });
  return !!q.data?.some((d) => d.domain === "AUDIT");
};
