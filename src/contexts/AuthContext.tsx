import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/auth.service';
import type { UserProfile } from '../services/auth.service';

interface AuthContextType {
  admin: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
  isAdmin: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [admin, setAdmin] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      authService.getProfile()
        .then(profile => setAdmin(profile))
        .catch(() => {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const response = await authService.login({ email, password });
      localStorage.setItem('accessToken', response.accessToken);
      localStorage.setItem('refreshToken', response.refreshToken);
      const profile = await authService.getProfile();
      setAdmin(profile);
      return true;
    } catch (error) {
      console.error('Erreur de connexion', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setAdmin(null);
  };

  // Vérifie si l'utilisateur est admin (rôle ADMIN ou ROLE_ADMIN)
  const isAdmin = (): boolean => {
    if (!admin) return false;
    const roles = admin.roleNames || [];
    const authorities = admin.authorities || [];
    return (
      roles.includes('ADMIN') ||
      roles.includes('ROLE_ADMIN') ||
      authorities.includes('ROLE_ADMIN') ||
      authorities.includes('ADMIN')
    );
  };

  const hasPermission = (permission: string): boolean => {
    if (!admin) return false;

    // ADMIN voit tout
    if (isAdmin()) return true;

    // Vérifier dans authorities (peut être vide si le backend ne les remonte pas)
    const authorities = admin.authorities || [];
    if (authorities.length > 0) {
      return (
        authorities.includes(permission) ||
        authorities.includes(permission.replace(':', '_'))
      );
    }

    // Fallback : si authorities vide, se baser sur roleNames
    // Un utilisateur connecté avec un rôle a au moins les permissions de base
    return false;
  };

  return (
    <AuthContext.Provider value={{
      admin,
      isAuthenticated: !!admin,
      isLoading,
      login,
      logout,
      hasPermission,
      isAdmin,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};