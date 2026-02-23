"""
ML module for Vasudha.
Contains crop growth data and placeholder for future price prediction model.
"""


def load_price_model():
    """
    Placeholder for loading the trained ML price prediction model.
    
    In the future, this will:
    1. Load a serialized model (e.g., pickle, joblib, ONNX)
    2. Return the model instance ready for inference
    3. Be called once at startup and cached
    
    For now, returns None — profit_service uses static prices instead.
    """
    # TODO: Load actual ML model when ready
    # import joblib
    # model = joblib.load("app/ml/price_model.pkl")
    # return model
    print("[ML] Price model not loaded — using static prices")
    return None
