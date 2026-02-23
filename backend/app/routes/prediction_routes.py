"""
Prediction routes — crop planning, comparison, and finalization.
"""

import traceback
import threading
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional

from app.services.harvest_service import calculate_base_harvest_date, get_crop_info
from app.services.weather_service import calculate_weather_adjustment
from app.services.profit_service import calculate_profit_estimate, calculate_byproduct_profit
from app.ml.model_loader import predict_price_range, predict_byproduct_price
from app.firebase_init import get_firestore_client
from app.services.email_service import send_email, build_crop_notification_email

router = APIRouter(tags=["Prediction"])


# --------------- Request / Response models ---------------

class PredictionRequest(BaseModel):
    location: str
    soilType: str
    waterSources: list[str]
    cultivationStartDate: str  # ISO date: "2026-03-01"
    landArea: float
    crops: list[str]
    enabledByproducts: Optional[dict[str, list[str]]] = None  # { "coconut": ["Coconut Husk", "Coconut Shell"] }


class ByproductFinalize(BaseModel):
    name: str
    totalQuantity: float
    predictedPriceMin: float
    predictedPriceMax: float


class FinalizeCropRequest(BaseModel):
    farmerId: str
    cropName: str
    location: str
    soilType: str
    waterSources: list[str]
    cultivationStartDate: str
    landArea: float
    baseHarvestDate: str
    adjustedHarvestDate: str
    harvestWindowStart: str
    harvestWindowEnd: str
    riskLevel: str
    confidence: int
    estimatedYield: float
    expectedProfitMin: float
    expectedProfitMax: float
    byproducts: Optional[list[ByproductFinalize]] = None


# --------------- Helpers ---------------

def _notify_matching_buyers(db, crop_doc_id: str, crop_plan: dict, byproducts_data: list):
    """
    Background task: find open demands matching this crop and email buyers.
    Runs in a daemon thread so it never blocks the finalize-crop response.
    """
    crop_name = crop_plan.get("cropName", "").lower()
    if not crop_name:
        return

    print(f"[Email] Searching for matching buyers for crop: {crop_name}")

    try:
        # Fetch all open demands matching this crop
        demands_ref = db.collection("demands")
        demand_docs = demands_ref.where("status", "==", "open").stream()

        notified_buyers: set[str] = set()

        for doc in demand_docs:
            d = doc.to_dict()
            demand_crop_id = d.get("cropId", "")
            demand_crop_name = (d.get("cropName", "") or "").lower()
            demand_item_type = d.get("itemType", "primary")
            demand_item_name = d.get("itemName", "")
            buyer_id = d.get("buyerId", "")

            # Match by cropId (if demand has one) or cropName
            if demand_crop_id:
                if demand_crop_id != crop_doc_id:
                    continue
            else:
                if demand_crop_name != crop_name:
                    continue

            # For byproduct demands, verify byproduct exists
            if demand_item_type == "byproduct":
                bp_names = [bp.get("name", "") for bp in byproducts_data]
                if demand_item_name not in bp_names:
                    continue

            # Avoid double-emailing the same buyer
            if buyer_id in notified_buyers:
                continue

            # Get buyer's email from Firestore "users" collection
            buyer_email = _get_user_email(db, buyer_id)
            if not buyer_email:
                print(f"[Email] No email found for buyer {buyer_id} — skipping")
                continue

            # Build and send notification
            subject, body = build_crop_notification_email(
                crop_name=crop_plan.get("cropName", crop_name),
                location=crop_plan.get("location", ""),
                estimated_yield=crop_plan.get("estimatedYield", 0),
                harvest_start=crop_plan.get("recommendedHarvestStart", crop_plan.get("adjustedHarvestDate", "")),
                harvest_end=crop_plan.get("recommendedHarvestEnd", ""),
                price_min=crop_plan.get("expectedProfitMin", 0),
                price_max=crop_plan.get("expectedProfitMax", 0),
                byproducts=byproducts_data if byproducts_data else None,
            )

            sent = send_email(to_email=buyer_email, subject=subject, body=body)
            if sent:
                notified_buyers.add(buyer_id)

        print(f"[Email] Notified {len(notified_buyers)} buyer(s) for crop: {crop_name}")

    except Exception as e:
        print(f"[Email] ERROR in _notify_matching_buyers: {e}")
        traceback.print_exc()


