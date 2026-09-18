import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Leaf,
  Sparkles,
  Shield,
  Instagram,
  ArrowRight,
  CheckCircle2,
  Zap,
  Clock,
  MessageSquare,
  Calculator,
  ImageIcon,
} from "lucide-react";

// Mock post preview cards — represent what the AI generates
function MockPostCard({
  image,
  title,
  subtitle,
  hashtag,
  delay,
}: {
  image: string;
  title: string;
  subtitle: string;
  hashtag: string;
  delay: string;
}) {
  return (
    <div
      className="rounded-2xl overflow-hidden border border-white/10 bg-card/40 backdrop-blur flex-shrink-0 w-52 shadow-xl"
      style={{ animationDelay: delay }}
    >
      {/* AI-generated product image */}
      <div className="h-48 relative flex items-end p-3 bg-zinc-900">
        <img
          src={`${import.meta.env.BASE_URL}cannabis/${image}`}
          alt={title}
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Dark gradient scrim so text is readable */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
        {/* AGCO badge */}
        <div className="absolute top-3 right-3 bg-black/40 backdrop-blur rounded-full px-2 py-0.5 flex items-center gap-1">
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          <span className="text-[9px] text-white/80 font-medium">AGCO ✓</span>
        </div>
        {/* Title bar at bottom */}
        <div className="relative bg-black/50 backdrop-blur rounded-lg p-2 w-full">
          <p className="text-white text-[10px] font-bold leading-tight">{title}</p>
        </div>
      </div>
      {/* Fake caption */}
      <div className="p-3 space-y-1.5">
        <p className="text-[11px] text-foreground/80 leading-snug line-clamp-2">{subtitle}</p>
        <p className="text-[10px] text-primary">{hashtag}</p>
        <div className="flex items-center gap-1 pt-1">
          <div className="h-4 w-4 rounded-full bg-primary/20 flex items-center justify-center">
            <Leaf className="h-2.5 w-2.5 text-primary" />
          </div>
          <span className="text-[9px] text-muted-foreground">Aura by CannaPost</span>
        </div>
      </div>
    </div>
  );
}

// ── Instant Demo Section ──────────────────────────────────────────────────────

const DEMO_STRAINS = [
  {
    name: "Blue Dream",
    type: "Hybrid",
    thc: "22%",
    image: "final_blue_dream.jpg",
    caption:
      "Blue Dream is in the house — a classic Hybrid that delivers balanced energy and calm focus. Perfect for creative afternoons or social evenings. In-store now.",
    hashtags: "#BlueDream #OntarioCannabis #HybridStrains #LegalCannabis #TorontoDispensary",
  },
  {
    name: "Pink Kush",
    type: "Indica",
    thc: "24%",
    image: "pp_hero.jpg",
    caption:
      "Pink Kush — a potent Indica with signature floral notes and a heavy, relaxing body effect. Limited stock. In-store only.",
    hashtags: "#PinkKush #Indica #OntarioCannabis #CannaPost #LegalWeed",
  },
  {
    name: "Sour Diesel",
    type: "Sativa",
    thc: "21%",
    image: "abstract_citrus.jpg",
    caption:
      "Sour Diesel — the Sativa powerhouse with a sharp, fuel-forward terpene profile. Energising and uplifting. Back in stock this week.",
    hashtags: "#SourDiesel #Sativa #OntarioDispensary #LegalCannabis #CannaPost",
  },
  {
    name: "Gelato #41",
    type: "Hybrid",
    thc: "26%",
    image: "abstract_purple.jpg",
    caption:
      "Gelato #41 — rich dessert notes with a balanced Hybrid effect that hits smooth every time. Premium shelf. 19+ only, Ontario residents.",
    hashtags: "#Gelato #OntarioCannabis #PremiumFlower #HybridLife #LegalWeed",
  },
];

