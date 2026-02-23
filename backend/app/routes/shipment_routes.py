"""
Shipment API routes — 3-way logistics workflow.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.shipment_service import (
    propose_shipment,
    approve_shipment,
    update_shipment_status,
    generate_route,
    get_available_shipments,
    get_shipments_by_provider,
    get_shipments_by_farmer,
    get_shipments_by_buyer,
)

router = APIRouter(tags=["shipments"])


class ProposeShipmentRequest(BaseModel):
    shipmentId: str
    logisticsProviderId: str
    proposedRoute: str
    estimatedCost: float


class ApproveShipmentRequest(BaseModel):
    shipmentId: str
    approved: bool


class UpdateStatusRequest(BaseModel):
    shipmentId: str
    newStatus: str


class GenerateRouteRequest(BaseModel):
    shipmentId: str


@router.get("/logistics/available-shipments")
async def available_shipments():
    try:
        shipments = get_available_shipments()
        return {"shipments": shipments}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/logistics/propose-shipment")
async def propose_shipment_route(req: ProposeShipmentRequest):
    try:
        result = propose_shipment(
            req.shipmentId, req.logisticsProviderId,
            req.proposedRoute, req.estimatedCost
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/buyer/approve-shipment")
async def approve_shipment_route(req: ApproveShipmentRequest):
    try:
        result = approve_shipment(req.shipmentId, req.approved)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/logistics/update-status")
async def update_status_route(req: UpdateStatusRequest):
    try:
        result = update_shipment_status(req.shipmentId, req.newStatus)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/logistics/my-shipments/{logistics_provider_id}")
async def my_shipments(logistics_provider_id: str):
    try:
        shipments = get_shipments_by_provider(logistics_provider_id)
        return {"shipments": shipments}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/farmer/shipments/{farmer_id}")
async def farmer_shipments(farmer_id: str):
    try:
        shipments = get_shipments_by_farmer(farmer_id)
        return {"shipments": shipments}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/buyer/shipments/{buyer_id}")
async def buyer_shipments(buyer_id: str):
    try:
        shipments = get_shipments_by_buyer(buyer_id)
        return {"shipments": shipments}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/logistics/generate-route")
async def generate_route_endpoint(req: GenerateRouteRequest):
    try:
        result = generate_route(req.shipmentId)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
