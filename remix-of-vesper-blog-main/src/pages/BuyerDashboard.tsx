import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    ShoppingCart,
    Package,
    FileCheck,
    TrendingUp,
    ArrowRight,
    Clock,
    Wheat,
    Loader2,
    Plus,
    X,
    Search,
    CheckCircle,
    XCircle,
    Handshake,
    Truck,
    ChevronDown,
} from "lucide-react";
import SummaryCard from "@/components/SummaryCard";
import { GlowCard } from "@/components/ui/spotlight-card";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";
import {
    postDemand,
    getBuyerMatches,
    getCropOptions,
    type DemandMatch,
    type CropOption,
} from "@/services/demandService";
import { createCommitment, getCommitmentsForBuyer, type CommitmentDocument } from "@/services/commitmentService";
import { getShipmentsByBuyer, getShipmentsAwaitingApproval, approveShipment, type ShipmentDocument } from "@/services/shipmentService";
import { toast } from "sonner";
import Magnet from "@/components/Magnet";



function capitalize(s: string) {
    return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatCurrency(n: number) {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }).format(n);
}

function formatDate(dateStr: string) {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
}

/** Format item display name for a demand */
function itemLabel(itemType: "primary" | "byproduct", itemName: string, cropName?: string): string {
    if (itemType === "byproduct") return itemName;
    // Primary: show "Coconut (Primary)"
    const name = itemName || cropName || "";
    return `${capitalize(name)} (Primary)`;
}

interface SelectedItem {
    cropId: string;
    cropName: string;
    itemType: "primary" | "byproduct";
    itemName: string;
    availableQuantity: number;
}

