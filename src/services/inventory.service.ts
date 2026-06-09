import { apiClient } from "./api";

// ==================== TYPES ====================
export interface InventoryCategory {
  code: string;
  name: string;
  description?: string;
  itemCount?: number;
  active?: boolean;
  parentCategoryCode?: string;
  parentCategoryName?: string;
}

export interface InventoryUnit {
  code: string;
  name: string;
  unitType: string;
  active?: boolean;
  symbol?: string;
}

export interface InventoryItem {
  itemCode: string;
  name: string;
  description?: string;
  specification?: string;
  displayCode?: string;
  identificationCode?: string;
  shortCode?: string;
  psku?: string;
  categoryCode: string;
  categoryName?: string;
  unitCode: string;
  unitName?: string;
  itemType: "CONSUMABLE" | "ASSET" | "SERVICE" | "SPARE_PART";
  trackingType: "NONE" | "LOT" | "SERIAL";
  defaultCost: number;
  salePrice?: number;
  taxable: boolean;
  allowNegativeStock: boolean;
  requiresExpiryDate: boolean;
  requiresLotNumber: boolean;
  requiresSerialNumber: boolean;
  active: boolean;
}

export interface InventoryLocation {
  locationCode: string;
  name: string;
  locationType: "WAREHOUSE" | "OFFICE" | "ROOM" | "ZONE" | "VIRTUAL";
  description?: string;
  active: boolean;
}

export interface StockLevel {
  itemCode: string;
  itemName: string;
  locationCode: string;
  locationName: string;
  quantityOnHand: number;
  quantityReserved: number;
  quantityAvailable: number;
  averageCost: number;
  lastMovementAt?: string;
}

export interface StockMovement {
  movementCode: string;
  itemCode: string;
  itemName: string;
  locationFromCode?: string;
  locationToCode?: string;
  movementType: "IN" | "OUT" | "TRANSFER" | "ADJUSTMENT_IN" | "ADJUSTMENT_OUT";
  quantity: number;
  unitCost?: number;
  totalCost?: number;
  referenceType?: string;
  referenceCode?: string;
  reason?: string;
  performedBy: string;
  performedAt: string;
  reversed: boolean;
}

export interface Supplier {
  code: string;
  name: string;
  email?: string;
  phone?: string;
  taxId?: string;
  address?: string;
  status: "ACTIVE" | "INACTIVE" | "BLACKLISTED";
}

export interface PurchaseRequest {
  requestCode: string;
  locationCode: string;
  locationName: string;
  status: "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED" | "CONVERTED";
  requestedBy: string;
  approvedBy?: string;
  rejectionReason?: string;
  createdAt: string;
  lines: PurchaseRequestLine[];
}

export interface PurchaseRequestLine {
  itemCode: string;
  itemName: string;
  quantity: number;
  unitCost: number;
  totalCost?: number;
}

export interface PurchaseOrder {
  orderCode: string;
  supplierCode: string;
  supplierName: string;
  locationCode: string;
  sourceRequestCode?: string;
  status:
    | "DRAFT"
    | "PENDING_APPROVAL"
    | "APPROVED"
    | "ORDERED"
    | "PARTIALLY_RECEIVED"
    | "RECEIVED"
    | "CANCELLED";
  approvalLevel: "NONE" | "MANAGER" | "DIRECTOR" | "FINANCE";
  approvedBy?: string;
  approvedAt?: string;
  totalAmount: number;
  expectedDeliveryDate?: string;
  orderedBy: string;
  createdAt: string;
  lines: PurchaseOrderLine[];
}

