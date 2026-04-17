"use client";
import { useEffect } from "react";

type Props = {
  /** Where to attach the image — one of these must be set server-side */
  dayDate?: string | null;
  tradeId?: number | null;
  caption?: string | null;
  onUploaded?: (screenshot: any) => void;
  /** Optional scoping element — only listens for paste within it. Omit = document-wide when this component is mounted. */
  target?: HTMLElement | null;
  /** Disable when not active (e.g. dialog closed) */
  disabled?: boolean;
};

/**
 * Listens for paste events anywhere in the page while mounted and uploads any image found
 * on the clipboard to /api/screenshots.
 *
 * Drop this once in any form to enable "paste from clipboard" everywhere in that form.
 */
export function PasteImage({ dayDate, tradeId, caption, onUploaded, target, disabled }: Props) {
  useEffect(() => {
    if (disabled) return;
    const el: any = target ?? document;
    const handler = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const blob = item.getAsFile();
          if (!blob) continue;
          const ext = item.type.split("/")[1] || "png";
          const file = new File([blob], `pasted-${Date.now()}.${ext}`, { type: item.type });
          const fd = new FormData();
          fd.append("file", file);
          if (dayDate) fd.append("dayDate", dayDate);
          if (tradeId != null) fd.append("tradeId", String(tradeId));
          if (caption) fd.append("caption", caption);
          const res = await fetch("/api/screenshots", { method: "POST", body: fd });
          if (res.ok) {
            const screenshot = await res.json();
            onUploaded?.(screenshot);
          }
        }
      }
    };
    el.addEventListener("paste", handler as any);
    return () => { el.removeEventListener("paste", handler as any); };
  }, [dayDate, tradeId, caption, target, disabled, onUploaded]);

  return null;
}
