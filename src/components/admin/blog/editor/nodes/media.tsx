/**
 * Image blocks. Captions, credits and alt text are node attributes, so they
 * are stored as structured data and rendered as <figure>/<figcaption> HTML
 * the site styles (see the site's index.css "Editorial blocks").
 */

import { Node } from '@tiptap/core';
import type { DOMOutputSpec } from '@tiptap/pm/model';
import { NodeViewContent, ReactNodeViewRenderer } from '@tiptap/react';
import { ArrowLeft, ArrowRight, Columns2, GalleryHorizontal, Image as ImageIcon, X } from 'lucide-react';
import type { ImageAsset } from '@/types/blog';
import { BlockFrame, BlockInput, Segmented, type NodeViewProps } from '../BlockFrame';
import { withBlockView } from '../block-view-context';
import { useBlockUpload } from '../useBlockUpload';

const srcsetOf = (asset: ImageAsset) =>
  asset.variants?.length ? asset.variants.map((v) => `${v.url} ${v.width}w`).join(', ') : null;

const imgAttrs = (a: { src: string; alt?: string; w?: number | null; h?: number | null; srcset?: string | null }) => ({
  src: a.src,
  alt: a.alt ?? '',
  ...(a.w ? { width: String(a.w) } : {}),
  ...(a.h ? { height: String(a.h) } : {}),
  ...(a.srcset ? { srcset: a.srcset, sizes: '(min-width: 760px) 680px, 100vw' } : {}),
  loading: 'lazy',
});

function captionSpec(caption?: string | null, credit?: string | null, creditUrl?: string | null): DOMOutputSpec[] {
  if (!caption && !credit) return [];
  const parts: DOMOutputSpec[] = [];
  if (caption) parts.push(['span', { 'data-caption': '' }, caption]);
  if (credit)
    parts.push([
      'span',
      { 'data-credit': '' },
      creditUrl ? ['a', { href: creditUrl, target: '_blank', rel: 'noopener noreferrer' }, credit] : credit,
    ]);
  return [['figcaption', {}, ...parts]];
}

// ── Figure ────────────────────────────────────────────────────────────────

const FigureView = ({ node, updateAttributes, deleteNode, selected }: NodeViewProps) => {
  const a = node.attrs;
  const { picker } = useBlockUpload();
  const setAsset = (asset: ImageAsset) =>
    updateAttributes({ src: asset.url, w: asset.width ?? null, h: asset.height ?? null, srcset: srcsetOf(asset) });

  return (
    <BlockFrame label="Image" icon={ImageIcon} selected={selected} onDelete={deleteNode} actions={picker(([asset]) => asset && setAsset(asset))}>
      <div className="space-y-3 p-3">
        {a.src ? (
          <div className={a.size === '100' ? '' : a.size === '75' ? 'mx-auto w-3/4' : a.size === '50' ? 'mx-auto w-1/2' : 'mx-auto w-1/3'}>
            <img src={a.src} alt={a.alt} className="w-full rounded-lg border border-border-subtle" />
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">Upload an image to place it here.</p>
        )}
        <div className="flex flex-wrap items-center gap-3" contentEditable={false}>
          <Segmented
            label="Image width"
            value={a.size}
            onChange={(size) => updateAttributes({ size })}
            options={[
              { value: '100', label: 'Full' },
              { value: '75', label: '¾' },
              { value: '50', label: '½' },
              { value: '33', label: '⅓' },
            ]}
          />
          <Segmented
            label="Image position"
            value={a.align}
            onChange={(align) => updateAttributes({ align })}
            options={[
              { value: 'center', label: 'Center' },
              { value: 'left', label: 'Left' },
              { value: 'right', label: 'Right' },
              { value: 'wide', label: 'Wide' },
            ]}
          />
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <BlockInput label="Alt text (required)" value={a.alt} onChange={(alt) => updateAttributes({ alt })} placeholder="Describe the image for screen readers" className="sm:col-span-2" />
          <BlockInput label="Caption" value={a.caption} onChange={(caption) => updateAttributes({ caption })} className="sm:col-span-2" />
          <BlockInput label="Credit" value={a.credit} onChange={(credit) => updateAttributes({ credit })} placeholder="Photo: Jane Doe / Unsplash" />
          <BlockInput label="Credit link" value={a.creditUrl} onChange={(creditUrl) => updateAttributes({ creditUrl })} placeholder="https://" type="url" />
        </div>
      </div>
    </BlockFrame>
  );
};

