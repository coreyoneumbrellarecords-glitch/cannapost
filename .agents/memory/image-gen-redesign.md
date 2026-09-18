---
name: Image Generation Redesign
description: OpenRouter image pipeline, model fallback order, and general/product prompt separation
---

## Current system (as of Aug 2026)

All images generated natively by OpenRouter's Image API. No Stability AI, no Sharp compositing, no SVG overlay on product posts.

**Model order**: `openai/gpt-5-image` → `google/gemini-3.1-flash-image` → `openai/gpt-5.4-image-2`
- Spec called this `openai/gpt-image-2` but that name doesn't exist on OpenRouter — correct name verified via `/api/v1/models`
- OpenRouter's live catalog does not expose the legacy slugs `openai/gpt-image-1` or `google/gemini-flash-image`; use the supported equivalents above.
- Each model attempt has a 180-second timeout. Only return an error after all supported models fail.

**Why:** Cost efficiency is the priority: use the lower-cost GPT image model first, Gemini second, and reserve the higher-cost GPT-5.4 Image 2 model for last-resort generation.

**How to apply:** Keep fallback slugs verified against OpenRouter's live model catalog. Log full provider failures server-side and return a retryable error after the complete chain fails.

## Long-running request boundary

Browser-facing artifact proxy requests are terminated at about 120 seconds even when the Express process remains healthy. Image generation must run as a background job with short start/status requests.

**Why:** A live request was aborted by the proxy at 119,998 ms while OpenRouter was still generating; the API server never crashed.

**How to apply:** Never hold the browser POST open for image generation. Return a job ID immediately and poll a status endpoint until the internal generation request completes.

**API endpoints used**:
- Logo present → try `POST https://openrouter.ai/api/v1/images/edits` (multipart, logo as `image[]`)
- No logo or edits fails → `POST https://openrouter.ai/api/v1/images/generations` (JSON)
- Auth: `OPENROUTER_API_KEY` secret
- Response format: `b64_json` requested; also handles `url` fallback

## General post detection

`isGeneralPost(prompt, flyerData)` → true when:
- `flyerData.thcPercent` is empty AND
- `flyerData.strainType` is empty AND
- prompt contains no product keywords (THC, indica/sativa/hybrid, flower, vape, edible, concentrate, gram, oz, %, mg, etc.)

General posts get a clean brand lifestyle image: no Health Canada warning, no THC%, no regulatory symbol.

## Brand-kit and format architecture

Every image prompt has three layers: persisted brand identity/fingerprint, one of five content formats, and a strain theme only for strain spotlights. Product formats alone receive product warnings.

**Why:** The same subject must remain visually distinct across client brands, while announcements, educational posts, and brand awareness must never inherit product compliance elements.

**How to apply:** Preserve the five-format classifier and make explicit product/known-strain signals win over educational keywords. Derive and persist fingerprints from the full brand kit.

## Product post prompt structure

Built by `buildProductPrompt(data, theme)`. Sections (top to bottom in prompt):
1. Background/atmosphere (from `buildStrainTheme.bgArtDesc`)
2. Store name bar at top with thin accent rule
3. Canadian cannabis regulatory symbol (top-right, red octagon)
4. Category label (SATIVA/INDICA/HYBRID/VAPE/EDIBLE)
5. Hero: strain name in massive 3D extruded typography (gradient described by `theme.typoDesc`)
6. Lower third dark gradient: THC%, sizes, 19+ notice
7. Mandatory Health Canada yellow warning box (verbatim warning text)
8. Logo placement instruction (if logo provided)

## buildStrainTheme

Returns `{ bgArtDesc, accentColor, typoDesc }` — no longer returns SVG-specific fields (typoGradFrom/To/Stroke/Glow were for the old SVG overlay and are removed).

**Why:** The AI model renders text and visual elements natively from the text prompt.

## Failure behavior

Do not silently substitute an SVG placeholder after provider failures. The UI must show a clear error and preserve the prompt for retry.

**How to apply:** Add new named strains before the keyword-based theme fallbacks. Keep `BASE_ART_SUFFIX` appended to every `bgArtDesc` to suppress cannabis imagery in the background art description.
