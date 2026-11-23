import React from "react";
import { FileText } from "lucide-react";
import { EmptyState, Section } from "../subscription/kit";

const cell = (v: unknown): string => (v == null ? "" : typeof v === "number" ? v.toLocaleString("fr-FR") : typeof v === "object" ? JSON.stringify(v) : String(v));

/** Affiche un résultat de forme libre : tableau d'objets en table, objet en clé / valeur. */
export const GenericResult: React.FC<{ data: unknown; title?: string }> = ({ data, title }) => {
  const rows: unknown[] | null = Array.isArray(data) ? data : data && typeof data === "object" ? ((Object.values(data).find((x) => Array.isArray(x)) as unknown[] | undefined) ?? null) : null;
  if (rows && rows.length > 0 && typeof rows[0] === "object") {
    const cols = Array.from(new Set(rows.slice(0, 50).flatMap((r) => Object.keys(r as object))));
    return (
      <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
        {title && <p className="px-3 pt-3 text-sm font-semibold text-gray-900">{title}</p>}
        <table className="min-w-full text-xs">
          <thead><tr>{cols.map((c) => <th key={c} className="whitespace-nowrap px-3 py-2 text-left font-semibold text-gray-500">{c}</th>)}</tr></thead>
          <tbody>{rows.map((r, i) => <tr key={i} className="border-t border-gray-100">{cols.map((c) => <td key={c} className="whitespace-nowrap px-3 py-1.5 text-gray-700">{cell((r as Record<string, unknown>)[c])}</td>)}</tr>)}</tbody>
        </table>
      </div>
    );
  }
  if (data && typeof data === "object" && Object.keys(data).length > 0) {
    return <Section title={title ?? "Résultat"}>{Object.entries(data).map(([k, v]) => <p key={k} className="flex justify-between gap-3 text-sm"><span className="text-gray-500">{k}</span><span className="break-all font-mono text-xs">{cell(v)}</span></p>)}</Section>;
  }
  return <EmptyState icon={FileText} title="Aucune donnée" />;
};
