import { useState } from "react";
import { useLocation } from "wouter";
import AppLayout from "@/components/layout/AppLayout";
import { useListPosts, useDeletePost } from "@workspace/api-client-react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, Copy, Download, Image as ImageIcon, Search, ArrowLeft, Leaf, CheckCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { useQueryClient } from "@tanstack/react-query";
import { getListPostsQueryKey } from "@workspace/api-client-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Download via blob for CORS-safe downloads
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

function formatDateTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function HistoryPage() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [postToDelete, setPostToDelete] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: postsData, isLoading } = useListPosts({ limit: 100 });
  const deletePost = useDeletePost();

  const handleDelete = () => {
    if (!postToDelete) return;
    deletePost.mutate(
      { id: postToDelete },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListPostsQueryKey() });
          toast({ title: "Post deleted", description: "Removed from your history." });
          setPostToDelete(null);
        },
        onError: () => {
          toast({ title: "Error", description: "Failed to delete. Please try again.", variant: "destructive" });
          setPostToDelete(null);
        },
      }
    );
  };

  const handleCopyCaption = (post: any) => {
    const text = [post.caption, post.hashtags].filter(Boolean).join("\n\n");
    navigator.clipboard.writeText(text);
    setCopiedId(post.id);
    setTimeout(() => setCopiedId(null), 2000);
    toast({ title: "Copied!", description: "Caption and hashtags copied to clipboard." });
  };

  // Sort most recent first
  const allPosts = [...((postsData as any)?.posts ?? [])].sort(
    (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const filteredPosts = allPosts.filter((post: any) =>
    search
      ? post.caption?.toLowerCase().includes(search.toLowerCase()) ||
        post.prompt?.toLowerCase().includes(search.toLowerCase())
      : true
  );

  return (
    <AppLayout>
      <div className="container mx-auto p-4 sm:p-6 max-w-7xl space-y-6 sm:space-y-8">

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-5">
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/dashboard")}
              className="text-muted-foreground hover:text-foreground -ml-2 mb-2 min-h-[44px]"
            >
              <ArrowLeft className="h-4 w-4 mr-1.5" /> Dashboard
            </Button>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Content History</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              {filteredPosts.length} post{filteredPosts.length !== 1 ? "s" : ""} — most recent first
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search captions…"
              className="pl-9 bg-card border-border h-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="aspect-[3/4] rounded-xl" />
            ))}
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Leaf className="h-8 w-8 text-primary/50" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No posts yet</h3>
            <p className="text-muted-foreground text-sm max-w-xs">
              {search ? "No posts match your search." : "Generate your first AGCO-compliant cannabis post from the Dashboard."}
            </p>
            {!search && (
              <Button
                className="mt-6 bg-primary text-primary-foreground hover:bg-primary/90 min-h-[44px]"
                onClick={() => setLocation("/dashboard")}
              >
                Go to Dashboard
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            <AnimatePresence>
              {filteredPosts.map((post: any, i: number) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: Math.min(i * 0.03, 0.3) }}
                >
                  <Card className="border-border bg-card/60 backdrop-blur hover:shadow-xl hover:border-primary/20 transition-all group overflow-hidden flex flex-col h-full">
                    {/* Image */}
                    <div className="aspect-square bg-muted overflow-hidden flex-shrink-0">
                      {post.imageUrl ? (
                        <img
                          src={post.imageUrl}
                          alt=""
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Leaf className="h-10 w-10 text-muted-foreground/30" />
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <CardContent className="p-3 flex-1">
                      <p className="text-xs text-foreground/90 line-clamp-3 leading-relaxed">{post.caption}</p>
                      {post.hashtags && (
                        <p className="text-[10px] text-primary/70 mt-1.5 line-clamp-1">{post.hashtags}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2.5">
                        <Badge
                          variant="outline"
                          className={`text-[9px] px-1.5 py-0 ${
                            post.status === "published"
                              ? "text-emerald-500 border-emerald-500/30"
                              : post.status === "scheduled"
                              ? "text-blue-400 border-blue-400/30"
                              : "text-muted-foreground"
                          }`}
                        >
                          {post.status}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground truncate">
                          {formatDateTime(post.createdAt)}
                        </span>
                      </div>
                    </CardContent>

                    {/* Footer actions */}
                    <CardFooter className="p-2 pt-0 border-t border-border/50 flex items-center gap-1">
                      {/* Copy caption */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1 h-9 text-[10px] text-muted-foreground hover:text-foreground gap-1 px-1"
                        onClick={() => handleCopyCaption(post)}
                        title="Copy caption"
                      >
                        {copiedId === post.id ? (
                          <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                        <span className="hidden sm:inline">{copiedId === post.id ? "Copied" : "Copy"}</span>
                      </Button>

                      {/* Download image */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1 h-9 text-[10px] text-muted-foreground hover:text-foreground gap-1 px-1"
                        onClick={() => post.imageUrl && downloadImage(post.imageUrl)}
                        disabled={!post.imageUrl}
                        title="Download image"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Download</span>
                      </Button>

                      {/* Delete */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex-shrink-0 px-0"
                        onClick={() => setPostToDelete(post.id)}
                        title="Delete post"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </CardFooter>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Delete confirm dialog */}
      <AlertDialog open={!!postToDelete} onOpenChange={(open) => !open && setPostToDelete(null)}>
        <AlertDialogContent className="bg-card border-border mx-4">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this post?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the post and its generated image from your history. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-border">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 min-h-[44px]"
            >
              {deletePost.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
