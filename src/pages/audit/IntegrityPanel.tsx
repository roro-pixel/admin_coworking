import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ActionButton, ListHeader, Section } from "../../components/subscription/kit";
import { toast } from "../../components/ui/toastStore";
import { apiMessage } from "../../components/subscription/kitUtils";
import { auditService } from "../../services/audit.service";
import { Async, Table, Td, dt, num } from "./auditUtils";
import { SettingEditor } from "../../components/settings/SettingEditor";

export const IntegrityPanel: React.FC = () => {
  const qc = useQueryClient();
  const [editKey, setEditKey] = useState<string | null>(null);
  const rep = useQuery({ queryKey: ["audit", "integrity"], queryFn: auditService.integrity, enabled: false });
  const ret = useQuery({ queryKey: ["audit", "retention"], queryFn: auditService.retention });
  const verify = useMutation({ mutationFn: auditService.integrity, onSuccess: (r) => { qc.setQueryData(["audit", "integrity"], r); }, onError: (e) => toast.error(apiMessage(e, "Vérification impossible.")) });
  const reports = verify.data ?? rep.data ?? [];
  const broken = reports.filter((r) => r.intact === false);

  const purge = () => toast.confirm({
    message: "Lancer la purge des données expirées ?", detail: "Les lignes plus anciennes que la durée de conservation sont supprimées définitivement.", confirmLabel: "Purger", pendingLabel: "Purge…", successMessage: "Purge terminée", errorMessage: "Purge impossible",
    onConfirm: async () => { await auditService.runRetention(); qc.invalidateQueries({ queryKey: ["audit", "retention"] }); },
  });

  return (
    <div className="space-y-6">
      <ListHeader title="Intégrité et conservation" subtitle="Les journaux sont chaînés : toute ligne modifiée ou retirée casse la chaîne." action={<ActionButton pending={verify.isPending} onClick={() => verify.mutate()}>Vérifier</ActionButton>} />
      {verify.isSuccess && (broken.length > 0
        ? <div className="rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">Chaîne rompue sur {broken.map((b) => b.journal).join(", ")} : un journal a pu être altéré.</div>
        : <div className="rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">Tous les journaux sont intacts.</div>)}
      {reports.length > 0 && (
        <Section title="Résultat de la vérification">
          <Table head={["Journal", "Lignes vérifiées", "Première", "Dernière", "Non chaînées", "Intact", "Ruptures"]}>
            {reports.map((r) => (
              <tr key={r.journal} className="border-t border-gray-100">
                <Td mono>{r.journal}</Td><Td>{num(r.checked)}</Td><Td>{num(r.firstSeq)}</Td><Td>{num(r.lastSeq)}</Td><Td>{num(r.unchained)}</Td>
                <Td><span className={r.intact ? "font-semibold text-emerald-700" : "font-semibold text-red-700"}>{r.intact ? "Oui" : "NON"}</span></Td>
                <Td wrap>{(r.breaks ?? []).map((b) => `#${b.chainSeq} (${b.kind === "CONTENT" ? "contenu modifié" : "chaînage rompu"})`).join(", ")}</Td>
              </tr>
            ))}
          </Table>
        </Section>
      )}
      <Section title="Conservation" description="0 jour : sans limite. Cliquez sur une clé pour modifier la durée (super administrateur)." action={<ActionButton variant="ghost" onClick={purge}>Purger maintenant</ActionButton>}>
        {editKey && <div className="mb-3"><SettingEditor settingKey={editKey} onSaved={() => qc.invalidateQueries({ queryKey: ["audit", "retention"] })} /></div>}
        <Async q={ret} isEmpty={(ret.data ?? []).length === 0}>
          <Table head={["Donnée", "Durée (jours)", "Lignes", "Plus ancienne", "Paramètre"]}>
            {(ret.data ?? []).map((r) => <tr key={r.name} className="border-t border-gray-100"><Td mono>{r.name}</Td><Td>{r.days == null ? "Illimitée" : num(r.days)}</Td><Td>{num(r.rows)}</Td><Td>{dt(r.oldest)}</Td><Td>{r.settingKey && <button type="button" onClick={() => setEditKey(editKey === r.settingKey ? null : r.settingKey!)} className="font-mono text-[color:var(--logo-pink-dark)] hover:underline" title="Modifier la durée">{r.settingKey}</button>}</Td></tr>)}
          </Table>
        </Async>
      </Section>
    </div>
  );
};
