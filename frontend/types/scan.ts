export type ScanState = "IDLE" | "CAPTURING" | "ANALYZING" | "RESULT_READY";

/* ── Styling Axes (mirrors backend StylingAxes) ─────────────────── */
export interface StylingAxes {
  elegance: number;
  authority: number;
  effortless: number;
  romantic: number;
  boldness: number;
}

/* ── Vision attribute detected on the clothing ──────────────────── */
export interface VisionAttribute {
  id: string;
  label: string; // human-readable (e.g. "V-Neck", "A-라인")
  attribute: string; // raw category (e.g. "Neckline", "Silhouette")
  confidence: number; // 0–1
  top: string; // absolute-positioned overlay (% string)
  left: string;
  delayS: number; // sequential appearance delay in seconds
  colorHex?: string; // only for color chips
}

/* ── Final scan result ───────────────────────────────────────────── */
export interface ScanResult {
  axes: StylingAxes;
  attributes: VisionAttribute[];
  dominant_color: string;
  item_type: string;
}

/* ── UI metadata for each axis ──────────────────────────────────── */
export const AXIS_META: {
  key: keyof StylingAxes;
  label: string;
  label_ko: string;
  barColor: string;
}[] = [
  { key: "elegance", label: "Elegance", label_ko: "우아함", barColor: "#C9A84C" },
  { key: "authority", label: "Authority", label_ko: "권위감", barColor: "#7A8FA6" },
  { key: "effortless", label: "Effortless", label_ko: "자연스러움", barColor: "#9BAD9A" },
  { key: "romantic", label: "Romantic", label_ko: "로맨틱", barColor: "#D4A5A5" },
  { key: "boldness", label: "Boldness", label_ko: "개성", barColor: "#1C1C1E" },
];

/* ── Mock data (replaced by real API response) ──────────────────── */
export const MOCK_SCAN_RESULT: ScanResult = {
  axes: {
    elegance: 0.75,
    authority: 0.3,
    effortless: 0.65,
    romantic: 0.82,
    boldness: 0.28,
  },
  attributes: [
    {
      id: "neckline",
      label: "V-Neck",
      attribute: "Neckline",
      confidence: 0.92,
      top: "17%",
      left: "49%",
      delayS: 1.0,
    },
    {
      id: "sleeve",
      label: "3/4 소매",
      attribute: "Sleeve",
      confidence: 0.88,
      top: "40%",
      left: "76%",
      delayS: 2.0,
    },
    {
      id: "silhouette",
      label: "A-라인",
      attribute: "Silhouette",
      confidence: 0.85,
      top: "62%",
      left: "50%",
      delayS: 2.8,
    },
    {
      id: "print",
      label: "플로럴 패턴",
      attribute: "Print",
      confidence: 0.78,
      top: "50%",
      left: "27%",
      delayS: 3.5,
    },
    {
      id: "color",
      label: "Dusty Rose",
      attribute: "Color",
      confidence: 0.95,
      top: "28%",
      left: "24%",
      delayS: 4.0,
      colorHex: "#D4A5A5",
    },
  ],
  dominant_color: "#D4A5A5",
  item_type: "DRESS",
};