export interface PurchaseOrderLine {
  itemCode: string;
  itemName: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

export interface Asset {
  assetCode: string;
  itemCode: string;
  itemName: string;
  serialNumber?: string;
  assetTag?: string;
  status:
    | "AVAILABLE"
    | "RESERVED"
    | "ASSIGNED"
    | "IN_USE"
    | "IN_MAINTENANCE"
    | "LOST"
    | "RETIRED"
    | "DAMAGED";
  condition: "NEW" | "GOOD" | "FAIR" | "POOR" | "DAMAGED";
  locationCode: string;
  locationName: string;
  assignedToType?: "MEMBER" | "CUSTOMER" | "BUSINESS" | "ROOM" | "LOCATION";
  assignedToCode?: string;
  purchaseDate?: string;
  purchaseCost: number;
  warrantyEndDate?: string;
  usefulLifeMonths?: number;
  residualValue?: number;
  depreciatedValue: number;
  notes?: string;
}

export interface Alert {
  alertCode: string;
  alertType:
    | "LOW_STOCK"
    | "OUT_OF_STOCK"
    | "NEGATIVE_STOCK"
    | "EXPIRY_SOON"
    | "LOT_EXPIRED"
    | "ASSET_WARRANTY_EXPIRING"
    | "ASSET_MAINTENANCE_DUE";
  status: "OPEN" | "ACKNOWLEDGED" | "RESOLVED" | "DISMISSED";
  itemCode?: string;
  itemName?: string;
  locationCode?: string;
  locationName?: string;
  assetCode?: string;
  currentQuantity?: number;
  thresholdQuantity?: number;
  message: string;
  createdAt: string;
}

export interface ReorderRule {
  ruleCode: string;
  itemCode: string;
  itemName: string;
  locationCode: string;
  locationName: string;
  minimumQuantity: number;
  reorderQuantity: number;
  active: boolean;
}

export interface ReorderSuggestion {
  suggestionCode: string;
  itemCode: string;
  itemName: string;
  locationCode: string;
  currentQuantity: number;
  minimumQuantity: number;
  suggestedOrderQuantity: number;
  estimatedOrderCost: number;
}

export interface PaginatedResponse<T> {
  content: T[];
  pageable: {
    pageNumber: number;
    pageSize: number;
    offset: number;
    paged: boolean;
    unpaged: boolean;
    sort: { empty: boolean; sorted: boolean; unsorted: boolean };
  };
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  empty: boolean;
  sort: { empty: boolean; sorted: boolean; unsorted: boolean };
  numberOfElements: number;
}

// ==================== SERVICES ====================
export const inventoryService = {
  // Categories
  getCategories: async (): Promise<InventoryCategory[]> => {
    const response = await apiClient.get("/sni/api/v1/inventory/categories");
    return response.data;
  },
  createCategory: async (
    data: Omit<InventoryCategory, "itemCount">,
  ): Promise<InventoryCategory> => {
    const response = await apiClient.post(
      "/sni/api/v1/inventory/categories",
      data,
    );
    return response.data;
  },
  updateCategory: async (
    categoryCode: string,
    data: Partial<InventoryCategory>,
  ): Promise<InventoryCategory> => {
    const response = await apiClient.put(
      `/sni/api/v1/inventory/categories/${categoryCode}`,
      data,
    );
    return response.data;
  },
  deleteCategory: async (categoryCode: string): Promise<void> => {
    await apiClient.delete(`/sni/api/v1/inventory/categories/${categoryCode}`);
  },

  // Unités
  getUnits: async (): Promise<InventoryUnit[]> => {
    const response = await apiClient.get("/sni/api/v1/inventory/units");
    return response.data;
  },
  createUnit: async (
    data: Omit<InventoryUnit, "unitCode">,
  ): Promise<InventoryUnit> => {
    const response = await apiClient.post("/sni/api/v1/inventory/units", data);
    return response.data;
  },
  updateUnit: async (
    unitCode: string,
    data: Partial<InventoryUnit>,
  ): Promise<InventoryUnit> => {
    const response = await apiClient.put(
      `/sni/api/v1/inventory/units/${unitCode}`,
      data,
    );
    return response.data;
  },
  deleteUnit: async (unitCode: string): Promise<void> => {
    await apiClient.delete(`/sni/api/v1/inventory/units/${unitCode}`);
  },

  // Articles
  getItems: async (params?: {
    query?: string;
    categoryCode?: string;
    itemType?: string;
    active?: boolean;
    page?: number;
    size?: number;
  }): Promise<PaginatedResponse<InventoryItem>> => {
    const response = await apiClient.get("/sni/api/v1/inventory/items", {
      params,
    });
    return response.data;
  },
  getItem: async (itemCode: string): Promise<InventoryItem> => {
    const response = await apiClient.get(
      `/sni/api/v1/inventory/items/${itemCode}`,
    );
    return response.data;
  },
  createItem: async (
    data: Omit<InventoryItem, "categoryName" | "unitName">,
  ): Promise<InventoryItem> => {
    const response = await apiClient.post("/sni/api/v1/inventory/items", data);
    return response.data;
  },
  updateItem: async (
    itemCode: string,
    data: Partial<InventoryItem>,
  ): Promise<InventoryItem> => {
    const response = await apiClient.put(
      `/sni/api/v1/inventory/items/${itemCode}`,
      data,
    );
    return response.data;
  },
  deleteItem: async (itemCode: string): Promise<void> => {
    await apiClient.delete(`/sni/api/v1/inventory/items/${itemCode}`);
  },
  activateItem: async (itemCode: string): Promise<void> => {
    await apiClient.patch(`/sni/api/v1/inventory/items/${itemCode}/activate`);
  },
  deactivateItem: async (itemCode: string): Promise<void> => {
    await apiClient.patch(`/sni/api/v1/inventory/items/${itemCode}/deactivate`);
  },

  // Emplacements
  getLocations: async (active?: boolean): Promise<InventoryLocation[]> => {
    const params = active !== undefined ? { active } : {};
    const response = await apiClient.get("/sni/api/v1/inventory/locations", {
      params,
    });
    return response.data;
  },
  createLocation: async (
    data: Omit<InventoryLocation, "locationCode">,
  ): Promise<InventoryLocation> => {
    const response = await apiClient.post(
      "/sni/api/v1/inventory/locations",
      data,
    );
    return response.data;
  },
  updateLocation: async (
    locationCode: string,
    data: Partial<InventoryLocation>,
  ): Promise<InventoryLocation> => {
    const response = await apiClient.put(
      `/sni/api/v1/inventory/locations/${locationCode}`,
      data,
    );
    return response.data;
  },
  deleteLocation: async (locationCode: string): Promise<void> => {
    await apiClient.delete(`/sni/api/v1/inventory/locations/${locationCode}`);
  },
  activateLocation: async (locationCode: string): Promise<void> => {
    await apiClient.patch(
      `/sni/api/v1/inventory/locations/${locationCode}/activate`,
    );
  },
  deactivateLocation: async (locationCode: string): Promise<void> => {
    await apiClient.patch(
      `/sni/api/v1/inventory/locations/${locationCode}/deactivate`,
    );
  },

  // Stock
  getStockLevels: async (params?: {
    itemCode?: string;
    locationCode?: string;
    belowMinimum?: boolean;
    page?: number;
    size?: number;
  }): Promise<{ data: StockLevel[]; content: StockLevel[]; pageable: any }> => {
    const response = await apiClient.get("/sni/api/v1/inventory/stock/levels", {
      params,
    });
    const raw = response.data;
    if (Array.isArray(raw?.data)) return raw;
    if (Array.isArray(raw?.content))
      return {
        data: raw.content,
        content: raw.content,
        pageable: raw.pageable,
      };
    if (Array.isArray(raw)) return { data: raw, content: raw, pageable: {} };
    return { data: [], content: [], pageable: {} };
  },
  getStockMovements: async (params?: {
    itemCode?: string;
    locationCode?: string;
    movementType?: string;
    from?: string;
    to?: string;
    page?: number;
    size?: number;
  }): Promise<{
    content: StockMovement[];
    pageable: any;
    totalElements: number;
    totalPages: number;
  }> => {
    const response = await apiClient.get(
      "/sni/api/v1/inventory/stock/movements",
      { params },
    );
    if (response.data.content) {
      return response.data;
    }
    if (response.data.data) {
      return { ...response.data, content: response.data.data };
    }
    return { content: [], pageable: {}, totalElements: 0, totalPages: 0 };
  },
  stockIn: async (data: {
    itemCode: string;
    locationCode: string;
    quantity: number;
    unitCost: number;
    lotNumber?: string;
    expiryDate?: string;
    referenceType?: string;
    referenceCode?: string;
    reason?: string;
    performedBy: string;
  }): Promise<StockMovement> => {
    const response = await apiClient.post(
      "/sni/api/v1/inventory/stock/in",
      data,
    );
    return response.data;
  },
  stockOut: async (data: {
    itemCode: string;
    locationCode: string;
    quantity: number;
    referenceType?: string;
    referenceCode?: string;
    reason?: string;
    allowNegativeOverride?: boolean;
    performedBy: string;
  }): Promise<StockMovement> => {
    const response = await apiClient.post(
      "/sni/api/v1/inventory/stock/out",
      data,
    );
    return response.data;
  },
  stockTransfer: async (data: {
    itemCode: string;
    locationFromCode: string;
    locationToCode: string;
    quantity: number;
    reason?: string;
    performedBy: string;
  }): Promise<StockMovement> => {
    const response = await apiClient.post(
      "/sni/api/v1/inventory/stock/transfer",
      data,
    );
    return response.data;
  },
  stockAdjust: async (data: {
    itemCode: string;
    locationCode: string;
    quantityDelta: number;
    reason: string;
    referenceType?: string;
    referenceCode?: string;
    performedBy: string;
  }): Promise<StockMovement> => {
    const response = await apiClient.post(
      "/sni/api/v1/inventory/stock/adjust",
      data,
    );
    return response.data;
  },
  reverseMovement: async (
    movementCode: string,
    reversedBy: string,
    reversalReason: string,
  ): Promise<void> => {
    await apiClient.post(
      `/sni/api/v1/inventory/stock/movements/${movementCode}/reverse`,
      { reversedBy, reversalReason },
    );
  },
  getStockReservations: async (params?: {
    status?: string;
    page?: number;
    size?: number;
  }): Promise<{ data: any[]; content: any[]; pageable: any }> => {
    const response = await apiClient.get(
      "/sni/api/v1/inventory/stock/reservations",
      { params },
    );
    const raw = response.data;
    if (Array.isArray(raw?.data)) return raw;
    if (Array.isArray(raw?.content))
      return {
        data: raw.content,
        content: raw.content,
        pageable: raw.pageable,
      };
    if (Array.isArray(raw)) return { data: raw, content: raw, pageable: {} };
    return { data: [], content: [], pageable: {} };
  },
  getStockLots: async (params?: {
    itemCode?: string;
    locationCode?: string;
  }): Promise<any[]> => {
    const response = await apiClient.get("/sni/api/v1/inventory/stock/lots", {
      params,
    });
    return response.data;
  },
  createStockTransferWorkflow: async (data: {
    itemCode: string;
    locationFromCode: string;
    locationToCode: string;
    quantity: number;
    reason: string;
    requestedBy: string;
  }): Promise<any> => {
    const response = await apiClient.post(
      "/sni/api/v1/inventory/stock/transfer-workflows",
      data,
    );
    return response.data;
  },

  // Fournisseurs
  getSuppliers: async (params?: {
    status?: string;
    page?: number;
    size?: number;
  }): Promise<PaginatedResponse<Supplier>> => {
    const response = await apiClient.get(
      "/sni/api/v1/inventory/procurement/suppliers",
      { params },
    );
    return response.data;
  },
  getSupplier: async (supplierCode: string): Promise<Supplier> => {
    const response = await apiClient.get(
      `/sni/api/v1/inventory/procurement/suppliers/${supplierCode}`,
    );
    return response.data;
  },
  getSupplierPerformance: async (supplierCode: string): Promise<any> => {
    const response = await apiClient.get(
      `/sni/api/v1/inventory/procurement/suppliers/${supplierCode}/performance`,
    );
    return response.data;
  },
  createSupplier: async (data: Omit<Supplier, "code">): Promise<Supplier> => {
    const response = await apiClient.post(
      "/sni/api/v1/inventory/procurement/suppliers",
      data,
    );
    return response.data;
  },
  updateSupplier: async (
    supplierCode: string,
    data: Partial<Supplier>,
  ): Promise<Supplier> => {
    const response = await apiClient.put(
      `/sni/api/v1/inventory/procurement/suppliers/${supplierCode}`,
      data,
    );
    return response.data;
  },
  deleteSupplier: async (supplierCode: string): Promise<void> => {
    await apiClient.delete(
      `/sni/api/v1/inventory/procurement/suppliers/${supplierCode}`,
    );
  },

  // Demandes d'achat
  getPurchaseRequests: async (params?: {
    status?: string;
    locationCode?: string;
    page?: number;
    size?: number;
  }): Promise<PaginatedResponse<PurchaseRequest>> => {
    const response = await apiClient.get(
      "/sni/api/v1/inventory/procurement/purchase-requests",
      { params },
    );
    return response.data;
  },

  createPurchaseRequest: async (data: {
    locationCode: string;
    requestedBy: string;
    lines: { itemCode: string; quantity: number; unitCost: number }[];
  }): Promise<PurchaseRequest> => {
    const response = await apiClient.post(
      "/sni/api/v1/inventory/procurement/purchase-requests",
      data,
    );
    return response.data;
  },
  submitPurchaseRequest: async (requestCode: string): Promise<void> => {
    await apiClient.patch(
      `/sni/api/v1/inventory/procurement/purchase-requests/${requestCode}/submit`,
    );
  },
  approvePurchaseRequest: async (
    requestCode: string,
    approvedBy: string,
  ): Promise<void> => {
    await apiClient.patch(
      `/sni/api/v1/inventory/procurement/purchase-requests/${requestCode}/approve`,
      { approvedBy },
    );
  },
  rejectPurchaseRequest: async (
    requestCode: string,
    approvedBy: string,
    rejectionReason: string,
  ): Promise<void> => {
    await apiClient.patch(
      `/sni/api/v1/inventory/procurement/purchase-requests/${requestCode}/reject`,
      { approvedBy, rejectionReason },
    );
  },

  // Bons de commande
  getPurchaseOrders: async (params?: {
    status?: string;
    supplierCode?: string;
    page?: number;
    size?: number;
  }): Promise<PaginatedResponse<PurchaseOrder>> => {
    const response = await apiClient.get(
      "/sni/api/v1/inventory/procurement/purchase-orders",
      { params },
    );
    return response.data;
  },
  createPurchaseOrder: async (data: {
    supplierCode: string;
    locationCode: string;
    sourceRequestCode?: string;
    expectedDeliveryDate?: string;
    orderedBy: string;
    lines: { itemCode: string; quantity: number; unitCost: number }[];
  }): Promise<PurchaseOrder> => {
    const response = await apiClient.post(
      "/sni/api/v1/inventory/procurement/purchase-orders",
      data,
    );
    return response.data;
  },
  approvePurchaseOrder: async (
    orderCode: string,
    approvedBy: string,
  ): Promise<void> => {
    await apiClient.patch(
      `/sni/api/v1/inventory/procurement/purchase-orders/${orderCode}/approve`,
      { approvedBy },
    );
  },
  markOrdered: async (orderCode: string, orderedBy: string): Promise<void> => {
    await apiClient.patch(
      `/sni/api/v1/inventory/procurement/purchase-orders/${orderCode}/mark-ordered`,
      { orderedBy },
    );
  },
  cancelPurchaseOrder: async (orderCode: string): Promise<void> => {
    await apiClient.patch(
      `/sni/api/v1/inventory/procurement/purchase-orders/${orderCode}/cancel`,
    );
  },

  // Approval Rules
  getApprovalRules: async (): Promise<any[]> => {
    const response = await apiClient.get(
      "/sni/api/v1/inventory/procurement/approval-rules",
    );
    return response.data;
  },

  createApprovalRule: async (rules: any[]): Promise<any[]> => {
    const response = await apiClient.post(
      "/sni/api/v1/inventory/procurement/approval-rules",
      rules,
    );
    return response.data;
  },

  updateApprovalRule: async (ruleId: number, rule: any): Promise<any> => {
    const response = await apiClient.put(
      `/sni/api/v1/inventory/procurement/approval-rules/${ruleId}`,
      rule,
    );
    return response.data;
  },

  deleteApprovalRule: async (ruleId: number): Promise<void> => {
    await apiClient.delete(
      `/sni/api/v1/inventory/procurement/approval-rules/${ruleId}`,
    );
  },

  // Purchase Orders
  getPurchaseOrderById: async (orderCode: string): Promise<PurchaseOrder> => {
    const response = await apiClient.get(
      `/sni/api/v1/inventory/procurement/purchase-orders/${orderCode}`,
    );
    return response.data;
  },

  // Goods Receipt
  createGoodsReceipt: async (data: any): Promise<any> => {
    const response = await apiClient.post(
      "/sni/api/v1/inventory/procurement/goods-receipts",
      data,
    );
    return response.data;
  },

  // Actifs
  getAssets: async (params?: {
    itemCode?: string;
    status?: string;
    locationCode?: string;
    page?: number;
    size?: number;
  }): Promise<PaginatedResponse<Asset>> => {
    const response = await apiClient.get("/sni/api/v1/inventory/assets", {
      params,
    });
    return response.data;
  },
  getAsset: async (assetCode: string): Promise<Asset> => {
    const response = await apiClient.get(
      `/sni/api/v1/inventory/assets/${assetCode}`,
    );
    return response.data;
  },
  createAsset: async (
    data: Omit<
      Asset,
      "assetCode" | "itemName" | "locationName" | "depreciatedValue"
    >,
  ): Promise<Asset> => {
    const response = await apiClient.post("/sni/api/v1/inventory/assets", data);
    return response.data;
  },
  updateAsset: async (
    assetCode: string,
    data: Partial<Asset>,
  ): Promise<Asset> => {
    const response = await apiClient.put(
      `/sni/api/v1/inventory/assets/${assetCode}`,
      data,
    );
    return response.data;
  },
  deleteAsset: async (assetCode: string): Promise<void> => {
    await apiClient.delete(`/sni/api/v1/inventory/assets/${assetCode}`);
  },
  assignAsset: async (
    assetCode: string,
    assigneeType: string,
    assigneeCode: string,
    assignedBy: string,
    notes?: string,
  ): Promise<void> => {
    await apiClient.patch(`/sni/api/v1/inventory/assets/${assetCode}/assign`, {
      assigneeType,
      assigneeCode,
      assignedBy,
      notes,
    });
  },
  returnAsset: async (
    assetCode: string,
    returnedBy: string,
    returnedToLocationCode: string,
    condition: string,
    notes?: string,
  ): Promise<void> => {
    await apiClient.patch(`/sni/api/v1/inventory/assets/${assetCode}/return`, {
      returnedBy,
      returnedToLocationCode,
      condition,
      notes,
    });
  },
  markAssetLost: async (
    assetCode: string,
    reason: string,
    reportedBy: string,
  ): Promise<void> => {
    await apiClient.patch(
      `/sni/api/v1/inventory/assets/${assetCode}/mark-lost`,
      { reason, reportedBy },
    );
  },
  // markAssetDamaged: async (assetCode: string, reason: string, reportedBy: string): Promise<void> => {
  //   await apiClient.patch(`/sni/api/v1/inventory/assets/${assetCode}/mark-damaged`, { reason, reportedBy });
  // },
  // retireAsset: async (assetCode: string, reason: string, reportedBy: string): Promise<void> => {
  //   await apiClient.patch(`/sni/api/v1/inventory/assets/${assetCode}/retire`, { reason, reportedBy });
  // },

  getAssetLocationHistory: async (assetCode: string): Promise<any[]> => {
    const response = await apiClient.get(
      `/sni/api/v1/inventory/assets/${assetCode}/location-history`,
    );
    return response.data;
  },

  createAssetMaintenance: async (data: {
    assetCode: string;
    maintenanceType: string;
    description: string;
    scheduledDate: string;
    requestedBy: string;
  }): Promise<any> => {
    const response = await apiClient.post(
      "/sni/api/v1/inventory/asset-maintenances",
      data,
    );
    return response.data;
  },

  reserveAsset: async (
    assetCode: string,
    data: { reservedFor: string; reason: string },
  ): Promise<void> => {
    await apiClient.patch(
      `/sni/api/v1/inventory/assets/${assetCode}/reserve`,
      data,
    );
  },

  markAssetDamaged: async (
    assetCode: string,
    data: { reason: string; reportedBy: string },
  ): Promise<void> => {
    await apiClient.patch(
      `/sni/api/v1/inventory/assets/${assetCode}/mark-damaged`,
      data,
    );
  },

  retireAsset: async (
    assetCode: string,
    data: { reason: string; reportedBy: string },
  ): Promise<void> => {
    await apiClient.patch(
      `/sni/api/v1/inventory/assets/${assetCode}/retire`,
      data,
    );
  },

  // Alertes
  getAlerts: async (params?: {
    status?: string;
    alertType?: string;
    page?: number;
    size?: number;
  }): Promise<PaginatedResponse<Alert>> => {
    const response = await apiClient.get("/sni/api/v1/inventory/alerts", {
      params,
    });
    return response.data;
  },
  acknowledgeAlert: async (
    alertCode: string,
    acknowledgedBy: string,
  ): Promise<void> => {
    await apiClient.patch(
      `/sni/api/v1/inventory/alerts/${alertCode}/acknowledge`,
      { acknowledgedBy },
    );
  },
  resolveAlert: async (
    alertCode: string,
    resolvedBy: string,
    resolutionNote: string,
  ): Promise<void> => {
    await apiClient.patch(`/sni/api/v1/inventory/alerts/${alertCode}/resolve`, {
      resolvedBy,
      resolutionNote,
    });
  },
  dismissAlert: async (alertCode: string): Promise<void> => {
    await apiClient.patch(`/sni/api/v1/inventory/alerts/${alertCode}/dismiss`);
  },

  // Règles de réapprovisionnement
  getReorderRules: async (params?: {
    itemCode?: string;
    active?: boolean;
  }): Promise<ReorderRule[]> => {
    const response = await apiClient.get(
      "/sni/api/v1/inventory/reorder-rules",
      { params },
    );
    return response.data;
  },
  createReorderRule: async (
    data: Omit<ReorderRule, "ruleCode" | "itemName" | "locationName">,
  ): Promise<ReorderRule> => {
    const response = await apiClient.post(
      "/sni/api/v1/inventory/reorder-rules",
      data,
    );
    return response.data;
  },
  updateReorderRule: async (
    ruleCode: string,
    data: Partial<ReorderRule>,
  ): Promise<ReorderRule> => {
    const response = await apiClient.put(
      `/sni/api/v1/inventory/reorder-rules/${ruleCode}`,
      data,
    );
    return response.data;
  },
  deleteReorderRule: async (ruleCode: string): Promise<void> => {
    await apiClient.delete(`/sni/api/v1/inventory/reorder-rules/${ruleCode}`);
  },
  getReorderSuggestions: async (): Promise<ReorderSuggestion[]> => {
    const response = await apiClient.get(
      "/sni/api/v1/inventory/reorder-rules/suggestions",
    );
    return response.data;
  },

  // Dashboard
  getDashboardMetrics: async (): Promise<any> => {
    const response = await apiClient.get(
      "/sni/api/v1/inventory/admin/dashboard",
    );
    return response.data;
  },

  // Rapports
  getMovementsReport: async (params?: {
    from?: string;
    to?: string;
    itemCode?: string;
    locationCode?: string;
  }): Promise<any> => {
    const response = await apiClient.get(
      "/sni/api/v1/inventory/admin/reports/movements",
      { params },
    );
    return response.data;
  },

  exportMovementsCSV: async (params?: {
    from?: string;
    to?: string;
  }): Promise<Blob> => {
    const response = await apiClient.get(
      "/sni/api/v1/inventory/admin/reports/movements.csv",
      { params, responseType: "blob" },
    );
    return response.data;
  },

  exportMovementsPDF: async (params?: {
    from?: string;
    to?: string;
  }): Promise<Blob> => {
    const response = await apiClient.get(
      "/sni/api/v1/inventory/admin/reports/movements.pdf",
      { params, responseType: "blob" },
    );
    return response.data;
  },

  getAnomaliesReport: async (): Promise<any> => {
    const response = await apiClient.get(
      "/sni/api/v1/inventory/admin/reports/anomalies",
    );
    return response.data;
  },

  // Import
  importItems: async (formData: FormData): Promise<any> => {
    const response = await apiClient.post(
      "/sni/api/v1/inventory/import/items",
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      },
    );
    return response.data;
  },

