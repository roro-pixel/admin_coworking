import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, X } from "lucide-react";
import { resourceService } from "../../services/resource.service";
import type { ResourceSummaryResponse } from "../../services/resource.service";
import { FIELD } from "../subscription/kitUtils";
import { Tag } from "../subscription/kit";
import { useDebounced } from "./resKit";

export const MAX_RESOURCES = 20;

interface ResourceMultiPickerProps {
  selected: ResourceSummaryResponse[];
  onChange: (resources: ResourceSummaryResponse[]) => void;
}

/**
 * Sélection multiple de ressources pour les endpoints /bulk. Plafonnée à 20
 * (bokati.resource.bulk-max-resources côté serveur) : au-delà, l'appel /bulk
 * renverrait 400 sans rien écrire.
 */
export const ResourceMultiPicker: React.FC<ResourceMultiPickerProps> = ({ selected, onChange }) => {
  const [query, setQuery] = useState("");
  const [showResults, setShowResults] = useState(false);
  const q = useDebounced(query.trim(), 250);

  const { data: results = [] } = useQuery({
    queryKey: ["resource-multi-picker-search", q],
    queryFn: () => resourceService.searchResources(q),
    enabled: q.length > 1,
  });

  const selectedCodes = new Set(selected.map((r) => r.code));
  const atLimit = selected.length >= MAX_RESOURCES;

  const add = (resource: ResourceSummaryResponse) => {
    if (selectedCodes.has(resource.code) || atLimit) return;
    onChange([...selected, resource]);
    setQuery("");
    setShowResults(false);
  };
  const remove = (code: string) => onChange(selected.filter((r) => r.code !== code));

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowResults(true);
          }}
          disabled={atLimit}
          placeholder={atLimit ? `Maximum de ${MAX_RESOURCES} ressources atteint` : "Rechercher une ressource à ajouter"}
          className={`${FIELD} !pl-10 disabled:opacity-60`}
        />
        {showResults && q.length > 1 && results.length > 0 && (
          <div className="absolute z-30 mt-2 max-h-60 w-full overflow-y-auto rounded-2xl bg-white p-1.5 shadow-lg">
            {results.map((r) => (
              <button key={r.code} type="button" onClick={() => add(r)} disabled={selectedCodes.has(r.code)} className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40">
                <span className="min-w-0">
                  <span className="font-semibold text-gray-900">{r.name}</span> <span className="font-mono text-xs text-gray-400">{r.code}</span>
                </span>
                {selectedCodes.has(r.code) && <span className="shrink-0 text-xs text-gray-400">Déjà ajoutée</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {selected.length === 0 ? (
          <p className="text-sm text-gray-500">Aucune ressource choisie.</p>
        ) : (
          selected.map((r) => (
            <span key={r.code} className="inline-flex items-center gap-1.5 rounded-full bg-white py-1 pl-3 pr-1.5 text-sm font-semibold text-gray-800 shadow-sm">
              {r.name}
              <button type="button" onClick={() => remove(r.code)} aria-label={`Retirer ${r.name}`} className="flex h-6 w-6 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700">
                <X size={13} />
              </button>
            </span>
          ))
        )}
        <Tag tone="gray">
          {selected.length}/{MAX_RESOURCES}
        </Tag>
      </div>
    </div>
  );
};
