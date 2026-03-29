"use client";

/**
 * GracefulEditPanel
 * =================
 * 슬라이드 업 패널 — "Graceful Edit" 탭 선택 시 표시.
 *
 * 데이터 소스:
 *   - tpo_score.coaching_opening  → 메인 코칭 메시지
 *   - tpo_score.body_shape_tip    → 체형 특화 스타일링 팁
 *   - tpo_score.key_focus         → 이 TPO에서 핵심 포인트 리스트
 *   - tpo_score.enhance_axes      → 보완이 필요한 축 (보완 방향 카드로 변환)
 */

import { motion, type Transition } from "framer-motion";
import { Sparkles, ChevronRight } from "lucide-react";
import { OutfitTPOScore } from "@/types/tpo";

/* ── 보완 축 → 한국어 액션 힌트 ─────────────────────────────────── */
const ENHANCE_ACTION: Record<string, string> = {
  elegance:   "우아한 소재(실크·새틴)나 H라인 실루엣으로 격을 높여보세요",
  authority:  "구조적인 숄더 라인의 재킷·블레이저를 더해보세요",
  effortless: "레이어링을 줄이고 쿨한 심플함을 살려보세요",
  romantic:   "러플 디테일이나 플로럴 패턴으로 부드러움을 더해보세요",
  boldness:   "포인트 컬러 아이템 하나로 존재감을 끌어올려보세요",
};

interface Props {
  report: OutfitTPOScore;
}

export default function GracefulEditPanel({ report }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      transition={{ duration: 0.35, ease: "easeOut" } as Transition}
      className="flex flex-col gap-3"
    >
      {/* ── 메인 코칭 메시지 ──────────────────────────────────── */}
      <div
        className="rounded-[var(--radius-card)] bg-gold/8 p-4"
        style={{ boxShadow: "0 0 0 1px rgba(201,168,76,0.18)" }}
      >
        <div className="mb-2 flex items-center gap-1.5">
          <Sparkles size={11} className="text-gold" />
          <p className="font-display text-[9px] font-semibold uppercase tracking-[0.22em] text-gold">
            Grace Coaching
          </p>
        </div>
        <p className="text-sm font-medium leading-relaxed text-charcoal">
          {report.coaching_opening}
        </p>
      </div>

      {/* ── 체형 특화 팁 ─────────────────────────────────────── */}
      <div className="rounded-[var(--radius-card)] bg-ivory p-4"
        style={{ boxShadow: "var(--shadow-card)" }}>
        <p className="mb-2 font-sans text-[9px] font-semibold uppercase tracking-[0.2em] text-charcoal/40">
          ✦ Body-Shape Tip
        </p>
        <p className="font-sans text-sm leading-relaxed text-charcoal/80">
          {report.body_shape_tip}
        </p>
      </div>

      {/* ── 보완 축 액션 카드 ──────────────────────────────────── */}
      {report.enhance_axes.length > 0 && (
        <div className="rounded-[var(--radius-card)] bg-ivory p-4"
          style={{ boxShadow: "var(--shadow-card)" }}>
          <p className="mb-3 font-sans text-[9px] font-semibold uppercase tracking-[0.2em] text-blush">
            ◈ Graceful Edits
          </p>
          <ul className="flex flex-col gap-2.5">
            {report.enhance_axes.map((axis) => (
              <li key={axis} className="flex items-start gap-2.5">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-blush" />
                <p className="font-sans text-[12px] leading-relaxed text-charcoal/75">
                  {ENHANCE_ACTION[axis] ?? `${axis} 축 보완이 필요합니다.`}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Key Focus 리스트 ─────────────────────────────────── */}
      {report.key_focus.length > 0 && (
        <div className="rounded-[var(--radius-card)] bg-gold/5 p-4">
          <p className="mb-2.5 font-sans text-[9px] font-semibold uppercase tracking-[0.2em] text-gold">
            ✦ Key Focus
          </p>
          <ul className="flex flex-col gap-2">
            {report.key_focus.map((tip, i) => (
              <li key={i} className="flex items-start gap-2">
                <ChevronRight size={11} className="mt-0.5 shrink-0 text-gold/60" />
                <span className="font-sans text-xs leading-relaxed text-charcoal/70">
                  {tip}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </motion.div>
  );
}
