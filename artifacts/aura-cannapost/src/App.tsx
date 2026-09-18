import { useEffect, useRef, useState } from "react";
import { ClerkProvider, SignIn, SignUp, Show, useClerk, useUser } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { Switch, Route, useLocation, Router as WouterRouter, Redirect, Link } from 'wouter';
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ArrowLeft, Leaf } from "lucide-react";

import LandingPage from "@/pages/LandingPage";
import DashboardPage from "@/pages/DashboardPage";
import HistoryPage from "@/pages/HistoryPage";
import CalendarPage from "@/pages/CalendarPage";
import SettingsPage from "@/pages/SettingsPage";
import InstagramPage from "@/pages/InstagramPage";
import SMSPage from "@/pages/SMSPage";
import EmailPage from "@/pages/EmailPage";
import OnboardingPage from "@/pages/OnboardingPage";
import NotFound from "@/pages/not-found";
import { BrandThemeProvider } from "@/contexts/BrandThemeContext";
import { useGetBrandProfile } from "@workspace/api-client-react";

const queryClient = new QueryClient();

// ── Dev bypass ─────────────────────────────────────────────
const BYPASS_KEY = "postaura_bypass_auth";
const isBypassed = () => sessionStorage.getItem(BYPASS_KEY) === "true";
const setBypass  = () => sessionStorage.setItem(BYPASS_KEY, "true");
const IS_DEV     = true; // show bypass on all builds including published

const clerkPubKey   = publishableKeyFromHost(window.location.hostname, import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath      = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath) ? path.slice(basePath.length) || "/" : path;
}

if (!clerkPubKey) throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY');

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary:         "hsl(142, 55%, 40%)",
    colorForeground:      "hsl(120, 8%, 92%)",
    colorMutedForeground: "hsl(130, 8%, 54%)",
    colorDanger:          "hsl(0, 63%, 31%)",
    colorBackground:      "hsl(155, 28%, 5%)",
    colorInput:           "hsl(145, 22%, 13%)",
    colorInputForeground: "hsl(120, 8%, 92%)",
    colorNeutral:         "hsl(145, 22%, 13%)",
    fontFamily: "Inter, sans-serif",
    borderRadius: "0.5rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-background rounded-2xl w-[440px] max-w-full overflow-hidden border border-border shadow-2xl",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-2xl font-bold tracking-tight text-foreground",
    headerSubtitle: "text-muted-foreground",
    socialButtonsBlockButtonText: "text-foreground font-medium",
    formFieldLabel: "text-sm font-medium text-foreground",
    footerActionLink: "text-primary hover:text-primary/90 font-medium",
    footerActionText: "text-muted-foreground",
    dividerText: "text-muted-foreground text-xs",
    identityPreviewEditButton: "text-primary hover:text-primary/90",
    formFieldSuccessText: "text-green-500",
    alertText: "text-destructive font-medium",
    logoBox: "flex justify-center mb-4",
    logoImage: "h-12 w-auto",
    socialButtonsBlockButton: "border-border hover:bg-accent hover:text-accent-foreground",
    formButtonPrimary: "bg-primary text-primary-foreground hover:bg-primary/90",
    formFieldInput: "bg-input border-border text-foreground focus:ring-ring placeholder:text-muted-foreground",
    footerAction: "mt-4 text-center text-sm",
    dividerLine: "bg-border",
    alert: "bg-destructive/10 border-destructive/20 text-destructive",
    otpCodeFieldInput: "bg-input border-border text-foreground focus:ring-ring",
    formFieldRow: "mb-4",
    main: "flex flex-col gap-y-4",
  },
};

// ── Shared Auth page wrapper ────────────────────────────────

function AuthPage({ children }: { children: React.ReactNode }) {
  const [, setLocation] = useLocation();
  const [bypassed, setBypassed] = useState(isBypassed());

  useEffect(() => {
    if (bypassed) setLocation("/dashboard");
  }, [bypassed, setLocation]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-[440px] mb-4">
        <Link
          href="/landing"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to home
        </Link>
      </div>

      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="h-9 w-9 rounded-xl bg-primary/15 flex items-center justify-center">
            <Leaf className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-emerald-400 bg-clip-text text-transparent">
            Aura by CannaPost
          </h1>
        </div>
        <p className="text-muted-foreground text-sm">AI-powered cannabis marketing for Ontario dispensaries</p>
      </div>

      {children}

      {IS_DEV && (
        <div className="mt-8 w-full max-w-[440px] rounded-xl border-2 border-dashed border-amber-500/60 bg-amber-500/5 p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-amber-500 text-center mb-3">
            ⚠ Developer Tools
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setLocation("/landing")}
              className="flex-1 py-2.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-400 font-bold text-sm transition-colors"
            >
              ← Home
            </button>
            <button
              onClick={() => { setBypass(); setBypassed(true); }}
              className="flex-[2] py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-black font-bold text-sm transition-colors"
            >
              ⚡ DEV BYPASS — Skip Clerk Auth
            </button>
          </div>
          <p className="text-[10px] text-amber-600/60 mt-2 text-center">
            Sets <code className="font-mono">postaura_bypass_auth</code> in sessionStorage
          </p>
        </div>
      )}
    </div>
  );
}

