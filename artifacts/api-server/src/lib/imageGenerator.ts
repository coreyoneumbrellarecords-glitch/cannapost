// ─── OpenRouter Image Generation ─────────────────────────────────────────────
// All images are generated natively by the AI model — text, layout, typography,
// and compliance elements are rendered directly inside the image.
// No Stability AI, no Sharp compositing, no SVG overlays.

/** Primary lower-cost OpenRouter image model; override with OPENROUTER_IMAGE_MODEL. */
export const DEFAULT_IMAGE_MODEL = "openai/gpt-5-image";
export const IMAGE_MODEL =
  process.env.OPENROUTER_IMAGE_MODEL?.trim() || DEFAULT_IMAGE_MODEL;
export const IMAGE_GENERATION_TIMEOUT_MS = 180_000;
export const IMAGE_MODELS = [
  IMAGE_MODEL,
  "google/gemini-3.1-flash-image",
  "openai/gpt-5.4-image-2",
].filter((model, index, models) => models.indexOf(model) === index);

const OPENROUTER_IMG_URL = "https://openrouter.ai/api/v1/images";
export const IMAGE_GENERATION_FALLBACK_MESSAGE =
  "Image generation is temporarily unavailable — a placeholder design was used.";

// ─── Health Canada Mandatory Warning Messages ──────────────────────────────────
const HEALTH_CANADA_WARNINGS: string[] = [
  "WARNING: Cannabis smoke is harmful to your health. There are serious risks to your health from second-hand cannabis smoke.",
  "WARNING: Use of cannabis by youth may harm the developing brain. It can affect memory, thinking and behaviour.",
  "WARNING: Regular use of cannabis by pregnant or breastfeeding women may harm the child.",
  "WARNING: Do not drive while under the influence of cannabis. It impairs your judgment and slows your reaction time.",
  "WARNING: Cannabis can cause anxiety, fear, and panic. These side effects may be more common if you are not a regular user.",
  "WARNING: The use of cannabis by people with a personal or family history of psychosis may increase the risk of psychosis.",
  "WARNING: Regular cannabis use can cause dependence. About 1 in 10 people who use cannabis will become dependent.",
  "WARNING: Regular use of cannabis can affect your brain development and permanently alter the way your brain works.",
  "WARNING: Cannabis affects your concentration, your ability to think and make decisions, and your reaction time and coordination. These effects can last for up to 24 hours.",
  "WARNING: Cannabis can cause paranoia and anxiety. Some people experience these effects even with low amounts of cannabis.",
  "WARNING: The health risks of consuming cannabis are not fully known.",
  "WARNING: Using cannabis while pregnant or breastfeeding may harm your baby.",
  "WARNING: Mixing cannabis with tobacco increases your risk of developing a tobacco addiction and having other harms associated with tobacco use.",
  "WARNING: Cannabis can cause cannabis hyperemesis syndrome — a cycle of severe nausea and vomiting.",
];

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FlyerData {
  strainName: string;
  thcPercent?: string;
  sizes?: string;
  productType?: string;
  shopName?: string;
  strainType?: string;    // "Sativa" | "Indica" | "Hybrid"
  price?: string;
  logoBase64?: string;    // brand logo data-URL (png/jpeg)
  brandPrimaryHex?: string;
  brandVoice?: string;
  /** Full persisted brand-kit fields.  Hex aliases are retained for older clients. */
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  backgroundColor?: string;
  fontStyle?: string;
  layoutGrid?: string;
  visualMotif?: string;
  toneOfVoice?: string;
  visualFingerprint?: string;
  layout?: "feed" | "story";
}

export type ContentFormat =
  | "STRAIN_SPOTLIGHT"
  | "PRODUCT_CATEGORY_FEATURE"
  | "STORE_ANNOUNCEMENT"
  | "EDUCATIONAL_CONTENT"
  | "BRAND_AWARENESS";

const PRODUCT_TERMS = /\b(thc|cbd|indica|sativa|hybrid|flower|strain|pre.?rolls?|vapes?|cartridges?|edibles?|gumm(?:y|ies)|concentrates?|shatter|wax|rosin|hash|extracts?|grams?|ounces?|oz|mg)\b/i;
const EDUCATIONAL_TERMS = /\b(terpenes?|genetics?|lineage|cannabinoids?|how to choose|learn|guide|education|difference between|what is)\b/i;
const ANNOUNCEMENT_TERMS = /\b(grand opening|now open|opening soon|store hours?|holiday hours?|come visit|visit us|stop by|announcement|vendor pop[- ]?up|pop[- ]?up|in[- ]store event|store event|new arrivals?|closed (today|tomorrow)|location update)\b/i;
const KNOWN_STRAIN_TERMS = /\b(blue dream|pink goo|pink gas|black mountain side|perma fried|northern lights|purple punch|granddaddy purple|grape ape|mimosa|tropicana|gelato|runtz|wedding cake|ice cream cake|kush|og kush|sour diesel|girl scout cookies|gsc)\b/i;

/** Deterministic format selection: a product is never confused with a general post. */
export function detectContentFormat(prompt: string, data?: FlyerData): ContentFormat {
  const text = `${prompt} ${data?.productType ?? ""}`.toLowerCase();
  const hasSpecificStrain = (
    Boolean(data?.strainType?.trim() || data?.thcPercent?.trim()) ||
    KNOWN_STRAIN_TERMS.test(`${prompt} ${data?.strainName ?? ""}`)
  ) &&
    !/^(featured product|product|new arrival)$/i.test(data?.strainName?.trim() ?? "");
  if (hasSpecificStrain || /\b(strain spotlight|strain post|flower strain)\b/i.test(text)) return "STRAIN_SPOTLIGHT";
  if (ANNOUNCEMENT_TERMS.test(text) && !PRODUCT_TERMS.test(text) && !data?.thcPercent) return "STORE_ANNOUNCEMENT";
  if (PRODUCT_TERMS.test(text)) return "PRODUCT_CATEGORY_FEATURE";
  if (EDUCATIONAL_TERMS.test(text)) return "EDUCATIONAL_CONTENT";
  return "BRAND_AWARENESS";
}

/** Rewrites disallowed request language before it reaches copy or image providers. */
export function rewritePromptForCompliance(prompt: string): { prompt: string; wasRewritten: boolean } {
  const rules: Array<[RegExp, string]> = [
    [/\b(helps? with|relieves?|treats?|good for (anxiety|sleep)|medical|therapeutic|pain relief)\b/gi, "product information"],
    [/\b(be more creative|feel better|enhance your experience|uplifting|energizing)\b/gi, "distinctive"],
    [/\b\d+\s*% off|buy one get one|bogo|free with purchase|free (?:cannabis|product|gift)\b/gi, "available in store"],
    [/\b(best|strongest|superior|more potent)\b/gi, "featured"],
    [/\b(smoking|smoke|vaping|vape clouds?|consuming|consumption)\b/gi, "product presentation"],
    [/\b(cartoon|mascot|fictional character|kid(?:s)?|youth|child(?:ren)?|animal)\b/gi, "abstract design"],
  ];
  let rewritten = prompt;
  for (const [pattern, replacement] of rules) rewritten = rewritten.replace(pattern, replacement);
  return { prompt: rewritten, wasRewritten: rewritten !== prompt };
}

// ─── Brand Style Helpers ──────────────────────────────────────────────────────

function hexToColorDescription(hex: string): string {
  if (!hex || hex.length < 7) return "deep emerald green";
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return l > 0.65 ? "cool silver" : "dark charcoal";
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  if (s < 0.12) return l > 0.6 ? "cool silver" : "dark charcoal";
  let h = 0;
  if (max === r)      h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
  else if (max === g) h = ((b - r) / d + 2) * 60;
  else                h = ((r - g) / d + 4) * 60;
  if (h < 15 || h >= 345) return l > 0.5 ? "vivid rose red" : "deep crimson red";
  if (h < 40)  return l > 0.5 ? "warm orange" : "deep burnt orange";
  if (h < 70)  return l > 0.5 ? "radiant golden yellow" : "rich amber gold";
  if (h < 155) return l > 0.5 ? "electric lime green" : "deep forest emerald green";
  if (h < 200) return l > 0.5 ? "vivid cyan teal" : "deep dark teal";
  if (h < 255) return l > 0.5 ? "electric cobalt blue" : "deep midnight blue";
  if (h < 290) return l > 0.5 ? "vivid violet blue" : "deep indigo";
  if (h < 325) return l > 0.5 ? "vivid royal purple" : "deep royal purple";
  return l > 0.5 ? "vibrant hot pink" : "deep magenta";
}

// ─── Strain Theme Engine ──────────────────────────────────────────────────────

