"""
backend/api/v1/dna.py
─────────────────────
Style DNA 분석 엔드포인트

POST /api/v1/dna/analyze-body   — 전신 사진 → 체형(BodyShape) 분석
POST /api/v1/dna/analyze-color  — 얼굴 사진 → PCCS 16 퍼스널컬러 분석

AI 우선순위: Anthropic Claude-3.5-Sonnet → OpenAI GPT-4o-mini → Demo(Fallback)
"""
from __future__ import annotations

import base64
import json
import os
from typing import Optional

from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel

router = APIRouter()


# ── Response models ──────────────────────────────────────────────────────────

class BodyAnalysisResult(BaseModel):
    shape: str                         # HOURGLASS | INVERTED_TRIANGLE | PEAR | RECTANGLE
    confidence: float
    reasoning: str
    estimated_bust:  Optional[int] = None
    estimated_waist: Optional[int] = None
    estimated_hip:   Optional[int] = None


class ColorAnalysisResult(BaseModel):
    season:     str   # SPRING | SUMMER | AUTUMN | WINTER
    sub_tone:   str   # LIGHT | VIVID | DEEP | MUTED
    label:      str
    label_ko:   str
    reasoning:  str
    confidence: float


# ── Prompts ──────────────────────────────────────────────────────────────────

_BODY_PROMPT = """\
You are an expert body shape analyst. Analyze this full-body photo and determine the body shape.

Examine:
1. Relative shoulder width vs hip width
2. Waist definition and narrowing
3. Overall silhouette proportions

Classify into exactly ONE:
- HOURGLASS: Balanced shoulders & hips, clearly defined narrower waist
- INVERTED_TRIANGLE: Shoulders noticeably broader than hips
- PEAR: Hips noticeably wider than shoulders
- RECTANGLE: Shoulders, waist, hips roughly similar (little waist definition)

Estimate circumference measurements in cm if the photo makes it feasible (otherwise use null).

Respond ONLY with valid JSON — no markdown, no extra text:
{"shape":"HOURGLASS|INVERTED_TRIANGLE|PEAR|RECTANGLE","confidence":0.0,"reasoning":"Korean text","estimated_bust":null,"estimated_waist":null,"estimated_hip":null}
"""

_COLOR_PROMPT = """\
당신은 한국 강남의 공인 PCCS 퍼스널컬러 컨설턴트입니다. 16타입 시스템을 사용합니다.

이 얼굴 사진을 전문 드레이핑 테스트 방식으로 분석하세요.

【분석 항목】
1. 피부 언더톤: 웜(황금/복숭아 기반) vs 쿨(핑크/블루 기반) vs 뉴트럴
2. 피부 명도: 밝음(Light) / 중간(Medium) / 깊음(Deep)
3. 피부 채도: 선명(Vivid/Clear) vs 차분(Muted/Soft)
4. 눈동자 색, 자연 모발색
5. 얼굴 대비(Contrast): 눈·눈썹·입술 vs 피부색 차이

【드레이핑 원리 적용】
각 시즌 대표색 패브릭을 얼굴 아래에 가져다 댔을 때:
- 베스트: 피부가 균일하고 생기 있게, 눈이 맑고 반짝이게 보임
- 워스트: 피부가 칙칙·누렇게 변하고, 다크서클·잡티가 두드러짐

【16 PCCS 타입】
SPRING: Light Spring, Warm Spring, Clear Spring, Soft Spring
SUMMER: Light Summer, Cool Summer, Muted Summer, Soft Summer
AUTUMN: Warm Autumn, Deep Autumn, Muted Autumn, Soft Autumn
WINTER: Cool Winter, Deep Winter, Clear Winter, Soft Winter

JSON만 응답하세요 (마크다운 절대 금지):
{"season":"SPRING|SUMMER|AUTUMN|WINTER","sub_tone":"LIGHT|VIVID|DEEP|MUTED","label":"English label","label_ko":"한국어 라벨","reasoning":"상세 분석 이유(한국어, 3–5문장)","confidence":0.0}
"""


# ── Shared vision AI caller ───────────────────────────────────────────────────

