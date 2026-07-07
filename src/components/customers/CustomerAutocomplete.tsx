import React, { useState, useEffect, useRef } from "react";
import { Search, X, Building2, User } from "lucide-react";
import { customerService } from "../../services/customer.service";
import type { CustomerSummaryResponse } from "../../services/customer.service";

interface CustomerAutocompleteProps {
  onSelect: (customer: CustomerSummaryResponse | null) => void;
  selectedCustomer?: CustomerSummaryResponse | null;
  typeFilter?: "PERSON" | "COMPANY";
  placeholder?: string;
  required?: boolean;
}

export const CustomerAutocomplete: React.FC<CustomerAutocompleteProps> = ({
  onSelect,
  selectedCustomer,
  typeFilter,
  placeholder = "Rechercher un customer...",
  required = false,
}) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CustomerSummaryResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  // const [isOpen, setIsOpen] = useState(false);
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
    const searchCustomers = async () => {
      if (query.length < 2) {
        setResults([]);
        return;
      }

      setIsLoading(true);
      try {
        const data = await customerService.searchCustomers(query);
        setResults(data);
        setShowResults(true);
      } catch (error) {
        console.error("Erreur recherche customers", error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    };

    const debounce = setTimeout(searchCustomers, 300);
    return () => clearTimeout(debounce);
  }, [query, typeFilter]);

  const handleSelect = (customer: CustomerSummaryResponse) => {
    setQuery(customer.displayName);
    setShowResults(false);
    onSelect(customer);
  };

  const handleClear = () => {
    setQuery("");
    setResults([]);
    onSelect(null);
    setShowResults(false);
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div className="relative w-full">
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
            required && !selectedCustomer ? "border-red-300" : ""
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
            <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-primary-600"></div>
          </div>
        </div>
      )}

      {showResults && results.length > 0 && (
        <div className="absolute z-30 mt-2 max-h-72 w-full overflow-y-auto rounded-2xl bg-white shadow-xl ring-1 ring-gray-100">
          {results.map((customer) => (
            <button
              key={customer.customerId}
              onClick={() => handleSelect(customer)}
              className="flex w-full items-start gap-3 px-3 py-3 text-left transition-colors hover:bg-gray-50/70 sm:px-4"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-100">
                {typeFilter === "COMPANY" ? (
                  <Building2 size={16} className="text-gray-500" />
                ) : (
                  <User size={16} className="text-gray-500" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-gray-900">
                  {customer.displayName}
                </p>
                <p className="truncate text-xs text-gray-500">{customer.email}</p>
              </div>
              <div className="hidden shrink-0 text-right sm:block">
                <p className="truncate text-xs text-gray-500">{customer.customerId}</p>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    customer.status === "ACTIVE"
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {customer.status}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {selectedCustomer && (
        <div className="mt-2 rounded-xl bg-primary-50 p-3 ring-1 ring-primary-100">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-gray-900">
                Customer sélectionné
              </p>
              <p className="truncate text-sm font-semibold text-gray-700">
                {selectedCustomer.displayName}
              </p>
              <p className="truncate text-xs text-gray-500">
                {selectedCustomer.customerId} • {selectedCustomer.email}
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
