/**
 * scan-store.ts
 *
 * localStorage 기반 스캔 결과 브리지.
 * /scan 페이지에서 분석 결과를 저장하고, /tpo 페이지에서 읽어간다.
 * 30분 후 자동 만료.
 */

import { OutfitTPOScore } from "@/types/tpo";
import { ScanAnalyzeResponse } from "@/lib/api";

const STORE_KEY    = "charis_scan_result";
const EXPIRY_MS    = 30 * 60 * 1000; // 30분

interface StoredScanResult {
  tpo_score:  OutfitTPOScore;
  item_type:  string;
  is_demo:    boolean;
  session_id: string;
  saved_at:   number; // Date.now()
}

/* ── 저장 ───────────────────────────────────────────────────────────── */

export function storeScanResult(response: ScanAnalyzeResponse): void {
  if (typeof window === "undefined") return;

  const payload: StoredScanResult = {
    tpo_score:  response.tpo_score,
    item_type:  response.item_type,
    is_demo:    response.is_demo,
    session_id: response.session_id,
    saved_at:   Date.now(),
  };

  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(payload));
  } catch {
    // localStorage full or unavailable — fail silently
  }
}

/* ── 로드 ───────────────────────────────────────────────────────────── */

export function loadScanResult(): StoredScanResult | null {
  if (typeof window === "undefined") return null;

  const raw = localStorage.getItem(STORE_KEY);
  if (!raw) return null;

  try {
    const parsed: StoredScanResult = JSON.parse(raw);

    // 만료 체크
    if (Date.now() - parsed.saved_at > EXPIRY_MS) {
      localStorage.removeItem(STORE_KEY);
      return null;
    }

    return parsed;
  } catch {
    localStorage.removeItem(STORE_KEY);
    return null;
  }
}

/* ── 삭제 ───────────────────────────────────────────────────────────── */

export function clearScanResult(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORE_KEY);
}

/* ── 분 단위 경과 시간 ──────────────────────────────────────────────── */

export function minutesSinceScan(result: StoredScanResult): number {
  return Math.floor((Date.now() - result.saved_at) / 60_000);
}

/* ── 캡처 이미지 URL (Mirror 페이지용) ──────────────────────────────── */

const IMAGE_KEY    = "charis_scan_image";
const IMAGE_MAX_B  = 2 * 1024 * 1024; // 2 MB — base64 dataURL 상한

/**
 * 스캔 캡처 이미지의 dataURL을 localStorage에 저장한다.
 * 2MB 초과 시 조용히 스킵한다 (Mirror 페이지는 placeholder로 대체).
 */
export function storeImageUrl(dataUrl: string): void {
  if (typeof window === "undefined") return;
  try {
    if (dataUrl.length > IMAGE_MAX_B) return; // too large
    localStorage.setItem(IMAGE_KEY, dataUrl);
  } catch {
    // localStorage quota exceeded — fail silently
  }
}

export function loadImageUrl(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(IMAGE_KEY);
}

export function clearImageUrl(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(IMAGE_KEY);
}
