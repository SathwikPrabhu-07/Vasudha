// Crop service for Vasudha — Firestore integration
// Reads finalized crops (from Crop Planning → Predict → Finalize flow)
import {
    collection,
    getDocs,
    query,
    where,
    Timestamp,
} from "firebase/firestore";
import { db, auth } from "@/firebase";

export interface ByproductEntry {
    name: string;
    totalQuantity: number;
    availableQuantity: number;
    committedQuantity: number;
    predictedPriceMin: number;
    predictedPriceMax: number;
}

export interface CropDocument {
    id: string;
    farmerId: string;
    cropName: string;
    location: string;
    landArea: number;
    cultivationStartDate: string;
    baseHarvestDate: string;
    adjustedHarvestDate: string;
    recommendedHarvestStart: string;
    recommendedHarvestEnd: string;
    riskLevel: string;
    confidence: number;
    estimatedYield: number;
    expectedProfitMin: number;
    expectedProfitMax: number;
    byproducts: ByproductEntry[];
    status: "active" | "harvested" | "cancelled";
    createdAt: Date | null;
}

/**
 * Get all crops for the current farmer from Firestore.
 * Fetches by farmerId, then filters status=active client-side
 * to avoid needing a Firestore composite index.
 */
export async function getMyCrops(): Promise<CropDocument[]> {
    // Get UID from Firebase Auth or sessionStorage fallback
    let uid = auth.currentUser?.uid;
    if (!uid) {
        try {
            const stored = sessionStorage.getItem("vasudha_user");
            if (stored) uid = JSON.parse(stored).id;
        } catch { /* ignore */ }
    }
    if (!uid) {
        console.warn("[CropService] No authenticated user — returning empty");
        return [];
    }

    console.log("[CropService] Fetching crops for farmerId:", uid);

    try {
        // Simple query: only filter by farmerId (single where = no composite index needed)
        const q = query(
            collection(db, "crops"),
            where("farmerId", "==", uid)
        );

        const snapshot = await getDocs(q);
        console.log("[CropService] Raw docs from Firestore:", snapshot.size);

        const allCrops = snapshot.docs.map((doc) => {
            const d = doc.data();
            return {
                id: doc.id,
                farmerId: d.farmerId || "",
                cropName: d.cropName || "",
                location: d.location || "",
                landArea: d.landArea || 0,
                cultivationStartDate: d.cultivationStartDate || "",
                baseHarvestDate: d.baseHarvestDate || "",
                adjustedHarvestDate: d.adjustedHarvestDate || "",
                recommendedHarvestStart: d.recommendedHarvestStart || "",
                recommendedHarvestEnd: d.recommendedHarvestEnd || "",
                riskLevel: d.riskLevel || "unknown",
                confidence: d.confidence || 0,
                estimatedYield: d.estimatedYield || 0,
                expectedProfitMin: d.expectedProfitMin || 0,
                expectedProfitMax: d.expectedProfitMax || 0,
                byproducts: (d.byproducts || []).map((bp: any) => ({
                    name: bp.name || "",
                    totalQuantity: bp.totalQuantity || 0,
                    availableQuantity: bp.availableQuantity ?? bp.totalQuantity ?? 0,
                    committedQuantity: bp.committedQuantity || 0,
                    predictedPriceMin: bp.predictedPriceMin || 0,
                    predictedPriceMax: bp.predictedPriceMax || 0,
                })),
                status: d.status || "active",
                createdAt: d.createdAt instanceof Timestamp ? d.createdAt.toDate() : null,
            } as CropDocument;
        });

        // Client-side: filter active only, sort by createdAt descending
        const activeCrops = allCrops
            .filter((c) => c.status === "active")
            .sort((a, b) => {
                const ta = a.createdAt?.getTime() || 0;
                const tb = b.createdAt?.getTime() || 0;
                return tb - ta;
            });

        console.log("[CropService] Active crops after filter:", activeCrops.length);
        return activeCrops;

    } catch (err) {
        console.error("[CropService] Firestore query failed:", err);
        return [];
    }
}
