import { Router, type RequestHandler } from "express";
import { randomUUID } from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "@workspace/db";
import { postsTable, brandProfilesTable, imageGenerationJobsTable } from "@workspace/db";
import { eq, and, desc, count, inArray, lt } from "drizzle-orm";
import { requireAuth, getUserId } from "../lib/auth";
import {
  generatePromoImage,
  IMAGE_GENERATION_FALLBACK_MESSAGE,
  isGeneralPost,
  rewritePromptForCompliance,
  type FlyerData,
} from "../lib/imageGenerator";
import { applyWatermark } from "../lib/watermark";
import {
  GeneratePostBody,
  GeneratePostResponse,
  GetPostResponse,
  ListPostsResponse,
  PublishPostResponse,
  SchedulePostBody,
  SchedulePostResponse,
} from "@workspace/api-zod";
import { normalizeApiIds } from "../lib/apiResponse";

const router = Router();

const generationWorkerId = randomUUID();
const internalGenerationToken = randomUUID();
const GENERATION_JOB_RETENTION_MS = 24 * 60 * 60 * 1_000;
const GENERATION_JOB_HEARTBEAT_MS = 10_000;
const GENERATION_JOB_STALE_MS = 30_000;
const GENERATION_JOB_CLEANUP_MS = 60 * 60 * 1_000;

async function cleanupExpiredGenerationJobs() {
  await db
    .delete(imageGenerationJobsTable)
    .where(and(
      inArray(imageGenerationJobsTable.status, ["complete", "failed"]),
      lt(imageGenerationJobsTable.updatedAt, new Date(Date.now() - GENERATION_JOB_RETENTION_MS)),
    ));
}

const generationJobCleanupTimer = setInterval(() => {
  void cleanupExpiredGenerationJobs().catch((error) => {
    console.error("[ImageGenJob] Could not clean up expired jobs", error);
  });
}, GENERATION_JOB_CLEANUP_MS);
generationJobCleanupTimer.unref();

const requireInternalGeneration: RequestHandler = (req, res, next) => {
  if (req.headers["x-internal-generation-token"] !== internalGenerationToken) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const userId = req.headers["x-generation-user-id"];
  const jobId = req.headers["x-generation-job-id"];
  if (typeof userId !== "string" || typeof jobId !== "string") {
    res.status(400).json({ error: "Missing generation job context." });
    return;
  }

  (req as any).userId = userId;
  (req as any).generationJobId = jobId;
  next();
};

async function runGenerationJob(job: typeof imageGenerationJobsTable.$inferSelect) {
  const heartbeat = setInterval(() => {
    void db
      .update(imageGenerationJobsTable)
      .set({ updatedAt: new Date() })
      .where(and(
        eq(imageGenerationJobsTable.id, job.id),
        eq(imageGenerationJobsTable.workerId, generationWorkerId),
        eq(imageGenerationJobsTable.status, "pending"),
      ))
      .catch((error) => {
        console.error("[ImageGenJob] Could not persist job heartbeat", error);
      });
  }, GENERATION_JOB_HEARTBEAT_MS);
  heartbeat.unref();

  try {
    const response = await fetch(`http://127.0.0.1:${process.env.PORT}/api/posts/internal-generation`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-internal-generation-token": internalGenerationToken,
        "x-generation-user-id": job.userId,
        "x-generation-job-id": job.id,
      },
      body: JSON.stringify(job.payload),
    });
    const isJson = (response.headers.get("content-type") ?? "").includes("application/json");
    const responseBody: unknown = isJson ? await response.json() : await response.text();
    const payload: Record<string, unknown> =
      typeof responseBody === "object" && responseBody !== null
        ? responseBody as Record<string, unknown>
        : { error: String(responseBody) };

    await db
      .update(imageGenerationJobsTable)
      .set(response.ok
        ? { status: "complete", result: payload, error: null, updatedAt: new Date() }
        : {
            status: "failed",
            error: typeof payload.error === "string"
              ? payload.error
              : `Generation failed with HTTP ${response.status}`,
            updatedAt: new Date(),
          })
      .where(and(
        eq(imageGenerationJobsTable.id, job.id),
        eq(imageGenerationJobsTable.workerId, generationWorkerId),
        eq(imageGenerationJobsTable.status, "pending"),
      ));
  } catch (error) {
    console.error("[ImageGenJob] Background generation failed", error);
    await db
      .update(imageGenerationJobsTable)
      .set({
        status: "failed",
        error: error instanceof Error ? error.message : String(error),
        updatedAt: new Date(),
      })
      .where(and(
        eq(imageGenerationJobsTable.id, job.id),
        eq(imageGenerationJobsTable.workerId, generationWorkerId),
        eq(imageGenerationJobsTable.status, "pending"),
      ));
  } finally {
    clearInterval(heartbeat);
  }
}

