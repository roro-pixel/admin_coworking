import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, ShoppingCart, X } from "lucide-react";
import { ModalPortal } from "../../../components/ui/ModalPortal";
import { subscriptionService } from "../../../services/subscription.service";
import type {
  PassPlanResponse,
  PassPlanVersionResponse,
  PassSubscriberType,
} from "../../../services/subscription.service";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  plan: PassPlanResponse | null;
  onSuccess: (passNumber: string) => void;
}
const ownerTypes: { value: PassSubscriberType; label: string }[] = [
  { value: "MEMBER", label: "Membre" },
  { value: "CUSTOMER", label: "Customer" },
  { value: "BUSINESS_ENTITY", label: "Entité commerciale" },
];

export const PurchasePassModal: React.FC<Props> = ({
  isOpen,
  onClose,
  plan,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    ownerType: "MEMBER" as PassSubscriberType,
    ownerCode: "",
    planVersionId: "",
    currency: "XAF",
    validFrom: "",
    autoRenew: false,
    metadataJson: "",
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { data: versions = [] } = useQuery({
    queryKey: ["pass-plan-versions", plan?.code],
    queryFn: () => subscriptionService.getPassPlanVersions(plan!.code),
    enabled: isOpen && !!plan?.code,
  });
  const purchaseMutation = useMutation({
    mutationFn: () =>
      subscriptionService.purchasePassPlan(plan!.code, {
        ownerType: form.ownerType,
        ownerCode: form.ownerCode,
        planVersionId: form.planVersionId ? Number(form.planVersionId) : null,
        currency: form.currency || null,
        validFrom: form.validFrom
          ? new Date(form.validFrom).toISOString()
          : null,
        autoRenew: form.autoRenew,
        metadataJson: form.metadataJson || null,
      }),
    onSuccess: (pass) => {
      queryClient.invalidateQueries({ queryKey: ["passes"] });
      onSuccess(pass.passNumber);
    },
    onError: (e: any) =>
      setErrorMessage(e?.response?.data?.message || "Erreur achat pass."),
  });
  if (!isOpen || !plan) return null;
  return (
    <ModalPortal onClose={onClose} size="lg">
      <div className="sticky top-0 z-10 flex justify-between rounded-t-2xl border-b bg-white px-6 py-4">
        <div>
          <h3 className="flex items-center gap-2 text-xl font-bold">
            <ShoppingCart size={20} /> Acheter un pass
          </h3>
          <p className="text-sm text-gray-500">
            {plan.name} · {plan.code}
          </p>
        </div>
        <button onClick={onClose} className="rounded-xl p-2 hover:bg-gray-100">
          <X size={20} />
        </button>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setErrorMessage(null);
          purchaseMutation.mutate();
        }}
        className="space-y-4 p-6"
      >
        {errorMessage && (
          <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label>
            <span className="mb-1.5 block text-sm font-medium text-gray-700">
              Type titulaire
            </span>
            <select
              value={form.ownerType}
              onChange={(e) =>
                setForm({
                  ...form,
                  ownerType: e.target.value as PassSubscriberType,
                })
              }
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5"
            >
              {ownerTypes.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-1.5 block text-sm font-medium text-gray-700">
              Code titulaire *
            </span>
            <input
              required
              value={form.ownerCode}
              onChange={(e) => setForm({ ...form, ownerCode: e.target.value })}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5"
              placeholder="MBR-00045 / CLI-..."
            />
          </label>
          <label>
            <span className="mb-1.5 block text-sm font-medium text-gray-700">
              Version
            </span>
            <select
              value={form.planVersionId}
              onChange={(e) =>
                setForm({ ...form, planVersionId: e.target.value })
              }
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5"
            >
              <option value="">Dernière version active</option>
              {(versions as PassPlanVersionResponse[]).map((v) => (
                <option key={v.id} value={v.id}>
                  v{v.versionNumber} — {v.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-1.5 block text-sm font-medium text-gray-700">
              Devise
            </span>
            <input
              value={form.currency}
              onChange={(e) =>
                setForm({ ...form, currency: e.target.value.toUpperCase() })
              }
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5"
            />
          </label>
          <label>
            <span className="mb-1.5 block text-sm font-medium text-gray-700">
              Valide dès
            </span>
            <input
              type="datetime-local"
              value={form.validFrom}
              onChange={(e) => setForm({ ...form, validFrom: e.target.value })}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5"
            />
          </label>
          <label className="flex items-center gap-2 pt-8 text-sm">
            <input
              type="checkbox"
              checked={form.autoRenew}
              onChange={(e) =>
                setForm({ ...form, autoRenew: e.target.checked })
              }
            />{" "}
            Renouvellement automatique
          </label>
        </div>
        <label>
          <span className="mb-1.5 block text-sm font-medium text-gray-700">
            Métadonnées JSON
          </span>
          <textarea
            rows={3}
            value={form.metadataJson}
            onChange={(e) => setForm({ ...form, metadataJson: e.target.value })}
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 font-mono text-xs"
          />
        </label>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border px-4 py-2.5"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={purchaseMutation.isPending}
            className="flex-1 rounded-xl bg-primary-600 px-4 py-2.5 text-white"
          >
            {purchaseMutation.isPending ? (
              <Loader2 className="mx-auto animate-spin" size={16} />
            ) : (
              "Acheter / générer pass"
            )}
          </button>
        </div>
      </form>
    </ModalPortal>
  );
};
