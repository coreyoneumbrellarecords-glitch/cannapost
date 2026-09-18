import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, Link } from "wouter";
import { useClerk } from "@clerk/react";
import AppLayout from "@/components/layout/AppLayout";
import {
  useGetMe,
  useGetAnalyticsSummary,
  useListPosts,
  useGeneratePost,
  useGetSuggestedPrompts,
  useGetBrandProfile,
} from "@workspace/api-client-react";
import type { GeneratePostInput, Post } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Sparkles,
  Send,
  Copy,
  Image as ImageIcon,
  Instagram,
  ArrowUpRight,
  BarChart3,
  Activity,
  Upload,
  X,
  Leaf,
  Settings,
  Download,
  CheckCircle2,
  Smartphone,
  EyeOff,
  MessageSquare,
  Mail,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  RefreshCw,
  WandSparkles,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const BYPASS_KEY = "postaura_bypass_auth";
// Posts hidden from view this session (not deleted from DB)
const SESSION_HIDDEN_KEY = "aura_session_hidden_posts";
const CHECKLIST_DISMISSED_KEY = "aura_checklist_dismissed";

function getHiddenIds(): Set<string> {
  try {
    const raw = sessionStorage.getItem(SESSION_HIDDEN_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function addHiddenId(id: string) {
  const ids = getHiddenIds();
  ids.add(id);
  sessionStorage.setItem(SESSION_HIDDEN_KEY, JSON.stringify([...ids]));
}

// Download image via blob to handle CORS
async function downloadImage(url: string, filename = "aura-post.jpg") {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(objectUrl);
  } catch {
    window.open(url, "_blank");
  }
}

// ── Quickstart Checklist ──────────────────────────────────────────────────────

function QuickstartChecklist({
  hasBrandKit,
  hasInstagram,
  hasPost,
}: {
  hasBrandKit: boolean;
  hasInstagram: boolean;
  hasPost: boolean;
}) {
  const [dismissed, setDismissed] = useState(() =>
    localStorage.getItem(CHECKLIST_DISMISSED_KEY) === "true"
  );
  const [collapsed, setCollapsed] = useState(false);

  const steps = [
    { label: "Configure Brand Kit", done: hasBrandKit, href: "/settings", icon: Settings },
    { label: "Connect Instagram Account", done: hasInstagram, href: "/instagram", icon: Instagram },
    { label: "Generate First AGCO-Compliant Post", done: hasPost, href: null, icon: Sparkles },
  ];

  const doneCount = steps.filter((s) => s.done).length;
  const progress = Math.round((doneCount / steps.length) * 100);

  function dismiss() {
    localStorage.setItem(CHECKLIST_DISMISSED_KEY, "true");
    setDismissed(true);
  }

  if (dismissed || doneCount === steps.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
    >
      <Card className="border-primary/30 bg-primary/5 backdrop-blur shadow-lg relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-emerald-400 to-lime-400" />
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-primary/15 flex items-center justify-center">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
            </div>
            <CardTitle className="text-sm font-semibold">Quickstart Setup Checklist</CardTitle>
            <Badge
              className="text-[10px] px-1.5 py-0 bg-primary/20 text-primary border-primary/30"
              variant="outline"
            >
              {doneCount}/{steps.length}
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCollapsed((c) => !c)}
              className="h-7 w-7 flex items-center justify-center rounded hover:bg-primary/10 text-muted-foreground hover:text-foreground transition-colors"
              title={collapsed ? "Expand" : "Collapse"}
            >
              {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
            </button>
            <button
              onClick={dismiss}
              className="h-7 w-7 flex items-center justify-center rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
              title="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        </CardHeader>

        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{ overflow: "hidden" }}
            >
              <CardContent className="pb-4 space-y-3">
                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>Setup progress</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-1.5 bg-primary/10 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-primary to-emerald-400 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                    />
                  </div>
                </div>

                {/* Steps */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {steps.map((step, i) => {
                    const content = (
                      <div
                        className={`flex items-center gap-2.5 p-2.5 rounded-lg border transition-colors ${
                          step.done
                            ? "border-emerald-500/30 bg-emerald-500/10"
                            : "border-border bg-background/50 hover:border-primary/40 hover:bg-primary/5"
                        } ${step.href ? "cursor-pointer" : ""}`}
                      >
                        <div
                          className={`h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                            step.done ? "bg-emerald-500/20" : "bg-primary/10"
                          }`}
                        >
                          {step.done ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                          ) : (
                            <span className="text-[10px] font-bold text-primary">{i + 1}</span>
                          )}
                        </div>
                        <span
                          className={`text-xs font-medium leading-snug ${
                            step.done ? "text-emerald-500 line-through decoration-emerald-500/50" : "text-foreground"
                          }`}
                        >
                          {step.label}
                        </span>
                      </div>
                    );
                    return step.href ? (
                      <Link key={step.label} href={step.href}>
                        {content}
                      </Link>
                    ) : (
                      <div key={step.label}>{content}</div>
                    );
                  })}
                </div>
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}

// ── Instagram Ready Modal ─────────────────────────────────────────────────────

function IGReadyModal({
  open,
  onClose,
  post,
}: {
  open: boolean;
  onClose: () => void;
  post: Post | null;
}) {
  const { toast } = useToast();
  const [captionCopied, setCaptionCopied] = useState(false);

  const handleCopy = () => {
    const text = [post?.caption, post?.hashtags].filter(Boolean).join("\n\n");
    navigator.clipboard.writeText(text);
    setCaptionCopied(true);
    setTimeout(() => setCaptionCopied(false), 2000);
    toast({ title: "Copied!", description: "Caption and hashtags copied to clipboard." });
  };

  const handleDownload = () => {
    if (post?.imageUrl) downloadImage(post.imageUrl);
  };

  if (!post) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-lg w-full mx-4">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Instagram className="h-5 w-5 text-pink-500" />
            Ready for Instagram
          </DialogTitle>
          <DialogDescription>
            Download your image and copy the caption, then post manually via the Instagram app.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Image + caption preview */}
          <div className="grid grid-cols-2 gap-4">
            <div className="aspect-square rounded-xl overflow-hidden bg-muted border border-border">
              {post.imageUrl ? (
                <img src={post.imageUrl} alt="Post" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon className="h-8 w-8 text-muted-foreground/30" />
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2 py-1">
              <p className="text-xs text-foreground/80 leading-relaxed line-clamp-6">{post.caption}</p>
              {post.hashtags && (
                <p className="text-xs text-primary/80 line-clamp-2">{post.hashtags}</p>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              onClick={handleCopy}
              className="min-h-[44px]"
            >
              {captionCopied ? (
                <><CheckCircle2 className="h-4 w-4 mr-2 text-emerald-500" /> Copied!</>
              ) : (
                <><Copy className="h-4 w-4 mr-2" /> Copy Caption</>
              )}
            </Button>
            <Button
              onClick={handleDownload}
              className="bg-primary text-primary-foreground hover:bg-primary/90 min-h-[44px]"
              disabled={!post.imageUrl}
            >
              <Download className="h-4 w-4 mr-2" /> Download Image
            </Button>
          </div>

          {/* Step-by-step instructions */}
          <div className="rounded-xl border border-border bg-background/40 p-4 space-y-3">
            <p className="text-xs font-semibold text-foreground flex items-center gap-2">
              <Smartphone className="h-3.5 w-3.5 text-primary" />
              How to post on Instagram
            </p>
            <ol className="space-y-2">
              {[
                "Tap Download Image above to save the image to your device.",
                "Open the Instagram app and tap the + button.",
                "Select the downloaded image from your gallery.",
                "Tap Copy Caption above, then paste into the caption field.",
                "Review the post and tap Share.",
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-2.5 text-xs text-muted-foreground">
                  <div className="h-4 w-4 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-[9px] font-bold text-primary">{i + 1}</span>
                  </div>
                  {step}
                </li>
              ))}
            </ol>
          </div>

          <p className="text-[10px] text-muted-foreground text-center">
            ✓ AGCO compliant · Health Canada warnings included · 19+ only
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

type ContentType = "instagram" | "sms" | "email";
type InstagramFormat = "post" | "story";

const CONTENT_TYPES: {
  value: ContentType;
  label: string;
  icon: React.ElementType;
  postType: NonNullable<GeneratePostInput["postType"]>;
}[] = [
  { value: "instagram", label: "Instagram Post", icon: Instagram, postType: "post" },
  { value: "sms",       label: "SMS Promo",      icon: MessageSquare, postType: "sms" },
  { value: "email",     label: "Email Blast",    icon: Mail, postType: "email" },
];

const CONTENT_PLACEHOLDERS: Record<ContentType, string> = {
  instagram: "e.g. New strain drop — Blue Dream 24% THC just landed. Highlight the smooth, uplifting experience…",
  sms:       "e.g. Weekend sale — 20% off all pre-rolls this Saturday only. In-store only.",
  email:     "e.g. Monthly newsletter — new arrivals, featured strains, and store updates for November.",
};

function getApiHeaders(): HeadersInit {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (
    typeof sessionStorage !== "undefined" &&
    sessionStorage.getItem(BYPASS_KEY) === "true"
  ) {
    headers["x-dev-bypass"] = "true";
  }
  return headers;
}

function BlastDialog({
  open,
  channel,
  post,
  onClose,
  onSuccess,
}: {
  open: boolean;
  channel: "sms" | "email";
  post: { id?: string | number; caption?: string } | null;
  onClose: () => void;
  onSuccess: (recipientCount: number) => void;
}) {
  const { toast } = useToast();
  const [recipientText, setRecipientText] = useState("");
  const [sending, setSending] = useState(false);
  const isSms = channel === "sms";

  useEffect(() => {
    if (open) {
      setRecipientText("");
      setSending(false);
    }
  }, [open, channel]);

  async function handleSend() {
    const recipients = recipientText
      .split(/[,\n;]+/)
      .map((recipient) => recipient.trim())
      .filter(Boolean);
    if (!post?.id || recipients.length === 0) {
      toast({
        title: "Recipient required",
        description: `Enter at least one ${isSms ? "phone number" : "email address"}.`,
        variant: "destructive",
      });
      return;
    }
    setSending(true);
    try {
      const response = await fetch(`/api/channels/${channel}/send`, {
        method: "POST",
        credentials: "include",
        headers: getApiHeaders(),
        body: JSON.stringify({ postId: post.id, recipients }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error ?? "The message could not be sent.");
      if (data.failedCount > 0) {
        toast({
          title: "Some messages were not sent",
          description: `${data.sentCount} sent and ${data.failedCount} failed. Check your Twilio account before retrying.`,
          variant: "destructive",
        });
        return;
      }
      onSuccess(data.recipientCount ?? recipients.length);
      onClose();
    } catch (error) {
      toast({
        title: `${isSms ? "SMS" : "Email"} send failed`,
        description: error instanceof Error ? error.message : "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="bg-card border-border max-w-md w-full mx-4">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isSms ? <MessageSquare className="h-5 w-5 text-amber-400" /> : <Mail className="h-5 w-5 text-blue-400" />}
            Send via {isSms ? "SMS" : "Email"}
          </DialogTitle>
          <DialogDescription>
            Send this AGCO-compliant {isSms ? "message" : "email"} to opted-in recipients.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="blast-recipients">
              {isSms ? "Phone numbers" : "Email addresses"}
            </Label>
            <Input
              id="blast-recipients"
              value={recipientText}
              onChange={(event) => setRecipientText(event.target.value)}
              placeholder={isSms ? "+14165551234, +14165555678" : "customer@example.com, another@example.com"}
              className="bg-background"
              disabled={sending}
              autoFocus
            />
            <p className="text-[11px] text-muted-foreground">
              Separate multiple recipients with commas. Maximum 100 per send.
              {isSms ? " Use E.164 format, including the + and country code." : ""}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-background/40 p-3 text-xs text-muted-foreground">
            {isSms
              ? "The generated caption will include the saved SMS compliance footer when enabled."
              : "The generated content will be sent as HTML with the AGCO age and unsubscribe footer."}
          </div>
          <Button
            onClick={handleSend}
            disabled={sending}
            className={`w-full min-h-[44px] ${
              isSms
                ? "bg-amber-600 hover:bg-amber-500 text-white"
                : "bg-blue-600 hover:bg-blue-500 text-white"
            }`}
          >
            {sending ? "Sending…" : `Send ${isSms ? "SMS" : "Email"} Blast`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function DashboardPage() {
  const [, setLocation] = useLocation();
  const { signOut } = useClerk();
  const [prompt, setPrompt] = useState("");
  const [contentType, setContentType] = useState<ContentType>("instagram");
  const [instagramFormat, setInstagramFormat] = useState<InstagramFormat>("post");
  const [referenceImage, setReferenceImage] = useState<{ base64: string; preview: string; name: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const [igModalOpen, setIgModalOpen] = useState(false);
  const [generatedPost, setGeneratedPost] = useState<Post | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [complianceBlock, setComplianceBlock] = useState<{ message: string } | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [isBackgroundGenerating, setIsBackgroundGenerating] = useState(false);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(() => getHiddenIds());
  const [blastChannel, setBlastChannel] = useState<"sms" | "email" | null>(null);

  const { data: user }           = useGetMe();
  const { data: brandProfile }   = useGetBrandProfile();
  const { data: analytics, isLoading: isLoadingAnalytics } = useGetAnalyticsSummary();
  const { data: recentPosts, isLoading: isLoadingPosts }   = useListPosts({ limit: 10 });
  const { data: suggestedPrompts, isLoading: isLoadingPrompts } = useGetSuggestedPrompts();

  const generatePost = useGeneratePost();

  const profile = brandProfile as any;
  const brandName  = profile?.businessName;
  const brandLogo  = profile?.logoBase64;
  const hasBrandKit = !!(profile?.businessName);
  const hasInstagram = !!(profile?.instagramHandle);
  const hasPost = ((recentPosts as any)?.total ?? 0) > 0;

  async function handleGoHome() {
    sessionStorage.removeItem(BYPASS_KEY);
    try { await signOut(); } catch { /* dev bypass */ }
    setLocation("/landing");
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      toast({ title: "Unsupported format", description: "Please upload a PNG, JPG, or WebP image.", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setReferenceImage({ base64, preview: base64, name: file.name });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const selectedType = CONTENT_TYPES.find((ct) => ct.value === contentType)!;
  // Keep this locally typed while generated API types are being refreshed. The
  // backend contract accepts "post" and "story" for Instagram image requests.
  const requestedPostType = (contentType === "instagram" ? instagramFormat : selectedType.postType) as GeneratePostInput["postType"];
  const isGenerating = generatePost.isPending || isBackgroundGenerating;

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) return;
    setGeneratedPost(null);
    setShowSuccess(false);
    setComplianceBlock(null);
    setGenerationError(null);

    if (contentType === "instagram") {
      setIsBackgroundGenerating(true);
      try {
        const startResponse = await fetch("/api/posts/generation-jobs", {
          method: "POST",
          credentials: "include",
          headers: getApiHeaders(),
          body: JSON.stringify({
            prompt,
            postType: requestedPostType,
            referenceImageBase64: referenceImage?.base64,
          }),
        });
        const startPayload = await startResponse.json();
        if (!startResponse.ok) throw new Error(startPayload.error ?? `Unable to start generation (${startResponse.status})`);

        let completedPost: Post | null = null;
        for (let attempt = 0; attempt < 360; attempt++) {
          await new Promise((resolve) => window.setTimeout(resolve, 2_000));
          const statusResponse = await fetch(`/api/posts/generation-jobs/${startPayload.jobId}`, {
            credentials: "include",
            headers: getApiHeaders(),
          });
          const statusPayload = await statusResponse.json();
          if (!statusResponse.ok) throw new Error(statusPayload.error ?? `Unable to check generation (${statusResponse.status})`);
          if (statusPayload.status === "failed") throw new Error(statusPayload.error ?? "All image models failed.");
          if (statusPayload.status === "complete") {
            completedPost = statusPayload.result as Post;
            break;
          }
        }
        if (!completedPost) throw new Error("Image generation did not complete within 12 minutes.");

        setGeneratedPost(completedPost);
        setShowSuccess(true);
        window.setTimeout(() => setShowSuccess(false), 3000);
        toast({ title: "Instagram post ready! 🌿", description: "Your AGCO-compliant cannabis content is ready." });
      } catch (error) {
        console.error("Background post generation failed:", error);
        const message = error instanceof Error ? error.message : "The image service did not return a result.";
        setGenerationError(message);
        toast({ title: "Generation failed", description: message, variant: "destructive" });
      } finally {
        setIsBackgroundGenerating(false);
      }
      return;
    }

    generatePost.mutate(
      {
        data: {
          prompt,
          postType: requestedPostType,
          referenceImageBase64: undefined,
        },
      },
      {
        onSuccess: (data) => {
          setGeneratedPost(data);
          setShowSuccess(true);
          setTimeout(() => setShowSuccess(false), 3000);
          if (data.imageGenerationWarning) {
            toast({
              title: "Placeholder design used",
              description:
                data.imageGenerationWarningMessage ??
                "Image generation is temporarily unavailable — a placeholder design was used.",
              variant: "destructive",
            });
            return;
          }
          const labels: Record<ContentType, string> = {
            instagram: "Instagram post ready! 🌿",
            sms: "SMS promo ready! 📱",
            email: "Email copy ready! 📧",
          };
          toast({ title: labels[contentType], description: "Your AGCO-compliant cannabis content is ready." });
        },
        onError: (error: any) => {
          console.error("Post generation failed:", error);
          // 422 = compliance block — surface the exact regulation message, not a generic error
          if (error?.status === 422 && error?.data?.complianceBlock) {
            setComplianceBlock({ message: error.data.error });
          } else {
            const message =
              error?.data?.error ??
              error?.message ??
              "The image service did not return a result. Please try again.";
            setGenerationError(message);
            toast({ title: "Generation failed", description: message, variant: "destructive" });
          }
        },
      }
    );
  }, [prompt, referenceImage, generatePost, toast, contentType, requestedPostType]);

  const handleCopyCaption = () => {
    if (generatedPost?.caption) {
      const text = contentType === "instagram"
        ? `${generatedPost.caption}\n\n${generatedPost.hashtags || ""}`
        : generatedPost.caption;
      navigator.clipboard.writeText(text);
      toast({ title: "Copied!", description: "Content copied to clipboard." });
    }
  };

  const handleDownloadPost = () => {
    if (generatedPost?.imageUrl) downloadImage(generatedPost.imageUrl);
  };

  const handleBlastSuccess = (channel: "sms" | "email", recipientCount: number) => {
    toast({
      title: `${channel === "sms" ? "SMS" : "Email"} sent`,
      description: `Your ${channel === "sms" ? "message" : "email"} was sent to ${recipientCount} recipient${recipientCount === 1 ? "" : "s"}.`,
    });
  };

  const handleClearHistory = () => {
    // Hide all currently shown posts from this session view (not deleted from DB)
    const allIds = (recentPosts as any)?.posts?.map((p: any) => p.id) ?? [];
    allIds.forEach(addHiddenId);
    const newHidden = getHiddenIds();
    setHiddenIds(new Set(newHidden));
    toast({ title: "Session view cleared", description: "Posts still exist in History — only hidden from this view." });
  };

  const visibleRecentPosts = ((recentPosts as any)?.posts ?? []).filter(
    (p: any) => !hiddenIds.has(p.id)
  );

  const monthCount = (analytics as any)?.thisMonthPosts ?? (analytics as any)?.totalPosts ?? 0;

  // Clear compliance block whenever the user edits the prompt
  useEffect(() => {
    if (complianceBlock) setComplianceBlock(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prompt]);

  // Keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") handleGenerate();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleGenerate]);

  return (
    <AppLayout>
      <div className="container mx-auto p-4 sm:p-6 space-y-6 sm:space-y-8 max-w-7xl">

        {/* ── Quickstart Checklist ────────────────────────────────── */}
        <QuickstartChecklist
          hasBrandKit={hasBrandKit}
          hasInstagram={hasInstagram}
          hasPost={hasPost}
        />

        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div className="flex items-center gap-3">
            {brandLogo && (
              <img src={brandLogo} alt="Brand logo" className="h-10 w-10 rounded-lg object-contain border border-border bg-card/50 flex-shrink-0" />
            )}
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                {brandName ? (
                  <span>
                    {brandName}
                    <span className="text-muted-foreground font-normal text-xl ml-2">Studio</span>
                  </span>
                ) : "Studio"}
              </h1>
              <p className="text-muted-foreground mt-0.5 text-sm">
                Welcome back{user?.email ? `, ${user.email.split("@")[0]}` : ""}. Create AGCO-compliant cannabis content.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
            {/* Post count badge */}
            {!isLoadingAnalytics && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs text-primary font-medium">
                <Sparkles className="h-3 w-3" />
                {monthCount} posts generated
              </div>
            )}

            {/* Analytics cards */}
            {isLoadingAnalytics ? (
              <Skeleton className="h-14 w-28 rounded-xl" />
            ) : (
              <div className="flex gap-2">
                <Card className="bg-card/50 backdrop-blur border-border">
                  <CardContent className="px-3 py-2 flex items-center gap-2.5">
                    <BarChart3 className="h-4 w-4 text-primary flex-shrink-0" />
                    <div>
                      <p className="text-lg font-bold leading-tight">{(analytics as any)?.totalPosts ?? 0}</p>
                      <p className="text-[10px] text-muted-foreground">Total</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-card/50 backdrop-blur border-border">
                  <CardContent className="px-3 py-2 flex items-center gap-2.5">
                    <Activity className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                    <div>
                      <p className="text-lg font-bold leading-tight">{(analytics as any)?.thisWeekPosts ?? 0}</p>
                      <p className="text-[10px] text-muted-foreground">This Week</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Settings gear */}
            <Link href="/settings">
              <Button variant="outline" size="icon" className="h-9 w-9 border-border" title="Brand Kit Settings">
                <Settings className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 sm:gap-8">

          {/* ── Studio Panel ──────────────────────────────────────── */}
          <div className="xl:col-span-2 space-y-6">
            <Card className="border-border bg-card/60 backdrop-blur shadow-xl relative overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-600 via-primary to-lime-400" />
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                      <div className="h-6 w-6 rounded bg-primary/15 flex items-center justify-center">
                        <Leaf className="h-3.5 w-3.5 text-primary" />
                      </div>
                      Cannabis Content Generator
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Describe your product, strain, or promotion. All output is AGCO &amp; Cannabis Act compliant.
                    </CardDescription>
                  </div>

                  {/* ── Content type tab selector ── */}
                  <Tabs
                    value={contentType}
                    onValueChange={(v) => {
                      setContentType(v as ContentType);
                      setGeneratedPost(null);
                    }}
                  >
                    <TabsList className="h-9 bg-background/60 border border-border">
                      {CONTENT_TYPES.map((ct) => (
                        <TabsTrigger
                          key={ct.value}
                          value={ct.value}
                          className="flex items-center gap-1.5 text-xs px-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                        >
                          <ct.icon size={13} />
                          <span className="hidden sm:inline">{ct.label}</span>
                          <span className="sm:hidden">
                            {ct.value === "instagram" ? "IG" : ct.value === "sms" ? "SMS" : "Email"}
                          </span>
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </Tabs>
                </div>

                {/* Content type description chips */}
                {contentType === "sms" && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                    <MessageSquare size={13} className="flex-shrink-0" />
                    Generates punchy, AGCO-compliant text messages under 160 characters — optimised for loyalty lists.
                  </div>
                )}
                {contentType === "email" && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-2">
                    <Mail size={13} className="flex-shrink-0" />
                    Generates a compliant subject line, preview snippet, and full promotional email body copy.
                  </div>
                )}
                {contentType === "instagram" && (
                  <div className="mt-3 flex flex-col gap-2 rounded-lg border border-border bg-background/35 p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-semibold text-foreground">Instagram format</p>
                      <p className="text-[11px] text-muted-foreground">
                        {instagramFormat === "post"
                          ? "Square layout for the feed."
                          : "Vertical layout with branding at top and compliance text at bottom."}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 rounded-md border border-border bg-background/60 p-1 text-xs">
                      <button
                        type="button"
                        data-testid="button-format-feed-post"
                        aria-pressed={instagramFormat === "post"}
                        onClick={() => setInstagramFormat("post")}
                        className={`rounded px-3 py-2 font-medium transition-colors ${
                          instagramFormat === "post" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <span className="block">Feed Post</span>
                        <span className="block text-[10px] opacity-80">1080 × 1080</span>
                      </button>
                      <button
                        type="button"
                        data-testid="button-format-story"
                        aria-pressed={instagramFormat === "story"}
                        onClick={() => setInstagramFormat("story")}
                        className={`rounded px-3 py-2 font-medium transition-colors ${
                          instagramFormat === "story" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <span className="block">Story</span>
                        <span className="block text-[10px] opacity-80">1080 × 1920</span>
                      </button>
                    </div>
                  </div>
                )}
              </CardHeader>

              <CardContent className="space-y-4">
                <Textarea
                  data-testid="input-generation-prompt"
                  placeholder={CONTENT_PLACEHOLDERS[contentType]}
                  className="min-h-[110px] sm:min-h-[130px] bg-background/50 border-border resize-none focus:ring-primary text-sm"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                />

                {/* Reference image (Instagram only) + generate button */}
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  {contentType === "instagram" && (
                    <>
                      <input
                        data-testid="input-reference-image"
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={handleFileChange}
                      />
                      {referenceImage ? (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-lg text-sm">
                          <img src={referenceImage.preview} alt="" className="h-7 w-7 rounded object-cover" />
                          <span className="text-foreground truncate max-w-[120px] text-xs">{referenceImage.name}</span>
                          <button onClick={() => setReferenceImage(null)} className="text-muted-foreground hover:text-foreground ml-1">
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <Button
                          data-testid="button-add-product-photo"
                          variant="outline"
                          size="sm"
                          className="border-dashed text-muted-foreground min-h-[40px]"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <Upload className="h-3.5 w-3.5 mr-2" /> Add product photo
                        </Button>
                      )}
                    </>
                  )}

                  <Button
                    data-testid="button-generate-content"
                    onClick={handleGenerate}
                    disabled={!prompt.trim() || isGenerating}
                    className="ml-auto bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_15px_rgba(34,197,94,0.25)] min-h-[40px]"
                  >
                    {isGenerating ? (
                      <span className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 animate-spin" /> Generating…
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Send className="h-4 w-4" />
                        {contentType === "sms" ? "Generate SMS" : contentType === "email" ? "Generate Email" : "Generate Post"}
                      </span>
                    )}
                  </Button>
                </div>

                {/* Suggested prompts */}
                {!isLoadingPrompts && (suggestedPrompts as any)?.prompts && (
                  <div className="pt-1">
                    <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wider">Quick prompts</p>
                    <div className="flex flex-wrap gap-2">
                      {(suggestedPrompts as any).prompts.slice(0, 4).map((p: string, i: number) => (
                        <button
                          key={i}
                          onClick={() => setPrompt(p)}
                          className="text-xs px-3 py-1.5 rounded-full border border-border bg-background/50 hover:bg-primary/10 hover:border-primary/30 hover:text-primary transition-all text-muted-foreground min-h-[32px]"
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ── Compliance Block Notice ──────────────────────────── */}
            <AnimatePresence>
              {complianceBlock && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <Card className="border-amber-500/40 bg-amber-500/5 backdrop-blur shadow-lg overflow-hidden">
                    <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-amber-500 to-orange-400" />
                    <CardContent className="p-4 sm:p-5">
                      <div className="flex items-start gap-3">
                        <div className="h-9 w-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <ShieldAlert className="h-5 w-5 text-amber-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-amber-400 mb-1">Regulatory Guardrail Triggered</p>
                          <p className="text-sm text-amber-200/80 leading-relaxed">{complianceBlock.message}</p>
                          <p className="text-xs text-amber-500/60 mt-2">
                            Edit your prompt to remove the non-compliant element, then try again.
                          </p>
                        </div>
                        <button
                          onClick={() => setComplianceBlock(null)}
                          className="h-6 w-6 flex items-center justify-center rounded text-amber-500/60 hover:text-amber-400 transition-colors flex-shrink-0"
                          aria-label="Dismiss"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Generated Post Preview */}
            <AnimatePresence>
              {(generatedPost || isGenerating || generationError) && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <Card className="border-border bg-card/60 backdrop-blur shadow-xl overflow-hidden relative">
                    <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-lime-400" />
                    <CardHeader className="flex flex-row items-center justify-between pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        {contentType === "sms" && <MessageSquare className="h-4 w-4 text-amber-400" />}
                        {contentType === "email" && <Mail className="h-4 w-4 text-blue-400" />}
                        {contentType === "instagram" && <Instagram className="h-4 w-4 text-pink-400" />}
                        Generated {contentType === "sms" ? "SMS" : contentType === "email" ? "Email" : "Post"}
                      </CardTitle>
                      {generatedPost && (
                        <AnimatePresence>
                          {showSuccess ? (
                            <motion.div
                              key="success"
                              initial={{ scale: 0.8, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 0.8, opacity: 0 }}
                            >
                              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 gap-1">
                                <CheckCircle2 className="h-3 w-3" /> Ready!
                              </Badge>
                            </motion.div>
                          ) : (
                            <motion.div key="agco" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                              <Badge variant="outline" className="text-emerald-500 border-emerald-500/30 bg-emerald-500/10 text-[10px]">
                                ✓ AGCO Compliant
                              </Badge>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      )}
                    </CardHeader>
                    {generatedPost?.imageGenerationWarning && (
                      <div className="mx-6 mb-4 flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-amber-200" role="alert">
                        <ShieldAlert className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-400" />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-amber-300">Placeholder design used</p>
                          <p className="mt-1 text-xs leading-relaxed text-amber-200/80">
                            {generatedPost.imageGenerationWarningMessage ??
                              "Image generation is temporarily unavailable — a placeholder design was used."}
                          </p>
                        </div>
                      </div>
                    )}
                    <CardContent>
                      {isGenerating ? (
                        <div className="space-y-5">
                          {contentType === "instagram" && (
                            <div className="relative aspect-square w-full max-w-sm overflow-hidden rounded-xl border border-emerald-500/25 bg-gradient-to-br from-emerald-950/70 via-background to-lime-950/40 mx-auto">
                              <motion.div
                                className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(52,211,153,0.18),transparent_60%)]"
                                animate={{ opacity: [0.35, 0.9, 0.35], scale: [0.96, 1.04, 0.96] }}
                                transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                              />
                              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-8 text-center">
                                <motion.div
                                  className="flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-400/30 bg-emerald-500/15 shadow-[0_0_35px_rgba(52,211,153,0.25)]"
                                  animate={{ scale: [1, 1.1, 1], rotate: [0, 4, -4, 0] }}
                                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                                >
                                  <WandSparkles className="h-8 w-8 text-emerald-300" />
                                </motion.div>
                                <div>
                                  <p className="font-semibold text-foreground">Crafting your post</p>
                                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                                    This may take up to 60 seconds. Quality artwork is worth the wait.
                                  </p>
                                </div>
                                <div className="h-1.5 w-40 overflow-hidden rounded-full bg-emerald-950">
                                  <motion.div
                                    className="h-full w-1/2 rounded-full bg-gradient-to-r from-emerald-500 to-lime-400"
                                    animate={{ x: ["-100%", "200%"] }}
                                    transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-4 w-1/2" />
                          {contentType !== "instagram" && (
                            <p className="text-xs text-center text-muted-foreground animate-pulse">
                              Crafting your AGCO-compliant {contentType === "sms" ? "SMS promo" : "email blast"}…
                            </p>
                          )}
                        </div>
                      ) : generationError ? (
                        <div className="mx-auto flex max-w-lg flex-col items-center rounded-xl border border-red-500/30 bg-red-500/5 px-6 py-8 text-center" role="alert">
                          <ShieldAlert className="h-10 w-10 text-red-400" />
                          <h3 className="mt-4 font-semibold text-foreground">Image generation failed</h3>
                          <p className="mt-2 text-sm leading-relaxed text-red-200/80">{generationError}</p>
                          <Button onClick={handleGenerate} className="mt-5 min-h-[40px]">
                            <RefreshCw className="mr-2 h-4 w-4" /> Retry
                          </Button>
                          <p className="mt-3 text-xs text-muted-foreground">Your prompt is preserved.</p>
                        </div>
                      ) : generatedPost ? (
                        /* ── Instagram result (image + caption) ── */
                        contentType === "instagram" ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
                            <div className="aspect-square rounded-xl overflow-hidden bg-muted border border-border">
                              {generatedPost.imageUrl ? (
                                <img src={generatedPost.imageUrl} alt="Generated cannabis post" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <ImageIcon className="h-12 w-12 text-muted-foreground/30" />
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col justify-between gap-4">
                              <div>
                                <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">
                                  {generatedPost.caption}
                                </p>
                                {generatedPost.hashtags && (
                                  <p className="text-sm text-primary mt-3">{generatedPost.hashtags}</p>
                                )}
                              </div>
                              <div className="flex flex-col gap-2">
                                <Button variant="outline" size="sm" onClick={handleCopyCaption} className="w-full min-h-[40px]">
                                  <Copy className="h-3.5 w-3.5 mr-2" /> Copy Caption + Hashtags
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={handleDownloadPost}
                                  className="w-full min-h-[40px]"
                                  disabled={!generatedPost.imageUrl}
                                >
                                  <Download className="h-3.5 w-3.5 mr-2" /> Download Image
                                </Button>
                                <Button
                                  size="sm"
                                  className="w-full bg-gradient-to-r from-pink-600 to-purple-600 hover:opacity-90 min-h-[40px]"
                                  onClick={() => setIgModalOpen(true)}
                                >
                                  <Instagram className="h-3.5 w-3.5 mr-2" /> Ready for Instagram
                                </Button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          /* ── SMS / Email text-only result ── */
                          <div className="space-y-4">
                            <div className={`rounded-xl border p-4 space-y-3 ${
                              contentType === "sms"
                                ? "border-amber-500/30 bg-amber-500/5"
                                : "border-blue-500/30 bg-blue-500/5"
                            }`}>
                              {/* Character count for SMS */}
                              {contentType === "sms" && (
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-medium text-amber-400 flex items-center gap-1.5">
                                    <MessageSquare size={12} /> SMS Preview
                                  </span>
                                  <span className={`text-xs font-mono ${
                                    (generatedPost.caption?.length ?? 0) > 160
                                      ? "text-destructive"
                                      : "text-emerald-400"
                                  }`}>
                                    {generatedPost.caption?.length ?? 0}/160 chars
                                  </span>
                                </div>
                              )}
                              {contentType === "email" && (
                                <span className="text-xs font-medium text-blue-400 flex items-center gap-1.5">
                                  <Mail size={12} /> Email Preview
                                </span>
                              )}
                              <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">
                                {generatedPost.caption}
                              </p>
                            </div>
                            <Button variant="outline" onClick={handleCopyCaption} className="w-full min-h-[40px]">
                              <Copy className="h-4 w-4 mr-2" />
                              Copy {contentType === "sms" ? "SMS Text" : "Email Copy"}
                            </Button>
                            <Button
                              onClick={() => setBlastChannel(contentType)}
                              className={`w-full min-h-[40px] ${
                                contentType === "sms"
                                  ? "bg-amber-600 hover:bg-amber-500 text-white"
                                  : "bg-blue-600 hover:bg-blue-500 text-white"
                              }`}
                            >
                              {contentType === "sms"
                                ? <MessageSquare className="h-4 w-4 mr-2" />
                                : <Mail className="h-4 w-4 mr-2" />}
                              Send via {contentType === "sms" ? "SMS" : "Email"}
                            </Button>
                          </div>
                        )
                      ) : null}
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── Recent Posts Sidebar ──────────────────────────────── */}
          <div>
            <Card className="border-border bg-card/60 backdrop-blur shadow-xl">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base">Recent Posts</CardTitle>
                <div className="flex items-center gap-2">
                  {visibleRecentPosts.length > 0 && (
                    <button
                      onClick={handleClearHistory}
                      className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                      title="Hide all from this session view"
                    >
                      <EyeOff className="h-3 w-3" /> Clear view
                    </button>
                  )}
                  <Link href="/history" className="text-xs text-primary flex items-center gap-1 hover:underline">
                    View all <ArrowUpRight className="h-3 w-3" />
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 p-3">
                {isLoadingPosts ? (
                  [1, 2, 3].map((i) => (
                    <div key={i} className="flex gap-3 p-3">
                      <Skeleton className="h-14 w-14 rounded-md flex-shrink-0" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </div>
                  ))
                ) : visibleRecentPosts.length > 0 ? (
                  visibleRecentPosts.slice(0, 5).map((post: any, i: number) => (
                    <motion.div
                      key={post.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.08 }}
                      className="flex gap-3 items-center p-2.5 rounded-lg hover:bg-white/5 transition-colors border border-transparent hover:border-border"
                    >
                      <div className="h-12 w-12 rounded-md overflow-hidden bg-muted flex-shrink-0">
                        {post.imageUrl ? (
                          <img src={post.imageUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Leaf className="h-5 w-5 m-auto text-muted-foreground/50 mt-3.5" />
                        )}
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <p className="text-xs text-foreground truncate leading-snug">{post.caption}</p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <Badge variant="outline" className="text-[9px] px-1 py-0">{post.status}</Badge>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(post.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-10 text-muted-foreground text-sm">
                    {hiddenIds.size > 0
                      ? "Session view cleared. Check History for all posts."
                      : "No posts yet. Generate your first one!"}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

        </div>

        {/* Home button */}
        <div className="flex justify-center pt-2 pb-6">
          <Button variant="ghost" onClick={handleGoHome} className="gap-2 text-muted-foreground hover:text-foreground text-sm">
            🏠 Sign Out & Home
          </Button>
        </div>
      </div>

      {/* Instagram Ready Modal */}
      <IGReadyModal open={igModalOpen} onClose={() => setIgModalOpen(false)} post={generatedPost} />
      {blastChannel && (
        <BlastDialog
          open={blastChannel !== null}
          channel={blastChannel}
          post={generatedPost}
          onClose={() => setBlastChannel(null)}
          onSuccess={(recipientCount) => handleBlastSuccess(blastChannel, recipientCount)}
        />
      )}
    </AppLayout>
  );
}
