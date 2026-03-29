# CHARIS AI — The Graceful Style Coach

> **"Don't change who you are; visualize your best self."**

한국어 버전 → [README.ko.md](./README.ko.md)

CHARIS AI is a mobile-first PWA that combines computer vision, personal color theory (PCCS 16-type), and body-shape analysis to deliver zero-judgment, data-backed style coaching.

---

## Features

| Feature | Description |
|---|---|
| **Scan & Analyze** | Photograph any outfit → Claude 3.7 Sonnet (or GPT-4o-mini) extracts item type, color, silhouette attributes |
| **TPO Scoring** | 5-axis radar chart scored against 11 Korean social contexts (하객룩, 출근룩, 소개팅, …) |
| **Mirror of Charis** | SVG body silhouette overlay — see how the outfit anchors to *your* proportions |
| **Graceful Edit** | Side-by-side coaching view with additive styling tips (never negative critique) |
| **Closet Rescue** | Data-backed reviving of forgotten wardrobe items via layering suggestions |
| **Style DNA** | Personal color (PCCS) × body shape profile with an editable grace goal |

---

## Tech Stack

```
Frontend  Next.js 14 (App Router) · Tailwind CSS v4 · Framer Motion · Recharts · Lucide-react
Backend   FastAPI (Python 3.11+) · Pydantic v2 · Anthropic SDK · OpenAI SDK
AI        Claude 3.7 Sonnet (vision) → GPT-4o-mini (fallback) → local mock
Database  SQLite (MVP) · PostgreSQL (scale)
```

---

## Project Structure

```
CHARIS/
├── backend/
│   ├── main.py                      # FastAPI app + CORS + dotenv loader
│   ├── api/v1/
│   │   ├── __init__.py              # APIRouter (prefix /api/v1)
│   │   └── scan.py                  # POST /scan/analyze endpoint
│   ├── services/
│   │   ├── vision_analyzer.py       # Claude / GPT-4o-mini vision calls
│   │   ├── vision_axes_mapper.py    # VisionItemResult → StylingAxes
│   │   ├── tpo_scorer.py            # 5-axis × 11 TPO scoring engine
│   │   ├── outfit_axes_estimator.py # Outfit → StylingAxes heuristics
│   │   └── body_shape_analyzer.py  # Circumference ratio → 4 body shapes
│   └── models/                      # Pydantic data models
│
├── frontend/
│   ├── app/
│   │   ├── page.tsx                 # Home (coaching feed + DNA quick-look)
│   │   ├── scan/page.tsx            # Camera capture + analysis loader
│   │   ├── tpo/page.tsx             # Radar chart report
│   │   ├── mirror/page.tsx          # Silhouette overlay + Graceful Edit
│   │   ├── dna/page.tsx             # Style DNA profile editor
│   │   ├── closet/page.tsx          # Saved items (Closet Rescue)
│   │   └── api/v1/scan/analyze/route.ts  # Next.js proxy → FastAPI
│   ├── components/
│   │   ├── mirror/SilhouetteMirror.tsx
│   │   ├── mirror/GracefulEditPanel.tsx
│   │   ├── dna/BodyVisualizer.tsx   # Parametric SVG silhouette
│   │   └── navigation/BottomNav.tsx
│   ├── lib/
│   │   ├── api.ts                   # fetch wrapper + snake→camel transform
│   │   ├── scan-store.ts            # localStorage helpers (30-min expiry)
│   │   └── clothing-scale.ts        # Anchoring % + scale utilities
│   └── types/
│       ├── dna.ts                   # StyleDNA, BodyShape, PersonalColor
│       ├── scan.ts                  # StylingAxes, VisionAttribute, ScanResult
│       └── tpo.ts                   # OutfitTPOScore, TPOContext
│
├── .env                             # ← your API keys (never commit)
├── .env.example                     # template
└── CLAUDE.md                        # AI coding agent rules
```

---

## Environment Setup

### 1. Copy the env template

```bash
cp .env.example .env
```

### 2. Configure API keys

Edit `.env`:

