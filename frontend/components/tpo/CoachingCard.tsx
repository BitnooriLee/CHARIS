import { Activity, Sparkles, Wand2 } from "lucide-react";
import type { OutfitTPOScore } from "@/types/tpo";

interface CoachingCardProps {
  report: OutfitTPOScore;
}

interface SectionConfig {
  icon: React.ReactNode;
  badge: string;
  badgeStyle: string;
  iconBg: string;
  content: string;
}

export function CoachingCard({ report }: CoachingCardProps) {
  const sections: SectionConfig[] = [
    {
      icon:       <Sparkles size={14} strokeWidth={1.5} />,
      badge:      "✦ Praise",
      badgeStyle: "text-gold-dark bg-gold-light/25",
      iconBg:     "bg-gold-light/25 text-gold-dark",
      content:    report.coaching_opening,
    },
    {
      icon:       <Activity size={14} strokeWidth={1.5} />,
      badge:      "◈ Analysis",
      badgeStyle: "text-charcoal/60 bg-charcoal-50",
      iconBg:     "bg-charcoal-50 text-charcoal/60",
      content:    report.body_shape_tip,
    },
    {
      icon:       <Wand2 size={14} strokeWidth={1.5} />,
      badge:      "✧ Graceful Edit",
      badgeStyle: "text-blush bg-blush-light/40",
      iconBg:     "bg-blush-light/40 text-blush",
      content:    report.key_focus.join(" · "),
    },
  ];

  return (
    <div
      className="overflow-hidden rounded-[var(--radius-card)] bg-ivory"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      {sections.map((section, idx) => (
        <div key={idx}>
          {/* 구분선 (첫 번째 제외) */}
          {idx > 0 && <div className="mx-5 h-px bg-pearl" />}

          <div className="px-5 py-4">
            {/* 섹션 배지 */}
            <div className="mb-2.5 inline-flex items-center gap-1.5">
              <span
                className={[
                  "flex h-5 w-5 items-center justify-center rounded-full",
                  section.iconBg,
                ].join(" ")}
              >
                {section.icon}
              </span>
              <span
                className={[
                  "font-display rounded-[var(--radius-pill)] px-2 py-0.5",
                  "text-[10px] font-semibold uppercase tracking-[0.16em]",
                  section.badgeStyle,
                ].join(" ")}
              >
                {section.badge}
              </span>
            </div>

            <p className="text-sm font-normal leading-relaxed text-charcoal/80">
              {section.content}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
