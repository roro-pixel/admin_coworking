import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "../components/layout/AdminLayout";
import {
  Search,
  Eye,
  User,
  Plus,
  CheckCircle,
  XCircle,
  Lock,
  Unlock,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Trash2,
} from "lucide-react";
import { toast } from "react-toastify";
import { memberService } from "../services/member.service";
import type {
  MemberSummaryResponse,
  MemberResponse,
} from "../services/member.service";

// ============================================================
// Stratégie de recherche selon le MD :
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
const normalizeMember = (
  m: MemberResponse | MemberSummaryResponse,
): MemberSummaryResponse => ({
  memberId: m.memberId,
  customerId: m.customerId,
  fullName:
    (m as MemberSummaryResponse).fullName ||
    (m as MemberResponse).fullname ||
    "",
  email: m.email,
  phone: m.phone,
  status: m.status,
  portalAccess: m.portalAccess,
});

const PAGE_SIZE = 20;

const statusBadge = (status: string) => {
  switch (status) {
    case "ACTIVE":
      return (
        <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-700 inline-flex items-center gap-1">
          <CheckCircle size={11} /> Actif
        </span>
      );
    case "PENDING":
      return (
        <span className="px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-700">
          En attente
        </span>
      );
    case "INACTIVE":
      return (
        <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-600">
          Inactif
        </span>
      );
    case "SUSPENDED":
      return (
        <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-700 inline-flex items-center gap-1">
          <XCircle size={11} /> Suspendu
        </span>
      );
    default:
      return (
        <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-600">
          {status}
        </span>
      );
  }
};


const portalBadge = (portalAccess: boolean) =>
  portalAccess ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700">
      <Unlock size={11} /> Actif
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-500">
      <Lock size={11} /> Désactivé
    </span>
  );

const MobileInfoRow: React.FC<{
  label: string;
  value: React.ReactNode;
}> = ({ label, value }) => (
  <div className="flex items-start justify-between gap-4 border-t border-gray-100 py-2 first:border-t-0 first:pt-0 last:pb-0">
    <span className="shrink-0 text-[11px] font-bold uppercase tracking-wide text-gray-400">
      {label}
    </span>
    <div className="min-w-0 text-right text-xs font-semibold text-gray-700">
      {value}
    </div>
  </div>
);

const MemberMobileCard: React.FC<{
  member: MemberSummaryResponse;
  onOpen: (memberId: string) => void;
  onOpenCustomer: (customerId: string) => void;
  onDelete: (event: React.MouseEvent<HTMLButtonElement>, memberId: string) => void;
  deleting?: boolean;
}> = ({ member, onOpen, onOpenCustomer, onDelete, deleting }) => (
  <article
    onClick={() => onOpen(member.memberId)}
    className="rounded-2xl bg-gray-50 p-3 ring-1 ring-gray-100 transition active:scale-[0.99]"
  >
    <div className="mb-3 flex items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary-100 text-primary-600">
        <User size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-black text-gray-950">
          {member.fullName || "—"}
        </p>
        <p className="mt-0.5 truncate font-mono text-[11px] font-medium text-gray-400">
          {member.memberId}
        </p>
      </div>
      {statusBadge(member.status)}
    </div>

    <MobileInfoRow
      label="Email"
      value={<span className="break-all">{member.email || "—"}</span>}
    />
    <MobileInfoRow label="Téléphone" value={member.phone || "—"} />
    <MobileInfoRow label="Portail" value={portalBadge(member.portalAccess)} />
    <MobileInfoRow
      label="Customer"
      value={
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenCustomer(member.customerId);
          }}
          className="break-all font-mono text-[11px] font-bold text-primary-600"
        >
          {member.customerId}
        </button>
      }
    />

    <div className="mt-3 grid grid-cols-2 gap-2 border-t border-gray-100 pt-3">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onOpen(member.memberId);
        }}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-bold text-primary-700 ring-1 ring-primary-100"
      >
        <Eye size={15} /> Voir
      </button>
      <button
        type="button"
        onClick={(e) => onDelete(e, member.memberId)}
        disabled={deleting}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-bold text-red-600 ring-1 ring-red-100 disabled:opacity-50"
      >
        <Trash2 size={15} /> Supprimer
      </button>
    </div>
  </article>
);