def _get_user_email(db, uid: str) -> str | None:
    """Look up a user's email in the Firestore 'users' collection."""
    if not uid:
        return None
    try:
        doc = db.collection("users").document(uid).get()
        if doc.exists:
            data = doc.to_dict()
            return data.get("email") or data.get("emailAddress") or None
    except Exception as e:
        print(f"[Email] Could not fetch email for user {uid}: {e}")
    return None


# --------------- Routes ---------------

@router.post("/predict-crop-options")
def predict_crop_options(req: PredictionRequest):
    """
    For each selected crop, run harvest + weather + ML price + profit services.
    Returns flat prediction objects per crop, including by-product predictions.
    """
    print(f"\n[Predict] Request: {req.crops} | {req.location} | {req.landArea} acres | start: {req.cultivationStartDate}")

    if not req.crops:
        raise HTTPException(status_code=400, detail="At least one crop must be selected")

    predictions = []

    for crop_name in req.crops:
        crop_lower = crop_name.lower()
        print(f"\n[Predict] --- Processing: {crop_lower} ---")

        # Check if crop is supported
        crop_info = get_crop_info(crop_lower)
        if not crop_info:
            print(f"[Predict] Unsupported crop: {crop_lower}")
            predictions.append({
                "crop": crop_lower,
                "error": f"Unsupported crop: {crop_name}",
            })
            continue

        try:
            # 1. Base harvest date
            harvest = calculate_base_harvest_date(crop_lower, req.cultivationStartDate)
            print(f"[Predict] Harvest: base={harvest['baseHarvestDate']}, window={harvest['harvestWindowStart']}–{harvest['harvestWindowEnd']}")

            # 2. Weather adjustment
            weather = calculate_weather_adjustment(
                crop_name=crop_lower,
                location=req.location,
                base_harvest_date=harvest["baseHarvestDate"],
                optimal_temp_min=harvest["optimalTempMin"],
                optimal_temp_max=harvest["optimalTempMax"],
            )
            print(f"[Predict] Weather: adjusted={weather['adjustedHarvestDate']}, risk={weather['riskLevel']}, confidence={weather['confidence']}%")

            # 3. ML price prediction (may return None)
            ml_prices = predict_price_range(crop_lower, forecast_days=60)
            if ml_prices:
                print(f"[Predict] ML Price: ₹{ml_prices['predictedMinPrice']}–₹{ml_prices['predictedMaxPrice']} ({ml_prices['trend']})")
            else:
                print(f"[Predict] ML Price: No model — using static fallback")

            # 4. Profit estimate (uses ML prices if available, else static)
            profit = calculate_profit_estimate(
                crop_name=crop_lower,
                land_area=req.landArea,
                ml_price_min=ml_prices["predictedMinPrice"] if ml_prices else None,
                ml_price_max=ml_prices["predictedMaxPrice"] if ml_prices else None,
                ml_trend=ml_prices["trend"] if ml_prices else None,
            )
            print(f"[Predict] Profit: ₹{profit['expectedProfitMin']}–₹{profit['expectedProfitMax']} ({profit['priceSource']})")

            # 5. By-product predictions (if enabled for this crop)
            byproduct_predictions = []
            crop_byproducts = crop_info.get("byproducts", [])
            enabled_bp_list = (req.enabledByproducts or {}).get(crop_lower, [])

            if crop_byproducts and enabled_bp_list:
                main_price_min = profit["pricePerQuintalMin"]
                main_price_max = profit["pricePerQuintalMax"]
                main_yield = profit["estimatedYield"]

                for bp in crop_byproducts:
                    bp_name = bp["name"]
                    if bp_name not in enabled_bp_list:
                        continue

                    # Get by-product price (ML or multiplier fallback)
                    bp_prices = predict_byproduct_price(
                        byproduct_name=bp_name,
                        main_crop_price_min=main_price_min,
                        main_crop_price_max=main_price_max,
                        price_multiplier=bp.get("priceMultiplier", 0.5),
                    )

                    # Calculate by-product profit
                    bp_profit = calculate_byproduct_profit(
                        byproduct_name=bp_name,
                        main_estimated_yield=main_yield,
                        yield_ratio=bp.get("yieldRatio", 0.1),
                        bp_price_min=bp_prices["predictedMinPrice"],
                        bp_price_max=bp_prices["predictedMaxPrice"],
                        price_source=bp_prices["priceSource"],
                    )

                    byproduct_predictions.append(bp_profit)
                    print(f"[Predict] By-product '{bp_name}': yield={bp_profit['estimatedYield']}q, ₹{bp_profit['expectedProfitMin']}–₹{bp_profit['expectedProfitMax']} ({bp_prices['priceSource']})")

            # 6. Build prediction object — nested format (frontend compat) + flat fields
            prediction = {
                # Key used by frontend
                "cropName": crop_lower,

                # Nested objects (existing frontend reads these)
                "harvest": {
                    "baseHarvestDate": str(harvest["baseHarvestDate"]),
                    "harvestWindowStart": str(harvest["harvestWindowStart"]),
                    "harvestWindowEnd": str(harvest["harvestWindowEnd"]),
                    "growthDaysAvg": int(harvest["growthDaysAvg"]),
                    "growthDaysMin": int(harvest["growthDaysMin"]),
                    "growthDaysMax": int(harvest["growthDaysMax"]),
                    "optimalTempMin": float(harvest["optimalTempMin"]),
                    "optimalTempMax": float(harvest["optimalTempMax"]),
                },
                "weather": {
                    "adjustedHarvestDate": str(weather["adjustedHarvestDate"]),
                    "recommendedHarvestStart": str(weather["recommendedHarvestStart"]),
                    "recommendedHarvestEnd": str(weather["recommendedHarvestEnd"]),
                    "adjustmentDays": int(weather["adjustmentDays"]),
                    "riskLevel": str(weather["riskLevel"]),
                    "confidence": int(weather["confidence"]),
                    "factors": list(weather["factors"]),
                    "weather": {
                        "avgTemperature": float(weather["weather"]["avgTemperature"]),
                        "rainfallMm": float(weather["weather"]["rainfallMm"]),
                    },
                },
                "profit": {
                    "estimatedYield": float(profit["estimatedYield"]),
                    "unit": str(profit["unit"]),
                    "pricePerQuintalMin": float(profit["pricePerQuintalMin"]),
                    "pricePerQuintalMax": float(profit["pricePerQuintalMax"]),
                    "expectedProfitMin": float(profit["expectedProfitMin"]),
                    "expectedProfitMax": float(profit["expectedProfitMax"]),
                    "trend": str(profit["trend"]),
                    "priceSource": str(profit["priceSource"]),
                },

                # By-product predictions
                "byproducts": byproduct_predictions,

                # Flat fields (for direct access)
                "crop": crop_lower,
                "baseHarvestDate": str(harvest["baseHarvestDate"]),
                "recommendedHarvestStart": str(weather["recommendedHarvestStart"]),
                "recommendedHarvestEnd": str(weather["recommendedHarvestEnd"]),
                "riskLevel": str(weather["riskLevel"]),
                "confidence": int(weather["confidence"]),
                "predictedMinPrice": float(profit["pricePerQuintalMin"]),
                "predictedMaxPrice": float(profit["pricePerQuintalMax"]),
                "expectedProfitMin": float(profit["expectedProfitMin"]),
                "expectedProfitMax": float(profit["expectedProfitMax"]),
                "trend": str(profit["trend"]),
            }

            predictions.append(prediction)

        except Exception as e:
            print(f"[Predict] ERROR for {crop_lower}: {e}")
            traceback.print_exc()
            predictions.append({
                "crop": crop_lower,
                "error": str(e),
            })

    print(f"\n[Predict] Returning {len(predictions)} predictions")
    return {"predictions": predictions}


