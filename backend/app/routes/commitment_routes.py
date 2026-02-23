"""
Commitment routes — buyer→farmer commitment workflow.
"""

from fastapi import APIRouter, HTTPException, Path
from pydantic import BaseModel

from app.firebase_init import get_firestore_client
from app.services.commitment_service import (
    create_commitment,
    update_commitment_status,
    get_commitments_for_farmer,
    get_commitments_for_buyer,
)

router = APIRouter(tags=["Commitments"])


class CreateCommitmentRequest(BaseModel):
    cropId: str
    buyerId: str
    agreedPrice: float
    quantity: float


class UpdateStatusRequest(BaseModel):
    commitmentId: str
    newStatus: str
    userId: str  # the user performing the action


@router.post("/create-commitment")
def api_create_commitment(req: CreateCommitmentRequest):
    db = get_firestore_client()
    if db is None:
        raise HTTPException(status_code=500, detail="Firestore not available")
    try:
        cid = create_commitment(db, req.model_dump())
        return {"success": True, "commitmentId": cid}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/update-commitment-status")
def api_update_status(req: UpdateStatusRequest):
    db = get_firestore_client()
    if db is None:
        raise HTTPException(status_code=500, detail="Firestore not available")
    try:
        result = update_commitment_status(db, req.commitmentId, req.newStatus, req.userId)
        return {"success": True, **result}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/farmer-commitments/{farmer_id}")
def api_farmer_commitments(farmer_id: str = Path(...)):
    db = get_firestore_client()
    if db is None:
        raise HTTPException(status_code=500, detail="Firestore not available")
    commitments = get_commitments_for_farmer(db, farmer_id)
    return {"success": True, "commitments": commitments}


@router.get("/buyer-commitments/{buyer_id}")
def api_buyer_commitments(buyer_id: str = Path(...)):
    db = get_firestore_client()
    if db is None:
        raise HTTPException(status_code=500, detail="Firestore not available")
    commitments = get_commitments_for_buyer(db, buyer_id)
    return {"success": True, "commitments": commitments}
