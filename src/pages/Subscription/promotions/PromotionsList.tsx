import React, { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ArrowUpRight, Pencil, Play, Plus, Percent } from "lucide-react";
import { subscriptionService } from "../../../services/subscription.service";
import type { Promotion } from "../../../services/subscription.service";
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
import { FIELD_SOFT, ROW_HOVER, formatDate } from "../../../components/subscription/kitUtils";
import { discountValueText } from "./promotionUtils";
import { DISCOUNT_TYPE_LABELS, PROMOTION_STATUS, statusOf } from "../../../components/subscription/labels";

const PAGE_SIZE = 20;

const COLS =
  "lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1.6fr)_minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1.1fr)_minmax(0,0.9fr)_7rem_8rem]";

export const PromotionsList: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading } = useQuery({
    queryKey: ["promotions", statusFilter, page],
    queryFn: () =>
      subscriptionService.getPromotions({
        status: statusFilter || undefined,
        page,
        size: PAGE_SIZE,
      }),
  });

  // Toast de confirmation : l'erreur de l'API y est affichée
  const activateMutation = useMutation({
    mutationFn: (code: string) => subscriptionService.activatePromotion(code),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["promotions"] }),
  });

  const askActivate = (promo: Promotion) =>
    toast.confirm({
      message: `Activer « ${promo.name} » ?`,
      detail: "Elle deviendra disponible pour les utilisateurs.",
      confirmLabel: "Activer",
      pendingLabel: "Activation en cours",
      successMessage: "Promotion activée",
      errorMessage: "L'activation a échoué",
      tone: "primary",
      onConfirm: () => activateMutation.mutateAsync(promo.code),
    });

  const promotions = data?.content ?? [];
  const totalPages = data?.totalPages ?? 1;
  const totalElements = data?.totalElements ?? promotions.length;

  // Filtre local sur le nom (pas de recherche textuelle côté API)
  const needle = debouncedSearch.toLowerCase();
  const filtered = debouncedSearch ? promotions.filter((p) => p.name.toLowerCase().includes(needle)) : promotions;
  const hasFilters = !!(search || statusFilter);

  const handleReset = () => {
    setSearch("");
    setDebouncedSearch("");
    setStatusFilter("");
    setPage(0);
  };

  return (
    <div className="space-y-5">
      <ListHeader
        title="Promotions"
        action={
          <ActionButton icon={Plus} className="w-full sm:w-auto" onClick={() => navigate("/subscriptions/promotions/create")}>
            Nouvelle promotion
          </ActionButton>
        }
      />

      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_14rem]">
        <SearchField value={search} onChange={setSearch} placeholder="Rechercher par nom..." />
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(0);
          }}
          className={`${FIELD_SOFT} bg-white shadow-sm`}
        >
          <option value="">Tous statuts</option>
          {Object.entries(PROMOTION_STATUS).map(([value, s]) => (
            <option key={value} value={value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <TableSkeleton rows={6} cols={7} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Percent}
          title="Aucune promotion trouvée"
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
            <span>Code</span>
            <span>Nom</span>
            <span>Type</span>
            <span>Valeur</span>
            <span>Période</span>
            <span>Utilisations</span>
            <span>Statut</span>
            <span className="text-right">Actions</span>
          </HeadRow>

          <div className="space-y-2">
            {filtered.map((promo) => {
              const st = statusOf(PROMOTION_STATUS, promo.status);
              const type = DISCOUNT_TYPE_LABELS[promo.discountType] ?? promo.discountType;
              const value = discountValueText(promo);
              const open = () => navigate(`/subscriptions/promotions/${promo.code}`);
              const uses = `${promo.redeemedCount} / ${promo.maxRedemptions ?? "illimité"}`;
              const actions = (
                <>
                  <IconButton icon={ArrowUpRight} label="Voir le détail" onClick={open} />
                  {promo.status === "DRAFT" && (
                    <>
                      <IconButton
                        icon={Pencil}
                        label="Modifier"
                        onClick={() => navigate(`/subscriptions/promotions/${promo.code}/edit`)}
                      />
                      <IconButton
                        icon={Play}
                        label="Activer"
                        tone="success"
                        pending={activateMutation.isPending && activateMutation.variables === promo.code}
                        onClick={() => askActivate(promo)}
                      />
                    </>
                  )}
                </>
              );
              return (
                <div key={promo.code} onClick={open} className={`cursor-pointer rounded-2xl bg-gray-50 p-3 ${ROW_HOVER}`}>
                  {/* Desktop */}
                  <div className={`hidden items-center gap-4 px-1 lg:grid ${COLS}`}>
                    <span className="truncate font-mono text-xs font-semibold text-gray-700">{promo.code}</span>
                    <span className="truncate font-semibold text-gray-900">{promo.name}</span>
                    <span className="text-sm text-gray-700">{type}</span>
                    <span className="truncate text-sm font-semibold text-gray-900">{value}</span>
                    <div className="text-sm text-gray-700">
                      <p>{formatDate(promo.startsAt)}</p>
                      {promo.endsAt && <p className="text-xs text-gray-400">→ {formatDate(promo.endsAt)}</p>}
                    </div>
                    <span className="text-sm text-gray-700">{uses}</span>
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
                        <p className="truncate font-semibold text-gray-900">{promo.name}</p>
                        <p className="mt-0.5 font-mono text-xs text-gray-400">{promo.code}</p>
                      </div>
                      <StatusChip tone={st.tone}>{st.label}</StatusChip>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Tag>{type}</Tag>
                      {value && <Tag tone="pink">{value}</Tag>}
                      <Tag>{uses}</Tag>
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                      {formatDate(promo.startsAt)}
                      {promo.endsAt && ` → ${formatDate(promo.endsAt)}`}
                    </p>
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

      <Pagination page={page} totalPages={totalPages} total={totalElements} noun="promotion" onChange={setPage} />
    </div>
  );
};
