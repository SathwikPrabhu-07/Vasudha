"""
Profit service — estimates expected profit.
Uses ML-predicted prices when available, falls back to static prices.
"""

import json
from pathlib import Path

# Load crop growth data for static prices and yield data
_data_path = Path(__file__).resolve().parent.parent / "ml" / "crop_growth_data.json"
with open(_data_path, "r") as f:
    CROP_DATA = json.load(f)


def calculate_profit_estimate(
    crop_name: str,
    land_area: float,
    ml_price_min: float | None = None,
    ml_price_max: float | None = None,
    ml_trend: str | None = None,
) -> dict:
    """
    Calculate estimated profit.

    If ml_price_min/max are provided (from ML model), use those.
    Otherwise fall back to static prices from crop_growth_data.json.

    Args:
        crop_name: Name of the crop
        land_area: Land area in acres
        ml_price_min: ML-predicted min price per quintal (or None)
        ml_price_max: ML-predicted max price per quintal (or None)
        ml_trend: ML-predicted trend ("Increasing"/"Decreasing"/"Stable" or None)

    Returns:
        dict with yield, prices, profit range, and price source
    """
    crop = CROP_DATA.get(crop_name.lower())
    if not crop:
        raise ValueError(f"Unsupported crop: {crop_name}")

    estimated_yield = crop["yieldPerAcre"] * land_area

    # Use ML prices if available, else static
    if ml_price_min is not None and ml_price_max is not None:
        price_min = ml_price_min
        price_max = ml_price_max
        price_source = "ml_predicted"
        trend = ml_trend or "Stable"
    else:
        price_min = crop["staticPriceMin"]
        price_max = crop["staticPriceMax"]
        price_source = "static"
        trend = "Stable"

    profit_min = estimated_yield * price_min
    profit_max = estimated_yield * price_max

    return {
        "cropName": crop_name.lower(),
        "estimatedYield": round(estimated_yield, 1),
        "unit": crop["unit"],
        "pricePerQuintalMin": round(price_min, 2),
        "pricePerQuintalMax": round(price_max, 2),
        "expectedProfitMin": round(profit_min),
        "expectedProfitMax": round(profit_max),
        "trend": trend,
        "priceSource": price_source,
    }


def calculate_byproduct_profit(
    byproduct_name: str,
    main_estimated_yield: float,
    yield_ratio: float,
    bp_price_min: float,
    bp_price_max: float,
    price_source: str = "multiplier_fallback",
) -> dict:
    """
    Calculate estimated profit for a crop by-product.

    Args:
        byproduct_name: e.g. "Coconut Husk"
        main_estimated_yield: Total estimated yield of the main crop (quintals)
        yield_ratio: Fraction of main yield that becomes this by-product
        bp_price_min: Predicted min price per quintal for this by-product
        bp_price_max: Predicted max price per quintal for this by-product
        price_source: "ml_predicted" or "multiplier_fallback"

    Returns:
        dict with name, estimatedYield, profit range, priceSource
    """
    bp_yield = round(main_estimated_yield * yield_ratio, 1)
    profit_min = round(bp_yield * bp_price_min)
    profit_max = round(bp_yield * bp_price_max)

    return {
        "name": byproduct_name,
        "estimatedYield": bp_yield,
        "unit": "quintals",
        "pricePerQuintalMin": round(bp_price_min, 2),
        "pricePerQuintalMax": round(bp_price_max, 2),
        "expectedProfitMin": profit_min,
        "expectedProfitMax": profit_max,
        "priceSource": price_source,
    }

