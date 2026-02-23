"""
Shipment service — 3-way logistics workflow backend.
Status: awaiting_logistics → logistics_proposed → approved → in_transit → delivered
"""
import logging
import random
from firebase_admin import firestore
from app.firebase_init import get_firestore_client

logger = logging.getLogger(__name__)

VALID_TRANSITIONS = {
    "awaiting_logistics": ["logistics_proposed"],
    "logistics_proposed": ["approved", "awaiting_logistics"],
    "approved": ["in_transit"],
    "in_transit": ["delivered"],
    "delivered": [],
}


def create_shipment_from_commitment(commitment: dict) -> str:
    """Create a shipment when a commitment is accepted."""
    try:
        db = get_firestore_client()
        existing = db.collection("shipments").where(
            "commitmentId", "==", commitment["id"]
        ).get()
        if existing:
            logger.info(f"Shipment already exists for commitment {commitment['id']}")
            return existing[0].id

        pickup_location = ""
        try:
            crop_doc = db.collection("crops").document(commitment["cropId"]).get()
            if crop_doc.exists:
                pickup_location = crop_doc.to_dict().get("location", "")
        except Exception as e:
            logger.warning(f"Could not read crop location: {e}")

        delivery_location = ""
        try:
            demands = db.collection("demands").where(
                "buyerId", "==", commitment["buyerId"]
            ).where(
                "cropName", "==", commitment.get("cropName", "").lower()
            ).get()
            if demands:
                delivery_location = demands[0].to_dict().get("location", "")
        except Exception as e:
            logger.warning(f"Could not read demand location: {e}")

        shipment_data = {
            "commitmentId": commitment["id"],
            "cropId": commitment["cropId"],
            "cropName": commitment.get("cropName", ""),
            "itemType": commitment.get("itemType", "primary"),
            "itemName": commitment.get("itemName", commitment.get("cropName", "")),
            "farmerId": commitment["farmerId"],
            "buyerId": commitment["buyerId"],
            "pickupLocation": pickup_location,
            "deliveryLocation": delivery_location,
            "quantity": commitment.get("quantity", 0),
            "logisticsProviderId": None,
            "status": "awaiting_logistics",
            "proposedRoute": "",
            "estimatedCost": None,
            "distanceKm": None,
            "estimatedDuration": "",
            "createdAt": firestore.SERVER_TIMESTAMP,
            "updatedAt": firestore.SERVER_TIMESTAMP,
        }


        _, doc_ref = db.collection("shipments").add(shipment_data)
        logger.info(f"Created shipment {doc_ref.id} for commitment {commitment['id']}")
        return doc_ref.id

    except Exception as e:
        logger.error(f"create_shipment_from_commitment failed: {e}")
        raise


def propose_shipment(shipment_id: str, logistics_provider_id: str,
                     proposed_route: str, estimated_cost: float) -> dict:
    """Logistics provider proposes a shipment with route and cost."""
    try:
        db = get_firestore_client()
        ship_ref = db.collection("shipments").document(shipment_id)
        ship_doc = ship_ref.get()

        if not ship_doc.exists:
            raise ValueError("Shipment not found")

        shipment = ship_doc.to_dict()
        if shipment["status"] != "awaiting_logistics":
            raise ValueError("Shipment is not awaiting logistics")
        if shipment.get("logisticsProviderId") and shipment["logisticsProviderId"] != logistics_provider_id:
            raise ValueError("Another logistics provider already proposed")

        distance_km = round(random.uniform(50, 350), 1)
        hours = round(distance_km / 45)
        estimated_duration = f"{hours}h {random.randint(5, 59)}m"

        ship_ref.update({
            "logisticsProviderId": logistics_provider_id,
            "status": "logistics_proposed",
            "proposedRoute": proposed_route,
            "estimatedCost": estimated_cost,
            "distanceKm": distance_km,
            "estimatedDuration": estimated_duration,
            "updatedAt": firestore.SERVER_TIMESTAMP,
        })

        logger.info(f"Proposed shipment {shipment_id} by {logistics_provider_id}")
        return {"shipmentId": shipment_id, "status": "logistics_proposed"}

    except Exception as e:
        logger.error(f"propose_shipment failed: {e}")
        raise


def approve_shipment(shipment_id: str, approved: bool) -> dict:
    """Buyer approves or rejects a logistics proposal."""
    try:
        db = get_firestore_client()
        ship_ref = db.collection("shipments").document(shipment_id)
        ship_doc = ship_ref.get()

        if not ship_doc.exists:
            raise ValueError("Shipment not found")

        shipment = ship_doc.to_dict()
        if shipment["status"] != "logistics_proposed":
            raise ValueError("Shipment is not awaiting buyer approval")

        if approved:
            ship_ref.update({
                "status": "approved",
                "updatedAt": firestore.SERVER_TIMESTAMP,
            })
            logger.info(f"Buyer approved shipment {shipment_id}")
            return {"shipmentId": shipment_id, "status": "approved"}
        else:
            ship_ref.update({
                "status": "awaiting_logistics",
                "logisticsProviderId": None,
                "proposedRoute": "",
                "estimatedCost": None,
                "distanceKm": None,
                "estimatedDuration": "",
                "updatedAt": firestore.SERVER_TIMESTAMP,
            })
            logger.info(f"Buyer rejected shipment {shipment_id}")
            return {"shipmentId": shipment_id, "status": "awaiting_logistics"}

    except Exception as e:
        logger.error(f"approve_shipment failed: {e}")
        raise


