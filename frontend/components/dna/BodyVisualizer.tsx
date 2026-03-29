"use client";

import { BodyShape, BodyShapeResult, BODY_SHAPE_META } from "@/types/dna";

/* ── Silhouette geometry ──────────────────────────────────────────── */

interface ShapeParams {
  neckW: number; // half-width at neckline
  shoulderW: number; // half-width at shoulder
  waistW: number; // half-width at waist
  hipW: number; // half-width at hip fullest
}

const SHAPE_PARAMS: Record<BodyShape, ShapeParams> = {
  HOURGLASS: { neckW: 11, shoulderW: 42, waistW: 21, hipW: 42 },
  INVERTED_TRIANGLE: { neckW: 11, shoulderW: 50, waistW: 24, hipW: 34 },
  PEAR: { neckW: 11, shoulderW: 32, waistW: 23, hipW: 50 },
  RECTANGLE: { neckW: 11, shoulderW: 40, waistW: 34, hipW: 40 },
};

const CX = 80; // horizontal center in "0 0 160 285" viewBox

const Y = {
  neck: 40, // neckline
  shoulder: 68, // shoulder point
  waist: 162, // waist narrowest
  hip: 218, // hip fullest
  hem: 244, // hem (slightly below hip)
} as const;

/**
 * Generates a closed SVG path for the given body shape.
 * Uses cubic Bézier curves for smooth fashion-croquis lines.
 * Left side is the exact geometric mirror of the right side.
 */
function buildPath(p: ShapeParams): string {
  const { neckW, shoulderW, waistW, hipW } = p;
  const hemW = Math.round(hipW * 0.9);
  const cx = CX;
  const { neck: yn, shoulder: ys, waist: yw, hip: yh, hem: yb } = Y;

  return [
    // ── Right side (top → bottom) ──────────────────────────────
    `M ${cx + neckW},${yn}`,
    // Neckline → Shoulder
    `C ${cx + shoulderW + 6},${yn + 8} ${cx + shoulderW},${ys - 8} ${cx + shoulderW},${ys}`,
    // Shoulder → Waist (inward curve)
    `C ${cx + shoulderW},${ys + 50} ${cx + waistW + 12},${yw - 26} ${cx + waistW},${yw}`,
    // Waist → Hip (outward curve)
    `C ${cx + waistW + 6},${yw + 24} ${cx + hipW},${yh - 28} ${cx + hipW},${yh}`,
    // Hip → Hem
    `L ${cx + hemW},${yb}`,
    // ── Bottom ─────────────────────────────────────────────────
    `L ${cx - hemW},${yb}`,
    // ── Left side (bottom → top, mirrored Béziers) ─────────────
    // Hem → Hip
    `L ${cx - hipW},${yh}`,
    // Hip → Waist (mirrored: swap & negate x offsets of right CP1/CP2)
    `C ${cx - hipW},${yh - 28} ${cx - waistW - 6},${yw + 24} ${cx - waistW},${yw}`,
    // Waist → Shoulder
    `C ${cx - waistW - 12},${yw - 26} ${cx - shoulderW},${ys + 50} ${cx - shoulderW},${ys}`,
    // Shoulder → Neckline
    `C ${cx - shoulderW},${ys - 8} ${cx - shoulderW - 6},${yn + 8} ${cx - neckW},${yn}`,
    `Z`,
  ].join(" ");
}

/* ── Component ────────────────────────────────────────────────────── */

interface Props {
  result: BodyShapeResult;
}

export default function BodyVisualizer({ result }: Props) {
  const { primary, secondary } = result;
  const primaryP = SHAPE_PARAMS[primary.shape];
  const secondaryP = secondary ? SHAPE_PARAMS[secondary.shape] : null;

  const primaryPath = buildPath(primaryP);
  const secondaryPath = secondaryP ? buildPath(secondaryP) : null;

  const primaryMeta = BODY_SHAPE_META[primary.shape];
  const secondaryMeta = secondary ? BODY_SHAPE_META[secondary.shape] : null;

  // Dashed guide lines at shoulder / waist / hip
  const guideLines = [
    { y: Y.shoulder, w: primaryP.shoulderW, label: "B" },
    { y: Y.waist, w: primaryP.waistW, label: "W" },
    { y: Y.hip, w: primaryP.hipW, label: "H" },
  ];

  return (
    <div className="flex flex-col items-center gap-5">
      {/* ── SVG Silhouette ─────────────────────────────────────── */}
      <div className="relative">
        <svg
          viewBox="0 0 160 285"
          className="h-[240px] w-auto"
          xmlns="http://www.w3.org/2000/svg"
          aria-label={`${primaryMeta.label_ko} 체형 실루엣`}
        >
          {/* Head */}
          <ellipse
            cx={80}
            cy={17}
            rx={10}
            ry={13}
            fill="#F8F6F0"
            stroke="#1C1C1E"
            strokeWidth="1.2"
          />

          {/* Neck connector (trapezoid bridging head → neckline) */}
          <path
            d={`M 74,28 L ${CX - primaryP.neckW},${Y.neck} L ${CX + primaryP.neckW},${Y.neck} L 86,28 Z`}
            fill="#F8F6F0"
            stroke="none"
          />

          {/* Secondary shape (gold dashed overlay) */}
          {secondaryPath && (
            <path
              d={secondaryPath}
              fill="none"
              stroke="#C9A84C"
              strokeWidth="1.2"
              strokeDasharray="5 3"
              opacity={0.65}
            />
          )}

          {/* Primary shape */}
          <path
            d={primaryPath}
            fill="#F8F6F0"
            stroke="#1C1C1E"
            strokeWidth="1.5"
          />

          {/* Measurement guide lines */}
          {guideLines.map(({ y, w, label }) => (
            <g key={label}>
              <line
                x1={CX - w + 3}
                y1={y}
                x2={CX + w - 3}
                y2={y}
                stroke="#C9A84C"
                strokeWidth="0.6"
                strokeDasharray="2.5 2"
                opacity={0.5}
              />
              {/* Label on right */}
              <text
                x={CX + w + 5}
                y={y + 3.5}
                fontSize="7"
                fill="#C9A84C"
                opacity={0.7}
                fontFamily="var(--font-sans)"
                letterSpacing="0.05em"
              >
                {label}
              </text>
            </g>
          ))}
        </svg>
      </div>

      {/* ── Shape Legend ────────────────────────────────────────── */}
      <div className="flex flex-col items-start gap-[6px] self-center">
        {/* Primary */}
        <div className="flex items-center gap-2">
          <span className="inline-block h-px w-7 bg-charcoal" />
          <span className="font-sans text-[11px] text-charcoal">
            {primaryMeta.label_ko}
            <span className="ml-1.5 text-charcoal/45">
              {Math.round(primary.confidence * 100)}%
            </span>
          </span>
        </div>

        {/* Secondary */}
        {secondary && secondaryMeta && (
          <div className="flex items-center gap-2">
            <span
              className="inline-block h-0 w-7 border-t border-dashed"
              style={{ borderColor: "#C9A84C" }}
            />
            <span className="font-sans text-[11px] text-charcoal/55">
              {secondaryMeta.label_ko}
              <span className="ml-1.5 text-charcoal/35">
                {Math.round(secondary.confidence * 100)}%
              </span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
