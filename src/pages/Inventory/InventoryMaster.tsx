import React, { useState } from "react";
import { AlertTriangle, Boxes, ClipboardCheck, FileText, HardDrive, LayoutDashboard, MapPin, Package, Repeat, ShoppingCart, TrendingUp, Upload } from "lucide-react";
import { AdminLayout } from "../../components/layout/AdminLayout";
import { brandVars } from "../../components/layout/adminTheme";
import { PageHeader, Tabs } from "../../components/subscription/kit";
import type { TabItem } from "../../components/subscription/kit";
import { Toaster } from "../../components/ui/Toaster";
import { ItemsList } from "./catalog/ItemsList";
import { CategoriesList } from "./catalog/CategoriesList";
import { UnitsList } from "./catalog/UnitsList";
import { LocationsList } from "./locations/LocationsList";
import { StockLevels } from "./stock/StockLevels";
import { StockMovements } from "./stock/StockMovements";
import { ReservationsList } from "./stock/ReservationsList";
import { LotsList } from "./stock/LotsList";
import { SuppliersList } from "./procurement/SuppliersList";
import { PurchaseRequestsList } from "./procurement/PurchaseRequestsList";
import { PurchaseOrdersList } from "./procurement/PurchaseOrdersList";
import { ApprovalRulesList } from "./procurement/ApprovalRulesList";
import { AssetsList } from "./assets/AssetsList";
import { AlertsCenter } from "./intelligence/AlertsCenter";
import { ReorderRulesList } from "./intelligence/ReorderRulesList";
import { InventoryDashboard } from "./admin/InventoryDashboard";
import { ReportsPage } from "./admin/ReportsPage";
import { ImportPage } from "./admin/ImportPage";
import { InventoryCountsList } from "./control/InventoryCountsList";

const MAIN: TabItem<string>[] = [
  { id: "dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { id: "catalog", label: "Catalogue", icon: Boxes },
  { id: "locations", label: "Emplacements", icon: MapPin },
  { id: "stock", label: "Stock", icon: TrendingUp },
  { id: "procurement", label: "Achats", icon: ShoppingCart },
  { id: "assets", label: "Actifs", icon: HardDrive },
  { id: "alerts", label: "Alertes", icon: AlertTriangle },
  { id: "reorder", label: "Réappro", icon: Repeat },
  { id: "counts", label: "Comptages", icon: ClipboardCheck },
  { id: "reports", label: "Rapports", icon: FileText },
  { id: "import", label: "Import", icon: Upload },
];

const CATALOG: TabItem<string>[] = [{ id: "items", label: "Articles", icon: Package }, { id: "categories", label: "Catégories" }, { id: "units", label: "Unités" }];
const STOCK: TabItem<string>[] = [{ id: "levels", label: "Niveaux" }, { id: "movements", label: "Mouvements" }, { id: "reservations", label: "Réservations" }, { id: "lots", label: "Lots" }];
const PROCUREMENT: TabItem<string>[] = [{ id: "suppliers", label: "Fournisseurs" }, { id: "requests", label: "Demandes" }, { id: "orders", label: "Bons de commande" }, { id: "rules", label: "Règles d'approbation" }];

/** Les panneaux déjà ouverts restent montés (masqués) : on garde filtres, page et saisies en changeant d'onglet */
const Keep: React.FC<{ id: string; active: string; seen: Set<string>; children: React.ReactNode }> = ({ id, active, seen, children }) =>
  seen.has(id) ? <div className={active !== id ? "hidden" : ""}>{children}</div> : null;

const useVisited = (active: string) => {
  const [seen, setSeen] = useState<Set<string>>(() => new Set([active]));
  if (!seen.has(active)) setSeen(new Set(seen).add(active));
  return seen;
};

const SubModule: React.FC<{ items: TabItem<string>[]; panels: Record<string, React.ReactNode> }> = ({ items, panels }) => {
  const [active, setActive] = useState(items[0].id);
  const seen = useVisited(active);
  return (
    <div className="space-y-5">
      <Tabs variant="soft" items={items} active={active} onChange={setActive} />
      {items.map((t) => (
        <Keep key={t.id} id={t.id} active={active} seen={seen}>{panels[t.id]}</Keep>
      ))}
    </div>
  );
};

export const InventoryMaster: React.FC = () => {
  const [active, setActive] = useState("dashboard");
  const seen = useVisited(active);

  const panels: Record<string, React.ReactNode> = {
    dashboard: <InventoryDashboard />,
    catalog: <SubModule items={CATALOG} panels={{ items: <ItemsList />, categories: <CategoriesList />, units: <UnitsList /> }} />,
    locations: <LocationsList />,
    stock: <SubModule items={STOCK} panels={{ levels: <StockLevels />, movements: <StockMovements />, reservations: <ReservationsList />, lots: <LotsList /> }} />,
    procurement: <SubModule items={PROCUREMENT} panels={{ suppliers: <SuppliersList />, requests: <PurchaseRequestsList />, orders: <PurchaseOrdersList />, rules: <ApprovalRulesList /> }} />,
    assets: <AssetsList />,
    alerts: <AlertsCenter />,
    reorder: <ReorderRulesList />,
    counts: <InventoryCountsList />,
    reports: <ReportsPage />,
    import: <ImportPage />,
  };

  return (
    <AdminLayout>
      <div style={brandVars}>
        <Toaster />
        <PageHeader title="Gestion d'inventaire" subtitle="Gérez vos articles, stocks, achats et actifs" />
        <Tabs items={MAIN} active={active} onChange={setActive} />
        <div className="mt-6">
          {MAIN.map((t) => (
            <Keep key={t.id} id={t.id} active={active} seen={seen}>{panels[t.id]}</Keep>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
};