async def _call_vision(image_bytes: bytes, prompt: str, mime: str = "image/jpeg") -> dict:
    """Try Anthropic → OpenAI → raise 503."""
    b64 = base64.standard_b64encode(image_bytes).decode("utf-8")

    anthropic_key = os.environ.get("ANTHROPIC_API_KEY")
    if anthropic_key:
        try:
            import anthropic as ant
            client = ant.Anthropic(api_key=anthropic_key)
            resp = client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=1024,
                messages=[{
                    "role": "user",
                    "content": [
                        {"type": "image", "source": {"type": "base64", "media_type": mime, "data": b64}},
                        {"type": "text", "text": prompt},
                    ],
                }],
            )
            raw = resp.content[0].text.strip()
            # Strip accidental markdown fences
            if raw.startswith("```"):
                raw = raw.split("```")[1].lstrip("json").strip()
            return json.loads(raw)
        except Exception as e:
            # Fall through to OpenAI
            print(f"[DNA] Anthropic failed: {e}")

    openai_key = os.environ.get("OPENAI_API_KEY")
    if openai_key:
        try:
            import openai as oai
            client = oai.OpenAI(api_key=openai_key)
            resp = client.chat.completions.create(
                model="gpt-4o-mini",
                max_tokens=1024,
                messages=[{
                    "role": "user",
                    "content": [
                        {"type": "image_url", "image_url": {"url": f"data:{mime};base64,{b64}"}},
                        {"type": "text", "text": prompt},
                    ],
                }],
            )
            raw = resp.choices[0].message.content.strip()
            if raw.startswith("```"):
                raw = raw.split("```")[1].lstrip("json").strip()
            return json.loads(raw)
        except Exception as e:
            print(f"[DNA] OpenAI failed: {e}")

    raise HTTPException(status_code=503, detail="AI 분석 서비스를 사용할 수 없습니다. API 키를 확인해주세요.")


# ── Demo fallbacks ────────────────────────────────────────────────────────────

_DEMO_BODY = BodyAnalysisResult(
    shape="HOURGLASS",
    confidence=0.65,
    reasoning="(데모) 어깨와 힙 너비가 유사하고 허리 라인이 다소 들어가 보여 모래시계형으로 추정합니다. 정확한 분석을 위해 API 키를 등록하세요.",
    estimated_bust=88, estimated_waist=68, estimated_hip=90,
)

_DEMO_COLOR = ColorAnalysisResult(
    season="SPRING", sub_tone="LIGHT", label="Light Spring", label_ko="라이트 스프링",
    confidence=0.55,
    reasoning="(데모) 피부 베이스가 따뜻하고 밝은 편으로 스프링 타입으로 추정합니다. 정확한 분석을 위해 API 키를 등록하세요.",
)


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/analyze-body", response_model=BodyAnalysisResult)
async def analyze_body(file: UploadFile = File(...)) -> BodyAnalysisResult:
    """전신 사진에서 체형을 분석합니다."""
    image_bytes = await file.read()
    if len(image_bytes) > 8 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="이미지 크기는 8MB 이하여야 합니다.")

    if not os.environ.get("ANTHROPIC_API_KEY") and not os.environ.get("OPENAI_API_KEY"):
        return _DEMO_BODY

    mime = file.content_type or "image/jpeg"
    raw = await _call_vision(image_bytes, _BODY_PROMPT, mime)

    valid_shapes = {"HOURGLASS", "INVERTED_TRIANGLE", "PEAR", "RECTANGLE"}
    shape = str(raw.get("shape", "RECTANGLE")).upper()
    if shape not in valid_shapes:
        shape = "RECTANGLE"

    return BodyAnalysisResult(
        shape=shape,
        confidence=float(raw.get("confidence", 0.6)),
        reasoning=str(raw.get("reasoning", "")),
        estimated_bust=raw.get("estimated_bust"),
        estimated_waist=raw.get("estimated_waist"),
        estimated_hip=raw.get("estimated_hip"),
    )


@router.post("/analyze-color", response_model=ColorAnalysisResult)
async def analyze_color(file: UploadFile = File(...)) -> ColorAnalysisResult:
    """얼굴 사진에서 PCCS 16타입 퍼스널컬러를 분석합니다."""
    image_bytes = await file.read()
    if len(image_bytes) > 8 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="이미지 크기는 8MB 이하여야 합니다.")

    if not os.environ.get("ANTHROPIC_API_KEY") and not os.environ.get("OPENAI_API_KEY"):
        return _DEMO_COLOR

    mime = file.content_type or "image/jpeg"
    raw = await _call_vision(image_bytes, _COLOR_PROMPT, mime)

    valid_seasons  = {"SPRING", "SUMMER", "AUTUMN", "WINTER"}
    valid_subtones = {"LIGHT", "VIVID", "DEEP", "MUTED"}

    season   = str(raw.get("season",   "SPRING")).upper()
    sub_tone = str(raw.get("sub_tone", "LIGHT")).upper()
    if season   not in valid_seasons:  season   = "SPRING"
    if sub_tone not in valid_subtones: sub_tone = "LIGHT"

    return ColorAnalysisResult(
        season=season,
        sub_tone=sub_tone,
        label=str(raw.get("label", f"{season.title()} {sub_tone.title()}")),
        label_ko=str(raw.get("label_ko", "")),
        reasoning=str(raw.get("reasoning", "")),
        confidence=float(raw.get("confidence", 0.6)),
    )
