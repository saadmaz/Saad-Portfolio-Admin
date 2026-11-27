import { useMemo, useState } from 'react';
import { AlertTriangle, CalendarClock, Check, CheckCircle2, Copy, Globe, Link2, Star, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/shared/lib/utils';
import { DateTimePicker } from '@/components/ui/date-picker';
import { SITE_URL } from '@/components/admin/navConfig';
import {
  STATUS_LABELS,
  browserTimeZone,
  formatInZone,
  publishBlockers,
  zonedWallTimeToUtc,
} from '@/shared/lib/article';
import type { ArticleStatus, BlogPost } from '@/types/blog';
import { PanelSection, Switch } from '../ui';
import type { ScheduleValue } from '../schedule';

const COMMON_ZONES = ['UTC', 'Asia/Colombo', 'Asia/Dubai', 'Asia/Singapore', 'Europe/London', 'Europe/Berlin', 'America/New_York', 'America/Los_Angeles', 'Australia/Sydney'];

const STATUS_HELP: Record<ArticleStatus, string> = {
  draft: 'Only visible here. Autosaves as you type.',
  in_review: 'Ready for a final read-through. Not public.',
  scheduled: 'Publishes automatically at the time below.',
  published: 'Live. Edits autosave privately until you click Update.',
  archived: 'Taken down and kept for reference. Not public.',
};

export function PublishPanel({
  post,
  status,
  update,
  schedule,
  setSchedule,
  wordCount,
  wpm,
}: {
  post: Partial<BlogPost>;
  status: ArticleStatus;
  update: (p: Partial<BlogPost>) => void;
  schedule: ScheduleValue;
  setSchedule: (s: ScheduleValue) => void;
  wordCount: number;
  wpm: number;
}) {
  const [copied, setCopied] = useState(false);
  const blockers = useMemo(() => publishBlockers(post), [post]);
  const utc = schedule.local ? zonedWallTimeToUtc(schedule.local, schedule.zone) : null;
  const zones = useMemo(() => [...new Set([browserTimeZone(), schedule.zone, ...COMMON_ZONES])], [schedule.zone]);
  const url = `${SITE_URL}/blog/${post.slug || 'your-slug'}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error('Could not copy link');
    }
  };

  return (
    <div className="space-y-6">
      <PanelSection title="Status">
        <div className="rounded-lg border border-border-subtle bg-secondary/40 p-3">
          <p className="text-[13px] font-medium text-foreground">{STATUS_LABELS[status]}</p>
          <p className="text-[12px] text-muted-foreground">{STATUS_HELP[status]}</p>
          {status === 'scheduled' && post.scheduledAt && (
            <p className="mt-2 flex items-center gap-1.5 text-[12px] text-accent">
              <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
              {formatInZone(post.scheduledAt, post.scheduledTimezone || browserTimeZone())} ({post.scheduledTimezone || browserTimeZone()})
            </p>
          )}
          {post.publishedAt && (
            <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-[12px]">
              <dt className="text-muted-foreground">First published</dt>
              <dd className="tabular text-fg-2">{new Date(post.publishedAt).toLocaleString()}</dd>
              {post.lastUpdatedAt && post.lastUpdatedAt !== post.publishedAt && (
                <>
                  <dt className="text-muted-foreground">Last updated</dt>
                  <dd className="tabular text-fg-2">{new Date(post.lastUpdatedAt).toLocaleString()}</dd>
                </>
              )}
            </dl>
          )}
        </div>
        {post.scheduleError && (
          <p role="alert" className="flex gap-2 rounded-lg border border-danger/40 bg-danger-subtle p-3 text-[12px] text-danger-fg">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" /> {post.scheduleError}
          </p>
        )}
      </PanelSection>

      {status !== 'published' && (
        <PanelSection title="Schedule">
          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <DateTimePicker
              aria-label="Publish date and time"
              value={schedule.local}
              onChange={(local) => setSchedule({ ...schedule, local })}
            />
            <select
              aria-label="Time zone"
              value={schedule.zone}
              onChange={(e) => setSchedule({ ...schedule, zone: e.target.value })}
              className="h-9 rounded-lg border border-border bg-secondary px-2 text-[13px] text-foreground"
            >
              {zones.map((z) => <option key={z} value={z}>{z}</option>)}
            </select>
          </div>
          <p className="text-[12px] text-muted-foreground">
            {utc
              ? Date.parse(utc) <= Date.now()
                ? 'That time has passed: pick a future time.'
                : `Publishes ${new Date(utc).toUTCString().replace('GMT', 'UTC')}. Use Schedule in the top bar to confirm.`
              : 'Pick a date and time, then use Schedule in the top bar.'}
          </p>
        </PanelSection>
      )}

      <PanelSection title="Visibility">
        <div role="radiogroup" aria-label="Visibility" className="space-y-1.5">
          {([
            { value: false, icon: Globe, title: 'Public', desc: 'Listed on /blog, the homepage, feeds and search.' },
            { value: true, icon: Link2, title: 'Unlisted', desc: 'Only people with the link can read it. Never indexed.' },
          ] as const).map((opt) => {
            const active = !!post.unlisted === opt.value;
            return (
              <button
                key={opt.title}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => update({ unlisted: opt.value })}
                className={cn('flex w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors', active ? 'border-accent/45 bg-accent/[0.08]' : 'border-border-subtle bg-secondary/50 hover:border-border')}
              >
                <opt.icon className={cn('mt-0.5 h-4 w-4 shrink-0', active ? 'text-accent' : 'text-muted-foreground')} aria-hidden="true" />
                <span>
                  <span className="block text-[13px] font-medium text-foreground">{opt.title}</span>
                  <span className="block text-[12px] text-muted-foreground">{opt.desc}</span>
                </span>
              </button>
            );
          })}
        </div>
        {post.unlisted && (
          <div className="flex items-center gap-1 rounded-lg border border-border bg-secondary py-1 pl-3 pr-1">
            <span className="min-w-0 flex-1 truncate font-mono text-[12px] text-fg-2" title={url}>{url.replace(/^https?:\/\/(www\.)?/, '')}</span>
            <button type="button" onClick={copy} className="flex items-center gap-1 rounded-md px-2 py-1 text-[12px] text-fg-2 hover:bg-background/60" aria-label="Copy link">
              {copied ? <Check className="h-3.5 w-3.5 text-accent" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        )}
      </PanelSection>

      <PanelSection title="Promotion">
        <Switch
          checked={!!post.featured}
          onChange={(featured) => update({ featured })}
          label="Featured article"
          description="Shown first on the homepage and blog. Order featured posts from the Blog posts list."
        />
        {post.featured && post.unlisted && <p className="flex gap-1.5 text-[12px] text-warning-fg"><Star className="h-3.5 w-3.5" aria-hidden="true" /> Unlisted posts never appear in featured sections.</p>}
      </PanelSection>

      <PanelSection title="Reading time">
        <p className="text-[13px] text-fg-2">
          <span className="text-foreground">{post.readingTimeMinutes ?? 1} min read</span> · {wordCount.toLocaleString()} words at {wpm} wpm
        </p>
        <p className="text-[12px] text-muted-foreground">Counted from the article text only (not markup), and shown on the site.</p>
      </PanelSection>

      <PanelSection title="Ready to publish?">
        {blockers.length === 0 ? (
          <p className="flex items-center gap-1.5 text-[13px] text-success-fg"><CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Everything required is in place.</p>
        ) : (
          <ul className="space-y-1">
            {blockers.map((b) => (
              <li key={b} className="flex gap-1.5 text-[12px] text-danger-fg"><XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" /> {b}</li>
            ))}
          </ul>
        )}
      </PanelSection>
    </div>
  );
}
