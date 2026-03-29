"use client";

import { useState, useEffect, useRef } from "react";
import { Pencil, X, Check, Sparkles } from "lucide-react";

interface Props {
  goal: string;
  onSave: (updated: string) => void;
}

export default function GraceGoal({ goal, onSave }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState(goal);
  const [visible, setVisible] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  /* Sync external goal changes into draft when sheet is closed */
  useEffect(() => {
    if (!isOpen) setDraft(goal);
  }, [goal, isOpen]);

  /* Animate sheet in */
  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => setVisible(true));
      setTimeout(() => textareaRef.current?.focus(), 300);
    } else {
      setVisible(false);
    }
  }, [isOpen]);

  const openSheet = () => {
    setDraft(goal);
    setIsOpen(true);
  };

  const closeSheet = () => {
    setVisible(false);
    setTimeout(() => setIsOpen(false), 280);
  };

  const handleSave = () => {
    const trimmed = draft.trim();
    if (trimmed) onSave(trimmed);
    closeSheet();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSave();
    if (e.key === "Escape") closeSheet();
  };

  return (
    <>
      {/* ── Display card ───────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3 rounded-[var(--radius-card)] border border-pearl bg-ivory px-5 py-4">
        <div className="flex-1">
          <div className="mb-1 flex items-center gap-1.5">
            <Sparkles size={11} className="text-gold" />
            <span className="font-display text-[10px] font-semibold uppercase tracking-[0.22em] text-gold">
              Grace Goal
            </span>
          </div>
          <p className="text-sm font-normal leading-snug text-charcoal">
            {goal}
          </p>
        </div>
        <button
          onClick={openSheet}
          aria-label="Grace Goal 편집"
          className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-pearl text-charcoal/50 transition-colors hover:bg-charcoal/10 active:scale-95"
        >
          <Pencil size={13} />
        </button>
      </div>

      {/* ── Bottom sheet (portal-like fixed overlay) ───────────── */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          role="dialog"
          aria-modal="true"
          aria-label="Grace Goal 편집"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-charcoal/40 backdrop-blur-[2px] transition-opacity duration-300"
            style={{ opacity: visible ? 1 : 0 }}
            onClick={closeSheet}
          />

          {/* Sheet panel */}
          <div
            className="relative w-full max-w-[480px] rounded-t-2xl bg-ivory px-6 pb-10 pt-5 shadow-2xl transition-transform duration-300 ease-out"
            style={{ transform: visible ? "translateY(0)" : "translateY(100%)" }}
          >
            {/* Handle */}
            <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-charcoal/15" />

            {/* Header */}
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.18em] text-gold">
                  Grace Goal
                </p>
                <h3 className="text-xl font-bold leading-tight tracking-tight text-charcoal">
                  나의 스타일 지향점
                </h3>
              </div>
              <button
                onClick={closeSheet}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-pearl text-charcoal/40 hover:bg-charcoal/10"
                aria-label="닫기"
              >
                <X size={14} />
              </button>
            </div>

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={3}
              maxLength={120}
              placeholder="예: Effortless chic — 힘 뺀 듯 완성된 Parisian 무드"
              className="w-full resize-none rounded-xl border border-pearl bg-ivory px-4 py-3 text-sm font-normal leading-relaxed text-charcoal outline-none placeholder:text-charcoal/30 focus:border-gold focus:ring-0 transition-colors"
            />

            {/* Character count */}
            <p className="mt-1.5 text-right font-sans text-[10px] text-charcoal/30">
              {draft.trim().length} / 120
            </p>

            {/* Action buttons */}
            <div className="mt-4 flex gap-3">
              <button
                onClick={closeSheet}
                className="flex-1 rounded-[var(--radius-pill)] border border-pearl py-2.5 font-sans text-sm text-charcoal/60 transition-colors hover:bg-pearl"
              >
                취소
              </button>
              <button
                onClick={handleSave}
                disabled={!draft.trim()}
                className="flex flex-1 items-center justify-center gap-2 rounded-[var(--radius-pill)] bg-charcoal py-2.5 font-sans text-sm font-semibold text-ivory transition-opacity disabled:opacity-40"
              >
                <Check size={13} />
                저장
              </button>
            </div>

            <p className="mt-3 text-center font-sans text-[10px] text-charcoal/30">
              ⌘ Enter로 빠르게 저장할 수 있어요
            </p>
          </div>
        </div>
      )}
    </>
  );
}
