"use client";

import Link from "next/link";
import { Shirt, ScanLine } from "lucide-react";

export default function ClosetPage() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center px-8 pb-8 pt-20 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gold-light/30">
        <Shirt size={20} className="text-gold-dark" />
      </div>
      <p className="font-display mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-gold">
        Closet Rescue
      </p>
      <h1 className="mb-4 text-2xl font-bold leading-tight tracking-tight text-charcoal">
        잊혀진 옷에게<br />
        두 번째 기회를.
      </h1>
      <p className="mb-8 max-w-[260px] text-sm leading-relaxed text-charcoal/50">
        어려운 아이템을 업로드하면 기존 옷장에서 새로운 코디를 발굴해드립니다.
      </p>

      {/* CTA: Start Scan to add first item */}
      <Link
        href="/scan"
        className="flex items-center gap-2 rounded-[var(--radius-pill)] bg-charcoal px-8 py-3.5 font-sans text-sm font-semibold text-ivory shadow-sm active:scale-[0.98] transition-transform"
      >
        <ScanLine size={14} />
        첫 아이템 스캔하기
      </Link>
    </div>
  );
}
