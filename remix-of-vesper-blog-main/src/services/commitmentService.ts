// Commitment service — buyer→farmer commitment workflow
// Uses client-side Firestore (same pattern as demands)
import {
    collection,
    doc,
    addDoc,
    getDoc,
    getDocs,
    updateDoc,
    query,
    where,
    serverTimestamp,
    increment,
} from "firebase/firestore";
import { db, auth } from "@/firebase";
import { createShipmentFromCommitment } from "@/services/shipmentService";

// -------- Types --------

export type CommitmentStatus = "pending" | "accepted" | "rejected" | "completed";

export interface CommitmentDocument {
    id: string;
    cropId: string;
    cropName: string;
    itemType: "primary" | "byproduct";
    itemName: string;
    farmerId: string;
    buyerId: string;
    agreedPrice: number;
    quantity: number;
    status: CommitmentStatus;
    createdAt: Date | null;
    updatedAt: Date | null;
}

export interface CreateCommitmentPayload {
    cropId: string;
    agreedPrice: number;
    quantity: number;
    itemType?: "primary" | "byproduct";
    itemName?: string;
}

// Valid status transitions
const VALID_TRANSITIONS: Record<string, string[]> = {
    pending: ["accepted", "rejected"],
    accepted: ["completed"],
    rejected: [],
    completed: [],
};

// -------- Helpers --------

function getUid(): string | null {
    let uid = auth.currentUser?.uid;
    if (!uid) {
        try {
            const s = sessionStorage.getItem("vasudha_user");
            if (s) uid = JSON.parse(s).id;
        } catch { /* ignore */ }
    }
    return uid || null;
}

// -------- Create Commitment --------

/**
 * Create a commitment from buyer to farmer.
 * Validates: crop exists, is active, quantity available.
 */
export async function createCommitment(payload: CreateCommitmentPayload): Promise<string> {
    const buyerId = getUid();
    if (!buyerId) throw new Error("Not authenticated");

    // 1. Validate crop exists and is active
    const cropRef = doc(db, "crops", payload.cropId);
    const cropSnap = await getDoc(cropRef);

    if (!cropSnap.exists()) {
        throw new Error("Crop not found");
    }

    const crop = cropSnap.data();

    if (crop.status !== "active" && crop.status !== "partially_committed") {
        throw new Error("Crop is not available for commitment");
    }

    const itemType = payload.itemType || "primary";
    const itemName = payload.itemName || "";

    // 2. Validate quantity based on item type
    if (itemType === "byproduct") {
        const byproducts: any[] = crop.byproducts || [];
        const bpMatch = byproducts.find((bp: any) => bp.name === itemName);
        if (!bpMatch) {
            throw new Error(`By-product '${itemName}' not found for this crop`);
        }
        const bpAvailable = (bpMatch.availableQuantity ?? bpMatch.totalQuantity ?? 0) - (bpMatch.committedQuantity || 0);
        if (payload.quantity <= 0) throw new Error("Quantity must be greater than 0");
        if (payload.quantity > bpAvailable) {
            throw new Error(`Only ${bpAvailable}q of '${itemName}' available`);
        }
    } else {
        // Primary crop
        const estimatedYield = crop.estimatedYield || 0;
        const committedQty = crop.committedQuantity || 0;
        const availableQty = estimatedYield - committedQty;

        if (payload.quantity <= 0) {
            throw new Error("Quantity must be greater than 0");
        }

        if (payload.quantity > availableQty) {
            throw new Error(`Only ${availableQty}q available (${committedQty}q already committed)`);
        }
    }

    // 3. Create commitment document
    const commitmentData = {
        cropId: payload.cropId,
        cropName: crop.cropName || "",
        itemType: itemType,
        itemName: itemType === "byproduct" ? itemName : (crop.cropName || ""),
        farmerId: crop.farmerId || "",
        buyerId: buyerId,
        agreedPrice: payload.agreedPrice,
        quantity: payload.quantity,
        status: "pending" as CommitmentStatus,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, "commitments"), commitmentData);
    console.log("[CommitmentService] Created commitment:", docRef.id);
    return docRef.id;
}

// -------- Update Status --------

/**
 * Update commitment status with controlled transitions.
 * On accept → updates crop's committedQuantity.
 */
