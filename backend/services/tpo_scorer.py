"""
tpo_scorer.py
=============
TPO 스코어링 엔진 — 코디(Outfit)가 특정 TPO 상황에 얼마나 '맞는지' 측정한다.

핵심 로직:
  1. TPOContextMeta  : 11종 TPO별 StylingAxes 목표값 + 축 중요도
  2. TPOPenaltyConfig: 각 축의 Penalty 방향 (UPPER_CAP / LOWER_FLOOR / SYMMETRIC)
  3. score_outfit_tpo(): 코디 axes vs TPO 목표 → 5축 Fit Score (레이더 출력)
  4. CoachingEngine   : TPO × BodyShape × ScoreLevel → Zero-Judgment 코칭 텍스트

점수 구간 (ScoreLevel):
  HIGH   ≥ 0.75  — 완벽한 핏
  MEDIUM 0.50~0.74 — 전반적으로 좋음, 소폭 보완 가능
  LOW    < 0.50  — 새로운 가능성 열기

Penalty 계산 방식 (방향성 가중 차이):
  UPPER_CAP  : outfit > tpo → penalty = (outfit - tpo) × axis_importance
  LOWER_FLOOR: outfit < tpo → penalty = (tpo - outfit) × axis_importance
  SYMMETRIC  : penalty = |outfit - tpo| × axis_importance
  → axis_fit = max(0, 1 - penalty), 총점 = axis_importance 가중 평균
"""
from __future__ import annotations

from enum import Enum
from typing import TYPE_CHECKING, Optional

from pydantic import BaseModel, Field

from backend.models.style_dna import (
    BodyShape,
    StylingAxes,
    TPOCategory,
    TPOContext,
)

if TYPE_CHECKING:
    from backend.models.outfit import Outfit
    from backend.models.style_dna import StyleDNA


# ---------------------------------------------------------------------------
# Penalty 방향성 정의
# ---------------------------------------------------------------------------

class PenaltyDir(str, Enum):
    UPPER_CAP   = "upper_cap"    # 이 축이 TPO 기준보다 높으면 Penalty
    LOWER_FLOOR = "lower_floor"  # 이 축이 TPO 기준보다 낮으면 Penalty
    SYMMETRIC   = "symmetric"    # 양방향 Penalty


class TPOPenaltyConfig(BaseModel):
    """TPO 한 건의 5축 Penalty 방향 설정."""
    elegance:   PenaltyDir
    authority:  PenaltyDir
    effortless: PenaltyDir
    romantic:   PenaltyDir
    boldness:   PenaltyDir


