from fastapi import APIRouter

from backend.api.v1.scan import router as scan_router

router = APIRouter()
router.include_router(scan_router, prefix="/scan", tags=["Scan & Vision"])