  importAssets: async (formData: FormData): Promise<any> => {
    const response = await apiClient.post(
      "/sni/api/v1/inventory/import/assets",
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      },
    );
    return response.data;
  },

  importStock: async (formData: FormData): Promise<any> => {
    const response = await apiClient.post(
      "/sni/api/v1/inventory/import/stock",
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      },
    );
    return response.data;
  },

  downloadTemplate: async (type: string): Promise<Blob> => {
    const response = await apiClient.get(
      `/sni/api/v1/inventory/import/template/${type}`,
      { responseType: "blob" },
    );
    return response.data;
  },

  // Inventory Counts
  getInventoryCounts: async (params?: {
    status?: string;
    page?: number;
    size?: number;
  }): Promise<PaginatedResponse<any>> => {
    const response = await apiClient.get("/sni/api/v1/inventory/counts", {
      params,
    });
    return response.data;
  },

  getInventoryCount: async (countCode: string): Promise<any> => {
    const response = await apiClient.get(
      `/sni/api/v1/inventory/counts/${countCode}`,
    );
    return response.data;
  },

  createInventoryCount: async (data: {
    locationCode: string;
    createdBy: string;
    notes?: string;
  }): Promise<any> => {
    const response = await apiClient.post("/sni/api/v1/inventory/counts", data);
    return response.data;
  },

  startInventoryCount: async (countCode: string): Promise<void> => {
    await apiClient.patch(`/sni/api/v1/inventory/counts/${countCode}/start`);
  },

  saveInventoryCountLine: async (
    countCode: string,
    itemCode: string,
    countedQuantity: number,
  ): Promise<void> => {
    await apiClient.put(`/sni/api/v1/inventory/counts/${countCode}/lines`, {
      itemCode,
      countedQuantity,
    });
  },

  reviewInventoryCount: async (countCode: string): Promise<void> => {
    await apiClient.patch(`/sni/api/v1/inventory/counts/${countCode}/review`);
  },

  validateInventoryCount: async (countCode: string): Promise<void> => {
    await apiClient.patch(`/sni/api/v1/inventory/counts/${countCode}/validate`);
  },

  cancelInventoryCount: async (countCode: string): Promise<void> => {
    await apiClient.patch(`/sni/api/v1/inventory/counts/${countCode}/cancel`);
  },

  // Générer une étiquette unitaire
  getLabel: async (
    type: "item" | "asset" | "location",
    code: string,
  ): Promise<{
    labelType: string;
    code: string;
    displayText: string;
    barcodeValue: string;
    qrValue: string;
  }> => {
    const response = await apiClient.get(
      `/sni/api/v1/inventory/admin/labels/${type}/${code}`,
    );
    return response.data;
  },

  // Générer des étiquettes en lot
  generateLabels: async (
    items: Array<{ type: "item" | "asset" | "location"; code: string }>,
  ): Promise<
    Array<{
      labelType: string;
      code: string;
      displayText: string;
      barcodeValue: string;
      qrValue: string;
    }>
  > => {
    const response = await apiClient.post(
      "/sni/api/v1/inventory/admin/labels",
      { items },
    );
    return response.data;
  },

  // Transformer une demande d'achat approuvée en bon de commande
  createPurchaseOrderFromRequest: async (
    requestCode: string,
    supplierCode: string,
  ): Promise<PurchaseOrder> => {
    const response = await apiClient.post(
      `/sni/api/v1/inventory/procurement/purchase-requests/${requestCode}/purchase-order?supplierCode=${supplierCode}`,
    );
    return response.data;
  },

  // Créer une demande d'achat depuis les suggestions de réapprovisionnement
  createPurchaseRequestFromReorderSuggestions: async (data: {
    locationCode: string;
    supplierCode: string;
    requestedBy: string;
  }): Promise<PurchaseRequest> => {
    const response = await apiClient.post(
      "/sni/api/v1/inventory/procurement/purchase-requests/from-reorder-suggestions",
      data,
    );
    return response.data;
  },
};
