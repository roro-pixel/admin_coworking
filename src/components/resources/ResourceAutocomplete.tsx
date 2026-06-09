import React, { useEffect, useRef, useState } from "react";
import { Search, X, Box } from "lucide-react";
import { resourceService } from "../../services/resource.service";
import type { ResourceSummaryResponse } from "../../services/resource.service";

interface ResourceAutocompleteProps {
  onSelect: (resource: ResourceSummaryResponse | null) => void;
  selectedResource?: ResourceSummaryResponse | null;
  selectedCode?: string;
  placeholder?: string;
  required?: boolean;
}

export const ResourceAutocomplete: React.FC<ResourceAutocompleteProps> = ({
  onSelect,
  selectedResource,
  selectedCode,
  placeholder = "Rechercher une ressource...",
  required = false,
}) => {
  const [query, setQuery] = useState(
    selectedResource?.name || selectedCode || "",
  );
  const [results, setResults] = useState<ResourceSummaryResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      )
        setShowResults(false);
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
      if (
        query.trim().length < 2 ||
        query === selectedResource?.name ||
        query === selectedCode
      ) {
        setResults([]);
        return;
      }
      setIsLoading(true);
      try {
        const data = await resourceService.searchResources(query.trim());
        setResults(data);
        setShowResults(true);
      } catch (error) {
        console.error("Erreur recherche ressources", error);
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

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <Search
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length >= 2 && setShowResults(true)}
          placeholder={placeholder}
          className={`w-full pl-10 pr-10 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 ${required && !selectedCode && !selectedResource ? "border-red-300" : ""}`}
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {isLoading && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg p-4 text-center text-sm text-gray-500">
          Recherche...
        </div>
      )}

      {showResults && results.length > 0 && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {results.map((resource) => (
            <button
              key={resource.code}
              type="button"
              onClick={() => handleSelect(resource)}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 border-b last:border-0"
            >
              <div className="w-8 h-8 bg-primary-50 rounded-full flex items-center justify-center">
                <Box size={16} className="text-primary-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">{resource.name}</p>
                <p className="text-xs text-gray-500">
                  {resource.code} · {resource.typeCode || "Type non défini"}
                </p>
              </div>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${resource.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}
              >
                {resource.status}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
