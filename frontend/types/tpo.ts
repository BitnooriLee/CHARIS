/**
 * TPO 분석 결과 TypeScript 인터페이스
 * 백엔드 backend/services/tpo_scorer.py의 OutfitTPOScore Pydantic 모델과 1:1 대응한다.
 */

export type ScoreLevel = "high" | "medium" | "low";
export type PenaltyDir = "upper_cap" | "lower_floor" | "symmetric";

export interface StylingAxes {
  elegance:   number; // 0.0 ~ 1.0
  authority:  number;
  effortless: number;
  romantic:   number;
  boldness:   number;
  formality:  number; // 1 ~ 5
}

export interface AxisFitDetail {
  axis:          string;
  outfit_value:  number; // 코디의 해당 축 수치
  tpo_target:    number; // TPO 목표 수치
  penalty_dir:   PenaltyDir;
  fit_score:     number; // 0.0 ~ 1.0
  is_strength:   boolean;
  needs_enhance: boolean;
}

export interface OutfitTPOScore {
  context:           string;
  display_kr:        string;
  total_fit_score:   number; // 0.0 ~ 1.0
  score_level:       ScoreLevel;
  axis_details:      AxisFitDetail[];
  strength_axes:     string[];
  enhance_axes:      string[];
  coaching_opening:  string;
  body_shape_tip:    string;
  key_focus:         string[];
}

/** 축 메타데이터 (UI 표시용) */
export interface AxisMeta {
  key:        string;
  en:         string;
  kr:         string;
  icon:       string;
}

export const AXIS_META: AxisMeta[] = [
  { key: "elegance",   en: "Elegance",   kr: "우아함",      icon: "✦" },
  { key: "authority",  en: "Authority",  kr: "권위감",      icon: "◈" },
  { key: "effortless", en: "Effortless", kr: "자연스러움",  icon: "◌" },
  { key: "romantic",   en: "Romantic",   kr: "로맨틱",      icon: "♡" },
  { key: "boldness",   en: "Boldness",   kr: "개성",        icon: "◆" },
];

/** 점수 구간별 UI 설정 */
export const SCORE_LEVEL_CONFIG = {
  high: {
    label:    "Perfect Fit",
    dot:      "bg-gold",
    text:     "text-gold-dark",
    bg:       "bg-gold-light/20",
  },
  medium: {
    label:    "Graceful Balance",
    dot:      "bg-charcoal/30",
    text:     "text-charcoal/60",
    bg:       "bg-pearl/60",
  },
  low: {
    label:    "Needs Rescue ✦",
    dot:      "bg-blush",
    text:     "text-blush",
    bg:       "bg-blush-light/30",
  },
} as const;

/** Mock 데이터 — 하객룩 시나리오 (백엔드 검증값과 동일) */
export const MOCK_WEDDING_GUEST_REPORT: OutfitTPOScore = {
  context:         "wedding_guest",
  display_kr:      "하객룩",
  total_fit_score: 0.709,
  score_level:     "medium",
  axis_details: [
    { axis: "elegance",   outfit_value: 0.44, tpo_target: 1.00,
      penalty_dir: "lower_floor", fit_score: 0.439, is_strength: false, needs_enhance: true  },
    { axis: "authority",  outfit_value: 0.41, tpo_target: 0.30,
      penalty_dir: "symmetric",   fit_score: 0.966, is_strength: true,  needs_enhance: false },
    { axis: "effortless", outfit_value: 0.56, tpo_target: 0.20,
      penalty_dir: "upper_cap",   fit_score: 0.928, is_strength: true,  needs_enhance: false },
    { axis: "romantic",   outfit_value: 0.42, tpo_target: 0.60,
      penalty_dir: "symmetric",   fit_score: 0.890, is_strength: true,  needs_enhance: false },
    { axis: "boldness",   outfit_value: 0.82, tpo_target: 0.30,
      penalty_dir: "upper_cap",   fit_score: 0.844, is_strength: true,  needs_enhance: false },
  ],
  strength_axes:    ["authority", "effortless", "romantic", "boldness"],
  enhance_axes:     ["elegance"],
  coaching_opening: "전반적으로 좋은 코디입니다. 한 가지 요소만 조정하면 더욱 세련된 하객룩이 완성됩니다.",
  body_shape_tip:   "하의를 A라인으로 교체하면 어깨-힙 밸런스가 잡혀 더욱 단정한 실루엣이 완성됩니다.",
  key_focus: [
    "화이트·아이보리 완전 배제",
    "드레스 코드 준수 (세미포멀)",
    "주인공을 빛내는 절제된 우아함",
  ],
};