async function recoverStaleGenerationJobs() {
  const staleBefore = new Date(Date.now() - GENERATION_JOB_STALE_MS);
  const staleJobs = await db
    .select()
    .from(imageGenerationJobsTable)
    .where(and(
      eq(imageGenerationJobsTable.status, "pending"),
      lt(imageGenerationJobsTable.updatedAt, staleBefore),
    ))
    .limit(5);

  for (const staleJob of staleJobs) {
    const [claimedJob] = await db
      .update(imageGenerationJobsTable)
      .set({ workerId: generationWorkerId, updatedAt: new Date() })
      .where(and(
        eq(imageGenerationJobsTable.id, staleJob.id),
        eq(imageGenerationJobsTable.status, "pending"),
        lt(imageGenerationJobsTable.updatedAt, staleBefore),
      ))
      .returning();
    if (claimedJob) void runGenerationJob(claimedJob);
  }
}

const generationJobRecoveryTimer = setInterval(() => {
  void recoverStaleGenerationJobs().catch((error) => {
    console.error("[ImageGenJob] Could not recover stale jobs", error);
  });
}, GENERATION_JOB_HEARTBEAT_MS);
generationJobRecoveryTimer.unref();

router.post("/posts/generation-jobs", requireAuth, async (req, res) => {
  const userId = getUserId(req);
  if (!process.env.OPENROUTER_API_KEY) {
    res.status(503).json({
      error: "Image generation is unavailable because the OpenRouter API key is not configured.",
      retryable: false,
    });
    return;
  }

  const parsed = GeneratePostBody.safeParse(req.body);
  if (!parsed.success || !["post", "story"].includes(parsed.data.postType ?? "post")) {
    res.status(400).json({ error: parsed.success ? "Unsupported background post type." : parsed.error.message });
    return;
  }

  const jobId = randomUUID();
  await cleanupExpiredGenerationJobs();
  const [job] = await db.insert(imageGenerationJobsTable).values({
    id: jobId,
    userId,
    workerId: generationWorkerId,
    status: "pending",
    payload: parsed.data,
  }).returning();

  res.status(202).json({ jobId, status: "pending" });
  void runGenerationJob(job);
});

