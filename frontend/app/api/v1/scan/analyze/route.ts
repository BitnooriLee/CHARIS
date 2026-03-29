/**
 * Next.js API Route Proxy
 * /api/v1/scan/analyze → FastAPI http://localhost:8000/api/v1/scan/analyze
 *
 * - Multipart FormData를 그대로 전달하므로 Content-Type 헤더 재설정 불필요
 * - FASTAPI_URL 환경 변수로 FastAPI 주소 오버라이드 가능 (배포 시)
 */

export const runtime = "nodejs"; // Edge runtime does not support file streaming

const FASTAPI_URL =
  process.env.FASTAPI_URL ?? "http://localhost:8000";

export async function POST(request: Request): Promise<Response> {
  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return Response.json(
      {
        code: "INVALID_REQUEST",
        user_message: "요청 형식이 올바르지 않습니다.",
        retryable: false,
      },
      { status: 400 },
    );
  }

  try {
    const upstream = await fetch(`${FASTAPI_URL}/api/v1/scan/analyze`, {
      method: "POST",
      body: formData,
      // Do NOT set Content-Type — fetch sets boundary automatically for FormData
    });

    const data = await upstream.json();

    // Pass through status (200, 413, 422, 500, …)
    return Response.json(data, { status: upstream.status });
  } catch {
    // FastAPI not reachable (e.g. not started yet)
    return Response.json(
      {
        code: "NETWORK_ERROR",
        user_message:
          "분석 서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.",
        retryable: true,
      },
      { status: 503 },
    );
  }
}
