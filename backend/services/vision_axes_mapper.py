"""
vision_axes_mapper.py
=====================
Vision 분석 결과(VisionItemResult) → StylingAxes 변환 엔진.

파이프라인:
  1. VisionItemResult.item_type → outfit_axes_estimator._ITEM_BASE_AXES에서 기본 축 조회
  2. 5가지 디테일 속성(네크라인·실루엣·소매·길이·프린트) 보너스 테이블 적용
  3. 각 축 값을 [0.0, 1.0]으로 클램핑
  4. StylingAxes 반환 + 적용된 보너스 내역 기록 (axes_source_note)

소재(material)는 Claude가 holistic하게 판단한 item 분위기에 이미 녹아 있으므로
별도 보너스 테이블 없이 기본 axes에 반영된다고 간주한다.

보너스 강도 가이드:
  +0.20 이상 : 이 속성이 해당 축의 핵심 드라이버 (예: 퍼프 슬리브 → romantic)
  +0.10~0.15 : 유의미한 기여
  +0.05~0.09 : 미세 조정
  음수      : 해당 축을 자연스럽게 낮추는 속성
"""
from __future__ import annotations

from backend.models.outfit import ItemType
from backend.models.style_dna import StylingAxes
from backend.models.vision import (
    Length,
    Neckline,
    PrintPattern,
    Silhouette,
    SleeveType,
    VisionItemResult,
)
from backend.services.outfit_axes_estimator import _ITEM_BASE_AXES

# 기본 StylingAxes (ItemType 매핑이 없을 때의 중간값 폴백)
_FALLBACK_AXES = StylingAxes(
    elegance=0.50, authority=0.35, effortless=0.50,
    romantic=0.40, boldness=0.35, formality=2,
)

# ---------------------------------------------------------------------------
# 5가지 디테일 보너스 테이블
# key  : 속성 Enum 값
# value: {axis_name: delta}  — 양수=가산, 음수=감산
# ---------------------------------------------------------------------------

_NECKLINE_BONUS: dict[str, dict[str, float]] = {
    Neckline.V_NECK:       {"elegance": +0.05, "romantic": +0.10},
    Neckline.SCOOP_NECK:   {"elegance": +0.03, "romantic": +0.08},
    Neckline.OFF_SHOULDER: {"romantic": +0.20, "boldness": +0.10, "authority": -0.12},
    Neckline.HIGH_NECK:    {"elegance": +0.12, "authority": +0.08, "romantic": -0.05},
    Neckline.SQUARE_NECK:  {"elegance": +0.08, "romantic": +0.12, "boldness": +0.05},
    Neckline.DEEP_V:       {"romantic": +0.15, "boldness": +0.15, "authority": -0.15},
    Neckline.BOAT_NECK:    {"elegance": +0.12, "authority": +0.05},
    Neckline.COLLAR:       {"authority": +0.10, "effortless": -0.05},
    Neckline.CREW_NECK:    {"effortless": +0.05},
    Neckline.HALTER:       {"boldness": +0.15, "romantic": +0.10, "authority": -0.15},
    Neckline.NONE:         {},
}

_SILHOUETTE_BONUS: dict[str, dict[str, float]] = {
    Silhouette.A_LINE:       {"elegance": +0.08, "romantic": +0.10},
    Silhouette.H_LINE:       {"elegance": +0.15, "authority": +0.05},
    Silhouette.FIT_AND_FLARE:{"elegance": +0.10, "romantic": +0.15},
    Silhouette.OVERSIZED:    {"effortless": +0.20, "authority": -0.10, "boldness": +0.10},
    Silhouette.FITTED:       {"elegance": +0.05, "romantic": +0.05, "boldness": +0.08},
    Silhouette.BOXY:         {"effortless": +0.15, "authority": -0.08},
    Silhouette.WRAP:         {"elegance": +0.08, "romantic": +0.15},
    Silhouette.STRAIGHT:     {"authority": +0.05},
}

