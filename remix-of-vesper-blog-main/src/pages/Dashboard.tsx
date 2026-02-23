import {
  Sprout,
  TrendingUp,
  CalendarCheck,
  AlertTriangle,
  CloudSun,
  MapPin,
  Bell,
} from "lucide-react";
import SummaryCard from "@/components/SummaryCard";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";

const priceData = [
  { month: "Jan", price: 2200 },
  { month: "Feb", price: 2350 },
  { month: "Mar", price: 2500 },
  { month: "Apr", price: 2400 },
  { month: "May", price: 2800 },
  { month: "Jun", price: 3100 },
  { month: "Jul", price: 2900 },
  { month: "Aug", price: 3200 },
  { month: "Sep", price: 3400 },
  { month: "Oct", price: 3100 },
  { month: "Nov", price: 2900 },
  { month: "Dec", price: 3050 },
];

const demandAlerts = [
  { crop: "Organic Wheat", buyer: "FreshMart Co.", quantity: "50 tons", distance: "12 km", urgency: "High" },
  { crop: "Basmati Rice", buyer: "GrainHub", quantity: "30 tons", distance: "25 km", urgency: "Medium" },
  { crop: "Turmeric", buyer: "SpiceWorld", quantity: "5 tons", distance: "8 km", urgency: "High" },
];

const Dashboard = () => {
  return (
    <div className="space-y-6 max-w-7xl">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Overview of your farm's performance and market insights
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <SummaryCard
          title="Current Crop Status"
          value="Growing"
          subtitle="Wheat · 45 days to harvest"
          icon={Sprout}
          trend={{ value: "On track", positive: true }}
        />
        <SummaryCard
          title="Predicted Price Range"
          value="₹2,800 – ₹3,200"
          subtitle="Per quintal · Next month"
          icon={TrendingUp}
          trend={{ value: "8.2%", positive: true }}
        />
        <SummaryCard
          title="Harvest Recommendation"
          value="Dec 15–20"
          subtitle="Optimal window based on weather"
          icon={CalendarCheck}
        />
        <SummaryCard
          title="Risk Level"
          value="Moderate"
          subtitle="Pest alert in nearby region"
          icon={AlertTriangle}
          trend={{ value: "Watch", positive: false }}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Price Trend Chart */}
        <div className="lg:col-span-2 summary-card">
          <h2 className="text-base font-semibold mb-4">Seasonal Price Trend</h2>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={priceData}>
                <defs>
                  <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(152, 45%, 28%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(152, 45%, 28%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(40, 15%, 88%)" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(150, 5%, 45%)" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(150, 5%, 45%)" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(0, 0%, 100%)",
                    border: "1px solid hsl(40, 15%, 88%)",
                    borderRadius: "8px",
                    fontSize: "13px",
                  }}
                  formatter={(value: number) => [`₹${value}`, "Price/Quintal"]}
                />
                <Area
                  type="monotone"
                  dataKey="price"
                  stroke="hsl(152, 45%, 28%)"
                  strokeWidth={2}
                  fill="url(#priceGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Weather Widget */}
        <div className="summary-card flex flex-col gap-4">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <CloudSun className="w-5 h-5 text-accent" />
            Weather Today
          </h2>
          <div className="text-center py-4">
            <p className="text-5xl font-bold text-foreground">28°C</p>
            <p className="text-sm text-muted-foreground mt-1">Partly Cloudy</p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-secondary rounded-lg p-3 text-center">
              <p className="text-muted-foreground text-xs">Humidity</p>
              <p className="font-semibold">65%</p>
            </div>
            <div className="bg-secondary rounded-lg p-3 text-center">
              <p className="text-muted-foreground text-xs">Wind</p>
              <p className="font-semibold">12 km/h</p>
            </div>
            <div className="bg-secondary rounded-lg p-3 text-center">
              <p className="text-muted-foreground text-xs">Rain Chance</p>
              <p className="font-semibold">20%</p>
            </div>
            <div className="bg-secondary rounded-lg p-3 text-center">
              <p className="text-muted-foreground text-xs">UV Index</p>
              <p className="font-semibold">6</p>
            </div>
          </div>
          <div className="mt-auto flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="w-3 h-3" />
            <span>Nashik, Maharashtra</span>
          </div>
        </div>
      </div>

      {/* Nearby Demand Alerts */}
      <div className="summary-card">
        <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
          <Bell className="w-5 h-5 text-accent" />
          Nearby Demand Alerts
        </h2>
        <div className="space-y-3">
          {demandAlerts.map((alert, i) => (
            <div
              key={i}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-secondary/50 rounded-xl"
            >
              <div className="flex-1">
                <p className="font-semibold text-sm">{alert.crop}</p>
                <p className="text-xs text-muted-foreground">
                  {alert.buyer} · {alert.quantity} · {alert.distance} away
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                    alert.urgency === "High"
                      ? "bg-status-error/10 text-status-error"
                      : "bg-status-warning/10 text-status-warning"
                  }`}
                >
                  {alert.urgency}
                </span>
                <button className="text-xs font-semibold text-primary hover:underline">
                  View →
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
