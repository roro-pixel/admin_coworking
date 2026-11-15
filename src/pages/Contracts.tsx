import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Eye, FileText, Pencil, Plus, Trash2 } from "lucide-react";
import { contractService } from "../services/contract.service";
import type { ContractResponse } from "../services/contract.service";
import { documentService } from "../services/document.service";
import {
  ActionButton,
  DataCard,
  EmptyState,
  ErrorBlock,
  FilterButton,
  FilterPanel,
  HeadRow,
  IconButton,
  ListHeader,
  Pagination,
  SearchField,
  StatusChip,
  Tabs,
  Tag,
} from "../components/subscription/kit";
import type { TabItem } from "../components/subscription/kit";
import { FIELD_SOFT, apiMessage, formatDate } from "../components/subscription/kitUtils";
import { ListSkeleton } from "../components/ui/Skeleton";
import { toast } from "../components/ui/toastStore";
import { saveBlob } from "../components/payment/paymentUtils";
import { ContractShell } from "../components/contracts/ContractShell";
import { ContractFormPanel } from "../components/contracts/ContractFormPanel";
import { AttachSignedPanel } from "../components/contracts/AttachSignedPanel";
import { ReasonPanel } from "../components/contracts/ReasonPanel";
import { useContractActions } from "../components/contracts/useContractActions";
import type { RunnableAction } from "../components/contracts/useContractActions";
import { CONTRACT_STATUS, OWNER_TYPE_LABELS, actionsFor, canDelete, canEdit, statusOf } from "../components/contracts/contractLabels";
import type { ContractActionKey } from "../components/contracts/contractLabels";

const PAGE_SIZE = 20;
const COLS = "lg:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_9.5rem_11rem]";
const STATUS_TABS: TabItem<string>[] = [
  { id: "all", label: "Tous" },
  ...Object.entries(CONTRACT_STATUS).map(([id, s]) => ({ id, label: s.label })),
];
const REASON_ACTIONS = ["suspend", "terminate", "cancel", "approve_review", "reject_review"] as const;
type ReasonAction = (typeof REASON_ACTIONS)[number];

type Panel =
  | { kind: "create" }
  | { kind: "edit"; contract: ContractResponse }
  | { kind: "attach"; contract: ContractResponse }
  | { kind: "reason"; action: ReasonAction; contract: ContractResponse }
  | null;

