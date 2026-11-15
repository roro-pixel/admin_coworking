import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Mail, MapPin, Phone, StickyNote, Users, X, CircleCheck, FileText, Repeat } from "lucide-react";
import { operationsService } from "../../services/operations.service";
import type { ActivityType, Lead, LeadStage } from "../../services/operations.service";
import { useAuth } from "../../contexts/AuthContext";
import { brandVars } from "../layout/adminTheme";
import { ModalPortal } from "../ui/ModalPortal";
import { RichTextEditor } from "../ui/RichTextEditor";
import { toast } from "../ui/toastStore";
import { Dots } from "../ui/Toaster";
import { ActionButton, Detail, Field, IconButton, PanelForm, StatusChip, Tag } from "../subscription/kit";
import { FIELD, FOCUS, PINK_SOFT, apiMessage, formatDateTime, formatMoney } from "../subscription/kitUtils";
import { statusOf } from "../subscription/labels";
import { Avatar, PillChoice, RichHtml } from "./opsKit";
import {
  ACTIVITY_LABELS,
  ACTIVITY_TYPES,
  LEAD_INTERESTS,
  LEAD_STAGE,
  LEAD_STAGES,
} from "./opsLabels";

const ACTIVITY_ICON: Record<string, React.ElementType> = {
  CALL: Phone,
  EMAIL: Mail,
  MEETING: Users,
  VISIT: MapPin,
  NOTE: StickyNote,
};

const activityOptions = ACTIVITY_TYPES.map((t) => ({ value: t as ActivityType, label: ACTIVITY_LABELS[t] }));

const nowLocal = () => new Date().toISOString().slice(0, 16);

