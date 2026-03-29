from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Optional
from uuid import UUID, uuid4

from pydantic import BaseModel, Field


class BodyShape(str, Enum):
    INVERTED_TRIANGLE = "inverted_triangle"
    PEAR = "pear"
    HOURGLASS = "hourglass"
    RECTANGLE = "rectangle"


class Season(str, Enum):
    SPRING = "spring"
    SUMMER = "summer"
    AUTUMN = "autumn"
    WINTER = "winter"


class SubTone(str, Enum):
    # Spring
    SPRING_LIGHT = "spring_light"
    SPRING_WARM = "spring_warm"
    SPRING_BRIGHT = "spring_bright"
    SPRING_CLEAR = "spring_clear"
    # Summer
    SUMMER_LIGHT = "summer_light"
    SUMMER_MUTE = "summer_mute"
    SUMMER_SOFT = "summer_soft"
    SUMMER_COOL = "summer_cool"
    # Autumn
    AUTUMN_WARM = "autumn_warm"
    AUTUMN_DEEP = "autumn_deep"
    AUTUMN_MUTE = "autumn_mute"
    AUTUMN_STRONG = "autumn_strong"
    # Winter
    WINTER_COOL = "winter_cool"
    WINTER_DEEP = "winter_deep"
    WINTER_BRIGHT = "winter_bright"
    WINTER_CLEAR = "winter_clear"


class MeasurementSource(str, Enum):
    VISION = "vision"
    MANUAL = "manual"


# ---------------------------------------------------------------------------
# TPO — 한국형 상황 맥락 분류 (CLAUDE.md § 4. Data Standards 기준)
# ---------------------------------------------------------------------------

class TPOCategory(str, Enum):
    """TPO 대분류 카테고리."""
    RELATIONSHIP = "relationship"   # 연애/데이트
    SOCIAL = "social"               # 사교/의례
    CAREER = "career"               # 직장/커리어
    LIFESTYLE = "lifestyle"         # 라이프스타일


class TPOContext(str, Enum):
    """
    한국형 TPO 상황 코드.
    각 코드는 tpo_scorer.py의 메타데이터와 1:1 매핑된다.
    """
    # Relationship — 연애/데이트
    FIRST_DATE = "first_date"               # 소개팅
    ANNIVERSARY = "anniversary"             # 기념일
    CAMPUS_DATE = "campus_date"             # 캠퍼스룩

    # Social — 사교/의례
    WEDDING_GUEST = "wedding_guest"         # 하객룩 (에티켓 우선)
    FAMILY_GATHERING = "family_gathering"   # 상견례/가족행사
    PARTY_NIGHT = "party_night"             # 파티/생일

    # Career — 직장
    DAILY_OFFICE = "daily_office"           # 데일리 출근룩
    BIG_MEETING = "big_meeting"             # 면접/발표 (권위감 최우선)

    # Lifestyle — 라이프스타일
    WEEKEND_VIBE = "weekend_vibe"           # 꾸안꾸 (Effortless chic)
    GYM_LOOK = "gym_look"                   # 오운완
    AIRPORT_LOOK = "airport_look"           # 여행/공항


class StylingAxes(BaseModel):
    """
    TPO 상황별 스타일링 우선순위 벡터.
    각 축은 0.0(불필요)~1.0(최우선) 사이 값을 가지며,
    Mirror/Closet Rescue 추천 엔진의 가중치 입력으로 사용된다.
    """
    elegance: float = Field(..., ge=0.0, le=1.0, description="우아함·여성스러움")
    authority: float = Field(..., ge=0.0, le=1.0, description="권위감·구조적 실루엣")
    effortless: float = Field(..., ge=0.0, le=1.0, description="편안함·자연스러움")
    romantic: float = Field(..., ge=0.0, le=1.0, description="로맨틱·섬세함")
    boldness: float = Field(..., ge=0.0, le=1.0, description="개성·존재감")
    formality: int = Field(..., ge=1, le=5, description="공식성 레벨 (1=캐주얼, 5=포멀)")