# TPO별 Penalty 방향 매핑
_PENALTY_CONFIGS: dict[TPOContext, TPOPenaltyConfig] = {
    TPOContext.FIRST_DATE: TPOPenaltyConfig(
        elegance=PenaltyDir.LOWER_FLOOR,   # 우아함 부족 → 감점
        authority=PenaltyDir.UPPER_CAP,    # 지나친 권위감 → 부담스러움
        effortless=PenaltyDir.SYMMETRIC,   # 너무 꾸밈/너무 방치 모두 NG
        romantic=PenaltyDir.LOWER_FLOOR,   # 로맨틱 부족 → 감점
        boldness=PenaltyDir.UPPER_CAP,     # 지나친 개성 → 첫 만남에 부담
    ),
    TPOContext.ANNIVERSARY: TPOPenaltyConfig(
        elegance=PenaltyDir.LOWER_FLOOR,
        authority=PenaltyDir.UPPER_CAP,
        effortless=PenaltyDir.UPPER_CAP,   # 기념일에 너무 캐주얼 → 감점
        romantic=PenaltyDir.LOWER_FLOOR,
        boldness=PenaltyDir.SYMMETRIC,
    ),
    TPOContext.CAMPUS_DATE: TPOPenaltyConfig(
        elegance=PenaltyDir.SYMMETRIC,
        authority=PenaltyDir.UPPER_CAP,    # 캠퍼스에서 너무 격식 → 이질감
        effortless=PenaltyDir.LOWER_FLOOR, # 캐주얼함 부족 → 감점
        romantic=PenaltyDir.SYMMETRIC,
        boldness=PenaltyDir.SYMMETRIC,
    ),
    TPOContext.WEDDING_GUEST: TPOPenaltyConfig(
        elegance=PenaltyDir.LOWER_FLOOR,   # 우아함 필수
        authority=PenaltyDir.SYMMETRIC,
        effortless=PenaltyDir.UPPER_CAP,   # 하객룩에서 너무 캐주얼 → 결례
        romantic=PenaltyDir.SYMMETRIC,
        boldness=PenaltyDir.UPPER_CAP,     # 주인공보다 튀면 → 결례
    ),
    TPOContext.FAMILY_GATHERING: TPOPenaltyConfig(
        elegance=PenaltyDir.LOWER_FLOOR,
        authority=PenaltyDir.LOWER_FLOOR,  # 신뢰감 필수
        effortless=PenaltyDir.UPPER_CAP,   # 너무 편한 차림 → 예의 없어 보임
        romantic=PenaltyDir.UPPER_CAP,     # 지나친 로맨틱 → 분위기 이탈
        boldness=PenaltyDir.UPPER_CAP,     # 과한 개성 → 튀어 보임
    ),
    TPOContext.PARTY_NIGHT: TPOPenaltyConfig(
        elegance=PenaltyDir.LOWER_FLOOR,
        authority=PenaltyDir.UPPER_CAP,    # 파티에서 너무 딱딱 → 분위기 깨짐
        effortless=PenaltyDir.UPPER_CAP,   # 너무 노력 없어 보임 → 감점
        romantic=PenaltyDir.SYMMETRIC,
        boldness=PenaltyDir.LOWER_FLOOR,   # 파티에서 개성 필수
    ),
    TPOContext.DAILY_OFFICE: TPOPenaltyConfig(
        elegance=PenaltyDir.LOWER_FLOOR,
        authority=PenaltyDir.LOWER_FLOOR,
        effortless=PenaltyDir.UPPER_CAP,   # 출근룩이 너무 캐주얼 → 감점
        romantic=PenaltyDir.UPPER_CAP,     # 직장에서 너무 로맨틱 → 이질감
        boldness=PenaltyDir.UPPER_CAP,     # 업무 환경에서 과한 개성 → 감점
    ),
    TPOContext.BIG_MEETING: TPOPenaltyConfig(
        elegance=PenaltyDir.LOWER_FLOOR,
        authority=PenaltyDir.LOWER_FLOOR,  # 권위감 최우선 필수
        effortless=PenaltyDir.UPPER_CAP,   # 면접에서 캐주얼 → 치명적 감점
        romantic=PenaltyDir.UPPER_CAP,
        boldness=PenaltyDir.UPPER_CAP,
    ),
    TPOContext.WEEKEND_VIBE: TPOPenaltyConfig(
        elegance=PenaltyDir.SYMMETRIC,
        authority=PenaltyDir.UPPER_CAP,    # 꾸안꾸에서 너무 격식 → 본질 위반
        effortless=PenaltyDir.LOWER_FLOOR, # 자연스러움 필수
        romantic=PenaltyDir.SYMMETRIC,
        boldness=PenaltyDir.SYMMETRIC,
    ),
    TPOContext.GYM_LOOK: TPOPenaltyConfig(
        elegance=PenaltyDir.UPPER_CAP,     # 헬스장에서 너무 우아 → 어색
        authority=PenaltyDir.UPPER_CAP,
        effortless=PenaltyDir.LOWER_FLOOR,
        romantic=PenaltyDir.UPPER_CAP,
        boldness=PenaltyDir.LOWER_FLOOR,   # 스포티한 에너지 필수
    ),
    TPOContext.AIRPORT_LOOK: TPOPenaltyConfig(
        elegance=PenaltyDir.LOWER_FLOOR,
        authority=PenaltyDir.UPPER_CAP,    # 공항에서 너무 격식 → 불편해 보임
        effortless=PenaltyDir.LOWER_FLOOR, # 편안함 필수
        romantic=PenaltyDir.UPPER_CAP,     # 공항에서 너무 드레시 → 과해 보임
        boldness=PenaltyDir.SYMMETRIC,
    ),
}


# ---------------------------------------------------------------------------
# TPO 메타데이터 레지스트리
# ---------------------------------------------------------------------------

class TPOContextMeta(BaseModel):
    context:    TPOContext
    display_kr: str
    display_en: str
    category:   TPOCategory
    axes:       StylingAxes          # 목표 StylingAxes (이상값)
    key_focus:  list[str]


