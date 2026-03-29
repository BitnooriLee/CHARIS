"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence, type Transition } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  Scan,
  ShoppingBag,
  Plus,
  CheckCircle,
} from "lucide-react";

import SilhouetteMirror from "@/components/mirror/SilhouetteMirror";
import GracefulEditPanel from "@/components/mirror/GracefulEditPanel";
import { OutfitTPOScore, MOCK_WEDDING_GUEST_REPORT } from "@/types/tpo";
import { loadScanResult, loadImageUrl } from "@/lib/scan-store";
import { buildSearchUrl, ITEM_TYPE_KO } from "@/lib/clothing-scale";
import { BodyShape } from "@/types/dna";
import { MOCK_STYLE_DNA } from "@/types/dna";

type MirrorView = "original" | "graceful_edit";

/* ── Toast ────────────────────────────────────────────────────────── */
function SaveToast({ visible }: { visible: boolean }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed bottom-24 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full bg-charcoal px-5 py-2.5 shadow-xl"
          initial={{ opacity: 0, y: 12, scale: 0.9 }}
          animate={{ opacity: 1, y: 0,  scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 320, damping: 22 } as Transition}
        >
          <CheckCircle size={14} className="text-gold" />
          <span className="font-sans text-xs font-medium text-ivory">옷장에 저장됐어요 ✦</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ── The Switch (Original ↔ Graceful Edit tabs) ─────────────────── */
function ViewSwitch({
  view,
  onChange,
}: {
  view: MirrorView;
  onChange: (v: MirrorView) => void;
}) {
  const tabs: { id: MirrorView; label: string }[] = [
    { id: "original",     label: "Original" },
    { id: "graceful_edit", label: "Graceful Edit ✦" },
  ];

  return (
    <div className="relative flex rounded-[var(--radius-pill)] bg-pearl p-1">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={[
            "relative flex-1 rounded-[var(--radius-pill)] py-2 font-sans text-[11px] font-semibold transition-colors",
            view === t.id ? "text-charcoal" : "text-charcoal/40",
          ].join(" ")}
        >
          {/* Sliding pill indicator */}
          {view === t.id && (
            <motion.span
              layoutId="tab-pill"
              className="absolute inset-0 rounded-[var(--radius-pill)] bg-ivory shadow-sm"
              style={{ zIndex: -1 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 } as Transition}
            />
          )}
          {t.label}
        </button>
      ))}
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────────────────── */
export default function MirrorPage() {
  const router = useRouter();

  const [view,      setView]      = useState<MirrorView>("original");
  const [report,    setReport]    = useState<OutfitTPOScore>(MOCK_WEDDING_GUEST_REPORT);
  const [imageUrl,  setImageUrl]  = useState<string | null>(null);
  const [itemType,  setItemType]  = useState<string>("midi_dress");
  const [bodyShape, setBodyShape] = useState<BodyShape>("HOURGLASS");
  const [heightCm,  setHeightCm]  = useState<number>(165);
  const [isDemo,    setIsDemo]    = useState(true);
  const [toastVisible, setToastVisible] = useState(false);

  useEffect(() => {
    // Load scan result (TPO report + item info)
    const stored = loadScanResult();
    if (stored) {
      setReport(stored.tpo_score);
      setItemType(stored.item_type);
      setIsDemo(stored.is_demo);
    }

    // Load captured image
    const url = loadImageUrl();
    if (url) setImageUrl(url);

    // Load body shape from StyleDNA (mock for now)
    setBodyShape(MOCK_STYLE_DNA.body_shape.primary.shape as BodyShape);
    setHeightCm(MOCK_STYLE_DNA.body_shape.measurements?.height_cm ?? 165);
  }, []);

  /* ── Buy this Item ────────────────────────────────────────────── */
  const handleBuy = useCallback(() => {
    const searchUrl = buildSearchUrl(itemType);
    window.open(searchUrl, "_blank", "noopener,noreferrer");
  }, [itemType]);

  /* ── Add to Closet (toast → eventually POST /api/v1/closet) ─── */
  const handleAddToCloset = useCallback(() => {
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2200);
  }, []);

  const itemKo = ITEM_TYPE_KO[itemType] ?? itemType.replace(/_/g, " ");

  return (
    <div className="flex min-h-full flex-col pb-[calc(var(--spacing-nav)+24px)]">
      {/* ── Header ────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-ivory/90 px-5 py-4 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-charcoal">
            <Scan size={15} className="text-ivory" />
          </div>
          <div>
            <p className="font-sans text-[9px] font-semibold uppercase tracking-[0.22em] text-gold">
              CHARIS MIRROR
            </p>
            <h1 className="font-display text-lg font-semibold italic leading-tight text-charcoal">
              Mirror of Charis
            </h1>
          </div>
          {isDemo && (
            <span className="ml-auto rounded-full bg-charcoal/8 px-2 py-0.5 font-sans text-[9px] text-charcoal/40">
              데모
            </span>
          )}
        </div>
      </header>

      <div className="flex flex-col gap-5 px-5 pt-1">

        {/* ── The Switch ──────────────────────────────────────────── */}
        <ViewSwitch view={view} onChange={setView} />

        {/* ── Silhouette Mirror ───────────────────────────────────── */}
        <SilhouetteMirror
          imageUrl={imageUrl}
          itemType={itemType}
          bodyShape={bodyShape}
          heightCm={heightCm}
          view={view}
        />

        {/* ── Item summary badge ──────────────────────────────────── */}
        <div className="flex items-center justify-between rounded-xl bg-pearl px-4 py-3">
          <div>
            <p className="font-sans text-[9px] uppercase tracking-[0.18em] text-charcoal/40">
              감지된 아이템
            </p>
            <p className="mt-0.5 text-base font-semibold text-charcoal">
              {itemKo}
            </p>
          </div>
          <div className="text-right">
            <p className="font-sans text-[9px] uppercase tracking-[0.18em] text-charcoal/40">
              TPO 핏 점수
            </p>
            <p
              className={[
                "mt-0.5 font-mono text-lg font-semibold tabular-nums",
                report.score_level === "high"   ? "text-gold"    :
                report.score_level === "medium" ? "text-charcoal" : "text-blush",
              ].join(" ")}
            >
              {Math.round(report.total_fit_score * 100)}
              <span className="ml-0.5 font-sans text-[10px] font-normal text-charcoal/35">/ 100</span>
            </p>
          </div>
        </div>

        {/* ── Graceful Edit Panel (animates in/out) ──────────────── */}
        <AnimatePresence mode="wait">
          {view === "graceful_edit" && (
            <GracefulEditPanel key="edit-panel" report={report} />
          )}
        </AnimatePresence>

        {/* ── Business CTAs ───────────────────────────────────────── */}
        <div className="flex flex-col gap-3">
          <button
            onClick={handleBuy}
            className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-pill)] bg-charcoal py-3.5 font-sans text-sm font-semibold text-ivory shadow-sm active:scale-[0.98]"
          >
            <ShoppingBag size={15} />
            Buy this Item · 무신사
          </button>

          <button
            onClick={handleAddToCloset}
            className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-pill)] border border-pearl bg-ivory py-3.5 font-sans text-sm font-medium text-charcoal active:scale-[0.98]"
          >
            <Plus size={15} />
            Add to Closet
          </button>

          {/* Re-scan shortcut */}
          <button
            onClick={() => router.push("/scan")}
            className="py-2 text-center font-sans text-xs text-charcoal/35 underline underline-offset-2"
          >
            다른 옷 스캔하기
          </button>
        </div>
      </div>

      {/* ── Save Toast ──────────────────────────────────────────────── */}
      <SaveToast visible={toastVisible} />
    </div>
  );
}
