"""
main.py
=======
CHARIS AI FastAPI 애플리케이션 진입점.
"""
from __future__ import annotations

from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# .env 파일을 프로젝트 루트에서 로드 (uvicorn 실행 전 환경 변수 주입)
load_dotenv(Path(__file__).parent.parent / ".env")

from backend.api.v1 import router as v1_router

app = FastAPI(
    title="CHARIS AI Backend",
    description="The Graceful Style Coach — Vision · TPO · Style DNA API",
    version="0.1.0",
)

# CORS — Next.js dev server + same-origin production
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(v1_router, prefix="/api/v1")


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "service": "charis-backend"}
