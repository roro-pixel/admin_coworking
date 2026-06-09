import React, { useEffect, useRef, useState } from "react";
import { Loader2, Search, User, X } from "lucide-react";
import { authService } from "../../services/auth.service";
import type { AdminUser } from "../../services/auth.service";

interface AgentAutocompleteProps {
  onSelect: (agent: AdminUser | null) => void;
  selectedAgent?: AdminUser | null;
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  allowManualId?: boolean;
}

const getAgentId = (agent: AdminUser): string =>
  String(agent.id ?? agent.userId ?? agent.email);
const getAgentLabel = (agent: AdminUser): string =>
  agent.email || agent.userId || String(agent.id);

export const AgentAutocomplete: React.FC<AgentAutocompleteProps> = ({
  onSelect,
  selectedAgent,
  value,
  onValueChange,
  placeholder = "Rechercher un agent...",
  required = false,
  allowManualId = true,
}) => {
  const [query, setQuery] = useState(value || "");
  const [results, setResults] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      )
        setShowResults(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (selectedAgent) setQuery(getAgentLabel(selectedAgent));
    else if (value !== undefined) setQuery(value);
  }, [selectedAgent, value]);

  useEffect(() => {
    const run = async () => {
      if (query.trim().length < 2) {
        setResults([]);
        return;
      }
      setIsLoading(true);
      try {
        const data = await authService.searchUsers(query.trim());
        setResults(Array.isArray(data) ? data : []);
        setShowResults(true);
      } catch (error) {
        console.error("Erreur recherche agents", error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    };
    const t = setTimeout(run, 300);
    return () => clearTimeout(t);
  }, [query]);

  const handleChange = (next: string) => {
    setQuery(next);
    if (allowManualId) onValueChange?.(next);
    if (!next) onSelect(null);
  };

  const handleSelect = (agent: AdminUser) => {
    const id = getAgentId(agent);
    setQuery(getAgentLabel(agent));
    setShowResults(false);
    onValueChange?.(id);
    onSelect(agent);
  };

  const clear = () => {
    setQuery("");
    setResults([]);
    setShowResults(false);
    onValueChange?.("");
    onSelect(null);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => query.length >= 2 && setShowResults(true)}
          placeholder={placeholder}
          className={`w-full pl-9 pr-9 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:outline-none ${required && !query ? "border-red-300" : ""}`}
        />
        {isLoading ? (
          <Loader2
            size={15}
            className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-gray-400"
          />
        ) : query ? (
          <button
            type="button"
            onClick={clear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X size={15} />
          </button>
        ) : null}
      </div>

      {showResults && results.length > 0 && (
        <div className="absolute z-30 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {results.map((agent) => (
            <button
              key={getAgentId(agent)}
              type="button"
              onClick={() => handleSelect(agent)}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 border-b border-gray-100 last:border-0"
            >
              <div className="w-8 h-8 rounded-full bg-primary-50 flex items-center justify-center">
                <User size={16} className="text-primary-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {agent.email}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {agent.userId} · {agent.roleNames?.join(", ") || "Aucun rôle"}
                </p>
              </div>
              <span className="text-xs text-gray-400">#{agent.id}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
