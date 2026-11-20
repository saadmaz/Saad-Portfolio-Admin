import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, CircleDashed, Plus, RefreshCw, X } from 'lucide-react';
import { toast } from 'sonner';
import PageHeader from '@/components/admin/PageHeader';
import { SKELETON } from '@/components/admin/listStyles';
import { PanelSection, SelectField, Switch, TextField } from '@/components/admin/blog/ui';
import { Button } from '@/components/ui/button';
import { AuthorService, SettingsService } from '@/services/blog-collections';
import { BlogService } from '@/services/blog-service';
import { SiteApi, rebuildMessage, type SiteStatus } from '@/services/site-api';
import { ARTICLE_TYPES, DEFAULT_WPM, slugify } from '@/shared/lib/article';
import { cn } from '@/shared/lib/utils';
import type { Author, BlogPostDoc, BlogSettings } from '@/types/blog';

/** Central taxonomy and blog-wide switches (blog_settings/config), plus site job status. */
const AdminBlogSettings = () => {
  const [settings, setSettings] = useState<BlogSettings | null>(null);
  const [authors, setAuthors] = useState<Author[]>([]);
  const [posts, setPosts] = useState<BlogPostDoc[]>([]);
  const [status, setStatus] = useState<SiteStatus | null>(null);
  const [statusError, setStatusError] = useState('');
  const [saving, setSaving] = useState(false);
  const [rebuilding, setRebuilding] = useState(false);

  useEffect(() => {
    Promise.all([SettingsService.get(), AuthorService.getAll(), BlogService.getAll()])
      .then(([s, a, p]) => {
        setSettings({ articleTypes: ARTICLE_TYPES, readingWpm: DEFAULT_WPM, reactionsEnabled: true, postsPerPage: 12, categories: [], ...s });
        setAuthors(a);
        setPosts(p);
      })
      .catch(() => toast.error('Failed to load settings'));
    SiteApi.status().then(setStatus).catch((e) => setStatusError(e instanceof Error ? e.message : 'unreachable'));
  }, []);

  const usage = useMemo(() => {
    const types: Record<string, number> = {};
    const cats: Record<string, number> = {};
    posts.forEach((p) => {
      if (p.articleType) types[p.articleType] = (types[p.articleType] ?? 0) + 1;
      if (p.category) cats[slugify(p.category)] = (cats[slugify(p.category)] ?? 0) + 1;
    });
    return { types, cats };
  }, [posts]);

  if (!settings) return <div className={cn(SKELETON, 'h-96')} />;
  const s = settings;
  const patch = (p: Partial<BlogSettings>) => setSettings({ ...s, ...p });
  const types = s.articleTypes ?? [];
  const cats = s.categories ?? [];
  const wpmError = !s.readingWpm || s.readingWpm < 120 || s.readingWpm > 400 ? 'Between 120 and 400' : undefined;
  const invalid = !!wpmError || types.some((t) => !t.label.trim()) || cats.some((c) => !c.label.trim());

  const save = async () => {
    setSaving(true);
    try {
      await SettingsService.save({
        ...s,
        articleTypes: types.map((t) => ({ id: t.id || slugify(t.label), label: t.label.trim() })),
        categories: cats.map((c) => ({ ...c, slug: slugify(c.label), label: c.label.trim() })),
      });
      toast.success('Blog settings saved');
    } catch {
      toast.error('Could not save settings');
    } finally {
      setSaving(false);
    }
  };

  const rebuild = async () => {
    setRebuilding(true);
    try {
      toast.message(rebuildMessage(await SiteApi.rebuild('manual rebuild from settings')));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Rebuild failed');
    } finally {
      setRebuilding(false);
    }
  };

  const integ = status?.integrations;
  const Check = ({ ok, label, hint }: { ok?: boolean; label: string; hint: string }) => (
    <li className="flex items-start gap-2">
      {ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 text-success-fg" aria-hidden="true" /> : <CircleDashed className="mt-0.5 h-4 w-4 text-warning-fg" aria-hidden="true" />}
      <span><span className="block text-[13px] text-foreground">{label}</span><span className="block text-[12px] text-muted-foreground">{hint}</span></span>
    </li>
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Blog settings" subtitle="Taxonomy, reading time and reader features for every article" actions={<Button onClick={save} loading={saving} disabled={invalid}>Save settings</Button>} />

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="space-y-6 rounded-2xl border border-border-subtle bg-card p-5">
          <PanelSection title="Article types" action={<Button size="xs" variant="outline" onClick={() => patch({ articleTypes: [...types, { id: '', label: '' }] })}><Plus aria-hidden="true" /> Add</Button>}>
            <ul className="space-y-2">
              {types.map((t, i) => (
                <li key={i} className="flex items-center gap-2">
                  <input aria-label="Type name" value={t.label} onChange={(e) => patch({ articleTypes: types.map((x, k) => (k === i ? { ...x, label: e.target.value } : x)) })} className="h-9 flex-1 rounded-lg border border-border bg-secondary px-3 text-[13px] text-foreground outline-none focus:border-accent" />
                  <span className="tabular w-16 text-right text-[12px] text-muted-foreground">{usage.types[t.id] ?? 0} posts</span>
                  <Button size="icon-sm" variant="ghost" aria-label={`Remove ${t.label || 'type'}`} disabled={!!usage.types[t.id]} title={usage.types[t.id] ? 'In use by posts' : undefined} onClick={() => patch({ articleTypes: types.filter((_, k) => k !== i) })}><X /></Button>
                </li>
              ))}
            </ul>
            <p className="text-[12px] text-muted-foreground">Renaming keeps existing posts; types in use can’t be removed.</p>
          </PanelSection>

          <PanelSection title="Categories" action={<Button size="xs" variant="outline" onClick={() => patch({ categories: [...cats, { slug: '', label: '', description: '' }] })}><Plus aria-hidden="true" /> Add</Button>}>
            <p className="text-[12px] text-muted-foreground">Categories from posts are offered automatically. Add them here to give their pages a proper name and description.</p>
            <ul className="space-y-3">
              {cats.map((c, i) => (
                <li key={i} className="space-y-2 rounded-lg border border-border-subtle p-3">
                  <div className="flex items-center gap-2">
                    <input aria-label="Category name" value={c.label} onChange={(e) => patch({ categories: cats.map((x, k) => (k === i ? { ...x, label: e.target.value } : x)) })} className="h-9 flex-1 rounded-lg border border-border bg-secondary px-3 text-[13px] text-foreground outline-none focus:border-accent" />
                    <span className="tabular text-[12px] text-muted-foreground">{usage.cats[slugify(c.label)] ?? 0} posts</span>
                    <Button size="icon-sm" variant="ghost" aria-label="Remove category" onClick={() => patch({ categories: cats.filter((_, k) => k !== i) })}><X /></Button>
                  </div>
                  <input aria-label="Category description" placeholder="Description for the category page (optional)" value={c.description ?? ''} onChange={(e) => patch({ categories: cats.map((x, k) => (k === i ? { ...x, description: e.target.value } : x)) })} className="h-9 w-full rounded-lg border border-border bg-secondary px-3 text-[13px] text-foreground outline-none focus:border-accent" />
                  <p className="font-mono text-[11px] text-muted-foreground">/blog/category/{slugify(c.label) || '…'}</p>
                </li>
              ))}
            </ul>
          </PanelSection>
        </section>

        <div className="space-y-6">
          <section className="space-y-6 rounded-2xl border border-border-subtle bg-card p-5">
            <PanelSection title="Reading">
              <TextField label="Reading speed (words per minute)" type="number" value={String(s.readingWpm ?? DEFAULT_WPM)} onChange={(v) => patch({ readingWpm: Number(v) || 0 })} error={wpmError} hint="Used for “min read” on new saves. 200–250 suits most readers." />
              <TextField label="Articles per page" type="number" value={String(s.postsPerPage ?? 12)} onChange={(v) => patch({ postsPerPage: Math.min(48, Math.max(3, Number(v) || 12)) })} hint="How many load at a time on /blog." />
            </PanelSection>
            <PanelSection title="Readers">
              <Switch checked={s.reactionsEnabled !== false} onChange={(reactionsEnabled) => patch({ reactionsEnabled })} label="Reader reactions" description="Turns reactions off on every article at once." />
              <SelectField label="Default author" value={s.defaultAuthorId ?? ''} onChange={(defaultAuthorId) => patch({ defaultAuthorId: defaultAuthorId || undefined })} options={authors.map((a) => ({ value: a.id, label: a.name }))} placeholder="None" hint="Shown on posts without an author profile." />
            </PanelSection>
          </section>

          <section className="space-y-4 rounded-2xl border border-border-subtle bg-card p-5">
            <PanelSection title="Site connection" action={<Button size="xs" variant="outline" onClick={rebuild} loading={rebuilding}><RefreshCw aria-hidden="true" /> Rebuild site</Button>}>
              {statusError ? (
                <p className="text-[13px] text-warning-fg">The site’s admin API couldn’t be reached ({statusError}). Preview, rebuilds and the scheduler button need it (see README).</p>
              ) : !integ ? (
                <div className={cn(SKELETON, 'h-24')} />
              ) : (
                <ul className="space-y-2.5">
                  <Check ok={integ.previewSecret} label="Draft previews" hint="PREVIEW_SECRET on the site" />
                  <Check ok={integ.cronSecret} label="Scheduled publishing" hint={status?.scheduler?.lastRunAt ? `Last run ${new Date(status.scheduler.lastRunAt).toLocaleString()}` : 'CRON_SECRET on the site; not run yet'} />
                  <Check ok={integ.deployHook} label="Automatic rebuilds" hint={status?.rebuild?.lastTriggeredAt ? `Last rebuild queued ${new Date(status.rebuild.lastTriggeredAt).toLocaleString()}` : 'VERCEL_DEPLOY_HOOK_URL on the site'} />
                  <Check ok={integ.analyticsSalt} label="First-party analytics & reactions" hint="ANALYTICS_SALT on the site" />
                </ul>
              )}
            </PanelSection>
          </section>
        </div>
      </div>
    </div>
  );
};

export default AdminBlogSettings;
