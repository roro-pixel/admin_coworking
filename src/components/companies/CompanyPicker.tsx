import React, { useEffect, useRef, useState } from "react";
import { Building, Search, X } from "lucide-react";
import { companyService } from "../../services/company.service";
import type { CompanyResponse } from "../../services/company.service";
import { Dots } from "../ui/Toaster";
import { FIELD, FOCUS } from "../subscription/kitUtils";
import { useDebounced } from "./companyKit";

interface Props {
  selected: CompanyResponse | null;
  onSelect: (company: CompanyResponse | null) => void;
  placeholder?: string;
}

/** Recherche d'une organisation par nom, code ou identifiant. */
export const CompanyPicker: React.FC<Props> = ({ selected, onSelect, placeholder = "Rechercher une organisation..." }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CompanyResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);
  const q = useDebounced(query.trim(), 300);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (wrapper.current && !wrapper.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    if (q.length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    companyService
      .getCompanies({ q, page: 0, size: 8 })
      .then((r) => {
        if (!cancelled) setResults(r.content);
      })
      .catch(() => {
        if (!cancelled) setResults([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [q]);

  if (selected) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm">
        <div className="flex min-w-0 items-center gap-3">
          <Building size={18} className="shrink-0 text-[color:var(--logo-pink-dark)]" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-gray-900">{selected.name}</p>
            <p className="truncate font-mono text-xs text-gray-400">{selected.customerId}</p>
          </div>
        </div>
        <button type="button" onClick={() => onSelect(null)} aria-label="Changer d'organisation" className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 ${FOCUS}`}>
          <X size={16} />
        </button>
      </div>
    );
  }

  return (
    <div ref={wrapper} className="relative">
      <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
      <input
        value={query}
        placeholder={placeholder}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        className={`${FIELD} pl-10`}
      />
      {loading && (
        <span className="absolute right-4 top-1/2 -translate-y-1/2">
          <Dots />
        </span>
      )}
      {open && q.length >= 2 && !loading && (
        <div className="absolute z-20 mt-2 max-h-64 w-full overflow-auto rounded-2xl bg-white p-1.5 shadow-lg ring-1 ring-gray-100">
          {results.length === 0 ? (
            <p className="px-3 py-3 text-sm text-gray-500">Aucune organisation trouvée.</p>
          ) : (
            results.map((c) => (
              <button
                key={c.customerId}
                type="button"
                onClick={() => {
                  onSelect(c);
                  setOpen(false);
                  setQuery("");
                }}
                className={`flex w-full flex-col rounded-xl px-3 py-2 text-left hover:bg-gray-50 ${FOCUS}`}
              >
                <span className="truncate text-sm font-semibold text-gray-900">{c.name}</span>
                <span className="truncate font-mono text-xs text-gray-400">{c.customerId}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};
