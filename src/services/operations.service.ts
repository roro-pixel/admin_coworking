import { apiClient } from "./api";

// ==================== HELPERS ====================
export interface PaginatedResult<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
}
const paginated = <T>(raw: any): PaginatedResult<T> => {
  if (raw?.content !== undefined) return raw;
  if (Array.isArray(raw?.data))
    return {
      content: raw.data,
      totalElements:
        raw.pageable?.totalElements ?? raw.totalElements ?? raw.data.length,
      totalPages: raw.pageable?.totalPages ?? raw.totalPages ?? 1,
    };
  if (Array.isArray(raw))
    return { content: raw, totalElements: raw.length, totalPages: 1 };
  return { content: [], totalElements: 0, totalPages: 0 };
};
const list = <T>(raw: any): T[] =>
  Array.isArray(raw)
    ? raw
    : Array.isArray(raw?.data)
      ? raw.data
      : Array.isArray(raw?.content)
        ? raw.content
        : [];

// ==================== TYPES SUPPORT ====================
export type TicketStatus =
  | "OPEN"
  | "IN_PROGRESS"
  | "WAITING_CLIENT"
  | "RESOLVED"
  | "CLOSED";
export type TicketPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type TicketCategory =
  | "BILLING"
  | "BOOKING"
  | "ACCESS"
  | "TECHNICAL"
  | "OTHER";

export interface TicketMessage {
  id: number;
  ticketNumber: string;
  authorId?: string;
  authorName?: string;
  senderType?: "CLIENT" | "AGENT" | "SYSTEM";
  senderName?: string;
  content: string;
  internal?: boolean;
  createdAt: string;
}
export interface SupportTicket {
  ticketNumber: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: TicketCategory;
  ownerType?: string;
  ownerCode?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  relatedType?: string;
  relatedCode?: string;
  assignedTo?: string;
  firstResponseDueAt?: string;
  resolutionDueAt?: string;
  createdAt: string;
  updatedAt: string;
  messages: TicketMessage[];
  tags?: string[];
  escalationLevel?: number;
  escalationReason?: string;
  firstRespondedAt?: string;
  resolvedAt?: string;
  closedAt?: string;
  csatScore?: number;
  csatComment?: string;
}
export interface TicketMetrics {
  openTickets: number;
  resolvedTickets: number;
  overdueFirstResponse: number;
  overdueResolution: number;
}
export interface TicketTimelineEvent {
  id?: number;
  eventType: string;
  actorId?: string;
  actorName?: string;
  description?: string;
  oldValue?: string;
  newValue?: string;
  createdAt: string;
}
export interface TicketAttachment {
  id: number;
  fileName: string;
  contentType?: string;
  sizeBytes?: number;
  internal?: boolean;
  uploadedBy?: string;
  createdAt?: string;
}
export interface TicketAnalytics {
  from?: string;
  to?: string;
  totalCreated: number;
  totalResolved: number;
  openAtEndOfPeriod: number;
  slaBreachCount: number;
  slaBreachRate: number;
  avgFirstResponseHours: number;
  avgResolutionHours: number;
  reopenedCount?: number;
  waitingClientCount?: number;
  byCategory: Record<string, number>;
  byPriority: Record<string, number>;
  byStatus?: Record<string, number>;
}
export interface SupportAgentPerformance {
  agentId?: string;
  agentName?: string;
  assignedTickets: number;
  resolvedTickets: number;
  avgFirstResponseHours?: number;
  avgResolutionHours?: number;
  slaBreachCount?: number;
  csatAverage?: number;
}
export interface TicketOwnerSummary {
  ownerType: string;
  ownerCode: string;
  openTickets: number;
  resolvedTickets: number;
  closedTickets?: number;
  latestTickets?: SupportTicket[];
}

// ==================== TYPES VISITOR ====================
export type VisitorPassStatus =
  | "SCHEDULED"
  | "CHECKED_IN"
  | "CHECKED_OUT"
  | "CANCELLED"
  | "EXPIRED";
