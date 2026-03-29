"""
scan.py
=======
POST /api/v1/scan/analyze — 의류 이미지 분석 엔드포인트.

흐름:
  1. Multipart 이미지 수신 (UploadFile)
  2. bytes → base64 변환 후 Claude Vision API 호출
  3. vision_axes_mapper로 StylingAxes 산출
  4. score_outfit_tpo()로 TPO Fit Score 계산
  5. ScanAnalyzeResponse 반환

ANTHROPIC_API_KEY 미설정 시 데모 Mock 응답을 반환한다.
"""
from __future__ import annotations

import base64
import os
import uuid
from typing import Optional

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import BaseModel

from backend.models.style_dna import BodyShape, StylingAxes, TPOContext
from backend.services.tpo_scorer import OutfitTPOScore, score_outfit_tpo

router = APIRouter()

# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------

class VisionAttributeOut(BaseModel):
    """프론트엔드 VisionPopup 칩에 1:1 매핑되는 속성."""
    id:          str
    label:       str
    attribute:   str
    confidence:  float
    top:         str          # CSS % (이미지 컨테이너 기준)
    left:        str
    delay_s:     float        # 순차 등장 딜레이 (초)
    color_hex:   Optional[str] = None


class ScanAnalyzeResponse(BaseModel):
    """전체 분석 응답 — 스캔 애니메이션 데이터 + TPO 리포트."""
    item_type:   str
    axes:        StylingAxes
    attributes:  list[VisionAttributeOut]
    tpo_score:   OutfitTPOScore
    session_id:  str
    is_demo:     bool = False


# ---------------------------------------------------------------------------
# 오류 헬퍼
# ---------------------------------------------------------------------------

def _err(code: str, msg: str, retryable: bool = True) -> dict:
    return {"code": code, "user_message": msg, "retryable": retryable}


# ---------------------------------------------------------------------------
# 시각화 위치 + 번역 테이블
# ---------------------------------------------------------------------------

_ATTR_POSITIONS: dict[str, dict] = {
    "neckline":   {"top": "17%", "left": "49%", "delay_s": 1.0},
    "sleeve":     {"top": "40%", "left": "76%", "delay_s": 2.0},
    "silhouette": {"top": "62%", "left": "50%", "delay_s": 2.8},
    "print":      {"top": "50%", "left": "27%", "delay_s": 3.5},
    "color":      {"top": "28%", "left": "24%", "delay_s": 4.0},
}

_KO: dict[str, str] = {
    "v_neck": "V넥", "scoop_neck": "스쿱넥", "high_neck": "하이넥",
    "off_shoulder": "오프숄더", "square_neck": "스퀘어넥", "deep_v": "딥V넥",
    "boat_neck": "보트넥", "collar": "카라", "crew_neck": "크루넥",
    "halter": "할터", "none": "-",
    "a_line": "A라인", "h_line": "H라인", "fit_and_flare": "핏앤플레어",
    "oversized": "오버사이즈", "fitted": "피티드", "boxy": "박시",
    "wrap": "랩", "straight": "스트레이트",
    "sleeveless": "민소매", "short": "반소매", "three_quarter": "7부",
    "long": "긴소매", "puff": "퍼프", "bell": "벨",
    "off_shoulder_sleeve": "오프숄더 슬리브", "flare": "플레어",
    "micro": "초미니", "mini": "미니", "knee": "무릎", "midi": "미디", "maxi": "맥시",
    "solid": "단색", "floral": "플로럴", "stripe": "스트라이프",
    "check": "체크", "animal": "애니멀", "abstract": "추상",
    "geometric": "기하학", "logo": "로고", "mixed": "믹스드",
}


def _build_attrs(vision_result) -> list[VisionAttributeOut]:  # type: ignore[annotation]
    rows = [
        ("neckline",   vision_result.neckline.value,       vision_result.neckline.confidence,       "Neckline"),
        ("sleeve",     vision_result.sleeve.value,         vision_result.sleeve.confidence,         "Sleeve"),
        ("silhouette", vision_result.silhouette.value,     vision_result.silhouette.confidence,     "Silhouette"),
        ("print",      vision_result.print_pattern.value,  vision_result.print_pattern.confidence,  "Print"),
        ("color",      vision_result.color.dominant,       vision_result.color.confidence,          "Color"),
    ]
    out = []
    for attr_id, value, conf, attribute in rows:
        pos = _ATTR_POSITIONS[attr_id]
        label = _KO.get(value, value.replace("_", " ").title()) if attr_id != "color" \
            else value.replace("_", " ").title()
        out.append(VisionAttributeOut(
            id=attr_id,
            label=label,
            attribute=attribute,
            confidence=round(conf, 3),
            **pos,  # top, left, delay_s
        ))
    return out


# ---------------------------------------------------------------------------
# Demo / mock fallback
# ---------------------------------------------------------------------------

