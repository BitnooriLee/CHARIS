/**
 * dna-store.ts
 *
 * StyleDNA를 localStorage에 저장/불러오는 헬퍼.
 * 키: "charis_style_dna"
 */

import type { StyleDNA } from "@/types/dna";

const DNA_KEY = "charis_style_dna";

export function storeDNA(dna: StyleDNA): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(DNA_KEY, JSON.stringify({ ...dna, updated_at: new Date().toISOString() }));
  } catch {
    /* quota exceeded — fail silently */
  }
}

export function loadDNA(): StyleDNA | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(DNA_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StyleDNA;
  } catch {
    return null;
  }
}

export function clearDNA(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(DNA_KEY);
}