@router.post("/finalize-crop")
def finalize_crop(req: FinalizeCropRequest):
    """
    Validate a selected crop plan, save to Firestore, and
    notify matching buyers via email (non-blocking background thread).
    """
    print(f"\n[Finalize] Crop: {req.cropName} | Farmer: {req.farmerId}")

    if not req.farmerId:
        raise HTTPException(status_code=400, detail="farmerId is required")

    # Build by-products array for storage
    byproducts_data = []
    if req.byproducts:
        for bp in req.byproducts:
            byproducts_data.append({
                "name": str(bp.name),
                "totalQuantity": float(bp.totalQuantity),
                "availableQuantity": float(bp.totalQuantity),  # initially all available
                "committedQuantity": 0,
                "predictedPriceMin": float(bp.predictedPriceMin),
                "predictedPriceMax": float(bp.predictedPriceMax),
            })

    crop_plan = {
        "farmerId": str(req.farmerId),
        "cropName": str(req.cropName),
        "location": str(req.location),
        "soilType": str(req.soilType),
        "waterSources": list(req.waterSources),
        "cultivationStartDate": str(req.cultivationStartDate),
        "landArea": float(req.landArea),
        "baseHarvestDate": str(req.baseHarvestDate),
        "adjustedHarvestDate": str(req.adjustedHarvestDate),
        "recommendedHarvestStart": str(req.harvestWindowStart),
        "recommendedHarvestEnd": str(req.harvestWindowEnd),
        "harvestWindowStart": str(req.harvestWindowStart),
        "harvestWindowEnd": str(req.harvestWindowEnd),
        "riskLevel": str(req.riskLevel),
        "confidence": int(req.confidence),
        "estimatedYield": float(req.estimatedYield),
        "committedQuantity": 0,
        "expectedProfitMin": float(req.expectedProfitMin),
        "expectedProfitMax": float(req.expectedProfitMax),
        "byproducts": byproducts_data,
        "status": "active",
        "createdAt": datetime.now(timezone.utc).isoformat(),
    }

    # --- Save to Firestore ---
    db = get_firestore_client()
    crop_doc_id = None

    if db is not None:
        try:
            doc_ref = db.collection("crops").add(crop_plan)
            crop_doc_id = doc_ref[1].id
            print(f"[Finalize] Saved to Firestore with ID: {crop_doc_id}")

            # --- Fire-and-forget email notifications ---
            # Runs in a background daemon thread so it never delays the response
            notification_thread = threading.Thread(
                target=_notify_matching_buyers,
                args=(db, crop_doc_id, crop_plan, byproducts_data),
                daemon=True,
            )
            notification_thread.start()

        except Exception as e:
            print(f"[Finalize] WARNING: Firestore save failed: {e}")
            # Continue — frontend will also write to Firestore as backup
    else:
        print("[Finalize] WARNING: Firestore not available — skipping server-side save")

    print(f"[Finalize] Validated — by-products: {len(byproducts_data)}")

    return {
        "success": True,
        "message": f"Crop plan for {req.cropName} validated successfully",
        "cropDocId": crop_doc_id,   # NEW: frontend can use this as the canonical crop ID
        "cropPlan": crop_plan,
    }


@router.get("/test-email")
def test_email(to: str = Query(..., description="Email address to send test to")):
    """
    Temporary test route — verifies SMTP connection and credentials.
    Usage: GET /api/test-email?to=you@example.com
    """
    subject = "Vasudha — Email Test ✓"
    body = """\
Hello!

This is a test email from the Vasudha backend email service.

If you received this, Gmail SMTP is configured correctly.

— The Vasudha Team
"""
    success = send_email(to_email=to, subject=subject, body=body)

    if success:
        return {"success": True, "message": f"Test email sent to {to}"}
    else:
        raise HTTPException(
            status_code=500,
            detail="Email failed — check EMAIL_ADDRESS and EMAIL_APP_PASSWORD in .env and server logs"
        )
