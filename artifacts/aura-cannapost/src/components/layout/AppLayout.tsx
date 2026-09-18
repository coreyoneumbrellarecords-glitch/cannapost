import { Link, useLocation } from "wouter";
import { useClerk, useUser } from "@clerk/react";
import {
  LayoutDashboard,
  CalendarDays,
  History,
  Settings,
  Instagram,
  MessageSquare,
  Mail,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Leaf,
  Menu,
  X,
  Home,
} from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useGetBrandProfile } from "@workspace/api-client-react";

interface AppLayoutProps {
  children: React.ReactNode;
}

const BYPASS_KEY = "postaura_bypass_auth";

export default function AppLayout({ children }: AppLayoutProps) {
  const [location, setLocation] = useLocation();
  const { signOut } = useClerk();
  const { user } = useUser();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Brand profile for logo + name in sidebar
  const { data: brandProfile } = useGetBrandProfile();
  const profile = brandProfile as any;
  const brandName = profile?.businessName;
  const brandLogo = profile?.logoBase64;

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  // Prevent body scroll when mobile drawer open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  async function handleLogout() {
    // 1. Wipe all client-side auth state immediately
    sessionStorage.removeItem(BYPASS_KEY);
    localStorage.removeItem("aura_checklist_dismissed");
    // 2. End the Clerk session — no redirectUrl so Clerk doesn't do a full-page
    //    browser redirect that loses the app's base path prefix
    try { await signOut(); } catch (_) { /* ignore — still navigate below */ }
    // 3. Always navigate via wouter so the base path is applied correctly
    setLocation("/sign-in");
  }

  function handleGoHome() {
    // Navigate to landing — session stays active, no sign-out
    setLocation("/landing");
  }

  const navItems = [
    { href: "/dashboard", label: "Dashboard",  icon: LayoutDashboard },
    { href: "/history",   label: "History",    icon: History },
    { href: "/calendar",  label: "Calendar",   icon: CalendarDays },
    { href: "/settings",  label: "Brand Kit",  icon: Settings },
    { href: "/instagram", label: "Instagram",  icon: Instagram },
    { href: "/sms",       label: "SMS",        icon: MessageSquare },
    { href: "/email",     label: "Email",      icon: Mail },
  ];

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-border flex-shrink-0">
        {!collapsed ? (
          <Link href="/dashboard" className="flex items-center gap-2 flex-1 min-w-0">
            {brandLogo ? (
              <img src={brandLogo} alt="Logo" className="h-7 w-7 rounded-md object-contain flex-shrink-0" />
            ) : (
              <div className="h-7 w-7 rounded-md bg-primary/15 flex items-center justify-center flex-shrink-0">
                <Leaf className="h-4 w-4 text-primary" />
              </div>
            )}
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-base tracking-tight bg-gradient-to-r from-primary to-emerald-400 bg-clip-text text-transparent truncate leading-tight">
                {brandName || "Aura"}
              </span>
              {!brandName && (
                <span className="text-[10px] text-muted-foreground leading-tight">by CannaPost</span>
              )}
            </div>
          </Link>
        ) : (
          <Link href="/dashboard" className="mx-auto flex justify-center w-full">
            {brandLogo ? (
              <img src={brandLogo} alt="Logo" className="h-8 w-8 rounded-md object-contain" />
            ) : (
              <div className="h-8 w-8 rounded-md bg-primary/15 flex items-center justify-center">
                <Leaf className="h-4 w-4 text-primary" />
              </div>
            )}
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="hidden md:flex shrink-0 h-8 w-8 ml-1 text-muted-foreground hover:text-foreground"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </Button>
        {/* Mobile close */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden shrink-0 h-8 w-8 ml-1 text-muted-foreground hover:text-foreground"
          onClick={() => setMobileOpen(false)}
        >
          <X size={18} />
        </Button>
      </div>

      {/* Nav items */}
      <div className="flex-1 overflow-y-auto py-5 px-3 space-y-1">
        {navItems.map((item, index) => {
          const isActive = location === item.href || location.startsWith(`${item.href}/`);

          // Visual separator before SMS — groups the channel settings together
          const showChannelDivider = index === navItems.findIndex((n) => n.href === "/instagram");

          return (
            <div key={item.href}>
              {showChannelDivider && !collapsed && (
                <div className="flex items-center gap-2 px-3 pt-3 pb-1">
                  <div className="h-px flex-1 bg-border/60" />
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                    Channels
                  </span>
                  <div className="h-px flex-1 bg-border/60" />
                </div>
              )}
              {showChannelDivider && collapsed && (
                <div className="mx-3 my-2 h-px bg-border/60" />
              )}
              <Link
                href={item.href}
                className={cn(
                  "flex items-center rounded-lg px-3 py-2.5 transition-all duration-200 group relative min-h-[44px]",
                  isActive
                    ? "bg-primary/15 text-primary font-medium"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  collapsed ? "justify-center" : "justify-start gap-3"
                )}
                data-testid={`nav-${item.label.toLowerCase()}`}
              >
                <item.icon size={20} className={cn("flex-shrink-0", isActive && "text-primary")} />
                {!collapsed && <span>{item.label}</span>}
                {isActive && !collapsed && (
                  <div className="absolute right-2 w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(34,197,94,0.8)]" />
                )}
              </Link>
            </div>
          );
        })}
      </div>

      {/* User footer — interactive dropdown */}
      <div className="p-3 border-t border-border mt-auto flex-shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            {!collapsed ? (
              <button className="w-full flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-accent transition-colors text-left group">
                <Avatar className="h-8 w-8 border border-border flex-shrink-0">
                  <AvatarImage src={user?.imageUrl} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    {user?.firstName?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col overflow-hidden flex-1 min-w-0">
                  <span className="text-sm font-medium truncate leading-tight">
                    {user?.fullName || brandName || "Developer"}
                  </span>
                  <span className="text-xs text-muted-foreground truncate leading-tight">
                    {user?.primaryEmailAddress?.emailAddress || "dev mode"}
                  </span>
                </div>
                <ChevronRight size={14} className="text-muted-foreground group-hover:text-foreground flex-shrink-0 rotate-90 transition-transform" />
              </button>
            ) : (
              <button className="w-full flex justify-center py-1 rounded-lg hover:bg-accent transition-colors">
                <Avatar className="h-8 w-8 border border-border">
                  <AvatarImage src={user?.imageUrl} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    {user?.firstName?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
              </button>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-52 mb-1">
            <DropdownMenuItem onClick={handleGoHome} className="gap-2 cursor-pointer">
              <Home size={15} className="text-muted-foreground" />
              Go to Home
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="gap-2 cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
            >
              <LogOut size={15} />
              Log Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );

  return (
    <div className="flex h-[100dvh] w-full bg-background overflow-hidden text-foreground">

      {/* ── Desktop Sidebar ─────────────────────────────────────── */}
      <aside
        className={cn(
          "hidden md:flex flex-col border-r border-border bg-sidebar transition-all duration-300 z-10",
          collapsed ? "w-[72px]" : "w-[240px]"
        )}
      >
        <SidebarContent />
      </aside>

      {/* ── Mobile Sidebar Overlay ───────────────────────────────── */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        className={cn(
          "md:hidden fixed inset-y-0 left-0 z-50 flex flex-col bg-sidebar border-r border-border transition-transform duration-300 w-[260px]",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <SidebarContent />
      </aside>

      {/* ── Main Content ────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Mobile top bar */}
        <header className="md:hidden h-14 flex items-center justify-between px-4 border-b border-border bg-sidebar/80 backdrop-blur flex-shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-muted-foreground hover:text-foreground"
            onClick={() => setMobileOpen(true)}
          >
            <Menu size={20} />
          </Button>
          <Link href="/dashboard" className="flex items-center gap-2">
            {brandLogo ? (
              <img src={brandLogo} alt="Logo" className="h-6 w-6 rounded object-contain" />
            ) : (
              <div className="h-6 w-6 rounded bg-primary/15 flex items-center justify-center">
                <Leaf className="h-3.5 w-3.5 text-primary" />
              </div>
            )}
            <span className="font-bold text-base bg-gradient-to-r from-primary to-emerald-400 bg-clip-text text-transparent">
              {brandName || "Aura"}
            </span>
          </Link>
          {/* Home button replaces empty slot */}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-muted-foreground hover:text-foreground"
            onClick={handleGoHome}
            title="Go to home"
          >
            <Home size={18} />
          </Button>
        </header>

        <main className="flex-1 overflow-y-auto relative bg-background/50">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/8 via-background to-background pointer-events-none -z-10" />
          <div
            className="absolute inset-0 pointer-events-none -z-10 opacity-[0.025]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'%3E%3Cpath d='M30 5 C18 5 8 15 8 28 C8 38 15 46 25 49 L25 55 L35 55 L35 49 C45 46 52 38 52 28 C52 15 42 5 30 5Z' fill='%2334d399'/%3E%3C/svg%3E")`,
              backgroundSize: "80px 80px",
            }}
          />
          {children}
        </main>
      </div>
    </div>
  );
}
