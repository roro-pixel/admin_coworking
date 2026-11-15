import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Search, X } from "lucide-react";
import { inventoryService } from "../../services/inventory.service";
import type { InventoryItem, InventoryLocation } from "../../services/inventory.service";
import { useAuth } from "../../contexts/AuthContext";
import { StatusChip } from "../subscription/kit";
import { FIELD, FOCUS } from "../subscription/kitUtils";
import type { Tone } from "../subscription/kitUtils";

/** Petit libellé gris au-dessus d'une valeur, visible seulement sur mobile et tablette */
export const Cell: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({ title, children, className = "" }) => (
  <div className={`min-w-0 ${className}`}>
    <span className="mr-2 text-xs font-semibold text-gray-400 lg:hidden">{title}</span>
    {children}
  </div>
);

/** Bloc de lecture libellé / valeur sur panneau gris */
export const Fact: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="min-w-0 rounded-2xl bg-white p-4 shadow-sm">
    <p className="text-xs font-semibold text-gray-400">{title}</p>
    <div className="mt-1 break-words text-sm font-semibold text-gray-900">{children}</div>
  </div>
);

export function useDebounced<T>(value: T, delay = 350): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

/** Pagination côté client pour une liste que le serveur ne pagine pas */
export function usePaged<T>(items: T[], size = 15) {
  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(items.length / size));
  const safe = Math.min(page, totalPages - 1);
  const slice = useMemo(() => items.slice(safe * size, safe * size + size), [items, safe, size]);
  return { page: safe, setPage, slice, totalPages, total: items.length };
}

/** Identité de l'opérateur envoyée au backend (performedBy, requestedBy, approvedBy...) */
export const useActor = (): string => {
  const { admin } = useAuth();
  return admin?.email || "admin";
};

export const qty = (n?: number | null): string => (n === undefined || n === null ? "0" : Number(n).toLocaleString("fr-FR"));
export const signed = (n: number): string => (n > 0 ? `+${qty(n)}` : qty(n));

// Libellés

export const label = (map: Record<string, string>, key?: string | null) => (key ? map[key] ?? key : "");

export const ITEM_TYPE_LABEL: Record<string, string> = { CONSUMABLE: "Consommable", ASSET: "Actif", SERVICE: "Service", SPARE_PART: "Pièce détachée" };
export const ITEM_TYPES = ["CONSUMABLE", "ASSET", "SERVICE", "SPARE_PART"] as const;
export const TRACKING_LABEL: Record<string, string> = { NONE: "Sans suivi", LOT: "Par lot", SERIAL: "Par numéro de série" };
export const TRACKINGS = ["NONE", "LOT", "SERIAL"] as const;

export const MOVEMENT_LABEL: Record<string, string> = { IN: "Entrée", OUT: "Sortie", TRANSFER: "Transfert", ADJUSTMENT_IN: "Ajustement +", ADJUSTMENT_OUT: "Ajustement -" };
export const MOVEMENT_TONE: Record<string, Tone> = { IN: "success", OUT: "warn", TRANSFER: "info", ADJUSTMENT_IN: "success", ADJUSTMENT_OUT: "danger" };
export const MOVEMENTS = ["IN", "OUT", "TRANSFER", "ADJUSTMENT_IN", "ADJUSTMENT_OUT"] as const;

export const REASON_LABEL: Record<string, string> = {
  CONSUMPTION: "Consommation",
  DAMAGE: "Article endommagé",
  LOSS: "Perte, introuvable",
  INTERNAL_USE: "Usage interne",
  SAMPLE: "Échantillon",
  DONATION: "Don",
  OTHER: "Autre",
};

export const LOCATION_TYPE_LABEL: Record<string, string> = { WAREHOUSE: "Entrepôt", OFFICE: "Bureau", ROOM: "Salle", ZONE: "Zone", VIRTUAL: "Virtuel" };
export const LOCATION_TYPES = ["WAREHOUSE", "OFFICE", "ROOM", "ZONE", "VIRTUAL"] as const;