export async function updateCommitmentStatus(
    commitmentId: string,
    newStatus: CommitmentStatus
): Promise<void> {
    const uid = getUid();
    if (!uid) throw new Error("Not authenticated");

    // 1. Get current commitment
    const commitRef = doc(db, "commitments", commitmentId);
    const commitSnap = await getDoc(commitRef);

    if (!commitSnap.exists()) {
        throw new Error("Commitment not found");
    }

    const commitment = commitSnap.data();
    const currentStatus = commitment.status as CommitmentStatus;

    // 2. Validate transition
    const allowed = VALID_TRANSITIONS[currentStatus] || [];
    if (!allowed.includes(newStatus)) {
        throw new Error(`Cannot transition from "${currentStatus}" to "${newStatus}"`);
    }

    // 3. Validate permissions
    if ((newStatus === "accepted" || newStatus === "rejected") && uid !== commitment.farmerId) {
        throw new Error("Only the farmer can accept or reject commitments");
    }

    // 4. Update commitment
    await updateDoc(commitRef, {
        status: newStatus,
        updatedAt: serverTimestamp(),
    });

    // 5. If accepted → update crop's committed quantity
    if (newStatus === "accepted") {
        const cropRef = doc(db, "crops", commitment.cropId);
        const cropSnap = await getDoc(cropRef);

        if (cropSnap.exists()) {
            const crop = cropSnap.data();
            const newCommitted = (crop.committedQuantity || 0) + (commitment.quantity || 0);
            const estimatedYield = crop.estimatedYield || 0;

            const cropUpdate: Record<string, any> = {
                committedQuantity: increment(commitment.quantity || 0),
                updatedAt: serverTimestamp(),
            };

            // If fully committed, update status
            if (newCommitted >= estimatedYield) {
                cropUpdate.status = "fully_committed";
            } else if (newCommitted > 0) {
                cropUpdate.status = "partially_committed";
            }

            await updateDoc(cropRef, cropUpdate);
            console.log("[CommitmentService] Updated crop committed quantity:", newCommitted);
        }

        // 6. Auto-create shipment
        try {
            const shipmentId = await createShipmentFromCommitment({
                id: commitmentId,
                cropId: commitment.cropId,
                cropName: commitment.cropName || "",
                farmerId: commitment.farmerId,
                buyerId: commitment.buyerId,
                quantity: commitment.quantity || 0,
            });
            console.log("[CommitmentService] Auto-created shipment:", shipmentId);
        } catch (shipErr) {
            console.error("[CommitmentService] Shipment auto-creation failed (non-blocking):", shipErr);
        }
    }

    console.log("[CommitmentService] Updated commitment", commitmentId, "→", newStatus);
}

// -------- Query Commitments --------

/**
 * Get all commitments for a buyer.
 */
export async function getCommitmentsForBuyer(): Promise<CommitmentDocument[]> {
    const uid = getUid();
    if (!uid) return [];

    try {
        const q = query(
            collection(db, "commitments"),
            where("buyerId", "==", uid)
        );
        const snap = await getDocs(q);
        return snap.docs.map((d) => {
            const data = d.data();
            return {
                id: d.id,
                cropId: data.cropId || "",
                cropName: data.cropName || "",
                itemType: data.itemType || "primary",
                itemName: data.itemName || data.cropName || "",
                farmerId: data.farmerId || "",
                buyerId: data.buyerId || "",
                agreedPrice: data.agreedPrice || 0,
                quantity: data.quantity || 0,
                status: (data.status || "pending") as CommitmentStatus,
                createdAt: data.createdAt?.toDate?.() || null,
                updatedAt: data.updatedAt?.toDate?.() || null,
            };
        });
    } catch (err) {
        console.error("[CommitmentService] getCommitmentsForBuyer failed:", err);
        return [];
    }
}

/**
 * Get all commitments for a farmer.
 */
export async function getCommitmentsForFarmer(): Promise<CommitmentDocument[]> {
    const uid = getUid();
    if (!uid) return [];

    try {
        const q = query(
            collection(db, "commitments"),
            where("farmerId", "==", uid)
        );
        const snap = await getDocs(q);
        return snap.docs.map((d) => {
            const data = d.data();
            return {
                id: d.id,
                cropId: data.cropId || "",
                cropName: data.cropName || "",
                itemType: data.itemType || "primary",
                itemName: data.itemName || data.cropName || "",
                farmerId: data.farmerId || "",
                buyerId: data.buyerId || "",
                agreedPrice: data.agreedPrice || 0,
                quantity: data.quantity || 0,
                status: (data.status || "pending") as CommitmentStatus,
                createdAt: data.createdAt?.toDate?.() || null,
                updatedAt: data.updatedAt?.toDate?.() || null,
            };
        });
    } catch (err) {
        console.error("[CommitmentService] getCommitmentsForFarmer failed:", err);
        return [];
    }
}
