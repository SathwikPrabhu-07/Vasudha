import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    Sprout,
    TrendingUp,
    CalendarCheck,
    IndianRupee,
    CloudSun,
    MapPin,
    Bell,
    Wheat,
    Loader2,
    AlertTriangle,
    Shield,
    ShoppingCart,
    Handshake,
    CheckCircle,
    XCircle,
    Truck,
} from "lucide-react";
import SummaryCard from "@/components/SummaryCard";
import { GlowCard } from "@/components/ui/spotlight-card";
import {
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Area,
    AreaChart,
} from "recharts";
import { getMyCrops, type CropDocument } from "@/services/cropService";
import { getFarmerMatches, type FarmerDemandMatch } from "@/services/demandService";
import {
    getCommitmentsForFarmer,
    updateCommitmentStatus,
    type CommitmentDocument,
} from "@/services/commitmentService";
import { getShipmentsByFarmer, type ShipmentDocument } from "@/services/shipmentService";
import { toast } from "sonner";


/** Capitalize first letter */
function capitalize(s: string) {
    return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Format a date string to a readable format */
function formatDate(dateStr: string) {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
}

/** Compute days until a date */
function daysUntil(dateStr: string) {
    if (!dateStr) return 0;
    const diff = new Date(dateStr).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

/** Format currency */
function formatCurrency(n: number) {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }).format(n);
}

/** Risk badge color mapping */
const riskColors: Record<string, string> = {
    low: "bg-status-success/10 text-status-success",
    moderate: "bg-status-warning/10 text-status-warning",
    high: "bg-status-error/10 text-status-error",
    unknown: "bg-muted text-muted-foreground",
};

