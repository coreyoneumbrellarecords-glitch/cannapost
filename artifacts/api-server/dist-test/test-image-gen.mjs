import { createRequire as __bannerCrReq } from 'node:module';
import __bannerPath from 'node:path';
import __bannerUrl from 'node:url';
globalThis.require = __bannerCrReq(import.meta.url);
globalThis.__filename = __bannerUrl.fileURLToPath(import.meta.url);
globalThis.__dirname = __bannerPath.dirname(globalThis.__filename);


// src/lib/imageGenerator.ts
var DEFAULT_IMAGE_MODEL = "openai/gpt-5-image";
var IMAGE_MODEL = process.env.OPENROUTER_IMAGE_MODEL?.trim() || DEFAULT_IMAGE_MODEL;
var IMAGE_GENERATION_TIMEOUT_MS = 18e4;
var IMAGE_MODELS = [
  IMAGE_MODEL,
  "google/gemini-3.1-flash-image",
  "openai/gpt-5.4-image-2"
].filter((model, index, models) => models.indexOf(model) === index);
var OPENROUTER_IMG_URL = "https://openrouter.ai/api/v1/images";
var HEALTH_CANADA_WARNINGS = [
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
  "WARNING: Cannabis can cause cannabis hyperemesis syndrome \u2014 a cycle of severe nausea and vomiting."
];
var PRODUCT_TERMS = /\b(thc|cbd|indica|sativa|hybrid|flower|strain|pre.?rolls?|vapes?|cartridges?|edibles?|gumm(?:y|ies)|concentrates?|shatter|wax|rosin|hash|extracts?|grams?|ounces?|oz|mg)\b/i;
var EDUCATIONAL_TERMS = /\b(terpenes?|genetics?|lineage|cannabinoids?|how to choose|learn|guide|education|difference between|what is)\b/i;
var ANNOUNCEMENT_TERMS = /\b(grand opening|now open|opening soon|store hours?|holiday hours?|come visit|visit us|stop by|announcement|vendor pop[- ]?up|pop[- ]?up|in[- ]store event|store event|new arrivals?|closed (today|tomorrow)|location update)\b/i;
var KNOWN_STRAIN_TERMS = /\b(blue dream|pink goo|pink gas|black mountain side|perma fried|northern lights|purple punch|granddaddy purple|grape ape|mimosa|tropicana|gelato|runtz|wedding cake|ice cream cake|kush|og kush|sour diesel|girl scout cookies|gsc)\b/i;
function detectContentFormat(prompt, data) {
  const text = `${prompt} ${data?.productType ?? ""}`.toLowerCase();
  const hasSpecificStrain = (Boolean(data?.strainType?.trim() || data?.thcPercent?.trim()) || KNOWN_STRAIN_TERMS.test(`${prompt} ${data?.strainName ?? ""}`)) && !/^(featured product|product|new arrival)$/i.test(data?.strainName?.trim() ?? "");
  if (hasSpecificStrain || /\b(strain spotlight|strain post|flower strain)\b/i.test(text)) return "STRAIN_SPOTLIGHT";
  if (ANNOUNCEMENT_TERMS.test(text) && !PRODUCT_TERMS.test(text) && !data?.thcPercent) return "STORE_ANNOUNCEMENT";
  if (PRODUCT_TERMS.test(text)) return "PRODUCT_CATEGORY_FEATURE";
  if (EDUCATIONAL_TERMS.test(text)) return "EDUCATIONAL_CONTENT";
  return "BRAND_AWARENESS";
}
function rewritePromptForCompliance(prompt) {
  const rules = [
    [/\b(helps? with|relieves?|treats?|good for (anxiety|sleep)|medical|therapeutic|pain relief)\b/gi, "product information"],
    [/\b(be more creative|feel better|enhance your experience|uplifting|energizing)\b/gi, "distinctive"],
    [/\b\d+\s*% off|buy one get one|bogo|free with purchase|free (?:cannabis|product|gift)\b/gi, "available in store"],
    [/\b(best|strongest|superior|more potent)\b/gi, "featured"],
    [/\b(smoking|smoke|vaping|vape clouds?|consuming|consumption)\b/gi, "product presentation"],
    [/\b(cartoon|mascot|fictional character|kid(?:s)?|youth|child(?:ren)?|animal)\b/gi, "abstract design"]
  ];
  let rewritten = prompt;
  for (const [pattern, replacement] of rules) rewritten = rewritten.replace(pattern, replacement);
  return { prompt: rewritten, wasRewritten: rewritten !== prompt };
}
function hexToColorDescription(hex) {
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
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
  else if (max === g) h = ((b - r) / d + 2) * 60;
  else h = ((r - g) / d + 4) * 60;
  if (h < 15 || h >= 345) return l > 0.5 ? "vivid rose red" : "deep crimson red";
  if (h < 40) return l > 0.5 ? "warm orange" : "deep burnt orange";
  if (h < 70) return l > 0.5 ? "radiant golden yellow" : "rich amber gold";
  if (h < 155) return l > 0.5 ? "electric lime green" : "deep forest emerald green";
  if (h < 200) return l > 0.5 ? "vivid cyan teal" : "deep dark teal";
  if (h < 255) return l > 0.5 ? "electric cobalt blue" : "deep midnight blue";
  if (h < 290) return l > 0.5 ? "vivid violet blue" : "deep indigo";
  if (h < 325) return l > 0.5 ? "vivid royal purple" : "deep royal purple";
  return l > 0.5 ? "vibrant hot pink" : "deep magenta";
}
var BASE_ART_SUFFIX = "no photorealistic cannabis buds, no cannabis plant imagery, no marijuana leaf, no weed, no text rendered in the background art";
function buildStrainTheme(strainName, userPrompt, productType) {
  const combined = (strainName + " " + userPrompt + " " + (productType ?? "")).toLowerCase();
  const name = strainName.trim();
  const pt = (productType ?? "").toLowerCase();
  const isEdible = /edible|gummy|gummies|chocolate|brownie|cookie|capsule|beverage|drink|chew/i.test(pt + " " + combined);
  const isVape = /vape|cartridge|cart|510|pod|pen/i.test(pt + " " + combined);
  const isCbd = /\bcbd\b|tincture|sublingual|drop|spray/i.test(pt + " " + combined) && !/concentrate|shatter|wax|rosin/i.test(combined);
  const isConc = /concentrate|shatter|wax|rosin|hash|kief|live.?resin|badder|budder|crumble|dab/i.test(pt + " " + combined);
  const isAccessory = /accessor|pipe|bong|rig|grinder|paper|tray|lighter|glass/i.test(pt + " " + combined);
  if (/blue\s?dream/i.test(name)) return {
    bgArtDesc: `ethereal cobalt blue dreamscape, swirling electric blue and lavender aurora wave ribbons, hyper-realistic plump blueberries glowing with inner sapphire light, prismatic sapphire and violet light refractions, holographic chrome ribbon streams, silk ribbons in periwinkle and royal blue, ${BASE_ART_SUFFIX}`,
    accentColor: "#60a5fa",
    typoDesc: "gradient from bright sky blue at top to deep navy blue at bottom, metallic azure sheen, cool blue glow"
  };
  if (/granddaddy\s?purple|gdp\b/i.test(name)) return {
    bgArtDesc: `majestic amethyst crystal formations, aurora borealis ribbons in deep violet and indigo, plump grape clusters with jewel-like purple inner light, liquid violet mercury streams, silk ribbons in royal purple, scattered amethyst gemstones, ${BASE_ART_SUFFIX}`,
    accentColor: "#c084fc",
    typoDesc: "gradient from soft lavender at top to deep royal purple at bottom, amethyst glow, violet metallic sheen"
  };
  if (/sour\s?diesel/i.test(name)) return {
    bgArtDesc: `industrial high-voltage art, chrome steel pipe architecture with acid yellow liquid racing through them, electric lightning arc bursts in neon yellow-green, liquid metal chrome drips, neon citrus-acid yellow explosions against deep charcoal, chrome vapor streams, ${BASE_ART_SUFFIX}`,
    accentColor: "#facc15",
    typoDesc: "gradient from bright neon yellow at top to deep amber at bottom, electric chrome sheen, acid yellow glow"
  };
  if (/og\s?kush/i.test(name)) return {
    bgArtDesc: `ancient earth luxury, warm amber and terracotta geological abstract formations, aged bronze and antique gold metallic accents, warm earthy ochre abstract patterns, copper and deep amber abstract streams, heritage atmosphere, ${BASE_ART_SUFFIX}`,
    accentColor: "#d97706",
    typoDesc: "gradient from bright gold at top to deep bronze at bottom, aged copper sheen, warm amber glow"
  };
  if (/wedding\s?cake/i.test(name)) return {
    bgArtDesc: `elegant bridal luxury, ivory white fondant rose formations with rose gold ribbon details, white royal icing drip streams, scattered gold leaf flakes and pearl elements, champagne bubble streams, pristine white and rose gold silk ribbons, ${BASE_ART_SUFFIX}`,
    accentColor: "#fbbf24",
    typoDesc: "gradient from soft champagne ivory at top to warm gold at bottom, rose gold metallic sheen, pearl glow"
  };
  if (/\bgelato\b/i.test(name)) return {
    bgArtDesc: `Italian artisan gelato luxury, rich swirling lavender and pistachio green gelato ribbon formations, candied pistachio elements, warm vanilla gold silk ribbon flows, dried lavender blossoms glowing softly, Italian confectionery couture, ${BASE_ART_SUFFIX}`,
    accentColor: "#c084fc",
    typoDesc: "gradient from soft lavender at top to deep rose pink at bottom, creamy pastel metallic sheen, purple glow"
  };
  if (/zkittlez|skittlez/i.test(name)) return {
    bgArtDesc: `explosive rainbow candy luxury, glossy 3D fruit candy jewels in every color \u2014 vivid red cherry electric orange acid yellow electric green royal purple \u2014 floating throughout, glossy fruit-candy liquid drips in rainbow streams, holographic ribbon flows, ${BASE_ART_SUFFIX}`,
    accentColor: "#f97316",
    typoDesc: "gradient from bright orange at top to deep purple at bottom, rainbow holographic sheen, warm orange glow"
  };
  if (/\bruntz\b/i.test(name)) return {
    bgArtDesc: `glossy luxury candy store, rainbow hard candy jewels with holographic glaze, pastel candy cloud formations in electric pink lavender mint and bubblegum yellow, candy paint pour ribbons, iridescent foil streams, ${BASE_ART_SUFFIX}`,
    accentColor: "#f472b6",
    typoDesc: "gradient from soft pink at top to deep violet at bottom, iridescent candy sheen, pink glow"
  };
  if (/pink\s?kush/i.test(name)) return {
    bgArtDesc: `bold luxury pink editorial, powerful hot pink and candy-rose abstract formations, neon candy-pink atmospheric glow, cherry blossom petals floating, liquid hot pink streams, electric magenta and deep rose silk ribbons, ${BASE_ART_SUFFIX}`,
    accentColor: "#f472b6",
    typoDesc: "gradient from hot pink at top to deep crimson at bottom, neon pink metallic sheen, magenta glow"
  };
  if (/pink\s?goo/i.test(name)) return {
    bgArtDesc: `glossy candy fantasy, dripping glossy pink candy glaze rivers, floating oversized lollipops and candy swirl elements, pink crystallized sugar formations glistening, candy pink and rose gold silk ribbons, liquid cotton candy streams, ${BASE_ART_SUFFIX}`,
    accentColor: "#f9a8d4",
    typoDesc: "gradient from light candy pink at top to deep rose at bottom, glossy candy sheen, bubblegum glow"
  };
  if (/pink\s?gas/i.test(name)) return {
    bgArtDesc: `industrial pink luxury, chrome steel pipes dripping with neon pink liquid, electric hot pink energy explosion bursts with metallic chrome drips, high-voltage industrial aesthetic fused with candy-pink glamour, ${BASE_ART_SUFFIX}`,
    accentColor: "#f472b6",
    typoDesc: "oversized polished chrome industrial letters with deep extrusion, hot-pink reflected highlights, chrome-pink metallic sheen, neon pink glow"
  };
  if (/black\s?mountain\s?side/i.test(name)) return {
    bgArtDesc: `dramatic midnight mountain landscape, monumental black mountain silhouettes, violet lightning energy splitting a stormy purple sky, flowing dark silk clouds and subtle chrome streams, cinematic atmospheric depth, ${BASE_ART_SUFFIX}`,
    accentColor: "#a78bfa",
    typoDesc: "clean monumental bold white dimensional letters with a subtle silver edge, restrained extrusion, crisp contrast against the mountain scene"
  };
  if (/perma\s?fried/i.test(name)) return {
    bgArtDesc: `bright teal tropical graphic world, glossy abstract liquid shapes, luminous aqua and turquoise silk ribbons, stylized tropical forms, saturated cyan atmosphere, polished editorial reflections, ${BASE_ART_SUFFIX}`,
    accentColor: "#2dd4bf",
    typoDesc: "large vibrant teal-to-white dimensional letters with glossy lacquer, thick rounded extrusion, bright tropical cyan glow"
  };
  if (/northern\s?lights/i.test(name)) return {
    bgArtDesc: `breathtaking aurora borealis, electric teal and emerald green aurora ribbons dancing across deep indigo midnight sky, violet and aqua light curtains shimmering, crystalline polar star formations, arctic night luxury, ${BASE_ART_SUFFIX}`,
    accentColor: "#34d399",
    typoDesc: "gradient from bright emerald green at top to deep forest green at bottom, aurora metallic sheen, teal glow"
  };
  if (/ice\s?cream\s?cake/i.test(name)) return {
    bgArtDesc: `premium ice cream dessert luxury, swirling vanilla soft-serve and deep grape ice cream ribbon formations intertwining, glossy drip streams in cream and purple, waffle cone accents, rainbow sprinkles floating, ${BASE_ART_SUFFIX}`,
    accentColor: "#c084fc",
    typoDesc: "gradient from cream yellow at top to deep purple at bottom, ice cream pastel metallic sheen, soft purple glow"
  };
  if (/girl\s?scout\s?cook|gsc\b/i.test(name)) return {
    bgArtDesc: `warm artisan bakery luxury, glossy caramel-dipped abstract formations, warm amber and brown sugar drip streams, chocolate chip elements glowing warmly, golden butterscotch silk ribbons flowing, ${BASE_ART_SUFFIX}`,
    accentColor: "#d97706",
    typoDesc: "gradient from golden yellow at top to deep chocolate brown at bottom, caramel metallic sheen, warm amber glow"
  };
  if (/gorilla\s?glue|gg4\b/i.test(name)) return {
    bgArtDesc: `dark powerful industrial luxury, deep charcoal and forest emerald heavy texture formations, thick resin-like dark glue abstract drip structures, electric green neon accent light streams, chrome and forest green metallic elements, ${BASE_ART_SUFFIX}`,
    accentColor: "#4ade80",
    typoDesc: "gradient from bright neon green at top to deep forest green at bottom, dark chrome metallic sheen, emerald glow"
  };
  if (/pineapple\s?express/i.test(name)) return {
    bgArtDesc: `tropical luxury, hyper-realistic sliced pineapple elements with golden inner light, electric tropical yellow and vivid teal abstract flows, holographic tropical ribbon streams, golden pineapple juice splash effects, ${BASE_ART_SUFFIX}`,
    accentColor: "#facc15",
    typoDesc: "gradient from bright tropical yellow at top to deep teal at bottom, golden metallic sheen, warm yellow glow"
  };
  if (/sunset\s?sherbet/i.test(name)) return {
    bgArtDesc: `warm sunset luxury, sweeping gradient layers from deep coral orange to sherbet pink and warm amber gold, atmospheric golden-hour light ribbons, soft sherbet ice cream swirl formations, peach and rose gold silk ribbons, ${BASE_ART_SUFFIX}`,
    accentColor: "#fb923c",
    typoDesc: "gradient from peach orange at top to deep coral at bottom, sherbet metallic sheen, warm sunset glow"
  };
  if (/\bmac\b|miracle\s?alien/i.test(name)) return {
    bgArtDesc: `otherworldly alien luxury, iridescent silver and deep cosmic purple flowing shapes, holographic liquid metal in shifting rainbow iridescence, alien crystal formations with prismatic light, cosmic nebula clouds with silver mercury streams, ${BASE_ART_SUFFIX}`,
    accentColor: "#818cf8",
    typoDesc: "gradient from soft periwinkle at top to deep indigo at bottom, iridescent holographic metallic sheen, cosmic glow"
  };
  if (/cereal\s?milk/i.test(name)) return {
    bgArtDesc: `nostalgic luxury cereal editorial, creamy milk pour streams with rainbow cereal jewel-clusters floating, pastel candy-colored spheres in pink blue yellow and green, glossy milk-wash formations, rainbow and cream silk ribbons, ${BASE_ART_SUFFIX}`,
    accentColor: "#f472b6",
    typoDesc: "gradient from soft cream at top to deep violet at bottom, milky pastel metallic sheen, soft pink glow"
  };
  if (/mimosa/i.test(name)) return {
    bgArtDesc: `effervescent champagne brunch luxury, golden champagne bubble streams rising elegantly, blood orange citrus slice elements glowing with warm light, sparkling gold and orange light ribbons, rose gold metallic accents and tangerine silk flows, ${BASE_ART_SUFFIX}`,
    accentColor: "#f97316",
    typoDesc: "gradient from sparkling gold at top to deep coral orange at bottom, champagne metallic sheen, orange glow"
  };
  if (/wedding\s?cake/i.test(name)) return {
    bgArtDesc: `elegant bridal luxury editorial, ivory white fondant roses with rose gold ribbon details, white royal icing drip streams, scattered gold leaf and pearl elements, champagne bubble streams, white and rose gold silk ribbons, ${BASE_ART_SUFFIX}`,
    accentColor: "#fbbf24",
    typoDesc: "gradient from ivory champagne at top to warm gold at bottom, bridal rose gold sheen, pearl glow"
  };
  if (/london\s?pound\s?cake/i.test(name)) return {
    bgArtDesc: `regal British luxury, deep royal purple and champagne gold cake-drip formations, gold fondant ribbon drapes, antique gold metallic accents against deep purple, sophisticated luxury couture with royal purple and antique gold silk ribbons, ${BASE_ART_SUFFIX}`,
    accentColor: "#a855f7",
    typoDesc: "gradient from soft lavender at top to deep royal purple at bottom, antique gold metallic sheen, regal purple glow"
  };
  if (/apple\s?fritter/i.test(name)) return {
    bgArtDesc: `warm artisan bakery luxury, glossy caramel apple elements with green and golden inner glow, swirling caramel amber and fresh green formations, cinnamon gold drip streams, green apple and caramel silk ribbons, ${BASE_ART_SUFFIX}`,
    accentColor: "#f59e0b",
    typoDesc: "gradient from bright yellow-green at top to deep caramel at bottom, caramel apple sheen, warm golden glow"
  };
  if (/jack\s?herer/i.test(name)) return {
    bgArtDesc: `legendary sativa luxury, heroic gold and warm amber dynamic formations radiating outward, bright citrus-gold light streams, warm amber abstract shapes, electric gold and copper metallic ribbons, legendary pioneer atmosphere, ${BASE_ART_SUFFIX}`,
    accentColor: "#f59e0b",
    typoDesc: "gradient from bright gold at top to deep copper at bottom, legendary golden metallic sheen, warm amber glow"
  };
  if (/white\s?widow/i.test(name)) return {
    bgArtDesc: `frost-white arctic luxury, luminous crystalline ice formations catching cold light, silver-white aurora ribbons across dark slate, shattered crystal ice shards with inner white glow, platinum and silver metallic streams, ${BASE_ART_SUFFIX}`,
    accentColor: "#e2e8f0",
    typoDesc: "gradient from pure white at top to cool silver at bottom, platinum metallic sheen, icy white glow"
  };
  if (/blueberry/i.test(name)) return {
    bgArtDesc: `hyper-realistic plump blueberry clusters with jewel-like sapphire inner light, liquid cobalt blue abstract silk ribbons, prismatic blue and indigo light refractions, deep navy to electric blue gradient atmosphere, ${BASE_ART_SUFFIX}`,
    accentColor: "#60a5fa",
    typoDesc: "gradient from bright sky blue at top to deep navy at bottom, sapphire metallic sheen, blue glow"
  };
  if (/strawberry/i.test(name)) return {
    bgArtDesc: `hyper-realistic glossy strawberry elements with vivid ruby inner glow, liquid strawberry candy drip streams in crimson and rose, strawberry seed patterns scattered, lush red and rose gold silk ribbons, ${BASE_ART_SUFFIX}`,
    accentColor: "#f43f5e",
    typoDesc: "gradient from bright rose red at top to deep crimson at bottom, ruby metallic sheen, rose glow"
  };
  if (/mango/i.test(name)) return {
    bgArtDesc: `golden mango tropical luxury, hyper-realistic mango elements glowing with warm tropical light, electric mango-yellow and deep teal abstract flows, liquid golden mango streams, holographic tropical ribbon flows, ${BASE_ART_SUFFIX}`,
    accentColor: "#f97316",
    typoDesc: "gradient from bright mango yellow at top to deep teal at bottom, tropical golden sheen, orange glow"
  };
  if (/lemon/i.test(name)) return {
    bgArtDesc: `hyper-realistic lemon slice elements with electric yellow inner glow, acid yellow abstract energy ribbons, electric citrus-gold light stream formations, vivid lemon and lime color palette, zesty luxury, ${BASE_ART_SUFFIX}`,
    accentColor: "#facc15",
    typoDesc: "gradient from bright lemon yellow at top to deep amber at bottom, acid citrus metallic sheen, electric yellow glow"
  };
  if (/banana/i.test(name)) return {
    bgArtDesc: `tropical banana luxury, glossy banana elements with warm golden yellow glow, sweeping amber and golden yellow formations, tropical heat with electric yellow and copper metallic streams, banana-yellow silk ribbons, ${BASE_ART_SUFFIX}`,
    accentColor: "#fbbf24",
    typoDesc: "gradient from bright banana yellow at top to deep copper at bottom, tropical golden sheen, warm yellow glow"
  };
  if (isEdible) {
    if (/chocolate|cocoa|cacao|brownie/i.test(combined)) return {
      bgArtDesc: `rich molten dark chocolate luxury, glossy dark chocolate rivers dripping with gold leaf flakes, warm deep cocoa brown formations with lustrous gold metallic accents, luxury confectionery couture, ${BASE_ART_SUFFIX}`,
      accentColor: "#d97706",
      typoDesc: "gradient from bright gold at top to deep chocolate brown at bottom, molten chocolate metallic sheen, amber glow"
    };
    if (/strawberry|raspberry|blueberry|cherry|berry|grape/i.test(combined)) return {
      bgArtDesc: `vibrant berry candy luxury, glossy ruby and crimson berry elements glowing with inner light, liquid candy-berry streams in vivid colors, holographic berry-pink ribbons, neon raspberry formations, ${BASE_ART_SUFFIX}`,
      accentColor: "#f43f5e",
      typoDesc: "gradient from bright berry pink at top to deep wine at bottom, ruby candy metallic sheen, crimson glow"
    };
    if (/lemon|lime|orange|citrus|tangerine/i.test(combined)) return {
      bgArtDesc: `electric citrus candy luxury, bright lemon and orange elements glowing, electric yellow and tangerine abstract candy formations, glossy citrus-drop liquid streams, neon citrus ribbons, ${BASE_ART_SUFFIX}`,
      accentColor: "#fbbf24",
      typoDesc: "gradient from bright citrus yellow at top to deep amber at bottom, electric citrus sheen, yellow glow"
    };
    if (/mint|menthol|spearmint/i.test(combined)) return {
      bgArtDesc: `crystalline arctic candy luxury, cool mint-green and icy white crystal formations, candy-cane swirl structures, silver holographic ribbons, arctic luxury with electric mint and silver streams, ${BASE_ART_SUFFIX}`,
      accentColor: "#34d399",
      typoDesc: "gradient from bright mint green at top to deep emerald at bottom, arctic silver metallic sheen, cool mint glow"
    };
    return {
      bgArtDesc: `rainbow candy shop luxury, glossy hard candy jewels in every color, candy paint pour rivers in vivid rainbow colors, holographic foil ribbon streams, luxury confectionery couture, ${BASE_ART_SUFFIX}`,
      accentColor: "#f472b6",
      typoDesc: "gradient from bright pink at top to deep purple at bottom, rainbow candy sheen, pink glow"
    };
  }
  if (isVape) return {
    bgArtDesc: `futuristic tech luxury, sleek chrome geometric forms with electric neon light trails, liquid metal chrome streams through holographic neon accents, angular high-tech shapes in chrome and electric blue, vapor-trail ribbon streams, ${BASE_ART_SUFFIX}`,
    accentColor: "#38bdf8",
    typoDesc: "gradient from bright electric blue at top to deep navy at bottom, chrome tech metallic sheen, electric blue glow"
  };
  if (isCbd) return {
    bgArtDesc: `clean botanical wellness luxury, luminous champagne gold and ivory white botanical element formations glowing softly, delicate botanical silhouettes in antique gold, pearl and platinum silk ribbon flows, sophisticated wellness luxury, ${BASE_ART_SUFFIX}`,
    accentColor: "#d4a017",
    typoDesc: "gradient from soft champagne gold at top to warm amber at bottom, pearl botanical metallic sheen, soft gold glow"
  };
  if (isConc) return {
    bgArtDesc: `golden amber extract luxury, rich liquid gold and deep amber flowing formations, premium resin-drip texture streams, metallic amber and bronze ribbon flows, warm crystalline amber atmosphere, ${BASE_ART_SUFFIX}`,
    accentColor: "#f59e0b",
    typoDesc: "gradient from bright golden amber at top to deep bronze at bottom, crystalline amber metallic sheen, warm gold glow"
  };
  if (isAccessory) return {
    bgArtDesc: `prismatic crystal glass luxury, rainbow light refractions through clear glass formations, prismatic spectrum ribbons, high-gloss glass reflection shapes, platinum and chrome metallic streams, ${BASE_ART_SUFFIX}`,
    accentColor: "#94a3b8",
    typoDesc: "gradient from soft silver at top to deep slate at bottom, prismatic glass metallic sheen, clear crystal glow"
  };
  if (/\b(grape|granddaddy|plum|lavender|purple|lilac|urkle|violet|amethyst)\b/i.test(combined)) return {
    bgArtDesc: `regal purple luxury, amethyst crystal formations with aurora borealis ribbons in violet and indigo, grape clusters with jewel light, liquid violet mercury streams, royal purple silk ribbons, amethyst gemstone fragments, ${BASE_ART_SUFFIX}`,
    accentColor: "#c084fc",
    typoDesc: "gradient from soft lavender at top to deep violet at bottom, amethyst metallic sheen, purple glow"
  };
  if (/\b(lemon|lime|citrus|grapefruit|tangerine|sour)\b/i.test(combined)) return {
    bgArtDesc: `electric citrus luxury, hyper-realistic lemon elements with golden inner light, acid yellow energy bursts radiating outward, prismatic citrus light refractions, electric yellow silk ribbons and chrome streams, ${BASE_ART_SUFFIX}`,
    accentColor: "#facc15",
    typoDesc: "gradient from bright electric yellow at top to deep amber at bottom, acid citrus metallic sheen, yellow glow"
  };
  if (/\b(blue|blueberry|ocean|aqua|glacier|frost|arctic|iceberg)\b/i.test(combined)) return {
    bgArtDesc: `electric cobalt luxury, hyper-realistic blueberry clusters with sapphire inner light, electric blue aurora ribbons, bioluminescent blue wave formations, sapphire and cyan silk streams, midnight blue luxury, ${BASE_ART_SUFFIX}`,
    accentColor: "#38bdf8",
    typoDesc: "gradient from bright cobalt blue at top to deep midnight navy at bottom, sapphire metallic sheen, blue glow"
  };
  if (/\b(candy|cookie|cream|vanilla|sugar|sherbet|butter|biscotti|tiramisu|cheesecake)\b/i.test(combined)) return {
    bgArtDesc: `luxury candy confectionery, glossy 3D candy formations in pastel jewel tones dripping with glaze, candy paint pour rivers, holographic ribbon flows in pastel and metallic, crystallized sugar formations glowing, ${BASE_ART_SUFFIX}`,
    accentColor: "#f9a8d4",
    typoDesc: "gradient from soft candy pink at top to deep rose at bottom, glossy candy metallic sheen, pink glow"
  };
  if (/\b(fire|blaze|flame|inferno|volcano|torch|dragon)\b/i.test(combined)) return {
    bgArtDesc: `molten fire luxury, explosive lava formations in ember orange and scarlet, liquid fire streams and metallic flame ribbons, dramatic lava-like shapes with electric flame formations, volcanic luxury, ${BASE_ART_SUFFIX}`,
    accentColor: "#f97316",
    typoDesc: "gradient from bright ember orange at top to deep charcoal red at bottom, molten metallic sheen, fire glow"
  };
  if (/\b(diesel|fuel|gas|og|kush|hash|afghan)\b/i.test(combined)) return {
    bgArtDesc: `OG gas luxury, warm metallic amber copper formations, earthy terracotta and bronze abstract shapes, atmospheric ochre elements, bronze and gold metallic streams, legendary heritage aesthetic, ${BASE_ART_SUFFIX}`,
    accentColor: "#d97706",
    typoDesc: "gradient from bright gold at top to deep bronze at bottom, aged copper metallic sheen, warm amber glow"
  };
  if (/\b(mango|pineapple|tropical|coconut|island|papaya|guava|passion)\b/i.test(combined)) return {
    bgArtDesc: `vibrant tropical luxury, hyper-realistic tropical fruit elements with vibrant inner light, electric teal and golden flows, holographic tropical ribbon streams, sunset gradient in golden and aqua, exotic island luxury, ${BASE_ART_SUFFIX}`,
    accentColor: "#f97316",
    typoDesc: "gradient from bright tropical orange at top to deep teal at bottom, exotic fruit metallic sheen, warm tropical glow"
  };
  if (/\b(pink|rose|blossom|cherry|peach)\b/i.test(combined)) return {
    bgArtDesc: `luxury pink editorial, bold hot pink and rose formations, liquid candy-pink streams and holographic rose-gold ribbon flows, cherry blossom petals glowing softly, feminine luxury couture, ${BASE_ART_SUFFIX}`,
    accentColor: "#f472b6",
    typoDesc: "gradient from hot pink at top to deep crimson at bottom, rose gold metallic sheen, pink glow"
  };
  if (/\b(alien|space|cosmic|galaxy|star|nebula|moon|lunar|stellar|ufo)\b/i.test(combined)) return {
    bgArtDesc: `cosmic nebula luxury, swirling galaxies in electric purple blue and silver, cosmic dust cloud formations, neon stellar particle streams, iridescent holographic metallic shapes in deep space, ${BASE_ART_SUFFIX}`,
    accentColor: "#818cf8",
    typoDesc: "gradient from soft periwinkle at top to deep space indigo at bottom, cosmic holographic sheen, nebula glow"
  };
  if (/\b(black|dark|death|shadow|void|abyss|nightmare|noir)\b/i.test(combined)) return {
    bgArtDesc: `dark void luxury, midnight black and deep charcoal formations, electric violet sparks in negative space, dark silk ribbon tendrils with neon purple accents, noir luxury couture, ${BASE_ART_SUFFIX}`,
    accentColor: "#a78bfa",
    typoDesc: "gradient from soft violet at top to deep midnight black at bottom, dark chrome metallic sheen, violet glow"
  };
  if (/\b(mint|menthol|spearmint|ice|thin.?mint|glacier)\b/i.test(combined)) return {
    bgArtDesc: `crystalline arctic ice luxury, mint-green and silver crystal formations catching cold light, cool arctic frost shapes, holographic glass and crystal ribbon flows in aqua and silver, refreshing arctic luxury, ${BASE_ART_SUFFIX}`,
    accentColor: "#34d399",
    typoDesc: "gradient from bright mint green at top to deep arctic teal at bottom, ice crystal metallic sheen, cool mint glow"
  };
  return {
    bgArtDesc: `premium dark luxury cannabis brand editorial, bold sweeping gold and amber abstract formations against deep black, holographic silk ribbon streams in gold and deep emerald, atmospheric luxury abstract couture, ${BASE_ART_SUFFIX}`,
    accentColor: "#c9a84c",
    typoDesc: "gradient from bright gold at top to deep bronze at bottom, luxury golden metallic sheen, warm amber glow"
  };
}
function isGeneralPost(prompt, flyerData) {
  return !["STRAIN_SPOTLIGHT", "PRODUCT_CATEGORY_FEATURE"].includes(detectContentFormat(prompt, flyerData));
}
function brandIdentityLayer(data) {
  const primary = data.primaryColor ?? data.brandPrimaryHex ?? "#1b5e4b";
  const secondary = data.secondaryColor ?? "#111111";
  const accent = data.accentColor ?? primary;
  const background = data.backgroundColor ?? "#0b0b0b";
  const typography = {
    LUXURY: "elegant thin serif letterforms with generous spacing and gold detail",
    STREETWEAR: "heavy compressed display letterforms with assertive energy",
    HERITAGE: "classic serif letterforms with warm earthy craft character",
    MODERN: "clean geometric sans-serif with precise grid alignment",
    MINIMAL: "ultra-light typography, maximum white space, and restraint"
  };
  const motif = {
    SMOKE: "abstract atmospheric wisps, never consumption imagery",
    GEOMETRIC: "sharp crystalline shards and angular abstract forms",
    ORGANIC: "flowing natural curves without cannabis plants",
    CHROME: "liquid-metal ribbons and reflective chrome elements",
    CRYSTALLINE: "ice formations and prismatic refractions"
  };
  const font = (data.fontStyle ?? "MODERN").toUpperCase();
  const visual = (data.visualMotif ?? "GEOMETRIC").toUpperCase();
  return `LAYER 1 \u2014 FULL BRAND IDENTITY (mandatory): dominant primary ${primary}; secondary ${secondary}; accent ${accent}; background ${background}. Font personality ${font}: ${typography[font] ?? typography.MODERN}. Layout grid ${(data.layoutGrid ?? "CENTERED").toUpperCase()}. Visual motif ${visual}: ${motif[visual] ?? motif.GEOMETRIC}. Tone ${(data.toneOfVoice ?? data.brandVoice ?? "SOPHISTICATED").toUpperCase()}. Store name "${data.shopName ?? "CANNABIS DISPENSARY"}" appears at top. Persistent visual fingerprint "${data.visualFingerprint ?? `${primary}|${secondary}|${font}|${visual}`}"; retain this signature rather than using a generic brand style.`;
}
function layoutInstruction(data) {
  return data.layout === "story" ? "STORY LAYOUT: 1080\xD71920 vertical 9:16; store/logo in the top safe region, main visual centered, and all compliance material fully legible in the bottom safe region." : "FEED LAYOUT: 1080\xD71080 square 1:1 with an aspect-aware balanced composition.";
}
function buildProductPrompt(data, theme, format) {
  const shopName = (data.shopName ?? "").toUpperCase().trim();
  const strainUp = data.strainName.toUpperCase().trim();
  const warning = HEALTH_CANADA_WARNINGS[Array.from(`${data.strainName}|${data.shopName}`).reduce((n, char) => n + char.charCodeAt(0), 0) % HEALTH_CANADA_WARNINGS.length];
  const accentHex = data.accentColor ?? data.primaryColor ?? data.brandPrimaryHex ?? theme.accentColor;
  const pt = (data.productType ?? "Flower").toLowerCase();
  let categoryLabel = "";
  if (/flower|pre.?roll/i.test(pt)) categoryLabel = data.strainType ? data.strainType.toUpperCase() : "";
  else if (/vape|cart/i.test(pt)) categoryLabel = "VAPE";
  else if (/edible/i.test(pt)) categoryLabel = "EDIBLE";
  else if (/extract/i.test(pt)) {
    categoryLabel = /\bcbd\b|tincture/i.test(data.strainName ?? "") ? "CBD" : "CONCENTRATE";
  }
  const isAccessory = /accessor|glass|pipe|bong|rig|grinder|paper|tray|lighter/i.test(
    (data.productType ?? "") + " " + (data.strainName ?? "")
  );
  let infoLine = "";
  if (isAccessory && data.price?.trim()) {
    infoLine = `PRICE: display "${data.price.trim()}" in large bold text`;
  } else if (!isAccessory && data.thcPercent?.trim()) {
    infoLine = `THC PERCENTAGE: display "THC ${data.thcPercent.trim()}%" in large bold text in ${accentHex} color`;
  }
  const sizesLine = data.sizes?.trim() ? `AVAILABLE SIZES: display "${data.sizes.trim()}" in medium white text below the THC line` : "";
  const shopBar = shopName ? `STORE NAME BAR: At the very top, a dark translucent bar containing the store name "${shopName}" in clean white sans-serif, centered, bold, wide letter spacing. A thin ${accentHex} horizontal rule below it.` : "";
  const catLine = categoryLabel ? `PRODUCT CATEGORY LABEL: "${categoryLabel}" in small ${accentHex}-colored ALL-CAPS text centered, wide letter-spacing, positioned below the store name and above the strain name.` : "";
  const logoLine = data.logoBase64?.trim() ? `BRAND LOGO: The provided reference image is the brand logo. Place it cleanly in the upper-left corner of the image, small and unobtrusive, respecting the dark top bar.` : "";
  const brandStyle = data.brandPrimaryHex ? `
BRAND COLOR ACCENTS: Use ${accentHex} (${hexToColorDescription(accentHex)}) as the primary accent color throughout \u2014 for the thin rule lines, the category label, and the THC text.` : "";
  const categoryTheme = /concentrate|extract|rosin|wax|shatter/i.test(pt) ? "amber jewel tones and resin textures" : /edible/i.test(pt) ? "refined flavor-inspired abstract art, never youth-oriented" : /vape|cart/i.test(pt) ? "sleek technical chrome and precision light" : /accessor/i.test(pt) ? "clean studio product aesthetic" : theme.bgArtDesc;
  const isStory = data.layout === "story";
  const darkPanelHeight = isStory ? "minimum 500px" : "minimum 300px";
  const warningBannerHeight = isStory ? "exactly 384px" : "exactly 216px";
  const warningFontRange = isStory ? "24\u201334px" : "20\u201328px";
  return `PREMIUM CANNABIS BRAND PROMOTIONAL GRAPHIC
${brandIdentityLayer(data)}
${layoutInstruction(data)}
LAYER 2 \u2014 CONTENT FORMAT: ${format}. ${format === "STRAIN_SPOTLIGHT" ? "Full-bleed strain story with dimensional hero name, strain type and specifications." : `Product category is hero. Category theme: ${categoryTheme}.`}
LAYER 3 \u2014 STRAIN THEME (only applicable to STRAIN_SPOTLIGHT): ${format === "STRAIN_SPOTLIGHT" ? theme.bgArtDesc : "Not applicable; do not invent a strain."}

QUALITY BENCHMARK:
Create the work at the level of premium cannabis packaging design blended with luxury streetwear editorial art. It must look art-directed by a professional brand designer, never like a generic AI image.

\u2550\u2550\u2550 BACKGROUND & ATMOSPHERE \u2550\u2550\u2550
${theme.bgArtDesc}
Build a rich abstract artistic scene that tells the story of this exact strain name and flavor personality. Use flowing silk ribbons, chrome streams, atmospheric energy, crystals, glossy liquids, or thematic objects only when they fit this strain. Pure black or very dark negative space should anchor the composition. Rich, immersive, editorial quality.${brandStyle}

\u2550\u2550\u2550 MANDATORY TEXT LAYOUT (top to bottom) \u2550\u2550\u2550
Render ALL text with crisp, professionally typeset letterforms. Every piece of text below must appear in the final image.

${shopBar}

REGULATORY SYMBOL (mandatory, top-right corner): A red stop-sign octagon shape containing a white stylised 5-leaflet cannabis leaf silhouette. Approximately 44\xD744px. This is a Canadian cannabis regulatory requirement.

${catLine}

HERO ELEMENT \u2014 STRAIN NAME:
"${strainUp}" is the dominant visual centerpiece of the entire composition.
Render it as MASSIVE, BOLD, dimensional 3D extruded typography \u2014 thick letterforms with clearly visible depth and extrusion face, ${theme.typoDesc}. The letters should feel physically present, as if cast from metal or lit from behind. Centered in the upper two-thirds of the canvas. This text must be very large and dominate the composition.
Match the letter material to the strain personality: candy and dessert strains use glossy bubble lettering; gas and fuel strains use chrome industrial lettering; purple strains use deep jewel-toned lettering; tropical strains use bright vibrant lacquered lettering.

LOCKED BOTTOM INFORMATION STACK \u2014 preserve the upper artwork exactly as described above and reserve sufficient canvas height below it for this stack:

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

MANDATORY HEALTH CANADA WARNING BOX / BANNER \u2014 a separate locked region at the absolute bottom edge:
Create a solid bright yellow (#FFC107) rectangle spanning the full canvas width and measuring ${warningBannerHeight} high. This height is fixed for every ${isStory ? "Story" : "Feed"} product image; never shrink or expand it.
Add a solid black left-edge accent stripe approximately 10px wide.
Center the following bold black warning text both horizontally and vertically inside the yellow rectangle:
"${warning}"
Use balanced, equal padding on all four sides. Fit the complete warning inside the fixed banner using a responsive font size within ${warningFontRange}, reducing the font size for longer warnings and wrapping to additional centered lines when required. Keep generous line spacing. The text must never overflow, clip, touch an edge, or be cut off.

BOTTOM STACK SPACING IS MANDATORY: THC/price, separator, sizes, disclaimer, and warning banner are five visually distinct regions. Preserve breathing room between every region. Nothing may be squished together. The yellow banner remains at least 20% of total image area.

${logoLine}

\u2550\u2550\u2550 STYLE NOTES \u2550\u2550\u2550
\u2022 Do not use photorealistic cannabis buds, plants, leaves, or flower imagery as the main visual element; preferably omit them entirely
\u2022 Ultra-detailed, professional luxury brand graphic design quality
\u2022 The strain name 3D typography and the thematic background art are the two hero elements
\u2022 Everything else (store name, THC, sizes, disclaimer, warning box) supports these two heroes
`;
}
function buildGeneralPostPrompt(data, format) {
  const shopName = data.shopName ? data.shopName.toUpperCase() : "CANNABIS DISPENSARY";
  const colorDesc = data.brandPrimaryHex ? hexToColorDescription(data.brandPrimaryHex) : "gold";
  const accentHex = data.brandPrimaryHex ?? "#c9a84c";
  const logoLine = data.logoBase64?.trim() ? `BRAND LOGO: The provided reference image is the brand logo. Place it prominently \u2014 centered or upper-left \u2014 large and clearly visible.` : "";
  const formatGuidance = {
    STORE_ANNOUNCEMENT: "Announcement/event name is hero; show date and details clearly with prominent store branding.",
    EDUCATIONAL_CONTENT: "Clean premium editorial: educational heading and concise factual key points; store branding is an authority marker, not an ad.",
    BRAND_AWARENESS: "Store name/logo is primary focus with a welcome, values, or brand-story message over abstract brand colors."
  };
  return `LUXURY CANNABIS LIFESTYLE BRAND IMAGE
${brandIdentityLayer(data)}
${layoutInstruction(data)}
LAYER 2 \u2014 CONTENT FORMAT: ${format}. ${formatGuidance[format]}
LAYER 3 \u2014 STRAIN THEME: Not applicable.

STORE NAME: "${shopName}" rendered in large, clean, elegant white typography as the PRIMARY focal element. Prominently centered or near the top of the image.

VISUAL STYLE:
Sophisticated pure black or very dark background.
Abstract luxury design elements: flowing ${colorDesc} silk ribbons, geometric ${accentHex} metallic accents, atmospheric light effects, elegant abstract forms, subtle radiant glow.
Premium dispensary brand aesthetic \u2014 like a high-end lifestyle retail advertisement.

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
async function fetchImageAsBuffer(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch image URL: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}
async function callOpenRouterImageWithModel(model, prompt, logoBase64, layout = "feed") {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY not set");
  if (logoBase64?.trim()) {
    try {
      const logoData = logoBase64.includes(",") ? logoBase64.split(",")[1] : logoBase64;
      const mimeType = logoBase64.startsWith("data:image/png") ? "image/png" : "image/jpeg";
      const logoBytes = Buffer.from(logoData, "base64");
      const logoBlob = new Blob([logoBytes], { type: mimeType });
      const form = new FormData();
      form.append("model", model);
      form.append("prompt", prompt);
      form.append("n", "1");
      form.append("size", layout === "story" ? "1080x1920" : "1080x1080");
      form.append("quality", "high");
      form.append("response_format", "b64_json");
      form.append("image[]", logoBlob, "logo.png");
      const res2 = await fetch(`${OPENROUTER_IMG_URL}/edits`, {
        method: "POST",
        headers: { Authorization: `Bearer ${key}` },
        body: form,
        signal: AbortSignal.timeout(IMAGE_GENERATION_TIMEOUT_MS)
      });
      if (res2.ok) {
        const json2 = await res2.json();
        const item2 = json2.data?.[0];
        if (item2?.b64_json) return Buffer.from(item2.b64_json, "base64");
        if (item2?.url) return fetchImageAsBuffer(item2.url);
      } else {
        const errText = await res2.text();
        console.warn(`[ImageGen] ${model} edits endpoint failed (${res2.status}): ${errText} \u2014 falling back to text-only`);
      }
    } catch (editErr) {
      console.warn(`[ImageGen] ${model} edits endpoint threw:`, editErr);
    }
  }
  const requestBody = {
    model,
    prompt,
    n: 1,
    size: layout === "story" ? "1080x1920" : "1080x1080",
    quality: "high",
    response_format: "b64_json"
  };
  console.log("[ImageGen] OpenRouter request", {
    url: `${OPENROUTER_IMG_URL}/generations`,
    method: "POST",
    timeoutMs: IMAGE_GENERATION_TIMEOUT_MS,
    body: requestBody,
    authorization: "[REDACTED]"
  });
  const res = await fetch(`${OPENROUTER_IMG_URL}/generations`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(requestBody),
    signal: AbortSignal.timeout(IMAGE_GENERATION_TIMEOUT_MS)
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`${model} returned HTTP ${res.status}: ${errText}`);
  }
  const json = await res.json();
  console.log("[ImageGen] OpenRouter response", {
    status: res.status,
    itemCount: json.data?.length ?? 0,
    hasBase64: Boolean(json.data?.[0]?.b64_json),
    imageUrl: json.data?.[0]?.url ?? null
  });
  const item = json.data?.[0];
  if (!item) throw new Error(`${model} returned no image data`);
  if (item.b64_json) return Buffer.from(item.b64_json, "base64");
  if (item.url) return fetchImageAsBuffer(item.url);
  throw new Error(`${model} returned neither b64_json nor an image URL`);
}
async function callOpenRouterImage(prompt, logoBase64, layout = "feed") {
  const failures = [];
  for (const model of IMAGE_MODELS) {
    try {
      console.log(`[ImageGen] Attempting model: ${model}`);
      return await callOpenRouterImageWithModel(model, prompt, logoBase64, layout);
    } catch (error2) {
      const detail = error2 instanceof Error ? error2.message : String(error2);
      failures.push(`${model}: ${detail}`);
      console.error(`[ImageGen] Model failed: ${model}`, error2);
    }
  }
  const error = new Error(
    `Image generation failed after ${IMAGE_MODELS.length} model attempts. ${failures.join(" | ")}`
  );
  console.error("[ImageGen] Full fallback chain failed", {
    models: IMAGE_MODELS,
    timeoutMs: IMAGE_GENERATION_TIMEOUT_MS,
    failures
  });
  throw error;
}
async function generatePromoImage(prompt, flyerData) {
  try {
    const compliantPrompt = rewritePromptForCompliance(prompt).prompt;
    const data = flyerData ?? { strainName: extractStrainName(compliantPrompt) };
    if (!data.strainType && !isGeneralPost(compliantPrompt, flyerData)) {
      data.strainType = detectStrainType(compliantPrompt) ?? detectStrainType(data.strainName) ?? void 0;
    }
    const format = detectContentFormat(compliantPrompt, data);
    const general = format === "STORE_ANNOUNCEMENT" || format === "EDUCATIONAL_CONTENT" || format === "BRAND_AWARENESS";
    let aiPrompt;
    if (general) {
      console.log(`[ImageGen] Detected general store post \u2014 generating brand lifestyle image`);
      aiPrompt = buildGeneralPostPrompt(data, format);
    } else {
      const theme = buildStrainTheme(data.strainName, compliantPrompt, data.productType);
      let bgArtDesc = theme.bgArtDesc;
      if (data.brandPrimaryHex) {
        const colorDesc = hexToColorDescription(data.brandPrimaryHex);
        bgArtDesc = `${theme.bgArtDesc}, with ${colorDesc} metallic light ribbons and accent streams woven throughout`;
      }
      const enrichedTheme = { ...theme, bgArtDesc };
      console.log(`[ImageGen] Generating product post for "${data.strainName}" (${data.productType ?? "Flower"})`);
      aiPrompt = buildProductPrompt(data, enrichedTheme, format);
    }
    console.log(`[ImageGen] Model chain: ${IMAGE_MODELS.join(" \u2192 ")} | Prompt length: ${aiPrompt.length} chars`);
    const imageBuffer = await callOpenRouterImage(aiPrompt, data.logoBase64, data.layout);
    const b64 = imageBuffer.toString("base64");
    const isPng = imageBuffer[0] === 137 && imageBuffer[1] === 80;
    const mimeType = isPng ? "image/png" : "image/jpeg";
    return {
      imageBase64: `data:${mimeType};base64,${b64}`,
      source: "ai",
      usedRealPhoto: false
    };
  } catch (error) {
    console.error("[ImageGen] generatePromoImage failed cleanly", error);
    throw error instanceof Error ? error : new Error(String(error));
  }
}
function detectStrainType(text) {
  if (/\bindica\b/i.test(text)) return "Indica";
  if (/\bsativa\b/i.test(text)) return "Sativa";
  if (/\bhybrid\b/i.test(text)) return "Hybrid";
  return null;
}
function extractStrainName(prompt) {
  const stopWords = /* @__PURE__ */ new Set(["a", "an", "the", "our", "new", "this", "is", "are", "we", "for", "and", "or", "with", "featuring", "in", "on", "at", "by", "of", "to"]);
  const words = prompt.split(/\s+/).filter((w) => {
    const clean = w.replace(/[^a-zA-Z]/g, "").toLowerCase();
    return clean.length > 1 && !stopWords.has(clean);
  });
  return words.slice(0, 3).join(" ") || prompt.slice(0, 20);
}

// src/test-image-gen.ts
var FAKE_PNG_B64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
var capturedCalls = [];
var failImageGeneration = false;
var _realFetch = globalThis.fetch;
function mockFetch(input, init) {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  const method = init?.method ?? "GET";
  let prompt = "";
  let model = "";
  if (typeof init?.body === "string") {
    try {
      const parsed = JSON.parse(init.body);
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
          headers: { "Content-Type": "application/json" }
        })
      );
    }
    const body = JSON.stringify({ data: [{ b64_json: FAKE_PNG_B64 }] });
    return Promise.resolve(
      new Response(body, { status: 200, headers: { "Content-Type": "application/json" } })
    );
  }
  return _realFetch(input, init);
}
globalThis.fetch = mockFetch;
if (!process.env.OPENROUTER_API_KEY) {
  process.env.OPENROUTER_API_KEY = "test-dummy-key";
}
var green = (s) => `\x1B[32m${s}\x1B[0m`;
var red = (s) => `\x1B[31m${s}\x1B[0m`;
var yellow = (s) => `\x1B[33m${s}\x1B[0m`;
var bold = (s) => `\x1B[1m${s}\x1B[0m`;
var dim = (s) => `\x1B[2m${s}\x1B[0m`;
var passed = 0;
var failed = 0;
function assert(condition, message) {
  if (condition) {
    console.log(`  ${green("\u2713")} ${message}`);
    passed++;
  } else {
    console.log(`  ${red("\u2717")} ${message}`);
    failed++;
  }
}
function assertContains(haystack, needle, label) {
  assert(haystack.includes(needle), label);
}
function assertNotContains(haystack, needle, label) {
  assert(!haystack.includes(needle), label);
}
var TEST_CASES = [
  // ── 1. Blue Dream — product post ──────────────────────────────────────────
  {
    name: "Blue Dream \u2014 flower product post (THC 22%, 3.5g)",
    prompt: "Blue Dream flower, THC 22%, 3.5g",
    flyerData: {
      strainName: "Blue Dream",
      thcPercent: "22",
      sizes: "3.5g",
      productType: "Flower",
      strainType: "Sativa",
      shopName: "Aura Cannabis Co."
    },
    assertRoute(captured, result) {
      assert(result.source === "ai", "source is 'ai'");
      assert(result.usedRealPhoto === false, "usedRealPhoto is false");
      assert(
        captured.url.includes("/images/generations"),
        `called /images/generations (got: ${captured.url})`
      );
      assert(captured.method === "POST", "HTTP method is POST");
      assertContains(
        captured.prompt,
        "PREMIUM CANNABIS BRAND PROMOTIONAL GRAPHIC",
        "prompt header: PREMIUM CANNABIS BRAND PROMOTIONAL GRAPHIC"
      );
      assertContains(
        captured.prompt,
        "BLUE DREAM",
        "strain name 'BLUE DREAM' present in prompt"
      );
      assertContains(
        captured.prompt,
        "THC PERCENTAGE",
        "THC line present in prompt (product-post builder)"
      );
      assertContains(
        captured.prompt,
        "MANDATORY HEALTH CANADA WARNING BOX",
        "Health Canada warning box present (regulatory requirement)"
      );
      assertContains(
        captured.prompt,
        "LOCKED BOTTOM INFORMATION STACK",
        "product prompt uses the spaced bottom information stack"
      );
      assertContains(
        captured.prompt,
        "exactly 216px",
        "Feed warning banner has a fixed consistent height"
      );
      assertContains(
        captured.prompt,
        "never overflow, clip, touch an edge, or be cut off",
        "warning text is required to fit safely inside the banner"
      );
      assertContains(
        captured.prompt,
        "REGULATORY SYMBOL",
        "regulatory symbol instruction present"
      );
      assertNotContains(
        captured.prompt,
        "WHAT TO EXCLUDE",
        "no 'WHAT TO EXCLUDE' section (that belongs to general posts only)"
      );
      assertNotContains(
        captured.prompt,
        "LUXURY CANNABIS LIFESTYLE BRAND IMAGE",
        "not using general-post prompt builder"
      );
    }
  },
  // ── 2. Pink Goo — product post ────────────────────────────────────────────
  {
    name: "Pink Goo \u2014 flower product post (THC 19%, 1g/3.5g)",
    prompt: "Pink Goo flower, THC 19%, available in 1g and 3.5g",
    flyerData: {
      strainName: "Pink Goo",
      thcPercent: "19",
      sizes: "1g / 3.5g",
      productType: "Flower",
      shopName: "Aura Cannabis Co."
    },
    assertRoute(captured, result) {
      assert(result.source === "ai", "source is 'ai'");
      assert(result.usedRealPhoto === false, "usedRealPhoto is false");
      assert(
        captured.url.includes("/images/generations"),
        `called /images/generations (got: ${captured.url})`
      );
      assert(captured.method === "POST", "HTTP method is POST");
      assertContains(
        captured.prompt,
        "PREMIUM CANNABIS BRAND PROMOTIONAL GRAPHIC",
        "prompt header: PREMIUM CANNABIS BRAND PROMOTIONAL GRAPHIC"
      );
      assertContains(
        captured.prompt,
        "PINK GOO",
        "strain name 'PINK GOO' present in prompt"
      );
      assertContains(
        captured.prompt,
        "THC PERCENTAGE",
        "THC line present in prompt (product-post builder)"
      );
      assertContains(
        captured.prompt,
        "MANDATORY HEALTH CANADA WARNING BOX",
        "Health Canada warning box present (regulatory requirement)"
      );
      assertContains(
        captured.prompt,
        "REGULATORY SYMBOL",
        "regulatory symbol instruction present"
      );
      assertNotContains(
        captured.prompt,
        "WHAT TO EXCLUDE",
        "no 'WHAT TO EXCLUDE' section (that belongs to general posts only)"
      );
      assertNotContains(
        captured.prompt,
        "LUXURY CANNABIS LIFESTYLE BRAND IMAGE",
        "not using general-post prompt builder"
      );
    }
  },
  // ── 3. General awareness post ─────────────────────────────────────────────
  {
    name: "General awareness post \u2014 'Come visit us this weekend'",
    prompt: "Come visit us this weekend",
    flyerData: {
      strainName: "Come visit us this weekend",
      shopName: "Aura Cannabis Co."
    },
    assertRoute(captured, result) {
      assert(result.source === "ai", "source is 'ai'");
      assert(result.usedRealPhoto === false, "usedRealPhoto is false");
      assert(
        captured.url.includes("/images/generations"),
        `called /images/generations (got: ${captured.url})`
      );
      assert(captured.method === "POST", "HTTP method is POST");
      assertContains(
        captured.prompt,
        "LUXURY CANNABIS LIFESTYLE BRAND IMAGE",
        "prompt header: LUXURY CANNABIS LIFESTYLE BRAND IMAGE (general builder)"
      );
      assertContains(
        captured.prompt,
        "WHAT TO EXCLUDE",
        "'WHAT TO EXCLUDE' section present (general-post builder)"
      );
      assertContains(
        captured.prompt,
        "No cannabis imagery",
        "'No cannabis imagery' exclusion present"
      );
      assertNotContains(
        captured.prompt,
        "MANDATORY HEALTH CANADA WARNING BOX",
        "no Health Canada warning box (excluded from general posts)"
      );
      assertNotContains(
        captured.prompt,
        "PREMIUM CANNABIS BRAND PROMOTIONAL GRAPHIC",
        "not using product-post prompt builder"
      );
      assertNotContains(
        captured.prompt,
        "THC PERCENTAGE",
        "no THC percentage field (general post has no product data)"
      );
      assertNotContains(
        captured.prompt,
        "REGULATORY SYMBOL",
        "no regulatory symbol (excluded from general posts)"
      );
    }
  },
  // ── 4. Pink Gas — product post with industrial chrome styling ─────────────
  {
    name: "Pink Gas \u2014 chrome industrial product post",
    prompt: "Pink Gas flower strain post",
    flyerData: {
      strainName: "Pink Gas",
      thcPercent: "20-25",
      sizes: "1g \xB7 3.5g",
      productType: "Flower",
      strainType: "Indica",
      shopName: "Chamba Cannabis"
    },
    assertRoute(captured, result) {
      assert(result.source === "ai", "source is 'ai'");
      assertContains(captured.prompt, "PINK GAS", "Pink Gas name present");
      assertContains(
        captured.prompt,
        "chrome industrial letters",
        "Pink Gas uses chrome industrial typography"
      );
      assertContains(
        captured.prompt,
        "chrome steel pipes",
        "Pink Gas uses its industrial chrome visual world"
      );
    }
  },
  // ── 5. Grand opening — general business post ──────────────────────────────
  {
    name: "Grand Opening post for Chamba Cannabis",
    prompt: "Grand Opening post for Chamba Cannabis",
    flyerData: {
      strainName: "Grand Opening post",
      shopName: "Chamba Cannabis"
    },
    assertRoute(captured, result) {
      assert(result.source === "ai", "source is 'ai'");
      assertContains(
        captured.prompt,
        "LUXURY CANNABIS LIFESTYLE BRAND IMAGE",
        "grand opening uses general business image builder"
      );
      assertContains(
        captured.prompt,
        "CHAMBA CANNABIS",
        "store name is prominent"
      );
      assertNotContains(
        captured.prompt,
        "MANDATORY HEALTH CANADA WARNING BOX",
        "grand opening has no product warning"
      );
      assertNotContains(
        captured.prompt,
        "THC PERCENTAGE",
        "grand opening has no THC"
      );
    }
  }
];
async function runTests() {
  console.log(bold("\n\u{1F9EA}  Image Generation \u2014 End-to-End Test\n"));
  console.log(`  Model:  ${dim(IMAGE_MODEL)}`);
  console.log(`  HTTP:   ${dim("mocked \u2014 no OpenRouter credits consumed")}`);
  console.log(`  Cases:  ${TEST_CASES.length}
`);
  assert(isGeneralPost("Grand Opening for Chamba Cannabis"), "grand opening is classified as general");
  assert(isGeneralPost("Come visit us this weekend"), "visit-us announcement is classified as general");
  assert(!isGeneralPost("Pink Goo strain post"), "Pink Goo strain is classified as product");
  assert(!isGeneralPost("Pink Gas flower post"), "Pink Gas flower is classified as product");
  assert(!isGeneralPost("Blue Dream THC 22%"), "Blue Dream with THC is classified as product");
  assert(
    detectContentFormat("Blue Dream flower", { strainName: "Blue Dream", strainType: "Hybrid" }) === "STRAIN_SPOTLIGHT",
    "specific strain selects STRAIN_SPOTLIGHT"
  );
  assert(
    detectContentFormat("Blue Dream post") === "STRAIN_SPOTLIGHT",
    "bare known strain selects STRAIN_SPOTLIGHT"
  );
  assert(
    detectContentFormat("Blue Dream terpene guide") === "STRAIN_SPOTLIGHT",
    "named-strain education retains product compliance"
  );
  assert(
    detectContentFormat("New vape cartridges in store") === "PRODUCT_CATEGORY_FEATURE",
    "product category selects PRODUCT_CATEGORY_FEATURE"
  );
  assert(
    detectContentFormat("Grand opening this Friday") === "STORE_ANNOUNCEMENT",
    "event selects STORE_ANNOUNCEMENT"
  );
  assert(
    detectContentFormat("Terpenes: a short guide") === "EDUCATIONAL_CONTENT",
    "informational topic selects EDUCATIONAL_CONTENT"
  );
  assert(
    detectContentFormat("Meet our store team") === "BRAND_AWARENESS",
    "general brand topic selects BRAND_AWARENESS"
  );
  const rewrite = rewritePromptForCompliance("Blue Dream helps with sleep \u2014 buy one get one free");
  assert(
    rewrite.wasRewritten && !/helps with|buy one get one/i.test(rewrite.prompt),
    "prohibited medical and inducement language is silently rewritten"
  );
  console.log();
  for (const tc of TEST_CASES) {
    console.log(bold(`\u25B6  ${tc.name}`));
    const start = Date.now();
    capturedCalls.length = 0;
    let result;
    try {
      result = await generatePromoImage(tc.prompt, tc.flyerData);
    } catch (err) {
      console.log(`  ${red("\u2717")} generatePromoImage threw unexpectedly: ${err}`);
      failed++;
      console.log();
      continue;
    }
    const elapsed = ((Date.now() - start) / 1e3).toFixed(2);
    console.log(`  ${yellow(`\u23F1  ${elapsed}s`)}`);
    assert(
      typeof result.imageBase64 === "string" && result.imageBase64.length > 100,
      "imageBase64 is a non-empty string"
    );
    assert(
      result.imageBase64.startsWith("data:image/"),
      "imageBase64 starts with 'data:image/'"
    );
    assert(
      !result.imageBase64.startsWith("data:image/svg"),
      "imageBase64 is NOT an SVG (OpenRouter path reached, not fallback)"
    );
    const captured = capturedCalls[capturedCalls.length - 1];
    if (!captured) {
      console.log(`  ${red("\u2717")} No fetch call was captured \u2014 mock may not be installed`);
      failed++;
    } else {
      tc.assertRoute(captured, result);
    }
    console.log();
  }
  console.log(bold("\u25B6  Story brand-kit prompt contract"));
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
    layout: "story"
  });
  const storyCall = capturedCalls[capturedCalls.length - 1];
  assert(storyResult.source === "ai", "story uses the image provider");
  assert(storyCall?.model === IMAGE_MODEL, "story starts with primary model");
  assertContains(storyCall?.prompt ?? "", "LAYER 1 \u2014 FULL BRAND IDENTITY", "brand identity layer is present");
  assertContains(storyCall?.prompt ?? "", "LAYER 2 \u2014 CONTENT FORMAT: STRAIN_SPOTLIGHT", "format layer is present");
  assertContains(storyCall?.prompt ?? "", "LAYER 3 \u2014 STRAIN THEME", "strain layer is present");
  assertContains(storyCall?.prompt ?? "", "distinct-brand-v1", "visual fingerprint is included");
  assertContains(storyCall?.prompt ?? "", "STORY LAYOUT: 1080\xD71920", "story layout is aspect-aware");
  assertContains(storyCall?.prompt ?? "", "minimum 500px", "Story dark information panel has room for separated rows");
  assertContains(storyCall?.prompt ?? "", "exactly 384px", "Story warning banner has a fixed consistent height");
  assertContains(storyCall?.prompt ?? "", "at least 20% of total image area", "product warning reserves 20% area");
  assert(
    (storyCall?.prompt ?? "").includes("#112233") && (storyCall?.prompt ?? "").includes("#445566"),
    "full brand color identity is included"
  );
  console.log();
  console.log(bold("\u25B6  OpenRouter failure \u2014 model fallback chain"));
  capturedCalls.length = 0;
  failImageGeneration = true;
  let fallbackError;
  try {
    await generatePromoImage("Blue Dream flower");
  } catch (error) {
    fallbackError = error;
  } finally {
    failImageGeneration = false;
  }
  assert(fallbackError instanceof Error, "all failed model attempts return an error");
  assert(
    capturedCalls.map((call) => call.model).join(" \u2192 ") === IMAGE_MODELS.join(" \u2192 "),
    "fallback models are attempted in the configured order"
  );
  console.log();
  const total = passed + failed;
  console.log(bold("\u2500".repeat(54)));
  if (failed === 0) {
    console.log(green(`  ${passed}/${total} assertions passed \u2014 all three post types OK \u2713`));
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
//# sourceMappingURL=test-image-gen.mjs.map
