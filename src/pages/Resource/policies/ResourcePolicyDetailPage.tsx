import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save, X, Edit, Loader2, Shield, Clock, CalendarClock, Power } from "lucide-react";
import { AdminLayout } from "../../../components/layout/AdminLayout";
import { resourceService } from "../../../services/resource.service";

const formatDuration = (minutes: number): string => {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h${mins}` : `${hours}h`;
};

export const ResourcePolicyDetailPage: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    minBookingDurationMinutes: 30,
    maxBookingDurationMinutes: 480,
    minBookingNoticeMinutes: 60,
    cancellationNoticeMinutes: 120,
    allowCancellation: true,
    active: true,
  });

  const { data: policy, isLoading, isError } = useQuery({
    queryKey: ["resource-policy", code],
    queryFn: () => resourceService.getResourcePolicy(code!),
    enabled: !!code,
  });

  React.useEffect(() => {
    if (!policy) return;
    setFormData({
      name: policy.name || "",
      description: policy.description || "",
      minBookingDurationMinutes: policy.minBookingDurationMinutes ?? 30,
      maxBookingDurationMinutes: policy.maxBookingDurationMinutes ?? 480,
      minBookingNoticeMinutes: policy.minBookingNoticeMinutes ?? 60,
      cancellationNoticeMinutes: policy.cancellationNoticeMinutes ?? 120,
      allowCancellation: policy.allowCancellation ?? true,
      active: policy.active ?? true,
    });
  }, [policy]);

  const updateMutation = useMutation({
    mutationFn: () => {
      if (!code) return Promise.resolve();
      if (formData.minBookingDurationMinutes >= formData.maxBookingDurationMinutes) {
        return Promise.reject(new Error("La durée minimale doit être inférieure à la durée maximale."));
      }
      return resourceService.updateResourcePolicy(code, {
        name: formData.name,
        description: formData.description || undefined,
        minBookingDurationMinutes: formData.minBookingDurationMinutes,
        maxBookingDurationMinutes: formData.maxBookingDurationMinutes,
        minBookingNoticeMinutes: formData.minBookingNoticeMinutes,
        cancellationNoticeMinutes: formData.allowCancellation ? formData.cancellationNoticeMinutes : undefined,
        allowCancellation: formData.allowCancellation,
        active: formData.active,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resource-policy", code] });
      queryClient.invalidateQueries({ queryKey: ["resource-policies"] });
      queryClient.invalidateQueries({ queryKey: ["resource-policies-list"] });
      setIsEditing(false);
      setErrorMessage(null);
    },
    onError: (error: any) => setErrorMessage(error?.response?.data?.message || error?.message || "Erreur lors de la modification."),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: (active: boolean) => resourceService.updateResourcePolicyStatus(code!, active),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resource-policy", code] });
      queryClient.invalidateQueries({ queryKey: ["resource-policies"] });
    },
  });

  const toggleCancellationMutation = useMutation({
    mutationFn: (allowed: boolean) => resourceService.updateResourcePolicyAllowCancellation(code!, allowed),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resource-policy", code] });
      queryClient.invalidateQueries({ queryKey: ["resource-policies"] });
    },
  });

  if (isLoading) return <AdminLayout><div className="flex h-64 items-center justify-center"><Loader2 size={32} className="animate-spin text-primary-600" /></div></AdminLayout>;
  if (isError || !policy) return <AdminLayout><div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-red-700">Politique introuvable.</div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="mb-6">
        <button onClick={() => navigate("/resources", { state: { activeTab: "policies" } })} className="mb-4 flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800"><ArrowLeft size={16} /> Retour aux politiques</button>
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{policy.name}</h1>
              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${policy.active ? "bg-green-50 text-green-700 ring-green-100" : "bg-gray-50 text-gray-600 ring-gray-100"}`}>{policy.active ? "Active" : "Inactive"}</span>
              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${policy.allowCancellation ? "bg-blue-50 text-blue-700 ring-blue-100" : "bg-gray-50 text-gray-600 ring-gray-100"}`}>{policy.allowCancellation ? "Annulation autorisée" : "Annulation bloquée"}</span>
            </div>
            <p className="mt-1 font-mono text-sm text-gray-500">{policy.code}</p>
          </div>
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <button onClick={() => { setIsEditing(false); setErrorMessage(null); }} className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"><X size={16} /> Annuler</button>
                <button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending} className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50">{updateMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Enregistrer</button>
              </>
            ) : (
              <button onClick={() => setIsEditing(true)} className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"><Edit size={16} /> Modifier</button>
            )}
          </div>
        </div>
      </div>

      {errorMessage && <div className="mb-6 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</div>}

      <div className="mb-6 grid gap-3 md:grid-cols-2">
        <button onClick={() => toggleStatusMutation.mutate(!policy.active)} className="flex items-center justify-between rounded-2xl bg-white p-4 text-left shadow-sm ring-1 ring-gray-100 hover:bg-gray-50"><span><span className="block text-sm font-medium text-gray-900">Statut</span><span className="text-xs text-gray-500">Activer ou désactiver cette politique</span></span><Power size={18} className={policy.active ? "text-green-600" : "text-gray-400"} /></button>
        <button onClick={() => toggleCancellationMutation.mutate(!policy.allowCancellation)} className="flex items-center justify-between rounded-2xl bg-white p-4 text-left shadow-sm ring-1 ring-gray-100 hover:bg-gray-50"><span><span className="block text-sm font-medium text-gray-900">Annulation</span><span className="text-xs text-gray-500">Autoriser ou bloquer l’annulation</span></span><Shield size={18} className={policy.allowCancellation ? "text-blue-600" : "text-gray-400"} /></button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
          <div className="mb-5 flex items-center gap-3"><div className="rounded-xl bg-primary-50 p-2 text-primary-600"><Shield size={18} /></div><div><h2 className="font-semibold text-gray-900">Informations générales</h2><p className="text-sm text-gray-500">Nom, description et état de la politique.</p></div></div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Nom" editing={isEditing} value={policy.name} input={<input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100" />} />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Active</label>
              {isEditing ? <input type="checkbox" checked={formData.active} onChange={(e) => setFormData({ ...formData, active: e.target.checked })} /> : <p className="rounded-xl bg-gray-50 px-3 py-2.5 text-sm text-gray-900 ring-1 ring-gray-100">{policy.active ? "Oui" : "Non"}</p>}
            </div>
            <div className="md:col-span-2"><Field label="Description" editing={isEditing} value={policy.description || "—"} input={<textarea rows={3} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100" />} /></div>
          </div>
        </section>

        <aside className="space-y-6">
          <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
            <div className="mb-5 flex items-center gap-3"><div className="rounded-xl bg-blue-50 p-2 text-blue-600"><Clock size={18} /></div><h2 className="font-semibold text-gray-900">Durées</h2></div>
            <div className="space-y-4">
              <NumberField label="Durée minimale" value={formData.minBookingDurationMinutes} display={formatDuration(policy.minBookingDurationMinutes)} editing={isEditing} onChange={(v) => setFormData({ ...formData, minBookingDurationMinutes: v })} />
              <NumberField label="Durée maximale" value={formData.maxBookingDurationMinutes} display={formatDuration(policy.maxBookingDurationMinutes)} editing={isEditing} onChange={(v) => setFormData({ ...formData, maxBookingDurationMinutes: v })} />
              <NumberField label="Préavis réservation" value={formData.minBookingNoticeMinutes} display={formatDuration(policy.minBookingNoticeMinutes)} editing={isEditing} onChange={(v) => setFormData({ ...formData, minBookingNoticeMinutes: v })} />
            </div>
          </section>

          <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
            <div className="mb-5 flex items-center gap-3"><div className="rounded-xl bg-amber-50 p-2 text-amber-600"><CalendarClock size={18} /></div><h2 className="font-semibold text-gray-900">Annulation</h2></div>
            <div className="space-y-4">
              {isEditing && <label className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3 text-sm"><span>Autoriser l’annulation</span><input type="checkbox" checked={formData.allowCancellation} onChange={(e) => setFormData({ ...formData, allowCancellation: e.target.checked })} /></label>}
              <NumberField label="Préavis annulation" value={formData.cancellationNoticeMinutes} display={policy.allowCancellation ? formatDuration(policy.cancellationNoticeMinutes) : "Non autorisée"} editing={isEditing && formData.allowCancellation} onChange={(v) => setFormData({ ...formData, cancellationNoticeMinutes: v })} />
            </div>
          </section>
        </aside>
      </div>
    </AdminLayout>
  );
};

const Field: React.FC<{ label: string; value: string; editing: boolean; input: React.ReactNode }> = ({ label, value, editing, input }) => (
  <div>
    <label className="mb-1.5 block text-sm font-medium text-gray-700">{label}</label>
    {editing ? input : <p className="rounded-xl bg-gray-50 px-3 py-2.5 text-sm text-gray-900 ring-1 ring-gray-100">{value}</p>}
  </div>
);

const NumberField: React.FC<{ label: string; value: number; display: string; editing: boolean; onChange: (value: number) => void }> = ({ label, value, display, editing, onChange }) => (
  <div>
    <label className="mb-1.5 block text-sm font-medium text-gray-700">{label}</label>
    {editing ? <input type="number" min={0} value={value} onChange={(e) => onChange(Number(e.target.value) || 0)} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100" /> : <p className="rounded-xl bg-gray-50 px-3 py-2.5 text-sm font-medium text-gray-900 ring-1 ring-gray-100">{display}</p>}
  </div>
);
