import React, { useState } from "react";
import { User, LogOut, Settings, ChevronDown } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { NotificationDropdown } from "../notifications/NotificationDropdown";
import { brandVars } from "./adminTheme";
import Logo from "../../assets/img/logo.jpeg";

/*
 * Taille de base du header (tout l'intérieur est en em : il grossit d'un bloc avec l'écran).
 *   1280px -> ~13,7px | 1920px -> ~18,9px | 2560px -> ~23,7px ; 16px sur mobile
 */
const HEADER_FONT_SIZE = "clamp(1rem, 0.4rem + 0.65vw, 1.5rem)";

/** Salutation selon l'heure locale de l'appareil, donc le fuseau de l'utilisateur : bonsoir de 18h à 4h59 */
const greeting = (): string => {
  const h = new Date().getHours();
  return h >= 18 || h < 5 ? "Bonsoir" : "Bonjour";
};

export const AdminHeader: React.FC = () => {
  const [showMenu, setShowMenu] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const { admin, logout } = useAuth();
  const navigate = useNavigate();

  const username = admin?.email?.split("@")[0] || "Utilisateur";
  const hello = greeting();

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
    <header className="shrink-0 px-4 pt-4 lg:px-6" style={{ ...brandVars, fontSize: HEADER_FONT_SIZE }}>
      <div className="flex items-center justify-between rounded-full border border-gray-100 bg-white py-[0.5em] pl-[1.25em] pr-[0.5em] shadow-sm">
        <button
          type="button"
          onClick={() => navigate("/")}
          className="flex items-center"
          aria-label="Accueil"
        >
          <img
            src={Logo}
            alt="logo"
            className="h-[2.2em] w-auto object-contain"
          />
        </button>

        <div className="flex items-center gap-[0.5em]">
          <NotificationDropdown />

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowMenu(!showMenu)}
              className="flex items-center gap-2 rounded-full py-[0.25em] pl-[0.25em] pr-[0.7em] transition-colors hover:bg-gray-50 md:gap-[0.6em]"
            >
              <div className="flex h-[2.2em] w-[2.2em] items-center justify-center rounded-full bg-[color:color-mix(in_srgb,var(--logo-pink)_16%,white)] text-[color:var(--logo-pink-dark)] ring-1 ring-[color:color-mix(in_srgb,var(--logo-pink)_30%,white)]">
                <User className="h-[50%] w-[50%]" />
              </div>

              <div className="hidden text-left md:block">
                <span className="block text-[0.9em] font-bold text-gray-800">
                  {username}
                </span>
                <span className="block text-[0.75em] text-gray-400">
                  {hello}, {username}
                </span>
              </div>

              <ChevronDown
                className={`h-[1.1em] w-[1.1em] text-gray-400 transition-transform ${
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

                <div className="absolute right-0 z-40 mt-3 w-72 text-base overflow-hidden rounded-3xl bg-white p-2 shadow-xl ring-1 ring-gray-100">
                  <div className="rounded-2xl bg-gray-50 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[color:var(--logo-pink-dark)] shadow-sm ring-1 ring-gray-100">
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