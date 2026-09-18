import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import AppLayout from "@/components/layout/AppLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Mail,
  ArrowLeft,
  Info,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Lock,
  Key,
  AtSign,
  ShieldCheck,
  Copy,
  CheckCircle,
} from "lucide-react";

const AGCO_EMAIL_FOOTER = `─────────────────────────────────
You are receiving this email because you opted in to receive promotional communications from us.

This offer is valid for individuals 19 years of age or older. Applicable in Ontario only.

To unsubscribe from future marketing emails, click the unsubscribe link at the bottom of this message or reply with "UNSUBSCRIBE".

This communication is intended for adults in Ontario, Canada only and is not directed at persons under the age of 19. Cannabis is not for everyone. Please consume responsibly.

[Your Store Name] · [Store Address] · Ontario, Canada
─────────────────────────────────`;

const DEFAULT_FIELDS = {
  sendgridApiKey: "",
  senderEmail:    "",
};

function getApiHeaders(): HeadersInit {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (
    typeof sessionStorage !== "undefined" &&
    sessionStorage.getItem("postaura_bypass_auth") === "true"
  ) {
    headers["x-dev-bypass"] = "true";
  }
  return headers;
}

export default function EmailPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [form, setForm] = useState(DEFAULT_FIELDS);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [footerCopied, setFooterCopied] = useState(false);

  const isConnected = saved && form.senderEmail.length > 0;

  // Load persisted settings on mount
  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch("/api/channels/email", {
          credentials: "include",
          headers: getApiHeaders(),
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data.connected) {
          setForm((prev) => ({
            ...prev,
            senderEmail: data.senderEmail ?? "",
            // sendgridApiKey is never returned from the server; leave blank
          }));
          setSaved(true);
        }
      } catch {
        // silently ignore — user can still configure
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  function handleChange(field: keyof typeof DEFAULT_FIELDS, value: string) {
    setSaved(false);
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    if (!form.sendgridApiKey.trim()) {
      toast({
        title: "Missing API key",
        description: "Please enter your SendGrid API Key.",
        variant: "destructive",
      });
      return;
    }
    if (!form.senderEmail.trim() || !form.senderEmail.includes("@")) {
      toast({
        title: "Invalid sender email",
        description: "Please enter a valid authorized sender email address.",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/channels/email", {
        method: "PUT",
        credentials: "include",
        headers: getApiHeaders(),
        body: JSON.stringify({
          sendgridApiKey: form.sendgridApiKey,
          senderEmail: form.senderEmail,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error ?? "Failed to save email settings");
      }
      setSaved(true);
      toast({
        title: "Email settings saved",
        description: "Your SendGrid credentials have been stored securely.",
      });
    } catch (err: unknown) {
      toast({
        title: "Save failed",
        description: err instanceof Error ? err.message : "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  function handleCopyFooter() {
    navigator.clipboard.writeText(AGCO_EMAIL_FOOTER);
    setFooterCopied(true);
    setTimeout(() => setFooterCopied(false), 2500);
    toast({ title: "Footer copied", description: "AGCO email footer copied to clipboard." });
  }

  return (
    <AppLayout>
      <div className="container mx-auto p-4 sm:p-6 max-w-4xl space-y-6 sm:space-y-8">

        {/* ── Header ─────────────────────────────────────────────── */}
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/dashboard")}
            className="text-muted-foreground hover:text-foreground -ml-2 mb-2 min-h-[44px]"
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Dashboard
          </Button>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Email Blast</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Connect SendGrid to send AGCO-compliant email campaigns directly from Aura.
          </p>
        </div>

        {/* ── AGCO Compliance Notice ──────────────────────────────── */}
        <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
          <Info className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-amber-500 mb-1">AGCO email marketing rules</p>
            <p className="text-muted-foreground text-xs leading-relaxed">
              Under CASL, cannabis promotional emails require express consent and must include a
              functional unsubscribe mechanism. Health Canada and AGCO prohibit any health claims,
              lifestyle associations, or content that could appeal to minors. Aura's compliance footer
              is automatically appended to every email blast and cannot be removed.
            </p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-6 sm:gap-8">

          {/* ── Left column: status + guide ───────────────────────── */}
          <div className="space-y-5">

            {/* Connection status */}
            <Card className="border-border bg-card/60 backdrop-blur shadow-xl relative overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500" />
              <CardHeader className="pb-3">
                <CardTitle className="text-base">SendGrid Connection Status</CardTitle>
                <CardDescription>For delivering AGCO-compliant email campaigns to your list.</CardDescription>
              </CardHeader>
              <CardContent>
                {isConnected ? (
                  <div className="flex items-center gap-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <div className="h-11 w-11 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-emerald-500">Connected</h3>
                      <p className="text-xs text-foreground/80">
                        Sender: {form.senderEmail}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                    <div className="h-11 w-11 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                      <AlertCircle className="h-6 w-6 text-amber-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-amber-500">Not Connected</h3>
                      <p className="text-xs text-muted-foreground">Enter your SendGrid API key to enable email sending.</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Guide */}
            <Card className="border-border bg-card/40 backdrop-blur">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">How to get SendGrid credentials</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground space-y-3">
                <ol className="list-decimal pl-4 space-y-1.5 leading-relaxed">
                  <li>Create an account at <strong className="text-foreground">sendgrid.com</strong>.</li>
                  <li>Go to <strong className="text-foreground">Settings → API Keys</strong> and create a key with "Mail Send" permission.</li>
                  <li>Under <strong className="text-foreground">Settings → Sender Authentication</strong>, verify your sender domain or single sender.</li>
                  <li>Ensure your verified sender email matches the address entered below.</li>
                  <li>Maintain a CASL-compliant opt-in list — Aura does not manage subscriber lists.</li>
                </ol>
                <a href="https://docs.sendgrid.com/for-developers/sending-email/api-getting-started" target="_blank" rel="noreferrer">
                  <Button variant="link" className="h-auto p-0 text-primary text-xs">
                    Read SendGrid guide <ExternalLink className="h-3 w-3 ml-1" />
                  </Button>
                </a>
              </CardContent>
            </Card>

            {/* AGCO footer preview */}
            <Card className="border-border bg-card/40 backdrop-blur">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Lock className="h-3.5 w-3.5 text-primary" />
                    AGCO Compliance Footer
                    <span className="text-[9px] font-semibold uppercase tracking-widest text-primary/70 bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20">
                      Required
                    </span>
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyFooter}
                    className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1 flex-shrink-0"
                  >
                    {footerCopied ? (
                      <><CheckCircle className="h-3 w-3 text-emerald-500" /> Copied</>
                    ) : (
                      <><Copy className="h-3 w-3" /> Copy</>
                    )}
                  </Button>
                </div>
                <CardDescription className="text-[11px] mt-1">
                  Automatically appended to every email. Cannot be removed — required by AGCO & CASL.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Textarea
                  value={AGCO_EMAIL_FOOTER}
                  readOnly
                  rows={10}
                  className="font-mono text-[10px] leading-relaxed text-muted-foreground bg-background/60 border-border/60 resize-none cursor-default select-all focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </CardContent>
            </Card>
          </div>

          {/* ── Right column: configuration form ───────────────────── */}
          <Card className="border-border bg-card/60 backdrop-blur shadow-xl relative overflow-hidden h-fit">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500" />
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Mail className="h-4 w-4 text-blue-400" />
                SendGrid Configuration
              </CardTitle>
              <CardDescription className="text-xs">
                Your API key is stored securely on the server and is never returned to the browser.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-5">

              {/* SendGrid API Key */}
              <div className="space-y-2">
                <Label htmlFor="sendgridApiKey" className="text-sm flex items-center gap-1.5">
                  <Key className="h-3.5 w-3.5 text-muted-foreground" />
                  SendGrid API Key
                </Label>
                <Input
                  id="sendgridApiKey"
                  type="password"
                  placeholder={saved ? "SG.•••••••••••••••••••  (stored — enter to update)" : "SG.xxxxxxxxxxxxxxxxxxxx"}
                  value={form.sendgridApiKey}
                  onChange={(e) => handleChange("sendgridApiKey", e.target.value)}
                  className="bg-background font-mono text-sm"
                  autoComplete="new-password"
                  spellCheck={false}
                  disabled={loading}
                />
                <p className="text-[11px] text-muted-foreground">
                  {saved
                    ? "A key is saved. Enter a new one only if you need to update it."
                    : "Create an API key with \"Mail Send\" access in your SendGrid dashboard — starts with \"SG.\"."}
                </p>
              </div>

              {/* Sender email */}
              <div className="space-y-2">
                <Label htmlFor="senderEmail" className="text-sm flex items-center gap-1.5">
                  <AtSign className="h-3.5 w-3.5 text-muted-foreground" />
                  Authorized Sender Email Address
                </Label>
                <Input
                  id="senderEmail"
                  type="email"
                  placeholder="promos@yourdispensary.ca"
                  value={form.senderEmail}
                  onChange={(e) => handleChange("senderEmail", e.target.value)}
                  className="bg-background font-mono text-sm"
                  autoComplete="email"
                  disabled={loading}
                />
                <p className="text-[11px] text-muted-foreground">
                  Must match a verified sender identity in your SendGrid account.
                </p>
              </div>

              {/* Locked footer notice */}
              <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-3.5">
                <ShieldCheck className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-primary mb-0.5">AGCO compliance footer is locked on</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    The AGCO-mandated email footer is permanently appended to all outbound email blasts.
                    This satisfies CASL unsubscribe requirements and Health Canada age-gate rules and cannot
                    be disabled.
                  </p>
                </div>
              </div>

            </CardContent>

            <CardFooter className="pt-0">
              <Button
                onClick={handleSave}
                disabled={saving || loading}
                className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:opacity-90 transition-opacity min-h-[44px] font-medium"
              >
                {saving
                  ? "Saving…"
                  : saved
                  ? "✓ Saved"
                  : "Save Email Settings"}
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* ── Bottom info strip ───────────────────────────────────── */}
        <div className="rounded-xl border border-border/50 bg-card/30 p-4">
          <p className="text-xs text-muted-foreground text-center leading-relaxed">
            ✓ CASL unsubscribe enforced · ✓ AGCO age-gate & compliance footer locked · ✓ Credentials stored server-side only
          </p>
        </div>

      </div>
    </AppLayout>
  );
}