function InstantDemo() {
  const [selected, setSelected] = useState(0);
  const strain = DEMO_STRAINS[selected];

  return (
    <section className="py-16 sm:py-20 px-4 sm:px-6 border-t border-border/50 bg-card/10">
      <div className="container mx-auto max-w-5xl">
        <div className="text-center mb-8 sm:mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-medium mb-4">
            <Sparkles className="h-3.5 w-3.5" /> Instant Demo — No Account Required
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold mb-3">See what Aura writes in seconds</h2>
          <p className="text-muted-foreground text-sm sm:text-base max-w-xl mx-auto">
            Pick a strain below and watch Aura generate a fully AGCO-compliant Instagram caption instantly.
          </p>
        </div>

        {/* Strain selector */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {DEMO_STRAINS.map((s, i) => (
            <button
              key={s.name}
              onClick={() => setSelected(i)}
              className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                selected === i
                  ? "bg-primary text-primary-foreground border-primary shadow-[0_0_15px_rgba(34,197,94,0.35)]"
                  : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground hover:bg-primary/5"
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>

        {/* Demo preview card */}
        <div className="max-w-3xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-5 rounded-2xl border border-border bg-card/60 backdrop-blur p-5 shadow-xl">
          {/* AI-generated product image */}
          <div className="rounded-xl h-56 sm:h-full min-h-[200px] relative flex items-end p-4 overflow-hidden bg-zinc-900">
            <img
              src={`${import.meta.env.BASE_URL}cannabis/${strain.image}`}
              alt={strain.name}
              className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300"
            />
            {/* Scrim for text legibility */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
            {/* AGCO badge */}
            <div className="absolute top-3 right-3 bg-black/40 backdrop-blur rounded-full px-2 py-0.5 flex items-center gap-1">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span className="text-[9px] text-white/80 font-medium">AGCO ✓</span>
            </div>
            {/* Strain info at bottom */}
            <div className="relative w-full space-y-1">
              <div className="bg-black/50 backdrop-blur rounded-lg p-2.5">
                <p className="text-white text-sm font-bold">{strain.name}</p>
                <p className="text-white/70 text-xs">{strain.type} · {strain.thc} THC</p>
              </div>
            </div>
          </div>

          {/* Generated caption */}
          <div className="flex flex-col gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="h-5 w-5 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
                  <Instagram className="h-3 w-3 text-white" />
                </div>
                <span className="text-xs font-medium text-muted-foreground">Instagram Caption</span>
                <span className="ml-auto text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2 py-0.5">
                  AGCO ✓
                </span>
              </div>
              <p className="text-sm text-foreground leading-relaxed">{strain.caption}</p>
              <p className="text-xs text-primary mt-3 leading-relaxed">{strain.hashtags}</p>
              <p className="text-[10px] text-muted-foreground/60 mt-2">
                Must be 19+ to purchase. Ontario residents only.
              </p>
            </div>

            <div className="mt-auto space-y-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-background/40 rounded-lg p-2.5 border border-border">
                <MessageSquare className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                Real posts also include a custom AI-generated product image
              </div>
              <Link href="/sign-up">
                <Button size="sm" className="w-full bg-primary text-primary-foreground hover:bg-primary/90 min-h-[40px]">
                  Generate Real Posts Free <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── ROI Calculator ────────────────────────────────────────────────────────────

function ROICalculator() {
  const [postsPerMonth, setPostsPerMonth] = useState(15);

  // Estimates: ~45 min per post manually; Aura takes ~2 min per post
  const manualMinutes = postsPerMonth * 45;
  const auraMinutes   = postsPerMonth * 2;
  const savedMinutes  = manualMinutes - auraMinutes;
  const savedHours    = Math.round(savedMinutes / 60 * 10) / 10;
  const savedDays     = Math.round(savedHours / 8 * 10) / 10;

  return (
    <section className="py-16 sm:py-20 px-4 sm:px-6 border-t border-border/50">
      <div className="container mx-auto max-w-3xl">
        <div className="text-center mb-8 sm:mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-medium mb-4">
            <Calculator className="h-3.5 w-3.5" /> ROI &amp; Time Saved Calculator
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold mb-3">How much time does Aura save you?</h2>
          <p className="text-muted-foreground text-sm sm:text-base max-w-xl mx-auto">
            Drag the slider to match your dispensary's posting frequency and see your estimated time savings.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card/60 backdrop-blur p-6 sm:p-8 shadow-xl space-y-8">
          {/* Slider */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-foreground">Posts per month</label>
              <span className="text-2xl font-bold text-primary">{postsPerMonth}</span>
            </div>
            <input
              type="range"
              min={5}
              max={60}
              step={1}
              value={postsPerMonth}
              onChange={(e) => setPostsPerMonth(Number(e.target.value))}
              className="w-full h-2 rounded-full accent-primary bg-primary/20 cursor-pointer"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>5 posts</span>
              <span>60 posts</span>
            </div>
          </div>

          {/* Results grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl border border-border bg-background/40 p-4 text-center space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Manual Time</p>
              <p className="text-2xl font-bold text-foreground">{Math.round(manualMinutes / 60 * 10) / 10}h</p>
              <p className="text-[11px] text-muted-foreground">~45 min/post</p>
            </div>
            <div className="rounded-xl border border-primary/30 bg-primary/10 p-4 text-center space-y-1 relative overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-primary to-emerald-400" />
              <p className="text-xs text-primary uppercase tracking-wide font-medium">With Aura</p>
              <p className="text-2xl font-bold text-primary">{Math.round(auraMinutes / 60 * 10) / 10}h</p>
              <p className="text-[11px] text-primary/70">~2 min/post</p>
            </div>
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center space-y-1 relative overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-emerald-500 to-lime-400" />
              <p className="text-xs text-emerald-400 uppercase tracking-wide font-medium">Time Saved</p>
              <p className="text-2xl font-bold text-emerald-400">{savedHours}h</p>
              <p className="text-[11px] text-emerald-400/70">{savedDays} working day{savedDays !== 1 ? "s" : ""}/mo</p>
            </div>
          </div>

          {/* Summary bar */}
          <div className="rounded-xl bg-background/40 border border-border p-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
            <p className="text-muted-foreground text-center sm:text-left">
              At <span className="font-semibold text-foreground">{postsPerMonth} posts/month</span>, Aura saves your team approximately{" "}
              <span className="font-bold text-emerald-400">{savedHours} hours</span> — time better spent with your customers.
            </p>
            <Link href="/sign-up" className="shrink-0">
              <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 whitespace-nowrap min-h-[40px]">
                Get Started Free
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Main Landing Page ─────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col overflow-x-hidden">

      {/* ── Nav ───────────────────────────────────────────────────── */}
      <nav className="border-b border-border/50 backdrop-blur sticky top-0 z-50 bg-background/90">
        <div className="container mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-primary/15 flex items-center justify-center">
              <Leaf className="h-4 w-4 text-primary" />
            </div>
            <span className="font-bold text-lg sm:text-xl tracking-tight bg-gradient-to-r from-primary to-emerald-400 bg-clip-text text-transparent">
              Aura
            </span>
            <span className="text-xs text-muted-foreground font-medium hidden sm:inline">by CannaPost</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/sign-in">
              <Button variant="ghost" size="sm" className="h-9 px-3 text-sm">Sign In</Button>
            </Link>
            <Link href="/sign-up">
              <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-3 text-sm">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ──────────────────────────────────────────────────── */}
      <section className="relative px-4 sm:px-6 pt-14 sm:pt-20 pb-8 overflow-hidden">
        {/* Background glows */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,_var(--tw-gradient-stops))] from-primary/15 via-background to-background pointer-events-none" />
        <div className="absolute top-0 left-1/4 w-72 sm:w-96 h-72 sm:h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/4 right-0 w-64 h-64 bg-green-400/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative container mx-auto max-w-4xl text-center space-y-6 sm:space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs sm:text-sm font-medium">
            <Zap className="h-3.5 w-3.5 flex-shrink-0" />
            AI-Powered · AGCO Compliant · Ontario Only
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight leading-[1.05]">
            Your Dispensary.{" "}
            <span className="block bg-gradient-to-r from-green-400 via-primary to-emerald-400 bg-clip-text text-transparent">
              On Autopilot.
            </span>
          </h1>

          {/* Sub-headline */}
          <p className="text-base sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Aura generates professional, AGCO-compliant Instagram posts with AI-crafted captions and
            custom product imagery — ready to publish in seconds.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center pt-2">
            <Link href="/sign-up" className="w-full sm:w-auto">
              <Button
                size="lg"
                className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_35px_rgba(34,197,94,0.35)] text-base px-8 h-12 min-h-[48px]"
              >
                Get Started Free <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
            <Link href="/sign-in" className="w-full sm:w-auto">
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto border-border/60 text-base px-8 h-12 min-h-[48px] hover:bg-accent"
              >
                Login
              </Button>
            </Link>
          </div>

          {/* Trust row */}
          <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 pt-2 text-xs sm:text-sm text-muted-foreground">
            {[
              "14 Health Canada warnings",
              "AGCO compliance built-in",
              "Instagram-ready images",
              "Ontario licensed retailers",
            ].map((item) => (
              <span key={item} className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Sample Post Previews ───────────────────────────────────── */}
      <section className="py-10 sm:py-14 overflow-hidden">
        <div className="container mx-auto px-4 sm:px-6 mb-6">
          <p className="text-center text-xs sm:text-sm text-muted-foreground font-medium uppercase tracking-widest">
            Sample Posts Generated by Aura
          </p>
        </div>
        {/* Scrolling row of mock posts */}
        <div className="flex gap-4 px-6 overflow-x-auto pb-4 scrollbar-hide justify-start sm:justify-center flex-nowrap">
          <MockPostCard
            image="final_blue_dream.jpg"
            title="Blue Dream — 24% THC"
            subtitle="Smooth, uplifting vibes for your weekend 🌿 Our most loved sativa is back in stock."
            hashtag="#BlueDream #OntarioCannabis #Sativa"
            delay="0ms"
          />
          <MockPostCard
            image="purple_punch_v3.jpg"
            title="Purple Punch Live Resin"
            subtitle="Concentrate enthusiasts, this one's for you. Rich terpene profile, full-spectrum experience."
            hashtag="#LiveResin #Concentrates #CannaPost"
            delay="100ms"
          />
          <MockPostCard
            image="hero_flower.jpg"
            title="Weekend Flash Sale — 20% Off"
            subtitle="All pre-rolls this Saturday only. Visit us in-store. 19+ only, Ontario residents."
            hashtag="#FlashSale #PreRolls #TorontoCannabis"
            delay="200ms"
          />
          <MockPostCard
            image="abstract_kush.jpg"
            title="Master Kush — Indica"
            subtitle="Perfect for an evening wind-down. Earthy, calming notes with a classic profile."
            hashtag="#MasterKush #Indica #OntarioDispensary"
            delay="300ms"
          />
          <MockPostCard
            image="hero_vape.jpg"
            title="New Product Drop 🌱"
            subtitle="Exciting new arrivals just hit our shelves. Come see what's fresh at the store."
            hashtag="#NewArrivals #Cannabis #Dispensary"
            delay="400ms"
          />
        </div>
      </section>

      {/* ── Instant Demo ─────────────────────────────────────────────── */}
      <InstantDemo />

      {/* ── Features ──────────────────────────────────────────────── */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 border-t border-border/50">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-4xl font-bold mb-4">
              Everything a licensed dispensary needs
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base max-w-xl mx-auto">
              Built ground-up for Ontario cannabis retailers. Every feature respects AGCO regulations and the federal Cannabis Act.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 sm:gap-8">
            {[
              {
                icon: Sparkles,
                title: "AI Generated Posts",
                description:
                  "Our trademarked AI crafts captions and hashtags tailored to your store's voice. No medical claims, no youth-appealing content — enforced automatically.",
                color: "text-primary",
                bg: "bg-primary/10",
                border: "border-primary/20",
              },
              {
                icon: Shield,
                title: "AGCO Compliant",
                description:
                  "Every post includes mandatory Health Canada warnings. Compliance rules are hardcoded — you physically cannot generate non-compliant content.",
                color: "text-emerald-500",
                bg: "bg-emerald-500/10",
                border: "border-emerald-500/20",
              },
              {
                icon: Instagram,
                title: "Instagram Ready",
                description:
                  "AI-generated product imagery at perfect 1:1 ratio. Connect your Business account and publish directly, or download for manual posting.",
                color: "text-pink-500",
                bg: "bg-pink-500/10",
                border: "border-pink-500/20",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className={`p-5 sm:p-6 rounded-2xl border ${feature.border} bg-card/50 backdrop-blur space-y-4`}
              >
                <div className={`w-11 h-11 rounded-xl ${feature.bg} flex items-center justify-center`}>
                  <feature.icon className={`h-5 w-5 ${feature.color}`} />
                </div>
                <h3 className="text-base sm:text-lg font-semibold">{feature.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ROI Calculator ───────────────────────────────────────────── */}
      <ROICalculator />

      {/* ── How it works ───────────────────────────────────────────── */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 bg-card/20 border-t border-border/50">
        <div className="container mx-auto max-w-3xl text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-3">Live in under a minute</h2>
          <p className="text-muted-foreground text-sm sm:text-base mb-10 sm:mb-12">
            No marketing degree required.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
            {[
              { n: "1", label: "Describe your product or promo" },
              { n: "2", label: "AI writes a compliant caption" },
              { n: "3", label: "Custom image is generated" },
              { n: "4", label: "Post to Instagram instantly" },
            ].map(({ n, label }) => (
              <div key={n} className="flex flex-col items-center gap-3 text-center">
                <div className="h-12 w-12 rounded-full bg-primary/15 border border-primary/20 flex items-center justify-center">
                  <span className="text-lg font-bold text-primary">{n}</span>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground leading-snug">{label}</p>
              </div>
            ))}
          </div>
          <div className="mt-10">
            <Link href="/sign-up">
              <Button
                size="lg"
                className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_25px_rgba(34,197,94,0.3)] px-8 h-12 min-h-[48px]"
              >
                Start Generating <Clock className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────── */}
      <footer className="border-t border-border/50 py-6 sm:py-8 px-4 sm:px-6">
        <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <Leaf className="h-4 w-4 text-primary flex-shrink-0" />
            <span className="text-xs sm:text-sm text-muted-foreground">
              Aura by CannaPost — For licensed Ontario dispensaries only
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            🔞 Must be 19+ to purchase. Ontario residents only.
          </p>
        </div>
      </footer>
    </div>
  );
}
