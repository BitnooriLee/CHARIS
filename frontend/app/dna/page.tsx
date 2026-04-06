"use client";

import {
  useState, useEffect, useCallback, useRef, ChangeEvent,
} from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import {
  Fingerprint, ChevronRight, ChevronLeft, Check,
  Pencil, RotateCcw, Ruler, Palette, Camera, Upload,
  Sparkles, AlertCircle, ImageIcon,
} from "lucide-react";
import BodyVisualizer from "@/components/dna/BodyVisualizer";
import ColorPalette from "@/components/dna/ColorPalette";
import GraceGoal from "@/components/dna/GraceGoal";
import {
  BODY_SHAPE_META,
  type BodyShape, type StyleDNA, type Season, type SubTone,
} from "@/types/dna";
import { storeDNA, loadDNA, clearDNA } from "@/lib/dna-store";

/* ═══════════════ Animation variants ════════════════════════════════ */
const SLIDE: Variants = {
  hidden: { opacity: 0, x: 30 },
  show:   { opacity: 1, x: 0,  transition: { duration: 0.3, type: "tween" } },
  exit:   { opacity: 0, x: -30, transition: { duration: 0.2, type: "tween" } },
};

/* ═══════════════ Body shape helpers ════════════════════════════════ */
function classifyBodyShape(bust: number, waist: number, hip: number): BodyShape {
  const bh = bust - hip;
  const hb = hip - bust;
  const wr = waist / (bust || 1);
  if (Math.abs(bh) < 5 && wr < 0.75) return "HOURGLASS";
  if (bh >= 5)  return "INVERTED_TRIANGLE";
  if (hb >= 5)  return "PEAR";
  return "RECTANGLE";
}

const SHAPE_NARRATIVE: Record<BodyShape, string> = {
  HOURGLASS:          "균형 잡힌 비율로 어떤 스타일도 자연스럽게 소화합니다. 허리 포인트를 살리는 피트 실루엣이 특히 잘 어울립니다.",
  INVERTED_TRIANGLE:  "당당한 어깨 라인이 가장 큰 매력입니다. 와이드 팬츠나 플레어 스커트로 하체에 볼륨을 더하면 완벽한 밸런스가 완성됩니다.",
  PEAR:               "부드러운 곡선의 하체가 여성스러운 매력을 만들어냅니다. 상체에 포인트를 주면 시선이 자연스럽게 분산됩니다.",
  RECTANGLE:          "깔끔하고 직선적인 라인이 모던한 스타일에 잘 어울립니다. 레이어링과 텍스처로 입체감을 더하면 세련된 무드가 완성됩니다.",
};

/* ═══════════════ PCCS 16 Color Types ═══════════════════════════════ */
interface ColorTypeInfo {
  id: string; season: Season; sub_tone: SubTone;
  label: string; label_ko: string; description: string;
  swatches: string[]; accent: string;
}

const PCCS_COLOR_TYPES: ColorTypeInfo[] = [
  { id:"light_spring",  season:"SPRING", sub_tone:"LIGHT",  label:"Light Spring",  label_ko:"라이트 스프링",
    description:"밝고 따뜻한 봄빛. 피치, 크림 아이보리, 살구색이 피부 발색을 가장 밝게 살려줍니다.",
    swatches:["#FDDCBC","#F4A57E","#FFF4E0","#F5C84B","#FFAEC3"], accent:"#F59E0B" },
  { id:"warm_spring",   season:"SPRING", sub_tone:"VIVID",  label:"Warm Spring",   label_ko:"웜 스프링",
    description:"황금빛 풍부한 봄톤. 황토, 캐러멜, 산호색이 활기차고 건강한 인상을 만듭니다.",
    swatches:["#F9B262","#E8872E","#FFD166","#C9A84C","#FF8C69"], accent:"#D97706" },
  { id:"clear_spring",  season:"SPRING", sub_tone:"DEEP",   label:"Clear Spring",  label_ko:"클리어 스프링",
    description:"선명하고 화사한 봄톤. 비비드 코럴, 밝은 오렌지, 클리어 그린이 생동감을 줍니다.",
    swatches:["#FF6B6B","#FFA500","#FFE135","#40C4AA","#FF8FAB"], accent:"#EF4444" },
  { id:"soft_spring",   season:"SPRING", sub_tone:"MUTED",  label:"Soft Spring",   label_ko:"소프트 스프링",
    description:"부드럽고 온화한 봄톤. 베이지, 소프트 피치, 누드 계열이 자연스럽게 어울립니다.",
    swatches:["#E8C9A0","#DBBF94","#F5DEB3","#D4A574","#E8D5BC"], accent:"#B45309" },
  { id:"light_summer",  season:"SUMMER", sub_tone:"LIGHT",  label:"Light Summer",  label_ko:"라이트 서머",
    description:"밝고 섬세한 쿨톤. 소프트 라벤더, 베이비 핑크, 스카이 블루가 청초하게 빛납니다.",
    swatches:["#D4B8E0","#F7C5D0","#B0C4DE","#DDA0DD","#FAD0E4"], accent:"#8B5CF6" },
  { id:"cool_summer",   season:"SUMMER", sub_tone:"DEEP",   label:"Cool Summer",   label_ko:"쿨 서머",
    description:"차갑고 고급스러운 쿨톤. 블루핑크, 라일락, 그레이쉬 퍼플이 정교한 인상을 줍니다.",
    swatches:["#B0A4C8","#9B89B4","#C8A0C8","#8E8AB8","#E8E0F0"], accent:"#7C3AED" },
  { id:"muted_summer",  season:"SUMMER", sub_tone:"MUTED",  label:"Muted Summer",  label_ko:"뮤트 서머",
    description:"잿빛 도는 차분한 쿨톤. 그레이 블루, 모브, 더스티 로즈가 성숙하고 세련된 무드를 만듭니다.",
    swatches:["#9E8FA8","#B4A0B4","#A8BAC8","#C0A8B4","#D0C0C8"], accent:"#6B7280" },
  { id:"soft_summer",   season:"SUMMER", sub_tone:"VIVID",  label:"Soft Summer",   label_ko:"소프트 서머",
    description:"중성적이고 부드러운 쿨톤. 소프트 블루, 그레이 그린이 차분하고 우아한 무드를 완성합니다.",
    swatches:["#B8C4CC","#A8B8C4","#C0C8D0","#B8D0C0","#D8DFE4"], accent:"#60A5FA" },
  { id:"warm_autumn",   season:"AUTUMN", sub_tone:"VIVID",  label:"Warm Autumn",   label_ko:"웜 오텀",
    description:"황금빛 풍부한 어스톤. 카멜, 테라코타, 머스터드가 따뜻하고 풍요로운 존재감을 만듭니다.",
    swatches:["#C19A6B","#B87333","#DAA520","#D2691E","#8B7355"], accent:"#92400E" },
  { id:"deep_autumn",   season:"AUTUMN", sub_tone:"DEEP",   label:"Deep Autumn",   label_ko:"딥 오텀",
    description:"깊고 진한 어스톤. 버건디, 초콜릿, 다크 올리브가 강렬하고 카리스마 있는 인상을 줍니다.",
    swatches:["#722F37","#5C3317","#4A4A2A","#8B3A3A","#654321"], accent:"#7C2D12" },
  { id:"muted_autumn",  season:"AUTUMN", sub_tone:"MUTED",  label:"Muted Autumn",  label_ko:"뮤트 오텀",
    description:"그레이쉬 내추럴 어스톤. 카키, 세이지 그린, 테이프가 편안하고 자연스러운 무드를 만듭니다.",
    swatches:["#9B8E7A","#8B7355","#7A8B6A","#A09070","#C4A882"], accent:"#78716C" },
  { id:"soft_autumn",   season:"AUTUMN", sub_tone:"LIGHT",  label:"Soft Autumn",   label_ko:"소프트 오텀",
    description:"부드럽고 온화한 어스톤. 피치 베이지, 소프트 테라코타가 따뜻하고 친근한 매력을 완성합니다.",
    swatches:["#C4A882","#B89880","#D4B896","#A08868","#E8D4B0"], accent:"#A16207" },
  { id:"cool_winter",   season:"WINTER", sub_tone:"LIGHT",  label:"Cool Winter",   label_ko:"쿨 윈터",
    description:"맑고 차가운 쿨톤. 아이시 핑크, 아이시 블루, 실버가 청초하고 섬세한 매력을 발휘합니다.",
    swatches:["#E0E8F8","#C4D4E8","#E8D4E8","#B8C8E0","#F0E8F4"], accent:"#3B82F6" },
  { id:"deep_winter",   season:"WINTER", sub_tone:"DEEP",   label:"Deep Winter",   label_ko:"딥 윈터",
    description:"깊고 선명한 쿨톤. 네이비, 블랙, 딥 버건디로 강렬한 대비와 압도적 존재감을 만듭니다.",
    swatches:["#1A1A2E","#16213E","#0F3460","#533483","#9B2335"], accent:"#4338CA" },
  { id:"clear_winter",  season:"WINTER", sub_tone:"VIVID",  label:"Clear Winter",  label_ko:"클리어 윈터",
    description:"선명하고 고채도 쿨톤. 로열 블루, 트루 레드, 에메랄드로 화려하고 당당한 이미지를 완성합니다.",
    swatches:["#0047AB","#DC143C","#009473","#800080","#FFD700"], accent:"#1D4ED8" },
  { id:"soft_winter",   season:"WINTER", sub_tone:"MUTED",  label:"Soft Winter",   label_ko:"소프트 윈터",
    description:"차분하고 섬세한 쿨톤. 그레이 퍼플, 그레이쉬 블루가 지적이고 조화로운 분위기를 만듭니다.",
    swatches:["#8090A8","#9088A8","#909898","#A89898","#B0B0C0"], accent:"#475569" },
];