```dotenv
# Vision AI — at least one required for real analysis
ANTHROPIC_API_KEY=sk-ant-api03-...     # Priority 1 (Claude 3.7 Sonnet)
OPENAI_API_KEY=sk-proj-...             # Priority 2 (GPT-4o-mini)

# Frontend — backend URL for the Next.js proxy
NEXT_PUBLIC_API_URL=http://localhost:8000
```

**Provider priority:** Anthropic → OpenAI → local demo mock (no API key needed for demo).

> Never commit `.env`. It is listed in `.gitignore`.

---

## Running the App

### Backend (FastAPI)

```bash
# From project root
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate

pip install fastapi uvicorn "uvicorn[standard]" pydantic \
            python-multipart python-dotenv anthropic openai

uvicorn backend.main:app --reload --port 8000
```

API docs available at: `http://localhost:8000/docs`

### Frontend (Next.js)

```bash
cd frontend
npm install
npm run dev        # http://localhost:3000
```

The Next.js dev server proxies `/api/v1/scan/analyze` → `http://localhost:8000/api/v1/scan/analyze` via `frontend/app/api/v1/scan/analyze/route.ts`.

---

## Core Algorithm Reference

### 5-Axis StylingAxes

Each outfit is evaluated on five independent axes (float 0.0–1.0) plus formality (int 1–5):

| Axis | Korean | What it measures |
|---|---|---|
| `elegance` | 우아함 | Dressiness, refinement |
| `authority` | 권위감 | Power, structure, professional gravitas |
| `effortless` | 꾸안꾸 | Casual ease, relaxed chic |
| `romantic` | 로맨틱 | Femininity, softness, delicacy |
| `boldness` | 과감함 | Experimental, high-contrast, statement |
| `formality` | 격식 수준 | 1 = beach casual → 5 = black tie |

TPO scoring applies a directional penalty when an axis overshoots or undershoots the context's ideal vector (see `backend/services/tpo_scorer.py`).

### Silhouette Anchoring (Mirror of Charis)

Reference SVG viewBox: `0 0 160 285`

| Anchor Point | viewBox Y | Container % |
|---|---|---|
| Shoulder | 68 | **23.9 %** |
| Waist | 162 | **56.8 %** |
| Hip | 218 | 76.5 % |
| Hem | 244 | 85.6 % |

- Tops, dresses, outerwear → anchored at **shoulder (23.9 %)**
- Bottoms (skirts, pants) → anchored at **waist (56.8 %)**
- Scale formula: `clamp(height_cm / 165, 0.80, 1.20)`

### Body Shape Classification

Uses circumference-based ratios (`bust_cm`, `waist_cm`, `hip_cm`):

| Shape | 한국어 | Primary Signal |
|---|---|---|
| Hourglass | 모래시계형 | `\|bust − hip\| < 5` and `waist/bust < 0.75` |
| Inverted Triangle | 역삼각형 | `bust − hip ≥ 5` |
| Pear | 배형 | `hip − bust ≥ 5` |
| Rectangle | 직사각형 | `waist/bust ≥ 0.75` |

---

## Zero-Judgment Design Principle

CHARIS never uses negative language. Every UI string and coaching text must use **additive framing**:

| ❌ Banned | ✅ Required |
|---|---|
| Avoid / Bad / Flaw | Enhance / Illuminate / Graceful |
| Too wide / Too short | Balance / Elongate / Define |
| Problem area | Opportunity to highlight |

This applies to all copy in both the backend coaching narratives and frontend UI labels.

---

## Business Model Summary

| Pillar | Mechanism |
|---|---|
| **Closet Rescue** | Revive existing wardrobe → reduce purchase impulse, build trust |
| **Mirror Commerce** | "Buy this Item" → Musinsa deep-link (affiliate potential) |
| **Style DNA Subscription** | Personalized monthly coaching reports (roadmap) |
| **B2B API** | StylingAxes scoring as a service for e-commerce (roadmap) |

---

## License

Private — all rights reserved. © 2026 CHARIS AI.
