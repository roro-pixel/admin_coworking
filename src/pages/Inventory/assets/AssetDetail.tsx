import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, FileDown, Hammer, History, Info, MapPin, RotateCcw, UserPlus } from "lucide-react";
import { inventoryService } from "../../../services/inventory.service";
import type { Asset, AssetAssignment } from "../../../services/inventory.service";
import { ActionButton, Detail, EmptyState, ErrorBlock, Field, ItemRow, PageHeader, PanelForm, Section, Tabs } from "../../../components/subscription/kit";
import { FIELD, apiMessage, formatDate, formatDateTime, formatMoney } from "../../../components/subscription/kitUtils";
import { ListSkeleton } from "../../../components/ui/Skeleton";
import { toast } from "../../../components/ui/toastStore";
import { saveBlob } from "../../../components/payment/paymentUtils";
import { ASSET_STATUS_LABEL, ASSET_STATUS_TONE, CONDITIONS, CONDITION_LABEL, Chip, LocationSelect, label, useActor } from "../../../components/inventory/invKit";
import { StatusChip } from "../../../components/subscription/kit";

type Panel = "assign" | "return" | "maintenance" | "reserve" | "damaged" | "retire" | "lost" | null;
type Tab = "info" | "maintenances" | "history";

const ASSIGNEE_TYPES: Record<string, string> = { MEMBER: "Membre", CUSTOMER: "Client", BUSINESS: "Entreprise", ROOM: "Salle", LOCATION: "Emplacement" };
const MAINT_TYPES: Record<string, string> = { PREVENTIVE: "Préventive", CORRECTIVE: "Corrective", INSPECTION: "Inspection" };
const REASON_PANELS = {
  reserve: { title: "Réserver l'actif", field: "Réservé pour", reasonLabel: "Motif", submit: "Réserver" },
  damaged: { title: "Déclarer l'actif endommagé", field: "", reasonLabel: "Description des dégâts", submit: "Déclarer" },
  retire: { title: "Retirer l'actif du parc", field: "", reasonLabel: "Motif du retrait", submit: "Retirer" },
  lost: { title: "Déclarer l'actif perdu", field: "", reasonLabel: "Circonstances", submit: "Déclarer" },
} as const;

