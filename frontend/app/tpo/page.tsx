"use client";

import dynamic from "next/dynamic";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Compass, Sparkles, Eye } from "lucide-react";

/** Recharts는 초기 번들에서 분리 — TPO 진입 시에만 로드 (Vercel bundle-dynamic-imports) */
const StyleRadarChart = dynamic(
  () =>
    import("@/components/tpo/StyleRadarChart").then((m) => ({
      default: m.StyleRadarChart,
    })),
  {
    ssr: false,
    loading: () => (
      <div
        className="mx-auto flex h-[270px] w-full max-w-[340px] items-center justify-center rounded-lg bg-pearl/30 text-xs text-charcoal/40"
        aria-busy="true"
      >
        차트 로딩…
      </div>
    ),
  },
);
import { CoachingCard } from "@/components/tpo/CoachingCard";
import { ScoreBadge } from "@/components/tpo/ScoreBadge";
import { AxisScoreBar } from "@/components/tpo/AxisScoreBar";
import { OutfitTPOScore, MOCK_WEDDING_GUEST_REPORT } from "@/types/tpo";
import { loadScanResult, minutesSinceScan } from "@/lib/scan-store";

/**
 * TPO 분석 리포트 페이지
 *
 * 데이터 우선순위:
 *  1. localStorage (scan 페이지에서 분석한 결과 — 30분 유효)
 *  2. MOCK_WEDDING_GUEST_REPORT (fallback)
 */
export default function TPOPage() {
  const router = useRouter();
  const [report,      setReport]      = useState<OutfitTPOScore>(MOCK_WEDDING_GUEST_REPORT);
  const [isFromScan,  setIsFromScan]  = useState(false);
  const [isDemo,      setIsDemo]      = useState(false);
  const [minAgo,      setMinAgo]      = useState<number | null>(null);

  useEffect(() => {
    const stored = loadScanResult();
    if (stored) {
      setReport(stored.tpo_score);
      setIsFromScan(true);
      setIsDemo(stored.is_demo);
      setMinAgo(minutesSinceScan(stored));
    }
  }, []);

  return (
    <article className="min-h-full px-5 pb-10 pt-10">

      {/* ── Header ──────────────────────────────────────────────── */}
      <header className="mb-7">
        <div className="mb-3 flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-charcoal-50">
            <Compass size={13} strokeWidth={1.5} className="text-charcoal/60" />
          </span>
          <span className="font-display text-[11px] font-semibold uppercase tracking-[0.22em] text-charcoal/40">
            TPO Coaching
          </span>

          {/* Source badge */}
          {isFromScan && (
            <span
              className={[
                "ml-auto flex items-center gap-1 rounded-full px-2 py-0.5 font-sans text-[9px] font-semibold",
                isDemo
                  ? "bg-charcoal/8 text-charcoal/40"
                  : "bg-gold/10 text-gold-dark",
              ].join(" ")}
            >
              <Sparkles size={8} />
              {isDemo ? "데모 결과" : minAgo !== null ? `${minAgo}분 전 스캔` : "스캔 결과"}
            </span>
          )}
        </div>

        <h1 className="text-2xl font-bold leading-tight tracking-tight text-charcoal">
          {report.display_kr} 리포트
        </h1>

        <div className="mt-3">
          <ScoreBadge level={report.score_level} score={report.total_fit_score} />
        </div>
      </header>

      {/* ── Radar Chart ─────────────────────────────────────────── */}
      <section
        className="mb-5 rounded-[var(--radius-card)] bg-ivory px-2 pb-5 pt-4"
        style={{ boxShadow: "var(--shadow-card)" }}
        aria-label="5축 스타일링 레이더 차트"
      >
        <SectionLabel text="Style Radar" />
        <StyleRadarChart axisDetails={report.axis_details} height={270} />
      </section>

      {/* ── Axis Breakdown ──────────────────────────────────────── */}
      <section
        className="mb-5 rounded-[var(--radius-card)] bg-ivory p-5"
        style={{ boxShadow: "var(--shadow-card)" }}
        aria-label="축별 상세 점수"
      >
        <SectionLabel text="Axis Breakdown" />
        <div className="mt-3 flex flex-col gap-3.5">
          {report.axis_details.map((detail) => (
            <AxisScoreBar key={detail.axis} detail={detail} />
          ))}
        </div>

        <div className="mt-4 flex items-center gap-4 border-t border-pearl pt-3">
          <LegendDot color="bg-gold/40"  label="강점 축" />
          <LegendDot color="bg-blush/50" label="보완 필요" />
          <div className="ml-auto flex items-center gap-1">
            <div className="h-[9px] w-[2px] rounded-full bg-gold" />
            <span className="text-[9px] text-charcoal/35">목표치</span>
          </div>
        </div>
      </section>

      {/* ── Coaching Card ───────────────────────────────────────── */}
      <section className="mb-5" aria-label="코칭 카드">
        <SectionLabel text="Coaching" className="mb-3 px-1" />
        <CoachingCard report={report} />
      </section>

      {/* ── Key Focus ───────────────────────────────────────────── */}
      {report.key_focus && report.key_focus.length > 0 && (
        <section className="mb-5 rounded-[var(--radius-card)] bg-gold/5 p-4">
          <p className="mb-2.5 font-sans text-[9px] font-semibold uppercase tracking-[0.2em] text-gold">
            ✦ Key Focus
          </p>
          <ul className="flex flex-col gap-2">
            {report.key_focus.map((tip, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-gold" />
                <span className="font-sans text-xs leading-relaxed text-charcoal/70">{tip}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── Strength / Enhance summary ──────────────────────────── */}
      <section className="mb-6 grid grid-cols-2 gap-3">
        <SummaryChip
          title="강점"
          items={report.strength_axes}
          accentClass="text-gold-dark"
          bgClass="bg-gold-light/20"
          dotClass="bg-gold"
        />
        <SummaryChip
          title="보완 포인트"
          items={report.enhance_axes}
          accentClass="text-blush"
          bgClass="bg-blush-light/30"
          dotClass="bg-blush"
        />
      </section>

      {/* ── Mirror CTA ──────────────────────────────────────────── */}
      <button
        onClick={() => router.push("/mirror")}
        className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-pill)] bg-charcoal py-4 font-sans text-sm font-semibold text-ivory shadow-sm active:scale-[0.98] transition-transform"
      >
        <Eye size={15} />
        실루엣 미러에서 보기
      </button>
    </article>
  );
}

/* ── Sub-components ──────────────────────────────────────────────── */

function SectionLabel({ text, className = "" }: { text: string; className?: string }) {
  return (
    <p className={["font-display text-[10px] font-semibold uppercase tracking-[0.22em] text-charcoal/35", className].join(" ")}>
      {text}
    </p>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={["h-2 w-2 rounded-full", color].join(" ")} />
      <span className="text-[9px] text-charcoal/35">{label}</span>
    </div>
  );
}

function SummaryChip({
  title, items, accentClass, bgClass, dotClass,
}: {
  title: string; items: string[]; accentClass: string; bgClass: string; dotClass: string;
}) {
  return (
    <div className={["rounded-[var(--radius-card)] p-4", bgClass].join(" ")}>
      <p className={["mb-2 text-[10px] font-bold uppercase tracking-widest", accentClass].join(" ")}>
        {title}
      </p>
      <ul className="flex flex-col gap-1.5">
        {items.map((ax) => (
          <li key={ax} className="flex items-center gap-1.5">
            <span className={["h-1.5 w-1.5 flex-shrink-0 rounded-full", dotClass].join(" ")} />
            <span className="text-[11px] font-medium capitalize text-charcoal/70">{ax}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