_TPO_REGISTRY: dict[TPOContext, TPOContextMeta] = {
    TPOContext.FIRST_DATE: TPOContextMeta(
        context=TPOContext.FIRST_DATE, display_kr="소개팅", display_en="First Date",
        category=TPOCategory.RELATIONSHIP,
        axes=StylingAxes(elegance=0.9, authority=0.1, effortless=0.3,
                         romantic=0.9, boldness=0.4, formality=3),
        key_focus=["첫인상을 부드럽게 만드는 컬러 선택",
                   "허리 라인을 살리는 실루엣",
                   "과하지 않은 포인트 아이템 1개"],
    ),
    TPOContext.ANNIVERSARY: TPOContextMeta(
        context=TPOContext.ANNIVERSARY, display_kr="기념일", display_en="Anniversary",
        category=TPOCategory.RELATIONSHIP,
        axes=StylingAxes(elegance=1.0, authority=0.1, effortless=0.2,
                         romantic=1.0, boldness=0.5, formality=4),
        key_focus=["특별함을 더하는 소재(실크·새틴)",
                   "전체 실루엣의 균형감",
                   "퍼스널컬러 베스트 컬러로 안색 밝히기"],
    ),
    TPOContext.CAMPUS_DATE: TPOContextMeta(
        context=TPOContext.CAMPUS_DATE, display_kr="캠퍼스룩", display_en="Campus Date",
        category=TPOCategory.RELATIONSHIP,
        axes=StylingAxes(elegance=0.5, authority=0.1, effortless=0.8,
                         romantic=0.6, boldness=0.4, formality=2),
        key_focus=["자연스러운 레이어링",
                   "움직임이 편한 실루엣",
                   "청순하고 밝은 컬러 팔레트"],
    ),
    TPOContext.WEDDING_GUEST: TPOContextMeta(
        context=TPOContext.WEDDING_GUEST, display_kr="하객룩", display_en="Wedding Guest",
        category=TPOCategory.SOCIAL,
        axes=StylingAxes(elegance=1.0, authority=0.3, effortless=0.2,
                         romantic=0.6, boldness=0.3, formality=5),
        key_focus=["화이트·아이보리 완전 배제",
                   "드레스 코드 준수 (세미포멀)",
                   "주인공을 빛내는 절제된 우아함"],
    ),
    TPOContext.FAMILY_GATHERING: TPOContextMeta(
        context=TPOContext.FAMILY_GATHERING, display_kr="상견례/가족행사",
        display_en="Family Gathering",
        category=TPOCategory.SOCIAL,
        axes=StylingAxes(elegance=0.8, authority=0.5, effortless=0.3,
                         romantic=0.3, boldness=0.2, formality=4),
        key_focus=["단정하고 신뢰감 있는 실루엣",
                   "튀지 않는 뉴트럴 또는 소프트 컬러",
                   "과한 노출·프린트 지양"],
    ),
    TPOContext.PARTY_NIGHT: TPOContextMeta(
        context=TPOContext.PARTY_NIGHT, display_kr="파티/생일", display_en="Party Night",
        category=TPOCategory.SOCIAL,
        axes=StylingAxes(elegance=0.7, authority=0.2, effortless=0.3,
                         romantic=0.5, boldness=1.0, formality=3),
        key_focus=["존재감 있는 컬러 또는 소재",
                   "야간 조명에서 빛나는 질감",
                   "밤 분위기에 맞는 실루엣 강조"],
    ),
    TPOContext.DAILY_OFFICE: TPOContextMeta(
        context=TPOContext.DAILY_OFFICE, display_kr="데일리 출근룩",
        display_en="Daily Office",
        category=TPOCategory.CAREER,
        axes=StylingAxes(elegance=0.7, authority=0.6, effortless=0.5,
                         romantic=0.2, boldness=0.3, formality=3),
        key_focus=["반복 착용 가능한 베이직 실루엣",
                   "피로감을 줄이는 퍼스널컬러 계열",
                   "신발·백 등 소품으로 완성도 UP"],
    ),
    TPOContext.BIG_MEETING: TPOContextMeta(
        context=TPOContext.BIG_MEETING, display_kr="면접/발표", display_en="Big Meeting",
        category=TPOCategory.CAREER,
        axes=StylingAxes(elegance=0.6, authority=1.0, effortless=0.1,
                         romantic=0.1, boldness=0.3, formality=5),
        key_focus=["어깨 라인이 구조적인 재킷·블레이저",
                   "권위감을 높이는 다크 뉴트럴",
                   "군더더기 없는 클린 실루엣"],
    ),
    TPOContext.WEEKEND_VIBE: TPOContextMeta(
        context=TPOContext.WEEKEND_VIBE, display_kr="꾸안꾸", display_en="Weekend Vibe",
        category=TPOCategory.LIFESTYLE,
        axes=StylingAxes(elegance=0.4, authority=0.1, effortless=1.0,
                         romantic=0.3, boldness=0.3, formality=1),
        key_focus=["편안하지만 실루엣이 살아있는 핏",
                   "자연스러운 레이어링",
                   "꾸민 듯 안 꾸민 듯 쿨한 컬러 믹스"],
    ),
    TPOContext.GYM_LOOK: TPOContextMeta(
        context=TPOContext.GYM_LOOK, display_kr="오운완", display_en="Gym Look",
        category=TPOCategory.LIFESTYLE,
        axes=StylingAxes(elegance=0.2, authority=0.3, effortless=0.8,
                         romantic=0.1, boldness=0.7, formality=1),
        key_focus=["체형을 긍정적으로 강조하는 액티브웨어 핏",
                   "에너지감 있는 컬러 포인트",
                   "기능성과 스타일을 동시에 만족하는 소재"],
    ),
    TPOContext.AIRPORT_LOOK: TPOContextMeta(
        context=TPOContext.AIRPORT_LOOK, display_kr="여행/공항룩",
        display_en="Airport Look",
        category=TPOCategory.LIFESTYLE,
        axes=StylingAxes(elegance=0.6, authority=0.2, effortless=0.9,
                         romantic=0.2, boldness=0.5, formality=2),
        key_focus=["장시간 착용에도 실루엣이 유지되는 소재",
                   "레이어링으로 온도 변화 대응",
                   "이동 중에도 세련되어 보이는 모노톤 또는 미니멀 코디"],
    ),
}


# ---------------------------------------------------------------------------
# 점수 구간
# ---------------------------------------------------------------------------

class ScoreLevel(str, Enum):
    HIGH   = "high"    # ≥ 0.75
    MEDIUM = "medium"  # 0.50 ~ 0.74
    LOW    = "low"     # < 0.50


def _get_score_level(score: float) -> ScoreLevel:
    if score >= 0.75:
        return ScoreLevel.HIGH
    if score >= 0.50:
        return ScoreLevel.MEDIUM
    return ScoreLevel.LOW


