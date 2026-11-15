import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, PenLine, Plus, ShoppingBag } from "lucide-react";
import { marketplaceService } from "../../services/marketplace.service";
import type { CreateOfferRequest, OfferKind, OfferView } from "../../services/marketplace.service";
import { ActionButton, CheckField, DataCard, EmptyState, ErrorBlock, Field, IconButton, PanelForm, StatusChip, Tag } from "../subscription/kit";
import { FIELD, apiMessage, formatMoney } from "../subscription/kitUtils";
import { ListSkeleton } from "../ui/Skeleton";
import { toast } from "../ui/toastStore";
import { KIND_LABEL, MARKETPLACE_KEY } from "./marketplaceLabels";

const num = (v: string): number | undefined => {
  const t = v.trim().replace(",", ".");
  if (t === "") return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
};

type Panel = { kind: "create" } | { kind: "edit"; offer: OfferView } | null;

const CreateForm: React.FC<{ onDone: () => void }> = ({ onDone }) => {
  const queryClient = useQueryClient();
  const [kind, setKind] = useState<OfferKind>("PRODUCT");
  const [item, setItem] = useState("");
  const [location, setLocation] = useState("");
  const [service, setService] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [maxPerOrder, setMaxPerOrder] = useState("");
  const [order, setOrder] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => {
      const data: CreateOfferRequest = {
        kind,
        ...(kind === "PRODUCT" ? { inventoryItemCode: item.trim(), locationCode: location.trim() } : { serviceItemCode: service.trim() }),
        title: title.trim() || undefined,
        description: description.trim() || undefined,
        imageUrl: imageUrl.trim() || undefined,
        category: category.trim() || undefined,
        price: num(price),
        maxPerOrder: num(maxPerOrder),
        displayOrder: num(order),
      };
      return marketplaceService.createOffer(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [MARKETPLACE_KEY] });
      toast.success("Offre créée, non publiée");
      onDone();
    },
    onError: (e) => setError(apiMessage(e, "Création impossible.")),
  });
  const missing = kind === "PRODUCT" ? item.trim() === "" || location.trim() === "" : service.trim() === "";

  return (
    <PanelForm
      title="Nouvelle offre"
      pending={mutation.isPending}
      submitLabel="Créer"
      submitDisabled={missing}
      error={error}
      onCancel={onDone}
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        mutation.mutate();
      }}
    >
      <p className="-mt-2 text-sm text-gray-500">Ce que l'offre vend, et d'où, ne change plus après la création.</p>
      <Field label="Type" required>
        <select value={kind} onChange={(e) => setKind(e.target.value as OfferKind)} className={FIELD}>
          <option value="PRODUCT">Article de stock</option>
          <option value="SERVICE">Prestation</option>
        </select>
      </Field>
      {kind === "PRODUCT" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Code de l'article" required>
            <input value={item} onChange={(e) => setItem(e.target.value)} className={FIELD} />
          </Field>
          <Field label="Code de l'emplacement" required>
            <input value={location} onChange={(e) => setLocation(e.target.value)} className={FIELD} />
          </Field>
        </div>
      ) : (
        <Field label="Code de la prestation" required>
          <input value={service} onChange={(e) => setService(e.target.value)} className={FIELD} />
        </Field>
      )}
      <Field label="Titre" hint="Repris de l'article ou de la prestation si vide">
        <input value={title} onChange={(e) => setTitle(e.target.value)} className={FIELD} />
      </Field>
      <Field label="Description">
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={`${FIELD} resize-none bg-gray-50 shadow-none`} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Image (adresse)">
          <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className={FIELD} />
        </Field>
        <Field label="Catégorie">
          <input value={category} onChange={(e) => setCategory(e.target.value)} className={FIELD} />
        </Field>
        <Field label="Prix (FCFA)" hint="Vide : le prix de l'article">
          <input inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} className={FIELD} />
        </Field>
        <Field label="Maximum par commande" hint="Vide : sans plafond">
          <input inputMode="numeric" value={maxPerOrder} onChange={(e) => setMaxPerOrder(e.target.value)} className={FIELD} />
        </Field>
        <Field label="Ordre d'affichage">
          <input inputMode="numeric" value={order} onChange={(e) => setOrder(e.target.value)} className={FIELD} />
        </Field>
      </div>
    </PanelForm>
  );
};

