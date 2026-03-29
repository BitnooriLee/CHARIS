/**
 * clothing-scale.ts
 *
 * SVG 실루엣 위 의류 이미지 앵커링 · 스케일 계산 유틸리티.
 *
 * 기준: BodyVisualizer viewBox "0 0 160 285"
 *   shoulder Y: 68  →  68/285 = 23.9% of viewBox height
 *   waist    Y: 162 → 162/285 = 56.8%
 *   hip      Y: 218 → 218/285 = 76.5%
 *   hem      Y: 244 → 244/285 = 85.6%
 */

const VB_H = 285; // viewBox height

/** Body key-point Y as % of SVG container height */
export const BODY_ANCHOR_PCT = {
  shoulder: parseFloat(((68  / VB_H) * 100).toFixed(1)), // 23.9
  waist:    parseFloat(((162 / VB_H) * 100).toFixed(1)), // 56.8
  hip:      parseFloat(((218 / VB_H) * 100).toFixed(1)), // 76.5
  hem:      parseFloat(((244 / VB_H) * 100).toFixed(1)), // 85.6
} as const;

type AnchorPoint = "shoulder" | "waist";

interface ClothingGeometry {
  anchor:        AnchorPoint;
  /** fraction of body height the item covers (for clip-path calculation) */
  coverFraction: number;
}

const ITEM_GEOMETRY: Record<string, ClothingGeometry> = {
  // ── Tops ───────────────────────────────────────────────────────────────
  blouse:         { anchor: "shoulder", coverFraction: 0.33 },
  button_down:    { anchor: "shoulder", coverFraction: 0.33 },
  knit:           { anchor: "shoulder", coverFraction: 0.35 },
  t_shirt:        { anchor: "shoulder", coverFraction: 0.30 },
  crop_top:       { anchor: "shoulder", coverFraction: 0.22 },
  sleeveless:     { anchor: "shoulder", coverFraction: 0.33 },
  // ── Bottoms ────────────────────────────────────────────────────────────
  mini_skirt:     { anchor: "waist",    coverFraction: 0.28 },
  midi_skirt:     { anchor: "waist",    coverFraction: 0.38 },
  maxi_skirt:     { anchor: "waist",    coverFraction: 0.55 },
  slim_pants:     { anchor: "waist",    coverFraction: 0.55 },
  wide_pants:     { anchor: "waist",    coverFraction: 0.55 },
  jeans:          { anchor: "waist",    coverFraction: 0.55 },
  shorts:         { anchor: "waist",    coverFraction: 0.22 },
  leggings:       { anchor: "waist",    coverFraction: 0.62 },
  // ── Dresses ────────────────────────────────────────────────────────────
  mini_dress:     { anchor: "shoulder", coverFraction: 0.62 },
  midi_dress:     { anchor: "shoulder", coverFraction: 0.72 },
  maxi_dress:     { anchor: "shoulder", coverFraction: 0.87 },
  // ── Outerwear ──────────────────────────────────────────────────────────
  blazer:         { anchor: "shoulder", coverFraction: 0.38 },
  suit_jacket:    { anchor: "shoulder", coverFraction: 0.40 },
  cardigan:       { anchor: "shoulder", coverFraction: 0.40 },
  trench_coat:    { anchor: "shoulder", coverFraction: 0.72 },
  puffer:         { anchor: "shoulder", coverFraction: 0.55 },
  leather_jacket: { anchor: "shoulder", coverFraction: 0.40 },
  denim_jacket:   { anchor: "shoulder", coverFraction: 0.38 },
};

const FALLBACK: ClothingGeometry = { anchor: "shoulder", coverFraction: 0.50 };

export function getClothingGeometry(itemType: string): ClothingGeometry {
  return ITEM_GEOMETRY[itemType] ?? FALLBACK;
}

/**
 * Anchor Y position as a CSS percentage of the container height.
 * Tops/Dresses/Outerwear → shoulder (23.9%)
 * Bottoms               → waist   (56.8%)
 */
export function getAnchorTopPct(itemType: string): number {
  const { anchor } = getClothingGeometry(itemType);
  return BODY_ANCHOR_PCT[anchor];
}

/**
 * CSS clip-path `inset(…)` value that isolates the relevant body zone.
 * Prevents the head/background from dominating the overlay.
 */
export function getClipInset(itemType: string): string {
  const { anchor, coverFraction } = getClothingGeometry(itemType);

  if (anchor === "waist") {
    // Bottoms: clip the upper portion; keep waist → feet
    return "inset(40% 0 0 0)";
  }

  // Tops / Dresses: clip from shoulder down, trim unused foot area
  // shoulder region starts ~20% from image top (typical full-body photo)
  const clipBottom = Math.max(0, Math.round(100 - (coverFraction + 0.20) * 100));
  return `inset(0 0 ${clipBottom}% 0)`;
}

/**
 * Scale factor for the clothing overlay image based on user height.
 * Reference is 165 cm → scale 1.0. Clamped to [0.80, 1.20].
 *
 * @param heightCm      user's height in centimeters
 * @param refHeightCm   reference height (default 165)
 */
export function calcClothingScale(heightCm: number, refHeightCm = 165): number {
  return Math.max(0.80, Math.min(1.20, heightCm / refHeightCm));
}

/* ── 쇼핑 검색 유틸 ─────────────────────────────────────────────── */

export const ITEM_TYPE_KO: Record<string, string> = {
  blouse:         "블라우스",
  button_down:    "셔츠",
  knit:           "니트",
  t_shirt:        "티셔츠",
  crop_top:       "크롭탑",
  sleeveless:     "민소매탑",
  mini_skirt:     "미니스커트",
  midi_skirt:     "미디스커트",
  maxi_skirt:     "맥시스커트",
  slim_pants:     "슬림팬츠",
  wide_pants:     "와이드팬츠",
  jeans:          "청바지",
  shorts:         "반바지",
  leggings:       "레깅스",
  mini_dress:     "미니원피스",
  midi_dress:     "미디원피스",
  maxi_dress:     "맥시원피스",
  blazer:         "블레이저",
  suit_jacket:    "수트재킷",
  cardigan:       "가디건",
  trench_coat:    "트렌치코트",
  puffer:         "패딩",
  leather_jacket: "레더재킷",
  denim_jacket:   "데님재킷",
};

/**
 * Musinsa search URL for the given item type + optional color hint.
 * Falls back to 29CM if user prefers a different retailer (swap the base URL).
 */
export function buildSearchUrl(itemType: string, colorHint?: string): string {
  const itemKo = ITEM_TYPE_KO[itemType] ?? itemType.replace(/_/g, " ");
  const query  = colorHint ? `${itemKo} ${colorHint}` : itemKo;
  return `https://www.musinsa.com/search/musinsa/integration?q=${encodeURIComponent(query)}&sortCode=RECOMMEND`;
}
