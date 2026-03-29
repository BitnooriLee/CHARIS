"use client";

import { useEffect, useState, useRef } from "react";
import { motion, animate } from "framer-motion";
import VisionPopup from "./VisionPopup";
import { ScanResult, AXIS_META } from "@/types/scan";

/* ── Rolling counter hook ─────────────────────────────────────────── */
function useCountUp(target: number, delayS: number, durationS: number) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const controls = animate(0, target, {
      duration: durationS,
      delay: delayS,
      ease: "easeOut",
      onUpdate: (v) => setValue(Math.round(v * 100)),
    });
    return controls.stop;
  }, [target, delayS, durationS]);
  return value;
}

/* ── Single axis row ──────────────────────────────────────────────── */
function AxisRow({
  label,
  label_ko,
  barColor,
  target,
  delay,
}: {
  label: string;
  label_ko: string;
  barColor: string;
  target: number;
  delay: number;
}) {
  const pct = useCountUp(target, delay, 3.2);

  return (
    <div className="flex items-center gap-2.5">
      {/* Labels */}
      <div className="w-[78px] shrink-0 text-right">
        <span className="block font-sans text-[9px] font-semibold uppercase tracking-widest text-charcoal/50">
          {label}
        </span>
        <span className="block font-sans text-[8px] text-charcoal/35">
          {label_ko}
        </span>
      </div>

      {/* Bar */}
      <div className="relative h-1 flex-1 overflow-hidden rounded-full bg-charcoal/8">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ backgroundColor: barColor }}
          initial={{ width: "0%" }}
          animate={{ width: `${target * 100}%` }}
          transition={{ duration: 3.2, delay, ease: "easeOut" }}
        />
      </div>

      {/* Rolling number */}
      <span
        className="w-7 shrink-0 font-mono text-[11px] font-semibold tabular-nums text-charcoal"
      >
        {pct}
      </span>
    </div>
  );
}

/* ── Analysis duration constants (seconds) ───────────────────────── */
const SCAN_LINE_DURATION = 1.6; // one sweep
const SCAN_LINE_REPEATS = 2; // total sweeps
const BLUR_CLEAR_AT = 4.6; // when to start de-blurring
const COMPLETE_AT = 5400; // ms → call onComplete

/* ── Component ────────────────────────────────────────────────────── */
interface Props {
  /** data URL from canvas capture, or null for demo gradient */
  imageUrl: string | null;
  result: ScanResult;
  onComplete: () => void;
}

export default function AnalysisLoader({ imageUrl, result, onComplete }: Props) {
  const [isRevealed, setIsRevealed] = useState(false);
  const [showScanLine, setShowScanLine] = useState(true);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    // Stop scan line after all sweeps finish
    const scanTimer = window.setTimeout(
      () => setShowScanLine(false),
      SCAN_LINE_DURATION * SCAN_LINE_REPEATS * 1000 + 200,
    );
    // Reveal (de-blur) the image
    const revealTimer = window.setTimeout(
      () => setIsRevealed(true),
      BLUR_CLEAR_AT * 1000,
    );
    // Advance state
    const completeTimer = window.setTimeout(
      () => onCompleteRef.current(),
      COMPLETE_AT,
    );

    return () => {
      clearTimeout(scanTimer);
      clearTimeout(revealTimer);
      clearTimeout(completeTimer);
    };
  }, []);

  return (
    <div className="flex flex-col gap-4">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-1">
        <div>
          <p className="font-sans text-[9px] font-semibold uppercase tracking-[0.22em] text-gold">
            CHARIS VISION
          </p>
          <h2 className="font-display text-xl font-semibold italic text-charcoal">
            Analyzing Style DNA…
          </h2>
        </div>
        {/* Spinner dots */}
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="h-1.5 w-1.5 rounded-full bg-gold"
              animate={{ opacity: [0.2, 1, 0.2] }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                delay: i * 0.3,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>
      </div>

      {/* ── Image frame with scan animation ────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-charcoal/5" style={{ aspectRatio: "3/4" }}>

        {/* Captured image or demo gradient */}
        <motion.div
          className="absolute inset-0"
          initial={{ filter: "blur(20px)" }}
          animate={{ filter: isRevealed ? "blur(0px)" : "blur(20px)" }}
          transition={{ duration: 1.4, ease: "easeOut" }}
        >
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt="Captured outfit"
              className="h-full w-full object-cover"
            />
          ) : (
            /* Demo gradient placeholder */
            <div
              className="h-full w-full"
              style={{
                background:
                  "linear-gradient(160deg, #F8E5E5 0%, #EDE8DF 35%, #D4C5B0 65%, #BFB0A0 100%)",
              }}
            />
          )}
        </motion.div>

        {/* Gold scan line (horizontal sweep, top → bottom) */}
        {showScanLine && (
          <motion.div
            className="pointer-events-none absolute left-0 right-0 z-10"
            style={{
              height: 3,
              background:
                "linear-gradient(to right, transparent 0%, rgba(201,168,76,0.15) 15%, rgba(201,168,76,0.9) 50%, rgba(201,168,76,0.15) 85%, transparent 100%)",
              boxShadow: "0 0 18px 4px rgba(201,168,76,0.45)",
            }}
            initial={{ top: "2%" }}
            animate={{ top: ["2%", "98%"] }}
            transition={{
              duration: SCAN_LINE_DURATION,
              ease: "linear",
              repeat: SCAN_LINE_REPEATS - 1,
              repeatType: "loop",
            }}
          />
        )}

        {/* Sequential VisionPopup chips */}
        {result.attributes.map((attr) => (
          <VisionPopup key={attr.id} attr={attr} />
        ))}

        {/* Top-right progress label */}
        <div className="absolute right-3 top-3 z-10 rounded-full bg-charcoal/60 px-2.5 py-1 backdrop-blur-sm">
          <span className="font-mono text-[9px] font-semibold uppercase tracking-widest text-ivory">
            SCANNING
          </span>
        </div>
      </div>

      {/* ── StylingAxes rolling readout ─────────────────────────── */}
      <div className="rounded-xl border border-pearl bg-ivory/80 px-4 py-3.5">
        <p className="mb-3 font-sans text-[9px] font-semibold uppercase tracking-[0.2em] text-gold">
          ◈ Styling Axes Detected
        </p>
        <div className="flex flex-col gap-2.5">
          {AXIS_META.map(({ key, label, label_ko, barColor }, i) => (
            <AxisRow
              key={key}
              label={label}
              label_ko={label_ko}
              barColor={barColor}
              target={result.axes[key]}
              delay={0.4 + i * 0.25} // staggered start
            />
          ))}
        </div>
      </div>
    </div>
  );
}
