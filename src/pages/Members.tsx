import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "../components/layout/AdminLayout";
import {
  Search,
  Eye,
  Plus,
  Lock,
  Unlock,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Users,
  UserCheck,
  ShieldCheck,
  Clock,
  X,
} from "lucide-react";
import { memberService } from "../services/member.service";
import { customerPath } from "../components/companies/companyLabels";
import type { MemberSummaryResponse, MemberResponse } from "../services/member.service";
import { Skeleton, ListSkeleton } from "../components/ui/Skeleton";
import { brandVars } from "../components/layout/adminTheme";
import { Toaster } from "../components/ui/Toaster";
import { toast } from "../components/ui/toastStore";

// ============================================================
// Stratégie de recherche :
//
// 1. Pas de critère → GET /members?page=...&size=... (listing simple)
// 2. Texte libre seulement → GET /members/search/basic?query=...
//    (léger, non-paginé, pour la frappe instantanée)
// 3. Filtres structurés (statut, portail, customerId) avec ou
//    sans texte → POST /members/search (payload propre, paginé)
//
// On n'envoie JAMAIS la même valeur de saisie sur plusieurs
// champs simultanément (memberId + firstname + lastname + email...).
// ============================================================

// Normalise MemberResponse (fullname) → MemberSummaryResponse (fullName)
const normalizeMember = (m: MemberResponse | MemberSummaryResponse): MemberSummaryResponse => ({
  memberId: m.memberId,
  customerId: m.customerId,
  fullName: (m as MemberSummaryResponse).fullName || (m as MemberResponse).fullname || "",
  email: m.email,
  phone: m.phone,
  status: m.status,
  portalAccess: m.portalAccess,
});

const PAGE_SIZE = 20;

const FOCUS = "focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--logo-pink)]";
const PINK_SOFT = "bg-[color:color-mix(in_srgb,var(--logo-pink)_16%,white)]";
const FIELD =
  "w-full rounded-2xl border border-transparent bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 transition focus:border-[color:var(--logo-pink)] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[color:color-mix(in_srgb,var(--logo-pink)_20%,white)]";
const COLS =
  "grid-cols-[minmax(0,2fr)_minmax(0,2fr)_7.5rem_7rem_minmax(0,1.2fr)_5.5rem]";

const initials = (name: string) =>
  (name || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("") || "?";

const STATUS: Record<string, { label: string; chip: string; dot: string }> = {
  ACTIVE: { label: "Actif", chip: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
  PENDING: { label: "En attente", chip: "bg-amber-50 text-amber-700", dot: "bg-amber-500" },
  INACTIVE: { label: "Inactif", chip: "bg-gray-100 text-gray-600", dot: "bg-gray-400" },
  SUSPENDED: { label: "Suspendu", chip: "bg-red-50 text-red-600", dot: "bg-red-500" },
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const s = STATUS[status] || { label: status, chip: "bg-gray-100 text-gray-600", dot: "bg-gray-400" };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${s.chip}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
};

const PortalBadge: React.FC<{ portalAccess: boolean }> = ({ portalAccess }) =>
  portalAccess ? (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold text-[color:var(--logo-pink-dark)] ${PINK_SOFT}`}
    >
      <Unlock size={12} /> Actif
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-500">
      <Lock size={12} /> Désactivé
    </span>
  );

const Avatar: React.FC<{ name: string }> = ({ name }) => (
  <span
    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold text-[color:var(--logo-pink-dark)] ${PINK_SOFT}`}
  >
    {initials(name)}
  </span>
);

const StatCard: React.FC<{ icon: React.ElementType; label: string; value: number; sub: string }> = ({
  icon: Icon,
  label,
  value,
  sub,
}) => (
  <div className="flex flex-col gap-3 rounded-[1.75rem] border border-gray-100 bg-white p-3 shadow-sm">
    <div className="flex items-center gap-2.5 px-2 pt-1.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gray-100 bg-white text-gray-600 shadow-sm">
        <Icon size={17} />
      </span>
      <span className="truncate text-sm font-semibold text-gray-700">{label}</span>
    </div>
    <div className="rounded-2xl bg-gray-50 px-4 py-4">
      <p className="text-3xl font-bold leading-none tracking-tight tabular-nums text-gray-950">
        {value.toLocaleString("fr-FR")}
      </p>
      <p className="mt-2 text-xs text-gray-500">{sub}</p>
    </div>
  </div>
);

interface RowProps {
  member: MemberSummaryResponse;
  onOpen: (memberId: string) => void;
  onOpenCustomer: (customerId: string) => void;
  onDelete: (event: React.MouseEvent, member: MemberSummaryResponse) => void;
  deleting?: boolean;
}

const RowActions: React.FC<RowProps> = ({ member, onOpen, onDelete, deleting }) => (
  <div className="flex justify-end gap-1.5">
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onOpen(member.memberId);
      }}
      title="Voir le détail"
      aria-label="Voir le détail"
      className={`flex h-9 w-9 items-center justify-center rounded-full text-gray-500 transition hover:bg-[color:color-mix(in_srgb,var(--logo-pink)_16%,white)] hover:text-[color:var(--logo-pink-dark)] ${FOCUS}`}
    >
      <Eye size={17} />
    </button>
    <button
      type="button"
      onClick={(e) => onDelete(e, member)}
      disabled={deleting}
      title="Supprimer le membre"
      aria-label="Supprimer le membre"
      className="flex h-9 w-9 items-center justify-center rounded-full text-gray-500 transition hover:bg-red-50 hover:text-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300 disabled:opacity-50"
    >
      <Trash2 size={17} />
    </button>
  </div>
);

