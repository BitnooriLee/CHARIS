"""
vision.py
=========
Claude Vision API 분석 결과를 담는 데이터 모델.

속성 Enum은 vision_analyzer.py의 System Prompt와 1:1 매핑된다.
값을 추가할 경우 반드시 System Prompt의 VALID VALUES 목록도 함께 수정해야 한다.
"""
from __future__ import annotations

from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field

from backend.models.style_dna import StylingAxes


# ---------------------------------------------------------------------------
# 속성 Enum — System Prompt의 VALID VALUES와 동일한 값을 사용한다
# ---------------------------------------------------------------------------

class Neckline(str, Enum):
    V_NECK          = "v_neck"
    SCOOP_NECK      = "scoop_neck"
    HIGH_NECK       = "high_neck"         # 터틀넥·폴라넥
    OFF_SHOULDER    = "off_shoulder"
    SQUARE_NECK     = "square_neck"
    DEEP_V          = "deep_v"
    BOAT_NECK       = "boat_neck"         # 보트넥
    COLLAR          = "collar"            # 카라·셔츠 칼라
    CREW_NECK       = "crew_neck"         # 라운드넥
    HALTER          = "halter"
    NONE            = "none"              # 스커트·팬츠 등 해당 없음


class Silhouette(str, Enum):
    A_LINE          = "a_line"
    H_LINE          = "h_line"            # 직선형
    FIT_AND_FLARE   = "fit_and_flare"
    OVERSIZED       = "oversized"
    FITTED          = "fitted"            # 몸에 밀착
    BOXY            = "boxy"
    WRAP            = "wrap"              # 랩 실루엣
    STRAIGHT        = "straight"          # 스트레이트


class SleeveType(str, Enum):
    SLEEVELESS      = "sleeveless"
    SHORT           = "short"
    THREE_QUARTER   = "three_quarter"     # 7부
    LONG            = "long"
    PUFF            = "puff"              # 퍼프 슬리브
    BELL            = "bell"              # 벨 슬리브
    OFF_SHOULDER_SL = "off_shoulder_sleeve"
    FLARE           = "flare"
    NONE            = "none"              # 스커트·팬츠 등 해당 없음


class Length(str, Enum):
    MICRO           = "micro"             # 초미니 (허벅지 중간 이상)
    MINI            = "mini"              # 허벅지 하단
    KNEE            = "knee"              # 무릎 길이
    MIDI            = "midi"              # 종아리
    MAXI            = "maxi"              # 발목
    NONE            = "none"              # 상의·아우터 등 해당 없음


class PrintPattern(str, Enum):
    SOLID           = "solid"             # 무지
    FLORAL          = "floral"            # 플로럴
    STRIPE          = "stripe"            # 스트라이프
    CHECK           = "check"             # 체크
    ANIMAL          = "animal"            # 애니멀 프린트
    ABSTRACT        = "abstract"          # 추상적 패턴
    GEOMETRIC       = "geometric"         # 기하학 패턴
    LOGO            = "logo"              # 로고·레터링
    MIXED           = "mixed"             # 복합 패턴


class ImageLighting(str, Enum):
    POOR        = "poor"
    FAIR        = "fair"
    GOOD        = "good"
    EXCELLENT   = "excellent"


class ImageAngle(str, Enum):
    FRONT       = "front"
    SIDE        = "side"
    BACK        = "back"
    FLAT_LAY    = "flat_lay"
    MANNEQUIN   = "mannequin"
    WORN        = "worn"         # 실제 착용 사진


# ---------------------------------------------------------------------------
# 신뢰도 임계값
# ---------------------------------------------------------------------------

HITL_CONFIDENCE_THRESHOLD: float = 0.60   # 이 미만이면 사용자 확인 요청


# ---------------------------------------------------------------------------
# 파싱 결과 모델
# ---------------------------------------------------------------------------

class AttributeScore(BaseModel):
    """단일 속성의 값 + AI 신뢰도."""
    value:      str
    confidence: float = Field(..., ge=0.0, le=1.0)

    @property
    def needs_verify(self) -> bool:
        return self.confidence < HITL_CONFIDENCE_THRESHOLD


class ColorAnalysis(BaseModel):
    """색상 분석 결과."""
    dominant:    str = Field(..., description="주요 색상명 (예: dusty_rose, navy)")
    family:      str = Field(..., description="색상 계열 (예: pink, blue, earth)")
    season_hint: str = Field(..., description="PCCS 시즌 힌트 (예: spring_warm)")
    confidence:  float = Field(..., ge=0.0, le=1.0)

    @property
    def needs_verify(self) -> bool:
        return self.confidence < HITL_CONFIDENCE_THRESHOLD


class ImageQuality(BaseModel):
    """사진 품질 메타데이터."""
    lighting:        ImageLighting
    angle:           ImageAngle
    overall_quality: float = Field(..., ge=0.0, le=1.0)


class HITLFlag(BaseModel):
    """Human-in-the-loop 확인 요청 단위."""
    attribute:      str   = Field(..., description="불확실한 속성명")
    current_value:  str   = Field(..., description="AI가 추정한 현재 값")
    confidence:     float
    prompt_kr:      str   = Field(..., description="사용자에게 보여줄 확인 질문 (한국어)")


class VisionItemResult(BaseModel):
    """
    단일 아이템에 대한 Vision 분석 완료 결과.
    needs_hitl이 True이면 frontend가 HITLFlag 목록을 사용자에게 제시해야 한다.
    """

    # 아이템 분류
    item_type:        str   = Field(..., description="분류된 ItemType 값 (문자열)")
    item_confidence:  float = Field(..., ge=0.0, le=1.0)

    # 5가지 속성
    neckline:         AttributeScore
    silhouette:       AttributeScore
    sleeve:           AttributeScore
    length:           AttributeScore
    print_pattern:    AttributeScore

    # 색상
    color:            ColorAnalysis

    # 사진 품질
    quality:          ImageQuality

    # HITL 집계
    needs_hitl:       bool              = Field(..., description="HITL 필요 여부")
    hitl_flags:       list[HITLFlag]    = Field(default_factory=list)

    # 최종 축 (vision_axes_mapper.py가 채운다)
    estimated_axes:   Optional[StylingAxes] = None
    axes_source_note: Optional[str]         = None


class VisionOutfitResult(BaseModel):
    """
    코디 사진 분석 결과 — 여러 VisionItemResult의 집합.
    대표 아이템(primary)과 추가 아이템(secondary) 목록으로 구성된다.
    """
    primary:    VisionItemResult
    secondary:  list[VisionItemResult] = Field(default_factory=list)
    photo_note: Optional[str] = Field(None, description="AI가 사진에 대해 남긴 참고 메모")
