"""
outfit.py
=========
옷장 아이템 및 코디(Outfit) 데이터 모델.

추정 경로:
  1. Rule-based  : ItemType → 기본 StylingAxes 조회 (outfit_axes_estimator.py)
  2. AI Vision   : 사진 분석 결과를 직접 StylingAxes에 주입 (추후 연동)
"""
from __future__ import annotations

from enum import Enum
from typing import Optional
from uuid import UUID, uuid4

from pydantic import BaseModel, Field

from backend.models.style_dna import StylingAxes


# ---------------------------------------------------------------------------
# 아이템 타입 분류
# ---------------------------------------------------------------------------

class ItemCategory(str, Enum):
    TOP = "top"
    BOTTOM = "bottom"
    DRESS = "dress"
    OUTERWEAR = "outerwear"
    SHOES = "shoes"
    BAG = "bag"
    ACCESSORY = "accessory"


class ItemType(str, Enum):
    # ── Tops ──────────────────────────────────────────────────────────────
    BLOUSE = "blouse"               # 블라우스
    BUTTON_DOWN = "button_down"     # 셔츠/버튼다운
    KNIT = "knit"                   # 니트·스웨터
    T_SHIRT = "t_shirt"             # 티셔츠
    CROP_TOP = "crop_top"           # 크롭탑
    SLEEVELESS = "sleeveless"       # 민소매·나시

    # ── Bottoms ───────────────────────────────────────────────────────────
    MINI_SKIRT = "mini_skirt"       # 미니스커트
    MIDI_SKIRT = "midi_skirt"       # 미디스커트
    MAXI_SKIRT = "maxi_skirt"       # 맥시스커트
    SLIM_PANTS = "slim_pants"       # 슬림·스트레이트 팬츠
    WIDE_PANTS = "wide_pants"       # 와이드 팬츠
    JEANS = "jeans"                 # 청바지
    SHORTS = "shorts"               # 반바지
    LEGGINGS = "leggings"           # 레깅스

    # ── Dresses ───────────────────────────────────────────────────────────
    MINI_DRESS = "mini_dress"       # 미니 원피스
    MIDI_DRESS = "midi_dress"       # 미디 원피스
    MAXI_DRESS = "maxi_dress"       # 맥시 원피스

    # ── Outerwear ─────────────────────────────────────────────────────────
    BLAZER = "blazer"               # 블레이저
    SUIT_JACKET = "suit_jacket"     # 정장 재킷
    CARDIGAN = "cardigan"           # 가디건
    TRENCH_COAT = "trench_coat"     # 트렌치코트
    PUFFER = "puffer"               # 패딩
    LEATHER_JACKET = "leather_jacket"  # 가죽 재킷
    DENIM_JACKET = "denim_jacket"   # 데님 재킷


# 아이템 타입 → 카테고리 매핑
ITEM_CATEGORY_MAP: dict[ItemType, ItemCategory] = {
    ItemType.BLOUSE:          ItemCategory.TOP,
    ItemType.BUTTON_DOWN:     ItemCategory.TOP,
    ItemType.KNIT:            ItemCategory.TOP,
    ItemType.T_SHIRT:         ItemCategory.TOP,
    ItemType.CROP_TOP:        ItemCategory.TOP,
    ItemType.SLEEVELESS:      ItemCategory.TOP,
    ItemType.MINI_SKIRT:      ItemCategory.BOTTOM,
    ItemType.MIDI_SKIRT:      ItemCategory.BOTTOM,
    ItemType.MAXI_SKIRT:      ItemCategory.BOTTOM,
    ItemType.SLIM_PANTS:      ItemCategory.BOTTOM,
    ItemType.WIDE_PANTS:      ItemCategory.BOTTOM,
    ItemType.JEANS:           ItemCategory.BOTTOM,
    ItemType.SHORTS:          ItemCategory.BOTTOM,
    ItemType.LEGGINGS:        ItemCategory.BOTTOM,
    ItemType.MINI_DRESS:      ItemCategory.DRESS,
    ItemType.MIDI_DRESS:      ItemCategory.DRESS,
    ItemType.MAXI_DRESS:      ItemCategory.DRESS,
    ItemType.BLAZER:          ItemCategory.OUTERWEAR,
    ItemType.SUIT_JACKET:     ItemCategory.OUTERWEAR,
    ItemType.CARDIGAN:        ItemCategory.OUTERWEAR,
    ItemType.TRENCH_COAT:     ItemCategory.OUTERWEAR,
    ItemType.PUFFER:          ItemCategory.OUTERWEAR,
    ItemType.LEATHER_JACKET:  ItemCategory.OUTERWEAR,
    ItemType.DENIM_JACKET:    ItemCategory.OUTERWEAR,
}

# 카테고리별 시각적 비중 (축 집계 가중치)
# 드레스와 아우터가 전체 코디 인상을 가장 강하게 결정한다
CATEGORY_VISUAL_WEIGHT: dict[ItemCategory, float] = {
    ItemCategory.DRESS:      1.0,
    ItemCategory.OUTERWEAR:  0.85,
    ItemCategory.TOP:        0.6,
    ItemCategory.BOTTOM:     0.55,
    ItemCategory.SHOES:      0.3,
    ItemCategory.BAG:        0.2,
    ItemCategory.ACCESSORY:  0.15,
}


# ---------------------------------------------------------------------------
# 아이템 / 코디 모델
# ---------------------------------------------------------------------------

class AxesSource(str, Enum):
    """StylingAxes 추정 출처."""
    RULE_BASED = "rule_based"   # ItemType 기반 규칙
    AI_VISION  = "ai_vision"    # AI 사진 분석


class OutfitItem(BaseModel):
    """옷장 단일 아이템."""

    item_id: UUID = Field(default_factory=uuid4)
    item_type: ItemType
    name: Optional[str] = Field(None, description="아이템 별칭 (예: '흰 린넨 블라우스')")
    color_hint: Optional[str] = Field(None, description="대표 색상 힌트 (예: 'ivory', 'navy')")

    # None이면 outfit_axes_estimator가 item_type에서 추정한다
    axes: Optional[StylingAxes] = Field(None, description="스타일링 축 (직접 입력 또는 추정)")
    axes_source: Optional[AxesSource] = None


class Outfit(BaseModel):
    """
    한 벌의 코디 — 복수 아이템의 집합.
    estimated_axes가 None이면 estimate_outfit_axes()를 먼저 호출해야 한다.
    """

    outfit_id: UUID = Field(default_factory=uuid4)
    label: Optional[str] = Field(None, description="코디 라벨 (예: '소개팅 봄 코디')")
    items: list[OutfitItem] = Field(default_factory=list)

    # 집계된 코디 전체의 스타일링 축 — score_outfit_tpo()의 입력값
    estimated_axes: Optional[StylingAxes] = Field(
        None,
        description="아이템 축을 가중 집계한 코디 전체 StylingAxes",
    )
