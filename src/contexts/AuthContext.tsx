import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { authService } from "../services/auth.service";
import type { UserProfile } from "../services/auth.service";

interface AuthContextType {
  admin: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
  isAdmin: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [admin, setAdmin] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    const token = authService.getAccessToken();
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const profile = await authService.getProfile();
      setAdmin(profile);
    } catch (error) {
      console.error("Erreur chargement profil:", error);
      authService.clearTokens();
      setAdmin(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      await authService.login({ email, password });
      const profile = await authService.getProfile();
      setAdmin(profile);
      return true;
    } catch (error) {
      console.error("Erreur de connexion:", error);
      authService.clearTokens();
      setAdmin(null);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await authService.logout();
    } catch (error) {
      console.error("Erreur logout:", error);
    } finally {
      setAdmin(null);
      setIsLoading(false);
    }
  };

  // Vérifie si l'utilisateur est admin
  const isAdmin = useCallback((): boolean => {
    if (!admin) return false;

    const roles = admin.roleNames || [];
    const authorities = admin.authorities || [];

    return (
      roles.includes("ADMIN") ||
      roles.includes("ROLE_ADMIN") ||
      authorities.includes("ROLE_ADMIN") ||
      authorities.includes("ADMIN")
    );
  }, [admin]);

  // Vérifie une permission
  const hasPermission = useCallback(
    (permission: string): boolean => {
      if (!admin) return false;
      if (isAdmin()) return true;

      const authorities = admin.authorities || [];

      // Vérifier les deux formats (avec : ou _)
      const altPermission = permission.replace(":", "_");
      return (
        authorities.includes(permission) || authorities.includes(altPermission)
      );
    },
    [admin, isAdmin],
  );

  // Vérifie au moins une permission parmi une liste
  const hasAnyPermission = useCallback(
    (permissions: string[]): boolean => {
      if (!admin) return false;
      if (isAdmin()) return true;
      return permissions.some((p) => hasPermission(p));
    },
    [admin, isAdmin, hasPermission],
  );

  // Vérifie toutes les permissions d'une liste
  const hasAllPermissions = useCallback(
    (permissions: string[]): boolean => {
      if (!admin) return false;
      if (isAdmin()) return true;
      return permissions.every((p) => hasPermission(p));
    },
    [admin, isAdmin, hasPermission],
  );

  return (
    <AuthContext.Provider
      value={{
        admin,
        isAuthenticated: !!admin,
        isLoading,
        login,
        logout,
        hasPermission,
        hasAnyPermission,
        hasAllPermissions,
        isAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
