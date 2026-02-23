import { useEffect, useState } from "react";
import { Package, Clock, CheckCircle, Truck, Loader2, IndianRupee, MapPin } from "lucide-react";
import SummaryCard from "@/components/SummaryCard";
import {
    getMyShipments,
    type ShipmentDocument,
} from "@/services/shipmentService";

function statusColor(status: string) {
    switch (status) {
        case "delivered": return "bg-status-success/10 text-status-success";
        case "in_transit": return "bg-status-info/10 text-status-info";
        case "approved": return "bg-emerald-100 text-emerald-700";
        case "logistics_proposed": return "bg-purple-100 text-purple-700";
        default: return "bg-muted text-muted-foreground";
    }
}

function statusLabel(status: string) {
    switch (status) {
        case "logistics_proposed": return "Pending Approval";
        case "approved": return "Approved";
        case "in_transit": return "In Transit";
        case "delivered": return "Delivered";
        default: return status;
    }
}

function capitalize(s: string) {
    return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatCurrency(n: number) {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

const BookingsPage = () => {
    const [shipments, setShipments] = useState<ShipmentDocument[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getMyShipments()
            .then(setShipments)
            .catch((err) => console.error("[BookingsPage] fetch failed:", err))
            .finally(() => setLoading(false));
    }, []);

    const pending = shipments.filter(s => s.status === "logistics_proposed");
    const active = shipments.filter(s => s.status === "approved" || s.status === "in_transit");
    const completed = shipments.filter(s => s.status === "delivered");
    const totalRevenue = shipments
        .filter(s => s.status === "delivered" && s.estimatedCost)
        .reduce((sum, s) => sum + (s.estimatedCost || 0), 0);

    function ShipmentCard({ s }: { s: ShipmentDocument }) {
        return (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-secondary/50 rounded-xl">
                <div className="flex-1">
                    <p className="font-semibold text-sm">
                        {s.pickupLocation || "Pickup"} → {s.deliveryLocation || "Delivery"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                        {capitalize(s.cropName)} · {s.quantity} kg · #{s.id.slice(0, 7)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        {s.proposedRoute && <><MapPin className="w-3 h-3 inline mr-0.5" />{s.proposedRoute} · </>}
                        {s.distanceKm && <><span>~{s.distanceKm} km</span> · </>}
                        {s.estimatedCost && formatCurrency(s.estimatedCost)}
                    </p>
                </div>
                <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full self-start ${statusColor(s.status)}`}>
                    {statusLabel(s.status)}
                </span>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-7xl">
            <div>
                <h1 className="text-2xl font-bold text-foreground">Bookings</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Manage transport booking requests from farmers and buyers
                </p>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <SummaryCard title="Pending Approval" value={loading ? "..." : String(pending.length)} subtitle="Awaiting buyer response" icon={Clock} trend={pending.length > 0 ? { value: "Action needed", positive: false } : undefined} />
                <SummaryCard title="Active" value={loading ? "..." : String(active.length)} subtitle="Approved or in transit" icon={Truck} />
                <SummaryCard title="Completed" value={loading ? "..." : String(completed.length)} subtitle="All delivered" icon={CheckCircle} trend={completed.length > 0 ? { value: "100%", positive: true } : undefined} />
                <SummaryCard title="Revenue" value={loading ? "..." : formatCurrency(totalRevenue)} subtitle={`From ${completed.length} bookings`} icon={IndianRupee} />
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-5 h-5 animate-spin text-primary mr-2" />
                    <span className="text-sm text-muted-foreground">Loading bookings...</span>
                </div>
            ) : (
                <>
                    {/* Pending Approval */}
                    <div className="summary-card">
                        <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
                            <Clock className="w-5 h-5 text-status-warning" />
                            Pending Buyer Approval
                        </h2>
                        {pending.length === 0 ? (
                            <div className="text-center py-8">
                                <Clock className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
                                <p className="text-xs text-muted-foreground">No pending bookings</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {pending.map(s => <ShipmentCard key={s.id} s={s} />)}
                            </div>
                        )}
                    </div>

                    {/* Active */}
                    {active.length > 0 && (
                        <div className="summary-card">
                            <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
                                <Truck className="w-5 h-5 text-primary" />
                                Active Bookings
                            </h2>
                            <div className="space-y-3">
                                {active.map(s => <ShipmentCard key={s.id} s={s} />)}
                            </div>
                        </div>
                    )}

                    {/* Completed */}
                    {completed.length > 0 && (
                        <div className="summary-card">
                            <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
                                <CheckCircle className="w-5 h-5 text-status-success" />
                                Completed Bookings
                            </h2>
                            <div className="space-y-3">
                                {completed.map(s => <ShipmentCard key={s.id} s={s} />)}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default BookingsPage;