export const UNIT_TYPE_LABEL: Record<string, string> = { COUNT: "Comptage", WEIGHT: "Poids", VOLUME: "Volume", LENGTH: "Longueur" };
export const UNIT_TYPES = ["COUNT", "WEIGHT", "VOLUME", "LENGTH"] as const;

export const SUPPLIER_STATUS_LABEL: Record<string, string> = { ACTIVE: "Actif", INACTIVE: "Inactif", BLACKLISTED: "Exclu" };
export const SUPPLIER_STATUS_TONE: Record<string, Tone> = { ACTIVE: "success", INACTIVE: "neutral", BLACKLISTED: "danger" };

export const PR_STATUS_LABEL: Record<string, string> = { DRAFT: "Brouillon", SUBMITTED: "Soumise", APPROVED: "Approuvée", REJECTED: "Rejetée", CONVERTED: "Convertie" };
export const PR_STATUS_TONE: Record<string, Tone> = { DRAFT: "neutral", SUBMITTED: "info", APPROVED: "success", REJECTED: "danger", CONVERTED: "pink" };

export const PO_STATUS_LABEL: Record<string, string> = {
  DRAFT: "Brouillon",
  PENDING_APPROVAL: "En attente d'approbation",
  APPROVED: "Approuvé",
  ORDERED: "Commandé",
  PARTIALLY_RECEIVED: "Reçu partiellement",
  RECEIVED: "Reçu",
  CANCELLED: "Annulé",
};
export const PO_STATUS_TONE: Record<string, Tone> = { DRAFT: "neutral", PENDING_APPROVAL: "warn", APPROVED: "info", ORDERED: "pink", PARTIALLY_RECEIVED: "warn", RECEIVED: "success", CANCELLED: "danger" };

export const APPROVAL_LEVEL_LABEL: Record<string, string> = { NONE: "Aucune", MANAGER: "Responsable", DIRECTOR: "Direction", FINANCE: "Finance" };

export const ASSET_STATUS_LABEL: Record<string, string> = {
  AVAILABLE: "Disponible",
  RESERVED: "Réservé",
  ASSIGNED: "Attribué",
  IN_USE: "En utilisation",
  IN_MAINTENANCE: "En maintenance",
  LOST: "Perdu",
  RETIRED: "Réformé",
  DAMAGED: "Endommagé",
};
export const ASSET_STATUS_TONE: Record<string, Tone> = { AVAILABLE: "success", RESERVED: "info", ASSIGNED: "pink", IN_USE: "pink", IN_MAINTENANCE: "warn", LOST: "danger", RETIRED: "neutral", DAMAGED: "danger" };
export const ASSET_STATUSES = ["AVAILABLE", "RESERVED", "ASSIGNED", "IN_USE", "IN_MAINTENANCE", "LOST", "RETIRED", "DAMAGED"] as const;
export const CONDITION_LABEL: Record<string, string> = { NEW: "Neuf", GOOD: "Bon", FAIR: "Correct", POOR: "Usé", DAMAGED: "Endommagé" };
export const CONDITIONS = ["NEW", "GOOD", "FAIR", "POOR", "DAMAGED"] as const;

export const COUNT_STATUS_LABEL: Record<string, string> = { DRAFT: "Brouillon", IN_PROGRESS: "En cours", UNDER_REVIEW: "En revue", VALIDATED: "Validé", CANCELLED: "Annulé" };
export const COUNT_STATUS_TONE: Record<string, Tone> = { DRAFT: "neutral", IN_PROGRESS: "info", UNDER_REVIEW: "warn", VALIDATED: "success", CANCELLED: "danger" };