export interface VisitorPass {
  passNumber: string;
  fullName: string;
  email?: string;
  phone?: string;
  company?: string;
  hostMemberCode?: string;
  hostName?: string;
  validFrom: string;
  validUntil: string;
  purpose?: string;
  status: VisitorPassStatus;
  qrValue?: string;
  checkedInAt?: string;
  checkedOutAt?: string;
  createdAt: string;
}
export interface VisitorLogEntry {
  id: number;
  passNumber: string;
  fullName: string;
  hostName?: string;
  eventType: "CHECK_IN" | "CHECK_OUT";
  agent: string;
  notes?: string;
  eventAt: string;
}

// ==================== TYPES CRM ====================
export type LeadStage =
  | "NEW"
  | "CONTACTED"
  | "QUALIFIED"
  | "PROPOSAL_SENT"
  | "WON"
  | "LOST";
export type LeadSource =
  | "WEBSITE"
  | "REFERRAL"
  | "COLD_CALL"
  | "TRADE_SHOW"
  | "PARTNER"
  | "SOCIAL_MEDIA"
  | "EVENT"
  | "OTHER";
export type LeadInterest =
  | "WORKSPACE"
  | "MEETING_ROOM"
  | "VIRTUAL_OFFICE"
  | "DOMICILIATION"
  | "DAY_PASS"
  | "DEDICATED_DESK"
  | "PRIVATE_OFFICE"
  | "OTHER";
export type ActivityType = "CALL" | "EMAIL" | "MEETING" | "VISIT" | "NOTE";
export type OpportunityStage =
  | "OPEN"
  | "NEGOTIATION"
  | "PROPOSAL_SENT"
  | "WON"
  | "LOST";

export interface LeadActivity {
  id: number;
  activityType: ActivityType;
  subject?: string;
  notes?: string;
  performedBy: string;
  performedAt: string;
  createdAt?: string;
}
export interface Lead {
  id: number;
  leadNumber: string;
  fullName: string;
  email?: string;
  phone?: string;
  company?: string;
  note?: string;
  source?: LeadSource | string;
  interest?: LeadInterest | string;
  stage: LeadStage;
  estimatedAmount?: number;
  probability?: number;
  scoredProbability?: number;
  expectedCloseDate?: string;
  assignedTo?: number;
  convertedOwnerType?: string;
  convertedOwnerCode?: string;
  lostReason?: string;
  lastActivityAt?: string;
  createdAt: string;
  updatedAt: string;
  activities?: LeadActivity[];
}
export interface CreateLeadRequest {
  fullName: string;
  email?: string;
  phone?: string;
  company?: string;
  note?: string;
  source?: LeadSource | string;
  interest?: LeadInterest | string;
  estimatedAmount?: number;
  probability?: number;
  expectedCloseDate?: string;
  assignedTo?: number;
}
export interface UpdateLeadRequest extends Partial<CreateLeadRequest> {
  stage?: LeadStage;
  lostReason?: string | null;
}
export interface LeadCaptureResponse {
  leadNumber: string;
  message: string;
}
export interface KanbanCard {
  id: number;
  leadNumber: string;
  fullName: string;
  company?: string;
  email?: string;
  stage: LeadStage;
  source?: LeadSource;
  interest?: LeadInterest;
  estimatedAmount?: number;
  probability?: number;
  score?: number;
  assignedTo?: number;
  lastActivityAt?: string;
  activityCount: number;
  createdAt: string;
}
export interface KanbanColumn {
  stage: LeadStage;
  count: number;
  totalAmount: number;
  cards: KanbanCard[];
}
export interface KanbanBoard {
  columns: KanbanColumn[];
  totalLeads: number;
  totalPipelineValue: number;
}
export interface CrmPipeline {
  stages?: Record<LeadStage, Lead[]>;
  stage?: LeadStage;
  count?: number;
  totalValue?: number;
  leads?: Lead[];
}
export interface CrmMetrics {
  totalLeads: number;
  newLeads?: number;
  wonLeads: number;
  lostLeads: number;
  activeLeads?: number;
  pipelineValue: number;
  conversionRate: number;
}
export interface CrmAnalytics {
  from: string;
  to: string;
  totalCreated: number;
  totalWon: number;
  totalLost: number;
  conversionRate: number;
  avgDaysToWin: number;
  bySource: Record<string, number>;
  byStage: Record<string, number>;
  pipelineValue: number;
}
export interface Opportunity {
  id: number;
  opportunityNumber: string;
  leadId: number;
  leadNumber?: string;
  leadFullName?: string;
  title: string;
  estimatedAmount?: number;
  probability?: number;
  stage: OpportunityStage;
  expectedCloseDate?: string;
  assignedTo?: number;
  notes?: string;
  wonAt?: string;
  lostAt?: string;
  lostReason?: string;
}

