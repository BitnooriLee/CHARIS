/**
 * dna-store.ts — StyleDNA localStorage (versioned key + legacy migration)
 */

import type { StyleDNA } from "@/types/dna";

const DNA_KEY_V1 = "charis_style_dna:v1";
/** 이전 키 — load 시 v1으로 이전 후 제거 */
const DNA_KEY_LEGACY = "charis_style_dna";

function readAndMigrate(): StyleDNA | null {
  if (typeof window === "undefined") return null;
  try {
    let raw = localStorage.getItem(DNA_KEY_V1);
    if (!raw) {
      raw = localStorage.getItem(DNA_KEY_LEGACY);
      if (!raw) return null;
      localStorage.setItem(DNA_KEY_V1, raw);
      localStorage.removeItem(DNA_KEY_LEGACY);
    }
    return JSON.parse(raw) as StyleDNA;
  } catch {
    return null;
  }
}

export function storeDNA(dna: StyleDNA): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      DNA_KEY_V1,
      JSON.stringify({ ...dna, updated_at: new Date().toISOString() }),
    );
  } catch {
    /* quota exceeded */
  }
}

export function loadDNA(): StyleDNA | null {
  return readAndMigrate();
}

export function clearDNA(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(DNA_KEY_V1);
  localStorage.removeItem(DNA_KEY_LEGACY);
}