export const Figure = Node.create({
  name: 'figure',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src: { default: '' },
      alt: { default: '' },
      caption: { default: '' },
      credit: { default: '' },
      creditUrl: { default: '' },
      size: { default: '100' },
      align: { default: 'center' },
      w: { default: null },
      h: { default: null },
      srcset: { default: null },
    };
  },

  parseHTML() {
    const fromImg = (img: HTMLImageElement | null) => ({
      src: img?.getAttribute('src') ?? '',
      alt: img?.getAttribute('alt') ?? '',
      w: Number(img?.getAttribute('width')) || null,
      h: Number(img?.getAttribute('height')) || null,
      srcset: img?.getAttribute('srcset') || null,
    });
    return [
      {
        tag: 'figure[data-figure]',
        getAttrs: (el) => {
          const fig = el as HTMLElement;
          const credit = fig.querySelector('[data-credit]');
          return {
            ...fromImg(fig.querySelector('img')),
            caption: fig.querySelector('[data-caption]')?.textContent ?? '',
            credit: credit?.textContent ?? '',
            creditUrl: credit?.querySelector('a')?.getAttribute('href') ?? '',
            size: fig.dataset.width || '100',
            align: fig.dataset.align || 'center',
          };
        },
      },
      // Images from posts written before figures existed.
      { tag: 'img[src]', getAttrs: (el) => fromImg(el as HTMLImageElement) },
    ];
  },

  renderHTML({ node }) {
    const a = node.attrs;
    return [
      'figure',
      { 'data-figure': '', 'data-width': a.size, 'data-align': a.align },
      ['img', imgAttrs(a as never)],
      ...captionSpec(a.caption, a.credit, a.creditUrl),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(withBlockView(FigureView));
  },
});

// ── Gallery / carousel ───────────────────────────────────────────────────

interface GalleryImage {
  src: string;
  alt: string;
  caption: string;
  w?: number | null;
  h?: number | null;
  srcset?: string | null;
}

