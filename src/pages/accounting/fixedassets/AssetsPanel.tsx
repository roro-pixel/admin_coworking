import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Package } from "lucide-react";
import { ActionForm } from "../../../components/accounting/ActionForm";
import { fixedAssetService } from "../../../services/fixedAsset.service";
import { useAuth } from "../../../contexts/AuthContext";
import { money } from "../../../components/accounting/accountingLabels";
import { ActionButton, EmptyState, ErrorBlock, Field, ListHeader, StatusChip } from "../../../components/subscription/kit";
import { FIELD, apiMessage } from "../../../components/subscription/kitUtils";
import { saveBlob } from "../../../components/payment/paymentUtils";
import { ListSkeleton } from "../../../components/ui/Skeleton";
import { toast } from "../../../components/ui/toastStore";
import { ASSET_FIELDS } from "./assetFields";

export const ASSETS_KEY = "fa-assets";

export const AssetsPanel: React.FC = () => {
  const nav = useNavigate();
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const canManage = hasPermission("ACCOUNTING_SETTINGS:MANAGE");
  const [f, setF] = useState({ status: "", category: "", site: "", resource: "", holder: "" });
  const [creating, setCreating] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const q = useQuery({ queryKey: [ASSETS_KEY, f], queryFn: () => fixedAssetService.assets(f) });

  const labels = async () => {
    try { saveBlob(await fixedAssetService.labels(picked), "etiquettes.pdf"); setPicked([]); }
    catch (e) { toast.error(apiMessage(e, "Planche impossible.")); }
  };
  const tog = (c: string) => setPicked((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c]));
  const inp = (k: keyof typeof f, label: string) => <Field label={label}><input className={FIELD} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></Field>;

  return (
    <div className="space-y-4">
      <ListHeader title="Fichier des immobilisations" subtitle="Biens, valeurs nettes et état comptable."
        action={<div className="flex gap-2">
          {picked.length > 0 && <ActionButton variant="ghost" onClick={labels}>Planche d'étiquettes ({picked.length})</ActionButton>}
          {canManage && !creating && <ActionButton onClick={() => setCreating(true)}>Nouveau bien</ActionButton>}
        </div>} />
      {creating && (
        <ActionForm title="Nouveau bien" fields={ASSET_FIELDS} submitLabel="Créer"
          onSubmit={async (v) => { const r = await fixedAssetService.create(v); qc.invalidateQueries({ queryKey: [ASSETS_KEY] }); toast.success("Bien créé"); (r.warnings ?? []).forEach((w) => toast.error(w)); if (r.asset?.code) nav(`/accounting/fixed-assets/${encodeURIComponent(r.asset.code)}`); }}
          onClose={() => setCreating(false)} />
      )}
      <div className="grid gap-3 sm:grid-cols-5">{inp("status", "État")}{inp("category", "Catégorie")}{inp("site", "Site")}{inp("resource", "Espace")}{inp("holder", "Détenteur")}</div>
      {q.isLoading ? <ListSkeleton /> : q.isError ? <ErrorBlock message="Chargement impossible." onRetry={() => q.refetch()} /> : (q.data ?? []).length === 0 ? <EmptyState icon={Package} title="Aucun bien" /> : (
        <div className="space-y-2">
          {q.data!.map((a) => (
            <div key={a.code} className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm hover:bg-gray-50">
              {canManage && <input type="checkbox" aria-label={`Choisir ${a.code}`} checked={picked.includes(a.code ?? "")} onChange={() => tog(a.code ?? "")} />}
              <button className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-3 text-left" onClick={() => nav(`/accounting/fixed-assets/${encodeURIComponent(a.code ?? "")}`)}>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-gray-900">{a.code} · {a.designation}</span>
                  <span className="block truncate text-xs text-gray-400">{[a.categoryCode, a.site, a.resourceCode, a.holder].filter(Boolean).join(" · ")}</span>
                </span>
                <span className="flex items-center gap-3 text-sm">
                  <span className="font-mono">{money(a.entryValue)}</span>
                  {a.accountingStatus && <StatusChip tone="neutral">{a.accountingStatus}</StatusChip>}
                </span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
