import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText, Plus } from "lucide-react";
import { ActionButton, DataCard, EmptyState, ErrorBlock, ListHeader, Pagination, SearchField, StatusChip, Tabs, Tag } from "../../subscription/kit";
import type { TabItem } from "../../subscription/kit";
import { ListSkeleton } from "../../ui/Skeleton";
import { TEMPLATE_CATEGORIES } from "../contractLabels";
import { fetchTemplates } from "../templateQueries";
import { TemplateEditor } from "./TemplateEditor";

const CATEGORY_TABS: TabItem<string>[] = [
  { id: "", label: "Toutes" },
  ...Object.entries(TEMPLATE_CATEGORIES).map(([id, label]) => ({ id, label })),
];

type View = { kind: "list" } | { kind: "edit"; code?: string };

export const TemplatesTab: React.FC = () => {
  const [view, setView] = useState<View>({ kind: "list" });
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(0);

  const q = useQuery({
    queryKey: ["contract-templates-admin", search, category, page],
    queryFn: () => fetchTemplates(search, category, page),
    enabled: view.kind === "list",
  });

  if (view.kind === "edit") {
    return (
      <TemplateEditor
        code={view.code}
        onBack={() => setView({ kind: "list" })}
        onOpen={(code) => setView({ kind: "edit", code })}
      />
    );
  }

  const templates = q.data?.content ?? [];
  return (
    <div className="space-y-5">
      <ListHeader
        title="Bibliothèque de templates"
        subtitle="Modèles de contrat, variables et duplication"
        action={
          <ActionButton icon={Plus} onClick={() => setView({ kind: "edit" })}>
            Nouveau template
          </ActionButton>
        }
      />
      <Tabs
        variant="soft"
        items={CATEGORY_TABS}
        active={category}
        onChange={(c) => {
          setCategory(c);
          setPage(0);
        }}
      />
      <SearchField
        value={search}
        onChange={(v) => {
          setSearch(v);
          setPage(0);
        }}
        placeholder="Rechercher un template..."
      />

      {q.isLoading ? (
        <ListSkeleton rows={5} />
      ) : q.isError ? (
        <ErrorBlock message="Impossible de charger les templates." onRetry={() => q.refetch()} />
      ) : templates.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Aucun template"
          hint={search || category ? "Aucun template ne correspond à ces critères." : "Créez votre premier modèle de contrat."}
          action={!search && !category ? <ActionButton icon={Plus} onClick={() => setView({ kind: "edit" })}>Nouveau template</ActionButton> : undefined}
        />
      ) : (
        <DataCard>
          <div className="space-y-1.5">
            {templates.map((t) => (
              <button
                key={t.code}
                type="button"
                onClick={() => setView({ kind: "edit", code: t.code })}
                className="flex w-full flex-col gap-2 rounded-2xl bg-gray-50 px-4 py-3 text-left transition hover:bg-[color:color-mix(in_srgb,var(--logo-pink)_8%,white)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--logo-pink)] sm:flex-row sm:items-center sm:justify-between sm:gap-4"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-gray-900">{t.name}</p>
                  <p className="font-mono text-xs text-gray-400">{t.code}</p>
                  <p className="mt-1 line-clamp-1 text-xs text-gray-500">{t.description || "Sans description"}</p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  {t.category && <Tag>{TEMPLATE_CATEGORIES[t.category] ?? t.category}</Tag>}
                  {(t.variableDefinitions?.length ?? 0) > 0 && <Tag tone="pink">{t.variableDefinitions!.length} variable{t.variableDefinitions!.length > 1 ? "s" : ""}</Tag>}
                  <StatusChip tone={t.active === false ? "neutral" : "success"}>{t.active === false ? "Inactif" : "Actif"}</StatusChip>
                </div>
              </button>
            ))}
          </div>
        </DataCard>
      )}

      <Pagination page={page} totalPages={q.data?.totalPages ?? 0} total={q.data?.totalElements ?? 0} noun="template" onChange={setPage} />
    </div>
  );
};
