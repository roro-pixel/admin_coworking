import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardList } from "lucide-react";
import { ActionForm } from "../../../components/accounting/ActionForm";
import { fixedAssetService } from "../../../services/fixedAsset.service";
import { useAuth } from "../../../contexts/AuthContext";
import { ActionButton, EmptyState, ErrorBlock, ListHeader, StatusChip } from "../../../components/subscription/kit";
import { formatDate } from "../../../components/subscription/kitUtils";
import { ListSkeleton } from "../../../components/ui/Skeleton";
import { toast } from "../../../components/ui/toastStore";

export const CAMPAIGNS_KEY = "fa-campaigns";

export const InventoriesPanel: React.FC = () => {
  const nav = useNavigate();
  const qc = useQueryClient();
  const canManage = useAuth().hasPermission("ACCOUNTING_SETTINGS:MANAGE");
  const [open, setOpen] = useState(false);
  const q = useQuery({ queryKey: [CAMPAIGNS_KEY], queryFn: fixedAssetService.campaigns });
  return (
    <div className="space-y-4">
      <ListHeader title="Inventaires physiques" subtitle="Campagnes de comptage, écarts et procès-verbal."
        action={canManage && !open ? <ActionButton onClick={() => setOpen(true)}>Nouvelle campagne</ActionButton> : undefined} />
      {open && (
        <ActionForm title="Nouvelle campagne" submitLabel="Ouvrir" onClose={() => setOpen(false)}
          fields={[
            { key: "label", label: "Libellé", required: true }, { key: "site", label: "Site" }, { key: "startDate", label: "Début", type: "date" }, { key: "witness", label: "Témoin" },
            { key: "resourceCodes", label: "Espaces", type: "list", hint: "Codes séparés par des virgules" }, { key: "categoryCodes", label: "Catégories", type: "list" }, { key: "team", label: "Équipe", type: "list" },
          ]}
          onSubmit={async (v) => { const r = await fixedAssetService.createCampaign(v); qc.invalidateQueries({ queryKey: [CAMPAIGNS_KEY] }); toast.success("Campagne ouverte"); if (r.campaign?.code) nav(`/accounting/fixed-assets/inventories/${encodeURIComponent(r.campaign.code)}`); }} />
      )}
      {q.isLoading ? <ListSkeleton /> : q.isError ? <ErrorBlock message="Chargement impossible." onRetry={() => q.refetch()} /> : (q.data ?? []).length === 0 ? <EmptyState icon={ClipboardList} title="Aucune campagne" /> : (
        <div className="space-y-2">
          {q.data!.map((c) => (
            <button key={c.code} onClick={() => nav(`/accounting/fixed-assets/inventories/${encodeURIComponent(c.code)}`)} className="flex w-full flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-3 text-left shadow-sm hover:bg-gray-50">
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-gray-900">{c.code} · {c.label}</span>
                <span className="block text-xs text-gray-400">{[c.site, formatDate(c.startDate), `${c.seenCount ?? 0}/${c.expectedCount ?? 0} vus`, c.missingCount ? `${c.missingCount} manquant(s)` : null, c.mislocatedCount ? `${c.mislocatedCount} mal placé(s)` : null].filter(Boolean).join(" · ")}</span>
              </span>
              {c.status && <StatusChip tone={c.closedAt ? "success" : "warn"}>{c.status}</StatusChip>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
