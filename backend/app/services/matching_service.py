"""
Matching service — matches buyer demands with farmer crops.

Logic:
  For each open demand, find active crops where:
    1. cropId matches (preferred) OR cropName matches (legacy fallback)
    2. itemType + itemName match (if demand has these fields)
    3. Harvest window overlaps demand date range
"""


def _demand_matches_crop(demand: dict, crop: dict) -> bool:
    """
    Returns True if this crop is a valid match for the demand.

    Matching rules (in order):
      1. If demand has cropId → must match crop id exactly.
         Else fall back to cropName match.
      2. If demand has itemType == "byproduct" → crop must have that byproduct
         with availableQuantity > 0.
      3. Harvest window must overlap demand date range.
    """
    demand_crop_id = demand.get("cropId", "")
    demand_crop_name = demand.get("cropName", "").lower().strip()
    demand_item_type = demand.get("itemType", "primary")
    demand_item_name = demand.get("itemName", "").strip()

    crop_id = crop.get("id", "")
    crop_name = crop.get("cropName", "").lower().strip()

    # Rule 1: Identify which crop is being demanded
    if demand_crop_id:
        # Structured demand — must match exact cropId
        if crop_id != demand_crop_id:
            return False
    else:
        # Legacy demand — match by cropName
        if crop_name != demand_crop_name:
            return False

    # Rule 2: Item type matching
    if demand_item_type == "byproduct":
        # Demand is for a byproduct — crop must have that byproduct available
        byproducts = crop.get("byproducts", [])
        bp_found = False
        for bp in byproducts:
            if bp.get("name", "").strip() == demand_item_name:
                avail = float(bp.get("availableQuantity", bp.get("totalQuantity", 0)))
                committed = float(bp.get("committedQuantity", 0))
                net = avail - committed
                if net > 0:
                    bp_found = True
                break
        if not bp_found:
            return False
    # For primary, no extra check needed (crop itself is the item)

    return True


def _get_available_quantity(demand: dict, crop: dict) -> float:
    """Return available quantity for the specific item (primary or byproduct)."""
    item_type = demand.get("itemType", "primary")
    item_name = demand.get("itemName", "").strip()

    if item_type == "byproduct":
        for bp in crop.get("byproducts", []):
            if bp.get("name", "").strip() == item_name:
                avail = float(bp.get("availableQuantity", bp.get("totalQuantity", 0)))
                committed = float(bp.get("committedQuantity", 0))
                return max(0.0, avail - committed)
        return 0.0
    else:
        estimated = float(crop.get("estimatedYield", 0))
        committed = float(crop.get("committedQuantity", 0))
        return max(0.0, estimated - committed)


