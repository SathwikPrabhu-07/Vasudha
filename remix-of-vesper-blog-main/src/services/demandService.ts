// Demand service — buyer demand posting and matching
// Uses client-side Firestore (same pattern as crop finalization)
import {
    collection,
    addDoc,
    getDocs,
    query,
    where,
    serverTimestamp,
} from "firebase/firestore";
import { db, auth } from "@/firebase";


// -------- Types --------

/** A single selectable item within a crop group (primary or byproduct) */
export interface CropOptionItem {
    itemType: "primary" | "byproduct";
    itemName: string;
    availableQuantity: number;
}

/** A crop group returned by GET /marketplace/crop-options */
export interface CropOption {
    cropId: string;
    cropName: string;
    items: CropOptionItem[];
}

export interface DemandPayload {
    cropId: string;
    itemType: "primary" | "byproduct";
    itemName: string;
    cropName: string;          // lowercase crop name for legacy compat
    requiredQuantity: number;
    requiredFromDate: string;
    requiredToDate: string;
    location: string;
    offeredPrice: number;
}

export interface DemandDocument {
    id: string;
    buyerId: string;
    cropId: string;
    itemType: "primary" | "byproduct";
    itemName: string;
    cropName: string;
    requiredQuantity: number;
    requiredFromDate: string;
    requiredToDate: string;
    location: string;
    offeredPrice: number;
    status: string;
    createdAt: Date | null;
}

export interface MatchedCrop {
    cropId: string;
    cropName: string;
    itemType: "primary" | "byproduct";
    itemName: string;
    availableQuantity: number;
    farmerId: string;
    location: string;
    harvestWindow: string;
    recommendedHarvestStart: string;
    recommendedHarvestEnd: string;
    expectedProfitMin: number;
    expectedProfitMax: number;
    estimatedYield: number;
    confidence: number;
    riskLevel: string;
    landArea: number;
}

export interface DemandMatch {
    demandId: string;
    cropName: string;
    itemType: "primary" | "byproduct";
    itemName: string;
    requiredQuantity: number;
    requiredFromDate: string;
    requiredToDate: string;
    offeredPrice: number;
    matchedCrops: MatchedCrop[];
    matchCount: number;
}

export interface FarmerDemandMatch {
    cropId: string;
    cropName: string;
    harvestWindow: string;
    matchedDemands: {
        demandId: string;
        buyerId: string;
        itemType: "primary" | "byproduct";
        itemName: string;
        requiredQuantity: number;
        requiredFromDate: string;
        requiredToDate: string;
        offeredPrice: number;
        location: string;
    }[];
    matchCount: number;
}

// -------- Crop Options --------

/**
 * Fetch available crop options for demand form dropdown.
 * Reads directly from Firestore (same pattern as getBuyerMatches).
 * Returns grouped list: [{ cropId, cropName, items: [{ itemType, itemName, availableQuantity }] }]
 */
export async function getCropOptions(): Promise<CropOption[]> {
    try {
        const snap = await getDocs(collection(db, "crops"));
        const options: CropOption[] = [];

        snap.docs.forEach((doc) => {
            const c = doc.data() as any;
            const status = c.status || "active";
            // Only include crops available in the marketplace
            if (status !== "active" && status !== "partially_committed") return;

            const cropId = doc.id;
            const cropName: string = c.cropName || "";

            const estimatedYield: number = Number(c.estimatedYield) || 0;
            const committedQty: number = Number(c.committedQuantity) || 0;
            const primaryAvail = Math.max(0, estimatedYield - committedQty);

            const items: CropOptionItem[] = [];

            // Always include the primary crop
            items.push({
                itemType: "primary",
                itemName: cropName,
                availableQuantity: primaryAvail,
            });

            // Include byproducts with available quantity > 0
            const byproducts: any[] = c.byproducts || [];
            for (const bp of byproducts) {
                const avail = Number(bp.availableQuantity ?? bp.totalQuantity ?? 0);
                const committed = Number(bp.committedQuantity || 0);
                const netAvail = Math.max(0, avail - committed);
                if (netAvail > 0) {
                    items.push({
                        itemType: "byproduct",
                        itemName: bp.name || "",
                        availableQuantity: netAvail,
                    });
                }
            }

            options.push({ cropId, cropName, items });
        });

        console.log("[DemandService] getCropOptions:", options.length, "groups");
        return options;
    } catch (err) {
        console.error("[DemandService] getCropOptions failed:", err);
        return [];
    }
}

// -------- Demand CRUD --------

/**
 * Post a new demand — saves directly to Firestore "demands" collection.
 */
