/**
 * Client for the public site's CMS endpoints (/api/admin on the portfolio).
 * These need server credentials (signing preview links, the deploy hook,
 * running the scheduler), so they live with the site's Cloudflare Pages Functions.
 * Authenticated with the signed-in user's Firebase ID token.
 *
 * VITE_SITE_URL points at the site's local `npm run pages:dev` during development.
 */

import { auth } from '@/lib/firebase';
import { SITE_URL } from '@/components/admin/navConfig';

export const SITE_ORIGIN = (import.meta.env.VITE_SITE_URL || SITE_URL).replace(/\/$/, '');

async function call<T>(action: string, method: 'GET' | 'POST', body?: unknown): Promise<T> {
  const user = auth.currentUser;
  if (!user) throw new Error('You are signed out. Sign in again.');
  const token = await user.getIdToken();
  const res = await fetch(`${SITE_ORIGIN}/api/admin?action=${action}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data as T;
}

export type RebuildResult =
  | { triggered: true }
  | { triggered: false; reason: 'not-configured' | 'throttled' | 'failed'; detail?: string };

export interface SchedulerSummary {
  ranAt: string;
  published: string[];
  rejected: { id: string; issues: string[] }[];
  failed: { id: string; error: string }[];
  rebuild?: RebuildResult | null;
}

export interface SiteStatus {
  integrations: {
    deployHook: boolean;
    previewSecret: boolean;
    cronSecret: boolean;
    analyticsSalt: boolean;
    ga4: boolean;
    searchConsole: boolean;
  };
  scheduler: (SchedulerSummary & { lastRunAt?: string }) | null;
  rebuild: { lastTriggeredAt?: number; lastReason?: string } | null;
}

export const SiteApi = {
  previewLink: (postId: string) =>
    call<{ token: string; url: string; expiresAt: string }>('preview-token', 'POST', { postId }),
  rebuild: (reason: string) => call<RebuildResult>('rebuild', 'POST', { reason }),
  runScheduler: () => call<SchedulerSummary>('run-scheduler', 'POST'),
  status: () => call<SiteStatus>('status', 'GET'),
};

/** Human summary of a rebuild request, for toasts. */
export function rebuildMessage(r: RebuildResult): string {
  if (r.triggered) return 'Site rebuild queued: crawler pages and share cards refresh in a few minutes.';
  if (r.reason === 'throttled') return 'A rebuild is already queued.';
  if (r.reason === 'not-configured') return 'Deploy hook not configured: crawler pages refresh on the next deploy.';
  return `Rebuild failed${r.detail ? `: ${r.detail}` : ''}.`;
}