def match_demands_with_crops(db, buyer_id: str) -> list[dict]:
    """
    For a given buyer, find all their open demands
    and match each against active crops in Firestore.
    Returns list of { demand, matchedCrops[] }.
    """
    # 1. Get all open demands for this buyer
    demands_ref = db.collection("demands")
    demand_docs = demands_ref.where("buyerId", "==", buyer_id).where("status", "==", "open").stream()

    demands = []
    for doc in demand_docs:
        d = doc.to_dict()
        d["id"] = doc.id
        demands.append(d)

    if not demands:
        return []

    # 2. Get all active crops (one query, filter in memory)
    crops_ref = db.collection("crops")
    crop_docs = crops_ref.stream()

    all_crops = []
    for doc in crop_docs:
        c = doc.to_dict()
        status = c.get("status", "active")
        if status not in ("active", "partially_committed"):
            continue
        c["id"] = doc.id
        all_crops.append(c)

    # 3. Match each demand against crops
    results = []
    for demand in demands:
        demand_from = demand.get("requiredFromDate", "")
        demand_to = demand.get("requiredToDate", "")
        offered_price = demand.get("offeredPrice", 0)
        item_type = demand.get("itemType", "primary")
        item_name = demand.get("itemName", demand.get("cropName", ""))

        matched = []
        for crop in all_crops:
            # Check crop/item identity
            if not _demand_matches_crop(demand, crop):
                continue

            # Check harvest window overlap
            harvest_start = crop.get("recommendedHarvestStart", "") or crop.get("adjustedHarvestDate", "")
            harvest_end = crop.get("recommendedHarvestEnd", "") or harvest_start

            if harvest_start and harvest_end and demand_from and demand_to:
                if harvest_start > demand_to or harvest_end < demand_from:
                    continue  # No overlap

            available_qty = _get_available_quantity(demand, crop)

            matched.append({
                "cropId": crop.get("id", ""),
                "cropName": crop.get("cropName", ""),
                "itemType": item_type,
                "itemName": item_name,
                "availableQuantity": available_qty,
                "farmerId": crop.get("farmerId", ""),
                "location": crop.get("location", ""),
                "harvestWindow": f"{harvest_start} to {harvest_end}",
                "recommendedHarvestStart": harvest_start,
                "recommendedHarvestEnd": harvest_end,
                "expectedProfitMin": crop.get("expectedProfitMin", 0),
                "expectedProfitMax": crop.get("expectedProfitMax", 0),
                "estimatedYield": crop.get("estimatedYield", 0),
                "confidence": crop.get("confidence", 0),
                "riskLevel": crop.get("riskLevel", "unknown"),
                "landArea": crop.get("landArea", 0),
            })

        results.append({
            "demandId": demand.get("id", ""),
            "cropName": demand.get("cropName", ""),
            "itemType": item_type,
            "itemName": item_name,
            "requiredQuantity": demand.get("requiredQuantity", 0),
            "requiredFromDate": demand_from,
            "requiredToDate": demand_to,
            "offeredPrice": offered_price,
            "matchedCrops": matched,
            "matchCount": len(matched),
        })

    return results


def match_crops_with_demands(db, farmer_id: str) -> list[dict]:
    """
    For a given farmer, find all their active crops
    and match each against open demands in Firestore.
    Returns list of { crop, matchedDemands[] }.
    """
    # 1. Get all active crops for this farmer
    crops_ref = db.collection("crops")
    crop_docs = crops_ref.where("farmerId", "==", farmer_id).stream()

    crops = []
    for doc in crop_docs:
        c = doc.to_dict()
        status = c.get("status", "active")
        if status not in ("active", "partially_committed"):
            continue
        c["id"] = doc.id
        crops.append(c)

    if not crops:
        return []

    # 2. Get all open demands (one query, filter in memory)
    demands_ref = db.collection("demands")
    demand_docs = demands_ref.where("status", "==", "open").stream()

    all_demands = []
    for doc in demand_docs:
        d = doc.to_dict()
        d["id"] = doc.id
        all_demands.append(d)

    # 3. Match each crop against demands
    results = []
    for crop in crops:
        crop_id = crop.get("id", "")
        harvest_start = crop.get("recommendedHarvestStart", "") or crop.get("adjustedHarvestDate", "")
        harvest_end = crop.get("recommendedHarvestEnd", "") or harvest_start

        matched = []
        for demand in all_demands:
            demand_from = demand.get("requiredFromDate", "")
            demand_to = demand.get("requiredToDate", "")

            # Check crop/item identity
            if not _demand_matches_crop(demand, crop):
                continue

            # Check harvest window overlap
            if harvest_start and harvest_end and demand_from and demand_to:
                if harvest_start > demand_to or harvest_end < demand_from:
                    continue

            matched.append({
                "demandId": demand.get("id", ""),
                "buyerId": demand.get("buyerId", ""),
                "itemType": demand.get("itemType", "primary"),
                "itemName": demand.get("itemName", demand.get("cropName", "")),
                "requiredQuantity": demand.get("requiredQuantity", 0),
                "requiredFromDate": demand_from,
                "requiredToDate": demand_to,
                "offeredPrice": demand.get("offeredPrice", 0),
                "location": demand.get("location", ""),
            })

        if matched:
            results.append({
                "cropId": crop_id,
                "cropName": crop.get("cropName", ""),
                "harvestWindow": f"{harvest_start} to {harvest_end}",
                "matchedDemands": matched,
                "matchCount": len(matched),
            })

    return results
