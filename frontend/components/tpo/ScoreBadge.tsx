import type { ScoreLevel } from "@/types/tpo";
import { SCORE_LEVEL_CONFIG } from "@/types/tpo";

interface ScoreBadgeProps {
  level: ScoreLevel;
  score: number;
  /** 추가 className */
  className?: string;
}

export function ScoreBadge({ level, score, className = "" }: ScoreBadgeProps) {
  const config = SCORE_LEVEL_CONFIG[level];

  return (
    <div
      className={[
        "inline-flex items-center gap-2 rounded-[var(--radius-pill)] px-3 py-1.5",
        config.bg,
        className,
      ].join(" ")}
    >
      {/* 컬러 도트 */}
      <span className={["h-2 w-2 rounded-full flex-shrink-0", config.dot].join(" ")} />

      {/* 레이블 */}
      <span
        className={[
          "text-[11px] font-semibold uppercase tracking-[0.12em]",
          config.text,
        ].join(" ")}
      >
        {config.label}
      </span>

      {/* 점수 */}
      <span className={["text-[11px] font-medium opacity-70", config.text].join(" ")}>
        {Math.round(score * 100)}
        <span className="text-[9px]">%</span>
      </span>
    </div>
  );
}