export const LeadDetailModal: React.FC<{
  lead: Lead;
  onClose: () => void;
  /** Change l'étape (le motif de perte passe par lostPanel) */
  onStage: (stage: LeadStage) => void;
  stageBusy: LeadStage | null;
  /** Panneau de motif de perte, affiché à la place des boutons d'étape quand il est ouvert */
  lostPanel: React.ReactNode;
  refetch: () => void;
}> = ({ lead, onClose, onStage, stageBusy, lostPanel, refetch }) => {
  const { admin } = useAuth();
  const queryClient = useQueryClient();
  const [isConvertOpen, setIsConvertOpen] = useState(false);
  const [convertForm, setConvertForm] = useState({ ownerType: "CUSTOMER", ownerCode: "" });
  const [activityForm, setActivityForm] = useState({
    activityType: "NOTE" as ActivityType,
    subject: "",
    notes: "",
    performedAt: nowLocal(),
  });

  const qualifyMutation = useMutation({
    mutationFn: (id: number) => operationsService.qualifyLead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-leads"] });
      queryClient.invalidateQueries({ queryKey: ["crm-board"] });
      refetch();
      toast.success("Lead qualifié");
    },
    onError: (e: any) => toast.error(apiMessage(e, "Erreur qualification")),
  });
  const activityMutation = useMutation({
    mutationFn: () =>
      operationsService.addLeadActivity(lead.id, {
        ...activityForm,
        performedBy: admin?.email || "admin",
        performedAt: new Date(activityForm.performedAt).toISOString(),
      }),
    onSuccess: () => {
      refetch();
      queryClient.invalidateQueries({ queryKey: ["crm-board"] });
      setActivityForm({ activityType: "NOTE", subject: "", notes: "", performedAt: nowLocal() });
      toast.success("Activité ajoutée");
    },
    onError: (e: any) => toast.error(apiMessage(e, "Erreur ajout activité")),
  });
  const convertMutation = useMutation({
    mutationFn: () => operationsService.convertLead(lead.id, convertForm),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-leads"] });
      queryClient.invalidateQueries({ queryKey: ["crm-board"] });
      setIsConvertOpen(false);
      refetch();
      toast.success("Lead converti");
    },
    onError: (e: any) => toast.error(apiMessage(e, "Erreur conversion")),
  });
  const quoteMutation = useMutation({
    mutationFn: (id: number) =>
      operationsService.generateLeadQuote(id, {
        currency: "XAF",
        performedBy: admin?.email || "admin",
      }),
    onSuccess: (data) => {
      toast.success(`Devis généré : ${data.quoteNumber}`);
      refetch();
    },
    onError: (e: any) => toast.error(apiMessage(e, "Erreur génération devis")),
  });

  const stage = statusOf(LEAD_STAGE, lead.stage);
  const interest = LEAD_INTERESTS.find((i) => i.value === lead.interest)?.label || lead.interest;

  return (
    <ModalPortal onClose={onClose} size="3xl">
      <div style={brandVars}>
      <div className="p-5 sm:p-7">
        <div className="flex items-start gap-4">
          <Avatar name={lead.fullName} />
          <div className="min-w-0 flex-1">
            <h3 className="break-words text-xl font-bold tracking-tight text-gray-950">{lead.fullName}</h3>
            <p className="mt-0.5 font-mono text-xs font-semibold text-[color:var(--logo-pink-dark)]">{lead.leadNumber}</p>
          </div>
          <IconButton icon={X} label="Fermer" tone="neutral" onClick={onClose} />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <StatusChip tone={stage.tone}>{stage.label}</StatusChip>
          <Tag>Score auto {lead.scoredProbability ?? (lead as any).score ?? 0} %</Tag>
          <Tag>Probabilité agent {lead.probability ?? 0} %</Tag>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-x-6 gap-y-4 rounded-2xl bg-gray-50 p-5 sm:grid-cols-2">
          <Detail label="Email">{lead.email}</Detail>
          <Detail label="Téléphone">{lead.phone}</Detail>
          <Detail label="Société">{lead.company}</Detail>
          <Detail label="Intérêt">{interest}</Detail>
          <Detail label="Montant estimé">{formatMoney(lead.estimatedAmount)}</Detail>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <ActionButton
            variant="ghost"
            icon={CircleCheck}
            pending={qualifyMutation.isPending}
            onClick={() => qualifyMutation.mutate(lead.id)}
          >
            Qualifier
          </ActionButton>
          <ActionButton
            variant="ghost"
            icon={FileText}
            pending={quoteMutation.isPending}
            disabled={lead.stage === "LOST"}
            onClick={() => quoteMutation.mutate(lead.id)}
          >
            Générer un devis
          </ActionButton>
          <ActionButton variant="ghost" icon={Repeat} onClick={() => setIsConvertOpen((v) => !v)}>
            Convertir
          </ActionButton>
        </div>

        {isConvertOpen && (
          <div className="mt-4">
            <PanelForm
              title="Convertir le lead"
              submitLabel="Convertir"
              pending={convertMutation.isPending}
              submitDisabled={!convertForm.ownerCode}
              onCancel={() => setIsConvertOpen(false)}
              onSubmit={(e) => {
                e.preventDefault();
                if (convertForm.ownerCode) convertMutation.mutate();
              }}
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Type">
                  <select
                    value={convertForm.ownerType}
                    onChange={(e) => setConvertForm((f) => ({ ...f, ownerType: e.target.value }))}
                    className={`${FIELD} bg-gray-50 shadow-none`}
                  >
                    <option value="CUSTOMER">Client</option>
                    <option value="MEMBER">Membre</option>
                  </select>
                </Field>
                <Field label="Code client ou membre" required>
                  <input
                    value={convertForm.ownerCode}
                    onChange={(e) => setConvertForm((f) => ({ ...f, ownerCode: e.target.value }))}
                    className={`${FIELD} bg-gray-50 shadow-none`}
                  />
                </Field>
              </div>
            </PanelForm>
          </div>
        )}

        <div className="mt-6">
          <p className="mb-2 text-xs font-semibold text-gray-400">Changer d'étape</p>
          {lostPanel ?? (
            <div className="flex flex-wrap gap-2">
              {LEAD_STAGES.map((s) => {
                const on = lead.stage === s;
                const busy = stageBusy === s;
                return (
                  <button
                    key={s}
                    type="button"
                    disabled={on || stageBusy !== null}
                    onClick={() => onStage(s)}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed ${FOCUS} ${
                      on
                        ? `${PINK_SOFT} text-[color:var(--logo-pink-dark)]`
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-60"
                    }`}
                  >
                    {busy ? <Dots /> : LEAD_STAGE[s].label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <form
          className="mt-6 space-y-4 rounded-2xl bg-gray-50 p-5"
          onSubmit={(e) => {
            e.preventDefault();
            activityMutation.mutate();
          }}
        >
          <h4 className="text-base font-bold text-gray-950">Ajouter une activité</h4>
          <PillChoice
            label="Type d'activité"
            options={activityOptions}
            value={activityForm.activityType}
            onChange={(activityType) => setActivityForm((f) => ({ ...f, activityType }))}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Sujet">
              <input
                value={activityForm.subject}
                onChange={(e) => setActivityForm((f) => ({ ...f, subject: e.target.value }))}
                className={FIELD}
              />
            </Field>
            <Field label="Date et heure">
              <input
                type="datetime-local"
                value={activityForm.performedAt}
                onChange={(e) => setActivityForm((f) => ({ ...f, performedAt: e.target.value }))}
                className={FIELD}
              />
            </Field>
          </div>
          <RichTextEditor
            value={activityForm.notes}
            onChange={(v) => setActivityForm((f) => ({ ...f, notes: v }))}
            minHeight="90px"
          />
          <div className="flex justify-end">
            <ActionButton type="submit" pending={activityMutation.isPending}>
              Ajouter l'activité
            </ActionButton>
          </div>
        </form>

        <div className="mt-6">
          <h4 className="mb-3 text-base font-bold text-gray-950">Historique</h4>
          {(lead.activities || []).length === 0 ? (
            <p className="py-3 text-center text-sm text-gray-400">Aucune activité pour l'instant.</p>
          ) : (
            <ul className="space-y-3">
              {(lead.activities || []).map((a) => {
                const Icon = ACTIVITY_ICON[a.activityType] ?? StickyNote;
                return (
                  <li key={a.id} className="flex gap-3 rounded-2xl bg-gray-50 p-4">
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[color:var(--logo-pink-dark)] ${PINK_SOFT}`}>
                      <Icon size={16} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-950">
                        {ACTIVITY_LABELS[a.activityType]}
                        {a.subject ? ` · ${a.subject}` : ""}
                      </p>
                      <p className="text-xs text-gray-500">
                        {a.performedBy}
                        {a.performedAt ? ` · ${formatDateTime(a.performedAt)}` : ""}
                      </p>
                      <RichHtml html={a.notes} className="mt-2" />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
    </ModalPortal>
  );
};