const CustomerLink: React.FC<{ customerId: string; onOpenCustomer: (id: string) => void }> = ({
  customerId,
  onOpenCustomer,
}) => (
  <button
    type="button"
    onClick={(e) => {
      e.stopPropagation();
      onOpenCustomer(customerId);
    }}
    className={`max-w-full truncate rounded-md font-mono text-xs font-semibold text-[color:var(--logo-pink-dark)] hover:underline ${FOCUS}`}
  >
    {customerId}
  </button>
);

const MemberMobileCard: React.FC<RowProps> = (props) => {
  const { member, onOpen, onOpenCustomer } = props;
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(member.memberId)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(member.memberId);
        }
      }}
      className={`cursor-pointer rounded-2xl bg-gray-50 p-3 transition hover:bg-[color:color-mix(in_srgb,var(--logo-pink)_8%,white)] ${FOCUS}`}
    >
      <div className="flex items-center gap-3">
        <Avatar name={member.fullName} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-gray-950">{member.fullName || "Sans nom"}</p>
          <p className="mt-0.5 truncate font-mono text-[11px] text-gray-400">{member.memberId}</p>
        </div>
        <StatusBadge status={member.status} />
      </div>

      <div className="mt-3 space-y-1.5 rounded-xl bg-white px-3 py-2.5">
        <div className="flex items-start justify-between gap-3">
          <span className="shrink-0 text-xs text-gray-400">Email</span>
          <span className="min-w-0 break-all text-right text-xs font-medium text-gray-700">{member.email}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="shrink-0 text-xs text-gray-400">Téléphone</span>
          <span className="text-right text-xs font-medium text-gray-700">{member.phone || "Sans numéro"}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="shrink-0 text-xs text-gray-400">Portail</span>
          <PortalBadge portalAccess={member.portalAccess} />
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="shrink-0 text-xs text-gray-400">Client</span>
          <CustomerLink customerId={member.customerId} onOpenCustomer={onOpenCustomer} />
        </div>
      </div>

      <div className="mt-2">
        <RowActions {...props} />
      </div>
    </div>
  );
};

