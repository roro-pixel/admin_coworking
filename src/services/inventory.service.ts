import { apiClient } from "./api";

// ==================== HELPERS ====================
export interface PaginatedResponse<T> {
  content: T[];
  data?: T[];
  pageable?: any;
  totalElements: number;
  totalPages: number;
  size?: number;
  number?: number;
  first?: boolean;
  last?: boolean;
  empty?: boolean;
  sort?: any;
  numberOfElements?: number;
}

const toPage = <T>(raw: any): PaginatedResponse<T> => {
  if (Array.isArray(raw?.content)) return { ...raw, data: raw.content };
  if (Array.isArray(raw?.data)) {
    return {
      ...raw,
      content: raw.data,
      data: raw.data,
      totalElements:
        raw.pageable?.totalElements ?? raw.totalElements ?? raw.data.length,
      totalPages: raw.pageable?.totalPages ?? raw.totalPages ?? 1,
    };
  }
  if (Array.isArray(raw))
    return {
      content: raw,
      data: raw,
      totalElements: raw.length,
      totalPages: 1,
    };
  return { content: [], data: [], totalElements: 0, totalPages: 0 };
};

const toList = <T>(raw: any): T[] => {
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.content)) return raw.content;
  if (Array.isArray(raw?.data)) return raw.data;
  return [];
};

const normPurchaseRequest = (pr: any): PurchaseRequest =>
  pr && Array.isArray(pr.lines)
    ? {
        ...pr,
        lines: pr.lines.map((l: any) => ({
          ...l,
          quantity: l.quantity ?? l.orderedQuantity ?? 0,
        })),
      }
    : pr;

const blob = async (url: string, params?: any): Promise<Blob> =>
  (await apiClient.get(url, { params, responseType: "blob" })).data;

// ==================== TYPES ====================
export type InventoryItemType =
  | "CONSUMABLE"
  | "ASSET"
  | "SERVICE"
  | "SPARE_PART";
export type InventoryTrackingType = "NONE" | "LOT" | "SERIAL";
export type StockMovementType =
  | "IN"
  | "OUT"
  | "TRANSFER"
  | "ADJUSTMENT_IN"
  | "ADJUSTMENT_OUT";
export type StockOutReasonCode =
  | "CONSUMPTION"
  | "DAMAGE"
  | "LOSS"
  | "INTERNAL_USE"
  | "SAMPLE"
  | "DONATION"
  | "OTHER";
export type ConsumptionTrend = "RISING" | "STABLE" | "FALLING";
export type InventorySerialStatus =
  | "AVAILABLE"
  | "ISSUED"
  | "TRANSFERRED"
  | "LOST"
  | "DAMAGED";
export type AssetStatus =
  | "AVAILABLE"
  | "RESERVED"
  | "ASSIGNED"
  | "IN_USE"
  | "IN_MAINTENANCE"
  | "LOST"
  | "RETIRED"
  | "DAMAGED";

export interface InventoryCategory {
  code?: string;
  categoryCode?: string;
  name: string;
  description?: string;
  itemCount?: number;
  active?: boolean;
  parentCategoryCode?: string;
  parentCategoryName?: string;
}

export interface InventoryUnit {
  code?: string;
  unitCode?: string;
  name: string;
  unitType: "COUNT" | "WEIGHT" | "VOLUME" | "LENGTH" | string;
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
  itemType: InventoryItemType;
  trackingType: InventoryTrackingType;
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
  locationFromCode?: string | null;
  locationToCode?: string | null;
  movementType: StockMovementType;
  quantity: number;
  unitCost?: number;
  totalCost?: number;
  referenceType?: string;
  referenceCode?: string;
  reason?: string;
  reasonCode?: StockOutReasonCode | string | null;
  reasonDetails?: string;
  lots?: any[];
  performedBy: string;
  performedAt: string;
  reversed: boolean;
}

export interface StockLot {
  lotCode: string;
  itemCode: string;
  itemName?: string;
  locationCode: string;
  lotNumber: string;
  expiryDate?: string;
  quantityOnHand: number;
  quantityReserved: number;
  quantityAvailable: number;
  averageCost?: number;
  status: string;
}

export interface InventoryItemSerial {
  itemCode: string;
  locationCode: string;
  serialNumber: string;
  status: InventorySerialStatus;
  lotNumber?: string;
  receivedAt?: string;
  issuedAt?: string | null;
}

export interface StockReservation {
  reservationCode: string;
  itemCode: string;
  itemName?: string;
  locationCode: string;
  locationName?: string;
  quantity: number;
  status: "ACTIVE" | "CONSUMED" | "RELEASED" | string;
  referenceType?: string;
  referenceCode?: string;
  reason?: string;
  reservedBy?: string;
  createdAt?: string;
}

export interface StockTransferWorkflow {
  transferCode: string;
  itemCode: string;
  locationFromCode: string;
  locationToCode: string;
  quantity: number;
  status: string;
  requestedBy?: string;
  approvedBy?: string;
  createdAt?: string;
}

export interface Supplier {
  code?: string;
  supplierCode?: string;
  name: string;
  email?: string;
  phone?: string;
  taxId?: string;
  address?: string;
  status: "ACTIVE" | "INACTIVE" | "BLACKLISTED";
}

export interface SupplierPerformance {
  supplierCode: string;
  supplierName?: string;
  orderCount?: number;
  totalAmount?: number;
  averageLeadTimeDays?: number;
  onTimeDeliveryRate?: number;
  defectRate?: number;
  totalOrders?: number;
  completedOrders?: number;
  cancelledOrders?: number;
  pendingOrders?: number;
  totalReceipts?: number;
  qualityAcceptanceRate?: number;
  averageDeliveryDelayDays?: number;
  averageUnitCost?: number;
}

export interface PurchaseRequestLine {
  itemCode: string;
  itemName?: string;
  /** Normalisé par le service : le backend renvoie `orderedQuantity`, la création attend `quantity`. */
  quantity: number;
  orderedQuantity?: number;
  unitCost: number;
  totalCost?: number;
}

