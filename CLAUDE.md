---
description: 
alwaysApply: true
---

# CHARIS AI — The Graceful Style Coach

## 1. Project Context & Philosophy

- **Vision:** "Don't change who you are; visualize your best self."
- **Core Values:** Grace · Expertise (Data-driven) · Zero-Judgment
- **Differentiators:**
  - **Mirror of Charis:** Virtual silhouette simulation — clothing overlaid on a user-specific SVG body shape with precise pixel-anchoring.
  - **Closet Rescue:** Data-backed layering to revive "forgotten" wardrobe items instead of suggesting disposal.
- **Tone:** High-end fashion editor × supportive best friend. Kitschy, witty, yet scientifically precise.

---

## 2. Technical Stack (Mobile-First PWA)

| Layer | Technology |
|---|---|
| AI Vision | Anthropic Claude 3.7 Sonnet (priority) → OpenAI GPT-4o-mini (fallback) → Local Mock |
| Frontend | Next.js 14 App Router · Tailwind CSS v4 (`@theme`) · Framer Motion · Recharts |
| Backend | FastAPI (Python 3.11+) · Pydantic v2 · `python-multipart` · `python-dotenv` |
| Icons | Lucide-react (no custom SVGs unless specified) |
| Database | SQLite (MVP) → PostgreSQL (Scale) |
| Visual Engine | Flux.1 / Stable Diffusion API (future: full try-on) |

---

## 3. Core Algorithms & Magic Numbers (Do Not Change Without Review)

### 3-A. 5-Axis StylingAxes Model

Every outfit is scored on five axes (float 0.0–1.0) plus a formality level (int 1–5):

```
StylingAxes {
  elegance:   0.0–1.0   # 우아함 / 드레시함
  authority:  0.0–1.0   # 권위 / 파워
  effortless: 0.0–1.0   # 캐주얼 / 꾸안꾸
  romantic:   0.0–1.0   # 로맨틱 / 페미닌
  boldness:   0.0–1.0   # 과감함 / 실험적
  formality:  1–5       # 1=초캐주얼, 5=블랙타이
}
```

**TPO scoring** (`backend/services/tpo_scorer.py`) compares these axes against 11 Korean TPO contexts via a directional penalty matrix — an axis being too high *or* too low relative to a context's ideal vector is penalized.

### 3-B. Body Shape Analysis Ratios

Body classification uses **circumference-based** measurements only:

| Shape | Primary Signal |
|---|---|
| Hourglass | `abs(bust - hip) < 5 cm` AND `waist / bust < 0.75` |
| Inverted Triangle | `bust - hip >= 5 cm` |
| Pear | `hip - bust >= 5 cm` |
| Rectangle | `waist / bust >= 0.75` |

Reference file: `backend/services/body_shape_analyzer.py`

### 3-C. Silhouette Anchoring (Mirror of Charis)

ViewBox: `"0 0 160 285"` — all Y-coordinates are percentages of this height.

| Key Point | viewBox Y | % of Height |
|---|---|---|
| Shoulder | 68 | **23.9 %** |
| Waist | 162 | **56.8 %** |
| Hip | 218 | 76.5 % |
| Hem | 244 | 85.6 % |

- **Tops / Dresses / Outerwear** → anchor at shoulder (23.9%)
- **Bottoms** → anchor at waist (56.8%)
- **Scale formula:** `clamp(height_cm / 165, 0.80, 1.20)` (ref height = 165 cm)

Reference file: `frontend/lib/clothing-scale.ts`

### 3-D. Vision Provider Priority

```
1. ANTHROPIC_API_KEY set  → Claude 3.7 Sonnet (highest accuracy)
2. OPENAI_API_KEY set     → GPT-4o-mini (fast, economical)
3. Neither key set        → Local mock response (demo mode)
```

Image guards: size > 10 MB → 413, `overall_quality < 0.40` → 422.

---

## 4. Data Standards

- **Color Logic:** 16 PCCS types — Season (Spring / Summer / Autumn / Winter) × SubTone (Light / Muted / Deep / Vivid).
- **TPO Contexts (11 KR):**
  - Relationship: `first_date`, `anniversary`, `campus_date`
  - Social: `wedding_guest`, `graduation`, `date_night`
  - Career: `daily_office`, `client_meeting`, `job_interview`
  - Lifestyle: `weekend_casual`, `outdoor_active`
- **`localStorage` Keys:**
  - `charis_scan_result` — `ScanAnalyzeResponse` + 30-min expiry
  - `charis_scan_image` — captured image dataURL, ≤ 2 MB

---

## 5. Strict Development Rules

- **UX Policy (Critical):** Zero negative terminology. Banned: "Worst," "Avoid," "Bad," "Flaw." Required: "Enhance," "Illuminate," "Balance," "Graceful."
- **Coding Style:** React Functional Components · Lucide-react icons · Tailwind-only styling (no inline styles) · camelCase TS interfaces.
- **snake_case ↔ camelCase Bridge:** Backend (Python) uses `snake_case`. Frontend TypeScript interfaces use `camelCase`. Conversion layer lives in `frontend/lib/api.ts`.
- **Workflow:** Explain logic/visual design before applying code. Obtain user approval first.

---

## 6. Page Architecture

| Route | Purpose | Key Data Source |
|---|---|---|
| `/` | Home + coaching feed + DNA quick-look | `MOCK_STYLE_DNA` (→ real API) |
| `/scan` | Camera capture → vision analysis → navigate to `/tpo` | `analyzeOutfit()` → `localStorage` |
| `/tpo` | Radar chart + coaching card report | `localStorage` `charis_scan_result` |
| `/mirror` | Silhouette overlay + Original ↔ Graceful Edit | `localStorage` (result + image) |
| `/dna` | Body & color profile + grace goal editor | `MOCK_STYLE_DNA` (→ real API) |
| `/closet` | Saved items + Closet Rescue CTA | Future API |

---

## [Core Protocol: The Interview First]

- **Mandatory:** For complex styling algorithms or database schema design, Claude MUST NOT write code immediately.
- **Procedure:** Use `AskUser` or a list of questions to interview the user:
  1. Aesthetic Logic: why a specific silhouette "enhances" a certain body type.
  2. Edge Cases: poor lighting, complex backgrounds, unique proportions.
  3. The "Non-Judgmental" Hook: verify wording never criticizes.
- **Stop Point:** Do not proceed with coding until the user explicitly states: "Interview finished, start implementation."

---

## Task Master AI Instructions
**Import Task Master's development workflow commands and guidelines, treat as if import is in the main CLAUDE.md file.**
@./.taskmaster/CLAUDE.md
