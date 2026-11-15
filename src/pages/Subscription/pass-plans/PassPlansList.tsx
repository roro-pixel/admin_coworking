import React, { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Archive,
  ArrowUpRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Pencil,
  Plus,
  ShoppingCart,
  Ticket,
} from "lucide-react";
import { subscriptionService } from "../../../services/subscription.service";
import type { PassPlanResponse, PassPlanStatus, PassType } from "../../../services/subscription.service";
import { TableSkeleton } from "../../../components/ui/Skeleton";
import { toast } from "../../../components/ui/toastStore";
import {
  ActionButton,
  DataCard,
  EmptyState,
  HeadRow,
  IconButton,
  ListHeader,
  Pagination,
  SearchField,
  StatusChip,
  Tag,
} from "../../../components/subscription/kit";
import { FIELD_SOFT, ROW_HOVER, apiMessage } from "../../../components/subscription/kitUtils";
import { PASS_TYPE_LABELS, PLAN_STATUS, TARGET_AUDIENCE_LABELS, statusOf } from "../../../components/subscription/labels";
import { PassPlanPanel } from "./PassPlanPanel";
import { PurchasePassPanel } from "./PurchasePassPanel";

const PAGE_SIZE = 20;

const COLS =
  "lg:grid-cols-[minmax(0,1.8fr)_minmax(0,1.2fr)_minmax(0,1fr)_5rem_7rem_13rem]";

const LIST_TYPES: PassType[] = ["DAY_PASS", "TIME_PACK", "MEETING_ROOM_PACK", "COMPANY_SHARED_PASS", "CUSTOM"];

