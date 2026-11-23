import React, { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { DoorOpen, Search } from "lucide-react";
import { resourceOpsService } from "../../../services/resourceOps.service";
import type { FindRoomOption, FindRoomResult } from "../../../services/resourceOps.service";
import { resourceService } from "../../../services/resource.service";
import { ActionButton, DataCard, EmptyState, Field, Section, StatusChip } from "../../../components/subscription/kit";
import { FIELD, apiMessage, formatDateTime, formatMoney } from "../../../components/subscription/kitUtils";
import { withSeconds } from "../../../components/resources/resKit";

const OWNER: Record<string, string> = { MEMBER: "Membre", CUSTOMER: "Client", BUSINESS_ENTITY: "Entreprise" };

const Options: React.FC<{ title: string; items: FindRoomOption[]; alt?: boolean }> = ({ title, items, alt }) => (
  <Section title={title} icon={DoorOpen}>
    {items.length === 0 ? (
      <p className="text-sm text-gray-500">{alt ? "Aucune alternative." : "Aucune salle ne correspond à tous les critères."}</p>
    ) : (
      <DataCard>
        {items.map((o, i) => (
          <div key={`${o.resourceCode}-${o.startedAt}-${i}`} className="flex flex-wrap items-center gap-3 p-4">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-gray-900">{o.name}</p>
              <p className="truncate text-xs text-gray-400">
                {o.resourceCode}
                {o.siteCode ? ` · ${o.siteCode}` : ""}
                {o.capacity ? ` · ${o.capacity} pers.` : ""}
                {o.startedAt ? ` · ${formatDateTime(o.startedAt)} → ${String(o.endedAt ?? "").slice(11, 16)}` : ""}
              </p>
              {(o.notes ?? []).length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {o.notes!.map((n) => (
                    <StatusChip key={n} tone="warn">
                      {n}
                    </StatusChip>
                  ))}
                </div>
              )}
            </div>
            {o.price != null && <span className="text-sm font-semibold text-gray-900">{formatMoney(o.price, o.currency || "XAF")}</span>}
          </div>
        ))}
      </DataCard>
    )}
  </Section>
);

/** Trouver une salle par besoin : créneau, participants, équipements, site, type, budget. */
export const FindRoomPanel: React.FC = () => {
  const [form, setForm] = useState({ startedAt: "", endedAt: "", participants: "", siteCode: "", typeCode: "", maxBudget: "", ownerType: "", ownerCode: "", amenityCodes: [] as string[] });
  const [result, setResult] = useState<FindRoomResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sites = useQuery({ queryKey: ["resource-sites"], queryFn: () => resourceOpsService.getSites() });
  const types = useQuery({ queryKey: ["resource-types-list"], queryFn: () => resourceService.getResourceTypes({ size: 500 }) });
  const amenities = useQuery({ queryKey: ["all-amenities"], queryFn: () => resourceService.getAmenities({ size: 500 }) });

  const find = useMutation({
    mutationFn: () =>
      resourceOpsService.findRooms({
        startedAt: form.startedAt ? withSeconds(form.startedAt) : undefined,
        endedAt: form.endedAt ? withSeconds(form.endedAt) : undefined,
        participants: form.participants === "" ? undefined : Number(form.participants),
        amenityCodes: form.amenityCodes.length ? form.amenityCodes : undefined,
        siteCode: form.siteCode || undefined,
        typeCode: form.typeCode || undefined,
        maxBudget: form.maxBudget === "" ? undefined : Number(form.maxBudget),
        ownerType: form.ownerCode.trim() ? form.ownerType || undefined : undefined,
        ownerCode: form.ownerCode.trim() || undefined,
      }),
    onSuccess: (r) => {
      setResult(r);
      setError(null);
    },
    onError: (e) => setError(apiMessage(e, "La recherche a échoué")),
  });

  const set = (p: Partial<typeof form>) => setForm((s) => ({ ...s, ...p }));
  const toggleAmenity = (code: string) => set({ amenityCodes: form.amenityCodes.includes(code) ? form.amenityCodes.filter((c) => c !== code) : [...form.amenityCodes, code] });
  const typeList = (types.data?.content ?? []) as { code: string; name: string }[];
  const amenityList = (amenities.data?.content ?? []) as { code: string; name: string }[];

  return (
    <div className="space-y-5">
      <Section title="Trouver une salle" description="Les salles libres sur le créneau, du bon type et du bon site, assez grandes, avec tous les équipements, triées par prix du titulaire." icon={Search}>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (form.startedAt && form.endedAt && form.endedAt <= form.startedAt) return setError("La fin doit être postérieure au début.");
            setError(null);
            find.mutate();
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Début">
              <input type="datetime-local" value={form.startedAt} onChange={(e) => set({ startedAt: e.target.value })} className={FIELD} />
            </Field>
            <Field label="Fin">
              <input type="datetime-local" value={form.endedAt} min={form.startedAt} onChange={(e) => set({ endedAt: e.target.value })} className={FIELD} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-4">
            <Field label="Participants">
              <input type="number" min={1} value={form.participants} onChange={(e) => set({ participants: e.target.value })} className={FIELD} />
            </Field>
            <Field label="Site">
              <select value={form.siteCode} onChange={(e) => set({ siteCode: e.target.value })} className={FIELD}>
                <option value="">Tous</option>
                {(sites.data ?? []).map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Type">
              <select value={form.typeCode} onChange={(e) => set({ typeCode: e.target.value })} className={FIELD}>
                <option value="">Tous</option>
                {typeList.map((t) => (
                  <option key={t.code} value={t.code}>
                    {t.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Budget maximum">
              <input type="number" min={0} value={form.maxBudget} onChange={(e) => set({ maxBudget: e.target.value })} className={FIELD} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Prix pour le client" hint="Facultatif : le prix tient compte du titulaire (segment, abonnement).">
              <div className="flex gap-2">
                <select value={form.ownerType} onChange={(e) => set({ ownerType: e.target.value })} className={`${FIELD} !w-40`}>
                  <option value="">Type</option>
                  {Object.entries(OWNER).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
                <input value={form.ownerCode} onChange={(e) => set({ ownerCode: e.target.value })} placeholder="Code" className={FIELD} />
              </div>
            </Field>
          </div>
          {amenityList.length > 0 && (
            <Field label="Équipements nécessaires">
              <div className="flex flex-wrap gap-2">
                {amenityList.map((a) => (
                  <button
                    key={a.code}
                    type="button"
                    onClick={() => toggleAmenity(a.code)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${form.amenityCodes.includes(a.code) ? "bg-[color:var(--logo-pink-dark)] text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                  >
                    {a.name}
                  </button>
                ))}
              </div>
            </Field>
          )}
          {error && <p className="rounded-2xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <ActionButton type="submit" icon={Search} pending={find.isPending}>
            Chercher
          </ActionButton>
        </form>
      </Section>

      {result ? (
        <>
          <Options title={`Salles disponibles (${result.matches.length})`} items={result.matches} />
          <Options title={`Alternatives (${result.alternatives.length})`} items={result.alternatives} alt />
        </>
      ) : (
        <EmptyState icon={DoorOpen} title="Décrivez le besoin" hint="Les salles correspondantes et les alternatives s'affichent ici." />
      )}
    </div>
  );
};