export interface PurchaseRequest {
  requestCode: string;
  locationCode: string;
  locationName?: string;
  status:
    | "DRAFT"
    | "SUBMITTED"
    | "APPROVED"
    | "REJECTED"
    | "CONVERTED"
    | string;
  requestedBy: string;
  approvedBy?: string;
  rejectionReason?: string;
  supplierCode?: string;
  autoCreatedOrderCode?: string;
  createdAt: string;
  lines: PurchaseRequestLine[];
}

export interface PurchaseOrderLine {
  itemCode: string;
  itemName?: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

export interface PurchaseApprovalStep {
  approvalLevel?: string;
  approvedBy?: string;
  approvedAt?: string;
  [key: string]: any;
}

export interface PurchaseOrder {
  orderCode: string;
  supplierCode: string;
  supplierName?: string;
  locationCode: string;
  sourceRequestCode?: string;
  status:
    | "DRAFT"
    | "PENDING_APPROVAL"
    | "APPROVED"
    | "ORDERED"
    | "PARTIALLY_RECEIVED"
    | "RECEIVED"
    | "CANCELLED"
    | string;
  approvalLevel?: "NONE" | "MANAGER" | "DIRECTOR" | "FINANCE" | string;
  approvedBy?: string;
  approvedAt?: string;
  totalAmount: number;
  expectedDeliveryDate?: string;
  orderedBy?: string;
  createdAt: string;
  lines: PurchaseOrderLine[];
  approvalSteps?: PurchaseApprovalStep[];
}

export interface GoodsReceipt {
  receiptCode: string;
  orderCode?: string;
  supplierCode?: string;
  locationCode: string;
  status: string;
  receivedBy: string;
  receivedAt: string;
  lines?: any[];
}

export interface Asset {
  assetCode: string;
  itemCode: string;
  itemName?: string;
  serialNumber?: string;
  assetTag?: string;
  status: AssetStatus;
  condition: "NEW" | "GOOD" | "FAIR" | "POOR" | "DAMAGED";
  locationCode: string;
  locationName?: string;
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

export interface AssetMaintenance {
  maintenanceCode?: string;
  assetCode: string;
  maintenanceType?: string;
  status?: string;
  description?: string;
  scheduledAt?: string;
  scheduledDate?: string;
  completedAt?: string;
  requestedBy?: string;
  cost?: number;
  notes?: string;
}

export interface AssetAssignment {
  assignmentId: number;
  assetCode: string;
  assigneeType: string;
  assigneeCode: string;
  expectedReturnAt: string;
  assignedBy: string;
  purpose: string;
  assignedAt: string;
  returnedAt?: string;
}

export interface Alert {
  alertCode: string;
  alertType:
    | "LOW_STOCK"
    | "RECURRING_LOW_STOCK"
    | "OUT_OF_STOCK"
    | "NEGATIVE_STOCK"
    | "OVERSTOCK"
    | "SLOW_MOVING"
    | "EXPIRY_SOON"
    | "EXPIRY_IMMINENT"
    | "WARRANTY_SOON"
    | "MAINTENANCE_DUE"
    | "ASSET_RETURN_DUE_SOON"
    | "ASSET_RETURN_OVERDUE"
    | "SUSPICIOUS_ADJUSTMENT"
    | string;
  status: "OPEN" | "ACKNOWLEDGED" | "RESOLVED" | "DISMISSED" | string;
  itemCode?: string;
  itemName?: string;
  locationCode?: string;
  locationName?: string;
  assetCode?: string;
  currentQuantity?: number;
  thresholdQuantity?: number;
  message: string;
  createdAt: string;
  acknowledgedAt?: string | null;
  resolvedAt?: string | null;
}

export interface ReorderRule {
  ruleCode: string;
  itemCode: string;
  itemName?: string;
  locationCode: string;
  locationName?: string;
  minimumQuantity: number;
  reorderQuantity: number;
  active: boolean;
}

export interface ReorderSuggestion {
  itemCode: string;
  itemName?: string;
  itemType?: string;
  categoryCode?: string;
  categoryName?: string;
  unitCode?: string;
  unitName?: string;
  locationCode: string;
  locationName?: string;
  ruleScope?: string;
  currentQuantity: number;
  quantityOnHand?: number;
  quantityReserved?: number;
  minQuantity?: number;
  maxQuantity?: number;
  /** Quantité à commander, nette des commandes en cours. */
  reorderQuantity: number;
  targetQuantity?: number;
  shortageQuantity?: number;
  estimatedUnitCost?: number;
  estimatedOrderCost?: number;
  preferredSupplierCode?: string;
  severity?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | string;
  reasonCode?: string;
  reason?: string;
  priorityScore?: number;
  consumptionRateLast30Days?: number;
  consumptionRatePrev30Days?: number;
  consumptionTrend?: ConsumptionTrend | string;
  consumptionTrendPercent?: number | null;
  daysOfStockRemaining?: number | null;
  quantityOnOrder?: number | null;
  recommendedOrderByDate?: string;
  bestSupplierCode?: string;
  bestSupplierPrice?: number;
  bestSupplierLeadTimeDays?: number;
}

export interface InventoryCount {
  countCode: string;
  locationCode: string;
  status: string;
  startedBy?: string;
  reviewedBy?: string;
  createdBy?: string;
  createdAt?: string;
  notes?: string;
  lines?: any[];
  items?: any[];
}

export interface CreatePurchaseOrderLineRequest {
  itemCode: string;
  quantity: number;
  unitCost: number;
}

export interface CreatePurchaseOrderRequest {
  supplierCode: string;
  locationCode: string;
  sourceRequestCode?: string;
  expectedDeliveryDate?: string;
  orderedBy: string;
  lines: CreatePurchaseOrderLineRequest[];
}

export interface CreatePurchaseRequestFromReorderSuggestionsParams {
  locationCode: string;
  supplierCode?: string;
  requestedBy: string;
}

export interface GenerateInventoryLabelsRequest {
  items: Array<{
    type: "item" | "asset" | "location" | "lot" | string;
    code: string;
  }>;
}

export interface InventoryImportRow {
  rowNumber: number;
  status: "SUCCESS" | "ERROR" | "WARNING" | string;
  message?: string;
  data?: Record<string, any>;
}

export interface InventoryImportResult {
  importType?: string;
  fileName?: string;
  dryRun?: boolean;
  totalRows?: number;
  successCount?: number;
  errorCount?: number;
  rows?: InventoryImportRow[];
}

export interface InventoryLabel {
  labelType: string;
  code: string;
  displayText: string;
  barcodeValue: string;
  qrValue: string;
}

export interface InventoryDashboardMetrics {
  openAlerts?: number;
  lowStockAlerts?: number;
  outOfStockAlerts?: number;
  negativeStockAlerts?: number;
  expirySoonAlerts?: number;
  expiringLots30Days?: number;
  outOfStockLevels?: number;
  openPurchaseOrders?: number;
  totalStockValue?: number;
  [key: string]: any;
}

// ==================== SERVICE ====================
export const inventoryService = {
  // ---------- Catalogue / categories ----------
  getCategories: async (): Promise<InventoryCategory[]> =>
    toList<InventoryCategory>(
      (await apiClient.get("/sni/api/v1/inventory/categories")).data,
    ),
  getCategory: async (categoryCode: string): Promise<InventoryCategory> =>
    (await apiClient.get(`/sni/api/v1/inventory/categories/${categoryCode}`))
      .data,
  createCategory: async (
    data: Partial<InventoryCategory>,
  ): Promise<InventoryCategory> =>
    (await apiClient.post("/sni/api/v1/inventory/categories", data)).data,
  updateCategory: async (
    categoryCode: string,
    data: Partial<InventoryCategory>,
  ): Promise<InventoryCategory> =>
    (
      await apiClient.put(
        `/sni/api/v1/inventory/categories/${categoryCode}`,
        data,
      )
    ).data,
  deleteCategory: async (categoryCode: string): Promise<void> => {
    await apiClient.delete(`/sni/api/v1/inventory/categories/${categoryCode}`);
  },

  // ---------- Units ----------
  getUnits: async (): Promise<InventoryUnit[]> =>
    toList<InventoryUnit>(
      (await apiClient.get("/sni/api/v1/inventory/units")).data,
    ),
  getUnit: async (unitCode: string): Promise<InventoryUnit> =>
    (await apiClient.get(`/sni/api/v1/inventory/units/${unitCode}`)).data,
  createUnit: async (data: Partial<InventoryUnit>): Promise<InventoryUnit> =>
    (await apiClient.post("/sni/api/v1/inventory/units", data)).data,
  updateUnit: async (
    unitCode: string,
    data: Partial<InventoryUnit>,
  ): Promise<InventoryUnit> =>
    (await apiClient.put(`/sni/api/v1/inventory/units/${unitCode}`, data)).data,
  deleteUnit: async (unitCode: string): Promise<void> => {
    await apiClient.delete(`/sni/api/v1/inventory/units/${unitCode}`);
  },

  // ---------- Items ----------
  getItems: async (params?: {
    query?: string;
    categoryCode?: string;
    itemType?: string;
    active?: boolean;
    page?: number;
    size?: number;
    sort?: string;
  }): Promise<PaginatedResponse<InventoryItem>> =>
    toPage<InventoryItem>(
      (await apiClient.get("/sni/api/v1/inventory/items", { params })).data,
    ),
  searchItems: async (
    query: string,
    params?: {
      categoryCode?: string;
      itemType?: string;
      active?: boolean;
      size?: number;
    },
  ): Promise<InventoryItem[]> =>
    toPage<InventoryItem>(
      (
        await apiClient.get("/sni/api/v1/inventory/items", {
          params: { ...params, query, size: params?.size ?? 20 },
        })
      ).data,
    ).content,
  getItem: async (itemCode: string): Promise<InventoryItem> =>
    (await apiClient.get(`/sni/api/v1/inventory/items/${itemCode}`)).data,
  createItem: async (data: Partial<InventoryItem>): Promise<InventoryItem> =>
    (await apiClient.post("/sni/api/v1/inventory/items", data)).data,
  updateItem: async (
    itemCode: string,
    data: Partial<InventoryItem>,
  ): Promise<InventoryItem> =>
    (await apiClient.put(`/sni/api/v1/inventory/items/${itemCode}`, data)).data,
  deleteItem: async (itemCode: string): Promise<void> => {
    await apiClient.delete(`/sni/api/v1/inventory/items/${itemCode}`);
  },
  activateItem: async (itemCode: string): Promise<void> => {
    await apiClient.patch(`/sni/api/v1/inventory/items/${itemCode}/activate`);
  },
  deactivateItem: async (itemCode: string): Promise<void> => {
    await apiClient.patch(`/sni/api/v1/inventory/items/${itemCode}/deactivate`);
  },

  // ---------- Locations ----------
  getLocations: async (active?: boolean): Promise<InventoryLocation[]> =>
    toList<InventoryLocation>(
      (
        await apiClient.get("/sni/api/v1/inventory/locations", {
          params: active !== undefined ? { active } : undefined,
        })
      ).data,
    ),
  getLocation: async (locationCode: string): Promise<InventoryLocation> =>
    (await apiClient.get(`/sni/api/v1/inventory/locations/${locationCode}`))
      .data,
  createLocation: async (
    data: Partial<InventoryLocation>,
  ): Promise<InventoryLocation> =>
    (await apiClient.post("/sni/api/v1/inventory/locations", data)).data,
  updateLocation: async (
    locationCode: string,
    data: Partial<InventoryLocation>,
  ): Promise<InventoryLocation> =>
    (
      await apiClient.put(
        `/sni/api/v1/inventory/locations/${locationCode}`,
        data,
      )
    ).data,
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

  // ---------- Stock levels / movements ----------
  getStockLevels: async (params?: {
    itemCode?: string;
    locationCode?: string;
    belowMinimum?: boolean;
    page?: number;
    size?: number;
    sort?: string;
  }): Promise<PaginatedResponse<StockLevel>> =>
    toPage<StockLevel>(
      (await apiClient.get("/sni/api/v1/inventory/stock/levels", { params }))
        .data,
    ),

  // Les dates sont envoyées sous les deux noms (from/to et fromDate/toDate).
  getStockMovements: async (params?: {
    itemCode?: string;
    locationCode?: string;
    movementType?: string;
    referenceType?: string;
    referenceCode?: string;
    from?: string;
    to?: string;
    fromDate?: string;
    toDate?: string;
    reversed?: boolean;
    page?: number;
    size?: number;
    sort?: string;
  }): Promise<PaginatedResponse<StockMovement>> => {
    const { fromDate, toDate, ...rest } = params || {};
    return toPage<StockMovement>(
      (
        await apiClient.get("/sni/api/v1/inventory/stock/movements", {
          params: {
            ...rest,
            from: rest.from ?? fromDate,
            to: rest.to ?? toDate,
            fromDate: fromDate ?? rest.from,
            toDate: toDate ?? rest.to,
          },
        })
      ).data,
    );
  },

  stockIn: async (data: {
    itemCode: string;
    locationCode: string;
    quantity: number;
    unitCost: number;
    lotNumber?: string;
    expiryDate?: string | null;
    quarantined?: boolean;
    ownershipType?: string;
    assetSerialNumbers?: string[];
    referenceType?: string;
    referenceCode?: string;
    reason?: string;
    reasonDetails?: string;
    performedBy: string;
  }): Promise<StockMovement> => {
    const { reason, ...rest } = data;
    const payload = { ...rest, reasonDetails: data.reasonDetails ?? reason };
    return (await apiClient.post("/sni/api/v1/inventory/stock/in", payload))
      .data;
  },

  stockOut: async (data: {
    itemCode: string;
    locationCode: string;
    quantity: number;
    reasonCode: StockOutReasonCode | string;
    reasonDetails?: string;
    reason?: string;
    referenceType?: string;
    referenceCode?: string;
    allowNegativeOverride?: boolean;
    performedBy: string;
    lotNumber?: string;
    confirmCreateLot?: boolean;
    serialNumbers?: string[];
  }): Promise<StockMovement> => {
    const { reason, ...rest } = data;
    const payload = { ...rest, reasonDetails: data.reasonDetails ?? reason };
    return (await apiClient.post("/sni/api/v1/inventory/stock/out", payload))
      .data;
  },

  stockTransfer: async (data: {
    itemCode: string;
    locationFromCode: string;
    locationToCode: string;
    quantity: number;
    reasonCode: StockOutReasonCode | string;
    reasonDetails?: string;
    reason?: string;
    performedBy: string;
    lotNumber?: string | null;
    confirmCreateLot?: boolean;
    serialNumbers?: string[];
  }): Promise<StockMovement> => {
    const { reason, ...rest } = data;
    const payload = { ...rest, reasonDetails: data.reasonDetails ?? reason };
    return (
      await apiClient.post("/sni/api/v1/inventory/stock/transfer", payload)
    ).data;
  },

  stockAdjust: async (data: {
    itemCode: string;
    locationCode: string;
    quantityDelta: number;
    reasonCode?: StockOutReasonCode | string;
    reasonDetails?: string;
    reason?: string;
    referenceType?: string;
    referenceCode?: string;
    performedBy: string;
  }): Promise<StockMovement> => {
    const { reason, ...rest } = data;
    const payload = { ...rest, reasonDetails: data.reasonDetails ?? reason };
    return (await apiClient.post("/sni/api/v1/inventory/stock/adjust", payload))
      .data;
  },

  reverseMovement: async (
    movementCode: string,
    reversedBy: string,
    reversalReason: string,
  ): Promise<StockMovement> =>
    (
      await apiClient.post(
        `/sni/api/v1/inventory/stock/movements/${movementCode}/reverse`,
        { reversedBy, reversalReason },
      )
    ).data,

  // ---------- Reservations ----------
  createStockReservation: async (data: {
    itemCode: string;
    locationCode: string;
    quantity: number;
    referenceType?: string;
    referenceCode?: string;
    reason?: string;
    reservedBy: string;
  }): Promise<StockReservation> =>
    (await apiClient.post("/sni/api/v1/inventory/stock/reservations", data))
      .data,
  getStockReservations: async (params?: {
    itemCode?: string;
    status?: string;
    page?: number;
    size?: number;
    sort?: string;
  }): Promise<PaginatedResponse<StockReservation>> =>
    toPage<StockReservation>(
      (
        await apiClient.get("/sni/api/v1/inventory/stock/reservations", {
          params,
        })
      ).data,
    ),
  releaseStockReservation: async (
    reservationCode: string,
  ): Promise<StockReservation> =>
    (
      await apiClient.patch(
        `/sni/api/v1/inventory/stock/reservations/${reservationCode}/release`,
      )
    ).data,
  consumeStockReservation: async (
    reservationCode: string,
  ): Promise<StockReservation> =>
    (
      await apiClient.patch(
        `/sni/api/v1/inventory/stock/reservations/${reservationCode}/consume`,
      )
    ).data,

  // ---------- Lots / serials ----------
  getItemLots: async (
    itemCode: string,
    params?: { locationCode?: string; activeOnly?: boolean },
  ): Promise<StockLot[]> =>
    toList<StockLot>(
      (
        await apiClient.get(`/sni/api/v1/inventory/items/${itemCode}/lots`, {
          params,
        })
      ).data,
    ),
  createItemLot: async (
    itemCode: string,
    data: {
      locationCode: string;
      lotNumber: string;
      expiryDate?: string;
      initialQuantity?: number;
      ownershipType?: string;
    },
  ): Promise<StockLot> =>
    (await apiClient.post(`/sni/api/v1/inventory/items/${itemCode}/lots`, data))
      .data,
  getStockLots: async (params?: {
    itemCode?: string;
    locationCode?: string;
    page?: number;
    size?: number;
  }): Promise<PaginatedResponse<StockLot>> =>
    toPage<StockLot>(
      (await apiClient.get("/sni/api/v1/inventory/stock/lots", { params }))
        .data,
    ),
  getItemSerials: async (
    itemCode: string,
    params?: { locationCode?: string; status?: InventorySerialStatus | string },
  ): Promise<InventoryItemSerial[]> =>
    toList<InventoryItemSerial>(
      (
        await apiClient.get(`/sni/api/v1/inventory/items/${itemCode}/serials`, {
          params,
        })
      ).data,
    ),

  // ---------- Transfer workflow ----------
  createStockTransferWorkflow: async (
    data: any,
  ): Promise<StockTransferWorkflow> =>
    (await apiClient.post("/sni/api/v1/inventory/stock/transfers", data)).data,
  getStockTransferWorkflows: async (
    params?: any,
  ): Promise<PaginatedResponse<StockTransferWorkflow>> =>
    toPage<StockTransferWorkflow>(
      (await apiClient.get("/sni/api/v1/inventory/stock/transfers", { params }))
        .data,
    ),
  approveStockTransferWorkflow: async (
    transferCode: string,
    data: { approvedBy: string; note?: string },
  ): Promise<StockTransferWorkflow> =>
    (
      await apiClient.patch(
        `/sni/api/v1/inventory/stock/transfers/${transferCode}/approve`,
        null,
        { params: { approvedBy: data.approvedBy } },
      )
    ).data,
  shipStockTransferWorkflow: async (
    transferCode: string,
    data: { shippedBy: string },
  ): Promise<StockTransferWorkflow> =>
    (
      await apiClient.patch(
        `/sni/api/v1/inventory/stock/transfers/${transferCode}/ship`,
        null,
        { params: { shippedBy: data.shippedBy } },
      )
    ).data,
  rejectStockTransferWorkflow: async (
    transferCode: string,
    data: { rejectedBy: string; reason: string },
  ): Promise<StockTransferWorkflow> =>
    (
      await apiClient.patch(
        `/sni/api/v1/inventory/stock/transfers/${transferCode}/cancel`,
        null,
        { params: { cancelledBy: data.rejectedBy, reason: data.reason } },
      )
    ).data,
  executeStockTransferWorkflow: async (
    transferCode: string,
    data: { performedBy: string },
  ): Promise<StockTransferWorkflow> =>
    (
      await apiClient.patch(
        `/sni/api/v1/inventory/stock/transfers/${transferCode}/receive`,
        null,
        { params: { receivedBy: data.performedBy } },
      )
    ).data,

  // ---------- Suppliers ----------
  getSuppliers: async (params?: {
    query?: string;
    status?: string;
    page?: number;
    size?: number;
  }): Promise<PaginatedResponse<Supplier>> =>
    toPage<Supplier>(
      (
        await apiClient.get("/sni/api/v1/inventory/procurement/suppliers", {
          params,
        })
      ).data,
    ),
  // Recherche côté client : le backend ne filtre pas sur un texte.
  searchSuppliers: async (query: string): Promise<Supplier[]> => {
    const page = toPage<Supplier>(
      (
        await apiClient.get("/sni/api/v1/inventory/procurement/suppliers", {
          params: { size: 100 },
        })
      ).data,
    );
    const q = query.toLowerCase();
    return page.content.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.code ?? s.supplierCode ?? "").toLowerCase().includes(q),
    );
  },
  getSupplier: async (supplierCode: string): Promise<Supplier> =>
    (
      await apiClient.get(
        `/sni/api/v1/inventory/procurement/suppliers/${supplierCode}`,
      )
    ).data,
  getSupplierPerformance: async (
    supplierCode: string,
    params?: any,
  ): Promise<SupplierPerformance> =>
    (
      await apiClient.get(
        `/sni/api/v1/inventory/procurement/suppliers/${supplierCode}/performance`,
        { params },
      )
    ).data,
  createSupplier: async (data: Partial<Supplier>): Promise<Supplier> =>
    (await apiClient.post("/sni/api/v1/inventory/procurement/suppliers", data))
      .data,
  updateSupplier: async (
    supplierCode: string,
    data: Partial<Supplier>,
  ): Promise<Supplier> =>
    (
      await apiClient.put(
        `/sni/api/v1/inventory/procurement/suppliers/${supplierCode}`,
        data,
      )
    ).data,
  deleteSupplier: async (supplierCode: string): Promise<void> => {
    await apiClient.delete(
      `/sni/api/v1/inventory/procurement/suppliers/${supplierCode}`,
    );
  },

