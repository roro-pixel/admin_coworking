import { apiClient } from './api';

// ==================== TYPES SUPPORT ====================
export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'WAITING_CLIENT' | 'RESOLVED' | 'CLOSED';
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TicketCategory = 'BILLING' | 'BOOKING' | 'ACCESS' | 'TECHNICAL' | 'OTHER';

export interface TicketMessage {
  id: number;
  ticketNumber: string;
  authorId: string;
  authorName: string;
  content: string;
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
}

export interface TicketMetrics {
  totalOpen: number;
  totalInProgress: number;
  totalResolved: number;
  avgResolutionTimeHours: number;
  slaBreached: number;
}

// ==================== TYPES VISITOR ====================
export type VisitorPassStatus = 'SCHEDULED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'CANCELLED' | 'EXPIRED';

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
  eventType: 'CHECK_IN' | 'CHECK_OUT';
  agent: string;
  notes?: string;
  eventAt: string;
}

// ==================== TYPES CRM ====================
export type LeadStage = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'PROPOSAL_SENT' | 'WON' | 'LOST';
export type ActivityType = 'CALL' | 'EMAIL' | 'MEETING' | 'VISIT' | 'NOTE';

export interface LeadActivity {
  id: number;
  activityType: ActivityType;
  subject: string;
  notes?: string;
  performedBy: string;
  performedAt: string;
}

export interface Lead {
  id: number;
  fullName: string;
  email?: string;
  phone?: string;
  company?: string;
  source?: string;
  interest?: string;
  estimatedAmount?: number;
  probability?: number;
  expectedCloseDate?: string;
  stage: LeadStage;
  assignedTo?: number;
  lostReason?: string;
  convertedOwnerType?: string;
  convertedOwnerCode?: string;
  activities: LeadActivity[];
  createdAt: string;
  updatedAt: string;
}

export interface CrmPipeline {
  stage: LeadStage;
  count: number;
  totalValue: number;
  leads: Lead[];
}

export interface CrmMetrics {
  totalLeads: number;
  wonLeads: number;
  lostLeads: number;
  pipelineValue: number;
  conversionRate: number;
}

// ==================== TYPES TASK ====================
export type TaskStatus = 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TaskRecurrence = 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'AFTER_BOOKING';

export interface TaskChecklist {
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
  status: TaskStatus;
  priority: TaskPriority;
  assignedTo?: number;
  dueAt?: string;
  sourceType?: string;
  sourceCode?: string;
  recurrence: TaskRecurrence;
  checklist: TaskChecklist[];
  comments: TaskComment[];
  createdAt: string;
  updatedAt: string;
}

// ==================== HELPERS ====================
const paginated = <T>(raw: any): { content: T[]; totalElements: number; totalPages: number } => {
  if (raw?.content !== undefined) return raw;
  if (Array.isArray(raw?.data)) return { content: raw.data, totalElements: raw.data.length, totalPages: 1 };
  if (Array.isArray(raw)) return { content: raw, totalElements: raw.length, totalPages: 1 };
  return { content: [], totalElements: 0, totalPages: 0 };
};

