"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3, BookOpen, Calendar, Code2, Home, LineChart, ListChecks, Menu,
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
  { href: "/setups", label: "Setups", icon: Target, tint: "from-primary to-primary/60" },
  { href: "/code", label: "Code Library", icon: Code2, tint: "from-blue-500 to-blue-500/60" },
  { href: "/lessons", label: "Lessons", icon: BookOpen, tint: "from-amber-500 to-amber-500/60" },
  { href: "/mistakes", label: "Mistakes", icon: Skull, tint: "from-loss to-loss/60" },
  { href: "/rules", label: "Rules", icon: Shield, tint: "from-rose-500 to-rose-500/60" },
  { href: "/checklist", label: "Checklist", icon: ListChecks, tint: "from-teal-500 to-teal-500/60" },
];

const allLinks = [...primary, ...secondary];

export function Nav() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const isActive = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));

  // Close drawer on route change
  useEffect(() => { setOpen(false); }, [path]);

  // Lock scroll when drawer open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // ESC closes
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const currentLabel = allLinks.find((l) => isActive(l.href))?.label ?? "Tradepad";

  return (
    <>
      {/* Top bar — minimal: hamburger + breadcrumb + quick add + theme */}
      <header className="sticky top-0 z-40 glass border-b">
        <div className="container max-w-7xl flex h-16 items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setOpen(true)}
              className="size-10 inline-flex items-center justify-center rounded-lg border bg-background/50 hover:bg-muted transition-all hover:scale-105 active:scale-95"
              aria-label="Open menu"
            >
              <Menu className="size-5" />
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

      {/* Drawer */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            />

            {/* Drawer panel */}
            <motion.aside
              key="drawer"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 260 }}
              className="fixed top-0 left-0 z-50 h-full w-[88vw] max-w-sm bg-card border-r border-border/60 shadow-2xl overflow-y-auto scrollbar-thin"
            >
              <div className="gradient-mesh min-h-full p-6 space-y-8">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <Link href="/" className="flex items-center gap-3">
                    <div className="size-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center glow-primary">
                      <Sparkles className="size-5 text-primary-foreground" />
                    </div>
                    <div>
                      <div className="text-lg font-bold">Tradepad</div>
                      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Trading Journal</div>
                    </div>
                  </Link>
                  <button
                    onClick={() => setOpen(false)}
                    className="size-9 inline-flex items-center justify-center rounded-lg border bg-background/50 hover:bg-muted transition-all hover:rotate-90"
                    aria-label="Close menu"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                {/* Primary */}
                <section className="space-y-2">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground px-2">Journal</p>
                  <div className="space-y-1">
                    {primary.map((link, i) => (
                      <DrawerLink key={link.href} link={link} active={isActive(link.href)} index={i} />
                    ))}
                  </div>
                </section>

                {/* Secondary */}
                <section className="space-y-2">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground px-2">Knowledge & Tools</p>
                  <div className="space-y-1">
                    {secondary.map((link, i) => (
                      <DrawerLink key={link.href} link={link} active={isActive(link.href)} index={primary.length + i} />
                    ))}
                  </div>
                </section>

                {/* Footer tip */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 }}
                  className="mt-auto pt-6 border-t border-border/40"
                >
                  <button
                    onClick={() => { setOpen(false); document.dispatchEvent(new CustomEvent("tradepad:open-palette")); }}
                    className="w-full flex items-center gap-3 p-3 rounded-lg bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 transition"
                  >
                    <Search className="size-4" />
                    <span className="text-sm font-medium">Quick add…</span>
                    <kbd className="ml-auto text-[10px] opacity-70">Ctrl+K</kbd>
                  </button>
                </motion.div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

type LinkItem = { href: string; label: string; icon: any; tint: string };

function DrawerLink({ link, active, index }: { link: LinkItem; active: boolean; index: number }) {
  const Icon = link.icon;
  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.06 * index + 0.1, type: "spring", damping: 20, stiffness: 220 }}
    >
      <Link
        href={link.href}
        className={cn(
          "group flex items-center gap-3 p-3 rounded-xl transition-all relative overflow-hidden",
          active
            ? "bg-primary/10 text-primary border border-primary/30"
            : "hover:bg-muted text-foreground/80 hover:text-foreground border border-transparent"
        )}
      >
        {/* gradient icon tile */}
        <div className={cn(
          "size-9 rounded-lg flex items-center justify-center shrink-0 transition-all",
          active
            ? `bg-gradient-to-br ${link.tint} text-white shadow-lg`
            : "bg-muted group-hover:bg-background"
        )}>
          <Icon className="size-4" />
        </div>
        <span className="text-sm font-medium">{link.label}</span>
        {active && (
          <motion.span
            layoutId="active-pill"
            className="ml-auto size-1.5 rounded-full bg-primary"
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          />
        )}
      </Link>
    </motion.div>
  );
}
