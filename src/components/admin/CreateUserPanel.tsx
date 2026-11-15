import React, { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Eye, EyeOff } from "lucide-react";
import { authService } from "../../services/auth.service";
import type { AdminUser } from "../../services/auth.service";
import { CheckField, Field, PanelForm } from "../subscription/kit";
import { FIELD, FOCUS, apiMessage } from "../subscription/kitUtils";
import { Skeleton } from "../ui/Skeleton";
import { CredentialsPanel } from "./CredentialsPanel";
import { RoleTiles } from "./RoleTiles";

export const CreateUserPanel: React.FC<{ onClose: () => void; onCreated: () => void }> = ({
  onClose,
  onCreated,
}) => {
  const [email, setEmail] = useState("");
  const [generatePassword, setGeneratePassword] = useState(true);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AdminUser | null>(null);

  const { data: roles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ["admin-roles"],
    queryFn: () => authService.getRoles(),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      authService.createUser({
        email,
        generatePassword,
        password: generatePassword ? undefined : password,
        roleNames: selectedRoles,
      }),
    onSuccess: (data) => {
      setResult(data);
      setError(null);
      onCreated();
    },
    onError: (err: unknown) => setError(apiMessage(err, "Erreur lors de la création.")),
  });

  const toggleRole = (roleName: string) =>
    setSelectedRoles((prev) =>
      prev.includes(roleName) ? prev.filter((r) => r !== roleName) : [...prev, roleName],
    );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return setError("L'email est obligatoire.");
    if (!generatePassword && !password.trim()) return setError("Le mot de passe est obligatoire.");
    setError(null);
    createMutation.mutate();
  };

  if (result) {
    return (
      <CredentialsPanel
        title="Utilisateur créé"
        rows={[
          { label: "ID", value: result.userId },
          { label: "Email", value: result.email },
          { label: "Rôles", value: result.roleNames?.join(", ") || "Aucun" },
        ]}
        password={result.generatedPassword}
        note={`Un email de bienvenue a été envoyé à l'utilisateur avec l'URL d'accès.${
          result.generatedPassword ? " Le mot de passe ne figure pas dans cet email." : ""
        }`}
        onClose={onClose}
      />
    );
  }

  return (
    <PanelForm
      title="Nouvel utilisateur"
      onSubmit={handleSubmit}
      onCancel={onClose}
      pending={createMutation.isPending}
      submitLabel="Créer"
      submitDisabled={!email.trim()}
      error={error}
    >
      <div className="rounded-2xl bg-gray-50 p-4 sm:p-5">
        <div className="space-y-4">
          <Field label="Email" required>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="agent@elleaose.com"
              className={FIELD}
            />
          </Field>

          <CheckField
            checked={generatePassword}
            onChange={setGeneratePassword}
            label="Générer un mot de passe automatiquement"
          />

          {!generatePassword && (
            <Field label="Mot de passe" required>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mot de passe temporaire"
                  className={`${FIELD} pr-12`}
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-gray-400 transition hover:text-gray-700 ${FOCUS}`}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </Field>
          )}

          <div>
            <span className="mb-1.5 block text-xs font-semibold text-gray-600">Rôles</span>
            {rolesLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : (
              <RoleTiles roles={roles} selected={selectedRoles} multiple onToggle={toggleRole} />
            )}
          </div>
        </div>
      </div>
    </PanelForm>
  );
};
