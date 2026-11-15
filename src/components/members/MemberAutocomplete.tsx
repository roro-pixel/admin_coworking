import React, { useState, useEffect, useRef } from "react";
import { Search, X, User } from "lucide-react";
import { memberService } from "../../services/member.service";
import type { MemberSummaryResponse } from "../../services/member.service";
import { brandVars } from "../layout/adminTheme";
import { Skeleton } from "../ui/Skeleton";

interface MemberAutocompleteProps {
  onSelect: (member: MemberSummaryResponse | null) => void;
  selectedMember?: MemberSummaryResponse | null;
  placeholder?: string;
  required?: boolean;
}

export const MemberAutocomplete: React.FC<MemberAutocompleteProps> = ({
  onSelect,
  selectedMember,
  placeholder = "Rechercher un membre...",
  required = false,
}) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MemberSummaryResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (selectedMember) {
      setQuery(selectedMember.fullName);
    } else {
      setQuery("");
    }
  }, [selectedMember]);

  useEffect(() => {
    const searchMembers = async () => {
      if (query.length < 2) {
        setResults([]);
        return;
      }

      setIsLoading(true);
      try {
        const data = await memberService.searchMembers(query);
        setResults(data);
        setShowResults(true);
      } catch (error) {
        console.error("Erreur recherche membres", error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    };

    const debounce = setTimeout(searchMembers, 300);
    return () => clearTimeout(debounce);
  }, [query]);

  const handleSelect = (member: MemberSummaryResponse) => {
    setQuery(member.fullName);
    setShowResults(false);
    onSelect(member);
  };

  const handleClear = () => {
    setQuery("");
    setResults([]);
    onSelect(null);
    setShowResults(false);
  };

  return (
    <div ref={wrapperRef} className="relative min-w-0" style={brandVars}>
      <div className="relative">
        <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length >= 2 && setShowResults(true)}
          placeholder={placeholder}
          className={`w-full rounded-2xl border bg-white py-2.5 shadow-sm pl-11 pr-10 text-sm text-gray-900 placeholder:text-gray-400 transition focus:bg-white focus:outline-none focus:ring-4 focus:ring-[color:color-mix(in_srgb,var(--logo-pink)_20%,white)] ${
            required && !selectedMember
              ? "border-red-200 focus:border-red-300"
              : "border-transparent focus:border-[color:var(--logo-pink)]"
          }`}
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Effacer"
            className="absolute right-3 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {isLoading && (
        <div className="absolute z-30 mt-2 w-full space-y-1 rounded-2xl border border-gray-100 bg-white p-2 shadow-xl shadow-gray-900/10">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3 px-2 py-2">
              <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-2/5" />
                <Skeleton className="h-2.5 w-3/5" />
              </div>
            </div>
          ))}
        </div>
      )}

      {showResults && results.length > 0 && (
        <div className="absolute z-30 mt-2 max-h-72 w-full space-y-0.5 overflow-y-auto rounded-2xl border border-gray-100 bg-white p-1.5 shadow-xl shadow-gray-900/10">
          {results.map((member) => (
            <button
              type="button"
              key={member.memberId}
              onClick={() => handleSelect(member)}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-[color:color-mix(in_srgb,var(--logo-pink)_10%,white)]"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[color:color-mix(in_srgb,var(--logo-pink)_16%,white)] text-[color:var(--logo-pink-dark)]">
                <User size={16} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-gray-900">{member.fullName}</span>
                <span className="block truncate text-xs text-gray-500">{member.email}</span>
              </span>
              <span className="hidden shrink-0 text-right min-[420px]:block">
                <span className="block truncate font-mono text-[11px] text-gray-400">{member.memberId}</span>
                <span
                  className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    member.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {member.status}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}

      {selectedMember && (
        <div className="mt-2 rounded-2xl bg-[color:color-mix(in_srgb,var(--logo-pink)_12%,white)] p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-medium text-[color:var(--logo-pink-dark)]">Membre sélectionné</p>
              <p className="mt-0.5 break-words text-sm font-semibold text-gray-900">{selectedMember.fullName}</p>
              <p className="truncate text-xs text-gray-500">
                {selectedMember.memberId} • {selectedMember.email}
              </p>
            </div>
            <button
              type="button"
              onClick={handleClear}
              aria-label="Retirer la sélection"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-gray-500 transition hover:bg-white/70 hover:text-gray-700"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};