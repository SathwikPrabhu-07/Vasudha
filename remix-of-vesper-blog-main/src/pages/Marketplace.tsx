import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { MapPin, IndianRupee, Package, Loader2, ShoppingCart, Wheat, AlertTriangle, Shield, Sprout } from "lucide-react";
import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/firebase";
import { getCurrentUser } from "@/services/authService";

interface DemandItem {
  id: string;
  buyerId: string;
  cropId: string;
  cropName: string;
  itemType: "primary" | "byproduct";
  itemName: string;
  requiredQuantity: number;
  offeredPrice: number;
  location: string;
  requiredFromDate: string;
  requiredToDate: string;
  status: string;
}

function demandItemLabel(itemType: string, itemName: string, cropName: string): string {
  if (itemType === "byproduct") return itemName;
  const name = itemName || cropName;
  return `${capitalize(name)} (Primary)`;
}

interface CropItem {
  id: string;
  farmerId: string;
  cropName: string;
  estimatedYield: number;
  committedQuantity: number;
  harvestDateStart: string;
  harvestDateEnd: string;
  riskLevel: string;
  predictedPriceMin: number;
  predictedPriceMax: number;
  status: string;
  location: string;
  byproducts: {
    name: string;
    totalQuantity: number;
    availableQuantity: number;
    committedQuantity: number;
    predictedPriceMin: number;
    predictedPriceMax: number;
  }[];
}

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

const riskColors: Record<string, string> = {
  low: "bg-status-success/10 text-status-success",
  moderate: "bg-status-warning/10 text-status-warning",
  high: "bg-status-error/10 text-status-error",
  unknown: "bg-muted text-muted-foreground",
};

