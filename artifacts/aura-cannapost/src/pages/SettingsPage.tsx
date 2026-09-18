import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useClerk, useUser } from "@clerk/react";
import AppLayout from "@/components/layout/AppLayout";
import {
  useGetBrandProfile,
  useCreateBrandProfile,
  useUpdateBrandProfile,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Upload,
  X,
  Leaf,
  Palette,
  Building2,
  Instagram,
  MapPin,
  Clock,
  Megaphone,
  Users,
  Image as ImageIcon,
  Save,
  CheckCircle,
  Sparkles,
  RefreshCw,
  LogOut,
  AlertTriangle,
} from "lucide-react";
import { extractPaletteFromDataUrl, type ExtractedPalette } from "@/lib/colorExtractor";
import { useBrandTheme } from "@/contexts/BrandThemeContext";

const WATERMARK_POSITIONS = [
  { value: "bottom_right", label: "Bottom Right" },
  { value: "bottom_left", label: "Bottom Left" },
  { value: "top_right", label: "Top Right" },
  { value: "top_left", label: "Top Left" },
  { value: "center", label: "Center" },
];

const FONT_STYLES = [
  { value: "LUXURY", label: "Luxury — elegant serif & gold accents" },
  { value: "STREETWEAR", label: "Streetwear — compressed & energetic" },
  { value: "HERITAGE", label: "Heritage — classic & crafted" },
  { value: "MODERN", label: "Modern — geometric & precise" },
  { value: "MINIMAL", label: "Minimal — light & restrained" },
];
const LAYOUT_GRIDS = [
  { value: "CENTERED", label: "Centered" },
  { value: "EDITORIAL", label: "Editorial" },
  { value: "ASYMMETRIC", label: "Asymmetric" },
  { value: "BOLD", label: "Bold" },
];
const VISUAL_MOTIFS = [
  { value: "SMOKE", label: "Smoke" },
  { value: "GEOMETRIC", label: "Geometric" },
  { value: "ORGANIC", label: "Organic" },
  { value: "CHROME", label: "Chrome" },
  { value: "CRYSTALLINE", label: "Crystalline" },
];
const TONES_OF_VOICE = [
  { value: "PREMIUM", label: "Premium" },
  { value: "BOLD", label: "Bold" },
  { value: "EDUCATIONAL", label: "Educational" },
  { value: "FRIENDLY", label: "Friendly" },
  { value: "SOPHISTICATED", label: "Sophisticated" },
];

const TIMEZONES = [
  { value: "America/Toronto",   label: "Eastern Time (Toronto)" },
  { value: "America/Winnipeg",  label: "Central Time (Winnipeg)" },
  { value: "America/Edmonton",  label: "Mountain Time (Edmonton)" },
  { value: "America/Vancouver", label: "Pacific Time (Vancouver)" },
  { value: "America/Halifax",   label: "Atlantic Time (Halifax)" },
];

const INDUSTRY = "cannabis_dispensary";
const BYPASS_KEY = "postaura_bypass_auth";

// ── Watermark preview canvas ──────────────────────────────────────────────────

