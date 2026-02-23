"""
Demand routes — buyer demand posting and matching engine.
"""

from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.firebase_init import get_firestore_client
from app.services.matching_service import match_demands_with_crops, match_crops_with_demands

router = APIRouter(tags=["Demand & Matching"])


# --------------- Request models ---------------

class CreateDemandRequest(BaseModel):
    buyerId: str
    # New structured item selection
    cropId: Optional[str] = None       # Firestore crop document ID
    itemType: Optional[str] = "primary"  # "primary" or "byproduct"
    itemName: Optional[str] = None       # Display name: e.g. "Coconut Husk" or "Coconut"
    # Legacy field kept for backward compatibility
    cropName: Optional[str] = None
    # Demand fields
    requiredQuantity: float
    requiredFromDate: str   # ISO date: "2026-06-01"
    requiredToDate: str     # ISO date: "2026-08-01"
    location: str
    offeredPrice: float


# --------------- Routes ---------------

@router.get("/marketplace/crop-options")
def get_crop_options():
    """
    Return a structured list of available crops and their items (primary + byproducts).
    Used to populate the grouped dropdown in the buyer's demand form.

    Response shape:
    [
      {
        cropId: str,
        cropName: str,
        items: [
          { itemType: "primary", itemName: "Coconut", availableQuantity: 200 },
          { itemType: "byproduct", itemName: "Coconut Husk", availableQuantity: 50 },
          ...
        ]
      }
    ]
    Only byproducts with availableQuantity > 0 are included.
    """
    db = get_firestore_client()
    if db is None:
        raise HTTPException(status_code=500, detail="Firestore not available")

    # Query active / partially committed crops
    crops_ref = db.collection("crops")
    crop_docs = crops_ref.stream()

    options = []
    for doc in crop_docs:
        c = doc.to_dict()
        status = c.get("status", "active")
        # Only include crops that are available in the marketplace
        if status not in ("active", "partially_committed"):
            continue

        crop_name = c.get("cropName", "")
        crop_id = doc.id

        # Compute primary available quantity
        estimated_yield = float(c.get("estimatedYield", 0))
        committed_qty = float(c.get("committedQuantity", 0))
        primary_available = max(0.0, estimated_yield - committed_qty)

        items = []

        # Always include the primary crop item
        items.append({
            "itemType": "primary",
            "itemName": crop_name,
            "availableQuantity": primary_available,
        })

        # Include byproducts with availableQuantity > 0
        byproducts = c.get("byproducts", [])
        for bp in byproducts:
            avail = float(bp.get("availableQuantity", bp.get("totalQuantity", 0)))
            committed = float(bp.get("committedQuantity", 0))
            net_avail = max(0.0, avail - committed)
            if net_avail > 0:
                items.append({
                    "itemType": "byproduct",
                    "itemName": bp.get("name", ""),
                    "availableQuantity": net_avail,
                })

        options.append({
            "cropId": crop_id,
            "cropName": crop_name,
            "items": items,
        })

    print(f"[CropOptions] Returning {len(options)} crop groups")
    return options


@router.post("/create-demand")
def create_demand(req: CreateDemandRequest):
    """Create a new buyer demand and store in Firestore."""

    db = get_firestore_client()
    if db is None:
        raise HTTPException(status_code=500, detail="Firestore not available — check serviceAccountKey.json")

    if not req.buyerId:
        raise HTTPException(status_code=400, detail="buyerId is required")

    # Resolve itemName / cropName — support both old and new clients
    item_type = req.itemType or "primary"
    item_name = req.itemName or req.cropName or ""
    crop_name = req.cropName or req.itemName or ""

    if not item_name:
        raise HTTPException(status_code=400, detail="itemName or cropName is required")

    # Normalize cropName to lowercase for matching
    crop_name_lower = crop_name.lower()
    # For primary items the itemName IS the cropName (keep display casing)
    # For byproducts itemName is e.g. "Coconut Husk"

    print(f"\n[Demand] Creating demand: {item_name} ({item_type}) | Buyer: {req.buyerId}")

    demand_data = {
        "buyerId": str(req.buyerId),
        # Legacy field
        "cropName": crop_name_lower,
        # New structured fields
        "cropId": str(req.cropId) if req.cropId else None,
        "itemType": item_type,
        "itemName": item_name,
        # Demand details
        "requiredQuantity": float(req.requiredQuantity),
        "requiredFromDate": str(req.requiredFromDate),
        "requiredToDate": str(req.requiredToDate),
        "location": str(req.location),
        "offeredPrice": float(req.offeredPrice),
        "status": "open",
        "createdAt": datetime.now(timezone.utc).isoformat(),
    }

    doc_ref = db.collection("demands").add(demand_data)
    doc_id = doc_ref[1].id
    print(f"[Demand] Stored demand with ID: {doc_id}")

    return {
        "success": True,
        "message": f"Demand for {item_name} created successfully",
        "demandId": doc_id,
    }


@router.get("/buyer-matches")
def get_buyer_matches(buyerId: str = Query(..., description="Buyer's Firebase UID")):
    """Get matched crops for a buyer's open demands."""
    print(f"\n[Match] Finding matches for buyer: {buyerId}")

    db = get_firestore_client()
    if db is None:
        raise HTTPException(status_code=500, detail="Firestore not available")

    matches = match_demands_with_crops(db, buyerId)
    total = sum(m["matchCount"] for m in matches)
    print(f"[Match] Found {total} total crop matches across {len(matches)} demands")

    return {
        "success": True,
        "buyerId": buyerId,
        "matches": matches,
        "totalMatches": total,
    }


@router.get("/farmer-matches")
def get_farmer_matches(farmerId: str = Query(..., description="Farmer's Firebase UID")):
    """Get matching open demands for a farmer's active crops."""
    print(f"\n[Match] Finding demand matches for farmer: {farmerId}")

    db = get_firestore_client()
    if db is None:
        raise HTTPException(status_code=500, detail="Firestore not available")

    matches = match_crops_with_demands(db, farmerId)
    total = sum(m["matchCount"] for m in matches)
    print(f"[Match] Found {total} total demand matches across {len(matches)} crops")

    return {
        "success": True,
        "farmerId": farmerId,
        "matches": matches,
        "totalMatches": total,
    }