interface StrainTheme {
  /** Thematic background art description for the AI prompt */
  bgArtDesc: string;
  /** Accent color hex used in accent rule and info text */
  accentColor: string;
  /** Typography gradient description for the 3D strain name */
  typoDesc: string;
}

const BASE_ART_SUFFIX =
  "no photorealistic cannabis buds, no cannabis plant imagery, no marijuana leaf, no weed, no text rendered in the background art";

function buildStrainTheme(strainName: string, userPrompt: string, productType?: string): StrainTheme {
  const combined = (strainName + " " + userPrompt + " " + (productType ?? "")).toLowerCase();
  const name = strainName.trim();
  const pt = (productType ?? "").toLowerCase();

  const isEdible    = /edible|gummy|gummies|chocolate|brownie|cookie|capsule|beverage|drink|chew/i.test(pt + " " + combined);
  const isVape      = /vape|cartridge|cart|510|pod|pen/i.test(pt + " " + combined);
  const isCbd       = /\bcbd\b|tincture|sublingual|drop|spray/i.test(pt + " " + combined) && !/concentrate|shatter|wax|rosin/i.test(combined);
  const isConc      = /concentrate|shatter|wax|rosin|hash|kief|live.?resin|badder|budder|crumble|dab/i.test(pt + " " + combined);
  const isAccessory = /accessor|pipe|bong|rig|grinder|paper|tray|lighter|glass/i.test(pt + " " + combined);

  // ── Named strain overrides ──────────────────────────────────────────────────

  if (/blue\s?dream/i.test(name)) return {
    bgArtDesc: `ethereal cobalt blue dreamscape, swirling electric blue and lavender aurora wave ribbons, hyper-realistic plump blueberries glowing with inner sapphire light, prismatic sapphire and violet light refractions, holographic chrome ribbon streams, silk ribbons in periwinkle and royal blue, ${BASE_ART_SUFFIX}`,
    accentColor: "#60a5fa",
    typoDesc: "gradient from bright sky blue at top to deep navy blue at bottom, metallic azure sheen, cool blue glow",
  };
  if (/granddaddy\s?purple|gdp\b/i.test(name)) return {
    bgArtDesc: `majestic amethyst crystal formations, aurora borealis ribbons in deep violet and indigo, plump grape clusters with jewel-like purple inner light, liquid violet mercury streams, silk ribbons in royal purple, scattered amethyst gemstones, ${BASE_ART_SUFFIX}`,
    accentColor: "#c084fc",
    typoDesc: "gradient from soft lavender at top to deep royal purple at bottom, amethyst glow, violet metallic sheen",
  };
  if (/sour\s?diesel/i.test(name)) return {
    bgArtDesc: `industrial high-voltage art, chrome steel pipe architecture with acid yellow liquid racing through them, electric lightning arc bursts in neon yellow-green, liquid metal chrome drips, neon citrus-acid yellow explosions against deep charcoal, chrome vapor streams, ${BASE_ART_SUFFIX}`,
    accentColor: "#facc15",
    typoDesc: "gradient from bright neon yellow at top to deep amber at bottom, electric chrome sheen, acid yellow glow",
  };
  if (/og\s?kush/i.test(name)) return {
    bgArtDesc: `ancient earth luxury, warm amber and terracotta geological abstract formations, aged bronze and antique gold metallic accents, warm earthy ochre abstract patterns, copper and deep amber abstract streams, heritage atmosphere, ${BASE_ART_SUFFIX}`,
    accentColor: "#d97706",
    typoDesc: "gradient from bright gold at top to deep bronze at bottom, aged copper sheen, warm amber glow",
  };
  if (/wedding\s?cake/i.test(name)) return {
    bgArtDesc: `elegant bridal luxury, ivory white fondant rose formations with rose gold ribbon details, white royal icing drip streams, scattered gold leaf flakes and pearl elements, champagne bubble streams, pristine white and rose gold silk ribbons, ${BASE_ART_SUFFIX}`,
    accentColor: "#fbbf24",
    typoDesc: "gradient from soft champagne ivory at top to warm gold at bottom, rose gold metallic sheen, pearl glow",
  };
  if (/\bgelato\b/i.test(name)) return {
    bgArtDesc: `Italian artisan gelato luxury, rich swirling lavender and pistachio green gelato ribbon formations, candied pistachio elements, warm vanilla gold silk ribbon flows, dried lavender blossoms glowing softly, Italian confectionery couture, ${BASE_ART_SUFFIX}`,
    accentColor: "#c084fc",
    typoDesc: "gradient from soft lavender at top to deep rose pink at bottom, creamy pastel metallic sheen, purple glow",
  };
  if (/zkittlez|skittlez/i.test(name)) return {
    bgArtDesc: `explosive rainbow candy luxury, glossy 3D fruit candy jewels in every color — vivid red cherry electric orange acid yellow electric green royal purple — floating throughout, glossy fruit-candy liquid drips in rainbow streams, holographic ribbon flows, ${BASE_ART_SUFFIX}`,
    accentColor: "#f97316",
    typoDesc: "gradient from bright orange at top to deep purple at bottom, rainbow holographic sheen, warm orange glow",
  };
  if (/\bruntz\b/i.test(name)) return {
    bgArtDesc: `glossy luxury candy store, rainbow hard candy jewels with holographic glaze, pastel candy cloud formations in electric pink lavender mint and bubblegum yellow, candy paint pour ribbons, iridescent foil streams, ${BASE_ART_SUFFIX}`,
    accentColor: "#f472b6",
    typoDesc: "gradient from soft pink at top to deep violet at bottom, iridescent candy sheen, pink glow",
  };
  if (/pink\s?kush/i.test(name)) return {
    bgArtDesc: `bold luxury pink editorial, powerful hot pink and candy-rose abstract formations, neon candy-pink atmospheric glow, cherry blossom petals floating, liquid hot pink streams, electric magenta and deep rose silk ribbons, ${BASE_ART_SUFFIX}`,
    accentColor: "#f472b6",
    typoDesc: "gradient from hot pink at top to deep crimson at bottom, neon pink metallic sheen, magenta glow",
  };
  if (/pink\s?goo/i.test(name)) return {
    bgArtDesc: `glossy candy fantasy, dripping glossy pink candy glaze rivers, floating oversized lollipops and candy swirl elements, pink crystallized sugar formations glistening, candy pink and rose gold silk ribbons, liquid cotton candy streams, ${BASE_ART_SUFFIX}`,
    accentColor: "#f9a8d4",
    typoDesc: "gradient from light candy pink at top to deep rose at bottom, glossy candy sheen, bubblegum glow",
  };
  if (/pink\s?gas/i.test(name)) return {
    bgArtDesc: `industrial pink luxury, chrome steel pipes dripping with neon pink liquid, electric hot pink energy explosion bursts with metallic chrome drips, high-voltage industrial aesthetic fused with candy-pink glamour, ${BASE_ART_SUFFIX}`,
    accentColor: "#f472b6",
    typoDesc: "oversized polished chrome industrial letters with deep extrusion, hot-pink reflected highlights, chrome-pink metallic sheen, neon pink glow",
  };
  if (/black\s?mountain\s?side/i.test(name)) return {
    bgArtDesc: `dramatic midnight mountain landscape, monumental black mountain silhouettes, violet lightning energy splitting a stormy purple sky, flowing dark silk clouds and subtle chrome streams, cinematic atmospheric depth, ${BASE_ART_SUFFIX}`,
    accentColor: "#a78bfa",
    typoDesc: "clean monumental bold white dimensional letters with a subtle silver edge, restrained extrusion, crisp contrast against the mountain scene",
  };
  if (/perma\s?fried/i.test(name)) return {
    bgArtDesc: `bright teal tropical graphic world, glossy abstract liquid shapes, luminous aqua and turquoise silk ribbons, stylized tropical forms, saturated cyan atmosphere, polished editorial reflections, ${BASE_ART_SUFFIX}`,
    accentColor: "#2dd4bf",
    typoDesc: "large vibrant teal-to-white dimensional letters with glossy lacquer, thick rounded extrusion, bright tropical cyan glow",
  };
  if (/northern\s?lights/i.test(name)) return {
    bgArtDesc: `breathtaking aurora borealis, electric teal and emerald green aurora ribbons dancing across deep indigo midnight sky, violet and aqua light curtains shimmering, crystalline polar star formations, arctic night luxury, ${BASE_ART_SUFFIX}`,
    accentColor: "#34d399",
    typoDesc: "gradient from bright emerald green at top to deep forest green at bottom, aurora metallic sheen, teal glow",
  };
  if (/ice\s?cream\s?cake/i.test(name)) return {
    bgArtDesc: `premium ice cream dessert luxury, swirling vanilla soft-serve and deep grape ice cream ribbon formations intertwining, glossy drip streams in cream and purple, waffle cone accents, rainbow sprinkles floating, ${BASE_ART_SUFFIX}`,
    accentColor: "#c084fc",
    typoDesc: "gradient from cream yellow at top to deep purple at bottom, ice cream pastel metallic sheen, soft purple glow",
  };
  if (/girl\s?scout\s?cook|gsc\b/i.test(name)) return {
    bgArtDesc: `warm artisan bakery luxury, glossy caramel-dipped abstract formations, warm amber and brown sugar drip streams, chocolate chip elements glowing warmly, golden butterscotch silk ribbons flowing, ${BASE_ART_SUFFIX}`,
    accentColor: "#d97706",
    typoDesc: "gradient from golden yellow at top to deep chocolate brown at bottom, caramel metallic sheen, warm amber glow",
  };
  if (/gorilla\s?glue|gg4\b/i.test(name)) return {
    bgArtDesc: `dark powerful industrial luxury, deep charcoal and forest emerald heavy texture formations, thick resin-like dark glue abstract drip structures, electric green neon accent light streams, chrome and forest green metallic elements, ${BASE_ART_SUFFIX}`,
    accentColor: "#4ade80",
    typoDesc: "gradient from bright neon green at top to deep forest green at bottom, dark chrome metallic sheen, emerald glow",
  };
  if (/pineapple\s?express/i.test(name)) return {
    bgArtDesc: `tropical luxury, hyper-realistic sliced pineapple elements with golden inner light, electric tropical yellow and vivid teal abstract flows, holographic tropical ribbon streams, golden pineapple juice splash effects, ${BASE_ART_SUFFIX}`,
    accentColor: "#facc15",
    typoDesc: "gradient from bright tropical yellow at top to deep teal at bottom, golden metallic sheen, warm yellow glow",
  };
  if (/sunset\s?sherbet/i.test(name)) return {
    bgArtDesc: `warm sunset luxury, sweeping gradient layers from deep coral orange to sherbet pink and warm amber gold, atmospheric golden-hour light ribbons, soft sherbet ice cream swirl formations, peach and rose gold silk ribbons, ${BASE_ART_SUFFIX}`,
    accentColor: "#fb923c",
    typoDesc: "gradient from peach orange at top to deep coral at bottom, sherbet metallic sheen, warm sunset glow",
  };
  if (/\bmac\b|miracle\s?alien/i.test(name)) return {
    bgArtDesc: `otherworldly alien luxury, iridescent silver and deep cosmic purple flowing shapes, holographic liquid metal in shifting rainbow iridescence, alien crystal formations with prismatic light, cosmic nebula clouds with silver mercury streams, ${BASE_ART_SUFFIX}`,
    accentColor: "#818cf8",
    typoDesc: "gradient from soft periwinkle at top to deep indigo at bottom, iridescent holographic metallic sheen, cosmic glow",
  };
  if (/cereal\s?milk/i.test(name)) return {
    bgArtDesc: `nostalgic luxury cereal editorial, creamy milk pour streams with rainbow cereal jewel-clusters floating, pastel candy-colored spheres in pink blue yellow and green, glossy milk-wash formations, rainbow and cream silk ribbons, ${BASE_ART_SUFFIX}`,
    accentColor: "#f472b6",
    typoDesc: "gradient from soft cream at top to deep violet at bottom, milky pastel metallic sheen, soft pink glow",
  };
  if (/mimosa/i.test(name)) return {
    bgArtDesc: `effervescent champagne brunch luxury, golden champagne bubble streams rising elegantly, blood orange citrus slice elements glowing with warm light, sparkling gold and orange light ribbons, rose gold metallic accents and tangerine silk flows, ${BASE_ART_SUFFIX}`,
    accentColor: "#f97316",
    typoDesc: "gradient from sparkling gold at top to deep coral orange at bottom, champagne metallic sheen, orange glow",
  };
  if (/wedding\s?cake/i.test(name)) return {
    bgArtDesc: `elegant bridal luxury editorial, ivory white fondant roses with rose gold ribbon details, white royal icing drip streams, scattered gold leaf and pearl elements, champagne bubble streams, white and rose gold silk ribbons, ${BASE_ART_SUFFIX}`,
    accentColor: "#fbbf24",
    typoDesc: "gradient from ivory champagne at top to warm gold at bottom, bridal rose gold sheen, pearl glow",
  };
  if (/london\s?pound\s?cake/i.test(name)) return {
    bgArtDesc: `regal British luxury, deep royal purple and champagne gold cake-drip formations, gold fondant ribbon drapes, antique gold metallic accents against deep purple, sophisticated luxury couture with royal purple and antique gold silk ribbons, ${BASE_ART_SUFFIX}`,
    accentColor: "#a855f7",
    typoDesc: "gradient from soft lavender at top to deep royal purple at bottom, antique gold metallic sheen, regal purple glow",
  };
  if (/apple\s?fritter/i.test(name)) return {
    bgArtDesc: `warm artisan bakery luxury, glossy caramel apple elements with green and golden inner glow, swirling caramel amber and fresh green formations, cinnamon gold drip streams, green apple and caramel silk ribbons, ${BASE_ART_SUFFIX}`,
    accentColor: "#f59e0b",
    typoDesc: "gradient from bright yellow-green at top to deep caramel at bottom, caramel apple sheen, warm golden glow",
  };
  if (/jack\s?herer/i.test(name)) return {
    bgArtDesc: `legendary sativa luxury, heroic gold and warm amber dynamic formations radiating outward, bright citrus-gold light streams, warm amber abstract shapes, electric gold and copper metallic ribbons, legendary pioneer atmosphere, ${BASE_ART_SUFFIX}`,
    accentColor: "#f59e0b",
    typoDesc: "gradient from bright gold at top to deep copper at bottom, legendary golden metallic sheen, warm amber glow",
  };
  if (/white\s?widow/i.test(name)) return {
    bgArtDesc: `frost-white arctic luxury, luminous crystalline ice formations catching cold light, silver-white aurora ribbons across dark slate, shattered crystal ice shards with inner white glow, platinum and silver metallic streams, ${BASE_ART_SUFFIX}`,
    accentColor: "#e2e8f0",
    typoDesc: "gradient from pure white at top to cool silver at bottom, platinum metallic sheen, icy white glow",
  };
  if (/blueberry/i.test(name)) return {
    bgArtDesc: `hyper-realistic plump blueberry clusters with jewel-like sapphire inner light, liquid cobalt blue abstract silk ribbons, prismatic blue and indigo light refractions, deep navy to electric blue gradient atmosphere, ${BASE_ART_SUFFIX}`,
    accentColor: "#60a5fa",
    typoDesc: "gradient from bright sky blue at top to deep navy at bottom, sapphire metallic sheen, blue glow",
  };
  if (/strawberry/i.test(name)) return {
    bgArtDesc: `hyper-realistic glossy strawberry elements with vivid ruby inner glow, liquid strawberry candy drip streams in crimson and rose, strawberry seed patterns scattered, lush red and rose gold silk ribbons, ${BASE_ART_SUFFIX}`,
    accentColor: "#f43f5e",
    typoDesc: "gradient from bright rose red at top to deep crimson at bottom, ruby metallic sheen, rose glow",
  };
  if (/mango/i.test(name)) return {
    bgArtDesc: `golden mango tropical luxury, hyper-realistic mango elements glowing with warm tropical light, electric mango-yellow and deep teal abstract flows, liquid golden mango streams, holographic tropical ribbon flows, ${BASE_ART_SUFFIX}`,
    accentColor: "#f97316",
    typoDesc: "gradient from bright mango yellow at top to deep teal at bottom, tropical golden sheen, orange glow",
  };
  if (/lemon/i.test(name)) return {
    bgArtDesc: `hyper-realistic lemon slice elements with electric yellow inner glow, acid yellow abstract energy ribbons, electric citrus-gold light stream formations, vivid lemon and lime color palette, zesty luxury, ${BASE_ART_SUFFIX}`,
    accentColor: "#facc15",
    typoDesc: "gradient from bright lemon yellow at top to deep amber at bottom, acid citrus metallic sheen, electric yellow glow",
  };
  if (/banana/i.test(name)) return {
    bgArtDesc: `tropical banana luxury, glossy banana elements with warm golden yellow glow, sweeping amber and golden yellow formations, tropical heat with electric yellow and copper metallic streams, banana-yellow silk ribbons, ${BASE_ART_SUFFIX}`,
    accentColor: "#fbbf24",
    typoDesc: "gradient from bright banana yellow at top to deep copper at bottom, tropical golden sheen, warm yellow glow",
  };

  // ── Product type paths ─────────────────────────────────────────────────────
  if (isEdible) {
    if (/chocolate|cocoa|cacao|brownie/i.test(combined)) return {
      bgArtDesc: `rich molten dark chocolate luxury, glossy dark chocolate rivers dripping with gold leaf flakes, warm deep cocoa brown formations with lustrous gold metallic accents, luxury confectionery couture, ${BASE_ART_SUFFIX}`,
      accentColor: "#d97706",
      typoDesc: "gradient from bright gold at top to deep chocolate brown at bottom, molten chocolate metallic sheen, amber glow",
    };
    if (/strawberry|raspberry|blueberry|cherry|berry|grape/i.test(combined)) return {
      bgArtDesc: `vibrant berry candy luxury, glossy ruby and crimson berry elements glowing with inner light, liquid candy-berry streams in vivid colors, holographic berry-pink ribbons, neon raspberry formations, ${BASE_ART_SUFFIX}`,
      accentColor: "#f43f5e",
      typoDesc: "gradient from bright berry pink at top to deep wine at bottom, ruby candy metallic sheen, crimson glow",
    };
    if (/lemon|lime|orange|citrus|tangerine/i.test(combined)) return {
      bgArtDesc: `electric citrus candy luxury, bright lemon and orange elements glowing, electric yellow and tangerine abstract candy formations, glossy citrus-drop liquid streams, neon citrus ribbons, ${BASE_ART_SUFFIX}`,
      accentColor: "#fbbf24",
      typoDesc: "gradient from bright citrus yellow at top to deep amber at bottom, electric citrus sheen, yellow glow",
    };
    if (/mint|menthol|spearmint/i.test(combined)) return {
      bgArtDesc: `crystalline arctic candy luxury, cool mint-green and icy white crystal formations, candy-cane swirl structures, silver holographic ribbons, arctic luxury with electric mint and silver streams, ${BASE_ART_SUFFIX}`,
      accentColor: "#34d399",
      typoDesc: "gradient from bright mint green at top to deep emerald at bottom, arctic silver metallic sheen, cool mint glow",
    };
    return {
      bgArtDesc: `rainbow candy shop luxury, glossy hard candy jewels in every color, candy paint pour rivers in vivid rainbow colors, holographic foil ribbon streams, luxury confectionery couture, ${BASE_ART_SUFFIX}`,
      accentColor: "#f472b6",
      typoDesc: "gradient from bright pink at top to deep purple at bottom, rainbow candy sheen, pink glow",
    };
  }
  if (isVape) return {
    bgArtDesc: `futuristic tech luxury, sleek chrome geometric forms with electric neon light trails, liquid metal chrome streams through holographic neon accents, angular high-tech shapes in chrome and electric blue, vapor-trail ribbon streams, ${BASE_ART_SUFFIX}`,
    accentColor: "#38bdf8",
    typoDesc: "gradient from bright electric blue at top to deep navy at bottom, chrome tech metallic sheen, electric blue glow",
  };
  if (isCbd) return {
    bgArtDesc: `clean botanical wellness luxury, luminous champagne gold and ivory white botanical element formations glowing softly, delicate botanical silhouettes in antique gold, pearl and platinum silk ribbon flows, sophisticated wellness luxury, ${BASE_ART_SUFFIX}`,
    accentColor: "#d4a017",
    typoDesc: "gradient from soft champagne gold at top to warm amber at bottom, pearl botanical metallic sheen, soft gold glow",
  };
  if (isConc) return {
    bgArtDesc: `golden amber extract luxury, rich liquid gold and deep amber flowing formations, premium resin-drip texture streams, metallic amber and bronze ribbon flows, warm crystalline amber atmosphere, ${BASE_ART_SUFFIX}`,
    accentColor: "#f59e0b",
    typoDesc: "gradient from bright golden amber at top to deep bronze at bottom, crystalline amber metallic sheen, warm gold glow",
  };
  if (isAccessory) return {
    bgArtDesc: `prismatic crystal glass luxury, rainbow light refractions through clear glass formations, prismatic spectrum ribbons, high-gloss glass reflection shapes, platinum and chrome metallic streams, ${BASE_ART_SUFFIX}`,
    accentColor: "#94a3b8",
    typoDesc: "gradient from soft silver at top to deep slate at bottom, prismatic glass metallic sheen, clear crystal glow",
  };

  // ── Keyword-based flower fallbacks ─────────────────────────────────────────
  if (/\b(grape|granddaddy|plum|lavender|purple|lilac|urkle|violet|amethyst)\b/i.test(combined)) return {
    bgArtDesc: `regal purple luxury, amethyst crystal formations with aurora borealis ribbons in violet and indigo, grape clusters with jewel light, liquid violet mercury streams, royal purple silk ribbons, amethyst gemstone fragments, ${BASE_ART_SUFFIX}`,
    accentColor: "#c084fc",
    typoDesc: "gradient from soft lavender at top to deep violet at bottom, amethyst metallic sheen, purple glow",
  };
  if (/\b(lemon|lime|citrus|grapefruit|tangerine|sour)\b/i.test(combined)) return {
    bgArtDesc: `electric citrus luxury, hyper-realistic lemon elements with golden inner light, acid yellow energy bursts radiating outward, prismatic citrus light refractions, electric yellow silk ribbons and chrome streams, ${BASE_ART_SUFFIX}`,
    accentColor: "#facc15",
    typoDesc: "gradient from bright electric yellow at top to deep amber at bottom, acid citrus metallic sheen, yellow glow",
  };
  if (/\b(blue|blueberry|ocean|aqua|glacier|frost|arctic|iceberg)\b/i.test(combined)) return {
    bgArtDesc: `electric cobalt luxury, hyper-realistic blueberry clusters with sapphire inner light, electric blue aurora ribbons, bioluminescent blue wave formations, sapphire and cyan silk streams, midnight blue luxury, ${BASE_ART_SUFFIX}`,
    accentColor: "#38bdf8",
    typoDesc: "gradient from bright cobalt blue at top to deep midnight navy at bottom, sapphire metallic sheen, blue glow",
  };
  if (/\b(candy|cookie|cream|vanilla|sugar|sherbet|butter|biscotti|tiramisu|cheesecake)\b/i.test(combined)) return {
    bgArtDesc: `luxury candy confectionery, glossy 3D candy formations in pastel jewel tones dripping with glaze, candy paint pour rivers, holographic ribbon flows in pastel and metallic, crystallized sugar formations glowing, ${BASE_ART_SUFFIX}`,
    accentColor: "#f9a8d4",
    typoDesc: "gradient from soft candy pink at top to deep rose at bottom, glossy candy metallic sheen, pink glow",
  };
  if (/\b(fire|blaze|flame|inferno|volcano|torch|dragon)\b/i.test(combined)) return {
    bgArtDesc: `molten fire luxury, explosive lava formations in ember orange and scarlet, liquid fire streams and metallic flame ribbons, dramatic lava-like shapes with electric flame formations, volcanic luxury, ${BASE_ART_SUFFIX}`,
    accentColor: "#f97316",
    typoDesc: "gradient from bright ember orange at top to deep charcoal red at bottom, molten metallic sheen, fire glow",
  };
  if (/\b(diesel|fuel|gas|og|kush|hash|afghan)\b/i.test(combined)) return {
    bgArtDesc: `OG gas luxury, warm metallic amber copper formations, earthy terracotta and bronze abstract shapes, atmospheric ochre elements, bronze and gold metallic streams, legendary heritage aesthetic, ${BASE_ART_SUFFIX}`,
    accentColor: "#d97706",
    typoDesc: "gradient from bright gold at top to deep bronze at bottom, aged copper metallic sheen, warm amber glow",
  };
  if (/\b(mango|pineapple|tropical|coconut|island|papaya|guava|passion)\b/i.test(combined)) return {
    bgArtDesc: `vibrant tropical luxury, hyper-realistic tropical fruit elements with vibrant inner light, electric teal and golden flows, holographic tropical ribbon streams, sunset gradient in golden and aqua, exotic island luxury, ${BASE_ART_SUFFIX}`,
    accentColor: "#f97316",
    typoDesc: "gradient from bright tropical orange at top to deep teal at bottom, exotic fruit metallic sheen, warm tropical glow",
  };
  if (/\b(pink|rose|blossom|cherry|peach)\b/i.test(combined)) return {
    bgArtDesc: `luxury pink editorial, bold hot pink and rose formations, liquid candy-pink streams and holographic rose-gold ribbon flows, cherry blossom petals glowing softly, feminine luxury couture, ${BASE_ART_SUFFIX}`,
    accentColor: "#f472b6",
    typoDesc: "gradient from hot pink at top to deep crimson at bottom, rose gold metallic sheen, pink glow",
  };
  if (/\b(alien|space|cosmic|galaxy|star|nebula|moon|lunar|stellar|ufo)\b/i.test(combined)) return {
    bgArtDesc: `cosmic nebula luxury, swirling galaxies in electric purple blue and silver, cosmic dust cloud formations, neon stellar particle streams, iridescent holographic metallic shapes in deep space, ${BASE_ART_SUFFIX}`,
    accentColor: "#818cf8",
    typoDesc: "gradient from soft periwinkle at top to deep space indigo at bottom, cosmic holographic sheen, nebula glow",
  };
  if (/\b(black|dark|death|shadow|void|abyss|nightmare|noir)\b/i.test(combined)) return {
    bgArtDesc: `dark void luxury, midnight black and deep charcoal formations, electric violet sparks in negative space, dark silk ribbon tendrils with neon purple accents, noir luxury couture, ${BASE_ART_SUFFIX}`,
    accentColor: "#a78bfa",
    typoDesc: "gradient from soft violet at top to deep midnight black at bottom, dark chrome metallic sheen, violet glow",
  };
  if (/\b(mint|menthol|spearmint|ice|thin.?mint|glacier)\b/i.test(combined)) return {
    bgArtDesc: `crystalline arctic ice luxury, mint-green and silver crystal formations catching cold light, cool arctic frost shapes, holographic glass and crystal ribbon flows in aqua and silver, refreshing arctic luxury, ${BASE_ART_SUFFIX}`,
    accentColor: "#34d399",
    typoDesc: "gradient from bright mint green at top to deep arctic teal at bottom, ice crystal metallic sheen, cool mint glow",
  };

  // ── Default ─────────────────────────────────────────────────────────────────
  return {
    bgArtDesc: `premium dark luxury cannabis brand editorial, bold sweeping gold and amber abstract formations against deep black, holographic silk ribbon streams in gold and deep emerald, atmospheric luxury abstract couture, ${BASE_ART_SUFFIX}`,
    accentColor: "#c9a84c",
    typoDesc: "gradient from bright gold at top to deep bronze at bottom, luxury golden metallic sheen, warm amber glow",
  };
}