  // ---------- Purchase requests ----------
  getPurchaseRequests: async (
    params?: any,
  ): Promise<PaginatedResponse<PurchaseRequest>> => {
    const page = toPage<PurchaseRequest>(
      (
        await apiClient.get(
          "/sni/api/v1/inventory/procurement/purchase-requests",
          { params },
        )
      ).data,
    );
    const content = page.content.map(normPurchaseRequest);
    return { ...page, content, data: content };
  },
  createPurchaseRequest: async (
    data: Partial<PurchaseRequest>,
  ): Promise<PurchaseRequest> =>
    normPurchaseRequest(
      (
        await apiClient.post(
          "/sni/api/v1/inventory/procurement/purchase-requests",
          data,
        )
      ).data,
    ),
  submitPurchaseRequest: async (
    requestCode: string,
  ): Promise<PurchaseRequest> =>
    normPurchaseRequest(
      (
        await apiClient.patch(
          `/sni/api/v1/inventory/procurement/purchase-requests/${requestCode}/submit`,
        )
      ).data,
    ),
  // approvedBy et supplierCode passent en paramètres de requête.
  approvePurchaseRequest: async (
    requestCode: string,
    approvedByOrData:
      | string
      | { approvedBy?: string; supplierCode?: string },
    supplierCode?: string,
  ): Promise<PurchaseRequest> => {
    const approvedBy =
      typeof approvedByOrData === "string"
        ? approvedByOrData
        : approvedByOrData.approvedBy;
    const finalSupplierCode =
      supplierCode ??
      (typeof approvedByOrData === "object"
        ? approvedByOrData.supplierCode
        : undefined);
    return (
      await apiClient.patch(
        `/sni/api/v1/inventory/procurement/purchase-requests/${requestCode}/approve`,
        null,
        { params: { approvedBy, supplierCode: finalSupplierCode } },
      )
    ).data;
  },
  // L'acteur du rejet est envoyé sous le nom approvedBy.
  rejectPurchaseRequest: async (
    requestCode: string,
    rejectedByOrReason: string,
    reasonMaybe?: string,
  ): Promise<PurchaseRequest> =>
    (
      await apiClient.patch(
        `/sni/api/v1/inventory/procurement/purchase-requests/${requestCode}/reject`,
        {
          approvedBy: reasonMaybe ? rejectedByOrReason : undefined,
          rejectionReason: reasonMaybe ?? rejectedByOrReason,
        },
      )
    ).data,
  // Crée un bon de commande à partir d'une demande d'achat.
  createPurchaseOrderFromRequest: async (
    requestCode: string,
    data: {
      supplierCode?: string;
      expectedDeliveryDate?: string;
      orderedBy?: string;
    },
  ): Promise<PurchaseOrder> =>
    (
      await apiClient.post(
        `/sni/api/v1/inventory/procurement/purchase-requests/${requestCode}/purchase-order`,
        data,
      )
    ).data,
  createPurchaseRequestFromReorderSuggestions: async (
    params: CreatePurchaseRequestFromReorderSuggestionsParams,
  ): Promise<PurchaseRequest> =>
    (
      await apiClient.post(
        "/sni/api/v1/inventory/procurement/purchase-requests/from-reorder-suggestions",
        null,
        { params },
      )
    ).data,

