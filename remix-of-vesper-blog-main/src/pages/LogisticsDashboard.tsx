import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    Truck,
    Package,
    MapPin,
    Clock,
    Route,
    CheckCircle,
    AlertTriangle,
    Loader2,
    Navigation,
    Send,
    X,
    IndianRupee,
} from "lucide-react";
import SummaryCard from "@/components/SummaryCard";
import { GlowCard } from "@/components/ui/spotlight-card";
import {
    getAvailableShipments,
    getMyShipments,
    proposeShipment,
    updateShipmentStatus,
    type ShipmentDocument,
    type ShipmentStatus,
} from "@/services/shipmentService";
import { toast } from "sonner";

function capitalize(s: string) {
    return s.charAt(0).toUpperCase() + s.slice(1);
}

function statusColor(status: string) {
    switch (status) {
        case "delivered": return "bg-status-success/10 text-status-success";
        case "in_transit": return "bg-status-info/10 text-status-info";
        case "approved": return "bg-emerald-100 text-emerald-700";
        case "logistics_proposed": return "bg-purple-100 text-purple-700";
        case "awaiting_logistics": return "bg-orange-100 text-orange-600";
        default: return "bg-muted text-muted-foreground";
    }
}

function statusLabel(status: string) {
    switch (status) {
        case "awaiting_logistics": return "Awaiting Logistics";
        case "logistics_proposed": return "Proposed";
        case "approved": return "Approved";
        case "in_transit": return "In Transit";
        case "delivered": return "Delivered";
        default: return status;
    }
}

function progressPercent(status: string) {
    switch (status) {
        case "awaiting_logistics": return 0;
        case "logistics_proposed": return 15;
        case "approved": return 30;
        case "in_transit": return 65;
        case "delivered": return 100;
        default: return 0;
    }
}

