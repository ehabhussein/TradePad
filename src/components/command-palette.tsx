"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { BookOpen, Calendar, BarChart3, LineChart, ListChecks, Shield, Skull, Plus, Home, Camera, Target, Code2 } from "lucide-react";
import { todayISO } from "@/lib/utils";

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Only trigger when no input/textarea is focused, so Ctrl+K doesn't hijack normal typing
      const t = e.target as HTMLElement | null;
      const typing = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k" && !typing) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const onCustom = () => setOpen(true);
    document.addEventListener("keydown", onKey);
    document.addEventListener("tradepad:open-palette", onCustom as EventListener);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("tradepad:open-palette", onCustom as EventListener);
    };
  }, []);

  const go = (path: string) => { router.push(path); setOpen(false); };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="p-0 max-w-xl">
        <DialogTitle className="sr-only">Command palette</DialogTitle>
        <Command>
          <CommandInput placeholder="Quick add, navigate, search…" />
          <CommandList>
            <CommandEmpty>No results.</CommandEmpty>
            <CommandGroup heading="Quick add">
              <CommandItem onSelect={() => go("/trades/new")}>
                <Plus className="size-4" /> New trade
              </CommandItem>
              <CommandItem onSelect={() => go(`/days/${todayISO()}`)}>
                <Calendar className="size-4" /> Today's journal entry
              </CommandItem>
              <CommandItem onSelect={() => go("/lessons")}>
                <BookOpen className="size-4" /> Add lesson
              </CommandItem>
              <CommandItem onSelect={() => go("/mistakes")}>
                <Skull className="size-4" /> Log a mistake
              </CommandItem>
            </CommandGroup>
            <CommandGroup heading="Navigate">
              <CommandItem onSelect={() => go("/")}><Home className="size-4" /> Overview</CommandItem>
              <CommandItem onSelect={() => go("/days")}><Calendar className="size-4" /> All days</CommandItem>
              <CommandItem onSelect={() => go("/trades")}><LineChart className="size-4" /> All trades</CommandItem>
              <CommandItem onSelect={() => go("/analytics")}><BarChart3 className="size-4" /> Analytics</CommandItem>
              <CommandItem onSelect={() => go("/setups")}><Target className="size-4" /> Setups</CommandItem>
              <CommandItem onSelect={() => go("/code")}><Code2 className="size-4" /> Code Library</CommandItem>
              <CommandItem onSelect={() => go("/lessons")}><BookOpen className="size-4" /> Lessons</CommandItem>
              <CommandItem onSelect={() => go("/mistakes")}><Skull className="size-4" /> Mistakes</CommandItem>
              <CommandItem onSelect={() => go("/rules")}><Shield className="size-4" /> Rules</CommandItem>
              <CommandItem onSelect={() => go("/checklist")}><ListChecks className="size-4" /> Checklist</CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
