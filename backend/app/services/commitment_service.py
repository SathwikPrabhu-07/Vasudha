"""
Commitment service — buyer→farmer commitment workflow (backend version).
Supports both primary crop and by-product commitments.
"""


def create_commitment(db, data: dict) -> str:
    """Create a new commitment. Validates crop and quantity.
    
    data must include:
        cropId, buyerId, quantity, agreedPrice
        itemType: "primary" or "byproduct" (default: "primary")
        itemName: name of by-product (required if itemType == "byproduct")
    """
    crop_ref = db.collection("crops").document(data["cropId"])
    crop_snap = crop_ref.get()

    if not crop_snap.exists:
        raise ValueError("Crop not found")

    crop = crop_snap.to_dict()

    if crop.get("status") not in ("active", "partially_committed"):
        raise ValueError("Crop is not available for commitment")

    item_type = data.get("itemType", "primary")
    item_name = data.get("itemName", "")

    if data.get("quantity", 0) <= 0:
        raise ValueError("Quantity must be greater than 0")

    # Validate quantity based on item type
    if item_type == "byproduct":
        # Find the by-product in crop's byproducts array
        byproducts = crop.get("byproducts", [])
        bp_match = None
        bp_index = -1
        for i, bp in enumerate(byproducts):
            if bp.get("name") == item_name:
                bp_match = bp
                bp_index = i
                break

        if bp_match is None:
            raise ValueError(f"By-product '{item_name}' not found for this crop")

        available_qty = bp_match.get("availableQuantity", bp_match.get("totalQuantity", 0)) - bp_match.get("committedQuantity", 0)

        if data["quantity"] > available_qty:
            raise ValueError(f"Only {available_qty}q of '{item_name}' available ({bp_match.get('committedQuantity', 0)}q already committed)")
    else:
        # Primary crop
        estimated_yield = crop.get("estimatedYield", 0)
        committed_qty = crop.get("committedQuantity", 0)
        available_qty = estimated_yield - committed_qty

        if data["quantity"] > available_qty:
            raise ValueError(f"Only {available_qty}q available ({committed_qty}q already committed)")

    from datetime import datetime, timezone

    commitment_data = {
        "cropId": data["cropId"],
        "cropName": crop.get("cropName", ""),
        "farmerId": crop.get("farmerId", ""),
        "buyerId": data["buyerId"],
        "agreedPrice": float(data.get("agreedPrice", 0)),
        "quantity": float(data["quantity"]),
        "itemType": item_type,
        "itemName": item_name if item_type == "byproduct" else crop.get("cropName", ""),
        "status": "pending",
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "updatedAt": datetime.now(timezone.utc).isoformat(),
    }

    _, doc_ref = db.collection("commitments").add(commitment_data)
    return doc_ref.id


def update_commitment_status(db, commitment_id: str, new_status: str, user_id: str) -> dict:
    """Update commitment status with controlled transitions."""
    valid_transitions = {
        "pending": ["accepted", "rejected"],
        "accepted": ["completed"],
        "rejected": [],
        "completed": [],
    }

    doc_ref = db.collection("commitments").document(commitment_id)
    snap = doc_ref.get()

    if not snap.exists:
        raise ValueError("Commitment not found")

    commitment = snap.to_dict()
    current = commitment.get("status", "")

    allowed = valid_transitions.get(current, [])
    if new_status not in allowed:
        raise ValueError(f"Cannot transition from '{current}' to '{new_status}'")

    if new_status in ("accepted", "rejected") and user_id != commitment.get("farmerId"):
        raise ValueError("Only the farmer can accept or reject commitments")

    from datetime import datetime, timezone
    from google.cloud.firestore import Increment

    doc_ref.update({
        "status": new_status,
        "updatedAt": datetime.now(timezone.utc).isoformat(),
    })

    # On accept → update inventory (main crop or by-product)
    if new_status == "accepted":
        crop_ref = db.collection("crops").document(commitment["cropId"])
        crop_snap = crop_ref.get()
        if crop_snap.exists:
            crop = crop_snap.to_dict()
            qty = commitment.get("quantity", 0)
            item_type = commitment.get("itemType", "primary")
            item_name = commitment.get("itemName", "")

            if item_type == "byproduct":
                # Update by-product committed quantity
                byproducts = crop.get("byproducts", [])
                for i, bp in enumerate(byproducts):
                    if bp.get("name") == item_name:
                        byproducts[i]["committedQuantity"] = bp.get("committedQuantity", 0) + qty
                        byproducts[i]["availableQuantity"] = bp.get("totalQuantity", 0) - byproducts[i]["committedQuantity"]
                        break
                crop_ref.update({
                    "byproducts": byproducts,
                    "updatedAt": datetime.now(timezone.utc).isoformat(),
                })
            else:
                # Update main crop committed quantity
                new_committed = crop.get("committedQuantity", 0) + qty
                estimated = crop.get("estimatedYield", 0)

                crop_update = {
                    "committedQuantity": Increment(qty),
                    "updatedAt": datetime.now(timezone.utc).isoformat(),
                }
                if new_committed >= estimated:
                    crop_update["status"] = "fully_committed"
                elif new_committed > 0:
                    crop_update["status"] = "partially_committed"

                crop_ref.update(crop_update)

    return {"commitmentId": commitment_id, "status": new_status}


def get_commitments_for_farmer(db, farmer_id: str) -> list[dict]:
    """Get all commitments for a farmer."""
    docs = db.collection("commitments").where("farmerId", "==", farmer_id).stream()
    return [{"id": d.id, **d.to_dict()} for d in docs]


def get_commitments_for_buyer(db, buyer_id: str) -> list[dict]:
    """Get all commitments for a buyer."""
    docs = db.collection("commitments").where("buyerId", "==", buyer_id).stream()
    return [{"id": d.id, **d.to_dict()} for d in docs]
