"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence, type Transition } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  ScanLine,
  Camera,
  ChevronLeft,
  Sparkles,
  ArrowRight,
  ImagePlus,
  RefreshCw,
  AlertCircle,
} from "lucide-react";

import CameraGuide from "@/components/scan/CameraGuide";
import AnalysisLoader from "@/components/scan/AnalysisLoader";
import VisionPopup from "@/components/scan/VisionPopup";
import { ScanState, ScanResult, MOCK_SCAN_RESULT, AXIS_META } from "@/types/scan";
import { analyzeOutfit, ScanAPIError, ScanAnalyzeResponse } from "@/lib/api";
import { storeScanResult, storeImageUrl } from "@/lib/scan-store";
import { MOCK_WEDDING_GUEST_REPORT } from "@/types/tpo";

/* ── Error code → Graceful 한국어 메시지 ─────────────────────────── */
const ERROR_MESSAGES: Record<string, string> = {
  IMAGE_QUALITY_LOW:
    "조명이 조금 더 밝은 공간에서 다시 촬영해주세요. 자연광이 가장 이상적이에요.",
  IMAGE_TOO_LARGE:
    "이미지 파일이 너무 큽니다. 10MB 이하의 사진을 사용해주세요.",
  ANALYSIS_FAILED:
    "이번 분석이 조금 어려웠어요. 옷이 잘 보이도록 배경을 정리하고 다시 시도해주세요.",
  NETWORK_ERROR:
    "분석 서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.",
  UNKNOWN:
    "예상치 못한 오류가 발생했습니다. 다시 시도해주세요.",
};

/* ── Page transition preset ─────────────────────────────────────── */
const fadeSlide = {
  initial:    { opacity: 0, y: 16 },
  animate:    { opacity: 1, y: 0 },
  exit:       { opacity: 0, y: -12 },
  transition: { duration: 0.3, ease: "easeOut" } as Transition,
};

/* ── Camera helper ───────────────────────────────────────────────── */
async function startCamera(videoEl: HTMLVideoElement): Promise<MediaStream | null> {
  if (!navigator.mediaDevices?.getUserMedia) return null;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment", width: { ideal: 1080 } },
    });
    videoEl.srcObject = stream;
    await videoEl.play();
    return stream;
  } catch {
    return null;
  }
}

/* ── Error overlay ───────────────────────────────────────────────── */
function ErrorOverlay({
  error,
  onRetry,
  onDemoMode,
}: {
  error:      ScanAPIError;
  onRetry:    () => void;
  onDemoMode: () => void;
}) {
  const message =
    ERROR_MESSAGES[error.code] ?? ERROR_MESSAGES.UNKNOWN;

  return (
    <motion.div
      className="absolute inset-0 z-30 flex flex-col items-center justify-end rounded-2xl bg-charcoal/80 p-6 pb-8 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Icon */}
      <motion.div
        className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blush/20"
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 280, damping: 20 }}
      >
        <AlertCircle size={26} className="text-blush" />
      </motion.div>

      {/* Graceful message */}
      <p className="mb-1 font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-blush">
        ✦ Grace Note
      </p>
      <p className="mb-6 max-w-[260px] text-center text-sm font-medium leading-relaxed text-ivory">
        {message}
      </p>

      {/* CTAs */}
      <div className="flex w-full flex-col gap-2.5">
        {error.retryable && (
          <button
            onClick={onRetry}
            className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-pill)] bg-ivory py-3 font-sans text-sm font-semibold text-charcoal"
          >
            <RefreshCw size={13} />
            다시 촬영하기
          </button>
        )}
        <button
          onClick={onDemoMode}
          className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-pill)] border border-ivory/30 py-3 font-sans text-sm text-ivory/70"
        >
          <ImagePlus size={13} />
          데모 모드로 체험
        </button>
      </div>
    </motion.div>
  );
}

