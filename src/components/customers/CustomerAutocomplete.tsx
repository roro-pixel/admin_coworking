import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Building2, User } from 'lucide-react';
import { customerService } from '../../services/customer.service';
import type { CustomerSummaryResponse } from '../../services/customer.service';

interface CustomerAutocompleteProps {
  onSelect: (customer: CustomerSummaryResponse | null) => void;
  selectedCustomer?: CustomerSummaryResponse | null;
  typeFilter?: 'PERSON' | 'COMPANY';
  placeholder?: string;
  required?: boolean;
}

export const CustomerAutocomplete: React.FC<CustomerAutocompleteProps> = ({
  onSelect,
  selectedCustomer,
  typeFilter,
  placeholder = 'Rechercher un customer...',
  required = false,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CustomerSummaryResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  // const [isOpen, setIsOpen] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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
        console.error('Erreur recherche customers', error);
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
    setQuery('');
    setResults([]);
    onSelect(null);
    setShowResults(false);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length >= 2 && setShowResults(true)}
          placeholder={placeholder}
          className={`w-full pl-10 pr-10 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 ${
            required && !selectedCustomer ? 'border-red-300' : ''
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
        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg p-4">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600"></div>
          </div>
        </div>
      )}

      {showResults && results.length > 0 && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {results.map((customer) => (
            <button
              key={customer.customerId}
              onClick={() => handleSelect(customer)}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center space-x-3 border-b border-gray-100 last:border-0"
            >
              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                {typeFilter === 'COMPANY' ? (
                  <Building2 size={16} className="text-gray-500" />
                ) : (
                  <User size={16} className="text-gray-500" />
                )}
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">{customer.displayName}</p>
                <p className="text-xs text-gray-500">{customer.email}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">{customer.customerId}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  customer.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                }`}>
                  {customer.status}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {selectedCustomer && (
        <div className="mt-2 p-3 bg-primary-50 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">Customer sélectionné</p>
              <p className="text-sm text-gray-700">{selectedCustomer.displayName}</p>
              <p className="text-xs text-gray-500">{selectedCustomer.customerId} • {selectedCustomer.email}</p>
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