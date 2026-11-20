import { useEffect, useRef, useState } from 'react';
import { Crosshair, ImagePlus, Library, Loader2, RefreshCw, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/shared/lib/utils';
import { ACCEPT_ATTR, dimensionWarnings, processAndUpload, type ImagePurpose } from '@/services/image-pipeline';
import { MediaService } from '@/services/blog-collections';
import type { ImageAsset, MediaAsset } from '@/types/blog';
import { TextField } from './ui';

const CROPS = [
  { label: '16:9 card', ratio: 'aspect-video' },
  { label: '2:1 article', ratio: 'aspect-[2/1]' },
  { label: '1:1 square', ratio: 'aspect-square' },
];

function MediaLibrary({ open, onOpenChange, onPick }: { open: boolean; onOpenChange: (o: boolean) => void; onPick: (m: MediaAsset) => void }) {
  const [items, setItems] = useState<MediaAsset[] | null>(null);
  useEffect(() => {
    if (!open) return;
    MediaService.getAll().then(setItems).catch(() => {
      setItems([]);
      toast.error('Could not load the media library');
    });
  }, [open]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Media library</DialogTitle>
          <DialogDescription>Images uploaded to the blog. Pick one to reuse it.</DialogDescription>
        </DialogHeader>
        {!items ? (
          <div className="h-60 animate-pulse rounded-xl bg-secondary" />
        ) : items.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">No images yet. Uploads appear here.</p>
        ) : (
          <ul className="grid max-h-[60vh] grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-4">
            {items.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => {
                    onPick(m);
                    onOpenChange(false);
                  }}
                  className="group w-full overflow-hidden rounded-lg border border-border-subtle text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <img src={m.variants?.[0]?.url ?? m.url} alt={m.alt || m.name} className="aspect-[4/3] w-full object-cover transition-transform group-hover:scale-105" loading="lazy" />
                  <span className="block truncate px-2 py-1.5 text-[12px] text-muted-foreground">
                    {m.width}×{m.height} · {m.name}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * An uploaded image with everything the site needs to show and credit it:
 * alt text, caption, credit + source link, and a focal point that every
 * crop on the site centres on.
 */
export function ImageAssetField({
  label,
  value,
  onChange,
  purpose,
  folder,
  nameHint,
  hint,
  showCaption = true,
}: {
  label: string;
  value: ImageAsset | null | undefined;
  onChange: (asset: ImageAsset | null) => void;
  purpose: ImagePurpose;
  folder: string;
  nameHint?: string;
  hint?: string;
  showCaption?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const focal = { x: value?.focalX ?? 50, y: value?.focalY ?? 50 };
  const patch = (p: Partial<ImageAsset>) => value && onChange({ ...value, ...p });

  const upload = async (file: File) => {
    setProgress(0);
    try {
      const { asset, warnings: w } = await processAndUpload(file, { folder, purpose, nameHint, onProgress: setProgress });
      // Keep the descriptive fields when replacing the picture itself.
      onChange({ ...asset, alt: value?.alt, caption: value?.caption, credit: value?.credit, creditUrl: value?.creditUrl });
      setWarnings(w);
      toast.success(value ? 'Image replaced' : 'Image uploaded');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setProgress(null);
    }
  };

  const setFocal = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    patch({
      focalX: Math.round(((e.clientX - rect.left) / rect.width) * 100),
      focalY: Math.round(((e.clientY - rect.top) / rect.height) * 100),
    });
  };
  const nudgeFocal = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 10 : 2;
    const moves: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    const m = moves[e.key];
    if (!m) return;
    e.preventDefault();
    patch({ focalX: Math.min(100, Math.max(0, focal.x + m[0])), focalY: Math.min(100, Math.max(0, focal.y + m[1])) });
  };

  const sizeWarnings = value?.width && value.height ? dimensionWarnings(value.width, value.height, purpose) : warnings;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
        {value && <span className="tabular text-[12px] text-muted-foreground">{value.width}×{value.height}{value.variants?.length ? ` · ${value.variants.length} sizes` : ''}</span>}
      </div>

      {value?.url ? (
        <>
          <div className="relative">
            <button
              type="button"
              onClick={setFocal}
              onKeyDown={nudgeFocal}
              aria-label={`Focal point ${focal.x}% across, ${focal.y}% down. Click the image or use arrow keys to move it.`}
              className="relative block w-full cursor-crosshair overflow-hidden rounded-lg border border-border-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <img src={value.url} alt="" className="w-full" />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-accent/70 shadow-lg"
                style={{ left: `${focal.x}%`, top: `${focal.y}%` }}
              >
                <Crosshair className="h-3.5 w-3.5 text-white" />
              </span>
            </button>
            {progress !== null && (
              <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-background/70 text-sm text-accent">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {progress}%
              </div>
            )}
          </div>
          <p className="text-[12px] text-muted-foreground">Click the image to set the focal point; crops on the site centre on it.</p>
          <div className="grid grid-cols-3 gap-2" aria-label="Crop previews">
            {CROPS.map((c) => (
              <figure key={c.label} className="space-y-1">
                <div className={cn('overflow-hidden rounded-md border border-border-subtle', c.ratio)}>
                  <img src={value.variants?.[0]?.url ?? value.url} alt="" className="h-full w-full object-cover" style={{ objectPosition: `${focal.x}% ${focal.y}%` }} />
                </div>
                <figcaption className="text-center text-[11px] text-muted-foreground">{c.label}</figcaption>
              </figure>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="xs" variant="outline" onClick={() => input.current?.click()} disabled={progress !== null}>
              <RefreshCw aria-hidden="true" /> Replace
            </Button>
            <Button type="button" size="xs" variant="outline" onClick={() => setLibraryOpen(true)}>
              <Library aria-hidden="true" /> Library
            </Button>
            <Button type="button" size="xs" variant="destructive-ghost" onClick={() => onChange(null)}>
              <Trash2 aria-hidden="true" /> Remove
            </Button>
          </div>
          <TextField label="Alt text" required value={value.alt ?? ''} onChange={(alt) => patch({ alt })} max={150} placeholder="What the image shows, for screen readers" error={!value.alt?.trim() ? 'Alt text is required to publish.' : undefined} />
          {showCaption && <TextField label="Caption" value={value.caption ?? ''} onChange={(caption) => patch({ caption })} />}
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField label="Credit" value={value.credit ?? ''} onChange={(credit) => patch({ credit })} placeholder="Photo: Jane Doe / Unsplash" />
            <TextField label="Source URL" type="url" value={value.creditUrl ?? ''} onChange={(creditUrl) => patch({ creditUrl })} placeholder="https://" error={value.creditUrl && !/^https?:\/\//i.test(value.creditUrl) ? 'Must start with https://' : undefined} />
          </div>
        </>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => input.current?.click()}
            disabled={progress !== null}
            className="flex aspect-[16/9] flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-card text-sm text-muted-foreground transition-colors hover:border-accent/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
          >
            {progress !== null ? <Loader2 className="h-5 w-5 animate-spin text-accent" /> : <Upload className="h-5 w-5 text-accent" />}
            {progress !== null ? `Optimising & uploading ${progress}%` : 'Upload image'}
            <span className="text-[11px]">JPG, PNG, WebP, AVIF, GIF · max 15 MB</span>
          </button>
          <button
            type="button"
            onClick={() => setLibraryOpen(true)}
            className="flex aspect-[16/9] flex-col items-center justify-center gap-2 rounded-lg border border-border-subtle bg-card text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ImagePlus className="h-5 w-5" /> Choose from library
          </button>
        </div>
      )}

      {hint && <p className="text-[12px] text-muted-foreground">{hint}</p>}
      {sizeWarnings.map((w) => (
        <p key={w} className="text-[12px] text-warning-fg">{w}</p>
      ))}

      <input
        ref={input}
        type="file"
        accept={ACCEPT_ATTR}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) upload(file);
        }}
      />
      <MediaLibrary
        open={libraryOpen}
        onOpenChange={setLibraryOpen}
        onPick={(m) =>
          onChange({ url: m.url, width: m.width, height: m.height, variants: m.variants, alt: value?.alt || m.alt, caption: value?.caption, credit: value?.credit, creditUrl: value?.creditUrl })
        }
      />
    </div>
  );
}
