// Prediction service — connects to FastAPI backend
import { auth } from "@/firebase";
import { db } from "@/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

const API_BASE = import.meta.env.VITE_API_URL;

export interface PredictionRequest {
    location: string;
    soilType: string;
    waterSources: string[];
    cultivationStartDate: string;
    landArea: number;
    crops: string[];
    enabledByproducts?: Record<string, string[]>; // { "coconut": ["Coconut Husk", "Coconut Shell"] }
}

export interface CropPrediction {
    cropName: string;
    error?: string;
    harvest?: {
        baseHarvestDate: string;
        harvestWindowStart: string;
        harvestWindowEnd: string;
        growthDaysAvg: number;
        growthDaysMin: number;
        growthDaysMax: number;
        optimalTempMin: number;
        optimalTempMax: number;
    };
    weather?: {
        adjustedHarvestDate: string;
        recommendedHarvestStart: string;
        recommendedHarvestEnd: string;
        adjustmentDays: number;
        riskLevel: string;
        confidence: number;
        factors: string[];
        weather: {
            avgTemperature: number;
            rainfallMm: number;
        };
    };
    profit?: {
        estimatedYield: number;
        unit: string;
        pricePerQuintalMin: number;
        pricePerQuintalMax: number;
        expectedProfitMin: number;
        expectedProfitMax: number;
        priceSource: string;
    };
    byproducts?: {
        name: string;
        estimatedYield: number;
        unit: string;
        pricePerQuintalMin: number;
        pricePerQuintalMax: number;
        expectedProfitMin: number;
        expectedProfitMax: number;
        priceSource: string;
    }[];
}

/**
 * Call backend to get predictions for selected crops.
 */
export async function predictCropOptions(
    data: PredictionRequest
): Promise<CropPrediction[]> {
    const response = await fetch(`${API_BASE}/predict-crop-options`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || `HTTP ${response.status}`);
    }

    const result = await response.json();
    return result.predictions;
}

/**
 * Finalize a crop plan: validate via backend, then save to Firestore.
 */
export async function finalizeCrop(
    prediction: CropPrediction,
    planningData: PredictionRequest
): Promise<string> {
    const user = auth.currentUser;
    if (!user) throw new Error("Not authenticated");

    // Build by-products payload for finalization
    const byproductsPayload = (prediction.byproducts || []).map(bp => ({
        name: bp.name,
        totalQuantity: bp.estimatedYield,
        predictedPriceMin: bp.pricePerQuintalMin,
        predictedPriceMax: bp.pricePerQuintalMax,
    }));

    // 1. Validate via backend
    const payload = {
        farmerId: user.uid,
        cropName: prediction.cropName,
        location: planningData.location,
        soilType: planningData.soilType,
        waterSources: planningData.waterSources,
        cultivationStartDate: planningData.cultivationStartDate,
        landArea: planningData.landArea,
        baseHarvestDate: prediction.harvest?.baseHarvestDate || "",
        adjustedHarvestDate: prediction.weather?.adjustedHarvestDate || "",
        harvestWindowStart: prediction.harvest?.harvestWindowStart || "",
        harvestWindowEnd: prediction.harvest?.harvestWindowEnd || "",
        riskLevel: prediction.weather?.riskLevel || "unknown",
        confidence: prediction.weather?.confidence || 0,
        estimatedYield: prediction.profit?.estimatedYield || 0,
        expectedProfitMin: prediction.profit?.expectedProfitMin || 0,
        expectedProfitMax: prediction.profit?.expectedProfitMax || 0,
        byproducts: byproductsPayload.length > 0 ? byproductsPayload : undefined,
    };

    const response = await fetch(`${API_BASE}/finalize-crop`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || `Finalization failed`);
    }

    const result = await response.json();
    const cropPlan = result.cropPlan;

    // If the backend already saved to Firestore (returns cropDocId), use that ID.
    // This avoids duplicate crop documents. Falls back to client-side write
    // if the backend is unavailable or didn't save (cropDocId === null).
    if (result.cropDocId) {
        console.log("[PredictionService] Crop saved by backend, doc ID:", result.cropDocId);
        return result.cropDocId as string;
    }

    // Fallback: backend didn't save (e.g. Firestore unavailable server-side)
    // → save from client as before
    console.log("[PredictionService] Backend did not save crop — writing from client");
    const firestoreData: Record<string, any> = {
        farmerId: user.uid,
        cropName: cropPlan.cropName || prediction.cropName,
        location: cropPlan.location || planningData.location,
        soilType: cropPlan.soilType || planningData.soilType,
        waterSources: cropPlan.waterSources || planningData.waterSources,
        cultivationStartDate: cropPlan.cultivationStartDate || planningData.cultivationStartDate,
        landArea: cropPlan.landArea || planningData.landArea,
        baseHarvestDate: cropPlan.baseHarvestDate || prediction.harvest?.baseHarvestDate || "",
        adjustedHarvestDate: cropPlan.adjustedHarvestDate || prediction.weather?.adjustedHarvestDate || "",
        recommendedHarvestStart: prediction.weather?.recommendedHarvestStart || cropPlan.harvestWindowStart || "",
        recommendedHarvestEnd: prediction.weather?.recommendedHarvestEnd || cropPlan.harvestWindowEnd || "",
        riskLevel: cropPlan.riskLevel || prediction.weather?.riskLevel || "unknown",
        confidence: cropPlan.confidence || prediction.weather?.confidence || 0,
        estimatedYield: cropPlan.estimatedYield || prediction.profit?.estimatedYield || 0,
        expectedProfitMin: cropPlan.expectedProfitMin || prediction.profit?.expectedProfitMin || 0,
        expectedProfitMax: cropPlan.expectedProfitMax || prediction.profit?.expectedProfitMax || 0,
        byproducts: cropPlan.byproducts || [],
        status: "active",
        createdAt: serverTimestamp(),
    };
    const docRef = await addDoc(collection(db, "crops"), firestoreData);

    return docRef.id;
}

