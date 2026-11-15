import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Link2, Package, Search, SlidersHorizontal, Zap } from "lucide-react";
import { resourceService } from "../../../services/resource.service";
import type { ResourceStatus, ResourceSummaryResponse } from "../../../services/resource.service";
import { ActionButton, CheckField, DataCard, EmptyState, ErrorBlock, Field, FilterPanel, HeadRow, ListHeader, PanelForm, Pagination, SearchField, Section, Detail } from "../../../components/subscription/kit";
import { FIELD, ROW_HOVER, apiMessage, formatMoney } from "../../../components/subscription/kitUtils";
import { ListSkeleton, Skeleton } from "../../../components/ui/Skeleton";
import { toast } from "../../../components/ui/toastStore";
import { Cell, STATUSES, STATUS_LABEL, StatusBadge, useDebounced } from "../../../components/resources/resKit";
import { ResourceAutocomplete } from "../../../components/resources/ResourceAutocomplete";

const EMPTY = {
  code: "", name: "", typeCode: "", groupCode: "", policyCode: "", zone: "", locationLabel: "",
  status: "" as "" | ResourceStatus, portalVisible: "", bookingEnabled: "", active: "", minCapacity: "",
};
type Criteria = typeof EMPTY;
const COLS = "lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_8rem_7rem_8rem]";
const toContent = (raw: any): any[] => (Array.isArray(raw) ? raw : Array.isArray(raw?.content) ? raw.content : []);
const bool = (v: string) => (v === "" ? undefined : v === "true");
const YES_NO = (yes: string, no: string, all: string) => [["", all], ["true", yes], ["false", no]] as const;

export const ResourceAdvancedSearchPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [criteria, setCriteria] = useState<Criteria>(EMPTY);
  const [submitted, setSubmitted] = useState<Criteria>(EMPTY);
  const [page, setPage] = useState(0);
  const [refQuery, setRefQuery] = useState("");
  const [amenityCode, setAmenityCode] = useState("");
  const [link, setLink] = useState<{ resource: ResourceSummaryResponse | null; amenityCode: string; quantity: number; optional: boolean; extraPrice: number } | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);

  const ref = useDebounced(refQuery.trim(), 300);
  const code = useDebounced(amenityCode.trim(), 300);
  const refOn = ref.length >= 2;

  const set = (k: keyof Criteria, v: string) => setCriteria((p) => ({ ...p, [k]: v }));
  const submit = () => { setSubmitted(criteria); setPage(0); };
  const reset = () => { setCriteria(EMPTY); setSubmitted(EMPTY); setPage(0); };
  const canReset = JSON.stringify(criteria) !== JSON.stringify(EMPTY) || JSON.stringify(submitted) !== JSON.stringify(EMPTY);

  const typesQuery = useQuery({ queryKey: ["resource-types-list"], queryFn: () => resourceService.getResourceTypes({ size: 500 }) });
  const groupsQuery = useQuery({ queryKey: ["resource-groups-list"], queryFn: () => resourceService.getResourceGroups({ size: 500 }) });
  const policiesQuery = useQuery({ queryKey: ["resource-policies-list"], queryFn: () => resourceService.getResourcePolicies({ size: 500 }) });
  const amenitiesQuery = useQuery({ queryKey: ["all-amenities"], queryFn: () => resourceService.getAmenities({ size: 500 }) });

  const search = useQuery({
    queryKey: ["resource-advanced-search", submitted, page],
    queryFn: () =>
      resourceService.advancedSearchResources({
        code: submitted.code || undefined,
        name: submitted.name || undefined,
        typeCode: submitted.typeCode || undefined,
        groupCode: submitted.groupCode || undefined,
        policyCode: submitted.policyCode || undefined,
        zone: submitted.zone || undefined,
        locationLabel: submitted.locationLabel || undefined,
        status: submitted.status || undefined,
        portalVisible: bool(submitted.portalVisible),
        bookingEnabled: bool(submitted.bookingEnabled),
        active: bool(submitted.active),
        minCapacity: submitted.minCapacity ? Number(submitted.minCapacity) : undefined,
        page,
        size: 20,
        sort: "name,asc",
      }),
  });
  const results: ResourceSummaryResponse[] = search.data?.content || [];

  const quick = useQuery({ queryKey: ["resource-search-basic", ref], queryFn: () => resourceService.searchResources(ref), enabled: refOn });
  const typeS = useQuery({ queryKey: ["resource-type-search", ref], queryFn: () => resourceService.searchResourceTypes(ref, { size: 10 }), enabled: refOn });
  const typeB = useQuery({ queryKey: ["resource-type-search-basic", ref], queryFn: () => resourceService.searchResourceTypesBasic(ref), enabled: refOn });
  const groupS = useQuery({ queryKey: ["resource-group-search", ref], queryFn: () => resourceService.searchResourceGroups(ref, { size: 10 }), enabled: refOn });
  const groupB = useQuery({ queryKey: ["resource-group-search-basic", ref], queryFn: () => resourceService.searchResourceGroupsBasic(ref), enabled: refOn });
  const polS = useQuery({ queryKey: ["resource-policy-search", ref], queryFn: () => resourceService.searchResourcePolicies(ref, { size: 10 }), enabled: refOn });
  const polB = useQuery({ queryKey: ["resource-policy-search-basic", ref], queryFn: () => resourceService.searchResourcePoliciesBasic(ref), enabled: refOn });
  const amS = useQuery({ queryKey: ["resource-amenity-search", ref], queryFn: () => resourceService.searchAmenities(ref, { size: 10 }), enabled: refOn });
  const amB = useQuery({ queryKey: ["resource-amenity-search-basic", ref], queryFn: () => resourceService.searchAmenitiesBasic(ref), enabled: refOn });
  const lookup = useQuery({ queryKey: ["resource-amenity-lookup", code], queryFn: () => resourceService.getAmenity(code), enabled: code.length > 0, retry: false });

  const refLoading = refOn && [quick, typeS, typeB, groupS, groupB, polS, polB, amS, amB].some((q) => q.isFetching);
  const groups = useMemo(() => {
    const merge = (a: unknown, b: unknown) => {
      const seen = new Map<string, any>();
      [...toContent(a), ...toContent(b)].forEach((i) => i?.code && !seen.has(i.code) && seen.set(i.code, i));
      return [...seen.values()].slice(0, 8);
    };
    return [
      { title: "Ressources", items: (quick.data ?? []).slice(0, 8) as any[] },
      { title: "Types", items: merge(typeS.data, typeB.data) },
      { title: "Groupes", items: merge(groupS.data, groupB.data) },
      { title: "Politiques", items: merge(polS.data, polB.data) },
      { title: "Équipements", items: merge(amS.data, amB.data) },
    ];
  }, [quick.data, typeS.data, typeB.data, groupS.data, groupB.data, polS.data, polB.data, amS.data, amB.data]);

  const linkMutation = useMutation({
    mutationFn: () =>
      resourceService.linkAmenityToResource(link!.resource!.code, {
        amenityCode: link!.amenityCode,
        quantity: link!.quantity || 1,
        optional: link!.optional,
        extraPrice: link!.extraPrice || undefined,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["resource"] });
      toast.success("Équipement lié à la ressource");
      setLink(null);
    },
    onError: (e) => setLinkError(apiMessage(e, "Liaison impossible")),
  });

  const types = toContent(typesQuery.data);
  const grps = toContent(groupsQuery.data);
  const pols = toContent(policiesQuery.data);
  const ams = toContent(amenitiesQuery.data);
  const Sel: React.FC<{ k: keyof Criteria; all: string; opts: readonly (readonly [string, string])[] }> = ({ k, all, opts }) => (
    <select value={criteria[k]} onChange={(e) => set(k, e.target.value)} className={FIELD} aria-label={all}>
      {opts.map(([v, l]) => <option key={v} value={v}>{v === "" ? all : l}</option>)}
    </select>
  );
  const opts = (list: any[]) => [["", ""], ...list.map((i) => [i.code, i.name] as const)] as readonly (readonly [string, string])[];

  return (
    <div className="space-y-5">
      <ListHeader
        title="Recherche avancée"
        subtitle="Croisez les critères pour retrouver des ressources, puis liez-leur des équipements."
        action={<ActionButton variant="ghost" icon={Link2} onClick={() => { setLinkError(null); setLink({ resource: null, amenityCode: "", quantity: 1, optional: false, extraPrice: 0 }); }}>Lier un équipement</ActionButton>}
      />

      {link && (
        <PanelForm
          title="Lier un équipement à une ressource"
          onCancel={() => setLink(null)}
          pending={linkMutation.isPending}
          submitLabel="Lier"
          submitDisabled={!link.resource || !link.amenityCode}
          error={linkError}
          onSubmit={(e) => { e.preventDefault(); setLinkError(null); linkMutation.mutate(); }}
        >
          <Field label="Ressource" required>
            <ResourceAutocomplete selectedResource={link.resource} selectedCode={link.resource?.code || ""} onSelect={(r) => setLink({ ...link, resource: r })} required />
          </Field>
          <Field label="Équipement" required>
            <select value={link.amenityCode} onChange={(e) => setLink({ ...link, amenityCode: e.target.value })} className={FIELD}>
              <option value="">Choisir un équipement</option>
              {ams.map((a: any) => <option key={a.code} value={a.code}>{a.name}</option>)}
            </select>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Quantité"><input type="number" min={1} value={link.quantity} onChange={(e) => setLink({ ...link, quantity: parseInt(e.target.value) || 1 })} className={FIELD} /></Field>
            <Field label="Supplément (FCFA)"><input type="number" min={0} value={link.extraPrice} onChange={(e) => setLink({ ...link, extraPrice: parseInt(e.target.value) || 0 })} className={FIELD} /></Field>
          </div>
          <CheckField checked={link.optional} onChange={(v) => setLink({ ...link, optional: v })} label="Optionnel sur cette ressource" />
        </PanelForm>
      )}

      <Section title="Critères" icon={SlidersHorizontal}>
        <FilterPanel canReset={canReset} onReset={reset}>
          <input className={FIELD} placeholder="Code ressource" value={criteria.code} onChange={(e) => set("code", e.target.value)} />
          <input className={FIELD} placeholder="Nom" value={criteria.name} onChange={(e) => set("name", e.target.value)} />
          <input className={FIELD} type="number" min={0} placeholder="Capacité minimale" value={criteria.minCapacity} onChange={(e) => set("minCapacity", e.target.value)} />
          <Sel k="typeCode" all="Tous les types" opts={opts(types)} />
          <Sel k="groupCode" all="Tous les groupes" opts={opts(grps)} />
          <Sel k="policyCode" all="Toutes les politiques" opts={opts(pols)} />
          <input className={FIELD} placeholder="Zone ou bâtiment" value={criteria.zone} onChange={(e) => set("zone", e.target.value)} />
          <input className={FIELD} placeholder="Emplacement" value={criteria.locationLabel} onChange={(e) => set("locationLabel", e.target.value)} />
          <Sel k="status" all="Tous les statuts" opts={[["", ""], ...STATUSES.map((s) => [s, STATUS_LABEL[s] ?? s] as const)]} />
          <Sel k="portalVisible" all="Portail : tous" opts={YES_NO("Visible sur le portail", "Masquée du portail", "")} />
          <Sel k="bookingEnabled" all="Réservation : tous" opts={YES_NO("Réservation activée", "Réservation désactivée", "")} />
          <Sel k="active" all="Actif : tous" opts={YES_NO("Actives", "Inactives", "")} />
        </FilterPanel>
        <div className="mt-4">
          <ActionButton icon={Search} pending={search.isFetching && !search.isLoading} onClick={submit}>Lancer la recherche</ActionButton>
        </div>
      </Section>

      {search.isError ? (
        <ErrorBlock message="La recherche a échoué." onRetry={() => search.refetch()} />
      ) : search.isLoading ? (
        <ListSkeleton rows={5} />
      ) : results.length === 0 ? (
        <EmptyState icon={Search} title="Aucun résultat" hint="Assouplissez les critères et relancez la recherche." />
      ) : (
        <>
          <HeadRow cols={COLS}>
            <span>Ressource</span><span>Type</span><span>Statut</span><span>Portail</span><span>Réservation</span>
          </HeadRow>
          <DataCard>
            {results.map((r) => (
              <div key={r.code} onClick={() => navigate(`/resources/${r.code}`)} className={`cursor-pointer rounded-2xl max-lg:mb-2 max-lg:bg-gray-50 ${ROW_HOVER}`}>
                <div className={`grid grid-cols-2 items-center gap-x-4 gap-y-2 p-4 ${COLS}`}>
                  <Cell title="Ressource" className="col-span-2 lg:col-span-1">
                    <p className="truncate text-sm font-semibold text-gray-900">{r.name}</p>
                    <p className="font-mono text-xs text-gray-500">{r.code}</p>
                  </Cell>
                  <Cell title="Type"><span className="text-sm text-gray-700">{r.typeCode}</span></Cell>
                  <Cell title="Statut"><StatusBadge status={r.status} /></Cell>
                  <Cell title="Portail"><span className="text-sm text-gray-700">{r.portalVisible ? "Visible" : "Masquée"}</span></Cell>
                  <Cell title="Réservation"><span className="text-sm text-gray-700">{r.bookingEnabled ? "Activée" : "Désactivée"}</span></Cell>
                </div>
              </div>
            ))}
          </DataCard>
          <Pagination page={page} totalPages={search.data?.totalPages ?? 1} total={search.data?.totalElements ?? results.length} noun="ressource" onChange={setPage} />
        </>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Section title="Recherche rapide" description="Ressources, types, groupes, politiques et équipements en une saisie." icon={Zap}>
          <SearchField value={refQuery} onChange={setRefQuery} placeholder="Au moins 2 caractères" />
          {refOn && (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {groups.map((g) => (
                <div key={g.title} className="rounded-2xl bg-gray-50 p-4">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">{g.title}</p>
                  {refLoading && g.items.length === 0 ? (
                    <Skeleton className="h-8 w-full" />
                  ) : g.items.length === 0 ? (
                    <p className="text-sm text-gray-400">Aucun résultat</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {g.items.map((i: any) => (
                        <li key={i.code} className="flex items-baseline justify-between gap-2 text-sm">
                          <span className="truncate font-medium text-gray-800">{i.name}</span>
                          <span className="shrink-0 font-mono text-xs text-gray-500">{i.code}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title="Détail d'un équipement" description="Saisissez son code pour consulter la fiche du référentiel." icon={Package}>
          <input className={FIELD} placeholder="Code de l'équipement" value={amenityCode} onChange={(e) => setAmenityCode(e.target.value)} />
          {code && lookup.isFetching && <Skeleton className="mt-4 h-20 w-full" />}
          {code && lookup.isError && !lookup.isFetching && <p className="mt-4 text-sm text-gray-500">Aucun équipement avec ce code.</p>}
          {lookup.data && code && !lookup.isFetching && (
            <div className="mt-4 grid gap-3 rounded-2xl bg-gray-50 p-4 sm:grid-cols-2">
              <Detail label="Nom">{lookup.data.name}</Detail>
              <Detail label="Code" mono>{lookup.data.code}</Detail>
              <Detail label="Supplément">{lookup.data.extraPrice ? formatMoney(lookup.data.extraPrice, "FCFA") : ""}</Detail>
              <Detail label="Description" wide>{lookup.data.description}</Detail>
            </div>
          )}
        </Section>
      </div>
    </div>
  );
};
