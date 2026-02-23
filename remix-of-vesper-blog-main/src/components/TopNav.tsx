import { Bell, Menu, User, ChevronDown, LogOut } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { logout, getCurrentUser } from "@/services/authService";
import LanguageSwitcher from "./LanguageSwitcher";

interface TopNavProps {
  onMenuClick: () => void;
}

const TopNav = ({ onMenuClick }: TopNavProps) => {
  const [profileOpen, setProfileOpen] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const user = getCurrentUser();

  const roleName = user?.role
    ? t(`auth.${user.role}`)
    : t("common.user");

  const profilePath = user?.role
    ? `/${user.role}-dashboard/profile`
    : "/login";

  async function handleSignOut() {
    try {
      await logout();
      navigate("/", { replace: true });
    } catch (err) {
      console.error("[TopNav] signout failed:", err);
    }
  }

  return (
    <header className="sticky top-0 z-30 bg-card border-b border-border px-4 md:px-6 py-3">
      <div className="flex items-center justify-between">
        {/* Left: mobile menu + page context */}
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-lg hover:bg-secondary transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="text-sm text-muted-foreground hidden sm:block">
            {t("common.welcomeBack")}, {roleName} 👋
          </span>
        </div>

        {/* Right: language + notifications + profile */}
        <div className="flex items-center gap-2">
          <LanguageSwitcher />

          <button className="relative p-2 rounded-lg hover:bg-secondary transition-colors">
            <Bell className="w-5 h-5 text-foreground/70" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-status-error rounded-full" />
          </button>

          <div className="relative">
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-2 p-2 rounded-lg hover:bg-secondary transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                <User className="w-4 h-4 text-primary-foreground" />
              </div>
              <ChevronDown className="w-4 h-4 text-muted-foreground hidden sm:block" />
            </button>

            {profileOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                <div className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-xl shadow-lg py-2 z-50">
                  {user && (
                    <div className="px-4 py-2 border-b border-border mb-1">
                      <p className="text-sm font-semibold truncate">{user.fullName}</p>
                      <p className="text-[11px] text-muted-foreground">{user.email}</p>
                    </div>
                  )}
                  <button
                    onClick={() => { setProfileOpen(false); navigate(profilePath); }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-secondary transition-colors"
                  >
                    {t("common.myProfile")}
                  </button>
                  <hr className="my-1 border-border" />
                  <button
                    onClick={handleSignOut}
                    className="w-full text-left px-4 py-2 text-sm text-status-error hover:bg-secondary transition-colors flex items-center gap-2"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    {t("common.signOut")}
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

export default TopNav;
