import React, { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Building2, FileText, Inbox, PackagePlus, Workflow } from "lucide-react";
import { domiciliationService } from "../../services/domiciliation.service";
import {
  ActionButton,
  DataCard,
  Detail,
  EmptyState,
  ErrorBlock,
  PageHeader,
  Pagination,
  Section,
  StatusChip,
  Tabs,
  Tag,
} from "../../components/subscription/kit";
import type { TabItem } from "../../components/subscription/kit";
import { formatDate } from "../../components/subscription/kitUtils";
import { statusOf } from "../../components/subscription/labels";
import { DetailsSkeleton, ListSkeleton } from "../../components/ui/Skeleton";
import { LifecycleShell } from "../../components/subscription/lifecycle/LifecycleShell";
import { MAIL_KEY, MailRow, ReceiveMailForm } from "../../components/services/MailParts";
import { ContractCycle } from "../../components/services/ContractCycle";
import { ContractEngagement } from "../../components/services/ContractEngagement";
import { CERTIFICATE_SCOPE_LABEL, CONTRACT_STATUS, DOMICILIATION_CYCLE_OPTIONS, FORWARDING_MODE_LABEL } from "../../components/services/serviceLabels";

type Tab = "cycle" | "mail" | "details";

const TABS: TabItem<Tab>[] = [
  { id: "cycle", label: "Cycle", icon: Workflow },
  { id: "mail", label: "Courrier", icon: Inbox },
  { id: "details", label: "Détails", icon: FileText },
];

const CYCLE_LABEL = Object.fromEntries(DOMICILIATION_CYCLE_OPTIONS.map((o) => [o.value, o.label]));
const PAGE_SIZE = 10;

/** Courrier d'un domicilié : réception et traitement. */
const ContractMail: React.FC<{ contractNumber: string; active: boolean }> = ({ contractNumber, active }) => {
  const [page, setPage] = useState(0);
  const [receiving, setReceiving] = useState(false);
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: [MAIL_KEY, "contract", contractNumber, page],
    queryFn: () => domiciliationService.getContractMail(contractNumber, { page, size: PAGE_SIZE }),
  });
  const rows = data?.content ?? [];

  return (
    <div className="space-y-4">
      {active && !receiving && (
        <div>
          <ActionButton icon={PackagePlus} onClick={() => setReceiving(true)}>
            Réceptionner un courrier
          </ActionButton>
        </div>
      )}
      {receiving && <ReceiveMailForm contractNumber={contractNumber} onDone={() => setReceiving(false)} onCancel={() => setReceiving(false)} />}
      {isLoading ? (
        <ListSkeleton rows={3} />
      ) : isError ? (
        <ErrorBlock message="Impossible de charger le courrier de ce domicilié." onRetry={() => refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState icon={Inbox} title="Aucun courrier" hint={active ? "Le courrier réceptionné pour ce domicilié apparaît ici." : "Le courrier se réceptionne une fois le contrat actif."} />
      ) : (
        <DataCard>
          <div className="space-y-2">
            {rows.map((m) => (
              <MailRow key={m.itemNumber} item={m} showContract={false} />
            ))}
          </div>
        </DataCard>
      )}
      <Pagination page={page} totalPages={data?.totalPages ?? 0} total={data?.totalElements ?? 0} noun="courrier" onChange={setPage} />
    </div>
  );
};