const GalleryView = ({ node, updateAttributes, deleteNode, selected }: NodeViewProps) => {
  const images = node.attrs.images as GalleryImage[];
  const { picker } = useBlockUpload();
  const set = (next: GalleryImage[]) => updateAttributes({ images: next });
  const patch = (i: number, p: Partial<GalleryImage>) => set(images.map((img, k) => (k === i ? { ...img, ...p } : img)));
  const move = (i: number, d: -1 | 1) => {
    const next = [...images];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    set(next);
  };
  const carousel = node.attrs.layout === 'carousel';

  return (
    <BlockFrame
      label={carousel ? 'Carousel' : 'Gallery'}
      icon={GalleryHorizontal}
      selected={selected}
      onDelete={deleteNode}
      actions={picker(
        (assets) =>
          set([...images, ...assets.map((a) => ({ src: a.url, alt: '', caption: '', w: a.width, h: a.height, srcset: srcsetOf(a) }))]),
        true,
      )}
    >
      <div className="space-y-3 p-3" contentEditable={false}>
        <div className="flex flex-wrap gap-3">
          <Segmented
            label="Layout"
            value={node.attrs.layout}
            onChange={(layout) => updateAttributes({ layout })}
            options={[
              { value: 'grid', label: 'Grid' },
              { value: 'carousel', label: 'Carousel' },
            ]}
          />
          {!carousel && (
            <Segmented
              label="Columns"
              value={String(node.attrs.columns)}
              onChange={(columns) => updateAttributes({ columns })}
              options={[
                { value: '2', label: '2 columns' },
                { value: '3', label: '3 columns' },
              ]}
            />
          )}
        </div>
        {images.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Add two or more images.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {images.map((img, i) => (
              <li key={`${img.src}-${i}`} className="space-y-2 rounded-lg border border-border-subtle bg-background p-2">
                <div className="relative">
                  <img src={img.src} alt={img.alt} className="aspect-[4/3] w-full rounded-md object-cover" />
                  <div className="absolute right-1 top-1 flex gap-1">
                    <button type="button" aria-label="Move earlier" disabled={i === 0} onClick={() => move(i, -1)} className="rounded bg-background/80 p-1 disabled:opacity-40"><ArrowLeft className="h-3.5 w-3.5" /></button>
                    <button type="button" aria-label="Move later" disabled={i === images.length - 1} onClick={() => move(i, 1)} className="rounded bg-background/80 p-1 disabled:opacity-40"><ArrowRight className="h-3.5 w-3.5" /></button>
                    <button type="button" aria-label="Remove image" onClick={() => set(images.filter((_, k) => k !== i))} className="rounded bg-background/80 p-1 text-danger-fg"><X className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
                <BlockInput label="Alt text" value={img.alt} onChange={(alt) => patch(i, { alt })} />
                <BlockInput label="Caption" value={img.caption} onChange={(caption) => patch(i, { caption })} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </BlockFrame>
  );
};

export const Gallery = Node.create({
  name: 'gallery',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      images: { default: [] as GalleryImage[] },
      layout: { default: 'grid' },
      columns: { default: '2' },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-gallery]',
        getAttrs: (el) => {
          const root = el as HTMLElement;
          return {
            layout: root.dataset.layout || 'grid',
            columns: root.dataset.columns || '2',
            images: [...root.querySelectorAll('figure')].map((fig) => {
              const img = fig.querySelector('img');
              return {
                src: img?.getAttribute('src') ?? '',
                alt: img?.getAttribute('alt') ?? '',
                caption: fig.querySelector('figcaption')?.textContent ?? '',
                w: Number(img?.getAttribute('width')) || null,
                h: Number(img?.getAttribute('height')) || null,
                srcset: img?.getAttribute('srcset') || null,
              };
            }),
          };
        },
      },
    ];
  },

  renderHTML({ node }) {
    const images = node.attrs.images as GalleryImage[];
    return [
      'div',
      { 'data-gallery': '', 'data-layout': node.attrs.layout, 'data-columns': node.attrs.columns },
      ...images.map(
        (img): DOMOutputSpec => [
          'figure',
          {},
          ['img', imgAttrs(img)],
          ...(img.caption ? [['figcaption', {}, img.caption] as DOMOutputSpec] : []),
        ],
      ),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(withBlockView(GalleryView));
  },
});

// ── Image beside text ────────────────────────────────────────────────────

const MediaTextView = ({ node, updateAttributes, deleteNode, selected }: NodeViewProps) => {
  const a = node.attrs;
  const { picker } = useBlockUpload();
  return (
    <BlockFrame
      label="Image + text"
      icon={Columns2}
      selected={selected}
      onDelete={deleteNode}
      actions={picker(([asset]) => asset && updateAttributes({ src: asset.url, w: asset.width, h: asset.height, srcset: srcsetOf(asset) }))}
    >
      <div className="space-y-3 p-3">
        <div className={`grid items-start gap-4 sm:grid-cols-2 ${a.side === 'right' ? '[&>*:first-child]:sm:order-2' : ''}`}>
          <div contentEditable={false} className="space-y-2">
            {a.src ? (
              <img src={a.src} alt={a.alt} className="w-full rounded-lg border border-border-subtle" />
            ) : (
              <div className="flex aspect-[4/3] items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">No image yet</div>
            )}
            <BlockInput label="Alt text" value={a.alt} onChange={(alt) => updateAttributes({ alt })} />
            <BlockInput label="Caption" value={a.caption} onChange={(caption) => updateAttributes({ caption })} />
          </div>
          <NodeViewContent className="min-h-[80px] rounded-lg border border-dashed border-border-subtle p-3" />
        </div>
        <Segmented
          label="Image side"
          value={a.side}
          onChange={(side) => updateAttributes({ side })}
          options={[
            { value: 'left', label: 'Image left' },
            { value: 'right', label: 'Image right' },
          ]}
        />
      </div>
    </BlockFrame>
  );
};

export const MediaText = Node.create({
  name: 'mediaText',
  group: 'block',
  content: 'block+',
  draggable: true,
  defining: true,

  addAttributes() {
    return {
      src: { default: '' },
      alt: { default: '' },
      caption: { default: '' },
      side: { default: 'left' },
      w: { default: null },
      h: { default: null },
      srcset: { default: null },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-media-text]',
        contentElement: '[data-media-text-body]',
        getAttrs: (el) => {
          const root = el as HTMLElement;
          const img = root.querySelector('figure img');
          return {
            side: root.dataset.side || 'left',
            src: img?.getAttribute('src') ?? '',
            alt: img?.getAttribute('alt') ?? '',
            caption: root.querySelector('figure figcaption')?.textContent ?? '',
            w: Number(img?.getAttribute('width')) || null,
            h: Number(img?.getAttribute('height')) || null,
            srcset: img?.getAttribute('srcset') || null,
          };
        },
      },
    ];
  },

  renderHTML({ node }) {
    const a = node.attrs;
    return [
      'div',
      { 'data-media-text': '', 'data-side': a.side },
      ['figure', {}, ['img', imgAttrs(a as never)], ...(a.caption ? [['figcaption', {}, a.caption] as DOMOutputSpec] : [])],
      ['div', { 'data-media-text-body': '' }, 0],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(withBlockView(MediaTextView));
  },
});