function SignInPage() {
  return (
    <AuthPage>
      <SignIn routing="path" path={`${basePath}/sign-in`} />
    </AuthPage>
  );
}

function SignUpPage() {
  return (
    <AuthPage>
      <SignUp routing="path" path={`${basePath}/sign-up`} />
    </AuthPage>
  );
}

function HomeRedirect() {
  return isBypassed() ? <Redirect to="/dashboard" /> : <LandingPage />;
}

// ── Brand profile guard — redirects to onboarding if no profile ────────────

function BrandProfileGuard({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { data: brandProfile, isLoading } = useGetBrandProfile();

  // Paths that don't need a brand profile to access
  const EXEMPT = ["/onboarding", "/settings"];
  const isExempt = EXEMPT.some((p) => location.startsWith(p)) || isBypassed();

  if (!isExempt) {
    if (isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="flex flex-col items-center gap-3">
            <Leaf className="h-8 w-8 text-primary animate-pulse" />
            <p className="text-sm text-muted-foreground">Loading…</p>
          </div>
        </div>
      );
    }
    const profile = brandProfile as any;
    if (!profile || profile.error || !profile.businessName) {
      return <Redirect to="/onboarding" />;
    }
  }

  return <>{children}</>;
}


function ClerkQueryClientCacheInvalidator() {
  const { client } = useClerk();
  const qc = useQueryClient();
  const prevSessionId = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (!client) return;
    const currentSessionId = (client as any).activeSession?.id ?? null;
    if (prevSessionId.current !== undefined && prevSessionId.current !== currentSessionId) {
      qc.clear();
    }
    prevSessionId.current = currentSessionId;
  });

  return null;
}

function ProtectedRoute({ path, component: Component }: { path: string; component: React.ComponentType }) {
  const { isSignedIn, isLoaded } = useUser();

  return (
    <Route path={path}>
      {() => {
        if (isBypassed()) return <Component />;
        if (!isLoaded) return null;
        if (!isSignedIn) return <Redirect to="/sign-in" />;
        return <Component />;
      }}
    </Route>
  );
}

// Wraps all protected routes with the brand profile guard
function ProtectedRouteWithGuard({ path, component: Component }: { path: string; component: React.ComponentType }) {
  const { isSignedIn, isLoaded } = useUser();

  return (
    <Route path={path}>
      {() => {
        if (isBypassed()) return <BrandProfileGuard><Component /></BrandProfileGuard>;
        if (!isLoaded) return null;
        if (!isSignedIn) return <Redirect to="/sign-in" />;
        return <BrandProfileGuard><Component /></BrandProfileGuard>;
      }}
    </Route>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <Switch>
          {/* Public routes */}
          <Route path="/"        component={HomeRedirect} />
          <Route path="/landing" component={LandingPage} />
          <Route path="/sign-in/*?" component={SignInPage} />
          <Route path="/sign-up/*?" component={SignUpPage} />

          {/* Onboarding — auth required, no brand profile needed */}
          <ProtectedRoute path="/onboarding" component={OnboardingPage} />

          {/* Settings — auth required, brand profile not required (user may be setting it up here too) */}
          <ProtectedRoute path="/settings" component={SettingsPage} />

          {/* Protected routes with brand profile guard */}
          <ProtectedRouteWithGuard path="/dashboard" component={DashboardPage} />
          <ProtectedRouteWithGuard path="/calendar"  component={CalendarPage} />
          <ProtectedRouteWithGuard path="/history"   component={HistoryPage} />
          <ProtectedRouteWithGuard path="/instagram" component={InstagramPage} />
          <ProtectedRouteWithGuard path="/sms"       component={SMSPage} />
          <ProtectedRouteWithGuard path="/email"     component={EmailPage} />

          <Route component={NotFound} />
        </Switch>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

export default function App() {
  return (
    <BrandThemeProvider>
      <TooltipProvider>
        <WouterRouter base={basePath}>
          <ClerkProviderWithRoutes />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </BrandThemeProvider>
  );
}
