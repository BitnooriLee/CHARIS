"use client";

import { useState } from "react";
import { Fingerprint } from "lucide-react";
import BodyVisualizer from "@/components/dna/BodyVisualizer";
import ColorPalette from "@/components/dna/ColorPalette";
import GraceGoal from "@/components/dna/GraceGoal";
import { MOCK_STYLE_DNA, BODY_SHAPE_META } from "@/types/dna";

/* Section wrapper */
function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-5 px-5">
      <div className="flex items-center gap-2">
        <span className="font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-gold">
          {label}
        </span>
        <span className="flex-1 border-t border-pearl" />
      </div>
      {children}
    </section>
  );
}

/* TPO tag */
const TPO_LABELS: Record<string, string> = {
  first_date: "소개팅",
  anniversary: "기념일",
  campus_date: "캠퍼스룩",
  daily_office: "데일리 오피스",
  client_meeting: "클라이언트 미팅",
  job_interview: "취업 면접",
  wedding_guest: "웨딩 게스트",
  graduation: "졸업식",
  weekend_casual: "주말 캐주얼",
  outdoor_active: "아웃도어",
  date_night: "데이트 나이트",
};

/* ── Page ─────────────────────────────────────────────────────────── */

export default function DNAPage() {
  // API 연동 시 MOCK_STYLE_DNA를 fetch 결과로 교체:
  //   const [dna, setDna] = useState<StyleDNA | null>(null)
  //   useEffect(() => { fetchStyleDNA(userId).then(setDna) }, [])
  const [dna, setDna] = useState(MOCK_STYLE_DNA);

  const primaryMeta = BODY_SHAPE_META[dna.body_shape.primary.shape];

  return (
    <div className="flex min-h-full flex-col bg-ivory pb-[calc(var(--spacing-nav)+24px)]">
      {/* ── Page header ──────────────────────────────────────────── */}
      <header className="sticky top-0 z-10 flex items-center gap-3 bg-ivory/90 px-5 py-4 backdrop-blur-md">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-charcoal">
          <Fingerprint size={15} className="text-ivory" />
        </div>
        <div>
          <p className="font-display text-[9px] font-semibold uppercase tracking-[0.22em] text-gold">
            Style DNA
          </p>
          <h1 className="text-xl font-bold leading-tight tracking-tight text-charcoal">
            나만의 스타일 정체성
          </h1>
        </div>
      </header>

      <div className="flex flex-col gap-8 pt-2">
        {/* ──────────────────────────────────────────────────────── */}
        {/* 1. Body DNA                                             */}
        {/* ──────────────────────────────────────────────────────── */}
        <Section label="◈ Body DNA">
          <div className="rounded-[var(--radius-card)] bg-pearl/60 px-5 py-6">
            {/* Silhouette + narrative side-by-side on wider screens,
                stacked on narrow */}
            <div className="flex flex-col items-center gap-6">
              <BodyVisualizer result={dna.body_shape} />

              {/* Coaching narrative */}
              <div className="flex flex-col gap-3 text-center">
                <p className="text-base font-medium leading-snug text-charcoal">
                  <span className="font-bold">
                    {primaryMeta.label_ko}
                  </span>
                  {" "}형의 {primaryMeta.description}
                </p>
                <p className="font-sans text-xs leading-relaxed text-charcoal/55">
                  {dna.body_shape.coaching_narrative}
                </p>
              </div>

              {/* Measurement chips — B(ust) / W(aist) / H(ip) / ↑(height) */}
              <div className="flex gap-2.5">
                {(
                  [
                    { k: "B", label: "cm", v: dna.body_shape.measurements.bust_cm },
                    { k: "W", label: "cm", v: dna.body_shape.measurements.waist_cm },
                    { k: "H", label: "cm", v: dna.body_shape.measurements.hip_cm },
                    { k: "↑", label: "cm", v: dna.body_shape.measurements.height_cm },
                  ] as const
                ).map(({ k, label, v }) => (
                  <div
                    key={k}
                    className="flex flex-col items-center gap-0.5 rounded-xl bg-ivory px-3.5 py-2"
                  >
                    <span className="font-sans text-[9px] font-semibold tracking-widest text-gold">
                      {k}
                    </span>
                    <span className="font-display text-base font-semibold text-charcoal">
                      {v}
                    </span>
                    <span className="font-sans text-[8px] text-charcoal/40">
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* ──────────────────────────────────────────────────────── */}
        {/* 2. Color DNA                                            */}
        {/* ──────────────────────────────────────────────────────── */}
        <Section label="✦ Color DNA">
          <div className="rounded-[var(--radius-card)] bg-pearl/60 px-5 py-6">
            <ColorPalette color={dna.color_dna} />
          </div>
        </Section>

        {/* ──────────────────────────────────────────────────────── */}
        {/* 3. Grace Goal                                           */}
        {/* ──────────────────────────────────────────────────────── */}
        <Section label="✧ Grace Goal">
          <GraceGoal
            goal={dna.grace_goal}
            onSave={(updated) => setDna((prev) => ({ ...prev, grace_goal: updated }))}
          />
        </Section>

        {/* ──────────────────────────────────────────────────────── */}
        {/* 4. TPO Lifestyle                                        */}
        {/* ──────────────────────────────────────────────────────── */}
        <Section label="◇ TPO 라이프스타일">
          <div className="flex flex-wrap gap-2 px-1">
            {dna.tpo_preference.map((tpo) => (
              <span
                key={tpo}
                className="rounded-full border border-gold/40 bg-gold/5 px-3 py-1 font-sans text-xs text-charcoal/70"
              >
                {TPO_LABELS[tpo] ?? tpo}
              </span>
            ))}
          </div>
          <p className="px-1 font-sans text-[11px] leading-relaxed text-charcoal/40">
            자주 필요한 TPO 상황을 설정하면 CHARIS가 더 정밀하게 스타일링합니다.
          </p>
        </Section>
      </div>
    </div>
  );
}
