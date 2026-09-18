/**
 * Image Generation End-to-End Test
 *
 * Confirms that all three post types (product × 2, general awareness × 1)
 * route through the correct prompt builder and reach the OpenRouter
 * configured OpenRouter image endpoint.  The outgoing HTTP call is intercepted so no
 * credits are consumed.  The captured request body is inspected to verify
 * that each post type produced the right prompt structure.
 *
 * Run:  pnpm --filter @workspace/api-server run test:image
 */

// ─── Use safe fetch parameter types from globalThis (avoids DOM lib dep) ──────
type FetchInput = Parameters<typeof globalThis.fetch>[0];
type FetchInit  = Parameters<typeof globalThis.fetch>[1];

// ─── Minimal 1×1 PNG in base64 (valid PNG magic bytes) ────────────────────────
const FAKE_PNG_B64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk" +
  "+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

// ─── Captured call record for per-test assertions ─────────────────────────────
interface CapturedCall {
  url:    string;
  method: string;
  /** Prompt text extracted from the JSON body (or empty for multipart) */
  prompt: string;
  model: string;
}

const capturedCalls: CapturedCall[] = [];
let failImageGeneration = false;

const _realFetch = globalThis.fetch;

function mockFetch(input: FetchInput, init?: FetchInit): Promise<Response> {
  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
      ? input.href
      : (input as Request).url;

  const method = init?.method ?? "GET";

  // Extract prompt text from JSON body for assertion
  let prompt = "";
  let model = "";
  if (typeof init?.body === "string") {
    try {
      const parsed = JSON.parse(init.body) as Record<string, unknown>;
      prompt = typeof parsed.prompt === "string" ? parsed.prompt : "";
      model = typeof parsed.model === "string" ? parsed.model : "";
    } catch {
      prompt = init.body;
    }
  }

  capturedCalls.push({ url, method, prompt, model });

  if (url.includes("openrouter.ai/api/v1/images")) {
    if (failImageGeneration) {
      return Promise.resolve(
        new Response(JSON.stringify({ error: { message: "insufficient credits" } }), {
          status: 402,
          headers: { "Content-Type": "application/json" },
        }),
      );
    }
    const body = JSON.stringify({ data: [{ b64_json: FAKE_PNG_B64 }] });
    return Promise.resolve(
      new Response(body, { status: 200, headers: { "Content-Type": "application/json" } }),
    );
  }

  return _realFetch(input, init);
}

globalThis.fetch = mockFetch as typeof globalThis.fetch;

// ─── Ensure the key guard in callOpenRouterImage does not throw ───────────────
// No real HTTP request is made, so the value is irrelevant.
if (!process.env.OPENROUTER_API_KEY) {
  process.env.OPENROUTER_API_KEY = "test-dummy-key";
}

// Import AFTER mock and env are in place
import {
  generatePromoImage,
  IMAGE_MODEL,
  IMAGE_MODELS,
  detectContentFormat,
  isGeneralPost,
  rewritePromptForCompliance,
  type FlyerData,
} from "./lib/imageGenerator.js";

// ─── ANSI helpers ─────────────────────────────────────────────────────────────
const green  = (s: string) => `\x1b[32m${s}\x1b[0m`;
const red    = (s: string) => `\x1b[31m${s}\x1b[0m`;
const yellow = (s: string) => `\x1b[33m${s}\x1b[0m`;
const bold   = (s: string) => `\x1b[1m${s}\x1b[0m`;
const dim    = (s: string) => `\x1b[2m${s}\x1b[0m`;

// ─── Assertion helpers ────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string): void {
  if (condition) {
    console.log(`  ${green("✓")} ${message}`);
    passed++;
  } else {
    console.log(`  ${red("✗")} ${message}`);
    failed++;
  }
}

function assertContains(haystack: string, needle: string, label: string): void {
  assert(haystack.includes(needle), label);
}

