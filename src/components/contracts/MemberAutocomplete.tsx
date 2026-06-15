import React, { useState, useEffect, useRef } from "react";
import { Search, X, User } from "lucide-react";
import { memberService } from "../../services/member.service";
import type { MemberSummaryResponse } from "../../services/member.service";

interface MemberAutocompleteProps {
  onSelect: (member: MemberSummaryResponse | null) => void;
  selectedMember?: MemberSummaryResponse | null;
  placeholder?: string;
}

export const MemberAutocomplete: React.FC<MemberAutocompleteProps> = ({
  onSelect,
  selectedMember,
  placeholder = "Rechercher un membre...",
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
        console.error(error);
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
    onSelect(null);
    setShowResults(false);
  };

  useEffect(() => {
    if (selectedMember) {
      setQuery(selectedMember.fullName);
    } else {
      setQuery("");
    }
  }, [selectedMember]);

  return (
    <div ref={wrapperRef} className="relative">
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
          className="w-full pl-10 pr-10 py-2 ring-1 ring-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
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

      {/* Indicateur de chargement */}
      {isLoading && (
        <div className="absolute z-20 mt-1 w-full bg-white ring-1 ring-gray-100 rounded-xl shadow-lg p-4">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600"></div>
          </div>
        </div>
      )}

      {!isLoading && showResults && results.length > 0 && (
        <div className="absolute z-20 mt-1 w-full bg-white ring-1 ring-gray-100 rounded-xl shadow-lg max-h-60 overflow-y-auto">
          {results.map((member) => (
            <button
              key={member.memberId}
              onClick={() => handleSelect(member)}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center space-x-3 border-b border-gray-100 last:border-0"
            >
              <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                <User size={16} className="text-primary-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">{member.fullName}</p>
                <p className="text-xs text-gray-500">{member.email}</p>
              </div>
              <p className="text-xs text-gray-500">{member.memberId}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
