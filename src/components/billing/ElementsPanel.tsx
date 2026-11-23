import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link2, Search, Unlink } from "lucide-react";
import { billingService } from "../../services/billing.service";
import type { ActivationMode, BillingElement } from "../../services/billing.service";
import { ActionButton, CheckField, EmptyState, ErrorBlock, Field, IconButton, ItemRow, PanelForm, Section, Tag } from "../subscription/kit";
import { FIELD, FIELD_SOFT, formatDate, formatMoney } from "../subscription/kitUtils";
import { Skeleton } from "../ui/Skeleton";
import { toast } from "../ui/toastStore";
import { billingError } from "./billingErrors";
import { ACTIVATION_MODE_LABEL, ELEMENT_TYPE_LABEL } from "./billingLabels";

/** Recherche d'un client (ou externe) puis choix d'un de ses éléments (abonnement, pass, réservation, domiciliation). */
const ElementSearch: React.FC<{ onPick: (e: BillingElement) => void; onClose: () => void }> = ({ onPick, onClose }) => {
  const [q, setQ] = useState("");
  const [partyKey, setPartyKey] = useState<{ type: string; code: string } | null>(null);
  const parties = useQuery({ queryKey: ["billing-element-parties", q], queryFn: () => billingService.searchBillingParties(q.trim(), 10), enabled: q.trim().length > 1 && !partyKey });
  const elements = useQuery({ queryKey: ["billing-elements", partyKey?.type, partyKey?.code], queryFn: () => billingService.listBillingElements(partyKey!.type, partyKey!.code), enabled: !!partyKey });
  return (
    <div className="mb-4 rounded-2xl bg-white p-3 shadow-lg ring-1 ring-black/5">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input autoFocus className={`${FIELD} pl-10`} value={q} onChange={(e) => { setQ(e.target.value); setPartyKey(null); }} placeholder="Rechercher un client ou un membre" />
        </div>
        <ActionButton variant="ghost" onClick={onClose}>Fermer</ActionButton>
      </div>
      <div className="mt-2 max-h-64 overflow-y-auto">
        {!partyKey && (parties.data ?? []).map((p) => (
          <button key={`${p.type}-${p.code}`} type="button" onClick={() => setPartyKey({ type: p.type, code: p.code })} className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left hover:bg-gray-50">
            <span className="min-w-0"><span className="block truncate text-sm font-semibold text-gray-900">{p.name ?? p.code}</span><span className="block truncate text-xs text-gray-400">{p.email ?? p.phone ?? p.code}</span></span>
            {p.external && <Tag>Externe</Tag>}
          </button>
        ))}
        {partyKey && (elements.isLoading ? <Skeleton className="h-10 w-full rounded-xl" />
          : (elements.data ?? []).length === 0 ? <p className="p-3 text-xs text-gray-400">Aucun élément.</p>
          : (elements.data ?? []).map((e) => (
            <button key={`${e.type}-${e.code}`} type="button" onClick={() => onPick(e)} className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left hover:bg-gray-50">
              <span className="min-w-0"><span className="block truncate text-sm font-semibold text-gray-900">{ELEMENT_TYPE_LABEL[e.type] ?? e.type} · {e.label ?? e.code}</span><span className="block truncate font-mono text-xs text-gray-400">{e.code}{e.startDate ? ` · ${formatDate(e.startDate)}` : ""}</span></span>
              {e.totalAmount != null && <span className="shrink-0 text-sm font-bold tabular-nums text-gray-800">{formatMoney(e.totalAmount)}</span>}
            </button>
          )))}
      </div>
    </div>
  );
};

/**
 * Éléments réglés par une facture : liste, rattachement d'un élément (abonnement, pass, réservation, domiciliation),
 * mode d'activation, retrait. Sert aussi à rattacher une facture à l'élément d'un autre client.
 */
export const ElementsPanel: React.FC<{ documentNumber: string; editable: boolean }> = ({ documentNumber, editable }) => {
  const qc = useQueryClient();
  const [picking, setPicking] = useState(false);
  const [chosen, setChosen] = useState<BillingElement | null>(null);
  const [mode, setMode] = useState<ActivationMode>("FULL_SETTLEMENT");
  const [replace, setReplace] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ["billing-document-elements", documentNumber], queryFn: () => billingService.getDocumentElements(documentNumber) });
  const refresh = () => { qc.invalidateQueries({ queryKey: ["billing-document-elements", documentNumber] }); qc.invalidateQueries({ queryKey: ["billing-document", documentNumber] }); };

  const link = useMutation({
    mutationFn: () => billingService.linkDocumentElement(documentNumber, { type: chosen!.type, code: chosen!.code, activationMode: mode, replaceOwnInvoice: replace || undefined }),
    onSuccess: () => { refresh(); setChosen(null); setReplace(false); toast.success("Élément rattaché."); },
    onError: (e: unknown) => setError(billingError(e, "Impossible de rattacher l'élément.")),
  });
  const unlink = useMutation({
    mutationFn: (e: { type: string; code: string }) => billingService.unlinkDocumentElement(documentNumber, e.type, e.code),
    onSuccess: () => { refresh(); toast.success("Élément retiré."); },
    onError: (e: unknown) => toast.error(billingError(e, "Impossible de retirer l'élément.")),
  });

  return (
    <Section title="Éléments réglés" icon={Link2} description="Abonnements, pass, réservations et domiciliations payés par cette facture"
      action={editable && !picking && !chosen ? <ActionButton variant="ghost" icon={Link2} className="!px-4 !py-2" onClick={() => setPicking(true)}>Rattacher</ActionButton> : undefined}>
      {picking && !chosen && <ElementSearch onPick={(e) => { setChosen(e); setPicking(false); }} onClose={() => setPicking(false)} />}
      {chosen && (
        <PanelForm title={`Rattacher ${ELEMENT_TYPE_LABEL[chosen.type] ?? chosen.type} ${chosen.code}`} submitLabel="Rattacher" pending={link.isPending} error={error} onCancel={() => { setChosen(null); setError(null); }}
          onSubmit={(e) => { e.preventDefault(); setError(null); link.mutate(); }}>
          <Field label="Activation de l'élément">
            <select className={FIELD_SOFT} value={mode} onChange={(e) => setMode(e.target.value as ActivationMode)}>
              {Object.entries(ACTIVATION_MODE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
          <CheckField checked={replace} onChange={setReplace} label="Remplacer la facture propre de l'élément par celle-ci" />
        </PanelForm>
      )}
      {isLoading ? <Skeleton className="h-14 w-full rounded-2xl" />
        : isError ? <ErrorBlock message="Impossible de charger les éléments." onRetry={() => refetch()} />
        : (data ?? []).length === 0 ? <EmptyState icon={Link2} title="Aucun élément rattaché" />
        : (
          <div className="space-y-2">
            {(data ?? []).map((e) => (
              <ItemRow key={`${e.type}-${e.code}`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{ELEMENT_TYPE_LABEL[e.type] ?? e.type} <span className="font-mono text-xs font-normal text-gray-400">{e.code}</span></p>
                    <p className="text-xs text-gray-500">{e.origin === "LINKED" ? "Rattaché depuis une autre facture" : "Facture propre"}{e.activationMode ? ` · ${ACTIVATION_MODE_LABEL[e.activationMode] ?? e.activationMode}` : ""}</p>
                  </div>
                  {editable && <IconButton icon={Unlink} tone="danger" label="Retirer l'élément" pending={unlink.isPending} onClick={() => unlink.mutate({ type: e.type, code: e.code })} />}
                </div>
              </ItemRow>
            ))}
          </div>
        )}
    </Section>
  );
};
