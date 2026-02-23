import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
    MapPin,
    Droplets,
    Calendar,
    Ruler,
    Wheat,
    Loader2,
    Layers,
} from "lucide-react";
import { toast } from "sonner";
import {
    predictCropOptions,
    type PredictionRequest,
    type CropPrediction,
} from "@/services/predictionService";
import { getCurrentUser } from "@/services/authService";

const cropOptionKeys = [
    { value: "tomato", labelKey: "cropPlanning.tomato" },
    { value: "onion", labelKey: "cropPlanning.onion" },
    { value: "chilli", labelKey: "cropPlanning.chilli" },
    { value: "wheat", labelKey: "cropPlanning.wheat" },
    { value: "rice", labelKey: "cropPlanning.rice" },
    { value: "sugarcane", labelKey: "cropPlanning.sugarcane" },
    { value: "turmeric", labelKey: "cropPlanning.turmeric" },
    { value: "soybean", labelKey: "cropPlanning.soybean" },
    { value: "cotton", labelKey: "cropPlanning.cotton" },
    { value: "coconut", labelKey: "cropPlanning.coconut" },
];

// By-product data (mirrors crop_growth_data.json)
const CROP_BYPRODUCTS: Record<string, { name: string }[]> = {
    coconut: [{ name: "Coconut Husk" }, { name: "Coconut Shell" }],
    rice: [{ name: "Rice Bran" }, { name: "Rice Husk" }],
    sugarcane: [{ name: "Bagasse" }, { name: "Molasses" }],
    cotton: [{ name: "Cotton Seed" }],
};

const soilTypeKeys = [
    { value: "alluvial", labelKey: "cropPlanning.alluvial" },
    { value: "black", labelKey: "cropPlanning.blackRegur" },
    { value: "red", labelKey: "cropPlanning.red" },
    { value: "laterite", labelKey: "cropPlanning.laterite" },
    { value: "sandy", labelKey: "cropPlanning.sandy" },
    { value: "clay", labelKey: "cropPlanning.clay" },
];

const waterOptionKeys = [
    { value: "well", labelKey: "cropPlanning.well" },
    { value: "canal", labelKey: "cropPlanning.canal" },
    { value: "borewell", labelKey: "cropPlanning.borewell" },
    { value: "river", labelKey: "cropPlanning.river" },
    { value: "rainwater", labelKey: "cropPlanning.rainwater" },
    { value: "drip", labelKey: "cropPlanning.dripIrrigation" },
];

