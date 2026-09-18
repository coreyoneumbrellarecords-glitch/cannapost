import { useLocation } from "wouter";
import AppLayout from "@/components/layout/AppLayout";
import {
  useGetContentCalendar,
  useListPosts,
  useSchedulePost,
  useDeletePost,
  getListPostsQueryKey,
} from "@workspace/api-client-react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import {
  CalendarDays,
  Plus,
  Image as ImageIcon,
  Clock,
  FileText,
  CheckCircle2,
  ArrowLeft,
  Bell,
  ChevronLeft,
  ChevronRight,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

// ── Helpers ──────────────────────────────────────────────────────────────────

type PostType = "flower" | "product" | "event" | "default";

function detectPostType(caption: string): PostType {
  const lower = caption?.toLowerCase() ?? "";
  if (/\b(strain|thc|cbd|indica|sativa|hybrid|terpene|flower|bud|kush|og|dream|punch)\b/.test(lower))
    return "flower";
  if (/\b(sale|deal|discount|promo|event|opening|launch|weekend|flash)\b/.test(lower))
    return "event";
  if (/\b(edible|vape|concentrate|oil|capsule|tincture|topical|accessory|pre.?roll)\b/.test(lower))
    return "product";
  return "default";
}

const POST_TYPE_STYLES: Record<PostType, { dot: string; bg: string; border: string; text: string; label: string }> = {
  flower:  { dot: "bg-emerald-400",  bg: "bg-emerald-500/10",  border: "border-emerald-500/30",  text: "text-emerald-400",  label: "Flower"  },
  product: { dot: "bg-blue-400",     bg: "bg-blue-500/10",     border: "border-blue-500/30",     text: "text-blue-400",     label: "Product" },
  event:   { dot: "bg-amber-400",    bg: "bg-amber-500/10",    border: "border-amber-500/30",    text: "text-amber-400",    label: "Event"   },
  default: { dot: "bg-primary",      bg: "bg-primary/10",      border: "border-primary/20",      text: "text-primary",      label: "Post"    },
};

