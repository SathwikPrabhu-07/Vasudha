import { useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
    Calendar,
    CloudRain,
    IndianRupee,
    Shield,
    CheckCircle,
    AlertTriangle,
    Loader2,
    ArrowLeft,
    Wheat,
} from "lucide-react";
import { toast } from "sonner";
import {
    finalizeCrop,
    type CropPrediction,
    type PredictionRequest,
} from "@/services/predictionService";

function capitalize(s: string) {
    return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-IN", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

function formatCurrency(n: number) {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }).format(n);
}

const riskColors: Record<string, string> = {
    low: "bg-status-success/10 text-status-success",
    moderate: "bg-status-warning/10 text-status-warning",
    high: "bg-status-error/10 text-status-error",
};

const CropComparison = () => {
    const { t } = useTranslation();
    const location = useLocation();
    const navigate = useNavigate();
    const [finalizingCrop, setFinalizingCrop] = useState<string | null>(null);

    const predictions: CropPrediction[] = location.state?.predictions || [];
    const planningData: PredictionRequest = location.state?.planningData;

    if (!predictions.length || !planningData) {
        return (
            <div className="max-w-3xl space-y-6">
                <div className="summary-card text-center py-12">
                    <Wheat className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
                    <p className="text-sm font-medium text-muted-foreground">
                        {t("cropComparison.noPredictions")}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 mb-4">
                        {t("cropComparison.goToCropPlanning")}
                    </p>
                    <button
                        onClick={() => navigate("/farmer-dashboard/crop-planning")}
                        className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-primary-foreground font-semibold rounded-full transition-colors text-sm"
                    >
                        {t("farmer.goToCropPlanning")}
                    </button>
                </div>
            </div>
        );
    }

    const handleFinalize = async (prediction: CropPrediction) => {
        setFinalizingCrop(prediction.cropName);
        try {
            await finalizeCrop(prediction, planningData);
            toast.success(
                `${capitalize(prediction.cropName)} plan saved! Redirecting...`
            );
            setTimeout(() => navigate("/farmer-dashboard"), 600);
        } catch (err: any) {
            console.error("Finalize error:", err);
            toast.error(err?.message || "Failed to finalize crop plan");
        } finally {
            setFinalizingCrop(null);
        }
    };

    return (
        <div className="max-w-7xl space-y-6">
            <div className="flex items-center gap-4">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 rounded-xl border border-border hover:bg-secondary transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-foreground">
                        {t("cropComparison.title")}
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        {predictions.length} crop{predictions.length > 1 ? "s" : ""} · {planningData.landArea} {t("farmer.acres")}
                        · {planningData.location}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {predictions.map((pred) => {
                    if (pred.error) {
                        return (
                            <div key={pred.cropName} className="summary-card opacity-60">
                                <h3 className="text-lg font-bold mb-2">
                                    {capitalize(pred.cropName)}
                                </h3>
                                <p className="text-sm text-status-error">{pred.error}</p>
                            </div>
                        );
                    }

                    const h = pred.harvest!;
                    const w = pred.weather!;
                    const p = pred.profit!;

                    return (
                        <div
                            key={pred.cropName}
                            className="summary-card flex flex-col gap-5"
                        >
                            {/* Crop Header */}
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-bold">
                                    {capitalize(pred.cropName)}
                                </h3>
                                <span
                                    className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${riskColors[w.riskLevel] || riskColors.moderate
                                        }`}
                                >
                                    {capitalize(w.riskLevel)} {t("common.risk")}
                                </span>
                            </div>

                            {/* Harvest Info */}
                            <div className="space-y-2">
                                <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                                    <Calendar className="w-3.5 h-3.5" /> {t("cropComparison.harvestPrediction")}
                                </p>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="bg-secondary rounded-lg p-3">
                                        <p className="text-[10px] text-muted-foreground">
                                            {t("cropComparison.baseDate")}
                                        </p>
                                        <p className="text-xs font-bold">
                                            {formatDate(h.baseHarvestDate)}
                                        </p>
                                    </div>
                                    <div className="bg-secondary rounded-lg p-3">
                                        <p className="text-[10px] text-muted-foreground">
                                            {t("cropComparison.adjustedDate")}
                                        </p>
                                        <p className="text-xs font-bold">
                                            {formatDate(w.adjustedHarvestDate)}
                                        </p>
                                    </div>
                                </div>
                                <p className="text-[10px] text-muted-foreground">
                                    {formatDate(h.harvestWindowStart)} –{" "}
                                    {formatDate(h.harvestWindowEnd)} · {h.growthDaysAvg} {t("farmer.days")}
                                </p>
                            </div>

                            {/* Weather & Risk */}
                            <div className="space-y-2">
                                <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                                    <CloudRain className="w-3.5 h-3.5" /> {t("cropComparison.weatherRisk")}
                                </p>
                                <div className="grid grid-cols-3 gap-2 text-center">
                                    <div className="bg-secondary rounded-lg p-2.5">
                                        <p className="text-[10px] text-muted-foreground">{t("cropComparison.temp")}</p>
                                        <p className="text-xs font-bold">
                                            {w.weather.avgTemperature}°C
                                        </p>
                                    </div>
                                    <div className="bg-secondary rounded-lg p-2.5">
                                        <p className="text-[10px] text-muted-foreground">{t("cropComparison.rain")}</p>
                                        <p className="text-xs font-bold">
                                            {w.weather.rainfallMm}mm
                                        </p>
                                    </div>
                                    <div className="bg-secondary rounded-lg p-2.5">
                                        <p className="text-[10px] text-muted-foreground">
                                            {t("cropComparison.confidence")}
                                        </p>
                                        <p className="text-xs font-bold">{w.confidence}%</p>
                                    </div>
                                </div>
                                {w.factors.map((f, i) => (
                                    <p
                                        key={i}
                                        className="text-[10px] text-muted-foreground flex items-center gap-1"
                                    >
                                        {w.riskLevel === "low" ? (
                                            <CheckCircle className="w-3 h-3 text-status-success" />
                                        ) : (
                                            <AlertTriangle className="w-3 h-3 text-status-warning" />
                                        )}
                                        {f}
                                    </p>
                                ))}
                            </div>

                            {/* Profit Estimate */}
                            <div className="space-y-2">
                                <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                                    <IndianRupee className="w-3.5 h-3.5" /> {t("cropComparison.profitEstimate")}
                                </p>
                                <div className="bg-secondary rounded-lg p-3">
                                    <div className="flex items-center justify-between mb-1">
                                        <p className="text-[10px] text-muted-foreground">
                                            {t("cropComparison.expectedYield")}
                                        </p>
                                        <p className="text-xs font-bold">
                                            {p.estimatedYield} {p.unit}
                                        </p>
                                    </div>
                                    <div className="flex items-center justify-between mb-1">
                                        <p className="text-[10px] text-muted-foreground">
                                            {t("cropComparison.priceRange")}
                                        </p>
                                        <p className="text-xs font-bold">
                                            ₹{p.pricePerQuintalMin} – ₹{p.pricePerQuintalMax}/q
                                        </p>
                                    </div>
                                    <hr className="border-border my-2" />
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs font-semibold">{t("cropComparison.profitRange")}</p>
                                        <p className="text-sm font-bold text-primary">
                                            {formatCurrency(p.expectedProfitMin)} –{" "}
                                            {formatCurrency(p.expectedProfitMax)}
                                        </p>
                                    </div>
                                </div>
                                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                    <Shield className="w-3 h-3" />
                                    {p.priceSource === "static"
                                        ? t("cropComparison.staticEstimate")
                                        : t("cropComparison.mlPredicted")}
                                </p>
                            </div>

                            {/* By-Product Predictions */}
                            {pred.byproducts && pred.byproducts.length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                                        <Wheat className="w-3.5 h-3.5" /> {t("cropComparison.byProductRevenue")}
                                    </p>
                                    {pred.byproducts.map((bp) => (
                                        <div key={bp.name} className="bg-secondary rounded-lg p-3 space-y-1.5">
                                            <div className="flex items-center justify-between">
                                                <p className="text-xs font-bold">{bp.name}</p>
                                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                                                    {t("buyer.byProduct")}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between text-[10px]">
                                                <span className="text-muted-foreground">{t("cropComparison.yield")}</span>
                                                <span className="font-medium">{bp.estimatedYield} {bp.unit}</span>
                                            </div>
                                            <div className="flex items-center justify-between text-[10px]">
                                                <span className="text-muted-foreground">{t("cropComparison.price")}</span>
                                                <span className="font-medium">₹{bp.pricePerQuintalMin} – ₹{bp.pricePerQuintalMax}/q</span>
                                            </div>
                                            <hr className="border-border" />
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-semibold">{t("cropComparison.profit")}</span>
                                                <span className="text-xs font-bold text-primary">
                                                    {formatCurrency(bp.expectedProfitMin)} – {formatCurrency(bp.expectedProfitMax)}
                                                </span>
                                            </div>
                                            <p className="text-[9px] text-muted-foreground">
                                                {t("cropComparison.source")}: {bp.priceSource === "ml_predicted" ? t("cropComparison.mlModel") : t("cropComparison.multiplierEstimate")}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Finalize Button */}
                            <button
                                onClick={() => handleFinalize(pred)}
                                disabled={finalizingCrop === pred.cropName}
                                className="w-full mt-auto py-3 bg-primary hover:bg-primary-hover text-primary-foreground font-semibold rounded-full transition-colors text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {finalizingCrop === pred.cropName ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" /> {t("cropComparison.saving")}
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle className="w-4 h-4" /> {t("cropComparison.finalize")}
                                    </>
                                )}
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default CropComparison;
