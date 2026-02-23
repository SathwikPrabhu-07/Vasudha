import { useState } from "react";
import { Outlet } from "react-router-dom";
import AppSidebar from "./AppSidebar";
import TopNav from "./TopNav";
import Squares from "./Squares";
import type { UserRole } from "@/services/authService";

// Role → Squares color theme
const roleTheme: Record<UserRole, { border: string; hover: string }> = {
  farmer: { border: "rgba(74, 163, 92, 0.18)", hover: "rgba(74, 163, 92, 0.12)" },
  buyer: { border: "rgba(234, 179, 8, 0.18)", hover: "rgba(234, 179, 8, 0.12)" },
  logistics: { border: "rgba(59, 130, 246, 0.18)", hover: "rgba(59, 130, 246, 0.12)" },
};

const DashboardLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Read role from sessionStorage (per-tab)
  let role: UserRole = "farmer";
  try {
    const stored = sessionStorage.getItem("vasudha_user");
    if (stored) {
      const user = JSON.parse(stored);
      if (user.role) role = user.role;
    }
  } catch {
    // fallback to farmer
  }

  const theme = roleTheme[role] ?? roleTheme.farmer;

  return (
    <div className="flex min-h-screen w-full bg-background relative">
      {/* Animated Squares background — fixed, behind everything */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{ zIndex: 0 }}
        aria-hidden="true"
      >
        <Squares
          direction="diagonal"
          speed={0.4}
          squareSize={44}
          borderColor={theme.border}
          hoverFillColor={theme.hover}
        />
      </div>

      {/* All dashboard content above the canvas */}
      <div className="relative flex w-full" style={{ zIndex: 1 }}>
        <AppSidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed(!collapsed)}
          mobileOpen={mobileOpen}
          onMobileClose={() => setMobileOpen(false)}
          role={role}
        />

        <div className="flex-1 flex flex-col min-w-0">
          <TopNav onMenuClick={() => setMobileOpen(true)} />
          <main className="flex-1 p-4 md:p-6 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;