export const AdminContracts: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [ownerType, setOwnerType] = useState("all");
  const [page, setPage] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [panel, setPanel] = useState<Panel>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  const actions = useContractActions(() => setPanel(null));

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["contracts", page, status, ownerType],
    queryFn: () =>
      contractService.getAllContracts({
        status: status !== "all" ? status : undefined,
        ownerType: ownerType !== "all" ? ownerType : undefined,
        page,
        size: PAGE_SIZE,
        sort: "createdAt,desc",
      }),
  });

  const contracts = data?.content ?? [];
  // Le backend n'expose pas de recherche texte sur les contrats : le filtre porte sur la page affichée
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return contracts;
    return contracts.filter((c) =>
      [c.title, c.contractCode, c.ownerCode, c.businessCode, c.templateCode].some((v) => (v ?? "").toLowerCase().includes(q)),
    );
  }, [contracts, search]);

  const filtersActive = ownerType !== "all";
  const canReset = filtersActive || status !== "all" || !!search;
  const reset = () => {
    setSearch("");
    setStatus("all");
    setOwnerType("all");
    setPage(0);
  };

  const download = async (code: string) => {
    setDownloading(code);
    try {
      saveBlob(await documentService.downloadDocument(code), `${code}.pdf`);
    } catch (e) {
      toast.error(apiMessage(e, "Téléchargement impossible."));
    } finally {
      setDownloading(null);
    }
  };

  const onAction = (action: ContractActionKey, c: ContractResponse) => {
    if (action === "attach_signed") return setPanel({ kind: "attach", contract: c });
    if ((REASON_ACTIONS as readonly string[]).includes(action)) return setPanel({ kind: "reason", action: action as ReasonAction, contract: c });
    actions.run({ action: action as RunnableAction, code: c.contractCode });
  };

  const confirmDelete = (c: ContractResponse) =>
    toast.confirm({
      message: `Supprimer le contrat « ${c.title} » ?`,
      detail: c.contractCode,
      confirmLabel: "Supprimer",
      pendingLabel: "Suppression",
      successMessage: "Contrat supprimé",
      errorMessage: "Suppression impossible",
      onConfirm: () => actions.remove.mutateAsync(c.contractCode),
    });

  const afterSave = () => {
    queryClient.invalidateQueries({ queryKey: ["contracts"] });
    setPanel(null);
  };

  return (
    <ContractShell>
      <div className="space-y-5">
        <ListHeader
          title="Contrats"
          subtitle={`Cycle de vie, génération et signature${data?.totalElements ? ` · ${data.totalElements} contrat${data.totalElements > 1 ? "s" : ""}` : ""}`}
          action={
            <div className="flex flex-wrap gap-2">
              <ActionButton variant="ghost" icon={FileText} onClick={() => navigate("/contracts/templates-drafting")}>
                Templates et rédaction
              </ActionButton>
              <ActionButton variant="ghost" onClick={() => setPanel({ kind: "create" })}>
                Création rapide
              </ActionButton>
              <ActionButton icon={Plus} onClick={() => navigate("/contracts/new")}>
                Création avancée
              </ActionButton>
            </div>
          }
        />

        {panel?.kind === "create" && <ContractFormPanel onSaved={afterSave} onCancel={() => setPanel(null)} />}
        {panel?.kind === "edit" && (
          <ContractFormPanel key={panel.contract.contractCode} contract={panel.contract} onSaved={afterSave} onCancel={() => setPanel(null)} />
        )}
        {panel?.kind === "attach" && (
          <AttachSignedPanel
            contractCode={panel.contract.contractCode}
            ownerType={panel.contract.ownerType}
            ownerCode={panel.contract.ownerCode}
            onSuccess={() => {
              toast.success("Document signé rattaché");
              afterSave();
            }}
            onCancel={() => setPanel(null)}
          />
        )}
        {panel?.kind === "reason" && (
          <ReasonPanel
            action={panel.action}
            contractCode={panel.contract.contractCode}
            pending={actions.pending}
            onSubmit={(reason) => actions.run({ action: panel.action, code: panel.contract.contractCode, reason })}
            onCancel={() => setPanel(null)}
          />
        )}

        <Tabs
          variant="soft"
          items={STATUS_TABS}
          active={status}
          onChange={(id) => {
            setStatus(id);
            setPage(0);
          }}
        />

        <div className="flex flex-col gap-3 sm:flex-row">
          <SearchField value={search} onChange={setSearch} placeholder="Titre, code, propriétaire..." className="flex-1" />
          <FilterButton open={showFilters} active={filtersActive} onClick={() => setShowFilters((v) => !v)} />
        </div>

        {showFilters && (
          <FilterPanel canReset={canReset} onReset={reset}>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-gray-600">Type de propriétaire</span>
              <select
                value={ownerType}
                onChange={(e) => {
                  setOwnerType(e.target.value);
                  setPage(0);
                }}
                className={FIELD_SOFT}
              >
                <option value="all">Tous les propriétaires</option>
                <option value="MEMBER">Membres</option>
                <option value="CUSTOMER">Customers</option>
                <option value="BUSINESS">Business</option>
              </select>
            </label>
          </FilterPanel>
        )}

        {isLoading ? (
          <ListSkeleton rows={6} />
        ) : isError ? (
          <ErrorBlock message="Impossible de charger les contrats." onRetry={() => refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Aucun contrat"
            hint={canReset ? "Aucun contrat ne correspond à ces critères." : "Créez le premier contrat pour commencer."}
            action={canReset ? <ActionButton variant="ghost" onClick={reset}>Réinitialiser</ActionButton> : undefined}
          />
        ) : (
          <DataCard>
            <HeadRow cols={COLS}>
              <span>Contrat</span>
              <span>Propriétaire</span>
              <span>Template</span>
              <span>Période</span>
              <span>Statut</span>
              <span className="text-right">Actions</span>
            </HeadRow>
            <div className="space-y-1.5">
              {rows.map((c) => {
                const st = statusOf(CONTRACT_STATUS, c.status);
                const editable = canEdit(c.status);
                return (
                  <div
                    key={c.contractCode}
                    role="link"
                    tabIndex={0}
                    onClick={() => navigate(`/contracts/${c.contractCode}`)}
                    onKeyDown={(e) => e.key === "Enter" && navigate(`/contracts/${c.contractCode}`)}
                    className={`grid cursor-pointer items-center gap-x-4 gap-y-2 rounded-2xl bg-gray-50 px-4 py-3 transition hover:bg-[color:color-mix(in_srgb,var(--logo-pink)_8%,white)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--logo-pink)] ${COLS}`}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-900">{c.title}</p>
                      <p className="font-mono text-xs text-gray-400">{c.contractCode}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-mono text-xs font-semibold text-gray-700">{c.ownerCode}</p>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        <Tag>{OWNER_TYPE_LABELS[c.ownerType] ?? c.ownerType}</Tag>
                        {c.businessCode && c.businessCode !== c.ownerCode && <Tag tone="pink">{c.businessCode}</Tag>}
                      </div>
                    </div>
                    <p className="truncate font-mono text-xs text-gray-500">{c.templateCode}</p>
                    <div className="text-sm text-gray-600">
                      <p>{formatDate(c.startDate) || "Non renseigné"}</p>
                      <p className="text-xs text-gray-400">{c.endDate ? `Fin ${formatDate(c.endDate)}` : "Durée indéterminée"}</p>
                    </div>
                    <div>
                      <StatusChip tone={st.tone}>{st.label}</StatusChip>
                    </div>
                    <div className="flex flex-wrap items-center gap-0.5 lg:justify-end" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                      <IconButton icon={Eye} label="Prévisualiser" onClick={() => navigate(`/contracts/preview/${c.contractCode}`)} />
                      {c.draftDocumentCode && (
                        <IconButton
                          icon={Download}
                          label="Télécharger le brouillon"
                          pending={downloading === c.draftDocumentCode}
                          onClick={() => download(c.draftDocumentCode!)}
                        />
                      )}
                      {editable && <IconButton icon={Pencil} label="Modifier" onClick={() => setPanel({ kind: "edit", contract: c })} />}
                      {actionsFor(c.status).map((a) => (
                        <IconButton
                          key={a.action}
                          icon={a.icon}
                          label={a.label}
                          tone={a.tone}
                          pending={a.action !== "attach_signed" && actions.isRunning(c.contractCode, a.action as RunnableAction)}
                          disabled={actions.pending}
                          onClick={() => onAction(a.action, c)}
                        />
                      ))}
                      {canDelete(c.status) && <IconButton icon={Trash2} label="Supprimer" tone="danger" onClick={() => confirmDelete(c)} />}
                    </div>
                  </div>
                );
              })}
            </div>
          </DataCard>
        )}

        <Pagination page={page} totalPages={data?.totalPages ?? 0} total={data?.totalElements ?? 0} noun="contrat" onChange={setPage} />
      </div>
    </ContractShell>
  );
};
