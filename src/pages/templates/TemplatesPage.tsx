import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { FileText, Mail, Search } from "lucide-react";
import { documentTemplateService } from "../../services/documentTemplate.service";
import type { TemplateFamily, TemplateSummary } from "../../services/documentTemplate.service";
import { EmptyState, ErrorBlock, ListHeader, StatusChip, Tabs, Tag } from "../../components/subscription/kit";
import type { TabItem } from "../../components/subscription/kit";
import { FIELD, ROW_HOVER, apiMessage, formatDate } from "../../components/subscription/kitUtils";
import { ListSkeleton } from "../../components/ui/Skeleton";
import { TemplateShell } from "../../components/templates/TemplateShell";
import { DOMAIN_LABEL } from "../../components/templates/templateLabels";

export const TEMPLATES_KEY = "document-templates";

const Row: React.FC<{ t: TemplateSummary; onOpen: () => void }> = ({ t, onOpen }) => (
  <button
    type="button"
    onClick={onOpen}
    className={`flex w-full flex-wrap items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 text-left shadow-sm transition ${ROW_HOVER}`}
  >
    <div className="min-w-0">
      <p className="truncate font-semibold text-gray-900">{t.label}</p>
      <p className="truncate font-mono text-xs text-gray-400">{t.code}</p>
    </div>
    <div className="flex flex-wrap items-center gap-2">
      {t.hasDraft && <Tag tone="pink">Brouillon</Tag>}
      {t.publishedVersion ? (
        <StatusChip tone="success">Version {t.publishedVersion}{t.publishedAt ? ` · ${formatDate(t.publishedAt)}` : ""}</StatusChip>
      ) : (
        <StatusChip tone="neutral">Gabarit d'origine</StatusChip>
      )}
    </div>
  </button>
);

export const TemplatesPage: React.FC = () => {
  const navigate = useNavigate();
  const [family, setFamily] = useState<TemplateFamily>("PDF");
  const [q, setQ] = useState("");
  const query = useQuery({ queryKey: [TEMPLATES_KEY], queryFn: documentTemplateService.list });

  const counts = useMemo(() => {
    const c = { PDF: 0, EMAIL: 0 };
    (query.data ?? []).forEach((t) => (c[t.family] += 1));
    return c;
  }, [query.data]);

  const tabs: TabItem<TemplateFamily>[] = [
    { id: "PDF", label: "Pièces PDF", icon: FileText, count: counts.PDF },
    { id: "EMAIL", label: "Courriels", icon: Mail, count: counts.EMAIL },
  ];

  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const map = new Map<string, TemplateSummary[]>();
    (query.data ?? [])
      .filter((t) => t.family === family)
      .filter((t) => !needle || t.label.toLowerCase().includes(needle) || t.code.toLowerCase().includes(needle))
      .forEach((t) => map.set(t.domain, [...(map.get(t.domain) ?? []), t]));
    return [...map.entries()].sort((a, b) => (DOMAIN_LABEL[a[0]] ?? a[0]).localeCompare(DOMAIN_LABEL[b[0]] ?? b[0], "fr"));
  }, [query.data, family, q]);

  return (
    <TemplateShell>
      <div className="space-y-5">
        <ListHeader
          title="Modèles de documents et de courriels"
          subtitle="Adaptez vos pièces imprimées et vos courriels. Tant qu'un modèle n'est pas publié, le gabarit d'origine sert."
        />
        <Tabs variant="soft" items={tabs} active={family} onChange={setFamily} />
        <div className="relative max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className={`${FIELD} pl-10`} placeholder="Rechercher un modèle" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>

        {query.isLoading ? (
          <ListSkeleton rows={6} />
        ) : query.isError ? (
          <ErrorBlock message={apiMessage(query.error, "Modèles indisponibles.")} onRetry={() => query.refetch()} />
        ) : groups.length === 0 ? (
          <EmptyState icon={family === "PDF" ? FileText : Mail} title="Aucun modèle" hint={q ? "Aucun résultat pour cette recherche." : undefined} />
        ) : (
          groups.map(([domain, items]) => (
            <section key={domain} className="space-y-2">
              <h3 className="px-1 text-xs font-bold uppercase tracking-wide text-gray-400">{DOMAIN_LABEL[domain] ?? domain}</h3>
              {items.map((t) => (
                <Row key={t.code} t={t} onOpen={() => navigate(`/templates/${encodeURIComponent(t.code)}`)} />
              ))}
            </section>
          ))
        )}
      </div>
    </TemplateShell>
  );
};