const FarmerDashboard = () => {
    const { t } = useTranslation();
    const [crops, setCrops] = useState<CropDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [farmerMatches, setFarmerMatches] = useState<FarmerDemandMatch[]>([]);
    const [loadingMatches, setLoadingMatches] = useState(true);
    const [commitments, setCommitments] = useState<CommitmentDocument[]>([]);
    const [loadingCommitments, setLoadingCommitments] = useState(true);
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    // Compute price chart data from accepted/completed commitments
    const priceChartData = (() => {
        const monthMap: Record<string, { total: number; count: number }> = {};
        commitments
            .filter(c => c.status === "accepted" || c.status === "completed")
            .forEach(c => {
                let dateStr = "";
                const ts = c.createdAt as any;
                if (ts?.toDate) dateStr = ts.toDate().toISOString();
                else if (ts) dateStr = new Date(ts).toISOString();
                if (dateStr) {
                    const month = new Date(dateStr).toLocaleDateString("en-US", { month: "short" });
                    if (!monthMap[month]) monthMap[month] = { total: 0, count: 0 };
                    monthMap[month].total += (c.agreedPrice || 0);
                    monthMap[month].count += 1;
                }
            });
        return Object.entries(monthMap).map(([month, d]) => ({
            month,
            price: Math.round(d.total / d.count),
        }));
    })();

    useEffect(() => {
        getMyCrops()
            .then(setCrops)
            .catch((err) => console.error("Failed to fetch crops:", err))
            .finally(() => setLoading(false));

        getFarmerMatches()
            .then(setFarmerMatches)
            .catch((err) => console.error("Failed to fetch farmer matches:", err))
            .finally(() => setLoadingMatches(false));

        fetchCommitments();
    }, []);

    async function fetchCommitments() {
        setLoadingCommitments(true);
        try {
            const data = await getCommitmentsForFarmer();
            setCommitments(data);
        } catch (err) {
            console.error("Failed to fetch commitments:", err);
        } finally {
            setLoadingCommitments(false);
        }
    }

    async function handleStatusUpdate(commitmentId: string, newStatus: "accepted" | "rejected") {
        setUpdatingId(commitmentId);
        try {
            await updateCommitmentStatus(commitmentId, newStatus);
            toast.success(`Commitment ${newStatus}!`);
            fetchCommitments();
            // Refresh crops too since accepted commitments change crop state
            getMyCrops().then(setCrops);
        } catch (err: any) {
            toast.error(err.message || `Failed to ${newStatus} commitment`);
        } finally {
            setUpdatingId(null);
        }
    }

    // Derived summary data — all dynamic from Firestore
    const totalCrops = crops.length;
    const totalProfitMin = crops.reduce((sum, c) => sum + c.expectedProfitMin, 0);
    const totalProfitMax = crops.reduce((sum, c) => sum + c.expectedProfitMax, 0);

    // Nearest harvest — use recommendedHarvestStart
    const nearestHarvest = crops
        .map((c) => c.recommendedHarvestStart || c.adjustedHarvestDate || c.baseHarvestDate)
        .filter(Boolean)
        .sort()
        .at(0);

    // Risk summary
    const highRiskCount = crops.filter((c) => c.riskLevel === "high").length;
    const moderateRiskCount = crops.filter((c) => c.riskLevel === "moderate").length;
    const riskSummary =
        highRiskCount > 0
            ? `${highRiskCount} high risk`
            : moderateRiskCount > 0
                ? `${moderateRiskCount} moderate risk`
                : totalCrops > 0
                    ? "All low risk"
                    : "No data";

    return (
        <div className="space-y-6 max-w-7xl">
            {/* Page header */}
            <GlowCard glowColor="green" customSize className="w-full !aspect-auto p-6">
                <h1 className="text-2xl font-bold text-foreground">{t("farmer.title")}</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    {t("farmer.subtitle")}
                </p>
            </GlowCard>

            {/* Summary cards — dynamic from Firestore */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <SummaryCard
                    title={t("farmer.activeCrops")}
                    value={loading ? "..." : String(totalCrops)}
                    subtitle={totalCrops === 0 ? "Plan your first crop" : `${totalCrops} finalized crop${totalCrops > 1 ? "s" : ""}`}
                    icon={Sprout}
                    trend={totalCrops > 0 ? { value: `${totalCrops} active`, positive: true } : undefined}
                />
                <SummaryCard
                    title={t("farmer.expectedProfit")}
                    value={loading ? "..." : formatCurrency((totalProfitMin + totalProfitMax) / 2)}
                    subtitle={totalProfitMax > 0 ? `${formatCurrency(totalProfitMin)} – ${formatCurrency(totalProfitMax)}` : "No profit data"}
                    icon={IndianRupee}
                    trend={totalProfitMax > 0 ? { value: `${formatCurrency(totalProfitMax)} max`, positive: true } : undefined}
                />
                <SummaryCard
                    title={t("farmer.nearestHarvest")}
                    value={loading ? "..." : nearestHarvest ? formatDate(nearestHarvest) : "—"}
                    subtitle={nearestHarvest ? `${daysUntil(nearestHarvest)} days away` : "No upcoming harvests"}
                    icon={CalendarCheck}
                />
                <SummaryCard
                    title={t("farmer.riskOverview")}
                    value={loading ? "..." : riskSummary}
                    subtitle={`Across ${totalCrops} crop${totalCrops !== 1 ? "s" : ""}`}
                    icon={Shield}
                    trend={highRiskCount > 0 ? { value: `${highRiskCount} high`, positive: false } : undefined}
                />
            </div>

            {/* My Crops List — real data from Firestore */}
            {loading ? (
                <div className="summary-card flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-primary mr-2" />
                    <span className="text-sm text-muted-foreground">{t("farmer.loadingCrops")}</span>
                </div>
            ) : crops.length > 0 ? (
                <div className="summary-card">
                    <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
                        <Wheat className="w-5 h-5 text-primary" />
                        {t("farmer.myCrops")} ({crops.length})
                    </h2>
                    <div className="space-y-3">
                        {crops.map((crop) => (
                            <div
                                key={crop.id}
                                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-secondary/50 rounded-xl"
                            >
                                <div className="flex-1">
                                    <p className="font-semibold text-sm">{capitalize(crop.cropName)}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {crop.location} · {crop.landArea} acres · Harvest: {formatDate(crop.recommendedHarvestStart || crop.adjustedHarvestDate || crop.baseHarvestDate)} · {daysUntil(crop.recommendedHarvestStart || crop.adjustedHarvestDate || crop.baseHarvestDate)} days
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="text-right">
                                        <p className="text-sm font-bold">
                                            {formatCurrency(crop.expectedProfitMin)} – {formatCurrency(crop.expectedProfitMax)}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground">
                                            {crop.estimatedYield} q yield · {crop.confidence}% confidence
                                        </p>
                                    </div>
                                    <span
                                        className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${riskColors[crop.riskLevel] || riskColors.unknown
                                            }`}
                                    >
                                        {capitalize(crop.riskLevel)}
                                    </span>
                                </div>

                                {/* By-product quantities */}
                                {crop.byproducts && crop.byproducts.length > 0 && (
                                    <div className="mt-2 space-y-1">
                                        {crop.byproducts.map((bp) => (
                                            <div key={bp.name} className="flex items-center justify-between bg-secondary/60 rounded-lg px-2.5 py-1.5 text-[10px]">
                                                <span className="font-medium">{bp.name}</span>
                                                <span className="text-muted-foreground">
                                                    {bp.availableQuantity}q avail · {bp.committedQuantity}q committed
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="summary-card text-center py-10">
                    <Wheat className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
                    <p className="text-sm font-medium text-muted-foreground">{t("farmer.noCropsYet")}</p>
                    <p className="text-xs text-muted-foreground mt-1">{t("farmer.startPlanning")}</p>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Price Trend Chart */}
                <div className="lg:col-span-2 summary-card">
                    <h2 className="text-base font-semibold mb-4">Commitment Price Trend</h2>
                    {priceChartData.length > 0 ? (
                        <div className="h-[280px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={priceChartData}>
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
                                        formatter={(value: number) => [`₹${value}`, "Avg Price/kg"]}
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
                    ) : (
                        <div className="flex items-center justify-center h-[280px] text-center">
                            <div className="text-muted-foreground">
                                <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                <p className="text-sm">No price data yet</p>
                                <p className="text-xs mt-1">Price trends will appear as commitments are accepted</p>
                            </div>
                        </div>
                    )}
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

            {/* Buyer Interest — real matches from backend */}
            <div className="summary-card">
                <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5 text-accent" />
                    Buyer Interest
                </h2>
                {loadingMatches ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-5 h-5 animate-spin text-primary mr-2" />
                        <span className="text-sm text-muted-foreground">Checking buyer demands...</span>
                    </div>
                ) : farmerMatches.length === 0 ? (
                    <div className="text-center py-8">
                        <ShoppingCart className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
                        <p className="text-sm text-muted-foreground">No buyer interest yet</p>
                        <p className="text-xs text-muted-foreground mt-1">Matching demands will appear here once buyers post requirements</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {farmerMatches.map((match) => (
                            <div key={match.cropId}>
                                <p className="text-sm font-semibold mb-2">{capitalize(match.cropName)} — {match.matchCount} interested buyer{match.matchCount !== 1 ? "s" : ""}</p>
                                <div className="space-y-2">
                                    {match.matchedDemands.map((demand) => (
                                        <div
                                            key={demand.demandId}
                                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-secondary/50 rounded-xl"
                                        >
                                            <div className="flex-1">
                                                <p className="font-semibold text-sm">{demand.requiredQuantity} kg needed</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {demand.location} · {formatDate(demand.requiredFromDate)}–{formatDate(demand.requiredToDate)}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-sm font-bold">{formatCurrency(demand.offeredPrice)}/kg</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Pending Commitments */}
            <div className="summary-card">
                <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
                    <Handshake className="w-5 h-5 text-accent" />
                    Commitments
                </h2>
                {loadingCommitments ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-5 h-5 animate-spin text-primary mr-2" />
                        <span className="text-sm text-muted-foreground">Loading commitments...</span>
                    </div>
                ) : commitments.length === 0 ? (
                    <div className="text-center py-8">
                        <Handshake className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
                        <p className="text-sm text-muted-foreground">No commitments yet</p>
                        <p className="text-xs text-muted-foreground mt-1">Buyer commitment requests will appear here</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {commitments.map((c) => (
                            <div key={c.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-secondary/50 rounded-xl">
                                <div className="flex-1">
                                    <p className="font-semibold text-sm">
                                        {capitalize(c.cropName)}
                                        {c.itemType === "byproduct" && (
                                            <span className="ml-1.5 text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                                                By-product: {c.itemName}
                                            </span>
                                        )}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {c.quantity} kg · {formatCurrency(c.agreedPrice)}/kg
                                        {c.createdAt ? ` · ${formatDate(c.createdAt.toISOString())}` : ""}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    {c.status === "pending" ? (
                                        <>
                                            <button
                                                onClick={() => handleStatusUpdate(c.id, "accepted")}
                                                disabled={updatingId === c.id}
                                                className="px-3 py-1.5 bg-status-success/10 hover:bg-status-success/20 text-status-success font-semibold rounded-full text-xs flex items-center gap-1 transition-colors disabled:opacity-50"
                                            >
                                                {updatingId === c.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                                                Accept
                                            </button>
                                            <button
                                                onClick={() => handleStatusUpdate(c.id, "rejected")}
                                                disabled={updatingId === c.id}
                                                className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-600 font-semibold rounded-full text-xs flex items-center gap-1 transition-colors disabled:opacity-50"
                                            >
                                                {updatingId === c.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
                                                Reject
                                            </button>
                                        </>
                                    ) : (
                                        <span className={`text-[10px] font-bold px-3 py-1 rounded-full ${c.status === "accepted" ? "bg-status-success/10 text-status-success" :
                                            c.status === "rejected" ? "bg-red-100 text-red-600" :
                                                c.status === "completed" ? "bg-blue-100 text-blue-600" :
                                                    "bg-yellow-100 text-yellow-700"
                                            }`}>
                                            {c.status === "accepted" && <CheckCircle className="w-3 h-3 inline mr-1" />}
                                            {c.status === "rejected" && <XCircle className="w-3 h-3 inline mr-1" />}
                                            {c.status.toUpperCase()}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Active Shipments */}
            <ShipmentsSection />
        </div>
    );
};

// -------- Shipments Sub-Component --------
function ShipmentsSection() {
    const [shipments, setShipments] = useState<ShipmentDocument[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getShipmentsByFarmer()
            .then(setShipments)
            .catch((err) => console.error("[FarmerDashboard] shipments fetch failed:", err))
            .finally(() => setLoading(false));
    }, []);

    const statusColor = (s: string) => {
        switch (s) {
            case "delivered": return "bg-status-success/10 text-status-success";
            case "in_transit": return "bg-status-info/10 text-status-info";
            case "approved": return "bg-emerald-100 text-emerald-700";
            case "logistics_proposed": return "bg-purple-100 text-purple-700";
            case "awaiting_logistics": return "bg-orange-100 text-orange-600";
            default: return "bg-muted text-muted-foreground";
        }
    };
    const statusLabel = (s: string) => {
        switch (s) {
            case "awaiting_logistics": return "Awaiting Logistics";
            case "logistics_proposed": return "Proposal Pending";
            case "approved": return "Approved";
            case "in_transit": return "In Transit";
            case "delivered": return "Delivered";
            default: return s.charAt(0).toUpperCase() + s.slice(1);
        }
    };
    const progress = (s: string) => {
        switch (s) {
            case "awaiting_logistics": return 0;
            case "logistics_proposed": return 15;
            case "approved": return 30;
            case "in_transit": return 65;
            case "delivered": return 100;
            default: return 0;
        }
    };

    if (loading) return null;
    if (shipments.length === 0) return null;

    return (
        <div className="summary-card">
            <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
                <Truck className="w-5 h-5 text-primary" />
                Shipment Tracking
            </h2>
            <div className="space-y-3">
                {shipments.map((s) => (
                    <div key={s.id} className="bg-secondary/50 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                            <div>
                                <p className="text-sm font-semibold">
                                    {s.pickupLocation || "Pickup"} → {s.deliveryLocation || "Delivery"}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {s.cropName} · {s.quantity} kg
                                </p>
                            </div>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusColor(s.status)}`}>
                                {statusLabel(s.status)}
                            </span>
                        </div>
                        <div className="w-full bg-secondary rounded-full h-2 mb-1">
                            <div
                                className={`h-2 rounded-full transition-all ${s.status === "delivered" ? "bg-status-success" : "bg-primary"}`}
                                style={{ width: `${progress(s.status)}%` }}
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <p className="text-[10px] text-muted-foreground">{progress(s.status)}% complete</p>
                            {s.distanceKm && <p className="text-[10px] text-muted-foreground">~{s.distanceKm} km · {s.estimatedDuration}</p>}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default FarmerDashboard;
