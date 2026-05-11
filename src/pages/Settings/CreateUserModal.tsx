import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { X, Loader2, Eye, EyeOff, Copy, CheckCircle } from 'lucide-react';
import { authService } from '../../services/auth.service';
import { ModalPortal } from '../../components/ui/ModalPortal';

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateUserModal: React.FC<CreateUserModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [email, setEmail] = useState('');
  const [generatePassword, setGeneratePassword] = useState(true);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  const { data: roles = [] } = useQuery({
    queryKey: ['admin-roles'],
    queryFn: () => authService.getRoles(),
    enabled: isOpen,
  });

  useEffect(() => {
    if (isOpen) {
      setEmail('');
      setGeneratePassword(true);
      setPassword('');
      setShowPassword(false);
      setSelectedRoles([]);
      setError(null);
      setResult(null);
    }
  }, [isOpen]);

  const createMutation = useMutation({
    mutationFn: () => authService.createUser({
      email,
      generatePassword,
      password: generatePassword ? undefined : password,
      roleNames: selectedRoles,
    }),
    onSuccess: (data) => {
      setResult(data);
      setError(null);
      onSuccess();
    },
    onError: (err: any) => {
      setError(err?.response?.data?.message || 'Erreur lors de la création.');
    },
  });

  const toggleRole = (roleName: string) => {
    setSelectedRoles(prev =>
      prev.includes(roleName) ? prev.filter(r => r !== roleName) : [...prev, roleName]
    );
  };

  const handleCopyPassword = () => {
    if (result?.generatedPassword) {
      navigator.clipboard.writeText(result.generatedPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('L\'email est obligatoire.');
      return;
    }
    if (!generatePassword && !password.trim()) {
      setError('Le mot de passe est obligatoire.');
      return;
    }
    setError(null);
    createMutation.mutate();
  };

  if (!isOpen) return null;

  return (
    <ModalPortal onClose={onClose} size="lg">
      <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center rounded-t-2xl">
        <h3 className="text-xl font-bold">Nouvel utilisateur</h3>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
          <X size={20} />
        </button>
      </div>

      <div className="p-6 space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
            {error}
          </div>
        )}

        {result ? (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <CheckCircle size={32} className="mx-auto text-green-600 mb-2" />
              <p className="font-medium text-green-800">Utilisateur créé avec succès</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">ID</span>
                <span className="text-sm font-mono">{result.userId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Email</span>
                <span className="text-sm font-mono">{result.email}</span>
              </div>
              {result.generatedPassword && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Mot de passe généré</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono bg-white px-2 py-1 rounded border">
                      {showPassword ? result.generatedPassword : '••••••••'}
                    </span>
                    <button
                      onClick={() => setShowPassword(!showPassword)}
                      className="p-1 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                    <button
                      onClick={handleCopyPassword}
                      className="p-1 text-gray-400 hover:text-primary-600"
                      title="Copier"
                    >
                      {copied ? <CheckCircle size={14} className="text-green-600" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Rôles</span>
                <span className="text-sm">{result.roleNames?.join(', ') || 'Aucun'}</span>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm text-blue-700">
              Un email de bienvenue a été envoyé à l'utilisateur avec l'URL d'accès.
              {result.generatedPassword && ' Le mot de passe ne figure pas dans cet email.'}
            </div>

            <button
              onClick={onClose}
              className="w-full bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700"
            >
              Fermer
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="agent@elleaose.com"
                required
                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={generatePassword}
                  onChange={(e) => setGeneratePassword(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm text-gray-700">Générer un mot de passe automatiquement</span>
              </label>
            </div>

            {!generatePassword && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe *</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mot de passe temporaire"
                    required
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Rôles</label>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                {roles.map((role) => (
                  <label
                    key={role.id}
                    className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer text-sm ${
                      selectedRoles.includes(role.name)
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedRoles.includes(role.name)}
                      onChange={() => toggleRole(role.name)}
                      className="rounded"
                    />
                    <div>
                      <p className="font-medium">{role.displayName || role.name}</p>
                      {role.description && <p className="text-xs text-gray-400">{role.description}</p>}
                    </div>
                  </label>
                ))}
              </div>
              {roles.length === 0 && (
                <p className="text-sm text-gray-400">Aucun rôle disponible</p>
              )}
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending || !email.trim()}
                className="flex-1 bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {createMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : 'Créer'}
              </button>
            </div>
          </form>
        )}
      </div>
    </ModalPortal>
  );
};