// ==================== TYPES CRM PROPOSALS ====================

export type ProposalStatus =
  | "DRAFT"
  | "SENT"
  | "VIEWED"
  | "ACCEPTED"
  | "REJECTED"
  | "EXPIRED"
  | "CONVERTED";

export type ProposalRecipientType =
  | "CUSTOMER"
  | "MEMBER"
  | "BUSINESS_ENTITY"
  | string;
export type ProposalServiceType =
  | "SUBSCRIPTION"
  | "PASS"
  | "BOOKING"
  | "CUSTOM"
  | string;

export interface ProposalLineResponse {
  id: number;
  sortOrder: number;
  serviceType?: ProposalServiceType | null;
  serviceRefCode?: string | null;
  label: string;
  description?: string | null;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  taxRate: number;
  taxIncluded: boolean;
  subtotalAmount: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
}

export interface ProposalResponse {
  id: number;
  proposalNumber: string;
  title: string;
  opportunityId?: number | null;
  leadId?: number | null;
  recipientType?: ProposalRecipientType | null;
  recipientCode?: string | null;
  recipientName?: string | null;
  recipientEmail?: string | null;
  status: ProposalStatus | string;
  validUntil?: string | null;
  subtotalAmount: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  notes?: string | null;
  internalNotes?: string | null;
  convertedInvoiceNumber?: string | null;
  convertedContractCode?: string | null;
  convertedSubscriptionNumber?: string | null;
  convertedPassNumber?: string | null;
  sentAt?: string | null;
  viewedAt?: string | null;
  acceptedAt?: string | null;
  rejectedAt?: string | null;
  rejectionReason?: string | null;
  createdBy?: number | null;
  assignedTo?: number | null;
  createdAt: string;
  updatedAt: string;
  lines?: ProposalLineResponse[];
}

export interface ProposalRequest {
  title: string;
  opportunityId?: number | null;
  leadId?: number | null;
  recipientType?: ProposalRecipientType | null;
  recipientCode?: string | null;
  recipientName?: string | null;
  recipientEmail?: string | null;
  validUntil?: string | null;
  currency?: string;
  notes?: string | null;
  internalNotes?: string | null;
  assignedTo?: number | null;
}

export interface ProposalLineRequest {
  label?: string;
  description?: string | null;
  serviceType?: ProposalServiceType | null;
  serviceRefCode?: string | null;
  quantity?: number;
  unitPrice?: number;
  discountPercent?: number;
  taxRate?: number;
  taxIncluded?: boolean;
  sortOrder?: number;
  currency?: string;
}

// ==================== TYPES TASK ====================
export type TaskStatus =
  | "OPEN"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "ARCHIVED";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type TaskRecurrence =
  | "NONE"
  | "DAILY"
  | "WEEKLY"
  | "MONTHLY"
  | "AFTER_BOOKING";