# ---------------------------------------------------------------------------
# 코칭 템플릿: TPO × ScoreLevel (공통 오프닝)
# ---------------------------------------------------------------------------

_COACHING_OPENING: dict[TPOContext, dict[ScoreLevel, str]] = {
    TPOContext.FIRST_DATE: {
        ScoreLevel.HIGH:   "이 코디는 소개팅의 본질, '당신답게 빛나는 것'을 완벽히 담고 있습니다. 자연스러운 매력이 그대로 전달될 거예요.",
        ScoreLevel.MEDIUM: "소개팅에 충분히 어울리는 코디입니다. 액세서리 하나를 조금 더 부드럽게 조정하면 완성도가 한층 올라갑니다.",
        ScoreLevel.LOW:    "이 코디의 에너지는 다른 자리에서 더욱 빛날 것 같아요. 소개팅용으로는 조금 더 로맨틱한 터치를 더해볼까요?",
    },
    TPOContext.ANNIVERSARY: {
        ScoreLevel.HIGH:   "오늘의 특별함이 코디에 그대로 녹아 있습니다. 기념일의 설렘을 완벽하게 담아냈어요.",
        ScoreLevel.MEDIUM: "좋은 출발점입니다. 소재나 컬러를 한 단계 업그레이드하면 '특별한 날'의 무드가 완성됩니다.",
        ScoreLevel.LOW:    "기념일은 조금 더 특별한 연출이 빛을 발하는 자리예요. 실루엣이나 소재에 변화를 줘볼까요?",
    },
    TPOContext.CAMPUS_DATE: {
        ScoreLevel.HIGH:   "캠퍼스 특유의 청춘 에너지와 설렘이 자연스럽게 담긴 룩입니다. 걷는 것만으로도 시선을 끌 거예요.",
        ScoreLevel.MEDIUM: "편안하면서도 스타일리시한 방향으로 잘 잡혀 있어요. 레이어링 하나만 더하면 완성입니다.",
        ScoreLevel.LOW:    "캠퍼스의 자연스러운 분위기와 조금 다른 방향이에요. 편안함을 먼저 살리고 스타일을 더해볼게요.",
    },
    TPOContext.WEDDING_GUEST: {
        ScoreLevel.HIGH:   "하객룩의 본질인 '빛나지만 절제된 우아함'을 완벽히 담고 있습니다. 주인공 옆에서 조용히 빛날 거예요.",
        ScoreLevel.MEDIUM: "전반적으로 좋은 코디입니다. 한 가지 요소만 조정하면 더욱 세련된 하객룩이 완성됩니다.",
        ScoreLevel.LOW:    "이 코디는 다른 자리에서 더 빛날 것 같아요. 하객룩의 에티켓에 맞게 함께 재구성해 드릴게요.",
    },
    TPOContext.FAMILY_GATHERING: {
        ScoreLevel.HIGH:   "신뢰감과 따뜻함이 동시에 느껴지는 완성도 높은 코디입니다. 좋은 첫인상을 만들어줄 거예요.",
        ScoreLevel.MEDIUM: "전반적으로 좋습니다. 단정한 마무리를 더하면 더욱 안정감 있는 인상을 줄 수 있어요.",
        ScoreLevel.LOW:    "이 자리의 분위기에 맞는 방향으로 함께 조정해볼게요. 신뢰감을 키우는 데 집중하겠습니다.",
    },
    TPOContext.PARTY_NIGHT: {
        ScoreLevel.HIGH:   "파티의 분위기를 완벽하게 포착한 룩입니다. 밤을 빛낼 존재감이 충분히 담겨 있어요.",
        ScoreLevel.MEDIUM: "파티에 잘 어울리는 방향이에요. 포인트를 하나 더 살리면 더욱 강렬한 인상을 남길 수 있습니다.",
        ScoreLevel.LOW:    "이 코디의 에너지를 파티에 맞게 끌어올려볼게요. 소재나 컬러에 조금 더 대담함을 더해봅시다.",
    },
    TPOContext.DAILY_OFFICE: {
        ScoreLevel.HIGH:   "매일 입어도 질리지 않으면서도 언제나 세련된, 출근룩의 공식을 찾으셨습니다.",
        ScoreLevel.MEDIUM: "데일리 출근룩으로 좋은 토대입니다. 소품 하나로 완성도를 더 높일 수 있어요.",
        ScoreLevel.LOW:    "출근룩에 맞는 방향으로 함께 조정해볼게요. 편안함을 유지하면서 세련됨을 더해드릴게요.",
    },
    TPOContext.BIG_MEETING: {
        ScoreLevel.HIGH:   "최고의 퍼포먼스를 위한 준비가 완성됐습니다. 이 코디는 당신의 역량에 힘을 실어줄 거예요.",
        ScoreLevel.MEDIUM: "좋은 방향입니다. 권위감을 조금 더 강조하면 더욱 강한 첫인상을 만들 수 있습니다.",
        ScoreLevel.LOW:    "중요한 자리인 만큼, 함께 더 강력한 코디를 구성해볼게요. 구조적 실루엣이 포인트입니다.",
    },
    TPOContext.WEEKEND_VIBE: {
        ScoreLevel.HIGH:   "꾸민 듯 안 꾸민 듯, 그 절묘한 균형을 완벽하게 잡으셨어요. 진정한 꾸안꾸의 완성입니다.",
        ScoreLevel.MEDIUM: "자연스러운 무드가 잘 살아 있어요. 레이어링으로 깊이를 더하면 더욱 스타일리시해집니다.",
        ScoreLevel.LOW:    "꾸안꾸의 핵심은 '노력이 안 보이는 것'이에요. 함께 더 자연스러운 방향을 찾아볼게요.",
    },
    TPOContext.GYM_LOOK: {
        ScoreLevel.HIGH:   "오운완의 완성! 기능적이면서도 스타일리시한 완벽한 액티브 룩입니다.",
        ScoreLevel.MEDIUM: "액티브웨어 기본기는 잡혀 있어요. 컬러 포인트를 더하면 오운완 사진도 완벽해집니다.",
        ScoreLevel.LOW:    "운동에 더 집중할 수 있는 편안한 핏부터 시작해볼게요. 기능성이 스타일의 첫걸음입니다.",
    },
    TPOContext.AIRPORT_LOOK: {
        ScoreLevel.HIGH:   "공항 런웨이를 완벽하게 장악할 룩입니다. 편안함과 세련됨, 두 마리 토끼를 모두 잡으셨어요.",
        ScoreLevel.MEDIUM: "편안하면서도 스타일리시한 방향으로 잘 잡혀 있어요. 레이어링 하나로 완성도를 더할 수 있습니다.",
        ScoreLevel.LOW:    "긴 여정을 함께할 코디로 조정해볼게요. 편안함을 베이스로 세련미를 더하는 방향으로 가겠습니다.",
    },
}

