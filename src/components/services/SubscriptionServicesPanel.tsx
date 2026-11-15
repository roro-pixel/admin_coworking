import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban, Layers, Pause, Plus, Trash2 } from "lucide-react";
import { serviceCatalogService } from "../../services/serviceCatalog.service";
import type { SubscriptionServiceView } from "../../services/serviceCatalog.service";
import { ActionButton, EmptyState, ErrorBlock, Field, IconButton, ItemRow, PanelForm, Section, StatusChip, Tag } from "../subscription/kit";
import { FIELD_SOFT, apiMessage, formatMoney } from "../subscription/kitUtils";
import { statusOf } from "../subscription/labels";
import { Skeleton } from "../ui/Skeleton";
import { toast } from "../ui/toastStore";
import { SERVICE_CATEGORY_LABEL, SUBSCRIBED_SERVICE_STATUS } from "./serviceLabels";

type Panel = null | "add" | { suspend: string };

/**
 * Services souscrits d'un abonnement : ajout depuis le catalogue, suspension et résiliation.
 * Un service qui exige un contrat reste en attente jusqu'à l'activation de ce contrat.
 */
export const SubscriptionServicesPanel: React.FC<{ subscriptionNumber: string }> = ({ subscriptionNumber }) => {
  const qc = useQueryClient();
  const [panel, setPanel] = useState<Panel>(null);
  const [add, setAdd] = useState({ serviceCode: "", quantity: "1", unitPrice: "" });
  const [reason, setReason] = useState("");

  const services = useQuery({
    queryKey: ["subscription-services", subscriptionNumber],
    queryFn: () => serviceCatalogService.getSubscriptionServices(subscriptionNumber),
  });
  const catalogue = useQuery({
    queryKey: ["service-catalogue", false],
    queryFn: () => serviceCatalogService.getCatalogue(false),
    staleTime: 5 * 60_000,
  });
  const rows: SubscriptionServiceView[] = services.data ?? [];
  const definitions = catalogue.data ?? [];
  const byCode = new Map(definitions.map((d) => [d.code, d]));
  const chosen = byCode.get(add.serviceCode);

  const refresh = () => qc.invalidateQueries({ queryKey: ["subscription-services", subscriptionNumber] });
  const close = () => {
    setPanel(null);
    setAdd({ serviceCode: "", quantity: "1", unitPrice: "" });
    setReason("");
  };

  const addMutation = useMutation({
    mutationFn: () =>
      serviceCatalogService.addSubscriptionService(subscriptionNumber, {
        serviceCode: add.serviceCode,
        quantity: Number(add.quantity),
        unitPrice: add.unitPrice.trim() === "" ? null : Number(add.unitPrice),
      }),
    onSuccess: () => {
      toast.success("Service ajouté à l'abonnement");
      close();
      refresh();
    },
    onError: (e) => toast.error(apiMessage(e, "Ajout impossible.")),
  });

  const suspendMutation = useMutation({
    mutationFn: (serviceNumber: string) => serviceCatalogService.suspendSubscribedService(serviceNumber, reason.trim() || undefined),
    onSuccess: () => {
      toast.success("Service suspendu");
      close();
      refresh();
    },
    onError: (e) => toast.error(apiMessage(e, "Suspension impossible.")),
  });

  const terminateMutation = useMutation({
    mutationFn: (serviceNumber: string) => serviceCatalogService.terminateSubscribedService(serviceNumber),
    onSuccess: refresh,
  });

  const askTerminate = (s: SubscriptionServiceView) =>
    toast.confirm({
      message: "Résilier ce service ?",
      detail: s.serviceName || s.serviceCode,
      confirmLabel: "Résilier le service",
      pendingLabel: "Résiliation en cours",
      successMessage: "Service résilié",
      errorMessage: "La résiliation a échoué",
      onConfirm: () => terminateMutation.mutateAsync(s.serviceNumber),
    });

  const qty = Number(add.quantity);
  const addValid = !!add.serviceCode && Number.isInteger(qty) && qty >= 1;

  return (
    <div className="space-y-4">
      {panel === "add" && (
        <PanelForm
          title="Ajouter un service"
          pending={addMutation.isPending}
          submitLabel="Ajouter"
          submitDisabled={!addValid}
          onCancel={close}
          onSubmit={(e) => {
            e.preventDefault();
            addMutation.mutate();
          }}
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Service" required className="md:col-span-2">
              <select className={FIELD_SOFT} value={add.serviceCode} onChange={(e) => setAdd({ ...add, serviceCode: e.target.value })} disabled={catalogue.isLoading}>
                <option value="">{catalogue.isLoading ? "Chargement du catalogue" : "Choisir un service"}</option>
                {definitions.map((d) => (
                  <option key={d.code} value={d.code}>
                    {d.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Quantité" required>
              <input type="number" min={1} className={FIELD_SOFT} value={add.quantity} onChange={(e) => setAdd({ ...add, quantity: e.target.value })} />
            </Field>
            <Field label="Prix unitaire" hint={chosen?.unitPrice != null ? `Catalogue : ${formatMoney(chosen.unitPrice, chosen.currency ?? "XAF")}` : "Vide : prix du catalogue."}>
              <input type="number" min={0} className={FIELD_SOFT} value={add.unitPrice} onChange={(e) => setAdd({ ...add, unitPrice: e.target.value })} />
            </Field>
          </div>
          {chosen && (chosen.requiresContract || chosen.requiresKycLevel > 0) && (
            <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
              {chosen.requiresContract && "Ce service reste en attente jusqu'à l'activation de son contrat. "}
              {chosen.requiresKycLevel > 0 && `Il exige un niveau de vérification d'identité ${chosen.requiresKycLevel}.`}
            </p>
          )}
        </PanelForm>
      )}

      <Section title="Services souscrits" icon={Layers} description="Ajoutés à cet abonnement en plus de son plan">
        {panel === null && (
          <div className="mb-4">
            <ActionButton icon={Plus} onClick={() => setPanel("add")}>
              Ajouter un service
            </ActionButton>
          </div>
        )}
        {services.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-20 w-full rounded-2xl" />
            <Skeleton className="h-20 w-full rounded-2xl" />
          </div>
        ) : services.isError ? (
          <ErrorBlock message="Impossible de charger les services de cet abonnement." onRetry={() => services.refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState icon={Layers} title="Aucun service souscrit" hint="Cet abonnement ne contient que son plan." />
        ) : (
          <div className="space-y-2">
            {rows.map((s) => {
              const st = statusOf(SUBSCRIBED_SERVICE_STATUS, s.status);
              const def = byCode.get(s.serviceCode);
              const suspending = typeof panel === "object" && panel !== null && panel.suspend === s.serviceNumber;
              const live = s.status === "ACTIVE" || s.status === "PENDING";
              return (
                <ItemRow key={s.serviceNumber}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="break-words text-sm font-semibold text-gray-900">{s.serviceName || s.serviceCode}</p>
                        <StatusChip tone={st.tone}>{st.label}</StatusChip>
                      </div>
                      <p className="mt-0.5 font-mono text-xs text-gray-400">{s.serviceNumber}</p>
                      <p className="mt-1.5 text-xs text-gray-500">
                        Quantité {s.quantity ?? 1}
                        {s.unitPrice != null && ` · ${formatMoney(s.unitPrice, def?.currency ?? "XAF")} l'unité`}
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {def && <Tag tone="pink">{SERVICE_CATEGORY_LABEL[def.serviceCategory] ?? def.serviceCategory}</Tag>}
                        {s.status === "PENDING" && <Tag>En attente d'un contrat ou d'une ressource</Tag>}
                      </div>
                      {s.status === "PENDING" && def?.serviceCategory === "DOMICILIATION" && (
                        <p className="mt-2 text-xs">
                          <Link
                            to={`/services/contracts/new?subscription=${encodeURIComponent(subscriptionNumber)}`}
                            className="font-semibold text-[color:var(--logo-pink-dark)] hover:underline"
                          >
                            Ouvrir le contrat de domiciliation
                          </Link>
                        </p>
                      )}
                    </div>
                    {live && (
                      <div className="flex items-center gap-1">
                        {s.status === "ACTIVE" && <IconButton icon={Pause} label="Suspendre le service" onClick={() => setPanel(suspending ? null : { suspend: s.serviceNumber })} />}
                        <IconButton
                          icon={Trash2}
                          label="Résilier le service"
                          tone="danger"
                          pending={terminateMutation.isPending && terminateMutation.variables === s.serviceNumber}
                          onClick={() => askTerminate(s)}
                        />
                      </div>
                    )}
                  </div>
                  {suspending && (
                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                      <Field label="Motif de la suspension">
                        <input className={FIELD_SOFT} value={reason} onChange={(e) => setReason(e.target.value)} />
                      </Field>
                      <div className="flex gap-2">
                        <ActionButton variant="ghost" onClick={close} disabled={suspendMutation.isPending}>
                          Annuler
                        </ActionButton>
                        <ActionButton icon={Ban} pending={suspendMutation.isPending} onClick={() => suspendMutation.mutate(s.serviceNumber)}>
                          Suspendre
                        </ActionButton>
                      </div>
                    </div>
                  )}
                </ItemRow>
              );
            })}
          </div>
        )}
      </Section>
    </div>
  );
};
