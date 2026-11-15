import React, { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Search, Wallet as WalletIcon } from "lucide-react";
import { walletService } from "../../services/wallet.service";
import type { Wallet } from "../../services/wallet.service";
import { ActionButton, EmptyState, ErrorBanner, Field, Section } from "../../components/subscription/kit";
import { FIELD_SOFT, apiMessage } from "../../components/subscription/kitUtils";
import { Skeleton } from "../../components/ui/Skeleton";
import { toast } from "../../components/ui/toastStore";
import { OwnerPicker } from "../../components/wallet/OwnerPicker";
import { WalletSummary } from "../../components/wallet/WalletSummary";
import { OWNER_TYPE_LABEL } from "../../components/wallet/walletLabels";
import type { OwnerType } from "../../components/wallet/walletLabels";
import type { CustomerSummaryResponse } from "../../services/customer.service";
import type { MemberSummaryResponse } from "../../services/member.service";

export const WalletLookupPanel: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [ownerType, setOwnerType] = useState<OwnerType>("CUSTOMER");
  const [ownerCode, setOwnerCode] = useState("");
  const [debouncedCode, setDebouncedCode] = useState("");
  const [currency, setCurrency] = useState("XAF");
  const [manualMode, setManualMode] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSummaryResponse | null>(null);
  const [selectedMember, setSelectedMember] = useState<MemberSummaryResponse | null>(null);
  const [result, setResult] = useState<Wallet | null>(null);
  const [error, setError] = useState<string | null>(null);

  // En saisie manuelle, le code se tape lettre par lettre : on attend la fin de la frappe avant d'interroger l'API.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedCode(ownerCode), 400);
    return () => clearTimeout(t);
  }, [ownerCode]);

  const { data: existingWallets, isFetching: isSearching } = useQuery({
    queryKey: ["wallet-owner-search", ownerType, debouncedCode, currency],
    queryFn: () => walletService.getWallets({ ownerType, ownerCode: debouncedCode, currency, size: 5 }),
    enabled: !!debouncedCode,
  });

  const getOrCreateMutation = useMutation({
    mutationFn: () => walletService.getOrCreateWallet(ownerType, ownerCode, currency),
    onSuccess: (wallet) => {
      setResult(wallet);
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["wallets"] });
      toast.success(`Portefeuille ${wallet.walletNumber} disponible pour ${OWNER_TYPE_LABEL[ownerType]} ${ownerCode}.`);
    },
    onError: (e: unknown) => setError(apiMessage(e, "Impossible de récupérer ou créer le portefeuille.")),
  });

  const resetOwner = (nextType: OwnerType) => {
    setOwnerType(nextType);
    setOwnerCode("");
    setDebouncedCode("");
    setSelectedCustomer(null);
    setSelectedMember(null);
    setResult(null);
    setError(null);
  };

  const pick = (code: string) => {
    setOwnerCode(code);
    setDebouncedCode(code);
    setResult(null);
  };

  const existing = existingWallets?.content ?? [];

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5">
      <Section title="Recherche et création automatisée" description="Choisissez un propriétaire : le backend retrouve son portefeuille ou le crée." icon={Search}>
        <div className="space-y-4 rounded-2xl bg-white p-5 shadow-sm">
          <ErrorBanner message={error} />
          <OwnerPicker
            ownerType={ownerType}
            onTypeChange={resetOwner}
            ownerCode={ownerCode}
            onCodeChange={pick}
            selectedCustomer={selectedCustomer}
            selectedMember={selectedMember}
            onCustomer={(c) => {
              setSelectedCustomer(c);
              pick(c?.customerId ?? "");
            }}
            onMember={(m) => {
              setSelectedMember(m);
              pick(m?.memberId ?? "");
            }}
            allowManual
            manual={manualMode}
            onManualChange={setManualMode}
          />
          <div className="max-w-xs">
            <Field label="Devise">
              <input
                value={currency}
                onChange={(e) => {
                  setCurrency(e.target.value.toUpperCase());
                  setResult(null);
                }}
                className={`${FIELD_SOFT} font-mono`}
              />
            </Field>
          </div>
          <ActionButton icon={Search} pending={getOrCreateMutation.isPending} disabled={!ownerCode} onClick={() => getOrCreateMutation.mutate()}>
            Récupérer ou créer le portefeuille
          </ActionButton>
        </div>
      </Section>

      {result ? (
        <WalletSummary wallet={result} onOpen={() => navigate(`/wallets/${result.walletNumber}`)} />
      ) : isSearching && debouncedCode ? (
        <Skeleton className="h-36 w-full rounded-2xl" />
      ) : existing.length > 0 ? (
        <div className="space-y-3">
          {existing.map((w) => (
            <WalletSummary key={w.walletNumber} wallet={w} onOpen={() => navigate(`/wallets/${w.walletNumber}`)} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={WalletIcon}
          title={debouncedCode ? "Aucun portefeuille trouvé" : "Aucun propriétaire sélectionné"}
          hint={debouncedCode ? "Utilisez le bouton ci-dessus pour le créer automatiquement." : "Sélectionnez un propriétaire pour vérifier son portefeuille."}
        />
      )}
    </div>
  );
};
