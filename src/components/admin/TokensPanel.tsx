import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Copy, Eye, EyeOff, KeyRound } from "lucide-react";
import { adminMaintenanceService } from "../../services/adminMaintenance.service";
import type { OneTimeTokenView } from "../../services/adminMaintenance.service";
import { TableSkeleton } from "../ui/Skeleton";
import { toast } from "../ui/toastStore";
import {
  DataCard,
  EmptyState,
  ErrorBlock,
  HeadRow,
  IconButton,
  ListHeader,
  Pagination,
  SearchField,
  StatusChip,
  Tabs,
} from "../subscription/kit";
import type { TabItem } from "../subscription/kit";
import { ROW_HOVER, formatDateTime } from "../subscription/kitUtils";
import type { Tone } from "../subscription/kitUtils";
import { MIN_SEARCH } from "./adminUtils";

type UsedFilter = "all" | "unused" | "used";

const FILTERS: TabItem<UsedFilter>[] = [
  { id: "all", label: "Tous" },
  { id: "unused", label: "Non utilisés" },
  { id: "used", label: "Utilisés" },
];

const STATUS: Record<string, { label: string; tone: Tone }> = {
  VALID: { label: "Valide", tone: "success" },
  USED: { label: "Utilisé", tone: "neutral" },
  EXPIRED: { label: "Expiré", tone: "warn" },
};

const PAGE_SIZE = 20;
const COLS = "lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.8fr)]";

/** Un jeton dont l'état est connu : on s'appuie sur used/expired si le statut est inattendu. */
const statusOf = (t: OneTimeTokenView) =>
  STATUS[t.status] ?? (t.used ? STATUS.USED : t.expired ? STATUS.EXPIRED : STATUS.VALID);

export const TokensPanel: React.FC = () => {
  const [search, setSearch] = useState("");
  const [email, setEmail] = useState("");
  const [filter, setFilter] = useState<UsedFilter>("all");
  const [page, setPage] = useState(0);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());

  // La recherche part au serveur après une courte pause de frappe.
  useEffect(() => {
    const id = window.setTimeout(() => {
      setEmail(search.trim().length >= MIN_SEARCH ? search.trim() : "");
      setPage(0);
    }, 350);
    return () => window.clearTimeout(id);
  }, [search]);

  const used = filter === "all" ? undefined : filter === "used";

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-one-time-tokens", email, used, page],
    queryFn: () =>
      adminMaintenanceService.getOneTimeTokens({
        email: email || undefined,
        used,
        page,
        size: PAGE_SIZE,
      }),
  });

  const tokens = data?.content ?? [];
  const total = data?.totalElements ?? tokens.length;

  const toggle = (token: string) =>
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(token)) next.delete(token);
      else next.add(token);
      return next;
    });

  const copy = async (token: string) => {
    try {
      await navigator.clipboard.writeText(token);
      toast.success("Code copié");
    } catch {
      toast.error("Copie impossible, sélectionnez le code à la main");
    }
  };

  const code = (t: OneTimeTokenView) => (
    <div className="flex items-center gap-1">
      <code className="rounded-xl bg-white px-3 py-1.5 font-mono text-sm font-bold tracking-wider text-gray-900 shadow-sm">
        {revealed.has(t.token) ? t.token : "••••••"}
      </code>
      <IconButton
        icon={revealed.has(t.token) ? EyeOff : Eye}
        label={revealed.has(t.token) ? "Masquer le code" : "Afficher le code"}
        onClick={() => toggle(t.token)}
      />
      <IconButton icon={Copy} label="Copier le code" onClick={() => copy(t.token)} />
    </div>
  );

  return (
    <div className="space-y-4">
      <ListHeader
        title="Jetons à usage unique"
        subtitle={
          data && total > 0
            ? `${total.toLocaleString("fr-FR")} jeton${total > 1 ? "s" : ""} envoyé${total > 1 ? "s" : ""} par e-mail`
            : "Codes envoyés par e-mail : qui l'a reçu, a-t-il servi"
        }
      />

      <div>
        <SearchField value={search} onChange={setSearch} placeholder="Rechercher par e-mail..." />
        {search.trim().length === 1 && <p className="mt-1.5 px-2 text-xs text-gray-400">Minimum 2 caractères</p>}
      </div>

      <Tabs
        variant="soft"
        items={FILTERS}
        active={filter}
        onChange={(f) => {
          setFilter(f);
          setPage(0);
        }}
      />

      {isLoading ? (
        <TableSkeleton rows={6} cols={5} />
      ) : isError ? (
        <ErrorBlock message="Impossible de charger les jetons." onRetry={() => refetch()} />
      ) : tokens.length === 0 ? (
        <EmptyState icon={KeyRound} title="Aucun jeton trouvé" />
      ) : (
        <DataCard>
          <HeadRow cols={COLS}>
            <span>Destinataire</span>
            <span>Code</span>
            <span>Envoyé le</span>
            <span>Expire le</span>
            <span>Statut</span>
          </HeadRow>
          <div className="space-y-2">
            {tokens.map((t) => {
              const status = statusOf(t);
              const name = [t.firstname, t.lastname].filter(Boolean).join(" ");
              const who = (
                <div className="min-w-0">
                  {name && <p className="truncate text-sm font-semibold text-gray-900">{name}</p>}
                  <p className={`truncate font-mono text-xs ${name ? "text-gray-500" : "text-gray-800"}`}>{t.email}</p>
                </div>
              );
              return (
                <div key={t.token} className={`rounded-2xl bg-gray-50 p-3 ${ROW_HOVER}`}>
                  <div className={`hidden items-center gap-4 px-1 lg:grid ${COLS}`}>
                    {who}
                    {code(t)}
                    <span className="text-xs text-gray-600">{formatDateTime(t.createdAt)}</span>
                    <span className="text-xs text-gray-600">{formatDateTime(t.expiredAt)}</span>
                    <div>
                      <StatusChip tone={status.tone}>{status.label}</StatusChip>
                    </div>
                  </div>

                  <div className="lg:hidden">
                    <div className="flex items-start justify-between gap-3">
                      {who}
                      <StatusChip tone={status.tone}>{status.label}</StatusChip>
                    </div>
                    <div className="mt-3">{code(t)}</div>
                    <p className="mt-3 text-xs text-gray-500">
                      Envoyé le {formatDateTime(t.createdAt)} · expire le {formatDateTime(t.expiredAt)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </DataCard>
      )}

      <Pagination
        page={page}
        totalPages={data?.totalPages ?? 1}
        total={total}
        noun="jeton"
        onChange={setPage}
      />
    </div>
  );
};
