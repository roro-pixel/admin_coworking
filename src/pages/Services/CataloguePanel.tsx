import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ListChecks, Pencil, Plus } from "lucide-react";
import { serviceCatalogService } from "../../services/serviceCatalog.service";
import type { ServiceDefinitionRequest, ServiceDefinitionView } from "../../services/serviceCatalog.service";
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
import { FIELD_SOFT, apiMessage, formatMoney } from "../../components/subscription/kitUtils";
import { BILLING_CYCLE_LABELS } from "../../components/subscription/labels";
import { ListSkeleton } from "../../components/ui/Skeleton";
import { toast } from "../../components/ui/toastStore";
import { DELIVERY_MODE_LABEL, DELIVERY_MODE_OPTIONS, SERVICE_CATEGORY_LABEL, SERVICE_CATEGORY_OPTIONS } from "../../components/services/serviceLabels";

const emptyForm = () => ({
  name: "",
  description: "",
  serviceCategory: "DOMICILIATION",
  deliveryMode: "CONTINUOUS",
  requiresContract: false,
  requiresKycLevel: "0",
  requiresPhysicalResource: false,
  hasRegulatoryObligations: false,
  defaultBillingCycle: "",
  defaultNoticePeriodDays: "",
  defaultCommitmentMonths: "",
  unitPrice: "",
  currency: "XAF",
  usageEntitlementCode: "",
  active: true,
});
type Form = ReturnType<typeof emptyForm>;

const toForm = (s: ServiceDefinitionView): Form => ({
  name: s.name,
  description: s.description ?? "",
  serviceCategory: s.serviceCategory,
  deliveryMode: s.deliveryMode,
  requiresContract: s.requiresContract,
  requiresKycLevel: String(s.requiresKycLevel ?? 0),
  requiresPhysicalResource: s.requiresPhysicalResource,
  hasRegulatoryObligations: s.hasRegulatoryObligations,
  defaultBillingCycle: s.defaultBillingCycle ?? "",
  defaultNoticePeriodDays: s.defaultNoticePeriodDays != null ? String(s.defaultNoticePeriodDays) : "",
  defaultCommitmentMonths: s.defaultCommitmentMonths != null ? String(s.defaultCommitmentMonths) : "",
  unitPrice: s.unitPrice != null ? String(s.unitPrice) : "",
  currency: s.currency ?? "XAF",
  usageEntitlementCode: s.usageEntitlementCode ?? "",
  active: s.active,
});

const num = (v: string) => (v.trim() === "" ? null : Number(v));