// ==================== SERVICE ====================
export const operationsService = {

  // ===== SUPPORT =====
  getTickets: async (params?: {
    status?: TicketStatus;
    priority?: TicketPriority;
    assignedTo?: string;
    ownerType?: string;
    ownerCode?: string;
    page?: number;
    size?: number;
  }): Promise<{ content: SupportTicket[]; totalElements: number; totalPages: number }> => {
    const response = await apiClient.get('/sni/api/v1/support/tickets', { params });
    return paginated<SupportTicket>(response.data);
  },

  getTicket: async (ticketNumber: string): Promise<SupportTicket> => {
    const response = await apiClient.get(`/sni/api/v1/support/tickets/${ticketNumber}`);
    return response.data;
  },

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
  }): Promise<SupportTicket> => {
    const response = await apiClient.post('/sni/api/v1/support/tickets', data);
    return response.data;
  },

  assignTicket: async (ticketNumber: string, assignedTo: string): Promise<SupportTicket> => {
    const response = await apiClient.patch(`/sni/api/v1/support/tickets/${ticketNumber}/assign`, { assignedTo });
    return response.data;
  },

  updateTicketStatus: async (ticketNumber: string, status: TicketStatus): Promise<SupportTicket> => {
    const response = await apiClient.patch(`/sni/api/v1/support/tickets/${ticketNumber}/status`, { status });
    return response.data;
  },

  addTicketMessage: async (ticketNumber: string, data: {
    authorId: string;
    authorName: string;
    content: string;
  }): Promise<TicketMessage> => {
    const response = await apiClient.post(`/sni/api/v1/support/tickets/${ticketNumber}/messages`, data);
    return response.data;
  },

  getTicketMetrics: async (): Promise<TicketMetrics> => {
    const response = await apiClient.get('/sni/api/v1/support/tickets/metrics');
    return response.data;
  },

  // ===== VISITOR =====
  getVisitorPasses: async (params?: {
    status?: VisitorPassStatus;
    page?: number;
    size?: number;
  }): Promise<{ content: VisitorPass[]; totalElements: number; totalPages: number }> => {
    const response = await apiClient.get('/sni/api/v1/visitors/passes', { params });
    return paginated<VisitorPass>(response.data);
  },

  getVisitorPassesToday: async (): Promise<VisitorPass[]> => {
    const response = await apiClient.get('/sni/api/v1/visitors/passes/today');
    if (Array.isArray(response.data)) return response.data;
    if (Array.isArray(response.data?.data)) return response.data.data;
    return [];
  },

  getVisitorPass: async (passNumber: string): Promise<VisitorPass> => {
    const response = await apiClient.get(`/sni/api/v1/visitors/passes/${passNumber}`);
    return response.data;
  },

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
  }): Promise<VisitorPass> => {
    const response = await apiClient.post('/sni/api/v1/visitors/passes', data);
    return response.data;
  },

  checkIn: async (passNumber: string, data: { agent: string; notes?: string }): Promise<VisitorPass> => {
    const response = await apiClient.post(`/sni/api/v1/visitors/${passNumber}/check-in`, data);
    return response.data;
  },

  checkOut: async (passNumber: string, data: { agent: string; notes?: string }): Promise<VisitorPass> => {
    const response = await apiClient.post(`/sni/api/v1/visitors/${passNumber}/check-out`, data);
    return response.data;
  },

  getVisitorLog: async (params?: { page?: number; size?: number }): Promise<{ content: VisitorLogEntry[]; totalElements: number; totalPages: number }> => {
    const response = await apiClient.get('/sni/api/v1/visitors/log', { params });
    return paginated<VisitorLogEntry>(response.data);
  },

  // ===== CRM =====
  getLeads: async (params?: {
    stage?: LeadStage;
    assignedTo?: number;
    page?: number;
    size?: number;
  }): Promise<{ content: Lead[]; totalElements: number; totalPages: number }> => {
    const response = await apiClient.get('/sni/api/v1/crm/leads', { params });
    return paginated<Lead>(response.data);
  },

  getLead: async (id: number): Promise<Lead> => {
    const response = await apiClient.get(`/sni/api/v1/crm/leads/${id}`);
    return response.data;
  },

  createLead: async (data: {
    fullName: string;
    email?: string;
    phone?: string;
    company?: string;
    source?: string;
    interest?: string;
    estimatedAmount?: number;
    probability?: number;
    expectedCloseDate?: string;
    assignedTo?: number;
  }): Promise<Lead> => {
    const response = await apiClient.post('/sni/api/v1/crm/leads', data);
    return response.data;
  },

  qualifyLead: async (id: number): Promise<Lead> => {
    const response = await apiClient.patch(`/sni/api/v1/crm/leads/${id}/qualify`);
    return response.data;
  },

  updateLeadStage: async (id: number, stage: LeadStage, lostReason?: string): Promise<Lead> => {
    const response = await apiClient.patch(`/sni/api/v1/crm/leads/${id}/stage`, { stage, lostReason });
    return response.data;
  },

  convertLead: async (id: number, data: { ownerType: string; ownerCode: string }): Promise<Lead> => {
    const response = await apiClient.patch(`/sni/api/v1/crm/leads/${id}/convert`, data);
    return response.data;
  },

  addLeadActivity: async (id: number, data: {
    activityType: ActivityType;
    subject: string;
    notes?: string;
    performedBy: string;
    performedAt: string;
  }): Promise<LeadActivity> => {
    const response = await apiClient.post(`/sni/api/v1/crm/leads/${id}/activities`, data);
    return response.data;
  },

  getCrmPipeline: async (): Promise<CrmPipeline[]> => {
    const response = await apiClient.get('/sni/api/v1/crm/pipeline');
    if (Array.isArray(response.data)) return response.data;
    return [];
  },

  getCrmMetrics: async (): Promise<CrmMetrics> => {
    const response = await apiClient.get('/sni/api/v1/crm/metrics');
    return response.data;
  },

  // ===== TASK =====
  getTasks: async (params?: {
    status?: TaskStatus;
    assignedTo?: number;
    page?: number;
    size?: number;
  }): Promise<{ content: Task[]; totalElements: number; totalPages: number }> => {
    const response = await apiClient.get('/sni/api/v1/tasks', { params });
    return paginated<Task>(response.data);
  },

  getTask: async (id: number): Promise<Task> => {
    const response = await apiClient.get(`/sni/api/v1/tasks/${id}`);
    return response.data;
  },

  getDueTodayTasks: async (): Promise<Task[]> => {
    const response = await apiClient.get('/sni/api/v1/tasks/due-today');
    if (Array.isArray(response.data)) return response.data;
    if (Array.isArray(response.data?.data)) return response.data.data;
    return [];
  },

  createTask: async (data: {
    title: string;
    description?: string;
    assignedTo?: number;
    priority: TaskPriority;
    dueAt?: string;
    sourceType?: string;
    sourceCode?: string;
    recurrence?: TaskRecurrence;
    checklist?: TaskChecklist[];
  }): Promise<Task> => {
    const response = await apiClient.post('/sni/api/v1/tasks', data);
    return response.data;
  },

  completeTask: async (id: number): Promise<Task> => {
    const response = await apiClient.patch(`/sni/api/v1/tasks/${id}/complete`);
    return response.data;
  },

  assignTask: async (id: number, assignedTo: number): Promise<Task> => {
    const response = await apiClient.patch(`/sni/api/v1/tasks/${id}/assign`, { assignedTo });
    return response.data;
  },

  addTaskComment: async (id: number, data: {
    authorId: string;
    authorName: string;
    comment: string;
  }): Promise<TaskComment> => {
    const response = await apiClient.post(`/sni/api/v1/tasks/${id}/comments`, data);
    return response.data;
  },
};