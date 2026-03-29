# CHARIS AI — 우아한 스타일 코치

> **"당신을 바꾸지 마세요; 최고의 당신을 시각화하세요."**

CHARIS AI는 모바일 퍼스트 PWA입니다. 컴퓨터 비전, 퍼스널컬러 이론(PCCS 16타입), 체형 분석을 결합해 판단 없는(Zero-Judgment) 데이터 기반 스타일 코칭을 제공합니다.

English version → [README.md](./README.md)

---

## 주요 기능

| 기능 | 설명 |
|---|---|
| **스캔 & 분석** | 의류 사진 촬영 → Claude 3.7 Sonnet(또는 GPT-4o-mini)이 아이템 종류, 색상, 실루엣 속성 추출 |
| **TPO 스코어링** | 한국형 11개 TPO 상황(하객룩, 출근룩, 소개팅 등)에 대한 5축 레이더 차트 평가 |
| **카리스의 거울** | SVG 체형 실루엣 오버레이 — 옷이 *나의* 비율에서 어떻게 보이는지 확인 |
| **그레이스풀 에디트** | 긍정적 언어로만 작성된 스타일 팁이 담긴 나란히 보기 코칭 뷰 |
| **클로젯 레스큐** | 데이터 기반 레이어링으로 잊혀진 옷에 두 번째 기회 부여 |
| **스타일 DNA** | 체형 × 퍼스널컬러 프로필과 편집 가능한 그레이스 골 |

---

## 기술 스택

```
프론트엔드   Next.js 14 (App Router) · Tailwind CSS v4 · Framer Motion · Recharts · Lucide-react
백엔드      FastAPI (Python 3.11+) · Pydantic v2 · Anthropic SDK · OpenAI SDK
AI          Claude 3.7 Sonnet (비전) → GPT-4o-mini (폴백) → 로컬 목업
데이터베이스  SQLite (MVP) · PostgreSQL (스케일)
```

---

## 프로젝트 구조

```
CHARIS/
├── backend/
│   ├── main.py                      # FastAPI 앱 + CORS + dotenv 로더
│   ├── api/v1/
│   │   ├── __init__.py              # APIRouter (prefix /api/v1)
│   │   └── scan.py                  # POST /scan/analyze 엔드포인트
│   ├── services/
│   │   ├── vision_analyzer.py       # Claude / GPT-4o-mini 비전 API 호출
│   │   ├── vision_axes_mapper.py    # VisionItemResult → StylingAxes 변환
│   │   ├── tpo_scorer.py            # 5축 × 11 TPO 스코어링 엔진
│   │   ├── outfit_axes_estimator.py # 의류 → StylingAxes 휴리스틱
│   │   └── body_shape_analyzer.py  # 둘레 비율 → 4대 체형 분류
│   └── models/                      # Pydantic 데이터 모델
│
├── frontend/
│   ├── app/
│   │   ├── page.tsx                 # 홈 (코칭 피드 + DNA 퀵룩)
│   │   ├── scan/page.tsx            # 카메라 캡처 + 분석 로더
│   │   ├── tpo/page.tsx             # 레이더 차트 리포트
│   │   ├── mirror/page.tsx          # 실루엣 오버레이 + 그레이스풀 에디트
│   │   ├── dna/page.tsx             # 스타일 DNA 프로필 편집기
│   │   ├── closet/page.tsx          # 저장된 아이템 (클로젯 레스큐)
│   │   └── api/v1/scan/analyze/route.ts  # Next.js 프록시 → FastAPI
│   ├── components/
│   │   ├── mirror/SilhouetteMirror.tsx
│   │   ├── mirror/GracefulEditPanel.tsx
│   │   ├── dna/BodyVisualizer.tsx   # 파라메트릭 SVG 실루엣
│   │   └── navigation/BottomNav.tsx
│   ├── lib/
│   │   ├── api.ts                   # fetch 래퍼 + snake_case→camelCase 변환
│   │   ├── scan-store.ts            # localStorage 헬퍼 (30분 만료)
│   │   └── clothing-scale.ts        # 앵커링 % + 스케일 계산 유틸
│   └── types/
│       ├── dna.ts                   # StyleDNA, BodyShape, PersonalColor
│       ├── scan.ts                  # StylingAxes, VisionAttribute, ScanResult
│       └── tpo.ts                   # OutfitTPOScore, TPOContext
│
├── .env                             # ← API 키 (절대 커밋 금지)
├── .env.example                     # 환경변수 템플릿
└── CLAUDE.md                        # AI 코딩 에이전트 규칙
```

---

## 환경 설정

### 1. 환경변수 파일 복사

```bash
cp .env.example .env
```

### 2. API 키 설정

`.env` 파일을 열고 아래와 같이 입력하세요:

```dotenv
# Vision AI — 실제 분석을 위해 하나 이상 필수
ANTHROPIC_API_KEY=sk-ant-api03-...     # 우선순위 1 (Claude 3.7 Sonnet)
OPENAI_API_KEY=sk-proj-...             # 우선순위 2 (GPT-4o-mini)

# 프론트엔드 — Next.js 프록시가 백엔드로 연결할 URL
NEXT_PUBLIC_API_URL=http://localhost:8000
```