# 체형 × TPO 카테고리 × 점수 구간 → 체형 특화 팁
_BODY_SHAPE_TPO_TIPS: dict[BodyShape, dict[TPOCategory, dict[ScoreLevel, str]]] = {
    BodyShape.INVERTED_TRIANGLE: {
        TPOCategory.RELATIONSHIP: {
            ScoreLevel.HIGH:   "어깨의 자연스러운 선이 로맨틱한 인상을 완성해줍니다. V넥이 시선을 중앙으로 모아 매력을 극대화해요.",
            ScoreLevel.MEDIUM: "V넥 또는 스쿱넥 디테일을 더하면 시선이 중앙으로 모여 더욱 로맨틱한 인상이 완성됩니다.",
            ScoreLevel.LOW:    "어깨 라인의 강점을 부드럽게 살리는 V넥 아이템으로 교체하면 로맨틱한 무드가 살아납니다.",
        },
        TPOCategory.SOCIAL: {
            ScoreLevel.HIGH:   "A라인 실루엣으로 어깨-힙 밸런스를 완벽하게 맞춰 단정하고 우아한 인상을 완성했어요.",
            ScoreLevel.MEDIUM: "하의를 A라인으로 교체하면 어깨-힙 밸런스가 잡혀 더욱 단정한 실루엣이 완성됩니다.",
            ScoreLevel.LOW:    "플레어 스커트나 A라인으로 하의를 바꿔 전체 실루엣의 균형을 먼저 잡아드릴게요.",
        },
        TPOCategory.CAREER: {
            ScoreLevel.HIGH:   "숄더 패드 없는 테일러드 재킷이 자연스러운 권위감을 완성했습니다. 완벽한 비즈니스 실루엣이에요.",
            ScoreLevel.MEDIUM: "숄더 패드 없는 테일러드 재킷을 더하면 자연스러운 권위감이 업그레이드됩니다.",
            ScoreLevel.LOW:    "구조적인 재킷으로 어깨 라인을 활용하면서 권위감을 자연스럽게 높여드릴게요.",
        },
        TPOCategory.LIFESTYLE: {
            ScoreLevel.HIGH:   "와이드 팬츠가 강점인 어깨 라인을 시원하게 살려주며 꾸안꾸 무드를 완성했어요.",
            ScoreLevel.MEDIUM: "와이드 팬츠로 하의에 볼륨을 더하면 어깨의 강점이 더욱 돋보이며 밸런스가 잡힙니다.",
            ScoreLevel.LOW:    "어깨의 자연스러운 넓이를 활용해 와이드 실루엣으로 전체 코디를 재구성해볼게요.",
        },
    },
    BodyShape.PEAR: {
        TPOCategory.RELATIONSHIP: {
            ScoreLevel.HIGH:   "밝은 상의가 시선을 위로 끌어올려 상큼하고 로맨틱한 첫인상을 완성했어요.",
            ScoreLevel.MEDIUM: "밝은 컬러의 상의로 교체하면 시선이 위로 모여 더욱 로맨틱한 인상을 줄 수 있습니다.",
            ScoreLevel.LOW:    "상의에 포인트 컬러를 더하는 것부터 시작해볼게요. 시선을 위로 모으는 것이 핵심입니다.",
        },
        TPOCategory.SOCIAL: {
            ScoreLevel.HIGH:   "상체 볼륨감이 상·하체 밸런스를 완벽하게 잡아 우아하고 균형 잡힌 실루엣을 완성했어요.",
            ScoreLevel.MEDIUM: "오프숄더나 볼륨 소매를 더하면 상체에 볼륨이 생겨 전체 밸런스가 더욱 아름답게 잡힙니다.",
            ScoreLevel.LOW:    "상체 볼륨을 높이는 아이템으로 상·하체 밸런스를 맞추는 것부터 시작할게요.",
        },
        TPOCategory.CAREER: {
            ScoreLevel.HIGH:   "다크 컬러 하의와 구조적 상의의 조합이 세련된 비즈니스 밸런스를 완성했습니다.",
            ScoreLevel.MEDIUM: "하의를 다크 톤으로 바꾸면 시선이 자연스럽게 분산되며 세련된 비즈니스 룩이 완성됩니다.",
            ScoreLevel.LOW:    "다크 컬러 하의 + 구조적 상의 조합으로 전체 비율을 재조정해 드릴게요.",
        },
        TPOCategory.LIFESTYLE: {
            ScoreLevel.HIGH:   "플레어 팬츠가 힙 라인을 자연스럽게 흘려내려 편안하면서도 여성스러운 실루엣을 완성했어요.",
            ScoreLevel.MEDIUM: "플레어 또는 와이드 팬츠로 교체하면 힙의 곡선미가 자연스럽게 살아나 더욱 우아해집니다.",
            ScoreLevel.LOW:    "플레어 실루엣으로 하의를 바꾸면 여성스러운 곡선미를 살리면서 편안함도 확보됩니다.",
        },
    },
    BodyShape.HOURGLASS: {
        TPOCategory.RELATIONSHIP: {
            ScoreLevel.HIGH:   "허리 라인을 살린 실루엣이 모래시계 곡선미를 완벽하게 드러내며 로맨틱한 무드를 완성했어요.",
            ScoreLevel.MEDIUM: "허리를 살짝 강조하는 벨트나 핏앤플레어 실루엣을 더하면 곡선미가 더욱 도드라집니다.",
            ScoreLevel.LOW:    "허리 라인을 살리는 아이템으로 천연 모래시계 실루엣을 살리는 것부터 시작할게요.",
        },
        TPOCategory.SOCIAL: {
            ScoreLevel.HIGH:   "미디 길이의 피티드 실루엣이 우아하면서도 섹시한 균형을 완벽하게 담아냈습니다.",
            ScoreLevel.MEDIUM: "미디 길이로 조정하면 우아하면서도 섹시한 황금 비율이 완성됩니다.",
            ScoreLevel.LOW:    "바디콘 대신 미디 길이의 피티드 드레스로 우아함과 섹시함을 동시에 살려드릴게요.",
        },
        TPOCategory.CAREER: {
            ScoreLevel.HIGH:   "벨트 달린 블레이저가 천연 모래시계 라인을 살리면서 완벽한 권위감을 완성했어요.",
            ScoreLevel.MEDIUM: "허리 벨트가 있는 블레이저를 더하면 실루엣과 권위감을 동시에 업그레이드할 수 있습니다.",
            ScoreLevel.LOW:    "허리 벨트로 라인을 만들어주는 재킷으로 모래시계 실루엣과 권위감을 동시에 잡을게요.",
        },
        TPOCategory.LIFESTYLE: {
            ScoreLevel.HIGH:   "스트레치 하이웨이스트 팬츠가 편안함과 실루엣을 동시에 살리는 완벽한 선택이에요.",
            ScoreLevel.MEDIUM: "하이웨이스트 컷을 선택하면 편안하면서도 곡선미가 자연스럽게 살아납니다.",
            ScoreLevel.LOW:    "하이웨이스트 아이템으로 교체하면 편안함을 유지하면서 실루엣이 자연스럽게 잡힙니다.",
        },
    },
    BodyShape.RECTANGLE: {
        TPOCategory.RELATIONSHIP: {
            ScoreLevel.HIGH:   "러플 디테일이 자연스러운 곡선감을 더해 부드럽고 로맨틱한 인상을 완성했어요.",
            ScoreLevel.MEDIUM: "러플이나 드레이핑 디테일을 더하면 부드러운 곡선감이 생겨 더욱 로맨틱해집니다.",
            ScoreLevel.LOW:    "러플 또는 드레이핑 디테일로 교체해 부드러운 곡선감을 먼저 만들어드릴게요.",
        },
        TPOCategory.SOCIAL: {
            ScoreLevel.HIGH:   "벨트 디테일로 허리 라인을 만들어 포멀한 자리에서도 스타일리시하게 빛나는 완성도예요.",
            ScoreLevel.MEDIUM: "벨트나 타이 디테일을 더하면 허리 라인이 생겨 포멀한 자리에서 더욱 세련됩니다.",
            ScoreLevel.LOW:    "벨트로 허리를 만드는 것부터 시작할게요. 작은 변화가 전체 실루엣을 바꿉니다.",
        },
        TPOCategory.CAREER: {
            ScoreLevel.HIGH:   "파워 수트 룩이 균형 잡힌 실루엣과 강한 존재감을 동시에 완성했습니다.",
            ScoreLevel.MEDIUM: "피티드 블레이저로 업그레이드하면 파워 수트의 균형 잡힌 실루엣이 더욱 강조됩니다.",
            ScoreLevel.LOW:    "수트 팬츠 + 피티드 블레이저 조합으로 직선 실루엣을 강점으로 살려드릴게요.",
        },
        TPOCategory.LIFESTYLE: {
            ScoreLevel.HIGH:   "오버사이즈 탑 + 슬림 팬츠의 볼륨 대비가 세련된 꾸안꾸 무드를 완성했어요.",
            ScoreLevel.MEDIUM: "상하의 볼륨 대비를 더 명확히 주면 세련된 꾸안꾸 무드가 더욱 살아납니다.",
            ScoreLevel.LOW:    "오버사이즈 상의 + 슬림 하의 조합으로 볼륨 대비를 활용한 세련된 실루엣을 만들게요.",
        },
    },
}


