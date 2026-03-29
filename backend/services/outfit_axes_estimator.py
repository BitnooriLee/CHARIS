"""
outfit_axes_estimator.py
========================
아이템 타입 기반 규칙 테이블로 Outfit의 StylingAxes를 추정한다.

두 가지 추정 경로:
  1. estimate_from_metadata() : ItemType 룩업 테이블 → 아이템별 기본 축 할당
  2. inject_from_vision()     : AI 비전 분석 결과를 직접 주입 (인터페이스 정의)

집계 방식:
  - 아이템 카테고리별 시각적 비중(CATEGORY_VISUAL_WEIGHT)으로 가중 평균
  - 드레스 또는 아우터가 있을 경우 해당 아이템의 비중이 코디 인상을 지배한다
"""
from __future__ import annotations

from backend.models.outfit import (
    AxesSource,
    CATEGORY_VISUAL_WEIGHT,
    ITEM_CATEGORY_MAP,
    ItemType,
    Outfit,
    OutfitItem,
)
from backend.models.style_dna import StylingAxes


# ---------------------------------------------------------------------------
# 아이템 타입 → 기본 StylingAxes 룩업 테이블
# (formality는 아이템 자체의 격식 수준)
# ---------------------------------------------------------------------------
_ITEM_BASE_AXES: dict[ItemType, StylingAxes] = {
    # ── Tops ─────────────────────────────────────────────────────────────
    ItemType.BLOUSE:       StylingAxes(elegance=0.75, authority=0.40, effortless=0.40,
                                        romantic=0.65, boldness=0.30, formality=3),
    ItemType.BUTTON_DOWN:  StylingAxes(elegance=0.60, authority=0.75, effortless=0.40,
                                        romantic=0.20, boldness=0.25, formality=3),
    ItemType.KNIT:         StylingAxes(elegance=0.50, authority=0.25, effortless=0.75,
                                        romantic=0.50, boldness=0.20, formality=2),
    ItemType.T_SHIRT:      StylingAxes(elegance=0.15, authority=0.10, effortless=0.95,
                                        romantic=0.15, boldness=0.25, formality=1),
    ItemType.CROP_TOP:     StylingAxes(elegance=0.30, authority=0.10, effortless=0.60,
                                        romantic=0.55, boldness=0.75, formality=1),
    ItemType.SLEEVELESS:   StylingAxes(elegance=0.40, authority=0.15, effortless=0.65,
                                        romantic=0.50, boldness=0.50, formality=2),

    # ── Bottoms ───────────────────────────────────────────────────────────
    ItemType.MINI_SKIRT:   StylingAxes(elegance=0.50, authority=0.20, effortless=0.50,
                                        romantic=0.75, boldness=0.70, formality=2),
    ItemType.MIDI_SKIRT:   StylingAxes(elegance=0.80, authority=0.40, effortless=0.50,
                                        romantic=0.65, boldness=0.30, formality=3),
    ItemType.MAXI_SKIRT:   StylingAxes(elegance=0.85, authority=0.35, effortless=0.50,
                                        romantic=0.70, boldness=0.35, formality=3),
    ItemType.SLIM_PANTS:   StylingAxes(elegance=0.60, authority=0.65, effortless=0.50,
                                        romantic=0.20, boldness=0.30, formality=3),
    ItemType.WIDE_PANTS:   StylingAxes(elegance=0.50, authority=0.30, effortless=0.75,
                                        romantic=0.30, boldness=0.50, formality=2),
    ItemType.JEANS:        StylingAxes(elegance=0.25, authority=0.20, effortless=0.85,
                                        romantic=0.30, boldness=0.40, formality=1),
    ItemType.SHORTS:       StylingAxes(elegance=0.15, authority=0.10, effortless=0.90,
                                        romantic=0.30, boldness=0.50, formality=1),
    ItemType.LEGGINGS:     StylingAxes(elegance=0.10, authority=0.10, effortless=0.95,
                                        romantic=0.10, boldness=0.35, formality=1),

    # ── Dresses ───────────────────────────────────────────────────────────
    ItemType.MINI_DRESS:   StylingAxes(elegance=0.60, authority=0.20, effortless=0.40,
                                        romantic=0.80, boldness=0.75, formality=3),
    ItemType.MIDI_DRESS:   StylingAxes(elegance=0.90, authority=0.40, effortless=0.40,
                                        romantic=0.70, boldness=0.40, formality=4),
    ItemType.MAXI_DRESS:   StylingAxes(elegance=0.95, authority=0.40, effortless=0.40,
                                        romantic=0.80, boldness=0.40, formality=4),

    # ── Outerwear ─────────────────────────────────────────────────────────
    ItemType.BLAZER:       StylingAxes(elegance=0.80, authority=0.90, effortless=0.20,
                                        romantic=0.20, boldness=0.45, formality=4),
    ItemType.SUIT_JACKET:  StylingAxes(elegance=0.70, authority=1.00, effortless=0.10,
                                        romantic=0.10, boldness=0.30, formality=5),
    ItemType.CARDIGAN:     StylingAxes(elegance=0.50, authority=0.20, effortless=0.80,
                                        romantic=0.55, boldness=0.20, formality=2),
    ItemType.TRENCH_COAT:  StylingAxes(elegance=0.85, authority=0.65, effortless=0.50,
                                        romantic=0.40, boldness=0.40, formality=3),
    ItemType.PUFFER:       StylingAxes(elegance=0.15, authority=0.10, effortless=0.90,
                                        romantic=0.10, boldness=0.30, formality=1),
    ItemType.LEATHER_JACKET: StylingAxes(elegance=0.40, authority=0.55, effortless=0.60,
                                          romantic=0.20, boldness=0.90, formality=2),
    ItemType.DENIM_JACKET: StylingAxes(elegance=0.25, authority=0.25, effortless=0.80,
                                        romantic=0.30, boldness=0.55, formality=1),
}


