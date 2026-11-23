import { apiClient } from "./api";

const API = "/sni/api/v1";

const arr = <T>(raw: any): T[] =>
  Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : Array.isArray(raw?.content) ? raw.content : [];

/* ---------- Sites et étages ---------- */
export interface ResourceSite {
  id?: string;
  code: string;
  name: string;
  address?: string | null;
  city?: string | null;
  phone?: string | null;
  timeZone?: string | null;
  openingHoursNote?: string | null;
  active: boolean;
  floorCount?: number | string | null;
  resourceCount?: number | string | null;
}
export interface SiteRequest {
  name?: string;
  address?: string;
  city?: string;
  phone?: string;
  timeZone?: string;
  openingHoursNote?: string;
  active?: boolean;
}
export interface ResourceFloor {
  id?: string;
  code: string;
  siteCode: string;
  name: string;
  level?: number | null;
  planDocumentCode?: string | null;
  active: boolean;
  resourceCount?: number | string | null;
}
export interface FloorRequest {
  name?: string;
  level?: number;
  planDocumentCode?: string;
  active?: boolean;
}
/** FREE, PARTIAL, OCCUPIED, CLOSED, NO_SLOT, OUT_OF_SERVICE */
export interface PlacedResource {
  code: string;
  name: string;
  typeCode?: string | null;
  capacity?: number | null;
  planX?: number | null;
  planY?: number | null;
  state: string;
  remainingCapacity?: number | null;
  freeAt?: string | null;
}
export interface FloorPlan {
  floorCode: string;
  floorName?: string | null;
  level?: number | null;
  siteCode?: string | null;
  siteName?: string | null;
  planDocumentCode?: string | null;
  at?: string | null;
  resources: PlacedResource[];
}
export interface PlacementRequest {
  siteCode?: string;
  floorCode?: string;
  planX?: number;
  planY?: number;
}

/* ---------- Trouver une salle ---------- */
export interface FindRoomRequest {
  startedAt?: string;
  endedAt?: string;
  participants?: number;
  amenityCodes?: string[];
  siteCode?: string;
  typeCode?: string;
  maxBudget?: number;
  ownerType?: string;
  ownerCode?: string;
}
export interface FindRoomOption {
  resourceCode: string;
  name: string;
  typeCode?: string | null;
  siteCode?: string | null;
  floorCode?: string | null;
  capacity?: number | null;
  startedAt?: string | null;
  endedAt?: string | null;
  price?: number | null;
  currency?: string | null;
  notes?: string[] | null;
}
export interface FindRoomResult {
  matches: FindRoomOption[];
  alternatives: FindRoomOption[];
}

/* ---------- Lots ---------- */
export interface BundleItem {
  resourceCode: string;
  quantity?: number;
}
export interface ResourceBundle {
  id?: string;
  code: string;
  name: string;
  description?: string | null;
  discountPercent?: number | null;
  active: boolean;
  items: { resourceCode: string; resourceName?: string | null; quantity?: number | null }[];
}
export interface BundleRequest {
  name?: string;
  description?: string;
  discountPercent?: number;
  active?: boolean;
  items?: BundleItem[];
}

/* ---------- Jours particuliers ---------- */
export interface CalendarDay {
  id?: string | null;
  date: string;
  resourceCode?: string | null;
  /** HOLIDAY, SPECIAL_HOURS, CLOSED */
  kind: string;
  label?: string | null;
  openingHours?: string | null;
  national?: boolean;
}
export interface CalendarDayRequest {
  date: string;
  resourceCode?: string;
  kind: string;
  label?: string;
  openingHours?: string;
}

/* ---------- Horaires d'ouverture ---------- */
export interface OpeningRange {
  dayOfWeek: string;
  open: string;
  close: string;
}
export interface OpeningHoursView {
  resourceCode: string;
  custom: boolean;
  hours: { dayOfWeek: string; open: unknown; close: unknown }[];
}

