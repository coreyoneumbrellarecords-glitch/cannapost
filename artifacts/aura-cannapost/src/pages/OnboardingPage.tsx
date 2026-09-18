import { useRef, useState } from "react";
import { useLocation } from "wouter";
import { useCreateBrandProfile, useUpdateBrandProfile } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  Leaf,
  Sparkles,
  Shield,
  Instagram,
  ChevronRight,
  Upload,
  X,
  Check,
  Rocket,
  MapPin,
} from "lucide-react";

const TOTAL_STEPS = 4;

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div
            className={`h-2.5 w-2.5 rounded-full transition-all duration-300 ${
              i < current
                ? "bg-primary shadow-[0_0_8px_rgba(34,197,94,0.8)]"
                : i === current
                ? "bg-primary/60 scale-125"
                : "bg-border"
            }`}
          />
          {i < TOTAL_STEPS - 1 && (
            <div className={`h-px w-8 transition-colors duration-300 ${i < current ? "bg-primary/50" : "bg-border"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

export default function OnboardingPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const createProfile = useCreateBrandProfile();
  const updateProfile = useUpdateBrandProfile();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(0);
  const [createdProfile, setCreatedProfile] = useState(false);

  // Step 2 data
  const [businessName, setBusinessName] = useState("");
  const [location2, setLocation2] = useState("");
  const [instagramHandle, setInstagramHandle] = useState("");

  // Step 3 data
  const [logoBase64, setLogoBase64] = useState<string | null>(null);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp", "image/svg+xml"].includes(file.type)) {
      toast({ title: "Unsupported format", description: "Upload PNG, JPG, WebP or SVG.", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setLogoBase64(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleStep2Next = async () => {
    if (!businessName.trim()) {
      toast({ title: "Store name required", description: "Please enter your dispensary name to continue.", variant: "destructive" });
      return;
    }
    try {
      await createProfile.mutateAsync({
        data: {
          businessName: businessName.trim(),
          industry: "cannabis_dispensary",
          instagramHandle: instagramHandle.trim() || undefined,
          location: location2.trim() || undefined,
          timezone: "America/Toronto",
          brandVoice: "educational",
          fontStyle: "modern",
        } as any,
      });
      setCreatedProfile(true);
      setStep(3);
    } catch {
      toast({ title: "Something went wrong", description: "Please try again.", variant: "destructive" });
    }
  };

  const handleStep3Next = async () => {
    if (logoBase64 && createdProfile) {
      try {
        await updateProfile.mutateAsync({ data: { logoBase64 } as any });
      } catch {
        // Non-fatal — proceed anyway
      }
    }
    setStep(4);
  };

  const handleFinish = () => setLocation("/dashboard");

  const slideVariants = {
    enter: { opacity: 0, x: 40 },
    center: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -40 },
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center px-4 py-12">
      {/* Logo */}
      <div className="flex items-center gap-2 mb-12">
        <div className="h-9 w-9 rounded-xl bg-primary/15 flex items-center justify-center">
          <Leaf className="h-5 w-5 text-primary" />
        </div>
        <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-primary to-emerald-400 bg-clip-text text-transparent">
          Aura
        </span>
        <span className="text-sm text-muted-foreground font-medium">by CannaPost</span>
      </div>

      <div className="w-full max-w-md">
        <StepIndicator current={step} />

        <AnimatePresence mode="wait">

          {/* ── Step 0: Welcome ─────────────────────────────────────── */}
          {step === 0 && (
            <motion.div
              key="step0"
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25 }}
              className="text-center space-y-6"
            >
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 border border-primary/20 mx-auto">
                <Sparkles className="h-9 w-9 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight mb-3">Welcome to Aura</h1>
                <p className="text-muted-foreground leading-relaxed">
                  Your AI-powered cannabis marketing studio for Ontario dispensaries. We'll generate
                  AGCO-compliant Instagram posts with professional images — all in seconds.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center py-2">
                {[
                  { icon: Sparkles, label: "AI Captions", color: "text-primary" },
                  { icon: Shield, label: "AGCO Compliant", color: "text-emerald-500" },
                  { icon: Instagram, label: "IG Ready", color: "text-pink-500" },
                ].map(({ icon: Icon, label, color }) => (
                  <div key={label} className="flex flex-col items-center gap-2 p-3 rounded-xl bg-card/50 border border-border">
                    <Icon className={`h-5 w-5 ${color}`} />
                    <span className="text-xs text-muted-foreground font-medium">{label}</span>
                  </div>
                ))}
              </div>
              <Button
                size="lg"
                onClick={() => setStep(1)}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_rgba(34,197,94,0.3)] h-12"
              >
                Let's Get Started <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </motion.div>
          )}

          {/* ── Step 1: Info intro ──────────────────────────────────── */}
          {step === 1 && (
            <motion.div
              key="step1"
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              <div className="text-center">
                <h2 className="text-2xl font-bold mb-2">About your store</h2>
                <p className="text-muted-foreground text-sm">
                  We'll use this to personalise every post. Store name is required — the rest can be added anytime.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="ob-name">
                    Dispensary Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="ob-name"
                    placeholder="e.g. Green Valley Cannabis Co."
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className="bg-background/50 border-border h-12"
                    onKeyDown={(e) => { if (e.key === "Enter") handleStep2Next(); }}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ob-location" className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" /> City / Location
                    <span className="text-xs text-muted-foreground font-normal ml-1">(optional)</span>
                  </Label>
                  <Input
                    id="ob-location"
                    placeholder="e.g. Toronto, ON"
                    value={location2}
                    onChange={(e) => setLocation2(e.target.value)}
                    className="bg-background/50 border-border h-12"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ob-ig" className="flex items-center gap-1.5">
                    <Instagram className="h-3.5 w-3.5 text-pink-500" /> Instagram Handle
                    <span className="text-xs text-muted-foreground font-normal ml-1">(optional)</span>
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
                    <Input
                      id="ob-ig"
                      placeholder="yourstore"
                      value={instagramHandle}
                      onChange={(e) => setInstagramHandle(e.target.value.replace(/^@/, ""))}
                      className="bg-background/50 border-border h-12 pl-7"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="ghost" onClick={() => setStep(0)} className="flex-1 h-12">
                  Back
                </Button>
                <Button
                  onClick={handleStep2Next}
                  disabled={createProfile.isPending}
                  className="flex-[2] bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_15px_rgba(34,197,94,0.25)] h-12"
                >
                  {createProfile.isPending ? "Saving…" : (
                    <>Continue <ChevronRight className="h-4 w-4 ml-2" /></>
                  )}
                </Button>
              </div>
            </motion.div>
          )}

          {/* ── Step 2: Logo upload ─────────────────────────────────── */}
          {step === 3 && (
            <motion.div
              key="step3"
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              <div className="text-center">
                <h2 className="text-2xl font-bold mb-2">Upload your logo</h2>
                <p className="text-muted-foreground text-sm">
                  Your logo appears as a watermark on every generated post. You can update this anytime in Brand Kit.
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={handleLogoChange}
              />

              {logoBase64 ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="relative">
                    <img
                      src={logoBase64}
                      alt="Logo preview"
                      className="h-32 w-32 object-contain rounded-2xl border border-primary/20 bg-card/50 p-4"
                    />
                    <button
                      onClick={() => setLogoBase64(null)}
                      className="absolute -top-2 -right-2 h-7 w-7 rounded-full bg-destructive/80 hover:bg-destructive flex items-center justify-center"
                    >
                      <X className="h-3.5 w-3.5 text-white" />
                    </button>
                  </div>
                  <p className="text-sm text-muted-foreground">Looking great! Ready to continue.</p>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex flex-col items-center justify-center gap-3 p-10 border-2 border-dashed border-border rounded-2xl hover:border-primary/40 hover:bg-primary/5 transition-colors"
                >
                  <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                    <Upload className="h-7 w-7 text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-foreground">Click to upload logo</p>
                    <p className="text-xs text-muted-foreground mt-1">PNG, JPG, SVG or WebP</p>
                  </div>
                </button>
              )}

              <div className="flex gap-3">
                <Button variant="ghost" onClick={() => setStep(4)} className="flex-1 h-12 text-muted-foreground">
                  Skip for now
                </Button>
                <Button
                  onClick={handleStep3Next}
                  disabled={updateProfile.isPending}
                  className="flex-[2] bg-primary text-primary-foreground hover:bg-primary/90 h-12"
                >
                  {updateProfile.isPending ? "Saving…" : (
                    <>Continue <ChevronRight className="h-4 w-4 ml-2" /></>
                  )}
                </Button>
              </div>
            </motion.div>
          )}

          {/* ── Step 3: Done ────────────────────────────────────────── */}
          {step === 4 && (
            <motion.div
              key="step4"
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25 }}
              className="text-center space-y-6"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.1, stiffness: 200 }}
                className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 border border-primary/30 mx-auto"
              >
                <Check className="h-10 w-10 text-primary" />
              </motion.div>

              <div>
                <h2 className="text-3xl font-bold mb-3">
                  You're all set,{" "}
                  <span className="bg-gradient-to-r from-primary to-emerald-400 bg-clip-text text-transparent">
                    {businessName || "Dispensary"}
                  </span>
                  !
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  Your brand kit is saved. Head to the Studio to generate your first AGCO-compliant Instagram post in seconds.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 text-left">
                {[
                  "Describe a product or promotion",
                  "Our AI writes a compliant caption",
                  "A professional image is generated",
                  "Post directly to Instagram",
                ].map((step, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-card/50 border border-border">
                    <div className="h-6 w-6 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-primary">{i + 1}</span>
                    </div>
                    <p className="text-sm text-foreground/80">{step}</p>
                  </div>
                ))}
              </div>

              <Button
                size="lg"
                onClick={handleFinish}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_25px_rgba(34,197,94,0.4)] h-12"
              >
                <Rocket className="h-4 w-4 mr-2" /> Generate My First Post
              </Button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