// ─── General Post Detection ───────────────────────────────────────────────────
// A post is a GENERAL awareness post if it contains no product-specific signals.
// Product signals: THC%, product categories, strain types, weights/measures.

export function isGeneralPost(prompt: string, flyerData?: FlyerData): boolean {
  return !["STRAIN_SPOTLIGHT", "PRODUCT_CATEGORY_FEATURE"].includes(detectContentFormat(prompt, flyerData));
}

// ─── Prompt Builders ──────────────────────────────────────────────────────────

function brandIdentityLayer(data: FlyerData): string {
  const primary = data.primaryColor ?? data.brandPrimaryHex ?? "#1b5e4b";
  const secondary = data.secondaryColor ?? "#111111";
  const accent = data.accentColor ?? primary;
  const background = data.backgroundColor ?? "#0b0b0b";
  const typography: Record<string, string> = {
    LUXURY: "elegant thin serif letterforms with generous spacing and gold detail",
    STREETWEAR: "heavy compressed display letterforms with assertive energy",
    HERITAGE: "classic serif letterforms with warm earthy craft character",
    MODERN: "clean geometric sans-serif with precise grid alignment",
    MINIMAL: "ultra-light typography, maximum white space, and restraint",
  };
  const motif: Record<string, string> = {
    SMOKE: "abstract atmospheric wisps, never consumption imagery",
    GEOMETRIC: "sharp crystalline shards and angular abstract forms",
    ORGANIC: "flowing natural curves without cannabis plants",
    CHROME: "liquid-metal ribbons and reflective chrome elements",
    CRYSTALLINE: "ice formations and prismatic refractions",
  };
  const font = (data.fontStyle ?? "MODERN").toUpperCase();
  const visual = (data.visualMotif ?? "GEOMETRIC").toUpperCase();
  return `LAYER 1 — FULL BRAND IDENTITY (mandatory): dominant primary ${primary}; secondary ${secondary}; accent ${accent}; background ${background}. Font personality ${font}: ${typography[font] ?? typography.MODERN}. Layout grid ${(data.layoutGrid ?? "CENTERED").toUpperCase()}. Visual motif ${visual}: ${motif[visual] ?? motif.GEOMETRIC}. Tone ${(data.toneOfVoice ?? data.brandVoice ?? "SOPHISTICATED").toUpperCase()}. Store name "${data.shopName ?? "CANNABIS DISPENSARY"}" appears at top. Persistent visual fingerprint "${data.visualFingerprint ?? `${primary}|${secondary}|${font}|${visual}`}"; retain this signature rather than using a generic brand style.`;
}