def update_shipment_status(shipment_id: str, new_status: str) -> dict:
    """Update shipment status with controlled transitions."""
    try:
        db = get_firestore_client()
        ship_ref = db.collection("shipments").document(shipment_id)
        ship_doc = ship_ref.get()

        if not ship_doc.exists:
            raise ValueError("Shipment not found")

        shipment = ship_doc.to_dict()
        current_status = shipment["status"]

        allowed = VALID_TRANSITIONS.get(current_status, [])
        if new_status not in allowed:
            raise ValueError(f'Cannot transition from "{current_status}" to "{new_status}"')

        ship_ref.update({
            "status": new_status,
            "updatedAt": firestore.SERVER_TIMESTAMP,
        })

        if new_status == "delivered" and shipment.get("commitmentId"):
            try:
                commit_ref = db.collection("commitments").document(shipment["commitmentId"])
                commit_doc = commit_ref.get()
                if commit_doc.exists and commit_doc.to_dict().get("status") == "accepted":
                    commit_ref.update({
                        "status": "completed",
                        "updatedAt": firestore.SERVER_TIMESTAMP,
                    })
                    logger.info(f"Commitment {shipment['commitmentId']} → completed")
            except Exception as e:
                logger.error(f"Failed to update commitment status: {e}")

        logger.info(f"Updated shipment {shipment_id} → {new_status}")
        return {"shipmentId": shipment_id, "status": new_status}

    except Exception as e:
        logger.error(f"update_shipment_status failed: {e}")
        raise


def get_available_shipments() -> list:
    try:
        db = get_firestore_client()
        docs = db.collection("shipments").where("status", "==", "awaiting_logistics").get()
        return [{"id": d.id, **d.to_dict()} for d in docs]
    except Exception as e:
        logger.error(f"get_available_shipments failed: {e}")
        return []


def get_shipments_by_provider(provider_id: str) -> list:
    try:
        db = get_firestore_client()
        docs = db.collection("shipments").where("logisticsProviderId", "==", provider_id).get()
        return [{"id": d.id, **d.to_dict()} for d in docs]
    except Exception as e:
        logger.error(f"get_shipments_by_provider failed: {e}")
        return []


def get_shipments_by_farmer(farmer_id: str) -> list:
    try:
        db = get_firestore_client()
        docs = db.collection("shipments").where("farmerId", "==", farmer_id).get()
        return [{"id": d.id, **d.to_dict()} for d in docs]
    except Exception as e:
        logger.error(f"get_shipments_by_farmer failed: {e}")
        return []


def get_shipments_by_buyer(buyer_id: str) -> list:
    try:
        db = get_firestore_client()
        docs = db.collection("shipments").where("buyerId", "==", buyer_id).get()
        return [{"id": d.id, **d.to_dict()} for d in docs]
    except Exception as e:
        logger.error(f"get_shipments_by_buyer failed: {e}")
        return []


def generate_route(shipment_id: str) -> dict:
    """Generate route data for a shipment (mock coordinates + polyline)."""
    try:
        db = get_firestore_client()
        ship_ref = db.collection("shipments").document(shipment_id)
        ship_doc = ship_ref.get()

        if not ship_doc.exists:
            raise ValueError("Shipment not found")

        shipment = ship_doc.to_dict()

        # Prevent double generation when route already exists
        if shipment.get("distanceKm") and shipment.get("routePolyline"):
            logger.info(f"Route already generated for shipment {shipment_id}")
            return {"shipmentId": shipment_id, **shipment, "id": shipment_id}

        # Mock coordinate generation (India bounding box roughly)
        pickup_lat = round(random.uniform(15.0, 25.0), 6)
        pickup_lng = round(random.uniform(73.0, 85.0), 6)
        delivery_lat = round(random.uniform(15.0, 25.0), 6)
        delivery_lng = round(random.uniform(73.0, 85.0), 6)

        distance_km = round(random.uniform(50, 450), 1)
        hours = round(distance_km / 45)
        mins = random.randint(5, 55)
        estimated_duration = f"{hours}h {mins}m"

        # Generate simple mock polyline (list of {lat, lng} objects — Firestore doesn't allow nested arrays)
        num_waypoints = random.randint(4, 8)
        route_polyline = []
        for i in range(num_waypoints):
            frac = i / (num_waypoints - 1)
            lat = round(pickup_lat + frac * (delivery_lat - pickup_lat) + random.uniform(-0.5, 0.5), 6)
            lng = round(pickup_lng + frac * (delivery_lng - pickup_lng) + random.uniform(-0.5, 0.5), 6)
            route_polyline.append({"lat": lat, "lng": lng})

        update_data = {
            "pickupCoordinates": {"lat": pickup_lat, "lng": pickup_lng},
            "deliveryCoordinates": {"lat": delivery_lat, "lng": delivery_lng},
            "routePolyline": route_polyline,
            "distanceKm": distance_km,
            "estimatedDuration": estimated_duration,
            "updatedAt": firestore.SERVER_TIMESTAMP,
        }

        ship_ref.update(update_data)
        logger.info(f"Generated route for shipment {shipment_id}: {distance_km} km, {estimated_duration}")

        result = {**shipment, **update_data, "id": shipment_id}
        return result

    except Exception as e:
        logger.error(f"generate_route failed: {e}")
        raise

