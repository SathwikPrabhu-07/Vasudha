"""
ML Model Loader — loads Prophet .pkl models, caches in memory, predicts price ranges.

Usage:
    from app.ml.model_loader import predict_price_range

    result = predict_price_range("tomato", forecast_days=60)
    # Returns: { predictedMinPrice, predictedMaxPrice, trend, priceSource }
    # Or None if no model found (caller should use static fallback).
"""

import os
import pickle
from pathlib import Path

# Directory where .pkl model files are stored
_MODEL_DIR = Path(__file__).resolve().parent
_BACKEND_ROOT = _MODEL_DIR.parent.parent  # backend/ folder

# In-memory cache: { "tomato": <Prophet model>, ... }
_MODEL_CACHE: dict = {}


def _find_model_path(crop_name: str) -> str | None:
    """
    Look for a trained model file.
    Checks both app/ml/ and backend root for {crop}_model.pkl
    """
    crop_lower = crop_name.lower().replace(" ", "_")
    filename = f"{crop_lower}_model.pkl"

    # Check ml/ folder first
    ml_path = _MODEL_DIR / filename
    if ml_path.exists():
        return str(ml_path)

    # Check backend root (where train_models.py saves by default)
    root_path = _BACKEND_ROOT / filename
    if root_path.exists():
        return str(root_path)

    return None


def load_price_model(crop_name: str):
    """
    Load a Prophet model for the given crop.
    Returns the model object or None if not found.
    Models are cached after first load.
    """
    crop_lower = crop_name.lower()

    # Return from cache if already loaded
    if crop_lower in _MODEL_CACHE:
        return _MODEL_CACHE[crop_lower]

    model_path = _find_model_path(crop_lower)
    if not model_path:
        print(f"[ML] No model file found for '{crop_lower}' — will use static prices")
        _MODEL_CACHE[crop_lower] = None
        return None

    try:
        with open(model_path, "rb") as f:
            model = pickle.load(f)
        _MODEL_CACHE[crop_lower] = model
        print(f"[ML] Loaded model for '{crop_lower}' from {model_path}")
        return model
    except Exception as e:
        print(f"[ML] Error loading model for '{crop_lower}': {e}")
        _MODEL_CACHE[crop_lower] = None
        return None


def predict_price_range(crop_name: str, forecast_days: int = 60) -> dict | None:
    """
    Predict price range for a crop using its trained Prophet model.

    Args:
        crop_name: e.g. "tomato"
        forecast_days: Number of days to forecast (default 60)

    Returns:
        dict with predictedMinPrice, predictedMaxPrice, trend, priceSource
        OR None if no model is available (caller should fallback to static).
    """
    model = load_price_model(crop_name)
    if model is None:
        return None

    try:
        future = model.make_future_dataframe(periods=forecast_days)
        forecast = model.predict(future)

        # Use the last `forecast_days` rows for prediction
        forecast_window = forecast.tail(forecast_days)

        predicted_min = forecast_window["yhat_lower"].min()
        predicted_max = forecast_window["yhat_upper"].max()

        # Determine trend
        trend_start = forecast_window["yhat"].iloc[0]
        trend_end = forecast_window["yhat"].iloc[-1]

        if trend_end > trend_start * 1.02:
            trend = "Increasing"
        elif trend_end < trend_start * 0.98:
            trend = "Decreasing"
        else:
            trend = "Stable"

        return {
            "predictedMinPrice": round(max(0, predicted_min), 2),
            "predictedMaxPrice": round(max(0, predicted_max), 2),
            "trend": trend,
            "priceSource": "ml_predicted",
        }

    except Exception as e:
        print(f"[ML] Prediction failed for '{crop_name}': {e}")
        return None


def predict_byproduct_price(
    byproduct_name: str,
    main_crop_price_min: float,
    main_crop_price_max: float,
    price_multiplier: float,
    forecast_days: int = 60,
) -> dict:
    """
    Predict price range for a crop by-product.

    Strategy:
        1. Try ML model for the by-product (e.g. coconut_husk_model.pkl)
        2. If no model → fallback to mainCropPrice × priceMultiplier

    Returns:
        dict with predictedMinPrice, predictedMaxPrice, trend, priceSource
    """
    # Try ML model first
    ml_result = predict_price_range(byproduct_name, forecast_days)
    if ml_result:
        return ml_result

    # Fallback: multiplier-based estimation
    return {
        "predictedMinPrice": round(main_crop_price_min * price_multiplier, 2),
        "predictedMaxPrice": round(main_crop_price_max * price_multiplier, 2),
        "trend": "Stable",
        "priceSource": "multiplier_fallback",
    }


def get_loaded_models() -> list[str]:
    """Return list of crops with successfully loaded models."""
    return [k for k, v in _MODEL_CACHE.items() if v is not None]

