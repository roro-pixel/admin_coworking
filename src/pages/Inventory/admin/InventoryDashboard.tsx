import React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Package,
  TrendingDown,
  AlertTriangle,
  ShoppingCart,
  DollarSign,
} from "lucide-react";
import { inventoryService } from "../../../services/inventory.service";

export const InventoryDashboard: React.FC = () => {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ["inventory-dashboard"],
    queryFn: () => inventoryService.getDashboardMetrics(),
  });

  if (isLoading) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  const cards = [
    {
      title: "Alertes ouvertes",
      value: metrics?.openAlerts || 0,
      icon: AlertTriangle,
      color: "bg-red-100 text-red-600",
    },
    {
      title: "Stock bas",
      value: metrics?.lowStockAlerts || 0,
      icon: TrendingDown,
      color: "bg-yellow-100 text-yellow-600",
    },
    {
      title: "Ruptures",
      value: metrics?.outOfStockAlerts || 0,
      icon: AlertTriangle,
      color: "bg-orange-100 text-orange-600",
    },
    {
      title: "Bons de commande ouverts",
      value: metrics?.openPurchaseOrders || 0,
      icon: ShoppingCart,
      color: "bg-blue-100 text-blue-600",
    },
    {
      title: "Valeur totale du stock",
      value: `${(metrics?.totalStockValue || 0).toLocaleString()} FCFA`,
      icon: DollarSign,
      color: "bg-green-100 text-green-600",
    },
    {
      title: "Lots expirant (30j)",
      value: metrics?.expiringLots30Days || 0,
      icon: Package,
      color: "bg-orange-100 text-orange-600",
    },
    {
      title: "Alertes expiration proche",
      value: metrics?.expirySoonAlerts || 0,
      icon: AlertTriangle,
      color: "bg-orange-100 text-orange-600",
    },
    {
      title: "Stocks négatifs",
      value: metrics?.negativeStockAlerts || 0,
      icon: TrendingDown,
      color: "bg-red-100 text-red-600",
    },
  ];

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-6">
        Tableau de bord inventaire
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 sm:p-6">
        {cards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div
              key={index}
              className="bg-white rounded-3xl p-5 sm:p-5 sm:p-6 shadow-sm ring-1 ring-gray-100 hover:shadow-md transition-all"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-2xl ${card.color}`}>
                  <Icon size={24} />
                </div>
              </div>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">
                {card.value}
              </p>
              <p className="text-sm text-gray-600">{card.title}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