router.get("/posts/generation-jobs/:jobId", requireAuth, async (req, res) => {
  const userId = getUserId(req);
  const jobId = String(req.params.jobId);
  const [job] = await db
    .select()
    .from(imageGenerationJobsTable)
    .where(and(
      eq(imageGenerationJobsTable.id, jobId),
      eq(imageGenerationJobsTable.userId, userId),
    ))
    .limit(1);

  if (!job) {
    res.status(404).json({ error: "Generation job not found." });
    return;
  }

  res.json({ status: job.status, result: job.result, error: job.error });
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ─── Regulatory Guardrail Pre-screen (Health Canada s.17 / AGCO / Cannabis Act) ─

const GUARDRAIL_SYSTEM_PROMPT = `You are a Health Canada and AGCO cannabis advertising compliance officer.
Evaluate the dispensary marketing request against these 5 regulatory rules.
Return ONLY valid JSON — no preamble, no explanation, no markdown fences.

RULE 1 — LIFESTYLE PROMOTIONS
Trigger: language that evokes glamour, recreation, excitement, vitality, risk, or daring.
Message: "Compliance Block: Health Canada regulations prohibit cannabis advertising from evoking a specific lifestyle, including glamour, recreation, excitement, vitality, risk, or daring."

RULE 2 — TESTIMONIALS & ENDORSEMENTS
Trigger: customer quotes, reviews, personal endorsements, or "as seen on" claims.
Message: "Compliance Block: The federal Cannabis Act strictly prohibits the use of personal testimonials or endorsements in cannabis marketing."

RULE 3 — INDUCEMENTS & FREEBIES
Trigger: free cannabis, free accessories, or unauthorized giveaways offered as a purchase inducement.
Message: "Compliance Block: AGCO regulations mandate that dispensaries may not provide cannabis, accessories, or other benefits free of charge as an inducement for purchase."

RULE 4 — MEDICAL CLAIMS
Trigger: any association with medicine, health benefits, pharmaceuticals, or therapeutic/medicinal claims.
Message: "Compliance Block: AGCO and Health Canada regulations strictly prohibit advertising that is associated with medicine, health, pharmaceuticals, or therapeutic benefits."

RULE 5 — YOUTH APPEAL
Trigger: cartoons, mascots, fictional characters, or animals used in marketing.
Message: "Compliance Block: To prevent youth appeal, Health Canada prohibits the use of cartoons, mascots, fictional characters, or animals in cannabis promotions."

If ANY rule is triggered: { "blocked": true, "message": "<exact message from the matching rule above>" }
If all rules pass: { "blocked": false }`;

type GuardrailCheck =
  | { blocked: false }
  | { blocked: true; message: string };

async function screenPromptForCompliance(prompt: string): Promise<GuardrailCheck> {
  try {
    const response = await anthropic.messages.create({
      model:      "claude-haiku-4-5",
      max_tokens: 128,
      system:     GUARDRAIL_SYSTEM_PROMPT,
      messages:   [{ role: "user", content: `Evaluate this marketing request: "${prompt}"` }],
    });
    const content = response.content[0];
    if (content.type !== "text") return { blocked: false };
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { blocked: false };
    const parsed = JSON.parse(jsonMatch[0]);
    if (parsed.blocked === true && typeof parsed.message === "string") {
      return { blocked: true, message: parsed.message as string };
    }
  } catch (err) {
    // Guardrail failure is non-blocking — log and allow generation to continue
    console.error("[guardrail] pre-screen error (non-blocking):", err);
  }
  return { blocked: false };
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface CaptionResult {
  caption:      string;
  hashtags:     string;
  strainName:   string;
  strainType:   string;
  thcPercent:   string;
  sizes:        string;
  productType:  string;
  price:        string;
  wasRewritten: boolean;
}

type ClaudeMediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

// ─── Cannabis Caption Generation (AGCO Compliant) ─────────────────────────────

async function generateCannabisCaption(
  prompt: string,
  shopName?: string,
  referenceImageBase64?: string,
  referenceImageMediaType?: string,
): Promise<CaptionResult> {
  const shopContext = shopName ? ` for ${shopName}` : "";

  const systemPrompt = `You are a professional cannabis dispensary marketing copywriter${shopContext} operating in Ontario, Canada. All content you generate must comply with AGCO regulations and the federal Cannabis Act.

CAPTION REQUIREMENTS:
- Write 3 to 5 sentences per caption
- Open with a strong, attention-grabbing hook as the first sentence
- Clearly highlight the specific product, strain, or promotion being featured
- Keep the tone engaging, professional, and on-brand for a premium dispensary
- Always end with exactly: "Must be 19+ to purchase. Ontario residents only."

HASHTAG REQUIREMENTS:
- Include EXACTLY 5 hashtags — no more, no fewer
- Choose only the 5 most relevant and highest-performing tags for the specific product, strain, or promotion being featured
- Prioritise specificity over volume: a precise strain name tag outperforms a generic broad tag
- Always include at least 1 Ontario-specific tag (e.g. #ontariocannabis #legalcannabis #canadacannabis)
- Never pad with filler or generic tags — every hashtag must earn its place

COMPLIANCE RULES — NEVER include in any generated content:
- Health or medical claims of any kind
- Suggestions that cannabis improves mood, solves problems, or provides any benefit
- Content that could appeal to anyone under 19
- Free product giveaways or contests
- "Buy more save more" or bulk discount deals
- Loyalty point offers or reward program promotions
- Testimonials or endorsements from any person
- Depictions of cannabis consumption
- References to driving or operating vehicles
- Sponsorship branding
- Language evoking glamour, recreation, excitement, vitality, risk, or daring (lifestyle advertising — prohibited by Health Canada)
- Customer quotes, reviews, or personal endorsements of any kind (prohibited by the federal Cannabis Act)
- Offers of free cannabis products, accessories, or giveaways as purchase inducements (prohibited by AGCO)
- Any association with medicine, pharmaceuticals, therapeutics, or health benefits (prohibited by AGCO and Health Canada)
- Cartoons, mascots, fictional characters, or animals (youth-appeal prohibition — Health Canada)

IMPORTANT: If a request contains minor AGCO compliance issues, silently rewrite it into a compliant version. Set "wasRewritten" to true. Set "wasRewritten" to false when the original was already fully compliant.`;

  const textContent = `${referenceImageBase64 ? "A reference product photo has been attached above. Use it to inform your understanding of the product's appearance and presentation.\n\n" : ""}Create an Instagram caption and hashtags based on this request: "${prompt}"

Extract or infer the following product details. ALL FIELDS ARE MANDATORY — never leave any empty:

- strainName: the strain or product name (e.g. "Blue Dream", "Wedding Cake", "Sour Diesel")
- strainType: classify as exactly "Sativa", "Indica", or "Hybrid". Use your knowledge of the strain if not stated.
  Examples: Blue Dream → "Hybrid", OG Kush → "Indica", Sour Diesel → "Sativa", Gelato → "Hybrid",
  Granddaddy Purple → "Indica", Jack Herer → "Sativa", Wedding Cake → "Hybrid", Pink Kush → "Indica",
  Gorilla Glue → "Hybrid", White Widow → "Hybrid", GSC → "Hybrid", Trainwreck → "Hybrid".
  For unknown strains default to "Hybrid". NEVER return an empty string for this field.
- thcPercent: THC percentage or range WITHOUT the % sign (e.g. "24" or "20-26").
  If not stated in the request, use your knowledge of this strain's typical THC range from Leafly/Weedmaps data.
  Examples: Blue Dream → "17-24", OG Kush → "19-26", Granddaddy Purple → "17-23", Sour Diesel → "20-25",
  Wedding Cake → "22-28", Pink Kush → "20-25", Gelato → "20-25", GSC/Girl Scout Cookies → "19-28",
  White Widow → "18-25", Gorilla Glue → "25-30", Jack Herer → "18-24", Trainwreck → "18-25".
  For unknown strains use "20-25". NEVER return an empty string for this field.
- sizes: available product sizes using · as separator (e.g. "1g · 3.5g · 7g · 14g").
  If not stated in the request, use the standard default "1g · 3.5g · 7g · 14g". NEVER return an empty string.
- productType: one of "Flower", "Pre-roll", "Extract", "Edible", "Vape", or "Other"
- price: if the request mentions a price or price range for the product, extract it as a display string (e.g. "$45" or "$30–$60"). Leave as empty string "" if no price is mentioned.

Return your response in this exact JSON format:
{
  "caption": "the full Instagram caption here",
  "hashtags": "#hashtag1 #hashtag2 #hashtag3 #hashtag4 #hashtag5",
  "strainName": "extracted strain or product name",
  "strainType": "Sativa | Indica | Hybrid",
  "thcPercent": "numeric percentage or range without % sign — always filled",
  "sizes": "available sizes as display string — always filled",
  "productType": "Flower | Pre-roll | Extract | Edible | Vape | Other",
  "price": "",
  "wasRewritten": false
}`;

  const userContent: Anthropic.MessageParam["content"] = referenceImageBase64
    ? [
        {
          type: "image",
          source: {
            type:       "base64",
            media_type: (referenceImageMediaType ?? "image/jpeg") as ClaudeMediaType,
            data:       referenceImageBase64,
          },
        },
        { type: "text", text: textContent },
      ]
    : textContent;

  const message = await anthropic.messages.create({
    model:      "claude-opus-4-5",
    max_tokens: 1024,
    system:     systemPrompt,
    messages:   [{ role: "user", content: userContent }],
  });

  const content = message.content[0];
  if (content.type !== "text") throw new Error("Unexpected response type from Claude");

  const jsonMatch = content.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Could not parse JSON from Claude response");

  const parsed       = JSON.parse(jsonMatch[0]);
  const wasRewritten = parsed.wasRewritten === true;
  const baseCaption  = parsed.caption ?? "";
  const caption      = wasRewritten
    ? `${baseCaption}\n\n*Content optimized for AGCO compliance.*`
    : baseCaption;

  return {
    caption,
    hashtags:    parsed.hashtags    ?? "",
    strainName:  parsed.strainName  ?? "",
    strainType:  parsed.strainType  ?? "",
    thcPercent:  parsed.thcPercent  ?? "",
    sizes:       parsed.sizes       ?? "",
    productType: parsed.productType ?? "Flower",
    price:       parsed.price       ?? "",
    wasRewritten,
  };
}

async function generateGeneralBusinessCaption(
  prompt: string,
  shopName?: string,
): Promise<CaptionResult> {
  const businessName = shopName?.trim() || "our store";
  const message = await anthropic.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 512,
    system: `You write concise Instagram captions for an Ontario cannabis retail business.
This is a GENERAL BUSINESS AWARENESS post, not a cannabis product post.

Requirements:
- Write 2 to 4 professional sentences about the announcement, store, team, hours, event, or visit.
- Mention the business name when provided.
- Include exactly 5 relevant local business or retail hashtags.
- Do not mention THC, CBD, strains, product categories, product sizes, dosage, Health Canada warnings, cannabis warnings, or "Must be 19+".
- Do not invent products, promotions, discounts, medical claims, or consumption language.
- Return only JSON: {"caption":"...","hashtags":"#tag1 #tag2 #tag3 #tag4 #tag5"}`,
    messages: [{
      role: "user",
      content: `Business name: "${businessName}"\nAnnouncement request: "${prompt}"`,
    }],
  });

  const content = message.content[0];
  if (content.type !== "text") throw new Error("Unexpected response type from Claude");
  const jsonMatch = content.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Could not parse JSON from Claude response");
  const parsed = JSON.parse(jsonMatch[0]);

  return {
    caption: parsed.caption ?? `${businessName} invites you to stop by and see what is new.`,
    hashtags: parsed.hashtags ?? "#shoplocal #ontariobusiness #localretail #community #visitustoday",
    strainName: "",
    strainType: "",
    thcPercent: "",
    sizes: "",
    productType: "",
    price: "",
    wasRewritten: false,
  };
}

// ─── SMS Promo Generation (AGCO Compliant, ≤160 chars) ───────────────────────

async function generateSMSCaption(prompt: string, shopName?: string): Promise<string> {
  const shopContext = shopName ? ` for ${shopName}` : "";
  const message = await anthropic.messages.create({
    model:      "claude-opus-4-5",
    max_tokens: 256,
    system: `You are an AGCO-compliant cannabis dispensary SMS copywriter${shopContext} in Ontario, Canada.
Write punchy, compelling SMS promotional text for dispensary loyalty lists.

RULES:
- Maximum 160 characters total (including spaces and punctuation)
- No medical, health, pharmaceutical, or therapeutic claims
- No youth-appealing language or content
- No lifestyle language (glamour, excitement, vitality, risk, daring)
- No testimonials or personal endorsements
- No free product offers or giveaways as purchase inducements
- No cartoons, mascots, fictional characters, or animals
- No contests, giveaways, bulk discounts, or loyalty point offers
- Always end with "19+ ON only" to save space
- Return ONLY the SMS text — no JSON, no explanation, no quotes`,
    messages: [{ role: "user", content: `Write an SMS promo for: "${prompt}"` }],
  });
  const content = message.content[0];
  if (content.type !== "text") throw new Error("Unexpected response from Claude");
  return content.text.trim().slice(0, 160);
}

// ─── Email Blast Generation (AGCO Compliant) ──────────────────────────────────

interface EmailResult {
  subjectLine:     string;
  previewSnippet:  string;
  bodyText:        string;
}

async function generateEmailCaption(prompt: string, shopName?: string): Promise<EmailResult> {
  const shopContext = shopName ? ` for ${shopName}` : "";
  const message = await anthropic.messages.create({
    model:      "claude-opus-4-5",
    max_tokens: 1024,
    system: `You are an AGCO-compliant cannabis dispensary email copywriter${shopContext} in Ontario, Canada.
Generate professional, compliant email marketing copy for licensed dispensaries.

RULES:
- No medical, health, pharmaceutical, or therapeutic claims
- No youth-appealing language, imagery, cartoons, mascots, fictional characters, or animals
- No lifestyle language evoking glamour, recreation, excitement, vitality, risk, or daring
- No testimonials, customer quotes, or personal endorsements
- No free product offers, giveaways, or freebies used as purchase inducements
- No contests, giveaways, or loyalty promotions
- Body copy must end with: "Must be 19+ to purchase. Ontario residents only."
- Return JSON in this exact format:
{
  "subjectLine": "compelling email subject (50 chars max)",
  "previewSnippet": "one sentence preview text (90 chars max)",
  "bodyText": "2-4 sentence promotional body including the mandatory compliance line at the end"
}`,
    messages: [{ role: "user", content: `Write promotional email copy for: "${prompt}"` }],
  });
  const content = message.content[0];
  if (content.type !== "text") throw new Error("Unexpected response from Claude");
  const jsonMatch = content.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Could not parse email JSON from Claude");
  const parsed = JSON.parse(jsonMatch[0]);
  return {
    subjectLine:    parsed.subjectLine    ?? "New Arrivals at the Store",
    previewSnippet: parsed.previewSnippet ?? "",
    bodyText:       parsed.bodyText       ?? "",
  };
}

// ─── Location-based hashtag mapping ──────────────────────────────────────────

function getLocationHashtags(location: string): string[] {
  const loc = location.toLowerCase();
  // City-level tags
  if (loc.includes("toronto"))      return ["#torontocannabis", "#the6ix"];
  if (loc.includes("ottawa"))       return ["#ottawacannabis", "#ottawadispensary"];
  if (loc.includes("mississauga"))  return ["#mississaugacannabis", "#mississaugadispensary"];
  if (loc.includes("brampton"))     return ["#bramptoncannabis"];
  if (loc.includes("hamilton"))     return ["#hamiltoncannabis", "#hamiltondispensary"];
  if (loc.includes("london"))       return ["#londoncannabis", "#londondispensaryontario"];
  if (loc.includes("kitchener") || loc.includes("waterloo")) return ["#kwcannabis"];
  if (loc.includes("windsor"))      return ["#windsorcannabis"];
  if (loc.includes("barrie"))       return ["#barriecannabis"];
  if (loc.includes("kingston"))     return ["#kingstoncannabis"];
  if (loc.includes("guelph"))       return ["#guelphcannabis"];
  if (loc.includes("sudbury"))      return ["#sudburycannabis"];
  // Province-level fallback
  if (loc.includes("ontario") || loc.includes("canada")) return ["#ontariodispensary"];
  return [];
}

// ─── Cannabis-specific suggested prompts ──────────────────────────────────────

const CANNABIS_PROMPTS = [
  "New strain drop — Blue Dream just landed",
  "Weekend pre-roll special — 2-pack deal",
  "Edibles restocked — gummies, chocolates, beverages",
  "Premium concentrates — live resin and diamonds",
  "Flower feature — top-shelf Indica for tonight",
  "Vape drop — new cartridges in stock",
  "Sativa spotlight — energizing strains for the day",
  "Hybrid pick of the week",
];

// ─── Routes ───────────────────────────────────────────────────────────────────

// GET /posts — list posts
router.get("/posts", requireAuth, async (req, res) => {
  const userId = getUserId(req);
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Number(req.query.limit) || 20);
  const offset = (page - 1) * limit;
  const postType = req.query.post_type as string | undefined;

  const conditions = [eq(postsTable.userId, userId)];
  if (postType) conditions.push(eq(postsTable.postType, postType));

  const [posts, totalResult] = await Promise.all([
    db
      .select()
      .from(postsTable)
      .where(and(...conditions))
      .orderBy(desc(postsTable.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ count: count() }).from(postsTable).where(and(...conditions)),
  ]);

  res.json(
    ListPostsResponse.parse(normalizeApiIds({
      posts,
      total: totalResult[0]?.count ?? 0,
      page,
      limit,
    })),
  );
});