function WatermarkPreview({
  position,
  logoBase64,
  showNameWatermark,
  businessName,
  accentHex,
}: {
  position: string;
  logoBase64?: string | null;
  showNameWatermark: boolean;
  businessName: string;
  accentHex?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = canvas.width;
    const H = canvas.height;

    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, (accentHex ?? "#1a2e1c") + "55");
    grad.addColorStop(1, "#0a140b");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = "rgba(255,255,255,0.07)";
    ctx.fillRect(16, 16, W - 32, 55);
    ctx.fillRect(16, 82, W - 32, 18);
    ctx.fillRect(16, 108, (W - 32) * 0.7, 18);

    if (showNameWatermark && businessName) {
      ctx.font = "bold 11px Inter, sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      const padding = 12;
      const text = businessName;
      const textW = ctx.measureText(text).width;
      const textH = 14;
      let x = 0, y = 0;
      switch (position) {
        case "bottom_right": x = W - textW - padding; y = H - padding; break;
        case "bottom_left":  x = padding;             y = H - padding; break;
        case "top_right":    x = W - textW - padding; y = padding + textH; break;
        case "top_left":     x = padding;             y = padding + textH; break;
        case "center":       x = (W - textW) / 2;     y = H / 2; break;
        default:             x = W - textW - padding; y = H - padding;
      }
      ctx.shadowColor = "rgba(0,0,0,0.6)";
      ctx.shadowBlur = 4;
      ctx.fillText(text, x, y);
      ctx.shadowBlur = 0;
    }

    if (!logoBase64) {
      ctx.fillStyle = (accentHex ?? "#22c55e") + "55";
      ctx.fillRect(W / 2 - 16, H / 2 - 16, 32, 32);
    } else {
      const img = new Image();
      img.onload = () => {
        const size = 28;
        const pad = 12;
        let lx = 0, ly = 0;
        switch (position) {
          case "bottom_right": lx = W - size - pad; ly = H - size - 20 - pad; break;
          case "bottom_left":  lx = pad;             ly = H - size - 20 - pad; break;
          case "top_right":    lx = W - size - pad;  ly = pad;                  break;
          case "top_left":     lx = pad;             ly = pad;                  break;
          case "center":       lx = (W - size) / 2;  ly = H / 2 - size - 8;    break;
          default:             lx = W - size - pad;  ly = H - size - 20 - pad;
        }
        ctx.drawImage(img, lx, ly, size, size);
      };
      img.src = logoBase64;
    }
  }, [position, logoBase64, showNameWatermark, businessName, accentHex]);

  return (
    <canvas
      ref={canvasRef}
      width={220}
      height={160}
      className="rounded-lg border border-white/10 w-full max-w-[220px]"
    />
  );
}

// ── Palette swatch display ────────────────────────────────────────────────────

