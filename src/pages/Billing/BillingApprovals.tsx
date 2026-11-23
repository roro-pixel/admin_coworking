import React from "react";
import { ApprovalCenterView } from "../accounting/approval/ApprovalsPage";
import { ApprovalRequestView } from "../accounting/approval/ApprovalDetailPage";

/** Centre d'approbation de la facturation : modifications de facture, dérogations de prix et de remise. */
export const BillingApprovals: React.FC = () => <ApprovalCenterView center="BILLING" basePath="/billing/approvals" />;

export const BillingApprovalDetail: React.FC = () => <ApprovalRequestView basePath="/billing/approvals" backLabel="Approbations de la facturation" />;
