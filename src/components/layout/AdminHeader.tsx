import React, { useState } from "react";
import { User, LogOut, Settings, ChevronDown } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { NotificationDropdown } from "../notifications/NotificationDropdown";
import Logo from "../../assets/img/logo.jpeg";

export const AdminHeader: React.FC = () => {
  const [showMenu, setShowMenu] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const { admin, logout } = useAuth();
  const navigate = useNavigate();

  const username = admin?.email?.split("@")[0] || "Utilisateur";

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
    <header className="fixed left-3 right-3 top-3 z-40 h-16 rounded-[1.7rem] border border-gray-100 bg-white/90 shadow-xl shadow-slate-950/5 backdrop-blur">
      <div className="flex h-full items-center justify-between px-4 md:px-6">
        <button
          type="button"
          onClick={() => navigate("/")}
          className="flex items-center"
          aria-label="Accueil"
        >
          <img
            src={Logo}
            alt="logo"
            className="h-10 w-auto object-contain md:h-11 lg:h-12"
          />
        </button>

        <div className="flex items-center gap-3">
          <NotificationDropdown />

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowMenu(!showMenu)}
              className="flex items-center gap-2 rounded-2xl px-2 py-1.5 transition-colors hover:bg-gray-50 md:gap-3 md:px-3"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary-50 text-primary-600 ring-1 ring-primary-100">
                <User size={17} />
              </div>

              <div className="hidden text-left md:block">
                <span className="block text-sm font-bold text-gray-800">
                  {username}
                </span>
                <span className="block text-xs text-gray-400">
                  Bonjour, {username}
                </span>
              </div>

              <ChevronDown
                size={16}
                className={`text-gray-400 transition-transform ${
                  showMenu ? "rotate-180" : ""
                }`}
              />
            </button>

            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setShowMenu(false)}
                />

                <div className="absolute right-0 z-40 mt-3 w-72 overflow-hidden rounded-3xl bg-white p-2 shadow-xl ring-1 ring-gray-100">
                  <div className="rounded-2xl bg-gray-50 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-primary-600 shadow-sm ring-1 ring-gray-100">
                        <User size={18} />
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-gray-900">
                          {username}
                        </p>
                        <p className="truncate text-xs text-gray-500">
                          {admin?.email}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-2 space-y-1">
                    <button
                      type="button"
                      onClick={() => {
                        setShowMenu(false);
                        navigate("/settings");
                      }}
                      className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                    >
                      <Settings size={17} />
                      Paramètres
                    </button>

                    <button
                      type="button"
                      onClick={handleLogout}
                      disabled={isLoggingOut}
                      className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                    >
                      <LogOut size={17} />
                      {isLoggingOut ? "Déconnexion..." : "Déconnexion"}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};