const EditForm: React.FC<{ offer: OfferView; onDone: () => void }> = ({ offer, onDone }) => {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(offer.title);
  const [description, setDescription] = useState(offer.description ?? "");
  const [imageUrl, setImageUrl] = useState(offer.imageUrl ?? "");
  const [category, setCategory] = useState(offer.category ?? "");
  const [price, setPrice] = useState(offer.ownPrice != null ? String(offer.ownPrice) : "");
  const [resetPrice, setResetPrice] = useState(false);
  const [maxPerOrder, setMaxPerOrder] = useState(offer.maxPerOrder != null ? String(offer.maxPerOrder) : "");
  const [clearMax, setClearMax] = useState(false);
  const [order, setOrder] = useState(offer.displayOrder != null ? String(offer.displayOrder) : "");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      marketplaceService.updateOffer(offer.id, {
        title: title.trim(),
        description: description.trim(),
        imageUrl: imageUrl.trim(),
        category: category.trim(),
        ...(resetPrice ? { resetPrice: true } : { price: num(price) }),
        ...(clearMax ? { clearMaxPerOrder: true } : { maxPerOrder: num(maxPerOrder) }),
        displayOrder: num(order),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [MARKETPLACE_KEY] });
      toast.success("Offre modifiée");
      onDone();
    },
    onError: (e) => setError(apiMessage(e, "Modification impossible.")),
  });

  return (
    <PanelForm
      title={`Modifier ${offer.title}`}
      pending={mutation.isPending}
      submitLabel="Enregistrer"
      submitDisabled={title.trim() === ""}
      error={error}
      onCancel={onDone}
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        mutation.mutate();
      }}
    >
      <Field label="Titre" required>
        <input value={title} onChange={(e) => setTitle(e.target.value)} className={FIELD} />
      </Field>
      <Field label="Description">
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={`${FIELD} resize-none bg-gray-50 shadow-none`} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Image (adresse)">
          <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className={FIELD} />
        </Field>
        <Field label="Catégorie">
          <input value={category} onChange={(e) => setCategory(e.target.value)} className={FIELD} />
        </Field>
        <Field label="Prix propre (FCFA)">
          <input inputMode="decimal" value={price} disabled={resetPrice} onChange={(e) => setPrice(e.target.value)} className={FIELD} />
        </Field>
        <Field label="Maximum par commande">
          <input inputMode="numeric" value={maxPerOrder} disabled={clearMax} onChange={(e) => setMaxPerOrder(e.target.value)} className={FIELD} />
        </Field>
        <Field label="Ordre d'affichage">
          <input inputMode="numeric" value={order} onChange={(e) => setOrder(e.target.value)} className={FIELD} />
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <CheckField checked={resetPrice} onChange={setResetPrice} label="Reprendre le prix de l'article" />
        <CheckField checked={clearMax} onChange={setClearMax} label="Retirer le plafond par commande" />
      </div>
    </PanelForm>
  );
};

/** Onglet Offres : catalogue de la boutique, publication et modification. */
export const OffersTab: React.FC = () => {
  const queryClient = useQueryClient();
  const [panel, setPanel] = useState<Panel>(null);
  const [published, setPublished] = useState<"" | "true" | "false">("");
  const close = () => setPanel(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: [MARKETPLACE_KEY, "offers", published],
    queryFn: () => marketplaceService.getOffers(published === "" ? undefined : { published: published === "true" }),
  });

  const toggle = useMutation({
    mutationFn: (o: OfferView) => (o.published ? marketplaceService.unpublishOffer(o.id) : marketplaceService.publishOffer(o.id)),
    onSuccess: (o) => {
      queryClient.invalidateQueries({ queryKey: [MARKETPLACE_KEY] });
      toast.success(o.published ? "Offre publiée" : "Offre retirée de la boutique");
    },
    onError: (e) => toast.error(apiMessage(e, "Changement impossible.")),
  });

  const rows = data ?? [];
  const FILTERS: { value: "" | "true" | "false"; label: string }[] = [
    { value: "", label: "Toutes" },
    { value: "true", label: "Publiées" },
    { value: "false", label: "Non publiées" },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setPublished(f.value)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${published === f.value ? "bg-[color:var(--logo-pink-dark)] text-white" : "bg-white text-gray-600 shadow-sm hover:bg-gray-50"}`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <ActionButton icon={Plus} disabled={panel !== null} onClick={() => setPanel({ kind: "create" })}>
          Nouvelle offre
        </ActionButton>
      </div>

      {panel?.kind === "create" && <CreateForm onDone={close} />}
      {panel?.kind === "edit" && <EditForm offer={panel.offer} onDone={close} />}

      {isLoading ? (
        <ListSkeleton rows={5} />
      ) : isError ? (
        <ErrorBlock message="Impossible de charger les offres." onRetry={() => refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState icon={ShoppingBag} title="Aucune offre" hint="Crée une offre pour un article de stock ou une prestation." />
      ) : (
        <DataCard>
          <div className="space-y-2">
            {rows.map((o) => (
              <div key={o.id} className="flex flex-col gap-3 rounded-2xl bg-gray-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-bold text-gray-950">{o.title}</p>
                    <StatusChip tone={o.published ? "success" : "neutral"}>{o.published ? "Publiée" : "Non publiée"}</StatusChip>
                    <Tag>{KIND_LABEL[o.kind] ?? o.kind}</Tag>
                    {o.category && <Tag>{o.category}</Tag>}
                  </div>
                  <p className="mt-1 truncate text-xs text-gray-500">
                    {formatMoney(o.price, "FCFA")}
                    {o.ownPrice == null ? " · prix de l'article" : ""}
                    {o.kind === "PRODUCT" && o.available != null ? ` · ${o.available} en stock` : ""}
                    {o.maxPerOrder != null ? ` · ${o.maxPerOrder} max par commande` : ""}
                    <span className="font-mono"> · {o.inventoryItemCode ?? o.serviceItemCode}</span>
                  </p>
                </div>
                <div className="flex shrink-0 items-center justify-end gap-1">
                  <IconButton
                    icon={o.published ? EyeOff : Eye}
                    label={o.published ? "Retirer de la boutique" : "Publier"}
                    tone="neutral"
                    pending={toggle.isPending && toggle.variables?.id === o.id}
                    disabled={panel !== null}
                    onClick={() => toggle.mutate(o)}
                  />
                  <IconButton icon={PenLine} label="Modifier l'offre" tone="pink" disabled={panel !== null} onClick={() => setPanel({ kind: "edit", offer: o })} />
                </div>
              </div>
            ))}
          </div>
        </DataCard>
      )}
    </div>
  );
};