export interface TaskChecklist {
  id?: number;
  label: string;
  completed: boolean;
  displayOrder: number;
}
export interface TaskComment {
  id: number;
  authorId: string;
  authorName: string;
  comment: string;
  createdAt: string;
}
export interface Task {
  id: number;
  title: string;
  description?: string;
  assignedTo?: number | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueAt?: string;
  sourceType?: string;
  sourceCode?: string;
  recurrence: TaskRecurrence;
  parentTaskId?: number | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  checklist: TaskChecklist[];
  comments: TaskComment[];
}
export interface TaskCard {
  id: number;
  title: string;
  assignedTo?: number | null;
  status: TaskStatus;
  priority: TaskPriority;
  recurrence: TaskRecurrence;
  parentTaskId?: number | null;
  sourceType?: string;
  sourceCode?: string;
  dueAt?: string;
  completedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  checklistTotal?: number;
  checklistDone?: number;
  commentCount?: number;
  overdue?: boolean;
}
export interface TaskBoardColumn {
  status: Exclude<TaskStatus, "ARCHIVED">;
  count: number;
  cards: TaskCard[];
}
export interface TaskBoard {
  columns: TaskBoardColumn[];
  totalTasks?: number;
  overdueTasks?: number;
}
export interface TaskMetrics {
  totalTasks: number;
  openTasks: number;
  inProgressTasks: number;
  completedTasks: number;
  cancelledTasks: number;
  archivedTasks: number;
  overdueTasks: number;
  completionRate: number;
  avgCompletionHours: number;
  byPriority: Record<string, number>;
  bySourceType: Record<string, number>;
}

