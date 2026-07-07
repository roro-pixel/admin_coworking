import React, { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Search,
  Filter,
  Building2,
  Package,
  Link2,
  Loader2,
  X,
} from "lucide-react";
import { resourceService } from "../../../services/resource.service";
import type {
  AmenityResponse,
  ResourceGroupResponse,
  ResourcePolicyResponse,
  ResourceResponse,
  ResourceStatus,
  ResourceSummaryResponse,
  ResourceTypeResponse,
} from "../../../services/resource.service";

const inputClass =
  "w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100";
const primaryBtn =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50";
const softBtn =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50";

const statusOptions: ResourceStatus[] = [
  "ACTIVE",
  "INACTIVE",
  "MAINTENANCE",
  "OUT_OF_SERVICE",
  "ARCHIVED",
];

const toContent = <T,>(raw: any): T[] =>
  Array.isArray(raw) ? raw : Array.isArray(raw?.content) ? raw.content : [];

const SearchCard: React.FC<{
  title: string;
  description: string;
  icon: React.ElementType;
  children: React.ReactNode;
}> = ({ title, description, icon: Icon, children }) => (
  <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
    <div className="mb-5 flex items-start gap-3">
      <div className="rounded-2xl bg-primary-50 p-3 text-primary-600">
        <Icon size={20} />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-gray-950">{title}</h3>
        <p className="mt-1 text-sm text-gray-500">{description}</p>
      </div>
    </div>
    {children}
  </section>
);

