import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  LayoutDashboard,
  Wheat,
  TrendingUp,
  Store,
  Truck,
  BarChart3,
  User,
  ChevronLeft,
  Package,
  FileCheck,
  Route,
  ClipboardList,
  Target,
} from "lucide-react";
import type { UserRole } from "@/services/authService";

interface NavItem {
  titleKey: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
}

const farmerNav: NavItem[] = [
  { titleKey: "nav.dashboard", path: "/farmer-dashboard", icon: LayoutDashboard },
  { titleKey: "nav.cropPlanning", path: "/farmer-dashboard/crop-planning", icon: Target },
  { titleKey: "nav.priceInsights", path: "/farmer-dashboard/price-insights", icon: TrendingUp },
  { titleKey: "nav.marketplace", path: "/farmer-dashboard/marketplace", icon: Store },
  { titleKey: "nav.analytics", path: "/farmer-dashboard/analytics", icon: BarChart3 },
  { titleKey: "nav.profile", path: "/farmer-dashboard/profile", icon: User },
];

const buyerNav: NavItem[] = [
  { titleKey: "nav.dashboard", path: "/buyer-dashboard", icon: LayoutDashboard },
  { titleKey: "nav.marketplace", path: "/buyer-dashboard/marketplace", icon: Store },
  { titleKey: "nav.commitments", path: "/buyer-dashboard/commitments", icon: FileCheck },
  { titleKey: "nav.priceInsights", path: "/buyer-dashboard/price-insights", icon: TrendingUp },
  { titleKey: "nav.analytics", path: "/buyer-dashboard/analytics", icon: BarChart3 },
  { titleKey: "nav.profile", path: "/buyer-dashboard/profile", icon: User },
];

const logisticsNav: NavItem[] = [
  { titleKey: "nav.dashboard", path: "/logistics-dashboard", icon: LayoutDashboard },
  { titleKey: "nav.shipments", path: "/logistics-dashboard/shipments", icon: Truck },
  { titleKey: "nav.routePlanning", path: "/logistics-dashboard/route-planning", icon: Route },
  { titleKey: "nav.bookings", path: "/logistics-dashboard/bookings", icon: ClipboardList },
  { titleKey: "nav.profile", path: "/logistics-dashboard/profile", icon: User },
];

const navByRole: Record<UserRole, NavItem[]> = {
  farmer: farmerNav,
  buyer: buyerNav,
  logistics: logisticsNav,
};

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
  role: UserRole;
}

const AppSidebar = ({ collapsed, onToggle, mobileOpen, onMobileClose, role }: AppSidebarProps) => {
  const location = useLocation();
  const { t } = useTranslation();
  const navItems = navByRole[role] || farmerNav;

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onMobileClose}
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 z-50 h-screen bg-sidebar flex flex-col border-r border-sidebar-border
          transition-all duration-300 ease-in-out
          ${collapsed ? "w-[70px]" : "w-[260px]"}
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0 lg:relative
        `}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-sidebar-border">
          <img src="/assets/vasudha-logo.png" alt="Vasudha Logo" className="w-8 h-8 rounded-lg object-contain flex-shrink-0" />
          {!collapsed && (
            <span className="text-lg font-bold text-sidebar-foreground tracking-tight">
              Vasudha
            </span>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const label = t(item.titleKey);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onMobileClose}
                className={`sidebar-link ${isActive ? "active" : ""} ${collapsed ? "justify-center px-0" : ""}`}
                title={collapsed ? label : undefined}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span>{label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Collapse toggle (desktop only) */}
        <button
          onClick={onToggle}
          className="hidden lg:flex items-center justify-center p-3 border-t border-sidebar-border text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors"
        >
          <ChevronLeft className={`w-5 h-5 transition-transform ${collapsed ? "rotate-180" : ""}`} />
        </button>
      </aside>
    </>
  );
};

export default AppSidebar;
