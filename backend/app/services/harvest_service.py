"""
Harvest service — calculates base harvest dates from crop growth data.
"""

import json
from datetime import datetime, timedelta
from pathlib import Path

# Load crop growth data once at module level
_data_path = Path(__file__).resolve().parent.parent / "ml" / "crop_growth_data.json"
with open(_data_path, "r") as f:
    CROP_DATA = json.load(f)


def get_supported_crops() -> list[str]:
    """Return list of supported crop names."""
    return list(CROP_DATA.keys())


def get_crop_info(crop_name: str) -> dict | None:
    """Get growth data for a specific crop."""
    return CROP_DATA.get(crop_name.lower())


def calculate_base_harvest_date(crop_name: str, cultivation_start_date: str) -> dict:
    """
    Calculate the base (unadjusted) harvest date for a crop.

    Args:
        crop_name: Name of the crop (e.g., "tomato")
        cultivation_start_date: ISO date string (e.g., "2026-03-01")

    Returns:
        dict with baseHarvestDate, harvestWindowStart, harvestWindowEnd, growthDays
    """
    crop = CROP_DATA.get(crop_name.lower())
    if not crop:
        raise ValueError(f"Unsupported crop: {crop_name}")

    start = datetime.strptime(cultivation_start_date, "%Y-%m-%d")

    base_date = start + timedelta(days=crop["avgDays"])
    window_start = start + timedelta(days=crop["minDays"])
    window_end = start + timedelta(days=crop["maxDays"])

    return {
        "cropName": crop_name.lower(),
        "baseHarvestDate": base_date.strftime("%Y-%m-%d"),
        "harvestWindowStart": window_start.strftime("%Y-%m-%d"),
        "harvestWindowEnd": window_end.strftime("%Y-%m-%d"),
        "growthDaysAvg": crop["avgDays"],
        "growthDaysMin": crop["minDays"],
        "growthDaysMax": crop["maxDays"],
        "optimalTempMin": crop["optimalTempMin"],
        "optimalTempMax": crop["optimalTempMax"],
    }
