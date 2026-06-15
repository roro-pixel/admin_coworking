import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Loader2, Search, User, Building2, Users } from "lucide-react";
import { ModalPortal } from "../../components/ui/ModalPortal";
import { kycService } from "../../services/document.service";
import { memberService } from "../../services/member.service";
import { customerService } from "../../services/customer.service";
import type { MemberSummaryResponse } from "../../services/member.service";
import type { CustomerSummaryResponse } from "../../services/customer.service";

interface CreateKycCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type OwnerType = "MEMBER" | "CUSTOMER" | "BUSINESS";

interface SearchResult {
  code: string;
  name: string;
  email?: string;
  phone?: string;
  type: OwnerType;
}

export const CreateKycCaseModal: React.FC<CreateKycCaseModalProps> = ({
  isOpen,
  onClose,
}) => {
  const queryClient = useQueryClient();
  const [ownerType, setOwnerType] = useState<OwnerType>("MEMBER");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedOwner, setSelectedOwner] = useState<SearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState("");

  // Debounce la recherche
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Réinitialiser le modal à l'ouverture
  useEffect(() => {
    if (isOpen) {
      setOwnerType("MEMBER");
      setSearchQuery("");
      setDebouncedQuery("");
      setSearchResults([]);
      setSelectedOwner(null);
      setError("");
      setIsSearching(false);
    }
  }, [isOpen]);

  // Recherche automatique quand le query change
  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const searchOwners = async () => {
      setIsSearching(true);
      setError("");

      try {
        let results: SearchResult[] = [];

        if (ownerType === "MEMBER") {
          const members = await memberService.searchMembers(debouncedQuery);
          results = (members || []).map((m: MemberSummaryResponse) => ({
            code: m.memberId,
            name: m.fullName,
            email: m.email,
            phone: m.phone,
            type: "MEMBER",
          }));
        } else if (ownerType === "CUSTOMER") {
          const customers =
            await customerService.searchCustomers(debouncedQuery);
          results = (customers || []).map((c: CustomerSummaryResponse) => ({
            code: c.customerId,
            name: c.displayName,
            email: c.email,
            phone: c.phone,
            type: "CUSTOMER",
          }));
        } else if (ownerType === "BUSINESS") {
          // Pour BUSINESS, utiliser l'endpoint de recherche business
          // Si l'endpoint n'existe pas encore, on peut faire une recherche par code
          // À adapter selon ton API business
          const response = await fetch(
            `/sni/api/v1/business/search/basic?query=${encodeURIComponent(debouncedQuery)}`,
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
              },
            },
          );
          if (response.ok) {
            const data = await response.json();
            results = (data || []).map((b: any) => ({
              code: b.code || b.businessCode,
              name: b.name || b.businessName,
              email: b.email,
              phone: b.phone,
              type: "BUSINESS",
            }));
          }
        }

        setSearchResults(results);
      } catch (err) {
        console.error("Erreur recherche:", err);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    searchOwners();
  }, [debouncedQuery, ownerType]);

  const createMutation = useMutation({
    mutationFn: () => {
      if (!selectedOwner) throw new Error("Aucun propriétaire sélectionné");
      return kycService.createKycCase(ownerType, selectedOwner.code);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kycCases"] });
      queryClient.invalidateQueries({ queryKey: ["kyc-dashboard"] });
      onClose();
      setSelectedOwner(null);
      setSearchQuery("");
      setSearchResults([]);
    },
    onError: (err: any) => {
      setError(
        err.response?.data?.message ||
          "Erreur lors de la création du dossier KYC",
      );
    },
  });

  const handleSelectOwner = (result: SearchResult) => {
    setSelectedOwner(result);
    setSearchQuery(result.name);
    setSearchResults([]);
    setError("");
  };

  const handleOwnerTypeChange = (type: OwnerType) => {
    setOwnerType(type);
    setSelectedOwner(null);
    setSearchQuery("");
    setSearchResults([]);
    setError("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOwner) {
      setError(
        "Veuillez sélectionner un propriétaire dans la liste de recherche",
      );
      return;
    }
    createMutation.mutate();
  };

  const getOwnerIcon = (type: OwnerType) => {
    switch (type) {
      case "MEMBER":
        return <User size={16} className="text-blue-500" />;
      case "CUSTOMER":
        return <Users size={16} className="text-green-500" />;
      case "BUSINESS":
        return <Building2 size={16} className="text-purple-500" />;
    }
  };

  const getOwnerTypeLabel = (type: OwnerType) => {
    switch (type) {
      case "MEMBER":
        return "Membre";
      case "CUSTOMER":
        return "Customer";
      case "BUSINESS":
        return "Business";
    }
  };

  if (!isOpen) return null;

  return (
    <ModalPortal onClose={onClose} size="lg">
      <div className="sticky top-0 bg-white border-b p-5 flex justify-between items-center rounded-t-2xl">
        <h3 className="text-2xl font-bold">Créer un dossier KYC</h3>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X size={24} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-8 space-y-6">
        {/* Type de propriétaire */}
        <div>
          <label className="block text-base font-semibold text-gray-800 mb-2">
            Type de propriétaire *
          </label>
          <div className="flex gap-4">
            {(["MEMBER", "CUSTOMER", "BUSINESS"] as OwnerType[]).map((type) => (
              <label
                key={type}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-all ${
                  ownerType === type
                    ? "border-primary-500 bg-primary-50 text-primary-700"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <input
                  type="radio"
                  name="ownerType"
                  value={type}
                  checked={ownerType === type}
                  onChange={() => handleOwnerTypeChange(type)}
                  className="sr-only"
                />
                {getOwnerIcon(type)}
                <span className="text-sm font-medium">
                  {getOwnerTypeLabel(type)}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Recherche automatique */}
        <div>
          <label className="block text-base font-semibold text-gray-800 mb-2">
            Rechercher un {getOwnerTypeLabel(ownerType)} *
          </label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2">
              <Search size={18} className="text-gray-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Rechercher par nom, email, téléphone ou code...`}
              className="w-full pl-10 pr-10 py-3 text-base border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              autoComplete="off"
            />
            {isSearching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Loader2 size={18} className="animate-spin text-gray-400" />
              </div>
            )}
          </div>

          {/* Résultats de recherche */}
          {searchResults.length > 0 && (
            <div className="mt-2 border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm max-h-60 overflow-y-auto">
              {searchResults.map((result) => (
                <button
                  key={result.code}
                  type="button"
                  onClick={() => handleSelectOwner(result)}
                  className="w-full px-4 py-3 text-left hover:bg-gray-100 border-b last:border-0 transition-colors flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium text-gray-900">{result.name}</p>
                    <div className="flex gap-3 mt-0.5">
                      <p className="text-xs text-gray-500 font-mono">
                        {result.code}
                      </p>
                      {result.email && (
                        <p className="text-xs text-gray-400">{result.email}</p>
                      )}
                      {result.phone && (
                        <p className="text-xs text-gray-400">{result.phone}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    {getOwnerIcon(result.type)}
                    <span>{getOwnerTypeLabel(result.type)}</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Message si aucun résultat */}
          {debouncedQuery &&
            debouncedQuery.length >= 2 &&
            !isSearching &&
            searchResults.length === 0 && (
              <p className="mt-2 text-sm text-amber-600">
                Aucun {getOwnerTypeLabel(ownerType).toLowerCase()} trouvé.
                Vérifiez le nom ou le code.
              </p>
            )}

          {/* Indication si la recherche est trop courte */}
          {debouncedQuery &&
            debouncedQuery.length < 2 &&
            debouncedQuery.length > 0 && (
              <p className="mt-2 text-xs text-gray-400">
                Tapez au moins 2 caractères pour lancer la recherche
              </p>
            )}
        </div>

        {/* Sélection affichée */}
        {selectedOwner && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-700 font-medium">
                  Propriétaire sélectionné
                </p>
                <p className="font-semibold text-gray-900">
                  {selectedOwner.name}
                </p>
                <p className="text-xs text-gray-500 font-mono mt-0.5">
                  {selectedOwner.code}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedOwner(null);
                  setSearchQuery("");
                }}
                className="text-xs text-red-500 hover:text-red-700"
              >
                Changer
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-base">
            {error}
          </div>
        )}

        <div className="flex gap-4 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-5 py-3 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-100 transition-colors text-base"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={!selectedOwner || createMutation.isPending}
            className="flex-1 bg-primary-600 text-white py-3 rounded-xl hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2 font-medium text-base transition-colors"
          >
            {createMutation.isPending ? (
              <Loader2 size={20} className="animate-spin" />
            ) : null}
            Créer le dossier KYC
          </button>
        </div>
      </form>
    </ModalPortal>
  );
};
