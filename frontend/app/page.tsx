"use client";

import { useMemo } from "react";
import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import { Sparkles, ScanLine, ChevronRight } from "lucide-react";
import { MOCK_STYLE_DNA, BODY_SHAPE_META } from "@/types/dna";

/* ── Animation variants ───────────────────────────────────────────────── */

const PAGE_CONTAINER: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.08, delayChildren: 0.04 },
  },
};

const FADE_UP: Variants = {
  hidden: { opacity: 0, y: 22 },
  show:   { opacity: 1, y: 0,  transition: { duration: 0.48, type: "tween" } },
};

/* ── Coaching message pool ────────────────────────────────────────────── */

type CoachingEntry = { tag: string; message: string };

const COACHING_POOL: Record<string, CoachingEntry[]> = {
  "HOURGLASS:SPRING": [
    { tag: "모래시계형 × 라이트 스프링", message: "피치 크림 블라우스 하나가 당신의 황금 허리 비율을 완성합니다. 오늘은 벨트를 잊지 마세요." },
    { tag: "모래시계형 × 웜톤", message: "웜 아이보리 피트 드레스는 모래시계 실루엣을 가장 우아하게 빛내주는 공식입니다." },
  ],
  "HOURGLASS:SUMMER": [
    { tag: "모래시계형 × 쿨뮤트", message: "더스티 로즈 랩 드레스는 모래시계형을 위해 태어난 실루엣. 오늘 꺼내볼 완벽한 이유입니다." },
    { tag: "모래시계형 × 여름뮤트", message: "라벤더 그레이 니트를 허리에 살짝 넣어 입으면 당신의 곡선이 시가 됩니다." },
  ],
  "HOURGLASS:AUTUMN": [
    { tag: "모래시계형 × 어텀딥", message: "카멜 벨티드 코트 하나로 모래시계 실루엣의 진수를 보여주세요. 깊이감이 완성됩니다." },
    { tag: "모래시계형 × 어스톤", message: "버건디 니트 드레스는 어텀 타입의 모래시계형을 위한 최강 아이템입니다." },
  ],
  "HOURGLASS:WINTER": [
    { tag: "모래시계형 × 윈터", message: "블랙 피트 앤 플레어 드레스 — 윈터 타입의 선명함과 모래시계 곡선이 만나는 지점입니다." },
    { tag: "모래시계형 × 딥윈터", message: "로열 블루 랩 탑과 블랙 슬랙스. 대비의 힘으로 오늘의 당신을 완성하세요." },
  ],
  "INVERTED_TRIANGLE:SPRING": [
    { tag: "역삼각형 × 라이트 스프링", message: "당당한 어깨 라인에 플로럴 와이드 팬츠를 매치해보세요. 상하단의 드라마틱한 밸런스." },
    { tag: "역삼각형 × 웜톤", message: "피치 소프트 탑 + 와이드 팬츠 조합으로 어깨의 힘을 부드럽게 중화해보세요." },
  ],
  "INVERTED_TRIANGLE:SUMMER": [
    { tag: "역삼각형 × 쿨뮤트", message: "로즈 그레이 A라인 스커트가 역삼각형 실루엣에 여성스러운 밸런스를 더합니다." },
    { tag: "역삼각형 × 여름뮤트", message: "플로위한 미디 스커트 하나로 어깨의 존재감을 우아하게 연장해보세요." },
  ],
  "INVERTED_TRIANGLE:AUTUMN": [
    { tag: "역삼각형 × 어텀딥", message: "어스톤 팔라초 팬츠로 어깨에서 발끝까지 이어지는 파워풀한 세로 라인을 만들어보세요." },
  ],
  "INVERTED_TRIANGLE:WINTER": [
    { tag: "역삼각형 × 윈터", message: "블랙 와이드 팬츠 + 화이트 심플 탑. 역삼각형의 파워와 윈터의 대비감이 완벽히 맞아떨어집니다." },
  ],
  "PEAR:SPRING": [
    { tag: "배형 × 라이트 스프링", message: "스프링의 밝은 에너지를 상체에 집중해보세요. 코럴 오프숄더 탑이 시선을 자연스럽게 이끕니다." },
    { tag: "배형 × 웜톤", message: "골든 옐로우 포인트 탑 + 다크 보텀 조합으로 상체의 발색을 극대화해보세요." },
  ],
  "PEAR:SUMMER": [
    { tag: "배형 × 쿨뮤트", message: "라벤더 퍼프슬리브 블라우스는 배형 체형의 상체를 사랑스럽게 빛내주는 마법의 아이템." },
  ],
  "PEAR:AUTUMN": [
    { tag: "배형 × 어텀딥", message: "카멜 크롭 재킷으로 상체에 따뜻한 존재감을 더하고, 다크 팬츠로 하체를 우아하게 정돈해보세요." },
  ],
  "PEAR:WINTER": [
    { tag: "배형 × 윈터", message: "화이트 스트럭처드 재킷이 배형의 상체를 선명하게 프레이밍합니다. 블랙 슬랙스로 완성하세요." },
  ],
  "RECTANGLE:SPRING": [
    { tag: "직사각형 × 라이트 스프링", message: "스프링 플로럴 패턴 블라우스를 살짝 넣어 입으면 깔끔한 라인에 생동감이 피어납니다." },
    { tag: "직사각형 × 웜톤", message: "레이어링의 정석 — 피치 크림 탑 위에 오버사이즈 린넨 재킷을 걸치면 모던한 세련미 완성." },
  ],
  "RECTANGLE:SUMMER": [
    { tag: "직사각형 × 쿨뮤트", message: "소프트 레이어링은 직사각형 체형의 시크한 특권. 그레이 컬러 믹스로 입체감을 더해보세요." },
  ],
  "RECTANGLE:AUTUMN": [
    { tag: "직사각형 × 어텀딥", message: "텍스처 레이어링이 빛나는 어텀 시즌. 카멜 코트 속 버건디 니트로 깊이감을 연출해보세요." },
  ],
  "RECTANGLE:WINTER": [
    { tag: "직사각형 × 윈터", message: "블랙 수트에 화이트 셔츠. 직사각형 체형 × 윈터 타입이 가장 완벽해지는 공식입니다." },
  ],
};