function layoutInstruction(data: FlyerData): string {
  return data.layout === "story"
    ? "STORY LAYOUT: 1080×1920 vertical 9:16; store/logo in the top safe region, main visual centered, and all compliance material fully legible in the bottom safe region."
    : "FEED LAYOUT: 1080×1080 square 1:1 with an aspect-aware balanced composition.";
}

function buildProductPrompt(data: FlyerData, theme: StrainTheme, format: ContentFormat): string {
  const shopName  = (data.shopName ?? "").toUpperCase().trim();
  const strainUp  = data.strainName.toUpperCase().trim();
  const warning = HEALTH_CANADA_WARNINGS[Array.from(`${data.strainName}|${data.shopName}`).reduce((n, char) => n + char.charCodeAt(0), 0) % HEALTH_CANADA_WARNINGS.length];
  const accentHex = data.accentColor ?? data.primaryColor ?? data.brandPrimaryHex ?? theme.accentColor;

  // Category label
  const pt = (data.productType ?? "Flower").toLowerCase();
  let categoryLabel = "";
  if      (/flower|pre.?roll/i.test(pt)) categoryLabel = data.strainType ? data.strainType.toUpperCase() : "";
  else if (/vape|cart/i.test(pt))         categoryLabel = "VAPE";
  else if (/edible/i.test(pt))            categoryLabel = "EDIBLE";
  else if (/extract/i.test(pt)) {
    categoryLabel = /\bcbd\b|tincture/i.test(data.strainName ?? "") ? "CBD" : "CONCENTRATE";
  }

  // THC / price
  const isAccessory = /accessor|glass|pipe|bong|rig|grinder|paper|tray|lighter/i.test(
    (data.productType ?? "") + " " + (data.strainName ?? "")
  );
  let infoLine = "";
  if (isAccessory && data.price?.trim()) {
    infoLine = `PRICE: display "${data.price.trim()}" in large bold text`;
  } else if (!isAccessory && data.thcPercent?.trim()) {
    infoLine = `THC PERCENTAGE: display "THC ${data.thcPercent.trim()}%" in large bold text in ${accentHex} color`;
  }

  const sizesLine = data.sizes?.trim()
    ? `AVAILABLE SIZES: display "${data.sizes.trim()}" in medium white text below the THC line` : "";

  const shopBar = shopName
    ? `STORE NAME BAR: At the very top, a dark translucent bar containing the store name "${shopName}" in clean white sans-serif, centered, bold, wide letter spacing. A thin ${accentHex} horizontal rule below it.`
    : "";

  const catLine = categoryLabel
    ? `PRODUCT CATEGORY LABEL: "${categoryLabel}" in small ${accentHex}-colored ALL-CAPS text centered, wide letter-spacing, positioned below the store name and above the strain name.`
    : "";

  const logoLine = data.logoBase64?.trim()
    ? `BRAND LOGO: The provided reference image is the brand logo. Place it cleanly in the upper-left corner of the image, small and unobtrusive, respecting the dark top bar.`
    : "";

  const brandStyle = data.brandPrimaryHex
    ? `\nBRAND COLOR ACCENTS: Use ${accentHex} (${hexToColorDescription(accentHex)}) as the primary accent color throughout — for the thin rule lines, the category label, and the THC text.`
    : "";

  const categoryTheme = /concentrate|extract|rosin|wax|shatter/i.test(pt) ? "amber jewel tones and resin textures" :
    /edible/i.test(pt) ? "refined flavor-inspired abstract art, never youth-oriented" :
    /vape|cart/i.test(pt) ? "sleek technical chrome and precision light" :
    /accessor/i.test(pt) ? "clean studio product aesthetic" : theme.bgArtDesc;
  const isStory = data.layout === "story";
  const darkPanelHeight = isStory ? "minimum 500px" : "minimum 300px";
  const warningBannerHeight = isStory ? "exactly 384px" : "exactly 216px";
  const warningFontRange = isStory ? "24–34px" : "20–28px";
  return `PREMIUM CANNABIS BRAND PROMOTIONAL GRAPHIC
${brandIdentityLayer(data)}
${layoutInstruction(data)}
LAYER 2 — CONTENT FORMAT: ${format}. ${format === "STRAIN_SPOTLIGHT" ? "Full-bleed strain story with dimensional hero name, strain type and specifications." : `Product category is hero. Category theme: ${categoryTheme}.`}
LAYER 3 — STRAIN THEME (only applicable to STRAIN_SPOTLIGHT): ${format === "STRAIN_SPOTLIGHT" ? theme.bgArtDesc : "Not applicable; do not invent a strain."}

QUALITY BENCHMARK:
Create the work at the level of premium cannabis packaging design blended with luxury streetwear editorial art. It must look art-directed by a professional brand designer, never like a generic AI image.

═══ BACKGROUND & ATMOSPHERE ═══
${theme.bgArtDesc}
Build a rich abstract artistic scene that tells the story of this exact strain name and flavor personality. Use flowing silk ribbons, chrome streams, atmospheric energy, crystals, glossy liquids, or thematic objects only when they fit this strain. Pure black or very dark negative space should anchor the composition. Rich, immersive, editorial quality.${brandStyle}

═══ MANDATORY TEXT LAYOUT (top to bottom) ═══
Render ALL text with crisp, professionally typeset letterforms. Every piece of text below must appear in the final image.

${shopBar}

REGULATORY SYMBOL (mandatory, top-right corner): A red stop-sign octagon shape containing a white stylised 5-leaflet cannabis leaf silhouette. Approximately 44×44px. This is a Canadian cannabis regulatory requirement.

${catLine}

HERO ELEMENT — STRAIN NAME:
"${strainUp}" is the dominant visual centerpiece of the entire composition.
Render it as MASSIVE, BOLD, dimensional 3D extruded typography — thick letterforms with clearly visible depth and extrusion face, ${theme.typoDesc}. The letters should feel physically present, as if cast from metal or lit from behind. Centered in the upper two-thirds of the canvas. This text must be very large and dominate the composition.
Match the letter material to the strain personality: candy and dessert strains use glossy bubble lettering; gas and fuel strains use chrome industrial lettering; purple strains use deep jewel-toned lettering; tropical strains use bright vibrant lacquered lettering.

LOCKED BOTTOM INFORMATION STACK — preserve the upper artwork exactly as described above and reserve sufficient canvas height below it for this stack:

DARK INFORMATION PANEL: A dark gradient panel from transparent to near-black sits directly above the yellow warning banner. It must be ${darkPanelHeight} tall so no content is cramped. Keep all text centered horizontally and use the following separate vertical regions in this exact top-to-bottom order. Do not collapse, overlap, or compress these regions:

1. THC / PRICE REGION: Reserve a dedicated row with generous clear padding above and below the text.
${infoLine}
The text must sit alone in this row with at least one full text-height of empty space above and below it.

2. SEPARATOR REGION: After the THC/price row, leave a clear gap, then draw one thin horizontal separator line centered at approximately 65% of the canvas width. Use ${accentHex} at subtle opacity. Leave equal empty space above and below the line.

3. AVAILABLE SIZES REGION: Reserve a separate centered row below the separator.
${sizesLine}
Use medium-weight white type with comfortable line height. Maintain visible padding above and below this row; it must never touch the separator or disclaimer.

4. DISCLAIMER REGION: Leave a clearly visible blank gap after the sizes row, then display this exact small white centered text:
"Must be 19+ to purchase. Ontario residents only."
Give the disclaimer its own line and its own vertical space, including clear padding beneath it before the yellow banner. It must never touch, overlap, or visually merge with the sizes.

MANDATORY HEALTH CANADA WARNING BOX / BANNER — a separate locked region at the absolute bottom edge:
Create a solid bright yellow (#FFC107) rectangle spanning the full canvas width and measuring ${warningBannerHeight} high. This height is fixed for every ${isStory ? "Story" : "Feed"} product image; never shrink or expand it.
Add a solid black left-edge accent stripe approximately 10px wide.
Center the following bold black warning text both horizontally and vertically inside the yellow rectangle:
"${warning}"
Use balanced, equal padding on all four sides. Fit the complete warning inside the fixed banner using a responsive font size within ${warningFontRange}, reducing the font size for longer warnings and wrapping to additional centered lines when required. Keep generous line spacing. The text must never overflow, clip, touch an edge, or be cut off.

BOTTOM STACK SPACING IS MANDATORY: THC/price, separator, sizes, disclaimer, and warning banner are five visually distinct regions. Preserve breathing room between every region. Nothing may be squished together. The yellow banner remains at least 20% of total image area.

${logoLine}

═══ STYLE NOTES ═══
• Do not use photorealistic cannabis buds, plants, leaves, or flower imagery as the main visual element; preferably omit them entirely
• Ultra-detailed, professional luxury brand graphic design quality
• The strain name 3D typography and the thematic background art are the two hero elements
• Everything else (store name, THC, sizes, disclaimer, warning box) supports these two heroes
`;
}

