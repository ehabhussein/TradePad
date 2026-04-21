"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3, BookOpen, Calendar, ChevronsLeft, ChevronsRight, Code2, Eye, Home, LineChart, ListChecks, Menu,
  Search, Shield, Skull, Sparkles, Target, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";

const primary = [
  { href: "/", label: "Overview", icon: Home, tint: "from-primary to-primary/60" },
  { href: "/days", label: "Days", icon: Calendar, tint: "from-cyan-500 to-cyan-500/60" },
  { href: "/trades", label: "Trades", icon: LineChart, tint: "from-emerald-500 to-emerald-500/60" },
  { href: "/analytics", label: "Analytics", icon: BarChart3, tint: "from-violet-500 to-violet-500/60" },
];

const secondary = [
  { href: "/observations", label: "Observations", icon: Eye, tint: "from-cyan-500 to-cyan-500/60" },
  { href: "/setups", label: "Setups", icon: Target, tint: "from-primary to-primary/60" },
  { href: "/code", label: "Code Library", icon: Code2, tint: "from-blue-500 to-blue-500/60" },
  { href: "/lessons", label: "Lessons", icon: BookOpen, tint: "from-amber-500 to-amber-500/60" },
  { href: "/mistakes", label: "Mistakes", icon: Skull, tint: "from-loss to-loss/60" },
  { href: "/rules", label: "Rules", icon: Shield, tint: "from-rose-500 to-rose-500/60" },
  { href: "/checklist", label: "Checklist", icon: ListChecks, tint: "from-teal-500 to-teal-500/60" },
];

const allLinks = [...primary, ...secondary];

const STORAGE_KEY = "tradepad.sidebar.collapsed";

