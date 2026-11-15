import React, { useEffect, useRef, useState } from "react";
import { Search, X, DoorOpen } from "lucide-react";
import { resourceService } from "../../services/resource.service";
import type { ResourceSummaryResponse } from "../../services/resource.service";
import { FIELD } from "../subscription/kitUtils";
import { StatusBadge } from "./resKit";

interface ResourceAutocompleteProps {
  onSelect: (resource: ResourceSummaryResponse | null) => void;
  selectedResource?: ResourceSummaryResponse | null;
  selectedCode?: string;
  placeholder?: string;
  required?: boolean;
}

/** Recherche d'une ressource par nom ou code, avec liste de suggestions */
export const ResourceAutocomplete: React.FC<ResourceAutocompleteProps> = ({
  onSelect,
  selectedResource,
  selectedCode,
  placeholder = "Rechercher une ressource",
  required = false,
}) => {
  const [query, setQuery] = useState(selectedResource?.name || selectedCode || "");
  const [results, setResults] = useState<ResourceSummaryResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) setShowResults(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (selectedResource) setQuery(selectedResource.name);
    else if (selectedCode) setQuery(selectedCode);
  }, [selectedResource, selectedCode]);

  useEffect(() => {
    const search = async () => {
      if (query.trim().length < 2 || query === selectedResource?.name || query === selectedCode) {
        setResults([]);
        return;
      }
      setIsLoading(true);
      try {
        const data = await resourceService.searchResources(query.trim());
        setResults(data);
        setShowResults(true);
      } catch {
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    };
    const debounce = setTimeout(search, 300);
    return () => clearTimeout(debounce);
  }, [query, selectedResource?.name, selectedCode]);

  const handleSelect = (resource: ResourceSummaryResponse) => {
    setQuery(resource.name);
    setShowResults(false);
    onSelect(resource);
  };

  const handleClear = () => {
    setQuery("");
    setResults([]);
    setShowResults(false);
    onSelect(null);
  };

  const missing = required && !selectedCode && !selectedResource;

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length >= 2 && results.length > 0 && setShowResults(true)}
          placeholder={placeholder}
          aria-invalid={missing && query.length > 0}
          className={`${FIELD} !pl-10 !pr-10`}
        />
        {query && (
          <button type="button" onClick={handleClear} aria-label="Effacer la ressource" className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700">
            <X size={15} />
          </button>
        )}
      </div>

      {isLoading && <div className="absolute z-30 mt-2 w-full rounded-2xl bg-white p-4 text-center text-sm text-gray-500 shadow-lg">Recherche en cours</div>}

      {showResults && !isLoading && results.length > 0 && (
        <div className="absolute z-30 mt-2 max-h-64 w-full overflow-y-auto rounded-2xl bg-white p-1.5 shadow-lg">
          {results.map((resource) => (
            <button key={resource.code} type="button" onClick={() => handleSelect(resource)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-gray-50">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500">
                <DoorOpen size={15} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-gray-900">{resource.name}</span>
                <span className="block truncate text-xs text-gray-500">
                  {resource.code} · {resource.typeCode || "Type non défini"}
                </span>
              </span>
              <StatusBadge status={String(resource.status)} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
