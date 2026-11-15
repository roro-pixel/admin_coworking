import React, { useState } from "react";
import { Tabs } from "../../../components/subscription/kit";
import type { TabItem } from "../../../components/subscription/kit";
import { PromotionsList } from "./PromotionsList";
import { CouponsPanel } from "./CouponsPanel";
import { ReferralsPanel } from "./ReferralsPanel";

type PromoTab = "promotions" | "coupons" | "referrals";

const TABS: TabItem<PromoTab>[] = [
  { id: "promotions", label: "Promotions" },
  { id: "coupons", label: "Coupons" },
  { id: "referrals", label: "Parrainage" },
];

/** Onglet Promotions : la liste des promotions, les coupons et le parrainage. */
export const PromotionsHub: React.FC = () => {
  const [tab, setTab] = useState<PromoTab>("promotions");
  return (
    <div className="space-y-5">
      <Tabs variant="soft" items={TABS} active={tab} onChange={setTab} />
      {tab === "promotions" && <PromotionsList />}
      {tab === "coupons" && <CouponsPanel />}
      {tab === "referrals" && <ReferralsPanel />}
    </div>
  );
};