class BodyMeasurements(BaseModel):
    """
    사용자로부터 수집된 원시 신체 측정값 (절대 수치).

    측정 기준: 모든 값은 **둘레(circumference, cm)** 로 통일한다.
    - bust_cm   : 가슴 둘레 (겨드랑이 아래 가장 넓은 부분)
    - waist_cm  : 허리 둘레 (가장 잘록한 부분)
    - hip_cm    : 힙 둘레 (엉덩이 가장 넓은 부분)
    - height_cm : 키

    둘레 기준을 사용하면 bust/hip 비율이 체형 분류 이상값(~1.0)과
    자연스럽게 정렬된다.
    """

    bust_cm: float = Field(..., gt=0, description="가슴 둘레 (cm)")
    waist_cm: float = Field(..., gt=0, description="허리 둘레 (cm)")
    hip_cm: float = Field(..., gt=0, description="힙 둘레 (cm)")
    height_cm: float = Field(..., gt=0, description="키 (cm)")


class BodyRatios(BaseModel):
    """측정값에서 파생된 정규화 비율 — 체형 분류의 핵심 입력값."""

    bust_to_hip: float = Field(..., description="가슴/힙 둘레 비율")
    waist_to_hip: float = Field(..., description="허리/힙 둘레 비율")
    bust_to_waist: float = Field(..., description="가슴/허리 둘레 비율")

    @classmethod
    def from_measurements(cls, m: BodyMeasurements) -> "BodyRatios":
        return cls(
            bust_to_hip=round(m.bust_cm / m.hip_cm, 4),
            waist_to_hip=round(m.waist_cm / m.hip_cm, 4),
            bust_to_waist=round(m.bust_cm / m.waist_cm, 4),
        )


class BodyShapeScore(BaseModel):
    """단일 체형에 대한 분류 결과 + 신뢰도."""

    shape: BodyShape
    confidence: float = Field(..., ge=0.0, le=1.0, description="신뢰도 (0.0 ~ 1.0)")

    @property
    def confidence_pct(self) -> str:
        return f"{self.confidence * 100:.1f}%"


class BodyShapeResult(BaseModel):
    """체형 분류 최종 결과 — primary + secondary + 코칭 내러티브."""

    primary: BodyShapeScore
    secondary: Optional[BodyShapeScore] = Field(
        None,
        description="신뢰도 20% 이상일 때만 존재하는 2순위 체형",
    )
    coaching_narrative: str = Field(
        ...,
        description="Zero-Judgment 원칙에 기반한 긍정 강화 코칭 메시지",
    )


class PersonalColor(BaseModel):
    """PCCS 기반 16 퍼스널컬러 진단 결과."""

    season: Season
    sub_tone: SubTone
    full_type: str = Field(..., description="예: Summer Mute, Autumn Deep")


class StyleDNA(BaseModel):
    """
    사용자 한 명의 스타일 정체성을 담는 핵심 프로필 객체.
    모든 CHARIS 기능(Mirror, Closet Rescue, TPO)의 공통 입력값이다.
    """

    id: UUID = Field(default_factory=uuid4)
    user_id: UUID

    # 측정값 — 원시 수치 + 파생 비율 모두 보존
    measurements: BodyMeasurements
    ratios: BodyRatios

    # 분류 결과
    body_shape: BodyShapeResult
    personal_color: Optional[PersonalColor] = None

    # 사용자 정의 목표 (예: "허리 강조", "어깨 밸런스")
    grace_goal: Optional[str] = Field(None, description="사용자의 스타일 목표")

    # 한국형 TPO — 사용자 주요 활동 상황 (복수 선택 가능)
    tpo_preference: list[TPOContext] = Field(
        default_factory=list,
        description="사용자가 자주 필요로 하는 TPO 상황 목록",
    )

    # 입력 방법 추적 (비전 vs. 수동)
    measurement_source: MeasurementSource

    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )

    def refresh_updated_at(self) -> None:
        self.updated_at = datetime.now(timezone.utc)
