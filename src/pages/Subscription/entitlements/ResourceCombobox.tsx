import React, { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, Search, X } from "lucide-react";
import { Dots } from "../../../components/ui/Toaster";
import { FIELD } from "../../../components/subscription/kitUtils";
import type { ResourceOption } from "./entitlementForm";

type Props = {
  value: string;
  onChange: (code: string) => void;
  searchFn: (query: string) => Promise<ResourceOption[]>;
  queryKeyPrefix: string;
  placeholder: string;
  disabled?: boolean;
};

/** Recherche d'un type ou d'un groupe de ressources, avec saisie directe du code. */
export const ResourceCombobox: React.FC<Props> = ({
  value,
  onChange,
  searchFn,
  queryKeyPrefix,
  placeholder,
  disabled = false,
}) => {
  const [inputText, setInputText] = useState(value);
  const [debouncedQuery, setDebouncedQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInputText(value);
    setDebouncedQuery(value);
  }, [value]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(inputText.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [inputText]);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const { data: suggestions = [], isFetching } = useQuery({
    queryKey: [queryKeyPrefix, debouncedQuery],
    queryFn: () => searchFn(debouncedQuery),
    enabled: open && !disabled,
    staleTime: 30_000,
  });

  const handleSelect = (item: ResourceOption) => {
    onChange(item.code);
    setInputText(item.code);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={inputText}
          onChange={(e) => {
            setInputText(e.target.value);
            setOpen(true);
          }}
          onFocus={() => !disabled && setOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          className={`${FIELD} pl-10 pr-20`}
        />
        <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
          {value && !disabled && (
            <button
              type="button"
              onClick={() => {
                onChange("");
                setInputText("");
                setDebouncedQuery("");
                setOpen(false);
              }}
              className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              aria-label="Effacer"
            >
              <X size={14} />
            </button>
          )}
          <button
            type="button"
            onClick={() => !disabled && setOpen((o) => !o)}
            disabled={disabled}
            className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Afficher les résultats"
          >
            <ChevronDown size={16} className={open ? "rotate-180 transition-transform" : "transition-transform"} />
          </button>
        </div>
      </div>

      {open && !disabled && (
        <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-gray-100">
          <div className="max-h-60 overflow-y-auto p-1.5">
            {isFetching && suggestions.length === 0 && (
              <div className="px-3 py-3 text-sm text-gray-400">
                <Dots />
              </div>
            )}
            {!isFetching && suggestions.length === 0 && (
              <div className="px-3 py-3 text-sm text-gray-400">
                {inputText ? "Aucun résultat" : "Tapez pour rechercher"}
              </div>
            )}
            {suggestions.map((item) => (
              <button
                key={item.code}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(item);
                }}
                className={`block w-full rounded-xl px-3 py-2.5 text-left text-sm transition hover:bg-gray-50 ${
                  item.code === value ? "bg-gray-50 font-semibold text-gray-900" : "text-gray-700"
                }`}
              >
                <span className="font-medium">{item.name}</span>
                <span className="ml-2 font-mono text-xs text-gray-400">{item.code}</span>
              </button>
            ))}
            {inputText && !suggestions.some((item) => item.code === inputText) && (
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(inputText.trim());
                  setOpen(false);
                }}
                className="block w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-[color:var(--logo-pink-dark)] hover:bg-gray-50"
              >
                Utiliser “{inputText}” directement
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