function getWeekDays(anchorDate: Date): Date[] {
  const d = new Date(anchorDate);
  const day = d.getDay(); // 0 = Sun
  d.setDate(d.getDate() - day); // go to Sunday
  return Array.from({ length: 7 }, (_, i) => {
    const dd = new Date(d);
    dd.setDate(d.getDate() + i);
    return dd;
  });
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function isWithin24h(dateStr: string) {
  const t = new Date(dateStr).getTime();
  const now = Date.now();
  return t > now && t - now <= 24 * 60 * 60 * 1000;
}

// ── Week View ─────────────────────────────────────────────────────────────────

function WeekView({
  entries,
  onSelectEntry,
  weekStart,
  onPrevWeek,
  onNextWeek,
}: {
  entries: any[];
  onSelectEntry: (e: any) => void;
  weekStart: Date;
  onPrevWeek: () => void;
  onNextWeek: () => void;
}) {
  const days = getWeekDays(weekStart);
  const today = new Date();

  return (
    <div className="space-y-3">
      {/* Week navigation */}
      <div className="flex items-center justify-between px-1">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onPrevWeek}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <p className="text-sm font-medium text-foreground">
          {days[0].toLocaleDateString(undefined, { month: "short", day: "numeric" })} –{" "}
          {days[6].toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
        </p>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onNextWeek}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Day columns */}
      <div className="grid grid-cols-7 gap-1.5 min-h-[280px]">
        {days.map((day) => {
          const dayEntries = entries.filter((e) =>
            isSameDay(new Date(e.scheduledAt), day)
          );
          const isToday = isSameDay(day, today);
          return (
            <div
              key={day.toISOString()}
              className={`rounded-xl border p-1.5 space-y-1.5 min-h-[200px] transition-colors ${
                isToday
                  ? "border-primary/40 bg-primary/5"
                  : "border-border bg-card/30"
              }`}
            >
              {/* Day header */}
              <div className="text-center pb-1 border-b border-border/50">
                <p className="text-[9px] text-muted-foreground uppercase tracking-wide">
                  {day.toLocaleDateString(undefined, { weekday: "short" })}
                </p>
                <p className={`text-sm font-semibold leading-tight ${isToday ? "text-primary" : "text-foreground"}`}>
                  {day.getDate()}
                </p>
              </div>

              {/* Post cards */}
              {dayEntries.map((entry) => {
                const type = detectPostType(entry.caption);
                const styles = POST_TYPE_STYLES[type];
                const urgent = isWithin24h(entry.scheduledAt);
                return (
                  <button
                    key={entry.id}
                    onClick={() => onSelectEntry(entry)}
                    className={`w-full rounded-lg border p-1.5 text-left transition-all hover:scale-[1.02] ${styles.bg} ${styles.border}`}
                  >
                    {entry.imageUrl ? (
                      <img
                        src={entry.imageUrl}
                        alt=""
                        className="w-full aspect-square rounded-md object-cover mb-1"
                      />
                    ) : (
                      <div className="w-full aspect-square rounded-md bg-muted/50 flex items-center justify-center mb-1">
                        <ImageIcon className="h-3 w-3 text-muted-foreground/30" />
                      </div>
                    )}
                    <p className={`text-[9px] font-medium leading-tight line-clamp-2 ${styles.text}`}>
                      {entry.caption?.slice(0, 40) || "Post"}
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                      <div className={`h-1.5 w-1.5 rounded-full ${styles.dot} flex-shrink-0`} />
                      <span className="text-[8px] text-muted-foreground">
                        {new Date(entry.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      {urgent && <Bell className="h-2.5 w-2.5 text-amber-400 flex-shrink-0 animate-pulse" />}
                    </div>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<"monthly" | "weekly">("monthly");
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [weekAnchor, setWeekAnchor] = useState(new Date());
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [entryDetailOpen, setEntryDetailOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<any>(null);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [scheduledDate, setScheduledDate] = useState<string>(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + 60);
    return d.toISOString().slice(0, 16);
  });

  const { data: calendarData, isLoading } = useGetContentCalendar();
  const { data: postsData } = useListPosts({ limit: 100 });
  const schedulePost = useSchedulePost();
  const deletePost = useDeletePost();
  const queryClient = useQueryClient();

  const entries: any[] = (calendarData as any)?.entries ?? [];
  const draftPosts = ((postsData as any)?.posts ?? []).filter((p: any) => p.status === "draft");

  const selectedDateStr = date ? date.toISOString().split("T")[0] : "";
  const entriesForDate = entries.filter((e) => e.scheduledAt.startsWith(selectedDateStr));

  // 24-hour upcoming reminders
  const upcomingCount = entries.filter((e) => isWithin24h(e.scheduledAt)).length;

  const modifiers = {
    hasEntry: entries.map((e) => new Date(e.scheduledAt)),
  };
  const modifiersStyles = {
    hasEntry: {
      fontWeight: "bold",
      backgroundColor: "hsl(var(--primary) / 0.12)",
      color: "hsl(var(--primary))",
      border: "1px solid hsl(var(--primary) / 0.35)",
      borderRadius: "6px",
    },
  };

  function openScheduleDialog() {
    setSelectedPostId(null);
    const d = new Date();
    d.setMinutes(d.getMinutes() + 60);
    setScheduledDate(d.toISOString().slice(0, 16));
    setScheduleDialogOpen(true);
  }

  async function handleSchedule() {
    if (!selectedPostId || !scheduledDate) return;
    schedulePost.mutate(
      { id: selectedPostId, data: { scheduledAt: new Date(scheduledDate).toISOString() } },
      {
        onSuccess: () => {
          toast({ title: "Post scheduled! 📅", description: "Your post has been added to the calendar." });
          setScheduleDialogOpen(false);
          queryClient.invalidateQueries({ queryKey: ["getContentCalendar"] });
          queryClient.invalidateQueries({ queryKey: getListPostsQueryKey() });
        },
        onError: () => {
          toast({ title: "Failed to schedule", description: "Please try again.", variant: "destructive" });
        },
      }
    );
  }

  function handleSelectEntry(entry: any) {
    setSelectedEntry(entry);
    setEntryDetailOpen(true);
  }

  function handleDeleteEntry() {
    if (!selectedEntry) return;
    deletePost.mutate(
      { id: selectedEntry.id },
      {
        onSuccess: () => {
          toast({ title: "Post removed from calendar." });
          setEntryDetailOpen(false);
          setSelectedEntry(null);
          queryClient.invalidateQueries({ queryKey: ["getContentCalendar"] });
          queryClient.invalidateQueries({ queryKey: getListPostsQueryKey() });
        },
        onError: () => {
          toast({ title: "Failed to remove", variant: "destructive" });
        },
      }
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto p-4 sm:p-6 max-w-7xl space-y-6 sm:space-y-8">

        {/* Header */}
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
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-3">
              Content Calendar
              {upcomingCount > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-medium">
                  <Bell className="h-3 w-3 animate-pulse" />
                  {upcomingCount} due in 24h
                </span>
              )}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">Plan and visualise your upcoming cannabis posts.</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* View toggle */}
            <div className="flex items-center rounded-lg border border-border bg-card/50 p-0.5">
              <button
                onClick={() => setViewMode("monthly")}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  viewMode === "monthly"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setViewMode("weekly")}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  viewMode === "weekly"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Weekly
              </button>
            </div>
            <Button
              className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_15px_rgba(34,197,94,0.25)] min-h-[44px]"
              onClick={openScheduleDialog}
            >
              <Plus className="h-4 w-4 mr-2" /> Schedule Post
            </Button>
          </div>
        </div>

        {/* Post type legend */}
        <div className="flex flex-wrap gap-3">
          {(Object.entries(POST_TYPE_STYLES) as [PostType, typeof POST_TYPE_STYLES[PostType]][]).map(([type, s]) => (
            <div key={type} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <div className={`h-2 w-2 rounded-full ${s.dot}`} />
              {s.label}
            </div>
          ))}
        </div>

        {/* ── Monthly View ──────────────────────────────────────────── */}
        {viewMode === "monthly" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
            <Card className="border-border bg-card/60 backdrop-blur col-span-1 lg:col-span-2 shadow-xl relative overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-600 via-primary to-lime-400" />
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="h-5 w-5 text-primary" /> Post Schedule
                </CardTitle>
                <CardDescription>Days with scheduled posts are highlighted in green.</CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center">
                {isLoading ? (
                  <Skeleton className="h-80 w-full max-w-sm rounded-xl" />
                ) : (
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    modifiers={modifiers}
                    modifiersStyles={modifiersStyles}
                    className="rounded-xl border-0 w-full"
                  />
                )}
              </CardContent>
            </Card>

            {/* Day detail */}
            <Card className="border-border bg-card/60 backdrop-blur shadow-xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  {date
                    ? date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })
                    : "Select a date"}
                </CardTitle>
                <CardDescription>
                  {entriesForDate.length} post{entriesForDate.length !== 1 ? "s" : ""} scheduled
                </CardDescription>
              </CardHeader>
              <CardContent>
                {entriesForDate.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <div className="w-11 h-11 rounded-full bg-muted flex items-center justify-center mb-3">
                      <CalendarDays className="h-5 w-5 text-muted-foreground/50" />
                    </div>
                    <p className="text-sm text-muted-foreground">No posts on this day.</p>
                    <Button variant="ghost" size="sm" className="mt-3 text-primary min-h-[40px]" onClick={openScheduleDialog}>
                      <Plus className="h-3.5 w-3.5 mr-1" /> Schedule one
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {entriesForDate.map((entry) => {
                      const type = detectPostType(entry.caption);
                      const s = POST_TYPE_STYLES[type];
                      const urgent = isWithin24h(entry.scheduledAt);
                      return (
                        <button
                          key={entry.id}
                          onClick={() => handleSelectEntry(entry)}
                          className={`w-full flex items-start gap-3 p-3 rounded-lg border text-left hover:scale-[1.01] transition-all ${s.bg} ${s.border}`}
                        >
                          <div className="h-12 w-12 rounded-md overflow-hidden bg-muted flex-shrink-0">
                            {entry.imageUrl ? (
                              <img src={entry.imageUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <ImageIcon className="h-5 w-5 m-auto mt-3.5 text-muted-foreground/30" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-foreground/80 line-clamp-2 leading-snug">{entry.caption || "No caption"}</p>
                            <div className="flex items-center gap-2 mt-1.5">
                              <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${s.border} ${s.text}`}>
                                {s.label}
                              </Badge>
                              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                <Clock className="h-2.5 w-2.5" />
                                {new Date(entry.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </span>
                              {urgent && (
                                <span className="text-[9px] text-amber-400 flex items-center gap-0.5">
                                  <Bell className="h-2.5 w-2.5" /> Soon
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── Weekly View ───────────────────────────────────────────── */}
        {viewMode === "weekly" && (
          <Card className="border-border bg-card/60 backdrop-blur shadow-xl relative overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-600 via-primary to-lime-400" />
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-primary" /> Weekly View
              </CardTitle>
              <CardDescription>Click any post to view details or delete it.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-64 w-full rounded-xl" />
              ) : (
                <WeekView
                  entries={entries}
                  onSelectEntry={handleSelectEntry}
                  weekStart={weekAnchor}
                  onPrevWeek={() => {
                    const d = new Date(weekAnchor);
                    d.setDate(d.getDate() - 7);
                    setWeekAnchor(d);
                  }}
                  onNextWeek={() => {
                    const d = new Date(weekAnchor);
                    d.setDate(d.getDate() + 7);
                    setWeekAnchor(d);
                  }}
                />
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* ── Schedule Dialog ───────────────────────────────────────── */}
      <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
        <DialogContent className="bg-card border-border max-w-lg mx-4">
          <DialogHeader>
            <DialogTitle>Schedule a Post</DialogTitle>
            <DialogDescription>Select a draft post and choose when to publish it.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Date &amp; Time</Label>
              <Input
                type="datetime-local"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="bg-background border-border"
              />
            </div>
            <div className="space-y-2">
              <Label>Choose a Draft Post</Label>
              {draftPosts.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-6 text-center">
                  <FileText className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No draft posts available.</p>
                  <p className="text-xs text-muted-foreground mt-1">Generate posts from the Dashboard first.</p>
                </div>
              ) : (
                <ScrollArea className="h-56 rounded-lg border border-border bg-background/50 p-2">
                  <div className="space-y-2">
                    {draftPosts.map((post: any) => {
                      const isSelected = selectedPostId === post.id;
                      return (
                        <button
                          key={post.id}
                          onClick={() => setSelectedPostId(post.id)}
                          className={`w-full flex items-start gap-3 p-3 rounded-lg border text-left transition-all ${
                            isSelected
                              ? "border-primary bg-primary/10 text-foreground"
                              : "border-border bg-background/50 hover:bg-background/80"
                          }`}
                        >
                          <div className="h-12 w-12 rounded-md overflow-hidden bg-muted shrink-0">
                            {post.imageUrl ? (
                              <img src={post.imageUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <ImageIcon className="h-5 w-5 m-auto mt-3.5 text-muted-foreground/30" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs line-clamp-2 text-foreground/90">{post.caption || "No caption"}</p>
                            <p className="text-[10px] text-muted-foreground mt-1">
                              {new Date(post.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          {isSelected && <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />}
                        </button>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setScheduleDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSchedule}
              disabled={!selectedPostId || !scheduledDate || schedulePost.isPending}
              className="bg-primary text-primary-foreground hover:bg-primary/90 min-h-[44px]"
            >
              {schedulePost.isPending ? "Scheduling…" : "Schedule Post"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Entry Detail Dialog ───────────────────────────────────── */}
      <Dialog open={entryDetailOpen} onOpenChange={setEntryDetailOpen}>
        <DialogContent className="bg-card border-border max-w-md mx-4">
          <DialogHeader>
            <DialogTitle>Scheduled Post</DialogTitle>
            <DialogDescription>
              {selectedEntry && new Date(selectedEntry.scheduledAt).toLocaleString(undefined, {
                weekday: "long", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit",
              })}
            </DialogDescription>
          </DialogHeader>
          {selectedEntry && (
            <div className="space-y-4">
              {selectedEntry.imageUrl && (
                <div className="aspect-square rounded-xl overflow-hidden border border-border">
                  <img src={selectedEntry.imageUrl} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              <p className="text-sm text-foreground/80 leading-relaxed">{selectedEntry.caption}</p>
              {selectedEntry.hashtags && (
                <p className="text-xs text-primary">{selectedEntry.hashtags}</p>
              )}
              <div className="flex gap-2 pt-2">
                <Badge
                  variant="outline"
                  className={(() => {
                    const s = POST_TYPE_STYLES[detectPostType(selectedEntry.caption)];
                    return `${s.border} ${s.text}`;
                  })()}
                >
                  {POST_TYPE_STYLES[detectPostType(selectedEntry.caption)].label}
                </Badge>
                {isWithin24h(selectedEntry.scheduledAt) && (
                  <Badge variant="outline" className="border-amber-500/30 text-amber-400 gap-1">
                    <Bell className="h-3 w-3" /> Due soon
                  </Badge>
                )}
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setEntryDetailOpen(false)}>Close</Button>
            <Button
              variant="destructive"
              className="gap-2 min-h-[44px]"
              onClick={handleDeleteEntry}
              disabled={deletePost.isPending}
            >
              <Trash2 className="h-3.5 w-3.5" />
              {deletePost.isPending ? "Removing…" : "Delete Post"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