// ==================== SERVICE ====================
export const operationsService = {
  // ===== SUPPORT =====
  getTickets: async (params?: {
    status?: TicketStatus;
    priority?: TicketPriority;
    assignedTo?: string;
    ownerType?: string;
    ownerCode?: string;
    category?: TicketCategory;
    relatedType?: string;
    relatedCode?: string;
    overdueOnly?: boolean;
    searchText?: string;
    page?: number;
    size?: number;
    sort?: string;
  }): Promise<PaginatedResult<SupportTicket>> => {
    const response = await apiClient.get("/sni/api/v1/support/tickets", {
      params,
    });
    return paginated<SupportTicket>(response.data);
  },
  getTicket: async (ticketNumber: string): Promise<SupportTicket> =>
    (await apiClient.get(`/sni/api/v1/support/tickets/${ticketNumber}`)).data,
  createTicket: async (data: {
    title: string;
    description: string;
    priority: TicketPriority;
    category: TicketCategory;
    ownerType?: string;
    ownerCode?: string;
    contactName?: string;
    contactEmail?: string;
    contactPhone?: string;
    relatedType?: string;
    relatedCode?: string;
  }): Promise<SupportTicket> =>
    (await apiClient.post("/sni/api/v1/support/tickets", data)).data,
  assignTicket: async (
    ticketNumber: string,
    assignedTo: string,
  ): Promise<SupportTicket> =>
    (
      await apiClient.patch(
        `/sni/api/v1/support/tickets/${ticketNumber}/assign`,
        { assignedTo },
      )
    ).data,
  updateTicketStatus: async (
    ticketNumber: string,
    status: TicketStatus,
  ): Promise<SupportTicket> =>
    (
      await apiClient.patch(
        `/sni/api/v1/support/tickets/${ticketNumber}/status`,
        { status },
      )
    ).data,
  addTicketMessage: async (
    ticketNumber: string,
    data: {
      authorId?: string;
      authorName?: string;
      senderType?: "CLIENT" | "AGENT" | "SYSTEM";
      senderId?: string;
      senderName?: string;
      content: string;
      internal?: boolean;
    },
  ): Promise<TicketMessage> =>
    (
      await apiClient.post(
        `/sni/api/v1/support/tickets/${ticketNumber}/messages`,
        data,
      )
    ).data,
  getTicketTimeline: async (
    ticketNumber: string,
  ): Promise<TicketTimelineEvent[]> =>
    list<TicketTimelineEvent>(
      (
        await apiClient.get(
          `/sni/api/v1/support/tickets/${ticketNumber}/timeline`,
        )
      ).data,
    ),
  getTicketAttachments: async (
    ticketNumber: string,
  ): Promise<TicketAttachment[]> =>
    list<TicketAttachment>(
      (
        await apiClient.get(
          `/sni/api/v1/support/tickets/${ticketNumber}/attachments`,
        )
      ).data,
    ),
  uploadTicketAttachment: async (
    ticketNumber: string,
    file: File,
    data?: { internal?: boolean; uploadedBy?: string; label?: string },
  ): Promise<TicketAttachment> => {
    const form = new FormData();
    form.append("file", file);
    if (data?.internal !== undefined)
      form.append("internal", String(data.internal));
    if (data?.uploadedBy) form.append("uploadedBy", data.uploadedBy);
    if (data?.label) form.append("label", data.label);
    return (
      await apiClient.post(
        `/sni/api/v1/support/tickets/${ticketNumber}/attachments`,
        form,
        { headers: { "Content-Type": "multipart/form-data" } },
      )
    ).data;
  },
  downloadTicketAttachment: async (
    ticketNumber: string,
    id: number,
  ): Promise<Blob> =>
    (
      await apiClient.get(
        `/sni/api/v1/support/tickets/${ticketNumber}/attachments/${id}/download`,
        { responseType: "blob" },
      )
    ).data,
  deleteTicketAttachment: async (
    ticketNumber: string,
    id: number,
  ): Promise<void> => {
    await apiClient.delete(
      `/sni/api/v1/support/tickets/${ticketNumber}/attachments/${id}`,
    );
  },
  addTicketTag: async (
    ticketNumber: string,
    tag: string,
  ): Promise<SupportTicket> =>
    (
      await apiClient.post(`/sni/api/v1/support/tickets/${ticketNumber}/tags`, {
        tag,
      })
    ).data,
  removeTicketTag: async (ticketNumber: string, tag: string): Promise<void> => {
    await apiClient.delete(
      `/sni/api/v1/support/tickets/${ticketNumber}/tags/${encodeURIComponent(tag)}`,
    );
  },
  convertTicketToTask: async (
    ticketNumber: string,
    data: {
      title: string;
      description?: string;
      assignedTo?: number;
      priority?: TaskPriority;
      dueAt?: string;
      checklist?: Array<{
        label: string;
        completed?: boolean;
        done?: boolean;
        displayOrder?: number;
      }>;
    },
  ): Promise<Task> =>
    (
      await apiClient.post(
        `/sni/api/v1/support/tickets/${ticketNumber}/task`,
        data,
      )
    ).data,
  getTicketOwnerSummary: async (params: {
    ownerType: string;
    ownerCode: string;
  }): Promise<TicketOwnerSummary> =>
    (await apiClient.get("/sni/api/v1/support/tickets/by-owner", { params }))
      .data,
  getTicketMetrics: async (): Promise<TicketMetrics> =>
    (await apiClient.get("/sni/api/v1/support/tickets/metrics")).data,
  getTicketAnalytics: async (params?: {
    from?: string;
    to?: string;
  }): Promise<TicketAnalytics> =>
    (await apiClient.get("/sni/api/v1/support/tickets/analytics", { params }))
      .data,
  downloadTicketAnalyticsCsv: async (params?: {
    from?: string;
    to?: string;
  }): Promise<Blob> =>
    (
      await apiClient.get("/sni/api/v1/support/tickets/analytics.csv", {
        params,
        responseType: "blob",
      })
    ).data,
  getSupportAgentPerformance: async (params?: {
    from?: string;
    to?: string;
  }): Promise<SupportAgentPerformance[]> =>
    list<SupportAgentPerformance>(
      (
        await apiClient.get("/sni/api/v1/support/tickets/agents/performance", {
          params,
        })
      ).data,
    ),

  // ===== VISITOR =====
  getVisitorPasses: async (params?: {
    status?: VisitorPassStatus;
    page?: number;
    size?: number;
  }): Promise<PaginatedResult<VisitorPass>> =>
    paginated<VisitorPass>(
      (await apiClient.get("/sni/api/v1/visitors/passes", { params })).data,
    ),
  getVisitorPassesToday: async (): Promise<VisitorPass[]> =>
    list<VisitorPass>(
      (await apiClient.get("/sni/api/v1/visitors/passes/today")).data,
    ),
  getVisitorPass: async (passNumber: string): Promise<VisitorPass> =>
    (await apiClient.get(`/sni/api/v1/visitors/passes/${passNumber}`)).data,
  createVisitorPass: async (data: {
    fullName: string;
    email?: string;
    phone?: string;
    company?: string;
    hostMemberCode?: string;
    hostName?: string;
    validFrom: string;
    validUntil: string;
    purpose?: string;
    createdBy: string;
  }): Promise<VisitorPass> =>
    (await apiClient.post("/sni/api/v1/visitors/passes", data)).data,
  checkIn: async (
    passNumber: string,
    data: { agent: string; notes?: string },
  ): Promise<VisitorPass> =>
    (await apiClient.post(`/sni/api/v1/visitors/${passNumber}/check-in`, data))
      .data,
  checkOut: async (
    passNumber: string,
    data: { agent: string; notes?: string },
  ): Promise<VisitorPass> =>
    (await apiClient.post(`/sni/api/v1/visitors/${passNumber}/check-out`, data))
      .data,
  getVisitorLog: async (params?: {
    page?: number;
    size?: number;
  }): Promise<PaginatedResult<VisitorLogEntry>> =>
    paginated<VisitorLogEntry>(
      (await apiClient.get("/sni/api/v1/visitors/log", { params })).data,
    ),

  // ===== CRM LEADS =====
  createLead: async (data: CreateLeadRequest): Promise<Lead> =>
    (await apiClient.post("/sni/api/v1/crm/leads", data)).data,
  captureLeadPublic: async (
    data: CreateLeadRequest,
  ): Promise<LeadCaptureResponse> =>
    (await apiClient.post("/sni/api/v1/public/crm/leads", data)).data,
  getLeads: async (params?: {
    stage?: LeadStage | string;
    assignedTo?: number;
    source?: LeadSource | string;
    searchText?: string;
    page?: number;
    size?: number;
    sort?: string;
  }): Promise<PaginatedResult<Lead>> =>
    paginated<Lead>(
      (await apiClient.get("/sni/api/v1/crm/leads", { params })).data,
    ),
  getLead: async (id: number): Promise<Lead> =>
    (await apiClient.get(`/sni/api/v1/crm/leads/${id}`)).data,
  getLeadByNumber: async (leadNumber: string): Promise<Lead> =>
    (await apiClient.get(`/sni/api/v1/crm/leads/number/${leadNumber}`)).data,
  updateLead: async (id: number, data: UpdateLeadRequest): Promise<Lead> =>
    (await apiClient.put(`/sni/api/v1/crm/leads/${id}`, data)).data,
  qualifyLead: async (id: number): Promise<Lead> =>
    (await apiClient.patch(`/sni/api/v1/crm/leads/${id}/qualify`)).data,
  updateLeadStage: async (
    id: number,
    stage: LeadStage,
    lostReason?: string | null,
  ): Promise<Lead> =>
    (
      await apiClient.patch(`/sni/api/v1/crm/leads/${id}/stage`, {
        stage,
        lostReason: lostReason ?? null,
      })
    ).data,
  convertLead: async (
    id: number,
    data: { ownerType: "CUSTOMER" | "MEMBER" | string; ownerCode: string },
  ): Promise<Lead> =>
    (await apiClient.patch(`/sni/api/v1/crm/leads/${id}/convert`, data)).data,
  addLeadActivity: async (
    id: number,
    data: {
      activityType: ActivityType;
      subject?: string;
      notes?: string;
      performedBy: string;
      performedAt?: string;
    },
  ): Promise<Lead> =>
    (await apiClient.post(`/sni/api/v1/crm/leads/${id}/activities`, data)).data,
  generateLeadQuote: async (
    id: number,
    data: { currency: string; performedBy: string },
  ): Promise<{ quoteNumber: string }> =>
    (await apiClient.post(`/sni/api/v1/crm/leads/${id}/generate-quote`, data))
      .data,

  // ===== CRM OPPORTUNITIES / BOARD / ANALYTICS =====
  createLeadOpportunity: async (
    leadId: number,
    data: {
      title: string;
      estimatedAmount?: number;
      probability?: number;
      expectedCloseDate?: string;
      assignedTo?: number;
      notes?: string;
    },
  ): Promise<Opportunity> =>
    (
      await apiClient.post(
        `/sni/api/v1/crm/leads/${leadId}/opportunities`,
        data,
      )
    ).data,
  getOpportunities: async (params?: {
    stage?: OpportunityStage;
    page?: number;
    size?: number;
    sort?: string;
  }): Promise<PaginatedResult<Opportunity>> =>
    paginated<Opportunity>(
      (await apiClient.get("/sni/api/v1/crm/opportunities", { params })).data,
    ),
  updateOpportunityStage: async (
    id: number,
    stage: OpportunityStage,
    lostReason?: string | null,
  ): Promise<Opportunity> =>
    (
      await apiClient.patch(`/sni/api/v1/crm/opportunities/${id}/stage`, {
        stage,
        lostReason: lostReason ?? null,
      })
    ).data,
  getCrmBoard: async (params?: {
    assignedTo?: number;
    source?: LeadSource | string;
    interest?: LeadInterest | string;
    searchText?: string;
  }): Promise<KanbanBoard> =>
    (await apiClient.get("/sni/api/v1/crm/board", { params })).data,
  getCrmPipeline: async (): Promise<CrmPipeline[]> => {
    const raw = (await apiClient.get("/sni/api/v1/crm/pipeline")).data;
    if (Array.isArray(raw)) return raw;
    if (Array.isArray(raw?.data)) return raw.data;
    if (Array.isArray(raw?.content)) return raw.content;
    if (raw?.stages) {
      return Object.entries(raw.stages).map(([stage, leads]) => ({
        stage: stage as LeadStage,
        count: Array.isArray(leads) ? leads.length : 0,
        totalValue: Array.isArray(leads)
          ? leads.reduce(
              (sum: number, lead: any) => sum + (lead?.estimatedAmount ?? 0),
              0,
            )
          : 0,
        leads: Array.isArray(leads) ? leads : [],
      }));
    }
    return [];
  },
  getCrmMetrics: async (): Promise<CrmMetrics> =>
    (await apiClient.get("/sni/api/v1/crm/metrics")).data,
  getCrmAnalytics: async (params?: {
    from?: string;
    to?: string;
  }): Promise<CrmAnalytics> =>
    (await apiClient.get("/sni/api/v1/crm/analytics", { params })).data,

  // ===== CRM PROPOSALS =====
  createProposal: async (data: ProposalRequest): Promise<ProposalResponse> =>
    (await apiClient.post("/sni/api/v1/crm/proposals", data)).data,

  getProposals: async (params?: {
    status?: ProposalStatus | string;
    opportunityId?: number;
    searchText?: string;
    page?: number;
    size?: number;
    sort?: string;
  }): Promise<PaginatedResult<ProposalResponse>> =>
    paginated<ProposalResponse>(
      (await apiClient.get("/sni/api/v1/crm/proposals", { params })).data,
    ),

  getProposal: async (id: number): Promise<ProposalResponse> =>
    (await apiClient.get(`/sni/api/v1/crm/proposals/${id}`)).data,

  getProposalByNumber: async (
    proposalNumber: string,
  ): Promise<ProposalResponse> =>
    (await apiClient.get(`/sni/api/v1/crm/proposals/number/${proposalNumber}`))
      .data,

  updateProposal: async (
    id: number,
    data: Partial<ProposalRequest>,
  ): Promise<ProposalResponse> =>
    (await apiClient.put(`/sni/api/v1/crm/proposals/${id}`, data)).data,

  sendProposal: async (id: number): Promise<ProposalResponse> =>
    (await apiClient.patch(`/sni/api/v1/crm/proposals/${id}/send`)).data,

  acceptProposal: async (id: number): Promise<ProposalResponse> =>
    (await apiClient.patch(`/sni/api/v1/crm/proposals/${id}/accept`)).data,

  rejectProposal: async (
    id: number,
    reason: string,
  ): Promise<ProposalResponse> =>
    (
      await apiClient.patch(`/sni/api/v1/crm/proposals/${id}/reject`, {
        reason,
      })
    ).data,

  addProposalLine: async (
    proposalId: number,
    data: ProposalLineRequest,
  ): Promise<ProposalResponse> =>
    (
      await apiClient.post(
        `/sni/api/v1/crm/proposals/${proposalId}/lines`,
        data,
      )
    ).data,

  updateProposalLine: async (
    proposalId: number,
    lineId: number,
    data: ProposalLineRequest,
  ): Promise<ProposalResponse> =>
    (
      await apiClient.put(
        `/sni/api/v1/crm/proposals/${proposalId}/lines/${lineId}`,
        data,
      )
    ).data,

  deleteProposalLine: async (
    proposalId: number,
    lineId: number,
  ): Promise<ProposalResponse> =>
    (
      await apiClient.delete(
        `/sni/api/v1/crm/proposals/${proposalId}/lines/${lineId}`,
      )
    ).data,

  // ===== TASK =====
  getTasks: async (params?: {
    status?: TaskStatus;
    assignedTo?: number;
    priority?: TaskPriority;
    sourceType?: string;
    searchText?: string;
    page?: number;
    size?: number;
    sort?: string;
  }): Promise<PaginatedResult<Task>> =>
    paginated<Task>(
      (await apiClient.get("/sni/api/v1/tasks", { params })).data,
    ),
  getTask: async (id: number): Promise<Task> =>
    (await apiClient.get(`/sni/api/v1/tasks/${id}`)).data,
  createTask: async (data: {
    title: string;
    description?: string;
    assignedTo?: number;
    priority?: TaskPriority;
    dueAt?: string;
    sourceType?: string;
    sourceCode?: string;
    recurrence?: TaskRecurrence;
    checklist?: TaskChecklist[];
  }): Promise<Task> => (await apiClient.post("/sni/api/v1/tasks", data)).data,
  updateTask: async (
    id: number,
    data: {
      title?: string;
      description?: string;
      priority?: TaskPriority;
      dueAt?: string;
      sourceType?: string;
      sourceCode?: string;
      recurrence?: TaskRecurrence;
    },
  ): Promise<Task> =>
    (await apiClient.put(`/sni/api/v1/tasks/${id}`, data)).data,
  completeTask: async (id: number): Promise<Task> =>
    (await apiClient.patch(`/sni/api/v1/tasks/${id}/complete`)).data,
  archiveTask: async (id: number): Promise<Task> =>
    (await apiClient.patch(`/sni/api/v1/tasks/${id}/archive`)).data,
  updateTaskStatus: async (id: number, status: TaskStatus): Promise<Task> =>
    (await apiClient.patch(`/sni/api/v1/tasks/${id}/status`, { status })).data,
  assignTask: async (id: number, assignedTo: number | null): Promise<Task> =>
    (await apiClient.patch(`/sni/api/v1/tasks/${id}/assign`, { assignedTo }))
      .data,
  addTaskComment: async (
    id: number,
    data: { authorId: string; authorName: string; comment: string },
  ): Promise<Task> =>
    (await apiClient.post(`/sni/api/v1/tasks/${id}/comments`, data)).data,
  addTaskChecklistItem: async (
    id: number,
    data: TaskChecklist,
  ): Promise<Task> =>
    (await apiClient.post(`/sni/api/v1/tasks/${id}/checklist`, data)).data,
  updateTaskChecklistItem: async (
    id: number,
    itemId: number,
    data: Partial<TaskChecklist>,
  ): Promise<Task> =>
    (await apiClient.patch(`/sni/api/v1/tasks/${id}/checklist/${itemId}`, data))
      .data,
  deleteTaskChecklistItem: async (
    id: number,
    itemId: number,
  ): Promise<void> => {
    await apiClient.delete(`/sni/api/v1/tasks/${id}/checklist/${itemId}`);
  },
  getDueTodayTasks: async (): Promise<Task[]> =>
    list<Task>((await apiClient.get("/sni/api/v1/tasks/due-today")).data),
  getTaskBoard: async (params?: {
    assignedTo?: number;
    priority?: TaskPriority;
    sourceType?: string;
    searchText?: string;
  }): Promise<TaskBoard> =>
    (await apiClient.get("/sni/api/v1/tasks/board", { params })).data,
  getTaskMetrics: async (): Promise<TaskMetrics> =>
    (await apiClient.get("/sni/api/v1/tasks/metrics")).data,
};
