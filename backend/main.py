import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()
from app.routes.prediction_routes import router as prediction_router
from app.routes.demand_routes import router as demand_router
from app.routes.commitment_routes import router as commitment_router
from app.routes.shipment_routes import router as shipment_router

app = FastAPI(
    title="Vasudha API",
    description="Backend for Vasudha — crop prediction, harvest planning, and profit estimation",
    version="1.0.0",
)

# CORS — production-safe: only allow known origins
allowed_origins = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://localhost:8080"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routes under /api prefix
app.include_router(prediction_router, prefix="/api")
app.include_router(demand_router, prefix="/api")
app.include_router(commitment_router, prefix="/api")
app.include_router(shipment_router, prefix="/api")


@app.get("/")
def root():
    return {"message": "Vasudha API is running", "docs": "/docs"}


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port)