const Marketplace = () => {
  const { t } = useTranslation();
  const [demands, setDemands] = useState<DemandItem[]>([]);
  const [crops, setCrops] = useState<CropItem[]>([]);
  const [loadingDemands, setLoadingDemands] = useState(true);
  const [loadingCrops, setLoadingCrops] = useState(true);

  const user = getCurrentUser();
  const role = user?.role || "farmer";

  useEffect(() => {
    async function fetchDemands() {
      try {
        const q = query(
          collection(db, "demands"),
          where("status", "==", "open")
        );
        const snap = await getDocs(q);
        const items = snap.docs.map((doc) => {
          const d = doc.data();
          const itemType = d.itemType || "primary";
          const itemName = d.itemName || d.cropName || "";
          return {
            id: doc.id,
            buyerId: d.buyerId || "",
            cropId: d.cropId || "",
            cropName: d.cropName || "",
            itemType,
            itemName,
            requiredQuantity: d.requiredQuantity || 0,
            offeredPrice: d.offeredPrice || 0,
            location: d.location || "",
            requiredFromDate: d.requiredFromDate || "",
            requiredToDate: d.requiredToDate || "",
            status: d.status || "open",
          };
        });
        setDemands(items);
      } catch (err) {
        console.error("[Marketplace] Failed to fetch demands:", err);
      } finally {
        setLoadingDemands(false);
      }
    }

    async function fetchCrops() {
      try {
        const q = query(
          collection(db, "crops"),
          where("status", "in", ["active", "partially_committed"])
        );
        const snap = await getDocs(q);
        const items: CropItem[] = snap.docs.map((doc) => {
          const d = doc.data();
          return {
            id: doc.id,
            farmerId: d.farmerId || "",
            cropName: d.cropName || "",
            estimatedYield: d.estimatedYield || 0,
            committedQuantity: d.committedQuantity || 0,
            harvestDateStart: d.harvestDateStart || "",
            harvestDateEnd: d.harvestDateEnd || "",
            riskLevel: d.riskLevel || "unknown",
            predictedPriceMin: d.predictedPriceMin || 0,
            predictedPriceMax: d.predictedPriceMax || 0,
            status: d.status || "active",
            location: d.location || "",
            byproducts: (d.byproducts || []).map((bp: any) => ({
              name: bp.name || "",
              totalQuantity: bp.totalQuantity || 0,
              availableQuantity: bp.availableQuantity ?? bp.totalQuantity ?? 0,
              committedQuantity: bp.committedQuantity || 0,
              predictedPriceMin: bp.predictedPriceMin || 0,
              predictedPriceMax: bp.predictedPriceMax || 0,
            })),
          };
        });
        setCrops(items);
      } catch (err) {
        console.error("[Marketplace] Failed to fetch crops:", err);
      } finally {
        setLoadingCrops(false);
      }
    }

    fetchDemands();
    fetchCrops();
  }, []);

  const loading = loadingDemands || loadingCrops;

  return (
    <div className="space-y-8 max-w-7xl">
      <div>
        <h1 className="text-2xl font-bold">{t("marketplace.title")}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t("marketplace.subtitle")}
        </p>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-primary mr-2" />
          <span className="text-sm text-muted-foreground">{t("marketplace.loadingMarketplace")}</span>
        </div>
      )}

      {/* -------- Available Crops (supply) -------- */}
      {!loading && (
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Sprout className="w-5 h-5 text-primary" />
            {t("marketplace.availableCrops")}
          </h2>
          {crops.length === 0 ? (
            <div className="summary-card text-center py-12">
              <Wheat className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">{t("marketplace.noActiveCrops")}</p>
              <p className="text-xs text-muted-foreground mt-1">{t("marketplace.farmerListingsAppear")}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {crops.map((crop) => {
                const available = crop.estimatedYield - crop.committedQuantity;
                const risk = crop.riskLevel?.toLowerCase() || "unknown";
                return (
                  <div key={crop.id} className="summary-card flex flex-col gap-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold">{capitalize(crop.cropName)}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatDate(crop.harvestDateStart)} – {formatDate(crop.harvestDateEnd)}
                        </p>
                      </div>
                      <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${riskColors[risk] || riskColors.unknown}`}>
                        {risk === "high" && <AlertTriangle className="w-3 h-3 inline mr-1" />}
                        {risk === "low" && <Shield className="w-3 h-3 inline mr-1" />}
                        {capitalize(risk)} {t("common.risk")}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-secondary rounded-lg p-2.5">
                        <Package className="w-3.5 h-3.5 mx-auto text-muted-foreground mb-1" />
                        <p className="text-xs font-semibold">{available} kg</p>
                        <p className="text-[10px] text-muted-foreground">{t("common.available")}</p>
                      </div>
                      <div className="bg-secondary rounded-lg p-2.5">
                        <IndianRupee className="w-3.5 h-3.5 mx-auto text-muted-foreground mb-1" />
                        <p className="text-xs font-semibold">
                          {crop.predictedPriceMin > 0
                            ? `₹${crop.predictedPriceMin}–${crop.predictedPriceMax}`
                            : "—"}
                        </p>
                        <p className="text-[10px] text-muted-foreground">{t("common.predicted")}</p>
                      </div>
                      <div className="bg-secondary rounded-lg p-2.5">
                        <MapPin className="w-3.5 h-3.5 mx-auto text-muted-foreground mb-1" />
                        <p className="text-xs font-semibold">{crop.location || "—"}</p>
                        <p className="text-[10px] text-muted-foreground">{t("common.location")}</p>
                      </div>
                    </div>

                    {/* By-Product Sub-Listings */}
                    {crop.byproducts && crop.byproducts.length > 0 && (
                      <div className="space-y-2 border-t border-border pt-3">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                          {t("marketplace.byProducts")}
                        </p>
                        {crop.byproducts.map((bp) => {
                          const bpAvail = bp.availableQuantity - bp.committedQuantity;
                          return (
                            <div key={bp.name} className="flex items-center justify-between bg-secondary/60 rounded-lg px-3 py-2">
                              <div>
                                <p className="text-xs font-medium">{bp.name}</p>
                                <p className="text-[10px] text-muted-foreground">
                                  {bpAvail > 0 ? `${bpAvail} ${t("marketplace.kgAvailable")}` : t("marketplace.fullyCommitted")}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs font-semibold">
                                  {bp.predictedPriceMin > 0
                                    ? `₹${bp.predictedPriceMin}–${bp.predictedPriceMax}`
                                    : "—"}
                                </p>
                                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                                  {t("buyer.byProduct")}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* -------- Buyer Demands -------- */}
      {!loading && (
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-accent" />
            {t("marketplace.openBuyerDemands")}
          </h2>
          {demands.length === 0 ? (
            <div className="summary-card text-center py-12">
              <ShoppingCart className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">{t("marketplace.noOpenDemands")}</p>
              <p className="text-xs text-muted-foreground mt-1">{t("marketplace.buyerDemandsAppear")}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {demands.map((d) => (
                <div key={d.id} className="summary-card flex flex-col gap-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold">
                        {demandItemLabel(d.itemType, d.itemName, d.cropName)}
                      </h3>
                      {d.itemType === "byproduct" && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {t("marketplace.byProductOf")} {capitalize(d.cropName)}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDate(d.requiredFromDate)} – {formatDate(d.requiredToDate)}
                      </p>
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-status-success/10 text-status-success">
                      {t("common.open")}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-secondary rounded-lg p-2.5">
                      <IndianRupee className="w-3.5 h-3.5 mx-auto text-muted-foreground mb-1" />
                      <p className="text-xs font-semibold">{formatCurrency(d.offeredPrice)}</p>
                      <p className="text-[10px] text-muted-foreground">{t("common.perKg")}</p>
                    </div>
                    <div className="bg-secondary rounded-lg p-2.5">
                      <Package className="w-3.5 h-3.5 mx-auto text-muted-foreground mb-1" />
                      <p className="text-xs font-semibold">{d.requiredQuantity} kg</p>
                      <p className="text-[10px] text-muted-foreground">{t("common.required")}</p>
                    </div>
                    <div className="bg-secondary rounded-lg p-2.5">
                      <MapPin className="w-3.5 h-3.5 mx-auto text-muted-foreground mb-1" />
                      <p className="text-xs font-semibold">{d.location || "—"}</p>
                      <p className="text-[10px] text-muted-foreground">{t("common.location")}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Marketplace;
