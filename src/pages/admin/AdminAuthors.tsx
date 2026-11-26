import { useCallback, useEffect, useState } from 'react';
import { ExternalLink, Plus, Star, UserRound, X } from 'lucide-react';
import { toast } from 'sonner';
import PageHeader from '@/components/admin/PageHeader';
import EmptyState from '@/components/admin/EmptyState';
import RowActions from '@/components/admin/RowActions';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { ROW_CARD, ROW_META, ROW_TITLE, SKELETON } from '@/components/admin/listStyles';
import { useCreateIntent } from '@/components/admin/useAdminOverview';
import { EditorSheet } from '@/components/admin/blog/EditorSheet';
import { ImageAssetField } from '@/components/admin/blog/ImageAssetField';
import { TextAreaField, TextField } from '@/components/admin/blog/ui';
import { SITE_URL } from '@/components/admin/navConfig';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AuthorService } from '@/services/blog-collections';
import { BlogService } from '@/services/blog-service';
import { SLUG_RE, slugify } from '@/shared/lib/article';
import { cn, plural } from '@/shared/lib/utils';
import type { Author, BlogPostDoc } from '@/types/blog';

const URL_FIELDS = [
  { key: 'website', label: 'Website' },
  { key: 'linkedin', label: 'LinkedIn URL' },
  { key: 'x', label: 'X URL' },
  { key: 'github', label: 'GitHub URL' },
] as const;

const urlError = (v?: string) => (v && !/^https:\/\/\S+$/i.test(v) ? 'Use a full https:// URL' : undefined);

