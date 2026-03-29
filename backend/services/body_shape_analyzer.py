"""
body_shape_analyzer.py
======================
측정값 → 체형 분류 + 신뢰도 점수 + Zero-Judgment 코칭 내러티브 생성.

분류 알고리즘:
  1. 4가지 체형 각각에 대해 이상적 비율 중심값으로부터의 가중 거리를 계산한다.
  2. 가우시안 함수로 원시 점수를 산출한 뒤 소프트맥스로 정규화한다.
  3. 1순위(primary) + 2순위(secondary, ≥20%) 체형을 반환한다.
  4. secondary 신뢰도 ≥30%일 때, primary-secondary 조합 코칭을 활성화한다.
"""
from __future__ import annotations

import math
from typing import Optional

from backend.models.style_dna import (
    BodyMeasurements,
    BodyRatios,
    BodyShape,
    BodyShapeResult,
    BodyShapeScore,
)

# ---------------------------------------------------------------------------
# 이상적 비율 중심값 (패션 스타일링 이론 기반, 둘레 기준)
#
# bust_to_hip  : 가슴 둘레 / 힙 둘레
#   · 역삼각형: 가슴 > 힙 → 1.05+
#   · 서양배형: 가슴 < 힙 → 0.90-
#   · 모래시계/직사각형: 가슴 ≈ 힙 → 0.95~1.04
#
# waist_to_hip : 허리 둘레 / 힙 둘레
#   · 모래시계: 허리가 뚜렷이 잘록 → 0.72 이하
#   · 직사각형: 허리-힙 차이 작음  → 0.82 이상
# ---------------------------------------------------------------------------
_IDEAL_CENTERS: dict[BodyShape, dict[str, float]] = {
    BodyShape.INVERTED_TRIANGLE: {"bust_to_hip": 1.07, "waist_to_hip": 0.78},
    BodyShape.PEAR:              {"bust_to_hip": 0.88, "waist_to_hip": 0.78},
    BodyShape.HOURGLASS:         {"bust_to_hip": 1.00, "waist_to_hip": 0.70},
    BodyShape.RECTANGLE:         {"bust_to_hip": 1.00, "waist_to_hip": 0.84},
}

# 각 체형에서 두 비율이 분류에 기여하는 가중치
_DIMENSION_WEIGHTS: dict[BodyShape, dict[str, float]] = {
    BodyShape.INVERTED_TRIANGLE: {"bust_to_hip": 0.80, "waist_to_hip": 0.20},
    BodyShape.PEAR:              {"bust_to_hip": 0.80, "waist_to_hip": 0.20},
    BodyShape.HOURGLASS:         {"bust_to_hip": 0.40, "waist_to_hip": 0.60},
    BodyShape.RECTANGLE:         {"bust_to_hip": 0.40, "waist_to_hip": 0.60},
}

# 가우시안 분포의 너비 — 값이 작을수록 중심에서 벗어날 때 점수가 급격히 감소
_SIGMA: float = 0.12

# secondary 체형을 반환하는 최소 신뢰도 임계값
_SECONDARY_MIN_CONFIDENCE: float = 0.20

# secondary 조합 코칭을 활성화하는 최소 신뢰도 임계값
_COACHING_SECONDARY_THRESHOLD: float = 0.30

# ---------------------------------------------------------------------------
# 한국어 체형 레이블 (UI 표시용)
# ---------------------------------------------------------------------------
SHAPE_LABELS: dict[BodyShape, str] = {
    BodyShape.INVERTED_TRIANGLE: "역삼각형",
    BodyShape.PEAR:              "서양배형",
    BodyShape.HOURGLASS:         "모래시계형",
    BodyShape.RECTANGLE:         "직사각형",
}

