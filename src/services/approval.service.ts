import { apiClient } from "./api";
import { API, toList, toPage } from "./pagination";
import type { PageResult } from "./pagination";

// Moteur commun d'approbation (ApprovalController), préfixe /sni/api/v1/approvals.
// Centres : BILLING, CASH et BOOKING. Droit d'entrée ADMIN:ACCESS ; APPROVAL:MANAGE pour la hiérarchie, les circuits et tout l'historique.

export type ApprovalCenter = "BILLING" | "CASH" | "BOOKING";
export const APPROVAL_STATUSES = ["PENDING", "APPROVED", "REJECTED", "RETURNED", "CANCELLED"];

export interface Step { level?: number; label?: string; rule?: string; expectedApprover?: string; expectedApproverName?: string; permission?: string; status?: string; decidedBy?: string; decidedByName?: string; delegatedFrom?: string; decidedAt?: string; comment?: string }
export interface ApprovalEvent { level?: number; actor?: string; actorName?: string; event?: string; comment?: string; amountBefore?: number; amountAfter?: number; delegatedFrom?: string; occurredAt?: string }
export interface ApprovalRequest {
  number: string; center?: string; requestType?: string; subjectType?: string; subjectRef?: string; title?: string; amount?: number; currency?: string; requester?: string; requesterName?: string;
  status?: string; requiredLevels?: number; currentLevel?: number; currentLabel?: string; waitingFor?: string; levelSince?: string; lastComment?: string; submittedAt?: string; decidedAt?: string;
  decidedBy?: string; detailsJson?: string; canDecide?: boolean; steps?: Step[]; timeline?: ApprovalEvent[];
}
export interface LevelSpec { label: string; rule: "MANAGER" | "PERMISSION" | "USER"; depth?: number; permission?: string; userLogin?: string; minAmount?: number }
export interface Circuit { code: string; center: string; requestType: string; label: string; active?: boolean; levels: LevelSpec[] }
export interface Delegation { id: number; delegator?: string; delegate?: string; center?: string; level?: number; startsOn?: string; endsOn?: string; reason?: string }
export interface HierarchyNode { userCode: string; email?: string; fullName?: string; jobTitle?: string; managerUserCode?: string; managerName?: string }
export interface HistoryFilter { type?: string; requester?: string; approver?: string; status?: string; from?: string; to?: string; page?: number; size?: number }
export interface Decision { comment?: string; reducedAmount?: number }

const B = `${API}/approvals`;
const enc = encodeURIComponent;
const clean = <T extends object>(o: T): T => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== "" && v !== undefined && v !== null)) as T;

export const approvalService = {
  async toApprove(center: ApprovalCenter): Promise<ApprovalRequest[]> { return toList<ApprovalRequest>((await apiClient.get(`${B}/${center}/to-approve`)).data); },
  async mine(center: ApprovalCenter): Promise<ApprovalRequest[]> { return toList<ApprovalRequest>((await apiClient.get(`${B}/${center}/mine`)).data); },
  async history(center: ApprovalCenter, f: HistoryFilter): Promise<PageResult<ApprovalRequest>> { return toPage<ApprovalRequest>((await apiClient.get(`${B}/${center}/history`, { params: clean({ size: 20, ...f }) })).data); },
  async get(number: string): Promise<ApprovalRequest> { return (await apiClient.get(`${B}/requests/${enc(number)}`)).data; },
  async approve(number: string, d?: Decision): Promise<ApprovalRequest> { return (await apiClient.patch(`${B}/${enc(number)}/approve`, d ? clean(d) : null)).data; },
  async reject(number: string, d: Decision): Promise<ApprovalRequest> { return (await apiClient.patch(`${B}/${enc(number)}/reject`, clean(d))).data; },
  async sendBack(number: string, d: Decision): Promise<ApprovalRequest> { return (await apiClient.patch(`${B}/${enc(number)}/send-back`, clean(d))).data; },

  async hierarchy(): Promise<HierarchyNode[]> { return toList<HierarchyNode>((await apiClient.get(`${B}/hierarchy`)).data); },
  async setManager(userCode: string, managerUserCode?: string): Promise<HierarchyNode[]> { return toList<HierarchyNode>((await apiClient.put(`${B}/hierarchy`, { userCode, managerUserCode: managerUserCode || null })).data); },

  async circuits(center?: ApprovalCenter): Promise<Circuit[]> { return toList<Circuit>((await apiClient.get(`${B}/circuits`, { params: { center } })).data); },
  async saveCircuit(c: Circuit): Promise<Circuit> { return (await apiClient.post(`${B}/circuits`, c)).data; },

  async delegations(center?: ApprovalCenter): Promise<Delegation[]> { return toList<Delegation>((await apiClient.get(`${B}/delegations`, { params: { center } })).data); },
  async delegate(b: { delegate: string; center?: string; level?: number; startsOn: string; endsOn: string; reason?: string }): Promise<Delegation> { return (await apiClient.post(`${B}/delegations`, clean(b))).data; },
  async cancelDelegation(id: number): Promise<void> { await apiClient.delete(`${B}/delegations/${id}`); },
};
