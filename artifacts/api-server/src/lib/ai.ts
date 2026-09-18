import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is not set");
    }
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

interface GenerateCaptionOptions {
  businessName: string;
  industry: string;
  brandVoice?: string | null;
  targetAudience?: string | null;
  location?: string | null;
  prompt: string;
  postType: "post" | "story";
}

const INDUSTRY_CAPTION_RULES: Record<string, string> = {
  restaurant: `
Industry rules for RESTAURANT:
- Lead with sensory language: textures, aromas, flavours, temperatures
- Mention specific dishes, ingredients, or techniques by name
- Evoke dining atmosphere and experience
- Use food-specific CTAs: "Reserve your table", "Order online", "Visit us tonight"
- Include meal occasion signals: brunch, date night, family dinner, happy hour`,

  fitness: `
Industry rules for FITNESS:
- Open with a motivational or transformation-focused hook
- Use action-oriented language: push, lift, grind, transform, commit
- Reference specific training modalities, classes, or results
- CTAs that drive action: "Book your first class", "Start your 7-day trial", "DM us to get started"
- Acknowledge the journey: consistency, progress, discipline`,

  "real estate": `
Industry rules for REAL ESTATE:
- Lead with the lifestyle the property enables, not just specs
- Use aspirational descriptors: sun-drenched, entertainer's dream, move-in ready
- Include neighbourhood context and community feel
- CTAs: "Book a private viewing", "Request the full listing", "Link in bio for details"
- Create urgency when appropriate: "Just listed", "Open this weekend"`,

  retail: `
Industry rules for RETAIL:
- Highlight the product's key benefit or differentiator in the first line
- Use lifestyle framing: how this fits into the customer's daily life
- Create desire through specificity: materials, craftsmanship, limited availability
- CTAs: "Shop the link in bio", "DM to order", "Limited stock — grab yours today"
- Pair with seasonal or trend relevance when applicable`,

  salon: `
Industry rules for BEAUTY / SALON:
- Open with the transformation or confidence outcome
- Reference specific services, techniques, or product lines by name
- Use tactile and visual language: glossy, defined, hydrated, luminous
- CTAs: "Book via the link in bio", "Call to reserve your spot", "DM for availability"
- Celebrate the client result and stylist craft`,

  default: `
Industry rules for GENERAL BUSINESS:
- Lead with the clearest benefit to the customer
- Be specific — avoid vague claims
- CTAs must be direct and easy to follow
- Connect the product/service to the customer's everyday life`,
};

const INDUSTRY_IMAGE_STYLES: Record<string, string> = {
  restaurant: `
Photographic style: high-end food photography, macro lens detail, shallow depth of field.
Lighting: warm practical lighting with a candle-like quality, slight steam or smoke wisps on hot dishes.
Composition: overhead or 45-degree angle, rustic or marble surface textures, garnish visible.
Colour palette: rich ambers, deep greens, creamy whites. Never cold or clinical.
Mood: appetising, intimate, crave-inducing.`,

  fitness: `
Photographic style: dynamic sports photography, fast shutter energy, bold contrast.
Lighting: dramatic side or rim lighting, gym or outdoor natural light, slight lens flare acceptable.
Composition: low angle hero shots, power poses, motion blur on movement.
Colour palette: high contrast — dark backgrounds with vivid accent colours, electric blues, neon greens.
Mood: powerful, motivating, aspirational.`,

  "real estate": `
Photographic style: architectural photography, wide angle interior and exterior shots.
Lighting: golden hour exterior light, bright airy interiors, no harsh shadows inside.
Composition: symmetrical framing, leading lines to focal points, lifestyle props (fresh flowers, coffee cup).
Colour palette: warm neutrals, white walls, natural wood tones.
Mood: aspirational, spacious, lifestyle-driven.`,

  retail: `
Photographic style: clean commercial product photography, editorial lifestyle hybrid.
Lighting: soft diffused studio light with no harsh shadows, or bright natural window light.
Composition: product hero centre frame, clean negative space, optional lifestyle context.
Colour palette: brand-consistent with clean white or muted neutral backgrounds.
Mood: desirable, premium, modern.`,

  salon: `
Photographic style: beauty editorial photography, magazine-quality finish.
Lighting: soft butterfly lighting or ring-light catchlights, flattering on skin and hair.
Composition: tight beauty crops on hair or face, clean studio or salon backdrop.
Colour palette: soft pastels, champagne tones, clean whites and metallics.
Mood: elegant, aspirational, confidence-inspiring.`,

  default: `
Photographic style: clean professional commercial photography.
Lighting: even, well-lit, no harsh shadows.
Composition: clear subject focus, uncluttered background.
Colour palette: brand-appropriate, professional.
Mood: trustworthy, polished, on-brand.`,
};

