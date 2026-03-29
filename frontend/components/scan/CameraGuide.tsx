/**
 * CameraGuide
 *
 * Transparent SVG overlay for the camera viewfinder.
 * Shows a stylised "Graceful Silhouette" (shoulders → waist → hips)
 * in a faint Gold dashed stroke so the user knows where to align their outfit.
 *
 * ViewBox: 0 0 300 500  (portrait 3∶5 ratio, stretches to fill any container)
 * Center X: 150
 */

const CX = 150;

const Y = {
  neck: 58,
  shoulder: 95,
  waist: 255,
  hip: 335,
  hem: 368,
} as const;

// "Average" silhouette — a soft hourglass used only as an alignment guide
const P = {
  neckW: 16,
  shoulderW: 65,
  waistW: 35,
  hipW: 65,
  hemW: 58,
} as const;

function buildBodyPath(): string {
  const { neckW, shoulderW, waistW, hipW, hemW } = P;
  const { neck: yn, shoulder: ys, waist: yw, hip: yh, hem: yb } = Y;

  return [
    `M ${CX + neckW},${yn}`,
    // Neck → Shoulder (right)
    `C ${CX + shoulderW + 8},${yn + 12} ${CX + shoulderW},${ys - 10} ${CX + shoulderW},${ys}`,
    // Shoulder → Waist (right, inward)
    `C ${CX + shoulderW},${ys + 72} ${CX + waistW + 18},${yw - 36} ${CX + waistW},${yw}`,
    // Waist → Hip (right, outward)
    `C ${CX + waistW + 8},${yw + 34} ${CX + hipW},${yh - 36} ${CX + hipW},${yh}`,
    // Hip → Hem (right)
    `L ${CX + hemW},${yb}`,
    // Bottom edge
    `L ${CX - hemW},${yb}`,
    // Hem → Hip (left)
    `L ${CX - hipW},${yh}`,
    // Hip → Waist (left, mirrored)
    `C ${CX - hipW},${yh - 36} ${CX - waistW - 8},${yw + 34} ${CX - waistW},${yw}`,
    // Waist → Shoulder (left, mirrored)
    `C ${CX - waistW - 18},${yw - 36} ${CX - shoulderW},${ys + 72} ${CX - shoulderW},${ys}`,
    // Shoulder → Neck (left, mirrored)
    `C ${CX - shoulderW},${ys - 10} ${CX - shoulderW - 8},${yn + 12} ${CX - neckW},${yn}`,
    `Z`,
  ].join(" ");
}

/* ── Corner bracket helper ────────────────────────────────────────── */
function CornerBracket({
  x,
  y,
  flip,
}: {
  x: number;
  y: number;
  flip: boolean;
}) {
  const s = 22; // arm length
  const sx = flip ? -1 : 1;
  const sy = y > 250 ? -1 : 1; // bottom corners point up
  return (
    <path
      d={`M ${x + sx * s},${y} L ${x},${y} L ${x},${y + sy * s}`}
      fill="none"
      stroke="#C9A84C"
      strokeWidth="2"
      strokeLinecap="round"
      opacity={0.9}
    />
  );
}

/* ── Component ────────────────────────────────────────────────────── */
export default function CameraGuide() {
  const bodyPath = buildBodyPath();

  return (
    <svg
      viewBox="0 0 300 500"
      className="absolute inset-0 h-full w-full"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* ── Body silhouette outline ───────────────────────────── */}
      <path
        d={bodyPath}
        fill="rgba(201,168,76,0.04)"
        stroke="#C9A84C"
        strokeWidth="1.5"
        strokeDasharray="6 4"
        opacity={0.7}
      />

      {/* ── Head oval ─────────────────────────────────────────── */}
      <ellipse
        cx={CX}
        cy={28}
        rx={16}
        ry={20}
        fill="none"
        stroke="#C9A84C"
        strokeWidth="1.5"
        strokeDasharray="5 4"
        opacity={0.6}
      />

      {/* ── Neck connector ────────────────────────────────────── */}
      <line
        x1={CX - P.neckW}
        y1={Y.neck}
        x2={CX + P.neckW}
        y2={Y.neck}
        stroke="#C9A84C"
        strokeWidth="1"
        opacity={0.4}
      />

      {/* ── Horizontal measurement guides ─────────────────────── */}
      {/* Shoulder */}
      <g opacity={0.35}>
        <line
          x1={CX - P.shoulderW + 4}
          y1={Y.shoulder}
          x2={CX + P.shoulderW - 4}
          y2={Y.shoulder}
          stroke="#C9A84C"
          strokeWidth="0.8"
          strokeDasharray="3 3"
        />
        <text
          x={CX + P.shoulderW + 8}
          y={Y.shoulder + 4}
          fontSize="11"
          fill="#C9A84C"
          fontFamily="var(--font-sans)"
          letterSpacing="0.08em"
          opacity={0.8}
        >
          B
        </text>
      </g>

      {/* Waist */}
      <g opacity={0.35}>
        <line
          x1={CX - P.waistW + 4}
          y1={Y.waist}
          x2={CX + P.waistW - 4}
          y2={Y.waist}
          stroke="#C9A84C"
          strokeWidth="0.8"
          strokeDasharray="3 3"
        />
        <text
          x={CX + P.shoulderW + 8}
          y={Y.waist + 4}
          fontSize="11"
          fill="#C9A84C"
          fontFamily="var(--font-sans)"
          letterSpacing="0.08em"
          opacity={0.8}
        >
          W
        </text>
      </g>

      {/* Hip */}
      <g opacity={0.35}>
        <line
          x1={CX - P.hipW + 4}
          y1={Y.hip}
          x2={CX + P.hipW - 4}
          y2={Y.hip}
          stroke="#C9A84C"
          strokeWidth="0.8"
          strokeDasharray="3 3"
        />
        <text
          x={CX + P.shoulderW + 8}
          y={Y.hip + 4}
          fontSize="11"
          fill="#C9A84C"
          fontFamily="var(--font-sans)"
          letterSpacing="0.08em"
          opacity={0.8}
        >
          H
        </text>
      </g>

      {/* ── Corner brackets (frame alignment) ─────────────────── */}
      <CornerBracket x={20} y={20} flip={false} />
      <CornerBracket x={280} y={20} flip={true} />
      <CornerBracket x={20} y={480} flip={false} />
      <CornerBracket x={280} y={480} flip={true} />

      {/* ── Center vertical alignment dot ─────────────────────── */}
      <line
        x1={CX}
        y1={8}
        x2={CX}
        y2={48}
        stroke="#C9A84C"
        strokeWidth="0.6"
        opacity={0.3}
        strokeDasharray="2 3"
      />
      <line
        x1={CX}
        y1={68}
        x2={CX}
        y2={Y.neck - 2}
        stroke="#C9A84C"
        strokeWidth="0.6"
        opacity={0.3}
        strokeDasharray="2 3"
      />

      {/* ── Instruction label ──────────────────────────────────── */}
      <text
        x={CX}
        y={492}
        textAnchor="middle"
        fontSize="10"
        fill="#C9A84C"
        fontFamily="var(--font-sans)"
        letterSpacing="0.14em"
        opacity={0.7}
      >
        ALIGN OUTFIT TO GUIDE
      </text>
    </svg>
  );
}
