"""
Firebase Admin SDK initialization for Vasudha backend.

- Uses FIREBASE_CREDENTIALS_PATH env var for the service account key path.
- Lazy-loads firebase_admin so the server can start even if the package
  is missing or credentials are absent.
- Caches the Firestore client after first successful init.
"""

import os
from dotenv import load_dotenv

load_dotenv()

_db = None
_init_attempted = False


def get_firestore_client():
    """
    Return the Firestore client, initializing Firebase Admin on first call.
    Returns None (without crashing) if firebase_admin is missing or
    credentials are not configured.
    """
    global _db, _init_attempted

    # Return cached client if already initialized
    if _db is not None:
        return _db

    # Only attempt initialization once
    if _init_attempted:
        return None
    _init_attempted = True

    # 1. Check that firebase_admin is installed
    try:
        import firebase_admin
        from firebase_admin import credentials, firestore
    except ImportError:
        print("[Firebase] ERROR: firebase_admin package is not installed.")
        print("[Firebase] Run: pip install firebase-admin")
        return None

    # 2. Resolve credentials — prefer inline JSON env var (for cloud hosts like Render)
    cred_json = os.getenv("FIREBASE_CREDENTIALS_JSON", "")
    cred_path = os.getenv("FIREBASE_CREDENTIALS_PATH", "")

    cred = None

    if cred_json:
        import json
        try:
            cred_dict = json.loads(cred_json)
            cred = credentials.Certificate(cred_dict)
            print("[Firebase] Using credentials from FIREBASE_CREDENTIALS_JSON env var")
        except (json.JSONDecodeError, ValueError) as e:
            print(f"[Firebase] ERROR: Invalid FIREBASE_CREDENTIALS_JSON: {e}")
            return None
    elif cred_path and os.path.exists(cred_path):
        cred = credentials.Certificate(cred_path)
        print(f"[Firebase] Using credentials file: {cred_path}")
    else:
        # Fallback: look for serviceAccountKey.json in backend root
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        fallback = os.path.join(base_dir, "serviceAccountKey.json")
        if os.path.exists(fallback):
            cred = credentials.Certificate(fallback)
            print(f"[Firebase] Using fallback credentials: {fallback}")
        else:
            print("[Firebase] ERROR: No credentials found.")
            print("[Firebase] Set FIREBASE_CREDENTIALS_JSON or FIREBASE_CREDENTIALS_PATH in .env")
            print("[Firebase] Or place serviceAccountKey.json in backend/")
            return None

    # 3. Initialize Firebase Admin SDK (only once)
    try:
        if not firebase_admin._apps:
            firebase_admin.initialize_app(cred)
            print("[Firebase] Admin SDK initialized")

        _db = firestore.client()
        print("[Firebase] Firestore client ready")
        return _db

    except Exception as e:
        print(f"[Firebase] Initialization failed: {e}")
        return None