function assertNotContains(haystack: string, needle: string, label: string): void {
  assert(!haystack.includes(needle), label);
}

// ─── Test cases ───────────────────────────────────────────────────────────────

interface TestCase {
  name:      string;
  prompt:    string;
  flyerData?: FlyerData;
  /** Called with the captured fetch call and the result after generation */
  assertRoute: (
    captured: CapturedCall,
    result: { imageBase64: string; source: string; usedRealPhoto: boolean },
  ) => void;
}

const TEST_CASES: TestCase[] = [
  // ── 1. Blue Dream — product post ──────────────────────────────────────────
  {
    name:   "Blue Dream — flower product post (THC 22%, 3.5g)",
    prompt: "Blue Dream flower, THC 22%, 3.5g",
    flyerData: {
      strainName:  "Blue Dream",
      thcPercent:  "22",
      sizes:       "3.5g",
      productType: "Flower",
      strainType:  "Sativa",
      shopName:    "Aura Cannabis Co.",
    },
    assertRoute(captured, result) {
      // ── Return-value contract ─────────────────────────────────────────────
      assert(result.source === "ai",         "source is 'ai'");
      assert(result.usedRealPhoto === false, "usedRealPhoto is false");

      // ── Endpoint ──────────────────────────────────────────────────────────
      assert(
        captured.url.includes("/images/generations"),
        `called /images/generations (got: ${captured.url})`,
      );
      assert(captured.method === "POST", "HTTP method is POST");

      // ── Prompt structure — product-post builder ───────────────────────────
      assertContains(captured.prompt, "PREMIUM CANNABIS BRAND PROMOTIONAL GRAPHIC",
        "prompt header: PREMIUM CANNABIS BRAND PROMOTIONAL GRAPHIC");
      assertContains(captured.prompt, "BLUE DREAM",
        "strain name 'BLUE DREAM' present in prompt");
      assertContains(captured.prompt, "THC PERCENTAGE",
        "THC line present in prompt (product-post builder)");
      assertContains(captured.prompt, "MANDATORY HEALTH CANADA WARNING BOX",
        "Health Canada warning box present (regulatory requirement)");
      assertContains(captured.prompt, "LOCKED BOTTOM INFORMATION STACK",
        "product prompt uses the spaced bottom information stack");
      assertContains(captured.prompt, "exactly 216px",
        "Feed warning banner has a fixed consistent height");
      assertContains(captured.prompt, "never overflow, clip, touch an edge, or be cut off",
        "warning text is required to fit safely inside the banner");
      assertContains(captured.prompt, "REGULATORY SYMBOL",
        "regulatory symbol instruction present");

      // ── General-post content must NOT be present ──────────────────────────
      assertNotContains(captured.prompt, "WHAT TO EXCLUDE",
        "no 'WHAT TO EXCLUDE' section (that belongs to general posts only)");
      assertNotContains(captured.prompt, "LUXURY CANNABIS LIFESTYLE BRAND IMAGE",
        "not using general-post prompt builder");
    },
  },

  // ── 2. Pink Goo — product post ────────────────────────────────────────────
  {
    name:   "Pink Goo — flower product post (THC 19%, 1g/3.5g)",
    prompt: "Pink Goo flower, THC 19%, available in 1g and 3.5g",
    flyerData: {
      strainName:  "Pink Goo",
      thcPercent:  "19",
      sizes:       "1g / 3.5g",
      productType: "Flower",
      shopName:    "Aura Cannabis Co.",
    },
    assertRoute(captured, result) {
      assert(result.source === "ai",         "source is 'ai'");
      assert(result.usedRealPhoto === false, "usedRealPhoto is false");

      assert(
        captured.url.includes("/images/generations"),
        `called /images/generations (got: ${captured.url})`,
      );
      assert(captured.method === "POST", "HTTP method is POST");

      assertContains(captured.prompt, "PREMIUM CANNABIS BRAND PROMOTIONAL GRAPHIC",
        "prompt header: PREMIUM CANNABIS BRAND PROMOTIONAL GRAPHIC");
      assertContains(captured.prompt, "PINK GOO",
        "strain name 'PINK GOO' present in prompt");
      assertContains(captured.prompt, "THC PERCENTAGE",
        "THC line present in prompt (product-post builder)");
      assertContains(captured.prompt, "MANDATORY HEALTH CANADA WARNING BOX",
        "Health Canada warning box present (regulatory requirement)");
      assertContains(captured.prompt, "REGULATORY SYMBOL",
        "regulatory symbol instruction present");

      assertNotContains(captured.prompt, "WHAT TO EXCLUDE",
        "no 'WHAT TO EXCLUDE' section (that belongs to general posts only)");
      assertNotContains(captured.prompt, "LUXURY CANNABIS LIFESTYLE BRAND IMAGE",
        "not using general-post prompt builder");
    },
  },

  // ── 3. General awareness post ─────────────────────────────────────────────
  {
    name:   "General awareness post — 'Come visit us this weekend'",
    prompt: "Come visit us this weekend",
    flyerData: {
      strainName: "Come visit us this weekend",
      shopName:   "Aura Cannabis Co.",
    },
    assertRoute(captured, result) {
      assert(result.source === "ai",         "source is 'ai'");
      assert(result.usedRealPhoto === false, "usedRealPhoto is false");

      assert(
        captured.url.includes("/images/generations"),
        `called /images/generations (got: ${captured.url})`,
      );
      assert(captured.method === "POST", "HTTP method is POST");

      // ── Prompt structure — general-post builder ───────────────────────────
      assertContains(captured.prompt, "LUXURY CANNABIS LIFESTYLE BRAND IMAGE",
        "prompt header: LUXURY CANNABIS LIFESTYLE BRAND IMAGE (general builder)");
      assertContains(captured.prompt, "WHAT TO EXCLUDE",
        "'WHAT TO EXCLUDE' section present (general-post builder)");
      assertContains(captured.prompt, "No cannabis imagery",
        "'No cannabis imagery' exclusion present");

      // ── Product-post content must NOT be present ──────────────────────────
      assertNotContains(captured.prompt, "MANDATORY HEALTH CANADA WARNING BOX",
        "no Health Canada warning box (excluded from general posts)");
      assertNotContains(captured.prompt, "PREMIUM CANNABIS BRAND PROMOTIONAL GRAPHIC",
        "not using product-post prompt builder");
      assertNotContains(captured.prompt, "THC PERCENTAGE",
        "no THC percentage field (general post has no product data)");
      assertNotContains(captured.prompt, "REGULATORY SYMBOL",
        "no regulatory symbol (excluded from general posts)");
    },
  },
  // ── 4. Pink Gas — product post with industrial chrome styling ─────────────
  {
    name: "Pink Gas — chrome industrial product post",
    prompt: "Pink Gas flower strain post",
    flyerData: {
      strainName: "Pink Gas",
      thcPercent: "20-25",
      sizes: "1g · 3.5g",
      productType: "Flower",
      strainType: "Indica",
      shopName: "Chamba Cannabis",
    },
    assertRoute(captured, result) {
      assert(result.source === "ai", "source is 'ai'");
      assertContains(captured.prompt, "PINK GAS", "Pink Gas name present");
      assertContains(captured.prompt, "chrome industrial letters",
        "Pink Gas uses chrome industrial typography");
      assertContains(captured.prompt, "chrome steel pipes",
        "Pink Gas uses its industrial chrome visual world");
    },
  },
  // ── 5. Grand opening — general business post ──────────────────────────────
  {
    name: "Grand Opening post for Chamba Cannabis",
    prompt: "Grand Opening post for Chamba Cannabis",
    flyerData: {
      strainName: "Grand Opening post",
      shopName: "Chamba Cannabis",
    },
    assertRoute(captured, result) {
      assert(result.source === "ai", "source is 'ai'");
      assertContains(captured.prompt, "LUXURY CANNABIS LIFESTYLE BRAND IMAGE",
        "grand opening uses general business image builder");
      assertContains(captured.prompt, "CHAMBA CANNABIS",
        "store name is prominent");
      assertNotContains(captured.prompt, "MANDATORY HEALTH CANADA WARNING BOX",
        "grand opening has no product warning");
      assertNotContains(captured.prompt, "THC PERCENTAGE",
        "grand opening has no THC");
    },
  },
];