  // ---------- Purchase orders / receipts ----------
  getPurchaseOrders: async (
    params?: any,
  ): Promise<PaginatedResponse<PurchaseOrder>> =>
    toPage<PurchaseOrder>(
      (
        await apiClient.get(
          "/sni/api/v1/inventory/procurement/purchase-orders",
          { params },
        )
      ).data,
    ),
  getPurchaseOrderById: async (orderCode: string): Promise<PurchaseOrder> =>
    (
      await apiClient.get(
        `/sni/api/v1/inventory/procurement/purchase-orders/${orderCode}`,
      )
    ).data,
  createPurchaseOrder: async (
    data: CreatePurchaseOrderRequest,
  ): Promise<PurchaseOrder> =>
    (
      await apiClient.post(
        "/sni/api/v1/inventory/procurement/purchase-orders",
        data,
      )
    ).data,
  approvePurchaseOrder: async (
    orderCode: string,
    approvedByOrData: string | any,
  ): Promise<PurchaseOrder> =>
    (
      await apiClient.patch(
        `/sni/api/v1/inventory/procurement/purchase-orders/${orderCode}/approve`,
        typeof approvedByOrData === "string"
          ? { approvedBy: approvedByOrData }
          : approvedByOrData,
      )
    ).data,
  markOrdered: async (
    orderCode: string,
    orderedBy?: string,
  ): Promise<PurchaseOrder> =>
    (
      await apiClient.patch(
        `/sni/api/v1/inventory/procurement/purchase-orders/${orderCode}/mark-ordered`,
        orderedBy ? { orderedBy } : undefined,
      )
    ).data,
  cancelPurchaseOrder: async (
    orderCode: string,
    reason?: string,
  ): Promise<PurchaseOrder> =>
    (
      await apiClient.patch(
        `/sni/api/v1/inventory/procurement/purchase-orders/${orderCode}/cancel`,
        { reason },
      )
    ).data,
  createGoodsReceipt: async (data: any): Promise<GoodsReceipt> =>
    (
      await apiClient.post(
        "/sni/api/v1/inventory/procurement/goods-receipts",
        data,
      )
    ).data,
  getGoodsReceipts: async (
    params?: any,
  ): Promise<PaginatedResponse<GoodsReceipt>> =>
    toPage<GoodsReceipt>(
      (
        await apiClient.get(
          "/sni/api/v1/inventory/procurement/goods-receipts",
          { params },
        )
      ).data,
    ),
  getGoodsReceipt: async (receiptCode: string): Promise<GoodsReceipt> =>
    (
      await apiClient.get(
        `/sni/api/v1/inventory/procurement/goods-receipts/${receiptCode}`,
      )
    ).data,