export const AdminMembers: React.FC = () => {
  const navigate = useNavigate();

  const queryClient = useQueryClient();

const deleteMutation = useMutation({
  mutationFn: (memberId: string) => memberService.deleteMember(memberId),
  onSuccess: () => {
    toast.success("Membre supprimé avec succès.");
    queryClient.invalidateQueries({ queryKey: ["members-list"] });
    queryClient.invalidateQueries({ queryKey: ["members-basic"] });
    queryClient.invalidateQueries({ queryKey: ["members-advanced"] });
  },
  onError: () => {
    toast.error("Impossible de supprimer ce membre.");
  },
});

const handleDeleteMember = (
  event: React.MouseEvent<HTMLButtonElement>,
  memberId: string,
) => {
  event.stopPropagation();

  const confirmed = window.confirm(
    "Voulez-vous vraiment supprimer ce membre ? Cette action est irréversible.",
  );

  if (!confirmed) return;

  deleteMutation.mutate(memberId);
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
  const hasStructuredFilters = !!(
    statusFilter ||
    portalFilter ||
    customerIdFilter
  );
  const hasTextSearch = debouncedSearch.length >= 2;

  // Stratégie 1 : texte seul → GET /members/search/basic (non-paginé, léger)
  // On l'utilise quand il n'y a pas de filtre structuré
  const { data: basicSearchResults, isFetching: basicFetching } = useQuery({
    queryKey: ["members-basic", debouncedSearch],
    queryFn: () => memberService.searchMembers(debouncedSearch),
    enabled: hasTextSearch && !hasStructuredFilters,
    staleTime: 30_000,
  });

  // Stratégie 2 : filtres structurés (avec ou sans texte) → POST /members/search
  // Le texte libre est mappé sur `email` uniquement si ça ressemble à un email,
  // sinon sur `lastname` (champ le plus discriminant).
  // On ne duplique JAMAIS la même valeur sur plusieurs champs.
  const buildAdvancedPayload = () => {
    const payload: any = {};
    if (statusFilter) payload.status = statusFilter;
    if (portalFilter !== "") payload.portalAccess = portalFilter === "active";
    if (customerIdFilter) payload.customerId = customerIdFilter;
    if (debouncedSearch) {
      // Détection heuristique : email, ID member, ou nom
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
        // Nom : on envoie seulement lastname (le backend fait un LIKE)
        payload.lastname = debouncedSearch;
      }
    }
    return payload;
  };

  const { data: advancedResult, isFetching: advancedFetching } = useQuery({
    queryKey: [
      "members-advanced",
      debouncedSearch,
      statusFilter,
      portalFilter,
      customerIdFilter,
      page,
    ],
    queryFn: () =>
      memberService.searchMembersAdvanced(
        buildAdvancedPayload(),
        page,
        PAGE_SIZE,
      ),
    enabled: hasStructuredFilters || (hasTextSearch && hasStructuredFilters),
    staleTime: 30_000,
  });

  // Stratégie 3 : aucun critère → GET /members (listing simple paginé)
  const { data: listResult, isFetching: listFetching } = useQuery({
    queryKey: ["members-list", page],
    queryFn: () =>
      memberService.getMembers({
        page,
        size: PAGE_SIZE,
        sort: "createdAt,desc",
      }),
    enabled: !hasTextSearch && !hasStructuredFilters,
    staleTime: 60_000,
  });

  // Résolution des données et pagination selon la stratégie active
  let members: MemberSummaryResponse[] = [];
  let totalPages = 0;
  let totalElements = 0;
  const isFetching = basicFetching || advancedFetching || listFetching;

  if (hasStructuredFilters) {
    // POST /members/search paginé
    members = (advancedResult?.data || []) as MemberSummaryResponse[];
    totalPages = advancedResult?.pageable?.totalPages ?? 0;
    totalElements = advancedResult?.pageable?.totalElements ?? 0;
  } else if (hasTextSearch) {
    // GET /search/basic → non-paginé, pas de pagination côté UI
    members = (basicSearchResults || []) as MemberSummaryResponse[];
    totalPages = 0;
    totalElements = members.length;
  } else {
    // GET /members paginé
    members = ((listResult?.data || []) as MemberResponse[]).map(
      normalizeMember,
    );
    totalPages = listResult?.pageable?.totalPages ?? 0;
    totalElements = listResult?.pageable?.totalElements ?? 0;
  }

  const hasAnyFilter = !!(
    searchTerm ||
    statusFilter ||
    portalFilter ||
    customerIdFilter
  );

  const handleClearFilters = () => {
    setSearchTerm("");
    setDebouncedSearch("");
    setStatusFilter("");
    setPortalFilter("");
    setCustomerIdFilter("");
    setPage(0);
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl font-black text-gray-900 sm:text-2xl">Membres</h1>
            <p className="mt-1 text-sm text-gray-600 sm:text-base">
              Gérez tous les membres
              {totalElements > 0 && (
                <span className="ml-2 text-sm">
                  · {totalElements} membre{totalElements > 1 ? "s" : ""}
                </span>
              )}
            </p>
          </div>
          <button
            onClick={() => navigate("/members/create")}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-primary-700 md:w-auto"
          >
            <Plus size={18} /> Créer un membre
          </button>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100 sm:p-5">
          <p className="text-xs font-semibold text-gray-500 sm:text-sm">Total affiché</p>
          <p className="mt-1 text-xl font-black text-gray-900 sm:text-2xl">
            {members.length}
          </p>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100 sm:p-5">
          <p className="text-xs font-semibold text-gray-500 sm:text-sm">Actifs</p>
          <p className="mt-1 text-xl font-black text-gray-900 sm:text-2xl">
            {members.filter((m) => m.status === "ACTIVE").length}
          </p>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100 sm:p-5">
          <p className="text-xs font-semibold text-gray-500 sm:text-sm">Portail activé</p>
          <p className="mt-1 text-xl font-black text-gray-900 sm:text-2xl">
            {members.filter((m) => m.portalAccess).length}
          </p>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100 sm:p-5">
          <p className="text-xs font-semibold text-gray-500 sm:text-sm">Résultats</p>
          <p className="mt-1 text-xl font-black text-gray-900 sm:text-2xl">
            {totalElements || members.length}
          </p>
        </div>
      </div>

      {/* Filtres */}
      <div className="mb-6 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row">
          {/* Recherche texte */}
          <div className="flex-1 relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Nom, email, téléphone, ID membre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-8 py-2 ring-1 ring-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            {isFetching && (
              <Loader2
                size={14}
                className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-gray-400"
              />
            )}
          </div>

          {/* Statut */}
          <select
            value={statusFilter}
            onChange={(e) =>
              handleFilterChange(setStatusFilter, e.target.value)
            }
            className="w-full rounded-2xl bg-white px-4 py-2.5 text-sm ring-1 ring-gray-100 lg:w-auto"
          >
            <option value="">Tous les statuts</option>
            <option value="ACTIVE">Actif</option>
            <option value="PENDING">En attente</option>
            <option value="INACTIVE">Inactif</option>
            <option value="SUSPENDED">Suspendu</option>
          </select>

          {/* Accès portail */}
          <select
            value={portalFilter}
            onChange={(e) =>
              handleFilterChange(setPortalFilter, e.target.value)
            }
            className="w-full rounded-2xl bg-white px-4 py-2.5 text-sm ring-1 ring-gray-100 lg:w-auto"
          >
            <option value="">Accès portail (tous)</option>
            <option value="active">Avec accès</option>
            <option value="inactive">Sans accès</option>
          </select>

          {/* Customer ID */}
          <input
            type="text"
            placeholder="Customer ID"
            value={customerIdFilter}
            onChange={(e) =>
              handleFilterChange(setCustomerIdFilter, e.target.value)
            }
            className="w-full rounded-2xl px-4 py-2.5 text-sm ring-1 ring-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 lg:w-44"
          />

          {hasAnyFilter && (
            <button
              onClick={handleClearFilters}
              className="px-3 py-2 ring-1 ring-gray-100 rounded-2xl text-sm text-gray-600 hover:bg-gray-50/70 whitespace-nowrap"
            >
              Réinitialiser
            </button>
          )}
        </div>

        {/* Indicateur de stratégie active */}
        {hasTextSearch && !hasStructuredFilters && (
          <p className="text-xs text-blue-500 mt-2">
            Recherche rapide — min. 2 caractères
            {debouncedSearch !== searchTerm && " · en cours..."}
          </p>
        )}
        {hasStructuredFilters && (
          <p className="text-xs text-primary-500 mt-2">
            Recherche avancée — filtres actifs
          </p>
        )}
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 overflow-hidden">
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full border-separate border-spacing-y-1">
            <thead className="bg-gray-50/70 text-gray-500">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                  Membre
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                  Contact
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                  Statut
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                  Portail
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                  Customer
                </th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="[&>tr+tr]:border-t [&>tr+tr]:border-gray-50">
              {members.map((member) => (
                <tr
                  key={member.memberId}
                  onClick={() => navigate(`/members/${member.memberId}`)}
                  className="hover:bg-gray-50/70/80 transition-colors cursor-pointer"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <User size={18} className="text-primary-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {member.fullName}
                        </p>
                        <p className="text-xs text-gray-400 font-mono">
                          {member.memberId}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-900">{member.email}</p>
                    <p className="text-xs text-gray-500">
                      {member.phone || "—"}
                    </p>
                  </td>
                  <td className="px-6 py-4">{statusBadge(member.status)}</td>
                  <td className="px-6 py-4">
                    {portalBadge(member.portalAccess)}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className="text-sm text-primary-600 font-mono hover:underline"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/customers/${member.customerId}`);
                      }}
                    >
                      {member.customerId}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
  <div className="flex items-center justify-end gap-2">
    <button
      onClick={(e) => {
        e.stopPropagation();
        navigate(`/members/${member.memberId}`);
      }}
      className="rounded-xl p-2 text-primary-600 transition hover:bg-primary-50 hover:text-primary-800"
      title="Voir le détail"
    >
      <Eye size={17} />
    </button>

    <button
      onClick={(e) => handleDeleteMember(e, member.memberId)}
      disabled={deleteMutation.isPending}
      className="rounded-xl p-2 text-red-600 transition hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
      title="Supprimer le membre"
    >
      <Trash2 size={17} />
    </button>
  </div>
</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-3 p-3 md:hidden">
          {members.map((member) => (
            <MemberMobileCard
              key={member.memberId}
              member={member}
              onOpen={(memberId) => navigate(`/members/${memberId}`)}
              onOpenCustomer={(customerId) => navigate(`/customers/${customerId}`)}
              onDelete={handleDeleteMember}
              deleting={deleteMutation.isPending}
            />
          ))}
        </div>

        {members.length === 0 && !isFetching && (
          <div className="text-center py-12">
            <User size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">Aucun membre trouvé</p>
            {hasAnyFilter && (
              <button
                onClick={handleClearFilters}
                className="mt-2 text-primary-600 hover:underline text-sm"
              >
                Effacer les filtres
              </button>
            )}
          </div>
        )}

        {/* Skeleton pendant chargement initial */}
        {isFetching && members.length === 0 && (
          <div className="[&>tr+tr]:border-t [&>tr+tr]:border-gray-50 divide-gray-100">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="px-6 py-4 flex items-center gap-4 animate-pulse"
              >
                <div className="w-9 h-9 bg-gray-200 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-40" />
                  <div className="h-2 bg-gray-100 rounded w-24" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination — uniquement pour listing paginé et recherche avancée */}
        {totalPages > 1 && !hasTextSearch && (
          <div className="flex flex-col gap-3 border-t border-gray-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p className="text-xs font-semibold text-gray-500 sm:text-sm">
              {totalElements} membre{totalElements > 1 ? "s" : ""} — Page{" "}
              {page + 1} / {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setPage((p) => Math.max(0, p - 1));
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                disabled={page === 0}
                className="p-1.5 border rounded-xl disabled:opacity-50 hover:bg-gray-50/70"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => {
                  setPage((p) => Math.min(totalPages - 1, p + 1));
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                disabled={page >= totalPages - 1}
                className="p-1.5 border rounded-xl disabled:opacity-50 hover:bg-gray-50/70"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Note résultats basique */}
        {hasTextSearch && !hasStructuredFilters && members.length > 0 && (
          <div className="px-6 py-3 border-t border-gray-100 text-xs text-gray-400 text-center">
            {members.length} résultat{members.length > 1 ? "s" : ""} — ajoutez
            un filtre (statut, portail, customer) pour paginer
          </div>
        )}
      </div>
    </AdminLayout>
  );
};