export const AssetDetail: React.FC<{ asset: Asset; onBack: () => void }> = ({ asset, onBack }) => {
  const queryClient = useQueryClient();
  const actor = useActor();
  const [tab, setTab] = useState<Tab>("info");
  const [panel, setPanel] = useState<Panel>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastAssignment, setLastAssignment] = useState<AssetAssignment | null>(null);
  const [downloading, setDownloading] = useState(false);

  const [assign, setAssign] = useState({ assigneeType: "MEMBER", assigneeCode: "", expectedReturnAt: "", purpose: "", notes: "" });
  const [ret, setRet] = useState({ returnedToLocationCode: "", condition: "GOOD", notes: "" });
  const [maint, setMaint] = useState({ maintenanceType: "CORRECTIVE", description: "", scheduledDate: "" });
  const [reason, setReason] = useState({ target: "", reason: "" });

  const s = asset.status;
  const can = {
    assign: s === "AVAILABLE" || s === "RESERVED",
    ret: s === "ASSIGNED" || s === "IN_USE",
    maintain: s !== "IN_MAINTENANCE" && s !== "RETIRED",
    reserve: s === "AVAILABLE",
    cancelReservation: s === "RESERVED",
    damaged: s !== "DAMAGED" && s !== "RETIRED",
    retire: s !== "RETIRED",
    lost: s !== "LOST" && s !== "RETIRED",
  };
  const canMaintain = can.maintain && s !== "LOST";
  const canLost = can.lost;

  const history = useQuery({
    queryKey: ["asset-location-history", asset.assetCode],
    queryFn: () => inventoryService.getAssetLocationHistory(asset.assetCode),
    enabled: tab === "history",
  });
  // GET /inventory/asset-maintenances : exposé par le service mais non affiché par l'ancienne fiche
  const maintenances = useQuery({
    queryKey: ["asset-maintenances", asset.assetCode],
    queryFn: () => inventoryService.getAssetMaintenances(asset.assetCode),
    enabled: tab === "maintenances",
  });

  const close = () => { setPanel(null); setError(null); };
  const done = (msg: string) => async () => {
    toast.success(msg);
    await queryClient.invalidateQueries({ queryKey: ["assets"] });
    await queryClient.invalidateQueries({ queryKey: ["asset-location-history", asset.assetCode] });
    close();
  };
  const fail = (fallback: string) => (e: unknown) => setError(apiMessage(e, fallback));

  const assignM = useMutation({
    mutationFn: () => inventoryService.assignAsset(asset.assetCode, { assigneeType: assign.assigneeType, assigneeCode: assign.assigneeCode.trim(), expectedReturnAt: assign.expectedReturnAt, assignedBy: actor, purpose: assign.purpose.trim(), notes: assign.notes.trim() || undefined }),
    onSuccess: async (a) => { setLastAssignment(a); setAssign({ assigneeType: "MEMBER", assigneeCode: "", expectedReturnAt: "", purpose: "", notes: "" }); await done("Actif attribué")(); },
    onError: fail("Attribution impossible"),
  });
  const returnM = useMutation({
    mutationFn: () => inventoryService.returnAsset(asset.assetCode, { returnedBy: actor, returnedToLocationCode: ret.returnedToLocationCode, condition: ret.condition, notes: ret.notes.trim() || undefined }),
    onSuccess: done("Retour enregistré"),
    onError: fail("Retour impossible"),
  });
  const maintM = useMutation({
    mutationFn: () => inventoryService.createAssetMaintenance(asset.assetCode, { maintenanceType: maint.maintenanceType, description: maint.description.trim(), scheduledDate: maint.scheduledDate, requestedBy: actor }),
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ["asset-maintenances"] }); setMaint({ maintenanceType: "CORRECTIVE", description: "", scheduledDate: "" }); await done("Maintenance planifiée")(); },
    onError: fail("Planification impossible"),
  });
  const reasonM = useMutation({
    mutationFn: () => {
      const r = reason.reason.trim();
      if (panel === "reserve") return inventoryService.reserveAsset(asset.assetCode, { reservedFor: reason.target.trim(), reason: r });
      const body = { reason: r, reportedBy: actor };
      if (panel === "damaged") return inventoryService.markAssetDamaged(asset.assetCode, body);
      if (panel === "retire") return inventoryService.retireAsset(asset.assetCode, body);
      return inventoryService.markAssetLost(asset.assetCode, body);
    },
    onSuccess: async () => { setReason({ target: "", reason: "" }); await done("Statut mis à jour")(); },
    onError: fail("Action impossible"),
  });
  const cancelRes = useMutation({
    mutationFn: () => inventoryService.cancelAssetReservation(asset.assetCode),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["assets"] }),
  });

  const open = (p: Panel) => { setError(null); setPanel(panel === p ? null : p); };
  const downloadSheet = async () => {
    if (!lastAssignment) return;
    setDownloading(true);
    try {
      saveBlob(await inventoryService.getAssetLoanSheetPdf(asset.assetCode, lastAssignment.assignmentId), `fiche_pret_${asset.assetCode}_${lastAssignment.assignmentId}.pdf`);
    } catch (e) {
      toast.error(apiMessage(e, "Téléchargement impossible"));
    } finally {
      setDownloading(false);
    }
  };

  const rp = panel && panel in REASON_PANELS ? REASON_PANELS[panel as keyof typeof REASON_PANELS] : null;
  const depreciation = asset.purchaseCost > 0 ? Math.max(0, Math.min(100, Math.round((asset.depreciatedValue / asset.purchaseCost) * 100))) : null;

  return (
    <div className="mx-auto w-full max-w-4xl">
      <PageHeader
        onBack={onBack}
        backLabel="Retour aux actifs"
        title={asset.itemName || asset.itemCode}
        subtitle={<span className="font-mono">{asset.assetCode}</span>}
        badge={<Chip map={ASSET_STATUS_LABEL} tones={ASSET_STATUS_TONE} value={asset.status} />}
      />

      <div className="mb-5 flex flex-wrap gap-2">
        {can.assign && <ActionButton variant="ghost" icon={UserPlus} onClick={() => open("assign")}>Attribuer</ActionButton>}
        {can.ret && <ActionButton variant="ghost" icon={RotateCcw} onClick={() => open("return")}>Enregistrer le retour</ActionButton>}
        {canMaintain && <ActionButton variant="ghost" icon={Hammer} onClick={() => open("maintenance")}>Planifier une maintenance</ActionButton>}
        {can.reserve && <ActionButton variant="ghost" icon={CalendarClock} onClick={() => open("reserve")}>Réserver</ActionButton>}
        {can.cancelReservation && (
          <ActionButton
            variant="ghost"
            pending={cancelRes.isPending}
            onClick={() => toast.confirm({ message: "Annuler la réservation ?", confirmLabel: "Annuler la réservation", pendingLabel: "Annulation", successMessage: "Réservation annulée", errorMessage: "Annulation impossible", onConfirm: () => cancelRes.mutateAsync() })}
          >
            Annuler la réservation
          </ActionButton>
        )}
        {lastAssignment && <ActionButton variant="ghost" icon={FileDown} pending={downloading} onClick={downloadSheet}>Fiche de prêt</ActionButton>}
        {can.damaged && <ActionButton variant="ghost" onClick={() => open("damaged")}>Endommagé</ActionButton>}
        {canLost && <ActionButton variant="ghost" onClick={() => open("lost")}>Perdu</ActionButton>}
        {can.retire && <ActionButton variant="danger" onClick={() => open("retire")}>Retirer du parc</ActionButton>}
      </div>

      <div className="space-y-5">
        {panel === "assign" && (
          <PanelForm title="Attribuer l'actif" onCancel={close} pending={assignM.isPending} submitLabel="Attribuer" submitDisabled={!assign.assigneeCode.trim() || !assign.expectedReturnAt || !assign.purpose.trim()} error={error} onSubmit={(e) => { e.preventDefault(); assignM.mutate(); }}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Type de bénéficiaire">
                <select value={assign.assigneeType} onChange={(e) => setAssign({ ...assign, assigneeType: e.target.value })} className={FIELD}>
                  {Object.entries(ASSIGNEE_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </Field>
              <Field label="Code du bénéficiaire" required><input value={assign.assigneeCode} onChange={(e) => setAssign({ ...assign, assigneeCode: e.target.value })} className={FIELD} /></Field>
              <Field label="Retour prévu" required><input type="datetime-local" value={assign.expectedReturnAt} onChange={(e) => setAssign({ ...assign, expectedReturnAt: e.target.value })} className={FIELD} /></Field>
              <Field label="Objet du prêt" required><input value={assign.purpose} onChange={(e) => setAssign({ ...assign, purpose: e.target.value })} className={FIELD} /></Field>
            </div>
            <Field label="Notes"><textarea rows={2} value={assign.notes} onChange={(e) => setAssign({ ...assign, notes: e.target.value })} className={`${FIELD} resize-none`} /></Field>
          </PanelForm>
        )}
        {panel === "return" && (
          <PanelForm title="Enregistrer le retour" onCancel={close} pending={returnM.isPending} submitLabel="Valider le retour" submitDisabled={!ret.returnedToLocationCode} error={error} onSubmit={(e) => { e.preventDefault(); returnM.mutate(); }}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Rangé dans" required><LocationSelect value={ret.returnedToLocationCode} onChange={(v) => setRet({ ...ret, returnedToLocationCode: v })} /></Field>
              <Field label="Condition au retour">
                <select value={ret.condition} onChange={(e) => setRet({ ...ret, condition: e.target.value })} className={FIELD}>
                  {CONDITIONS.map((c) => <option key={c} value={c}>{CONDITION_LABEL[c]}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Notes"><textarea rows={2} value={ret.notes} onChange={(e) => setRet({ ...ret, notes: e.target.value })} className={`${FIELD} resize-none`} /></Field>
          </PanelForm>
        )}
        {panel === "maintenance" && (
          <PanelForm title="Planifier une maintenance" onCancel={close} pending={maintM.isPending} submitLabel="Planifier" submitDisabled={!maint.description.trim() || !maint.scheduledDate} error={error} onSubmit={(e) => { e.preventDefault(); maintM.mutate(); }}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Type">
                <select value={maint.maintenanceType} onChange={(e) => setMaint({ ...maint, maintenanceType: e.target.value })} className={FIELD}>
                  {Object.entries(MAINT_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </Field>
              <Field label="Date prévue" required><input type="date" value={maint.scheduledDate} onChange={(e) => setMaint({ ...maint, scheduledDate: e.target.value })} className={FIELD} /></Field>
            </div>
            <Field label="Description" required><textarea rows={2} value={maint.description} onChange={(e) => setMaint({ ...maint, description: e.target.value })} className={`${FIELD} resize-none`} /></Field>
          </PanelForm>
        )}
        {rp && (
          <PanelForm title={rp.title} onCancel={close} pending={reasonM.isPending} submitLabel={rp.submit} submitDisabled={!reason.reason.trim() || (panel === "reserve" && !reason.target.trim())} error={error} onSubmit={(e) => { e.preventDefault(); reasonM.mutate(); }}>
            {panel === "reserve" && <Field label={rp.field} required><input value={reason.target} onChange={(e) => setReason({ ...reason, target: e.target.value })} className={FIELD} /></Field>}
            <Field label={rp.reasonLabel} required><textarea rows={2} value={reason.reason} onChange={(e) => setReason({ ...reason, reason: e.target.value })} className={`${FIELD} resize-none`} /></Field>
          </PanelForm>
        )}

        <Tabs variant="soft" active={tab} onChange={(t) => setTab(t as Tab)} items={[{ id: "info", label: "Informations", icon: Info }, { id: "maintenances", label: "Maintenances", icon: Hammer }, { id: "history", label: "Historique", icon: History }]} />

        {tab === "info" && (
          <Section title="Fiche de l'actif">
            <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
              <Detail label="Article">{asset.itemName || asset.itemCode}</Detail>
              <Detail label="Numéro de série" mono>{asset.serialNumber}</Detail>
              <Detail label="Tag" mono>{asset.assetTag}</Detail>
              <Detail label="Emplacement">{asset.locationName || asset.locationCode}</Detail>
              <Detail label="Condition">{label(CONDITION_LABEL, asset.condition)}</Detail>
              <Detail label="Attribué à">{asset.assignedToCode ? `${label(ASSIGNEE_TYPES, asset.assignedToType)} ${asset.assignedToCode}` : undefined}</Detail>
              <Detail label="Coût d'achat">{formatMoney(asset.purchaseCost, "FCFA")}</Detail>
              <Detail label="Valeur actuelle">{formatMoney(asset.depreciatedValue, "FCFA")}{depreciation !== null ? ` (${depreciation}% du coût)` : ""}</Detail>
              <Detail label="Date d'achat">{asset.purchaseDate ? formatDate(asset.purchaseDate) : undefined}</Detail>
              <Detail label="Fin de garantie">{asset.warrantyEndDate ? formatDate(asset.warrantyEndDate) : undefined}</Detail>
              <Detail label="Durée de vie">{asset.usefulLifeMonths ? `${asset.usefulLifeMonths} mois` : undefined}</Detail>
              <Detail label="Valeur résiduelle">{asset.residualValue ? formatMoney(asset.residualValue, "FCFA") : undefined}</Detail>
              <Detail label="Notes" wide>{asset.notes}</Detail>
            </div>
          </Section>
        )}

        {tab === "maintenances" &&
          (maintenances.isLoading ? <ListSkeleton rows={3} /> : maintenances.isError ? <ErrorBlock message="Impossible de charger les maintenances." onRetry={() => maintenances.refetch()} /> : !maintenances.data?.length ? (
            <EmptyState icon={Hammer} title="Aucune maintenance" hint="Planifiez une intervention avec le bouton ci-dessus." />
          ) : (
            <div className="space-y-2">
              {maintenances.data.map((m, i) => (
                <ItemRow key={m.maintenanceCode ?? i} className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{label(MAINT_TYPES, m.maintenanceType) || "Maintenance"}</p>
                    <p className="text-sm text-gray-500">{m.description || "Sans description"}</p>
                    <p className="mt-1 text-xs text-gray-400">{m.scheduledDate || m.scheduledAt ? `Prévue le ${formatDate((m.scheduledDate || m.scheduledAt) as string)}` : "Date non renseignée"}{m.completedAt ? ` · Terminée le ${formatDate(m.completedAt)}` : ""}</p>
                  </div>
                  {m.status && <StatusChip tone={m.status === "COMPLETED" ? "success" : "info"}>{m.status === "COMPLETED" ? "Terminée" : m.status === "SCHEDULED" ? "Planifiée" : m.status}</StatusChip>}
                </ItemRow>
              ))}
            </div>
          ))}

        {tab === "history" &&
          (history.isLoading ? <ListSkeleton rows={3} /> : history.isError ? <ErrorBlock message="Impossible de charger l'historique." onRetry={() => history.refetch()} /> : !history.data?.length ? (
            <EmptyState icon={MapPin} title="Aucun déplacement" hint="L'actif n'a pas changé d'emplacement." />
          ) : (
            <div className="space-y-2">
              {history.data.map((h: any, i: number) => (
                <ItemRow key={i} className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3"><MapPin size={16} className="text-gray-400" /><p className="text-sm font-semibold text-gray-900">{h.locationName || h.locationCode}</p></div>
                  <p className="text-xs text-gray-500">{h.movedBy ? `${h.movedBy} · ` : ""}{h.movedAt ? formatDateTime(h.movedAt) : ""}</p>
                </ItemRow>
              ))}
            </div>
          ))}
      </div>
    </div>
  );
};