# ---------------------------------------------------------------------------
# 출력 모델
# ---------------------------------------------------------------------------

class AxisFitDetail(BaseModel):
    """단일 축의 Fit Score 상세."""
    axis:          str
    outfit_value:  float = Field(..., description="코디의 해당 축 수치")
    tpo_target:    float = Field(..., description="TPO 목표 수치")
    penalty_dir:   PenaltyDir
    fit_score:     float = Field(..., ge=0.0, le=1.0, description="이 축의 Fit Score")
    is_strength:   bool  = Field(..., description="강점 축 여부 (fit ≥ 0.75)")
    needs_enhance: bool  = Field(..., description="보완 필요 축 여부 (fit < 0.50)")


class OutfitTPOScore(BaseModel):
    """
    score_outfit_tpo()의 최종 출력.
    레이더 차트용 5축 Fit Score + 코칭 텍스트 전체를 담는다.
    """
    context:         TPOContext
    display_kr:      str
    total_fit_score: float           = Field(..., ge=0.0, le=1.0)
    score_level:     ScoreLevel
    axis_details:    list[AxisFitDetail]
    strength_axes:   list[str]       = Field(..., description="강점 축 목록")
    enhance_axes:    list[str]       = Field(..., description="보완 권장 축 목록")
    coaching_opening: str
    body_shape_tip:  str
    key_focus:       list[str]