  // ---------- Approval rules ----------
  getApprovalRules: async (): Promise<any[]> =>
    toList<any>(
      (await apiClient.get("/sni/api/v1/inventory/procurement/approval-rules"))
        .data,
    ),
  createApprovalRule: async (data: any): Promise<any> =>
    (
      await apiClient.post(
        "/sni/api/v1/inventory/procurement/approval-rules",
        data,
      )
    ).data,
  updateApprovalRule: async (id: number, data: any): Promise<any> =>
    (
      await apiClient.put(
        `/sni/api/v1/inventory/procurement/approval-rules/${id}`,
        data,
      )
    ).data,
  deleteApprovalRule: async (id: number): Promise<void> => {
    await apiClient.delete(
      `/sni/api/v1/inventory/procurement/approval-rules/${id}`,
    );
  },

  // ---------- Assets ----------
  getAssets: async (params?: any): Promise<PaginatedResponse<Asset>> =>
    toPage<Asset>(
      (await apiClient.get("/sni/api/v1/inventory/assets", { params })).data,
    ),
  // Recherche côté client : le backend ne filtre pas sur un texte.
  searchAssets: async (query: string): Promise<Asset[]> => {
    const page = toPage<Asset>(
      (
        await apiClient.get("/sni/api/v1/inventory/assets", {
          params: { size: 100 },
        })
      ).data,
    );
    const q = query.toLowerCase();
    return page.content.filter(
      (a) =>
        a.assetCode.toLowerCase().includes(q) ||
        a.itemName?.toLowerCase().includes(q) ||
        a.serialNumber?.toLowerCase().includes(q) ||
        a.assetTag?.toLowerCase().includes(q),
    );
  },
  getAsset: async (assetCode: string): Promise<Asset> =>
    (await apiClient.get(`/sni/api/v1/inventory/assets/${assetCode}`)).data,
  createAsset: async (data: Partial<Asset>): Promise<Asset> =>
    (await apiClient.post("/sni/api/v1/inventory/assets", data)).data,
  updateAsset: async (
    assetCode: string,
    data: Partial<Asset>,
  ): Promise<Asset> =>
    (await apiClient.put(`/sni/api/v1/inventory/assets/${assetCode}`, data))
      .data,
  deleteAsset: async (assetCode: string): Promise<void> => {
    await apiClient.delete(`/sni/api/v1/inventory/assets/${assetCode}`);
  },
  assignAsset: async (
    assetCode: string,
    data: {
      assigneeType: string;
      assigneeCode: string;
      expectedReturnAt: string;
      assignedBy: string;
      purpose: string;
      [key: string]: any;
    },
  ): Promise<AssetAssignment> =>
    (
      await apiClient.patch(
        `/sni/api/v1/inventory/assets/${assetCode}/assign`,
        data,
      )
    ).data,
  returnAsset: async (
    assetCode: string,
    assignmentIdOrData?: number | any,
    maybeData?: any,
  ): Promise<Asset> => {
    if (typeof assignmentIdOrData === "number") {
      return (
        await apiClient.patch(
          `/sni/api/v1/inventory/assets/${assetCode}/assignments/${assignmentIdOrData}/return`,
          maybeData || {},
        )
      ).data;
    }
    return (
      await apiClient.patch(
        `/sni/api/v1/inventory/assets/${assetCode}/return`,
        assignmentIdOrData || {},
      )
    ).data;
  },
  getAssetLoanSheetPdf: async (
    assetCode: string,
    assignmentId: number,
  ): Promise<Blob> =>
    blob(
      `/sni/api/v1/inventory/assets/${assetCode}/assignments/${assignmentId}/loan-sheet.pdf`,
    ),
  markAssetLost: async (assetCode: string, data: any): Promise<Asset> =>
    (
      await apiClient.patch(
        `/sni/api/v1/inventory/assets/${assetCode}/mark-lost`,
        data,
      )
    ).data,
  reserveAsset: async (assetCode: string, data: any): Promise<Asset> =>
    (
      await apiClient.patch(
        `/sni/api/v1/inventory/assets/${assetCode}/reserve`,
        data,
      )
    ).data,
  cancelAssetReservation: async (assetCode: string): Promise<Asset> =>
    (
      await apiClient.patch(
        `/sni/api/v1/inventory/assets/${assetCode}/cancel-reservation`,
      )
    ).data,
  markAssetDamaged: async (assetCode: string, data: any): Promise<Asset> =>
    (
      await apiClient.patch(
        `/sni/api/v1/inventory/assets/${assetCode}/mark-damaged`,
        data,
      )
    ).data,
  retireAsset: async (assetCode: string, data: any): Promise<Asset> =>
    (
      await apiClient.patch(
        `/sni/api/v1/inventory/assets/${assetCode}/retire`,
        data,
      )
    ).data,
  getAssetLocationHistory: async (assetCode: string): Promise<any[]> =>
    toList<any>(
      (
        await apiClient.get(
          `/sni/api/v1/inventory/assets/${assetCode}/location-history`,
        )
      ).data,
    ),
  // Ressource indépendante, non imbriquée sous /assets/{code}.
  createAssetMaintenance: async (
    assetCodeOrData: string | Partial<AssetMaintenance>,
    data?: Partial<AssetMaintenance>,
  ): Promise<AssetMaintenance> => {
    const assetCode =
      typeof assetCodeOrData === "string"
        ? assetCodeOrData
        : assetCodeOrData.assetCode;
    const payload =
      typeof assetCodeOrData === "string"
        ? { ...data, assetCode }
        : assetCodeOrData;
    if (!assetCode) throw new Error("assetCode is required");
    return (
      await apiClient.post(
        "/sni/api/v1/inventory/asset-maintenances",
        payload,
      )
    ).data;
  },
  getAssetMaintenances: async (
    assetCode: string,
    params?: { status?: string; page?: number; size?: number },
  ): Promise<AssetMaintenance[]> =>
    toList<AssetMaintenance>(
      (
        await apiClient.get("/sni/api/v1/inventory/asset-maintenances", {
          params: { ...params, assetCode },
        })
      ).data,
    ),
  completeAssetMaintenance: async (
    maintenanceCode: string,
    data: {
      completedBy: string;
      resolutionNotes?: string;
      maintenanceCost?: number;
      newCondition?: string;
    },
  ): Promise<AssetMaintenance> =>
    (
      await apiClient.patch(
        `/sni/api/v1/inventory/asset-maintenances/${maintenanceCode}/complete`,
        data,
      )
    ).data,