const FALLBACK_COACHING: CoachingEntry = {
  tag: "오늘의 스타일 팁",
  message: "당신의 실루엣은 이미 완벽합니다. 오늘은 하나의 포인트 컬러로 무드를 바꿔보세요.",
};

function useCoachingOfTheDay(dna: typeof MOCK_STYLE_DNA): CoachingEntry {
  return useMemo(() => {
    const shape  = dna.body_shape.primary.shape;
    const season = dna.color_dna.season;
    const key    = `${shape}:${season}`;
    const pool   = COACHING_POOL[key] ?? [];
    if (pool.length === 0) return FALLBACK_COACHING;
    // Deterministic daily rotation: index by day-of-year
    const dayIdx = Math.floor(Date.now() / 86_400_000) % pool.length;
    return pool[dayIdx];
  }, [dna]);
}

/* ── Component ────────────────────────────────────────────────────────── */

export default function HomePage() {
  const dna      = MOCK_STYLE_DNA;
  const coaching = useCoachingOfTheDay(dna);
  const shapeMeta = BODY_SHAPE_META[dna.body_shape.primary.shape];
  const swatches  = dna.color_dna.swatches.slice(0, 4);

  return (
    <motion.div
      className="flex min-h-full flex-col px-5 pt-12 pb-8"
      variants={PAGE_CONTAINER}
      initial="hidden"
      animate="show"
    >
      {/* ── Header ── */}
      <motion.header className="mb-7" variants={FADE_UP}>
        <p className="font-display mb-1 text-xs font-semibold uppercase tracking-[0.22em] text-gold">
          Style Coach
        </p>
        <h1 className="text-3xl font-bold leading-tight tracking-tight text-charcoal">
          안녕하세요,<br />
          <span className="font-bold">오늘도 빛나세요.</span>
        </h1>
      </motion.header>

      {/* ── 오늘의 카리스 — Personalized Coaching ── */}
      <motion.section
        className="mb-4 rounded-[var(--radius-card)] bg-charcoal p-6"
        style={{ boxShadow: "var(--shadow-card)" }}
        variants={FADE_UP}
      >
        <div className="mb-3 flex items-center gap-2">
          <Sparkles size={14} className="text-gold" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gold">
            오늘의 카리스
          </span>
          <span className="ml-auto rounded-full bg-white/10 px-2 py-0.5 font-sans text-[9px] font-medium text-ivory/50">
            {coaching.tag}
          </span>
        </div>
        <p className="text-base font-medium leading-relaxed text-ivory">
          "{coaching.message}"
        </p>
      </motion.section>

      {/* ── DNA Quick-Look ── */}
      <motion.section
        className="mb-4 overflow-hidden rounded-[var(--radius-card)] border border-pearl bg-white/70 p-4"
        style={{ boxShadow: "var(--shadow-card)" }}
        variants={FADE_UP}
      >
        <div className="mb-3 flex items-center justify-between">
          <p className="font-display text-[10px] font-semibold uppercase tracking-[0.22em] text-charcoal/40">
            Style DNA
          </p>
          <Link
            href="/dna"
            className="flex items-center gap-0.5 text-[10px] font-semibold text-gold"
          >
            자세히 <ChevronRight size={10} />
          </Link>
        </div>

        <div className="flex items-start gap-4">
          {/* Body shape */}
          <div className="flex-1">
            <p className="text-[10px] font-medium uppercase tracking-wider text-charcoal/40">
              체형
            </p>
            <p className="mt-0.5 text-base font-semibold text-charcoal">
              {shapeMeta.label_ko}
            </p>
            <p className="mt-0.5 text-[11px] leading-snug text-charcoal/55">
              {shapeMeta.description}
            </p>
          </div>

          {/* Divider */}
          <div className="w-px self-stretch bg-pearl" />

          {/* Color swatches */}
          <div className="flex-1">
            <p className="text-[10px] font-medium uppercase tracking-wider text-charcoal/40">
              베스트 컬러
            </p>
            <p className="mt-0.5 text-[11px] font-semibold text-charcoal">
              {dna.color_dna.label_ko}
            </p>
            <div className="mt-2 flex gap-1.5">
              {swatches.map((s) => (
                <div
                  key={s.hex}
                  className="h-6 w-6 rounded-full border border-white/60 shadow-sm"
                  style={{ backgroundColor: s.hex }}
                  title={s.name_ko}
                />
              ))}
            </div>
          </div>
        </div>
      </motion.section>

      {/* ── Primary CTA ── */}
      <motion.div variants={FADE_UP} className="mb-4">
        <Link
          href="/scan"
          className="flex w-full items-center justify-center gap-2.5 rounded-[var(--radius-pill)] bg-charcoal py-4 font-sans text-sm font-semibold text-ivory shadow-md active:scale-[0.98] transition-transform"
        >
          <ScanLine size={16} />
          스캔 시작하기
        </Link>
      </motion.div>

      {/* ── Quick Action Cards ── */}
      <motion.div className="mb-4 grid grid-cols-2 gap-3" variants={FADE_UP}>
        <QuickCard
          label="Mirror of Charis"
          sublabel="실루엣 시뮬레이션"
          href="/mirror"
          bg="bg-blush-light"
          accent="text-blush"
        />
        <QuickCard
          label="Closet Rescue"
          sublabel="옷장 되살리기"
          href="/closet"
          bg="bg-gold-light/30"
          accent="text-gold-dark"
        />
      </motion.div>

      {/* ── Grace Goal Teaser ── */}
      <motion.section
        className="rounded-[var(--radius-card)] border border-pearl bg-pearl/50 p-4"
        variants={FADE_UP}
      >
        <p className="font-display mb-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-charcoal/40">
          Grace Goal
        </p>
        <p className="text-sm font-normal text-charcoal/70 leading-relaxed">
          "{dna.grace_goal}"
        </p>
        <Link
          href="/dna"
          className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-gold"
        >
          목표 수정하기 →
        </Link>
      </motion.section>
    </motion.div>
  );
}

/* ── QuickCard sub-component ─────────────────────────────────────────── */

function QuickCard({
  label, sublabel, href, bg, accent,
}: {
  label: string; sublabel: string; href: string; bg: string; accent: string;
}) {
  return (
    <Link
      href={href}
      className={[
        "block rounded-[var(--radius-card)] p-4 active:scale-[0.97] transition-transform",
        bg,
      ].join(" ")}
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <p className={["text-[10px] font-semibold uppercase tracking-wider", accent].join(" ")}>
        {sublabel}
      </p>
      <p className="mt-1 text-sm font-medium leading-snug text-charcoal">
        {label}
      </p>
    </Link>
  );
}
