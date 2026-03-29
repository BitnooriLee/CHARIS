from fastapi import APIRouter

from backend.api.v1.scan import router as scan_router
from backend.api.v1.dna  import router as dna_router

router = APIRouter()
router.include_router(scan_router, prefix="/scan", tags=["Scan & Vision"])
router.include_router(dna_router,  prefix="/dna",  tags=["Style DNA"])
