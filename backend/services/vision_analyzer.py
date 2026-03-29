"""
vision_analyzer.py
==================
Claude 3.7 Sonnet Vision API 호출 + 응답 파싱.

흐름:
  1. build_vision_prompt()  : 의류 사진 분석용 System Prompt 반환
  2. call_vision_api()      : Anthropic SDK로 멀티모달 API 호출 (base64 이미지)
  3. parse_vision_response(): 섹션 기반 구조화 텍스트 → VisionItemResult
  4. build_hitl_flags()     : confidence < 0.60인 속성 → HITLFlag 목록 생성

출력 포맷: 섹션 헤더([ITEM], [NECKLINE] 등) + key: value 쌍
→ 정규식으로 파싱하여 Pydantic 모델에 매핑한다.
"""
from __future__ import annotations

import base64
import re
from pathlib import Path
from typing import Optional

from backend.models.vision import (
    AttributeScore,
    ColorAnalysis,
    HITLFlag,
    HITL_CONFIDENCE_THRESHOLD,
    ImageAngle,
    ImageLighting,
    ImageQuality,
    VisionItemResult,
    VisionOutfitResult,
)


# ---------------------------------------------------------------------------
# System Prompt
# ---------------------------------------------------------------------------

VISION_SYSTEM_PROMPT: str = """\
You are CHARIS Vision — a precision fashion item analyzer for the CHARIS AI style coaching system.
Your output powers personalized styling recommendations. Accuracy and structured output are critical.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 1 ─ ITEM TYPE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Choose EXACTLY ONE from the list below.

TOPS     : blouse | button_down | knit | t_shirt | crop_top | sleeveless
BOTTOMS  : mini_skirt | midi_skirt | maxi_skirt | slim_pants | wide_pants | jeans | shorts | leggings
DRESSES  : mini_dress | midi_dress | maxi_dress
OUTERWEAR: blazer | suit_jacket | cardigan | trench_coat | puffer | leather_jacket | denim_jacket

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 2 ─ ATTRIBUTES (each requires a value AND confidence 0.00–1.00)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

NECKLINE (opening shape at the top of the garment):
  v_neck | scoop_neck | high_neck | off_shoulder | square_neck | deep_v |
  boat_neck | collar | crew_neck | halter | none
  → Use "none" for items with no neckline (skirts, pants, etc.)

SILHOUETTE (overall shape / fit of the garment):
  a_line | h_line | fit_and_flare | oversized | fitted | boxy | wrap | straight

SLEEVE (sleeve style):
  sleeveless | short | three_quarter | long | puff | bell | off_shoulder_sleeve | flare | none
  → Use "none" for items with no sleeves (skirts, pants, dresses analyzed separately)

LENGTH (hemline position):
  micro | mini | knee | midi | maxi | none
  → Use "none" for tops/outerwear where hemline is not the defining feature

PRINT (dominant surface pattern):
  solid | floral | stripe | check | animal | abstract | geometric | logo | mixed

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 3 ─ COLOR ANALYSIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
dominant  : descriptive color name (e.g., dusty_rose, cobalt_blue, ivory, charcoal)
family    : broad color family (e.g., pink, blue, neutral, earth, green)
season_hint: map to PCCS season most likely to suit this color:
  spring_warm | spring_light | spring_clear |
  summer_cool | summer_mute | summer_soft |
  autumn_warm | autumn_deep | autumn_mute |
  winter_cool | winter_deep | winter_bright | neutral

Confidence rules:
  - Excellent studio lighting, neutral background → confidence 0.80–0.95
  - Dark/warm lighting, colored background, or shadows → confidence 0.50–0.75
  - Very dark image, heavy filter, or unsure → confidence below 0.50

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 4 ─ IMAGE QUALITY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
lighting        : poor | fair | good | excellent
angle           : front | side | back | flat_lay | mannequin | worn
overall_quality : 0.00–1.00

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OUTPUT FORMAT — use EXACTLY this structure, no extra text outside the blocks
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[ITEM]
type: <value>
confidence: <0.00-1.00>

[NECKLINE]
value: <value>
confidence: <0.00-1.00>

[SILHOUETTE]
value: <value>
confidence: <0.00-1.00>

[SLEEVE]
value: <value>
confidence: <0.00-1.00>

[LENGTH]
value: <value>
confidence: <0.00-1.00>

[PRINT]
value: <value>
confidence: <0.00-1.00>

[COLOR]
dominant: <value>
family: <value>
season_hint: <value>
confidence: <0.00-1.00>

[QUALITY]
lighting: <value>
angle: <value>
overall_quality: <0.00-1.00>

If the photo contains multiple visible items, append additional [ITEM_N] blocks (N = 2, 3, ...) \
with the same structure for each secondary item.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CRITICAL RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. NEVER invent new type or attribute names. Use only values from the lists above.
2. Lower confidence when the item is partially visible, folded, or worn under another item.
3. Material informs your holistic assessment of the item but is NOT a separate output field.
   Silk → elegance impression rises naturally. Reflect this in how you score downstream.
4. A confidence below 0.60 on any field signals uncertainty — the system will ask the user to verify.
5. Do NOT add explanatory prose outside the block format.\
"""