# ---------------------------------------------------------------------------
# Zero-Judgment 코칭 내러티브 템플릿
# key: (primary_shape, secondary_shape | None)
# 원칙: 단정적 진단 금지 — 현재 강점 + 잠재 가능성을 함께 전달한다.
# ---------------------------------------------------------------------------
_COACHING_TEMPLATES: dict[BodyShape, dict[Optional[BodyShape], str]] = {
    BodyShape.INVERTED_TRIANGLE: {
        BodyShape.HOURGLASS: (
            "어깨가 자연스럽게 돋보이는 역삼각형 실루엣을 지니고 계십니다. "
            "허리 라인을 살짝 강조하면 모래시계형의 우아한 곡선미까지 "
            "충분히 발산할 수 있는 잠재력을 가지고 계세요."
        ),
        BodyShape.RECTANGLE: (
            "어깨 너비가 힘 있는 존재감을 만들어 주는 역삼각형 유형입니다. "
            "허리에 포인트를 더하면 전체 실루엣에 리듬감이 생겨 "
            "한층 더 그레이스풀한 인상을 연출할 수 있습니다."
        ),
        None: (
            "어깨가 자연스럽게 프레임을 만들어 주는 역삼각형 실루엣을 지니고 계십니다. "
            "이 구조적인 아름다움을 살린 스타일링으로 더욱 우아한 존재감을 완성할 수 있습니다."
        ),
    },
    BodyShape.PEAR: {
        BodyShape.HOURGLASS: (
            "풍성하고 여성스러운 힙 라인이 인상적인 서양배형 실루엣입니다. "
            "상체에 볼륨감을 더하면 모래시계형의 완벽한 밸런스도 "
            "자연스럽게 완성됩니다."
        ),
        BodyShape.RECTANGLE: (
            "여성스러운 곡선이 돋보이는 서양배형 유형입니다. "
            "어깨 라인을 살짝 넓히는 스타일링으로 상·하체의 균형감을 "
            "우아하게 끌어올릴 수 있습니다."
        ),
        None: (
            "풍성하고 여성스러운 하체 라인이 매력적인 서양배형 실루엣입니다. "
            "이 자연스러운 곡선미를 살린 스타일링으로 더욱 그레이스풀한 인상을 완성할 수 있습니다."
        ),
    },
    BodyShape.HOURGLASS: {
        BodyShape.INVERTED_TRIANGLE: (
            "허리 라인이 아름답게 잘록한 모래시계형 실루엣입니다. "
            "어깨의 자연스러운 너비감 덕분에 역삼각형 특유의 "
            "당당한 존재감도 함께 발산할 수 있습니다."
        ),
        BodyShape.PEAR: (
            "부드럽고 균형 잡힌 모래시계형 실루엣을 지니고 계십니다. "
            "하체의 여성스러운 볼륨감이 더해져 더욱 풍성하고 "
            "우아한 실루엣을 완성해 줍니다."
        ),
        None: (
            "어깨와 힙의 균형이 아름답고, 허리 라인이 돋보이는 모래시계형 실루엣입니다. "
            "이 천연 밸런스를 극대화하는 스타일링으로 어떤 룩도 완벽하게 소화하실 수 있습니다."
        ),
    },
    BodyShape.RECTANGLE: {
        BodyShape.HOURGLASS: (
            "어깨, 허리, 힙이 자연스럽게 정돈된 직사각형 실루엣입니다. "
            "허리 라인에 포인트를 더하면 모래시계형의 곡선미가 "
            "금방 살아나는 잠재력을 품고 있습니다."
        ),
        BodyShape.INVERTED_TRIANGLE: (
            "균형 잡힌 직사각형 실루엣에 어깨의 안정감이 더해진 유형입니다. "
            "어깨를 강조하는 스타일링으로 역삼각형 특유의 "
            "파워풀한 인상을 연출할 수 있습니다."
        ),
        None: (
            "어깨, 허리, 힙의 비율이 균형 잡힌 직사각형 실루엣입니다. "
            "이 자연스러운 캔버스 위에 레이어링과 텍스처로 "
            "풍성한 스타일을 완성할 수 있습니다."
        ),
    },
}


# ---------------------------------------------------------------------------
# 내부 계산 함수
# ---------------------------------------------------------------------------

def _gaussian_score(ratios: BodyRatios, shape: BodyShape) -> float:
    """
    비율 벡터와 체형 이상값 사이의 가중 유클리드 거리를 가우시안으로 변환.
    중심에 가까울수록 1에 수렴, 멀수록 0에 수렴.
    """
    center = _IDEAL_CENTERS[shape]
    weights = _DIMENSION_WEIGHTS[shape]

    weighted_sq_dist = (
        weights["bust_to_hip"] * (ratios.bust_to_hip - center["bust_to_hip"]) ** 2
        + weights["waist_to_hip"] * (ratios.waist_to_hip - center["waist_to_hip"]) ** 2
    )
    return math.exp(-weighted_sq_dist / (2 * _SIGMA ** 2))


def _softmax_normalize(raw: dict[BodyShape, float]) -> dict[BodyShape, float]:
    """원시 점수를 소프트맥스로 정규화하여 합계가 1인 확률 분포로 변환."""
    total = sum(raw.values())
    if total == 0:
        equal = 1.0 / len(raw)
        return {shape: equal for shape in raw}
    return {shape: score / total for shape, score in raw.items()}


def _select_narrative(
    primary: BodyShape,
    secondary: Optional[BodyShape],
    secondary_confidence: float,
) -> str:
    """
    primary + secondary 체형 조합에 맞는 코칭 내러티브를 선택.
    secondary 신뢰도가 임계값 미만이면 단독 코칭으로 폴백.
    """
    if secondary is None or secondary_confidence < _COACHING_SECONDARY_THRESHOLD:
        return _COACHING_TEMPLATES[primary][None]
    return _COACHING_TEMPLATES[primary].get(
        secondary,
        _COACHING_TEMPLATES[primary][None],
    )


# ---------------------------------------------------------------------------
# 공개 API
# ---------------------------------------------------------------------------

def classify_body_shape(measurements: BodyMeasurements) -> BodyShapeResult:
    """
    신체 측정값을 받아 체형 분류 결과를 반환한다.

    Args:
        measurements: 어깨·허리·힙·키 측정값 (BodyMeasurements)

    Returns:
        BodyShapeResult:
          - primary   : 가장 높은 신뢰도의 체형 + 점수
          - secondary : 2순위 체형 (신뢰도 ≥20%일 때만 존재)
          - coaching_narrative : Zero-Judgment 기반 코칭 메시지
    """
    ratios = BodyRatios.from_measurements(measurements)

    raw_scores = {shape: _gaussian_score(ratios, shape) for shape in BodyShape}
    confidences = _softmax_normalize(raw_scores)

    ranked = sorted(confidences.items(), key=lambda x: x[1], reverse=True)
    primary_shape, primary_conf = ranked[0]
    secondary_shape, secondary_conf = ranked[1]

    primary = BodyShapeScore(
        shape=primary_shape,
        confidence=round(primary_conf, 4),
    )
    secondary: Optional[BodyShapeScore] = (
        BodyShapeScore(shape=secondary_shape, confidence=round(secondary_conf, 4))
        if secondary_conf >= _SECONDARY_MIN_CONFIDENCE
        else None
    )
    narrative = _select_narrative(
        primary_shape,
        secondary_shape if secondary else None,
        secondary_conf,
    )

    return BodyShapeResult(
        primary=primary,
        secondary=secondary,
        coaching_narrative=narrative,
    )