export async function generateCaption(opts: GenerateCaptionOptions): Promise<{ caption: string; hashtags: string }> {
  const anthropic = getClient();
  const isStory = opts.postType === "story";
  const industryKey = opts.industry.toLowerCase();
  const industryRules =
    INDUSTRY_CAPTION_RULES[industryKey] ||
    INDUSTRY_CAPTION_RULES[Object.keys(INDUSTRY_CAPTION_RULES).find((k) => industryKey.includes(k)) ?? ""] ||
    INDUSTRY_CAPTION_RULES.default;

  const systemPrompt = `You are an expert Instagram content creator and SEO specialist for ${opts.businessName}, a ${opts.industry} business.
Brand voice: ${opts.brandVoice || "professional and engaging"}.
Target audience: ${opts.targetAudience || "general audience"}.
${opts.location ? `Location: ${opts.location}.` : ""}

Universal rules for ALL captions:
- First line must be a compelling hook that stops the scroll (curiosity or urgency, no clickbait)
- Use natural keyword integration relevant to the ${opts.industry} industry
- ${opts.location ? `Include location mentions naturally for local SEO` : ""}
- Feel human-written, not AI-generated
- NEVER use em dashes (—) anywhere in the caption. Not ever. Replace with a comma, period, or rewrite the sentence.
- NEVER use ellipses (...) or generic filler phrases like "In today's world" or "Game-changer"
- Never repeat the same caption structure
- Comply with Instagram guidelines. No misleading claims, no prohibited content
${industryRules}

${isStory ? `For STORIES:
- Keep it short and punchy (2-3 sentences max)
- More casual and urgent tone
- Include urgency cues (today only, this weekend, limited time)
- Conversational style` : `For POSTS:
- Strong hook + body + CTA structure
- Vary length between 100-300 words`}

Return ONLY a JSON object with exactly this structure:
{
  "caption": "the full caption text",
  "hashtags": "#tag1 #tag2 #tag3 #tag4 #tag5"
}
Generate exactly 5 hashtags mixing: 1 broad industry tag, 2 medium-volume tags, 1 location-specific tag (if applicable), 1 niche tag.`;

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 1024,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: `Create an Instagram ${isStory ? "story" : "post"} for: ${opts.prompt}`,
      },
    ],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";

  function stripEmDashes(str: string): string {
    return str.replace(/—/g, ",").replace(/\s{2,}/g, " ").trim();
  }

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        caption: stripEmDashes(parsed.caption || text),
        hashtags: parsed.hashtags || "",
      };
    }
  } catch {
    // fallback
  }

  return { caption: stripEmDashes(text), hashtags: "" };
}

export async function generateImagePrompt(opts: {
  businessName: string;
  industry: string;
  brandColors?: string | null;
  prompt: string;
  postType: "post" | "story";
}): Promise<string> {
  const anthropic = getClient();

  const industryKey = opts.industry.toLowerCase();
  const style =
    INDUSTRY_IMAGE_STYLES[industryKey] ||
    INDUSTRY_IMAGE_STYLES[Object.keys(INDUSTRY_IMAGE_STYLES).find((k) => industryKey.includes(k)) ?? ""] ||
    INDUSTRY_IMAGE_STYLES.default;

  const aspectRatio = opts.postType === "story" ? "9:16 vertical" : "1:1 square";

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 400,
    messages: [
      {
        role: "user",
        content: `Write a Stability AI image generation prompt for an Instagram ${opts.postType}.

THE USER'S SUBJECT (this is the hero of the image — never ignore or replace it):
"${opts.prompt}"

Brand context (style modifiers only — do NOT override the subject above):
- Business: ${opts.businessName} (${opts.industry})
- Brand colors: ${opts.brandColors || "professional neutral tones"}
- Format: ${aspectRatio}

Industry aesthetic layer:
${style}

Build the prompt in this exact order:
1. SUBJECT FIRST: Describe the user's specific subject in vivid, concrete language. Name the actual thing. If they said "truffle pasta", write about truffle pasta. If they said "kettlebell class", write about kettlebells and people training.
2. LIGHTING: Pick one specific style that suits the subject (golden hour, dramatic side lighting, soft diffused studio light, neon accents, backlit rim light, natural window light, etc.)
3. CAMERA: Pick specific gear and settings (Sony A7IV 85mm f/1.4, Canon R5 35mm wide, macro 100mm closeup, cinematic anamorphic lens, etc.) with depth of field notes
4. COMPOSITION: One clear direction (centered hero shot, rule of thirds, flat lay overhead, lifestyle in-context, tight texture detail, environmental portrait, etc.)
5. MOOD & ATMOSPHERE: One punchy descriptor (warm and inviting, bold and energetic, moody editorial, clean and aspirational, vibrant and fresh)
6. QUALITY BOOSTERS: End with — hyperrealistic, ultra detailed, 8K resolution, professional commercial photography, award-winning composition, Instagram-worthy, visually stunning

Rules:
- Write as ONE continuous paragraph, 80-120 words, no labels or bullet points
- The user's subject must be unmistakable in the final image
- Be specific and cinematic, not vague and generic
- Do NOT mention the business name or any text/overlays

Return ONLY the prompt text.`,
      },
    ],
  });

  return message.content[0].type === "text" ? message.content[0].text.trim() : opts.prompt;
}
