import React, { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ArrowUpRight, Plus, Power, Tags } from "lucide-react";
import { subscriptionService } from "../../../services/subscription.service";
import type { EntitlementDefinition } from "../../../services/subscription.service";
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
import { FIELD_SOFT, ROW_HOVER } from "../../../components/subscription/kitUtils";
import { MODE_LABEL, RESET_LABEL, TYPE_LABEL, UNIT_LABEL } from "./entitlementForm";

const PAGE_SIZE = 20;

const COLS =
  "lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,1.3fr)_minmax(0,1fr)_6rem_6rem]";

export const EntitlementDefinitionsList: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<"" | "true" | "false">("");
  const [page, setPage] = useState(0);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(0);
    }, 350);
    return () => window.clearTimeout(t);
  }, [search]);

  const { data, isLoading } = useQuery({
    queryKey: ["entitlement-definitions", debouncedSearch, activeFilter, page],
    queryFn: () =>
      subscriptionService.getEntitlementDefinitions({
        query: debouncedSearch || undefined,
        active: activeFilter !== "" ? activeFilter === "true" : undefined,
        page,
        size: PAGE_SIZE,
      }),
  });

  // Toast de confirmation : l'erreur de l'API y est affichée
  const toggleMutation = useMutation({
    mutationFn: ({ code, active }: { code: string; active: boolean }) =>
      subscriptionService.updateEntitlementDefinition(code, { active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["entitlement-definitions"] }),
  });

  const askToggle = (def: EntitlementDefinition) => {
    const off = def.active;
    toast.confirm({
      message: off ? `Désactiver « ${def.name} » ?` : `Réactiver « ${def.name} » ?`,
      detail: def.code,
      confirmLabel: off ? "Désactiver" : "Réactiver",
      pendingLabel: off ? "Désactivation en cours" : "Réactivation en cours",
      successMessage: off ? "Droit désactivé" : "Droit réactivé",
      errorMessage: "La mise à jour a échoué",
      tone: off ? "danger" : "primary",
      onConfirm: () => toggleMutation.mutateAsync({ code: def.code, active: !off }),
    });
  };

  const definitions = data?.content ?? [];
  const totalPages = data?.totalPages ?? 1;
  const totalElements = data?.totalElements ?? definitions.length;
  const hasFilters = !!(search || activeFilter);

  const handleReset = () => {
    setSearch("");
    setDebouncedSearch("");
    setActiveFilter("");
    setPage(0);
  };

  return (
    <div className="space-y-5">
      <ListHeader
        title="Définitions de droits"
        subtitle="Les droits utilisés dans les plans, pass, souscriptions et règles de consommation."
        action={
          <ActionButton icon={Plus} className="w-full sm:w-auto" onClick={() => navigate("/subscriptions/entitlements/create")}>
            Nouveau droit
          </ActionButton>
        }
      />

      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_14rem]">
        <SearchField value={search} onChange={setSearch} placeholder="Rechercher par nom ou code..." />
        <select
          value={activeFilter}
          onChange={(e) => {
            setActiveFilter(e.target.value as "" | "true" | "false");
            setPage(0);
          }}
          className={`${FIELD_SOFT} bg-white shadow-sm`}
        >
          <option value="">Tous statuts</option>
          <option value="true">Actifs</option>
          <option value="false">Inactifs</option>
        </select>
      </div>

      {isLoading ? (
        <TableSkeleton rows={6} cols={6} />
      ) : definitions.length === 0 ? (
        <EmptyState
          icon={Tags}
          title="Aucun droit trouvé"
          hint="Créez un droit ou modifiez la recherche."
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
            <span>Droit</span>
            <span>Type</span>
            <span>Unité</span>
            <span>Consommation</span>
            <span>Reset</span>
            <span>Statut</span>
            <span className="text-right">Actions</span>
          </HeadRow>

          <div className="space-y-2">
            {definitions.map((def) => {
              const open = () => navigate(`/subscriptions/entitlements/${def.code}`);
              const type = TYPE_LABEL[def.entitlementType] ?? def.entitlementType;
              const unit = UNIT_LABEL[def.unit] ?? def.unit;
              const mode = MODE_LABEL[def.consumptionMode] ?? def.consumptionMode;
              const reset = RESET_LABEL[def.resetPolicy] ?? def.resetPolicy;
              const chip = <StatusChip tone={def.active ? "success" : "neutral"}>{def.active ? "Actif" : "Inactif"}</StatusChip>;
              const actions = (
                <>
                  <IconButton icon={ArrowUpRight} label="Voir le détail" onClick={open} />
                  <IconButton
                    icon={Power}
                    label={def.active ? "Désactiver" : "Réactiver"}
                    tone={def.active ? "danger" : "success"}
                    pending={toggleMutation.isPending && toggleMutation.variables?.code === def.code}
                    onClick={() => askToggle(def)}
                  />
                </>
              );
              return (
                <div
                  key={def.code}
                  onClick={open}
                  className={`cursor-pointer rounded-2xl bg-gray-50 p-3 ${ROW_HOVER} ${def.active ? "" : "opacity-70"}`}
                >
                  {/* Desktop */}
                  <div className={`hidden items-center gap-4 px-1 lg:grid ${COLS}`}>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-gray-900">{def.name}</p>
                      <p className="mt-0.5 truncate font-mono text-xs text-gray-400">{def.code}</p>
                    </div>
                    <span className="truncate text-sm text-gray-700">{type}</span>
                    <span className="truncate text-sm text-gray-700">{unit}</span>
                    <span className="truncate text-sm text-gray-700">{mode}</span>
                    <span className="truncate text-sm text-gray-700">{reset}</span>
                    <span>{chip}</span>
                    <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      {actions}
                    </div>
                  </div>

                  {/* Mobile et tablette */}
                  <div className="lg:hidden">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-gray-900">{def.name}</p>
                        <p className="mt-0.5 font-mono text-xs text-gray-400">{def.code}</p>
                      </div>
                      {chip}
                    </div>
                    {def.description && <p className="mt-2 line-clamp-2 text-sm text-gray-500">{def.description}</p>}
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Tag>{type}</Tag>
                      <Tag>{unit}</Tag>
                      <Tag>{mode}</Tag>
                      <Tag>{reset}</Tag>
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

      <Pagination page={page} totalPages={totalPages} total={totalElements} noun="droit" onChange={setPage} />
    </div>
  );
};
