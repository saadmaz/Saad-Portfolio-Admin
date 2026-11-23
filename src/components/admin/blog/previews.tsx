/**
 * Search and social previews. They use the same fallbacks the site's <SEO>
 * component emits: SEO title → title (+ " - Saad Mazhar"), SEO description →
 * excerpt, social image → cover → the generated card.
 */

import { AlertTriangle, Globe } from 'lucide-react';
import { SITE_HOST, SITE_URL } from '@/components/admin/navConfig';
import { LIMITS, SITE_TITLE_SUFFIX, truncate } from '@/shared/lib/seo-analysis';
import type { BlogPost, ImageAsset } from '@/types/blog';

function previewData(post: Partial<BlogPost>) {
  const title = `${(post.seoTitle || post.title || 'Untitled post').trim()}${SITE_TITLE_SUFFIX}`;
  const description = (post.metaDescription || post.excerpt || '').trim();
  const url = post.canonicalUrl?.trim() || `${SITE_URL}/blog/${post.slug || 'your-slug'}`;
  const image: ImageAsset | null = post.socialImage?.url ? post.socialImage : post.cover?.url ? post.cover : null;
  return { title, description, url, image };
}

function Warnings({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <ul className="space-y-1">
      {items.map((w) => (
        <li key={w} className="flex gap-1.5 text-[12px] text-warning-fg">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" /> {w}
        </li>
      ))}
    </ul>
  );
}

export function GooglePreview({ post }: { post: Partial<BlogPost> }) {
  const { title, description, url } = previewData(post);
  const t = truncate(title, LIMITS.title.max);
  const d = truncate(description, LIMITS.description.max);
  const path = url.replace(/^https?:\/\/(www\.)?/, '').split('/');
  const warnings = [
    ...(!post.seoTitle && !post.title ? ['Missing title.'] : []),
    ...(t.truncated ? [`Title is ${title.length} characters; Google will cut it off around ${LIMITS.title.max}.`] : []),
    ...(!description ? ['Missing description: Google will pick text from the page.'] : []),
    ...(d.truncated ? [`Description is ${description.length} characters; it will be truncated.`] : []),
    ...(post.noIndex ? ['No-index is on: this article won’t appear in search results.'] : []),
  ];
  return (
    <div className="space-y-2">
      <div className="rounded-xl bg-white p-4 font-[arial,sans-serif] text-left" aria-label="Google search result preview">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#f1f3f4] text-[13px] font-medium text-[#19191b]">S</span>
          <span className="min-w-0 leading-tight">
            <span className="block text-[14px] text-[#202124]">Saad Mazhar</span>
            <span className="block truncate text-[12px] text-[#4d5156]">{`https://${path.join(' › ')}`}</span>
          </span>
        </div>
        <p className="mt-1.5 text-[20px] leading-[1.3] text-[#1a0dab]">{t.text}</p>
        <p className="mt-1 text-[14px] leading-[1.58] text-[#4d5156]">
          {post.publishedAt && <span className="text-[#70757a]">{new Date(post.publishedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} — </span>}
          {d.text || <span className="italic text-[#70757a]">No description</span>}
        </p>
      </div>
      <Warnings items={warnings} />
    </div>
  );
}

function CardImage({ image, ratio = 'aspect-[1.91/1]' }: { image: ImageAsset | null; ratio?: string }) {
  return image ? (
    <img src={image.variants?.[1]?.url ?? image.url} alt="" className={`${ratio} w-full object-cover`} style={{ objectPosition: `${image.focalX ?? 50}% ${image.focalY ?? 50}%` }} />
  ) : (
    <div className={`${ratio} flex w-full items-center justify-center bg-[radial-gradient(ellipse_at_85%_0%,rgba(255,95,0,0.35),transparent_55%)] bg-[#111113] text-[12px] text-[#a3a39e]`}>
      Generated site card
    </div>
  );
}

export function SocialPreviews({ post }: { post: Partial<BlogPost> }) {
  const { title, description, image } = previewData(post);
  const warnings = [
    ...(!image ? ['No social or cover image: networks will show the site’s generated card.'] : []),
    ...(image?.width && image.height && (image.width < 1200 || image.height < 630) ? ['Image is under 1200×630; it may be shown small or blurry.'] : []),
    ...(image && !post.socialImage?.url ? ['Using the cover image. Add a dedicated social image for a tailored card.'] : []),
    ...(post.unlisted ? ['Unlisted posts hide the share buttons, but anyone with the link can still share it.'] : []),
  ];
  const domain = SITE_HOST;
  return (
    <div className="space-y-5">
      <Warnings items={warnings} />

      <figure className="space-y-1.5">
        <figcaption className="label text-[11px] text-muted-foreground">LinkedIn</figcaption>
        <div className="overflow-hidden rounded-lg border border-[#e0dfdc] bg-white text-left">
          <CardImage image={image} />
          <div className="px-3 py-2">
            <p className="line-clamp-2 text-[14px] font-semibold leading-snug text-[#191919]">{title}</p>
            <p className="mt-0.5 text-[12px] text-[#666]">{domain}</p>
          </div>
        </div>
      </figure>

      <figure className="space-y-1.5">
        <figcaption className="label text-[11px] text-muted-foreground">X (Twitter)</figcaption>
        <div className="relative overflow-hidden rounded-2xl border border-[#2f3336] bg-black">
          <CardImage image={image} />
          <span className="absolute bottom-2 left-2 rounded bg-black/70 px-1.5 py-0.5 text-[12px] text-white">{domain}</span>
        </div>
        <p className="text-[12px] text-muted-foreground">From {domain}: <span className="text-foreground">{truncate(title, 70).text}</span></p>
      </figure>

      <figure className="space-y-1.5">
        <figcaption className="label text-[11px] text-muted-foreground">Facebook</figcaption>
        <div className="overflow-hidden rounded-lg border border-[#dadde1] bg-[#f0f2f5] text-left">
          <CardImage image={image} />
          <div className="px-3 py-2.5">
            <p className="text-[12px] uppercase text-[#606770]">{domain}</p>
            <p className="line-clamp-2 text-[16px] font-semibold leading-snug text-[#1d2129]">{title}</p>
            <p className="line-clamp-1 text-[14px] text-[#606770]">{description}</p>
          </div>
        </div>
      </figure>

      <figure className="space-y-1.5">
        <figcaption className="label text-[11px] text-muted-foreground">WhatsApp</figcaption>
        <div className="ml-auto max-w-[85%] rounded-lg bg-[#005c4b] p-1 text-left">
          <div className="overflow-hidden rounded-md bg-[#025144]">
            <CardImage image={image} />
            <div className="px-2.5 py-2">
              <p className="line-clamp-2 text-[13px] font-medium text-[#e9edef]">{title}</p>
              <p className="line-clamp-2 text-[12px] text-[#aebac1]">{description}</p>
              <p className="mt-0.5 flex items-center gap-1 text-[11px] text-[#8696a0]"><Globe className="h-3 w-3" aria-hidden="true" /> {domain}</p>
            </div>
          </div>
          <p className="px-1.5 py-1 text-[13px] text-[#e9edef] [overflow-wrap:anywhere]">{`${SITE_URL}/blog/${post.slug || 'your-slug'}`}</p>
        </div>
      </figure>
    </div>
  );
}