// POST /posts — generate cannabis post (caption + image)
const generatePostHandler: RequestHandler = async (req, res) => {
  const userId = getUserId(req);
  const generationJobId = (req as any).generationJobId as string | undefined;
  const parsed = GeneratePostBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  if (generationJobId) {
    const [existingPost] = await db
      .select()
      .from(postsTable)
      .where(and(
        eq(postsTable.generationJobId, generationJobId),
        eq(postsTable.userId, userId),
      ))
      .limit(1);
    if (existingPost) {
      res.status(200).json(
        GeneratePostResponse.parse(normalizeApiIds({
          ...existingPost,
          imageGenerationWarning: false,
        })),
      );
      return;
    }
  }

  let brand = await db
    .select()
    .from(brandProfilesTable)
    .where(eq(brandProfilesTable.userId, userId))
    .limit(1);

  // Dev bypass: auto-seed a default brand profile so generation works out of the box
  if (!brand.length && userId === "dev-bypass-user") {
    const [seeded] = await db
      .insert(brandProfilesTable)
      .values({
        userId,
        businessName: "Aura Cannabis Co.",
        industry: "cannabis_dispensary",
        brandVoice: "premium and approachable",
        targetAudience: "Ontario adults 19+",
        instagramHandle: "auracannabis",
        location: "Ontario, Canada",
        timezone: "America/Toronto",
        brandColors: "#7C3AED",
        fontStyle: "modern",
      })
      .returning();
    brand = [seeded];
  }

  if (!brand.length) {
    res.status(400).json({ error: "Please set up your brand profile before generating posts." });
    return;
  }

  const b = brand[0];
  // These fields are deployed with the brand-kit migration. Keep this route
  // compatible while older database clients are still being rolled out.
  const brandKit = b as typeof b & Record<string, string | null | undefined>;
  const postType = (parsed.data.postType ?? "post") as string;
  const complianceRewrite = rewritePromptForCompliance(parsed.data.prompt);
  const generationPrompt = complianceRewrite.prompt;
  const generalBusinessPost = isGeneralPost(generationPrompt);

  // ── SMS Promo ────────────────────────────────────────────────────────────────
  if (postType === "sms") {
    let smsText = await generateSMSCaption(generationPrompt, b.businessName ?? undefined).catch((err) => {
      console.error("SMS generation failed:", err);
      return `New arrivals in store! Visit us today. 19+ ON only.`;
    });
    if (complianceRewrite.wasRewritten) {
      smsText = `${smsText}\n\n*Content optimized for AGCO compliance.*`;
    }

    const [post] = await db
      .insert(postsTable)
      .values({
        userId,
        caption:       smsText,
        hashtags:      null,
        imageUrl:      null,
        prompt:        parsed.data.prompt,
        platform:      "sms",
        postType:      "sms",
        status:        "draft",
        strainName:    null,
        productType:   null,
        thcPercentage: null,
        agcoCompliant: true,
      })
      .returning();

    res
      .status(201)
      .json(GeneratePostResponse.parse(normalizeApiIds(post)));
    return;
  }

  // ── Email Blast ───────────────────────────────────────────────────────────────
  if (postType === "email") {
    const emailResult = await generateEmailCaption(generationPrompt, b.businessName ?? undefined).catch((err) => {
      console.error("Email generation failed:", err);
      return {
        subjectLine:    "New Arrivals at the Store",
        previewSnippet: "Fresh products just landed.",
        bodyText:       `New products are now available in store. Must be 19+ to purchase. Ontario residents only.`,
      };
    });

    // Compose the full email preview as a single readable caption field
    let emailCaption = [
      `📧 Subject: ${emailResult.subjectLine}`,
      `👁 Preview: ${emailResult.previewSnippet}`,
      ``,
      emailResult.bodyText,
    ].join("\n");
    if (complianceRewrite.wasRewritten) {
      emailCaption = `${emailCaption}\n\n*Content optimized for AGCO compliance.*`;
    }

    const [post] = await db
      .insert(postsTable)
      .values({
        userId,
        caption:       emailCaption,
        hashtags:      null,
        imageUrl:      null,
        prompt:        parsed.data.prompt,
        platform:      "email",
        postType:      "email",
        status:        "draft",
        strainName:    null,
        productType:   null,
        thcPercentage: null,
        agcoCompliant: true,
      })
      .returning();

    res
      .status(201)
      .json(GeneratePostResponse.parse(normalizeApiIds(post)));
    return;
  }

  // ── Instagram / Story (default) ───────────────────────────────────────────────
  const referenceImageBase64 = parsed.data.referenceImageBase64 as string | undefined;

  // Strip data URL prefix for Claude if needed
  let refImageData: string | undefined;
  let refImageType: string | undefined;
  if (referenceImageBase64) {
    const match = referenceImageBase64.match(/^data:(image\/[^;]+);base64,(.+)$/);
    if (match) {
      refImageType = match[1];
      refImageData = match[2];
    } else {
      refImageData = referenceImageBase64;
    }
  }

  // 1. Generate AGCO-compliant cannabis caption via Claude
  const captionResult = await (
    generalBusinessPost
      ? generateGeneralBusinessCaption(
           generationPrompt,
          b.businessName ?? undefined,
        )
      : generateCannabisCaption(
           generationPrompt,
          b.businessName ?? undefined,
          refImageData,
          refImageType,
        )
  ).catch((err) => {
    console.error("Cannabis caption generation failed:", err);
    return null;
  });

  let caption = captionResult?.caption ?? (
    generalBusinessPost
      ? `${b.businessName} invites you to stop by and see what is new.`
      : `Discover premium cannabis at ${b.businessName}. Must be 19+ to purchase. Ontario residents only.`
  );
  if ((complianceRewrite.wasRewritten || captionResult?.wasRewritten) &&
      !caption.includes("Content optimized for AGCO compliance.")) {
    caption = `${caption}\n\n*Content optimized for AGCO compliance.*`;
  }

  // Append location-specific hashtags (1–2 tags) to the 5 standard ones
  const baseHashtags = captionResult?.hashtags ?? (
    generalBusinessPost
      ? "#shoplocal #ontariobusiness #localretail #community #visitustoday"
      : "#ontariocannabis #legalcannabis #canadacannabis #dispensary #cannabis"
  );
  const locationTags = b.location ? getLocationHashtags(b.location) : [];
  const hashtags = locationTags.length
    ? `${baseHashtags} ${locationTags.join(" ")}`
    : baseHashtags;

  // 2. Build FlyerData and generate composited image
  // Parse brand primary color — brandColors may be a hex string like "#3a7d44"
  // or a comma-separated list; take the first valid hex value.
  const brandPrimaryHex = (() => {
    const raw = (b.brandColors ?? "").trim();
    const match = raw.match(/#[0-9a-fA-F]{6}/);
    return match ? match[0] : undefined;
  })();

  const flyerData: FlyerData = {
    strainName:      captionResult?.strainName?.trim()  || generationPrompt.split(/\s+/).slice(0, 3).join(" "),
    strainType:      generalBusinessPost ? undefined : captionResult?.strainType?.trim()  || undefined,
    thcPercent:      generalBusinessPost ? undefined : captionResult?.thcPercent?.trim()  || "20-25",
    sizes:           generalBusinessPost ? undefined : captionResult?.sizes?.trim()       || "1g · 3.5g · 7g · 14g",
    productType:     generalBusinessPost ? undefined : captionResult?.productType?.trim() || "Flower",
    shopName:        b.businessName?.trim()             || undefined,
    price:           captionResult?.price?.trim()       || undefined,
    logoBase64:      b.logoBase64?.trim()               || undefined,
    brandPrimaryHex,
    brandVoice:      b.brandVoice?.trim()               || undefined,
    primaryColor:    brandKit.primaryColor?.trim()       || brandPrimaryHex,
    secondaryColor:  brandKit.secondaryColor?.trim()     || undefined,
    accentColor:     brandKit.accentColor?.trim()        || undefined,
    backgroundColor: brandKit.backgroundColor?.trim()    || undefined,
    fontStyle:       brandKit.fontStyle?.trim()          || undefined,
    layoutGrid:      brandKit.layoutGrid?.trim()         || undefined,
    visualMotif:     brandKit.visualMotif?.trim()        || undefined,
    toneOfVoice:     brandKit.toneOfVoice?.trim()        || b.brandVoice?.trim() || undefined,
    visualFingerprint: brandKit.visualFingerprint?.trim() || undefined,
    layout: postType === "story" ? "story" : "feed",
  };

  let imageResult: Awaited<ReturnType<typeof generatePromoImage>>;
  try {
    imageResult = await generatePromoImage(generationPrompt, flyerData);
  } catch (err) {
    console.error("Cannabis image generation failed after all model attempts:", err);
    const message = err instanceof Error ? err.message : "Unknown image generation error";
    res.status(502).json({
      error: `We couldn't generate your image. ${message}`,
      retryable: true,
    });
    return;
  }

  let imageUrl: string | undefined = imageResult.imageBase64;
  const imageGenerationWarning = false;

  // Apply brand watermark on top if logo set and no watermark already baked in
  if (imageUrl && b.logoBase64 && !flyerData.logoBase64) {
    imageUrl = await applyWatermark({
      imageBase64: imageUrl,
      logoBase64: b.logoBase64,
      businessName: b.businessName,
      position: b.watermarkPosition,
      showName: b.showNameWatermark,
    }).catch(() => imageUrl);
  }

  // 3. Persist to Drizzle/Postgres
  const [post] = await db
    .insert(postsTable)
    .values({
      userId,
      generationJobId,
      caption,
      hashtags,
      imageUrl,
      prompt: parsed.data.prompt,
      platform: "instagram",
      postType: postType === "story" ? "story" : "post",
      status: "draft",
      strainName: generalBusinessPost ? null : captionResult?.strainName || null,
      productType: generalBusinessPost ? null : captionResult?.productType || null,
      thcPercentage: generalBusinessPost ? null : captionResult?.thcPercent || null,
      agcoCompliant: true,
    })
    .returning();

  res.status(201).json(
    GeneratePostResponse.parse(normalizeApiIds({
      ...post,
      imageGenerationWarning,
      ...(imageGenerationWarning
        ? { imageGenerationWarningMessage: IMAGE_GENERATION_FALLBACK_MESSAGE }
        : {}),
    })),
  );
};

router.post("/posts/internal-generation", requireInternalGeneration, generatePostHandler);
router.post("/posts", requireAuth, generatePostHandler);

// GET /posts/:id — single post
router.get("/posts/:id", requireAuth, async (req, res) => {
  const userId = getUserId(req);
  const id = req.params.id as string;

  const [post] = await db
    .select()
    .from(postsTable)
    .where(and(eq(postsTable.id, id), eq(postsTable.userId, userId)))
    .limit(1);

  if (!post) {
    res.status(404).json({ error: "Post not found" });
    return;
  }

  res.json(GetPostResponse.parse(normalizeApiIds(post)));
});

// DELETE /posts/:id
router.delete("/posts/:id", requireAuth, async (req, res) => {
  const userId = getUserId(req);
  const id = req.params.id as string;

  await db
    .delete(postsTable)
    .where(and(eq(postsTable.id, id), eq(postsTable.userId, userId)));

  res.status(204).send();
});

// POST /posts/:id/publish — publish to Instagram
router.post("/posts/:id/publish", requireAuth, async (req, res) => {
  const userId = getUserId(req);
  const id = req.params.id as string;

  const [post] = await db
    .select()
    .from(postsTable)
    .where(and(eq(postsTable.id, id), eq(postsTable.userId, userId)))
    .limit(1);

  if (!post) {
    res.status(404).json({ error: "Post not found" });
    return;
  }

  // TODO: Instagram Graph API publishing logic
  const [updated] = await db
    .update(postsTable)
    .set({ status: "published", postedAt: new Date() })
    .where(eq(postsTable.id, id))
    .returning();

  res.json(PublishPostResponse.parse(normalizeApiIds(updated)));
});

// POST /posts/:id/schedule
router.post("/posts/:id/schedule", requireAuth, async (req, res) => {
  const userId = getUserId(req);
  const id = req.params.id as string;
  const parsed = SchedulePostBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [post] = await db
    .select()
    .from(postsTable)
    .where(and(eq(postsTable.id, id), eq(postsTable.userId, userId)))
    .limit(1);

  if (!post) {
    res.status(404).json({ error: "Post not found" });
    return;
  }

  const [updated] = await db
    .update(postsTable)
    .set({ status: "scheduled", scheduledAt: new Date(parsed.data.scheduledAt) })
    .where(eq(postsTable.id, id))
    .returning();

  res.json(SchedulePostResponse.parse(normalizeApiIds(updated)));
});

// GET /prompts/suggested — cannabis-specific prompts
router.get("/prompts/suggested", requireAuth, async (req, res) => {
  const userId = getUserId(req);
  const brand = await db
    .select({ businessName: brandProfilesTable.businessName })
    .from(brandProfilesTable)
    .where(eq(brandProfilesTable.userId, userId))
    .limit(1);

  res.json({
    industry: "cannabis_dispensary",
    prompts: CANNABIS_PROMPTS,
  });
});

export default router;