export async function postDemand(data: DemandPayload): Promise<string> {
    let uid = auth.currentUser?.uid;
    if (!uid) {
        try { const s = sessionStorage.getItem("vasudha_user"); if (s) uid = JSON.parse(s).id; } catch { }
    }
    if (!uid) throw new Error("Not authenticated");

    const docRef = await addDoc(collection(db, "demands"), {
        buyerId: uid,
        // Structured fields
        cropId: data.cropId,
        itemType: data.itemType,
        itemName: data.itemName,
        // Legacy field (lowercase crop name for backward compat with old matching)
        cropName: data.cropName.toLowerCase(),
        // Demand details
        requiredQuantity: data.requiredQuantity,
        requiredFromDate: data.requiredFromDate,
        requiredToDate: data.requiredToDate,
        location: data.location,
        offeredPrice: data.offeredPrice,
        status: "open",
        createdAt: serverTimestamp(),
    });

    console.log("[DemandService] Demand saved with ID:", docRef.id);
    return docRef.id;
}

// -------- Matching Engine (client-side) --------

/**
 * For a buyer: get their open demands and match against all active crops.
 * Matches on cropId (exact) + itemType/itemName, falling back to cropName.
 */
export async function getBuyerMatches(): Promise<DemandMatch[]> {
    let uid = auth.currentUser?.uid;
    if (!uid) {
        try { const s = sessionStorage.getItem("vasudha_user"); if (s) uid = JSON.parse(s).id; } catch { }
    }
    if (!uid) return [];

    try {
        // 1. Get buyer's open demands
        const demandQ = query(
            collection(db, "demands"),
            where("buyerId", "==", uid),
            where("status", "==", "open")
        );
        const demandSnap = await getDocs(demandQ);
        const demands = demandSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        console.log("[DemandService] Buyer demands:", demands.length);

        if (demands.length === 0) return [];

        // 2. Get all available crops
        const cropSnap = await getDocs(collection(db, "crops"));
        const allCrops = cropSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
            .filter((c: any) => !c.status || c.status === "active" || c.status === "partially_committed");
        console.log("[DemandService] Active crops:", allCrops.length);

        // 3. Match each demand against crops
        const results: DemandMatch[] = [];
        for (const demand of demands) {
            const d = demand as any;
            const demandCropId = d.cropId || "";
            const demandCropName = (d.cropName || "").toLowerCase().trim();
            const demandItemType: "primary" | "byproduct" = d.itemType || "primary";
            const demandItemName: string = d.itemName || d.cropName || "";
            const demandFrom = d.requiredFromDate || "";
            const demandTo = d.requiredToDate || "";

            const matched: MatchedCrop[] = [];
            for (const crop of allCrops) {
                const c = crop as any;
                const cropId = c.id || "";
                const cropName = (c.cropName || "").toLowerCase().trim();
                const harvestStart = c.recommendedHarvestStart || c.adjustedHarvestDate || "";
                const harvestEnd = c.recommendedHarvestEnd || harvestStart;

                // Rule 1: identify crop
                if (demandCropId) {
                    if (cropId !== demandCropId) continue;
                } else {
                    if (cropName !== demandCropName) continue;
                }

                // Rule 2: item type matching
                if (demandItemType === "byproduct") {
                    const byproducts: any[] = c.byproducts || [];
                    const bp = byproducts.find((b: any) => b.name === demandItemName);
                    if (!bp) continue;
                    const bpAvail = (bp.availableQuantity ?? bp.totalQuantity ?? 0) - (bp.committedQuantity || 0);
                    if (bpAvail <= 0) continue;
                }

                // Rule 3: harvest window overlap
                const bothHaveDates = harvestStart && harvestEnd && demandFrom && demandTo;
                if (bothHaveDates && (harvestStart > demandTo || harvestEnd < demandFrom)) continue;

                // Compute available quantity for this item
                let availableQty = 0;
                if (demandItemType === "byproduct") {
                    const bp = (c.byproducts || []).find((b: any) => b.name === demandItemName);
                    if (bp) {
                        availableQty = Math.max(0, (bp.availableQuantity ?? bp.totalQuantity ?? 0) - (bp.committedQuantity || 0));
                    }
                } else {
                    availableQty = Math.max(0, (c.estimatedYield || 0) - (c.committedQuantity || 0));
                }

                matched.push({
                    cropId,
                    cropName: c.cropName || "",
                    itemType: demandItemType,
                    itemName: demandItemName,
                    availableQuantity: availableQty,
                    farmerId: c.farmerId || "",
                    location: c.location || "",
                    harvestWindow: `${harvestStart} to ${harvestEnd}`,
                    recommendedHarvestStart: harvestStart,
                    recommendedHarvestEnd: harvestEnd,
                    expectedProfitMin: c.expectedProfitMin || 0,
                    expectedProfitMax: c.expectedProfitMax || 0,
                    estimatedYield: c.estimatedYield || 0,
                    confidence: c.confidence || 0,
                    riskLevel: c.riskLevel || "unknown",
                    landArea: c.landArea || 0,
                });
            }

            results.push({
                demandId: d.id,
                cropName: d.cropName || "",
                itemType: demandItemType,
                itemName: demandItemName,
                requiredQuantity: d.requiredQuantity || 0,
                requiredFromDate: demandFrom,
                requiredToDate: demandTo,
                offeredPrice: d.offeredPrice || 0,
                matchedCrops: matched,
                matchCount: matched.length,
            });
        }

        console.log("[DemandService] Buyer match results:", results.length);
        return results;

    } catch (err) {
        console.error("[DemandService] getBuyerMatches failed:", err);
        return [];
    }
}