VISION_USER_PROMPT: str = (
    "Please analyze this clothing item and extract its attributes "
    "following the system instructions exactly."
)


# ---------------------------------------------------------------------------
# 파서 유틸
# ---------------------------------------------------------------------------

def _extract_section(text: str, header: str) -> Optional[dict[str, str]]:
    """
    [HEADER] 섹션을 찾아 key: value 쌍 딕셔너리로 반환한다.
    섹션이 없으면 None 반환.
    """
    pattern = rf"\[{re.escape(header)}\]\s*(.*?)(?=\[|\Z)"
    match = re.search(pattern, text, re.DOTALL | re.IGNORECASE)
    if not match:
        return None
    lines = match.group(1).strip().splitlines()
    result: dict[str, str] = {}
    for line in lines:
        if ":" in line:
            key, _, val = line.partition(":")
            result[key.strip().lower()] = val.strip()
    return result if result else None


def _safe_float(value: str, default: float = 0.5) -> float:
    try:
        return max(0.0, min(1.0, float(value)))
    except (ValueError, TypeError):
        return default


def _build_attribute_score(section: Optional[dict[str, str]], fallback_value: str = "none") -> AttributeScore:
    if not section:
        return AttributeScore(value=fallback_value, confidence=0.3)
    return AttributeScore(
        value=section.get("value", fallback_value),
        confidence=_safe_float(section.get("confidence", "0.5")),
    )


def build_hitl_flags(result: VisionItemResult) -> list[HITLFlag]:
    """confidence < 임계값인 속성을 HITLFlag 목록으로 변환한다."""
    _PROMPT_MAP: dict[str, str] = {
        "item_type":   f"아이템 종류가 '{result.item_type}'(으)로 보이는데 맞나요?",
        "neckline":    f"네크라인이 '{result.neckline.value}'(으)로 보이는데 맞나요?",
        "silhouette":  f"실루엣/핏이 '{result.silhouette.value}'(으)로 보이는데 맞나요?",
        "sleeve":      f"소매 스타일이 '{result.sleeve.value}'(으)로 보이는데 맞나요?",
        "length":      f"기장이 '{result.length.value}'(으)로 보이는데 맞나요?",
        "print":       f"패턴이 '{result.print_pattern.value}'(으)로 보이는데 맞나요?",
        "color":       f"주요 색상이 '{result.color.dominant}'(으)로 보이는데 맞나요?",
    }
    flags: list[HITLFlag] = []

    checks: list[tuple[str, float, str]] = [
        ("item_type", result.item_confidence,           result.item_type),
        ("neckline",  result.neckline.confidence,       result.neckline.value),
        ("silhouette",result.silhouette.confidence,     result.silhouette.value),
        ("sleeve",    result.sleeve.confidence,         result.sleeve.value),
        ("length",    result.length.confidence,         result.length.value),
        ("print",     result.print_pattern.confidence,  result.print_pattern.value),
        ("color",     result.color.confidence,          result.color.dominant),
    ]
    for attr_name, confidence, current_val in checks:
        if confidence < HITL_CONFIDENCE_THRESHOLD:
            flags.append(HITLFlag(
                attribute=attr_name,
                current_value=current_val,
                confidence=confidence,
                prompt_kr=_PROMPT_MAP[attr_name],
            ))
    return flags


# ---------------------------------------------------------------------------
# 응답 파서
# ---------------------------------------------------------------------------