export const AdminMembers: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: (memberId: string) => memberService.deleteMember(memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members-list"] });
      queryClient.invalidateQueries({ queryKey: ["members-basic"] });
      queryClient.invalidateQueries({ queryKey: ["members-advanced"] });
    },
  });

  const handleDeleteMember = (event: React.MouseEvent, member: MemberSummaryResponse) => {
    event.stopPropagation();
    toast.confirm({
      message: "Supprimer ce membre ?",
      detail: member.fullName || member.memberId,
      confirmLabel: "Supprimer",
      pendingLabel: "Suppression en cours",
      successMessage: "Membre supprimé",
      errorMessage: "Impossible de supprimer ce membre",
      onConfirm: () => deleteMutation.mutateAsync(member.memberId),
    });
  };

  // Champ de saisie libre (affiché immédiatement)
  const [searchTerm, setSearchTerm] = useState("");
  // Valeur debounce utilisée pour les requêtes (400ms)
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Filtres structurés — utilisent POST /members/search
  const [statusFilter, setStatusFilter] = useState("");
  const [portalFilter, setPortalFilter] = useState("");
  const [customerIdFilter, setCustomerIdFilter] = useState("");

  const [page, setPage] = useState(0);

  // Debounce 400ms — remet page à 0 quand la recherche change
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(0);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Remet page à 0 quand un filtre change
  const handleFilterChange = <T,>(setter: (v: T) => void, value: T) => {
    setter(value);
    setPage(0);
  };

  // Détermine la stratégie selon les critères actifs
  const hasStructuredFilters = !!(statusFilter || portalFilter || customerIdFilter);
  const hasTextSearch = debouncedSearch.length >= 2;

  // Stratégie 1 : texte seul → GET /members/search/basic (non-paginé, léger)
  const { data: basicSearchResults, isFetching: basicFetching } = useQuery({
    queryKey: ["members-basic", debouncedSearch],
    queryFn: () => memberService.searchMembers(debouncedSearch),
    enabled: hasTextSearch && !hasStructuredFilters,
    staleTime: 30_000,
  });

  // Stratégie 2 : filtres structurés (avec ou sans texte) → POST /members/search
  const buildAdvancedPayload = () => {
    const payload: any = {};
    if (statusFilter) payload.status = statusFilter;
    if (portalFilter !== "") payload.portalAccess = portalFilter === "active";
    if (customerIdFilter) payload.customerId = customerIdFilter;
    if (debouncedSearch) {
      if (debouncedSearch.includes("@")) {
        payload.email = debouncedSearch;
      } else if (
        debouncedSearch.toUpperCase().startsWith("MEM-") ||
        debouncedSearch.toUpperCase().startsWith("MBR-")
      ) {
        payload.memberId = debouncedSearch;
      } else if (/^\d+/.test(debouncedSearch)) {
        payload.phone = debouncedSearch;
      } else {
        payload.lastname = debouncedSearch;
      }
    }
    return payload;
  };

  const { data: advancedResult, isFetching: advancedFetching } = useQuery({
    queryKey: ["members-advanced", debouncedSearch, statusFilter, portalFilter, customerIdFilter, page],
    queryFn: () => memberService.searchMembersAdvanced(buildAdvancedPayload(), page, PAGE_SIZE),
    enabled: hasStructuredFilters || (hasTextSearch && hasStructuredFilters),
    staleTime: 30_000,
  });

  // Stratégie 3 : aucun critère → GET /members (listing simple paginé)
  const { data: listResult, isFetching: listFetching } = useQuery({
    queryKey: ["members-list", page],
    queryFn: () => memberService.getMembers({ page, size: PAGE_SIZE, sort: "createdAt,desc" }),
    enabled: !hasTextSearch && !hasStructuredFilters,
    staleTime: 60_000,
  });

  // Résolution des données et pagination selon la stratégie active
  let members: MemberSummaryResponse[] = [];
  let totalPages = 0;
  let totalElements = 0;
  const isFetching = basicFetching || advancedFetching || listFetching;

  if (hasStructuredFilters) {
    members = (advancedResult?.data || []) as MemberSummaryResponse[];
    totalPages = advancedResult?.pageable?.totalPages ?? 0;
    totalElements = advancedResult?.pageable?.totalElements ?? 0;
  } else if (hasTextSearch) {
    members = (basicSearchResults || []) as MemberSummaryResponse[];
    totalPages = 0;
    totalElements = members.length;
  } else {
    members = ((listResult?.data || []) as MemberResponse[]).map(normalizeMember);
    totalPages = listResult?.pageable?.totalPages ?? 0;
    totalElements = listResult?.pageable?.totalElements ?? 0;
  }

  const hasAnyFilter = !!(searchTerm || statusFilter || portalFilter || customerIdFilter);

  const handleClearFilters = () => {
    setSearchTerm("");
    setDebouncedSearch("");
    setStatusFilter("");
    setPortalFilter("");
    setCustomerIdFilter("");
    setPage(0);
  };

  const openMember = (memberId: string) => navigate(`/members/${memberId}`);
  const openCustomer = (customerId: string) => navigate(customerPath(customerId));

  const showSkeleton = isFetching && members.length === 0;

  return (
    <AdminLayout>
      <div className="space-y-5" style={brandVars}>
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-950 sm:text-3xl">Membres</h1>
            <p className="mt-1 text-sm text-gray-500">Gérez tous les membres.</p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/members/create")}
            className={`inline-flex w-full items-center justify-center gap-2 rounded-full bg-[color:var(--logo-pink-dark)] px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 md:w-auto ${FOCUS}`}
          >
            <Plus size={17} /> Créer un membre
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          {showSkeleton ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-[1.75rem]" />)
          ) : (
            <>
              <StatCard icon={Users} label="Membres" value={totalElements || members.length} sub="selon les critères" />
              <StatCard
                icon={UserCheck}
                label="Actifs"
                value={members.filter((m) => m.status === "ACTIVE").length}
                sub="sur la liste affichée"
              />
              <StatCard
                icon={ShieldCheck}
                label="Portail activé"
                value={members.filter((m) => m.portalAccess).length}
                sub="sur la liste affichée"
              />
              <StatCard
                icon={Clock}
                label="En attente"
                value={members.filter((m) => m.status === "PENDING").length}
                sub="sur la liste affichée"
              />
            </>
          )}
        </div>

        <div className="rounded-[1.75rem] border border-gray-100 bg-white p-3 shadow-sm sm:p-4">
          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Nom, email, téléphone, ID membre"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`${FIELD} pl-11`}
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => handleFilterChange(setStatusFilter, e.target.value)}
              className={`${FIELD} lg:w-auto`}
            >
              <option value="">Tous les statuts</option>
              <option value="ACTIVE">Actif</option>
              <option value="PENDING">En attente</option>
              <option value="INACTIVE">Inactif</option>
              <option value="SUSPENDED">Suspendu</option>
            </select>

            <select
              value={portalFilter}
              onChange={(e) => handleFilterChange(setPortalFilter, e.target.value)}
              className={`${FIELD} lg:w-auto`}
            >
              <option value="">Accès portail (tous)</option>
              <option value="active">Avec accès</option>
              <option value="inactive">Sans accès</option>
            </select>

            <input
              type="text"
              placeholder="Client ID"
              value={customerIdFilter}
              onChange={(e) => handleFilterChange(setCustomerIdFilter, e.target.value)}
              className={`${FIELD} lg:w-44`}
            />

            {hasAnyFilter && (
              <button
                type="button"
                onClick={handleClearFilters}
                className={`inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-100 ${FOCUS}`}
              >
                <X size={15} />
                Réinitialiser
              </button>
            )}
          </div>

          {(hasTextSearch && !hasStructuredFilters) || hasStructuredFilters ? (
            <p className="mt-3 px-1 text-xs text-gray-500">
              {hasStructuredFilters
                ? "Recherche avancée, filtres actifs."
                : `Recherche rapide, 2 caractères minimum${debouncedSearch !== searchTerm ? ", en cours..." : "."}`}
            </p>
          ) : null}
        </div>

        <div
          className={`rounded-[1.75rem] border border-gray-100 bg-white p-2 shadow-sm transition-opacity sm:p-3 ${
            isFetching && members.length > 0 ? "opacity-60" : ""
          }`}
        >
          <div className="hidden lg:block">
            <div className={`grid ${COLS} gap-4 rounded-2xl bg-gray-50 px-4 py-3 text-xs font-semibold text-gray-500`}>
              <span>Membre</span>
              <span>Contact</span>
              <span>Statut</span>
              <span>Portail</span>
              <span>Client</span>
              <span className="text-right">Actions</span>
            </div>

            <div className="mt-1.5 space-y-0.5">
              {members.map((member) => (
                <div
                  key={member.memberId}
                  onClick={() => openMember(member.memberId)}
                  className={`grid ${COLS} cursor-pointer items-center gap-4 rounded-2xl px-4 py-3 transition-colors hover:bg-gray-50`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar name={member.fullName} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-900">{member.fullName || "Sans nom"}</p>
                      <p className="truncate font-mono text-xs text-gray-400">{member.memberId}</p>
                    </div>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm text-gray-800">{member.email}</p>
                    <p className="truncate text-xs text-gray-500">{member.phone || "Sans numéro"}</p>
                  </div>
                  <div>
                    <StatusBadge status={member.status} />
                  </div>
                  <div>
                    <PortalBadge portalAccess={member.portalAccess} />
                  </div>
                  <div className="min-w-0">
                    <CustomerLink customerId={member.customerId} onOpenCustomer={openCustomer} />
                  </div>
                  <RowActions
                    member={member}
                    onOpen={openMember}
                    onOpenCustomer={openCustomer}
                    onDelete={handleDeleteMember}
                    deleting={deleteMutation.isPending}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2 lg:hidden">
            {members.map((member) => (
              <MemberMobileCard
                key={member.memberId}
                member={member}
                onOpen={openMember}
                onOpenCustomer={openCustomer}
                onDelete={handleDeleteMember}
                deleting={deleteMutation.isPending}
              />
            ))}
          </div>

          {showSkeleton && <ListSkeleton rows={6} />}

          {members.length === 0 && !isFetching && (
            <div className="px-4 py-14 text-center">
              <span
                className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full text-[color:var(--logo-pink-dark)] ${PINK_SOFT}`}
              >
                <Users size={24} />
              </span>
              <p className="mt-4 text-sm font-semibold text-gray-800">Aucun membre trouvé</p>
              {hasAnyFilter && (
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className={`mt-3 rounded-full px-4 py-2 text-sm font-semibold text-[color:var(--logo-pink-dark)] transition hover:bg-[color:color-mix(in_srgb,var(--logo-pink)_16%,white)] ${FOCUS}`}
                >
                  Effacer les filtres
                </button>
              )}
            </div>
          )}

          {/* Pagination : listing paginé et recherche avancée uniquement */}
          {totalPages > 1 && !hasTextSearch && (
            <div className="mt-2 flex flex-col gap-3 rounded-2xl bg-gray-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-center text-xs text-gray-500 sm:text-left sm:text-sm">
                {totalElements} membre{totalElements > 1 ? "s" : ""}, page {page + 1} sur {totalPages}
              </p>
              <div className="flex justify-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPage((p) => Math.max(0, p - 1));
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  disabled={page === 0}
                  aria-label="Page précédente"
                  className={`flex h-9 w-9 items-center justify-center rounded-full bg-white text-gray-700 shadow-sm transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS}`}
                >
                  <ChevronLeft size={17} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPage((p) => Math.min(totalPages - 1, p + 1));
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  disabled={page >= totalPages - 1}
                  aria-label="Page suivante"
                  className={`flex h-9 w-9 items-center justify-center rounded-full bg-white text-gray-700 shadow-sm transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS}`}
                >
                  <ChevronRight size={17} />
                </button>
              </div>
            </div>
          )}

          {hasTextSearch && !hasStructuredFilters && members.length > 0 && (
            <p className="mt-2 px-4 py-2 text-center text-xs text-gray-400">
              {members.length} résultat{members.length > 1 ? "s" : ""}. Ajoutez un filtre (statut, portail, client)
              pour paginer.
            </p>
          )}
        </div>

        <Toaster />
      </div>
    </AdminLayout>
  );
};