const AdminAuthors = () => {
  const [authors, setAuthors] = useState<Author[]>([]);
  const [posts, setPosts] = useState<BlogPostDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Author> | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Author | null>(null);

  const load = useCallback(async () => {
    try {
      const [a, p] = await Promise.all([AuthorService.getAll(), BlogService.getAll()]);
      setAuthors(a);
      setPosts(p);
    } catch {
      toast.error('Failed to load authors');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  const add = useCallback(() => setEditing({ links: [] }), []);
  useCreateIntent(add);

  const postsBy = (a: Author) => posts.filter((p) => p.authorId === a.id || (!p.authorId && a.isDefault)).length;
  const patch = (p: Partial<Author>) => setEditing((e) => ({ ...e, ...p }));
  const e = editing ?? {};
  const slugTaken = !!e.slug && authors.some((a) => a.slug === e.slug && a.id !== e.id);
  const invalid =
    !e.name?.trim() || !SLUG_RE.test(e.slug ?? '') || slugTaken || URL_FIELDS.some((f) => urlError(e[f.key])) || (e.links ?? []).some((l) => urlError(l.url));

  const save = async () => {
    if (!editing || invalid) return;
    setSaving(true);
    try {
      const id = await AuthorService.save({
        ...editing,
        links: (editing.links ?? []).filter((l) => l.label && l.url),
        expertise: (editing.expertise ?? []).map((s) => s.trim()).filter(Boolean),
      });
      if (!authors.length) await AuthorService.setDefault(id, [...authors, { ...(editing as Author), id }]);
      toast.success('Author saved');
      setEditing(null);
      load();
    } catch {
      toast.error('Could not save the author');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!deleteTarget) return;
    try {
      await AuthorService.delete(deleteTarget.id);
      toast.success('Author deleted');
      load();
    } catch {
      toast.error('Could not delete the author');
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Authors"
        subtitle={`${plural(authors.length, 'author')} · each gets a profile page on the site`}
        actions={<Button onClick={add}><Plus aria-hidden="true" /> Add author</Button>}
      />

      <div className="grid gap-3">
        {loading ? (
          [1, 2].map((i) => <div key={i} className={cn(SKELETON, 'h-[78px]')} />)
        ) : authors.length === 0 ? (
          <EmptyState icon={UserRound} title="No author profiles yet" description="Posts show a plain name until you add a profile. Profiles add a bio, photo, social links and an author page with Person structured data." action={{ label: 'Add author', onClick: add }} />
        ) : (
          authors.map((a) => (
            <Card key={a.id} className={ROW_CARD}>
              <CardContent className="flex items-center justify-between gap-4 p-4">
                <div className="flex min-w-0 items-center gap-4">
                  {a.avatar ? <img src={a.avatar} alt="" className="h-11 w-11 rounded-full object-cover" /> : <span className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary"><UserRound className="h-5 w-5 text-muted-foreground" /></span>}
                  <div className="min-w-0">
                    <h3 className={cn(ROW_TITLE, 'flex items-center gap-2 truncate')}>
                      {a.name} {a.isDefault && <Badge variant="accent">Default</Badge>}
                    </h3>
                    <p className={ROW_META}>{[a.title, plural(postsBy(a), 'post')].filter(Boolean).join(' · ')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {!a.isDefault && (
                    <Button variant="ghost" size="icon-sm" aria-label={`Make ${a.name} the default author`} title="Make default" onClick={() => AuthorService.setDefault(a.id, authors).then(load)}>
                      <Star />
                    </Button>
                  )}
                  <RowActions label={`author ${a.name}`} href={`${SITE_URL}/authors/${a.slug}`} onEdit={() => setEditing(a)} onDelete={() => setDeleteTarget(a)} />
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <EditorSheet open={!!editing} onOpenChange={(o) => !o && setEditing(null)} title={e.id ? 'Edit author' : 'Add author'} onSave={save} saving={saving} disabled={invalid}>
        <TextField label="Full name" required value={e.name ?? ''} onChange={(name) => patch(e.id || e.slug ? { name } : { name, slug: slugify(name) })} />
        <TextField label="Profile URL slug" required value={e.slug ?? ''} onChange={(slug) => patch({ slug: slugify(slug) })} hint={`${SITE_URL}/authors/${e.slug || 'name'}`} error={slugTaken ? 'Another author uses this slug' : undefined} />
        <TextField label="Professional title" value={e.title ?? ''} onChange={(title) => patch({ title })} placeholder="Founder, TankSudda" />
        <TextAreaField label="Biography" value={e.bio ?? ''} onChange={(bio) => patch({ bio })} max={500} rows={4} />
        <TextField
          label="Expertise"
          value={(e.expertise ?? []).join(', ')}
          onChange={(v) => patch({ expertise: v.split(',').map((s) => s.trimStart()) })}
          placeholder="AI engineering, Startups, Full-stack development"
          hint="Comma-separated. Shown on the author page and used as knowsAbout in structured data. Leave empty to use the topics you write about."
        />
        <ImageAssetField
          label="Profile picture"
          purpose="avatar"
          folder="blog/authors"
          nameHint={e.slug}
          value={e.avatar ? { url: e.avatar, alt: e.name } : null}
          onChange={(asset) => patch({ avatar: asset?.url })}
          showCaption={false}
        />
        {URL_FIELDS.map((f) => (
          <TextField key={f.key} label={f.label} type="url" value={e[f.key] ?? ''} onChange={(v) => patch({ [f.key]: v })} placeholder="https://" error={urlError(e[f.key])} />
        ))}
        <div className="space-y-2">
          <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Other links</span>
          {(e.links ?? []).map((l, i) => (
            <div key={i} className="flex items-start gap-2">
              <div className="w-1/3"><TextField label="Label" value={l.label} onChange={(label) => patch({ links: e.links!.map((x, k) => (k === i ? { ...x, label } : x)) })} /></div>
              <div className="flex-1"><TextField label="URL" type="url" value={l.url} onChange={(url) => patch({ links: e.links!.map((x, k) => (k === i ? { ...x, url } : x)) })} error={urlError(l.url)} /></div>
              <Button type="button" variant="ghost" size="icon-sm" className="mt-6" aria-label="Remove link" onClick={() => patch({ links: e.links!.filter((_, k) => k !== i) })}><X /></Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="xs" onClick={() => patch({ links: [...(e.links ?? []), { label: '', url: '' }] })}>
            <Plus aria-hidden="true" /> Add link
          </Button>
        </div>
        {e.slug && e.id && (
          <a href={`${SITE_URL}/authors/${e.slug}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[13px] text-accent hover:underline">
            View profile page <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        )}
      </EditorSheet>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete author?"
        description={deleteTarget ? `${deleteTarget.name}'s profile page will be removed. ${postsBy(deleteTarget) ? `Their ${plural(postsBy(deleteTarget), 'post')} will fall back to the default author.` : ''}` : undefined}
        confirmLabel="Delete author"
        onConfirm={remove}
      />
    </div>
  );
};

export default AdminAuthors;