/* ── Page ────────────────────────────────────────────────────────── */
export default function ScanPage() {
  const router = useRouter();

  const [state,       setState]       = useState<ScanState>("IDLE");
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [scanResult,  setScanResult]  = useState<ScanResult>(MOCK_SCAN_RESULT);

  // API state
  const [apiResponse, setApiResponse] = useState<ScanAnalyzeResponse | null>(null);
  const [apiError,    setApiError]    = useState<ScanAPIError | null>(null);
  const [animDone,    setAnimDone]    = useState(false);

  // Camera
  const [cameraAvailable, setCameraAvailable] = useState(true);
  const videoRef  = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  /* Cleanup camera on unmount */
  useEffect(() => () => stopCamera(), []);

  /* Navigate when both animation and API response are ready */
  useEffect(() => {
    if (!animDone || !apiResponse) return;
    storeScanResult(apiResponse);
    // Persist captured image for Mirror page (2MB limit enforced inside)
    if (capturedUrl) storeImageUrl(capturedUrl);
    router.push("/tpo");
  }, [animDone, apiResponse, capturedUrl, router]);

  /* ── Camera control ─────────────────────────────────────────── */
  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  /* ── IDLE → CAPTURING ──────────────────────────────────────── */
  const handleStartCapture = useCallback(() => {
    setCameraAvailable(true); // 이전 실패 상태 리셋
    setApiError(null);
    setState("CAPTURING");
  }, []);

  /**
   * Callback ref: <video>가 DOM에 실제로 마운트된 순간 카메라를 시작한다.
   * AnimatePresence mode="wait" 의 exit 애니메이션(300ms)이 끝나야
   * 다음 요소가 마운트되므로, setTimeout 폴링 대신 이 방식이 정확하다.
   */
  const handleVideoMount = useCallback((el: HTMLVideoElement | null) => {
    videoRef.current = el;
    if (!el) return;
    startCamera(el).then((stream) => {
      if (!stream) setCameraAvailable(false);
      else streamRef.current = stream;
    });
  }, []);

  /* ── CAPTURING → ANALYZING ─────────────────────────────────── */
  const handleCapture = useCallback(() => {
    let blob: Blob | null = null;
    let dataUrl: string | null = null;

    if (videoRef.current && videoRef.current.videoWidth > 0) {
      const v      = videoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width  = v.videoWidth;
      canvas.height = v.videoHeight;
      canvas.getContext("2d")?.drawImage(v, 0, 0);
      dataUrl = canvas.toDataURL("image/jpeg", 0.9);

      // Canvas → Blob for API upload
      canvas.toBlob(
        (b) => { if (b) setCapturedBlob(b); },
        "image/jpeg",
        0.9,
      );
    }

    stopCamera();
    setCapturedUrl(dataUrl);
    setAnimDone(false);
    setApiError(null);
    setApiResponse(null);
    setState("ANALYZING");
  }, []);

  /* ── API call when ANALYZING starts ────────────────────────── */
  useEffect(() => {
    if (state !== "ANALYZING") return;

    const run = async () => {
      // ── Demo mode: no camera → use local mock (no API call) ───────────
      if (!capturedBlob) {
        const demoResponse: ScanAnalyzeResponse = {
          item_type:  MOCK_SCAN_RESULT.item_type,
          axes:       { ...MOCK_SCAN_RESULT.axes, formality: 3 },
          attributes: MOCK_SCAN_RESULT.attributes,
          tpo_score:  MOCK_WEDDING_GUEST_REPORT,
          session_id: "demo-local",
          is_demo:    true,
        };
        setScanResult(MOCK_SCAN_RESULT);
        setApiResponse(demoResponse);
        return;
      }

      // ── Real capture: call API ─────────────────────────────────────────
      try {
        const result = await analyzeOutfit(capturedBlob);
        // Extract actual dominant color from vision attributes
        const colorAttr = result.attributes.find((a) => a.id === "color");
        const dominantColor = colorAttr?.colorHex ?? "#D4A5A5";
        setScanResult({
          axes:           { ...result.axes },
          attributes:     result.attributes,
          dominant_color: dominantColor,
          item_type:      result.item_type,
        });
        setApiResponse(result);
      } catch (err) {
        if (err instanceof ScanAPIError) setApiError(err);
        else setApiError(new ScanAPIError("UNKNOWN", ERROR_MESSAGES.UNKNOWN, true));
      }
    };

    run();
  }, [state]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Animation complete callback ────────────────────────────── */
  const handleAnimComplete = useCallback(() => {
    setAnimDone(true);
    // If API already resolved, the useEffect above will navigate
  }, []);

  /* ── Demo mode (skip camera) ────────────────────────────────── */
  const handleDemoMode = useCallback(() => {
    stopCamera();
    setCapturedUrl(null);
    setCapturedBlob(null);
    setAnimDone(false);
    setApiError(null);
    setApiResponse(null);
    setState("ANALYZING");
  }, []);

  /* ── Error: retry (go back to CAPTURING) ───────────────────── */
  const handleRetry = useCallback(() => {
    setApiError(null);
    setAnimDone(false);
    handleStartCapture();
  }, [handleStartCapture]);

  /* ── RESULT_READY (fallback if navigation fails) ────────────── */
  const handleAnalysisComplete = useCallback(() => {
    setState("RESULT_READY");
  }, []);

  const pageTitle = {
    IDLE:         "Outfit Analysis",
    CAPTURING:    "Frame Your Outfit",
    ANALYZING:    apiError ? "다시 시도해주세요" : "Reading Style DNA…",
    RESULT_READY: "Analysis Complete",
  }[state];

  return (
    <div className="flex min-h-full flex-col bg-ivory pb-[calc(var(--spacing-nav)+24px)]">
      {/* ── Header ──────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 flex items-center gap-3 bg-ivory/90 px-5 py-4 backdrop-blur-md">
        {state !== "IDLE" ? (
          <button
            onClick={() => { stopCamera(); setState("IDLE"); }}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-charcoal/8 text-charcoal"
          >
            <ChevronLeft size={16} />
          </button>
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-charcoal">
            <ScanLine size={15} className="text-ivory" />
          </div>
        )}
        <div>
          <p className="font-display text-[9px] font-semibold uppercase tracking-[0.22em] text-gold">
            CHARIS SCAN
          </p>
          <h1 className="text-xl font-bold leading-tight tracking-tight text-charcoal">
            {pageTitle}
          </h1>
        </div>
      </header>

      {/* ── Content ─────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col px-5 pt-2">
        <AnimatePresence mode="wait">

          {/* ════════ IDLE ═══════════════════════════════════════ */}
          {state === "IDLE" && (
            <motion.div key="idle" {...fadeSlide} className="flex flex-col gap-6">
              {/* Hero */}
              <div
                className="relative flex items-center justify-center overflow-hidden rounded-2xl bg-pearl"
                style={{ aspectRatio: "3/4" }}
              >
                <div
                  className="absolute inset-0"
                  style={{
                    background: "radial-gradient(ellipse at 50% 60%, rgba(201,168,76,0.08) 0%, transparent 70%)",
                  }}
                />
                <motion.div
                  className="flex flex-col items-center gap-4"
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" } as Transition}
                >
                  <motion.div
                    className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-dashed border-gold/60 bg-ivory"
                    animate={{ borderColor: ["rgba(201,168,76,0.4)", "rgba(201,168,76,0.9)", "rgba(201,168,76,0.4)"] }}
                    transition={{ duration: 2.5, repeat: Infinity } as Transition}
                  >
                    <ScanLine size={36} className="text-gold" />
                  </motion.div>
                  <p className="font-display text-2xl font-light italic text-charcoal/60">
                    Scan your outfit
                  </p>
                  <p className="max-w-[220px] text-center font-sans text-xs leading-relaxed text-charcoal/40">
                    카메라로 오늘의 옷을 스캔하면 5축 스타일 DNA를 즉시 분석합니다
                  </p>
                </motion.div>

                {/* Corner brackets */}
                {[
                  { t: "14px", l: "14px", r: "auto", b: "auto", bT: "2px", bL: "2px", bR: "none", bB: "none" },
                  { t: "14px", l: "auto", r: "14px", b: "auto", bT: "2px", bL: "none", bR: "2px", bB: "none" },
                  { t: "auto", l: "14px", r: "auto", b: "14px", bT: "none", bL: "2px", bR: "none", bB: "2px" },
                  { t: "auto", l: "auto", r: "14px", b: "14px", bT: "none", bL: "none", bR: "2px", bB: "2px" },
                ].map((p, i) => (
                  <div
                    key={i}
                    className="pointer-events-none absolute h-8 w-8"
                    style={{
                      top: p.t, left: p.l, right: p.r, bottom: p.b,
                      borderTop: p.bT === "2px" ? "2px solid rgba(201,168,76,0.5)" : "none",
                      borderLeft: p.bL === "2px" ? "2px solid rgba(201,168,76,0.5)" : "none",
                      borderRight: p.bR === "2px" ? "2px solid rgba(201,168,76,0.5)" : "none",
                      borderBottom: p.bB === "2px" ? "2px solid rgba(201,168,76,0.5)" : "none",
                    }}
                  />
                ))}
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={handleStartCapture}
                  className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-pill)] bg-charcoal py-3.5 font-sans text-sm font-semibold text-ivory"
                >
                  <Camera size={16} />
                  카메라로 스캔 시작
                </button>
                <button
                  onClick={handleDemoMode}
                  className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-pill)] border border-pearl py-3.5 font-sans text-sm text-charcoal/60"
                >
                  <ImagePlus size={15} />
                  데모 모드로 체험
                </button>
              </div>
            </motion.div>
          )}

          {/* ════════ CAPTURING ══════════════════════════════════ */}
          {state === "CAPTURING" && (
            <motion.div key="capturing" {...fadeSlide} className="flex flex-col gap-4">
              <div
                className="relative overflow-hidden rounded-2xl bg-charcoal"
                style={{ aspectRatio: "3/4" }}
              >
                {cameraAvailable ? (
                  <video
                    ref={handleVideoMount}
                    autoPlay
                    playsInline
                    muted
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-charcoal">
                    <Camera size={40} className="text-charcoal/30" />
                    <p className="font-sans text-xs text-ivory/40">카메라를 사용할 수 없습니다</p>
                    <button
                      onClick={handleDemoMode}
                      className="rounded-full border border-gold/60 px-4 py-2 font-sans text-xs text-gold"
                    >
                      데모 모드로 전환
                    </button>
                  </div>
                )}
                <CameraGuide />
              </div>

              <p className="text-center font-sans text-xs text-charcoal/45">
                실루엣 가이드에 옷을 맞추고 촬영 버튼을 눌러주세요
              </p>

              <div className="flex justify-center py-2">
                <button onClick={handleCapture} aria-label="촬영" className="relative flex h-16 w-16 items-center justify-center">
                  <motion.span
                    className="absolute inset-0 rounded-full border-2 border-gold"
                    animate={{ scale: [1, 1.08, 1] }}
                    transition={{ duration: 2, repeat: Infinity } as Transition}
                  />
                  <span className="h-12 w-12 rounded-full bg-gold shadow-lg" />
                </button>
              </div>
            </motion.div>
          )}

          {/* ════════ ANALYZING ══════════════════════════════════ */}
          {state === "ANALYZING" && (
            <motion.div key="analyzing" {...fadeSlide} className="relative">
              <AnalysisLoader
                imageUrl={capturedUrl}
                result={scanResult}
                onComplete={handleAnimComplete}
              />

              {/* ── Error overlay (shows when API fails) ──────── */}
              <AnimatePresence>
                {apiError && (
                  <ErrorOverlay
                    error={apiError}
                    onRetry={handleRetry}
                    onDemoMode={handleDemoMode}
                  />
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* ════════ RESULT_READY (fallback) ════════════════════ */}
          {state === "RESULT_READY" && (
            <motion.div key="result" {...fadeSlide} className="flex flex-col gap-5">
              <motion.div
                className="flex items-center gap-2"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 } as Transition}
              >
                <Sparkles size={14} className="text-gold" />
                <p className="font-sans text-sm font-semibold text-gold">
                  ✦ Style DNA 분석 완료
                </p>
              </motion.div>

              <div
                className="relative overflow-hidden rounded-2xl"
                style={{ aspectRatio: "3/4" }}
              >
                {capturedUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={capturedUrl} alt="Scanned outfit" className="h-full w-full object-cover" />
                ) : (
                  <div
                    className="h-full w-full"
                    style={{ background: "linear-gradient(160deg, #F8E5E5 0%, #EDE8DF 35%, #D4C5B0 65%, #BFB0A0 100%)" }}
                  />
                )}
                {scanResult.attributes.map((attr) => (
                  <VisionPopup key={attr.id} attr={attr} persist />
                ))}
                <div className="absolute bottom-3 left-3 right-3 rounded-xl bg-charcoal/75 px-4 py-2.5 backdrop-blur-sm">
                  <p className="font-sans text-[9px] uppercase tracking-widest text-gold">
                    {scanResult.attributes.length}개 속성 감지 · {scanResult.item_type}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-pearl bg-ivory px-4 py-4">
                <p className="mb-3 font-sans text-[9px] font-semibold uppercase tracking-[0.2em] text-gold">◈ Styling Axes</p>
                <div className="flex flex-col gap-2.5">
                  {AXIS_META.map(({ key, label, label_ko, barColor }) => (
                    <div key={key} className="flex items-center gap-2.5">
                      <div className="w-[78px] shrink-0 text-right">
                        <span className="block font-sans text-[9px] font-semibold uppercase tracking-widest text-charcoal/50">{label}</span>
                        <span className="block font-sans text-[8px] text-charcoal/35">{label_ko}</span>
                      </div>
                      <div className="relative h-1 flex-1 rounded-full bg-charcoal/8">
                        <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${scanResult.axes[key] * 100}%`, backgroundColor: barColor }} />
                      </div>
                      <span className="w-7 shrink-0 font-mono text-[11px] font-semibold tabular-nums text-charcoal">
                        {Math.round(scanResult.axes[key] * 100)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => {
                  if (apiResponse) {
                    storeScanResult(apiResponse);
                    if (capturedUrl) storeImageUrl(capturedUrl);
                    router.push("/tpo");
                  } else {
                    handleAnalysisComplete();
                  }
                }}
                className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-pill)] bg-charcoal py-4 font-sans text-sm font-semibold text-ivory"
              >
                TPO 리포트 보기 <ArrowRight size={15} />
              </button>

              <button onClick={() => setState("IDLE")} className="py-2 text-center font-sans text-xs text-charcoal/40 underline underline-offset-2">
                다시 스캔하기
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
