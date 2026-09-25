import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { FirestoreLikeTimestamp } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Firestore Admin/client SDKs return Timestamp objects with .toDate(); plain
 * writes may store a Date, ISO string, or epoch number instead. */
export function toJsDate(ts: FirestoreLikeTimestamp): Date {
  if (ts && typeof ts === "object" && "toDate" in ts) return ts.toDate();
  return ts ? new Date(ts) : new Date(0);
}
