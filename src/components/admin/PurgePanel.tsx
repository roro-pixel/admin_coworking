import React, { useState } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import { adminMaintenanceService } from "../../services/adminMaintenance.service";
import { ActionButton, ErrorBanner } from "../subscription/kit";
import { FIELD_SOFT, apiMessage } from "../subscription/kitUtils";
import { toast } from "../ui/toastStore";

const CONFIRM_WORD = "PURGER";

export const PurgePanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [confirmation, setConfirmation] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const purge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (confirmation !== CONFIRM_WORD) return;
    setPending(true);
    setError(null);
    try {
      const response = await adminMaintenanceService.purgeData();
      toast.success(response?.message || "Les données applicatives ont été supprimées avec succès.");
      onClose();
    } catch (err) {
      setError(
        apiMessage(err, (err as { message?: string })?.message || "Impossible de vider la base de données."),
      );
    } finally {
      setPending(false);
    }
  };

  return (
    <form
      onSubmit={purge}
      className="mb-6 rounded-[1.5rem] bg-white p-4 shadow-sm ring-2 ring-red-200 sm:p-5"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
          <AlertTriangle size={20} />
        </span>
        <div>
          <h4 className="text-base font-bold text-gray-950">Vider la base de données</h4>
          <p className="mt-0.5 text-sm text-gray-500">Cette opération est irréversible.</p>
        </div>
      </div>

      <div className="mt-4 space-y-4">
        <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
          Toutes les données applicatives ciblées par l'endpoint de maintenance seront supprimées. Vérifiez que vous
          êtes bien sur le bon environnement avant de continuer.
        </p>

        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-gray-600">
            Saisissez <span className="font-bold text-red-600">{CONFIRM_WORD}</span> pour confirmer
          </span>
          <input
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value.toUpperCase())}
            disabled={pending}
            placeholder={CONFIRM_WORD}
            autoComplete="off"
            className={`${FIELD_SOFT} font-semibold uppercase`}
          />
        </label>

        <ErrorBanner message={error} />
      </div>

      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <ActionButton variant="ghost" onClick={onClose} disabled={pending}>
          Annuler
        </ActionButton>
        <ActionButton
          type="submit"
          variant="danger"
          icon={Trash2}
          pending={pending}
          disabled={confirmation !== CONFIRM_WORD}
        >
          Confirmer la suppression
        </ActionButton>
      </div>
    </form>
  );
};