const BuyerDashboard = () => {
    const { t } = useTranslation();
    // -- Demand form state --
    const [showForm, setShowForm] = useState(false);
    const [cropOptions, setCropOptions] = useState<CropOption[]>([]);
    const [loadingOptions, setLoadingOptions] = useState(false);
    const [selectedItem, setSelectedItem] = useState<SelectedItem | null>(null);
    const [formData, setFormData] = useState({
        requiredQuantity: "",
        requiredFromDate: "",
        requiredToDate: "",
        location: "",
        offeredPrice: "",
    });
    const [posting, setPosting] = useState(false);

    // -- Matches state --
    const [matches, setMatches] = useState<DemandMatch[]>([]);
    const [loadingMatches, setLoadingMatches] = useState(true);

    // -- Commitments state --
    const [commitments, setCommitments] = useState<CommitmentDocument[]>([]);
    const [loadingCommitments, setLoadingCommitments] = useState(true);
    const [commitModal, setCommitModal] = useState<{
        cropId: string;
        cropName: string;
        itemType: "primary" | "byproduct";
        itemName: string;
        availableQuantity: number;
    } | null>(null);
    const [commitForm, setCommitForm] = useState({ quantity: "", agreedPrice: "" });
    const [committing, setCommitting] = useState(false);

    // Fetch matches + commitments on mount
    useEffect(() => {
        fetchMatches();
        fetchCommitments();
    }, []);

    // Fetch crop options whenever form opens
    useEffect(() => {
        if (showForm) {
            fetchCropOptions();
        } else {
            // Clear selection when form closes
            setSelectedItem(null);
        }
    }, [showForm]);

    async function fetchCropOptions() {
        setLoadingOptions(true);
        setSelectedItem(null);
        try {
            const opts = await getCropOptions();
            setCropOptions(opts);
        } catch (err) {
            console.error("[BuyerDashboard] Crop options fetch error:", err);
            setCropOptions([]);
        } finally {
            setLoadingOptions(false);
        }
    }

    async function fetchMatches() {
        setLoadingMatches(true);
        try {
            const data = await getBuyerMatches();
            setMatches(data);
        } catch (err) {
            console.error("[BuyerDashboard] Match fetch error:", err);
        } finally {
            setLoadingMatches(false);
        }
    }

    async function fetchCommitments() {
        setLoadingCommitments(true);
        try {
            const data = await getCommitmentsForBuyer();
            setCommitments(data);
        } catch (err) {
            console.error("[BuyerDashboard] Commitments fetch error:", err);
        } finally {
            setLoadingCommitments(false);
        }
    }

    async function handleCommit(e: React.FormEvent) {
        e.preventDefault();
        if (!commitModal) return;
        setCommitting(true);
        try {
            await createCommitment({
                cropId: commitModal.cropId,
                agreedPrice: parseFloat(commitForm.agreedPrice) || 0,
                quantity: parseFloat(commitForm.quantity) || 0,
                itemType: commitModal.itemType,
                itemName: commitModal.itemName,
            });
            toast.success("Commitment sent! Waiting for farmer approval.");
            setCommitModal(null);
            setCommitForm({ quantity: "", agreedPrice: "" });
            fetchCommitments();
        } catch (err: any) {
            toast.error(err.message || "Failed to create commitment");
        } finally {
            setCommitting(false);
        }
    }

    async function handlePostDemand(e: React.FormEvent) {
        e.preventDefault();
        if (!selectedItem) {
            toast.error("Please select a crop or by-product");
            return;
        }
        setPosting(true);
        try {
            await postDemand({
                cropId: selectedItem.cropId,
                itemType: selectedItem.itemType,
                itemName: selectedItem.itemName,
                cropName: selectedItem.cropName,
                requiredQuantity: parseFloat(formData.requiredQuantity) || 0,
                requiredFromDate: formData.requiredFromDate,
                requiredToDate: formData.requiredToDate,
                location: formData.location,
                offeredPrice: parseFloat(formData.offeredPrice) || 0,
            });
            toast.success("Demand posted successfully!");
            setShowForm(false);
            setSelectedItem(null);
            setFormData({ requiredQuantity: "", requiredFromDate: "", requiredToDate: "", location: "", offeredPrice: "" });
            fetchMatches();
        } catch (err: any) {
            toast.error(err.message || "Failed to post demand");
        } finally {
            setPosting(false);
        }
    }

    /** Handle dropdown selection — value is encoded as "cropId|cropName|itemType|itemName|availableQty" */
    function handleItemSelect(value: string) {
        if (!value) {
            setSelectedItem(null);
            return;
        }
        const [cropId, cropName, itemType, itemName, availQty] = value.split("|");
        setSelectedItem({
            cropId,
            cropName,
            itemType: itemType as "primary" | "byproduct",
            itemName,
            availableQuantity: parseFloat(availQty) || 0,
        });
    }

    // Derived summary
    const totalDemands = matches.length;
    const totalMatchedCrops = matches.reduce((sum, m) => sum + m.matchCount, 0);
    const totalCommitments = commitments.length;
    const acceptedCommitments = commitments.filter(c => c.status === "accepted").length;

    return (
        <div className="space-y-6 max-w-7xl">
            {/* Page header */}
            <GlowCard glowColor="green" customSize className="w-full !aspect-auto p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">{t("buyer.title")}</h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            {t("buyer.subtitle")}
                        </p>
                    </div>
                    <Magnet padding={30} magnetStrength={5}>
                        <button
                            onClick={() => setShowForm(!showForm)}
                            className="px-4 py-2 bg-primary hover:bg-primary-hover text-primary-foreground font-semibold rounded-full transition-colors text-sm flex items-center gap-2"
                        >
                            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                            {showForm ? t("buyer.cancel") : t("buyer.postDemand")}
                        </button>
                    </Magnet>
                </div>
            </GlowCard>

            {/* Demand posting form */}
            {showForm && (
                <form onSubmit={handlePostDemand} className="summary-card space-y-4">
                    <h2 className="text-base font-semibold">{t("buyer.postNewDemand")}</h2>

                    {/* ---- Grouped crop/item dropdown ---- */}
                    <div>
                        <label className="text-xs font-medium text-muted-foreground block mb-1">
                            Select Crop / By-Product
                        </label>
                        {loadingOptions ? (
                            <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Loading available crops…
                            </div>
                        ) : cropOptions.length === 0 ? (
                            <div className="w-full px-3 py-2 rounded-lg border border-input bg-secondary text-sm text-muted-foreground">
                                No crops available in marketplace.
                            </div>
                        ) : (
                            <div className="relative">
                                <select
                                    required
                                    value={selectedItem
                                        ? `${selectedItem.cropId}|${selectedItem.cropName}|${selectedItem.itemType}|${selectedItem.itemName}|${selectedItem.availableQuantity}`
                                        : ""}
                                    onChange={(e) => handleItemSelect(e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:ring-2 focus:ring-primary/20 outline-none appearance-none pr-8"
                                >
                                    <option value="" disabled>Select a crop or by-product…</option>
                                    {cropOptions.map((crop) => (
                                        <optgroup key={crop.cropId} label={capitalize(crop.cropName)}>
                                            {crop.items.map((item) => (
                                                <option
                                                    key={`${crop.cropId}|${item.itemType}|${item.itemName}`}
                                                    value={`${crop.cropId}|${crop.cropName}|${item.itemType}|${item.itemName}|${item.availableQuantity}`}
                                                >
                                                    {item.itemType === "primary"
                                                        ? `${capitalize(item.itemName)} (Primary)`
                                                        : item.itemName}
                                                    {" "}— {item.availableQuantity} kg available
                                                </option>
                                            ))}
                                        </optgroup>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                            </div>
                        )}
                        {/* Show selected item info */}
                        {selectedItem && (
                            <p className="text-[11px] text-muted-foreground mt-1.5">
                                <span className={`inline-block mr-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-semibold ${selectedItem.itemType === "byproduct" ? "bg-primary/10 text-primary" : "bg-status-success/10 text-status-success"}`}>
                                    {selectedItem.itemType === "byproduct" ? "By-product" : "Primary"}
                                </span>
                                {selectedItem.availableQuantity} kg available
                            </p>
                        )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                            <label className="text-xs font-medium text-muted-foreground block mb-1">Quantity (kg)</label>
                            <input
                                type="number"
                                required
                                min="1"
                                max={selectedItem?.availableQuantity || undefined}
                                value={formData.requiredQuantity}
                                onChange={(e) => setFormData({ ...formData, requiredQuantity: e.target.value })}
                                placeholder="e.g. 50"
                                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-muted-foreground block mb-1">Offered Price (₹/kg)</label>
                            <input
                                type="number"
                                required
                                min="0"
                                value={formData.offeredPrice}
                                onChange={(e) => setFormData({ ...formData, offeredPrice: e.target.value })}
                                placeholder="e.g. 3000"
                                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-muted-foreground block mb-1">Location</label>
                            <input
                                type="text"
                                required
                                value={formData.location}
                                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                placeholder="e.g. Nashik"
                                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-muted-foreground block mb-1">Required From</label>
                            <input
                                type="date"
                                required
                                value={formData.requiredFromDate}
                                onChange={(e) => setFormData({ ...formData, requiredFromDate: e.target.value })}
                                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-muted-foreground block mb-1">Required To</label>
                            <input
                                type="date"
                                required
                                value={formData.requiredToDate}
                                onChange={(e) => setFormData({ ...formData, requiredToDate: e.target.value })}
                                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end">
                        <Magnet padding={30} magnetStrength={5}>
                            <button
                                type="submit"
                                disabled={posting || !selectedItem}
                                className="px-6 py-2 bg-primary hover:bg-primary-hover text-primary-foreground font-semibold rounded-full transition-colors text-sm flex items-center gap-2 disabled:opacity-50"
                            >
                                {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                {posting ? "Posting..." : "Submit Demand"}
                            </button>
                        </Magnet>
                    </div>
                </form>
            )}

            {/* Summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <SummaryCard
                    title="Open Demands"
                    value={loadingMatches ? "..." : String(totalDemands)}
                    subtitle={totalDemands === 0 ? "Post your first demand" : `${totalDemands} active demand${totalDemands > 1 ? "s" : ""}`}
                    icon={ShoppingCart}
                />
                <SummaryCard
                    title="Matched Crops"
                    value={loadingMatches ? "..." : String(totalMatchedCrops)}
                    subtitle={totalMatchedCrops > 0 ? `Across ${totalDemands} demand${totalDemands > 1 ? "s" : ""}` : "No matches yet"}
                    icon={Search}
                    trend={totalMatchedCrops > 0 ? { value: `${totalMatchedCrops} found`, positive: true } : undefined}
                />
                <SummaryCard
                    title="Commitments"
                    value={loadingCommitments ? "..." : String(totalCommitments)}
                    subtitle={acceptedCommitments > 0 ? `${acceptedCommitments} accepted` : totalCommitments > 0 ? "Pending approval" : "No commitments yet"}
                    icon={FileCheck}
                    trend={acceptedCommitments > 0 ? { value: `${acceptedCommitments} accepted`, positive: true } : undefined}
                />
                <SummaryCard
                    title="Savings"
                    value="—"
                    subtitle="After first commitment"
                    icon={TrendingUp}
                />
            </div>

            {/* Matched Farmers Section */}
            <div className="summary-card">
                <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
                    <Wheat className="w-5 h-5 text-accent" />
                    Matched Farmers
                </h2>
                {loadingMatches ? (
                    <div className="flex items-center justify-center py-10">
                        <Loader2 className="w-6 h-6 animate-spin text-primary mr-2" />
                        <span className="text-sm text-muted-foreground">Finding matches...</span>
                    </div>
                ) : matches.length === 0 ? (
                    <div className="text-center py-10">
                        <Search className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
                        <p className="text-sm font-medium text-muted-foreground">No matches found</p>
                        <p className="text-xs text-muted-foreground mt-1">Post a demand to find matching farmer crops</p>
                    </div>
                ) : (
                    <div className="space-y-5">
                        {matches.map((demand) => (
                            <div key={demand.demandId}>
                                <div className="flex items-center gap-2 mb-2 flex-wrap">
                                    {/* Item label: "Coconut Husk" or "Coconut (Primary)" */}
                                    <span className="text-sm font-semibold">
                                        {itemLabel(demand.itemType, demand.itemName, demand.cropName)}
                                    </span>
                                    {demand.itemType === "byproduct" && (
                                        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                                            By-product
                                        </span>
                                    )}
                                    <span className="text-xs text-muted-foreground">
                                        · {demand.requiredQuantity}kg · {formatDate(demand.requiredFromDate)}–{formatDate(demand.requiredToDate)} · {formatCurrency(demand.offeredPrice)}/kg
                                    </span>
                                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-status-success/10 text-status-success">
                                        {demand.matchCount} match{demand.matchCount !== 1 ? "es" : ""}
                                    </span>
                                </div>
                                {demand.matchedCrops.length > 0 ? (
                                    <div className="space-y-2">
                                        {demand.matchedCrops.map((crop) => (
                                            <div
                                                key={`${crop.cropId}-${crop.itemType}-${crop.itemName}`}
                                                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-secondary/50 rounded-xl"
                                            >
                                                <div className="flex-1">
                                                    <p className="font-semibold text-sm">
                                                        {itemLabel(crop.itemType, crop.itemName, crop.cropName)}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {crop.location} · {crop.landArea} acres · Harvest: {formatDate(crop.recommendedHarvestStart)}–{formatDate(crop.recommendedHarvestEnd)}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {crop.availableQuantity} kg available
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <div className="text-right">
                                                        <p className="text-sm font-bold">
                                                            {formatCurrency(crop.expectedProfitMin)}–{formatCurrency(crop.expectedProfitMax)}
                                                        </p>
                                                        <p className="text-[10px] text-muted-foreground">
                                                            {crop.estimatedYield} kg yield · {crop.confidence}% confidence
                                                        </p>
                                                    </div>
                                                    <button
                                                        onClick={() => setCommitModal({
                                                            cropId: crop.cropId,
                                                            cropName: crop.cropName,
                                                            itemType: crop.itemType,
                                                            itemName: crop.itemName,
                                                            availableQuantity: crop.availableQuantity,
                                                        })}
                                                        className="px-4 py-2 bg-primary hover:bg-primary-hover text-primary-foreground font-semibold rounded-full transition-colors text-xs flex items-center gap-1"
                                                    >
                                                        <Handshake className="w-3 h-3" /> Commit
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-muted-foreground pl-2">No matching crops found yet</p>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Commit Modal */}
            {commitModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <form onSubmit={handleCommit} className="bg-background rounded-2xl p-6 shadow-2xl w-full max-w-md mx-4 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold flex items-center gap-2">
                                <Handshake className="w-5 h-5 text-primary" />
                                Commit to {itemLabel(commitModal.itemType, commitModal.itemName, commitModal.cropName)}
                            </h3>
                            <button type="button" onClick={() => setCommitModal(null)} className="text-muted-foreground hover:text-foreground">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        {commitModal.itemType === "byproduct" && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                                By-product of {capitalize(commitModal.cropName)}
                            </span>
                        )}
                        <p className="text-xs text-muted-foreground">Available: {commitModal.availableQuantity} kg</p>
                        <div>
                            <label className="text-xs font-medium text-muted-foreground block mb-1">Quantity (kg)</label>
                            <input
                                type="number"
                                required
                                min="1"
                                max={commitModal.availableQuantity}
                                value={commitForm.quantity}
                                onChange={(e) => setCommitForm({ ...commitForm, quantity: e.target.value })}
                                placeholder="e.g. 50"
                                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-muted-foreground block mb-1">Agreed Price (₹/kg)</label>
                            <input
                                type="number"
                                required
                                min="0"
                                value={commitForm.agreedPrice}
                                onChange={(e) => setCommitForm({ ...commitForm, agreedPrice: e.target.value })}
                                placeholder="e.g. 3000"
                                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                            />
                        </div>
                        <div className="flex justify-end gap-3">
                            <button type="button" onClick={() => setCommitModal(null)} className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground">
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={committing}
                                className="px-6 py-2 bg-primary hover:bg-primary-hover text-primary-foreground font-semibold rounded-full transition-colors text-sm flex items-center gap-2 disabled:opacity-50"
                            >
                                {committing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Handshake className="w-4 h-4" />}
                                {committing ? "Sending..." : "Send Commitment"}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* My Commitments Section */}
            <div className="summary-card">
                <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
                    <FileCheck className="w-5 h-5 text-accent" />
                    My Commitments
                </h2>
                {loadingCommitments ? (
                    <div className="flex items-center justify-center py-10">
                        <Loader2 className="w-6 h-6 animate-spin text-primary mr-2" />
                        <span className="text-sm text-muted-foreground">Loading commitments...</span>
                    </div>
                ) : commitments.length === 0 ? (
                    <div className="text-center py-10">
                        <Handshake className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
                        <p className="text-sm font-medium text-muted-foreground">No commitments yet</p>
                        <p className="text-xs text-muted-foreground mt-1">Click "Commit" on a matched crop to get started</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {commitments.map((c) => (
                            <div key={c.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-secondary/50 rounded-xl">
                                <div className="flex-1">
                                    <p className="font-semibold text-sm flex items-center gap-1.5 flex-wrap">
                                        {itemLabel(c.itemType, c.itemName, c.cropName)}
                                        {c.itemType === "byproduct" && (
                                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                                                By-product
                                            </span>
                                        )}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {c.quantity} kg · {formatCurrency(c.agreedPrice)}/kg
                                        {c.createdAt ? ` · ${formatDate(c.createdAt.toISOString())}` : ""}
                                    </p>
                                </div>
                                <span className={`text-[10px] font-bold px-3 py-1 rounded-full ${c.status === "accepted" ? "bg-status-success/10 text-status-success" :
                                    c.status === "rejected" ? "bg-red-100 text-red-600" :
                                        c.status === "completed" ? "bg-blue-100 text-blue-600" :
                                            "bg-yellow-100 text-yellow-700"
                                    }`}>
                                    {c.status === "accepted" && <CheckCircle className="w-3 h-3 inline mr-1" />}
                                    {c.status === "rejected" && <XCircle className="w-3 h-3 inline mr-1" />}
                                    {c.status.toUpperCase()}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Commitment Spending Chart */}
            {(() => {
                const monthMap: Record<string, number> = {};
                commitments
                    .filter(c => c.status === "accepted" || c.status === "completed")
                    .forEach(c => {
                        const ts = c.createdAt as any;
                        let dateStr = "";
                        if (ts?.toDate) dateStr = ts.toDate().toISOString();
                        else if (ts) dateStr = new Date(ts).toISOString();
                        if (dateStr) {
                            const month = new Date(dateStr).toLocaleDateString("en-US", { month: "short" });
                            monthMap[month] = (monthMap[month] || 0) + (c.agreedPrice || 0) * (c.quantity || 0);
                        }
                    });
                const spendData = Object.entries(monthMap).map(([month, spend]) => ({ month, spend }));

                return (
                    <div className="summary-card">
                        <h2 className="text-base font-semibold mb-4">Monthly Spending</h2>
                        {spendData.length > 0 ? (
                            <div className="h-[280px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={spendData}>
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
                                            formatter={(value: number) => [new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value), "Spent"]}
                                        />
                                        <Bar dataKey="spend" fill="hsl(200, 60%, 50%)" radius={[6, 6, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className="flex items-center justify-center h-[280px] text-center">
                                <div className="text-muted-foreground">
                                    <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                    <p className="text-sm">No spending data yet</p>
                                    <p className="text-xs mt-1">Spending trends will appear as commitments are completed</p>
                                </div>
                            </div>
                        )}
                    </div>
                );
            })()}

            {/* Pending Logistics Approval — buyer approve/reject */}
            <PendingLogisticsApproval />

            {/* Incoming Shipments */}
            <IncomingShipments />
        </div>
    );
};

// -------- Shipments Sub-Components --------

function PendingLogisticsApproval() {
    const [shipments, setShipments] = useState<ShipmentDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionId, setActionId] = useState<string | null>(null);

    async function fetchData() {
        try {
            const data = await getShipmentsAwaitingApproval();
            setShipments(data);
        } catch (err) {
            console.error("[BuyerDashboard] approval fetch failed:", err);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { fetchData(); }, []);

    async function handleApproval(shipmentId: string, approved: boolean) {
        setActionId(shipmentId);
        try {
            await approveShipment(shipmentId, approved);
            toast.success(approved ? "Shipment approved!" : "Shipment rejected — awaiting new logistics proposal.");
            await fetchData();
        } catch (err: any) {
            toast.error(err.message || "Failed to process approval");
        } finally {
            setActionId(null);
        }
    }

    if (loading) return null;
    if (shipments.length === 0) return null;

    const formatCurrency = (n: number) =>
        new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

    return (
        <div className="summary-card">
            <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
                <Truck className="w-5 h-5 text-purple-500" />
                Pending Logistics Approval
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
                                    {s.cropName}{s.itemType === "byproduct" ? ` — ${s.itemName}` : ""} · {s.quantity} kg
                                </p>
                            </div>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                                Proposed
                            </span>
                        </div>
                        {/* Route + cost info */}
                        <div className="bg-background rounded-lg p-2 mb-2 text-xs space-y-1">
                            {s.proposedRoute && <p><span className="text-muted-foreground">Route:</span> {s.proposedRoute}</p>}
                            {s.estimatedCost && <p><span className="text-muted-foreground">Cost:</span> {formatCurrency(s.estimatedCost)}</p>}
                            {s.distanceKm && <p><span className="text-muted-foreground">Distance:</span> ~{s.distanceKm} km · ETA {s.estimatedDuration}</p>}
                        </div>
                        <div className="flex gap-2 justify-end">
                            <button
                                onClick={() => handleApproval(s.id, false)}
                                disabled={actionId === s.id}
                                className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-600 font-semibold rounded-full text-xs flex items-center gap-1 transition-colors disabled:opacity-50"
                            >
                                {actionId === s.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
                                Reject
                            </button>
                            <button
                                onClick={() => handleApproval(s.id, true)}
                                disabled={actionId === s.id}
                                className="px-3 py-1.5 bg-status-success/10 hover:bg-status-success/20 text-status-success font-semibold rounded-full text-xs flex items-center gap-1 transition-colors disabled:opacity-50"
                            >
                                {actionId === s.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                                Approve
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function IncomingShipments() {
    const [shipments, setShipments] = useState<ShipmentDocument[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getShipmentsByBuyer()
            .then(setShipments)
            .catch((err) => console.error("[BuyerDashboard] shipments fetch failed:", err))
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
            case "logistics_proposed": return "Proposed";
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
                Incoming Shipments
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
                                    {s.cropName}{s.itemType === "byproduct" ? ` — ${s.itemName}` : ""} · {s.quantity} kg
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
                        <p className="text-[10px] text-muted-foreground">{progress(s.status)}% complete</p>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default BuyerDashboard;