export const ResourceAdvancedSearchPage: React.FC = () => {
  const [criteria, setCriteria] = useState({
    code: "",
    name: "",
    typeCode: "",
    groupCode: "",
    policyCode: "",
    zone: "",
    locationLabel: "",
    status: "" as "" | ResourceStatus,
    portalVisible: "",
    bookingEnabled: "",
    active: "",
    minCapacity: "",
  });
  const [submittedCriteria, setSubmittedCriteria] = useState(criteria);
  const [quickQuery, setQuickQuery] = useState("");
  const [referenceQuery, setReferenceQuery] = useState("");
  const [amenityCodeLookup, setAmenityCodeLookup] = useState("");
  const [linkForm, setLinkForm] = useState({
    resourceCode: "",
    amenityCode: "",
    quantity: 1,
    optional: false,
    extraPrice: 0,
  });
  const [linkMessage, setLinkMessage] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);

  const advancedSearchQuery = useQuery({
    queryKey: ["resource-advanced-search", submittedCriteria],
    queryFn: () =>
      resourceService.advancedSearchResources({
        code: submittedCriteria.code || undefined,
        name: submittedCriteria.name || undefined,
        typeCode: submittedCriteria.typeCode || undefined,
        groupCode: submittedCriteria.groupCode || undefined,
        policyCode: submittedCriteria.policyCode || undefined,
        zone: submittedCriteria.zone || undefined,
        locationLabel: submittedCriteria.locationLabel || undefined,
        status: submittedCriteria.status || undefined,
        portalVisible:
          submittedCriteria.portalVisible === ""
            ? undefined
            : submittedCriteria.portalVisible === "true",
        bookingEnabled:
          submittedCriteria.bookingEnabled === ""
            ? undefined
            : submittedCriteria.bookingEnabled === "true",
        active:
          submittedCriteria.active === ""
            ? undefined
            : submittedCriteria.active === "true",
        minCapacity: submittedCriteria.minCapacity
          ? Number(submittedCriteria.minCapacity)
          : undefined,
        page: 0,
        size: 50,
        sort: "name,asc",
      }),
  });

  const quickResourceQuery = useQuery({
    queryKey: ["resource-search-basic", quickQuery],
    queryFn: () => resourceService.searchResources(quickQuery),
    enabled: quickQuery.trim().length >= 2,
  });

  const typeSearchQuery = useQuery({
    queryKey: ["resource-type-search", referenceQuery],
    queryFn: () =>
      resourceService.searchResourceTypes(referenceQuery, { size: 10 }),
    enabled: referenceQuery.trim().length >= 2,
  });
  const typeBasicQuery = useQuery({
    queryKey: ["resource-type-search-basic", referenceQuery],
    queryFn: () => resourceService.searchResourceTypesBasic(referenceQuery),
    enabled: referenceQuery.trim().length >= 2,
  });
  const groupSearchQuery = useQuery({
    queryKey: ["resource-group-search", referenceQuery],
    queryFn: () =>
      resourceService.searchResourceGroups(referenceQuery, { size: 10 }),
    enabled: referenceQuery.trim().length >= 2,
  });
  const groupBasicQuery = useQuery({
    queryKey: ["resource-group-search-basic", referenceQuery],
    queryFn: () => resourceService.searchResourceGroupsBasic(referenceQuery),
    enabled: referenceQuery.trim().length >= 2,
  });
  const policySearchQuery = useQuery({
    queryKey: ["resource-policy-search", referenceQuery],
    queryFn: () =>
      resourceService.searchResourcePolicies(referenceQuery, { size: 10 }),
    enabled: referenceQuery.trim().length >= 2,
  });
  const policyBasicQuery = useQuery({
    queryKey: ["resource-policy-search-basic", referenceQuery],
    queryFn: () => resourceService.searchResourcePoliciesBasic(referenceQuery),
    enabled: referenceQuery.trim().length >= 2,
  });
  const amenitySearchQuery = useQuery({
    queryKey: ["resource-amenity-search", referenceQuery],
    queryFn: () =>
      resourceService.searchAmenities(referenceQuery, { size: 10 }),
    enabled: referenceQuery.trim().length >= 2,
  });
  const amenityBasicQuery = useQuery({
    queryKey: ["resource-amenity-search-basic", referenceQuery],
    queryFn: () => resourceService.searchAmenitiesBasic(referenceQuery),
    enabled: referenceQuery.trim().length >= 2,
  });
  const amenityLookupQuery = useQuery({
    queryKey: ["resource-amenity-lookup", amenityCodeLookup],
    queryFn: () => resourceService.getAmenity(amenityCodeLookup),
    enabled: amenityCodeLookup.trim().length > 0,
  });

  const linkAmenityMutation = useMutation({
    mutationFn: () =>
      resourceService.linkAmenityToResource(linkForm.resourceCode, {
        amenityCode: linkForm.amenityCode,
        quantity: Number(linkForm.quantity) || 1,
        optional: linkForm.optional,
        extraPrice: Number(linkForm.extraPrice) || undefined,
      }),
    onSuccess: () => {
      setLinkMessage("Équipement lié à la ressource.");
      setLinkError(null);
    },
    onError: (error: any) => {
      setLinkError(
        error?.response?.data?.message ||
          "Erreur lors de la liaison équipement-ressource.",
      );
      setLinkMessage(null);
    },
  });

  const advancedResources: ResourceSummaryResponse[] =
    advancedSearchQuery.data?.content || [];
  const quickResources: ResourceSummaryResponse[] =
    quickResourceQuery.data || [];

  const referenceSections = useMemo(
    () => [
      {
        title: "Types",
        items: toContent<ResourceTypeResponse>(typeSearchQuery.data),
        basic: toContent<ResourceTypeResponse>(typeBasicQuery.data),
      },
      {
        title: "Groupes",
        items: toContent<ResourceGroupResponse>(groupSearchQuery.data),
        basic: toContent<ResourceGroupResponse>(groupBasicQuery.data),
      },
      {
        title: "Politiques",
        items: toContent<ResourcePolicyResponse>(policySearchQuery.data),
        basic: toContent<ResourcePolicyResponse>(policyBasicQuery.data),
      },
      {
        title: "Équipements",
        items: toContent<AmenityResponse>(amenitySearchQuery.data),
        basic: toContent<AmenityResponse>(amenityBasicQuery.data),
      },
    ],
    [
      typeSearchQuery.data,
      typeBasicQuery.data,
      groupSearchQuery.data,
      groupBasicQuery.data,
      policySearchQuery.data,
      policyBasicQuery.data,
      amenitySearchQuery.data,
      amenityBasicQuery.data,
    ],
  );

  const updateCriteria = (key: keyof typeof criteria, value: string) =>
    setCriteria((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Recherche avancée ressources
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Exploite la recherche avancée, les recherches basic/autocomplete et
            la liaison précise équipement-ressource.
          </p>
        </div>
        <button
          onClick={() => {
            const emptyCriteria = {
              code: "",
              name: "",
              typeCode: "",
              groupCode: "",
              policyCode: "",
              zone: "",
              locationLabel: "",
              status: "" as "" | ResourceStatus,
              portalVisible: "",
              bookingEnabled: "",
              active: "",
              minCapacity: "",
            };
            setCriteria(emptyCriteria);
            setSubmittedCriteria(emptyCriteria);
          }}
          className={softBtn}
        >
          <X size={16} /> Réinitialiser
        </button>
      </div>

      <SearchCard
        title="Recherche avancée"
        description="Renseignez uniquement les champs utiles. Les codes correspondent aux valeurs techniques visibles dans les listes Types, Groupes, Politiques et Équipements."
        icon={Filter}
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-4">
          <input
            className={inputClass}
            placeholder="Code ressource (ex: SALLE-REUNION-01)"
            value={criteria.code}
            onChange={(e) => updateCriteria("code", e.target.value)}
          />
          <input
            className={inputClass}
            placeholder="Nom de la ressource (ex: Bureau privé A)"
            value={criteria.name}
            onChange={(e) => updateCriteria("name", e.target.value)}
          />
          <input
            className={inputClass}
            placeholder="Code type (ex: MEETING_ROOM)"
            value={criteria.typeCode}
            onChange={(e) => updateCriteria("typeCode", e.target.value)}
          />
          <input
            className={inputClass}
            placeholder="Code groupe (ex: ETAGE-1)"
            value={criteria.groupCode}
            onChange={(e) => updateCriteria("groupCode", e.target.value)}
          />
          <input
            className={inputClass}
            placeholder="Code politique (ex: STANDARD)"
            value={criteria.policyCode}
            onChange={(e) => updateCriteria("policyCode", e.target.value)}
          />
          <input
            className={inputClass}
            placeholder="Zone ou bâtiment (ex: RDC, Aile nord)"
            value={criteria.zone}
            onChange={(e) => updateCriteria("zone", e.target.value)}
          />
          <input
            className={inputClass}
            placeholder="Libellé emplacement (ex: 1er étage, porte 12)"
            value={criteria.locationLabel}
            onChange={(e) => updateCriteria("locationLabel", e.target.value)}
          />
          <input
            type="number"
            className={inputClass}
            placeholder="Capacité minimale"
            value={criteria.minCapacity}
            onChange={(e) => updateCriteria("minCapacity", e.target.value)}
          />
          <select
            className={inputClass}
            value={criteria.status}
            onChange={(e) => updateCriteria("status", e.target.value)}
          >
            <option value="">Tous statuts</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <select
            className={inputClass}
            value={criteria.portalVisible}
            onChange={(e) => updateCriteria("portalVisible", e.target.value)}
          >
            <option value="">Portail : tous</option>
            <option value="true">Visible portail</option>
            <option value="false">Masqué portail</option>
          </select>
          <select
            className={inputClass}
            value={criteria.bookingEnabled}
            onChange={(e) => updateCriteria("bookingEnabled", e.target.value)}
          >
            <option value="">Réservation : tous</option>
            <option value="true">Réservation activée</option>
            <option value="false">Réservation désactivée</option>
          </select>
          <select
            className={inputClass}
            value={criteria.active}
            onChange={(e) => updateCriteria("active", e.target.value)}
          >
            <option value="">Actif : tous</option>
            <option value="true">Actif</option>
            <option value="false">Inactif</option>
          </select>
        </div>
        <button
          className={`${primaryBtn} mt-4`}
          onClick={() => setSubmittedCriteria(criteria)}
          disabled={advancedSearchQuery.isFetching}
        >
          {advancedSearchQuery.isFetching ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Search size={16} />
          )}
          Lancer la recherche avancée
        </button>
        <div className="mt-4 overflow-x-auto rounded-2xl ring-1 ring-gray-100">
          <table className="w-full border-separate border-spacing-y-2 p-2">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-gray-400">
                <th className="px-4 py-2 text-left">Ressource</th>
                <th className="px-4 py-2 text-left">Type</th>
                <th className="px-4 py-2 text-center">Statut</th>
                <th className="px-4 py-2 text-center">Portail</th>
                <th className="px-4 py-2 text-center">Réservation</th>
              </tr>
            </thead>
            <tbody>
              {advancedResources.map(
                (resource: ResourceSummaryResponse | ResourceResponse) => (
                  <tr key={resource.code} className="bg-gray-50/70">
                    <td className="rounded-l-2xl px-4 py-3">
                      <p className="text-sm font-semibold text-gray-900">
                        {resource.name}
                      </p>
                      <p className="font-mono text-xs text-gray-400">
                        {resource.code}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {resource.typeCode || "—"}
                    </td>
                    <td className="px-4 py-3 text-center text-xs font-medium text-gray-600">
                      {resource.status}
                    </td>
                    <td className="px-4 py-3 text-center text-xs">
                      {resource.portalVisible ? "Visible" : "Masqué"}
                    </td>
                    <td className="rounded-r-2xl px-4 py-3 text-center text-xs">
                      {resource.bookingEnabled ? "Activée" : "Désactivée"}
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
          {advancedResources.length === 0 && (
            <p className="p-6 text-center text-sm text-gray-500">
              Aucun résultat.
            </p>
          )}
        </div>
      </SearchCard>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <SearchCard
          title="Recherche rapide ressource"
          description="Utilise l'endpoint basic pour l'autocomplete ressource."
          icon={Building2}
        >
          <input
            className={inputClass}
            placeholder="Nom/code ressource..."
            value={quickQuery}
            onChange={(e) => setQuickQuery(e.target.value)}
          />
          <div className="mt-4 max-h-80 space-y-2 overflow-auto">
            {quickResources.map((resource) => (
              <div
                key={resource.code}
                className="rounded-2xl bg-gray-50 p-3 ring-1 ring-gray-100"
              >
                <p className="text-sm font-semibold text-gray-900">
                  {resource.name}
                </p>
                <p className="font-mono text-xs text-gray-400">
                  {resource.code} · {resource.status}
                </p>
              </div>
            ))}
            {quickQuery.length >= 2 &&
              !quickResourceQuery.isFetching &&
              quickResources.length === 0 && (
                <p className="rounded-2xl bg-gray-50 p-4 text-sm text-gray-500">
                  Aucune ressource trouvée.
                </p>
              )}
          </div>
        </SearchCard>

        <SearchCard
          title="Recherche référentiels"
          description="Types, groupes, politiques et équipements via search + search/basic."
          icon={Search}
        >
          <input
            className={inputClass}
            placeholder="Rechercher dans les référentiels..."
            value={referenceQuery}
            onChange={(e) => setReferenceQuery(e.target.value)}
          />
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            {referenceSections.map((section) => (
              <div
                key={section.title}
                className="rounded-2xl bg-gray-50 p-3 ring-1 ring-gray-100"
              >
                <p className="mb-2 text-sm font-semibold text-gray-800">
                  {section.title}
                </p>
                <p className="mb-2 text-xs text-gray-400">
                  Recherche : {section.items.length} · Basic :{" "}
                  {section.basic.length}
                </p>
                <div className="max-h-40 space-y-1 overflow-auto">
                  {[...section.items, ...section.basic]
                    .slice(0, 8)
                    .map((item: any) => (
                      <div
                        key={`${section.title}-${item.code}`}
                        className="rounded-xl bg-white px-3 py-2 text-xs ring-1 ring-gray-100"
                      >
                        <span className="font-medium text-gray-800">
                          {item.name}
                        </span>
                        <span className="ml-2 font-mono text-gray-400">
                          {item.code}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </SearchCard>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <SearchCard
          title="Détail équipement global"
          description="Récupère un équipement par code. Les quantités/prix ne sont pas modifiés ici."
          icon={Package}
        >
          <input
            className={inputClass}
            placeholder="Code équipement (ex: PROJECTEUR)"
            value={amenityCodeLookup}
            onChange={(e) => setAmenityCodeLookup(e.target.value)}
          />
          {amenityLookupQuery.data && (
            <div className="mt-4 rounded-2xl bg-gray-50 p-4 ring-1 ring-gray-100">
              <p className="font-semibold text-gray-900">
                {amenityLookupQuery.data.name}
              </p>
              <p className="font-mono text-xs text-gray-400">
                {amenityLookupQuery.data.code}
              </p>
              <p className="mt-2 text-sm text-gray-600">
                {amenityLookupQuery.data.description || "Aucune description"}
              </p>
            </div>
          )}
        </SearchCard>

        <SearchCard
          title="Liaison équipement-ressource"
          description="C'est ici que quantité, optionnel et supplément sont appliqués à une ressource."
          icon={Link2}
        >
          {(linkMessage || linkError) && (
            <div
              className={`mb-3 rounded-xl px-3 py-2 text-sm ${linkError ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}
            >
              {linkError || linkMessage}
            </div>
          )}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <input
              className={inputClass}
              placeholder="Code ressource (ex: SALLE-REUNION-01)"
              value={linkForm.resourceCode}
              onChange={(e) =>
                setLinkForm({ ...linkForm, resourceCode: e.target.value })
              }
            />
            <input
              className={inputClass}
              placeholder="Code équipement (ex: PROJECTEUR)"
              value={linkForm.amenityCode}
              onChange={(e) =>
                setLinkForm({ ...linkForm, amenityCode: e.target.value })
              }
            />
            <input
              type="number"
              className={inputClass}
              placeholder="Quantité (ex: 2)"
              value={linkForm.quantity}
              onChange={(e) =>
                setLinkForm({ ...linkForm, quantity: Number(e.target.value) })
              }
            />
            <input
              type="number"
              className={inputClass}
              placeholder="Supplément FCFA"
              value={linkForm.extraPrice}
              onChange={(e) =>
                setLinkForm({ ...linkForm, extraPrice: Number(e.target.value) })
              }
            />
          </div>
          <label className="mt-3 flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={linkForm.optional}
              onChange={(e) =>
                setLinkForm({ ...linkForm, optional: e.target.checked })
              }
            />
            Optionnel sur cette ressource
          </label>
          <button
            className={`${primaryBtn} mt-4`}
            disabled={
              !linkForm.resourceCode ||
              !linkForm.amenityCode ||
              linkAmenityMutation.isPending
            }
            onClick={() => linkAmenityMutation.mutate()}
          >
            {linkAmenityMutation.isPending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Link2 size={16} />
            )}
            Lier à la ressource
          </button>
        </SearchCard>
      </div>
    </div>
  );
};