// ─── Runner ───────────────────────────────────────────────────────────────────

async function runTests(): Promise<void> {
  console.log(bold("\n🧪  Image Generation — End-to-End Test\n"));
  console.log(`  Model:  ${dim(IMAGE_MODEL)}`);
  console.log(`  HTTP:   ${dim("mocked — no OpenRouter credits consumed")}`);
  console.log(`  Cases:  ${TEST_CASES.length}\n`);

  assert(isGeneralPost("Grand Opening for Chamba Cannabis"), "grand opening is classified as general");
  assert(isGeneralPost("Come visit us this weekend"), "visit-us announcement is classified as general");
  assert(!isGeneralPost("Pink Goo strain post"), "Pink Goo strain is classified as product");
  assert(!isGeneralPost("Pink Gas flower post"), "Pink Gas flower is classified as product");
  assert(!isGeneralPost("Blue Dream THC 22%"), "Blue Dream with THC is classified as product");
  assert(detectContentFormat("Blue Dream flower", { strainName: "Blue Dream", strainType: "Hybrid" }) === "STRAIN_SPOTLIGHT",
    "specific strain selects STRAIN_SPOTLIGHT");
  assert(detectContentFormat("Blue Dream post") === "STRAIN_SPOTLIGHT",
    "bare known strain selects STRAIN_SPOTLIGHT");
  assert(detectContentFormat("Blue Dream terpene guide") === "STRAIN_SPOTLIGHT",
    "named-strain education retains product compliance");
  assert(detectContentFormat("New vape cartridges in store") === "PRODUCT_CATEGORY_FEATURE",
    "product category selects PRODUCT_CATEGORY_FEATURE");
  assert(detectContentFormat("Grand opening this Friday") === "STORE_ANNOUNCEMENT",
    "event selects STORE_ANNOUNCEMENT");
  assert(detectContentFormat("Terpenes: a short guide") === "EDUCATIONAL_CONTENT",
    "informational topic selects EDUCATIONAL_CONTENT");
  assert(detectContentFormat("Meet our store team") === "BRAND_AWARENESS",
    "general brand topic selects BRAND_AWARENESS");
  const rewrite = rewritePromptForCompliance("Blue Dream helps with sleep — buy one get one free");
  assert(rewrite.wasRewritten && !/helps with|buy one get one/i.test(rewrite.prompt),
    "prohibited medical and inducement language is silently rewritten");
  console.log();

  for (const tc of TEST_CASES) {
    console.log(bold(`▶  ${tc.name}`));
    const start = Date.now();

    // Reset capture buffer for this test
    capturedCalls.length = 0;

    let result: Awaited<ReturnType<typeof generatePromoImage>>;
    try {
      result = await generatePromoImage(tc.prompt, tc.flyerData);
    } catch (err) {
      console.log(`  ${red("✗")} generatePromoImage threw unexpectedly: ${err}`);
      failed++;
      console.log();
      continue;
    }

    const elapsed = ((Date.now() - start) / 1000).toFixed(2);
    console.log(`  ${yellow(`⏱  ${elapsed}s`)}`);

    // ── Common output assertions ──────────────────────────────────────────
    assert(
      typeof result.imageBase64 === "string" && result.imageBase64.length > 100,
      "imageBase64 is a non-empty string",
    );
    assert(
      result.imageBase64.startsWith("data:image/"),
      "imageBase64 starts with 'data:image/'",
    );
    assert(
      !result.imageBase64.startsWith("data:image/svg"),
      "imageBase64 is NOT an SVG (OpenRouter path reached, not fallback)",
    );

    // ── Route-specific assertions (prompt content + endpoint) ─────────────
    const captured = capturedCalls[capturedCalls.length - 1];
    if (!captured) {
      console.log(`  ${red("✗")} No fetch call was captured — mock may not be installed`);
      failed++;
    } else {
      tc.assertRoute(captured, result);
    }

    console.log();
  }

  // ── Brand-kit and story prompt contracts ──────────────────────────────────
  console.log(bold("▶  Story brand-kit prompt contract"));
  capturedCalls.length = 0;
  const storyResult = await generatePromoImage("Blue Dream flower", {
    strainName: "Blue Dream",
    strainType: "Hybrid",
    thcPercent: "20-24",
    productType: "Flower",
    shopName: "Distinct Brand",
    primaryColor: "#112233",
    secondaryColor: "#445566",
    accentColor: "#778899",
    backgroundColor: "#0A0B0C",
    fontStyle: "LUXURY",
    layoutGrid: "EDITORIAL",
    visualMotif: "CHROME",
    toneOfVoice: "PREMIUM",
    visualFingerprint: "distinct-brand-v1",
    layout: "story",
  });
  const storyCall = capturedCalls[capturedCalls.length - 1];
  assert(storyResult.source === "ai", "story uses the image provider");
  assert(storyCall?.model === IMAGE_MODEL, "story starts with primary model");
  assertContains(storyCall?.prompt ?? "", "LAYER 1 — FULL BRAND IDENTITY", "brand identity layer is present");
  assertContains(storyCall?.prompt ?? "", "LAYER 2 — CONTENT FORMAT: STRAIN_SPOTLIGHT", "format layer is present");
  assertContains(storyCall?.prompt ?? "", "LAYER 3 — STRAIN THEME", "strain layer is present");
  assertContains(storyCall?.prompt ?? "", "distinct-brand-v1", "visual fingerprint is included");
  assertContains(storyCall?.prompt ?? "", "STORY LAYOUT: 1080×1920", "story layout is aspect-aware");
  assertContains(storyCall?.prompt ?? "", "minimum 500px", "Story dark information panel has room for separated rows");
  assertContains(storyCall?.prompt ?? "", "exactly 384px", "Story warning banner has a fixed consistent height");
  assertContains(storyCall?.prompt ?? "", "at least 20% of total image area", "product warning reserves 20% area");
  assert((storyCall?.prompt ?? "").includes("#112233") && (storyCall?.prompt ?? "").includes("#445566"),
    "full brand color identity is included");
  console.log();

  // ── Fallback contract ─────────────────────────────────────────────────────
  console.log(bold("▶  OpenRouter failure — model fallback chain"));
  capturedCalls.length = 0;
  failImageGeneration = true;
  let fallbackError: unknown;
  try {
    await generatePromoImage("Blue Dream flower");
  } catch (error) {
    fallbackError = error;
  } finally {
    failImageGeneration = false;
  }
  assert(fallbackError instanceof Error, "all failed model attempts return an error");
  assert(
    capturedCalls.map((call) => call.model).join(" → ") === IMAGE_MODELS.join(" → "),
    "fallback models are attempted in the configured order",
  );
  console.log();

  // ── Summary ───────────────────────────────────────────────────────────────
  const total = passed + failed;
  console.log(bold("─".repeat(54)));
  if (failed === 0) {
    console.log(green(`  ${passed}/${total} assertions passed — all three post types OK ✓`));
  } else {
    console.log(red(`  ${passed}/${total} assertions passed`));
    console.log(red(`  ${failed} assertion(s) FAILED`));
    process.exit(1);
  }
  console.log();
}

runTests().catch((err) => {
  console.error(red("Unhandled error:"), err);
  process.exit(1);
});