_SLEEVE_BONUS: dict[str, dict[str, float]] = {
    SleeveType.PUFF:           {"romantic": +0.22, "boldness": +0.10, "authority": -0.10},
    SleeveType.BELL:           {"romantic": +0.15, "elegance": +0.10},
    SleeveType.OFF_SHOULDER_SL:{"romantic": +0.20, "boldness": +0.10, "authority": -0.12},
    SleeveType.FLARE:          {"elegance": +0.12, "romantic": +0.12},
    SleeveType.SLEEVELESS:     {"boldness": +0.08, "effortless": +0.10},
    SleeveType.LONG:           {"elegance": +0.05, "authority": +0.05},
    SleeveType.SHORT:          {"effortless": +0.08},
    SleeveType.THREE_QUARTER:  {"elegance": +0.08},
    SleeveType.NONE:           {},
}

_LENGTH_BONUS: dict[str, dict[str, float]] = {
    Length.MICRO: {"boldness": +0.22, "romantic": +0.10, "authority": -0.22},
    Length.MINI:  {"boldness": +0.15, "romantic": +0.08, "effortless": +0.05},
    Length.KNEE:  {},
    Length.MIDI:  {"elegance": +0.10, "authority": +0.05},
    Length.MAXI:  {"elegance": +0.22, "romantic": +0.10, "authority": +0.05},
    Length.NONE:  {},
}

_PRINT_BONUS: dict[str, dict[str, float]] = {
    PrintPattern.SOLID:     {},
    PrintPattern.FLORAL:    {"romantic": +0.22, "boldness": +0.08, "authority": -0.10},
    PrintPattern.STRIPE:    {"authority": +0.08, "effortless": +0.05},
    PrintPattern.CHECK:     {"authority": +0.05, "effortless": +0.08},
    PrintPattern.ANIMAL:    {"boldness": +0.25, "effortless": +0.05, "elegance": -0.10},
    PrintPattern.ABSTRACT:  {"boldness": +0.15, "authority": -0.08},
    PrintPattern.GEOMETRIC: {"boldness": +0.10, "authority": +0.05},
    PrintPattern.LOGO:      {"boldness": +0.15, "effortless": +0.10, "elegance": -0.15},
    PrintPattern.MIXED:     {"boldness": +0.10},
}

_ALL_BONUS_TABLES: list[dict[str, dict[str, float]]] = [
    _NECKLINE_BONUS,
    _SILHOUETTE_BONUS,
    _SLEEVE_BONUS,
    _LENGTH_BONUS,
    _PRINT_BONUS,
]

_AXIS_KEYS: list[str] = ["elegance", "authority", "effortless", "romantic", "boldness"]


# ---------------------------------------------------------------------------
# 내부 유틸
# ---------------------------------------------------------------------------

def _axes_to_dict(axes: StylingAxes) -> dict[str, float]:
    return {k: getattr(axes, k) for k in _AXIS_KEYS}


def _dict_to_axes(d: dict[str, float], formality: int) -> StylingAxes:
    return StylingAxes(
        elegance=round(max(0.0, min(1.0, d["elegance"])), 4),
        authority=round(max(0.0, min(1.0, d["authority"])), 4),
        effortless=round(max(0.0, min(1.0, d["effortless"])), 4),
        romantic=round(max(0.0, min(1.0, d["romantic"])), 4),
        boldness=round(max(0.0, min(1.0, d["boldness"])), 4),
        formality=formality,
    )


