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
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  MessageSquare,
  ArrowLeft,
  Info,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Phone,
  ShieldCheck,
  Key,
  Hash,
} from "lucide-react";

const DEFAULT_FIELDS = {
  accountSid:  "",
  authToken:   "",
  senderPhone: "",
  agcoFooter:  true,
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

export default function SMSPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [form, setForm] = useState(DEFAULT_FIELDS);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // isConnected reflects whether settings have been persisted in the DB
  const isConnected = saved && form.accountSid.length > 0 && form.senderPhone.length > 0;

  // Load persisted settings on mount
  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch("/api/channels/sms", {
          credentials: "include",
          headers: getApiHeaders(),
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data.connected) {
          setForm((prev) => ({
            ...prev,
            accountSid: data.accountSid ?? "",
            senderPhone: data.senderPhone ?? "",
            agcoFooter: data.agcoFooter ?? true,
            // authToken is never returned from the server; leave blank
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

  function handleChange(field: keyof typeof DEFAULT_FIELDS, value: string | boolean) {
    setSaved(false);
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    if (!form.accountSid.trim() || !form.authToken.trim() || !form.senderPhone.trim()) {
      toast({
        title: "Missing fields",
        description: "Please fill in your Account SID, Auth Token, and Sender Phone Number.",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/channels/sms", {
        method: "PUT",
        credentials: "include",
        headers: getApiHeaders(),
        body: JSON.stringify({
          accountSid: form.accountSid,
          authToken: form.authToken,
          senderPhone: form.senderPhone,
          agcoFooter: form.agcoFooter,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error ?? "Failed to save SMS settings");
      }
      setSaved(true);
      toast({
        title: "SMS settings saved",
        description: "Your Twilio credentials have been stored securely.",
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
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">SMS Promo</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Connect Twilio to send AGCO-compliant SMS promotions directly to your opt-in customer list.
          </p>
        </div>

        {/* ── AGCO Compliance Notice ──────────────────────────────── */}
        <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
          <Info className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-amber-500 mb-1">AGCO SMS marketing rules</p>
            <p className="text-muted-foreground text-xs leading-relaxed">
              Under CASL and AGCO regulations, SMS cannabis promotions may only be sent to customers
              who have provided express written consent. Every message must include an opt-out mechanism
              (e.g. "Reply STOP to cancel") and your dispensary name. Aura enforces these requirements
              automatically when the AGCO footer toggle is enabled.
            </p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-6 sm:gap-8">

          {/* ── Left column: status + guide ───────────────────────── */}
          <div className="space-y-5">

            {/* Connection status */}
            <Card className="border-border bg-card/60 backdrop-blur shadow-xl relative overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Twilio Connection Status</CardTitle>
                <CardDescription>For sending AGCO-compliant SMS promos to your opt-in list.</CardDescription>
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
                        Sender: {form.senderPhone}
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
                      <p className="text-xs text-muted-foreground">Enter your Twilio credentials to enable SMS sending.</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Guide */}
            <Card className="border-border bg-card/40 backdrop-blur">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">How to get Twilio credentials</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground space-y-3">
                <ol className="list-decimal pl-4 space-y-1.5 leading-relaxed">
                  <li>Create a free account at <strong className="text-foreground">twilio.com</strong>.</li>
                  <li>From your Console Dashboard, copy your <strong className="text-foreground">Account SID</strong> and <strong className="text-foreground">Auth Token</strong>.</li>
                  <li>Purchase or verify a <strong className="text-foreground">phone number</strong> to use as your sender ID.</li>
                  <li>Ensure your Twilio number is approved for cannabis-adjacent use in your region.</li>
                  <li>Maintain a CASL-compliant opt-in list — Aura does not manage subscriber lists.</li>
                </ol>
                <a href="https://www.twilio.com/docs/sms/quickstart" target="_blank" rel="noreferrer">
                  <Button variant="link" className="h-auto p-0 text-primary text-xs">
                    Read Twilio SMS guide <ExternalLink className="h-3 w-3 ml-1" />
                  </Button>
                </a>
              </CardContent>
            </Card>

            {/* AGCO footer preview */}
            <Card className="border-border bg-card/40 backdrop-blur">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  AGCO Opt-Out Footer Preview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg bg-background/70 border border-border/60 p-3">
                  <p className="text-xs text-muted-foreground font-mono leading-relaxed">
                    Reply STOP to cancel. 19+ ON only. [Your Store Name]
                  </p>
                </div>
                <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed">
                  This footer is automatically appended to every SMS when the toggle is enabled.
                  It satisfies both CASL opt-out and AGCO age-gate requirements.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* ── Right column: configuration form ───────────────────── */}
          <Card className="border-border bg-card/60 backdrop-blur shadow-xl relative overflow-hidden h-fit">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageSquare className="h-4 w-4 text-emerald-500" />
                Twilio Configuration
              </CardTitle>
              <CardDescription className="text-xs">
                Your credentials are stored securely and never exposed to the browser after saving.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-5">

              {/* Account SID */}
              <div className="space-y-2">
                <Label htmlFor="accountSid" className="text-sm flex items-center gap-1.5">
                  <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                  Twilio Account SID
                </Label>
                <Input
                  id="accountSid"
                  placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  value={form.accountSid}
                  onChange={(e) => handleChange("accountSid", e.target.value)}
                  className="bg-background font-mono text-sm"
                  autoComplete="off"
                  spellCheck={false}
                  disabled={loading}
                />
                <p className="text-[11px] text-muted-foreground">
                  Found on your Twilio Console dashboard — starts with "AC".
                </p>
              </div>

              {/* Auth Token */}
              <div className="space-y-2">
                <Label htmlFor="authToken" className="text-sm flex items-center gap-1.5">
                  <Key className="h-3.5 w-3.5 text-muted-foreground" />
                  Twilio Auth Token
                </Label>
                <Input
                  id="authToken"
                  type="password"
                  placeholder={saved ? "••••••••••••••••••••••••••••••••  (stored — enter to update)" : "••••••••••••••••••••••••••••••••"}
                  value={form.authToken}
                  onChange={(e) => handleChange("authToken", e.target.value)}
                  className="bg-background font-mono text-sm"
                  autoComplete="new-password"
                  disabled={loading}
                />
                <p className="text-[11px] text-muted-foreground">
                  {saved
                    ? "A token is saved. Enter a new one only if you need to update it."
                    : "Treat this like a password — do not share it publicly."}
                </p>
              </div>

              {/* Sender phone */}
              <div className="space-y-2">
                <Label htmlFor="senderPhone" className="text-sm flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                  Approved Sender Phone Number
                </Label>
                <Input
                  id="senderPhone"
                  type="tel"
                  placeholder="+16135550100"
                  value={form.senderPhone}
                  onChange={(e) => handleChange("senderPhone", e.target.value)}
                  className="bg-background font-mono text-sm"
                  disabled={loading}
                />
                <p className="text-[11px] text-muted-foreground">
                  The Twilio number your SMS promos will be sent from, in E.164 format.
                </p>
              </div>

              {/* AGCO footer toggle */}
              <div className="flex items-start justify-between gap-4 rounded-xl border border-border bg-background/40 p-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <ShieldCheck className="h-4 w-4 text-primary flex-shrink-0" />
                    <span className="text-sm font-medium">Enforce AGCO Opt-Out Footer</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed mt-1">
                    Appends "Reply STOP to cancel. 19+ ON only." to every outbound SMS.
                    Disabling this may put you out of compliance with CASL and AGCO regulations.
                  </p>
                </div>
                <Switch
                  id="agcoFooter"
                  checked={form.agcoFooter}
                  onCheckedChange={(v) => handleChange("agcoFooter", v)}
                  className="mt-0.5 flex-shrink-0"
                  aria-label="Enforce AGCO Opt-Out Footer"
                  disabled={loading}
                />
              </div>

            </CardContent>

            <CardFooter className="pt-0">
              <Button
                onClick={handleSave}
                disabled={saving || loading}
                className="w-full bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:opacity-90 transition-opacity min-h-[44px] font-medium"
              >
                {saving
                  ? "Saving…"
                  : saved
                  ? "✓ Saved"
                  : "Save SMS Settings"}
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* ── Bottom info strip ───────────────────────────────────── */}
        <div className="rounded-xl border border-border/50 bg-card/30 p-4">
          <p className="text-xs text-muted-foreground text-center leading-relaxed">
            ✓ CASL opt-out enforced · ✓ AGCO age-gate included · ✓ Credentials stored server-side only
          </p>
        </div>

      </div>
    </AppLayout>
  );
}