/** Fiche d'un contrat de domiciliation : cycle d'ouverture, courrier et détails. */
export const DomiciliationContractDetailPage: React.FC = () => {
  const { contractNumber = "" } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("cycle");

  const { data: contract, isLoading, isError, refetch } = useQuery({
    queryKey: ["domiciliation-contract", contractNumber],
    queryFn: () => domiciliationService.getContract(contractNumber),
    enabled: !!contractNumber,
  });

  if (isLoading) {
    return (
      <LifecycleShell>
        <div className="mx-auto w-full max-w-4xl">
          <DetailsSkeleton />
        </div>
      </LifecycleShell>
    );
  }

  if (isError || !contract) {
    return (
      <LifecycleShell>
        <div className="mx-auto w-full max-w-4xl">
          <PageHeader title="Contrat introuvable" onBack={() => navigate("/services/contracts")} backLabel="Contrats" />
          <ErrorBlock message="Ce contrat n'existe pas ou n'est plus accessible." onRetry={() => refetch()} />
        </div>
      </LifecycleShell>
    );
  }

  const st = statusOf(CONTRACT_STATUS, contract.status);

  return (
    <LifecycleShell>
      <div className="mx-auto w-full max-w-4xl">
        <PageHeader
          title={contract.legalName || "Contrat de domiciliation"}
          subtitle={
            <span>
              <span className="font-mono">{contract.contractNumber}</span>
              {contract.subscriptionNumber && (
                <>
                  {" · "}
                  <Link to={`/subscriptions/${encodeURIComponent(contract.subscriptionNumber)}`} className="font-mono font-semibold text-[color:var(--logo-pink-dark)] hover:underline">
                    {contract.subscriptionNumber}
                  </Link>
                </>
              )}
            </span>
          }
          badge={<StatusChip tone={st.tone}>{st.label}</StatusChip>}
          onBack={() => navigate("/services/contracts")}
          backLabel="Contrats"
        />

        <div className="mb-5">
          <Tabs variant="soft" items={TABS} active={tab} onChange={setTab} />
        </div>

        {tab === "cycle" && <ContractCycle contract={contract} />}

        {tab === "mail" && <ContractMail contractNumber={contract.contractNumber} active={contract.status === "ACTIVE"} />}

        {tab === "details" && (
          <div className="space-y-4">
            <Section title="Entreprise domiciliée" icon={Building2}>
              <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
                <Detail label="Raison sociale">{contract.legalName}</Detail>
                <Detail label="Forme juridique">{contract.legalForm}</Detail>
                <Detail label="Représentant légal">{contract.legalRepresentativeName}</Detail>
                <Detail label="N° d'immatriculation" mono>
                  {contract.registrationNumber}
                </Detail>
                <Detail label="N° d'identification fiscale" mono>
                  {contract.taxNumber}
                </Detail>
                <Detail label="Adresse" mono>
                  {contract.addressCode}
                </Detail>
                <Detail label="N° de suite">{contract.suiteNumber}</Detail>
              </div>
            </Section>

            <Section title="Engagement et courrier" icon={FileText}>
              <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
                <Detail label="Rythme de facturation">{CYCLE_LABEL[String(contract.billingCycle)] ?? contract.billingCycle}</Detail>
                <Detail label="Engagement">{contract.commitmentMonths != null ? `${contract.commitmentMonths} mois` : undefined}</Detail>
                <Detail label="Préavis">{contract.noticePeriodDays != null ? `${contract.noticePeriodDays} jours` : undefined}</Detail>
                <Detail label="Début">{formatDate(contract.startDate)}</Detail>
                <Detail label="Fin">{formatDate(contract.endDate)}</Detail>
                <Detail label="Traitement du courrier">{FORWARDING_MODE_LABEL[String(contract.mailForwardingMode)] ?? contract.mailForwardingMode}</Detail>
                <Detail label="Adresse fiscale">
                  {contract.fiscalAddressEligible ? <Tag tone="pink">Éligible</Tag> : <Tag>Non éligible</Tag>}
                </Detail>
                <Detail label="Attestation fiscale révoquée le">{formatDate(contract.fiscalAddressRevokedAt)}</Detail>
              </div>
              <div className="mt-5">
                <ContractEngagement contract={contract} />
              </div>
            </Section>

            <Section title="Documents" icon={FileText} description="Codes des documents rattachés à ce contrat">
              <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
                <Detail label="Contrat" mono>
                  {contract.contractDocumentCode}
                </Detail>
                <Detail label="Contrat signé" mono>
                  {contract.signedDocumentCode}
                </Detail>
                <Detail label="Attestation" mono>
                  {contract.certificateDocumentCode}
                </Detail>
                <Detail label="Type d'attestation">
                  {contract.certificateScope ? (CERTIFICATE_SCOPE_LABEL[String(contract.certificateScope)] ?? String(contract.certificateScope)) : undefined}
                </Detail>
                <Detail label="Attestation valable jusqu'au">{formatDate(contract.certificateValidUntil)}</Detail>
                <Detail label="Documents conservés jusqu'au">{formatDate(contract.retainDocumentsUntil)}</Detail>
              </div>
              {!contract.contractDocumentCode && !contract.signedDocumentCode && !contract.certificateDocumentCode && (
                <p className="text-sm text-gray-500">Aucun document pour le moment.</p>
              )}
            </Section>
          </div>
        )}
      </div>
    </LifecycleShell>
  );
};
