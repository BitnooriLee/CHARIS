"use client";

import { PersonalColor, ColorSwatch } from "@/types/dna";

/* ── Fan geometry ─────────────────────────────────────────────────── */

// 8 chips, spanning −70° to +70° in 20° steps
const FAN_ANGLES = [-70, -50, -30, -10, 10, 30, 50, 70] as const;

interface ChipProps {
  swatch: ColorSwatch;
  angleDeg: number;
  index: number;
}

function FanChip({ swatch, angleDeg, index }: ChipProps) {
  return (
    <div
      aria-label={`${swatch.name_ko} ${swatch.hex}`}
      className="absolute bottom-0 left-1/2 -ml-[15px] h-[92px] w-[30px] origin-bottom rounded-t-full shadow-sm transition-transform duration-200 hover:scale-y-110"
      style={{
        backgroundColor: swatch.hex,
        transform: `rotate(${angleDeg}deg)`,
        // layering: chips fan out with later chips on top of earlier
        zIndex: index,
        border: "1px solid rgba(28,28,30,0.08)",
      }}
    />
  );
}

/* ── Season badge ─────────────────────────────────────────────────── */

const SEASON_LABEL: Record<string, string> = {
  SPRING: "Spring ✿",
  SUMMER: "Summer ☽",
  AUTUMN: "Autumn ✦",
  WINTER: "Winter ❄",
};

const SEASON_COLOR: Record<string, string> = {
  SPRING: "#F4A57E",
  SUMMER: "#9EC3D4",
  AUTUMN: "#C9854C",
  WINTER: "#7A8FA6",
};

/* ── Component ────────────────────────────────────────────────────── */

interface Props {
  color: PersonalColor;
}

export default function ColorPalette({ color }: Props) {
  const { season, label_ko, label, description, swatches } = color;

  return (
    <div className="flex flex-col gap-5">
      {/* Season badge + title */}
      <div className="flex items-center gap-3">
        <span
          className="rounded-full px-3 py-0.5 font-sans text-[10px] font-semibold uppercase tracking-widest text-ivory"
          style={{ backgroundColor: SEASON_COLOR[season] }}
        >
          {SEASON_LABEL[season]}
        </span>
        <div>
          <p className="font-display text-lg font-semibold leading-tight text-charcoal italic">
            {label}
          </p>
          <p className="font-sans text-[11px] text-charcoal/50">{label_ko}</p>
        </div>
      </div>

      {/* ── Fan spread ─────────────────────────────────────────── */}
      <div className="flex flex-col items-center gap-4">
        {/* The fan container — chips rotate around the bottom-center point */}
        <div className="relative h-[110px] w-full max-w-[260px]">
          {swatches.map((swatch, i) => (
            <FanChip
              key={swatch.hex}
              swatch={swatch}
              angleDeg={FAN_ANGLES[i]}
              index={i}
            />
          ))}
        </div>

        {/* Description */}
        <p className="font-sans text-xs leading-relaxed text-charcoal/60 text-center max-w-[280px]">
          {description}
        </p>
      </div>

      {/* ── Hex reference grid (2 × 4) ─────────────────────────── */}
      <div className="grid grid-cols-4 gap-2">
        {swatches.map((swatch) => (
          <SwatchChip key={swatch.hex} swatch={swatch} />
        ))}
      </div>
    </div>
  );
}

/* ── Swatch chip (grid) ───────────────────────────────────────────── */

function SwatchChip({ swatch }: { swatch: ColorSwatch }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      {/* Color circle */}
      <div
        className="h-10 w-10 rounded-full shadow-sm"
        style={{
          backgroundColor: swatch.hex,
          border: "1px solid rgba(28,28,30,0.08)",
        }}
      />
      {/* Name */}
      <p
        className="font-sans text-center leading-tight text-charcoal/70"
        style={{ fontSize: "9px" }}
      >
        {swatch.name_ko}
      </p>
      {/* Hex code */}
      <p
        className="font-mono tracking-tight text-charcoal/40"
        style={{ fontSize: "8px" }}
      >
        {swatch.hex}
      </p>
    </div>
  );
}
