"use client";

import { motion } from "framer-motion";
import { VisionAttribute } from "@/types/scan";

/* ── Attribute → icon mapping ─────────────────────────────────────── */
const ATTR_ICON: Record<string, string> = {
  Neckline: "✧",
  Sleeve: "◈",
  Silhouette: "◇",
  Print: "✦",
  Color: "●",
};

interface Props {
  attr: VisionAttribute;
  /** If true, the chip is always visible (RESULT_READY state) */
  persist?: boolean;
}

export default function VisionPopup({ attr, persist = false }: Props) {
  const icon = ATTR_ICON[attr.attribute] ?? "◉";
  const confidencePct = Math.round(attr.confidence * 100);

  return (
    <motion.div
      className="absolute z-20 -translate-x-1/2 -translate-y-1/2"
      style={{ top: attr.top, left: attr.left }}
      initial={{ opacity: 0, scale: 0.7, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{
        delay: persist ? 0 : attr.delayS,
        duration: 0.35,
        ease: [0.34, 1.56, 0.64, 1], // spring-like
      }}
    >
      <div className="flex items-center gap-1.5 rounded-full border border-gold/60 bg-ivory/90 px-2.5 py-1 shadow-md backdrop-blur-sm">
        {/* Color swatch dot (only for Color attr) */}
        {attr.colorHex ? (
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full border border-white/40"
            style={{ backgroundColor: attr.colorHex }}
          />
        ) : (
          <span className="shrink-0 text-[9px] leading-none text-gold">
            {icon}
          </span>
        )}

        {/* Label */}
        <span className="font-sans text-[10px] font-semibold leading-none text-charcoal">
          {attr.label}
        </span>

        {/* Confidence */}
        <span className="font-mono text-[8px] leading-none text-charcoal/40">
          {confidencePct}%
        </span>
      </div>

      {/* Connector dot (indicates which region on the garment) */}
      <motion.div
        className="absolute left-1/2 top-full mt-0.5 h-1 w-1 -translate-x-1/2 rounded-full bg-gold/70"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: persist ? 0 : attr.delayS + 0.2, duration: 0.2 }}
      />
    </motion.div>
  );
}
