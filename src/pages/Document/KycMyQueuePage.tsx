import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Eye, Inbox, XCircle } from "lucide-react";
import { kycService } from "../../services/document.service";
import { useAuth } from "../../contexts/AuthContext";
import { ErrorBlock, EmptyState, Field, IconButton, ListHeader, PanelForm, Pagination } from "../../components/subscription/kit";
import { FIELD } from "../../components/subscription/kitUtils";
import { ListSkeleton } from "../../components/ui/Skeleton";
import { toast } from "../../components/ui/toastStore";
import { CaseCard, CaseHead, CaseRow } from "../../components/documents/CaseList";
import { apiMessage } from "../../components/subscription/kitUtils";

const PAGE_SIZE = 15;

export const KycMyQueuePage: React.FC = () => {
  const { admin } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const adminId = Number(admin?.id) || 1;
  const [page, setPage] = useState(0);
  const [decision, setDecision] = useState<{ action: "approve" | "reject"; code: string } | null>(null);
  const [comment, setComment] = useState("");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["kyc-my-queue", page],
    queryFn: () => kycService.getMyQueue(adminId, { page, size: PAGE_SIZE }),
    refetchInterval: 60000,
  });

  const done = (msg: string) => {
    queryClient.invalidateQueries({ queryKey: ["kyc-my-queue"] });
    queryClient.invalidateQueries({ queryKey: ["kyc-dashboard"] });
    toast.success(msg);
    setDecision(null);
    setComment("");
  };

  const approve = useMutation({
    mutationFn: (code: string) => kycService.approveKycCase(code, adminId, comment || "Approuvé depuis ma file"),
    onSuccess: () => done("Dossier approuvé"),
    onError: (e) => toast.error(apiMessage(e, "Approbation impossible")),
  });
  const reject = useMutation({
    mutationFn: (code: string) => kycService.rejectKycCase(code, adminId, comment),
    onSuccess: () => done("Dossier rejeté"),
    onError: (e) => toast.error(apiMessage(e, "Rejet impossible")),
  });

  const cases = data?.content ?? [];
  const total = data?.totalElements ?? 0;
  const pending = approve.isPending || reject.isPending;

  return (
    <div className="space-y-5">
      <ListHeader title="Mes dossiers" subtitle={isLoading ? undefined : `${total} dossier${total > 1 ? "s" : ""} assigné${total > 1 ? "s" : ""} à vous`} />

      {decision && (
        <PanelForm
          title={`${decision.action === "approve" ? "Approuver" : "Rejeter"} le dossier ${decision.code}`}
          onCancel={() => setDecision(null)}
          pending={pending}
          submitLabel={decision.action === "approve" ? "Approuver" : "Rejeter"}
          submitDisabled={decision.action === "reject" && !comment.trim()}
          onSubmit={(e) => {
            e.preventDefault();
            if (decision.action === "approve") approve.mutate(decision.code);
            else reject.mutate(decision.code);
          }}
        >
          <Field label={decision.action === "approve" ? "Commentaire" : "Motif du rejet"} required={decision.action === "reject"}>
            <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} className={`${FIELD} resize-none`} />
          </Field>
        </PanelForm>
      )}

      {isLoading ? (
        <ListSkeleton rows={6} />
      ) : isError ? (
        <ErrorBlock message="Impossible de charger votre file." onRetry={() => refetch()} />
      ) : cases.length === 0 ? (
        <EmptyState icon={Inbox} title="Votre file est vide" hint="Aucun dossier ne vous est assigné pour le moment." />
      ) : (
        <>
          <CaseHead />
          <CaseCard>
            {cases.map((c) => (
              <CaseRow
                key={c.code}
                kycCase={c}
                date={c.slaDeadline}
                onOpen={() => navigate(`/documents/kyc/cases/${c.code}`)}
                actions={
                  <>
                    <IconButton icon={Eye} label="Examiner" onClick={() => navigate(`/documents/kyc/cases/${c.code}`)} />
                    <IconButton icon={CheckCircle2} label="Approuver" tone="success" onClick={() => { setComment(""); setDecision({ action: "approve", code: c.code }); }} />
                    <IconButton icon={XCircle} label="Rejeter" tone="danger" onClick={() => { setComment(""); setDecision({ action: "reject", code: c.code }); }} />
                  </>
                }
              />
            ))}
          </CaseCard>
          <Pagination page={page} totalPages={data?.totalPages ?? 0} total={total} noun="dossier" onChange={setPage} />
        </>
      )}
    </div>
  );
};