# ---------------------------------------------------------------------------
# 핵심 스코어링 함수
# ---------------------------------------------------------------------------

def _compute_axis_fit(
    outfit_val: float,
    tpo_val:    float,
    direction:  PenaltyDir,
    importance: float,
) -> float:
    """
    단일 축의 Fit Score 계산.
    penalty = 방향에 따른 차이 × axis 중요도
    fit_score = max(0, 1 - penalty)
    """
    if direction == PenaltyDir.UPPER_CAP:
        penalty = max(0.0, outfit_val - tpo_val) * importance
    elif direction == PenaltyDir.LOWER_FLOOR:
        penalty = max(0.0, tpo_val - outfit_val) * importance
    else:  # SYMMETRIC
        penalty = abs(outfit_val - tpo_val) * importance

    return max(0.0, 1.0 - penalty)


def score_outfit_tpo(
    outfit_axes: StylingAxes,
    context:     TPOContext,
    body_shape:  BodyShape,
) -> OutfitTPOScore:
    """
    코디의 StylingAxes를 TPO 목표값과 비교하여 Fit Score를 계산한다.

    Args:
        outfit_axes : estimate_outfit_axes()로 구한 코디 StylingAxes
        context     : 평가할 TPO 상황 코드
        body_shape  : 사용자 1순위 체형 (체형별 팁 생성에 사용)

    Returns:
        OutfitTPOScore: 5축 레이더 Fit Score + 코칭 메시지 전체
    """
    meta    = _TPO_REGISTRY[context]
    penalty = _PENALTY_CONFIGS[context]

    _AXES = [
        ("elegance",   outfit_axes.elegance,   meta.axes.elegance,   getattr(penalty, "elegance")),
        ("authority",  outfit_axes.authority,  meta.axes.authority,  getattr(penalty, "authority")),
        ("effortless", outfit_axes.effortless, meta.axes.effortless, getattr(penalty, "effortless")),
        ("romantic",   outfit_axes.romantic,   meta.axes.romantic,   getattr(penalty, "romantic")),
        ("boldness",   outfit_axes.boldness,   meta.axes.boldness,   getattr(penalty, "boldness")),
    ]

    # TPO 축 중요도: 각 축의 목표값 자체를 importance로 사용
    # (importance가 0이면 해당 축은 사실상 무관 → 최소값 0.1로 보정)
    importance_map: dict[str, float] = {
        "elegance":   max(0.1, meta.axes.elegance),
        "authority":  max(0.1, meta.axes.authority),
        "effortless": max(0.1, meta.axes.effortless),
        "romantic":   max(0.1, meta.axes.romantic),
        "boldness":   max(0.1, meta.axes.boldness),
    }

    details: list[AxisFitDetail] = []
    weighted_fit_sum = 0.0
    total_importance = sum(importance_map.values())

    for axis_name, outfit_val, tpo_val, direction in _AXES:
        importance = importance_map[axis_name]
        fit = _compute_axis_fit(outfit_val, tpo_val, direction, importance)
        details.append(AxisFitDetail(
            axis=axis_name,
            outfit_value=round(outfit_val, 3),
            tpo_target=round(tpo_val, 3),
            penalty_dir=direction,
            fit_score=round(fit, 4),
            is_strength=fit >= 0.75,
            needs_enhance=fit < 0.50,
        ))
        weighted_fit_sum += fit * importance

    total_fit = round(weighted_fit_sum / total_importance, 4)
    level = _get_score_level(total_fit)

    strength_axes  = [d.axis for d in details if d.is_strength]
    enhance_axes   = [d.axis for d in details if d.needs_enhance]

    coaching_opening = _COACHING_OPENING[context][level]
    body_tip = _BODY_SHAPE_TPO_TIPS[body_shape][meta.category][level]

    return OutfitTPOScore(
        context=context,
        display_kr=meta.display_kr,
        total_fit_score=total_fit,
        score_level=level,
        axis_details=details,
        strength_axes=strength_axes,
        enhance_axes=enhance_axes,
        coaching_opening=coaching_opening,
        body_shape_tip=body_tip,
        key_focus=meta.key_focus,
    )