/* ---------- Exploitation ---------- */
export interface ResourceIncident {
  id?: string;
  code: string;
  resourceCode: string;
  resourceName?: string | null;
  bookingNumber?: string | null;
  reportedByType?: string | null;
  reporterName?: string | null;
  title: string;
  description?: string | null;
  severity: string;
  status: string;
  blocked?: boolean;
  photoDocumentCodes?: string[] | null;
  ticketNumber?: string | null;
  resolution?: string | null;
  resolvedBy?: string | null;
  resolvedAt?: string | null;
  createdAt?: string | null;
}
export interface IncidentRequest {
  resourceCode: string;
  bookingNumber?: string;
  title: string;
  description?: string;
  severity: string;
  block?: boolean;
  cancelBookings?: boolean;
  photoDocumentCodes?: string[];
}
export interface TaskTemplate {
  id: string | number;
  resourceCode?: string | null;
  serviceItemCode?: string | null;
  title: string;
  description?: string | null;
  moment?: string | null;
  offsetMinutes?: number | null;
  priority?: string | null;
  assignedTo?: number | string | null;
  checklist?: string[] | null;
  active: boolean;
}
export interface TaskTemplateRequest {
  resourceCode?: string;
  serviceItemCode?: string;
  title?: string;
  description?: string;
  moment?: string;
  offsetMinutes?: number;
  priority?: string;
  assignedTo?: number;
  checklist?: string[];
  active?: boolean;
}
export interface MaintenanceEntry {
  kind: string;
  reference?: string | null;
  title?: string | null;
  status?: string | null;
  startedAt?: string | null;
  endedAt?: string | null;
  detail?: string | null;
}
export interface ImpactedBooking {
  bookingNumber: string;
  status?: string | null;
  startedAt?: string | null;
  endedAt?: string | null;
  ownerType?: string | null;
  ownerCode?: string | null;
  contactName?: string | null;
  quantity?: number | null;
}

/* ---------- Tarifs : outils ---------- */
export interface PricingConflict {
  firstRuleId: string;
  firstLabel?: string | null;
  secondRuleId: string;
  secondLabel?: string | null;
  unit?: string | null;
  reason?: string | null;
}
export interface PriceLine {
  from?: string;
  to?: string;
  units?: number;
  unitPrice?: number;
  baseRuleId?: string | null;
  baseRuleLabel?: string | null;
  adjustments?: { ruleId?: string | null; label?: string | null; type?: string | null; value?: number | null }[];
  amount?: number;
}
export interface PriceQuote {
  resourceCode: string;
  bookingUnit: string;
  startedAt: string;
  endedAt: string;
  basePrice?: number | null;
  finalPrice?: number | null;
  appliedRuleId?: string | null;
  appliedRuleLabel?: string | null;
  units?: number | null;
  quantity?: number | null;
  amount?: number | null;
  currency?: string | null;
  lines?: PriceLine[];
  alternatives?: { unit: string; amount: number; chosen?: boolean }[];
}
export interface SimulateRequest {
  resourceCode: string;
  startedAt: string;
  endedAt: string;
  quantity?: number;
  bookingUnit?: string;
  ownerType?: string;
  ownerCode?: string;
  channel?: string;
}
export interface PricingRuleVersion {
  id?: string;
  ruleShortId?: string;
  resourceCode?: string;
  version: number;
  changeType: string;
  /** JSON de la règle complète */
  snapshot?: string | null;
  changedBy?: string | null;
  changedAt?: string | null;
}