/* Draping sequence for animation — 4 season representative color sets */
const DRAPE_SEQUENCE: { season: string; swatches: string[] }[] = [
  { season: "봄 Spring",   swatches: ["#FDDCBC","#F4A57E","#FFD166","#FFAEC3","#FFF4E0"] },
  { season: "여름 Summer", swatches: ["#DDA0DD","#B0A4C8","#F7C5D0","#B0C4DE","#E8E0F0"] },
  { season: "가을 Autumn", swatches: ["#C19A6B","#B87333","#DAA520","#D2691E","#8B7355"] },
  { season: "겨울 Winter", swatches: ["#1A1A2E","#0047AB","#DC143C","#009473","#533483"] },
];

const SEASON_BG: Record<Season, string> = {
  SPRING: "bg-amber-50 border-amber-200",
  SUMMER: "bg-violet-50 border-violet-200",
  AUTUMN: "bg-orange-50 border-orange-200",
  WINTER: "bg-blue-50 border-blue-200",
};
const SEASONS: Season[] = ["SPRING","SUMMER","AUTUMN","WINTER"];

const TPO_LABELS: Record<string, string> = {
  first_date:"소개팅", anniversary:"기념일", campus_date:"캠퍼스룩",
  daily_office:"데일리 오피스", client_meeting:"클라이언트 미팅",
  job_interview:"취업 면접", wedding_guest:"웨딩 게스트",
  graduation:"졸업식", weekend_casual:"주말 캐주얼",
  outdoor_active:"아웃도어", date_night:"데이트 나이트",
};

/* ═══════════════ DNA builder ═══════════════════════════════════════ */
function buildDNA(
  height:number, bust:number, waist:number, hip:number,
  colorType:ColorTypeInfo, graceGoal:string,
): StyleDNA {
  const shape = classifyBodyShape(bust, waist, hip);
  return {
    user_id:"user_local",
    body_shape:{
      primary:{ shape, confidence:0.72 },
      secondary:null,
      measurements:{ bust_cm:bust, waist_cm:waist, hip_cm:hip, height_cm:height },
      coaching_narrative: SHAPE_NARRATIVE[shape],
    },
    color_dna:{
      season:colorType.season, sub_tone:colorType.sub_tone,
      label:colorType.label, label_ko:colorType.label_ko,
      description:colorType.description,
      swatches: colorType.swatches.map((hex,i) => ({ hex, name:`Swatch ${i+1}`, name_ko:`컬러 ${i+1}` })),
    },
    grace_goal:graceGoal,
    tpo_preference:["weekend_casual","daily_office","first_date"],
    updated_at: new Date().toISOString(),
  };
}

/* ═══════════════════════════════════════════════════════════════════
   Page
═══════════════════════════════════════════════════════════════════ */
type PageView   = "loading" | "setup" | "profile";
type SetupStep  = "body" | "color" | "goal";