export function Nav() {
  const path = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  // Default true = matches the inline pre-hydration script in layout.tsx ("rail" unless user opted to expand).
  // The effect below reconciles with persisted preference after mount.
  const [collapsed, setCollapsed] = useState(true);

  const isActive = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));

  // Hydrate collapsed state from localStorage and mirror to <html data-sidebar>
  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (saved === "0") setCollapsed(false);
    else if (saved === "1") setCollapsed(true);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.sidebar = collapsed ? "rail" : "full";
    try { localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0"); } catch {}
  }, [collapsed]);

  // Close mobile drawer on route change
  useEffect(() => { setMobileOpen(false); }, [path]);

  // Outside click closes mobile drawer (desktop sidebar is not dismissible by outside click)
  useEffect(() => {
    if (!mobileOpen) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("[data-drawer-root]") || target.closest("[data-drawer-trigger]")) return;
      setMobileOpen(false);
    };
    const t = setTimeout(() => document.addEventListener("mousedown", onClick), 50);
    return () => { clearTimeout(t); document.removeEventListener("mousedown", onClick); };
  }, [mobileOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMobileOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const currentLabel = allLinks.find((l) => isActive(l.href))?.label ?? "Tradepad";

  return (
    <>
      {/* Top bar — only shown below lg (mobile / tablet) */}
      <header className="sticky top-0 z-40 glass border-b lg:hidden">
        <div className="container max-w-7xl flex h-16 items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              data-drawer-trigger
              onClick={() => setMobileOpen((o) => !o)}
              className="size-10 inline-flex items-center justify-center rounded-lg border bg-background/50 hover:bg-muted transition-all hover:scale-105 active:scale-95"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
            >
              {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
            <Link href="/" className="flex items-center gap-2 font-bold text-lg">
              <div className="size-8 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center glow-primary">
                <Sparkles className="size-4 text-primary-foreground" />
              </div>
              <span className="bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent hidden sm:inline">Tradepad</span>
              <span className="text-muted-foreground hidden md:inline">›</span>
              <span className="text-sm text-muted-foreground hidden md:inline">{currentLabel}</span>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => document.dispatchEvent(new CustomEvent("tradepad:open-palette"))}
              className="inline-flex items-center gap-2 h-9 rounded-md border bg-background/50 px-3 text-sm text-muted-foreground hover:bg-muted transition"
              title="Quick add / navigate (Ctrl+K)"
            >
              <Search className="size-3.5" />
              <span className="hidden sm:inline">Quick add…</span>
              <kbd className="hidden sm:inline-flex items-center gap-0.5 text-[10px] opacity-60 ml-1">
                <span>Ctrl</span>+<span>K</span>
              </kbd>
            </button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Desktop persistent sidebar (lg+) — always visible, collapsible to rail */}
      <aside
        aria-label="Primary navigation"
        className={cn(
          "hidden lg:flex fixed inset-y-0 left-0 z-40 flex-col border-r bg-card/80 backdrop-blur-xl",
          "transition-[width] duration-200 ease-out overflow-hidden",
          collapsed ? "w-14" : "w-64"
        )}
      >
        {/* Logo + collapse toggle */}
        <div className="flex items-center gap-2 h-16 px-3 border-b shrink-0">
          <Link href="/" className="flex items-center gap-2 font-bold min-w-0" title="Tradepad">
            <div className="size-8 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center glow-primary shrink-0">
              <Sparkles className="size-4 text-primary-foreground" />
            </div>
            {!collapsed && (
              <span className="bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent truncate">Tradepad</span>
            )}
          </Link>
          {!collapsed && (
            <button
              onClick={() => setCollapsed(true)}
              className="ml-auto size-8 inline-flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition"
              aria-label="Collapse sidebar"
              title="Collapse"
            >
              <ChevronsLeft className="size-4" />
            </button>
          )}
        </div>

        {/* Nav lists */}
        <nav className="flex-1 overflow-y-auto scrollbar-thin p-2 space-y-4">
          <section className="space-y-1">
            {!collapsed && (
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground px-3 pt-2 pb-1">Journal</p>
            )}
            {primary.map((link) => (
              <SidebarLink key={link.href} link={link} active={isActive(link.href)} collapsed={collapsed} />
            ))}
          </section>
          <section className="space-y-1">
            {!collapsed && (
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground px-3 pt-2 pb-1">Knowledge &amp; Tools</p>
            )}
            {secondary.map((link) => (
              <SidebarLink key={link.href} link={link} active={isActive(link.href)} collapsed={collapsed} />
            ))}
          </section>
        </nav>

        {/* Footer: quick-add, theme, expand toggle (when collapsed) */}
        <div className="border-t p-2 space-y-1 shrink-0">
          <button
            onClick={() => document.dispatchEvent(new CustomEvent("tradepad:open-palette"))}
            className={cn(
              "w-full flex items-center rounded-lg border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 transition",
              collapsed ? "size-10 justify-center" : "gap-3 p-2.5"
            )}
            title="Quick add / navigate (Ctrl+K)"
          >
            <Search className="size-4 shrink-0" />
            {!collapsed && (
              <>
                <span className="text-sm font-medium">Quick add…</span>
                <kbd className="ml-auto text-[10px] opacity-70">Ctrl+K</kbd>
              </>
            )}
          </button>
          <div className={cn("flex items-center", collapsed ? "justify-center" : "justify-between px-1")}>
            <ThemeToggle />
            {collapsed && (
              <button
                onClick={() => setCollapsed(false)}
                className="size-8 inline-flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition"
                aria-label="Expand sidebar"
                title="Expand"
                style={{ marginLeft: 4 }}
              >
                <ChevronsRight className="size-4" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.aside
            data-drawer-root
            key="drawer"
            initial={{ x: "-105%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "-105%", opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 260 }}
            className="lg:hidden fixed top-20 left-4 z-40 h-[calc(100vh-6rem)] w-[88vw] max-w-xs bg-card/95 backdrop-blur-xl border border-border/60 shadow-2xl rounded-2xl overflow-y-auto scrollbar-thin"
          >
            <div className="p-5 space-y-6">
              <section className="space-y-2">
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground px-2">Journal</p>
                <div className="space-y-1">
                  {primary.map((link, i) => (
                    <DrawerLink key={link.href} link={link} active={isActive(link.href)} index={i} onNavigate={() => setMobileOpen(false)} />
                  ))}
                </div>
              </section>

              <section className="space-y-2">
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground px-2">Knowledge &amp; Tools</p>
                <div className="space-y-1">
                  {secondary.map((link, i) => (
                    <DrawerLink key={link.href} link={link} active={isActive(link.href)} index={primary.length + i} onNavigate={() => setMobileOpen(false)} />
                  ))}
                </div>
              </section>

              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="pt-4 border-t border-border/40"
              >
                <button
                  onClick={() => { setMobileOpen(false); document.dispatchEvent(new CustomEvent("tradepad:open-palette")); }}
                  className="w-full flex items-center gap-3 p-3 rounded-lg bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 transition"
                >
                  <Search className="size-4" />
                  <span className="text-sm font-medium">Quick add…</span>
                  <kbd className="ml-auto text-[10px] opacity-70">Ctrl+K</kbd>
                </button>
              </motion.div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}

type LinkItem = { href: string; label: string; icon: any; tint: string };

function SidebarLink({ link, active, collapsed }: { link: LinkItem; active: boolean; collapsed: boolean }) {
  const Icon = link.icon;
  return (
    <Link
      href={link.href}
      title={collapsed ? link.label : undefined}
      className={cn(
        "group flex items-center rounded-lg transition-all relative",
        collapsed ? "justify-center size-10 mx-auto" : "gap-3 p-2.5",
        active
          ? "bg-primary/10 text-primary"
          : "hover:bg-muted text-foreground/80 hover:text-foreground"
      )}
    >
      <div className={cn(
        "size-8 rounded-md flex items-center justify-center shrink-0 transition-all",
        active
          ? `bg-gradient-to-br ${link.tint} text-white shadow`
          : "bg-muted/60 group-hover:bg-background"
      )}>
        <Icon className="size-4" />
      </div>
      {!collapsed && <span className="text-sm font-medium truncate">{link.label}</span>}
      {!collapsed && active && <span className="ml-auto size-1.5 rounded-full bg-primary" />}
    </Link>
  );
}

function DrawerLink({ link, active, index, onNavigate }: { link: LinkItem; active: boolean; index: number; onNavigate: () => void }) {
  const Icon = link.icon;
  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.06 * index + 0.1, type: "spring", damping: 20, stiffness: 220 }}
    >
      <Link
        href={link.href}
        onClick={onNavigate}
        className={cn(
          "group flex items-center gap-3 p-3 rounded-xl transition-all relative overflow-hidden",
          active
            ? "bg-primary/10 text-primary border border-primary/30"
            : "hover:bg-muted text-foreground/80 hover:text-foreground border border-transparent"
        )}
      >
        <div className={cn(
          "size-9 rounded-lg flex items-center justify-center shrink-0 transition-all",
          active
            ? `bg-gradient-to-br ${link.tint} text-white shadow-lg`
            : "bg-muted group-hover:bg-background"
        )}>
          <Icon className="size-4" />
        </div>
        <span className="text-sm font-medium">{link.label}</span>
        {active && <span className="ml-auto size-1.5 rounded-full bg-primary" />}
      </Link>
    </motion.div>
  );
}