export const resourceOpsService = {
  /* Sites et étages */
  getSites: async (): Promise<ResourceSite[]> => arr<ResourceSite>((await apiClient.get(`${API}/resource-sites`)).data),
  getSite: async (code: string): Promise<ResourceSite> => (await apiClient.get(`${API}/resource-sites/${code}`)).data,
  createSite: async (data: SiteRequest): Promise<ResourceSite> => (await apiClient.post(`${API}/resource-sites`, data)).data,
  updateSite: async (code: string, data: SiteRequest): Promise<ResourceSite> => (await apiClient.patch(`${API}/resource-sites/${code}`, data)).data,
  deleteSite: async (code: string): Promise<void> => {
    await apiClient.delete(`${API}/resource-sites/${code}`);
  },
  getFloors: async (siteCode: string): Promise<ResourceFloor[]> => arr<ResourceFloor>((await apiClient.get(`${API}/resource-sites/${siteCode}/floors`)).data),
  createFloor: async (siteCode: string, data: FloorRequest): Promise<ResourceFloor> => (await apiClient.post(`${API}/resource-sites/${siteCode}/floors`, data)).data,
  updateFloor: async (code: string, data: FloorRequest): Promise<ResourceFloor> => (await apiClient.patch(`${API}/resource-floors/${code}`, data)).data,
  deleteFloor: async (code: string): Promise<void> => {
    await apiClient.delete(`${API}/resource-floors/${code}`);
  },
  getFloorPlan: async (code: string, at?: string): Promise<FloorPlan> => (await apiClient.get(`${API}/resource-floors/${code}/plan`, { params: { at } })).data,
  placeResource: async (code: string, data: PlacementRequest): Promise<void> => {
    await apiClient.put(`${API}/resources/${code}/placement`, data);
  },

  /* Réglages d'une ressource */
  saveSalesSettings: async (code: string, data: { includedParticipants?: number; extraParticipantPrice?: number; depositAmount?: number }): Promise<void> => {
    await apiClient.put(`${API}/resources/${code}/sales-settings`, data);
  },
  saveUsageSettings: async (code: string, data: { usageRules?: string; endChecklist?: string[] }): Promise<void> => {
    await apiClient.put(`${API}/resources/${code}/usage-settings`, data);
  },
  getImpactedBookings: async (code: string, params?: { from?: string; to?: string }): Promise<ImpactedBooking[]> =>
    arr<ImpactedBooking>((await apiClient.get(`${API}/resources/${code}/impacted-bookings`, { params })).data),
  getMaintenanceHistory: async (code: string): Promise<MaintenanceEntry[]> => arr<MaintenanceEntry>((await apiClient.get(`${API}/resources/${code}/maintenance-history`)).data),

  /* Horaires propres */
  getOpeningHours: async (code: string): Promise<OpeningHoursView> => (await apiClient.get(`${API}/resources/${code}/opening-hours`)).data,
  saveOpeningHours: async (code: string, ranges: OpeningRange[]): Promise<OpeningHoursView> => (await apiClient.put(`${API}/resources/${code}/opening-hours`, ranges)).data,
  clearOpeningHours: async (code: string): Promise<OpeningHoursView> => (await apiClient.delete(`${API}/resources/${code}/opening-hours`)).data,

  /* iCalendar : texte .ics (équipe) et jeton du flux public */
  getResourceIcs: async (code: string): Promise<string> => (await apiClient.get(`${API}/resources/${code}/calendar.ics`, { responseType: "text" })).data,
  createIcalToken: async (code: string): Promise<Record<string, unknown>> => (await apiClient.post(`${API}/resources/${code}/ical-token`)).data,
  /** Flux public à jeton (sans authentification) : l'adresse à donner à l'agenda */
  publicIcalPath: (token: string) => `${API}/public/resource-calendars/${token}.ics`,

  /* Trouver une salle */
  findRooms: async (data: FindRoomRequest): Promise<FindRoomResult> => {
    const r = (await apiClient.post(`${API}/resources/find`, data)).data;
    return { matches: arr<FindRoomOption>(r?.matches), alternatives: arr<FindRoomOption>(r?.alternatives) };
  },

  /* Lots */
  getBundles: async (): Promise<ResourceBundle[]> => arr<ResourceBundle>((await apiClient.get(`${API}/resource-bundles`)).data),
  getBundle: async (code: string): Promise<ResourceBundle> => (await apiClient.get(`${API}/resource-bundles/${code}`)).data,
  createBundle: async (data: BundleRequest): Promise<ResourceBundle> => (await apiClient.post(`${API}/resource-bundles`, data)).data,
  updateBundle: async (code: string, data: BundleRequest): Promise<ResourceBundle> => (await apiClient.patch(`${API}/resource-bundles/${code}`, data)).data,
  deleteBundle: async (code: string): Promise<void> => {
    await apiClient.delete(`${API}/resource-bundles/${code}`);
  },

  /* Jours particuliers */
  getCalendarDays: async (params?: { from?: string; to?: string; resourceCode?: string }): Promise<CalendarDay[]> =>
    arr<CalendarDay>((await apiClient.get(`${API}/resource-calendar-days`, { params })).data),
  createCalendarDay: async (data: CalendarDayRequest): Promise<CalendarDay> => (await apiClient.post(`${API}/resource-calendar-days`, data)).data,
  deleteCalendarDay: async (id: string | number): Promise<void> => {
    await apiClient.delete(`${API}/resource-calendar-days/${id}`);
  },

  /* Incidents */
  getIncidents: async (params?: { resourceCode?: string; status?: string }): Promise<ResourceIncident[]> =>
    arr<ResourceIncident>((await apiClient.get(`${API}/resource-incidents`, { params })).data),
  getIncident: async (code: string): Promise<ResourceIncident> => (await apiClient.get(`${API}/resource-incidents/${code}`)).data,
  reportIncident: async (data: IncidentRequest): Promise<ResourceIncident> => (await apiClient.post(`${API}/resource-incidents`, data)).data,
  startIncident: async (code: string): Promise<ResourceIncident> => (await apiClient.post(`${API}/resource-incidents/${code}/start`)).data,
  resolveIncident: async (code: string, data: { resolution?: string; reopen?: boolean }): Promise<ResourceIncident> =>
    (await apiClient.post(`${API}/resource-incidents/${code}/resolve`, data)).data,

  /* Modèles de tâches */
  getTaskTemplates: async (): Promise<TaskTemplate[]> => arr<TaskTemplate>((await apiClient.get(`${API}/resource-task-templates`)).data),
  createTaskTemplate: async (data: TaskTemplateRequest): Promise<TaskTemplate> => (await apiClient.post(`${API}/resource-task-templates`, data)).data,
  updateTaskTemplate: async (id: string | number, data: TaskTemplateRequest): Promise<TaskTemplate> => (await apiClient.patch(`${API}/resource-task-templates/${id}`, data)).data,
  deleteTaskTemplate: async (id: string | number): Promise<void> => {
    await apiClient.delete(`${API}/resource-task-templates/${id}`);
  },

  /* Tarifs : outils */
  getPricingConflicts: async (resourceCode: string): Promise<PricingConflict[]> =>
    arr<PricingConflict>((await apiClient.get(`${API}/resource-pricing-rules/conflicts`, { params: { resourceCode } })).data),
  simulatePrice: async (data: SimulateRequest): Promise<PriceQuote> => (await apiClient.post(`${API}/resource-pricing-rules/simulate`, data)).data,
  /** Devis complet : quantité, client (ownerType/ownerCode) et unité imposée */
  quoteFull: async (params: { resourceCode: string; startedAt: string; endedAt: string; quantity?: number; ownerType?: string; ownerCode?: string; bookingUnit?: string }): Promise<PriceQuote> =>
    (await apiClient.get(`${API}/resource-pricing-rules/quote`, { params })).data,
  getPricingRuleHistory: async (id: string | number): Promise<PricingRuleVersion[]> =>
    arr<PricingRuleVersion>((await apiClient.get(`${API}/resource-pricing-rules/${id}/history`)).data),
};