const CropPlanning = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const user = getCurrentUser();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [form, setForm] = useState({
        location: user?.location || "",
        soilType: "",
        cultivationStartDate: "",
        landArea: "",
    });
    const [selectedCrops, setSelectedCrops] = useState<string[]>([]);
    const [selectedWater, setSelectedWater] = useState<string[]>([]);
    const [enableByproducts, setEnableByproducts] = useState(false);
    const [selectedByproducts, setSelectedByproducts] = useState<Record<string, string[]>>({});

    // Compute which selected crops have by-products
    const cropsWithByproducts = selectedCrops.filter(c => CROP_BYPRODUCTS[c]?.length > 0);

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const toggleCrop = (crop: string) => {
        setSelectedCrops((prev) =>
            prev.includes(crop) ? prev.filter((c) => c !== crop) : [...prev, crop]
        );
    };

    const toggleWater = (source: string) => {
        setSelectedWater((prev) =>
            prev.includes(source)
                ? prev.filter((s) => s !== source)
                : [...prev, source]
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (selectedCrops.length === 0) {
            toast.error("Please select at least one crop");
            return;
        }
        if (selectedWater.length === 0) {
            toast.error("Please select at least one water source");
            return;
        }

        setIsSubmitting(true);

        try {
            const request: PredictionRequest = {
                location: form.location,
                soilType: form.soilType,
                cultivationStartDate: form.cultivationStartDate,
                landArea: Number(form.landArea),
                crops: selectedCrops,
                waterSources: selectedWater,
                enabledByproducts: enableByproducts ? selectedByproducts : undefined,
            };

            const predictions = await predictCropOptions(request);

            // Navigate to comparison page with data via state
            navigate("/farmer-dashboard/crop-comparison", {
                state: { predictions, planningData: request },
            });
        } catch (err: any) {
            console.error("Prediction error:", err);
            toast.error(err?.message || "Failed to get crop predictions");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-3xl space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-foreground">{t("cropPlanning.title")}</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    {t("cropPlanning.subtitle")}
                </p>
            </div>

            <form onSubmit={handleSubmit} className="summary-card space-y-6">
                {/* Location */}
                <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-primary" />
                        {t("cropPlanning.location")}
                    </label>
                    <input
                        type="text"
                        name="location"
                        value={form.location}
                        onChange={handleChange}
                        placeholder="e.g. Nashik, Maharashtra"
                        required
                        className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm focus:ring-2 focus:ring-ring focus:outline-none"
                    />
                </div>

                {/* Soil Type */}
                <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                        <Layers className="w-4 h-4 text-primary" />
                        {t("cropPlanning.soilType")}
                    </label>
                    <select
                        name="soilType"
                        value={form.soilType}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm focus:ring-2 focus:ring-ring focus:outline-none"
                    >
                        <option value="">{t("cropPlanning.selectSoilType")}</option>
                        {soilTypeKeys.map((s) => (
                            <option key={s.value} value={s.value}>
                                {t(s.labelKey)}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Water Sources (checkboxes) */}
                <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                        <Droplets className="w-4 h-4 text-primary" />
                        {t("cropPlanning.waterSources")}
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {waterOptionKeys.map((w) => (
                            <button
                                key={w.value}
                                type="button"
                                onClick={() => toggleWater(w.value)}
                                className={`px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${selectedWater.includes(w.value)
                                    ? "border-primary bg-primary/10 text-primary"
                                    : "border-border bg-card text-muted-foreground hover:border-primary/30"
                                    }`}
                            >
                                {t(w.labelKey)}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Cultivation Start Date */}
                <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-primary" />
                        {t("cropPlanning.cultivationStartDate")}
                    </label>
                    <input
                        type="date"
                        name="cultivationStartDate"
                        value={form.cultivationStartDate}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm focus:ring-2 focus:ring-ring focus:outline-none"
                    />
                </div>

                {/* Land Area */}
                <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                        <Ruler className="w-4 h-4 text-primary" />
                        {t("cropPlanning.landArea")}
                    </label>
                    <input
                        type="number"
                        name="landArea"
                        value={form.landArea}
                        onChange={handleChange}
                        placeholder="e.g. 5"
                        required
                        min="0.1"
                        step="0.1"
                        className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm focus:ring-2 focus:ring-ring focus:outline-none"
                    />
                </div>

                {/* Crop Selection (multi-select toggle) */}
                <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                        <Wheat className="w-4 h-4 text-primary" />
                        {t("cropPlanning.selectCrops")}
                    </label>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {cropOptionKeys.map((c) => (
                            <button
                                key={c.value}
                                type="button"
                                onClick={() => toggleCrop(c.value)}
                                className={`px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${selectedCrops.includes(c.value)
                                    ? "border-primary bg-primary/10 text-primary"
                                    : "border-border bg-card text-muted-foreground hover:border-primary/30"
                                    }`}
                            >
                                {t(c.labelKey)}
                            </button>
                        ))}
                    </div>
                    {selectedCrops.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                            {selectedCrops.length} {t("cropPlanning.cropsSelected")}
                        </p>
                    )}
                </div>

                {/* By-Product Sale (conditional) */}
                {cropsWithByproducts.length > 0 && (
                    <div className="space-y-3 p-4 rounded-xl border border-border bg-card/50">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={enableByproducts}
                                onChange={(e) => {
                                    setEnableByproducts(e.target.checked);
                                    if (!e.target.checked) setSelectedByproducts({});
                                }}
                                className="w-4 h-4 rounded border-input accent-primary"
                            />
                            <span className="text-sm font-medium">{t("cropPlanning.enableByproductSale")}</span>
                        </label>
                        <p className="text-xs text-muted-foreground">
                            {t("cropPlanning.byproductDesc")}
                        </p>

                        {enableByproducts && cropsWithByproducts.map(crop => (
                            <div key={crop} className="space-y-1.5">
                                <p className="text-xs font-semibold text-foreground capitalize">{crop}</p>
                                <div className="flex flex-wrap gap-2">
                                    {CROP_BYPRODUCTS[crop].map(bp => {
                                        const isSelected = (selectedByproducts[crop] || []).includes(bp.name);
                                        return (
                                            <button
                                                key={bp.name}
                                                type="button"
                                                onClick={() => {
                                                    setSelectedByproducts(prev => {
                                                        const current = prev[crop] || [];
                                                        const updated = isSelected
                                                            ? current.filter(n => n !== bp.name)
                                                            : [...current, bp.name];
                                                        return { ...prev, [crop]: updated };
                                                    });
                                                }}
                                                className={`px-3 py-2 rounded-xl border-2 text-xs font-medium transition-all ${isSelected
                                                    ? "border-primary bg-primary/10 text-primary"
                                                    : "border-border bg-card text-muted-foreground hover:border-primary/30"
                                                    }`}
                                            >
                                                {bp.name}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Submit */}
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3.5 bg-primary hover:bg-primary-hover text-primary-foreground font-semibold rounded-full transition-colors text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            {t("cropPlanning.analyzing")}
                        </>
                    ) : (
                        t("cropPlanning.getCropPredictions")
                    )}
                </button>
            </form>
        </div>
    );
};

export default CropPlanning;