export const PassPlansList: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState<"" | PassPlanStatus>("");
  const [passType, setPassType] = useState<"" | PassType>("");
  const [page, setPage] = useState(0);
  const [panel, setPanel] = useState<
    { kind: "form"; plan: PassPlanResponse | null } | { kind: "purchase"; plan: PassPlanResponse } | null
  >(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading } = useQuery({
    queryKey: ["pass-plans", status, passType, debouncedSearch, page],
    queryFn: () =>
      subscriptionService.getPassPlans({
        status: status || undefined,
        passType: passType || undefined,
        searchText: debouncedSearch || undefined,
        page,
        size: PAGE_SIZE,
        sort: "sortOrder,asc",
      }),
  });

  const publishMutation = useMutation({
    mutationFn: (code: string) => subscriptionService.publishPassPlan(code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pass-plans"] });
      toast.success("Plan publié");
    },
    onError: (e: unknown) => toast.error(apiMessage(e, "Erreur lors de la publication.")),
  });

  // Archivage : toast de confirmation, l'erreur de l'API y est affichée
  const archiveMutation = useMutation({
    mutationFn: (code: string) => subscriptionService.archivePassPlan(code),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pass-plans"] }),
  });

  const askArchive = (plan: PassPlanResponse) =>
    toast.confirm({
      message: `Archiver « ${plan.name} » ?`,
      detail: plan.code,
      confirmLabel: "Archiver",
      pendingLabel: "Archivage en cours",
      successMessage: "Plan archivé",
      errorMessage: "L'archivage a échoué",
      onConfirm: () => archiveMutation.mutateAsync(plan.code),
    });

  const plans = data?.content || [];
  const totalPages = data?.totalPages || 1;
  const totalElements = data?.totalElements ?? plans.length;
  const hasFilters = !!(status || passType || search);

  const handleReset = () => {
    setSearch("");
    setDebouncedSearch("");
    setStatus("");
    setPassType("");
    setPage(0);
  };

  const closePanel = () => setPanel(null);
  const open = (p: typeof panel) => {
    setPanel(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const busyPublish = (code: string) => publishMutation.isPending && publishMutation.variables === code;

  return (
    <div className="space-y-5">
      <ListHeader
        title="Plans de pass"
        subtitle="Catalogue, versions, prix, droits et achat depuis un plan."
        action={
          <ActionButton icon={Plus} className="w-full sm:w-auto" onClick={() => open({ kind: "form", plan: null })}>
            Nouveau plan
          </ActionButton>
        }
      />

      {panel?.kind === "form" && (
        <PassPlanPanel
          key={panel.plan?.code ?? "new"}
          editingPlan={panel.plan}
          onDone={closePanel}
          onCancel={closePanel}
        />
      )}
      {panel?.kind === "purchase" && (
        <PurchasePassPanel
          key={panel.plan.code}
          plan={panel.plan}
          onCancel={closePanel}
          onDone={(passNumber) => {
            closePanel();
            toast.success("Pass généré");
            navigate(`/subscriptions/passes/${passNumber}`);
          }}
        />
      )}

      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_14rem_14rem]">
        <SearchField value={search} onChange={setSearch} placeholder="Rechercher un plan..." />
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as "" | PassPlanStatus);
            setPage(0);
          }}
          className={`${FIELD_SOFT} bg-white shadow-sm`}
        >
          <option value="">Tous statuts</option>
          {Object.entries(PLAN_STATUS).map(([value, s]) => (
            <option key={value} value={value}>
              {s.label}
            </option>
          ))}
        </select>
        <select
          value={passType}
          onChange={(e) => {
            setPassType(e.target.value as "" | PassType);
            setPage(0);
          }}
          className={`${FIELD_SOFT} bg-white shadow-sm`}
        >
          <option value="">Tous types</option>
          {LIST_TYPES.map((t) => (
            <option key={t} value={t}>
              {PASS_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <TableSkeleton rows={5} cols={6} />
      ) : plans.length === 0 ? (
        <EmptyState
          icon={Ticket}
          title="Aucun plan trouvé"
          action={
            hasFilters ? (
              <ActionButton variant="ghost" onClick={handleReset}>
                Réinitialiser les filtres
              </ActionButton>
            ) : undefined
          }
        />
      ) : (
        <DataCard>
          <HeadRow cols={COLS}>
            <span>Plan</span>
            <span>Type</span>
            <span>Public</span>
            <span>KYC</span>
            <span>Statut</span>
            <span className="text-right">Actions</span>
          </HeadRow>

          <div className="space-y-2">
            {plans.map((plan) => {
              const st = statusOf(PLAN_STATUS, plan.status);
              const typeLabel = PASS_TYPE_LABELS[plan.passType] ?? plan.passType;
              const audience = TARGET_AUDIENCE_LABELS[plan.targetAudience] ?? plan.targetAudience;
              const goDetail = () => navigate(`/subscriptions/pass-plans/${plan.code}`);
              const actions = (
                <>
                  <IconButton icon={ArrowUpRight} label="Voir le détail" onClick={goDetail} />
                  <IconButton
                    icon={ShoppingCart}
                    label="Acheter un pass"
                    onClick={() => open({ kind: "purchase", plan })}
                  />
                  <IconButton
                    icon={Pencil}
                    label="Modifier"
                    tone="neutral"
                    onClick={() => open({ kind: "form", plan })}
                  />
                  <IconButton
                    icon={CheckCircle2}
                    label="Publier"
                    tone="success"
                    pending={busyPublish(plan.code)}
                    onClick={() => publishMutation.mutate(plan.code)}
                  />
                  <IconButton
                    icon={Archive}
                    label="Archiver"
                    tone="danger"
                    pending={archiveMutation.isPending && archiveMutation.variables === plan.code}
                    onClick={() => askArchive(plan)}
                  />
                </>
              );
              return (
                <div
                  key={plan.code}
                  onClick={goDetail}
                  className={`cursor-pointer rounded-2xl bg-gray-50 p-3 ${ROW_HOVER}`}
                >
                  {/* Desktop */}
                  <div className={`hidden items-center gap-4 px-1 lg:grid ${COLS}`}>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-gray-900">{plan.name}</p>
                      <p className="mt-0.5 flex items-center gap-2 text-xs text-gray-400">
                        <span className="truncate font-mono">{plan.code}</span>
                        <span className="inline-flex items-center gap-1">
                          {plan.visible ? <Eye size={12} /> : <EyeOff size={12} />}
                          {plan.visible ? "Visible" : "Masqué"}
                        </span>
                      </p>
                    </div>
                    <span className="truncate text-sm text-gray-700">{typeLabel}</span>
                    <span className="truncate text-sm text-gray-700">{audience}</span>
                    <span className="text-sm text-gray-700">{plan.requiredKycLevel}</span>
                    <span>
                      <StatusChip tone={st.tone}>{st.label}</StatusChip>
                    </span>
                    <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      {actions}
                    </div>
                  </div>

                  {/* Mobile et tablette */}
                  <div className="lg:hidden">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-gray-900">{plan.name}</p>
                        <p className="mt-0.5 font-mono text-xs text-gray-400">{plan.code}</p>
                      </div>
                      <StatusChip tone={st.tone}>{st.label}</StatusChip>
                    </div>
                    {plan.description && (
                      <p className="mt-2 line-clamp-2 text-sm text-gray-500">{plan.description}</p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Tag>{typeLabel}</Tag>
                      <Tag>{audience}</Tag>
                      <Tag>KYC {plan.requiredKycLevel}</Tag>
                      <Tag>{plan.visible ? "Visible" : "Masqué"}</Tag>
                    </div>
                    <div className="mt-3 flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      {actions}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </DataCard>
      )}

      <Pagination page={page} totalPages={totalPages} total={totalElements} noun="plan" onChange={setPage} />
    </div>
  );
};