  // ---------- Counts ----------
  getInventoryCounts: async (
    params?: any,
  ): Promise<PaginatedResponse<InventoryCount>> =>
    toPage<InventoryCount>(
      (await apiClient.get("/sni/api/v1/inventory/counts", { params })).data,
    ),
  getInventoryCount: async (countCode: string): Promise<InventoryCount> =>
    (await apiClient.get(`/sni/api/v1/inventory/counts/${countCode}`)).data,
  createInventoryCount: async (
    data: Partial<InventoryCount>,
  ): Promise<InventoryCount> =>
    (await apiClient.post("/sni/api/v1/inventory/counts", data)).data,
  startInventoryCount: async (countCode: string): Promise<InventoryCount> =>
    (await apiClient.patch(`/sni/api/v1/inventory/counts/${countCode}/start`))
      .data,
  saveInventoryCountLine: async (
    countCode: string,
    lineOrItemCode: any,
    countedQuantity?: number,
  ): Promise<InventoryCount> => {
    const line =
      typeof lineOrItemCode === "string"
        ? { itemCode: lineOrItemCode, countedQuantity }
        : lineOrItemCode;
    return (
      await apiClient.put(
        `/sni/api/v1/inventory/counts/${countCode}/lines`,
        line,
      )
    ).data;
  },
  reviewInventoryCount: async (
    countCode: string,
    data?: any,
  ): Promise<InventoryCount> =>
    (
      await apiClient.patch(
        `/sni/api/v1/inventory/counts/${countCode}/review`,
        data || {},
      )
    ).data,
  validateInventoryCount: async (
    countCode: string,
    data?: any,
  ): Promise<InventoryCount> =>
    (
      await apiClient.patch(
        `/sni/api/v1/inventory/counts/${countCode}/validate`,
        data || {},
      )
    ).data,
  cancelInventoryCount: async (
    countCode: string,
    reason?: string,
  ): Promise<InventoryCount> =>
    (
      await apiClient.patch(
        `/sni/api/v1/inventory/counts/${countCode}/cancel`,
        { reason },
      )
    ).data,