export const ALERT_STATUS_LABEL: Record<string, string> = { OPEN: "Ouverte", ACKNOWLEDGED: "Prise en compte", RESOLVED: "Résolue", DISMISSED: "Ignorée" };
export const ALERT_STATUS_TONE: Record<string, Tone> = { OPEN: "danger", ACKNOWLEDGED: "warn", RESOLVED: "success", DISMISSED: "neutral" };
export const ALERT_TYPE_LABEL: Record<string, string> = {
  LOW_STOCK: "Stock bas",
  RECURRING_LOW_STOCK: "Stock bas récurrent",
  OUT_OF_STOCK: "Rupture",
  NEGATIVE_STOCK: "Stock négatif",
  OVERSTOCK: "Surstock",
  SLOW_MOVING: "Stock dormant",
  EXPIRY_SOON: "Expiration proche",
  EXPIRY_IMMINENT: "Expiration imminente",
  WARRANTY_SOON: "Garantie bientôt échue",
  MAINTENANCE_DUE: "Maintenance à prévoir",
  ASSET_RETURN_DUE_SOON: "Retour attendu",
  ASSET_RETURN_OVERDUE: "Retour en retard",
  SUSPICIOUS_ADJUSTMENT: "Ajustement suspect",
};

export const SEVERITY_LABEL: Record<string, string> = { LOW: "Faible", MEDIUM: "Moyenne", HIGH: "Élevée", CRITICAL: "Critique" };
export const SEVERITY_TONE: Record<string, Tone> = { LOW: "neutral", MEDIUM: "warn", HIGH: "danger", CRITICAL: "danger" };

export const Chip: React.FC<{ map: Record<string, string>; tones: Record<string, Tone>; value?: string | null }> = ({ map, tones, value }) =>
  value ? <StatusChip tone={tones[value] ?? "neutral"}>{map[value] ?? value}</StatusChip> : null;

/** État d'un niveau de stock : rupture, bas (sous le minimum connu ou sous 10) ou normal */
export const levelState = (available: number): { label: string; tone: Tone } =>
  available <= 0 ? { label: "Rupture", tone: "danger" } : available < 10 ? { label: "Stock bas", tone: "warn" } : { label: "Normal", tone: "success" };

export const daysUntil = (iso?: string | null): number | null => {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
};

export const catCode = (c: { code?: string; categoryCode?: string }) => c.code ?? c.categoryCode ?? "";
export const unitCode = (u: { code?: string; unitCode?: string }) => u.code ?? u.unitCode ?? "";
export const supCode = (s: { code?: string; supplierCode?: string }) => s.code ?? s.supplierCode ?? "";

/** Toutes les listes "pour choisir" de l'inventaire passent par ces requêtes courtes */
export const useActiveLocations = () =>
  useQuery({ queryKey: ["inventory-locations-active"], queryFn: () => inventoryService.getLocations(true) });

export const LocationSelect: React.FC<{
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  exclude?: string;
  className?: string;
}> = ({ value, onChange, placeholder = "Choisir un emplacement", exclude, className = FIELD }) => {
  const { data: locations = [] } = useActiveLocations();
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={className}>
      <option value="">{placeholder}</option>
      {locations
        .filter((l: InventoryLocation) => l.locationCode !== exclude)
        .map((l: InventoryLocation) => (
          <option key={l.locationCode} value={l.locationCode}>
            {l.name}
          </option>
        ))}
    </select>
  );
};

