import { useState } from "react";
import { useLocation } from "wouter";
import AppLayout from "@/components/layout/AppLayout";
import {
  useGetInstagramStatus,
  useConnectInstagram,
  useListPosts,
} from "@workspace/api-client-react";
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
import { useToast } from "@/hooks/use-toast";
import {
  Instagram,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ArrowLeft,
  Info,
  Copy,
  Download,
  Smartphone,
  Image as ImageIcon,
  ChevronDown,
  CheckCircle,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";
import { getGetInstagramStatusQueryKey } from "@workspace/api-client-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

// Download via blob for CORS-safe downloads
async function downloadImage(url: string, filename = "aura-instagram-post.jpg") {
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

// ── Manual Post Modal ─────────────────────────────────────────────────────────

function ManualPostModal({
  open,
  onClose,
  post,
}: {
  open: boolean;
  onClose: () => void;
  post: any;
}) {
  const { toast } = useToast();
  const [captionCopied, setCaptionCopied] = useState(false);

  const handleCopy = () => {
    const text = [post?.caption, post?.hashtags].filter(Boolean).join("\n\n");
    navigator.clipboard.writeText(text);
    setCaptionCopied(true);
    setTimeout(() => setCaptionCopied(false), 2500);
    toast({ title: "Copied!", description: "Caption and hashtags copied to clipboard." });
  };

  if (!post) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-lg w-full mx-4 max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Instagram className="h-5 w-5 text-pink-500" />
            Post to Instagram
          </DialogTitle>
          <DialogDescription>
            Download the image and copy the caption, then publish manually through the Instagram app.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-1">
          {/* Image + caption */}
          <div className="grid grid-cols-2 gap-4">
            <div className="aspect-square rounded-xl overflow-hidden bg-muted border border-border">
              {post.imageUrl ? (
                <img src={post.imageUrl} alt="Post preview" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon className="h-8 w-8 text-muted-foreground/30" />
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2 py-1 overflow-hidden">
              <p className="text-xs text-foreground/80 leading-relaxed line-clamp-7">{post.caption}</p>
              {post.hashtags && (
                <p className="text-[10px] text-primary/80 line-clamp-2">{post.hashtags}</p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" onClick={handleCopy} className="min-h-[44px] gap-2">
              {captionCopied ? (
                <><CheckCircle className="h-4 w-4 text-emerald-500" /> Copied!</>
              ) : (
                <><Copy className="h-4 w-4" /> Copy Caption</>
              )}
            </Button>
            <Button
              onClick={() => post.imageUrl && downloadImage(post.imageUrl)}
              disabled={!post.imageUrl}
              className="bg-primary text-primary-foreground hover:bg-primary/90 min-h-[44px] gap-2"
            >
              <Download className="h-4 w-4" /> Download Image
            </Button>
          </div>

          {/* Step-by-step */}
          <div className="rounded-xl border border-border bg-background/40 p-4 space-y-3">
            <p className="text-xs font-semibold text-foreground flex items-center gap-2">
              <Smartphone className="h-3.5 w-3.5 text-primary" />
              Step-by-step: Posting on Instagram
            </p>
            <ol className="space-y-2.5">
              {[
                "Tap Download Image above — the post is saved to your device's camera roll.",
                "Open the Instagram app and tap the + (New Post) button at the bottom.",
                "Select the downloaded image from your gallery.",
                "Tap Next, then tap the caption field and paste your copied caption.",
                "Review everything looks correct, then tap Share.",
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-2.5 text-xs text-muted-foreground leading-relaxed">
                  <div className="h-4 w-4 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-[9px] font-bold text-primary">{i + 1}</span>
                  </div>
                  {step}
                </li>
              ))}
            </ol>
          </div>

          <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
            ✓ AGCO-compliant · Health Canada warnings included · Age-gated (19+, Ontario only)
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function InstagramPage() {
  const [, setLocation] = useLocation();
  const { data: status, isLoading } = useGetInstagramStatus();
  const { data: postsData } = useListPosts({ limit: 50 });
  const connectIg = useConnectInstagram();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({ accessToken: "", igUserId: "" });
  const [manualPost, setManualPost] = useState<any>(null);
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [showPostPicker, setShowPostPicker] = useState(false);

  const recentPosts = ((postsData as any)?.posts ?? []).sort(
    (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const handleConnect = () => {
    if (!formData.accessToken || !formData.igUserId) {
      toast({ title: "Missing fields", description: "Please provide both access token and User ID.", variant: "destructive" });
      return;
    }
    connectIg.mutate(
      { data: formData },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetInstagramStatusQueryKey() });
          toast({ title: "Connected!", description: "Successfully connected to Instagram." });
          setFormData({ accessToken: "", igUserId: "" });
        },
        onError: () => {
          toast({ title: "Connection Failed", description: "Invalid token or ID. Please check and try again.", variant: "destructive" });
        },
      }
    );
  };

  const openManualPost = (post: any) => {
    setManualPost(post);
    setManualModalOpen(true);
    setShowPostPicker(false);
  };

  return (
    <AppLayout>
      <div className="container mx-auto p-4 sm:p-6 max-w-4xl space-y-6 sm:space-y-8">

        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/dashboard")}
            className="text-muted-foreground hover:text-foreground -ml-2 mb-2 min-h-[44px]"
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Dashboard
          </Button>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Instagram</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Post your generated content to Instagram — manually or via API connection.
          </p>
        </div>

        {/* AGCO notice */}
        <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
          <Info className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-amber-500 mb-1">Cannabis advertising on Meta</p>
            <p className="text-muted-foreground text-xs leading-relaxed">
              Meta restricts paid cannabis advertising. Organic posts are permitted for licensed Ontario dispensaries.
              Ensure your account is marked as a legal cannabis retailer and your audience is restricted to 19+.
            </p>
          </div>
        </div>

        {/* ── Manual Posting Section ─────────────────────────────── */}
        <Card className="border-border bg-card/60 backdrop-blur shadow-xl relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500" />
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-pink-500" />
              Post Manually (Recommended)
            </CardTitle>
            <CardDescription>
              Download your generated image and copy the caption — then post through the Instagram app in under a minute.
              This is the AGCO-compliant fallback for all dispensaries.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={() => setShowPostPicker(!showPostPicker)}
              className="bg-gradient-to-r from-pink-600 to-purple-600 hover:opacity-90 transition-opacity min-h-[48px] w-full sm:w-auto gap-2"
            >
              <Instagram className="h-4 w-4" />
              Choose a Post to Share
              <ChevronDown className={`h-4 w-4 transition-transform ${showPostPicker ? "rotate-180" : ""}`} />
            </Button>

            {showPostPicker && (
              <div className="rounded-xl border border-border bg-background/50">
                {recentPosts.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground text-sm">
                    No posts yet. Generate some from the Dashboard first.
                  </div>
                ) : (
                  <ScrollArea className="h-72 p-2">
                    <div className="space-y-2">
                      {recentPosts.map((post: any) => (
                        <button
                          key={post.id}
                          onClick={() => openManualPost(post)}
                          className="w-full flex items-start gap-3 p-3 rounded-lg border border-border bg-card/30 hover:bg-primary/5 hover:border-primary/30 text-left transition-all"
                        >
                          <div className="h-14 w-14 rounded-md overflow-hidden bg-muted flex-shrink-0">
                            {post.imageUrl ? (
                              <img src={post.imageUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <ImageIcon className="h-5 w-5 m-auto mt-4.5 text-muted-foreground/30" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-foreground/80 line-clamp-2 leading-snug">{post.caption || "No caption"}</p>
                            <p className="text-[10px] text-muted-foreground mt-1.5">
                              {new Date(post.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 text-primary shrink-0 mt-1">
                            <Instagram className="h-3.5 w-3.5" />
                            <span className="text-[10px]">Post</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── API Connection Section ────────────────────────────── */}
        <div className="grid sm:grid-cols-2 gap-6 sm:gap-8">

          {/* Status Card */}
          <div className="space-y-5">
            <Card className="border-border bg-card/60 backdrop-blur shadow-xl relative overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500" />
              <CardHeader className="pb-3">
                <CardTitle className="text-base">API Connection Status</CardTitle>
                <CardDescription>For direct publishing via Meta Graph API.</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-20 w-full" />
                ) : (status as any)?.connected ? (
                  <div className="flex items-center gap-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <div className="h-11 w-11 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-emerald-500">Connected</h3>
                      <p className="text-xs text-foreground/80">
                        Account: {(status as any).instagramHandle || (status as any).igUserId}
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
                      <p className="text-xs text-muted-foreground">API posting requires Meta Developer credentials.</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-border bg-card/40 backdrop-blur">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">How to get these credentials</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground space-y-3">
                <ol className="list-decimal pl-4 space-y-1.5 leading-relaxed">
                  <li>Go to <strong className="text-foreground">Meta for Developers</strong> and create a Business app.</li>
                  <li>Add the <strong className="text-foreground">Instagram Graph API</strong> product.</li>
                  <li>Generate a <strong className="text-foreground">long-lived access token</strong> (60 days).</li>
                  <li>Find your <strong className="text-foreground">Instagram Business Account ID</strong> from the API.</li>
                  <li>Ensure your account has <strong className="text-foreground">age-gate (19+)</strong> enabled.</li>
                </ol>
                <a href="https://developers.facebook.com/docs/instagram-api" target="_blank" rel="noreferrer">
                  <Button variant="link" className="h-auto p-0 text-primary text-xs">
                    Read full guide <ExternalLink className="h-3 w-3 ml-1" />
                  </Button>
                </a>
              </CardContent>
            </Card>
          </div>

          {/* Connect form */}
          <Card className="border-border bg-card/60 backdrop-blur h-fit">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Instagram className="h-4 w-4" /> Connect via API
              </CardTitle>
              <CardDescription className="text-xs">Enter your Meta Developer credentials for direct publishing.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="igUserId" className="text-sm">Instagram Business User ID</Label>
                <Input
                  id="igUserId"
                  placeholder="e.g. 17841400000000000"
                  value={formData.igUserId}
                  onChange={(e) => setFormData((prev) => ({ ...prev, igUserId: e.target.value }))}
                  className="bg-background font-mono text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="accessToken" className="text-sm">Access Token</Label>
                <Input
                  id="accessToken"
                  type="password"
                  placeholder="EAAGm0PX…"
                  value={formData.accessToken}
                  onChange={(e) => setFormData((prev) => ({ ...prev, accessToken: e.target.value }))}
                  className="bg-background font-mono text-sm"
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button
                onClick={handleConnect}
                disabled={connectIg.isPending || !!(status as any)?.connected}
                className="w-full bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 hover:opacity-90 transition-opacity min-h-[44px]"
              >
                {connectIg.isPending
                  ? "Connecting…"
                  : (status as any)?.connected
                  ? "Already Connected"
                  : "Connect Account"}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>

      {/* Manual post modal */}
      <ManualPostModal
        open={manualModalOpen}
        onClose={() => setManualModalOpen(false)}
        post={manualPost}
      />
    </AppLayout>
  );
}