/** Catalogue de services : consultation, création et remplacement d'une définition par son code. */
export const CataloguePanel: React.FC = () => {
  const qc = useQueryClient();
  const [includeInactive, setIncludeInactive] = useState(false);
  const [editing, setEditing] = useState<ServiceDefinitionView | "new" | null>(null);
  const [form, setForm] = useState<Form>(emptyForm);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["service-catalogue", includeInactive],
    queryFn: () => serviceCatalogService.getCatalogue(includeInactive),
  });
  const rows = data ?? [];

  const close = () => setEditing(null);
  const openNew = () => {
    setForm(emptyForm());
    setEditing("new");
  };
  const openEdit = (s: ServiceDefinitionView) => {
    setForm(toForm(s));
    setEditing(s);
  };

  const mutation = useMutation({
    mutationFn: () => {
      const payload: ServiceDefinitionRequest = {
        ...(editing && editing !== "new" ? { code: editing.code } : {}),
        name: form.name.trim(),
        description: form.description.trim() || null,
        serviceCategory: form.serviceCategory,
        deliveryMode: form.deliveryMode,
        requiresContract: form.requiresContract,
        requiresKycLevel: Number(form.requiresKycLevel) || 0,
        requiresPhysicalResource: form.requiresPhysicalResource,
        hasRegulatoryObligations: form.hasRegulatoryObligations,
        defaultBillingCycle: form.defaultBillingCycle || null,
        defaultNoticePeriodDays: num(form.defaultNoticePeriodDays),
        defaultCommitmentMonths: num(form.defaultCommitmentMonths),
        unitPrice: num(form.unitPrice),
        currency: form.currency.trim() || null,
        usageEntitlementCode: form.usageEntitlementCode.trim() || null,
        active: form.active,
      };
      return serviceCatalogService.upsertServiceDefinition(payload);
    },
    onSuccess: () => {
      toast.success(editing === "new" ? "Service créé" : "Service mis à jour");
      qc.invalidateQueries({ queryKey: ["service-catalogue"] });
      close();
    },
    onError: (e) => toast.error(apiMessage(e, "Enregistrement impossible.")),
  });

  const isNew = editing === "new";
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="space-y-5">
      <ListHeader
        title="Catalogue de services"
        subtitle="Ce que le centre peut ajouter à un abonnement, avec ses conditions."
        action={
          !editing && (
            <ActionButton icon={Plus} onClick={openNew}>
              Nouveau service
            </ActionButton>
          )
        }
      />

      {editing && (
        <PanelForm
          title={isNew ? "Nouveau service" : `Modifier ${(editing as ServiceDefinitionView).name}`}
          pending={mutation.isPending}
          submitLabel={isNew ? "Créer le service" : "Enregistrer"}
          submitDisabled={!form.name.trim()}
          onCancel={close}
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Nom" required className="md:col-span-2">
              <input className={FIELD_SOFT} value={form.name} onChange={(e) => set("name", e.target.value)} />
            </Field>
            <Field label="Catégorie" required>
              <select className={FIELD_SOFT} value={form.serviceCategory} onChange={(e) => set("serviceCategory", e.target.value)}>
                {SERVICE_CATEGORY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Mode de fourniture" required>
              <select className={FIELD_SOFT} value={form.deliveryMode} onChange={(e) => set("deliveryMode", e.target.value)}>
                {DELIVERY_MODE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Description" className="md:col-span-2">
              <textarea className={FIELD_SOFT} rows={2} value={form.description} onChange={(e) => set("description", e.target.value)} />
            </Field>
            <Field label="Prix unitaire">
              <input type="number" min={0} className={FIELD_SOFT} value={form.unitPrice} onChange={(e) => set("unitPrice", e.target.value)} />
            </Field>
            <Field label="Devise">
              <input className={FIELD_SOFT} value={form.currency} onChange={(e) => set("currency", e.target.value.toUpperCase())} />
            </Field>
            <Field label="Rythme de facturation par défaut">
              <select className={FIELD_SOFT} value={form.defaultBillingCycle} onChange={(e) => set("defaultBillingCycle", e.target.value)}>
                <option value="">Aucun</option>
                {Object.entries(BILLING_CYCLE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Niveau KYC exigé">
              <input type="number" min={0} className={FIELD_SOFT} value={form.requiresKycLevel} onChange={(e) => set("requiresKycLevel", e.target.value)} />
            </Field>
            <Field label="Préavis par défaut (jours)">
              <input
                type="number"
                min={0}
                className={FIELD_SOFT}
                value={form.defaultNoticePeriodDays}
                onChange={(e) => set("defaultNoticePeriodDays", e.target.value)}
              />
            </Field>
            <Field label="Engagement par défaut (mois)">
              <input
                type="number"
                min={0}
                className={FIELD_SOFT}
                value={form.defaultCommitmentMonths}
                onChange={(e) => set("defaultCommitmentMonths", e.target.value)}
              />
            </Field>
            <Field label="Droit d'usage associé" hint="Code du droit consommé par ce service, s'il y en a un." className="md:col-span-2">
              <input className={FIELD_SOFT} value={form.usageEntitlementCode} onChange={(e) => set("usageEntitlementCode", e.target.value)} />
            </Field>
          </div>
          <div className="grid grid-cols-1 gap-3 rounded-2xl bg-gray-50 p-3 md:grid-cols-2">
            <Switch checked={form.requiresContract} onChange={(v) => set("requiresContract", v)} label="Exige un contrat" hint="Le service reste en attente jusqu'à l'activation du contrat." />
            <Switch checked={form.requiresPhysicalResource} onChange={(v) => set("requiresPhysicalResource", v)} label="Exige une ressource physique" />
            <Switch checked={form.hasRegulatoryObligations} onChange={(v) => set("hasRegulatoryObligations", v)} label="Obligations réglementaires" />
            <Switch checked={form.active} onChange={(v) => set("active", v)} label="Service actif" />
          </div>
        </PanelForm>
      )}

      <div className="max-w-md">
        <Switch checked={includeInactive} onChange={setIncludeInactive} label="Afficher les services inactifs" />
      </div>

      {isLoading ? (
        <ListSkeleton rows={5} />
      ) : isError ? (
        <ErrorBlock message="Impossible de charger le catalogue." onRetry={() => refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState icon={ListChecks} title="Aucun service au catalogue" hint="Créez le premier service proposé aux abonnés." />
      ) : (
        <DataCard>
          <div className="grid grid-cols-1 gap-2 xl:grid-cols-2">
            {rows.map((s) => (
              <div key={s.code} className="rounded-2xl bg-gray-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="break-words text-sm font-bold text-gray-950">{s.name}</p>
                      <StatusChip tone={s.active ? "success" : "neutral"}>{s.active ? "Actif" : "Inactif"}</StatusChip>
                    </div>
                    <p className="mt-0.5 font-mono text-xs text-gray-400">{s.code}</p>
                  </div>
                  <IconButton icon={Pencil} label="Modifier le service" onClick={() => openEdit(s)} />
                </div>
                {s.description && <p className="mt-2 break-words text-sm text-gray-600">{s.description}</p>}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <Tag tone="pink">{SERVICE_CATEGORY_LABEL[s.serviceCategory] ?? s.serviceCategory}</Tag>
                  <Tag>{DELIVERY_MODE_LABEL[s.deliveryMode] ?? s.deliveryMode}</Tag>
                  {s.requiresContract && <Tag>Contrat requis</Tag>}
                  {s.requiresKycLevel > 0 && <Tag>KYC niveau {s.requiresKycLevel}</Tag>}
                  {s.requiresPhysicalResource && <Tag>Ressource physique</Tag>}
                  {s.hasRegulatoryObligations && <Tag>Réglementé</Tag>}
                </div>
                <p className="mt-3 text-sm font-semibold text-gray-900">
                  {s.unitPrice != null ? formatMoney(s.unitPrice, s.currency ?? "XAF") : "Prix selon l'abonnement"}
                  {s.defaultBillingCycle && (
                    <span className="font-normal text-gray-500"> · {BILLING_CYCLE_LABELS[s.defaultBillingCycle] ?? s.defaultBillingCycle}</span>
                  )}
                </p>
              </div>
            ))}
          </div>
        </DataCard>
      )}
    </div>
  );
};
