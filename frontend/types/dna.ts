export type BodyShape =
  | "INVERTED_TRIANGLE"
  | "PEAR"
  | "HOURGLASS"
  | "RECTANGLE";

export type Season = "SPRING" | "SUMMER" | "AUTUMN" | "WINTER";
export type SubTone = "LIGHT" | "MUTED" | "DEEP" | "VIVID";

export type TPOContext =
  | "first_date"
  | "anniversary"
  | "campus_date"
  | "daily_office"
  | "client_meeting"
  | "job_interview"
  | "wedding_guest"
  | "graduation"
  | "weekend_casual"
  | "outdoor_active"
  | "date_night";

/* ── Body ──────────────────────────────────────────────────────────── */

export interface BodyMeasurements {
  bust_cm: number;
  waist_cm: number;
  hip_cm: number;
  height_cm: number;
}

export interface BodyShapeScore {
  shape: BodyShape;
  confidence: number;
}

export interface BodyShapeResult {
  primary: BodyShapeScore;
  secondary: BodyShapeScore | null;
  measurements: BodyMeasurements;
  coaching_narrative: string;
}

/* ── Color ─────────────────────────────────────────────────────────── */

export interface ColorSwatch {
  name: string;
  name_ko: string;
  hex: string;
}

export interface PersonalColor {
  season: Season;
  sub_tone: SubTone;
  label: string;
  label_ko: string;
  description: string;
  swatches: ColorSwatch[];
}

/* ── StyleDNA ──────────────────────────────────────────────────────── */

export interface StyleDNA {
  user_id: string;
  body_shape: BodyShapeResult;
  color_dna: PersonalColor;
  grace_goal: string;
  tpo_preference: TPOContext[];
  updated_at: string;
}

/* ── UI Meta ───────────────────────────────────────────────────────── */

export const BODY_SHAPE_META: Record<
  BodyShape,
  { label: string; label_ko: string; description: string }
> = {
  INVERTED_TRIANGLE: {
    label: "Inverted Triangle",
    label_ko: "역삼각형",
    description: "어깨 라인이 돋보이며 당당한 존재감을 발산합니다",
  },
  PEAR: {
    label: "Pear",
    label_ko: "배형",
    description: "부드러운 곡선의 여성스러운 실루엣을 지닙니다",
  },
  HOURGLASS: {
    label: "Hourglass",
    label_ko: "모래시계형",
    description: "균형 잡힌 비율로 어떤 스타일도 자연스럽게 소화합니다",
  },
  RECTANGLE: {
    label: "Rectangle",
    label_ko: "직사각형",
    description: "깔끔한 라인으로 모던하고 시크한 스타일이 어울립니다",
  },
};

/* ── Mock Data ─────────────────────────────────────────────────────── */

export const MOCK_STYLE_DNA: StyleDNA = {
  user_id: "user_001",
  body_shape: {
    primary: { shape: "HOURGLASS", confidence: 0.72 },
    secondary: { shape: "INVERTED_TRIANGLE", confidence: 0.21 },
    measurements: {
      bust_cm: 88,
      waist_cm: 66,
      hip_cm: 90,
      height_cm: 164,
    },
    coaching_narrative:
      "균형 잡힌 모래시계형 실루엣을 기반으로, 어깨의 당당함도 함께 발산할 수 있는 잠재력을 지니고 있습니다.",
  },
  color_dna: {
    season: "SPRING",
    sub_tone: "LIGHT",
    label: "Light Spring",
    label_ko: "라이트 스프링",
    description:
      "밝고 따뜻한 색조가 발색을 살려주는 타입. 크리미 아이보리, 피치, 코럴 계열이 특히 잘 어울립니다.",
    swatches: [
      { name: "Peach Cream", name_ko: "피치 크림", hex: "#FDDCBC" },
      { name: "Soft Coral", name_ko: "소프트 코럴", hex: "#F4A57E" },
      { name: "Warm Ivory", name_ko: "웜 아이보리", hex: "#FFF4E0" },
      { name: "Golden Yellow", name_ko: "골든 옐로우", hex: "#F5C84B" },
      { name: "Spring Green", name_ko: "스프링 그린", hex: "#B8E0A0" },
      { name: "Sky Aqua", name_ko: "스카이 아쿠아", hex: "#8ED8D8" },
      { name: "Blossom Pink", name_ko: "블라썸 핑크", hex: "#FFAEC3" },
      { name: "Cream Beige", name_ko: "크림 베이지", hex: "#E8D5B0" },
    ],
  },
  grace_goal: "Effortless chic — 힘 뺀 듯 완성된 Parisian 무드",
  tpo_preference: ["first_date", "weekend_casual", "daily_office"],
  updated_at: "2026-03-29T09:00:00Z",
};