function buildGeneralPostPrompt(data: FlyerData, format: ContentFormat): string {
  const shopName  = data.shopName ? data.shopName.toUpperCase() : "CANNABIS DISPENSARY";
  const colorDesc = data.brandPrimaryHex ? hexToColorDescription(data.brandPrimaryHex) : "gold";
  const accentHex = data.brandPrimaryHex ?? "#c9a84c";

  const logoLine = data.logoBase64?.trim()
    ? `BRAND LOGO: The provided reference image is the brand logo. Place it prominently — centered or upper-left — large and clearly visible.`
    : "";

  const formatGuidance: Record<string, string> = {
    STORE_ANNOUNCEMENT: "Announcement/event name is hero; show date and details clearly with prominent store branding.",
    EDUCATIONAL_CONTENT: "Clean premium editorial: educational heading and concise factual key points; store branding is an authority marker, not an ad.",
    BRAND_AWARENESS: "Store name/logo is primary focus with a welcome, values, or brand-story message over abstract brand colors.",
  };
  return `LUXURY CANNABIS LIFESTYLE BRAND IMAGE
${brandIdentityLayer(data)}
${layoutInstruction(data)}
LAYER 2 — CONTENT FORMAT: ${format}. ${formatGuidance[format]}
LAYER 3 — STRAIN THEME: Not applicable.

STORE NAME: "${shopName}" rendered in large, clean, elegant white typography as the PRIMARY focal element. Prominently centered or near the top of the image.

VISUAL STYLE:
Sophisticated pure black or very dark background.
Abstract luxury design elements: flowing ${colorDesc} silk ribbons, geometric ${accentHex} metallic accents, atmospheric light effects, elegant abstract forms, subtle radiant glow.
Premium dispensary brand aesthetic — like a high-end lifestyle retail advertisement.

${logoLine}

WHAT TO EXCLUDE:
No cannabis imagery (no leaves, no buds, no plants).
No product photos.
No THC percentages or dosage information.
No health warnings or disclaimer boxes.
No regulatory symbols.
No product category labels.

Clean, minimal, luxurious brand presence.
`;
}

