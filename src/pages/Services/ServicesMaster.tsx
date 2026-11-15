import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ClipboardList, FileSignature, ListChecks, Mail, MapPin } from "lucide-react";
import { AdminLayout } from "../../components/layout/AdminLayout";
import { brandVars } from "../../components/layout/adminTheme";
import { Toaster } from "../../components/ui/Toaster";
import { Tabs } from "../../components/subscription/kit";
import type { TabItem } from "../../components/subscription/kit";
import { MailPanel } from "./MailPanel";
import { ContractsPanel } from "./ContractsPanel";
import { RegistrationsPanel } from "./RegistrationsPanel";
import { AddressesPanel } from "./AddressesPanel";
import { CataloguePanel } from "./CataloguePanel";

type TabId = "mail" | "contracts" | "registrations" | "addresses" | "catalogue";

/** Chaque onglet a sa propre adresse : un lien ou un retour arrière retombe sur le bon écran. */
export const SERVICES_PATHS: Record<TabId, string> = {
  mail: "/services/mail",
  contracts: "/services/contracts",
  registrations: "/services/registrations",
  addresses: "/services/addresses",
  catalogue: "/services/catalogue",
};

const TABS: TabItem<TabId>[] = [
  { id: "mail", label: "Courrier", icon: Mail },
  { id: "contracts", label: "Contrats", icon: FileSignature },
  { id: "registrations", label: "Dossiers d'enregistrement", icon: ClipboardList },
  { id: "addresses", label: "Adresses", icon: MapPin },
  { id: "catalogue", label: "Catalogue", icon: ListChecks },
];

const tabFromPath = (pathname: string): TabId =>
  (Object.entries(SERVICES_PATHS) as [TabId, string][]).find(([, path]) => pathname.startsWith(path))?.[0] ?? "mail";

/** Services et domiciliation : courrier à traiter, contrats, dossiers d'enregistrement, adresses et catalogue. */
export const ServicesMaster: React.FC = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const tab = tabFromPath(pathname);

  return (
    <AdminLayout>
      <div style={brandVars}>
        <div className="mb-5">
          <h1 className="text-2xl font-bold tracking-tight text-gray-950 sm:text-3xl">Services</h1>
          <p className="mt-1 text-sm text-gray-500">Domiciliation, courrier et catalogue de services</p>
        </div>

        <div className="mb-6">
          <Tabs items={TABS} active={tab} onChange={(id) => navigate(SERVICES_PATHS[id])} />
        </div>

        {tab === "mail" && <MailPanel />}
        {tab === "contracts" && <ContractsPanel />}
        {tab === "registrations" && <RegistrationsPanel />}
        {tab === "addresses" && <AddressesPanel />}
        {tab === "catalogue" && <CataloguePanel />}

        <Toaster />
      </div>
    </AdminLayout>
  );
};
