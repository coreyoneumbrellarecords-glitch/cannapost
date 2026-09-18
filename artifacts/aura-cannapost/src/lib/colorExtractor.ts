/**
 * colorExtractor.ts
 * Extract dominant primary + secondary accent colors from any uploaded image.
 * Uses canvas pixel sampling + hue-bucket quantization — no external deps.
 */

export interface ExtractedPalette {
  /** HSL string ready for CSS, e.g. "142 55% 40%" */
  primary: string;
  /** HSL string for a secondary accent, e.g. "85 50% 45%" */
  secondary: string;
  /** Hex strings for display / input, e.g. "#3a7d44" */
  primaryHex: string;
  secondaryHex: string;
}

interface HSL { h: number; s: number; l: number }
interface RGB { r: number; g: number; b: number }

// ── Converters ──────────────────────────────────────────────────────────────

function rgbToHsl({ r, g, b }: RGB): HSL {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function hslToHex({ h, s, l }: HSL): string {
  s /= 100; l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  const toHex = (x: number) => Math.round(x * 255).toString(16).padStart(2, "0");
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

function hslToCss({ h, s, l }: HSL): string {
  return `${h} ${s}% ${l}%`;
}

// ── Sampling ─────────────────────────────────────────────────────────────────

const SAMPLE_SIZE = 2500; // pixels to sample
const HUE_BUCKETS = 36;   // 10° each
const MIN_SATURATION = 12; // ignore near-grey pixels
const MIN_LIGHTNESS = 10;
const MAX_LIGHTNESS = 90;

/** Sample SAMPLE_SIZE evenly-spaced pixels from the image data */
function samplePixels(data: Uint8ClampedArray, count: number): RGB[] {
  const total = data.length / 4;
  const step = Math.max(1, Math.floor(total / count));
  const pixels: RGB[] = [];
  for (let i = 0; i < total; i += step) {
    const idx = i * 4;
    const r = data[idx], g = data[idx + 1], b = data[idx + 2], a = data[idx + 3];
    if (a < 128) continue; // skip transparent
    pixels.push({ r, g, b });
  }
  return pixels;
}

/** Cluster pixels by hue bucket, return buckets sorted by weight */
function hueBuckets(pixels: RGB[]): Array<{ hue: number; pixels: HSL[]; weight: number }> {
  const buckets = Array.from({ length: HUE_BUCKETS }, (_, i) => ({
    hue: i * (360 / HUE_BUCKETS),
    pixels: [] as HSL[],
    weight: 0,
  }));

  for (const px of pixels) {
    const hsl = rgbToHsl(px);
    if (hsl.s < MIN_SATURATION) continue;
    if (hsl.l < MIN_LIGHTNESS || hsl.l > MAX_LIGHTNESS) continue;
    const bucketIdx = Math.floor(hsl.h / (360 / HUE_BUCKETS)) % HUE_BUCKETS;
    buckets[bucketIdx].pixels.push(hsl);
    // Weight by saturation — vivid colors outrank dull ones
    buckets[bucketIdx].weight += hsl.s;
  }

  return buckets.filter((b) => b.pixels.length > 0).sort((a, b) => b.weight - a.weight);
}

/** Pick the "representative" HSL from a bucket — median L, max S */
function bucketRepresentative(pixels: HSL[]): HSL {
  const sorted = [...pixels].sort((a, b) => a.l - b.l);
  const mid = sorted[Math.floor(sorted.length / 2)];
  const maxS = Math.max(...pixels.map((p) => p.s));
  return { h: mid.h, s: Math.min(maxS, 70), l: Math.min(Math.max(mid.l, 30), 55) };
}

/** Pick a secondary color that is visually distinct from primary (≥30° hue offset) */
function pickSecondary(buckets: ReturnType<typeof hueBuckets>, primary: HSL): HSL {
  for (const bucket of buckets.slice(1)) {
    if (bucket.pixels.length === 0) continue;
    const candidate = bucketRepresentative(bucket.pixels);
    const hueDiff = Math.min(
      Math.abs(candidate.h - primary.h),
      360 - Math.abs(candidate.h - primary.h),
    );
    if (hueDiff >= 30) return candidate;
  }
  // Fall back: complementary hue
  return { h: (primary.h + 150) % 360, s: primary.s, l: primary.l };
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Extract primary + secondary palette from a data URL (PNG/JPG/WebP/SVG).
 * Returns null if extraction fails or the image is entirely achromatic.
 */
export async function extractPaletteFromDataUrl(dataUrl: string): Promise<ExtractedPalette | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        // Downsample for speed
        const scale = Math.min(1, 200 / Math.max(img.naturalWidth, img.naturalHeight, 1));
        canvas.width = Math.round(img.naturalWidth * scale) || 100;
        canvas.height = Math.round(img.naturalHeight * scale) || 100;
        const ctx = canvas.getContext("2d");
        if (!ctx) { resolve(null); return; }

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);

        const pixels = samplePixels(data, SAMPLE_SIZE);
        const buckets = hueBuckets(pixels);

        if (buckets.length === 0) { resolve(null); return; }

        const primaryHsl = bucketRepresentative(buckets[0].pixels);
        const secondaryHsl = pickSecondary(buckets, primaryHsl);

        resolve({
          primary: hslToCss(primaryHsl),
          secondary: hslToCss(secondaryHsl),
          primaryHex: hslToHex(primaryHsl),
          secondaryHex: hslToHex(secondaryHsl),
        });
      } catch {
        resolve(null);
      }
    };

    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

/**
 * Apply an extracted palette to the document's :root CSS variables.
 * Passes through the green base theme untouched for neutral elements;
 * only primary + accent hues are overridden.
 */
export function applyPaletteToRoot(palette: ExtractedPalette) {
  const root = document.documentElement;
  root.style.setProperty("--primary", palette.primary);
  root.style.setProperty("--ring", palette.primary);
  root.style.setProperty("--sidebar-primary", palette.primary);
  root.style.setProperty("--sidebar-ring", palette.primary);
  // Slightly darker version for card accent line
  root.style.setProperty("--chart-1", palette.primary);
  root.style.setProperty("--chart-2", palette.secondary);
  // Accent surface tint — use primary at very low lightness
  const [h] = palette.primary.split(" ");
  root.style.setProperty("--accent", `${h} 26% 14%`);
  root.style.setProperty("--border", `${h} 22% 13%`);
  root.style.setProperty("--input", `${h} 22% 13%`);
  root.style.setProperty("--sidebar-accent", `${h} 26% 12%`);
  root.style.setProperty("--sidebar-border", `${h} 22% 11%`);
  root.style.setProperty("--card-border", `${h} 22% 13%`);
}

/** Reset palette overrides back to the CSS-defined defaults */
export function resetPaletteOnRoot() {
  const props = [
    "--primary", "--ring", "--sidebar-primary", "--sidebar-ring",
    "--chart-1", "--chart-2", "--accent", "--border", "--input",
    "--sidebar-accent", "--sidebar-border", "--card-border",
  ];
  const root = document.documentElement;
  props.forEach((p) => root.style.removeProperty(p));
}