# ---------------------------------------------------------------------------
# StyleDNA 기반 단건·배치 분석 (기존 인터페이스 유지)
# ---------------------------------------------------------------------------

class TPOStylingResult(BaseModel):
    """StyleDNA만 있고 Outfit 없을 때의 TPO 컨텍스트 분석 결과."""
    context:          TPOContext
    display_kr:       str
    category:         TPOCategory
    axes:             StylingAxes
    key_focus:        list[str]
    body_shape_tip:   str
    coaching_intro:   str


_COACHING_INTROS: dict[TPOContext, str] = {
    TPOContext.FIRST_DATE:       "소개팅에서 가장 중요한 건 '당신답게' 빛나는 것입니다. 자연스러운 매력을 극대화해 드릴게요.",
    TPOContext.ANNIVERSARY:      "오늘은 특별한 날, 평소보다 한 단계 업그레이드된 당신을 보여줄 최고의 기회입니다.",
    TPOContext.CAMPUS_DATE:      "캠퍼스의 밝고 활기찬 에너지를 담아, 청춘의 설렘이 느껴지는 룩을 완성해 드릴게요.",
    TPOContext.WEDDING_GUEST:    "하객으로서 빛나면서도 예의 바른 균형, 그것이 진짜 스타일입니다.",
    TPOContext.FAMILY_GATHERING: "신뢰감과 따뜻함을 동시에 전달하는 룩으로 좋은 첫인상을 완성해 드릴게요.",
    TPOContext.PARTY_NIGHT:      "파티의 주인공은 당신입니다. 밤을 빛내줄 존재감 있는 룩을 제안해 드릴게요.",
    TPOContext.DAILY_OFFICE:     "매일 입어도 질리지 않으면서도, 언제나 세련된 출근룩의 공식을 찾아드릴게요.",
    TPOContext.BIG_MEETING:      "중요한 자리일수록 외모의 권위감이 자신감을 높입니다. 최고의 퍼포먼스를 위한 룩을 준비해 드릴게요.",
    TPOContext.WEEKEND_VIBE:     "꾸민 듯 안 꾸민 듯, 그 절묘한 균형이 꾸안꾸의 본질입니다.",
    TPOContext.GYM_LOOK:         "오운완의 완성은 땀 흘린 후에도 빛나는 자신감입니다.",
    TPOContext.AIRPORT_LOOK:     "공항은 또 하나의 런웨이입니다. 편안함과 세련됨, 두 마리 토끼를 모두 잡아드릴게요.",
}

_BODY_SHAPE_TPO_TIPS_SIMPLE: dict[BodyShape, dict[TPOCategory, str]] = {
    shape: {cat: tips[ScoreLevel.HIGH] for cat, tips in cat_dict.items()}
    for shape, cat_dict in _BODY_SHAPE_TPO_TIPS.items()
}


def get_tpo_meta(context: TPOContext) -> TPOContextMeta:
    return _TPO_REGISTRY[context]


def score_tpo(style_dna: "StyleDNA", context: TPOContext) -> TPOStylingResult:
    meta = _TPO_REGISTRY[context]
    primary_shape = style_dna.body_shape.primary.shape
    return TPOStylingResult(
        context=context,
        display_kr=meta.display_kr,
        category=meta.category,
        axes=meta.axes,
        key_focus=meta.key_focus,
        body_shape_tip=_BODY_SHAPE_TPO_TIPS_SIMPLE[primary_shape][meta.category],
        coaching_intro=_COACHING_INTROS[context],
    )


def score_tpo_batch(
    style_dna: "StyleDNA",
    contexts: Optional[list[TPOContext]] = None,
) -> list[TPOStylingResult]:
    targets = contexts if contexts is not None else style_dna.tpo_preference
    return [score_tpo(style_dna, ctx) for ctx in targets]