**AI 공급자 우선순위:** Anthropic → OpenAI → 로컬 데모 목업 (API 키 없어도 데모 가능)

> `.env` 파일은 절대 커밋하지 마세요. `.gitignore`에 등록되어 있습니다.

---

## 실행 방법

### 백엔드 (FastAPI)

```bash
# 프로젝트 루트에서 실행
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate

pip install fastapi uvicorn "uvicorn[standard]" pydantic \
            python-multipart python-dotenv anthropic openai

uvicorn backend.main:app --reload --port 8000
```

API 문서(Swagger UI): `http://localhost:8000/docs`

### 프론트엔드 (Next.js)

```bash
cd frontend
npm install
npm run dev        # http://localhost:3000
```

Next.js 개발 서버는 `/api/v1/scan/analyze` 요청을 `http://localhost:8000/api/v1/scan/analyze`로 자동 프록시합니다 (`frontend/app/api/v1/scan/analyze/route.ts`).

---

## 핵심 알고리즘 레퍼런스

### 5축 StylingAxes 모델

모든 의류는 5개의 독립 축(float 0.0–1.0)과 격식 수준(int 1–5)으로 평가됩니다:

| 축 | 한국어 | 측정 항목 |
|---|---|---|
| `elegance` | 우아함 | 드레시함, 세련미 |
| `authority` | 권위감 | 파워, 구조감, 전문적 존재감 |
| `effortless` | 꾸안꾸 | 캐주얼한 편안함, 힘 뺀 시크함 |
| `romantic` | 로맨틱 | 여성스러움, 부드러움, 섬세함 |
| `boldness` | 과감함 | 실험적, 강한 대비, 스테이트먼트 |
| `formality` | 격식 수준 | 1 = 비치 캐주얼 → 5 = 블랙타이 |

TPO 스코어링은 각 축이 해당 TPO 상황의 이상적인 벡터를 초과하거나 미달할 때 방향성 패널티를 부여합니다 (`backend/services/tpo_scorer.py` 참조).

### 실루엣 앵커링 (카리스의 거울)

기준 SVG viewBox: `0 0 160 285`

| 앵커 포인트 | viewBox Y | 컨테이너 높이 % |
|---|---|---|
| 어깨 (Shoulder) | 68 | **23.9 %** |
| 허리 (Waist) | 162 | **56.8 %** |
| 힙 (Hip) | 218 | 76.5 % |
| 밑단 (Hem) | 244 | 85.6 % |

- 상의 · 원피스 · 아우터 → **어깨(23.9 %)** 기준 앵커
- 하의 (스커트, 팬츠) → **허리(56.8 %)** 기준 앵커
- 스케일 공식: `clamp(height_cm / 165, 0.80, 1.20)`

참조 파일: `frontend/lib/clothing-scale.ts`

### 체형 분류 기준

둘레 기반 수치(`bust_cm`, `waist_cm`, `hip_cm`)만 사용합니다:

| 체형 | 기준 신호 |
|---|---|
| 모래시계형 | `\|가슴 − 힙\| < 5cm` 이고 `허리 / 가슴 < 0.75` |
| 역삼각형 | `가슴 − 힙 ≥ 5cm` |
| 배형 | `힙 − 가슴 ≥ 5cm` |
| 직사각형 | `허리 / 가슴 ≥ 0.75` |

참조 파일: `backend/services/body_shape_analyzer.py`

---

## Zero-Judgment 디자인 원칙

CHARIS는 절대 부정적 언어를 사용하지 않습니다. 모든 UI 텍스트와 코칭 문구는 **긍정 확장형 표현**을 사용해야 합니다:

| ❌ 금지 표현 | ✅ 필수 표현 |
|---|---|
| 피하세요 / 나쁨 / 단점 | 강조하세요 / 빛내세요 / 우아하게 |
| 너무 넓다 / 너무 짧다 | 균형 / 연장 / 정의 |
| 문제 부위 | 빛낼 수 있는 기회 |

백엔드 코칭 내러티브부터 프론트엔드 UI 레이블까지 모든 텍스트에 적용됩니다.

---

## 유저 플로우

```
홈 [스캔 시작하기]
  ↓
스캔 (카메라 촬영 또는 데모 모드)
  ↓ analyzeOutfit() API 호출 → localStorage 저장
TPO 리포트 [실루엣 미러에서 보기]
  ↓
카리스의 거울 [Original / Graceful Edit 전환]
  ├─ [Buy this Item] → 무신사 검색 새 탭
  ├─ [Add to Closet] → 저장 토스트
  └─ [다른 옷 스캔하기] → /scan
클로젯 [첫 아이템 스캔하기] → /scan
```

---

## 비즈니스 모델

| 축 | 메커니즘 |
|---|---|
| **클로젯 레스큐** | 기존 옷장 되살리기 → 구매 충동 감소, 신뢰 구축 |
| **미러 커머스** | "이 아이템 구매하기" → 무신사 딥링크 (어필리에이트 수익 가능) |
| **스타일 DNA 구독** | 개인화 월간 코칭 리포트 (로드맵) |
| **B2B API** | e-커머스를 위한 StylingAxes 스코어링 서비스 (로드맵) |

---

## 라이선스

비공개 — 모든 권리 보유. © 2026 CHARIS AI.
