import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Truck, Clock, MapPin, Package, Loader2 } from "lucide-react";
import SummaryCard from "@/components/SummaryCard";
import {
    getAvailableShipments,
    getMyShipments,
    type ShipmentDocument,
} from "@/services/shipmentService";

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

function statusLabel(status: string, t: (key: string) => string) {
    switch (status) {
        case "awaiting_logistics": return t("shipmentsPage.awaitingLogistics");
        case "logistics_proposed": return t("logistics.proposed");
        case "approved": return t("commitments.accepted");
        case "in_transit": return t("logistics.inTransit");
        case "delivered": return t("shipmentsPage.delivered");
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

function capitalize(s: string) {
    return s.charAt(0).toUpperCase() + s.slice(1);
}

const ShipmentsPage = () => {
    const { t } = useTranslation();
    const [available, setAvailable] = useState<ShipmentDocument[]>([]);
    const [mine, setMine] = useState<ShipmentDocument[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([getAvailableShipments(), getMyShipments()])
            .then(([a, m]) => { setAvailable(a); setMine(m); })
            .catch((err) => console.error("[ShipmentsPage] fetch failed:", err))
            .finally(() => setLoading(false));
    }, []);

    const allShipments = [...available, ...mine.filter(s => !available.some(a => a.id === s.id))];
    const inTransit = allShipments.filter(s => s.status === "in_transit" || s.status === "approved");
    const deliveredList = allShipments.filter(s => s.status === "delivered");
    const awaitingList = allShipments.filter(s => s.status === "awaiting_logistics");

    return (
        <div className="space-y-6 max-w-7xl">
            <div>
                <h1 className="text-2xl font-bold text-foreground">{t("shipmentsPage.title")}</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    {t("shipmentsPage.subtitle")}
                </p>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <SummaryCard title={t("shipmentsPage.activeShipments")} value={loading ? "..." : String(inTransit.length)} subtitle={t("shipmentsPage.approvedOrInTransit")} icon={Truck} trend={inTransit.length > 0 ? { value: t("logistics.onTrack"), positive: true } : undefined} />
                <SummaryCard title={t("shipmentsPage.delivered")} value={loading ? "..." : String(deliveredList.length)} subtitle={t("logistics.allTime")} icon={Package} />
                <SummaryCard title={t("shipmentsPage.awaitingLogistics")} value={loading ? "..." : String(awaitingList.length)} subtitle={t("shipmentsPage.needProposals")} icon={Clock} />
                <SummaryCard title={t("shipmentsPage.totalShipments")} value={loading ? "..." : String(allShipments.length)} subtitle={t("shipmentsPage.acrossAllStatuses")} icon={MapPin} />
            </div>

            {/* Shipment List */}
            <div className="summary-card">
                <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
                    <Truck className="w-5 h-5 text-primary" />
                    {t("shipmentsPage.allShipments")}
                </h2>
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-5 h-5 animate-spin text-primary mr-2" />
                        <span className="text-sm text-muted-foreground">{t("shipmentsPage.loadingShipments")}</span>
                    </div>
                ) : allShipments.length === 0 ? (
                    <div className="text-center py-12">
                        <Package className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
                        <p className="text-sm text-muted-foreground">{t("shipmentsPage.noShipmentsFound")}</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {allShipments.map((s) => (
                            <div key={s.id} className="bg-secondary/50 rounded-xl p-4">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                                    <div>
                                        <p className="text-sm font-semibold">
                                            {s.pickupLocation || t("logistics.pickup")} → {s.deliveryLocation || t("logistics.delivery")}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {capitalize(s.cropName)} · {s.quantity} kg · #{s.id.slice(0, 7)}
                                        </p>
                                    </div>
                                    <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full self-start ${statusColor(s.status)}`}>
                                        {statusLabel(s.status, t)}
                                    </span>
                                </div>
                                <div className="w-full bg-secondary rounded-full h-2 mb-1.5">
                                    <div
                                        className={`h-2 rounded-full transition-all ${progressPercent(s.status) === 100 ? "bg-status-success" : "bg-primary"}`}
                                        style={{ width: `${progressPercent(s.status)}%` }}
                                    />
                                </div>
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                    <span>{progressPercent(s.status)}% {t("shipmentsPage.complete")}</span>
                                    <span className="flex items-center gap-1">
                                        {s.distanceKm ? (
                                            <><MapPin className="w-3 h-3" /> ~{s.distanceKm} km · {s.estimatedDuration}</>
                                        ) : (
                                            <><Clock className="w-3 h-3" /> {t("shipmentsPage.routePending")}</>
                                        )}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ShipmentsPage;
