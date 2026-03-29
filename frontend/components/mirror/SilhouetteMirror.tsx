"use client";

/**
 * SilhouetteMirror
 * ================
 * The core visual of /mirror:
 *   Layer 1 (bg)  — Captured outfit photo (opacity, clip-path)
 *   Layer 2 (mid) — Gradient placeholder when no photo is available
 *   Layer 3 (fg)  — SVG silhouette outline (transparent fill) + B/W/H guides
 *   Layer 4 (top) — Graceful Edit gold overlay (AnimatePresence)
 *
 * Anchoring logic:
 *   Tops/Dresses → shoulder anchor  (Y = 23.9% of viewBox)
 *   Bottoms      → waist anchor     (Y = 56.8% of viewBox)
 *
 * Scale:
 *   transform: scale(heightCm / 165) on the photo layer
 *   transform-origin: `center ${anchorTopPct}%` (scales around anchor)
 */

import { useRef } from "react";
import { motion, AnimatePresence, type Transition } from "framer-motion";
import {
  getAnchorTopPct,
  getClipInset,
  calcClothingScale,
} from "@/lib/clothing-scale";
import { BodyShape } from "@/types/dna";

/* ── SVG geometry (mirrors BodyVisualizer constants) ────────────── */

const CX = 80;

const Y = {
  neck:     40,
  shoulder: 68,
  waist:    162,
  hip:      218,
  hem:      244,
} as const;

interface ShapeParams {
  neckW: number;
  shoulderW: number;
  waistW: number;
  hipW: number;
}

const SHAPE_PARAMS: Record<BodyShape, ShapeParams> = {
  HOURGLASS:         { neckW: 11, shoulderW: 42, waistW: 21, hipW: 42 },
  INVERTED_TRIANGLE: { neckW: 11, shoulderW: 50, waistW: 24, hipW: 34 },
  PEAR:              { neckW: 11, shoulderW: 32, waistW: 23, hipW: 50 },
  RECTANGLE:         { neckW: 11, shoulderW: 40, waistW: 34, hipW: 40 },
};

function buildPath(p: ShapeParams): string {
  const { neckW, shoulderW, waistW, hipW } = p;
  const hemW = Math.round(hipW * 0.9);
  const { neck: yn, shoulder: ys, waist: yw, hip: yh, hem: yb } = Y;
  return [
    `M ${CX + neckW},${yn}`,
    `C ${CX + shoulderW + 6},${yn + 8} ${CX + shoulderW},${ys - 8} ${CX + shoulderW},${ys}`,
    `C ${CX + shoulderW},${ys + 50} ${CX + waistW + 12},${yw - 26} ${CX + waistW},${yw}`,
    `C ${CX + waistW + 6},${yw + 24} ${CX + hipW},${yh - 28} ${CX + hipW},${yh}`,
    `L ${CX + hemW},${yb}`,
    `L ${CX - hemW},${yb}`,
    `L ${CX - hipW},${yh}`,
    `C ${CX - hipW},${yh - 28} ${CX - waistW - 6},${yw + 24} ${CX - waistW},${yw}`,
    `C ${CX - waistW - 12},${yw - 26} ${CX - shoulderW},${ys + 50} ${CX - shoulderW},${ys}`,
    `C ${CX - shoulderW},${ys - 8} ${CX - shoulderW - 6},${yn + 8} ${CX - neckW},${yn}`,
    `Z`,
  ].join(" ");
}

/* ── Sub-component: SVG overlay ─────────────────────────────────── */

function SilhouetteSVG({
  bodyShape,
  mode,
}: {
  bodyShape: BodyShape;
  mode: "original" | "graceful_edit";
}) {
  const p = SHAPE_PARAMS[bodyShape];
  const bodyPath = buildPath(p);

  const strokeColor  = mode === "original" ? "#1C1C1E" : "#C9A84C";
  const strokeOpacity = mode === "original" ? 0.50 : 0.85;
  const glowFilter   = mode === "graceful_edit" ? "url(#goldGlow)" : undefined;

  const guides = [
    { y: Y.shoulder, w: p.shoulderW, label: "B" },
    { y: Y.waist,    w: p.waistW,    label: "W" },
    { y: Y.hip,      w: p.hipW,      label: "H" },
  ];

  return (
    <svg
      viewBox="0 0 160 285"
      className="absolute inset-0 h-full w-full"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <filter id="goldGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Head */}
      <ellipse cx={80} cy={17} rx={10} ry={13}
        fill="none" stroke={strokeColor} strokeWidth="1.2" opacity={strokeOpacity} />

      {/* Body outline — transparent fill so photo shows through */}
      <path
        d={bodyPath}
        fill="none"
        stroke={strokeColor}
        strokeWidth={mode === "graceful_edit" ? 2 : 1.5}
        opacity={strokeOpacity}
        filter={glowFilter}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Graceful Edit: inner fill shimmer */}
      {mode === "graceful_edit" && (
        <path
          d={bodyPath}
          fill="rgba(201,168,76,0.06)"
          stroke="none"
        />
      )}

      {/* Measurement guide lines */}
      {guides.map(({ y, w, label }) => (
        <g key={label}>
          <line
            x1={CX - w + 3} y1={y}
            x2={CX + w - 3} y2={y}
            stroke={strokeColor}
            strokeWidth="0.6"
            strokeDasharray="2.5 2"
            opacity={mode === "graceful_edit" ? 0.70 : 0.40}
          />
          <text
            x={CX + w + 5} y={y + 3.5}
            fontSize="7"
            fill={strokeColor}
            opacity={0.65}
            fontFamily="var(--font-sans)"
            letterSpacing="0.05em"
          >
            {label}
          </text>
        </g>
      ))}

      {/* Anchor dot at active anchor point */}
      <circle
        cx={CX}
        cy={mode === "original" ? Y.shoulder : Y.waist}
        r="2.5"
        fill={mode === "graceful_edit" ? "#C9A84C" : "#1C1C1E"}
        opacity={0.55}
      />
    </svg>
  );
}

