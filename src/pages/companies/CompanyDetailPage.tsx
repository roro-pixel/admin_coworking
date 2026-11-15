import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Lock, LockOpen } from "lucide-react";
import { companyService } from "../../services/company.service";
import { ActionButton, EmptyState, ErrorBlock, Field, PageHeader, PanelForm, StatusChip, Tabs } from "../../components/subscription/kit";
import type { TabItem } from "../../components/subscription/kit";
import { FIELD, apiMessage } from "../../components/subscription/kitUtils";
import { statusOf } from "../../components/subscription/labels";
import { DetailsSkeleton } from "../../components/ui/Skeleton";
import { toast } from "../../components/ui/toastStore";
import { CompanyShell } from "../../components/companies/CompanyShell";
import { CompanyProfileTab } from "../../components/companies/CompanyProfileTab";
import { CompanyMembersTab } from "../../components/companies/CompanyMembersTab";
import { CompanyBillingTab } from "../../components/companies/CompanyBillingTab";
import { CompanySubscriptionsTab } from "../../components/companies/CompanySubscriptionsTab";
import { CompanyPassesTab } from "../../components/companies/CompanyPassesTab";
import { CompanyWalletTab } from "../../components/companies/CompanyWalletTab";
import { CompanyContractsTab } from "../../components/companies/CompanyContractsTab";
import { COMPANIES_KEY, COMPANY_STATUS } from "../../components/companies/companyLabels";

type TabId = "profile" | "members" | "billing" | "subscriptions" | "passes" | "wallet" | "contracts";

const TABS: TabItem<TabId>[] = [
  { id: "profile", label: "Fiche" },
  { id: "members", label: "Membres" },
  { id: "billing", label: "Facturation" },
  { id: "subscriptions", label: "Abonnements" },
  { id: "passes", label: "Passes" },
  { id: "wallet", label: "Portefeuille" },
  { id: "contracts", label: "Contrats" },
];

const Frame: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <CompanyShell>
    <div className="mx-auto w-full max-w-4xl">{children}</div>
  </CompanyShell>
);

const BlockForm: React.FC<{ customerId: string; onDone: () => void }> = ({ customerId, onDone }) => {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: () => companyService.blockCompany(customerId, reason.trim()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [COMPANIES_KEY] });
      toast.success("Organisation bloquée");
      onDone();
    },
    onError: (e) => setError(apiMessage(e, "Blocage impossible.")),
  });
  return (
    <PanelForm
      title="Bloquer l'organisation"
      pending={mutation.isPending}
      submitLabel="Bloquer"
      submitDisabled={reason.trim() === ""}
      error={error}
      onCancel={onDone}
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        mutation.mutate();
      }}
    >
      <Field label="Motif" required>
        <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className={`${FIELD} resize-none bg-gray-50 shadow-none`} />
      </Field>
    </PanelForm>
  );
};

export const CompanyDetailPage: React.FC = () => {
  const { customerId = "" } = useParams<{ customerId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<TabId>("profile");
  const [blocking, setBlocking] = useState(false);

  const { data: company, isLoading, isError, refetch } = useQuery({
    queryKey: [COMPANIES_KEY, "detail", customerId],
    queryFn: () => companyService.getCompany(customerId),
    enabled: customerId !== "",
  });

  const back = () => navigate("/companies");

  if (isLoading) {
    return (
      <Frame>
        <DetailsSkeleton />
      </Frame>
    );
  }
  if (isError) {
    return (
      <Frame>
        <ErrorBlock message="Impossible de charger l'organisation." onRetry={() => refetch()} />
      </Frame>
    );
  }
  if (!company) {
    return (
      <Frame>
        <EmptyState icon={Building2} title="Organisation introuvable" action={<ActionButton onClick={back}>Retour à la liste</ActionButton>} />
      </Frame>
    );
  }

  const st = statusOf(COMPANY_STATUS, company.status);
  const blocked = company.status === "BLOCKED";

  const askUnblock = () =>
    toast.confirm({
      message: `Débloquer ${company.name} ?`,
      detail: "L'organisation retrouve ses accès et ses facturations.",
      confirmLabel: "Débloquer",
      pendingLabel: "Déblocage",
      successMessage: "Organisation débloquée",
      errorMessage: "Déblocage impossible.",
      onConfirm: async () => {
        await companyService.unblockCompany(company.customerId);
        await queryClient.invalidateQueries({ queryKey: [COMPANIES_KEY] });
      },
    });

  return (
    <Frame>
      <PageHeader
        title={company.name}
        subtitle={<span className="font-mono">{company.customerId}</span>}
        onBack={back}
        backLabel="Entreprises"
        badge={<StatusChip tone={st.tone}>{st.label}</StatusChip>}
        actions={
          blocked ? (
            <ActionButton variant="ghost" icon={LockOpen} onClick={askUnblock}>
              Débloquer
            </ActionButton>
          ) : (
            <ActionButton variant="ghost" icon={Lock} disabled={blocking} onClick={() => setBlocking(true)}>
              Bloquer
            </ActionButton>
          )
        }
      />

      {blocked && company.blockedReason && (
        <p className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">Bloquée : {company.blockedReason}</p>
      )}
      {blocking && <BlockForm customerId={company.customerId} onDone={() => setBlocking(false)} />}

      <div className="mb-5">
        <Tabs items={TABS} active={tab} onChange={setTab} />
      </div>

      {tab === "profile" && <CompanyProfileTab company={company} />}
      {tab === "members" && <CompanyMembersTab company={company} />}
      {tab === "billing" && <CompanyBillingTab company={company} />}
      {tab === "subscriptions" && <CompanySubscriptionsTab company={company} />}
      {tab === "passes" && <CompanyPassesTab company={company} />}
      {tab === "wallet" && <CompanyWalletTab company={company} />}
      {tab === "contracts" && <CompanyContractsTab company={company} />}
    </Frame>
  );
};

export default CompanyDetailPage;
