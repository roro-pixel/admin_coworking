import React, { useState } from "react";
import { ListHeader, Tabs } from "../../components/subscription/kit";
import type { TabItem } from "../../components/subscription/kit";
import { MarketplaceShell } from "../../components/marketplace/MarketplaceShell";
import { OffersTab } from "../../components/marketplace/OffersTab";
import { OrdersTab } from "../../components/marketplace/OrdersTab";

type TabId = "orders" | "offers";

const TABS: TabItem<TabId>[] = [
  { id: "orders", label: "Commandes" },
  { id: "offers", label: "Offres" },
];

export const MarketplacePage: React.FC = () => {
  const [tab, setTab] = useState<TabId>("orders");
  return (
    <MarketplaceShell>
      <div className="mb-5">
        <ListHeader title="Marketplace" subtitle="Boutique du coworking : offres et commandes retirées au comptoir" />
      </div>
      <div className="mb-5">
        <Tabs items={TABS} active={tab} onChange={setTab} />
      </div>
      {tab === "orders" ? <OrdersTab /> : <OffersTab />}
    </MarketplaceShell>
  );
};

export default MarketplacePage;
