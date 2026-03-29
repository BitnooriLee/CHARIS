/**
 * CHARIS API Client
 *
 * 백엔드 FastAPI와 통신하는 함수 모음.
 * 모든 요청은 Next.js API Route 프록시(/api/v1/*)를 통해 전달된다.
 * CORS 설정 없이 same-origin 요청으로 처리된다.
 */

import { OutfitTPOScore } from "@/types/tpo";
import { VisionAttribute } from "@/types/scan";

/* ── 백엔드 원본 attribute (snake_case) ─────────────────────────── */
interface RawAttribute {
  id:          string;
  label:       string;
  attribute:   string;
  confidence:  number;
  top:         string;
  left:        string;
  delay_s:     number;   // snake_case from Python
  color_hex?:  string;
}

/* ── 응답 타입 (backend ScanAnalyzeResponse 1:1 매핑) ────────────── */

export interface StylingAxesData {
  elegance:   number;
  authority:  number;
  effortless: number;
  romantic:   number;
  boldness:   number;
  formality:  number;
}

export interface ScanAnalyzeResponse {
  item_type:  string;
  axes:       StylingAxesData;
  attributes: VisionAttribute[];   // ← scan animation chips
  tpo_score:  OutfitTPOScore;      // ← /tpo 리포트에 직접 사용
  session_id: string;
  is_demo:    boolean;
}

/* ── 에러 클래스 ────────────────────────────────────────────────────── */

export class ScanAPIError extends Error {
  constructor(
    public readonly code: string,
    public readonly userMessage: string,
    public readonly retryable: boolean,
  ) {
    super(userMessage);
    this.name = "ScanAPIError";
  }
}

/* ── analyzeOutfit ──────────────────────────────────────────────────── */

/**
 * 의류 이미지를 Multipart Form으로 전송해 분석 결과를 받아온다.
 *
 * @param imageBlob  - canvas.toBlob() 또는 File 객체
 * @param tpoContext - TPO 상황 코드 (기본값: "wedding_guest")
 * @param bodyShape  - 체형 코드 소문자 (기본값: "hourglass")
 */
export async function analyzeOutfit(
  imageBlob: Blob,
  tpoContext: string = "wedding_guest",
  bodyShape: string  = "hourglass",
): Promise<ScanAnalyzeResponse> {
  const form = new FormData();
  form.append("image",       imageBlob, "outfit.jpg");
  form.append("tpo_context", tpoContext);
  form.append("body_shape",  bodyShape);

  const res = await fetch("/api/v1/scan/analyze", {
    method: "POST",
    body: form,
    // No Content-Type header — browser sets multipart boundary automatically
  });

  const data = await res.json();

  if (!res.ok) {
    throw new ScanAPIError(
      data.code         ?? "UNKNOWN",
      data.user_message ?? "분석 중 오류가 발생했습니다.",
      data.retryable    ?? true,
    );
  }

  // snake_case → camelCase 변환 (delay_s → delayS, color_hex → colorHex)
  const attributes: VisionAttribute[] = (data.attributes as RawAttribute[]).map((a) => ({
    id:         a.id,
    label:      a.label,
    attribute:  a.attribute,
    confidence: a.confidence,
    top:        a.top,
    left:       a.left,
    delayS:     a.delay_s,
    colorHex:   a.color_hex,
  }));

  return { ...data, attributes } as ScanAnalyzeResponse;
}