// ─── OpenRouter Image API ─────────────────────────────────────────────────────

interface OpenRouterImageResponse {
  data: Array<{ b64_json?: string; url?: string }>;
}

export async function validateOpenRouterConnection(): Promise<void> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    console.error("[OpenRouter] OPENROUTER_API_KEY is missing");
    return;
  }

  try {
    const response = await fetch("https://openrouter.ai/api/v1/models", {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(10_000),
    });
    const responseText = await response.text();
    if (response.ok) {
      console.log("[OpenRouter] Startup connection check succeeded", {
        status: response.status,
        keyPresent: true,
      });
    } else {
      console.error("[OpenRouter] Startup connection check failed", {
        status: response.status,
        response: responseText,
        keyPresent: true,
      });
    }
  } catch (error) {
    console.error("[OpenRouter] Startup connection check threw", error);
  }
}

async function fetchImageAsBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch image URL: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function callOpenRouterImageWithModel(
  model: string,
  prompt: string,
  logoBase64?: string,
  layout: "feed" | "story" = "feed",
): Promise<Buffer> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY not set");

  // ── With logo: try the edits endpoint (reference image) ──────────────────
  if (logoBase64?.trim()) {
    try {
      const logoData  = logoBase64.includes(",") ? logoBase64.split(",")[1] : logoBase64;
      const mimeType  = logoBase64.startsWith("data:image/png") ? "image/png" : "image/jpeg";
      const logoBytes = Buffer.from(logoData, "base64");
      const logoBlob  = new Blob([logoBytes], { type: mimeType });

      const form = new FormData();
       form.append("model",           model);
      form.append("prompt",          prompt);
      form.append("n",               "1");
       form.append("size",            layout === "story" ? "1080x1920" : "1080x1080");
      form.append("quality",         "high");
      form.append("response_format", "b64_json");
      form.append("image[]",         logoBlob, "logo.png");

      const res = await fetch(`${OPENROUTER_IMG_URL}/edits`, {
        method:  "POST",
        headers: { Authorization: `Bearer ${key}` },
        body:    form,
         signal:  AbortSignal.timeout(IMAGE_GENERATION_TIMEOUT_MS),
      });

      if (res.ok) {
        const json = await res.json() as OpenRouterImageResponse;
        const item = json.data?.[0];
        if (item?.b64_json) return Buffer.from(item.b64_json, "base64");
        if (item?.url)      return fetchImageAsBuffer(item.url);
      } else {
        const errText = await res.text();
         console.warn(`[ImageGen] ${model} edits endpoint failed (${res.status}): ${errText} — falling back to text-only`);
      }
    } catch (editErr) {
       console.warn(`[ImageGen] ${model} edits endpoint threw:`, editErr);
    }
  }

  // ── Text-only generation ─────────────────────────────────────────────────
  const requestBody = {
    model,
    prompt,
    n:               1,
     size:            layout === "story" ? "1080x1920" : "1080x1080",
    quality:         "high",
    response_format: "b64_json",
  };
  console.log("[ImageGen] OpenRouter request", {
    url: `${OPENROUTER_IMG_URL}/generations`,
    method: "POST",
    timeoutMs: IMAGE_GENERATION_TIMEOUT_MS,
    body: requestBody,
    authorization: "[REDACTED]",
  });
  const res = await fetch(`${OPENROUTER_IMG_URL}/generations`, {
    method:  "POST",
    headers: {
      Authorization:  `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
     signal: AbortSignal.timeout(IMAGE_GENERATION_TIMEOUT_MS),
  });

  if (!res.ok) {
    const errText = await res.text();
     throw new Error(`${model} returned HTTP ${res.status}: ${errText}`);
  }

  const json = await res.json() as OpenRouterImageResponse;
  console.log("[ImageGen] OpenRouter response", {
    status: res.status,
    itemCount: json.data?.length ?? 0,
    hasBase64: Boolean(json.data?.[0]?.b64_json),
    imageUrl: json.data?.[0]?.url ?? null,
  });
  const item = json.data?.[0];
   if (!item) throw new Error(`${model} returned no image data`);
  if (item.b64_json) return Buffer.from(item.b64_json, "base64");
  if (item.url)      return fetchImageAsBuffer(item.url);
   throw new Error(`${model} returned neither b64_json nor an image URL`);
}

async function callOpenRouterImage(prompt: string, logoBase64?: string, layout: "feed" | "story" = "feed"): Promise<Buffer> {
  const failures: string[] = [];

  for (const model of IMAGE_MODELS) {
    try {
      console.log(`[ImageGen] Attempting model: ${model}`);
       return await callOpenRouterImageWithModel(model, prompt, logoBase64, layout);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      failures.push(`${model}: ${detail}`);
      console.error(`[ImageGen] Model failed: ${model}`, error);
    }
  }

  const error = new Error(
    `Image generation failed after ${IMAGE_MODELS.length} model attempts. ${failures.join(" | ")}`,
  );
  console.error("[ImageGen] Full fallback chain failed", {
    models: IMAGE_MODELS,
    timeoutMs: IMAGE_GENERATION_TIMEOUT_MS,
    failures,
  });
  throw error;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function generatePromoImage(
  prompt: string,
  flyerData?: FlyerData
): Promise<{ imageBase64: string; source: "ai" | "svg"; usedRealPhoto: boolean }> {
  try {
    const compliantPrompt = rewritePromptForCompliance(prompt).prompt;
    const data: FlyerData = flyerData ?? { strainName: extractStrainName(compliantPrompt) };
    if (!data.strainType && !isGeneralPost(compliantPrompt, flyerData)) {
      data.strainType = detectStrainType(compliantPrompt) ?? detectStrainType(data.strainName) ?? undefined;
    }

   const format = detectContentFormat(compliantPrompt, data);
   const general = format === "STORE_ANNOUNCEMENT" || format === "EDUCATIONAL_CONTENT" || format === "BRAND_AWARENESS";

  let aiPrompt: string;
  if (general) {
    console.log(`[ImageGen] Detected general store post — generating brand lifestyle image`);
     aiPrompt = buildGeneralPostPrompt(data, format);
  } else {
    const theme   = buildStrainTheme(data.strainName, compliantPrompt, data.productType);
    // Inject brand color into theme bg description if brand has a primary color
    let bgArtDesc = theme.bgArtDesc;
    if (data.brandPrimaryHex) {
      const colorDesc = hexToColorDescription(data.brandPrimaryHex);
      bgArtDesc = `${theme.bgArtDesc}, with ${colorDesc} metallic light ribbons and accent streams woven throughout`;
    }
    const enrichedTheme = { ...theme, bgArtDesc };
    console.log(`[ImageGen] Generating product post for "${data.strainName}" (${data.productType ?? "Flower"})`);
     aiPrompt = buildProductPrompt(data, enrichedTheme, format);
  }

  console.log(`[ImageGen] Model chain: ${IMAGE_MODELS.join(" → ")} | Prompt length: ${aiPrompt.length} chars`);

   const imageBuffer = await callOpenRouterImage(aiPrompt, data.logoBase64, data.layout);
  const b64 = imageBuffer.toString("base64");

  // Detect PNG vs JPEG by magic bytes
  const isPng = imageBuffer[0] === 0x89 && imageBuffer[1] === 0x50;
  const mimeType = isPng ? "image/png" : "image/jpeg";

    return {
      imageBase64:   `data:${mimeType};base64,${b64}`,
      source:        "ai",
      usedRealPhoto: false,
    };
  } catch (error) {
    console.error("[ImageGen] generatePromoImage failed cleanly", error);
    throw error instanceof Error ? error : new Error(String(error));
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function detectStrainType(text: string): string | null {
  if (/\bindica\b/i.test(text)) return "Indica";
  if (/\bsativa\b/i.test(text)) return "Sativa";
  if (/\bhybrid\b/i.test(text)) return "Hybrid";
  return null;
}

function extractStrainName(prompt: string): string {
  const stopWords = new Set(["a", "an", "the", "our", "new", "this", "is", "are", "we", "for", "and", "or", "with", "featuring", "in", "on", "at", "by", "of", "to"]);
  const words = prompt.split(/\s+/).filter((w) => {
    const clean = w.replace(/[^a-zA-Z]/g, "").toLowerCase();
    return clean.length > 1 && !stopWords.has(clean);
  });
  return words.slice(0, 3).join(" ") || prompt.slice(0, 20);
}

function splitStrain(name: string): string[] {
  const words = name.toUpperCase().trim().split(/\s+/);
  if (words.length <= 2) return [words.join(" ")];
  const mid = Math.ceil(words.length / 2);
  return [words.slice(0, mid).join(" "), words.slice(mid).join(" ")];
}

// ─── SVG Emergency Fallback ───────────────────────────────────────────────────
// Used only when the OpenRouter API call fails entirely.

function escapeXml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if ((current + " " + word).trim().length > maxChars) {
      if (current) lines.push(current.trim());
      current = word;
    } else {
      current = (current + " " + word).trim();
    }
  }
  if (current) lines.push(current.trim());
  return lines.slice(0, 4);
}

function wrapWarningText(text: string, maxCharsPerLine: number): string[] {
  return wrapText(text, maxCharsPerLine);
}

interface Palette {
  bg1: string; bg2: string; bg3: string;
  accent: string; textPrimary: string; textSecondary: string; frameStroke: string; label: string;
}

const PALETTES: Palette[] = [
  { label: "Emerald & Gold",       bg1: "#0a1a0f", bg2: "#0d2414", bg3: "#061009", accent: "#c9a84c", textPrimary: "#f5f0e8", textSecondary: "#a8bba0", frameStroke: "#c9a84c" },
  { label: "Midnight & Rose Gold", bg1: "#110d1a", bg2: "#1a1228", bg3: "#0a0810", accent: "#c49a6c", textPrimary: "#f7f2ee", textSecondary: "#9b8fa8", frameStroke: "#c49a6c" },
  { label: "Obsidian & Copper",    bg1: "#111110", bg2: "#1a1916", bg3: "#0a0908", accent: "#b87333", textPrimary: "#f4efe8", textSecondary: "#a09080", frameStroke: "#b87333" },
  { label: "Forest & Cream",       bg1: "#0e1a12", bg2: "#152218", bg3: "#080f0a", accent: "#e8dcc8", textPrimary: "#f5f2ec", textSecondary: "#9db89f", frameStroke: "#e8dcc8" },
  { label: "Noir & Sage",          bg1: "#0f110e", bg2: "#171a15", bg3: "#080a07", accent: "#8fad82", textPrimary: "#eef2ea", textSecondary: "#7a9170", frameStroke: "#8fad82" },
];

function detectCategory(prompt: string): { label: string; paletteIndex: number } {
  const p = prompt.toLowerCase();
  if (/edible|gummy|gummies|chocolate|cookie|brownie|capsule|beverage|drink/.test(p)) return { label: "EDIBLES",         paletteIndex: 2 };
  if (/pre.?roll|joint|blunt/.test(p))                                               return { label: "PRE-ROLLS",        paletteIndex: 0 };
  if (/vape|cartridge|cart|pen/.test(p))                                             return { label: "VAPORIZERS",       paletteIndex: 1 };
  if (/concentrate|shatter|wax|rosin|hash|extract|live resin|badder/.test(p))       return { label: "CONCENTRATES",     paletteIndex: 3 };
  if (/tincture|oil|sublingual|drop/.test(p))                                       return { label: "TINCTURES & OILS", paletteIndex: 4 };
  if (/indica|sativa|hybrid|strain|flower|bud|oz|gram/.test(p))                    return { label: "PREMIUM FLOWER",   paletteIndex: 0 };
  return { label: "FEATURED PRODUCT", paletteIndex: 0 };
}

function extractHeadline(prompt: string): string {
  const stopWords = new Set(["a", "an", "the", "our", "new", "this", "is", "are", "we", "and", "or", "for", "to", "of", "in", "on", "at", "with", "featuring"]);
  const words = prompt.split(/\s+/).map(w => w.replace(/[^a-zA-Z0-9']/g, "")).filter(w => w.length > 2 && !stopWords.has(w.toLowerCase()));
  return words.slice(0, 3).join(" ").toUpperCase() || prompt.slice(0, 18).toUpperCase();
}

export function generatePromoImageSVG(prompt: string): string {
  const { label: categoryLabel, paletteIndex } = detectCategory(prompt);
  const p = PALETTES[paletteIndex];
  const headline = extractHeadline(prompt);
  const headlineLines = wrapText(headline, 16);
  const fullLines = wrapText(prompt.toUpperCase(), 22);
  const subLines = fullLines.slice(0, 2);
  const seed = prompt.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const headlineY = 490;
  const headlineLineH = 88;
  const headlineBlockH = headlineLines.length * headlineLineH;

  const headlineSVG = headlineLines.map((line, i) =>
    `<text x="512" y="${headlineY + i * headlineLineH}" text-anchor="middle" font-family="'Georgia','Times New Roman',serif" font-size="${headlineLines.length > 1 ? 86 : 96}" font-weight="bold" fill="${p.textPrimary}" letter-spacing="2">${escapeXml(line)}</text>`
  ).join("\n    ");
  const subLabelY = headlineY + headlineBlockH + 30;
  const subLabelSVG = subLines.map((line, i) =>
    `<text x="512" y="${subLabelY + i * 34}" text-anchor="middle" font-family="'Arial',sans-serif" font-size="22" font-weight="400" fill="${p.textSecondary}" letter-spacing="3" opacity="0.85">${escapeXml(line)}</text>`
  ).join("\n    ");
  const dividerY = headlineY - headlineBlockH * 0.25 - 60;
  const m = 52; const cl = 36;
  const corners = `<line x1="${m}" y1="${m}" x2="${m+cl}" y2="${m}" stroke="${p.frameStroke}" stroke-width="2" opacity="0.7"/><line x1="${m}" y1="${m}" x2="${m}" y2="${m+cl}" stroke="${p.frameStroke}" stroke-width="2" opacity="0.7"/><line x1="${1024-m}" y1="${m}" x2="${1024-m-cl}" y2="${m}" stroke="${p.frameStroke}" stroke-width="2" opacity="0.7"/><line x1="${1024-m}" y1="${m}" x2="${1024-m}" y2="${m+cl}" stroke="${p.frameStroke}" stroke-width="2" opacity="0.7"/><line x1="${m}" y1="${1024-m}" x2="${m+cl}" y2="${1024-m}" stroke="${p.frameStroke}" stroke-width="2" opacity="0.7"/><line x1="${m}" y1="${1024-m}" x2="${m}" y2="${1024-m-cl}" stroke="${p.frameStroke}" stroke-width="2" opacity="0.7"/><line x1="${1024-m}" y1="${1024-m}" x2="${1024-m-cl}" y2="${1024-m}" stroke="${p.frameStroke}" stroke-width="2" opacity="0.7"/><line x1="${1024-m}" y1="${1024-m}" x2="${1024-m}" y2="${1024-m-cl}" stroke="${p.frameStroke}" stroke-width="2" opacity="0.7"/>`;

  const fallbackWarning = HEALTH_CANADA_WARNINGS[seed % HEALTH_CANADA_WARNINGS.length];
  const fallbackLines   = wrapWarningText(fallbackWarning, 60);
  const fbFS = 19; const fbLH = 26;
  const fbTH = fallbackLines.length * fbLH;
  const fbY  = 972 + Math.round((108 - fbTH) / 2) + fbFS;
  const fallbackWarnSVG = fallbackLines
    .map((line, i) => `<text x="512" y="${fbY + i * fbLH}" text-anchor="middle" font-family="'Arial',sans-serif" font-size="${fbFS}" font-weight="700" fill="#000000">${escapeXml(line)}</text>`)
    .join("\n  ");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="${p.bg2}"/><stop offset="50%" stop-color="${p.bg1}"/><stop offset="100%" stop-color="${p.bg3}"/></linearGradient>
    <radialGradient id="spotlight" cx="50%" cy="45%" r="55%"><stop offset="0%" stop-color="${p.accent}" stop-opacity="0.07"/><stop offset="100%" stop-color="${p.accent}" stop-opacity="0"/></radialGradient>
    <filter id="headlineglow"><feGaussianBlur stdDeviation="3" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <rect width="1024" height="1024" fill="url(#bgGrad)"/>
  <ellipse cx="512" cy="460" rx="480" ry="480" fill="url(#spotlight)"/>
  <rect x="0" y="0" width="1024" height="220" fill="${p.bg3}" opacity="0.35"/>
  <rect x="40" y="40" width="944" height="888" fill="none" stroke="${p.frameStroke}" stroke-width="0.75" opacity="0.2"/>
  ${corners}
  <g transform="translate(984,57)">
    <polygon points="9,-22 22,-9 22,9 9,22 -9,22 -22,9 -22,-9 -9,-22" fill="#CC0000"/>
    <g fill="white"><rect x="-1.5" y="2" width="3" height="12" rx="1.5"/><path d="M0,-2.5 C-2.5,-7 -4,-16 0,-18 C4,-16 2.5,-7 0,-2.5Z"/><path d="M1,-6.5 C4.5,-9.5 12,-11.5 13.5,-8 C10.5,-4 5.5,-5.5 1,-4Z"/><path d="M-1,-6.5 C-4.5,-9.5 -12,-11.5 -13.5,-8 C-10.5,-4 -5.5,-5.5 -1,-4Z"/><path d="M2,-1 C6.5,-1.5 14.5,2 14.5,6.5 C9.5,7 4.5,1.5 2,0.5Z"/><path d="M-2,-1 C-6.5,-1.5 -14.5,2 -14.5,6.5 C-9.5,7 -4.5,1.5 -2,0.5Z"/></g>
  </g>
  <text x="512" y="136" text-anchor="middle" font-family="'Arial','Helvetica',sans-serif" font-size="13" font-weight="700" fill="${p.accent}" letter-spacing="10" opacity="0.9">${escapeXml(categoryLabel)}</text>
  <line x1="200" y1="${dividerY}" x2="824" y2="${dividerY}" stroke="${p.frameStroke}" stroke-width="1" opacity="0.35"/>
  <g filter="url(#headlineglow)">${headlineSVG}</g>
  <line x1="312" y1="${headlineY + headlineBlockH + 4}" x2="712" y2="${headlineY + headlineBlockH + 4}" stroke="${p.accent}" stroke-width="1" opacity="0.45"/>
  ${subLabelSVG}
  <text x="512" y="958" text-anchor="middle" font-family="'Arial','Helvetica',sans-serif" font-size="14" fill="${p.textSecondary}" letter-spacing="3" opacity="0.6">19+ · ONTARIO RESIDENTS ONLY</text>
  <rect x="0" y="972" width="1024" height="108" fill="#FFC107"/>
  <rect x="0" y="972" width="10" height="108" fill="#000000"/>
  ${fallbackWarnSVG}
</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}
