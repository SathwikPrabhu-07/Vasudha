// Shipment service — 3-way logistics workflow
// Status: awaiting_logistics → logistics_proposed → approved → in_transit → delivered
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
} from "firebase/firestore";
import { db, auth } from "@/firebase";

// -------- Types --------

export type ShipmentStatus =
    | "awaiting_logistics"
    | "logistics_proposed"
    | "approved"
    | "in_transit"
    | "delivered";

export interface ShipmentDocument {
    id: string;
    commitmentId: string;
    cropId: string;
    cropName: string;
    itemType: "primary" | "byproduct";
    itemName: string;
    farmerId: string;
    buyerId: string;
    pickupLocation: string;
    deliveryLocation: string;
    quantity: number;
    logisticsProviderId: string | null;
    status: ShipmentStatus;
    // Route planning fields
    proposedRoute: string;
    estimatedCost: number | null;
    distanceKm: number | null;
    estimatedDuration: string;
    pickupCoordinates?: { lat: number; lng: number } | null;
    deliveryCoordinates?: { lat: number; lng: number } | null;
    routePolyline?: { lat: number; lng: number }[] | null;
    createdAt: Date | null;
    updatedAt: Date | null;
}

// Valid status transitions (logistics-controlled)
const VALID_TRANSITIONS: Record<string, string[]> = {
    awaiting_logistics: ["logistics_proposed"],
    logistics_proposed: ["approved", "awaiting_logistics"], // buyer approve/reject
    approved: ["in_transit"],
    in_transit: ["delivered"],
    delivered: [],
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

function mapDoc(d: any): ShipmentDocument {
    const data = d.data ? d.data() : d;
    return {
        id: d.id || "",
        commitmentId: data.commitmentId || "",
        cropId: data.cropId || "",
        cropName: data.cropName || "",
        itemType: data.itemType || "primary",
        itemName: data.itemName || data.cropName || "",
        farmerId: data.farmerId || "",
        buyerId: data.buyerId || "",
        pickupLocation: data.pickupLocation || "",
        deliveryLocation: data.deliveryLocation || "",
        quantity: data.quantity || 0,
        logisticsProviderId: data.logisticsProviderId || null,
        status: (data.status || "awaiting_logistics") as ShipmentStatus,
        proposedRoute: data.proposedRoute || "",
        estimatedCost: data.estimatedCost ?? null,
        distanceKm: data.distanceKm ?? null,
        estimatedDuration: data.estimatedDuration || "",
        pickupCoordinates: data.pickupCoordinates ?? null,
        deliveryCoordinates: data.deliveryCoordinates ?? null,
        routePolyline: data.routePolyline ?? null,
        createdAt: data.createdAt?.toDate?.() || null,
        updatedAt: data.updatedAt?.toDate?.() || null,
    };
}

// -------- Create Shipment (auto on commitment accept) --------

export async function createShipmentFromCommitment(commitment: {
    id: string;
    cropId: string;
    cropName: string;
    itemType?: "primary" | "byproduct";
    itemName?: string;
    farmerId: string;
    buyerId: string;
    quantity: number;
}): Promise<string> {
    try {
        // Guard: prevent duplicate
        const existingQ = query(
            collection(db, "shipments"),
            where("commitmentId", "==", commitment.id)
        );
        const existingSnap = await getDocs(existingQ);
        if (!existingSnap.empty) {
            console.log("[ShipmentService] Shipment already exists for commitment:", commitment.id);
            return existingSnap.docs[0].id;
        }

        // Read crop for pickup location
        let pickupLocation = "";
        try {
            const cropSnap = await getDoc(doc(db, "crops", commitment.cropId));
            if (cropSnap.exists()) {
                pickupLocation = cropSnap.data().location || "";
            }
        } catch (err) {
            console.warn("[ShipmentService] Could not read crop location:", err);
        }

        // Try to find delivery location from buyer's demand
        let deliveryLocation = "";
        try {
            const demandQ = query(
                collection(db, "demands"),
                where("buyerId", "==", commitment.buyerId),
                where("cropName", "==", commitment.cropName.toLowerCase())
            );
            const demandSnap = await getDocs(demandQ);
            if (!demandSnap.empty) {
                deliveryLocation = demandSnap.docs[0].data().location || "";
            }
        } catch (err) {
            console.warn("[ShipmentService] Could not read demand location:", err);
        }

        const shipmentData = {
            commitmentId: commitment.id,
            cropId: commitment.cropId,
            cropName: commitment.cropName,
            itemType: commitment.itemType || "primary",
            itemName: commitment.itemName || commitment.cropName,
            farmerId: commitment.farmerId,
            buyerId: commitment.buyerId,
            pickupLocation,
            deliveryLocation,
            quantity: commitment.quantity,
            logisticsProviderId: null,
            status: "awaiting_logistics" as ShipmentStatus,
            proposedRoute: "",
            estimatedCost: null,
            distanceKm: null,
            estimatedDuration: "",
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        };

        const docRef = await addDoc(collection(db, "shipments"), shipmentData);
        console.log("[ShipmentService] Created shipment:", docRef.id);
        return docRef.id;
    } catch (err) {
        console.error("[ShipmentService] createShipmentFromCommitment failed:", err);
        throw err;
    }
}

// -------- Logistics Propose (awaiting_logistics → logistics_proposed) --------

export async function proposeShipment(
    shipmentId: string,
    proposedRoute: string,
    estimatedCost: number
): Promise<void> {
    const uid = getUid();
    if (!uid) throw new Error("Not authenticated");

    try {
        const shipRef = doc(db, "shipments", shipmentId);
        const shipSnap = await getDoc(shipRef);

        if (!shipSnap.exists()) throw new Error("Shipment not found");

        const shipment = shipSnap.data();
        if (shipment.status !== "awaiting_logistics") {
            throw new Error("Shipment is not awaiting logistics");
        }
        if (shipment.logisticsProviderId && shipment.logisticsProviderId !== uid) {
            throw new Error("Another logistics provider already proposed");
        }

        // Mock route data (would use Google Maps API if key available)
        const distanceKm = Math.round(Math.random() * 300 + 50);
        const hours = Math.round(distanceKm / 45);
        const estimatedDuration = `${hours}h ${Math.round(Math.random() * 59)}m`;

        await updateDoc(shipRef, {
            logisticsProviderId: uid,
            status: "logistics_proposed",
            proposedRoute,
            estimatedCost,
            distanceKm,
            estimatedDuration,
            updatedAt: serverTimestamp(),
        });

        console.log("[ShipmentService] Proposed shipment", shipmentId);
    } catch (err) {
        console.error("[ShipmentService] proposeShipment failed:", err);
        throw err;
    }
}

// -------- Buyer Approve/Reject (logistics_proposed → approved | awaiting_logistics) --------

export async function approveShipment(
    shipmentId: string,
    approved: boolean
): Promise<void> {
    const uid = getUid();
    if (!uid) throw new Error("Not authenticated");

    try {
        const shipRef = doc(db, "shipments", shipmentId);
        const shipSnap = await getDoc(shipRef);

        if (!shipSnap.exists()) throw new Error("Shipment not found");

        const shipment = shipSnap.data();
        if (shipment.status !== "logistics_proposed") {
            throw new Error("Shipment is not awaiting buyer approval");
        }
        if (uid !== shipment.buyerId) {
            throw new Error("Only the buyer can approve/reject shipments");
        }

        if (approved) {
            await updateDoc(shipRef, {
                status: "approved",
                updatedAt: serverTimestamp(),
            });
            console.log("[ShipmentService] Buyer approved shipment", shipmentId);
        } else {
            // Reject → reset to awaiting_logistics
            await updateDoc(shipRef, {
                status: "awaiting_logistics",
                logisticsProviderId: null,
                proposedRoute: "",
                estimatedCost: null,
                distanceKm: null,
                estimatedDuration: "",
                updatedAt: serverTimestamp(),
            });
            console.log("[ShipmentService] Buyer rejected shipment", shipmentId);
        }
    } catch (err) {
        console.error("[ShipmentService] approveShipment failed:", err);
        throw err;
    }
}

// -------- Update Status (approved → in_transit → delivered) --------

export async function updateShipmentStatus(
    shipmentId: string,
    newStatus: ShipmentStatus
): Promise<void> {
    const uid = getUid();
    if (!uid) throw new Error("Not authenticated");

    try {
        const shipRef = doc(db, "shipments", shipmentId);
        const shipSnap = await getDoc(shipRef);

        if (!shipSnap.exists()) throw new Error("Shipment not found");

        const shipment = shipSnap.data();
        const currentStatus = shipment.status as ShipmentStatus;

        const allowed = VALID_TRANSITIONS[currentStatus] || [];
        if (!allowed.includes(newStatus)) {
            throw new Error(`Cannot transition from "${currentStatus}" to "${newStatus}"`);
        }

        await updateDoc(shipRef, {
            status: newStatus,
            updatedAt: serverTimestamp(),
        });

        // delivered → mark commitment completed
        if (newStatus === "delivered" && shipment.commitmentId) {
            try {
                const commitRef = doc(db, "commitments", shipment.commitmentId);
                const commitSnap = await getDoc(commitRef);
                if (commitSnap.exists() && commitSnap.data().status === "accepted") {
                    await updateDoc(commitRef, {
                        status: "completed",
                        updatedAt: serverTimestamp(),
                    });
                    console.log("[ShipmentService] Commitment", shipment.commitmentId, "→ completed");
                }
            } catch (err) {
                console.error("[ShipmentService] Failed to update commitment:", err);
            }
        }

        console.log("[ShipmentService] Updated shipment", shipmentId, "→", newStatus);
    } catch (err) {
        console.error("[ShipmentService] updateShipmentStatus failed:", err);
        throw err;
    }
}

// -------- Query Functions --------

/** Shipments waiting for logistics (for logistics dashboard) */
export async function getAvailableShipments(): Promise<ShipmentDocument[]> {
    try {
        const q = query(collection(db, "shipments"), where("status", "==", "awaiting_logistics"));
        const snap = await getDocs(q);
        return snap.docs.map(mapDoc);
    } catch (err) {
        console.error("[ShipmentService] getAvailableShipments failed:", err);
        return [];
    }
}

/** Shipments proposed by current logistics provider */
export async function getMyShipments(): Promise<ShipmentDocument[]> {
    const uid = getUid();
    if (!uid) return [];
    try {
        const q = query(collection(db, "shipments"), where("logisticsProviderId", "==", uid));
        const snap = await getDocs(q);
        return snap.docs.map(mapDoc);
    } catch (err) {
        console.error("[ShipmentService] getMyShipments failed:", err);
        return [];
    }
}

/** Shipments awaiting buyer approval (logistics_proposed for this buyer) */
export async function getShipmentsAwaitingApproval(): Promise<ShipmentDocument[]> {
    const uid = getUid();
    if (!uid) return [];
    try {
        const q = query(
            collection(db, "shipments"),
            where("buyerId", "==", uid),
            where("status", "==", "logistics_proposed")
        );
        const snap = await getDocs(q);
        return snap.docs.map(mapDoc);
    } catch (err) {
        console.error("[ShipmentService] getShipmentsAwaitingApproval failed:", err);
        return [];
    }
}

/** Shipments for a farmer */
export async function getShipmentsByFarmer(): Promise<ShipmentDocument[]> {
    const uid = getUid();
    if (!uid) return [];
    try {
        const q = query(collection(db, "shipments"), where("farmerId", "==", uid));
        const snap = await getDocs(q);
        return snap.docs.map(mapDoc);
    } catch (err) {
        console.error("[ShipmentService] getShipmentsByFarmer failed:", err);
        return [];
    }
}

/** Shipments for a buyer */
export async function getShipmentsByBuyer(): Promise<ShipmentDocument[]> {
    const uid = getUid();
    if (!uid) return [];
    try {
        const q = query(collection(db, "shipments"), where("buyerId", "==", uid));
        const snap = await getDocs(q);
        return snap.docs.map(mapDoc);
    } catch (err) {
        console.error("[ShipmentService] getShipmentsByBuyer failed:", err);
        return [];
    }
}

/** Get a single shipment by ID */
export async function getShipmentById(shipmentId: string): Promise<ShipmentDocument | null> {
    try {
        const shipSnap = await getDoc(doc(db, "shipments", shipmentId));
        if (!shipSnap.exists()) return null;
        return mapDoc(shipSnap);
    } catch (err) {
        console.error("[ShipmentService] getShipmentById failed:", err);
        return null;
    }
}

// -------- Indian city coordinate lookup for route generation --------

const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
    "mumbai": { lat: 19.0760, lng: 72.8777 },
    "delhi": { lat: 28.7041, lng: 77.1025 },
    "new delhi": { lat: 28.6139, lng: 77.2090 },
    "bangalore": { lat: 12.9716, lng: 77.5946 },
    "bengaluru": { lat: 12.9716, lng: 77.5946 },
    "hyderabad": { lat: 17.3850, lng: 78.4867 },
    "chennai": { lat: 13.0827, lng: 80.2707 },
    "kolkata": { lat: 22.5726, lng: 88.3639 },
    "pune": { lat: 18.5204, lng: 73.8567 },
    "ahmedabad": { lat: 23.0225, lng: 72.5714 },
    "jaipur": { lat: 26.9124, lng: 75.7873 },
    "surat": { lat: 21.1702, lng: 72.8311 },
    "lucknow": { lat: 26.8467, lng: 80.9462 },
    "kanpur": { lat: 26.4499, lng: 80.3319 },
    "nagpur": { lat: 21.1458, lng: 79.0882 },
    "indore": { lat: 22.7196, lng: 75.8577 },
    "thane": { lat: 19.2183, lng: 72.9781 },
    "bhopal": { lat: 23.2599, lng: 77.4126 },
    "visakhapatnam": { lat: 17.6868, lng: 83.2185 },
    "vizag": { lat: 17.6868, lng: 83.2185 },
    "pimpri-chinchwad": { lat: 18.6279, lng: 73.8009 },
    "patna": { lat: 25.6093, lng: 85.1376 },
    "vadodara": { lat: 22.3072, lng: 73.1812 },
    "ghaziabad": { lat: 28.6692, lng: 77.4538 },
    "ludhiana": { lat: 30.9010, lng: 75.8573 },
    "agra": { lat: 27.1767, lng: 78.0081 },
    "nashik": { lat: 19.9975, lng: 73.7898 },
    "faridabad": { lat: 28.4089, lng: 77.3178 },
    "meerut": { lat: 28.9845, lng: 77.7064 },
    "rajkot": { lat: 22.3039, lng: 70.8022 },
    "varanasi": { lat: 25.3176, lng: 82.9739 },
    "coimbatore": { lat: 11.0168, lng: 76.9558 },
    "srinagar": { lat: 34.0837, lng: 74.7973 },
    "madurai": { lat: 9.9252, lng: 78.1198 },
    "vijayawada": { lat: 16.5062, lng: 80.6480 },
    "chandigarh": { lat: 30.7333, lng: 76.7794 },
    "mysore": { lat: 12.2958, lng: 76.6394 },
    "mysuru": { lat: 12.2958, lng: 76.6394 },
    "ranchi": { lat: 23.3441, lng: 85.3096 },
    "raipur": { lat: 21.2514, lng: 81.6296 },
    "guwahati": { lat: 26.1445, lng: 91.7362 },
    "kochi": { lat: 9.9312, lng: 76.2673 },
    "cochin": { lat: 9.9312, lng: 76.2673 },
    "thiruvananthapuram": { lat: 8.5241, lng: 76.9366 },
    "trivandrum": { lat: 8.5241, lng: 76.9366 },
    "dehradun": { lat: 30.3165, lng: 78.0322 },
    "mangalore": { lat: 12.9141, lng: 74.8560 },
    "amritsar": { lat: 31.6340, lng: 74.8723 },
    "noida": { lat: 28.5355, lng: 77.3910 },
    "gurgaon": { lat: 28.4595, lng: 77.0266 },
    "gurugram": { lat: 28.4595, lng: 77.0266 },
    "jodhpur": { lat: 26.2389, lng: 73.0243 },
    "udaipur": { lat: 24.5854, lng: 73.7125 },
    "warangal": { lat: 17.9784, lng: 79.5941 },
    "guntur": { lat: 16.3067, lng: 80.4365 },
    "tirupati": { lat: 13.6288, lng: 79.4192 },
    "nellore": { lat: 14.4426, lng: 79.9865 },
    "kakinada": { lat: 16.9891, lng: 82.2475 },
    "hubli": { lat: 15.3647, lng: 75.1240 },
    "telangana": { lat: 17.3850, lng: 78.4867 },
};

