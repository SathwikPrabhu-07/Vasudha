import { useEffect, useState, useCallback } from "react";
import { MapPin, Route, Clock, IndianRupee, Truck, Loader2 } from "lucide-react";
import RouteMap from "@/components/RouteMap";
import {
    getMyShipments,
    getAvailableShipments,
    generateRoute,
    type ShipmentDocument,
} from "@/services/shipmentService";
import { toast } from "sonner";

function fmt(n: number) {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

const RoutePlanningPage = () => {
    const [routes, setRoutes] = useState<ShipmentDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [generatingId, setGeneratingId] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        try {
            const [mine, avail] = await Promise.all([getMyShipments(), getAvailableShipments()]);
            const all = [...mine, ...avail.filter(a => !mine.some(m => m.id === a.id))];
            const active = all.filter(s => s.status !== "delivered");
            setRoutes(active);
            return active;
        } catch (err) {
            console.error("[RoutePlanningPage] fetch failed:", err);
            return [];
        } finally {
            setLoading(false);
        }
    }, []);

    // Initial load — auto-select first route that has coordinates
    useEffect(() => {
        fetchData().then((active) => {
            const first = active.find(r => r.pickupCoordinates && r.deliveryCoordinates);
            if (first) setSelectedId(first.id);
        });
    }, [fetchData]);

    async function handleGenerateRoute(shipmentId: string, force = false) {
        setGeneratingId(shipmentId);
        try {
            await generateRoute(shipmentId, force);
            toast.success(force ? "Route regenerated!" : "Route generated successfully!");
            await fetchData();
            setSelectedId(shipmentId);
        } catch (err: any) {
            toast.error(err.message || "Route generation failed");
        } finally {
            setGeneratingId(null);
        }
    }

    function handleSelectRoute(id: string) {
        setSelectedId(id === selectedId ? null : id);
    }

    // Derived: the currently selected shipment (for map + details panel)
    const selectedShipment = routes.find(r => r.id === selectedId) ?? null;

    return (
        <div className="space-y-6 max-w-7xl">
            <div>
                <h1 className="text-2xl font-bold text-foreground">Route Planning</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Plan and optimize delivery routes across regions
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* ── Live Map ── */}
                <div className="summary-card overflow-hidden">
                    <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-primary" />
                        Route Map
                    </h2>
                    <RouteMap
                        shipment={selectedShipment?.pickupCoordinates ? selectedShipment : null}
                        height="350px"
                    />
                    {selectedShipment?.pickupCoordinates && (
                        <p className="text-[11px] text-muted-foreground mt-2 text-center">
                            Showing: {selectedShipment.pickupLocation || "Pickup"} → {selectedShipment.deliveryLocation || "Delivery"}
                        </p>
                    )}
                </div>

                {/* ── Route Details Panel ── */}
                <div className="summary-card">
                    <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
                        <Route className="w-5 h-5 text-primary" />
                        Route Details
                    </h2>
                    {selectedShipment ? (
                        <div className="space-y-3">
                            {/* Pickup */}
                            <div className="flex items-center gap-3 bg-secondary rounded-xl p-4">
                                <div className="w-3 h-3 rounded-full bg-green-600 shrink-0" />
                                <div>
                                    <p className="text-[11px] text-muted-foreground">Pickup</p>
                                    <p className="text-sm font-semibold">{selectedShipment.pickupLocation || "Origin"}</p>
                                    {selectedShipment.pickupCoordinates && (
                                        <p className="text-[10px] text-muted-foreground">
                                            {selectedShipment.pickupCoordinates.lat.toFixed(4)}, {selectedShipment.pickupCoordinates.lng.toFixed(4)}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <div className="ml-5 border-l-2 border-dashed border-border h-4" />
                            {/* Delivery */}
                            <div className="flex items-center gap-3 bg-secondary rounded-xl p-4">
                                <div className="w-3 h-3 rounded-full bg-red-500 shrink-0" />
                                <div>
                                    <p className="text-[11px] text-muted-foreground">Delivery</p>
                                    <p className="text-sm font-semibold">{selectedShipment.deliveryLocation || "Destination"}</p>
                                    {selectedShipment.deliveryCoordinates && (
                                        <p className="text-[10px] text-muted-foreground">
                                            {selectedShipment.deliveryCoordinates.lat.toFixed(4)}, {selectedShipment.deliveryCoordinates.lng.toFixed(4)}
                                        </p>
                                    )}
                                </div>
                            </div>
                            {/* Crop info */}
                            <div className="bg-secondary/50 rounded-lg p-3">
                                <p className="text-xs font-semibold">{selectedShipment.cropName} · {selectedShipment.quantity} kg</p>
                                {selectedShipment.proposedRoute && (
                                    <p className="text-[11px] text-muted-foreground mt-0.5">Via {selectedShipment.proposedRoute}</p>
                                )}
                            </div>
                            {/* Stats grid */}
                            <div className="grid grid-cols-3 gap-2">
                                <div className="bg-secondary/50 rounded-lg p-3 text-center">
                                    <MapPin className="w-4 h-4 mx-auto mb-1 text-primary" />
                                    <p className="text-sm font-bold">{selectedShipment.distanceKm ? `${selectedShipment.distanceKm} km` : "—"}</p>
                                    <p className="text-[10px] text-muted-foreground">Distance</p>
                                </div>
                                <div className="bg-secondary/50 rounded-lg p-3 text-center">
                                    <Clock className="w-4 h-4 mx-auto mb-1 text-primary" />
                                    <p className="text-sm font-bold">{selectedShipment.estimatedDuration || "—"}</p>
                                    <p className="text-[10px] text-muted-foreground">ETA</p>
                                </div>
                                <div className="bg-secondary/50 rounded-lg p-3 text-center">
                                    <IndianRupee className="w-4 h-4 mx-auto mb-1 text-primary" />
                                    <p className="text-sm font-bold">{selectedShipment.estimatedCost ? fmt(selectedShipment.estimatedCost) : "—"}</p>
                                    <p className="text-[10px] text-muted-foreground">Cost</p>
                                </div>
                            </div>
                            {/* Generate or Regenerate route */}
                            <button
                                onClick={() => handleGenerateRoute(selectedShipment.id, !!selectedShipment.pickupCoordinates)}
                                disabled={generatingId === selectedShipment.id}
                                className="w-full py-2.5 bg-primary hover:bg-primary-hover text-primary-foreground font-semibold rounded-full text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                            >
                                {generatingId === selectedShipment.id ? (
                                    <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
                                ) : selectedShipment.pickupCoordinates ? (
                                    <><Route className="w-4 h-4" /> Regenerate Route</>
                                ) : (
                                    <><MapPin className="w-4 h-4" /> Generate Route</>
                                )}
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-[300px]">
                            <div className="text-center text-muted-foreground">
                                <Route className="w-10 h-10 mx-auto mb-2 opacity-30" />
                                <p className="text-sm">Select a route below to view details</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Active Routes List ── */}
            <div className="summary-card">
                <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
                    <Truck className="w-5 h-5 text-accent" />
                    Active Routes
                    {!loading && <span className="text-xs text-muted-foreground font-normal ml-1">({routes.length})</span>}
                </h2>
                {loading ? (
                    <div className="flex items-center justify-center py-10">
                        <Loader2 className="w-5 h-5 animate-spin text-primary mr-2" />
                        <span className="text-sm text-muted-foreground">Loading routes…</span>
                    </div>
                ) : routes.length === 0 ? (
                    <div className="text-center py-10">
                        <Route className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
                        <p className="text-sm text-muted-foreground">No active routes yet</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {routes.map((r) => {
                            const isSelected = selectedId === r.id;
                            const hasRoute = !!r.pickupCoordinates;
                            return (
                                <div
                                    key={r.id}
                                    className={`rounded-xl p-4 cursor-pointer transition-all border-2 ${isSelected
                                        ? "border-primary bg-primary/5"
                                        : "border-transparent bg-secondary/50 hover:border-primary/30"
                                        }`}
                                    onClick={() => handleSelectRoute(r.id)}
                                >
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                        <p className="text-sm font-semibold">
                                            {r.pickupLocation || "Pickup"} → {r.deliveryLocation || "Delivery"}
                                        </p>
                                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${hasRoute ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                                            }`}>
                                            {hasRoute ? "Mapped" : "Pending"}
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground mb-2">
                                        {r.cropName} · {r.quantity} kg
                                        {r.proposedRoute ? ` · ${r.proposedRoute}` : ""}
                                    </p>
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div className="flex items-center gap-1.5 text-muted-foreground">
                                            <MapPin className="w-3 h-3" />
                                            {r.distanceKm ? `~${r.distanceKm} km` : "No route"}
                                        </div>
                                        <div className="flex items-center gap-1.5 text-muted-foreground">
                                            <Clock className="w-3 h-3" />
                                            {r.estimatedDuration || "TBD"}
                                        </div>
                                        <div className="flex items-center gap-1.5 text-muted-foreground">
                                            <IndianRupee className="w-3 h-3" />
                                            {r.estimatedCost ? fmt(r.estimatedCost) : "TBD"}
                                        </div>
                                        <div className="flex items-center gap-1.5 text-muted-foreground">
                                            <Route className="w-3 h-3" />
                                            {r.status === "in_transit" ? "In Transit" :
                                                r.status === "approved" ? "Ready" :
                                                    r.status === "logistics_proposed" ? "Proposed" : "Pending"}
                                        </div>
                                    </div>
                                    {/* Generate Route button for shipments without coordinates */}
                                    {!hasRoute && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleGenerateRoute(r.id); }}
                                            disabled={generatingId === r.id}
                                            className="mt-3 w-full py-2 bg-primary hover:bg-primary-hover text-primary-foreground font-semibold rounded-full text-xs flex items-center justify-center gap-1 transition-colors disabled:opacity-50"
                                        >
                                            {generatingId === r.id ? (
                                                <><Loader2 className="w-3 h-3 animate-spin" /> Generating…</>
                                            ) : (
                                                <><MapPin className="w-3 h-3" /> Generate Route</>
                                            )}
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default RoutePlanningPage;
