import { useState, type KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import type { Author, BlogPost, BlogSeries, BlogSettings } from '@/types/blog';
import { ARTICLE_TYPES, slugify } from '@/shared/lib/article';
import { PanelSection, SelectField, Switch, TextField } from '../ui';

export function DetailsPanel({
  post,
  update,
  authors,
  series,
  settings,
  knownTags,
  knownCategories,
}: {
  post: Partial<BlogPost>;
  update: (p: Partial<BlogPost>) => void;
  authors: Author[];
  series: BlogSeries[];
  settings: BlogSettings;
  knownTags: string[];
  knownCategories: string[];
}) {
  const [tagInput, setTagInput] = useState('');
  const tags = post.tags ?? [];
  const types = settings.articleTypes?.length ? settings.articleTypes : ARTICLE_TYPES;
  const categories = [...new Set([...(settings.categories ?? []).map((c) => c.label), ...knownCategories])];

  const addTag = (raw: string) => {
    const t = slugify(raw, 40);
    if (t && !tags.includes(t)) update({ tags: [...tags, t] });
    setTagInput('');
  };
  const onTagKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(tagInput);
    }
    if (e.key === 'Backspace' && !tagInput && tags.length) update({ tags: tags.slice(0, -1) });
  };
  const suggestions = knownTags.filter((t) => !tags.includes(t) && (!tagInput || t.includes(slugify(tagInput, 40)))).slice(0, 8);

  return (
    <div className="space-y-6">
      <PanelSection title="Classification">
        <SelectField
          label="Article type"
          value={post.articleType ?? ''}
          onChange={(articleType) => update({ articleType: articleType || undefined })}
          options={types.map((t) => ({ value: t.id, label: t.label }))}
          placeholder="Choose a type"
          hint="Types are managed in Blog settings."
        />
        <TextField
          label="Category"
          required
          value={post.category ?? ''}
          onChange={(category) => update({ category })}
          list="blog-categories"
          placeholder="e.g. AI"
          hint="Each category gets its own page on the site."
        />
        <datalist id="blog-categories">
          {categories.map((c) => <option key={c} value={c} />)}
        </datalist>

        <div className="space-y-1.5">
          <label htmlFor="tag-input" className="text-[12.5px] font-medium text-fg-2">Tags</label>
          <div className="flex min-h-[40px] flex-wrap items-center gap-1.5 rounded-lg border border-border bg-secondary px-2.5 py-1.5 focus-within:border-accent">
            {tags.map((t) => (
              <span key={t} className="inline-flex items-center gap-1 rounded-md border border-accent/20 bg-accent/10 px-2 py-0.5 text-[12px] text-accent-hover">
                {t}
                <button type="button" onClick={() => update({ tags: tags.filter((x) => x !== t) })} aria-label={`Remove tag ${t}`} className="opacity-60 hover:opacity-100">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            <input
              id="tag-input"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={onTagKey}
              onBlur={() => tagInput && addTag(tagInput)}
              placeholder={tags.length ? '' : 'Type and press Enter'}
              className="min-w-[90px] flex-1 bg-transparent text-[13px] text-foreground outline-none"
            />
          </div>
          {suggestions.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {suggestions.map((t) => (
                <button key={t} type="button" onClick={() => addTag(t)} className="rounded-md border border-border-subtle px-1.5 py-0.5 text-[11px] text-muted-foreground hover:text-foreground">
                  + {t}
                </button>
              ))}
            </div>
          )}
        </div>
      </PanelSection>

      <PanelSection title="Author" action={<Link to="/authors" className="text-[12px] text-accent hover:underline">Manage</Link>}>
        {authors.length ? (
          <SelectField
            label="Author profile"
            value={post.authorId ?? settings.defaultAuthorId ?? ''}
            onChange={(authorId) => update({ authorId: authorId || undefined, author: authors.find((a) => a.id === authorId)?.name ?? post.author })}
            options={authors.map((a) => ({ value: a.id, label: `${a.name}${a.isDefault ? ' (default)' : ''}` }))}
            placeholder="Default author"
          />
        ) : (
          <p className="text-[12px] text-muted-foreground">
            No author profiles yet: the byline shows “{post.author || 'Saad Mazhar'}”. <Link to="/authors" className="text-accent hover:underline">Create one</Link> for an author page and richer search results.
          </p>
        )}
      </PanelSection>

      <PanelSection title="Series" action={<Link to="/series" className="text-[12px] text-accent hover:underline">Manage</Link>}>
        <SelectField
          label="Part of a series"
          value={post.seriesId ?? ''}
          onChange={(seriesId) => update({ seriesId: seriesId || undefined })}
          options={series.map((s) => ({ value: s.id, label: `${s.title}${s.published ? '' : ' (hidden)'}` }))}
          placeholder="Not in a series"
          hint="Order parts on the Series page. Readers see progress and previous/next links."
        />
      </PanelSection>

      <PanelSection title="On the article page">
        <Switch checked={post.tableOfContents !== false} onChange={(v) => update({ tableOfContents: v })} label="Table of contents" description="Generated from H2 and H3 headings." />
        <Switch checked={post.reactionsEnabled !== false} onChange={(v) => update({ reactionsEnabled: v })} label="Reader reactions" description={settings.reactionsEnabled === false ? 'Currently off for the whole blog (Blog settings).' : 'Helpful, Insightful, Interesting, Loved it.'} />
        <Switch checked={post.socialShareEnabled !== false} onChange={(v) => update({ socialShareEnabled: v })} label="Share buttons" />
      </PanelSection>

      <PanelSection title="Call to action">
        <TextField label="Button text" value={post.ctaText ?? ''} onChange={(ctaText) => update({ ctaText })} placeholder="Learn more" />
        <TextField label="Button link" type="url" value={post.ctaUrl ?? ''} onChange={(ctaUrl) => update({ ctaUrl })} placeholder="https://" error={post.ctaUrl && !/^(https?:\/\/|\/)/.test(post.ctaUrl) ? 'Use a full URL or a /path' : undefined} />
      </PanelSection>
    </div>
  );
}