function formatCurrency(n: number) {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

const LogisticsDashboard = () => {
    const { t } = useTranslation();
    const [available, setAvailable] = useState<ShipmentDocument[]>([]);
    const [myShipments, setMyShipments] = useState<ShipmentDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionId, setActionId] = useState<string | null>(null);

    // Proposal form state
    const [proposalTarget, setProposalTarget] = useState<string | null>(null);
    const [proposedRoute, setProposedRoute] = useState("");
    const [estimatedCost, setEstimatedCost] = useState("");

    async function fetchData() {
        try {
            const [avail, mine] = await Promise.all([
                getAvailableShipments(),
                getMyShipments(),
            ]);
            setAvailable(avail);
            setMyShipments(mine);
        } catch (err) {
            console.error("[LogisticsDashboard] fetch failed:", err);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { fetchData(); }, []);

    async function handlePropose(shipmentId: string) {
        if (!proposedRoute.trim() || !estimatedCost.trim()) {
            toast.error("Please fill route and cost");
            return;
        }
        setActionId(shipmentId);
        try {
            await proposeShipment(shipmentId, proposedRoute.trim(), Number(estimatedCost));
            toast.success("Shipment proposed! Awaiting buyer approval.");
            setProposalTarget(null);
            setProposedRoute("");
            setEstimatedCost("");
            await fetchData();
        } catch (err: any) {
            toast.error(err.message || "Failed to propose");
        } finally {
            setActionId(null);
        }
    }

    async function handleStatusUpdate(shipmentId: string, newStatus: ShipmentStatus) {
        setActionId(shipmentId);
        try {
            await updateShipmentStatus(shipmentId, newStatus);
            toast.success(`Shipment marked as ${statusLabel(newStatus)}!`);
            await fetchData();
        } catch (err: any) {
            toast.error(err.message || "Failed to update status");
        } finally {
            setActionId(null);
        }
    }

    const proposed = myShipments.filter(s => s.status === "logistics_proposed");
    const active = myShipments.filter(s => s.status === "approved" || s.status === "in_transit");
    const delivered = myShipments.filter(s => s.status === "delivered");

    return (
        <div className="space-y-6 max-w-7xl">
            <GlowCard glowColor="green" customSize className="w-full !aspect-auto p-6">
                <h1 className="text-2xl font-bold text-foreground">{t("logistics.title")}</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    {t("logistics.subtitle")}
                </p>
            </GlowCard>

            {/* Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <SummaryCard title={t("logistics.available")} value={loading ? "..." : String(available.length)} subtitle={t("logistics.awaitingProposal")} icon={Package} trend={available.length > 0 ? { value: t("common.new"), positive: true } : undefined} />
                <SummaryCard title={t("logistics.proposed")} value={loading ? "..." : String(proposed.length)} subtitle={t("logistics.awaitingBuyerApproval")} icon={Send} />
                <SummaryCard title={t("logistics.activeShipments")} value={loading ? "..." : String(active.length)} subtitle={`${active.filter(s => s.status === "in_transit").length} ${t("logistics.inTransit")}`} icon={Truck} trend={active.length > 0 ? { value: t("logistics.onTrack"), positive: true } : undefined} />
                <SummaryCard title={t("logistics.delivered")} value={loading ? "..." : String(delivered.length)} subtitle={t("logistics.allTime")} icon={CheckCircle} />
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-6 h-6 animate-spin text-primary mr-2" />
                    <span className="text-sm text-muted-foreground">{t("logistics.loadingShipments")}</span>
                </div>
            ) : (
                <>
                    {/* Available Shipments */}
                    <div className="summary-card">
                        <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
                            <Package className="w-5 h-5 text-accent" />
                            {t("logistics.availableShipments")}
                        </h2>
                        {available.length === 0 ? (
                            <div className="text-center py-8">
                                <Package className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
                                <p className="text-xs text-muted-foreground">{t("logistics.noShipmentsAwaiting")}</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {available.map((s) => (
                                    <div key={s.id} className="p-4 bg-secondary/50 rounded-xl">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                            <div className="flex-1">
                                                <p className="font-semibold text-sm">
                                                    {s.pickupLocation || "Pickup"} → {s.deliveryLocation || "Delivery"}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {capitalize(s.cropName)} · {s.quantity} kg
                                                    {s.createdAt ? ` · ${s.createdAt.toLocaleDateString("en-IN", { month: "short", day: "numeric" })}` : ""}
                                                </p>
                                            </div>
                                            {proposalTarget === s.id ? (
                                                <button onClick={() => setProposalTarget(null)} className="text-xs text-muted-foreground hover:text-foreground">
                                                    <X className="w-4 h-4" />
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => setProposalTarget(s.id)}
                                                    className="px-4 py-2 bg-primary hover:bg-primary-hover text-primary-foreground font-semibold rounded-full transition-colors text-xs flex items-center gap-1"
                                                >
                                                    Propose <Send className="w-3 h-3" />
                                                </button>
                                            )}
                                        </div>
                                        {/* Proposal form */}
                                        {proposalTarget === s.id && (
                                            <div className="mt-3 p-3 bg-background rounded-lg border border-border space-y-2">
                                                <input
                                                    type="text"
                                                    placeholder="Proposed route (e.g. NH48 via Pune)"
                                                    value={proposedRoute}
                                                    onChange={(e) => setProposedRoute(e.target.value)}
                                                    className="w-full px-3 py-2 text-xs rounded-lg border border-input bg-background"
                                                />
                                                <div className="flex gap-2">
                                                    <div className="flex-1 relative">
                                                        <IndianRupee className="w-3 h-3 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                                        <input
                                                            type="number"
                                                            placeholder="Estimated cost"
                                                            value={estimatedCost}
                                                            onChange={(e) => setEstimatedCost(e.target.value)}
                                                            className="w-full pl-7 pr-3 py-2 text-xs rounded-lg border border-input bg-background"
                                                        />
                                                    </div>
                                                    <button
                                                        onClick={() => handlePropose(s.id)}
                                                        disabled={actionId === s.id}
                                                        className="px-4 py-2 bg-primary hover:bg-primary-hover text-primary-foreground font-semibold rounded-lg text-xs flex items-center gap-1 disabled:opacity-50"
                                                    >
                                                        {actionId === s.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                                                        Submit
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Proposed — awaiting buyer approval */}
                        <div className="summary-card">
                            <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
                                <Clock className="w-5 h-5 text-purple-500" />
                                Awaiting Buyer Approval
                            </h2>
                            {proposed.length === 0 ? (
                                <div className="text-center py-8">
                                    <Clock className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
                                    <p className="text-xs text-muted-foreground">No proposals pending</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {proposed.map((s) => (
                                        <div key={s.id} className="bg-secondary/50 rounded-xl p-4">
                                            <div className="flex items-center justify-between mb-1">
                                                <p className="text-sm font-semibold">{s.pickupLocation || "Pickup"} → {s.deliveryLocation || "Delivery"}</p>
                                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusColor(s.status)}`}>
                                                    {statusLabel(s.status)}
                                                </span>
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                {capitalize(s.cropName)} · {s.quantity} kg
                                                {s.proposedRoute ? ` · ${s.proposedRoute}` : ""}
                                                {s.estimatedCost ? ` · ${formatCurrency(s.estimatedCost)}` : ""}
                                            </p>
                                            {s.distanceKm && <p className="text-[10px] text-muted-foreground mt-1">~{s.distanceKm} km · ETA {s.estimatedDuration}</p>}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Active Shipments */}
                        <div className="summary-card">
                            <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
                                <Route className="w-5 h-5 text-primary" />
                                Active Shipments
                            </h2>
                            {active.length === 0 ? (
                                <div className="text-center py-8">
                                    <Truck className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
                                    <p className="text-xs text-muted-foreground">No active shipments</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {active.map((s) => (
                                        <div key={s.id} className="bg-secondary/50 rounded-xl p-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <div>
                                                    <p className="text-sm font-semibold">{s.pickupLocation || "Pickup"} → {s.deliveryLocation || "Delivery"}</p>
                                                    <p className="text-xs text-muted-foreground">{capitalize(s.cropName)} · {s.quantity} kg · #{s.id.slice(0, 7)}</p>
                                                </div>
                                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusColor(s.status)}`}>
                                                    {statusLabel(s.status)}
                                                </span>
                                            </div>
                                            <div className="w-full bg-secondary rounded-full h-2 mb-1.5">
                                                <div
                                                    className={`h-2 rounded-full transition-all ${s.status === "delivered" ? "bg-status-success" : "bg-primary"}`}
                                                    style={{ width: `${progressPercent(s.status)}%` }}
                                                />
                                            </div>
                                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                                                <span>{progressPercent(s.status)}% complete</span>
                                                <div className="flex gap-2">
                                                    {s.status === "approved" && (
                                                        <button
                                                            onClick={() => handleStatusUpdate(s.id, "in_transit")}
                                                            disabled={actionId === s.id}
                                                            className="px-3 py-1 bg-status-info/10 text-status-info font-semibold rounded-full text-[10px] hover:bg-status-info/20 transition-colors flex items-center gap-1"
                                                        >
                                                            {actionId === s.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Navigation className="w-3 h-3" />}
                                                            Mark In Transit
                                                        </button>
                                                    )}
                                                    {s.status === "in_transit" && (
                                                        <button
                                                            onClick={() => handleStatusUpdate(s.id, "delivered")}
                                                            disabled={actionId === s.id}
                                                            className="px-3 py-1 bg-status-success/10 text-status-success font-semibold rounded-full text-[10px] hover:bg-status-success/20 transition-colors flex items-center gap-1"
                                                        >
                                                            {actionId === s.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                                                            Mark Delivered
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            {s.distanceKm && (
                                                <p className="text-[10px] text-muted-foreground mt-1">
                                                    {s.proposedRoute} · ~{s.distanceKm} km · ETA {s.estimatedDuration}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Route Map placeholder */}
                    <div className="summary-card overflow-hidden">
                        <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
                            <MapPin className="w-5 h-5 text-primary" />
                            Route Map
                        </h2>
                        <div className="bg-secondary rounded-xl h-[250px] flex items-center justify-center">
                            <div className="text-center text-muted-foreground">
                                <MapPin className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                <p className="text-sm font-medium">Route Visualization</p>
                                <p className="text-xs">Active shipment routes will appear here</p>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default LogisticsDashboard;