/** Find coordinates for a location string (fuzzy match against city names) */
function geocodeCity(location: string): { lat: number; lng: number } | null {
    if (!location) return null;
    const lower = location.toLowerCase().trim();
    // Exact match
    if (CITY_COORDS[lower]) return CITY_COORDS[lower];
    // Partial match — check if any city name is contained in the location string
    for (const [city, coords] of Object.entries(CITY_COORDS)) {
        if (lower.includes(city) || city.includes(lower)) return coords;
    }
    return null;
}

/** Haversine distance between two lat/lng points in km */
function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
    const R = 6371;
    const dLat = (b.lat - a.lat) * Math.PI / 180;
    const dLng = (b.lng - a.lng) * Math.PI / 180;
    const sinLat = Math.sin(dLat / 2);
    const sinLng = Math.sin(dLng / 2);
    const h = sinLat * sinLat + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * sinLng * sinLng;
    return Math.round(R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h)));
}

/** Generate route data for a shipment (geocode cities → real coordinates + polyline) */
export async function generateRoute(shipmentId: string, force = false): Promise<ShipmentDocument> {
    try {
        const shipRef = doc(db, "shipments", shipmentId);
        const shipSnap = await getDoc(shipRef);

        if (!shipSnap.exists()) throw new Error("Shipment not found");
        const shipment = shipSnap.data();

        // If force mode, clear old route data first so it can be regenerated
        if (force && (shipment.pickupCoordinates || shipment.routePolyline)) {
            await updateDoc(shipRef, {
                pickupCoordinates: null,
                deliveryCoordinates: null,
                routePolyline: null,
                updatedAt: serverTimestamp(),
            });
            console.log("[ShipmentService] Cleared old route data for", shipmentId);
        } else if (!force && shipment.pickupCoordinates && shipment.deliveryCoordinates && shipment.routePolyline) {
            // Prevent double generation (only if not forcing)
            console.log("[ShipmentService] Route already generated for", shipmentId);
            return mapDoc(shipSnap);
        }

        // Geocode pickup and delivery from location names
        const pickupCoords = geocodeCity(shipment.pickupLocation || "");
        const deliveryCoords = geocodeCity(shipment.deliveryLocation || "");

        if (!pickupCoords || !deliveryCoords) {
            throw new Error(
                `Cannot geocode locations: pickup="${shipment.pickupLocation || "?"}", delivery="${shipment.deliveryLocation || "?"}". ` +
                `Add these cities to the lookup or enter a recognized Indian city name.`
            );
        }

        // Parse "via" waypoints from proposedRoute (e.g. "via hyderabad", "via nh65", "via nagpur, pune")
        const viaWaypoints: { lat: number; lng: number }[] = [];
        if (shipment.proposedRoute) {
            const routeStr = (shipment.proposedRoute as string).toLowerCase();
            // Extract city names after "via" keyword
            const viaMatch = routeStr.replace(/^via\s+/i, "");
            // Split on commas, "and", slashes, hyphens for multiple stops
            const parts = viaMatch.split(/[,\/&]+|\band\b/).map((s: string) => s.trim()).filter(Boolean);
            for (const part of parts) {
                const coords = geocodeCity(part);
                if (coords) viaWaypoints.push(coords);
            }
        }

        // Build ordered list of key stops: Pickup → Via stops → Delivery
        const keyStops = [pickupCoords, ...viaWaypoints, deliveryCoords];

        // Compute total road distance along all segments
        let totalStraightKm = 0;
        for (let i = 0; i < keyStops.length - 1; i++) {
            totalStraightKm += haversineKm(keyStops[i], keyStops[i + 1]);
        }
        const roadDistance = Math.round(totalStraightKm * 1.3);
        const avgSpeedKmh = 45;
        const totalHours = roadDistance / avgSpeedKmh;
        const hours = Math.floor(totalHours);
        const mins = Math.round((totalHours - hours) * 60);
        const estimatedDuration = `${hours}h ${mins}m`;

        // Generate polyline through all key stops with interpolation between each segment
        const routePolyline: { lat: number; lng: number }[] = [];
        for (let seg = 0; seg < keyStops.length - 1; seg++) {
            const from = keyStops[seg];
            const to = keyStops[seg + 1];
            const pointsInSegment = 4 + Math.floor(Math.random() * 3);
            for (let i = 0; i <= pointsInSegment; i++) {
                // Skip duplicate points at segment boundaries (except first segment start)
                if (seg > 0 && i === 0) continue;
                const frac = i / pointsInSegment;
                const dLat = to.lat - from.lat;
                const dLng = to.lng - from.lng;
                const len = Math.sqrt(dLat * dLat + dLng * dLng) + 0.001;
                // Slight perpendicular offset for road-curve feel (not at endpoints)
                const offset = (i === 0 || i === pointsInSegment) ? 0 : (Math.random() - 0.5) * 0.3;
                routePolyline.push({
                    lat: +(from.lat + frac * dLat + offset * (-dLng / len)).toFixed(6),
                    lng: +(from.lng + frac * dLng + offset * (dLat / len)).toFixed(6),
                });
            }
        }

        await updateDoc(shipRef, {
            pickupCoordinates: pickupCoords,
            deliveryCoordinates: deliveryCoords,
            routePolyline,
            distanceKm: roadDistance,
            estimatedDuration,
            updatedAt: serverTimestamp(),
        });

        const viaNames = viaWaypoints.length > 0 ? ` via ${shipment.proposedRoute}` : "";
        console.log("[ShipmentService] Generated route for", shipmentId, `${shipment.pickupLocation} →${viaNames} ${shipment.deliveryLocation}`, roadDistance, "km");
        const updatedSnap = await getDoc(shipRef);
        return mapDoc(updatedSnap);
    } catch (err) {
        console.error("[ShipmentService] generateRoute failed:", err);
        throw err;
    }
}
