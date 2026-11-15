import React, { useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  Calendar,
  CheckSquare,
  ClipboardCheck,
  Clock,
  Eye,
  FileSearch,
  FileText,
  FolderOpen,
  GitBranch,
  GitCompareArrows,
  ListChecks,
  Search,
  ShieldCheck,
  Tags,
} from "lucide-react";
import { AdminLayout } from "../../components/layout/AdminLayout";
import { brandVars } from "../../components/layout/adminTheme";
import { PageHeader, Tabs } from "../../components/subscription/kit";
import type { TabItem } from "../../components/subscription/kit";
import { Toaster } from "../../components/ui/Toaster";
import { DocumentTypesList } from "./DocumentTypesList";
import { DocumentRequirementsList } from "./DocumentRequirementsList";
import { DocumentsList } from "./DocumentsList";
import { DocumentReviewQueue } from "./DocumentReviewQueue";
import { KycDashboardPage } from "./KycDashboardPage";
import { KycMyQueuePage } from "./KycMyQueuePage";
import { KycExpiringSoonPage } from "./KycExpiringSoonPage";
import { KycBulkReviewPage } from "./KycBulkReviewPage";
import { KycCorrectionPage } from "./KycCorrectionPage";
import { KycReviewedDocumentsPage } from "./KycReviewedDocumentsPage";
import { KycCrossValidationPage } from "./KycCrossValidationPage";
import { DocumentGedDashboard } from "./DocumentGedDashboard";
import { DocumentAdvancedSearchPage } from "./DocumentAdvancedSearchPage";
import { DocumentOwnerFolderPage } from "./DocumentOwnerFolderPage";
import { DocumentGovernancePage } from "./DocumentGovernancePage";
import { DocumentAnalyticsExportPage } from "./DocumentAnalyticsExportPage";
import { DocumentOperationsHub } from "./DocumentOperationsHub";

type TabId =
  | "dashboard"
  | "review"
  | "myqueue"
  | "corrections"
  | "expiring"
  | "bulk"
  | "reviewed"
  | "crossValidation"
  | "gedDashboard"
  | "documents"
  | "advancedSearch"
  | "folder"
  | "operations"
  | "types"
  | "requirements"
  | "governance"
  | "analytics";

type GroupId = "kyc" | "ged" | "admin";

interface Section extends TabItem<TabId> {
  group: GroupId;
  view: React.ReactNode;
}

const SECTIONS: Section[] = [
  { id: "dashboard", label: "Tableau de bord", icon: BarChart3, group: "kyc", view: <KycDashboardPage /> },
  { id: "review", label: "Revue", icon: Eye, group: "kyc", view: <DocumentReviewQueue /> },
  { id: "myqueue", label: "Mes dossiers", icon: Clock, group: "kyc", view: <KycMyQueuePage /> },
  { id: "corrections", label: "Corrections", icon: AlertTriangle, group: "kyc", view: <KycCorrectionPage /> },
  { id: "expiring", label: "Expirations", icon: Calendar, group: "kyc", view: <KycExpiringSoonPage /> },
  { id: "bulk", label: "Revue en masse", icon: CheckSquare, group: "kyc", view: <KycBulkReviewPage /> },
  { id: "reviewed", label: "Documents traités", icon: ClipboardCheck, group: "kyc", view: <KycReviewedDocumentsPage /> },
  { id: "crossValidation", label: "Validation croisée", icon: GitCompareArrows, group: "kyc", view: <KycCrossValidationPage /> },
  { id: "gedDashboard", label: "Tableau de bord", icon: FileSearch, group: "ged", view: <DocumentGedDashboard /> },
  { id: "documents", label: "Documents", icon: FolderOpen, group: "ged", view: <DocumentsList /> },
  { id: "advancedSearch", label: "Recherche", icon: Search, group: "ged", view: <DocumentAdvancedSearchPage /> },
  { id: "folder", label: "Dossier", icon: FolderOpen, group: "ged", view: <DocumentOwnerFolderPage /> },
  { id: "operations", label: "Opérations", icon: GitBranch, group: "ged", view: <DocumentOperationsHub /> },
  { id: "types", label: "Types", icon: FileText, group: "admin", view: <DocumentTypesList /> },
  { id: "requirements", label: "Exigences", icon: ListChecks, group: "admin", view: <DocumentRequirementsList /> },
  { id: "governance", label: "Gouvernance", icon: Tags, group: "admin", view: <DocumentGovernancePage /> },
  { id: "analytics", label: "Analytics", icon: ShieldCheck, group: "admin", view: <DocumentAnalyticsExportPage /> },
];

const GROUPS: TabItem<GroupId>[] = [
  { id: "kyc", label: "KYC", icon: ShieldCheck },
  { id: "ged", label: "GED", icon: FolderOpen },
  { id: "admin", label: "Administration", icon: Tags },
];

export const DocumentMaster: React.FC = () => {
  const [group, setGroup] = useState<GroupId>("kyc");
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");
  // Un écran visité reste monté (filtres et saisies conservés), les autres ne se chargent qu'à la première visite.
  const [visited, setVisited] = useState<Set<TabId>>(new Set(["dashboard"]));

  const open = (id: TabId) => {
    setActiveTab(id);
    setVisited((prev) => new Set([...prev, id]));
  };

  const openGroup = (g: GroupId) => {
    setGroup(g);
    if (SECTIONS.find((s) => s.id === activeTab)?.group !== g) {
      const first = SECTIONS.find((s) => s.group === g);
      if (first) open(first.id);
    }
  };

  const inGroup: TabItem<TabId>[] = SECTIONS.filter((s) => s.group === group).map(({ id, label, icon }) => ({ id, label, icon }));

  return (
    <AdminLayout>
      <div style={brandVars}>
        <Toaster />
        <PageHeader title="Documents et conformité" subtitle="Dossiers KYC, gestion documentaire, exigences et gouvernance" />
        <div className="mb-4">
          <Tabs items={GROUPS} active={group} onChange={openGroup} />
        </div>
        <div className="mb-6">
          <Tabs variant="soft" items={inGroup} active={activeTab} onChange={open} />
        </div>
        {SECTIONS.map((s) =>
          visited.has(s.id) ? (
            <div key={s.id} className={activeTab !== s.id ? "hidden" : ""}>
              {s.view}
            </div>
          ) : null,
        )}
      </div>
    </AdminLayout>
  );
};
