"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, BookOpen, Calendar, Home, LineChart, ListChecks, Plus, Search, Shield, Skull, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

const links = [
  { href: "/", label: "Overview", icon: Home },
  { href: "/days", label: "Days", icon: Calendar },
  { href: "/trades", label: "Trades", icon: LineChart },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/lessons", label: "Lessons", icon: BookOpen },
  { href: "/mistakes", label: "Mistakes", icon: Skull },
  { href: "/rules", label: "Rules", icon: Shield },
  { href: "/checklist", label: "Checklist", icon: ListChecks },
];

export function Nav() {
  const path = usePathname();
  return (
    <header className="sticky top-0 z-50 glass border-b">
      <div className="container max-w-7xl flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <div className="size-8 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center glow-primary">
            <Sparkles className="size-4 text-primary-foreground" />
          </div>
          <span className="bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
            Tradepad
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {links.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? path === "/" : path.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-all",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="size-4" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => document.dispatchEvent(new CustomEvent("tradepad:open-palette"))}
            className="hidden md:inline-flex items-center gap-2 h-9 rounded-md border bg-background/50 px-3 text-sm text-muted-foreground hover:bg-muted transition"
          >
            <Search className="size-3.5" />
            <span>Quick add…</span>
            <kbd className="ml-2 inline-flex items-center gap-0.5 text-[10px] opacity-60">
              <span>Ctrl</span>+<span>K</span>
            </kbd>
          </button>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