  // ---------- Alerts / reorder ----------
  getAlerts: async (params?: any): Promise<PaginatedResponse<Alert>> =>
    toPage<Alert>(
      (await apiClient.get("/sni/api/v1/inventory/alerts", { params })).data,
    ),
  acknowledgeAlert: async (alertCode: string, data?: any): Promise<Alert> =>
    (
      await apiClient.patch(
        `/sni/api/v1/inventory/alerts/${alertCode}/acknowledge`,
        typeof data === "string" ? { acknowledgedBy: data } : data || {},
      )
    ).data,
  resolveAlert: async (
    alertCode: string,
    data?: any,
    resolutionNote?: string,
  ): Promise<Alert> => {
    const payload =
      typeof data === "string"
        ? { resolvedBy: data, resolutionNote }
        : data || {};
    return (
      await apiClient.patch(
        `/sni/api/v1/inventory/alerts/${alertCode}/resolve`,
        payload,
      )
    ).data;
  },
  dismissAlert: async (alertCode: string, data?: any): Promise<Alert> =>
    (
      await apiClient.patch(
        `/sni/api/v1/inventory/alerts/${alertCode}/dismiss`,
        typeof data === "string" ? { dismissedBy: data } : data || {},
      )
    ).data,

  // Aucun filtre serveur : filtrer côté interface.
  getReorderRules: async (
    params?: any,
  ): Promise<PaginatedResponse<ReorderRule>> =>
    toPage<ReorderRule>(
      (await apiClient.get("/sni/api/v1/inventory/reorder-rules", { params }))
        .data,
    ),
  createReorderRule: async (data: Partial<ReorderRule>): Promise<ReorderRule> =>
    (await apiClient.post("/sni/api/v1/inventory/reorder-rules", data)).data,
  updateReorderRule: async (
    ruleCode: string,
    data: Partial<ReorderRule>,
  ): Promise<ReorderRule> =>
    (
      await apiClient.put(
        `/sni/api/v1/inventory/reorder-rules/${ruleCode}`,
        data,
      )
    ).data,
  deleteReorderRule: async (ruleCode: string): Promise<void> => {
    await apiClient.delete(`/sni/api/v1/inventory/reorder-rules/${ruleCode}`);
  },
  getReorderSuggestions: async (params?: any): Promise<ReorderSuggestion[]> =>
    toList<ReorderSuggestion>(
      (
        await apiClient.get("/sni/api/v1/inventory/reorder-rules/suggestions", {
          params,
        })
      ).data,
    ),

