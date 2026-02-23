"""
Weather service — provides weather-based harvest adjustment.
Currently uses rule-based stub. Can be replaced with real weather API later.
"""

import random
from datetime import datetime, timedelta

from app.services.harvest_service import get_crop_info


def _get_stub_weather(location: str, target_date: str) -> dict:
    """
    Stub weather data. In production, replace with a real API call
    (e.g., OpenWeatherMap, IMD API).
    """
    month = datetime.strptime(target_date, "%Y-%m-%d").month

    # Indian climate rough approximation
    if month in (12, 1, 2):  # Winter
        avg_temp = random.uniform(12, 22)
        rainfall_mm = random.uniform(0, 20)
    elif month in (3, 4, 5):  # Summer
        avg_temp = random.uniform(28, 42)
        rainfall_mm = random.uniform(0, 30)
    elif month in (6, 7, 8, 9):  # Monsoon
        avg_temp = random.uniform(24, 34)
        rainfall_mm = random.uniform(100, 350)
    else:  # Post-monsoon
        avg_temp = random.uniform(18, 30)
        rainfall_mm = random.uniform(20, 80)

    return {
        "location": location,
        "targetDate": target_date,
        "avgTemperature": round(avg_temp, 1),
        "rainfallMm": round(rainfall_mm, 1),
        "month": month,
    }


def calculate_weather_adjustment(
    crop_name: str,
    location: str,
    base_harvest_date: str,
    optimal_temp_min: float | None = None,
    optimal_temp_max: float | None = None,
) -> dict:
    """
    Calculate weather-based adjustments to the harvest window.

    Args:
        crop_name: Name of the crop (used to lookup temp range if not provided)
        location: Farm location name
        base_harvest_date: ISO date string of the base (unadjusted) harvest
        optimal_temp_min: Min optimal temperature (optional, loaded from crop data if None)
        optimal_temp_max: Max optimal temperature (optional, loaded from crop data if None)

    Returns:
        dict with adjustedHarvestDate, recommendedHarvestStart/End, riskLevel, confidence, factors
    """
    # Load crop temp range if not provided
    if optimal_temp_min is None or optimal_temp_max is None:
        crop_info = get_crop_info(crop_name)
        if crop_info:
            optimal_temp_min = crop_info["optimalTempMin"]
            optimal_temp_max = crop_info["optimalTempMax"]
        else:
            optimal_temp_min = 20
            optimal_temp_max = 30

    try:
        weather = _get_stub_weather(location, base_harvest_date)
    except Exception as e:
        # Fallback to neutral adjustment if weather fetch fails
        print(f"[Weather] Fetch failed for '{location}': {e} — using neutral adjustment")
        return {
            "adjustedHarvestDate": base_harvest_date,
            "recommendedHarvestStart": base_harvest_date,
            "recommendedHarvestEnd": base_harvest_date,
            "adjustmentDays": 0,
            "riskLevel": "unknown",
            "confidence": 50,
            "factors": ["Weather data unavailable — using neutral adjustment"],
            "weather": {"avgTemperature": 0, "rainfallMm": 0},
        }

    avg_temp = weather["avgTemperature"]
    rainfall = weather["rainfallMm"]

    adjustment_days = 0
    risk_factors = []
    risk_level = "low"
    confidence = 85

    # Temperature adjustment
    if avg_temp < optimal_temp_min:
        temp_diff = optimal_temp_min - avg_temp
        adjustment_days += int(temp_diff * 1.5)
        risk_factors.append(f"Below-optimal temperature ({avg_temp}°C vs {optimal_temp_min}°C min)")
        risk_level = "moderate"
        confidence -= 10
    elif avg_temp > optimal_temp_max:
        temp_diff = avg_temp - optimal_temp_max
        # High temp can accelerate growth — subtract days
        adjustment_days -= int(min(temp_diff * 1.0, 5))
        risk_factors.append(f"Above-optimal temperature ({avg_temp}°C vs {optimal_temp_max}°C max)")
        risk_level = "moderate"
        confidence -= 10

    # Rainfall adjustment
    if rainfall > 250:
        adjustment_days += 7
        risk_factors.append(f"Heavy rainfall expected ({rainfall}mm)")
        risk_level = "high"
        confidence -= 15
    elif rainfall > 150:
        adjustment_days += 3
        risk_factors.append(f"Moderate rainfall ({rainfall}mm)")
        if risk_level == "low":
            risk_level = "moderate"
        confidence -= 5

    if not risk_factors:
        risk_factors.append("Weather conditions are favorable")

    # Calculate adjusted dates
    base = datetime.strptime(base_harvest_date, "%Y-%m-%d")
    adjusted = base + timedelta(days=adjustment_days)
    window_start = adjusted - timedelta(days=5)
    window_end = adjusted + timedelta(days=5)

    return {
        "adjustedHarvestDate": adjusted.strftime("%Y-%m-%d"),
        "recommendedHarvestStart": window_start.strftime("%Y-%m-%d"),
        "recommendedHarvestEnd": window_end.strftime("%Y-%m-%d"),
        "adjustmentDays": adjustment_days,
        "riskLevel": risk_level,
        "confidence": max(confidence, 50),
        "factors": risk_factors,
        "weather": {
            "avgTemperature": avg_temp,
            "rainfallMm": rainfall,
        },
    }
