import { useMemo } from 'react';
import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { analyzeSeo, LIMITS, SITE_TITLE_SUFFIX, type CheckStatus } from '@/shared/lib/seo-analysis';
import type { BlogPost } from '@/types/blog';
import { GooglePreview } from '../previews';
import { PanelSection, Switch, TextAreaField, TextField } from '../ui';

const ICON: Record<CheckStatus, typeof CheckCircle2> = { pass: CheckCircle2, warn: AlertTriangle, fail: XCircle };
const TONE: Record<CheckStatus, string> = { pass: 'text-success-fg', warn: 'text-warning-fg', fail: 'text-danger-fg' };

export function SeoScore({ score, size = 44 }: { score: number; size?: number }) {
  const r = (size - 6) / 2;
  const c = 2 * Math.PI * r;
  const tone = score >= 80 ? 'hsl(var(--success))' : score >= 55 ? 'hsl(var(--warning))' : 'hsl(var(--danger))';
  return (
    <span className="relative inline-flex items-center justify-center" style={{ width: size, height: size }} role="img" aria-label={`SEO completeness ${score}%`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--border))" strokeWidth={4} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={tone} strokeWidth={4} strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)} strokeLinecap="round" />
      </svg>
      <span className="tabular absolute text-[11px] font-medium text-foreground">{score}</span>
    </span>
  );
}

export function SeoPanel({ post, update }: { post: Partial<BlogPost>; update: (p: Partial<BlogPost>) => void }) {
  const { score, checks } = useMemo(() => analyzeSeo(post), [post]);
  const canonicalError = post.canonicalUrl && !/^https:\/\/\S+$/i.test(post.canonicalUrl) ? 'Must be a full https:// URL' : undefined;

  return (
    <div className="space-y-6">
      <PanelSection title="Search result preview">
        <GooglePreview post={post} />
      </PanelSection>

      <PanelSection title="Search engine fields">
        <TextField
          label="SEO title"
          value={post.seoTitle ?? ''}
          onChange={(seoTitle) => update({ seoTitle })}
          max={LIMITS.title.max - SITE_TITLE_SUFFIX.length}
          placeholder={post.title || 'Defaults to the article title'}
          hint={`“${SITE_TITLE_SUFFIX.trim()}” is added automatically.`}
        />
        <TextAreaField
          label="SEO description"
          value={post.metaDescription ?? ''}
          onChange={(metaDescription) => update({ metaDescription })}
          max={LIMITS.description.max}
          min={LIMITS.description.min}
          placeholder={post.excerpt || 'Defaults to the excerpt'}
        />
        <TextField label="Focus keywords" value={post.keywords ?? ''} onChange={(keywords) => update({ keywords })} placeholder="react, typescript" hint="For your own planning; search engines ignore meta keywords." />
        <TextField
          label="Canonical URL"
          type="url"
          value={post.canonicalUrl ?? ''}
          onChange={(canonicalUrl) => update({ canonicalUrl })}
          placeholder="Leave empty to use this article's own URL"
          error={canonicalError}
          hint="Only set this if the article was first published elsewhere."
        />
        <Switch checked={!!post.noIndex} onChange={(noIndex) => update({ noIndex })} label="Hide from search engines (no-index)" description="Readers can still open it; it's left out of sitemaps, feeds and search. Not an access control." />
      </PanelSection>

      <PanelSection title="SEO completeness" action={<SeoScore score={score} size={36} />}>
        <ul className="space-y-2">
          {checks.map((c) => {
            const Icon = ICON[c.status];
            return (
              <li key={c.id} className="flex gap-2">
                <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', TONE[c.status])} aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block text-[13px] text-foreground">{c.label}<span className="sr-only">: {c.status}</span></span>
                  {c.detail && <span className="block text-[12px] text-muted-foreground">{c.detail}</span>}
                </span>
              </li>
            );
          })}
        </ul>
      </PanelSection>
    </div>
  );
}
