import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { TrendingUp, Wheat, IndianRupee, Package, Loader2, BarChart3 } from "lucide-react";
import SummaryCard from "@/components/SummaryCard";
import { getCurrentUser } from "@/services/authService";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/firebase";

const COLORS = [
  "hsl(152, 45%, 28%)",
  "hsl(32, 60%, 50%)",
  "hsl(38, 80%, 55%)",
  "hsl(200, 60%, 50%)",
  "hsl(150, 5%, 70%)",
  "hsl(280, 50%, 50%)",
  "hsl(350, 60%, 50%)",
];

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

const Analytics = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [monthlyRevenue, setMonthlyRevenue] = useState<{ month: string; revenue: number }[]>([]);
  const [cropDistribution, setCropDistribution] = useState<{ name: string; value: number; color: string }[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalCrops, setTotalCrops] = useState(0);
  const [totalCommitments, setTotalCommitments] = useState(0);
  const [completionRate, setCompletionRate] = useState(0);

  const user = getCurrentUser();
  const role = user?.role || "farmer";

  useEffect(() => {
    async function fetchAnalytics() {
      if (!user) return;
      try {
        const fieldName = role === "buyer" ? "buyerId" : "farmerId";
        const commQ = query(collection(db, "commitments"), where(fieldName, "==", user.id));
        const commSnap = await getDocs(commQ);
        const commitments = commSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];

        setTotalCommitments(commitments.length);

        const completed = commitments.filter(c => c.status === "completed");
        const revenue = completed.reduce((sum, c) => sum + (c.agreedPrice || 0) * (c.quantity || 0), 0);
        setTotalRevenue(revenue);

        setCompletionRate(commitments.length > 0 ? Math.round((completed.length / commitments.length) * 100) : 0);

        const monthMap: Record<string, number> = {};
        completed.forEach(c => {
          let dateStr = "";
          if (c.createdAt?.toDate) dateStr = c.createdAt.toDate().toISOString();
          else if (c.createdAt) dateStr = new Date(c.createdAt).toISOString();
          if (dateStr) {
            const month = new Date(dateStr).toLocaleDateString("en-US", { month: "short" });
            monthMap[month] = (monthMap[month] || 0) + (c.agreedPrice || 0) * (c.quantity || 0);
          }
        });
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        setMonthlyRevenue(months.map(m => ({ month: m, revenue: monthMap[m] || 0 })).filter(m => m.revenue > 0));

        const cropMap: Record<string, number> = {};
        commitments.forEach(c => {
          const name = c.cropName || "Unknown";
          cropMap[name] = (cropMap[name] || 0) + (c.quantity || 0);
        });
        const dist = Object.entries(cropMap).map(([name, value], i) => ({
          name: name.charAt(0).toUpperCase() + name.slice(1),
          value,
          color: COLORS[i % COLORS.length],
        }));
        setCropDistribution(dist);

        if (role === "farmer") {
          const cropsQ = query(collection(db, "crops"), where("farmerId", "==", user.id));
          const cropsSnap = await getDocs(cropsQ);
          setTotalCrops(cropsSnap.size);
        } else if (role === "buyer") {
          const demandsQ = query(collection(db, "demands"), where("buyerId", "==", user.id));
          const demandsSnap = await getDocs(demandsQ);
          setTotalCrops(demandsSnap.size);
        }
      } catch (err) {
        console.error("[Analytics] fetch failed:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary mr-2" />
        <span className="text-sm text-muted-foreground">{t("analytics.loadingAnalytics")}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-bold">{t("analytics.title")}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t("analytics.subtitle")}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <SummaryCard
          title={role === "buyer" ? t("analytics.totalSpent") : t("analytics.totalRevenue")}
          value={formatCurrency(totalRevenue)}
          subtitle={t("analytics.fromCompletedCommitments")}
          icon={IndianRupee}
        />
        <SummaryCard
          title={role === "farmer" ? t("analytics.cropsCreated") : t("analytics.demandsPosted")}
          value={String(totalCrops)}
          subtitle={role === "farmer" ? t("analytics.inYourPortfolio") : t("analytics.onMarketplace")}
          icon={Wheat}
        />
        <SummaryCard
          title={t("analytics.commitments")}
          value={String(totalCommitments)}
          subtitle={t("analytics.totalCommitments")}
          icon={Package}
        />
        <SummaryCard
          title={t("analytics.completionRate")}
          value={`${completionRate}%`}
          subtitle={t("analytics.completedTotal")}
          icon={TrendingUp}
          trend={completionRate > 50 ? { value: `${completionRate}%`, positive: true } : undefined}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue chart */}
        <div className="lg:col-span-2 summary-card">
          <h2 className="text-base font-semibold mb-4">
            {role === "buyer" ? t("analytics.monthlySpending") : t("analytics.monthlyRevenue")}
          </h2>
          {monthlyRevenue.length > 0 ? (
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyRevenue}>
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
                    formatter={(value: number) => [formatCurrency(value), t("analytics.totalRevenue")]}
                  />
                  <Bar dataKey="revenue" fill="hsl(152, 45%, 28%)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[280px]">
              <div className="text-center text-muted-foreground">
                <BarChart3 className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">{t("analytics.noRevenueData")}</p>
                <p className="text-xs mt-1">{t("analytics.revenueWillAppear")}</p>
              </div>
            </div>
          )}
        </div>

        {/* Crop distribution */}
        <div className="summary-card">
          <h2 className="text-base font-semibold mb-4">{t("analytics.cropDistribution")}</h2>
          {cropDistribution.length > 0 ? (
            <>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={cropDistribution} cx="50%" cy="50%" outerRadius={80} dataKey="value" strokeWidth={2} stroke="hsl(0, 0%, 100%)">
                      {cropDistribution.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => [`${value} kg`, ""]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-3 mt-2 text-xs">
                {cropDistribution.map((entry) => (
                  <span key={entry.name} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: entry.color }} />
                    {entry.name} ({entry.value} kg)
                  </span>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-[200px]">
              <div className="text-center text-muted-foreground">
                <Wheat className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">{t("analytics.noCropData")}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Analytics;