def _mock_response(tpo_context: str, body_shape: str) -> ScanAnalyzeResponse:
    """ANTHROPIC_API_KEY 미설정 환경용 데모 응답."""
    mock_axes = StylingAxes(
        elegance=0.75, authority=0.30, effortless=0.65,
        romantic=0.82, boldness=0.28, formality=3,
    )
    try:
        tpo = TPOContext(tpo_context.lower())
    except ValueError:
        tpo = TPOContext.WEDDING_GUEST

    try:
        shape = BodyShape(body_shape.lower())
    except ValueError:
        shape = BodyShape.HOURGLASS

    tpo_score = score_outfit_tpo(mock_axes, tpo, shape)

    mock_attrs = [
        VisionAttributeOut(id="neckline",   label="V넥",         attribute="Neckline",   confidence=0.92, top="17%", left="49%", delay_s=1.0),
        VisionAttributeOut(id="sleeve",     label="7부 소매",     attribute="Sleeve",     confidence=0.88, top="40%", left="76%", delay_s=2.0),
        VisionAttributeOut(id="silhouette", label="A라인",        attribute="Silhouette", confidence=0.85, top="62%", left="50%", delay_s=2.8),
        VisionAttributeOut(id="print",      label="플로럴 패턴",  attribute="Print",      confidence=0.78, top="50%", left="27%", delay_s=3.5),
        VisionAttributeOut(id="color",      label="Dusty Rose",   attribute="Color",      confidence=0.95, top="28%", left="24%", delay_s=4.0, color_hex="#D4A5A5"),
    ]

    return ScanAnalyzeResponse(
        item_type="midi_dress",
        axes=mock_axes,
        attributes=mock_attrs,
        tpo_score=tpo_score,
        session_id=f"demo-{uuid.uuid4().hex[:8]}",
        is_demo=True,
    )


# ---------------------------------------------------------------------------
# 엔드포인트
# ---------------------------------------------------------------------------

@router.post("/analyze", response_model=ScanAnalyzeResponse)
async def analyze_outfit(
    image: UploadFile = File(..., description="의류 사진 (JPEG / PNG / WEBP)"),
    tpo_context: str  = Form("wedding_guest", description="TPO 상황 코드"),
    body_shape:  str  = Form("hourglass",     description="사용자 체형 코드 (소문자)"),
) -> ScanAnalyzeResponse:
    """
    의류 이미지를 분석하여 StylingAxes + TPO Fit Score를 반환한다.

    Provider 우선순위:
      1. ANTHROPIC_API_KEY → Claude Sonnet (최고 정확도)
      2. OPENAI_API_KEY    → GPT-4o-mini  (빠르고 경제적)
      3. 키 없음           → Demo Mock 응답
    """
    has_anthropic = bool(os.getenv("ANTHROPIC_API_KEY"))
    has_openai    = bool(os.getenv("OPENAI_API_KEY"))

    # ── Demo mode when no API key ──────────────────────────────────────────
    if not has_anthropic and not has_openai:
        return _mock_response(tpo_context, body_shape)

    # ── Image size guard (10 MB) ───────────────────────────────────────────
    image_bytes = await image.read()
    if len(image_bytes) > 10 * 1024 * 1024:
        raise HTTPException(
            status_code=413,
            detail=_err("IMAGE_TOO_LARGE", "이미지가 너무 큽니다. 10MB 이하의 사진을 사용해주세요.", False),
        )

    # ── Base64 encode ──────────────────────────────────────────────────────
    image_base64 = base64.standard_b64encode(image_bytes).decode("utf-8")
    media_type   = image.content_type or "image/jpeg"

    # ── Vision analysis (Anthropic → OpenAI fallback) ─────────────────────
    from backend.services.vision_analyzer import (  # lazy import
        analyze_item_image,
        analyze_item_image_openai,
    )

    try:
        if has_anthropic:
            vision_result = await analyze_item_image(image_base64, media_type)
        else:
            vision_result = await analyze_item_image_openai(
                image_base64, media_type, model="gpt-4o-mini"
            )
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=_err("ANALYSIS_FAILED", "분석 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요."),
        ) from exc

    # ── Image quality guard ────────────────────────────────────────────────
    if vision_result.quality.overall_quality < 0.40:
        raise HTTPException(
            status_code=422,
            detail=_err(
                "IMAGE_QUALITY_LOW",
                "조명이 너무 어두워요. 자연광 아래에서 다시 촬영해주세요. ☀️",
            ),
        )

    # ── Vision → StylingAxes ──────────────────────────────────────────────
    from backend.services.vision_axes_mapper import compute_axes_from_vision

    # compute_axes_from_vision returns an enriched VisionItemResult;
    # actual StylingAxes is stored in .estimated_axes
    enriched = compute_axes_from_vision(vision_result)
    axes = enriched.estimated_axes or StylingAxes(
        elegance=0.50, authority=0.35, effortless=0.50,
        romantic=0.40, boldness=0.35, formality=2,
    )
    vision_result = enriched  # use enriched result for attribute chips

    # ── Enum coercion (graceful fallback) ─────────────────────────────────
    try:
        tpo = TPOContext(tpo_context.lower())
    except ValueError:
        tpo = TPOContext.WEDDING_GUEST

    try:
        shape = BodyShape(body_shape.lower())
    except ValueError:
        shape = BodyShape.HOURGLASS

    # ── TPO scoring ────────────────────────────────────────────────────────
    tpo_score = score_outfit_tpo(axes, tpo, shape)

    return ScanAnalyzeResponse(
        item_type=vision_result.item_type,
        axes=axes,
        attributes=_build_attrs(vision_result),
        tpo_score=tpo_score,
        session_id=str(uuid.uuid4()),
        is_demo=False,
    )
