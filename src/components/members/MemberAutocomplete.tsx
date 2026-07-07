import React, { useState, useEffect, useRef } from "react";
import { Search, X, User } from "lucide-react";
import { memberService } from "../../services/member.service";
import type { MemberSummaryResponse } from "../../services/member.service";

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
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
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
    <div ref={wrapperRef} className="relative min-w-0">
      <div className="relative">
        <Search
          size={18}
          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length >= 2 && setShowResults(true)}
          placeholder={placeholder}
          className={`w-full rounded-2xl py-2.5 pl-10 pr-10 text-sm ring-1 ring-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 ${
            required && !selectedMember ? "border-red-300" : ""
          }`}
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {isLoading && (
        <div className="absolute z-30 mt-2 w-full rounded-2xl bg-white p-4 shadow-xl ring-1 ring-gray-100">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-5 w-5 -2 border-primary-600"></div>
          </div>
        </div>
      )}

      {showResults && results.length > 0 && (
        <div className="absolute z-30 mt-2 max-h-72 w-full overflow-y-auto rounded-2xl bg-white p-2 shadow-xl ring-1 ring-gray-100">
          {results.map((member) => (
            <button
              key={member.memberId}
              onClick={() => handleSelect(member)}
              className="flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-left transition-colors hover:bg-gray-50/70"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-100">
                <User size={16} className="text-primary-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-gray-900">{member.fullName}</p>
                <p className="truncate text-xs text-gray-500">{member.email}</p>
              </div>
              <div className="hidden shrink-0 text-right min-[420px]:block">
                <p className="truncate text-xs text-gray-500">{member.memberId}</p>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    member.status === "ACTIVE"
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {member.status}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {selectedMember && (
        <div className="mt-2 rounded-2xl bg-primary-50 p-3 ring-1 ring-primary-100">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-gray-900">
                Membre sélectionné
              </p>
              <p className="break-words text-sm font-semibold text-gray-700">{selectedMember.fullName}</p>
              <p className="truncate text-xs text-gray-500">
                {selectedMember.memberId} • {selectedMember.email}
              </p>
            </div>
            <button
              type="button"
              onClick={handleClear}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