export default function DNAPage() {
  const [view,     setView]     = useState<PageView>("loading");
  const [step,     setStep]     = useState<SetupStep>("body");
  const [dna,      setDna]      = useState<StyleDNA | null>(null);

  const [height,   setHeight]   = useState(165);
  const [bust,     setBust]     = useState(88);
  const [waist,    setWaist]    = useState(68);
  const [hip,      setHip]      = useState(90);
  const [colorId,  setColorId]  = useState<string | null>(null);
  const [goal,     setGoal]     = useState("Effortless chic — 힘 뺀 듯 완성된 나만의 무드");

  const [editMode, setEditMode] = useState<"body"|"color"|null>(null);

  useEffect(() => {
    const saved = loadDNA();
    if (saved) { setDna(saved); setView("profile"); }
    else        setView("setup");
  }, []);

  const handleSave = useCallback(() => {
    const ct = PCCS_COLOR_TYPES.find(c => c.id === colorId);
    if (!ct) return;
    const newDNA = buildDNA(height, bust, waist, hip, ct, goal);
    storeDNA(newDNA); setDna(newDNA); setView("profile");
  }, [height, bust, waist, hip, colorId, goal]);

  const handleEditSave = useCallback(() => {
    if (!dna) return;
    if (editMode === "body") {
      const shape   = classifyBodyShape(bust, waist, hip);
      const updated = {
        ...dna,
        body_shape:{
          ...dna.body_shape,
          primary:{ shape, confidence:0.72 }, secondary:null,
          measurements:{ bust_cm:bust, waist_cm:waist, hip_cm:hip, height_cm:height },
          coaching_narrative: SHAPE_NARRATIVE[shape],
        },
        updated_at: new Date().toISOString(),
      };
      storeDNA(updated); setDna(updated);
    } else if (editMode === "color") {
      const ct = PCCS_COLOR_TYPES.find(c => c.id === colorId);
      if (!ct) return;
      const updated = {
        ...dna,
        color_dna:{
          season:ct.season, sub_tone:ct.sub_tone,
          label:ct.label, label_ko:ct.label_ko, description:ct.description,
          swatches: ct.swatches.map((hex,i) => ({ hex, name:`Swatch ${i+1}`, name_ko:`컬러 ${i+1}` })),
        },
        updated_at: new Date().toISOString(),
      };
      storeDNA(updated); setDna(updated);
    }
    setEditMode(null);
  }, [dna, editMode, bust, waist, hip, height, colorId]);

  const openEdit = useCallback((mode:"body"|"color") => {
    if (dna) {
      if (mode === "body") {
        setHeight(dna.body_shape.measurements.height_cm);
        setBust(dna.body_shape.measurements.bust_cm);
        setWaist(dna.body_shape.measurements.waist_cm);
        setHip(dna.body_shape.measurements.hip_cm);
      } else {
        const match = PCCS_COLOR_TYPES.find(c => c.label_ko === dna.color_dna.label_ko);
        setColorId(match?.id ?? null);
      }
    }
    setEditMode(mode);
  }, [dna]);

  const handleReset = useCallback(() => {
    if (!confirm("DNA 프로필을 초기화할까요?")) return;
    clearDNA();
    setDna(null); setStep("body"); setColorId(null); setView("setup");
  }, []);

  /* ── render ─────────────────────────────────────────────────────── */
  if (view === "loading") return (
    <div className="flex min-h-full items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-pearl border-t-gold" />
    </div>
  );

  return (
    <div className="flex min-h-full flex-col bg-ivory pb-[calc(var(--spacing-nav)+24px)]">
      <header className="sticky top-0 z-30 flex items-center gap-3 bg-ivory/90 px-5 py-4 backdrop-blur-md">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-charcoal">
          <Fingerprint size={15} className="text-ivory" />
        </div>
        <div className="flex-1">
          <p className="font-display text-[9px] font-semibold uppercase tracking-[0.22em] text-gold">Style DNA</p>
          <h1 className="text-xl font-bold leading-tight tracking-tight text-charcoal">
            {view === "setup" ? "나만의 DNA 설정" : "나만의 스타일 정체성"}
          </h1>
        </div>
        {view === "profile" && dna && (
          <button onClick={handleReset}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-pearl text-charcoal/40">
            <RotateCcw size={13} />
          </button>
        )}
      </header>

      {view === "setup" && (
        <SetupWizard
          step={step} setStep={setStep}
          height={height} setHeight={setHeight}
          bust={bust} setBust={setBust}
          waist={waist} setWaist={setWaist}
          hip={hip} setHip={setHip}
          colorId={colorId} setColorId={setColorId}
          goal={goal} setGoal={setGoal}
          onSave={handleSave}
        />
      )}

      {view === "profile" && dna && (
        <ProfileView
          dna={dna}
          onEditBody={() => openEdit("body")}
          onEditColor={() => openEdit("color")}
          onSaveDNA={(u) => { storeDNA(u); setDna(u); }}
        />
      )}

      <AnimatePresence>
        {editMode && (
          <EditSheet
            mode={editMode}
            height={height} setHeight={setHeight}
            bust={bust} setBust={setBust}
            waist={waist} setWaist={setWaist}
            hip={hip} setHip={setHip}
            colorId={colorId} setColorId={setColorId}
            onClose={() => setEditMode(null)}
            onSave={handleEditSave}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Setup Wizard
═══════════════════════════════════════════════════════════════════ */
function SetupWizard({
  step, setStep,
  height, setHeight, bust, setBust, waist, setWaist, hip, setHip,
  colorId, setColorId, goal, setGoal, onSave,
}: {
  step:SetupStep; setStep:(s:SetupStep)=>void;
  height:number; setHeight:(v:number)=>void;
  bust:number; setBust:(v:number)=>void;
  waist:number; setWaist:(v:number)=>void;
  hip:number; setHip:(v:number)=>void;
  colorId:string|null; setColorId:(id:string)=>void;
  goal:string; setGoal:(g:string)=>void;
  onSave:()=>void;
}) {
  const STEPS: SetupStep[] = ["body","color","goal"];
  const idx = STEPS.indexOf(step);
  return (
    <div className="flex flex-1 flex-col px-5 pt-2">
      <div className="mb-6 flex gap-1.5">
        {STEPS.map((s,i) => (
          <div key={s} className={[
            "h-1 flex-1 rounded-full transition-colors duration-300",
            i <= idx ? "bg-gold" : "bg-pearl",
          ].join(" ")} />
        ))}
      </div>
      <AnimatePresence mode="wait">
        {step === "body" && (
          <motion.div key="body" variants={SLIDE} initial="hidden" animate="show" exit="exit">
            <BodyStep
              height={height} setHeight={setHeight}
              bust={bust} setBust={setBust}
              waist={waist} setWaist={setWaist}
              hip={hip} setHip={setHip}
              onNext={() => setStep("color")}
            />
          </motion.div>
        )}
        {step === "color" && (
          <motion.div key="color" variants={SLIDE} initial="hidden" animate="show" exit="exit">
            <ColorStep
              colorId={colorId} setColorId={setColorId}
              onBack={() => setStep("body")} onNext={() => setStep("goal")}
            />
          </motion.div>
        )}
        {step === "goal" && (
          <motion.div key="goal" variants={SLIDE} initial="hidden" animate="show" exit="exit">
            <GoalStep
              goal={goal} setGoal={setGoal} colorId={colorId}
              onBack={() => setStep("color")} onSave={onSave}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Step 1 — Body
═══════════════════════════════════════════════════════════════════ */
type BodyTab = "manual" | "photo";
interface BodyAIResult {
  shape: BodyShape; confidence: number; reasoning: string;
  estimated_bust?: number|null;
  estimated_waist?: number|null;
  estimated_hip?: number|null;
}

/**
 * AI가 측정값을 추정하지 못했을 때 사용하는 대표 측정값.
 * classifyBodyShape() 함수를 통과했을 때 해당 체형으로 분류되는 값이어야 함.
 *
 * HOURGLASS:         |bust-hip|<5, waist/bust<0.75  → 88/64/90 (wr≈0.727 ✓)
 * INVERTED_TRIANGLE: bust-hip≥5                      → 96/72/88 (bh=8  ✓)
 * PEAR:              hip-bust≥5                      → 84/70/92 (hb=8  ✓)
 * RECTANGLE:         waist/bust≥0.75                 → 88/76/90 (wr≈0.864 ✓)
 */
const DEFAULT_BODY_MEASUREMENTS: Record<BodyShape, { bust:number; waist:number; hip:number }> = {
  HOURGLASS:          { bust:88,  waist:64, hip:90 },
  INVERTED_TRIANGLE:  { bust:96,  waist:72, hip:88 },
  PEAR:               { bust:84,  waist:70, hip:92 },
  RECTANGLE:          { bust:88,  waist:76, hip:90 },
};

function BodyStep({
  height, setHeight, bust, setBust, waist, setWaist, hip, setHip, onNext,
}: {
  height:number; setHeight:(v:number)=>void;
  bust:number; setBust:(v:number)=>void;
  waist:number; setWaist:(v:number)=>void;
  hip:number; setHip:(v:number)=>void;
  onNext:()=>void;
}) {
  const [tab, setTab] = useState<BodyTab>("manual");
  const [photoUrl, setPhotoUrl]   = useState<string|null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiResult, setAiResult]   = useState<BodyAIResult|null>(null);
  const [error, setError]         = useState<string|null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const shape    = classifyBodyShape(bust, waist, hip);
  const shapeMeta = BODY_SHAPE_META[shape];

  const handlePhoto = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null); setAiResult(null);
    const url = URL.createObjectURL(file);
    setPhotoUrl(url);
    setAnalyzing(true);
    try {
      const fd = new FormData(); fd.append("file", file);
      const res = await fetch("/api/v1/dna/analyze-body", { method:"POST", body:fd });
      if (!res.ok) throw new Error((await res.json()).detail ?? "분석 실패");
      const data: BodyAIResult = await res.json();
      setAiResult(data);

      /*
       * 측정값 반영 전략:
       * AI가 추정값을 제공하면 그 값을 사용, 없으면 AI가 선언한 체형에
       * 부합하는 대표 측정값(DEFAULT_BODY_MEASUREMENTS)으로 채움.
       * 이렇게 해야 classifyBodyShape()가 AI 결과와 일치하게 된다.
       */
      const shape = data.shape as BodyShape;
      const def   = DEFAULT_BODY_MEASUREMENTS[shape];
      setBust(data.estimated_bust   ?? def.bust);
      setWaist(data.estimated_waist ?? def.waist);
      setHip(data.estimated_hip     ?? def.hip);
    } catch (err) {
      setError(err instanceof Error ? err.message : "분석 중 오류가 발생했습니다");
    } finally { setAnalyzing(false); }
  }, [setBust, setWaist, setHip]);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className="mb-1 flex items-center gap-2">
          <Ruler size={14} className="text-gold" />
          <span className="font-display text-[10px] font-semibold uppercase tracking-[0.22em] text-gold">
            Step 1 — Body
          </span>
        </div>
        <h2 className="text-2xl font-bold leading-tight tracking-tight text-charcoal">
          나의 체형을<br />알려주세요
        </h2>
      </div>

      {/* Tab toggle */}
      <div className="grid grid-cols-2 gap-1 rounded-2xl bg-pearl/60 p-1">
        {([["manual","측정값 입력"],["photo","사진으로 분석"]] as [BodyTab,string][]).map(([t,label]) => (
          <button key={t} onClick={() => setTab(t)}
            className={["rounded-xl py-2.5 text-xs font-bold transition-colors",
              tab===t ? "bg-charcoal text-ivory" : "text-charcoal/50"].join(" ")}>
            {label}
          </button>
        ))}
      </div>

      {/* ── Manual tab ─────────────────────────────────────────────── */}
      {tab === "manual" && (
        <div className="flex flex-col gap-3">
          <div className="rounded-2xl border border-pearl bg-amber-50/60 px-4 py-3">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-amber-600">
              정확도 가이드
            </p>
            <ul className="flex flex-col gap-1 text-[11px] leading-relaxed text-charcoal/65">
              <li>· 줄자를 몸에 밀착해 수평으로 측정하세요</li>
              <li>· 가슴 — 가장 돌출된 부분의 수평 둘레</li>
              <li>· 허리 — 배꼽 위 가장 잘록한 부분</li>
              <li>· 힙 — 엉덩이 가장 돌출된 부분의 수평 둘레</li>
            </ul>
          </div>
          {([
            { label:"키",       key:"height", value:height, set:setHeight, min:140, max:195 },
            { label:"가슴 둘레", key:"bust",   value:bust,   set:setBust,   min:72,  max:130 },
            { label:"허리 둘레", key:"waist",  value:waist,  set:setWaist,  min:56,  max:110 },
            { label:"힙 둘레",   key:"hip",    value:hip,    set:setHip,    min:80,  max:140 },
          ] as const).map(({ label, key, value, set, min, max }) => (
            <div key={key}
              className="flex items-center gap-3 rounded-2xl border border-pearl bg-white px-4 py-3">
              <span className="w-20 text-xs font-semibold text-charcoal/60">{label}</span>
              <div className="flex flex-1 items-center gap-2">
                <button onClick={() => set(Math.max(min, value-1))}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-pearl text-charcoal/60 active:scale-95 transition-transform">−</button>
                <span className="flex-1 text-center font-display text-xl font-semibold text-charcoal tabular-nums">{value}</span>
                <button onClick={() => set(Math.min(max, value+1))}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-pearl text-charcoal/60 active:scale-95 transition-transform">+</button>
              </div>
              <span className="w-6 text-right text-[10px] text-charcoal/40">cm</span>
            </div>
          ))}
          {/* Live preview */}
          <div className="flex items-center gap-3 rounded-2xl bg-charcoal/5 px-4 py-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-charcoal text-ivory text-sm font-bold">
              {shape==="HOURGLASS"?"⧖":shape==="INVERTED_TRIANGLE"?"▽":shape==="PEAR"?"△":"□"}
            </div>
            <div>
              <p className="text-sm font-bold text-charcoal">{shapeMeta.label_ko}</p>
              <p className="text-[11px] leading-snug text-charcoal/55">{shapeMeta.description}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Photo tab ──────────────────────────────────────────────── */}
      {tab === "photo" && (
        <div className="flex flex-col gap-4">
          {/* Guide card */}
          <div className="rounded-2xl border border-pearl bg-amber-50/60 px-4 py-3">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-amber-600">
              사진 촬영 가이드 — 정확도를 높이려면
            </p>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
              {[
                { icon:"👗", text:"몸에 맞는 옷 착용 (타이트할수록 정확)" },
                { icon:"📏", text:"발끝부터 머리까지 전신이 화면에" },
                { icon:"🧱", text:"벽 앞 정면으로, 팔은 자연스럽게" },
                { icon:"☀️", text:"밝은 곳 — 역광·그림자 최소화" },
                { icon:"📱", text:"카메라를 허리 높이에서 정면으로" },
                { icon:"🤸", text:"자연스럽게 바른 자세, 힘 빼기" },
              ].map(({icon,text}) => (
                <div key={text} className="flex items-start gap-1.5">
                  <span className="mt-0.5 text-sm">{icon}</span>
                  <span className="text-[11px] leading-snug text-charcoal/65">{text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Upload area */}
          {!photoUrl && (
            <button
              onClick={() => fileRef.current?.click()}
              className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-pearl/80 bg-white py-8 active:bg-pearl/20 transition-colors">
              <div className="flex gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-charcoal/10">
                  <Camera size={18} className="text-charcoal/60" />
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-charcoal/10">
                  <Upload size={18} className="text-charcoal/60" />
                </div>
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-charcoal">사진 촬영 또는 업로드</p>
                <p className="text-[11px] text-charcoal/45">JPG · PNG · HEIC 지원</p>
              </div>
            </button>
          )}

          {/* Photo preview + analysis */}
          {photoUrl && (
            <div className="flex flex-col gap-3">
              <div className="relative overflow-hidden rounded-2xl">
                <img src={photoUrl} alt="전신사진" className="w-full object-cover" style={{ maxHeight:"280px" }} />
                {analyzing && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-charcoal/60 backdrop-blur-[2px]">
                    <div className="mb-2 h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-gold" />
                    <p className="text-xs font-medium text-ivory">AI가 실루엣을 분석하는 중…</p>
                  </div>
                )}
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2.5">
                  <AlertCircle size={14} className="mt-0.5 shrink-0 text-red-400" />
                  <p className="text-xs text-red-600">{error}</p>
                </div>
              )}

              {aiResult && (
                <div className="flex flex-col gap-2 rounded-2xl border border-gold/30 bg-gold/5 p-4">
                  <div className="flex items-center gap-2">
                    <Sparkles size={13} className="text-gold" />
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gold">AI 분석 결과</p>
                    <span className="ml-auto rounded-full bg-charcoal/10 px-2 py-0.5 text-[9px] font-semibold text-charcoal/50">
                      신뢰도 {Math.round(aiResult.confidence * 100)}%
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-charcoal text-ivory text-sm font-bold">
                      {aiResult.shape==="HOURGLASS"?"⧖":aiResult.shape==="INVERTED_TRIANGLE"?"▽":aiResult.shape==="PEAR"?"△":"□"}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-charcoal">{BODY_SHAPE_META[aiResult.shape as BodyShape].label_ko}</p>
                    </div>
                  </div>
                  <p className="text-[11px] leading-relaxed text-charcoal/60">{aiResult.reasoning}</p>
                  {/* 적용된 측정값 — AI 추정값 또는 체형 대표값 */}
                  <div className="flex gap-2">
                    {[
                      { k:"B", v:bust },
                      { k:"W", v:waist },
                      { k:"H", v:hip },
                    ].map(({k,v}) => (
                      <div key={k} className="flex flex-col items-center gap-0.5 rounded-xl bg-ivory px-3 py-1.5">
                        <span className="text-[9px] font-bold text-gold">{k}</span>
                        <span className="font-display text-sm font-semibold text-charcoal">{v}</span>
                        <span className="text-[8px] text-charcoal/40">cm</span>
                      </div>
                    ))}
                  </div>
                  {!aiResult.estimated_bust && (
                    <p className="text-[10px] text-charcoal/40">
                      * 사이즈는 체형 기준 추정값입니다. 정확한 값은 측정값 입력 탭에서 직접 조정하세요.
                    </p>
                  )}
                </div>
              )}

              <button
                onClick={() => { setPhotoUrl(null); setAiResult(null); setError(null); }}
                className="text-xs text-charcoal/40 underline underline-offset-2">
                다른 사진 선택
              </button>
            </div>
          )}

          <input ref={fileRef} type="file" accept="image/*" capture="environment"
            className="hidden" onChange={handlePhoto} />
        </div>
      )}

      <button onClick={onNext}
        className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-pill)] bg-charcoal py-4 text-sm font-bold text-ivory active:scale-[0.98] transition-transform">
        다음 — 퍼스널컬러 <ChevronRight size={15} />
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Step 2 — Personal Color
═══════════════════════════════════════════════════════════════════ */
type ColorTab = "select" | "ai";
interface ColorAIResult {
  season: Season; sub_tone: SubTone;
  label: string; label_ko: string;
  reasoning: string; confidence: number;
}

function ColorStep({
  colorId, setColorId, onBack, onNext,
}: {
  colorId:string|null; setColorId:(id:string)=>void;
  onBack:()=>void; onNext:()=>void;
}) {
  const [tab,          setTab]          = useState<ColorTab>("select");
  const [activeSeason, setActiveSeason] = useState<Season>("SPRING");

  /* AI photo analysis state */
  const [faceUrl,    setFaceUrl]    = useState<string|null>(null);
  const [analyzing,  setAnalyzing]  = useState(false);
  const [aiResult,   setAiResult]   = useState<ColorAIResult|null>(null);
  const [drapeIdx,   setDrapeIdx]   = useState(0);
  const [error,      setError]      = useState<string|null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  /* Draping animation while analyzing */
  useEffect(() => {
    if (!analyzing) return;
    const id = setInterval(() => setDrapeIdx(i => (i+1) % DRAPE_SEQUENCE.length), 700);
    return () => clearInterval(id);
  }, [analyzing]);

  const handleFacePhoto = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null); setAiResult(null);
    const url = URL.createObjectURL(file);
    setFaceUrl(url);
    setAnalyzing(true);
    try {
      const fd = new FormData(); fd.append("file", file);
      const res = await fetch("/api/v1/dna/analyze-color", { method:"POST", body:fd });
      if (!res.ok) throw new Error((await res.json()).detail ?? "분석 실패");
      const data: ColorAIResult = await res.json();
      setAiResult(data);
      /* Auto-select the matched color type */
      const matched = PCCS_COLOR_TYPES.find(
        c => c.season===data.season && c.sub_tone===data.sub_tone,
      );
      if (matched) setColorId(matched.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "분석 중 오류가 발생했습니다");
    } finally { setAnalyzing(false); }
  }, [setColorId]);

  const seasonTypes = PCCS_COLOR_TYPES.filter(c => c.season===activeSeason);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className="mb-1 flex items-center gap-2">
          <Palette size={14} className="text-gold" />
          <span className="font-display text-[10px] font-semibold uppercase tracking-[0.22em] text-gold">
            Step 2 — Personal Color
          </span>
        </div>
        <h2 className="text-2xl font-bold leading-tight tracking-tight text-charcoal">
          나의 퍼스널컬러는<br />무엇인가요?
        </h2>
      </div>

      {/* Tab toggle */}
      <div className="grid grid-cols-2 gap-1 rounded-2xl bg-pearl/60 p-1">
        {([["select","직접 선택"],["ai","AI 얼굴 분석"]] as [ColorTab,string][]).map(([t,label]) => (
          <button key={t} onClick={() => setTab(t)}
            className={["rounded-xl py-2.5 text-xs font-bold transition-colors",
              tab===t ? "bg-charcoal text-ivory" : "text-charcoal/50"].join(" ")}>
            {label}
          </button>
        ))}
      </div>

      {/* ── Select tab ─────────────────────────────────────────────── */}
      {tab === "select" && (
        <div className="flex flex-col gap-4">
          <p className="text-xs text-charcoal/50 leading-relaxed">
            피부·눈동자·모발 색이 가장 생기있게 보이는 색상 그룹을 선택하세요.
          </p>
          {/* Season tabs */}
          <div className="grid grid-cols-4 gap-1 rounded-2xl bg-pearl/60 p-1">
            {SEASONS.map(s => (
              <button key={s} onClick={() => setActiveSeason(s)}
                className={["rounded-xl py-2 text-[10px] font-bold transition-colors",
                  activeSeason===s ? "bg-charcoal text-ivory" : "text-charcoal/50"].join(" ")}>
                {s==="SPRING"?"봄":s==="SUMMER"?"여름":s==="AUTUMN"?"가을":"겨울"}
              </button>
            ))}
          </div>
          {/* Color type cards */}
          <div className="grid grid-cols-2 gap-3">
            {seasonTypes.map(ct => (
              <button key={ct.id} onClick={() => setColorId(ct.id)}
                className={["relative flex flex-col gap-2 rounded-2xl border-2 p-3 text-left transition-all",
                  colorId===ct.id ? "border-gold bg-gold/5" : `border-transparent ${SEASON_BG[ct.season]}`].join(" ")}>
                {colorId===ct.id && (
                  <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-gold text-ivory">
                    <Check size={10} />
                  </span>
                )}
                <div className="flex gap-1">
                  {ct.swatches.slice(0,4).map(hex => (
                    <div key={hex} className="h-5 w-5 flex-1 rounded-full border border-white/40"
                      style={{ backgroundColor:hex }} />
                  ))}
                </div>
                <div>
                  <p className="text-xs font-bold leading-tight text-charcoal">{ct.label_ko}</p>
                  <p className="font-display text-[10px] text-charcoal/50">{ct.label}</p>
                </div>
              </button>
            ))}
          </div>
          {colorId && (
            <div className="rounded-2xl bg-charcoal/5 p-3">
              <p className="text-[11px] leading-relaxed text-charcoal/70">
                {PCCS_COLOR_TYPES.find(c => c.id===colorId)?.description}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── AI Photo tab ───────────────────────────────────────────── */}
      {tab === "ai" && (
        <div className="flex flex-col gap-4">
          {/* Shooting guide */}
          <div className="rounded-2xl border border-pearl bg-violet-50/60 px-4 py-3">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-violet-600">
              얼굴 사진 촬영 가이드 — 강남 컨설턴트 기준
            </p>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
              {[
                { icon:"🌤️", text:"자연광 또는 밝은 실내 (형광등 X)" },
                { icon:"🪞", text:"흰색 배경 또는 흰 옷 착용 시 가장 정확" },
                { icon:"💄", text:"민낯 또는 아주 자연스러운 메이크업" },
                { icon:"🧖", text:"머리를 뒤로 넘겨 이마·목선이 보이게" },
                { icon:"📸", text:"얼굴이 화면 중앙, 정면을 바라보기" },
                { icon:"🚫", text:"강한 필터·보정 금지 — 피부톤 왜곡됨" },
              ].map(({icon,text}) => (
                <div key={text} className="flex items-start gap-1.5">
                  <span className="mt-0.5 text-sm">{icon}</span>
                  <span className="text-[11px] leading-snug text-charcoal/65">{text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Upload area */}
          {!faceUrl && (
            <button
              onClick={() => fileRef.current?.click()}
              className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-pearl/80 bg-white py-8 active:bg-pearl/20 transition-colors">
              <div className="flex gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-100">
                  <Camera size={18} className="text-violet-500" />
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-100">
                  <ImageIcon size={18} className="text-violet-500" />
                </div>
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-charcoal">셀피 촬영 또는 사진 선택</p>
                <p className="text-[11px] text-charcoal/45">앞 카메라로 찍으면 가장 정확합니다</p>
              </div>
            </button>
          )}

          {/* Face photo + draping animation + result */}
          {faceUrl && (
            <div className="flex flex-col gap-3">
              {/* Photo + draping */}
              <div className="overflow-hidden rounded-2xl border border-pearl bg-white">
                <div className="relative">
                  <img src={faceUrl} alt="얼굴사진"
                    className="w-full object-cover object-top" style={{ maxHeight:"240px" }} />
                  {analyzing && (
                    <div className="absolute inset-0 flex items-end justify-center bg-charcoal/20 pb-3">
                      <div className="flex items-center gap-1.5 rounded-full bg-charcoal/80 px-3 py-1.5">
                        <div className="h-3 w-3 animate-spin rounded-full border border-white/30 border-t-gold" />
                        <span className="text-[10px] font-medium text-ivory">드레이핑 분석 중…</span>
                      </div>
                    </div>
                  )}
                  {aiResult && !analyzing && (
                    <div className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-charcoal/60 to-transparent pb-3">
                      <div className="flex items-center gap-1.5 rounded-full bg-charcoal/80 px-3 py-1.5">
                        <Check size={11} className="text-gold" />
                        <span className="text-[10px] font-medium text-ivory">{aiResult.label_ko} 분석 완료</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Draping color strip */}
                <div className="p-3">
                  <p className="mb-2 text-[10px] font-semibold text-charcoal/50">
                    {analyzing
                      ? `테스트 중 — ${DRAPE_SEQUENCE[drapeIdx].season}`
                      : aiResult
                        ? `베스트 컬러 팔레트 — ${aiResult.label_ko}`
                        : "컬러 팔레트"}
                  </p>
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={analyzing ? drapeIdx : (aiResult ? "result" : "idle")}
                      initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
                      transition={{ duration:0.4 }}
                      className="flex gap-1.5"
                    >
                      {(analyzing
                        ? DRAPE_SEQUENCE[drapeIdx].swatches
                        : aiResult
                          ? (PCCS_COLOR_TYPES.find(
                              c => c.season===aiResult.season && c.sub_tone===aiResult.sub_tone
                            )?.swatches ?? DRAPE_SEQUENCE[0].swatches)
                          : DRAPE_SEQUENCE[0].swatches
                      ).map((hex, i) => (
                        <div key={`${hex}-${i}`}
                          className="h-10 flex-1 rounded-xl border border-white/60 shadow-sm"
                          style={{ backgroundColor:hex }} />
                      ))}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>

              {/* AI result card */}
              {aiResult && (
                <div className="flex flex-col gap-2 rounded-2xl border border-violet-200 bg-violet-50/60 p-4">
                  <div className="flex items-center gap-2">
                    <Sparkles size={13} className="text-violet-500" />
                    <p className="text-[10px] font-bold uppercase tracking-wider text-violet-600">
                      PCCS 퍼스널컬러 진단
                    </p>
                    <span className="ml-auto rounded-full bg-charcoal/10 px-2 py-0.5 text-[9px] font-semibold text-charcoal/50">
                      신뢰도 {Math.round(aiResult.confidence * 100)}%
                    </span>
                  </div>
                  <div>
                    <p className="text-base font-bold text-charcoal">{aiResult.label_ko}</p>
                    <p className="font-display text-xs text-charcoal/50">{aiResult.label}</p>
                  </div>
                  <p className="text-[11px] leading-relaxed text-charcoal/65">{aiResult.reasoning}</p>
                </div>
              )}

              {error && (
                <div className="flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2.5">
                  <AlertCircle size={14} className="mt-0.5 shrink-0 text-red-400" />
                  <p className="text-xs text-red-600">{error}</p>
                </div>
              )}

              <button
                onClick={() => { setFaceUrl(null); setAiResult(null); setError(null); }}
                className="text-xs text-charcoal/40 underline underline-offset-2">
                다른 사진 선택
              </button>
            </div>
          )}

          <input ref={fileRef} type="file" accept="image/*" capture="user"
            className="hidden" onChange={handleFacePhoto} />
        </div>
      )}

      <div className="flex gap-3">
        <button onClick={onBack}
          className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-pill)] border border-pearl text-charcoal/50">
          <ChevronLeft size={18} />
        </button>
        <button onClick={onNext} disabled={!colorId}
          className="flex flex-1 items-center justify-center gap-2 rounded-[var(--radius-pill)] bg-charcoal py-3.5 text-sm font-bold text-ivory disabled:opacity-40 active:scale-[0.98] transition-transform">
          다음 — 그레이스 골 <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Step 3 — Grace Goal
═══════════════════════════════════════════════════════════════════ */
function GoalStep({
  goal, setGoal, colorId, onBack, onSave,
}: {
  goal:string; setGoal:(g:string)=>void;
  colorId:string|null; onBack:()=>void; onSave:()=>void;
}) {
  const EXAMPLES = [
    "Effortless chic — 힘 뺀 듯 완성된 Parisian 무드",
    "Professional Grace — 우아한 커리어 실루엣",
    "Romantic Minimalist — 단정하지만 여성스럽게",
    "Bold & Balanced — 개성 있되 세련되게",
  ];
  return (
    <div className="flex flex-col gap-5">
      <div>
        <span className="font-display text-[10px] font-semibold uppercase tracking-[0.22em] text-gold">
          Step 3 — Grace Goal
        </span>
        <h2 className="mt-1 text-2xl font-bold leading-tight tracking-tight text-charcoal">
          나의 스타일<br />지향점은?
        </h2>
        <p className="mt-1.5 text-xs text-charcoal/50 leading-relaxed">
          CHARIS의 모든 코칭이 이 목표를 향해 맞춤 제공됩니다.
        </p>
      </div>
      <textarea
        value={goal} onChange={e => setGoal(e.target.value)}
        rows={3} maxLength={120}
        placeholder="나만의 스타일 지향점을 자유롭게 적어보세요"
        className="w-full resize-none rounded-2xl border border-pearl bg-white px-4 py-3 text-sm font-normal leading-relaxed text-charcoal outline-none placeholder:text-charcoal/30 focus:border-gold transition-colors"
      />
      <div className="flex flex-col gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-charcoal/35">예시</p>
        {EXAMPLES.map(ex => (
          <button key={ex} onClick={() => setGoal(ex)}
            className={["rounded-xl border px-3 py-2 text-left text-xs leading-relaxed transition-colors",
              goal===ex ? "border-gold bg-gold/5 text-charcoal" : "border-pearl text-charcoal/55"].join(" ")}>
            {ex}
          </button>
        ))}
      </div>
      <div className="flex gap-3">
        <button onClick={onBack}
          className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-pill)] border border-pearl text-charcoal/50">
          <ChevronLeft size={18} />
        </button>
        <button onClick={onSave} disabled={!colorId || !goal.trim()}
          className="flex flex-1 items-center justify-center gap-2 rounded-[var(--radius-pill)] bg-charcoal py-3.5 text-sm font-bold text-ivory disabled:opacity-40 active:scale-[0.98] transition-transform">
          <Check size={15} /> DNA 프로필 완성
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Profile View
═══════════════════════════════════════════════════════════════════ */
function ProfileView({
  dna, onEditBody, onEditColor, onSaveDNA,
}: {
  dna:StyleDNA; onEditBody:()=>void; onEditColor:()=>void;
  onSaveDNA:(d:StyleDNA)=>void;
}) {
  const primaryMeta = BODY_SHAPE_META[dna.body_shape.primary.shape];
  const updatedAt   = new Date(dna.updated_at).toLocaleDateString("ko-KR",{ month:"short", day:"numeric" });
  return (
    <div className="flex flex-col gap-8 pt-2">
      <SectionBlock label="◈ Body DNA" onEdit={onEditBody} badge={updatedAt}>
        <div className="rounded-[var(--radius-card)] bg-pearl/60 px-5 py-6">
          <div className="flex flex-col items-center gap-6">
            <BodyVisualizer result={dna.body_shape} />
            <div className="flex flex-col gap-3 text-center">
              <p className="text-base font-medium leading-snug text-charcoal">
                <span className="font-bold">{primaryMeta.label_ko}</span>
                {" "}형의 {primaryMeta.description}
              </p>
              <p className="text-xs leading-relaxed text-charcoal/55">
                {dna.body_shape.coaching_narrative}
              </p>
            </div>
            <div className="flex gap-2.5">
              {([
                { k:"B", v:dna.body_shape.measurements.bust_cm },
                { k:"W", v:dna.body_shape.measurements.waist_cm },
                { k:"H", v:dna.body_shape.measurements.hip_cm },
                { k:"↑", v:dna.body_shape.measurements.height_cm },
              ] as const).map(({ k, v }) => (
                <div key={k} className="flex flex-col items-center gap-0.5 rounded-xl bg-ivory px-3.5 py-2">
                  <span className="text-[9px] font-semibold tracking-widest text-gold">{k}</span>
                  <span className="font-display text-base font-semibold text-charcoal">{v}</span>
                  <span className="text-[8px] text-charcoal/40">cm</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </SectionBlock>

      <SectionBlock label="✦ Color DNA" onEdit={onEditColor}>
        <div className="rounded-[var(--radius-card)] bg-pearl/60 px-5 py-6">
          <ColorPalette color={dna.color_dna} />
        </div>
      </SectionBlock>

      <SectionBlock label="✧ Grace Goal">
        <GraceGoal
          goal={dna.grace_goal}
          onSave={updated => onSaveDNA({ ...dna, grace_goal:updated, updated_at:new Date().toISOString() })}
        />
      </SectionBlock>

      <SectionBlock label="◇ TPO 라이프스타일">
        <div className="flex flex-wrap gap-2 px-1">
          {dna.tpo_preference.map(tpo => (
            <span key={tpo}
              className="rounded-full border border-gold/40 bg-gold/5 px-3 py-1 text-xs text-charcoal/70">
              {TPO_LABELS[tpo] ?? tpo}
            </span>
          ))}
        </div>
        <p className="px-1 text-[11px] leading-relaxed text-charcoal/40">
          자주 필요한 TPO 상황을 설정하면 CHARIS가 더 정밀하게 스타일링합니다.
        </p>
      </SectionBlock>
    </div>
  );
}

function SectionBlock({ label, badge, onEdit, children }: {
  label:string; badge?:string; onEdit?:()=>void; children:React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-5 px-5">
      <div className="flex items-center gap-2">
        <span className="font-display text-[10px] font-semibold uppercase tracking-[0.2em] text-gold">{label}</span>
        {badge && (
          <span className="rounded-full bg-charcoal/5 px-2 py-0.5 text-[9px] text-charcoal/35">{badge}</span>
        )}
        <span className="flex-1 border-t border-pearl" />
        {onEdit && (
          <button onClick={onEdit}
            className="flex items-center gap-1 rounded-full border border-pearl px-2.5 py-1 text-[10px] font-semibold text-charcoal/50 hover:border-gold hover:text-gold transition-colors">
            <Pencil size={9} /> 수정
          </button>
        )}
      </div>
      {children}
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Edit Sheet (Bottom Sheet)
═══════════════════════════════════════════════════════════════════ */
function EditSheet({
  mode,
  height, setHeight, bust, setBust, waist, setWaist, hip, setHip,
  colorId, setColorId,
  onClose, onSave,
}: {
  mode:"body"|"color";
  height:number; setHeight:(v:number)=>void;
  bust:number; setBust:(v:number)=>void;
  waist:number; setWaist:(v:number)=>void;
  hip:number; setHip:(v:number)=>void;
  colorId:string|null; setColorId:(id:string)=>void;
  onClose:()=>void; onSave:()=>void;
}) {
  return (
    <motion.div className="fixed inset-0 z-50 flex items-end justify-center"
      initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}>
      <div className="absolute inset-0 bg-charcoal/40 backdrop-blur-[2px]" onClick={onClose} />
      <motion.div
        className="relative w-full max-w-[480px] rounded-t-2xl bg-ivory px-5 pb-10 pt-5 shadow-2xl"
        initial={{ y:"100%" }} animate={{ y:0 }} exit={{ y:"100%" }}
        transition={{ type:"tween", duration:0.3 }}>
        <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-charcoal/15" />
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-bold tracking-tight text-charcoal">
            {mode==="body" ? "체형 수정" : "퍼스널컬러 수정"}
          </h3>
          <button onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-pearl text-charcoal/40">✕</button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto pb-4">
          {mode === "body" ? (
            <BodyStep
              height={height} setHeight={setHeight}
              bust={bust} setBust={setBust}
              waist={waist} setWaist={setWaist}
              hip={hip} setHip={setHip}
              onNext={onSave}
            />
          ) : (
            <ColorStep colorId={colorId} setColorId={setColorId}
              onBack={onClose} onNext={onSave} />
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