def _apply_bonus(
    vec: dict[str, float],
    bonus_table: dict[str, dict[str, float]],
    attribute_value: str,
) -> tuple[dict[str, float], list[str]]:
    """
    단일 보너스 테이블을 적용하고, 적용된 내역 문자열 목록을 반환한다.
    매핑에 없는 값이면 변화 없음.
    """
    notes: list[str] = []
    bonus = bonus_table.get(attribute_value, {})
    for axis, delta in bonus.items():
        if axis in vec and delta != 0:
            old = vec[axis]
            vec[axis] += delta
            notes.append(f"{attribute_value}→{axis}{'+' if delta > 0 else ''}{delta:.2f} ({old:.2f}→{vec[axis]:.2f})")
    return vec, notes


# ---------------------------------------------------------------------------
# 공개 API
# ---------------------------------------------------------------------------

def compute_axes_from_vision(result: VisionItemResult) -> VisionItemResult:
    """
    VisionItemResult를 받아 estimated_axes를 계산하여 채운 뒤 반환한다.

    순서:
      1. ItemType 기본 axes (outfit_axes_estimator._ITEM_BASE_AXES)
      2. 5가지 디테일 보너스 순차 적용
      3. formality는 기본 axes에서 가져옴 (보너스 없음)
      4. 모든 축 [0, 1] 클램핑
    """
    # 1. 기본 axes
    try:
        item_type_enum = ItemType(result.item_type)
        base_axes = _ITEM_BASE_AXES.get(item_type_enum, _FALLBACK_AXES)
    except ValueError:
        base_axes = _FALLBACK_AXES

    vec = _axes_to_dict(base_axes)
    all_notes: list[str] = []

    # 2. 디테일 보너스 적용
    attr_values = [
        (result.neckline.value,      _NECKLINE_BONUS),
        (result.silhouette.value,    _SILHOUETTE_BONUS),
        (result.sleeve.value,        _SLEEVE_BONUS),
        (result.length.value,        _LENGTH_BONUS),
        (result.print_pattern.value, _PRINT_BONUS),
    ]
    for attr_val, table in attr_values:
        vec, notes = _apply_bonus(vec, table, attr_val)
        all_notes.extend(notes)

    # 3. formality는 ItemType 기본값 그대로
    axes = _dict_to_axes(vec, base_axes.formality)
    source_note = " | ".join(all_notes) if all_notes else "기본값 (보너스 없음)"

    return result.model_copy(update={
        "estimated_axes": axes,
        "axes_source_note": source_note,
    })


def apply_user_correction(
    result: VisionItemResult,
    corrections: dict[str, str],
) -> VisionItemResult:
    """
    HITL 단계에서 사용자가 수정한 속성값을 반영하고 axes를 재계산한다.

    Args:
        result      : 기존 VisionItemResult
        corrections : {"neckline": "square_neck", "color": "ivory"} 형태의 수정 딕셔너리

    Returns:
        수정된 VisionItemResult (axes 재계산 포함)
    """
    updates: dict = {}

    if "neckline" in corrections:
        updates["neckline"] = result.neckline.model_copy(
            update={"value": corrections["neckline"], "confidence": 1.0}
        )
    if "silhouette" in corrections:
        updates["silhouette"] = result.silhouette.model_copy(
            update={"value": corrections["silhouette"], "confidence": 1.0}
        )
    if "sleeve" in corrections:
        updates["sleeve"] = result.sleeve.model_copy(
            update={"value": corrections["sleeve"], "confidence": 1.0}
        )
    if "length" in corrections:
        updates["length"] = result.length.model_copy(
            update={"value": corrections["length"], "confidence": 1.0}
        )
    if "print" in corrections:
        updates["print_pattern"] = result.print_pattern.model_copy(
            update={"value": corrections["print"], "confidence": 1.0}
        )
    if "color" in corrections:
        updates["color"] = result.color.model_copy(
            update={"dominant": corrections["color"], "confidence": 1.0}
        )
    if "item_type" in corrections:
        updates["item_type"] = corrections["item_type"]
        updates["item_confidence"] = 1.0

    corrected = result.model_copy(update={**updates, "hitl_flags": [], "needs_hitl": False})
    return compute_axes_from_vision(corrected)
