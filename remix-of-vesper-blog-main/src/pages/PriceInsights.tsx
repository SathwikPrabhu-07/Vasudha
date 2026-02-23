import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, TrendingDown, ArrowRight, Loader2, IndianRupee } from "lucide-react";
import { getCurrentUser } from "@/services/authService";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/firebase";

const LINE_COLORS = [
  "hsl(152, 45%, 28%)",
  "hsl(32, 60%, 50%)",
  "hsl(38, 80%, 55%)",
  "hsl(200, 60%, 50%)",
  "hsl(350, 60%, 50%)",
];

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

interface CropPriceCard {
  crop: string;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  count: number;
  change: number; // % change (first vs last commitment)
}

const PriceInsights = () => {
  const [loading, setLoading] = useState(true);
  const [cropCards, setCropCards] = useState<CropPriceCard[]>([]);
  const [trendData, setTrendData] = useState<Record<string, any>[]>([]);
  const [cropNames, setCropNames] = useState<string[]>([]);

  const user = getCurrentUser();
  const role = user?.role || "farmer";

  useEffect(() => {
    async function fetchPriceData() {
      if (!user) return;
      try {
        const fieldName = role === "buyer" ? "buyerId" : "farmerId";
        const commQ = query(collection(db, "commitments"), where(fieldName, "==", user.id));
        const commSnap = await getDocs(commQ);
        const commitments = commSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];

        if (commitments.length === 0) {
          setLoading(false);
          return;
        }

        // Group by crop
        const byCrop: Record<string, { prices: number[]; dates: string[] }> = {};
        commitments.forEach(c => {
          const name = (c.cropName || "unknown").toLowerCase();
          if (!byCrop[name]) byCrop[name] = { prices: [], dates: [] };
          byCrop[name].prices.push(c.agreedPrice || 0);
          let dateStr = "";
          if (c.createdAt?.toDate) dateStr = c.createdAt.toDate().toISOString();
          else if (c.createdAt) dateStr = new Date(c.createdAt).toISOString();
          byCrop[name].dates.push(dateStr);
        });

        // Build crop price cards
        const cards: CropPriceCard[] = Object.entries(byCrop).map(([crop, data]) => {
          const avg = Math.round(data.prices.reduce((a, b) => a + b, 0) / data.prices.length);
          const min = Math.min(...data.prices);
          const max = Math.max(...data.prices);
          const first = data.prices[0] || avg;
          const last = data.prices[data.prices.length - 1] || avg;
          const change = first > 0 ? +((last - first) / first * 100).toFixed(1) : 0;
          return {
            crop: crop.charAt(0).toUpperCase() + crop.slice(1),
            avgPrice: avg,
            minPrice: min,
            maxPrice: max,
            count: data.prices.length,
            change,
          };
        });
        setCropCards(cards);
        setCropNames(cards.map(c => c.crop));

        // Build trend data — group commitments by month across all crops
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const trendMap: Record<string, Record<string, number[]>> = {};
        commitments.forEach(c => {
          const name = (c.cropName || "unknown").charAt(0).toUpperCase() + (c.cropName || "unknown").slice(1);
          let dateStr = "";
          if (c.createdAt?.toDate) dateStr = c.createdAt.toDate().toISOString();
          else if (c.createdAt) dateStr = new Date(c.createdAt).toISOString();
          if (dateStr) {
            const month = new Date(dateStr).toLocaleDateString("en-US", { month: "short" });
            if (!trendMap[month]) trendMap[month] = {};
            if (!trendMap[month][name]) trendMap[month][name] = [];
            trendMap[month][name].push(c.agreedPrice || 0);
          }
        });

        const trend = months
          .filter(m => trendMap[m])
          .map(m => {
            const entry: Record<string, any> = { month: m };
            Object.entries(trendMap[m]).forEach(([crop, prices]) => {
              entry[crop] = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
            });
            return entry;
          });
        setTrendData(trend);
      } catch (err) {
        console.error("[PriceInsights] fetch failed:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchPriceData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary mr-2" />
        <span className="text-sm text-muted-foreground">Loading price insights…</span>
      </div>
    );
  }

  if (cropCards.length === 0) {
    return (
      <div className="space-y-6 max-w-7xl">
        <div>
          <h1 className="text-2xl font-bold">Price Insights</h1>
          <p className="text-sm text-muted-foreground mt-1">Market prices from your commitments</p>
        </div>
        <div className="summary-card text-center py-16">
          <IndianRupee className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">No price data yet</p>
          <p className="text-xs text-muted-foreground mt-1">Price insights will appear once you have commitments</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-bold">Price Insights</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Market prices from your commitments
        </p>
      </div>

      {/* Price cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {cropCards.map((item) => (
          <div key={item.crop} className="summary-card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm">{item.crop}</h3>
              <span
                className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${item.change > 0
                    ? "bg-status-success/10 text-status-success"
                    : item.change < 0
                      ? "bg-status-error/10 text-status-error"
                      : "bg-muted text-muted-foreground"
                  }`}
              >
                {item.change > 0 ? <TrendingUp className="w-3 h-3" /> : item.change < 0 ? <TrendingDown className="w-3 h-3" /> : null}
                {Math.abs(item.change)}%
              </span>
            </div>
            <p className="text-xl font-bold">{formatCurrency(item.avgPrice)}<span className="text-xs font-normal text-muted-foreground">/kg avg</span></p>
            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
              <span>Range</span>
              <ArrowRight className="w-3 h-3" />
              <span className="font-semibold text-foreground">
                {formatCurrency(item.minPrice)} – {formatCurrency(item.maxPrice)}
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">{item.count} commitment{item.count > 1 ? "s" : ""}</p>
          </div>
        ))}
      </div>

      {/* Price trend chart */}
      {trendData.length > 0 && (
        <div className="summary-card">
          <h2 className="text-base font-semibold mb-4">Price Trends Over Time</h2>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
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
                  formatter={(value: number) => [formatCurrency(value), ""]}
                />
                {cropNames.map((name, i) => (
                  <Line
                    key={name}
                    type="monotone"
                    dataKey={name}
                    stroke={LINE_COLORS[i % LINE_COLORS.length]}
                    strokeWidth={2}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-4 mt-3 text-xs">
            {cropNames.map((name, i) => (
              <span key={name} className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 inline-block rounded" style={{ backgroundColor: LINE_COLORS[i % LINE_COLORS.length] }} />
                {name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PriceInsights;