/**
 * For a farmer: get their active crops and match against all open demands.
 */
export async function getFarmerMatches(): Promise<FarmerDemandMatch[]> {
    let uid = auth.currentUser?.uid;
    if (!uid) {
        try { const s = sessionStorage.getItem("vasudha_user"); if (s) uid = JSON.parse(s).id; } catch { }
    }
    if (!uid) return [];

    try {
        // 1. Get farmer's crops
        const cropQ = query(
            collection(db, "crops"),
            where("farmerId", "==", uid)
        );
        const cropSnap = await getDocs(cropQ);
        const crops = cropSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
            .filter((c: any) => !c.status || c.status === "active" || c.status === "partially_committed");
        console.log("[DemandService] Farmer crops:", crops.length);

        if (crops.length === 0) return [];

        // 2. Get all open demands
        const demandQ = query(
            collection(db, "demands"),
            where("status", "==", "open")
        );
        const demandSnap = await getDocs(demandQ);
        const allDemands = demandSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        console.log("[DemandService] Open demands:", allDemands.length);

        // 3. Match each crop against demands
        const results: FarmerDemandMatch[] = [];
        for (const crop of crops) {
            const c = crop as any;
            const cropId = c.id || "";
            const cropName = (c.cropName || "").toLowerCase().trim();
            const harvestStart = c.recommendedHarvestStart || c.adjustedHarvestDate || "";
            const harvestEnd = c.recommendedHarvestEnd || harvestStart;

            const matched: FarmerDemandMatch["matchedDemands"] = [];
            for (const demand of allDemands) {
                const d = demand as any;
                const demandCropId = d.cropId || "";
                const demandCropName = (d.cropName || "").toLowerCase().trim();
                const demandItemType: "primary" | "byproduct" = d.itemType || "primary";
                const demandItemName: string = d.itemName || d.cropName || "";
                const demandFrom = d.requiredFromDate || "";
                const demandTo = d.requiredToDate || "";

                // Rule 1: identify crop
                if (demandCropId) {
                    if (cropId !== demandCropId) continue;
                } else {
                    if (demandCropName !== cropName) continue;
                }

                // Rule 2: item type matching for byproducts
                if (demandItemType === "byproduct") {
                    const byproducts: any[] = c.byproducts || [];
                    const bp = byproducts.find((b: any) => b.name === demandItemName);
                    if (!bp) continue;
                }

                // Rule 3: harvest window overlap
                const bothHaveDates = harvestStart && harvestEnd && demandFrom && demandTo;
                if (bothHaveDates && (harvestStart > demandTo || harvestEnd < demandFrom)) continue;

                matched.push({
                    demandId: d.id,
                    buyerId: d.buyerId || "",
                    itemType: demandItemType,
                    itemName: demandItemName,
                    requiredQuantity: d.requiredQuantity || 0,
                    requiredFromDate: demandFrom,
                    requiredToDate: demandTo,
                    offeredPrice: d.offeredPrice || 0,
                    location: d.location || "",
                });
            }

            if (matched.length > 0) {
                results.push({
                    cropId,
                    cropName: c.cropName || "",
                    harvestWindow: `${harvestStart} to ${harvestEnd}`,
                    matchedDemands: matched,
                    matchCount: matched.length,
                });
            }
        }

        console.log("[DemandService] Farmer match results:", results.length);
        return results;

    } catch (err) {
        console.error("[DemandService] getFarmerMatches failed:", err);
        return [];
    }
}
