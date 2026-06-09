import React, { useState } from "react";
import { User, LogOut, Settings, ChevronDown } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { NotificationDropdown } from "../notifications/NotificationDropdown";

export const AdminHeader: React.FC = () => {
  const [showMenu, setShowMenu] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { admin, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    setShowMenu(false);
    setIsLoggingOut(true);
    try {
      await logout();
    } catch (error) {
      console.error("Erreur lors de la déconnexion:", error);
    } finally {
      setIsLoggingOut(false);
      navigate("/login");
    }
  };

  return (
    <header className="fixed top-0 right-0 left-64 bg-white border-b border-gray-200 z-40 h-16">
      <div className="flex items-center justify-between px-6 h-full">
        <h2 className="text-lg font-semibold text-gray-800">Tableau de bord</h2>

        <div className="flex items-center space-x-4">
          {/* NotificationDropdown intégré */}
          <NotificationDropdown />

          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="flex items-center space-x-3 p-2 hover:bg-gray-100 rounded-lg"
            >
              <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                <User size={16} className="text-[#C84C9A]" />
              </div>
              <div className="text-left">
                <span className="text-sm font-medium text-gray-700 block">
                  {admin?.email?.split("@")[0] || "Utilisateur"}
                </span>
                <span className="text-xs text-gray-400">
                  Bonjour, {admin?.email?.split("@")[0] || "Utilisateur"}
                </span>
              </div>
              <ChevronDown size={16} className="text-gray-500" />
            </button>

            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border py-1 z-40">
                  <div className="px-4 py-3 border-b">
                    <p className="text-sm font-medium text-gray-900">
                      {admin?.email?.split("@")[0] || "Utilisateur"}
                    </p>
                    <p className="text-xs text-gray-500">{admin?.email}</p>
                    {admin?.roleNames && admin.roleNames.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {admin.roleNames.map((role) => (
                          <span
                            key={role}
                            className="text-xs px-2 py-0.5 rounded-full bg-primary-50 text-primary-700"
                          >
                            {role}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      navigate("/settings");
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center"
                  >
                    <Settings size={16} className="mr-2" />
                    Paramètres
                  </button>
                  <hr className="my-1" />
                  <button
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center disabled:opacity-50"
                  >
                    <LogOut size={16} className="mr-2" />
                    {isLoggingOut ? "Déconnexion..." : "Déconnexion"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