  // ---------- Admin reports / labels ----------
  getDashboardMetrics: async (): Promise<InventoryDashboardMetrics> =>
    (await apiClient.get("/sni/api/v1/inventory/admin/dashboard")).data,
  getMovementsReport: async (params?: {
    fromDate?: string;
    toDate?: string;
    itemCode?: string;
    locationCode?: string;
    movementType?: string;
  }): Promise<any> =>
    (
      await apiClient.get("/sni/api/v1/inventory/admin/reports/movements", {
        params,
      })
    ).data,
  exportMovementsCSV: async (params?: any): Promise<Blob> =>
    blob("/sni/api/v1/inventory/admin/reports/movements.csv", params),
  exportMovementsPDF: async (params?: any): Promise<Blob> =>
    blob("/sni/api/v1/inventory/admin/reports/movements.pdf", params),
  getAnomaliesReport: async (params?: any): Promise<any> =>
    (
      await apiClient.get("/sni/api/v1/inventory/admin/reports/anomalies", {
        params,
      })
    ).data,
  // Renvoie du JSON : le rendu imprimable est à la charge de l'interface.
  getLabel: async (type: string, code: string): Promise<InventoryLabel> =>
    (await apiClient.get(`/sni/api/v1/inventory/admin/labels/${type}/${code}`))
      .data,
  generateLabels: async (
    data: GenerateInventoryLabelsRequest | { type: string; codes: string[] },
  ): Promise<InventoryLabel[]> => {
    const payload =
      "items" in data
        ? { items: data.items }
        : { items: data.codes.map((code) => ({ type: data.type, code })) };
    return toList<InventoryLabel>(
      (await apiClient.post("/sni/api/v1/inventory/admin/labels", payload))
        .data,
    );
  },

  // ---------- Import ----------
  importInventory: async (
    type: "ITEMS" | "INITIAL_STOCK" | "SUPPLIERS" | "ASSETS" | string,
    file: File,
    dryRun = false,
  ): Promise<InventoryImportResult> => {
    const formData = new FormData();
    formData.append("file", file);
    return (
      await apiClient.post(`/sni/api/v1/inventory/import/${type}`, formData, {
        params: { dryRun },
        headers: { "Content-Type": "multipart/form-data" },
      })
    ).data;
  },
  importItems: async (
    file: File,
    dryRun = false,
  ): Promise<InventoryImportResult> =>
    inventoryService.importInventory("ITEMS", file, dryRun),
  importAssets: async (
    file: File,
    dryRun = false,
  ): Promise<InventoryImportResult> =>
    inventoryService.importInventory("ASSETS", file, dryRun),
  importStock: async (
    file: File,
    dryRun = false,
  ): Promise<InventoryImportResult> =>
    inventoryService.importInventory("INITIAL_STOCK", file, dryRun),
  importSuppliers: async (
    file: File,
    dryRun = false,
  ): Promise<InventoryImportResult> =>
    inventoryService.importInventory("SUPPLIERS", file, dryRun),
  // Aucun endpoint backend : les modèles d'import sont à fournir côté interface.
  downloadTemplate: async (_type: string): Promise<Blob> => {
    throw new Error(
      "downloadTemplate: aucun endpoint backend pour les templates d'import. " +
        "Fournir les templates CSV statiquement cote frontend.",
    );
  },
};