import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";
import type { FirestoreLikeTimestamp } from "@/types";

// Custom type-scale names from tailwind.config.ts, so tailwind-merge doesn't
// mistake e.g. `text-h2` for a colour and drop it next to `text-foreground`.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: ["display", "h1", "h2", "h3", "body", "body-sm", "caption", "label", "meta"] }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** "1 project", "12 projects". */
export function plural(n: number, one: string, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`;
}

/** Firestore Admin/client SDKs return Timestamp objects with .toDate(); plain
 * writes may store a Date, ISO string, or epoch number instead. */
export function toJsDate(ts: FirestoreLikeTimestamp): Date {
  if (ts && typeof ts === "object" && "toDate" in ts) return ts.toDate();
  return ts ? new Date(ts) : new Date(0);
}
