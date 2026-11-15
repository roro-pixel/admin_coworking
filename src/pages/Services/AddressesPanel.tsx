import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MapPin, Pencil, Plus } from "lucide-react";
import { domiciliationService } from "../../services/domiciliation.service";
import type { DomiciliationAddressView } from "../../services/domiciliation.service";
import {
  ActionButton,
  DataCard,
  EmptyState,
  ErrorBlock,
  Field,
  IconButton,
  ListHeader,
  PanelForm,
  StatusChip,
  Switch,
  Tag,
} from "../../components/subscription/kit";
import { FIELD_SOFT, apiMessage } from "../../components/subscription/kitUtils";
import { ListSkeleton } from "../../components/ui/Skeleton";
import { toast } from "../../components/ui/toastStore";

const emptyForm = () => ({
  label: "",
  streetNumber: "",
  streetName: "",
  district: "",
  city: "",
  countryCode: "CG",
  fiscalCapable: false,
  maxOccupants: "",
  active: true,
  notes: "",
});

type Form = ReturnType<typeof emptyForm>;

/** Adresses de domiciliation : création, puis modification du libellé, de la capacité et de l'état. */
export const AddressesPanel: React.FC = () => {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<DomiciliationAddressView | "new" | null>(null);
  const [form, setForm] = useState<Form>(emptyForm);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["domiciliation-addresses"],
    queryFn: () => domiciliationService.getAddresses(),
  });
  const rows = data ?? [];

  const openNew = () => {
    setForm(emptyForm());
    setEditing("new");
  };
  const openEdit = (a: DomiciliationAddressView) => {
    setForm({
      ...emptyForm(),
      label: a.label,
      fiscalCapable: a.fiscalCapable,
      maxOccupants: a.maxOccupants != null ? String(a.maxOccupants) : "",
      active: a.active,
      notes: a.notes ?? "",
    });
    setEditing(a);
  };
  const close = () => setEditing(null);

  const mutation = useMutation({
    mutationFn: () => {
      const maxOccupants = form.maxOccupants ? Number(form.maxOccupants) : null;
      if (editing === "new") {
        return domiciliationService.createAddress({
          label: form.label.trim(),
          address: {
            streetNumber: form.streetNumber.trim() || undefined,
            streetName: form.streetName.trim(),
            district: form.district.trim() || undefined,
            city: form.city.trim(),
            countryCode: form.countryCode.trim().toUpperCase(),
          },
          fiscalCapable: form.fiscalCapable,
          maxOccupants,
          notes: form.notes.trim() || undefined,
        });
      }
      return domiciliationService.updateAddress((editing as DomiciliationAddressView).code, {
        label: form.label.trim(),
        fiscalCapable: form.fiscalCapable,
        maxOccupants,
        active: form.active,
        notes: form.notes.trim() || undefined,
      });
    },
    onSuccess: () => {
      toast.success(editing === "new" ? "Adresse créée" : "Adresse mise à jour");
      qc.invalidateQueries({ queryKey: ["domiciliation-addresses"] });
      close();
    },
    onError: (e) => toast.error(apiMessage(e, "Enregistrement impossible.")),
  });

  const isNew = editing === "new";
  const valid =
    !!form.label.trim() && (!isNew || (!!form.streetName.trim() && !!form.city.trim() && /^[A-Za-z]{2}$/.test(form.countryCode.trim())));

  return (
    <div className="space-y-5">
      <ListHeader
        title="Adresses de domiciliation"
        subtitle="Adresses proposées aux domiciliés, avec leur capacité d'accueil."
        action={
          !editing && (
            <ActionButton icon={Plus} onClick={openNew}>
              Nouvelle adresse
            </ActionButton>
          )
        }
      />

      {editing && (
        <PanelForm
          title={isNew ? "Nouvelle adresse" : `Modifier ${(editing as DomiciliationAddressView).label}`}
          pending={mutation.isPending}
          submitLabel={isNew ? "Créer l'adresse" : "Enregistrer"}
          submitDisabled={!valid}
          onCancel={close}
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Libellé" required className="md:col-span-2">
              <input className={FIELD_SOFT} value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
            </Field>
            {isNew && (
              <>
                <Field label="Numéro de voie">
                  <input className={FIELD_SOFT} value={form.streetNumber} onChange={(e) => setForm({ ...form, streetNumber: e.target.value })} />
                </Field>
                <Field label="Voie" required>
                  <input className={FIELD_SOFT} value={form.streetName} onChange={(e) => setForm({ ...form, streetName: e.target.value })} />
                </Field>
                <Field label="Quartier">
                  <input className={FIELD_SOFT} value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} />
                </Field>
                <Field label="Ville" required>
                  <input className={FIELD_SOFT} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                </Field>
                <Field label="Pays (code à deux lettres)" required>
                  <input
                    className={FIELD_SOFT}
                    maxLength={2}
                    value={form.countryCode}
                    onChange={(e) => setForm({ ...form, countryCode: e.target.value.toUpperCase() })}
                  />
                </Field>
              </>
            )}
            <Field label="Domiciliés maximum" hint="Laissez vide pour ne pas limiter.">
              <input
                type="number"
                min={1}
                className={FIELD_SOFT}
                value={form.maxOccupants}
                onChange={(e) => setForm({ ...form, maxOccupants: e.target.value })}
              />
            </Field>
            <Field label="Notes" className="md:col-span-2">
              <textarea className={FIELD_SOFT} rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </Field>
          </div>
          <div className="grid grid-cols-1 gap-3 rounded-2xl bg-gray-50 p-3 md:grid-cols-2">
            <Switch
              checked={form.fiscalCapable}
              onChange={(v) => setForm({ ...form, fiscalCapable: v })}
              label="Adresse fiscale possible"
              hint="Une attestation fiscale n'est délivrée que sur douze mois d'engagement."
            />
            {!isNew && <Switch checked={form.active} onChange={(v) => setForm({ ...form, active: v })} label="Adresse active" />}
          </div>
        </PanelForm>
      )}

      {isLoading ? (
        <ListSkeleton rows={4} />
      ) : isError ? (
        <ErrorBlock message="Impossible de charger les adresses." onRetry={() => refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState icon={MapPin} title="Aucune adresse" hint="Créez l'adresse que vos domiciliés pourront utiliser." />
      ) : (
        <DataCard>
          <div className="grid grid-cols-1 gap-2 xl:grid-cols-2">
            {rows.map((a) => {
              const street = [a.streetNumber, a.streetName].filter(Boolean).join(" ");
              const place = [a.district, a.city, a.countryCode].filter(Boolean).join(", ");
              const ratio = a.maxOccupants ? Math.min(100, ((a.occupants ?? 0) / a.maxOccupants) * 100) : null;
              return (
                <div key={a.code} className="rounded-2xl bg-gray-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="break-words text-sm font-bold text-gray-950">{a.label}</p>
                        <StatusChip tone={a.active ? "success" : "neutral"}>{a.active ? "Active" : "Inactive"}</StatusChip>
                      </div>
                      <p className="mt-0.5 font-mono text-xs text-gray-400">{a.code}</p>
                      <p className="mt-2 break-words text-sm text-gray-700">{street || "Voie non renseignée"}</p>
                      <p className="break-words text-xs text-gray-500">{place}</p>
                    </div>
                    <IconButton icon={Pencil} label="Modifier l'adresse" onClick={() => openEdit(a)} />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {a.fiscalCapable ? <Tag tone="pink">Adresse fiscale possible</Tag> : <Tag>Commerciale seulement</Tag>}
                  </div>
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>Domiciliés</span>
                      <span className="font-semibold text-gray-800">
                        {a.occupants ?? 0}
                        {a.maxOccupants != null ? ` / ${a.maxOccupants}` : ""}
                      </span>
                    </div>
                    {ratio !== null && (
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-gray-200">
                        <div className="h-full rounded-full bg-[color:var(--logo-pink)]" style={{ width: `${ratio}%` }} />
                      </div>
                    )}
                  </div>
                  {a.notes && <p className="mt-3 break-words text-xs text-gray-500">{a.notes}</p>}
                </div>
              );
            })}
          </div>
        </DataCard>
      )}
    </div>
  );
};
