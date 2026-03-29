import type { AxisFitDetail } from "@/types/tpo";
import { AXIS_META } from "@/types/tpo";

interface AxisScoreBarProps {
  detail: AxisFitDetail;
}

const PENALTY_LABEL: Record<string, string> = {
  upper_cap:   "↓ 낮출수록 ↑",
  lower_floor: "↑ 높일수록 ↑",
  symmetric:   "목표에 근접",
};

export function AxisScoreBar({ detail }: AxisScoreBarProps) {
  const meta = AXIS_META.find((m) => m.key === detail.axis);
  if (!meta) return null;

  const fitPct    = Math.round(detail.fit_score * 100);
  const currentPct = Math.round(detail.outfit_value * 100);
  const targetPct  = Math.round(detail.tpo_target * 100);

  const scoreColor = detail.is_strength
    ? "text-gold-dark"
    : detail.needs_enhance
    ? "text-blush"
    : "text-charcoal/50";

  const barColor = detail.is_strength
    ? "bg-gold/40"
    : detail.needs_enhance
    ? "bg-blush/50"
    : "bg-charcoal/20";

  return (
    <div className="flex items-center gap-3">
      {/* 축 이름 */}
      <div className="w-[88px] flex-shrink-0">
        <p className="text-[11px] font-semibold text-charcoal leading-none">
          {meta.icon} {meta.en}
        </p>
        <p className="text-[9px] text-charcoal/35 mt-0.5">{meta.kr}</p>
      </div>

      {/* 바 트랙 */}
      <div className="relative flex-1 h-[5px] rounded-full bg-pearl">
        {/* 현재치 바 */}
        <div
          className={["absolute left-0 h-full rounded-full transition-all", barColor].join(" ")}
          style={{ width: `${currentPct}%` }}
        />
        {/* 목표치 마커 — Gold 세로선 */}
        <div
          className="absolute top-1/2 h-[11px] w-[2px] -translate-y-1/2 rounded-full bg-gold"
          style={{ left: `${targetPct}%` }}
        />
      </div>

      {/* Fit 점수 */}
      <div className="w-9 flex-shrink-0 text-right">
        <span className={["text-[11px] font-bold tabular-nums", scoreColor].join(" ")}>
          {fitPct}
          <span className="text-[9px] font-normal">%</span>
        </span>
      </div>
    </div>
  );
}