def parse_vision_response(raw_text: str) -> VisionItemResult:
    """
    Claude Vision API의 섹션 기반 응답 텍스트를 파싱하여
    VisionItemResult를 반환한다.

    Args:
        raw_text: Claude API 원문 응답

    Returns:
        VisionItemResult (estimated_axes는 vision_axes_mapper가 이후에 채운다)
    """
    item_sec  = _extract_section(raw_text, "ITEM")
    neck_sec  = _extract_section(raw_text, "NECKLINE")
    sil_sec   = _extract_section(raw_text, "SILHOUETTE")
    slv_sec   = _extract_section(raw_text, "SLEEVE")
    len_sec   = _extract_section(raw_text, "LENGTH")
    prn_sec   = _extract_section(raw_text, "PRINT")
    col_sec   = _extract_section(raw_text, "COLOR")
    qlt_sec   = _extract_section(raw_text, "QUALITY")

    item_type       = item_sec.get("type", "unknown") if item_sec else "unknown"
    item_confidence = _safe_float(item_sec.get("confidence", "0.5")) if item_sec else 0.5

    neckline      = _build_attribute_score(neck_sec, "none")
    silhouette    = _build_attribute_score(sil_sec,  "straight")
    sleeve        = _build_attribute_score(slv_sec,  "none")
    length        = _build_attribute_score(len_sec,  "none")
    print_pattern = _build_attribute_score(prn_sec,  "solid")

    color = ColorAnalysis(
        dominant=col_sec.get("dominant", "unknown") if col_sec else "unknown",
        family=col_sec.get("family", "unknown") if col_sec else "unknown",
        season_hint=col_sec.get("season_hint", "neutral") if col_sec else "neutral",
        confidence=_safe_float(col_sec.get("confidence", "0.5")) if col_sec else 0.5,
    )

    quality = ImageQuality(
        lighting=ImageLighting(qlt_sec.get("lighting", "fair")) if qlt_sec else ImageLighting.FAIR,
        angle=ImageAngle(qlt_sec.get("angle", "front")) if qlt_sec else ImageAngle.FRONT,
        overall_quality=_safe_float(qlt_sec.get("overall_quality", "0.7")) if qlt_sec else 0.7,
    )

    partial = VisionItemResult(
        item_type=item_type,
        item_confidence=item_confidence,
        neckline=neckline,
        silhouette=silhouette,
        sleeve=sleeve,
        length=length,
        print_pattern=print_pattern,
        color=color,
        quality=quality,
        needs_hitl=False,
        hitl_flags=[],
    )

    flags = build_hitl_flags(partial)
    return partial.model_copy(update={
        "needs_hitl": len(flags) > 0,
        "hitl_flags": flags,
    })


# ---------------------------------------------------------------------------
# API 호출 래퍼
# ---------------------------------------------------------------------------

def encode_image_to_base64(image_path: str | Path) -> str:
    """이미지 파일을 base64 문자열로 인코딩한다."""
    with open(image_path, "rb") as f:
        return base64.standard_b64encode(f.read()).decode("utf-8")


async def analyze_item_image(
    image_base64: str,
    media_type: str = "image/jpeg",
) -> VisionItemResult:
    """
    Claude 3.7 Sonnet Vision API를 호출하여 단일 아이템 사진을 분석한다.

    Args:
        image_base64 : base64 인코딩된 이미지 문자열
        media_type   : 이미지 MIME 타입 (image/jpeg | image/png | image/webp)
    """
    try:
        import anthropic  # noqa: PLC0415
    except ImportError as e:
        raise RuntimeError(
            "anthropic 패키지가 설치되어 있지 않습니다. pip install anthropic 을 실행하세요."
        ) from e

    client = anthropic.AsyncAnthropic()

    message = await client.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=1024,
        system=VISION_SYSTEM_PROMPT,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": media_type,
                            "data": image_base64,
                        },
                    },
                    {"type": "text", "text": VISION_USER_PROMPT},
                ],
            }
        ],
    )

    raw_text = message.content[0].text
    return parse_vision_response(raw_text)


async def analyze_item_image_openai(
    image_base64: str,
    media_type: str = "image/jpeg",
    model: str = "gpt-4o-mini",
) -> VisionItemResult:
    """
    OpenAI GPT-4o / GPT-4o-mini Vision API로 단일 아이템 사진을 분석한다.

    ANTHROPIC_API_KEY 없이 OPENAI_API_KEY만 있을 때 자동으로 호출된다.

    Args:
        image_base64 : base64 인코딩된 이미지 문자열
        media_type   : 이미지 MIME 타입
        model        : OpenAI 모델명 ("gpt-4o-mini" 또는 "gpt-4o")
    """
    try:
        from openai import AsyncOpenAI  # noqa: PLC0415
    except ImportError as e:
        raise RuntimeError(
            "openai 패키지가 설치되어 있지 않습니다. pip install openai 을 실행하세요."
        ) from e

    client = AsyncOpenAI()  # OPENAI_API_KEY 환경 변수 자동 사용

    response = await client.chat.completions.create(
        model=model,
        max_tokens=1024,
        messages=[
            {
                "role": "system",
                "content": VISION_SYSTEM_PROMPT,
            },
            {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:{media_type};base64,{image_base64}",
                            "detail": "high",
                        },
                    },
                    {
                        "type": "text",
                        "text": VISION_USER_PROMPT,
                    },
                ],
            },
        ],
    )

    raw_text = response.choices[0].message.content or ""
    return parse_vision_response(raw_text)