/* ── Main component ──────────────────────────────────────────────── */

interface Props {
  imageUrl:   string | null;
  itemType:   string;
  bodyShape?: BodyShape;
  heightCm?:  number;
  view:       "original" | "graceful_edit";
}

export default function SilhouetteMirror({
  imageUrl,
  itemType,
  bodyShape  = "HOURGLASS",
  heightCm   = 165,
  view,
}: Props) {
  const containerRef  = useRef<HTMLDivElement>(null);
  const anchorTopPct  = getAnchorTopPct(itemType);
  const clipInset     = getClipInset(itemType);
  const heightScale   = calcClothingScale(heightCm);

  // Transform-origin: scale around the anchor point on Y axis
  const transformOriginY = `${anchorTopPct}%`;

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden rounded-2xl bg-charcoal/5"
      style={{ aspectRatio: "3 / 4" }}
      aria-label="Silhouette Mirror"
    >

      {/* ── Layer 1: Photo or gradient placeholder ────────────── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={view}
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 } as Transition}
        >
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt="Scanned outfit"
              className="absolute inset-0 h-full w-full object-cover object-top"
              style={{
                clipPath:        clipInset,
                opacity:         view === "graceful_edit" ? 0.65 : 0.82,
                filter:          view === "graceful_edit"
                  ? "sepia(20%) brightness(0.95) saturate(0.85)"
                  : "none",
                transform:       `scale(${heightScale})`,
                transformOrigin: `center ${transformOriginY}`,
              }}
            />
          ) : (
            /* Gradient placeholder when no photo available */
            <div
              className="absolute inset-0"
              style={{
                background:
                  view === "graceful_edit"
                    ? "linear-gradient(170deg, rgba(201,168,76,0.12) 0%, rgba(248,246,240,0.6) 30%, rgba(220,210,195,0.4) 65%, rgba(200,190,175,0.3) 100%)"
                    : "linear-gradient(170deg, #F5EEE6 0%, #EDE8DF 35%, #D4C5B0 65%, #BFB0A0 100%)",
              }}
            />
          )}
        </motion.div>
      </AnimatePresence>

      {/* ── Layer 2: SVG silhouette outline ──────────────────── */}
      <motion.div
        className="pointer-events-none absolute inset-0"
        animate={{ opacity: 1 }}
        transition={{ duration: 0.35 } as Transition}
      >
        <SilhouetteSVG bodyShape={bodyShape} mode={view} />
      </motion.div>

      {/* ── Layer 3: Graceful Edit glow ring ─────────────────── */}
      <AnimatePresence>
        {view === "graceful_edit" && (
          <motion.div
            key="glow-ring"
            className="pointer-events-none absolute inset-0 rounded-2xl"
            style={{
              boxShadow: "inset 0 0 0 2px rgba(201,168,76,0.50)",
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 } as Transition}
          />
        )}
      </AnimatePresence>

      {/* ── Corner brackets ──────────────────────────────────── */}
      {[
        { top: "12px", left: "12px", bT: true, bL: true },
        { top: "12px", right: "12px", bT: true, bR: true },
        { bottom: "12px", left: "12px", bB: true, bL: true },
        { bottom: "12px", right: "12px", bB: true, bR: true },
      ].map((p, i) => (
        <div
          key={i}
          className="pointer-events-none absolute h-7 w-7"
          style={{
            top: p.top, left: p.left, right: p.right, bottom: p.bottom,
            borderTop:    "bT" in p ? "1.5px solid rgba(201,168,76,0.45)" : undefined,
            borderBottom: "bB" in p ? "1.5px solid rgba(201,168,76,0.45)" : undefined,
            borderLeft:   "bL" in p ? "1.5px solid rgba(201,168,76,0.45)" : undefined,
            borderRight:  "bR" in p ? "1.5px solid rgba(201,168,76,0.45)" : undefined,
          }}
        />
      ))}

      {/* ── Anchor label badge ───────────────────────────────── */}
      <div
        className="absolute left-3 rounded-full bg-charcoal/60 px-2 py-0.5 backdrop-blur-sm"
        style={{ top: `calc(${anchorTopPct}% - 10px)` }}
      >
        <span className="font-sans text-[8px] font-semibold uppercase tracking-widest text-ivory/70">
          {anchorTopPct < 40 ? "Shoulder" : "Waist"} anchor
        </span>
      </div>
    </div>
  );
}
