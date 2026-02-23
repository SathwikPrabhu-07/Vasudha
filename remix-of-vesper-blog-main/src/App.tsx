import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createBrowserRouter, Navigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import ClickSpark from "@/components/ClickSpark";
import Landing from "@/pages/Landing";
import GetStarted from "@/pages/GetStarted";
import Signup from "@/pages/Signup";
import Login from "@/pages/Login";
import FarmerDashboard from "@/pages/FarmerDashboard";
import BuyerDashboard from "@/pages/BuyerDashboard";
import LogisticsDashboard from "@/pages/LogisticsDashboard";
import CropPlanning from "@/pages/CropPlanning";
import CropComparison from "@/pages/CropComparison";
import PriceInsights from "@/pages/PriceInsights";
import Marketplace from "@/pages/Marketplace";
import Logistics from "@/pages/Logistics";
import ShipmentsPage from "@/pages/ShipmentsPage";
import RoutePlanningPage from "@/pages/RoutePlanningPage";
import BookingsPage from "@/pages/BookingsPage";
import MarketsPage from "@/pages/MarketsPage";
import CommitmentsPage from "@/pages/CommitmentsPage";
import Analytics from "@/pages/Analytics";
import Profile from "@/pages/Profile";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const router = createBrowserRouter([
  // Public routes
  { path: "/", element: <Landing /> },
  { path: "/get-started", element: <GetStarted /> },
  { path: "/signup", element: <Signup /> },
  { path: "/login", element: <Login /> },

  // Farmer dashboard routes
  {
    path: "/farmer-dashboard",
    element: <ProtectedRoute allowedRole="farmer" />,
    children: [
      {
        element: <DashboardLayout />,
        children: [
          { index: true, element: <FarmerDashboard /> },
          { path: "crop-planning", element: <CropPlanning /> },
          { path: "crop-comparison", element: <CropComparison /> },
          { path: "price-insights", element: <PriceInsights /> },
          { path: "marketplace", element: <Marketplace /> },
          { path: "analytics", element: <Analytics /> },
          { path: "profile", element: <Profile /> },
        ],
      },
    ],
  },

  // Buyer dashboard routes
  {
    path: "/buyer-dashboard",
    element: <ProtectedRoute allowedRole="buyer" />,
    children: [
      {
        element: <DashboardLayout />,
        children: [
          { index: true, element: <BuyerDashboard /> },
          { path: "marketplace", element: <MarketsPage /> },
          { path: "commitments", element: <CommitmentsPage /> },
          { path: "price-insights", element: <PriceInsights /> },
          { path: "analytics", element: <Analytics /> },
          { path: "profile", element: <Profile /> },
        ],
      },
    ],
  },

  // Logistics dashboard routes
  {
    path: "/logistics-dashboard",
    element: <ProtectedRoute allowedRole="logistics" />,
    children: [
      {
        element: <DashboardLayout />,
        children: [
          { index: true, element: <LogisticsDashboard /> },
          { path: "shipments", element: <ShipmentsPage /> },
          { path: "route-planning", element: <RoutePlanningPage /> },
          { path: "bookings", element: <BookingsPage /> },
          { path: "profile", element: <Profile /> },
        ],
      },
    ],
  },

  // Legacy /dashboard redirect
  { path: "/dashboard", element: <Navigate to="/login" replace /> },
  { path: "/dashboard/*", element: <Navigate to="/login" replace /> },

  { path: "*", element: <NotFound /> },
]);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <div style={{ position: 'relative', width: '100%', minHeight: '100vh' }}>
        <ClickSpark
          sparkColor="#4aa35c"
          sparkSize={12}
          sparkRadius={22}
          sparkCount={10}
          duration={420}
          easing="ease-out"
        >
          <RouterProvider router={router} />
        </ClickSpark>
      </div>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