# ---------------------------------------------------------------------------
# 내부 유틸
# ---------------------------------------------------------------------------

def _get_item_axes(item: OutfitItem) -> StylingAxes:
    """아이템에 axes가 직접 지정되어 있으면 그것을, 없으면 룩업 테이블을 사용한다."""
    if item.axes is not None:
        return item.axes
    return _ITEM_BASE_AXES[item.item_type]


def _axes_to_vector(axes: StylingAxes) -> dict[str, float]:
    return {
        "elegance":   axes.elegance,
        "authority":  axes.authority,
        "effortless": axes.effortless,
        "romantic":   axes.romantic,
        "boldness":   axes.boldness,
    }


def _vector_to_axes(vec: dict[str, float], formality: int) -> StylingAxes:
    return StylingAxes(
        elegance=round(vec["elegance"], 4),
        authority=round(vec["authority"], 4),
        effortless=round(vec["effortless"], 4),
        romantic=round(vec["romantic"], 4),
        boldness=round(vec["boldness"], 4),
        formality=formality,
    )


# ---------------------------------------------------------------------------
# 공개 API
# ---------------------------------------------------------------------------

def estimate_item_axes(item: OutfitItem) -> OutfitItem:
    """
    단일 아이템의 axes를 룩업 테이블로 채워 반환한다.
    이미 axes가 있으면 그대로 반환한다.
    """
    if item.axes is not None:
        return item
    return item.model_copy(
        update={
            "axes": _ITEM_BASE_AXES[item.item_type],
            "axes_source": AxesSource.RULE_BASED,
        }
    )


def aggregate_outfit_axes(items: list[OutfitItem]) -> StylingAxes:
    """
    아이템 목록의 StylingAxes를 카테고리 시각 비중으로 가중 평균한다.

    드레스·아우터가 포함되어 있으면 코디 전체 인상을 지배하도록
    해당 아이템의 비중이 자동으로 높아진다.
    """
    if not items:
        raise ValueError("아이템 목록이 비어 있습니다.")

    axis_keys = ["elegance", "authority", "effortless", "romantic", "boldness"]
    weighted_sum: dict[str, float] = {k: 0.0 for k in axis_keys}
    total_weight = 0.0
    formality_sum = 0.0

    for item in items:
        axes = _get_item_axes(item)
        category = ITEM_CATEGORY_MAP.get(item.item_type)
        weight = CATEGORY_VISUAL_WEIGHT.get(category, 0.5) if category else 0.5

        vec = _axes_to_vector(axes)
        for k in axis_keys:
            weighted_sum[k] += vec[k] * weight
        formality_sum += axes.formality * weight
        total_weight += weight

    aggregated = {k: weighted_sum[k] / total_weight for k in axis_keys}
    avg_formality = round(formality_sum / total_weight)
    formality_clamped = max(1, min(5, avg_formality))

    return _vector_to_axes(aggregated, formality_clamped)


def estimate_outfit_axes(outfit: Outfit) -> Outfit:
    """
    Outfit 전체의 estimated_axes를 채워 반환한다.
    - 각 아이템의 axes가 None이면 룩업 테이블로 먼저 채운다.
    - 그 후 카테고리 가중 평균으로 코디 전체 axes를 계산한다.
    """
    filled_items = [estimate_item_axes(item) for item in outfit.items]
    outfit_axes = aggregate_outfit_axes(filled_items)
    return outfit.model_copy(
        update={"items": filled_items, "estimated_axes": outfit_axes}
    )


def inject_vision_axes(item: OutfitItem, axes: StylingAxes) -> OutfitItem:
    """
    AI 비전 분석 결과를 아이템의 axes에 직접 주입한다.
    (AI Vision 파이프라인 연동 후 이 함수를 통해 결과를 반영한다.)
    """
    return item.model_copy(
        update={"axes": axes, "axes_source": AxesSource.AI_VISION}
    )