function PaletteSwatches({ palette, onReset }: { palette: ExtractedPalette; onReset: () => void }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-lg">
      <div className="flex gap-2 flex-shrink-0">
        <div
          className="w-7 h-7 rounded-full border-2 border-white/20 shadow-md"
          style={{ backgroundColor: palette.primaryHex }}
          title={`Primary: ${palette.primaryHex}`}
        />
        <div
          className="w-7 h-7 rounded-full border-2 border-white/20 shadow-md"
          style={{ backgroundColor: palette.secondaryHex }}
          title={`Accent: ${palette.secondaryHex}`}
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground leading-tight">Brand colours applied</p>
        <p className="text-xs text-muted-foreground font-mono">
          {palette.primaryHex} · {palette.secondaryHex}
        </p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
        onClick={onReset}
        title="Reset to default theme"
      >
        <RefreshCw className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

function BrandColorControl({
  label,
  value,
  fallback,
  onChange,
}: {
  label: string;
  value: string;
  fallback: string;
  onChange: (value: string) => void;
}) {
  const safeValue = /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback;
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</Label>
      <div className="flex items-center gap-2">
        <div className="relative h-10 w-10 flex-shrink-0">
          <div className="h-10 w-10 rounded-lg border-2 border-white/20 shadow-md ring-1 ring-black/10" style={{ backgroundColor: safeValue }} />
          <input
            data-testid={`input-color-picker-${label.toLowerCase()}`}
            type="color"
            value={safeValue}
            onChange={(event) => onChange(event.target.value)}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            aria-label={`Pick ${label.toLowerCase()} brand colour`}
          />
        </div>
        <Input
          data-testid={`input-color-${label.toLowerCase()}`}
          value={value}
          onChange={(event) => onChange(event.target.value.startsWith("#") ? event.target.value : `#${event.target.value}`)}
          maxLength={7}
          spellCheck={false}
          className="min-w-0 flex-1 border-border bg-background/50 font-mono text-sm"
          placeholder={fallback}
        />
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { signOut } = useClerk();
  const { user } = useUser();
  const { palette, setPalette, clearPalette } = useBrandTheme();

  const { data: profile, isLoading } = useGetBrandProfile();
  const createProfile = useCreateBrandProfile();
  const updateProfile = useUpdateBrandProfile();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaKitInputRef = useRef<HTMLInputElement>(null);
  const [saved, setSaved] = useState(false);
  const [extracting, setExtracting] = useState(false);

  // Form state
  const [businessName, setBusinessName]           = useState("");
  const [instagramHandle, setInstagramHandle]     = useState("");
  const [location, setLocation2]                  = useState("");
  const [timezone, setTimezone]                   = useState("America/Toronto");
  const [logoBase64, setLogoBase64]               = useState<string | null>(null);
  const [watermarkPosition, setWatermarkPosition] = useState("bottom_right");
  const [showNameWatermark, setShowNameWatermark] = useState(true);
  const [primaryColorHex, setPrimaryColorHex]     = useState("#22c55e");
  const [secondaryColorHex, setSecondaryColorHex] = useState("#15803d");
  const [accentColorHex, setAccentColorHex]       = useState("#d4a017");
  const [backgroundColorHex, setBackgroundColorHex] = useState("#0a140b");
  const [fontStyle, setFontStyle]                 = useState("MODERN");
  const [layoutGrid, setLayoutGrid]               = useState("CENTERED");
  const [visualMotif, setVisualMotif]             = useState("SMOKE");
  const [toneOfVoice, setToneOfVoice]             = useState("FRIENDLY");
  const [targetAudience, setTargetAudience]       = useState("");
  const [competitorHandles, setCompetitorHandles] = useState("");

  const isSaving = createProfile.isPending || updateProfile.isPending;
  const profileExists = !!profile && !("error" in (profile as object));

  // Populate form from fetched profile
  useEffect(() => {
    if (!profile) return;
    const p = profile as any;
    if (p.error) return;
    setBusinessName(p.businessName || "");
    setInstagramHandle(p.instagramHandle || "");
    setLocation2(p.location || "");
    setTimezone(p.timezone || "America/Toronto");
    setLogoBase64(p.logoBase64 || null);
    setWatermarkPosition(p.watermarkPosition || "bottom_right");
    setShowNameWatermark(p.showNameWatermark ?? true);
    // Older profiles store two colors in brandColors. Newer profiles may expose all
    // brand-kit values individually, so preserve either shape during the rollout.
    const hexMatches = (p.brandColors || "").match(/#[0-9a-fA-F]{6}/gi) ?? [];
    const kit = p.brandKit || p;
    setPrimaryColorHex(kit.primaryColor || hexMatches[0] || "#22c55e");
    setSecondaryColorHex(kit.secondaryColor || hexMatches[1] || "#15803d");
    setAccentColorHex(kit.accentColor || hexMatches[2] || "#d4a017");
    setBackgroundColorHex(kit.backgroundColor || hexMatches[3] || "#0a140b");
    const legacyFontStyles: Record<string, string> = { modern: "MODERN", bold: "STREETWEAR", elegant: "LUXURY", casual: "MINIMAL" };
    const legacyTones: Record<string, string> = { professional: "PREMIUM", friendly: "FRIENDLY", bold: "BOLD", luxury: "SOPHISTICATED" };
    const resolvedFont = legacyFontStyles[kit.fontStyle] || kit.fontStyle;
    const resolvedTone = legacyTones[kit.toneOfVoice || p.brandVoice] || kit.toneOfVoice;
    setFontStyle(FONT_STYLES.some((style) => style.value === resolvedFont) ? resolvedFont : "MODERN");
    setLayoutGrid(LAYOUT_GRIDS.some((grid) => grid.value === kit.layoutGrid) ? kit.layoutGrid : "CENTERED");
    setVisualMotif(VISUAL_MOTIFS.some((motif) => motif.value === kit.visualMotif) ? kit.visualMotif : "SMOKE");
    setToneOfVoice(TONES_OF_VOICE.some((tone) => tone.value === resolvedTone) ? resolvedTone : "FRIENDLY");
    setTargetAudience(p.targetAudience || "");
    setCompetitorHandles(p.competitorHandles || "");
  }, [profile]);

  // Logo upload
  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp", "image/svg+xml"].includes(file.type)) {
      toast({ title: "Unsupported format", description: "Upload a PNG, JPG, WebP, or SVG file.", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setLogoBase64(dataUrl);
      await runColorExtraction(dataUrl, "logo");
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // Media kit upload (palette only)
  const handleMediaKitChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      toast({ title: "Unsupported format", description: "Upload a PNG, JPG, or WebP media kit image.", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      await runColorExtraction(reader.result as string, "media kit");
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // Apply a hex color as the CSS :root --primary variable live
  const applyPrimaryColorToCss = (hex: string) => {
    if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return;
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    if (max === min) return;
    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    let h = 0;
    if (max === r)      h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else                h = ((r - g) / d + 4) / 6;
    const hslStr = `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
    document.documentElement.style.setProperty("--primary", hslStr);
    document.documentElement.style.setProperty("--ring", hslStr);
    document.documentElement.style.setProperty("--sidebar-primary", hslStr);
  };

  const runColorExtraction = async (dataUrl: string, source: string) => {
    setExtracting(true);
    try {
      const extracted = await extractPaletteFromDataUrl(dataUrl);
      if (extracted) {
        setPalette(extracted);
        setPrimaryColorHex(extracted.primaryHex);
        setSecondaryColorHex(extracted.secondaryHex);
        applyPrimaryColorToCss(extracted.primaryHex);
        toast({
          title: "🎨 Brand colours extracted!",
          description: `Primary ${extracted.primaryHex} · Accent ${extracted.secondaryHex} — UI theme updated.`,
        });
      } else {
        toast({
          title: "Colour extraction skipped",
          description: `The ${source} appears achromatic. Upload a colourful asset for best results.`,
        });
      }
    } finally {
      setExtracting(false);
    }
  };

  const handleSave = async () => {
    if (!businessName.trim()) {
      toast({ title: "Business name required", description: "Please enter your dispensary name.", variant: "destructive" });
      return;
    }

    const payload = {
      businessName: businessName.trim(),
      industry: INDUSTRY,
      instagramHandle: instagramHandle.trim() || undefined,
      location: location.trim() || undefined,
      timezone,
      logoBase64: logoBase64 || undefined,
      watermarkPosition,
      showNameWatermark,
      // Keep the legacy field populated so existing image generation continues to
      // receive brand colors while the expanded kit is available to newer APIs.
      brandColors: `${primaryColorHex}, ${secondaryColorHex}, ${accentColorHex}, ${backgroundColorHex}`,
      primaryColor: primaryColorHex,
      secondaryColor: secondaryColorHex,
      accentColor: accentColorHex,
      backgroundColor: backgroundColorHex,
      fontStyle,
      layoutGrid,
      visualMotif,
      toneOfVoice,
      brandVoice: toneOfVoice.toLowerCase(),
      targetAudience: targetAudience.trim() || undefined,
      competitorHandles: competitorHandles.trim() || undefined,
    };

    try {
      if (profileExists) {
        await updateProfile.mutateAsync({ data: payload as any });
      } else {
        await createProfile.mutateAsync({ data: payload as any });
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      toast({ title: "Brand kit saved! 🌿", description: "Your settings are live for all future posts." });
    } catch {
      toast({ title: "Save failed", description: "Something went wrong. Please try again.", variant: "destructive" });
    }
  };

  const handleSignOut = async () => {
    sessionStorage.removeItem(BYPASS_KEY);
    try {
      await signOut({ redirectUrl: "/landing" });
    } catch {
      setLocation("/landing");
    }
  };

  return (
    <AppLayout>
      <div className="container mx-auto p-4 sm:p-6 space-y-6 sm:space-y-8 max-w-4xl">

        {/* ── Header ──────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-start gap-3 sm:gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/dashboard")}
            className="text-muted-foreground hover:text-foreground -ml-2 shrink-0 min-h-[40px]"
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Dashboard
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
              <Leaf className="h-6 w-6 sm:h-7 sm:w-7 text-primary flex-shrink-0" />
              Brand Kit
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Configure your dispensary's identity. These settings shape every generated post.
            </p>
          </div>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_15px_rgba(34,197,94,0.3)] shrink-0 min-h-[44px]"
          >
            {saved ? (
              <span className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-300" /> Saved</span>
            ) : isSaving ? (
              <span className="flex items-center gap-2"><Save className="h-4 w-4 animate-pulse" /> Saving…</span>
            ) : (
              <span className="flex items-center gap-2"><Save className="h-4 w-4" /> Save Changes</span>
            )}
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
        ) : (
          <div className="space-y-6">

            {/* ── Dispensary Info ──────────────────────────────────── */}
            <Card className="border-border bg-card/60 backdrop-blur shadow-xl relative overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-green-500 via-primary to-emerald-500" />
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Building2 className="h-4 w-4 text-primary" /> Dispensary Info
                </CardTitle>
                <CardDescription>Your business details for branding and AGCO compliance.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                <div className="space-y-2">
                  <Label htmlFor="businessName">Dispensary Name *</Label>
                  <Input
                    id="businessName"
                    placeholder="e.g. Green Valley Cannabis Co."
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className="bg-background/50 border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="instagramHandle" className="flex items-center gap-1.5">
                    <Instagram className="h-3.5 w-3.5 text-pink-500" /> Instagram Handle
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
                    <Input
                      id="instagramHandle"
                      placeholder="yourstore"
                      value={instagramHandle}
                      onChange={(e) => setInstagramHandle(e.target.value.replace(/^@/, ""))}
                      className="bg-background/50 border-border pl-7"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location" className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" /> Location (City)
                  </Label>
                  <Input
                    id="location"
                    placeholder="e.g. Toronto, ON"
                    value={location}
                    onChange={(e) => setLocation2(e.target.value)}
                    className="bg-background/50 border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" /> Timezone
                  </Label>
                  <Select value={timezone} onValueChange={setTimezone}>
                    <SelectTrigger className="bg-background/50 border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEZONES.map((tz) => (
                        <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* ── Media Kit & Dynamic Colour Theme ─────────────────── */}
            <Card className="border-border bg-card/60 backdrop-blur shadow-xl relative overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Sparkles className="h-4 w-4 text-primary" /> Media Kit &amp; Dynamic Colour Theme
                </CardTitle>
                <CardDescription>
                  Upload any brand image to auto-extract your colour palette and apply it throughout the UI.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {palette && (
                  <PaletteSwatches
                    palette={palette}
                    onReset={() => {
                      clearPalette();
                      setPrimaryColorHex("#22c55e");
                       setSecondaryColorHex("#15803d");
                       setAccentColorHex("#d4a017");
                       setBackgroundColorHex("#0a140b");
                      toast({ title: "Theme reset", description: "Restored the default cannabis green palette." });
                    }}
                  />
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Logo upload */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Logo (watermark + colour source)</Label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      onChange={handleLogoChange}
                    />
                    {logoBase64 ? (
                      <div className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                        <img src={logoBase64} alt="Logo" className="h-10 w-10 object-contain rounded flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground">Logo uploaded</p>
                          <p className="text-xs text-muted-foreground">Appears on all generated posts</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                          onClick={() => setLogoBase64(null)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full flex flex-col items-center justify-center gap-2 p-5 border-2 border-dashed border-border rounded-lg hover:border-primary/40 hover:bg-primary/5 transition-colors min-h-[80px]"
                      >
                        <Upload className="h-6 w-6 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground text-center">Upload logo (PNG, JPG, SVG, WebP)</span>
                      </button>
                    )}
                  </div>

                  {/* Media kit upload */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Media Kit{" "}
                      <span className="text-muted-foreground font-normal">(colour extraction only)</span>
                    </Label>
                    <input
                      ref={mediaKitInputRef}
                      type="file"
                      className="hidden"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleMediaKitChange}
                    />
                    <button
                      onClick={() => mediaKitInputRef.current?.click()}
                      disabled={extracting}
                      className="w-full flex flex-col items-center justify-center gap-2 p-5 border-2 border-dashed border-primary/30 rounded-lg hover:border-primary/60 hover:bg-primary/5 transition-colors min-h-[80px] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {extracting ? (
                        <><RefreshCw className="h-6 w-6 text-primary animate-spin" /><span className="text-xs text-primary">Extracting…</span></>
                      ) : (
                        <><Palette className="h-6 w-6 text-primary/70" /><span className="text-xs text-muted-foreground text-center">Upload brand image to extract colours</span></>
                      )}
                    </button>
                  </div>
                </div>

              </CardContent>
            </Card>

            {/* ── Logo & Watermark ─────────────────────────────────── */}
            <Card className="border-border bg-card/60 backdrop-blur shadow-xl relative overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-purple-500 via-primary to-green-500" />
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-base">
                  <ImageIcon className="h-4 w-4 text-primary" /> Watermark Placement
                </CardTitle>
                <CardDescription>
                  Your logo is stamped on every generated image as an AGCO-compliant watermark.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
                  <div className="space-y-5">
                    <div className="space-y-2">
                      <Label>Watermark Position</Label>
                      <Select value={watermarkPosition} onValueChange={setWatermarkPosition}>
                        <SelectTrigger className="bg-background/50 border-border">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {WATERMARK_POSITIONS.map((pos) => (
                            <SelectItem key={pos.value} value={pos.value}>{pos.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-background/30 rounded-lg border border-border gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">Show Name Watermark</p>
                        <p className="text-xs text-muted-foreground">Overlay dispensary name on images</p>
                      </div>
                      <Switch checked={showNameWatermark} onCheckedChange={setShowNameWatermark} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Preview</Label>
                    <WatermarkPreview
                      position={watermarkPosition}
                      logoBase64={logoBase64}
                      showNameWatermark={showNameWatermark}
                      businessName={businessName || "Your Dispensary"}
                      accentHex={palette?.primaryHex ?? primaryColorHex}
                    />
                    <p className="text-xs text-muted-foreground">Live preview of watermark placement</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ── Brand Voice & Style ──────────────────────────────── */}
            <Card className="border-border bg-card/60 backdrop-blur shadow-xl relative overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500" />
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Palette className="h-4 w-4 text-primary" /> Expanded Brand Kit
                </CardTitle>
                <CardDescription>Define the visual fingerprint applied to every generated image and caption.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                <div className="space-y-2">
                  <Label>Font Personality</Label>
                  <Select value={fontStyle} onValueChange={setFontStyle}>
                    <SelectTrigger className="bg-background/50 border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FONT_STYLES.map((style) => (
                        <SelectItem key={style.value} value={style.value}>{style.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tone of Voice</Label>
                  <Select value={toneOfVoice} onValueChange={setToneOfVoice}>
                    <SelectTrigger className="bg-background/50 border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TONES_OF_VOICE.map((tone) => (
                        <SelectItem key={tone.value} value={tone.value}>{tone.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Layout Grid</Label>
                  <Select value={layoutGrid} onValueChange={setLayoutGrid}>
                    <SelectTrigger className="bg-background/50 border-border"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {LAYOUT_GRIDS.map((grid) => <SelectItem key={grid.value} value={grid.value}>{grid.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Visual Motif</Label>
                  <Select value={visualMotif} onValueChange={setVisualMotif}>
                    <SelectTrigger className="bg-background/50 border-border"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {VISUAL_MOTIFS.map((motif) => <SelectItem key={motif.value} value={motif.value}>{motif.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-2 space-y-3">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Palette className="h-3.5 w-3.5 text-primary" />
                    Brand Colours <span className="font-normal text-muted-foreground">(used in every visual)</span>
                  </Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <BrandColorControl label="Primary" value={primaryColorHex} fallback="#22c55e" onChange={(value) => {
                      setPrimaryColorHex(value);
                      if (/^#[0-9a-fA-F]{6}$/.test(value)) applyPrimaryColorToCss(value);
                    }} />
                    <BrandColorControl label="Secondary" value={secondaryColorHex} fallback="#15803d" onChange={setSecondaryColorHex} />
                    <BrandColorControl label="Accent" value={accentColorHex} fallback="#d4a017" onChange={setAccentColorHex} />
                    <BrandColorControl label="Background" value={backgroundColorHex} fallback="#0a140b" onChange={setBackgroundColorHex} />
                  </div>
                  <p className="text-xs text-muted-foreground">Upload extraction fills primary and secondary; adjust all four for a complete signature.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="targetAudience" className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-muted-foreground" /> Target Audience
                  </Label>
                  <Input
                    id="targetAudience"
                    placeholder="e.g. Adults 25–45, wellness-focused"
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    className="bg-background/50 border-border"
                  />
                </div>
              </CardContent>
            </Card>

            {/* ── Competitive Intelligence ─────────────────────────── */}
            <Card className="border-border bg-card/60 backdrop-blur shadow-xl relative overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-purple-500 to-pink-500" />
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Megaphone className="h-4 w-4 text-primary" /> Competitive Intelligence
                </CardTitle>
                <CardDescription>Optional. Helps the AI differentiate your content from nearby competitors.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="competitorHandles">Competitor Instagram Handles</Label>
                  <Textarea
                    id="competitorHandles"
                    placeholder="@dispensaryone, @cannabisstore2, @torontoweed"
                    value={competitorHandles}
                    onChange={(e) => setCompetitorHandles(e.target.value)}
                    className="bg-background/50 border-border resize-none min-h-[80px]"
                  />
                  <p className="text-xs text-muted-foreground">Comma-separated.</p>
                </div>
              </CardContent>
            </Card>

            {/* ── AGCO Notice ──────────────────────────────────────── */}
            <Card className="border-green-500/20 bg-green-500/5">
              <CardContent className="p-4 flex gap-3 items-start">
                <div className="p-1.5 bg-green-500/20 rounded-full mt-0.5 flex-shrink-0">
                  <Leaf className="h-4 w-4 text-green-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-green-400">AGCO Compliance Active</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    All posts include Health Canada–compliant disclaimers and follow AGCO advertising standards for
                    licensed Ontario cannabis retailers. Industry is set to{" "}
                    <strong>cannabis dispensary</strong> — this cannot be changed.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* ── Save footer ──────────────────────────────────────── */}
            <div className="flex justify-end">
              <Button
                onClick={handleSave}
                disabled={isSaving}
                size="lg"
                className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_rgba(34,197,94,0.3)] px-8 min-h-[48px]"
              >
                {saved ? (
                  <span className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-300" /> Saved!</span>
                ) : isSaving ? (
                  <span className="flex items-center gap-2"><Save className="h-4 w-4 animate-pulse" /> Saving…</span>
                ) : (
                  <span className="flex items-center gap-2"><Save className="h-4 w-4" /> Save Brand Kit</span>
                )}
              </Button>
            </div>

            {/* ── Danger Zone ──────────────────────────────────────── */}
            <Card className="border-destructive/20 bg-destructive/5">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base text-destructive/80">
                  <AlertTriangle className="h-4 w-4" /> Account
                </CardTitle>
                <CardDescription>
                  {user?.primaryEmailAddress?.emailAddress && (
                    <span>Signed in as <strong className="text-foreground">{user.primaryEmailAddress.emailAddress}</strong></span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  onClick={handleSignOut}
                  className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive hover:border-destructive/60 gap-2 min-h-[44px]"
                >
                  <LogOut className="h-4 w-4" /> Sign Out
                </Button>
              </CardContent>
            </Card>

            <div className="pb-8" />
          </div>
        )}
      </div>
    </AppLayout>
  );
}