/** Recherche d'un article avec résultats déroulants. Une fois choisi, l'article reste affiché avec un bouton pour le changer. */
export const ItemPicker: React.FC<{
  value: InventoryItem | null;
  onChange: (item: InventoryItem | null) => void;
  placeholder?: string;
  /** Limite la recherche à un type d'article (ex. ASSET pour la création d'un actif) */
  itemType?: string;
}> = ({ value, onChange, placeholder = "Rechercher un article par nom ou code", itemType }) => {
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const q = useDebounced(text.trim(), 250);
  const { data, isFetching } = useQuery({
    queryKey: [itemType ? "inventory-items-assets" : "inventory-items-search", q],
    queryFn: () => inventoryService.getItems({ query: q || undefined, itemType, size: 20 }),
    enabled: q.length > 1,
  });
  const items = data?.content ?? [];

  if (value) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-gray-900">{value.name}</p>
          <p className="truncate font-mono text-xs text-gray-400">
            {value.itemCode} · {label(TRACKING_LABEL, value.trackingType)}
          </p>
        </div>
        <button type="button" aria-label="Changer d'article" onClick={() => { onChange(null); setText(""); }} className="rounded-full p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700">
          <X size={16} />
        </button>
      </div>
    );
  }
  return (
    <div className="relative">
      <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
      <input
        value={text}
        onChange={(e) => { setText(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className={`${FIELD} pl-10`}
      />
      {open && q.length > 1 && (
        <div className="absolute z-20 mt-2 max-h-64 w-full overflow-y-auto rounded-2xl bg-white p-2 shadow-lg ring-1 ring-black/5">
          {isFetching && items.length === 0 ? (
            <p className="px-3 py-2 text-sm text-gray-400">Recherche en cours</p>
          ) : items.length === 0 ? (
            <p className="px-3 py-2 text-sm text-gray-400">Aucun article trouvé</p>
          ) : (
            items.map((it) => (
              <button
                key={it.itemCode}
                type="button"
                onClick={() => { onChange(it); setOpen(false); }}
                className="block w-full rounded-xl px-3 py-2 text-left transition hover:bg-gray-50"
              >
                <p className="text-sm font-semibold text-gray-900">{it.name}</p>
                <p className="font-mono text-xs text-gray-400">{it.itemCode}</p>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};

/** Pastille de nombre dans une ligne (quantité en gras, libellé gris dessous) */
export const Qty: React.FC<{ value: number; sub?: string; tone?: "default" | "danger" | "muted" }> = ({ value, sub, tone = "default" }) => (
  <div className="text-sm">
    <span className={`font-semibold ${tone === "danger" ? "text-red-600" : tone === "muted" ? "text-gray-500" : "text-gray-900"}`}>{qty(value)}</span>
    {sub && <span className="ml-1 text-xs text-gray-400">{sub}</span>}
  </div>
);

// ───────────────────────── Listes paginées ─────────────────────────

interface PageResult<T> { content: T[]; totalElements: number; totalPages: number }

/**
 * Liste paginée par le serveur (page et size). Quand l'écran propose une recherche texte que le
 * backend ne sait pas faire, la recherche charge jusqu'à `searchSize` lignes, filtre côté client
 * et pagine localement : on n'affiche jamais une page vide à cause d'un filtre appliqué sur une seule page.
 */
export function useServerPaged<T>(opts: {
  key: unknown[];
  size?: number;
  search?: string;
  match?: (item: T, q: string) => boolean;
  searchSize?: number;
  /** Change quand un filtre change : ramène à la première page */
  resetKey?: string;
  fetch: (p: { page?: number; size: number }) => Promise<PageResult<T>>;
}) {
  const { key, size = 15, search = "", match, searchSize = 200, resetKey = "", fetch } = opts;
  const q = useDebounced(search.trim().toLowerCase());
  const clientSide = !!match && q.length > 0;
  const [page, setPage] = useState(0);
  useEffect(() => setPage(0), [q, resetKey]);
  const query = useQuery({
    queryKey: [...key, ...(clientSide ? ["all", q.length > 0] : [page])],
    queryFn: () => (clientSide ? fetch({ size: searchSize }) : fetch({ page, size })),
  });
  const all = query.data?.content ?? [];
  const filtered = clientSide ? all.filter((x) => match!(x, q)) : all;
  const clientPages = Math.max(1, Math.ceil(filtered.length / size));
  const safe = clientSide ? Math.min(page, clientPages - 1) : page;
  const rows = clientSide ? filtered.slice(safe * size, safe * size + size) : all;
  return {
    rows,
    page: safe,
    setPage,
    totalPages: clientSide ? clientPages : query.data?.totalPages ?? 1,
    total: clientSide ? filtered.length : query.data?.totalElements ?? 0,
    q,
    isLoading: query.isLoading,
    isError: query.isError,
    isFetching: query.isFetching,
    refetch: query.refetch,
  };
}

/** Bouton de retour pour une vue détail ouverte à la place d'une liste (sans changer d'adresse) */
export const BackLink: React.FC<{ onClick: () => void; children: React.ReactNode }> = ({ onClick, children }) => (
  <button type="button" onClick={onClick} className={`mb-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-100 ${FOCUS}`}>
    <ArrowLeft size={16} />
    {children}
  </button>
);
